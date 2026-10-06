'use client'

/**
 * Los orbes que reaccionan (Nico, 05-10-2026 19:30, tal cual): «al dar hover
 * que reaccione la orbe y que muestre información con un popover y cta para
 * poder activar y desactivar. Y también la principal, la primer orbe, que
 * también cuando uno pase el hover por encima de él que reaccione».
 *
 *   · `TripulanteConPopover`: la tarjeta de un agente (dos filas fijas: nombre
 *     con su modo y UNA línea de lo último, con su «hace…»). Su panel dice qué
 *     hace, su modo y qué significa, lo último entero y cuántas acciones lleva
 *     hoy; y, si la pantalla lo da, Activar / Desactivar y su modo (las MISMAS
 *     llamadas de Autonomía: `control-de-agentes.tsx`).
 *   · `OrbeDelPilotoConPopover`: el orbe del núcleo. Su panel dice el modo
 *     general, los agentes por modo, lo que está haciendo ahora y la frase del
 *     director, con «Abrir el plan» y «Autonomía».
 *
 * Cómo se abre (Nico, 05-10 21:48 y 21:55): pasar el puntero (o el foco del
 * teclado) NO abre nada: el elemento reacciona — la tarjeta se eleva y se
 * ilumina y su orbe despierta; el orbe del núcleo crece un poco, abre sus
 * anillos, brilla más y la Nebulosa se aviva. El CLIC (o Enter / Espacio) abre
 * el panel; otro clic, un clic afuera o Esc lo cierran. En la tripulación hay
 * UN solo panel abierto a la vez (lo decide `Tripulacion`). Movimiento: sólo
 * `transform` y `opacity`, con los tokens de Cadence; con movimiento reducido,
 * sólo el cambio de luz.
 */

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { MonoLabel, SegmentedControl, motionDistance, motionDuration, motionEase, usePrefersReducedMotion } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { OrbeDeAgente } from '@/components/agentes/OrbeDeAgente'
import { relativeTime } from '@/components/inmobiliaria/ai/ColaHumana'
import { agenteDeLaAutonomia } from '@/lib/agentes/equipo'
import type { EstadoDelOrbe } from '@/lib/agentes/agente-que-habla'
import { MODOS_DEL_PILOTO, type AutonomiaModo } from '@/lib/api/piloto'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

import { estadoDelOrbeDelAgente, type MiembroDeLaTripulacion } from './calculos'
import type { ControlDeAgentes } from './control-de-agentes'
import type { IndicadoresDelMando } from './indicadores'
import { OrbeDelPiloto, PuntoDeEstado, unir, useNombreDeAgente, type Tono } from './piezas'
import { TEXTOS } from './textos'
import type { AccionesDelMando, DatosDelMando } from './tipos'

// ── Reaccionar al pasar; abrir al clic ─────────────────────────────────────

/**
 * Nico (05-10 21:48 y 21:55): «pasar el puntero NO abre el panel: el elemento
 * reacciona; el CLIC abre el panel». Esto sólo dice si hay alguien encima (el
 * puntero o el foco del TECLADO) para la reacción; abrir y cerrar es del
 * Popover de Radix: clic, Enter o Espacio abren; otro clic, un clic afuera o
 * Esc cierran.
 *
 * 🔴 Antes el foco también ABRÍA: Esc cerraba, Radix devolvía el foco al
 * disparador y el foco lo volvía a abrir (medido en el navegador el 05-10:
 * «clic y Esc: 1 panel»). Ese reabrir mientras el viejo salía es la pinta de
 * los «dos paneles apilados» de la captura de Nico.
 */
export function useReaccionAlPasar() {
  const [puntero, setPuntero] = useState(false)
  const [foco, setFoco] = useState(false)
  /** Cuándo se apretó con el puntero o el dedo: el foco que llega justo después no es del teclado. */
  const ultimoPuntero = useRef(0)
  const props = {
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') setPuntero(true)
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') setPuntero(false)
    },
    onPointerDown: () => {
      ultimoPuntero.current = Date.now()
    },
    onFocus: () => {
      if (Date.now() - ultimoPuntero.current > 400) setFoco(true)
    },
    onBlur: () => setFoco(false),
  }
  return { encima: puntero || foco, props }
}

