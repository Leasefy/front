'use client'

/**
 * /ai/pagos/[id] — vista individual de UN pago a 3 COLUMNAS (visión punto 11).
 *
 *   IZQ    → Contexto (inquilino/propietario, contrato, inmueble, valor, concepto,
 *            fecha límite, estado, canal, método, responsable).
 *   CENTRO → Actividad / línea de tiempo del caso (<TrazaCaso>/<Timeline>).
 *   DER    → Recomendación IA (siguiente mejor acción, riesgo, motivo,
 *            automatización activa, botones).
 *
 * SOLO UX sobre la base ya funcional: lee GET /ai-hub/work-items/pagos/{id} vía
 * useWorkItemDetail; las acciones postan a los endpoints reales de AP (triple-gate
 * tier + SoD server-side) vía runWorkItemAction, y al terminar navega de vuelta a
 * la cola. NO inventa endpoints ni entidades. T-323: nunca auto-rechaza.
 *
 * El cuerpo de 3 columnas vive en <PagoCasoDetalle> (componente propio de la
 * superficie de pagos); esta page solo orquesta el data-wiring, los estados de
 * carga/error/no-disponible/no-encontrado y el encabezado con <MigaDePan>.
 *
 * Cross-link: el id del WorkItem de pagos ES el id del VendorBill (mapeo 1:1),
 * así que "Tesorería · AP" deep-linkea al detalle real de la factura en
 * /tesoreria/ap/[id]. La tabla profunda de cobros/dispersiones NO se duplica acá.
 */

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CurrencyDollar, MagnifyingGlass } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { Button, Card } from '@/components/ui'
import { useWorkItemDetail } from '@/lib/hooks/ai/use-work-item-detail'
import { runWorkItemAction } from '@/lib/api/agent-workspace'
import type { WorkItemAction } from '@/lib/api/work-item'
import { MigaDePan } from '@/components/inmobiliaria/ai/MigaDePan'
import { PagoCasoDetalle } from '@/components/inmobiliaria/pagos/PagoCasoDetalle'
import { useI18n } from '@/lib/i18n'

const SALA_HREF = '/panel/inmobiliaria/ai/pagos'
const COLA_HREF = '/panel/inmobiliaria/ai/pagos/cola'
const TESORERIA_HREF = '/panel/inmobiliaria/tesoreria'

function PagosCaso() {
  const router = useRouter()
  const { t } = useI18n()
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''

  const { data, isLoading, error, notAvailable } = useWorkItemDetail('pagos', id)

  async function handleAction(action: WorkItemAction, body?: Record<string, unknown>) {
    const res = await runWorkItemAction(action, body)
    if (res.ok) {
      // Navega primero — refetchear acá 404-parpadea una vez que el caso deja la
      // cola; la cola se auto-refresca al montar.
      router.push(COLA_HREF)
    }
    return res
  }

  // ── Encabezado común (miga + título + descripción) ─────────────────────────
  const header = (
    <header className="space-y-2">
      <MigaDePan
        backHref={COLA_HREF}
        icon={CurrencyDollar}
        crumbs={[
          { label: t('inmobiliaria.nav.secAgentes'), href: '/panel/inmobiliaria/ai' },
          { label: t('inmobiliaria.ai.workspace.agente.pagos'), href: SALA_HREF },
          { label: 'Caso' },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight text-fg">
        {data ? data.item.titulo : 'Detalle del pago'}
      </h1>
      <p className="max-w-2xl text-sm text-fg-muted">
        Contexto, actividad y la recomendación de la IA para este pago. Las acciones se aprueban
        con control humano.
      </p>
    </header>
  )

  // ── Carga ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6 lg:p-8" data-testid="pago-caso-loading">
        {header}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4 h-72 animate-pulse rounded-xl border border-border bg-surface-muted" />
          <div className="lg:col-span-4 h-72 animate-pulse rounded-xl border border-border bg-surface-muted" />
          <div className="lg:col-span-4 h-72 animate-pulse rounded-xl border border-border bg-surface-muted" />
        </div>
      </div>
    )
  }

  // ── Error de carga ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        {header}
        <Card data-testid="pago-caso-error">
          <div className="space-y-3 p-6">
            <p className="text-sm font-medium text-danger">No pudimos cargar este caso.</p>
            <p className="text-sm text-fg-muted">{error}</p>
            <Button variant="outline" hideArrow onClick={() => router.refresh()}>
              Reintentar
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // ── Detalle no disponible (404 — el agente aún no publica el resolver) ──────
  // Distinto de "Caso no encontrado": el caso puede existir, pero este agente
  // todavía no expone un endpoint de detalle. Salida real a Tesorería.
  if (notAvailable) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        {header}
        <Card>
          <div
            role="status"
            aria-label="El detalle aún no está disponible aquí"
            className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center"
            data-testid="pago-caso-no-disponible"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted">
              <CurrencyDollar
                weight="duotone"
                className="h-6 w-6 text-fg-muted"
                aria-hidden="true"
              />
            </span>
            <div className="space-y-1.5">
              <p className="text-base font-semibold text-fg">
                El detalle aún no está disponible aquí
              </p>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-fg-muted">
                Puedes gestionar este pago desde la cola o abrirlo en Tesorería, su módulo de origen.
              </p>
            </div>
            <Button asChild variant="secondary" hideArrow className="mt-1">
              <Link href={TESORERIA_HREF}>Abrir en Tesorería</Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // ── Caso no encontrado (el item no existe) ─────────────────────────────────
  if (!data) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        {header}
        <Card>
          <div
            role="status"
            aria-label="Caso no encontrado"
            className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center"
            data-testid="pago-caso-not-found"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted">
              <MagnifyingGlass
                weight="duotone"
                className="h-6 w-6 text-fg-muted"
                aria-hidden="true"
              />
            </span>
            <div className="space-y-1.5">
              <p className="text-base font-semibold text-fg">Caso no encontrado</p>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-fg-muted">
                Este pago ya no está en la cola o el enlace no es válido. Vuelve a la cola para ver
                los casos pendientes.
              </p>
            </div>
            <Button asChild variant="secondary" hideArrow className="mt-1">
              <Link href={COLA_HREF}>Volver a la cola</Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // ── Detalle (3 columnas) ────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6 lg:p-8" data-testid={`pago-caso-page-${id}`}>
      {header}
      <PagoCasoDetalle
        data={data}
        onAction={handleAction}
        crossLink={{
          pregunta: '¿Necesitas la factura completa?',
          destino: 'Tesorería · Cuentas por pagar',
          href: `/panel/inmobiliaria/tesoreria/ap/${id}`,
        }}
      />
    </div>
  )
}

export default function PagosCasoPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <PagosCaso />
    </PageGuard>
  )
}
