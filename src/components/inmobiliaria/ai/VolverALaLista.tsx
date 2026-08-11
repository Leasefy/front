'use client'

/**
 * VolverALaLista — la salida visible de una ficha de detalle.
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 *
 * De las 7 fichas de detalle del workspace de agentes, 6 no tenían **ninguna**
 * forma visible de volver a la tabla de la que se venía. El breadcrumb sí
 * enlaza la pestaña padre, pero se lee como rastro de ubicación, no como
 * control: nadie lo usa de salida. Y la pestaña de arriba se pinta activa
 * (resalta la sección), que es justo la señal contraria — «ya estás acá».
 *
 * Esto es el control explícito, arriba del H1, como en el resto del panel
 * (`propiedades/[id]/candidatos/comparar`, `inquilino/arriendo/[leaseId]`…).
 *
 * ── Enlace de verdad, navegación de SPA ───────────────────────────────────
 *
 * Renderiza un `<a href>` real —cmd-click abre pestaña nueva, el lector de
 * pantalla lo anuncia como enlace, la barra de estado muestra el destino— pero
 * el clic normal lo intercepta el router. Con `href` a secas el `<a>` del DS
 * recarga la página entera y se rehace toda la sesión del panel; con sólo
 * `onClick` sería un `<button>` sin destino ni cmd-click.
 *
 * `href` es siempre una ruta FIJA de lista, nunca `router.back()`: la etiqueta
 * promete un destino concreto («Volver a casos») y el historial no puede
 * garantizarlo — a una ficha se llega también desde el buscador, desde
 * Pendientes o desde un enlace pegado.
 */

import { useRouter } from 'next/navigation'
import { BackButton } from '@leasefy/cadence'

interface VolverALaListaProps {
  /** Ruta de la lista padre. Fija — no `router.back()`. */
  href: string
  /** Debe nombrar el destino: «Volver a casos», no «Volver». */
  label: string
  className?: string
}

export function VolverALaLista({ href, label, className }: VolverALaListaProps) {
  const router = useRouter()

  return (
    <BackButton
      variant="subtle"
      href={href}
      label={label}
      className={className}
      data-testid="volver-a-la-lista"
      onClick={(e) => {
        // Con modificador manda el navegador (pestaña/ventana nueva).
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
          return
        }
        e.preventDefault()
        router.push(href)
      }}
    />
  )
}