/** Abrir el panel con Framer, con los tokens de Cadence (la salida la pone el Popover del DS). */
function EntradaDelPanel({ children }: { children: React.ReactNode }) {
  const reducido = usePrefersReducedMotion()
  return (
    <motion.div
      initial={reducido ? { opacity: 0 } : { opacity: 0, y: motionDistance.xs, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: motionDuration.base, ease: motionEase.enter }}
    >
      {children}
    </motion.div>
  )
}

/** El pulso alrededor de un orbe despierto: un anillo que se abre y se apaga (transform + opacity). */
function Pulso({ activo, className }: { activo: boolean; className?: string }) {
  const reducido = usePrefersReducedMotion()
  if (!activo || reducido) return null
  return (
    <motion.span
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 rounded-full border-2 border-primary', className)}
      initial={{ opacity: 0.7, scale: 1 }}
      animate={{ opacity: 0, scale: 1.8 }}
      transition={{ duration: motionDuration.ambient * 0.6, repeat: Infinity, ease: motionEase.exit }}
    />
  )
}

// ── La tarjeta de un agente ────────────────────────────────────────────────

export interface TripulanteConPopoverProps {
  m: MiembroDeLaTripulacion
  pilotoEncendido: boolean
  /** Cuántas acciones hizo hoy (del feed). `null` = sin dato: no se dice. */
  accionesHoy: number | null
  control?: ControlDeAgentes
  /**
   * El panel abierto lo decide la tripulación (UNO solo a la vez). Sin esto, la
   * tarjeta lleva su propio estado.
   */
  abierto?: boolean
  onAbiertoChange?: (abierto: boolean) => void
}

