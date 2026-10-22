'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChatCircleText,
  ClipboardText,
  CreditCard,
  FolderOpen,
  Scales,
  UsersThree,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { PasosExplicados, type QuienLoHace } from '@/components/ui/pasos-explicados'
import { useCarteraOverview } from '@/lib/hooks/cobranza/use-cartera-overview'
import { useStageTransitionsRealtime } from '@/lib/hooks/cobranza/use-stage-transitions-realtime'
import type { StageTransitionEvent } from '@/lib/hooks/cobranza/use-stage-transitions-realtime'
import { CobranzaResultadosKpis } from '@/components/inmobiliaria/cobranza/CobranzaResultadosKpis'
import { CobranzaAnaliticaResumen } from '@/components/inmobiliaria/cobranza/CobranzaAnaliticaResumen'
import { CobranzaTeTocaATi } from '@/components/inmobiliaria/cobranza/CobranzaTeTocaATi'
import { CobranzaDeudoresQuePesan } from '@/components/inmobiliaria/cobranza/CobranzaDeudoresQuePesan'
import { CarteraPorEtapa } from '@/components/inmobiliaria/cobranza/CarteraPorEtapa'
import { CobranzaTransitionsFeed } from '@/components/inmobiliaria/cobranza/CobranzaTransitionsFeed'
import { CobranzaNextActionsPanel } from '@/components/inmobiliaria/cobranza/CobranzaNextActionsPanel'
import { CobranzaOverviewSkeleton } from '@/components/skeleton/panel/CobranzaOverviewSkeleton'
import { CobranzaImportCard } from '@/components/inmobiliaria/cobranza/CobranzaImportCard'
import { AvisoPlazoSinFijarEnCobranza } from '@/components/inmobiliaria/cobranza/AvisoPlazoSinFijarEnCobranza'
import { EmptyState } from '@/components/ui/empty-state'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { Button } from '@/components/ui'
import { CrossFade, Presence } from '@leasefy/cadence'
import type { CarteraStage } from '@/lib/cartera'
import { useTr } from '@/lib/i18n/use-tr'

// PermissionsContext has no tenantId field — backend derives tenant from JWT.
// Pass empty string; Supabase Realtime will silently not connect until tenant is available.
const TENANT_PLACEHOLDER = ''

const PAGES_NS = 'inmobiliaria.ai.workspace.pages.cobranza'

/**
 * «¿Cómo funciona?» — el viaje de la cobranza en 4 pasos, SIEMPRE detrás del
 * botón del encabezado (Nico, 05-10-2026: «eso no debe de estar ahí siempre
 * […] llévalas al botón que al dar clic abre drawer y explica mejor cada
 * cosa»). Antes: puesto sobre el tablero cuando no había mora, y un botón al
 * pie cuando sí.
 *
 * Verificado contra el código (05-10): la cartera entra sola cada noche desde
 * las cuotas vencidas (`mora-sync`, 2 a. m.) y subir un archivo es opcional;
 * horario y frecuencia de la Ley 2300 (`compliance/schedule.ts`,
 * `frecuencia-por-persona.ts`); voz y WhatsApp los prende Leasefy; las cartas
 * las aprueba una persona; «Te toca a ti» junta más que «los críticos».
 */
const COMO_FUNCIONA_STEPS: { icon: Icon; clave: string; quien: QuienLoHace; tuParte?: true }[] = [
  { icon: ClipboardText, clave: 'step1', quien: 'leasefy' },
  { icon: ChatCircleText, clave: 'step2', quien: 'agente' },
  { icon: CreditCard, clave: 'step3', quien: 'agente' },
  { icon: UsersThree, clave: 'step4', quien: 'tu', tuParte: true },
]

