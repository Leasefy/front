'use client'

/**
 * /ai/pagos — HOME "Pagos IA", pestaña «Resumen».
 *
 * ── Qué cambió y por qué (2026-09-02) ────────────────────────────────────────
 * Nico: «no tiene la tabla que usamos, eso de "generar cobros del mes" no se
 * entiende, y la actividad reciente es enorme».
 *
 * 1. LOS 8 KPIs EN «—». No era falta de datos: `useAgentOverview('pagos')`
 *    responde **200 con datos**, pero el microservicio emite otros tres
 *    indicadores (`collected_30d_cop`, `approval_rate_30d`,
 *    `pending_verification`) que no se cruzan con NINGUNO de los 8 ids que esta
 *    pantalla buscaba. Cero intersección ⇒ los 8 caían al `'—'` por defecto, y
 *    como la respuesta fue exitosa `error` quedaba en `null`: un «—» silencioso
 *    que en realidad significaba «pregunté otra cosa».
 *    Y encima era otro dominio: esos KPIs salen de la tabla `payment` del micro,
 *    que sólo escriben los flujos de cobranza por VOZ — no los cobros del ERP.
 *    ⇒ Los 8 slots muertos se retiran. Los indicadores ahora se derivan de los
 *      cobros REALES del mes (back-erp, desplegado), en `CobrosDelMesPanel`.
 *
 * 2. «GENERAR COBROS DEL MES» no se entendía y además no generaba nada: llevaba
 *    a `/ai/pagos/generar`, cuyo modo masivo es una vista previa ILUSTRATIVA con
 *    el CTA en «Próximamente». El endpoint real (`POST /inmobiliaria/cobros/
 *    generate`) existía, estaba desplegado y no lo llamaba nadie.
 *    ⇒ Ahora es «Generar los cobros de {mes}», vive al lado del selector de mes
 *      (para que su alcance se vea) y pasa por una confirmación que dice el mes
 *      y cuántos cobros de ese mes YA existen. Ver `GenerarCobrosDialog`.
 *
 * 3. LA TABLA QUE FALTABA. Se reusa `CobroTable` —la tabla de la casa— con
 *    `useTablePagination` + `TablePagination`, y `SinDatos` para el vacío.
 *
 * 4. ACTIVIDAD RECIENTE. Era una sección a página completa; queda acotada a las
 *    últimas 5 con «ver todo».
 *
 * 5. «DOS MUNDOS» + «CÓMO FUNCIONA» + «OPERACIONES DETALLADAS» eran tres
 *    secciones de texto explicativo (dos con viñetas largas) que ocupaban más
 *    que la operación. Se funden en UNA fila compacta de accesos. La pantalla es
 *    para operar, no para leer.
 *
 * Tokens del DS en todo (CERO hex). Un solo CTA primary por vista.
 */

