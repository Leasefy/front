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
 */

import { useEffect } from 'react'
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

export function AvisoDeConexion() {
  const estado = useEstadoDeConexion()

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
        <div
          className={cn(
            'pointer-events-none fixed inset-x-4 z-[350] mx-auto max-w-xl',
            'bottom-[calc(env(safe-area-inset-bottom)+5rem)] lg:bottom-[calc(env(safe-area-inset-bottom)+1.5rem)]',
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
      )}
    </div>
  )
}
