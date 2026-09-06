import Link from 'next/link'
import { Reveal } from '@/components/landing/motion/Reveal'
import { VignetteRenderer } from '@/components/landing/product/vignettes/VignetteRenderer'
import { PRODUCTS } from '@/lib/landing/products'
import { LANDING_TEXTURES } from '@/lib/landing/assets'
import type { ProductSlug } from '@/lib/landing/types'

interface ProductPageProps {
  slug: ProductSlug
}

/**
 * Plantilla de las ocho internas de producto.
 *
 * Rediseñada el 2026-09-05 (Nico: «quiero que le hagas un glow up a cada
 * interna de producto, que queden hermosas»). Lo que se veía barato era
 * concreto y se fue:
 *
 * · La portada del hero era una de las texturas borrosas t1–t7, rotada, con
 *   el nombre encima: leía como placeholder. Ahora es una tarjeta oscura del
 *   módulo —índice gigante, nombre, eyebrow— con la textura al fondo como
 *   una aurora tenue, en la línea del hero oscuro del home. La textura sigue
 *   ahí (y el test que la fija también), pero como grano, no como foto.
 * · El cierre era el banner del home viejo: un WebP animado de 3,5 MB que en
 *   una pantalla completa se veía como un borrón oscuro de mil píxeles con
 *   texto ilegible encima. Ahora cierra con el `demoPrompt` del producto
 *   —copy real que existía en el catálogo y nadie mostraba— y los dos CTA.
 * · El panel nocturno llevaba la misma textura como fondo. Ahora es Onyx con
 *   un resplandor azul y el grano tenue.
 *
 * La estructura no cambia: hero → ventana de la app (2-3 viñetas) → tres
 * historias alternadas → cuatro capacidades → ficha → tres pasos → panel
 * nocturno → cierre. Los `data-testid` son los de siempre. Las composiciones
 * en zigzag de las cabeceras (split / center / side / right) se conservan:
 * es una regla de Nico que no todo el texto salga de la izquierda.
 *
 * Los textos salen de `products.ts` sin tocar; el catálogo es la única
 * fuente. El pie lo pone el layout del grupo `(landing)`.
 */
export function ProductPage({ slug }: ProductPageProps) {
  const product = PRODUCTS[slug]
  const texture = LANDING_TEXTURES[product.textureId]
  const [primaryCta, secondaryCta] = product.ctas
  const indice = indiceDelModulo(product.eyebrow)

  return (
    <article className="landing-pp" data-testid="product-page">
      <section className="landing-pp__hero">
        <div className="landing-pp__hero-grid">
          <div className="landing-pp__hero-copy">
            <p className="landing-pp__eyebrow">
              <span className="landing-pp__eyebrow-k" data-testid="product-eyebrow">
                {product.eyebrow}
              </span>
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
              <Link href={secondaryCta.href} className="btn outline lg" data-testid="product-cta-secondary">
                {secondaryCta.label}
              </Link>
            </div>
          </div>

          <div
            className="landing-pp__cover"
            data-testid="product-cover"
            aria-hidden="true"
            style={{ backgroundImage: `url(${texture.src})` }}
          >
            <span className="landing-pp__cover-shade" />
            <i className="landing-pp__cover-kicker">{product.eyebrow}</i>
            <span className="landing-pp__cover-index">{indice}</span>
            <b className="landing-pp__cover-title">{product.name}</b>
          </div>
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
                  <p className="landing-pp__story-kicker">
                    <span className="landing-pp__story-n">{`0${i + 1}`}</span>
                    {story.kicker}
                  </p>
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
                   * `value` es copy estático del catálogo que puede traer un
                   * `<b>` literal para énfasis — nunca entrada de usuario ni
                   * del back, así que se inyecta tal cual.
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
        <div className="landing-pp__npanel">
          <span
            className="landing-pp__npanel-grain"
            aria-hidden="true"
            style={{ backgroundImage: `url(${texture.src})` }}
          />
          <span className="landing-pp__npanel-shade" aria-hidden="true" />
          <div className="landing-pp__npanel-text">
            <p className="landing-pp__night-kicker">{product.night.kicker}</p>
            {/* `h2` puede traer un `<em>` literal para énfasis (copy del catálogo). */}
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
                {/* `text` puede traer un `<span class="lb">` literal (copy del catálogo). */}
                <span data-testid="product-night-log-text" dangerouslySetInnerHTML={{ __html: entry.text }} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-pp__close" data-testid="closing-banner">
        <div className="landing-pp__close-wrap">
          <p className="landing-pp__close-kicker">Demo</p>
          <h2>Pon tu operación en piloto automático y dedícate a traer clientes.</h2>
          <p className="landing-pp__close-prompt" data-testid="product-demo-prompt">
            {product.demoPrompt}
          </p>
          <div className="landing-pp__close-ctas">
            <Link href={primaryCta.href} className="btn primary lg" data-testid="closing-banner-cta">
              {primaryCta.label}
            </Link>
            <Link href={secondaryCta.href} className="btn inverse lg">
              {secondaryCta.label}
            </Link>
          </div>
        </div>
      </section>
    </article>
  )
}

/**
 * El número del módulo sale del eyebrow del catálogo («Sistema · Módulo 01»,
 * «Agentes AI · 03»): es el índice que ya usa el mega-menú, así que la
 * portada y el menú dicen lo mismo sin un campo nuevo.
 */
function indiceDelModulo(eyebrow: string): string {
  const n = eyebrow.match(/(\d{2})\s*$/)
  return n ? n[1] : '01'
}

interface ProductSectionHeadProps {
  eyebrow: string
  title: string
  lede: string
  variant?: 'split' | 'center' | 'right'
}

/**
 * Las cabeceras en zigzag (split / center / side-sticky / right). La cuarta
 * —side-sticky, la de la ficha— no tiene `variant` porque además necesita su
 * propia grilla de dos columnas (`landing-pp__side2`, que pone quien la usa
 * alrededor de la cabecera y la tabla); lo pegajoso es CSS sobre
 * `.landing-pp__side2 .landing-pp__shead`.
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
