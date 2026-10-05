'use client'

/**
 * PilotoModoHeader.tsx — la píldora del header: «Piloto · Copiloto».
 *
 * Nico (2026-09-02): «en el header demos visibilidad de que el piloto está
 * activo y está en sombra, copiloto o automático, y se pueda cambiar súper
 * fácil». Vive en el `actions` del `PlanHeader`, a la izquierda de la
 * campana, en TODAS las pantallas del panel.
 *
 * Qué muestra: un punto de color + el modo de la FLOTA (el que comparten los
 * agentes que corren; `mixto` si no comparten uno) y, si el Piloto está
 * haciendo algo ahora, un contador vivo («1 llamada»). Al abrirla, los tres
 * modos con lo que hace cada uno HOY y un solo clic para mover la flota
 * entera (OWNER/ADMIN; el resto la ve, no la mueve).
 *
 * Pasar a automático pide una confirmación en línea: es el único cambio que
 * hace que el Piloto llame, escriba y emita recibos sin preguntar. Bajar de
 * autonomía es un clic, siempre.
 *
 * Honestidad: si `PILOTO_ENABLED` está apagado en el micro, la píldora dice
 * «apagado» y los modos se ven pero no se ofrecen — elegir un modo para una
 * flota que no corre sería teatro.
 *
 * ── P-1 y la auditoría del Piloto (23-09-2026, hallazgo 11) ───────────────
 *   · Los modos son Manual / Copiloto / Automático. «Mixto» se eliminó: la
 *     píldora dice el modo de la mayoría de los agentes que actúan y, si
 *     alguno usa otro, lo cuenta; al abrirla se ve el modo de cada uno.
 *   · «12 agentes corriendo» contaba agentes apagados en el servidor y
 *     perillas que no mueven nada. Ahora cuenta los que ACTÚAN (corren y el
 *     modo los gobierna) y nombra aparte los que todavía no actúan solos.
 *
 * ── El desplegable, más ancho (Nico, 02-10-2026) ──────────────────────────
 *   «Está muy angosto y con mucha información.» Ahora:
 *   · Los tres modos van lado a lado como tarjetas (ícono, nombre y una frase
 *     corta). El detalle largo de `flota.que.*` vive en UNA línea de ayuda que
 *     dice el modo elegido y cambia al pasar el cursor o al enfocar otro.
 *   · «Cada agente» es una grilla (tres columnas; dos en el celular) en el
 *     orden en que los manda el micro. Si todos van igual se dice en una
 *     línea («Todos van en Copiloto.») y cada casilla lleva sólo el nombre;
 *     la que va distinto se tiñe y dice su modo (color + texto, nunca sólo
 *     color).
 *   · «Todavía no actúan solos» son chips apagados con una nota corta.
 *   · En escritorio es un popover de ~680 px anclado a la píldora; en el
 *     celular (< 768 px) una hoja que sube desde abajo.
 *   · Teclado: las tarjetas son un radiogroup con foco itinerante. Las flechas
 *     MUEVEN el foco (y la línea de ayuda) sin elegir: elegir mueve la flota
 *     entera, y eso no puede pasar por recorrer las opciones con el teclado.
 *     Enter o espacio eligen.
 *
 * ── Movimiento (Nico, 02-10-2026: «cada interacción con su animación») ────
 *   · Abrir y cerrar: el `PopoverContent` y el `SheetContent` de Cadence ya
 *     traen su coreografía en CSS (Radix espera el `animationend` para
 *     desmontar; framer no puede sostener esa salida). Crece desde la
 *     píldora y se va acelerando; la hoja sube y baja.
 *   · Adentro, framer-motion: las tarjetas entran escalonadas; el marco del
 *     modo elegido es UNO solo (`layoutId`) que se desliza de una tarjeta a
 *     otra al cambiar de modo y el ✓ llega con un rebote leve; la línea de
 *     ayuda funde de un modo a otro sin mover nada (los tres textos ocupan la
 *     misma celda); la confirmación de Automático reemplaza a la línea con un
 *     fundido cruzado; la grilla de agentes y los chips entran escalonados.
 *   · Sólo `transform` y `opacity`. `MotionProvider reducedMotion="user"` del layout raíz: con
 *     `prefers-reduced-motion` no hay desplazamientos ni deslizamientos,
 *     quedan los fundidos.
 *   · Los valores son los del sistema de movimiento de Cadence (ver `MOV`).
 */

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, type Transition } from 'framer-motion'
import {
  motionDistance,
  motionDuration,
  motionEase,
  motionSpring,
  motionStagger,
  motionTransition,
} from '@leasefy/cadence'
import {
  AirTrafficControl,
  Bank,
  CaretDown,
  Check,
  Handshake,
  HourglassMedium,
  Moon,
  Phone,
  Pulse,
  Rocket,
  SlidersHorizontal,
  Waveform,
} from '@phosphor-icons/react'

