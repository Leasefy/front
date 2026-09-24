'use client'

/**
 * CabeceraDelAgente — lo que un workspace de agente monta encima de sus
 * pantallas: sus pestañas internas (`WorkspaceNav`) y la presentación del
 * agente en la primera visita (`AgentIntroModal`).
 *
 * Vivía en el layout del namespace `/ai` (retirado) cuando todos los agentes
 * colgaban de `/ai/*`. Ese namespace desapareció —cada agente vive dentro del
 * módulo que automatiza— así que esto se monta UNA vez en el layout del panel
 * y se esconde solo fuera de un agente (`findAgentWorkspace` → null en los dos
 * componentes).
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
 * ── Después del recorrido del panel, nunca encima ─────────────────────────
 *
 * `tourDismissed` (PanelPrefsContext) ya no es un «interruptor de novedades»:
 * desde el 23-09 dice si la INMOBILIARIA ya vio el recorrido del panel (Nico:
 * «el onboarding solo debe aparecer una sola vez por inmobiliaria»). Con el
 * sentido viejo —`true` = apagar las presentaciones— bastaba con que alguien
 * cerrara el recorrido para que ningún agente se presentara nunca más. Ahora:
 *
 *   `null`  → no se sabe si el recorrido va a salir: no se presenta nada;
 *   `false` → el recorrido está saliendo (o va a salir): se espera;
 *   `true`  → el recorrido ya pasó: cada agente se presenta UNA vez por
 *             inmobiliaria (`AgentIntroModal`, clave `agente:<id>`).
 */

import { usePathname } from 'next/navigation'
import { usePanelPrefs } from '@/lib/context/PanelPrefsContext'
import { AgentIntroModal } from '@/components/tour/AgentIntroModal'
import { WorkspaceNav } from '@/components/inmobiliaria/ai/WorkspaceNav'

export function CabeceraDelAgente() {
  const { tourDismissed } = usePanelPrefs()
  const pathname = usePathname() ?? ''

  return (
    <>
      <WorkspaceNav />
      <AgentIntroModal pathname={pathname} suppressed={tourDismissed !== true} />
    </>
  )
}
