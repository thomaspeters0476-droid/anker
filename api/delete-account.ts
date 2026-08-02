import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import {
  getAdminSupabase,
  userIdFromAuthHeader,
} from './_chopWallet.js'
import { getEntitlement } from './_entitlements.js'

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  return new Stripe(key)
}

/**
 * Deletes the signed-in user's cloud data and auth account.
 * Body: { confirm: "DELETE" }
 * Does not cancel legal invoice archives at Stripe; cancels open subscriptions.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  const userId = await userIdFromAuthHeader(req)
  if (!userId) {
    return res.status(401).json({ ok: false, error: 'not_signed_in' })
  }

  if (String(req.body?.confirm ?? '') !== 'DELETE') {
    return res.status(400).json({
      ok: false,
      error: 'confirm_required',
      message: 'Send { "confirm": "DELETE" }.',
    })
  }

  const sb = getAdminSupabase()
  if (!sb) {
    return res.status(503).json({ ok: false, error: 'db_not_configured' })
  }

  try {
    const ent = await getEntitlement(sb, userId)
    const stripe = getStripe()
    if (stripe && ent?.stripe_customer_id) {
      try {
        const subs = await stripe.subscriptions.list({
          customer: ent.stripe_customer_id,
          status: 'all',
          limit: 20,
        })
        for (const sub of subs.data) {
          if (
            sub.status === 'active' ||
            sub.status === 'trialing' ||
            sub.status === 'past_due'
          ) {
            await stripe.subscriptions.cancel(sub.id)
          }
        }
      } catch (err) {
        console.error('delete-account stripe cancel', err)
      }
    }

    // Encrypted media blobs
    try {
      const { data: files } = await sb.storage
        .from('sync-blobs')
        .list(userId, { limit: 1000 })
      if (files?.length) {
        const paths: string[] = []
        for (const f of files) {
          if (f.name) {
            // list may return folders (spark ids) — list one level deeper
            const { data: nested } = await sb.storage
              .from('sync-blobs')
              .list(`${userId}/${f.name}`, { limit: 100 })
            if (nested?.length) {
              for (const n of nested) {
                if (n.name) paths.push(`${userId}/${f.name}/${n.name}`)
              }
            } else {
              paths.push(`${userId}/${f.name}`)
            }
          }
        }
        if (paths.length) {
          await sb.storage.from('sync-blobs').remove(paths)
        }
      }
    } catch (err) {
      console.error('delete-account storage', err)
    }

    // Explicit table cleanup (cascade also on auth delete)
    await sb.from('chop_ai_ledger').delete().eq('user_id', userId)
    await sb.from('chop_ai_wallets').delete().eq('user_id', userId)
    await sb.from('user_entitlements').delete().eq('user_id', userId)
    await sb.from('user_state').delete().eq('user_id', userId)

    const { error: delErr } = await sb.auth.admin.deleteUser(userId)
    if (delErr) {
      console.error('delete-account auth', delErr.message)
      return res.status(502).json({ ok: false, error: 'delete_failed' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('delete-account', err)
    return res.status(502).json({ ok: false, error: 'delete_failed' })
  }
}
