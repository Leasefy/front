'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Reveal } from '@/components/landing/motion/Reveal'
import { blogPosts, blogCategories } from '@/lib/data/blog-posts'
import { LANDING_TEXTURES, type TextureId } from '@/lib/landing/assets'

const TEXTURE_IDS: TextureId[] = ['t1', 't2', 't3', 't4', 't5', 't6', 't7']

function textureFor(index: number) {
  return LANDING_TEXTURES[TEXTURE_IDS[index % TEXTURE_IDS.length]]
}

/**
 * Blog listing (landing-react-port SLICE 6), ported from the standalone's
 * `#blogPage` overlay (`landing-standalone/index.html` ~L2773-2827). Data
 * source `blog-posts.ts` is UNTOUCHED (design §2, single source of truth) —
 * this component only restyles presentation to the landing language.
 * Cards reuse the shared t1-t7 texture constants (S2) for editorial art
 * (HANDOFF §5b: textures live only where there was editorial imagery — blog
 * cards and home cédula scenes), cycled by post index rather than
 * hardcoded per-post so a growing `blogPosts` array never runs out.
 */
export function BlogListing() {
  const [activeCategory, setActiveCategory] = useState('Todos')

  const filtered =
    activeCategory === 'Todos' ? blogPosts : blogPosts.filter((post) => post.category === activeCategory)

  const [featured, ...rest] = filtered

  return (
    <div className="landing-bp" data-testid="blog-listing">
      <div className="landing-bp__wrap">
        <header className="landing-bp__head">
          <p className="landing-bp__kicker">Blog</p>
          <h1>Ideas, guías y tendencias del mercado inmobiliario</h1>
          <div className="landing-bp__tabs" role="tablist" aria-label="Filtrar por categoría">
            {blogCategories.map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={activeCategory === category}
                className={
                  activeCategory === category ? 'landing-bp__tab landing-bp__tab--on' : 'landing-bp__tab'
                }
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </header>

        {featured && (
          <Reveal>
            <Link href={featured.href} className="landing-bp__feat" data-testid="blog-featured">
              <div
                className="landing-bp__media"
                style={{ backgroundImage: `url(${textureFor(0).src})` }}
              >
                <span className="landing-bp__gn" aria-hidden="true">
                  01
                </span>
                <span className="landing-bp__cat">{featured.category}</span>
              </div>
              <div className="landing-bp__fbody">
                <p className="landing-bp__meta">
                  {featured.date} · {featured.readTime}
                </p>
                <h2>{featured.title}</h2>
                <p className="landing-bp__excerpt">{featured.excerpt}</p>
                <span className="landing-bp__more">
                  Leer artículo <i aria-hidden="true">→</i>
                </span>
              </div>
            </Link>
          </Reveal>
        )}

        {rest.length > 0 && (
          <div className="landing-bp__grid" data-testid="blog-grid">
            {rest.map((post, index) => (
              <Reveal key={post.slug} delay={index * 0.08}>
                <Link href={post.href} className="landing-bp__card" data-testid="blog-card">
                  <div
                    className="landing-bp__media"
                    style={{ backgroundImage: `url(${textureFor(index + 1).src})` }}
                  >
                    <span className="landing-bp__gn" aria-hidden="true">
                      {String(index + 2).padStart(2, '0')}
                    </span>
                    <span className="landing-bp__cat">{post.category}</span>
                  </div>
                  <div className="landing-bp__body">
                    <p className="landing-bp__meta">
                      {post.date} · {post.readTime}
                    </p>
                    <h3>{post.title}</h3>
                    <p className="landing-bp__excerpt">{post.excerpt}</p>
                    <span className="landing-bp__more">
                      Leer <i aria-hidden="true">→</i>
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
