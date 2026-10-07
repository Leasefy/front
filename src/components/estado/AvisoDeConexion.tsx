'use client'

/**
 * AvisoDeConexion — la franja que dice, una sola vez y arriba, que Leasefy no
 * está respondiendo o que no hay internet.
 *
 * ── Por qué existe (01-10-2026) ────────────────────────────────────────────
 *
 * Nico: «cuando algún servicio se caiga, deberíamos de avisarle al usuario,
 * porque eso puede llegar a pasar». Hasta acá, con el back caído cada tarjeta
 * de la pantalla pintaba su propio cartel rojo —«No pudimos cargar esto»,
 * «Referencia: SER-1930»— y ninguno decía lo que la persona necesita saber:
 * que no es culpa suya, que lo guardado está a salvo y que no tiene que hacer
 * nada. Ésta es la capa 1 (Leasefy entero); la capa 2 (se cayó una parte)
 * la pinta cada pantalla con `servicio-no-disponible.ts`.
 *
 * ── Qué hace y qué NO hace ─────────────────────────────────────────────────
 *
 *   · Lee `estado-de-conexion.ts`, que alimenta `apiClient` con cada
 *     respuesta. Con la conexión bien no dibuja nada visible.
 *   · Mientras Leasefy no responde, le pregunta a `/health` con espera
 *     creciente (5 s, 10 s, 20 s, 40 s, y de ahí cada minuto) y se quita sola
 *     con el primer 200. Sin internet no pregunta: espera el evento `online`.
 *   · NO borra la pantalla, NO cierra sesión, NO redirige. `ProtectedRoute` y
 *     `PageGuard` ya usan `useSinSenal` para no expulsar a nadie por no haber
 *     podido preguntar; esto sólo avisa.
 *
 * ── Dónde va ───────────────────────────────────────────────────────────────
 *
 * Montada UNA vez en `src/app/layout.tsx`, junto al `<Toaster>` y fuera de
 * `AuthProvider` y de todo guard, por la misma razón que él: un aviso emitido
 * mientras un guard resuelve —o cuando no deja pasar— tiene que verse igual.
 *
 * Flota ABAJO y centrada, con 16 px de margen a los lados: no empuja el
 * contenido (el `<PlanHeader>` es `sticky top-0` y el sidebar es fijo; una
 * franja que empujara descuadraría el panel) y deja pasar los clics
 * (`pointer-events-none`), porque no tiene nada que tocar. Va por encima de
 * diálogos y cajones (`z-[300]`) y debajo de menús y popovers (`z-[400]`).
 *
 * Abajo y no arriba: arriba tapaba el encabezado, y en el celular eso es el
 * menú entero. En pantallas chicas sube 5rem para no tapar la barra de
 * navegación del panel (`MobileNavBar`, fija abajo y oculta desde `lg`).
 *
 * ── Con un cajón abierto, sube por encima de su pie (02-10-2026) ─────────
 * Va encima de los cajones, y el pie de un cajón —el `SheetFooter` flotante,
 * pegado abajo— es justo donde están las acciones: en la Candidatura tapaba
 * «Rechazar». Mientras se ve, mide el pie de cada cajón abierto
 * (`data-sheet-band="footer"`) y, si se cruza con la franja, la sube con
 * `translateY` lo justo para que quede 12 px por encima del filete del pie.
 * Sólo mide mientras la franja está a la vista.
 */

import { useEffect, useRef, useState } from 'react'
import { CloudSlash, WifiSlash } from '@phosphor-icons/react'
import {
  avisarQueLeasefyRespondio,
  esperaDelIntento,
  preguntarSiLeasefyVolvio,
  useEstadoDeConexion,
} from '@/lib/conexion/estado-de-conexion'
import { cn } from '@/lib/utils'

const TEXTO = {
  'sin-internet': {
    titulo: 'Estás sin internet.',
    detalle: 'Lo que ya guardaste está a salvo; seguimos apenas vuelva la conexión.',
  },
  'leasefy-no-responde': {
    titulo: 'Leasefy no está respondiendo en este momento.',
    detalle: 'Lo que ya guardaste está a salvo; seguimos intentando solos.',
  },
} as const

/** El pie de un cajón abierto (`SheetFooter`/`CajonPie`, el de Cadence). */
const PIE_DE_CAJON_ABIERTO = '[data-sheet-side][data-state="open"] [data-sheet-band="footer"]'

/** Aire entre la franja y el filete del pie del cajón. */
const AIRE_SOBRE_EL_PIE_PX = 12

interface Caja {
  top: number
  bottom: number
  left: number
  right: number
}

/**
 * Cuánto hay que subir la franja para que no tape el pie de ningún cajón
 * abierto. `franja` es dónde queda SIN subir. Sólo cuentan los pies que se
 * cruzan con ella (a lo ancho y a lo alto): un cajón angosto a la derecha de
 * una pantalla ancha no la mueve. 0 si no hay nada que esquivar.
 */