import { toast } from '@/components/ui/toast'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { usePilotoFlotaCompartida } from '@/lib/hooks/piloto/piloto-flota-context'
import { usePilotoDock } from '@/lib/hooks/piloto/piloto-dock-context'
import { ConfirmarAutomatico, pideSegundoFactor } from '@/components/inmobiliaria/piloto/ConfirmarAutomatico'
import { useI18n } from '@/lib/i18n'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { workspaceVocab } from '@/components/inmobiliaria/ai/ColaHumana'
import { cn } from '@/lib/utils'
import { RUTA_PILOTO, RUTA_PROCESOS } from './rutas-del-piloto'
import { MODOS_DEL_PILOTO, type AutonomiaModo, type ModoDeLaFlota } from '@/lib/api/piloto'

/** La lista única de modos (ver `MODOS_DEL_PILOTO`). */
const MODOS: readonly AutonomiaModo[] = MODOS_DEL_PILOTO

const ICONO: Record<AutonomiaModo, typeof Moon> = {
  sombra: Moon,
  copiloto: Handshake,
  autonomo: Rocket,
}

/** El punto de la píldora, por modo. Semántico, no decorativo: el verde es «se mueve solo». */
const PUNTO: Record<ModoDeLaFlota, string> = {
  sombra: 'bg-fg-muted',
  copiloto: 'bg-primary',
  autonomo: 'bg-success',
  // Sólo por compatibilidad con un micro viejo que todavía mande «mixto».
  mixto: 'bg-primary',
}

/** Flechas, Inicio y Fin dentro del grupo de modos: a qué posición va el foco. */
const TECLAS_DE_FOCO: Record<string, (i: number, n: number) => number> = {
  ArrowRight: (i, n) => (i + 1) % n,
  ArrowDown: (i, n) => (i + 1) % n,
  ArrowLeft: (i, n) => (i - 1 + n) % n,
  ArrowUp: (i, n) => (i - 1 + n) % n,
  Home: () => 0,
  End: (_i, n) => n - 1,
}

/**
 * El movimiento del desplegable: los tokens del sistema de movimiento de
 * Cadence (03-10-2026; antes eran sus mismos números escritos acá). Los
 * nombres cortos quedan para que el resto del archivo no cambie.
 */
const MOV = {
  /** Entrar: 200 ms, desacelera (easeOutQuint). */
  entra: motionTransition.enter satisfies Transition,
  /** Salir: 150 ms, acelera. Nadie espera a que algo termine de irse. */
  sale: motionTransition.exit satisfies Transition,
  /** Fundido en el lugar (la línea de ayuda): 150 ms, curva estándar. */
  funde: { duration: motionDuration.fast, ease: motionEase.standard } satisfies Transition,
  /** El marco del modo elegido que se desliza: resorte ágil de 250 ms, casi sin rebote. */
  desliza: motionSpring.snappy satisfies Transition,
  /** El ✓ que llega: resorte de 300 ms con rebote leve. */
  llega: motionSpring.bouncy satisfies Transition,
  /** Escalonado: 40 ms entre ítems; el último nunca espera más de 320 ms. */
  paso: motionStagger.step,
  techo: motionStagger.max,
  /** Cuánto viaja lo que entra: 8 px las tarjetas, 4 px lo chico. */
  lejos: motionDistance.sm,
  cerca: motionDistance.xs,
} as const

/** Cuándo empieza a entrar el ítem `i` de `n` si la lista arranca en `desde` segundos. */
export function retrasoEscalonado(i: number, n: number, desde = 0): number {
  const paso = n > 1 ? Math.min(MOV.paso, Math.max(0, MOV.techo - desde) / (n - 1)) : 0
  return desde + i * paso
}

/** Entrada de un ítem: sube `y` px con fundido, después de `delay` segundos. */
const entrada = (delay: number, y: number = MOV.lejos) => ({
  initial: { opacity: 0, y },
  animate: { opacity: 1, y: 0 },
  transition: { ...MOV.entra, delay },
})

