import { timingSafeEqual } from 'node:crypto'

/** Constant-time string compare (length mismatch → false). */
export function secretsEqual(
  provided: string | undefined | null,
  expected: string | undefined | null,
): boolean {
  if (!provided || !expected) return false
  try {
    const a = Buffer.from(provided, 'utf8')
    const b = Buffer.from(expected, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