export function cuantoSubirSobreElPie(
  franja: Caja,
  pies: ReadonlyArray<Caja>,
  aire: number = AIRE_SOBRE_EL_PIE_PX,
): number {
  let subir = 0
  for (const pie of pies) {
    const seCruzanALoAncho = pie.left < franja.right && pie.right > franja.left
    const seCruzanALoAlto = pie.top < franja.bottom + aire && pie.bottom > franja.top
    if (seCruzanALoAncho && seCruzanALoAlto) {
      subir = Math.max(subir, franja.bottom - pie.top + aire)
    }
  }
  return Math.max(0, Math.round(subir))
}

/** Los pies de los cajones abiertos que se ven (los de alto 0 no cuentan). */
function piesDeCajonesAbiertos(doc: Document): Caja[] {
  return Array.from(doc.querySelectorAll<HTMLElement>(PIE_DE_CAJON_ABIERTO))
    .map((pie) => pie.getBoundingClientRect())
    .filter((r) => r.height > 0)
}

export function AvisoDeConexion() {
  const estado = useEstadoDeConexion()
  const franjaRef = useRef<HTMLDivElement>(null)
  const [subir, setSubir] = useState(0)
  // Lo aplicado ahora, para reconstruir dónde quedaría la franja sin subir.
  const subidoRef = useRef(0)

  // Mientras la franja está a la vista: ¿hay un cajón abierto cuyo pie tape?
  // Se vuelve a medir cuando se abre o cierra algo (`data-state`), cuando
  // termina su animación de entrada (antes el pie todavía viaja) y al cambiar
  // el tamaño de la ventana.
  useEffect(() => {
    if (estado === 'bien') {
      subidoRef.current = 0
      setSubir(0)
      return
    }
    const medir = () => {
      const el = franjaRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const ya = subidoRef.current
      const sinSubir = { top: r.top + ya, bottom: r.bottom + ya, left: r.left, right: r.right }
      const nuevo = cuantoSubirSobreElPie(sinSubir, piesDeCajonesAbiertos(document))
      subidoRef.current = nuevo
      setSubir(nuevo)
    }
    medir()
    const observador = new MutationObserver(medir)
    observador.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state'],
    })
    window.addEventListener('resize', medir)
    document.addEventListener('animationend', medir, true)
    return () => {
      observador.disconnect()
      window.removeEventListener('resize', medir)
      document.removeEventListener('animationend', medir, true)
    }
  }, [estado])

  // Mientras Leasefy no responda, preguntar si volvió. Cada vuelta espera más
  // que la anterior; el primer 200 baja la franja para todos.
  useEffect(() => {
    if (estado !== 'leasefy-no-responde') return
    let vigente = true
    let reloj: ReturnType<typeof setTimeout> | undefined
    const preguntar = (intento: number) => {
      reloj = setTimeout(async () => {
        const volvio = await preguntarSiLeasefyVolvio()
        if (!vigente) return
        if (volvio) {
          avisarQueLeasefyRespondio()
          return
        }
        preguntar(intento + 1)
      }, esperaDelIntento(intento))
    }
    preguntar(0)
    return () => {
      vigente = false
      if (reloj) clearTimeout(reloj)
    }
  }, [estado])

  const texto = estado === 'bien' ? null : TEXTO[estado]
  const Icono = estado === 'sin-internet' ? WifiSlash : CloudSlash

  return (
    // La región viva existe SIEMPRE, vacía cuando todo está bien: un lector de
    // pantalla anuncia lo que cambia dentro de una región que ya conocía, no
    // una que aparece de golpe con el texto adentro.
    <div role="status" aria-live="polite" data-testid="aviso-de-conexion" data-estado={estado}>
      {texto && (
        // Afuera el lugar (y la subida sobre el pie de un cajón, con
        // `transform`); adentro la franja y su entrada. Separados para que la
        // animación de entrada, que también usa `transform`, no pise la subida.
        <div
          ref={franjaRef}
          data-testid="aviso-de-conexion-franja"
          data-sobre-el-pie={subir > 0 ? 'true' : undefined}
          className={cn(
            'pointer-events-none fixed inset-x-4 z-[350] mx-auto max-w-xl',
            'bottom-[calc(env(safe-area-inset-bottom)+5rem)] lg:bottom-[calc(env(safe-area-inset-bottom)+1.5rem)]',
            'transition-transform duration-base ease-enter',
          )}
          style={subir > 0 ? { transform: `translateY(-${subir}px)` } : undefined}
        >
          <div
            className={cn(
              'flex items-start gap-2.5 rounded-md border border-border px-4 py-2.5 shadow-md',
              'animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none',
              estado === 'sin-internet' ? 'bg-warning-soft' : 'bg-danger-soft',
            )}
          >
            <Icono
              weight="bold"
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0',
                estado === 'sin-internet' ? 'text-warning' : 'text-danger',
              )}
              aria-hidden="true"
            />
            <p className="min-w-0 text-body-sm text-fg">
              <strong className="font-semibold">{texto.titulo}</strong> {texto.detalle}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
