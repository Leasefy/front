import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import { landingRobots } from '@/lib/landing/landing-stage'
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
export const metadata: Metadata = {
  title: 'Leasefy — El sistema operativo inteligente para inmobiliarias',
  description:
    'CRM, ERP y agentes AI en una sola plataforma para centralizar y automatizar la operación de arriendos: solicitudes, evaluación de inquilinos, asegurabilidad, contratos, cobros, propietarios y retención.',
  robots: landingRobots(),
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