export function TripulanteConPopover({ m, pilotoEncendido, accionesHoy, control, abierto: abiertoDeAfuera, onAbiertoChange }: TripulanteConPopoverProps) {
  const { t } = useI18n()
  const nombre = useNombreDeAgente()(m.agente)
  const reducido = usePrefersReducedMotion()
  const [abiertoPropio, setAbiertoPropio] = useState(false)
  const abierto = abiertoDeAfuera ?? abiertoPropio
  const cambiar = (o: boolean) => {
    if (o) control?.alAbrir()
    if (onAbiertoChange) onAbiertoChange(o)
    else setAbiertoPropio(o)
  }
  const { encima, props } = useReaccionAlPasar()
  // Despierta con el puntero encima o con su panel abierto.
  const despierto = encima || abierto
  const a = agenteDeLaAutonomia(m.agente)
  const base = estadoDelOrbeDelAgente(m, pilotoEncendido)
  // Despierto: piensa (gira y brilla). Uno apagado despierta en color, sin fingir que trabaja.
  const estado: EstadoDelOrbe = despierto ? (m.corre ? (base === 'trabajando' ? 'trabajando' : 'pensando') : 'quieto') : base
  const modo = TEXTOS.tripulacion.modos[m.modo] ?? m.modo
  // UNA línea de «lo último» (el texto entero está en el panel).
  const linea = m.ultimo
    ? m.ultimo.titulo
    : !m.corre
      ? (m.porQueNoCorre ?? TEXTOS.tripulacion.apagado)
      : m.actua
        ? TEXTOS.tripulacion.sinActividad
        : TEXTOS.tripulacion.corre

  return (
    <Popover open={abierto} onOpenChange={cambiar}>
      {/* La tarjeta se eleva con Framer (sólo transform: no mueve nada alrededor). */}
      <motion.div
        className="h-full"
        initial={false}
        animate={{ y: encima && !reducido ? -3 : 0 }}
        transition={{ duration: motionDuration.base, ease: motionEase.enter }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            hideArrow
            aria-haspopup="dialog"
            data-testid={`tripulante-${m.agente}`}
            data-despierto={despierto || undefined}
            className={cn(
              'h-full w-full items-start justify-start gap-3 whitespace-normal rounded-md border p-3 text-left font-normal',
              'transition-[box-shadow,border-color,background-color] duration-base ease-enter',
              m.corre ? 'border-border-faint' : 'border-dashed border-border bg-surface-muted',
              despierto && 'border-primary shadow-md',
            )}
            {...props}
          >
            <span className="relative grid h-9 w-9 shrink-0 place-items-center">
              <Pulso activo={despierto} />
              <motion.span
                className="grid place-items-center"
                initial={false}
                animate={{ scale: despierto && !reducido ? 1.16 : 1 }}
                transition={{ duration: motionDuration.base, ease: motionEase.enter }}
              >
                {a ? <OrbeDeAgente agente={a} tamano={36} estado={estado} quieto={!despierto && !m.trabajando} decorativo /> : <span className="h-9 w-9" />}
              </motion.span>
            </span>
            {/* Tres filas fijas (main, 22:20: el nombre no se corta nunca):
                1. el nombre ENTERO, solo en su fila;
                2. el modo y el «hace…» de lo último;
                3. UNA línea de lo último, a todo el ancho, con «…» (entero en el panel). */}
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-body-sm font-semibold leading-snug text-fg" data-fila="nombre">
                {nombre}
              </span>
              <span className="flex min-w-0 items-center justify-between gap-2" data-fila="modo">
                <span
                  className={unir(
                    'shrink-0 rounded-full px-2 py-0.5 text-caption',
                    !m.corre ? 'border border-border bg-surface text-fg-muted' : m.modo === 'autonomo' ? 'bg-primary text-primary-fg' : 'bg-primary-soft text-primary',
                  )}
                >
                  {m.corre ? modo : TEXTOS.tripulacion.apagado}
                </span>
                {m.ultimo && <span className="shrink-0 font-mono text-caption tabular-nums text-fg-subtle">{relativeTime(m.ultimo.at, t)}</span>}
              </span>
              <span className="block min-w-0 truncate text-caption text-fg-muted" title={linea} data-fila="ultimo">
                {m.trabajando ? <span className="font-medium text-primary">{TEXTOS.enVivo.ahora} · </span> : null}
                {linea}
              </span>
            </span>
          </Button>
        </PopoverTrigger>
      </motion.div>
      <PopoverContent
        side="top"
        align="start"
        collisionPadding={12}
        className="w-[min(22rem,calc(100vw-2rem))] p-0 outline-none"
        aria-label={TEXTOS.agente.abrirDetalle(nombre)}
        data-testid={`popover-agente-${m.agente}`}
      >
        <EntradaDelPanel>
          <DetalleDelAgente m={m} nombre={nombre} modo={modo} accionesHoy={accionesHoy} control={control} />
        </EntradaDelPanel>
      </PopoverContent>
    </Popover>
  )
}

function DetalleDelAgente({
  m,
  nombre,
  modo,
  accionesHoy,
  control,
}: {
  m: MiembroDeLaTripulacion
  nombre: string
  modo: string
  accionesHoy: number | null
  control: ControlDeAgentes | undefined
}) {
  const { t } = useI18n()
  const a = agenteDeLaAutonomia(m.agente)
  const historia = a ? t(`agentes.${a.id}.historia`) : null
  const rol = a ? t(`agentes.${a.id}.rol`) : null
  const ocupado = control?.ocupado === m.agente
  const encendible = control?.sePuedeEncender(m.agente) ?? { si: null, porQueNo: null }
  const tieneModo = control?.tieneModo(m.agente) ?? false
  const error = control?.error?.agente === m.agente ? control.error.mensaje : null
  // ¿Por qué no se puede? (uno solo, el primero que aplique).
  const porQueNo = !control
    ? null
    : !control.puedeCambiar
      ? control.porQueNo
      : !m.corre && encendible.si === false
        ? encendible.porQueNo
        : null
  const sePuedeEncender = Boolean(control?.puedeCambiar) && (m.corre || encendible.si !== false)
  const sePuedeCambiarModo = Boolean(control?.puedeCambiar) && m.corre && tieneModo

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start gap-3">
        {a ? <OrbeDeAgente agente={a} tamano={40} estado={m.corre ? 'pensando' : 'apagado'} decorativo /> : null}
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold text-fg">{nombre}</p>
          {rol && rol !== `agentes.${a?.id}.rol` && <p className="text-caption text-fg-muted">{rol}</p>}
        </div>
        <span className={unir('shrink-0 rounded-full px-2 py-0.5 text-caption', m.corre ? 'bg-primary-soft text-primary' : 'border border-border text-fg-muted')}>
          {m.corre ? modo : TEXTOS.tripulacion.apagado}
        </span>
      </div>

      {historia && historia !== `agentes.${a?.id}.historia` && (
        <section className="space-y-1">
          <MonoLabel>{TEXTOS.agente.queHace}</MonoLabel>
          <p className="line-clamp-3 text-body-sm text-fg">{historia}</p>
        </section>
      )}

      <section className="space-y-1">
        <MonoLabel>{m.corre ? TEXTOS.agente.suModo(modo) : TEXTOS.tripulacion.apagado}</MonoLabel>
        <p className="line-clamp-3 text-caption text-fg-muted">{m.corre ? (m.efectoReal ?? (m.actua ? '' : TEXTOS.tripulacion.corre)) : (m.porQueNoCorre ?? TEXTOS.tripulacion.apagado)}</p>
      </section>

      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        <div className="min-w-0">
          <dt className="font-mono text-label uppercase tracking-wide text-fg-muted">{TEXTOS.agente.loUltimo}</dt>
          <dd className="text-caption text-fg">
            {m.ultimo ? (
              <>
                <span className="line-clamp-2">{m.ultimo.titulo}</span>
                <span className="font-mono tabular-nums text-fg-subtle">{relativeTime(m.ultimo.at, t)}</span>
              </>
            ) : (
              TEXTOS.agente.sinAcciones
            )}
          </dd>
        </div>
        {accionesHoy !== null && (
          <div className="text-right">
            <dt className="font-mono text-label uppercase tracking-wide text-fg-muted">{TEXTOS.agente.hoy}</dt>
            <dd className="font-mono text-body-sm tabular-nums text-fg">{TEXTOS.agente.accionesHoy(accionesHoy)}</dd>
          </div>
        )}
      </dl>

      {control && (
        <div className="space-y-3 border-t border-border-faint pt-3">
          {m.corre && (
            <div className="space-y-1.5">
              <MonoLabel>{TEXTOS.agente.cambiarModo}</MonoLabel>
              <SegmentedControl<AutonomiaModo>
                aria-label={`${TEXTOS.agente.cambiarModo}: ${nombre}`}
                size="sm"
                fullWidth
                value={m.modo === 'mixto' ? 'copiloto' : m.modo}
                disabled={!sePuedeCambiarModo || ocupado}
                onChange={(modoNuevo) => {
                  if (modoNuevo !== m.modo) void control.cambiarModo(m.agente, nombre, modoNuevo)
                }}
                options={MODOS_DEL_PILOTO.map((x) => ({ value: x, label: TEXTOS.tripulacion.modos[x] }))}
              />
              {control.puedeCambiar && !tieneModo && <p className="text-caption text-fg-muted">{TEXTOS.agente.sinModo}</p>}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              size="sm"
              hideArrow
              variant={m.corre ? 'outline' : 'default'}
              isLoading={ocupado}
              disabled={!sePuedeEncender}
              onClick={() => void control.encender(m.agente, nombre, !m.corre)}
              data-testid={`popover-agente-${m.agente}-cta`}
            >
              {m.corre ? TEXTOS.agente.apagar : TEXTOS.agente.encender}
            </Button>
            {control.esMuestra && <span className="text-caption text-fg-subtle">{TEXTOS.muestra.distintivo}</span>}
          </div>
          {porQueNo && <p className="text-caption text-fg-muted">{porQueNo}</p>}
          {error && (
            <p role="alert" className="text-caption text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── El orbe del núcleo ─────────────────────────────────────────────────────

export interface OrbeDelPilotoConPopoverProps {
  ind: IndicadoresDelMando
  datos: DatosDelMando
  acciones: AccionesDelMando
  tamano: number
  conAnillos?: boolean
  tono?: Tono
}

/** Despierto, la Nebulosa acelera un paso: quieta → piensa → trabaja. Apagado despierta en color. */
function orbeDespierto(base: EstadoDelOrbe): EstadoDelOrbe {
  if (base === 'apagado') return 'quieto'
  if (base === 'quieto' || base === 'listo') return 'pensando'
  return 'trabajando'
}

export function OrbeDelPilotoConPopover({ ind, datos, acciones, tamano, conAnillos = false, tono = 'superficie' }: OrbeDelPilotoConPopoverProps) {
  const [abierto, setAbierto] = useState(false)
  const onOpenChange = setAbierto
  const { encima, props } = useReaccionAlPasar()
  const despierto = encima || abierto
  const flota = datos.flota.data
  const modoGeneral = flota ? (TEXTOS.tripulacion.modos[flota.modo] ?? flota.modo) : null
  const distintos = flota?.distintos?.length ?? 0

  return (
    <Popover open={abierto} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          hideArrow
          aria-haspopup="dialog"
          aria-label={TEXTOS.piloto.abrirDetalle}
          data-testid="orbe-del-piloto"
          className={cn(
            'h-auto w-auto rounded-full p-0 hover:bg-transparent focus-visible:ring-offset-0',
            tono === 'tinta' && 'focus-visible:outline-ink-fg',
          )}
          {...props}
        >
          <span className="relative grid place-items-center">
            <OrbeDelPiloto estado={ind.estado} orbe={despierto ? orbeDespierto(ind.orbe) : ind.orbe} tamano={tamano} conAnillos={conAnillos} despierto={despierto} tono={tono} />
            {/* El popover cuelga del ORBE, no de la caja de los anillos (un 70 % más grande):
                así cabe debajo en una pantalla de 900 px en vez de taparle el encabezado. */}
            <PopoverAnchor asChild>
              <span aria-hidden="true" className="pointer-events-none absolute" style={{ width: tamano, height: tamano }} />
            </PopoverAnchor>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="center"
        collisionPadding={12}
        // Ancho y en dos columnas desde `sm`: bajo, para que quepa debajo del orbe sin taparle el encabezado.
        className="w-[min(36rem,calc(100vw-2rem))] p-0 outline-none"
        aria-label={TEXTOS.piloto.abrirDetalle}
        data-testid="popover-del-piloto"
      >
        <EntradaDelPanel>
        <div className="space-y-4 p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <PuntoDeEstado estado={ind.estado} late={ind.enCurso.length > 0} />
              <MonoLabel>
                {TEXTOS.piloto.titulo} · {TEXTOS.estado[ind.estado]}
              </MonoLabel>
            </div>
            {ind.estado === 'apagado' && ind.fraseDelPiloto && <p className="line-clamp-2 text-caption text-fg-muted">{ind.fraseDelPiloto}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-4">
          {modoGeneral && (
            <section className="space-y-1">
              <MonoLabel>{TEXTOS.piloto.modoGeneral}</MonoLabel>
              <p className="text-body-sm font-semibold text-fg">
                {modoGeneral}
                {distintos > 0 && <span className="font-normal text-fg-muted"> · {TEXTOS.piloto.otros(distintos)}</span>}
              </p>
            </section>
          )}

          {ind.flota && (
            <section className="space-y-1.5">
              <MonoLabel>{TEXTOS.piloto.agentes}</MonoLabel>
              <ul className="flex flex-wrap gap-1.5">
                {(['autonomo', 'copiloto', 'sombra'] as const).map((x) => (
                  <li key={x} className={unir('rounded-full px-2.5 py-1 text-caption', x === 'autonomo' ? 'bg-primary text-primary-fg' : x === 'copiloto' ? 'bg-primary-soft text-primary' : 'border border-border text-fg-muted')}>
                    <span className="font-mono tabular-nums">{ind.flota?.porModo[x] ?? 0}</span> {TEXTOS.tripulacion.modos[x]}
                  </li>
                ))}
              </ul>
            </section>
          )}
          </div>

          <div className="space-y-4">
          <section className="space-y-1">
            <MonoLabel>{TEXTOS.piloto.ahora}</MonoLabel>
            {ind.enCurso.length > 0 ? (
              <ul className="space-y-1">
                {ind.enCurso.slice(0, 3).map((e) => (
                  <li key={e.id} className="text-caption text-fg">
                    {e.titulo}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-caption text-fg-muted">{TEXTOS.piloto.nadaAhora}</p>
            )}
          </section>

          <section className="space-y-1">
            <MonoLabel>{TEXTOS.piloto.director}</MonoLabel>
            <p className="line-clamp-4 text-caption text-fg">
              {ind.voz?.quien === 'director'
                ? ind.voz.texto
                : ind.directorEncendido
                  ? TEXTOS.director.sinPlan
                  : TEXTOS.piloto.directorApagado}
            </p>
          </section>
          </div>
          </div>

          {(acciones.abrirDirector || acciones.abrirAutonomia) && (
            <div className="flex flex-wrap gap-2 border-t border-border-faint pt-3">
              {acciones.abrirDirector && (
                <Button
                  size="sm"
                  hideArrow
                  onClick={() => {
                    onOpenChange(false)
                    acciones.abrirDirector?.()
                  }}
                >
                  {TEXTOS.piloto.abrirPlan}
                </Button>
              )}
              {acciones.abrirAutonomia && (
                <Button
                  size="sm"
                  variant="outline"
                  hideArrow
                  onClick={() => {
                    onOpenChange(false)
                    acciones.abrirAutonomia?.()
                  }}
                >
                  {TEXTOS.piloto.autonomia}
                </Button>
              )}
            </div>
          )}
        </div>
        </EntradaDelPanel>
      </PopoverContent>
    </Popover>
  )
}
