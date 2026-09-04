'use client'

/**
 * Conciliación bancaria — la Sala del agente (resumen del módulo).
 *
 * ── Qué cambió y por qué (Nico, 2026-09-03) ─────────────────────────────────
 *
 * La pantalla apilaba seis cosas sin jerarquía: un botón primario
 * «Por revisar (0) →» en el encabezado, una tarjeta de carga, cuatro KPIs, una
 * tarjeta sola a todo el ancho con el monto, otra de «Excepciones por tipo»,
 * la de «¿Cómo funciona?» y, más abajo, tres KPIs más «(30 días)» que repetían
 * los de arriba con otra ventana de tiempo. El botón primario era el peor:
 * decía UN número sin nombre — no decía qué encontró el agente.
 *
 * Ahora el orden es el del trabajo real:
 *   1. subir el extracto (la acción que desbloquea todo lo demás),
 *   2. «Lo que encontró el agente» — la conclusión en palabras, el desglose por
 *      tipo y UNA acción: ir a revisarlo,
 *   3. una sola franja de KPIs (movimientos · conciliados · en cola · tasa ·
 *      monto), en la misma familia de tarjeta que el resto del panel,
 *   4. qué pasó con la última corrida, si se pidió una,
 *   5. la actividad reciente del agente,
 *   6. «¿Cómo funciona?», plegado, que es ayuda y no dato.
 *
 * ── Por qué esta Sala no usa <SalaAgente> ───────────────────────────────────
 * `<SalaAgente>` monta SIEMPRE el CTA primario de la cola en su encabezado y
 * su propia franja de KPIs «(30 días)» — las dos cosas que Nico pidió sacar de
 * acá. Es un componente compartido por los demás agentes, así que en vez de
 * cambiárselo a todos, esta Sala se compone directo. De lo que traía
 * `<SalaAgente>` se conserva lo que NO se repetía: la actividad reciente.
 *
 * Fail-soft: el resumen (GET …/conciliacion/summary) puede no estar desplegado
 * (404) o la base en modo stub → sus dos bloques no se pintan y la pantalla
 * conserva el hero, la corrida y la ayuda. Nunca un muro de error.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowsClockwise, CaretRight, CheckCircle, UploadSimple } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import {
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui'
import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { useAgentOverview } from '@/lib/hooks/ai/use-agent-overview'
import { useConciliacionSummary } from '@/lib/hooks/conciliacion/use-conciliacion-summary'
import { useConciliacionRun } from '@/lib/hooks/conciliacion/use-conciliacion-run'
import {
  ConciliacionResumen,
  HallazgosDelAgente,
} from '@/components/inmobiliaria/ai/ConciliacionResumen'
import { relativeTime } from '@/components/inmobiliaria/ai/ColaHumana'
import { actorLabel, actorMeta } from '@/components/inmobiliaria/ai/TrazaCaso'
import { useI18n } from '@/lib/i18n'

const PAGES_NS = 'inmobiliaria.ai.workspace.pages.conciliacion'
const WORKSPACE_NS = 'inmobiliaria.ai.workspace'

const COLA_HREF = '/panel/inmobiliaria/conciliacion/cola'

/** Ancla en la página de movimientos — el cargador lleva id="upload". */
const SUBIR_EXTRACTO_HREF = '/panel/inmobiliaria/conciliacion/movimientos#upload'

/** «Cómo funciona» — el viaje de la conciliación en 3 pasos. */
const COMO_FUNCIONA_STEPS: { icon: Icon; titleKey: string; descKey: string }[] = [
  { icon: UploadSimple, titleKey: `${PAGES_NS}.comoFunciona.step1.title`, descKey: `${PAGES_NS}.comoFunciona.step1.desc` },
  { icon: ArrowsClockwise, titleKey: `${PAGES_NS}.comoFunciona.step2.title`, descKey: `${PAGES_NS}.comoFunciona.step2.desc` },
  { icon: CheckCircle, titleKey: `${PAGES_NS}.comoFunciona.step3.title`, descKey: `${PAGES_NS}.comoFunciona.step3.desc` },
]

