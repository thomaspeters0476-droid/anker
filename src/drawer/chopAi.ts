export type ChopAiResult =
  | { ok: true; bites: string[] }
  | { ok: false; error: string }

export async function suggestChopBites(
  title: string,
  locale: string,
): Promise<ChopAiResult> {
  try {
    const res = await fetch('/api/chop-bites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, locale }),
    })
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean
      bites?: string[]
      error?: string
    } | null

    if (!res.ok || !data?.ok || !Array.isArray(data.bites)) {
      return {
        ok: false,
        error: data?.error || `http_${res.status}`,
      }
    }

    const bites = data.bites
      .map((b) => (typeof b === 'string' ? b.trim() : ''))
      .filter(Boolean)
    if (bites.length < 2) {
      return { ok: false, error: 'bad_ai_response' }
    }
    return { ok: true, bites }
  } catch {
    return { ok: false, error: 'network' }
  }
}
