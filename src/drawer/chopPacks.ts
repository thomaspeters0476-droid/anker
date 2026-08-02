/** KI-Nachkauf-Pakete (Web brutto) */

export type ChopPackId = 's' | 'm' | 'l'

export type ChopPack = {
  id: ChopPackId
  credits: number
  /** Brutto-Cent EUR */
  priceCents: number
  /** Store-Brutto-Cent (M/L +50ct) */
  storePriceCents: number
}

export const CHOP_PACKS: Record<ChopPackId, ChopPack> = {
  s: { id: 's', credits: 35, priceCents: 99, storePriceCents: 99 },
  m: { id: 'm', credits: 120, priceCents: 249, storePriceCents: 299 },
  l: { id: 'l', credits: 333, priceCents: 499, storePriceCents: 549 },
}

export const CHOP_PACK_ORDER: ChopPackId[] = ['s', 'm', 'l']

/** Abo-KI inkl. / Monat */
export const CHOP_ABO_MONTHLY_CREDITS = {
  tagesanker: 0,
  schublade: 100,
  bundle: 150,
} as const

export function formatEuroFromCents(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale.startsWith('en') ? 'en-DE' : 'de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}
