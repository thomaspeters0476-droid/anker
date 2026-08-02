import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import {
  creditWallet,
  getAdminSupabase,
  getWallet,
  PACK_CREDITS,
  tierFromPriceId,
  type ChopTier,
} from './_chopWallet.js'

/** Stripe SDK typings lag API fields we still receive at runtime. */
type InvoiceLoose = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null
  subscription_details?: { metadata?: Record<string, string> } | null
}
type InvoiceLineLoose = Stripe.InvoiceLineItem & {
  type?: string
}

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

  for (const line of (invoice.lines?.data ?? []) as InvoiceLineLoose[]) {
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

async function creditChopPackFromSession(session: Stripe.Checkout.Session) {
  if (session.metadata?.product !== 'chop_pack') return
  if (session.payment_status && session.payment_status !== 'paid') return

  const userId =
    session.metadata.user_id?.trim() ||
    session.client_reference_id?.trim() ||
    ''
  if (!userId) {
    console.error('chop pack: missing user_id')
    return
  }

  const pack = String(session.metadata.pack || '').toLowerCase()
  const credits =
    Number(session.metadata.credits) ||
    PACK_CREDITS[pack] ||
    0
  if (credits < 1) {
    console.error('chop pack: bad credits', pack)
    return
  }

  const result = await creditWallet({
    userId,
    delta: credits,
    reason: 'purchase',
    stripeSessionId: session.id,
    note: `pack:${pack}`,
  })
  if (result.ok === false) console.error('chop pack credit', result.error)
}

async function creditChopAboFromInvoice(
  stripe: Stripe,
  invoice: Stripe.Invoice,
) {
  const inv = invoice as InvoiceLoose
  const invoiceId = inv.id
  if (!invoiceId) return

  let userId =
    inv.subscription_details?.metadata?.user_id?.trim() ||
    inv.metadata?.user_id?.trim() ||
    ''

  if (!userId && inv.customer && typeof inv.customer === 'string') {
    try {
      const customer = await stripe.customers.retrieve(inv.customer)
      if (!customer.deleted) {
        userId = customer.metadata?.supabase_user_id?.trim() || ''
      }
    } catch {
      /* ignore */
    }
  }

  // Subscription metadata
  const subRef = inv.subscription
  const subId = typeof subRef === 'string' ? subRef : subRef?.id
  let metaTier = ''
  let metaCredits = 0
  if (subId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subId)
      userId = userId || sub.metadata?.user_id?.trim() || ''
      metaTier = sub.metadata?.tier || sub.metadata?.product || ''
      metaCredits = Number(sub.metadata?.chop_monthly_credits) || 0
    } catch {
      /* ignore */
    }
  }

  if (!userId) return

  let tier: ChopTier | null = null
  let credits = 0

  if (metaTier === 'schublade' || metaTier === 'bundle' || metaTier === 'tagesanker') {
    tier = metaTier
    credits =
      metaCredits ||
      (tier === 'schublade' ? 100 : tier === 'bundle' ? 150 : 0)
  } else {
    for (const line of invoice.lines?.data ?? []) {
      const priceId =
        (line as { price?: { id?: string } }).price?.id ||
        (line as { pricing?: { price_details?: { price?: string } } }).pricing
          ?.price_details?.price
      const hit = tierFromPriceId(priceId)
      if (hit) {
        tier = hit.tier
        credits = hit.credits
        break
      }
    }
  }

  if (!tier) return

  // Auch bei 0 Credits Tier setzen (Tagesanker), ohne Ledger-Spam bei 0
  if (credits > 0) {
    const result = await creditWallet({
      userId,
      delta: credits,
      reason: 'abo_grant',
      stripeInvoiceId: invoiceId,
      tier,
      note: `abo:${tier}`,
    })
    if (result.ok === false) console.error('chop abo credit', result.error)
  } else {
    const sb = getAdminSupabase()
    if (!sb) return
    const current = await getWallet(sb, userId)
    await sb.from('chop_ai_wallets').upsert(
      {
        user_id: userId,
        balance: current.balance,
        tier,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
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
        await creditChopAboFromInvoice(stripe, invoice)
        break
      }
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await creditChopPackFromSession(session)
        break
      }
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
