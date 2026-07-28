import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { blogPosts, formatPostDate } from './blog'
import { setPageMeta, SITE } from './site'

export function BlogIndexPage() {
  useEffect(() => {
    setPageMeta(`Blog — ${SITE.name}`, 'Artikel zu Fokus, Kapazität und Alltag mit Tagesanker.')
  }, [])

  return (
    <main className="mkt-main mkt-narrow">
      <header className="mkt-page-head">
        <h1>Blog</h1>
        <p>Kurze Texte zu Halt, Fokus und Alltag — ohne Optimierungszwang.</p>
      </header>
      <ul className="mkt-post-list mkt-post-list-lg">
        {blogPosts.map((post) => (
          <li key={post.slug}>
            <Link to={`/blog/${post.slug}`}>
              <time dateTime={post.date}>{formatPostDate(post.date)}</time>
              <strong>{post.title}</strong>
              <span>{post.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
