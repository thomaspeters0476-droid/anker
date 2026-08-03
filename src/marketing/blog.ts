export type BlogPost = {
  slug: string
  title: string
  description: string
  date: string
  body: string
}

export type BlogPostMeta = Omit<BlogPost, 'body'>

function parseFrontmatter(raw: string): {
  meta: Record<string, string>
  body: string
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw.trim())
  if (!match) return { meta: {}, body: raw }
  const meta: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i === -1) continue
    const key = line.slice(0, i).trim()
    const value = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
    meta[key] = value
  }
  return { meta, body: match[2].trim() }
}

/** Lazy: volle Markdown-Dateien erst bei Bedarf. */
const modules = import.meta.glob('../content/blog/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>

function pathToSlug(path: string): string {
  return path.split('/').pop()?.replace(/\.md$/, '') ?? 'post'
}

function toMeta(path: string, raw: string): BlogPostMeta {
  const { meta } = parseFrontmatter(raw)
  const fileSlug = pathToSlug(path)
  return {
    slug: meta.slug || fileSlug,
    title: meta.title || fileSlug,
    description: meta.description || '',
    date: meta.date || '1970-01-01',
  }
}

let indexCache: BlogPostMeta[] | null = null

/** Index für Landing/Blog-Liste — lädt Markdown einmal, speichert nur Meta. */
export async function loadBlogIndex(): Promise<BlogPostMeta[]> {
  if (indexCache) return indexCache
  const entries = await Promise.all(
    Object.entries(modules).map(async ([path, load]) => {
      const raw = await load()
      return toMeta(path, raw)
    }),
  )
  indexCache = entries.sort((a, b) => b.date.localeCompare(a.date))
  return indexCache
}

export async function loadPost(slug: string): Promise<BlogPost | undefined> {
  for (const [path, load] of Object.entries(modules)) {
    const raw = await load()
    const { meta, body } = parseFrontmatter(raw)
    const fileSlug = pathToSlug(path)
    const postSlug = meta.slug || fileSlug
    if (postSlug === slug) {
      return {
        slug: postSlug,
        title: meta.title || fileSlug,
        description: meta.description || '',
        date: meta.date || '1970-01-01',
        body,
      }
    }
  }
  return undefined
}

export function formatPostDate(iso: string): string {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}
