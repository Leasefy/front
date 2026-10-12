import Link from 'next/link'
import type { CSSProperties } from 'react'
import { Reveal } from '@/components/landing/motion/Reveal'
import { MarcoDeCaptura } from '@/components/landing/product/MarcoDeCaptura'
import { RecorridoDelProducto } from '@/components/landing/product/RecorridoDelProducto'
import { PRODUCTS } from '@/lib/landing/products'
import { CAPTURAS, type PasoDelRecorrido } from '@/lib/landing/capturas'
import type { ProductSlug } from '@/lib/landing/types'

interface ProductPageProps {
  slug: ProductSlug
}

/**
 * Plantilla de las ocho internas de producto.
 *
 * Segundo glow up (Nico, 12-10-2026: «un glow up muy grande, que no se sienta
 * como IA, sino con nuestro estilo, y donde haya imágenes… sácalo directamente
 * del producto»). Lo que se fue y por qué:
 * · La tarjeta oscura con el índice gigante sobre una textura borrosa, y las
 *   viñetas dibujadas a mano: se leían como un mockup genérico. Ahora todo lo
 *   que ilustra es una PANTALLA REAL del panel (`lib/landing/capturas.ts`),
 *   fotografiada con una inmobiliaria de demostración.
 * · El «registro de actividad» inventado del panel nocturno: ahora es la misma
 *   pantalla en modo oscuro, que el producto tiene de verdad.
 *
 * Recorrido: portada (texto + la pantalla que se aplana al bajar, con un
 * cursor que señala lo importante) → las tres historias contadas sobre la
 * pantalla fija que se acerca a cada parte → capacidades con recortes reales →
 * ficha → pasos → de noche → cierre. Los textos salen de `products.ts`; el pie
 * lo pone el layout del grupo `(landing)`.
 */
export function ProductPage({ slug }: ProductPageProps) {
  const product = PRODUCTS[slug]
  const capturas = CAPTURAS[slug]
  const [primaryCta, secondaryCta] = product.ctas

  return (
    <article className="landing-pp landing-pr" data-testid="product-page">
      <section className="landing-pr-portada">
        <div className="landing-pr-portada-texto">
          <p className="landing-pp__eyebrow">
            <span className="landing-pp__eyebrow-k" data-testid="product-eyebrow">
              {product.eyebrow}
            </span>
            <span className="landing-pp__badge" data-testid="product-badge">
              {product.badge}
            </span>
          </p>
          <h1 className="landing-pr-h1" data-testid="product-h1">
            {product.h1}
          </h1>
          <div className="landing-pr-portada-pie">
            <p className="landing-pr-lead" data-testid="product-lead">
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
        </div>
        <div className="landing-pr-portada-escena">
          <MarcoDeCaptura
            captura={capturas.portada}
            notas={capturas.notas}
            inclinada
            prioritaria
            data-testid="product-window"
          />
        </div>
      </section>

      <div className="landing-pp__body">
        <section className="landing-pp__sec">
          <ProductSectionHead
            eyebrow="Por qué importa"
            title="Lo que cambia en tu operación"
            lede="Tres cambios que se sienten desde la primera semana, contados sobre la pantalla real."
            variant="split"
          />
          <RecorridoDelProducto historias={product.stories} pasos={capturas.recorrido} />
        </section>

        <section className="landing-pp__sec">
          <ProductSectionHead
            eyebrow="Capacidades"
            title="Qué hace por ti"
            lede="Cada pieza, tal como se ve en el panel."
            variant="center"
          />
          <div className="landing-pr-bento">
            {product.capabilities.map((cap, i) => (
              <Reveal className="landing-pr-cap" delay={i * 0.06} key={cap.title}>
                <div data-testid="product-capability">
                  <Recorte paso={capturas.recortes[i]} />
                  <div className="landing-pr-cap-texto">
                    <i>{capturas.recortes[i]?.etiqueta ?? `C-0${i + 1}`}</i>
                    <b>{cap.title}</b>
                    <p>{cap.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="landing-pp__sec">
          <div className="landing-pp__side2">
            <ProductSectionHead
              eyebrow="Ficha"
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
          <ol className="landing-pr-pasos">
            {product.steps.map((step, i) => (
              <Reveal className="landing-pr-paso" delay={i * 0.12} key={step.title}>
                <div data-testid="product-step">
                  <span className="landing-pr-paso-n" aria-hidden="true">{`0${i + 1}`}</span>
                  <b>{step.title}</b>
                  <p>{step.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </section>
      </div>

      <section className="landing-pr-noche" data-testid="product-night">
        <div className="landing-pr-noche-texto">
          <p className="landing-pp__night-kicker">{product.night.kicker}</p>
          {/* `h2` puede traer un `<em>` literal para énfasis (copy del catálogo). */}
          <h2 className="landing-pp__night-h2" dangerouslySetInnerHTML={{ __html: product.night.h2 }} />
          <p className="landing-pp__night-quote">{product.night.quote}</p>
        </div>
        <div className="landing-pr-noche-escena">
          <MarcoDeCaptura captura={capturas.oscura} inclinada oscuro />
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
 * Un pedazo de una captura real, recortado con CSS (sin imágenes nuevas): la
 * imagen se agranda para que el recorte llene la tarjeta y se corre a su lugar.
 */
function Recorte({ paso }: { paso?: PasoDelRecorrido }) {
  if (!paso) return null
  const { x, y, w, h } = paso.foco
  const estilo: CSSProperties = {
    backgroundImage: `url(${paso.captura.src})`,
    backgroundSize: `${10000 / w}% auto`,
    backgroundPosition: `${w >= 100 ? 0 : (x / (100 - w)) * 100}% ${h >= 100 ? 0 : (y / (100 - h)) * 100}%`,
    // La proporción del recorte en la captura (1440 × 900).
    aspectRatio: `${(w * 16) / (h * 10)}`,
  }
  return <div className="landing-pr-recorte" style={estilo} role="img" aria-label={paso.captura.alt} />
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
