import Link from 'next/link'
import Image from 'next/image'
import type { BlogPost } from '@/lib/data/blog-posts'

interface BlogArticleProps {
  post: BlogPost
  related: BlogPost[]
}

/**
 * Blog article presentation (landing-react-port SLICE 6), restyled to the
 * landing language. `BlogPost` (`blog-posts.ts`) is UNTOUCHED (design §2) —
 * this component only changes how the same data renders.
 */
export function BlogArticle({ post, related }: BlogArticleProps) {
  return (
    <article className="landing-ba" data-testid="blog-article">
      <div className="landing-ba__hero">
        <Image src={post.image} alt={post.title} fill className="landing-ba__hero-img" sizes="100vw" priority />
        <div className="landing-ba__hero-shade" aria-hidden="true" />
        <div className="landing-ba__hero-content">
          <p className="landing-ba__hero-meta">
            <span className="landing-ba__cat" data-testid="article-category">
              {post.category}
            </span>
            <span>{post.date}</span>
            <span aria-hidden="true">·</span>
            <span>{post.readTime}</span>
          </p>
          <h1 data-testid="article-title">{post.title}</h1>
        </div>
      </div>

      <div className="landing-ba__wrap">
        <Link href="/blog" className="landing-ba__back" data-testid="article-back">
          <i aria-hidden="true">←</i> Volver al blog
        </Link>

        <div className="landing-ba__body" data-testid="article-body">
          {post.content ? (
            renderContent(post.content)
          ) : (
            <p className="landing-ba__empty">Este artículo estará disponible pronto.</p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="landing-ba__related" data-testid="article-related">
          <div className="landing-ba__wrap">
            <h2>Artículos relacionados</h2>
            <div className="landing-bp__grid">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={item.href}
                  className="landing-bp__card"
                  data-testid="article-related-card"
                >
                  <div className="landing-bp__media" style={{ backgroundImage: `url(${item.image})` }}>
                    <span className="landing-bp__cat">{item.category}</span>
                  </div>
                  <div className="landing-bp__body">
                    <p className="landing-bp__meta">{item.date}</p>
                    <h3>{item.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  )
}

/**
 * Renders the post's markdown-lite content — `## ` headings, `**bold**`
 * paragraph labels, numbered `**Title**: body` list items, and inline
 * `**bold**` emphasis. Ported verbatim from the pre-restyle `blog/[slug]`
 * page (logic untouched, only the surrounding chrome/typography changed).
 */
function renderContent(content: string) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  for (const line of lines) {
    if (line.startsWith('## ')) {
      elements.push(<h2 key={key++}>{line.slice(3)}</h2>)
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <p className="landing-ba__label" key={key++}>
          {line.slice(2, -2)}
        </p>,
      )
    } else if (line.match(/^\d+\.\s\*\*/)) {
      const text = line.replace(/\*\*(.*?)\*\*/g, '$1')
      const match = line.match(/^\d+\.\s\*\*(.*?)\*\*:\s?(.*)/)
      if (match) {
        elements.push(
          <li key={key++}>
            <strong>{match[1]}</strong>: {match[2]}
          </li>,
        )
      } else {
        elements.push(<li key={key++}>{text}</li>)
      }
    } else if (line.trim() === '') {
      elements.push(<div key={key++} className="landing-ba__spacer" />)
    } else {
      const parts = line.split(/(\*\*.*?\*\*)/g)
      elements.push(
        <p key={key++}>
          {parts.map((part, i) =>
            part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
          )}
        </p>,
      )
    }
  }

  return elements
}
