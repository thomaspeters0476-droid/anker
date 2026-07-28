import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { marked } from 'marked'
import { formatPostDate, getPost } from './blog'
import { setPageMeta, SITE } from './site'

export function BlogPostPage() {
  const { slug = '' } = useParams()
  const post = getPost(slug)

  const html = useMemo(() => {
    if (!post) return ''
    return marked.parse(post.body, { async: false }) as string
  }, [post])

  useEffect(() => {
    if (post) {
      setPageMeta(`${post.title} — ${SITE.name}`, post.description)
    } else {
      setPageMeta(`Beitrag nicht gefunden — ${SITE.name}`, SITE.description)
    }
  }, [post])

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
