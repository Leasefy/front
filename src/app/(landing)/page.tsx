import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import { landingRobots } from '@/lib/landing/landing-stage'
import { alternativasDelIdioma, idiomaDeLaPeticion } from '@/lib/idioma/metadata'
import { ForceLightMode } from '@/components/providers/ForceLightMode'
import LandingHome from '@/components/landing-v2/LandingHome'
import LogoDefs from '@/components/landing-v2/LogoDefs'

/**
 * Home (`/`) — F1 final integration (landing-react-port). Renders the v2
 * (Cohere-style) port 1:1: `<LandingHome>` is a self-contained port of the
 * standalone index.html (its own header/nav/footer), so the shared
 * LandingHeader/LandingFooter are suppressed for this route in the parent
 * layout (see (landing)/layout.tsx `SELF_CONTAINED_CHROME_PATHS`).
 *
 * `<LogoDefs>` provides the `#lfLogo` `<symbol>` that LandingHome's
 * `<use href="#lfLogo"/>` references — the earlier /landing-v2 preview
 * omitted it (logo glyph silently missing); F1 fixes that gap.
 *
 * `ForceLightMode` wraps ONLY this page's content, not the whole (landing)
 * route group: v2's CSS (.lv2) assumes a permanently light background by
 * design (no dark-mode media query support), while the OLD landing routes
 * (blog/contacto/productos) already render correctly without it.
 */
const TITULO = {
  es: 'Leasefy — El sistema operativo inteligente para inmobiliarias',
  en: 'Leasefy — The intelligent operating system for real estate agencies',
}
const DESCRIPCION = {
  es: 'CRM, ERP y agentes AI en una sola plataforma para centralizar y automatizar la operación de arriendos: solicitudes, evaluación de inquilinos, asegurabilidad, contratos, cobros, propietarios y retención.',
  en: 'CRM, ERP and AI agents in one platform to centralize and automate your rental operation: applications, tenant screening, insurability, leases, collections, owners and retention.',
}

/**
 * En `/es` y `/en` (16-10-2026). El español queda como estaba (hereda el Open
 * Graph del layout raíz); en inglés lleva el suyo para que al compartir el
 * enlace salga en inglés.
 */
export async function generateMetadata(): Promise<Metadata> {
  const idioma = await idiomaDeLaPeticion()
  const base: Metadata = {
    title: TITULO[idioma],
    description: DESCRIPCION[idioma],
    robots: landingRobots(),
    alternates: alternativasDelIdioma('/', idioma),
  }
  if (idioma === 'es') return base
  return {
    ...base,
    openGraph: {
      type: 'website',
      locale: 'en_US',
      alternateLocale: ['es_CO'],
      url: '/en',
      siteName: 'Leasefy',
      title: TITULO.en,
      description: DESCRIPCION.en,
    },
    twitter: { card: 'summary_large_image', title: TITULO.en, description: DESCRIPCION.en, creator: '@leasefy' },
  }
}

export default function HomePage() {
  return (
    <ForceLightMode>
      <div
        data-testid="lv2-home"
        className="lv2"
        style={
          {
            // Directly-declared value on this element wins over the
            // inherited `--fb` from the ancestor `.landing-scope` wrapper
            // (still Inter Tight there, ADR-2) — scoped to the v2 home only.
            '--fb': 'var(--font-inter)',
          } as CSSProperties
        }
      >
        <LogoDefs />
        <LandingHome />
      </div>
    </ForceLightMode>
  )
}
