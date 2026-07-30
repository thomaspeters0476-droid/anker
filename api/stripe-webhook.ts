import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export const config = {
  api: {
    bodyParser: false,
  },
}

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  return new Stripe(key)
}

function getAdminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

async function claimEvent(
  eventId: string,
  type: string,
): Promise<'new' | 'done' | 'skip'> {
  const sb = getAdminSupabase()
  if (!sb) return 'new'
  const { data: existing } = await sb
    .from('stripe_webhook_events')
    .select('status')
    .eq('id', eventId)
    .maybeSingle()
  if (existing?.status === 'processed') return 'done'
  if (existing?.status === 'processing') return 'skip'

  const { error } = await sb.from('stripe_webhook_events').upsert(
    {
      id: eventId,
      type,
      status: 'processing',
      received_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  if (error) {
    console.error('stripe claim', error.message)
    return 'new'
  }
  return 'new'
}

async function markProcessed(eventId: string) {
  const sb = getAdminSupabase()
  if (!sb) return
  await sb
    .from('stripe_webhook_events')
    .update({ status: 'processed', processed_at: new Date().toISOString() })
    .eq('id', eventId)
}

async function markFailed(eventId: string) {
  const sb = getAdminSupabase()
  if (!sb) return
  await sb
    .from('stripe_webhook_events')
    .update({ status: 'failed', processed_at: new Date().toISOString() })
    .eq('id', eventId)
}

async function recordSpendPotFromInvoice(invoice: Stripe.Invoice) {
  const sb = getAdminSupabase()
  if (!sb) return

  const currency = (invoice.currency || 'eur').toLowerCase()
  const invoiceId = invoice.id
  if (!invoiceId) return

  let pctCents = 0
  let topupCents = 0

  for (const line of invoice.lines?.data ?? []) {
    const amount = line.amount ?? 0
    if (amount <= 0) continue
    const meta =
      (line as { price?: { metadata?: Record<string, string> } }).price
        ?.metadata ||
      line.metadata ||
      {}
    const isTopup =
      meta.tagesanker === 'spend_topup' ||
      String(line.description || '').toLowerCase().includes('spendentopf')
    if (isTopup) topupCents += amount
    else if (line.type === 'subscription') {
      pctCents += Math.round(amount * 0.05)
    } else {
      pctCents += Math.round(amount * 0.05)
    }
  }

  if (pctCents === 0 && topupCents === 0 && (invoice.amount_paid ?? 0) > 0) {
    pctCents = Math.round((invoice.amount_paid ?? 0) * 0.05)
  }

  const rows: {
    source: string
    stripe_object_id: string
    amount_cents: number
    currency: string
    note: string
  }[] = []

  if (pctCents > 0) {
    rows.push({
      source: 'pct_5',
      stripe_object_id: invoiceId,
      amount_cents: pctCents,
      currency,
      note: '5% of subscription / invoice gross',
    })
  }
  if (topupCents > 0) {
    rows.push({
      source: 'topup',
      stripe_object_id: `${invoiceId}:topup`,
      amount_cents: topupCents,
      currency,
      note: 'Checkout spend pot top-up',
    })
  }

  for (const row of rows) {
    const { error } = await sb.from('spend_pot_ledger').upsert(
      {
        ...row,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'stripe_object_id' },
    )
    if (error) console.error('spend_pot_ledger', error.message)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).send('method_not_allowed')
  }

  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!stripe || !secret) {
    return res.status(503).send('stripe_webhook_not_configured')
  }

  const sig = req.headers['stripe-signature']
  if (!sig || Array.isArray(sig)) {
    return res.status(400).send('missing_signature')
  }

  let event: Stripe.Event
  try {
    const raw = await readRawBody(req)
    event = stripe.webhooks.constructEvent(raw, sig, secret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'verify_failed'
    console.error('stripe webhook verify', message)
    return res.status(400).send(`webhook_error: ${message}`)
  }

  const claim = await claimEvent(event.id, event.type)
  if (claim === 'done' || claim === 'skip') {
    return res.status(200).json({ ok: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await recordSpendPotFromInvoice(invoice)
        break
      }
      case 'checkout.session.completed':
        break
      default:
        break
    }
    await markProcessed(event.id)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('stripe webhook handle', err)
    await markFailed(event.id)
    return res.status(500).json({ ok: false })
  }
}
