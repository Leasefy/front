'use client'

/**
 * /panel/inmobiliaria/pagos — la portada de PAGOS: la plata de la inmobiliaria.
 *
 * ── El pedido, textual (Nico, 2026-09-16) ────────────────────────────────────
 *
 * «Este front debe cambiar primero. **No debe llamarse Pagos IA.** Y mira que
 *  hasta el CEO decía que no entiende por qué dice *generar los cobros*, si él
 *  explica otra cosa que no es generar cobros: **el cobro ya está generado**,
 *  porque en el estado de cuenta el usuario debe pagar en varias etapas, o sea
 *  cada mes el total del valor del canon por lo que vaya el contrato. Entonces
 *  **no es que le dé cobrar para poder que paguen**. Él puede pagar antes, o
 *  hasta el día máximo de cartera definido para ese contrato, y si se pasa ya
 *  pasa a cartera, o sea que no ha pagado, y ahí comienza a cobrarse por
 *  diferentes medios usando nuestros servicios de cobranza.»
 *
 * ── Las tres cosas que cambiaron ────────────────────────────────────────────
 *
 * 1. **Ya no se llama «Pagos IA».** Se llama **Pagos**, y el módulo perdió la
 *    píldora «IA» en `arquitectura-del-panel.ts`: el módulo es la plata de la
 *    inmobiliaria, no la sala de un agente. Cobranza IA conserva la suya,
 *    porque ahí sí hay un agente trabajando.
 *
 * 2. **La pantalla dejó de girar alrededor de «generar los cobros».** El
 *    bloque operativo es `DeudaDelMesPanel`: lee las CUOTAS del contrato
 *    (`GET /inmobiliaria/cartera/mes`), que existen desde la firma, y no los
 *    `Cobro`, que son el documento con el que finanzas reclama y que en la
 *    inmobiliaria migrada no existen para ninguna de sus 30.951 cuotas — por
 *    eso los cuatro indicadores viejos decían 0, $0, $0 y 0 sobre $8.446
 *    millones de deuda real. La acción principal es **registrar un pago**.
 *    «Generar los cobros» bajó a Cartera → Cobros emitidos, que es donde el
 *    CEO dijo que vive: «que la persona de finanzas decida cuándo cobrar
 *    basado en la cartera».
 *
 * 3. **La separación inquilinos / propietarios** ahora es un selector
 *    explícito arriba (ver `SeccionesDelModulo`), no dos rótulos en versalitas
 *    metidos entre las cards.
 *
 * ── Y lo que faltaba, el mismo día, más tarde ──────────────────────────────
 *
 * «Eso de inquilinos y propietarios **no se entiende realmente**, y que las
 *  tabs de abajo estén atadas a lo seleccionado arriba. Y esa tab de **generar
 *  cobros, ¿para qué?** Sigo preguntando si eso está con **estado de cuenta
 *  atado**, y ya te he explicado tantas veces que **eso va atado al estado de
 *  cuenta**.»
 *
 * Había un TERCER renglón encima del contenido —las pestañas de la Sala del
 * agente— que decía «Pagos a propietarios» con «Inquilinos» elegido arriba. Se
 * fue entero; sus nueve pestañas están repartidas o retiradas una por una en
 * la NOTA al pie de `agentWorkspaceNav.ts`. Quedan DOS renglones: la cara y,
 * debajo, sólo las pantallas de esa cara.
 *
 * Y esta pantalla pasó a ser de la cara INQUILINOS —lo dice el rótulo del
 * encabezado y el `cara: 'inquilinos'` de la arquitectura—: antes no era de
 * ninguna y aparecía como primera card también en «Propietarios», mostrando la
 * deuda de los inquilinos.
 *
 * Y el estado de cuenta tiene camino desde donde se trabaja la plata: cada fila
 * de la tabla de cuotas abre el del cliente que debe (`CuotasDelMesTabla`).
 * Hasta hoy la ÚNICA puerta era la tarjeta resumida de las fichas (contrato,
 * propietario, inquilino: `ResumenEnLaFicha`), y ninguna pantalla de Pagos
 * llevaba a él.
 *
 * ── Lo que se retiró de esta pantalla ───────────────────────────────────────
 *
 * La fila «Operaciones detalladas» (Cobros a inquilinos · Pagos a propietarios
 * · Liquidaciones) era exactamente el mismo mapa que el riel de secciones de
 * arriba, repetido a media pantalla de distancia. Con las dos caras hechas
 * explícitas, repetirlo es el ruido que hacía que la separación no se
 * entendiera.
 *
 * Lo que queda del agente —la bandeja de atención y la actividad reciente—
 * sigue siendo del agente y sigue siendo secundario: aparece sólo cuando hay
 * algo que mostrar.
 */

