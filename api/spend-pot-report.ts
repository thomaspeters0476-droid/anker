import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyCors } from './_cors.js'
import { createClient } from '@supabase/supabase-js'
import { secretsEqual } from './_timingSafe.js'

type LedgerRow = {
  source: string
  amount_cents: number
  currency: string
  note: string | null
  created_at: string
  stripe_object_id: string | null
}

function getAdminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function reportTokenOk(req: VercelRequest): boolean {
  const expected = process.env.SPEND_POT_REPORT_TOKEN?.trim()
  if (!expected) return false
  const auth = String(req.headers.authorization ?? '')
  const bearer = auth.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : ''
  const header = String(req.headers['x-tagesanker-report-token'] ?? '')
  // Query-Token absichtlich nicht mehr — Leak in Logs/Referer
  return secretsEqual(bearer, expected) || secretsEqual(header, expected)
}

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0))
}

function parsePeriod(req: VercelRequest): { from: Date; to: Date; label: string } {
  const now = new Date()
  const period = String(req.query?.period ?? 'month')
  const fromQ = String(req.query?.from ?? '')
  const toQ = String(req.query?.to ?? '')

  if (fromQ && toQ) {
    const from = new Date(fromQ)
    const to = new Date(toQ)
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      return { from, to, label: `${from.toISOString()} … ${to.toISOString()}` }
    }
  }

  if (period === 'year') {
    const from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
    return { from, to: now, label: `Jahr ${now.getUTCFullYear()} (YTD)` }
  }
  if (period === 'quarter') {
    const q = Math.floor(now.getUTCMonth() / 3)
    const from = new Date(Date.UTC(now.getUTCFullYear(), q * 3, 1))
    return {
      from,
      to: now,
      label: `Q${q + 1} ${now.getUTCFullYear()} (bisher)`,
    }
  }
  // month default
  const from = startOfUtcMonth(now)
  return {
    from,
    to: now,
    label: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')} (MTD)`,
  }
}

function eur(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

/**
 * Internal spend-pot transparency report (JSON + markdown).
 * Auth: SPEND_POT_REPORT_TOKEN via Bearer, x-tagesanker-report-token, or ?token=
 * Query: period=month|quarter|year  OR  from=&to= (ISO dates)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }
  if (!reportTokenOk(req)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' })
  }

  const sb = getAdminSupabase()
  if (!sb) {
    return res.status(503).json({ ok: false, error: 'db_not_configured' })
  }

  const { from, to, label } = parsePeriod(req)
  const { data, error } = await sb
    .from('spend_pot_ledger')
    .select('source, amount_cents, currency, note, created_at, stripe_object_id')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    console.error('spend-pot-report', error.message)
    return res.status(500).json({ ok: false, error: 'query_failed' })
  }

  const rows = (data ?? []) as LedgerRow[]
  const sum = (source: string) =>
    rows
      .filter((r) => r.source === source)
      .reduce((a, r) => a + (r.amount_cents || 0), 0)

  const pct5 = sum('pct_5')
  const topup = sum('topup')
  const socialOut = sum('social_out')
  const researchOut = sum('research_out')
  const adjust = sum('adjust')
  const inflow = pct5 + topup + Math.max(0, adjust)
  const outflow = socialOut + researchOut + Math.max(0, -adjust)
  // Ledger: outflows stored as negative or positive? Schema says amount_cents integer -
  // we'll treat social_out/research_out as positive magnitudes that reduce the pot.
  const potDelta = pct5 + topup + adjust - socialOut - researchOut

  // All-time balance (simple): sum all sources with sign convention
  const { data: allRows, error: allErr } = await sb
    .from('spend_pot_ledger')
    .select('source, amount_cents')
  if (allErr) {
    console.error('spend-pot-report all', allErr.message)
  }
  let balanceCents = 0
  for (const r of (allRows ?? []) as { source: string; amount_cents: number }[]) {
    if (r.source === 'pct_5' || r.source === 'topup') balanceCents += r.amount_cents
    else if (r.source === 'social_out' || r.source === 'research_out')
      balanceCents -= Math.abs(r.amount_cents)
    else if (r.source === 'adjust') balanceCents += r.amount_cents
  }

  const report = {
    ok: true as const,
    generatedAt: new Date().toISOString(),
    period: {
      label,
      from: from.toISOString(),
      to: to.toISOString(),
    },
    periodTotals: {
      pct5_cents: pct5,
      topup_cents: topup,
      social_out_cents: socialOut,
      research_out_cents: researchOut,
      adjust_cents: adjust,
      inflow_cents: inflow,
      outflow_cents: outflow,
      pot_delta_cents: potDelta,
    },
    balance_cents: balanceCents,
    entries: rows.length,
    // implied gross from 5%: pct5 / 0.05
    implied_gross_abo_cents: pct5 > 0 ? Math.round(pct5 / 0.05) : 0,
  }

  const md = [
    `# Tagesanker — Interner Spendentopf-Bericht`,
    ``,
    `Generiert: ${report.generatedAt}`,
    `Periode: ${label}`,
    `Von: ${report.period.from}`,
    `Bis: ${report.period.to}`,
    ``,
    `## Kennzahlen Periode`,
    ``,
    `| Kennzahl | Betrag |`,
    `|----------|--------|`,
    `| Implizierter Brutto-Abo-Umsatz (aus 5 %) | ${eur(report.implied_gross_abo_cents)} |`,
    `| 5 %-Zuweisung | ${eur(pct5)} |`,
    `| Mehrzahlungen | ${eur(topup)} |`,
    `| Sozialzugänge (Abfluss) | ${eur(socialOut)} |`,
    `| Forschung (Abfluss) | ${eur(researchOut)} |`,
    `| Anpassungen | ${eur(adjust)} |`,
    `| Topf-Delta Periode | ${eur(potDelta)} |`,
    ``,
    `## Bestand (gesamt, alle Perioden)`,
    ``,
    `Topf-Stand (Ledger): **${eur(balanceCents)}**`,
    ``,
    `Einträge in Periode: ${rows.length}`,
    ``,
    `> Öffentlicher Schönbericht: manuell aus diesen Zahlen ableiten.`,
    `> Reserve für laufende Sozialzugänge hier noch manuell eintragen.`,
  ].join('\n')

  const format = String(req.query?.format ?? 'json')
  if (format === 'md' || format === 'markdown') {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
    return res.status(200).send(md)
  }

  return res.status(200).json({ ...report, markdown: md })
}
