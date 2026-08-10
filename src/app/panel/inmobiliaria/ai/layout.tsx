'use client'

/**
 * AI panel layout.
 *
 * Renders its children verbatim; lo único que agrega es la presentación del
 * agente en la primera visita a su workspace (`AgentIntroModal`).
 *
 * ── Una sola novedad, no dos ──────────────────────────────────────────────
 *
 * Antes convivían dos anuncios: un tour multi-paso anclado al sidebar
 * (`PanelTour`, con foto, contador «1 / 3» y CTA «Siguiente») y esta tarjeta.
 * Se veían encimados y con dos interacciones distintas para lo mismo.
 *
 * Queda **sólo** `AgentIntroModal`, y con una definición única para todas las
 * novedades: CTA **«Entendido»**, sin contador de pasos, y al confirmar
 * **se cierra sin navegar** — el usuario se queda donde estaba.
 *
 * El tour anclado además nunca llegó a funcionar como spotlight: pintaba el
 * fondo con un `box-shadow` de 9999px sobre el propio ítem del sidebar, y el
 * `overflow-y: auto` del `<nav>` lo recortaba, así que la página nunca se
 * atenuaba y la tarjeta tapaba el menú.
 *
 * `tourDismissed` (PanelPrefsContext) sigue siendo el interruptor global de
 * novedades: `false` = mostrarlas. Mientras hidrata vale `null`, y ahí se
 * suprime para no producir un parpadeo.
 */

import { usePathname } from 'next/navigation'
import { usePanelPrefs } from '@/lib/context/PanelPrefsContext'
import { AgentIntroModal } from '@/components/tour/AgentIntroModal'
import { WorkspaceNav } from '@/components/inmobiliaria/ai/WorkspaceNav'

export default function AiLayout({ children }: { children: React.ReactNode }) {
  const { tourDismissed } = usePanelPrefs()
  const pathname = usePathname()

  return (
    <>
      {/* In-workspace tabs — the agent's functions live here now, not in the
          global sidebar. Self-hides on the AI hub and outside known agents. */}
      <WorkspaceNav />
      {children}
      {/* Presentación del agente en la primera visita a su workspace. */}
      <AgentIntroModal pathname={pathname} suppressed={tourDismissed !== false} />
    </>
  )
}
