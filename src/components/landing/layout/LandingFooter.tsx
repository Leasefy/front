import Link from 'next/link'
import { BrandHomeLink } from '@/components/brand/BrandHomeLink'
import { PRODUCTS, PRODUCT_SLUGS } from '@/lib/landing/products'

interface FooterLink {
  label: string
  href: string
}

// Sourced from the same PRODUCT_SLUGS/PRODUCTS catalog as <MegaMenu> (S4b)
// instead of a hand-maintained duplicate list — every product route stays
// in sync automatically and can't silently drift out of the footer.
const PRODUCT_LINKS: FooterLink[] = PRODUCT_SLUGS.map((slug) => ({
  label: PRODUCTS[slug].name,
  href: `/productos/${slug}`,
}))

const COMPANY_LINKS: FooterLink[] = [
  { label: 'Blog', href: '/blog' },
  { label: 'Contacto', href: '/contacto' },
]

const SUPPORT_EMAIL = 'hola@leasefy.com'

/**
 * Landing footer, reused across home + every internal landing route. All
 * internal links use real Next `<Link>` routes (spec: Real Navigation) —
 * no hash fragments. `mailto:` and external links (WhatsApp) are the only
 * non-`<Link>` anchors, matching the standalone port's footer.
 */
export function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="landing-footer">
      <div className="landing-footer__brand">
        {/* Brand — authenticated users go to their dashboard, not the landing */}
        <BrandHomeLink aria-label="Leasefy — inicio" className="landing-footer__logo">
          Leasefy
        </BrandHomeLink>
        <p>
          El sistema operativo inteligente para inmobiliarias: CRM, ERP y agentes AI para operar
          arriendos de punta a punta.
        </p>
        <div className="landing-footer__cta">
          <Link href="/auth?mode=register">Empezar ahora</Link>
          <a href="https://wa.me/573000000000" target="_blank" rel="noopener noreferrer">
            Escribir por WhatsApp
          </a>
        </div>
      </div>

      <nav aria-label="Producto" className="landing-footer__col">
        <p>Producto</p>
        <ul>
          {PRODUCT_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label="Empresa" className="landing-footer__col">
        <p>Empresa</p>
        <ul>
          {COMPANY_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
          <li>
            <a href={`mailto:${SUPPORT_EMAIL}`}>Soporte</a>
          </li>
        </ul>
      </nav>

      <div className="landing-footer__bottom">
        <p>© {year} Leasefy. Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}
