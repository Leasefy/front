import Link from 'next/link'
import { Reveal } from '@/components/landing/motion/Reveal'
import { VignetteRenderer } from '@/components/landing/product/vignettes/VignetteRenderer'
import { ClosingBanner } from '@/components/landing/home/ClosingBanner'
import { LandingFooter } from '@/components/landing/layout/LandingFooter'
import { PRODUCTS } from '@/lib/landing/products'
import { LANDING_TEXTURES } from '@/lib/landing/assets'
import type { ProductSlug } from '@/lib/landing/types'

interface ProductPageProps {
  slug: ProductSlug
}

/**
 * Shared product-page template (landing-react-port SLICE 4b), ported from
 * the standalone's `#productPage` (`landing-standalone/index.html`
 * ~L2830-2897) + `__renderProduct` (~L3723-3773). Every product renders
 * through the same structure: hero (eyebrow/badge/H1/lead/2 CTAs + rotated
 * square cover) -> app-window (`.pp-win`, 2-3 vignettes) -> 3 alternating
 * stories -> 4 capabilities -> snapshot spec table -> 3 steps -> night
 * activity panel -> closing banner + footer.
 *
 * Per HANDOFF "Cierre de las internas": the standalone's final CTA block
 * (expectation bullets + "otros productos" tiles) was REMOVED — every
 * product page now ends directly with the closing video banner + footer,
 * cloned at runtime in the standalone (duplicated DOM + `__stripAnchors`
 * sanitation) but simply COMPOSED here: `ClosingBanner`/`LandingFooter` are
 * the exact same components the home renders, no cloning needed in React.
 *
 * `product.name`/`product.h1` are the seam SLICE 5's thin route shells
 * will read to build each route's unique `<metadata>` (title/description)
 * — this shared template renders no metadata itself (App Router metadata
 * is a route-level export, not a shared-component concern).
 *
 * Gradients-as-jewels (HANDOFF §7, user rule: "no todo con fondo de
 * gradientes"): only the hero cover (`landing-pp__cover`) and the night
 * panel (`landing-pp__npanel`) carry a texture + gradient treatment in
 * this template.
 */
