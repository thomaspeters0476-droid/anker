import type { VercelRequest, VercelResponse } from '@vercel/node'

/** Origins der Capacitor-WebView + Produktions-Webapp. */
const ALLOWED = new Set([
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
  'ionic://localhost',
  'https://tagesanker.de',
  'https://www.tagesanker.de',
])

export function isAllowedCorsOrigin(origin: string): boolean {
  if (!origin) return false
  if (ALLOWED.has(origin)) return true
  // Lokale Dev-Ports (Vite)
  try {
    const u = new URL(origin)
    if (
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1') &&
      (u.protocol === 'http:' || u.protocol === 'https:')
    ) {
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}

/**
 * CORS für Browser-Calls aus Capacitor (`https://localhost` → API).
 * @returns true wenn OPTIONS schon beantwortet — Handler soll dann returnen.
 */
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = String(req.headers.origin ?? '')
  if (isAllowedCorsOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, OPTIONS',
    )
    res.setHeader(
      'Access-Control-Allow-Headers',
      [
        'Authorization',
        'Content-Type',
        'x-tagesanker-checkout-preview',
        'x-tagesanker-report-token',
      ].join(', '),
    )
    res.setHeader('Access-Control-Max-Age', '86400')
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}
