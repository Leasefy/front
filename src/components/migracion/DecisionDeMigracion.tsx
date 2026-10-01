'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Buildings, Clock, ListNumbers, Stack, Users, type Icon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { CargaDeMarca } from '@/components/ui/carga-de-marca'
import { useLenis } from '@/components/providers/SmoothScroll'
import { SUAVE, TarjetaDePuestaEnMarcha } from '@/components/puesta-en-marcha/TarjetaDePuestaEnMarcha'
import { anunciarRelevo } from '@/components/puesta-en-marcha/relevo'
import type { DecisionDeMigracion } from '@/lib/migracion/decision-de-migracion'

/**
 * «¿Migramos tu inmobiliaria?» — la pregunta previa al muro de migración.
 *
 * Tres salidas: migrar ahora (el muro de siempre), en otro momento (queda un
 * recordatorio anclado en el sidebar) y no requiero migración. Escape cuenta
 * como «en otro momento»: cerrar sin decidir no puede dejar a la persona sin
 * recordatorio. Qué hace cada una lo decide `MuroDeMigracion` (`decidir`);
 * acá sólo se pregunta.
 *
 * ── Glow up (Nico, 30-09: «esto de verdad debe de verse más hermoso y como
 * algo que es re importante, una card más grande… usa imágenes quizás») ────
 *
 * Era la tarjeta de «nueva función» de 420 px: un halo, un párrafo y tres
 * botones. Se leía como un aviso más, no como la decisión que define con qué
 * arranca la cuenta. Ahora es la misma cáscara que la bienvenida del recorrido
 * (`TourDelPanel`, `PantallaCentrada`): dos columnas, la foto de marca y la
 * decisión; en teléfono, una columna con la foto como franja baja arriba.
 *
 *   · La foto es la 13 (una sala ya amoblada, con la marca en el cojín): se
 *     llega y todo está en su sitio, que es lo que promete migrar. Limpia, sin
 *     la píldora «L Leasefy» encima (Nico, 30-09: «quitale eso a las
 *     imágenes»): la marca ya está EN la foto. Es de las que `AGENT_INTROS`
 *     dejaba libres (10-14, 16).
 *   · El párrafo se partió en lo que se entiende de un vistazo: qué se trae
 *     (tres filas, con los íconos de Configuración → Migración), cuánto toma y
 *     que se puede hacer por partes.
 *   · El título sin negrita, como las pantallas nuevas (`/auth`, el segundo
 *     factor): `font-heading` en `font-medium` (Nico: «los títulos no los
 *     manejamos en bold»).
 *   · Jerarquía: «Migrar ahora» sólida y a lo ancho; debajo, las otras dos
 *     como par, con borde y del mismo tamaño —alternativas, no errores—, y una
 *     línea que dice que ninguna cierra la puerta (Configuración → Migración
 *     siempre deja migrar, ver `SeccionMigracion`).
 *   · Sin ✕: la pregunta tiene tres salidas explícitas y Esc. Agregar una
 *     cuarta era cambiar la lógica, no el aspecto.
 *
 * ── El paso que continúa (Nico, 30-09: «cuando uno le da "En otro momento"
 * a la migración, no se ve que es como un paso que continúa») ──────────────
 *
 * La cáscara vive en `TarjetaDePuestaEnMarcha`, compartida con el segundo
 * factor dentro del panel. Al elegir «en otro momento» o «no requiero» el
 * contenido se desvanece y la tarjeta se QUEDA (`pasando`) mientras el back
 * resuelve y la sesión se entera de lo que sigue: si es el segundo factor,
 * éste toma la misma tarjeta (`anunciarRelevo`); si no hay nada más, la
 * tarjeta y el velo se van juntos (`saliendo`). Antes la tarjeta desaparecía,
 * el panel se destapaba medio segundo y el 2FA llegaba como otro pop-up.
 *
 * A11y: `role="dialog"` modal, nombrado por el título y descrito por el
 * párrafo de entrada. El foco entra a la tarjeta al abrir; el panel de atrás
 * queda `inert` (lo pone el muro), así que el Tab no se escapa. Con «reducir
 * movimiento» no se mueve nada.
 */