export function ProductPage({ slug }: ProductPageProps) {
  const product = PRODUCTS[slug]
  const texture = LANDING_TEXTURES[product.textureId]
  const [primaryCta, secondaryCta] = product.ctas

  return (
    <article className="landing-pp" data-testid="product-page">
      <section className="landing-pp__hero">
        <div
          className="landing-pp__cover"
          data-testid="product-cover"
          aria-hidden="true"
          style={{ backgroundImage: `url(${texture.src})` }}
        >
          <span className="landing-pp__cover-shade" />
          <i className="landing-pp__cover-kicker">{product.eyebrow}</i>
          <b className="landing-pp__cover-title">{product.name}</b>
        </div>

        <p className="landing-pp__eyebrow">
          <span data-testid="product-eyebrow">{product.eyebrow}</span>
          <span className="landing-pp__badge" data-testid="product-badge">
            {product.badge}
          </span>
        </p>
        <h1 className="landing-pp__h1" data-testid="product-h1">
          {product.h1}
        </h1>
        <p className="landing-pp__lead" data-testid="product-lead">
          {product.lead}
        </p>
        <div className="landing-pp__ctas">
          <Link href={primaryCta.href} className="btn primary lg" data-testid="product-cta-primary">
            {primaryCta.label}
          </Link>
          <Link href={secondaryCta.href} className="landing-pp__cta-ghost" data-testid="product-cta-secondary">
            {secondaryCta.label} <i aria-hidden="true">→</i>
          </Link>
        </div>

        <div className="landing-pp__win" data-testid="product-window">
          <div className="landing-pp__win-bar">
            <span className="landing-pp__win-title">
              <span className="landing-pp__win-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              {product.window.title}
            </span>
            <span className="landing-pp__win-tag">{product.window.tag}</span>
          </div>
          <div className="landing-pp__win-body">
            {product.window.vignettes.map((vignette, i) => (
              <VignetteRenderer key={i} vignette={vignette} />
            ))}
          </div>
        </div>
      </section>

      <div className="landing-pp__body">
        <section className="landing-pp__sec">
          <ProductSectionHead
            eyebrow="Por qué importa"
            title="Lo que cambia en tu operación"
            lede="Tres cambios que se sienten desde la primera semana de operación."
            variant="split"
          />
          <div className="landing-pp__stories">
            {product.stories.map((story, i) => (
              <div
                className={i % 2 === 1 ? 'landing-pp__story landing-pp__story--alt' : 'landing-pp__story'}
                data-testid="product-story"
                key={story.h3}
              >
                <div className="landing-pp__story-copy">
                  <p className="landing-pp__story-kicker">{story.kicker}</p>
                  <h3>{story.h3}</h3>
                  <p>{story.body}</p>
                </div>
                <div className="landing-pp__story-pane">
                  <VignetteRenderer vignette={story.vignette} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-pp__sec">
          <ProductSectionHead
            eyebrow="Capacidades"
            title="Qué hace por ti"
            lede="Lo esencial, sin letra menuda."
            variant="center"
          />
          <div className="landing-pp__caps">
            {product.capabilities.map((cap, i) => (
              <div className="landing-pp__cap" data-testid="product-capability" key={cap.title}>
                <i>{`C-0${i + 1}`}</i>
                <b>{cap.title}</b>
                <p>{cap.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-pp__sec">
          <div className="landing-pp__side2">
            <ProductSectionHead
              eyebrow="Snapshot"
              title="La ficha, sin adornos"
              lede="Los datos duros para decidir rápido — qué es, qué reemplaza y cuándo está operando."
            />
            <div className="landing-pp__spec" data-testid="product-snapshot">
              {product.snapshot.map((row) => (
                <div className="landing-pp__spec-row" data-testid="product-snapshot-row" key={row.label}>
                  <span className="landing-pp__spec-label">{row.label}</span>
                  {/*
                   * `value` is static, developer-authored copy that may
                   * carry a literal `<b>` for inline emphasis, ported
                   * verbatim from the standalone (types.ts
                   * ProductSnapshotRow doc comment) — never user/backend
                   * input, safe to inject directly (same rationale as
                   * StatVignette.tsx, S4a).
                   */}
                  <span className="landing-pp__spec-value" dangerouslySetInnerHTML={{ __html: row.value }} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-pp__sec">
          <ProductSectionHead
            eyebrow="Puesta en marcha"
            title="Así entra a operar"
            lede="Sin proyectos eternos: se prende por fases, contigo al volante."
            variant="right"
          />
          <div className="landing-pp__steps">
            {product.steps.map((step, i) => (
              <div className="landing-pp__step" data-testid="product-step" key={step.title}>
                <i>{`Paso 0${i + 1}`}</i>
                <b>{step.title}</b>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="landing-pp__night" data-testid="product-night">
        <div className="landing-pp__npanel" style={{ backgroundImage: `url(${texture.src})` }}>
          <span className="landing-pp__npanel-shade" aria-hidden="true" />
          <div className="landing-pp__npanel-text">
            <p className="landing-pp__night-kicker">{product.night.kicker}</p>
            {/* `h2` may carry a literal `<em>` for inline emphasis (verbatim standalone copy). */}
            <h2 className="landing-pp__night-h2" dangerouslySetInnerHTML={{ __html: product.night.h2 }} />
            <p className="landing-pp__night-quote">{product.night.quote}</p>
          </div>
          <div className="landing-pp__npanel-log">
            <div className="landing-pp__log-header">
              <span>{`Registro de actividad · ${product.name}`}</span>
              <b>En vivo</b>
            </div>
            {product.night.log.map((entry, i) => (
              <Reveal className="landing-pp__log-row" delay={i * 0.1} key={`${entry.time}-${i}`}>
                <span className="landing-pp__log-time" data-testid="product-night-log-time">
                  {entry.time}
                </span>
                {/* `text` may carry a literal `<span class="lb">` (verbatim standalone copy). */}
                <span data-testid="product-night-log-text" dangerouslySetInnerHTML={{ __html: entry.text }} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <ClosingBanner />
      <LandingFooter />
    </article>
  )
}

interface ProductSectionHeadProps {
  eyebrow: string
  title: string
  lede: string
  variant?: 'split' | 'center' | 'right'
}

/**
 * The `.pp-shead` zigzag compositions HANDOFF explicitly calls out
 * (split/center/side-sticky/right — user rule: "todo el texto sale de la
 * izquierda", do NOT left-align every section). The 4th composition
 * (side-sticky, used by the Snapshot section) has no `variant` here
 * because it also needs its own two-column grid wrapper
 * (`landing-pp__side2`, applied by the caller around both the head and
 * the spec table) — the sticky behavior is CSS targeting
 * `.landing-pp__side2 .landing-pp__shead` directly, not a head variant.
 */
function ProductSectionHead({ eyebrow, title, lede, variant }: ProductSectionHeadProps) {
  return (
    <div
      className={variant ? `landing-pp__shead landing-pp__shead--${variant}` : 'landing-pp__shead'}
      data-testid="product-section-head"
    >
      <div className="landing-pp__shead-copy">
        <p className="landing-pp__shead-eyebrow">{eyebrow}</p>
        <h2 className="landing-pp__shead-title">{title}</h2>
      </div>
      <p className="landing-pp__shead-lede">{lede}</p>
    </div>
  )
}