/** Un texto corto que cambia en el lugar (el modo de la píldora): el nuevo sube, el viejo se va. */
function TextoQueCambia({ valor, className }: { valor: string; className?: string }) {
  return (
    <span className={cn('relative inline-flex min-w-0', className)}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={valor}
          className="truncate"
          initial={{ opacity: 0, y: MOV.cerca }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -MOV.cerca, transition: MOV.sale }}
          transition={MOV.entra}
        >
          {valor}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export { RUTA_PROCESOS, RUTA_PILOTO }

export function PilotoModoHeader() {
  const { t } = useI18n()
  const { isAdmin } = usePermissionsContext()
  const flota = usePilotoFlotaCompartida()
  const dock = usePilotoDock()
  // En el celular el desplegable es una hoja que sube desde abajo.
  const enHoja = useIsMobile()
  const [abierto, setAbierto] = useState(false)
  const [confirmando, setConfirmando] = useState<AutonomiaModo | null>(null)
  // PI-23: el diálogo de Automático (explica y pide el segundo factor si hace falta).
  const [pidiendoCodigo, setPidiendoCodigo] = useState(false)
  // El modo que la línea de ayuda explica mientras el cursor o el foco está
  // sobre otra tarjeta. `null` = el modo actual.
  const [vistaPrevia, setVistaPrevia] = useState<AutonomiaModo | null>(null)
  const radios = useRef<Partial<Record<AutonomiaModo, HTMLButtonElement | null>>>({})
  const base = useId()

  const data = flota.data
  // Sin micro, sin agencia o sin endpoint: no hay píldora. No se inventa un estado.
  if (flota.notAvailable || (!data && !flota.isLoading)) return null

  const modo: ModoDeLaFlota | null = data?.modo ?? null
  const activo = data?.activo ?? false
  const cargando = !data && flota.isLoading
  const vivo = data?.enVivo ?? { llamadas: 0, conciliando: 0, esperando: 0 }
  const hayVivo = vivo.llamadas > 0 || vivo.conciliando > 0
  // Quien puede mover la flota cuando no hay un cambio en vuelo.
  const puedeElegir = isAdmin && activo
  const puedeCambiar = puedeElegir && !flota.busy

  const etiquetaModo = (m: ModoDeLaFlota | null) =>
    m && m !== 'mixto' ? t(`inmobiliaria.piloto.flota.modo.${m}`) : '…'
  const distintos = data?.distintos ?? []
  const agentesQueActuan = (data?.agentes ?? []).filter((a) => a.actua ?? a.corre)
  const todaviaNo = (data?.agentes ?? []).filter((a) => a.gobierna === false)
  const nombre = (agente: string) => workspaceVocab(t, 'agente', agente)

  const modoGeneral: AutonomiaModo | null = modo && modo !== 'mixto' ? modo : null
  const todosIguales = modoGeneral !== null && agentesQueActuan.every((a) => a.modo === modoGeneral)
  // El que recibe el Tab: el elegido o, si no hay (cargando, «mixto»), el primero.
  const tabuladoEn: AutonomiaModo = modoGeneral ?? MODOS[0]!
  // Sin datos no hay línea de ayuda: al abrir, Radix enfoca la primera
  // tarjeta y «Manual.» se leía como el modo actual cuando no se sabe nada.
  const modoAyuda: AutonomiaModo | null = data ? (vistaPrevia ?? modoGeneral) : null

  const tituloId = `${base}-titulo`
  const subtituloId = `${base}-subtitulo`
  const queId = (m: AutonomiaModo) => `${base}-que-${m}`

  const aplicar = async (nuevo: AutonomiaModo): Promise<{ ok: boolean; fallo?: unknown }> => {
    setConfirmando(null)
    const res = await flota.setModo(nuevo)
    if (!res.ok) {
      // PI-23: si el micro pide el código del segundo factor, lo pide el diálogo.
      if (pideSegundoFactor(res.fallo)) return { ok: false, fallo: res.fallo }
      // Lo que pasó, con la regla de oro: nunca «No se pudo cambiar el modo: 500».
      toast.error(
        mensajeParaLaPersona(res.fallo, {
          porDefecto: 'No se pudo cambiar el modo del Piloto.',
          accion: 'cambiar el modo del Piloto',
        }),
      )
      return { ok: false, fallo: res.fallo }
    }
    if (res.fallidos && res.fallidos.length > 0) {
      toast.warning(
        t('inmobiliaria.piloto.flota.toastParcial', {
          modo: etiquetaModo(nuevo).toLowerCase(),
          agentes: res.fallidos.map(nombre).join(', '),
        }),
      )
    } else {
      toast.success(t('inmobiliaria.piloto.flota.toastOk', { modo: etiquetaModo(nuevo).toLowerCase() }))
    }
    return { ok: true }
  }

  const elegir = (nuevo: AutonomiaModo) => {
    if (!puedeCambiar || nuevo === modo) return
    // Subir a automático es lo único que se confirma: a partir de ahí el
    // Piloto llama, escribe y emite recibos sin preguntar.
    if (nuevo === 'autonomo') {
      setConfirmando('autonomo')
      return
    }
    void aplicar(nuevo)
  }

  const moverFoco = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const destino = TECLAS_DE_FOCO[e.key]
    if (!destino) return
    e.preventDefault()
    radios.current[MODOS[destino(i, MODOS.length)]!]?.focus()
  }

  const alCambiarApertura = (o: boolean) => {
    setAbierto(o)
    // Se limpia al ABRIR y no al cerrar: mientras el desplegable se va
    // (la salida dura 150 ms) no tiene que cambiar lo que se ve adentro.
    if (o) {
      setConfirmando(null)
      setVistaPrevia(null)
      void flota.refetch()
    }
  }

  const subtitulo = data
    ? activo
      ? distintos.length > 0
        ? // «7 agentes actúan con este modo» cuando 3 de esos 7
          // están en otro era falso (visto el 24-09): se dice
          // cuántos en este y cuántos en otro, y abajo cuáles.
          t('inmobiliaria.piloto.flota.corriendoConDistintos', {
            n: String(data.actuan ?? agentesQueActuan.length),
            enEste: String(Math.max(0, (data.actuan ?? agentesQueActuan.length) - distintos.length)),
            otros: String(distintos.length),
          })
        : t('inmobiliaria.piloto.flota.corriendo', {
            n: String(data.actuan ?? agentesQueActuan.length),
          })
      : // PI-01 (04-10-2026): el Piloto se activa por inmobiliaria; se dice por qué no actúa.
        data.piloto?.motivo === 'apagado_por_leasefy'
        ? t('inmobiliaria.piloto.flota.apagadoHintLeasefy')
        : data.piloto?.motivo === 'prueba_terminada'
          ? t('inmobiliaria.piloto.flota.apagadoHintPrueba')
          : t('inmobiliaria.piloto.flota.apagadoHint')
    : t('inmobiliaria.piloto.flota.cargando')

  const etiquetaPildora = data ? (activo ? etiquetaModo(modo) : t('inmobiliaria.piloto.flota.apagado')) : '…'

  const pildora = (
    <button
      type="button"
      data-testid="piloto-modo-header"
      data-modo={modo ?? 'cargando'}
      // PI-07: con el Piloto apagado la píldora dice «Apagado» y su nombre accesible también.
      aria-label={
        data && !activo
          ? t('inmobiliaria.piloto.flota.ariaApagado')
          : t('inmobiliaria.piloto.flota.aria', { modo: etiquetaModo(modo) })
      }
      className={cn(
        // A 390 px la píldora se compacta a punto + modo (sin flecha): el
        // encabezado desbordaba y la página medía 446–463 px de ancho (24-09).
        'group inline-flex h-9 max-w-[240px] items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 text-sm sm:gap-2 sm:px-3 lg:max-w-[320px]',
        'text-fg transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        'data-[state=open]:border-border-strong data-[state=open]:bg-surface-muted',
        !activo && data && 'text-fg-muted',
      )}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {hayVivo && activo && (
          <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', PUNTO[modo ?? 'mixto'])} />
        )}
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full transition-colors duration-base',
            data ? (activo ? PUNTO[modo ?? 'mixto'] : 'bg-border-strong') : 'bg-border animate-pulse',
          )}
        />
      </span>
      <span className="hidden min-w-0 items-center sm:inline-flex">
        <span className="text-fg-muted">{t('inmobiliaria.piloto.flota.piloto')}</span>
        <span className="whitespace-pre text-fg-muted"> · </span>
        <TextoQueCambia valor={etiquetaPildora} className="font-medium" />
        {activo && distintos.length > 0 && (
          <span className="ml-1 truncate text-fg-muted" data-testid="piloto-modo-distintos">
            {t('inmobiliaria.piloto.flota.distintosCorto', { n: String(distintos.length) })}
          </span>
        )}
      </span>
      <TextoQueCambia valor={etiquetaPildora} className="font-medium sm:hidden" />
      <AnimatePresence initial={false}>
        {hayVivo && activo && (
          <motion.span
            key="vivo"
            data-testid="piloto-modo-vivo"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: MOV.sale }}
            transition={MOV.llega}
            className="hidden items-center gap-1 rounded-full bg-success-soft px-1.5 py-0.5 font-mono text-caption tabular-nums text-success md:inline-flex"
          >
            {vivo.llamadas > 0 ? (
              <>
                <Waveform weight="bold" className="h-3 w-3" aria-hidden="true" />
                {vivo.llamadas}
              </>
            ) : (
              <>
                <Bank weight="bold" className="h-3 w-3" aria-hidden="true" />
                {vivo.conciliando}
              </>
            )}
          </motion.span>
        )}
      </AnimatePresence>
      <CaretDown
        className="hidden h-3.5 w-3.5 shrink-0 text-fg-muted transition-transform duration-base ease-standard motion-reduce:transition-none group-data-[state=open]:rotate-180 sm:block"
        aria-hidden="true"
      />
    </button>
  )

  // ── Encabezado: qué es, y cuántos agentes actúan con este modo ─────────────
  // En la hoja, el título y la descripción son los de Radix: él les pone el
  // `id` y se los asigna al diálogo. Un `id` propio rompería esa referencia.
  const titulo = enHoja ? (
    <SheetTitle className="text-base font-semibold leading-snug text-fg">{t('inmobiliaria.piloto.titulo')}</SheetTitle>
  ) : (
    <p id={tituloId} className="text-base font-semibold leading-snug text-fg">
      {t('inmobiliaria.piloto.titulo')}
    </p>
  )
  const subtituloClase = cn('mt-0.5 text-caption leading-snug', activo || !data ? 'text-fg-muted' : 'text-fg')
  const subtituloNodo = enHoja ? (
    <SheetDescription className={subtituloClase} role={cargando ? 'status' : undefined}>
      {subtitulo}
    </SheetDescription>
  ) : (
    <p id={subtituloId} className={subtituloClase} role={cargando ? 'status' : undefined}>
      {subtitulo}
    </p>
  )

  const marcaApagado = data && !activo && (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-caption font-medium text-fg-muted',
        enHoja && 'mt-2',
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-border-strong" aria-hidden="true" />
      {t('inmobiliaria.piloto.flota.apagado')}
    </span>
  )

  const encabezado = (
    <div
      className={cn(
        'flex flex-none items-start gap-3 border-b border-border-faint px-4 pb-3.5 sm:px-5',
        // En la hoja, el asa (la pone Cadence) y la ✕ van arriba a la derecha.
        enHoja ? 'pr-14 pt-6' : 'pt-3.5',
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        <AirTrafficControl weight="duotone" className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        {titulo}
        {subtituloNodo}
        {/* En la hoja, «Apagado» va debajo: a la derecha, junto a la ✕,
            dejaba el subtítulo en una columna de cinco renglones. */}
        {enHoja && marcaApagado}
      </div>
      {!enHoja && marcaApagado}
    </div>
  )

  // ── Ahora mismo: sólo si pasa algo. Vacío que no aporta, no se pinta. ──────
  const hayAhora = activo && (vivo.llamadas > 0 || vivo.conciliando > 0 || vivo.esperando > 0)
  const ahora = (
    <AnimatePresence initial={false}>
      {hayAhora && (
        <motion.div
          key="ahora"
          initial={{ opacity: 0, y: -MOV.cerca }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: MOV.sale }}
          transition={MOV.entra}
          className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-faint bg-surface-muted px-4 py-2.5 sm:px-5"
          data-testid="piloto-modo-ahora"
        >
          <p className="text-label font-medium uppercase tracking-wide text-fg-subtle">{t('inmobiliaria.piloto.flota.ahora')}</p>
          <ul className="flex flex-wrap gap-1.5 text-caption text-fg">
            {vivo.llamadas > 0 && (
              <li className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1">
                <Phone weight="fill" className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                {t('inmobiliaria.piloto.flota.llamadas', { n: String(vivo.llamadas) })}
              </li>
            )}
            {vivo.conciliando > 0 && (
              <li className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1">
                <Bank weight="fill" className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                {t('inmobiliaria.piloto.flota.conciliando', { n: String(vivo.conciliando) })}
              </li>
            )}
            {vivo.esperando > 0 && (
              <li className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1">
                <HourglassMedium weight="fill" className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
                {t('inmobiliaria.piloto.flota.esperando', { n: String(vivo.esperando) })}
              </li>
            )}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // ── Los tres modos, lado a lado. El elegido: un marco que se desliza + ✓. ──
  const modos = (
    <section aria-labelledby={`${base}-modos`} className="px-4 py-4 sm:px-5">
      <h3 id={`${base}-modos`} className="text-label font-medium uppercase tracking-wide text-fg-subtle">
        {t('inmobiliaria.piloto.flota.elegir')}
      </h3>
      <div
        role="radiogroup"
        aria-label={t('inmobiliaria.piloto.flota.elegir')}
        aria-busy={flota.busy || undefined}
        className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3"
        onMouseLeave={() => setVistaPrevia(null)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setVistaPrevia(null)
        }}
      >
        {MODOS.map((m, i) => {
          const Icono = ICONO[m]
          const actual = modo === m
          // Se ve, se enfoca y se lee; no se elige. `aria-disabled` y no
          // `disabled` para que el teclado la recorra y oiga qué hace.
          const noSeOfrece = !puedeCambiar && !actual
          // Apagada a la vista sólo si NUNCA se ofrece (no es admin, Piloto
          // apagado, cargando). Mientras viaja un cambio no se apagan: el
          // marco ya se movió (optimista) y un parpadeo gris de medio
          // segundo se leía como error.
          const apagada = !puedeElegir && !actual
          return (
            <motion.button
              key={m}
              ref={(el: HTMLButtonElement | null) => {
                radios.current[m] = el
              }}
              type="button"
              role="radio"
              aria-checked={actual}
              aria-disabled={noSeOfrece || undefined}
              aria-describedby={queId(m)}
              tabIndex={m === tabuladoEn ? 0 : -1}
              data-testid={`piloto-modo-${m}`}
              data-apagada={apagada || undefined}
              onClick={() => elegir(m)}
              onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => moverFoco(e, i)}
              onMouseEnter={() => setVistaPrevia(m)}
              onFocus={() => setVistaPrevia(m)}
              initial={{ opacity: 0, y: MOV.lejos }}
              animate={{ opacity: apagada ? 0.6 : 1, y: 0 }}
              transition={{ ...MOV.entra, delay: retrasoEscalonado(i, MODOS.length) }}
              whileTap={actual || apagada ? undefined : { scale: 0.98 }}
              className={cn(
                // `isolate`: el marco del elegido (`-z-10`) queda sobre el
                // fondo de la tarjeta y debajo del texto.
                'relative isolate flex items-center gap-3 rounded-md border border-border bg-surface py-3 pl-3 pr-9 text-left sm:flex-col sm:items-start sm:gap-2.5 sm:pr-3',
                'outline-none transition-[background-color,border-color] duration-fast ease-standard focus-visible:ring-2 focus-visible:ring-primary/40',
                !actual && !apagada && 'hover:border-border-strong hover:bg-surface-hover',
                apagada && 'cursor-not-allowed',
              )}
            >
              {actual && (
                <motion.span
                  layoutId={`${base}-elegido`}
                  aria-hidden="true"
                  data-testid="piloto-modo-marco"
                  initial={false}
                  transition={MOV.desliza}
                  className="pointer-events-none absolute -inset-px -z-10 rounded-md border border-primary bg-primary-soft"
                />
              )}
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-base',
                  actual ? 'bg-surface text-primary' : 'bg-surface-muted text-fg-muted',
                )}
              >
                <Icono weight={actual ? 'fill' : 'regular'} className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-fg">{t(`inmobiliaria.piloto.flota.modo.${m}`)}</span>
                <span className="mt-0.5 block text-caption leading-snug text-fg-muted">
                  {t(`inmobiliaria.piloto.flota.corto.${m}`)}
                </span>
              </span>
              <AnimatePresence initial={false}>
                {actual && (
                  <motion.span
                    key="check"
                    aria-hidden="true"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5, transition: MOV.sale }}
                    transition={MOV.llega}
                    // Centrado con margen y no con `translate`: framer
                    // escribe el `transform` en línea y pisaría la clase.
                    className="absolute right-3 top-1/2 -mt-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-fg sm:right-2.5 sm:top-2.5 sm:mt-0"
                  >
                    <Check weight="bold" className="h-3 w-3" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </div>

      {/* Lo que hace cada modo HOY, completo: para el lector de pantalla va
          como descripción de cada opción; a la vista, en la línea de abajo. */}
      {MODOS.map((m) => (
        <span key={m} id={queId(m)} hidden>
          {t(`inmobiliaria.piloto.flota.que.${m}`)}
        </span>
      ))}

      {/* La línea de ayuda y la confirmación de Automático ocupan el mismo
          lugar: una reemplaza a la otra con un fundido cruzado. */}
      <div className="relative mt-2">
        <AnimatePresence mode="popLayout">
          {confirmando === 'autonomo' ? (
            <motion.div
              key="confirmar"
              data-testid="piloto-modo-confirmar"
              initial={{ opacity: 0, y: MOV.lejos }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: MOV.cerca, transition: MOV.sale }}
              transition={MOV.entra}
              className="rounded-md border border-warning bg-warning-soft p-3"
            >
              <p className="text-caption leading-relaxed text-fg">{t('inmobiliaria.piloto.flota.confirmarAutonomo')}</p>
              <div className="mt-2.5 flex justify-end gap-2">
                {/* El foco cae en «Cancelar»: lo seguro, a un Tab de confirmar. */}
                {/* Al salir de la confirmación el foco vuelve a la tarjeta: el
                    botón que lo tenía desaparece y no puede quedar en el aire. */}
                <Button
                  variant="ghost"
                  size="sm"
                  hideArrow
                  autoFocus
                  onClick={() => {
                    setConfirmando(null)
                    radios.current.autonomo?.focus()
                  }}
                >
                  {t('inmobiliaria.piloto.flota.cancelar')}
                </Button>
                <Button
                  size="sm"
                  hideArrow
                  onClick={() => {
                    radios.current.autonomo?.focus()
                    // PI-23: esta confirmación ya dice lo que pasa; si el micro
                    // pide el código del segundo factor, lo pide el diálogo.
                    void aplicar('autonomo').then((r) => {
                      if (!r.ok && pideSegundoFactor(r.fallo)) {
                        setAbierto(false)
                        setPidiendoCodigo(true)
                      }
                    })
                  }}
                  data-testid="piloto-modo-confirmar-si"
                >
                  {t('inmobiliaria.piloto.flota.confirmarSi')}
                </Button>
              </div>
            </motion.div>
          ) : modoAyuda ? (
            <motion.div
              key="ayuda"
              aria-hidden="true"
              data-testid="piloto-modo-ayuda"
              data-modo={modoAyuda}
              initial={{ opacity: 0, y: MOV.cerca }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: MOV.sale }}
              // Entra después de las tres tarjetas.
              transition={{ ...MOV.entra, delay: retrasoEscalonado(MODOS.length, MODOS.length + 1) }}
              // Los tres textos en la MISMA celda: la caja mide lo que el más
              // largo y pasar el cursor de una tarjeta a otra no mueve nada.
              // En la hoja no hay cursor (un toque elige): va sólo el del modo,
              // sin el renglón vacío que dejaba el más largo.
              className="grid rounded-md bg-surface-muted px-3 py-2.5 text-caption leading-relaxed text-fg-muted"
            >
              {MODOS.map((m) => (
                <motion.span
                  key={m}
                  data-activo={m === modoAyuda || undefined}
                  className={cn('[grid-area:1/1]', enHoja && m !== modoAyuda && 'hidden')}
                  initial={false}
                  animate={{ opacity: m === modoAyuda ? 1 : 0 }}
                  transition={MOV.funde}
                >
                  <span className="font-medium text-fg">{t(`inmobiliaria.piloto.flota.modo.${m}`)}.</span>{' '}
                  {t(`inmobiliaria.piloto.flota.que.${m}`)}
                </motion.span>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {!isAdmin && activo && (
        <p className="mt-2 text-caption text-fg-subtle">{t('inmobiliaria.piloto.autonomia.soloAdmin')}</p>
      )}
    </section>
  )

  // ── Cada agente: una grilla; el que va distinto, teñido y con su modo. ─────
  // La grilla entra después de las tarjetas (120 ms) y escalonada.
  const desdeGrilla = 0.12
  const porAgente = activo && data && agentesQueActuan.length > 0 && (
    <section aria-labelledby={`${base}-cada`} data-testid="piloto-modo-por-agente">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id={`${base}-cada`} className="text-label font-medium uppercase tracking-wide text-fg-subtle">
          {t('inmobiliaria.piloto.flota.cadaAgente')}
        </h3>
        {todosIguales ? (
          <p className="text-caption text-fg-muted" data-testid="piloto-modo-todos-igual">
            {t('inmobiliaria.piloto.flota.todosIgual', { modo: etiquetaModo(modo) })}
          </p>
        ) : (
          modoGeneral !== null && (
            <p className="flex items-center gap-1.5 text-caption text-fg-muted" data-testid="piloto-modo-leyenda">
              <span className="h-2.5 w-2.5 rounded-[3px] border border-warning bg-warning-soft" aria-hidden="true" />
              {t('inmobiliaria.piloto.flota.otroModo')}
            </p>
          )
        )}
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {agentesQueActuan.map((a, i) => {
          // Con un micro viejo que diga «mixto» no hay modo general: cada
          // casilla dice el suyo, sin teñir ninguna.
          const distinto = modoGeneral !== null && a.modo !== modoGeneral
          const diceModo = distinto || modoGeneral === null
          return (
            <motion.li
              key={a.agente}
              data-agente={a.agente}
              data-modo={a.modo}
              data-distinto={distinto || undefined}
              {...entrada(retrasoEscalonado(i, agentesQueActuan.length, desdeGrilla), MOV.cerca)}
              className={cn(
                'flex min-w-0 items-start gap-2 rounded-md border px-2.5 py-2 text-caption leading-snug transition-colors duration-base',
                distinto ? 'border-warning bg-warning-soft' : 'border-border-faint bg-surface-muted',
              )}
            >
              <span className={cn('mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full', PUNTO[a.modo] ?? PUNTO.copiloto)} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-fg">{nombre(a.agente)}</span>
                {diceModo ? (
                  <span className="block text-fg-muted">{etiquetaModo(a.modo)}</span>
                ) : (
                  // A la vista, la casilla sin modo va en el general (lo dice
                  // la tarjeta marcada). Con mezcla, el lector lo oye igual;
                  // si todos van igual ya lo dijo la línea de arriba.
                  !todosIguales && <span className="sr-only">{`, ${etiquetaModo(a.modo)}`}</span>
                )}
              </span>
            </motion.li>
          )
        })}
      </ul>
    </section>
  )

  // ── Los que todavía no actúan solos: chips apagados y una nota corta. ──────
  const desdeChips = 0.2
  const noActuan = activo && data && todaviaNo.length > 0 && (
    <section aria-labelledby={`${base}-todavia`} data-testid="piloto-modo-todavia-no">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id={`${base}-todavia`} className="text-label font-medium uppercase tracking-wide text-fg-subtle">
          {t('inmobiliaria.piloto.flota.todaviaNoTitulo')}
        </h3>
        <p className="text-caption text-fg-subtle">{t('inmobiliaria.piloto.flota.todaviaNoNota')}</p>
      </div>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {todaviaNo.map((a, i) => (
          <motion.li
            key={a.agente}
            data-agente={a.agente}
            {...entrada(retrasoEscalonado(i, todaviaNo.length, desdeChips), MOV.cerca)}
            className="inline-flex items-center rounded-full border border-dashed border-border-strong px-2.5 py-1 text-caption text-fg-subtle"
          >
            {nombre(a.agente)}
          </motion.li>
        ))}
      </ul>
    </section>
  )

  // Mientras se lee la flota, un esqueleto con la forma de la grilla. Sin
  // números ni nombres: todavía no se sabe nada.
  const esqueleto = cargando && (
    <div aria-hidden="true" className="grid grid-cols-2 gap-1.5 sm:grid-cols-3" data-testid="piloto-modo-esqueleto">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="h-9 rounded-md bg-surface-muted motion-safe:animate-pulse" />
      ))}
    </div>
  )

  const agentes: ReactNode = (porAgente || noActuan || esqueleto) && (
    <div className="space-y-4 border-t border-border-faint px-4 py-4 sm:px-5">
      {esqueleto}
      {porAgente}
      {noActuan}
    </div>
  )

  const pie = (
    <div
      className={cn(
        'flex flex-none items-center justify-between gap-2 border-t border-border-faint px-3 py-2.5 sm:px-4',
        enHoja && 'pb-[max(0.625rem,env(safe-area-inset-bottom))]',
      )}
    >
      {/* Abre el tray flotante en vez de navegar: Nico (2026-09-02) pidió
          que el acceso viviera arriba y que igual abriera el menú
          flotante — el botón fijo de abajo tapaba el paginador. */}
      <Button
        variant="ghost"
        size="sm"
        hideArrow
        onClick={() => {
          setAbierto(false)
          dock.alternar()
        }}
        data-testid="piloto-modo-procesos"
      >
        <Pulse className="mr-1.5 h-4 w-4" aria-hidden="true" />
        {t('inmobiliaria.piloto.flota.verProcesos')}
      </Button>
      <Button asChild variant="secondary" size="sm" hideArrow>
        <Link href={RUTA_PILOTO} onClick={() => setAbierto(false)} data-testid="piloto-modo-por-agente-link">
          <SlidersHorizontal className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {t('inmobiliaria.piloto.flota.porAgente')}
        </Link>
      </Button>
    </div>
  )

  const cuerpo = (
    <>
      {encabezado}
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        data-lenis-prevent
        style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        {ahora}
        {modos}
        {agentes}
      </div>
      {pie}
    </>
  )

  // PI-23: el diálogo de Automático vive junto a la píldora (el desplegable ya se cerró).
  const dialogoDeAutomatico = (
    <ConfirmarAutomatico
      abierto={pidiendoCodigo}
      quien="todos los agentes"
      pilotoActivo={activo}
      pasoInicial="codigo"
      onConfirmar={() => aplicar('autonomo')}
      onCerrar={() => setPidiendoCodigo(false)}
    />
  )

  if (enHoja) {
    return (
      <>
      <Sheet open={abierto} onOpenChange={alCambiarApertura}>
          <SheetTrigger asChild>{pildora}</SheetTrigger>
          {/* `layout="manual"`: el cuerpo ya trae su scroll (`data-lenis-prevent`),
              el pie es nuestro. La forma, el asa, la ✕ y la entrada (sube desde
              abajo; con movimiento reducido, sólo funde) son de Cadence. */}
          <SheetContent side="bottom" layout="manual" data-testid="piloto-modo-hoja">
            {cuerpo}
          </SheetContent>
        </Sheet>
      {dialogoDeAutomatico}
      </>
    )
  }

  return (
    <>
      <Popover open={abierto} onOpenChange={alCambiarApertura}>
        <PopoverTrigger asChild>{pildora}</PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          collisionPadding={16}
          aria-labelledby={tituloId}
          aria-describedby={subtituloId}
          data-testid="piloto-modo-popover"
          className={cn(
            'flex w-[min(680px,calc(100vw-2rem))] flex-col overflow-hidden p-0',
            // Crece desde la píldora, no desde el centro de su borde. La
            // entrada y la salida (y su versión reducida) son de Cadence.
            'origin-[var(--radix-popover-content-transform-origin)]',
          )}
        >
          {cuerpo}
        </PopoverContent>
      </Popover>
      {dialogoDeAutomatico}
    </>
  )
}
