/** Arbeit nach erstem Paint — Sync/Entitlements blockieren nicht den Start. */
export function afterPaint(fn: () => void): () => void {
  let cancelled = false
  const run = () => {
    if (!cancelled) fn()
  }
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(run, { timeout: 1200 })
    return () => {
      cancelled = true
      cancelIdleCallback(id)
    }
  }
  const id = setTimeout(run, 0)
  return () => {
    cancelled = true
    clearTimeout(id)
  }
}