import Link from 'next/link'
import {
  Receipt,
  Wallet,
  CaretRight,
  Clock,
  Robot,
  User as UserIcon,
  Gear,
  PaperPlaneTilt,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { Button, Card, Badge } from '@/components/ui'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { PrioridadInbox } from '@/components/inmobiliaria/pagos/PrioridadInbox'
import { CobrosDelMesPanel } from '@/components/inmobiliaria/pagos/CobrosDelMesPanel'
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

// ── Accesos (reemplazan «Dos mundos» + «Cómo funciona» + «Operaciones») ──────

const ACCESOS: { claveLabel: string; claveDetalle: string; href: string; icon: Icon }[] = [
  {
    claveLabel: 'inmobiliaria.ai.pagos_home.resumen.accesos.cobros',
    claveDetalle: 'inmobiliaria.ai.pagos_home.resumen.accesos.cobrosDetalle',
    href: '/panel/inmobiliaria/cobros',
    icon: Receipt,
  },
  {
    claveLabel: 'inmobiliaria.ai.pagos_home.resumen.accesos.propietarios',
    claveDetalle: 'inmobiliaria.ai.pagos_home.resumen.accesos.propietariosDetalle',
    href: '/panel/inmobiliaria/dispersiones',
    icon: Wallet,
  },
  {
    claveLabel: 'inmobiliaria.ai.pagos_home.resumen.accesos.tesoreria',
    claveDetalle: 'inmobiliaria.ai.pagos_home.resumen.accesos.tesoreriaDetalle',
    href: '/panel/inmobiliaria/tesoreria',
    icon: PaperPlaneTilt,
  },
]

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
  const { items, isLoading: wiLoading, error: wiError, runAction } = useAgentWorkItems('pagos')

  const feed = data?.feed ?? []
  const feedVisible = feed.slice(0, MAX_ACTIVIDAD)
  const hayAtencion = items.length > 0

  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {t('inmobiliaria.ai.pagos_home.title')}
          </h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            {t('inmobiliaria.ai.pagos_home.subtitle')}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* El CTA primary de la vista es «Generar los cobros de {mes}», y vive
              en el panel de abajo, pegado al selector de mes: es la única forma
              de que su alcance se lea sin abrir nada. Acá queda la acción
              secundaria. */}
          <Button asChild variant="secondary" hideArrow>
            <Link href="/panel/inmobiliaria/tesoreria/facturas/nueva">
              <Receipt className="h-4 w-4" />
              {t('inmobiliaria.ai.pagos_home.resumen.nuevaFactura')}
            </Link>
          </Button>
        </div>
      </header>

      {/* Qué necesita tu atención — SÓLO si hay algo.
          Antes ocupaba media pantalla con un «Todo al día» gigante. Esa bandeja
          se alimenta de los work-items del micro (tabla `payment`, dominio de
          cobranza por voz), así que para una agencia del ERP viene vacía casi
          siempre: reservarle media pantalla a un vacío estructural es regalarle
          el lugar más valioso de la vista a la nada. */}
      {wiError ? (
        <section className="space-y-3" aria-label={t('inmobiliaria.ai.pagos_home.resumen.atencion.aria')}>
          <h2 className="text-base font-semibold text-fg">
            {t('inmobiliaria.ai.pagos_home.resumen.atencion.titulo')}
          </h2>
          <div className="rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
            {t('inmobiliaria.ai.pagos_home.resumen.atencion.fallo')}
          </div>
        </section>
      ) : hayAtencion || wiLoading ? (
        <section className="space-y-3" aria-label={t('inmobiliaria.ai.pagos_home.resumen.atencion.aria')}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-fg">
              {t('inmobiliaria.ai.pagos_home.resumen.atencion.titulo')}
            </h2>
            <Link
              href="/panel/inmobiliaria/ai/pagos/cola"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('inmobiliaria.ai.pagos_home.resumen.atencion.verCola')}
              <CaretRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <PrioridadInbox items={items} onAction={runAction} isLoading={wiLoading} />
        </section>
      ) : null}

      {/* El bloque operativo: mes + indicadores reales + acción masiva + tabla. */}
      <CobrosDelMesPanel />

      {/* Accesos — una fila, no tres secciones de texto. */}
      <section className="space-y-3" aria-label={t('inmobiliaria.ai.pagos_home.resumen.accesos.aria')}>
        <h2 className="text-base font-semibold text-fg">
          {t('inmobiliaria.ai.pagos_home.resumen.accesos.titulo')}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {ACCESOS.map((op) => {
            const OpIcon = op.icon
            return (
              <Link
                key={op.href}
                href={op.href}
                className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition hover:bg-surface-muted/50"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-fg-muted transition group-hover:text-fg">
                  <OpIcon className="h-5 w-5" weight="duotone" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-fg">{t(op.claveLabel)}</span>
                  <span className="block truncate text-xs text-fg-muted">{t(op.claveDetalle)}</span>
                </span>
                <CaretRight
                  className="h-3.5 w-3.5 shrink-0 text-fg-muted transition group-hover:translate-x-0.5 group-hover:text-fg"
                  aria-hidden="true"
                />
              </Link>
            )
          })}
        </div>
      </section>

      {/* Actividad reciente — acotada a 5. */}
      <section className="space-y-3" aria-label={t('inmobiliaria.ai.pagos_home.resumen.actividad.aria')}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-fg">
            {t('inmobiliaria.ai.pagos_home.resumen.actividad.titulo')}
          </h2>
          {feed.length > MAX_ACTIVIDAD && (
            <Link
              href="/panel/inmobiliaria/ai/pagos/cola"
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
