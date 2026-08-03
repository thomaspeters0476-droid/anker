import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  formatPostDate,
  loadBlogIndex,
  type BlogPostMeta,
} from './blog'
import { setPageMeta, SITE } from './site'

export function BlogIndexPage() {
  const [posts, setPosts] = useState<BlogPostMeta[]>([])

  useEffect(() => {
    setPageMeta(
      `Blog — ${SITE.name}`,
      'Artikel zu Fokus, Kapazität und Alltag mit Tagesanker.',
    )
    void loadBlogIndex().then(setPosts)
  }, [])

  return (
    <main className="mkt-main mkt-narrow">
      <header className="mkt-page-head">
        <h1>Blog</h1>
        <p>Kurze Texte zu Halt, Fokus und Alltag — ohne Optimierungszwang.</p>
      </header>
      <ul className="mkt-post-list mkt-post-list-lg">
        {posts.map((post) => (
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
