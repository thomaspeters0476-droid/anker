import {
  canUseChopAi,
  recordChopAiUse,
  refreshChopWallet,
} from './chopAiQuota'

export type ChopAiResult =
  | { ok: true; bites: string[] }
  | { ok: false; error: string }

export type ChopAiInput = {
  title: string
  locale: string
  /** Übergeordnetes Vorhaben (Brocken), wenn ein Häppchen weiter zerlegt wird */
  parentTitle?: string | null
  mode?: 'first' | 'further'
}

export async function suggestChopBites(
  titleOrInput: string | ChopAiInput,
  locale?: string,
): Promise<ChopAiResult> {
  const input: ChopAiInput =
    typeof titleOrInput === 'string'
      ? { title: titleOrInput, locale: locale ?? 'de' }
      : titleOrInput

  await refreshChopWallet()
  if (!canUseChopAi()) {
    return { ok: false, error: 'daily_limit' }
  }

  const mode =
    input.mode ??
    (input.parentTitle?.trim() ? 'further' : 'first')

  try {
    const res = await fetch('/api/chop-bites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: input.title,
        locale: input.locale,
        mode,
        ...(input.parentTitle?.trim()
          ? { parentTitle: input.parentTitle.trim() }
          : {}),
      }),
    })
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean
      bites?: string[]
      error?: string
    } | null

    if (!res.ok || !data?.ok || !Array.isArray(data.bites)) {
      const err = data?.error || `http_${res.status}`
      if (res.status === 429 || err === 'rate_limited') {
        return { ok: false, error: 'daily_limit' }
      }
      return { ok: false, error: err }
    }

    const bites = data.bites
      .map((b) => (typeof b === 'string' ? b.trim() : ''))
      .filter(Boolean)
    if (bites.length < 3) {
      return { ok: false, error: 'bad_ai_response' }
    }
    await recordChopAiUse()
    return { ok: true, bites }
  } catch {
    return { ok: false, error: 'network' }
  }
}
