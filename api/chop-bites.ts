import type { VercelRequest, VercelResponse } from '@vercel/node'

type Body = {
  title?: string
  /** Übergeordnetes Vorhaben (Brocken), wenn ein Häppchen weiter zerlegt wird */
  parentTitle?: string
  /** further = Häppchen weiter zerteilen */
  mode?: 'first' | 'further'
  locale?: string
}

const MAX_TITLE = 200
/** Jede Zerlegungsstufe: 3–5 — nie still abschneiden (sonst fehlt Arbeit) */
const MIN_BITES = 3
const MAX_BITES = 5
/** Parse-Obergrenze nur zum Erkennen von „zu viele“, nicht zum Kürzen */
const PARSE_DETECT_CAP = 20

function azureConfigured(): boolean {
  return Boolean(
    process.env.AZURE_OPENAI_ENDPOINT?.trim() &&
      process.env.AZURE_OPENAI_KEY?.trim() &&
      process.env.AZURE_OPENAI_DEPLOYMENT?.trim(),
  )
}

function normalizeEndpoint(raw: string): string {
  return raw.replace(/\/$/, '').replace(/\/openai\/responses.*$/i, '')
}

function apiVersion(): string {
  return process.env.AZURE_OPENAI_API_VERSION?.trim() || '2025-04-01-preview'
}

function systemPrompt(locale: 'de' | 'en', mode: 'first' | 'further'): string {
  // Kurz halten — gpt-5-mini Reasoning kostet Tokens + Zeit
  if (locale === 'en') {
    return [
      mode === 'further'
        ? 'Split one step further inside its parent chunk. JSON only: {"bites":["..."]}.'
        : 'Split a chunk into ADHD-friendly bites. JSON only: {"bites":["..."]}.',
      `Return ${MIN_BITES}-${MAX_BITES} steps — never fewer than ${MIN_BITES}, never more than ${MAX_BITES}.`,
      'The set must cover the COMPLETE work of the given title (merge if needed; do not drop work).',
      'Each ~5–25 min, <80 chars. No micro-actions (open file, click, sit down).',
      mode === 'first'
        ? 'Coarse cut; finer detail comes from later further-splits of single bites.'
        : 'Stay inside the parent goal.',
    ].join(' ')
  }
  return [
    mode === 'further'
      ? 'Einen Schritt weiter zerlegen (im Brocken bleiben). Nur JSON: {"bites":["..."]}.'
      : 'Brocken in ADHS-taugliche Häppchen schneiden. Nur JSON: {"bites":["..."]}.',
    `Genau ${MIN_BITES}-${MAX_BITES} Schritte — nie weniger als ${MIN_BITES}, nie mehr als ${MAX_BITES}.`,
    'Die Menge muss die KOMPLETTE Arbeit des Titels abdecken (zusammenfassen statt weglassen).',
    'Je ca. 5–25 Min., <80 Zeichen. Keine Mikro-Handlungen (Datei öffnen, klicken).',
    mode === 'first'
      ? 'Grober Schnitt; Feineres später durch Weiterzerteilen einzelner Häppchen.'
      : 'Im Gesamtvorhaben bleiben.',
  ].join(' ')
}

function userPrompt(
  title: string,
  parentTitle: string | null,
  locale: 'de' | 'en',
): string {
  if (parentTitle) {
    if (locale === 'en') {
      return [
        `Reply as JSON with ${MIN_BITES}-${MAX_BITES} bites (hard max ${MAX_BITES}) covering the full step.`,
        `Parent chunk:\n${parentTitle}`,
        `Step to split further:\n${title}`,
      ].join('\n\n')
    }
    return [
      `Reply as JSON mit ${MIN_BITES}–${MAX_BITES} Häppchen (hart max. ${MAX_BITES}), die den ganzen Schritt abdecken.`,
      `Brocken:\n${parentTitle}`,
      `Schritt zum Weiterzerlegen:\n${title}`,
    ].join('\n\n')
  }
  if (locale === 'en') {
    return `Reply as JSON with ${MIN_BITES}-${MAX_BITES} bites (hard max ${MAX_BITES}) covering the full chunk:\n${title}`
  }
  return `Reply as JSON mit ${MIN_BITES}–${MAX_BITES} Häppchen (hart max. ${MAX_BITES}), die den ganzen Brocken abdecken:\n${title}`
}

function repairPrompt(
  locale: 'de' | 'en',
  count: number,
  kind: 'too_many' | 'too_few',
): string {
  if (locale === 'en') {
    if (kind === 'too_many') {
      return `You returned ${count} bites — too many. Reply again as JSON with exactly ${MIN_BITES}-${MAX_BITES} bites that still cover ALL the work (merge steps; do not omit work).`
    }
    return `You returned ${count} bites — too few. Reply again as JSON with ${MIN_BITES}-${MAX_BITES} bites covering the complete work.`
  }
  if (kind === 'too_many') {
    return `Du hast ${count} Häppchen geliefert — zu viele. Nochmal als JSON mit genau ${MIN_BITES}–${MAX_BITES} Häppchen, die DIE GESAMTE Arbeit abdecken (zusammenfassen, nichts weglassen).`
  }
  return `Du hast ${count} Häppchen geliefert — zu wenige. Nochmal als JSON mit ${MIN_BITES}–${MAX_BITES} Häppchen, die die komplette Arbeit abdecken.`
}

function parseBites(raw: string): string[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return []
    try {
      parsed = JSON.parse(m[0])
    } catch {
      return []
    }
  }
  if (!parsed || typeof parsed !== 'object') return []
  const bites = (parsed as { bites?: unknown }).bites
  if (!Array.isArray(bites)) return []
  return bites
    .map((b) => (typeof b === 'string' ? b.trim() : ''))
    .filter((b) => b.length > 0 && b.length <= 120)
    .slice(0, PARSE_DETECT_CAP)
}

