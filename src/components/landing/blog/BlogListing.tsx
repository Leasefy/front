'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Reveal } from '@/components/landing/motion/Reveal'
import { blogPosts, blogCategories } from '@/lib/data/blog-posts'

/**
 * Listado del blog.
 *
 * Rediseñado el 2026-09-05 (Nico: «hay que darle un glow up a toda la
 * sección de blog, está muy feita»). Antes cada tarjeta llevaba una de las
 * texturas borrosas t1–t7 con un número gigante encima: leía como un
 * placeholder, y el número no decía nada —el orden de los artículos no
 * significa nada—. Cada artículo ya trae su foto (`post.image`, la misma
 * que usa su portada y el Open Graph), así que la tarjeta la usa.
 *
 * `blog-posts.ts` sigue siendo la única fuente de datos; acá sólo cambia
 * cómo se ve. Los `data-testid` y el `role="tablist"` son los de siempre.
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
          <div>
            <p className="landing-bp__kicker">
              Blog <span className="landing-bp__count">· {blogPosts.length} artículos</span>
            </p>
            <h1>Ideas, guías y tendencias del mercado inmobiliario</h1>
            <p className="landing-bp__lede">
              Lo que aprendemos operando arriendos en Colombia, escrito para propietarios, inquilinos e
              inmobiliarias.
            </p>
          </div>
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

        {!featured && (
          <p className="landing-bp__empty" data-testid="blog-empty" role="status">
            Todavía no hay artículos en {activeCategory}. Pronto.
          </p>
        )}

        {featured && (
          <Reveal>
            <Link href={featured.href} className="landing-bp__feat" data-testid="blog-featured">
              <div className="landing-bp__media">
                <Image
                  src={featured.image}
                  alt=""
                  fill
                  sizes="(min-width: 900px) 58vw, 100vw"
                  className="landing-bp__img"
                  priority
                />
                <span className="landing-bp__cat">{featured.category}</span>
              </div>
              <div className="landing-bp__fbody">
                <p className="landing-bp__meta">
                  <span>{featured.date}</span>
                  <span aria-hidden="true">·</span>
                  <span>{featured.readTime} de lectura</span>
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
                  <div className="landing-bp__media">
                    <Image
                      src={post.image}
                      alt=""
                      fill
                      sizes="(min-width: 760px) 33vw, 100vw"
                      className="landing-bp__img"
                    />
                    <span className="landing-bp__cat">{post.category}</span>
                  </div>
                  <div className="landing-bp__body">
                    <p className="landing-bp__meta">
                      <span>{post.date}</span>
                      <span aria-hidden="true">·</span>
                      <span>{post.readTime}</span>
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
