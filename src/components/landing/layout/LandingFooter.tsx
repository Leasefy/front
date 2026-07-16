import Link from 'next/link'

interface FooterLink {
  label: string
  href: string
}

// New taxonomy under /productos/{slug} — routes land in SLICE 5; hrefs
// are real from day one (design §5), even before the page exists.
const PRODUCT_LINKS: FooterLink[] = [
  { label: 'CRM inmobiliario', href: '/productos/crm' },
  { label: 'ERP de arriendos', href: '/productos/erp' },
  { label: 'Asegurabilidad', href: '/productos/asegurabilidad' },
  { label: 'Matching', href: '/productos/matching' },
  { label: 'Cobranza', href: '/productos/cobranza' },
]

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
        <Link href="/" aria-label="Leasefy — inicio" className="landing-footer__logo">
          Leasefy
        </Link>
        <p>
          El sistema operativo inteligente para inmobiliarias: CRM, ERP y agentes AI para operar
          arriendos de punta a punta.
        </p>
        <div className="landing-footer__cta">
          <Link href="/registro">Empezar ahora</Link>
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