function ComoFuncionaCobranza() {
  const { t } = useI18n()
  return (
    <ParaEntenderMas
      etiqueta={t(`${PAGES_NS}.comoFunciona.title`)}
      titulo={t(`${PAGES_NS}.comoFunciona.titulo`)}
      descripcion={t(`${PAGES_NS}.comoFunciona.descripcion`)}
      variante="secundario"
    >
      <PasosExplicados
        data-testid="cobranza-como-funciona"
        pasos={COMO_FUNCIONA_STEPS.map((step) => ({
          id: step.clave,
          icono: step.icon,
          titulo: t(`${PAGES_NS}.comoFunciona.${step.clave}.title`),
          explicacion: t(`${PAGES_NS}.comoFunciona.${step.clave}.desc`),
          quien: step.quien,
          tuParte: step.tuParte ? t(`${PAGES_NS}.comoFunciona.${step.clave}.tuParte`) : undefined,
        }))}
      />
    </ParaEntenderMas>
  )
}

export default function CobranzaOverviewPage() {
  const tr = useTr();
  const { t } = useI18n()
  const router = useRouter()

  // Data hook
  const { data, isLoading, error, refetch } = useCarteraOverview()

  // Sin deudores no hay resumen que leer: la pantalla manda a Casos, que es
  // donde se sube la cartera. Con al menos uno, el resumen es la entrada
  // (Nico, 2026-09-08).
  const sinDeudores =
    Boolean(data) &&
    (data?.kpis.deudoresActivos ?? 0) === 0 &&
    (data?.stages ?? []).every((s) => s.count === 0)
  useEffect(() => {
    if (sinDeudores) router.replace('/panel/inmobiliaria/pagos/cobranza/deudores')
  }, [sinDeudores, router])

  // Local state for realtime-prepended transitions
  const [realtimeTransitions, setRealtimeTransitions] = useState<StageTransitionEvent[]>([])

  const handleNewTransition = useCallback((transition: StageTransitionEvent) => {
    setRealtimeTransitions((prev) => [transition, ...prev].slice(0, 25))
  }, [])

  // Realtime subscription. Sólo nos importa el callback: el punto verde de
  // «conectado» que vivía en el header se fue con el «Actualizado hace …»
  // (Nico, 2026-09-03) — no le decía nada a nadie.
  useStageTransitionsRealtime({
    tenantId: TENANT_PLACEHOLDER,
    onNewTransition: handleNewTransition,
  })

  // Merge realtime + endpoint transitions, dedup by id
  const transitions = useMemo(() => {
    const endpointTransitions = data?.lastTransitions ?? []
    const merged = [...realtimeTransitions, ...endpointTransitions]
    const seen = new Set<string>()
    return merged
      .filter((item) => {
        if (seen.has(item.id)) return false
        seen.add(item.id)
        return true
      })
      .slice(0, 25)
  }, [realtimeTransitions, data?.lastTransitions])

  // ── Momento wow (visión #21) — datos del overview para el banner ──────────
  // enMora = suma de counts de S1..SX (S0 = al día, queda fuera).
  const enMora = useMemo(
    () =>
      (data?.stages ?? [])
        .filter((s) => s.stage !== 'S0')
        .reduce((acc, s) => acc + s.count, 0),
    [data?.stages],
  )
  const prejuridicoCount = useMemo(
    () => data?.stages.find((s) => s.stage === 'S3')?.count ?? 0,
    [data?.stages],
  )

  // Stage click — drill into /deudores, which prefills its filters from ?stage=
  // (DeudoresListClient reads the querystring). Pushing ?stage= onto THIS page
  // was a no-op: nobody here reads the param.
  const handleStageClick = useCallback(
    (stage: CarteraStage) => {
      router.push(`/panel/inmobiliaria/pagos/cobranza/deudores?stage=${stage}`)
    },
    [router]
  )

  // GLOW UP 21-10: el encabezado común, el mismo en el fallo y en el panorama.
  // Sin acción principal a propósito: lo que te toca hacer vive en «Te toca a
  // ti», con su botón en cada fila; «¿Cómo funciona?» va donde iría la acción.
  const encabezado = (
    <EncabezadoDePantalla
      seccion={t('inmobiliaria.ai.nav.cobranza')}
      titulo={t('inmobiliaria.ai.cobranza.overview.title')}
      descripcion={t(`${PAGES_NS}.salaDesc`)}
      ayuda={<ComoFuncionaCobranza />}
      data-testid="cobranza-encabezado"
    />
  )

  // ── Skeleton + EmptyState guards (Phase 38 plan 38-04a / D-38-04) ─────────
  // Movimiento: cada salida va en un `CrossFade` con su clave (esqueleto →
  // panorama, → vacío, → fallo). Es el mismo nodo en todas las ramas, así que
  // lo que llega después de cargar entra con su fundido; lo que ya estaba al
  // montarse no se anima (la página entra con su template).
  if ((isLoading && !data) || sinDeudores) {
    return (
      <CrossFade swapKey="esqueleto">
        <CobranzaOverviewSkeleton />
      </CrossFade>
    )
  }

  if (!data && !isLoading && !error) {
    return (
      <CrossFade swapKey="vacio">
      <div className="p-6 lg:p-8 space-y-4">
        <section className="rounded-lg border border-border bg-surface">
          <EmptyState
            icon={FolderOpen}
            ilustracion="monedas"
            title={t('inmobiliaria.ai.cobranza.overview.empty.title')}
            description={t('inmobiliaria.ai.cobranza.overview.empty.description')}
          />
        </section>
        {/* Importar cartera — ahora cableada al endpoint POST /cartera/import.
            FAIL-SOFT: si el backend no está desplegado (404/red), el card
            degrada a "Próximamente — requiere despliegue" sin romper. Tras un
            import exitoso refrescamos el overview para salir del empty state. */}
        <CobranzaImportCard onImported={() => void refetch()} />
      </div>
      </CrossFade>
    )
  }

  // 🔴 CB1 (13-09): sin datos y con fallo, la pantalla seguía de largo y
  // pintaba la cartera entera en 0 —«0 en mora», etapas vacías— con un banner
  // al final y sin reintento. Un fallo no es una cartera sana: se dice arriba,
  // con reintento, y sin ningún número.
  if (error && !data) {
    return (
      <CrossFade swapKey="fallo">
      <div className="p-6 lg:p-8 space-y-6">
        {encabezado}
        <FalloDeCarga
          error={error}
          queEs="el panorama de tu cartera"
          onReintentar={() => refetch()}
        />
      </div>
      </CrossFade>
    )
  }

  // Live-region announcement string for new realtime stage transitions
  // (Phase 38 plan 38-04c / XR-06 / WCAG 4.1.3). String is i18n-translated;
  // raw event payloads (debtor PII) never reach this region.
  const transitionAnnouncement =
    realtimeTransitions.length > 0
      ? t('inmobiliaria.ai.cobranza.overview.liveRegion.newTransition', {
          count: realtimeTransitions.length,
        })
      : ''

  return (
    <CrossFade swapKey="panorama">
    <div className="p-6 lg:p-8 space-y-6">
      {/* ARIA live region — announces new stage transitions to screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {transitionAnnouncement}
      </div>

      {/* Header. Sin el «Actualizado hace ahora mismo» de la derecha: la
          página se carga al entrar y no hay botón de refrescar al que ese
          dato le sirva (Nico, 2026-09-03). */}
      {encabezado}

      {/* QA-IA-B (04-10-2026): sin días de plazo fijados, lo vencido no entra a
          la cobranza; la portada lo dice con el camino para fijarlos. */}
      <AvisoPlazoSinFijarEnCobranza />

      {/* Ya había datos y un refresco falló: lo de abajo no se borra, pero se
          dice ARRIBA que puede estar viejo, con reintento. Entra y sale con
          su animación (`Presence`): un reintento que funciona lo retira. */}
      <Presence
        show={Boolean(error && data)}
        role="alert"
        data-testid="cartera-desactualizada"
        className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-warning-soft px-4 py-2.5"
      >
          <p className="text-sm text-fg">
            {tr("No se pudo actualizar el panorama de tu cartera: lo que ves es de la última carga.")}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            {tr("Intentar de nuevo")}
          </Button>
      </Presence>

      {/* ═══ 1. TE TOCA A TI ═══════════════════════════════════════════════
          Lo único que pide que una persona haga algo. Reemplaza cuatro
          superficies que contestaban la misma pregunta: el banner narrativo,
          la fila de 4 tarjetas, la tarjeta «Revisar escalaciones» y la lista
          «Qué necesita tu atención hoy» — con el mismo número repetido cuatro
          veces y la lista, lo único accionable, al final. */}
      <CobranzaTeTocaATi enMora={enMora} gestionados={data?.kpis.llamadasHoy ?? 0} />

      {/* ═══ 2. LO QUE HIZO EL AGENTE ══════════════════════════════════════
          Resultado del trabajo automático. Es información, no acción: por eso
          va DESPUÉS de lo que te toca, y sin botones que compitan. */}
      <section className="space-y-4" aria-labelledby="cobranza-agente">
        {/* Título y botón en LA MISMA fila. El botón vivía dentro de
            CobranzaResultadosKpis en una fila propia `justify-end`: quedaba
            una franja casi vacía entre el título y las tarjetas, como si a la
            sección le faltara algo (screenshot de Nico, 2026-08-25). */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 id="cobranza-agente" className="text-lg font-semibold text-fg">
            {tr("Lo que hizo el agente")}
          </h2>
          {/* Solo el reporte diario: la analítica se fusionó en esta misma
              pantalla, así que enlazarla sería mandar a la gente a donde ya está. */}
          <Button asChild variant="secondary" size="sm" hideArrow>
            <Link href="/panel/inmobiliaria/pagos/cobranza/reporte">
              <Scales className="w-4 h-4" aria-hidden="true" />
              {tr("Ver reporte diario")}
            </Link>
          </Button>
        </div>
        <CobranzaResultadosKpis overview={data} />
        {/* Se monta solo con analítica de verdad (≥5 llamadas en 30 días). */}
        <CobranzaAnaliticaResumen />
      </section>

      {/* ═══ 3. TU CARTERA ═════════════════════════════════════════════════
          Cómo está compuesta la mora: en qué etapa está cada caso, cómo se
          mueve entre etapas, y quiénes pesan más. Las tres respondían la misma
          pregunta desde tres lugares distintos de la página. */}
      <section className="space-y-4" aria-labelledby="cobranza-cartera">
        <h2 id="cobranza-cartera" className="text-lg font-semibold text-fg">
          {tr("Tu cartera")}
        </h2>

        {/* 🔴 21-10 (Nico: «cosas que no escalan en lectura, mira todos esos números»):
            las siete tarjetas de colores —cuatro números cada una— y el embudo que
            repetía los mismos conteos pasan a UNA barra por gravedad + UNA lista con
            sólo las etapas que tienen casos. Ver `CarteraPorEtapa`. */}
        <CarteraPorEtapa
          etapas={data?.stages ?? []}
          isLoading={isLoading}
          onEtapa={handleStageClick}
        />

        {/* «Los que más pesan» estaba entre siniestros y alertas de umbral,
            como si fuera algo que atender hoy. Es composición de cartera. */}
        <CobranzaDeudoresQuePesan />
      </section>

      {/* ═══ 4. ACTIVIDAD ══════════════════════════════════════════════════ */}
      <section className="space-y-4" aria-labelledby="cobranza-actividad">
        <h2 id="cobranza-actividad" className="text-lg font-semibold text-fg">
          {tr("Actividad")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-3">
            <CobranzaTransitionsFeed transitions={transitions} isLoading={isLoading} />
          </div>
          <div className="md:col-span-2">
            <CobranzaNextActionsPanel actions={data?.nextActions ?? []} isLoading={isLoading} />
          </div>
        </div>
      </section>

    </div>
    </CrossFade>
  )
}
