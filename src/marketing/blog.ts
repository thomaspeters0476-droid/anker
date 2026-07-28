export type BlogPost = {
  slug: string
  title: string
  description: string
  date: string
  body: string
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
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

const modules = import.meta.glob('../content/blog/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

export const blogPosts: BlogPost[] = Object.entries(modules)
  .map(([path, raw]) => {
    const { meta, body } = parseFrontmatter(raw)
    const fileSlug = path.split('/').pop()?.replace(/\.md$/, '') ?? 'post'
    return {
      slug: meta.slug || fileSlug,
      title: meta.title || fileSlug,
      description: meta.description || '',
      date: meta.date || '1970-01-01',
      body,
    }
  })
  .sort((a, b) => b.date.localeCompare(a.date))

export function getPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug)
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
