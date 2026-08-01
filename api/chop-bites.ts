import type { VercelRequest, VercelResponse } from '@vercel/node'

type Body = {
  title?: string
  /** Übergeordnetes Vorhaben (Brocken), wenn ein Häppchen weiter zerlegt wird */
  parentTitle?: string
  locale?: string
}

const MAX_TITLE = 200
const MIN_BITES = 2
const MAX_BITES = 8

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

function systemPrompt(locale: 'de' | 'en', hasParent: boolean): string {
  if (locale === 'en') {
    return [
      'You break one messy task into tiny concrete next actions for an ADHD-friendly drawer app.',
      'Reply ONLY as JSON: { "bites": ["...", "..."] }',
      `Write ${MIN_BITES}-${MAX_BITES} short steps in English.`,
      'Each bite: one doable action, under ~80 characters, no numbering, no moralizing.',
      'Order by natural sequence. Prefer minutes-scale steps over vague goals.',
      hasParent
        ? 'A parent chunk (overall goal) is given plus the step to split further. Stay strictly inside that goal — do not invent a different project from the step title alone.'
        : '',
    ]
      .filter(Boolean)
      .join(' ')
  }
  return [
    'Du zerlegst ein unübersichtliches Vorhaben in kleine, konkrete nächste Schritte für eine ADHS-freundliche Schubladen-App.',
    'Antworte NUR als JSON: { "bites": ["...", "..."] }',
    `Schreibe ${MIN_BITES}-${MAX_BITES} kurze Schritte auf Deutsch.`,
    'Jedes Häppchen: eine machbare Handlung, unter ca. 80 Zeichen, ohne Nummerierung, ohne Moralisieren.',
    'Reihenfolge wie man es natürlich macht. Lieber Minuten-Schritte als vage Ziele.',
    hasParent
      ? 'Es gibt einen Brocken (Gesamtvorhaben) und den Schritt, der weiter zerlegt wird. Bleib strikt im Brocken — erfinde kein anderes Projekt nur aus dem Häppchen-Titel.'
      : '',
  ]
    .filter(Boolean)
    .join(' ')
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
  return `Reply as JSON. Vorhaben / Brocken:\n${title}`
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
    .slice(0, MAX_BITES)
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
      max_output_tokens: 800,
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
      // gpt-5-mini: nur Default-Temperature; kein temperature-Feld setzen
      max_completion_tokens: 800,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`azure_chat_${res.status}:${body.slice(0, 200)}`)
  }
  const payload = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  return payload.choices?.[0]?.message?.content ?? null
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

  const locale = String(body.locale ?? 'de').toLowerCase() === 'en' ? 'en' : 'de'
  const endpoint = normalizeEndpoint(process.env.AZURE_OPENAI_ENDPOINT!.trim())
  const key = process.env.AZURE_OPENAI_KEY!.trim()
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT!.trim()
  const version = apiVersion()
  const system = systemPrompt(locale, Boolean(parentTitle))
  const user = userPrompt(title, parentTitle, locale)

  try {
    let content: string | null = null
    let lastErr: unknown

    // Chat Completions zuerst — stabiler für gpt-5-mini
    try {
      content = await callChatCompletionsApi({
        endpoint,
        key,
        deployment,
        version,
        system,
        user,
      })
    } catch (e) {
      lastErr = e
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
      }
    }

    if (!content) {
      console.error('[chop-bites] empty', String(lastErr ?? ''))
      throw lastErr instanceof Error ? lastErr : new Error('empty_response')
    }

    const bites = parseBites(content)
    if (bites.length < MIN_BITES) {
      return res.status(502).json({ ok: false, error: 'bad_ai_response' })
    }

    return res.status(200).json({ ok: true, bites })
  } catch (e) {
    console.error('[chop-bites] failed', String(e))
    return res.status(502).json({ ok: false, error: 'ai_failed' })
  }
}