/** Ver la nota de arriba: la sala amoblada, libre en `AGENT_INTROS`. */
export const FOTO_DE_LA_DECISION = '/images/features/leasefy-brand-13.jpg'

/** Lo que se trae, con los íconos de Configuración → Migración (`SeccionMigracion`). */
const LO_QUE_TRAEMOS: ReadonlyArray<{ icono: Icon; titulo: string; detalle: string }> = [
  {
    icono: Users,
    titulo: 'Propietarios e inquilinos',
    detalle: 'Tu archivo de terceros, con cuentas bancarias y documentos.',
  },
  {
    icono: Buildings,
    titulo: 'Inmuebles y contratos',
    detalle: 'Los contratos vigentes con su inmueble, canon y fechas.',
  },
  {
    icono: ListNumbers,
    titulo: 'Plan de cuentas y saldos',
    detalle: 'Tus cuentas y sus saldos, para arrancar la contabilidad cuadrada.',
  },
]

export function ModalDecisionDeMigracion({
  onDecidir,
  pasando = false,
  saliendo = false,
}: {
  onDecidir: (decision: DecisionDeMigracion) => void
  /**
   * Ya se decidió «en otro momento» o «no requiero» y el muro bajó: la
   * tarjeta se queda, sin contenido, hasta que se sepa qué sigue.
   */
  pasando?: boolean
  /** No sigue nada (el panel se abre sin segundo factor): se va con su velo. */
  saliendo?: boolean
}) {
  const caja = useRef<HTMLDivElement>(null)
  const idTitulo = useId()
  const idEntrada = useId()
  const animar = !useReducedMotion()
  const lenis = useLenis()
  const lenisRef = useRef(lenis)
  lenisRef.current = lenis
  /** Ya eligió una salida que no es migrar: el contenido se va y no se vuelve a elegir. */
  const [eligio, setEligio] = useState(false)
  const yaDecidido = eligio || pasando || saliendo

  /*
   * «En otro momento», «no requiero» (y Esc): el contenido se desvanece ahí
   * mismo —el clic se nota aunque el back tarde— y queda anotado que, si lo
   * siguiente es el segundo factor, parte de esta tarjeta.
   */
  const elegir = (decision: DecisionDeMigracion) => {
    if (yaDecidido) return
    if (decision !== 'ahora') {
      setEligio(true)
      anunciarRelevo(FOTO_DE_LA_DECISION)
    }
    onDecidir(decision)
  }
  const elegirRef = useRef(elegir)
  elegirRef.current = elegir

  /*
   * El fondo no scrollea mientras se decide, como en el muro (DESIGN §8):
   * Lenis se frena y la tarjeta, que en una pantalla baja scrollea sola,
   * lleva `data-lenis-prevent`.
   */
  useEffect(() => {
    const controles = lenisRef.current
    controles.stop()
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previo
      controles.start()
    }
  }, [])

  useEffect(() => {
    const raf = requestAnimationFrame(() => caja.current?.focus())
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        elegirRef.current('luego')
      }
    }
    document.addEventListener('keydown', alTeclear)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', alTeclear)
    }
  }, [])

  if (typeof document === 'undefined') return null

  return (
    <TarjetaDePuestaEnMarcha
      foto={FOTO_DE_LA_DECISION}
      entrada="aparece"
      saliendo={saliendo}
      capa="z-[1000]"
      cajaRef={caja}
      tituloId={idTitulo}
      descripcionId={idEntrada}
      testids={{ velo: 'decision-de-migracion', tarjeta: 'decision-tarjeta', foto: 'decision-foto' }}
    >
      <div className="relative flex flex-1 flex-col">
        <motion.div
          className="flex flex-1 flex-col"
          initial={false}
          animate={{ opacity: yaDecidido ? 0 : 1 }}
          transition={{ duration: animar ? 0.22 : 0, ease: SUAVE }}
          inert={yaDecidido || undefined}
          data-testid="decision-contenido"
        >
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />
            Antes de empezar
          </p>
          <h2
            id={idTitulo}
            className="mt-4 text-balance font-heading text-[28px] font-medium leading-[1.1] tracking-[-0.03em] text-fg md:text-[34px]"
          >
            ¿Migramos tu inmobiliaria?
          </h2>
          <p id={idEntrada} className="mt-3 text-pretty text-body text-fg-muted">
            Si ya operas con otro sistema o con hojas de cálculo, traemos tus datos para que
            arranques con todo cargado.
          </p>

          <ul className="mt-6 space-y-4" aria-label="Lo que traemos" data-testid="decision-lo-que-traemos">
            {LO_QUE_TRAEMOS.map(({ icono: Icono, titulo, detalle }, i) => (
              <motion.li
                key={titulo}
                initial={animar ? { opacity: 0, y: 6 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: animar ? 0.14 + i * 0.07 : 0, duration: animar ? 0.26 : 0, ease: SUAVE }}
                className="flex items-start gap-3.5"
              >
                {/* Tinted Icon Tile (DESIGN §4), el del recorrido. */}
                <span
                  aria-hidden
                  className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"
                >
                  <Icono size={20} />
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className="block text-body-sm font-medium text-fg">{titulo}</span>
                  <span className="mt-0.5 block text-pretty text-caption text-fg-muted">{detalle}</span>
                </span>
              </motion.li>
            ))}
          </ul>

          <ul className="mt-6 flex flex-wrap gap-2" data-testid="decision-cuanto-toma">
            <li className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-caption text-fg-muted">
              <Clock size={14} aria-hidden className="shrink-0 text-fg" />
              Toma unos minutos
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-caption text-fg-muted">
              <Stack size={14} aria-hidden className="shrink-0 text-fg" />
              Se puede hacer por partes
            </li>
          </ul>

          {/* `mt-auto` apoya las salidas abajo cuando la foto alarga la tarjeta. */}
          <div className="mt-8 pt-0 md:mt-auto md:pt-8">
            <Button
              type="button"
              hideArrow
              className="h-12 w-full rounded-full text-[15px]"
              onClick={() => elegir('ahora')}
              data-testid="migrar-ahora"
            >
              Migrar ahora
              <ArrowRight size={16} weight="bold" aria-hidden className="ml-1.5" />
            </Button>
            {/* El par de alternativas: mismo tamaño, con borde, sin rojo. En
                teléfono se apilan: «No requiero migración» no cabe a la mitad. */}
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                hideArrow
                className="h-11 w-full rounded-full"
                onClick={() => elegir('luego')}
                data-testid="migrar-en-otro-momento"
              >
                En otro momento
              </Button>
              <Button
                type="button"
                variant="outline"
                hideArrow
                className="h-11 w-full rounded-full text-fg-muted hover:text-fg"
                onClick={() => elegir('nunca')}
                data-testid="no-requiero-migracion"
              >
                No requiero migración
              </Button>
            </div>
            <p className="mt-4 text-pretty text-center text-caption text-fg-subtle">
              Elijas lo que elijas, puedes migrar cuando quieras desde Configuración.
            </p>
          </div>
        </motion.div>

        {/* Mientras se sabe qué sigue: el logo quieto en el centro, y sólo si tarda. */}
        {yaDecidido && !saliendo ? (
          <motion.div
            className="absolute inset-0 grid place-items-center"
            initial={animar ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ delay: animar ? 0.45 : 0, duration: animar ? 0.3 : 0, ease: SUAVE }}
            data-testid="decision-pasando"
          >
            <CargaDeMarca tamano="md" disposicion="apilada" texto="Un momento…" />
          </motion.div>
        ) : null}
      </div>
    </TarjetaDePuestaEnMarcha>
  )
}
