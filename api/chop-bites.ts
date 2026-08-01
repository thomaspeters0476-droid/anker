import type { VercelRequest, VercelResponse } from '@vercel/node'

type Body = {
  title?: string
  /** Übergeordnetes Vorhaben (Brocken), wenn ein Häppchen weiter zerlegt wird */
  parentTitle?: string
  /** further = Häppchen weiter zerteilen — strengere Größenregeln */
  mode?: 'first' | 'further'
  locale?: string
}

const MAX_TITLE = 200
const MIN_BITES = 2
/** Erste Zerlegung: grob 3–5 — Feineres später per Weiterzerteilen */
const MIN_BITES_FIRST = 3
const MAX_BITES_FIRST = 5
const MAX_BITES_FURTHER = 3

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

function systemPrompt(
  locale: 'de' | 'en',
  mode: 'first' | 'further',
): string {
  // Kurz halten — gpt-5-mini Reasoning kostet Tokens + Zeit
  if (locale === 'en') {
    if (mode === 'further') {
      return [
        'Split one step further. JSON only: {"bites":["..."]}.',
        `Exactly 2-${MAX_BITES_FURTHER} clearer substeps inside the parent chunk.`,
        'Each ~5–25 min, <80 chars. No micro-actions. Never more than 3.',
      ].join(' ')
    }
    return [
      'Split a chunk into ADHD-friendly bites. JSON only: {"bites":["..."]}.',
      `Aim for ${MIN_BITES_FIRST}-${MAX_BITES_FIRST} steps — never more than ${MAX_BITES_FIRST}.`,
      'Coarse first cut only; finer splits come later. Each ~5–25 min, <80 chars.',
      'No micro-actions (open file, click, sit down).',
    ].join(' ')
  }
  if (mode === 'further') {
    return [
      'Einen Schritt weiter zerlegen. Nur JSON: {"bites":["..."]}.',
      `Genau 2-${MAX_BITES_FURTHER} klarere Teilschritte im Brocken.`,
      'Je ca. 5–25 Min., <80 Zeichen. Keine Mikro-Handlungen. Nie mehr als 3.',
    ].join(' ')
  }
  return [
    'Brocken in ADHS-taugliche Häppchen schneiden. Nur JSON: {"bites":["..."]}.',
    `Ziel: ${MIN_BITES_FIRST}-${MAX_BITES_FIRST} Teile — niemals mehr als ${MAX_BITES_FIRST}.`,
    'Nur der grobe erste Schnitt; Feineres kommt später per Weiterzerteilen.',
    'Je ca. 5–25 Min., <80 Zeichen. Keine Mikro-Handlungen (Datei öffnen, klicken).',
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
        'Reply as JSON.',
        `Parent chunk (overall goal):\n${parentTitle}`,
        `Step to split further (stay inside the parent):\n${title}`,
      ].join('\n\n')
    }
    return [
      'Reply as JSON.',
      `Brocken (Gesamtvorhaben):\n${parentTitle}`,
      `Schritt, der weiter zerlegt wird (im Brocken bleiben):\n${title}`,
    ].join('\n\n')
  }
  if (locale === 'en') {
    return `Reply as JSON with 3-5 bites (max 5). Chunk:\n${title}`
  }
  return `Reply as JSON mit 3–5 Häppchen (max. 5). Brocken:\n${title}`
}

function parseBites(raw: string, maxBites: number): string[] {
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
    .slice(0, maxBites)
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
      // Azure verlangt „json“ im Input, wenn text.format=json_object
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
      // gpt-5-mini: Reasoning zählt zu completion_tokens — 800 reicht oft nicht
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
  const maxBites = mode === 'further' ? MAX_BITES_FURTHER : MAX_BITES_FIRST

  const locale = String(body.locale ?? 'de').toLowerCase() === 'en' ? 'en' : 'de'
  const endpoint = normalizeEndpoint(process.env.AZURE_OPENAI_ENDPOINT!.trim())
  const key = process.env.AZURE_OPENAI_KEY!.trim()
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT!.trim()
  const version = apiVersion()
  const system = systemPrompt(locale, mode)
  const user = userPrompt(title, parentTitle, locale)

  try {
    let content: string | null = null
    let lastErr: unknown

    // gpt-5-mini: Reasoning frisst completion_tokens — erst 2200, bei Leer-Antwort 4000
    for (const budget of [2200, 4000]) {
      try {
        content = await callChatCompletionsApi({
          endpoint,
          key,
          deployment,
          version,
          system,
          user,
          maxCompletionTokens: budget,
        })
        if (content) break
      } catch (e) {
        lastErr = e
        console.error('[chop-bites] chat', String(e))
      }
    }

    if (!content && version.startsWith('2025')) {
      try {
        content = await callResponsesApi({
          endpoint,
          key,
          deployment,
          version,
          system,
          user,
        })
      } catch (e) {
        lastErr = e
        console.error('[chop-bites] responses', String(e))
      }
    }

    if (!content) {
      throw lastErr instanceof Error ? lastErr : new Error('empty_response')
    }

    const bites = parseBites(content, maxBites)
    if (bites.length < MIN_BITES) {
      return res.status(502).json({ ok: false, error: 'bad_ai_response' })
    }

    return res.status(200).json({ ok: true, bites })
  } catch (e) {
    console.error('[chop-bites] failed', String(e))
    return res.status(502).json({ ok: false, error: 'ai_failed' })
  }
}
