import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatPostDate, loadPost, type BlogPost } from './blog'
import { setPageMeta, SITE } from './site'

export function BlogPostPage() {
  const { slug = '' } = useParams()
  const [post, setPost] = useState<BlogPost | null | undefined>(undefined)
  const [html, setHtml] = useState('')

  useEffect(() => {
    let cancelled = false
    setPost(undefined)
    setHtml('')
    void (async () => {
      const next = await loadPost(slug)
      if (cancelled) return
      setPost(next ?? null)
      if (!next) return
      const [{ marked }, DOMPurify] = await Promise.all([
        import('marked'),
        import('dompurify').then((m) => m.default),
      ])
      if (cancelled) return
      const raw = marked.parse(next.body, { async: false }) as string
      setHtml(DOMPurify.sanitize(raw))
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    if (post === undefined) return
    if (post) {
      setPageMeta(`${post.title} — ${SITE.name}`, post.description)
    } else {
      setPageMeta(`Beitrag nicht gefunden — ${SITE.name}`, SITE.description)
    }
  }, [post])

  if (post === undefined) {
    return (
      <main className="mkt-main mkt-narrow">
        <p className="mkt-section-lead">Laden …</p>
      </main>
    )
  }

  if (!post) {
    return (
      <main className="mkt-main mkt-narrow">
        <h1>Beitrag nicht gefunden</h1>
        <p>
          <Link to="/blog">Zurück zum Blog</Link>
        </p>
      </main>
    )
  }

  return (
    <main className="mkt-main mkt-narrow">
      <article className="mkt-article">
        <header className="mkt-page-head">
          <p className="mkt-eyebrow">
            <Link to="/blog">Blog</Link>
            <span aria-hidden> · </span>
            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
          </p>
          <h1>{post.title}</h1>
          <p>{post.description}</p>
        </header>
        <div
          className="mkt-prose"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>
    </main>
  )
}
