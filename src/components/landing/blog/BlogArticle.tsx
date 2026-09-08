import Link from 'next/link'
import Image from 'next/image'
import type { BlogPost } from '@/lib/data/blog-posts'

interface BlogArticleProps {
  post: BlogPost
  related: BlogPost[]
}

/**
 * Artículo del blog.
 *
 * Rediseñado el 2026-09-05 junto con el listado. El título va ARRIBA de la
 * foto, en tinta, en vez de blanco sobre un degradado a pantalla completa:
 * se lee mejor y la foto queda como pieza editorial enmarcada, no como
 * fondo. `BlogPost` (`blog-posts.ts`) no cambia; los `data-testid` tampoco.
 */
export function BlogArticle({ post, related }: BlogArticleProps) {
  return (
    <article className="landing-ba" data-testid="blog-article">
      <div className="landing-ba__wrap">
        <Link href="/blog" className="landing-ba__back" data-testid="article-back">
          <i aria-hidden="true">←</i> Volver al blog
        </Link>

        <header className="landing-ba__head">
          <p className="landing-ba__meta">
            <span className="landing-ba__cat" data-testid="article-category">
              {post.category}
            </span>
            <span>{post.date}</span>
            <span aria-hidden="true">·</span>
            <span>{post.readTime} de lectura</span>
          </p>
          <h1 data-testid="article-title">{post.title}</h1>
          <p className="landing-ba__lede">{post.excerpt}</p>
          <p className="landing-ba__author">
            Por <b>{post.author || 'Equipo Leasefy'}</b>
          </p>
        </header>

        <div className="landing-ba__hero">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="landing-ba__hero-img"
            sizes="(min-width: 1400px) 1304px, 100vw"
            priority
          />
        </div>

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
            <div className="landing-ba__related-head">
              <h2>Sigue leyendo</h2>
              <Link href="/blog">Todos los artículos →</Link>
            </div>
            <div className="landing-bp__grid">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={item.href}
                  className="landing-bp__card"
                  data-testid="article-related-card"
                >
                  <div className="landing-bp__media">
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      sizes="(min-width: 760px) 33vw, 100vw"
                      className="landing-bp__img"
                    />
                    <span className="landing-bp__cat">{item.category}</span>
                  </div>
                  <div className="landing-bp__body">
                    <p className="landing-bp__meta">
                      <span>{item.date}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.readTime}</span>
                    </p>
                    <h3>{item.title}</h3>
                    <span className="landing-bp__more">
                      Leer <i aria-hidden="true">→</i>
                    </span>
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

const LIST_ITEM_RE = /^\d+\.\s\*\*/

/**
 * Renders the post's markdown-lite content — `## ` headings, `**bold**`
 * paragraph labels, numbered `**Title**: body` list items, and inline
 * `**bold**` emphasis. Ported verbatim from the pre-restyle `blog/[slug]`
 * page (logic untouched except for grouping numbered list lines into a
 * single `<ol>` instead of emitting orphan `<li>` elements — a11y fix,
 * see landing-react-port R1). Blank lines between two numbered-list
 * lines are treated as source-formatting spacing (the content data uses
 * a blank line after every numbered item) rather than a real break, so
 * the whole run stays inside one list.
 */
function renderContent(content: string) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0
  let listBuffer: React.ReactNode[] = []

  function flushList() {
    if (listBuffer.length > 0) {
      elements.push(<ol key={key++}>{listBuffer}</ol>)
      listBuffer = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.trim() === '') {
      let nextIndex = i + 1
      while (nextIndex < lines.length && lines[nextIndex].trim() === '') nextIndex++
      const nextIsListItem = nextIndex < lines.length && LIST_ITEM_RE.test(lines[nextIndex])
      if (listBuffer.length > 0 && nextIsListItem) {
        continue
      }
      flushList()
      elements.push(<div key={key++} className="landing-ba__spacer" />)
      continue
    }

    if (line.startsWith('## ')) {
      flushList()
      elements.push(<h2 key={key++}>{line.slice(3)}</h2>)
    } else if (line.startsWith('**') && line.endsWith('**')) {
      flushList()
      elements.push(
        <p className="landing-ba__label" key={key++}>
          {line.slice(2, -2)}
        </p>,
      )
    } else if (LIST_ITEM_RE.test(line)) {
      const text = line.replace(/\*\*(.*?)\*\*/g, '$1')
      const match = line.match(/^\d+\.\s\*\*(.*?)\*\*:\s?(.*)/)
      if (match) {
        listBuffer.push(
          <li key={key++}>
            <strong>{match[1]}</strong>: {match[2]}
          </li>,
        )
      } else {
        listBuffer.push(<li key={key++}>{text}</li>)
      }
    } else {
      flushList()
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

  flushList()

  return elements
}
