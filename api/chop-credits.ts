import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  consumeWalletCredit,
  getAdminSupabase,
  getWallet,
  useFreeQuota,
  userIdFromAuthHeader,
} from './_chopWallet.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await userIdFromAuthHeader(req)
  if (!userId) {
    return res.status(401).json({ ok: false, error: 'not_signed_in' })
  }

  if (req.method === 'GET') {
    const sb = getAdminSupabase()
    if (!sb) {
      return res.status(503).json({ ok: false, error: 'db_not_configured' })
    }
    const wallet = await getWallet(sb, userId)
    return res.status(200).json({
      ok: true,
      balance: wallet.balance,
      tier: wallet.tier,
      useFreeQuota: useFreeQuota(wallet.tier),
    })
  }

  if (req.method === 'POST') {
    const action = String(req.body?.action ?? 'consume')
    if (action !== 'consume') {
      return res.status(400).json({ ok: false, error: 'bad_action' })
    }
    const result = await consumeWalletCredit(userId)
    if (result.ok) {
      return res.status(200).json({ ok: true, balance: result.balance })
    }
    if (result.error === 'empty') {
      return res.status(402).json({ ok: false, error: 'empty_balance' })
    }
    return res.status(503).json({ ok: false, error: result.error })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ ok: false, error: 'method_not_allowed' })
}