import Link from 'next/link'
import { CaretRight, Clock, Robot, User as UserIcon, Gear } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { SectionLabel } from '@/components/ui/section-label'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { Card, Badge } from '@/components/ui'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { PrioridadInbox } from '@/components/inmobiliaria/pagos/PrioridadInbox'
import { DeudaDelMesPanel } from '@/components/inmobiliaria/pagos/DeudaDelMesPanel'
import { useAgentOverview } from '@/lib/hooks/ai/use-agent-overview'
import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import type { OverviewFeedEntry } from '@/lib/api/agent-workspace'
import { useI18n } from '@/lib/i18n'

/** Cuántas entradas del feed caben antes de que la sección deje de ser un resumen. */
const MAX_ACTIVIDAD = 5

/** Tiempo relativo en español, autosuficiente (no depende de keys i18n). */
function tiempoRelativo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const s = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (s < 60) return `hace ${s} s`
  const m = Math.round(s / 60)
  if (m < 60) return `hace ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.round(h / 24)} d`
}

function FeedActorChip({ actorType }: { actorType: OverviewFeedEntry['actorType'] }) {
  if (actorType === 'agent') {
    return (
      <Badge variant="default" className="shrink-0">
        <Robot className="h-3 w-3" weight="duotone" aria-hidden="true" />
        Agente
      </Badge>
    )
  }
  if (actorType === 'user') {
    return (
      <Badge variant="secondary" className="shrink-0">
        <UserIcon className="h-3 w-3" weight="duotone" aria-hidden="true" />
        Tú
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="shrink-0">
      <Gear className="h-3 w-3" weight="duotone" aria-hidden="true" />
      Sistema
    </Badge>
  )
}

function PagosHome() {
  const { t } = useI18n()
  const { data, isLoading: ovLoading, errorCrudo: ovError, refetch: ovRefetch } =
    useAgentOverview('pagos')
  const {
    items,
    isLoading: wiLoading,
    errorCrudo: wiError,
    refetch: reintentarAtencion,
    runAction,
  } = useAgentWorkItems('pagos')

  const feed = data?.feed ?? []
  const feedVisible = feed.slice(0, MAX_ACTIVIDAD)
  const hayAtencion = items.length > 0

  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          {/* 🔴 La CARA, en el título. El selector de arriba dice de qué lado
              del contrato estás; si la pantalla no lo repite, al bajar la vista
              ya no se sabe. Y esta pantalla es de una sola cara: lo que deben
              los inquilinos (ver `cara: 'inquilinos'` en
              `arquitectura-del-panel.ts`). */}
          <SectionLabel>Pagos · inquilinos</SectionLabel>
          <h1 className="text-h2 text-fg">
            {t('inmobiliaria.ai.pagos_home.title')}
          </h1>
          <p className="max-w-2xl text-sm text-fg-muted line-clamp-2">
            {t('inmobiliaria.ai.pagos_home.subtitle')}
          </p>
        </div>
        {/* El tablero financiero (17-09) es la vista de arriba de TODA la plata
            —lo que entra, lo que deben, lo que sale y lo que queda—, así que se
            llega desde acá con un enlace y no con una card: esta pantalla es la
            deuda del mes de los inquilinos, y no se le puede robar el foco. */}
        <div className="flex shrink-0 items-center gap-4">
          <Link
            href="/panel/inmobiliaria/pagos/tablero"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            data-testid="ir-al-tablero-financiero"
          >
            Tablero financiero
          </Link>
          {/* El cuadre de la plata de terceros (17-09) se mira TODOS los días y
              no es la deuda de nadie: por eso va como enlace desde acá y no
              como una sección más de Pagos. */}
          <Link
            href="/panel/inmobiliaria/pagos/cuadre"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            data-testid="ir-al-cuadre"
          >
            Cuadre del día
          </Link>
        </div>
      </header>

      {/* Qué necesita tu atención — SÓLO si hay algo. Es la bandeja del agente
          (tabla `payment` del micro, dominio de cobranza por voz), así que para
          una agencia del ERP viene vacía casi siempre: reservarle media
          pantalla a un vacío estructural es regalarle el lugar más valioso de
          la vista a la nada. */}
      {wiError ? (
        <section className="space-y-3" aria-label={t('inmobiliaria.ai.pagos_home.resumen.atencion.aria')}>
          <h2 className="text-base font-semibold text-fg">
            {t('inmobiliaria.ai.pagos_home.resumen.atencion.titulo')}
          </h2>
          {/* 🔴 Antes esto era un cartel rojo fijo, sin salida (Nico,
              2026-09-04: «¿por qué dice que no puede cargar y no da opción de
              reintentar?»). `FalloDeCarga` distingue los cuatro tipos de fallo
              y sólo ofrece reintentar cuando reintentar puede cambiar algo. */}
          <FalloDeCarga
            error={wiError}
            queEs="lo que necesita tu atención"
            onReintentar={reintentarAtencion}
          />
        </section>
      ) : hayAtencion || wiLoading ? (
        <section className="space-y-3" aria-label={t('inmobiliaria.ai.pagos_home.resumen.atencion.aria')}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-fg">
              {t('inmobiliaria.ai.pagos_home.resumen.atencion.titulo')}
            </h2>
            <Link
              href="/panel/inmobiliaria/pagos/liquidaciones/por-aprobar"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('inmobiliaria.ai.pagos_home.resumen.atencion.verCola')}
              <CaretRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <PrioridadInbox items={items} onAction={runAction} isLoading={wiLoading} />
        </section>
      ) : null}

      {/* El bloque operativo: el mes, lo que se debe, lo pagado, dónde está lo
          que falta, y el recibo de caja. */}
      <DeudaDelMesPanel />

      {/* Actividad reciente — acotada a 5. */}
      <section className="space-y-3" aria-label={t('inmobiliaria.ai.pagos_home.resumen.actividad.aria')}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-fg">
            {t('inmobiliaria.ai.pagos_home.resumen.actividad.titulo')}
          </h2>
          {feed.length > MAX_ACTIVIDAD && (
            <Link
              href="/panel/inmobiliaria/pagos/liquidaciones/por-aprobar"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
              data-testid="actividad-ver-todo"
            >
              {t('inmobiliaria.ai.pagos_home.resumen.actividad.verTodo', { n: feed.length })}
              <CaretRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
        {ovError ? (
          <FalloDeCarga
            error={ovError}
            queEs={t('inmobiliaria.ai.pagos_home.resumen.actividad.queEs')}
            onReintentar={ovRefetch}
          />
        ) : ovLoading ? (
          <div className="h-24 animate-pulse rounded-lg border border-border bg-surface-muted" />
        ) : feedVisible.length === 0 ? (
          /* Vacío en una línea, no en un cartel de 200 px. */
          <p
            className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-fg-muted"
            data-testid="actividad-vacia"
          >
            <Clock className="mr-2 inline h-4 w-4 align-text-bottom" weight="duotone" aria-hidden="true" />
            {t('inmobiliaria.ai.pagos_home.resumen.actividad.vacio')}
          </p>
        ) : (
          <Card className="p-2">
            <ul className="divide-y divide-border">
              {feedVisible.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 px-3 py-3">
                  <FeedActorChip actorType={entry.actorType} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{entry.titulo}</p>
                    <p className="truncate text-xs text-fg-muted">{entry.detalle}</p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-fg-muted">
                    {tiempoRelativo(entry.occurredAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  )
}

export default function PagosPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <PagosHome />
    </PageGuard>
  )
}