function parseResponsesText(payload: {
  output_text?: string
  output?: { type?: string; content?: { type?: string; text?: string }[] }[]
}): string | null {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text
  }
  for (const item of payload.output ?? []) {
    for (const part of item.content ?? []) {
      if (part.type === 'output_text' && typeof part.text === 'string' && part.text.trim()) {
        return part.text
      }
      if (typeof part.text === 'string' && part.text.trim()) {
        return part.text
      }
    }
  }
  return null
}

async function callResponsesApi(input: {
  endpoint: string
  key: string
  deployment: string
  version: string
  system: string
  user: string
}): Promise<string | null> {
  const url = `${input.endpoint}/openai/responses?api-version=${input.version}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': input.key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: input.deployment,
      instructions: input.system,
      input: input.user,
      max_output_tokens: 2200,
      text: { format: { type: 'json_object' } },
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`azure_responses_${res.status}:${body.slice(0, 200)}`)
  }
  const payload = (await res.json()) as {
    status?: string
    error?: { message?: string }
    output_text?: string
    output?: { type?: string; content?: { type?: string; text?: string }[] }[]
  }
  if (payload.status === 'failed') {
    throw new Error(payload.error?.message || 'azure_failed')
  }
  return parseResponsesText(payload)
}

async function callChatCompletionsApi(input: {
  endpoint: string
  key: string
  deployment: string
  version: string
  system: string
  user: string
  maxCompletionTokens: number
}): Promise<string | null> {
  const url = `${input.endpoint}/openai/deployments/${encodeURIComponent(input.deployment)}/chat/completions?api-version=${input.version}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': input.key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: input.system },
        { role: 'user', content: input.user },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: input.maxCompletionTokens,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`azure_chat_${res.status}:${body.slice(0, 200)}`)
  }
  const payload = (await res.json()) as {
    choices?: {
      finish_reason?: string
      message?: { content?: string | null }
    }[]
    usage?: { completion_tokens_details?: { reasoning_tokens?: number } }
  }
  const choice = payload.choices?.[0]
  const content = choice?.message?.content?.trim() || null
  if (!content) {
    const reason = choice?.finish_reason ?? 'empty'
    const reasoning = payload.usage?.completion_tokens_details?.reasoning_tokens
    throw new Error(
      `azure_chat_empty:${reason}:reasoning=${reasoning ?? '?'}:budget=${input.maxCompletionTokens}`,
    )
  }
  return content
}

async function generateOnce(input: {
  endpoint: string
  key: string
  deployment: string
  version: string
  system: string
  user: string
}): Promise<string> {
  let lastErr: unknown
  for (const budget of [2200, 4000]) {
    try {
      const content = await callChatCompletionsApi({
        ...input,
        maxCompletionTokens: budget,
      })
      if (content) return content
    } catch (e) {
      lastErr = e
      console.error('[chop-bites] chat', String(e))
    }
  }
  if (input.version.startsWith('2025')) {
    try {
      const content = await callResponsesApi(input)
      if (content) return content
    } catch (e) {
      lastErr = e
      console.error('[chop-bites] responses', String(e))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('empty_response')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  if (!azureConfigured()) {
    return res.status(503).json({ ok: false, error: 'not_configured' })
  }

  const body = (req.body ?? {}) as Body
  const title = String(body.title ?? '')
    .trim()
    .slice(0, MAX_TITLE)
  if (title.length < 2) {
    return res.status(400).json({ ok: false, error: 'invalid_title' })
  }
  const parentRaw = String(body.parentTitle ?? '').trim().slice(0, MAX_TITLE)
  const parentTitle =
    parentRaw.length >= 2 && parentRaw.toLowerCase() !== title.toLowerCase()
      ? parentRaw
      : null
  const mode: 'first' | 'further' =
    body.mode === 'further' || parentTitle ? 'further' : 'first'

  const locale = String(body.locale ?? 'de').toLowerCase() === 'en' ? 'en' : 'de'
  const endpoint = normalizeEndpoint(process.env.AZURE_OPENAI_ENDPOINT!.trim())
  const key = process.env.AZURE_OPENAI_KEY!.trim()
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT!.trim()
  const version = apiVersion()
  const system = systemPrompt(locale, mode)
  const baseUser = userPrompt(title, parentTitle, locale)

  try {
    let content = await generateOnce({
      endpoint,
      key,
      deployment,
      version,
      system,
      user: baseUser,
    })
    let bites = parseBites(content)

    // Zu viele/wenige: einmal nachbessern — nicht still kürzen (sonst fehlt Arbeit)
    if (bites.length > MAX_BITES || (bites.length > 0 && bites.length < MIN_BITES)) {
      const kind = bites.length > MAX_BITES ? 'too_many' : 'too_few'
      console.error('[chop-bites] recount', kind, bites.length)
      content = await generateOnce({
        endpoint,
        key,
        deployment,
        version,
        system,
        user: `${baseUser}\n\n${repairPrompt(locale, bites.length, kind)}`,
      })
      bites = parseBites(content)
    }

    if (bites.length > MAX_BITES) {
      return res.status(502).json({ ok: false, error: 'too_many_bites' })
    }
    if (bites.length < MIN_BITES) {
      return res.status(502).json({ ok: false, error: 'bad_ai_response' })
    }

    return res.status(200).json({ ok: true, bites })
  } catch (e) {
    console.error('[chop-bites] failed', String(e))
    return res.status(502).json({ ok: false, error: 'ai_failed' })
  }
}