/**
 * Qué pasó con la última corrida pedida a mano.
 *
 * `corriendo`  → se pidió y todavía no se ve nada.
 * `lista`      → el resumen cambió: se dice CUÁNTO cambió.
 * `sinCambios` → pasaron ~30 s y el resumen sigue igual. No se declara
 *                fracaso: la corrida puede seguir procesando. Se dice eso.
 */
type Corrida =
  | { estado: 'corriendo' }
  | { estado: 'lista'; conciliados: number; enCola: number }
  | { estado: 'sinCambios' }

function ResultadoDeLaCorrida({ corrida }: { corrida: Corrida | null }) {
  if (!corrida) return null

  const texto =
    corrida.estado === 'corriendo'
      ? 'Corrida en marcha: el agente está cruzando tus movimientos contra los cobros.'
      : corrida.estado === 'sinCambios'
        ? 'La corrida sigue procesando: todavía no cambió nada en el resumen. Volvé en un rato o mirá la cola.'
        : [
            corrida.conciliados > 0
              ? `${corrida.conciliados} ${corrida.conciliados === 1 ? 'movimiento conciliado' : 'movimientos conciliados'}`
              : null,
            corrida.enCola > 0
              ? `${corrida.enCola} ${corrida.enCola === 1 ? 'caso quedó' : 'casos quedaron'} en la cola para que los apruebes`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')

  return (
    <section
      className="rounded-lg border border-border bg-surface p-4"
      role="status"
      data-testid="conciliacion-resultado-corrida"
      data-estado={corrida.estado}
    >
      <div className="flex items-start gap-3">
        <ArrowsClockwise
          className={`mt-0.5 h-4 w-4 shrink-0 text-fg-muted ${corrida.estado === 'corriendo' ? 'motion-safe:animate-spin' : ''}`}
          aria-hidden="true"
        />
        <div className="min-w-0 space-y-1">
          <p className="text-body-sm font-medium text-fg">Última corrida</p>
          <p className="text-body-sm text-fg-muted">{texto}</p>
          {corrida.estado === 'lista' && corrida.enCola > 0 && (
            <Link
              href={COLA_HREF}
              className="inline-block text-body-sm text-primary underline-offset-2 hover:underline"
            >
              Ver la cola
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

function ConciliacionSala() {
  const { t } = useI18n()
  // Del overview sólo se conserva la actividad reciente: sus KPIs «(30 días)»
  // repetían los del resumen con otra ventana y confundían más de lo que decían.
  const { data: overview } = useAgentOverview('conciliacion')

  // Resumen real del backend (taxonomía + totales + tasa). Fail-soft: null → no se muestra.
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } =
    useConciliacionSummary()
  // Disparo de conciliación on-demand (acción humana, T-323).
  const { isRunning, requestRun } = useConciliacionRun()
  const [confirmOpen, setConfirmOpen] = useState(false)

  /*
   * Qué pasó con la última corrida (Nico, 2026-09-02: «hice el conciliar
   * ahora… no sé si sirvió o no, no hay dónde se pueda ver ese resultado»).
   *
   * La corrida es asíncrona: la ruta encola un evento y el trabajo durable
   * cruza los movimientos después. Antes el botón prometía «las sugerencias
   * aparecerán en la cola en unos minutos» y ahí terminaba: ni el resultado,
   * ni un lugar donde mirarlo. Ahora la pantalla se queda mirando el resumen
   * y CUENTA lo que cambió — y si no cambió nada, también lo dice.
   */
  const [corrida, setCorrida] = useState<Corrida | null>(null)
  const sondeo = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => () => { if (sondeo.current) clearInterval(sondeo.current) }, [])

  const movimientos = summary?.totals.movimientos ?? null
  const conciliados = summary?.totals.conciliados ?? null
  // Sin movimientos cargados no hay nada que cruzar: el extracto va primero.
  const sinMovimientos = movimientos === 0

  // `refetchSummary` devuelve void: el dato fresco llega por estado, así que
  // el sondeo lo lee de una referencia en vez de esperar un valor de retorno.
  const ultimoResumen = useRef(summary)
  ultimoResumen.current = summary

  /** Mira el resumen unas cuantas veces y reporta el delta real. */
  const vigilarLaCorrida = useCallback(
    (antes: { conciliados: number; enCola: number }) => {
      if (sondeo.current) clearInterval(sondeo.current)
      let vueltas = 0
      sondeo.current = setInterval(() => {
        vueltas += 1
        void refetchSummary().then(() => {
          const ahora = ultimoResumen.current?.totals
          if (ahora) {
            const nuevosConciliados = ahora.conciliados - antes.conciliados
            const nuevosEnCola = ahora.en_cola - antes.enCola
            if (nuevosConciliados > 0 || nuevosEnCola > 0) {
              setCorrida({ estado: 'lista', conciliados: nuevosConciliados, enCola: nuevosEnCola })
              if (sondeo.current) clearInterval(sondeo.current)
              return
            }
          }
          if (vueltas >= 6) {
            // Seis vueltas (~30 s) sin cambios. No se declara éxito ni fracaso:
            // se dice lo que se sabe, que es que todavía no hay resultado.
            setCorrida({ estado: 'sinCambios' })
            if (sondeo.current) clearInterval(sondeo.current)
          }
        })
      }, 5000)
    },
    [refetchSummary],
  )

  // T-323: la conciliación se dispara SOLO tras confirmación humana explícita.
  async function handleConciliarAhora() {
    setConfirmOpen(false)
    const antes = {
      conciliados: summary?.totals.conciliados ?? 0,
      enCola: summary?.totals.en_cola ?? 0,
    }
    const res = await requestRun()
    if (res.ok && res.enqueued) {
      toast.success('Corrida pedida. Acá abajo te digo qué encontró.')
      setCorrida({ estado: 'corriendo' })
      vigilarLaCorrida(antes)
    } else if (res.ok && !res.enqueued) {
      // Backend respondió pero no pudo encolar (db/inngest no disponible).
      toast.error('No se pudo iniciar la conciliación en este momento. Intenta de nuevo más tarde.')
    } else if (res.reason === 'not_available') {
      toast.error('La conciliación bajo demanda aún no está disponible.')
    } else {
      toast.error('No se pudo iniciar la conciliación. Intenta de nuevo.')
    }
  }

  const feed = overview?.feed ?? []

  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="sala-agente-conciliacion">
      {/* Encabezado — sin CTA: la acción vive en la tarjeta que la explica. */}
      <header className="space-y-2">
        <h1 className="text-h2 text-fg">{t(`${PAGES_NS}.salaTitulo`)}</h1>
        <p className="text-body text-fg-muted max-w-2xl">{t(`${PAGES_NS}.salaDesc`)}</p>
      </header>

      {/* 1. La acción que desbloquea todo lo demás: subir el extracto. */}
      <section
        className="rounded-lg border border-border bg-surface p-5"
        data-testid="conciliacion-subir-extracto"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted">
              <UploadSimple
                className="h-[18px] w-[18px] text-fg-muted"
                weight="duotone"
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0 space-y-0.5">
              <h2 className="text-base font-semibold text-fg">{t(`${PAGES_NS}.accionTitle`)}</h2>
              {/* El aviso de «todavía no cargaste nada» ocupa esta línea cuando
                  aplica, en vez de flotar suelto debajo de la tarjeta. */}
              <p className="text-body-sm text-fg-muted" data-testid="conciliacion-hero-linea">
                {sinMovimientos
                  ? 'Todavía no cargaste ningún extracto, así que no hay movimientos que cruzar.'
                  : t(`${PAGES_NS}.accionDesc`)}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Button asChild hideArrow variant="secondary" data-testid="conciliacion-subir-cta">
              <Link href={SUBIR_EXTRACTO_HREF}>
                {t(`${PAGES_NS}.accionTitle`)}
                <UploadSimple className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            {/* Acción PRINCIPAL: conciliar ahora (T-323, confirmación humana).
                Sin movimientos cargados el botón no promete nada: dice por qué
                no se puede y deja el extracto como el paso que sigue. */}
            <Button
              hideArrow
              disabled={isRunning || sinMovimientos}
              onClick={() => setConfirmOpen(true)}
              data-testid="conciliacion-run-cta"
              title={
                sinMovimientos
                  ? 'Todavía no hay movimientos cargados: subí el extracto del banco primero.'
                  : undefined
              }
            >
              <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />
              {isRunning
                ? 'Conciliando…'
                : movimientos != null && conciliados != null && movimientos > conciliados
                  ? `Conciliar ${movimientos - conciliados} movimientos`
                  : 'Conciliar ahora'}
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Lo que encontró el agente — la tarjeta protagonista. */}
      <HallazgosDelAgente data={summary} colaHref={COLA_HREF} />

      {/* 3. Una sola franja de KPIs. */}
      <ConciliacionResumen data={summary} isLoading={summaryLoading} showSkeleton />

      {/* 4. Qué pasó con la última corrida. */}
      <ResultadoDeLaCorrida corrida={corrida} />

      {/* 5. Actividad reciente — lo único del overview que no se repetía.
             Sin entradas no se pinta la tarjeta: un marco vacío no dice nada. */}
      {feed.length > 0 && (
        <section
          className="rounded-lg border border-border bg-surface p-5"
          data-testid="conciliacion-actividad"
        >
          <h2 className="text-base font-semibold text-fg">
            {t(`${WORKSPACE_NS}.sala.feedTitle`)}
          </h2>
          <ul className="mt-3 divide-y divide-border">
            {feed.map((entrada) => {
              const meta = actorMeta(entrada.actorType)
              return (
                <li key={entrada.id} className="flex items-start gap-2 py-2.5 first:pt-0 last:pb-0">
                  <span
                    className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-caption ring-1 ${meta.cls}`}
                  >
                    {actorLabel(t, entrada.actorType)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-medium text-fg">{entrada.titulo}</p>
                    <p className="truncate text-caption text-fg-muted">{entrada.detalle}</p>
                  </div>
                  <span className="mt-0.5 shrink-0 text-caption tabular-nums text-fg-muted">
                    {relativeTime(entrada.occurredAt, t)}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* 6. ¿Cómo funciona? — ayuda, no dato: plegada y al final. */}
      <details
        className="group rounded-lg border border-border bg-surface"
        data-testid="conciliacion-como-funciona"
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 p-4 [&::-webkit-details-marker]:hidden">
          <CaretRight
            className="h-4 w-4 shrink-0 text-fg-muted transition-transform group-open:rotate-90"
            aria-hidden="true"
          />
          <span className="text-body-sm font-medium text-fg">
            {t(`${PAGES_NS}.comoFunciona.title`)}
          </span>
        </summary>
        <ol className="grid grid-cols-1 gap-4 border-t border-border p-4 sm:grid-cols-3">
          {COMO_FUNCIONA_STEPS.map((step, i) => {
            const StepIcon = step.icon
            return (
              <li key={step.titleKey} className="flex items-start gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-muted">
                  <StepIcon className="h-4 w-4 text-fg-muted" weight="duotone" aria-hidden="true" />
                </span>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-body-sm font-medium leading-tight text-fg">
                    <span className="tabular-nums text-fg-subtle">{i + 1}. </span>
                    {t(step.titleKey)}
                  </p>
                  <p className="text-caption leading-snug text-fg-muted">{t(step.descKey)}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </details>

      {/* Confirmación humana de "Conciliar ahora" (T-323) */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Conciliar ahora?</AlertDialogTitle>
            <AlertDialogDescription>
              Se ejecutará la conciliación sobre los movimientos recientes. Las coincidencias se
              dejarán como sugerencias para tu revisión — no se mueve ni se aplica dinero
              automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConciliarAhora}>Conciliar ahora</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function ConciliacionSalaPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <ConciliacionSala />
    </PageGuard>
  )
}
