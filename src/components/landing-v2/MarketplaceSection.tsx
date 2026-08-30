'use client'

/**
 * MarketplaceSection — la puerta del inquilino en la landing nueva.
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 * El explorador de inmuebles (`/propiedades`) funciona desde hace rato, pero
 * la landing nueva **no lo enlazaba desde ningún lado**: su header es
 * autocontenido (port 1:1 del standalone) y sólo ofrece Producto, Avalúos,
 * Blog y Contacto. La vieja sí lo tenía — «Buscar Inmueble» en el `Navbar` —
 * y al cambiar de landing esa puerta se cerró sin que nadie la cerrara a
 * propósito. Una ruta que nada enlaza no es una pantalla.
 *
 * De la reunión del 11-08 (Nico + Juan): hoy el inquilino llega por Google a
 * Fincaraíz o Ciencuadras, no a Leasefy. Si el marketplace no se ve, la
 * inmobiliaria sigue dependiendo del portal de siempre y el recorrido
 * completo —postular, aprobación, contrato— nunca arranca acá.
 *
 * ── Qué NO hace ───────────────────────────────────────────────────────────
 * No reimplementa el explorador. Muestra inmuebles **reales** (`GET
 * /properties`, público, sin token) y manda a `/propiedades`, que es donde
 * viven el mapa, los filtros y la búsqueda por texto.
 *
 * ── Los cuatro estados ────────────────────────────────────────────────────
 * Esta sección vive en una página de marketing, así que un fallo no puede
 * gritar. Pero tampoco puede mentir: si la carga falla, la sección **se
 * retira entera** en vez de decir «no hay inmuebles», que es lo que se leería
 * si sólo mirara `length === 0`. Un vacío es una afirmación sobre el mundo.
 */

import { useEffect, useState } from 'react'

import { propertiesApi } from '@/lib/api/properties.service'
import type { Property } from '@/lib/types/property'

/** Cuántas se muestran de vitrina. El resto está en el explorador. */
const CUANTAS = 6

/**
 * Se piden más de las que se muestran porque `GET /properties` **no acepta
 * filtro de estado** (`PropertyFiltersParams` no tiene `status`), así que las
 * arrendadas se descartan acá. Pedir exactamente 6 dejaba la vitrina corta en
 * cuanto una estuviera ocupada.
 */
const CUANTAS_PEDIDAS = 18

function precio(cop: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(cop)
}

/**
 * T-0038: `GET /properties` mixes RENT and SALE listings (contract.md
 * §3.7 — no server-side default). A SALE listing's `monthlyRent` is `null`
 * — never format it as currency (`precio(null)` would need a coalesce, and
 * a coalesced `0` reads as a free property, C6). Render "Sin dato" instead
 * of guessing.
 */
function precioTarjeta(p: Property): string {
  if (p.listingType === 'sale') {
    return p.salePrice != null ? precio(p.salePrice) : 'Sin dato'
  }
  return p.monthlyRent != null ? precio(p.monthlyRent) : 'Sin dato'
}

/** «2 hab · 2 baños · 72 m²», saltando lo que no venga. */
function ficha(p: Property): string {
  const partes: string[] = []
  if (p.bedrooms > 0) partes.push(`${p.bedrooms} hab`)
  if (p.bathrooms > 0) partes.push(`${p.bathrooms} ${p.bathrooms === 1 ? 'baño' : 'baños'}`)
  if (p.area > 0) partes.push(`${p.area} m²`)
  return partes.join(' · ')
}

function donde(p: Property): string {
  return [p.neighborhood, p.city].filter(Boolean).join(', ')
}

export function MarketplaceSection() {
  const [inmuebles, setInmuebles] = useState<Property[] | null>(null)
  const [fallo, setFallo] = useState(false)

  useEffect(() => {
    let cancelado = false
    propertiesApi
      .list({ limit: CUANTAS_PEDIDAS })
      .then((r) => {
        if (cancelado) return
        setInmuebles(r.data.filter((p) => p.status === 'available').slice(0, CUANTAS))
      })
      .catch(() => {
        if (!cancelado) setFallo(true)
      })
    return () => {
      cancelado = true
    }
  }, [])

  // Falló, o llegó vacío: la sección no se pinta. En una landing, una vitrina
  // vacía es peor que no tener vitrina — y un cartel de error, peor todavía.
  if (fallo || (inmuebles !== null && inmuebles.length === 0)) return null

  const cargando = inmuebles === null

  return (
    <section className="sec mkt" id="inmuebles" data-testid="landing-marketplace">
      <div className="container">
        {/* Sin `.slabel` ni número de sección: NINGUNA otra sección de esta
            landing los usa —todas abren directo con el `h-big`— y el «( 05 )»
            que tenía acá no numeraba ninguna secuencia real. Un marcador
            ordinal sólo se gana su lugar cuando el orden dice algo. */}
        <div className="mkt-head">
          <h2 className="h-big">Encontrá tu próximo arriendo.</h2>
          <p className="lead">
            Inmuebles de inmobiliarias que ya operan con Leasefy. Te postulás una sola vez y con
            esa aprobación te alcanzan todos los que entren en tu presupuesto.
          </p>
        </div>

        {cargando ? (
          <ul className="mkt-grid" aria-busy="true">
            {Array.from({ length: CUANTAS }).map((_, i) => (
              <li key={i} className="mkt-card mkt-skel" aria-hidden="true">
                <span className="mkt-ph" />
                <span className="mkt-lines">
                  <i />
                  <i />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mkt-grid">
            {inmuebles.map((p) => (
              <li key={p.id} className="mkt-card">
                <a href={`/propiedades/${p.id}`}>
                  <span className="mkt-ph">
                    {p.images[0] ? (
                      // Imagen del backend: dominios variables, así que <img>
                      // normal en vez de next/image (que exige allowlist).
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt="" loading="lazy" />
                    ) : (
                      <span className="mkt-noimg" aria-hidden="true" />
                    )}
                  </span>
                  <span className="mkt-body">
                    <b className="mkt-precio">{precioTarjeta(p)}</b>
                    <span className="mkt-donde">{donde(p)}</span>
                    <span className="mkt-ficha">{ficha(p)}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}

        <div className="mkt-cta">
          <a className="btn primary lg" href="/propiedades">
            Ver todos los inmuebles <span className="ar">→</span>
          </a>
          <a className="btn outline lg" href="/aprobacion">
            Conocé tu tope de arriendo
          </a>
        </div>
      </div>
    </section>
  )
}

export default MarketplaceSection
