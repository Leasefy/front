'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { PRODUCTS, PRODUCT_SLUGS } from '@/lib/landing/products'

/**
 * Products mega menu, ported from the standalone's `#pmenu` dropdown
 * (`landing-standalone/index.html` ~L1831-1854, CSS ~L1572-1592): an
 * "El sistema" column (CRM + ERP, the standalone's `.pm-big` tiles with a
 * large ghost index number) and an "Agentes AI" column (the other 6
 * products, `.pm-list`).
 *
 * DEVIATION FROM HANDOFF/design (documented, not silent): both HANDOFF
 * point 6 ("Mega menú con tiles de arte .pm-art t5/t3") and design (#261
 * §6, "Cohere-style .pm-big tiles with texture art t5/t3") describe
 * texture-backed tiles. Verified against the actual final standalone
 * markup/CSS (`index.html` ~L1572-1592 CSS, ~L1831-1854 DOM): there is NO
 * `.pm-art` class anywhere, in either the CSS or the rendered `#pmenu`
 * markup. HANDOFF point 5b ("El mega menú volvió a su versión limpia sin
 * tiles de arte") is the version that actually shipped — point 6's
 * changelog note describes an EARLIER iteration that was reverted before
 * the final state committed to `index.html`. Ported the real, plain
 * two-column layout (no texture backgrounds) rather than inventing art
 * tiles that don't exist in the source of truth, same "verify against the
 * actual artifact, not the changelog narrative" discipline established in
 * S2 (byte-diffed line-number corrections) and S3c (the `--primary`
 * color-match claim).
 *
 * Groups products by `eyebrow` prefix ("Sistema" vs "Agentes AI") instead
 * of a hardcoded slug list, so the grouping stays correct if `PRODUCTS`
 * ever reorders or gains an entry.
 *
 * A11y (R1 fix): rendered as a plain disclosure panel, not an ARIA menu —
 * the panel holds regular links, not `menuitem`s, so `role="menu"` was a
 * mismatch with no keyboard support to back it up. The trigger's
 * `aria-expanded`/`aria-controls` plus the parent `<nav>` landmark (see
 * `LandingHeader`) are the real a11y contract here. Escape and
 * click-outside both close the panel per docs/DESIGN.md overlay rules.
 */
export function MegaMenu() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const products = PRODUCT_SLUGS.map((slug) => PRODUCTS[slug])
  const systemProducts = products.filter((product) => product.eyebrow.startsWith('Sistema'))
  const agentProducts = products.filter((product) => product.eyebrow.startsWith('Agentes'))

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div
      ref={containerRef}
      className="landing-mega"
      data-testid="mega-menu"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="landing-mega__trigger"
        aria-expanded={open}
        aria-controls="landing-mega-panel"
        onClick={() => setOpen((current) => !current)}
      >
        Producto <i aria-hidden="true">▾</i>
      </button>

      {open && (
        <div id="landing-mega-panel" className="landing-mega__panel" data-testid="mega-menu-panel">
          <div className="landing-mega__col">
            <p className="landing-mega__kicker">El sistema</p>
            {systemProducts.map((product, i) => (
              <Link
                href={`/productos/${product.slug}`}
                className="landing-mega__big"
                data-testid="mega-menu-tile"
                key={product.slug}
              >
                <span className="landing-mega__index" aria-hidden="true">{`0${i + 1}`}</span>
                <b>{product.name}</b>
                <span>{product.h1}</span>
              </Link>
            ))}
          </div>

          <div className="landing-mega__col">
            <p className="landing-mega__kicker">Agentes AI</p>
            <div className="landing-mega__list">
              {agentProducts.map((product) => (
                <Link
                  href={`/productos/${product.slug}`}
                  className="landing-mega__list-item"
                  data-testid="mega-menu-tile"
                  key={product.slug}
                >
                  <b>{product.name}</b>
                  <span>{product.h1}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
