'use client'

/**
 * /ai/cobranza/promesas — "Promesas de pago" (visión #9).
 *
 * Lista las promesas de pago con su {inquilino, valor, fecha prometida, estado,
 * acción sugerida}. Cada promesa es una <PromesaCard> expandible que muestra
 * fecha / valor / quién la hizo / canal / mensaje original / estado /
 * seguimiento / resultado.
 *
 * FUENTE: GET /api/agency/:id/cobranza/promises (usePromises) — el HISTÓRICO
 * agency-wide de promesas de pago del tenant (no solo las de hoy), con PII
 * enmascarada y un `derivedStatus` de presentación ya calculado por el backend
 * a partir de (status persistido + dueDate). Antes esta vista dependía solo de
 * `payment_promises_today` del daily-report (promesas de HOY); ahora muestra el
 * histórico completo. Si el endpoint aún no está desplegado / responde vacío →
 * <EmptyState> honesto + cross-link a deudores (fail-soft, nunca rompe).
 *
 * T-323: vista informativa. Las acciones por fila (Esperar / Recontactar /
 * Hacer seguimiento / Recordar) NO tienen endpoint propio → placeholder honesto
 * "Próximamente" deshabilitado. El seguimiento/recontacto real se hace desde el
 * detalle del deudor. Nunca se auto-rechaza, escala ni presiona.
 *
 * Estilo: contrato DS 2026-06-16 — PageGuard module="cobranza",
 * SegmentedControl para el filtro por estado, tonos por token.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Handshake,
  Warning,
} from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Button, Spinner } from '@/components/ui'
import { SegmentedControl } from '@leasefy/cadence'
import { usePromises } from '@/lib/hooks/cobranza/use-promises'
import { ManualWAModal } from '@/components/inmobiliaria/cobranza/intervention/ManualWAModal'
import {
  PromesaCard,
  PROMESA_ESTADO_TOKEN,
  type Promesa,
  type PromesaEstado,
} from '@/components/inmobiliaria/cobranza/PromesaCard'

const BASE = '/panel/inmobiliaria/ai/cobranza'
const DEUDORES_HREF = `${BASE}/deudores`

// ── Filtro por estado (SegmentedControl) ─────────────────────────────────────

type EstadoFiltro = 'todas' | PromesaEstado

const FILTRO_OPCIONES: { value: EstadoFiltro; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'activa', label: 'Activas' },
  { value: 'por_vencer', label: 'Por vencer' },
  { value: 'incumplida', label: 'Incumplidas' },
  { value: 'parcial', label: 'Parciales' },
  { value: 'cumplida', label: 'Cumplidas' },
]

// ── Acción sugerida por estado ───────────────────────────────────────────────

const ACCION_POR_ESTADO: Record<PromesaEstado, string> = {
  activa: 'Esperar',
  por_vencer: 'Recordar',
  incumplida: 'Hacer seguimiento',
  parcial: 'Recontactar',
  cumplida: 'Esperar',
}

/**
 * Estados donde la acción sugerida significa CONTACTAR al inquilino. Se
 * resuelven con el envío manual de WhatsApp (plantilla aprobada), el mismo
 * camino de la ficha del deudor.
 *
 * «Esperar» no lleva botón: no hay nada que hacer, y un botón que dice
 * «Esperar» invita a hacer clic para nada.
 */
const ESTADOS_QUE_CONTACTAN: PromesaEstado[] = ['por_vencer', 'incumplida', 'parcial']

// ── Contenido ────────────────────────────────────────────────────────────────

function PromesasContent() {
  // Histórico agency-wide (no solo hoy). El backend ya devuelve `derivedStatus`
  // y la PII enmascarada; pedimos sin filtro de estado para filtrar client-side
  // por estado derivado (el SegmentedControl). limit alto = una sola página.
  const { promises, isLoading, error, refetch } = usePromises({ limit: 200 })

  useAutoRefresh(refetch)

  const [filtro, setFiltro] = useState<EstadoFiltro>('todas')

  /** Deudor al que se le va a enviar la plantilla de seguimiento. */
  const [contactarA, setContactarA] = useState<string | null>(null)

  // Mapea el histórico de promesas → modelo de UI. El estado ya viene derivado
  // del backend (derivedStatus). El canal/condiciones se exponen cuando existen.
  const promesas = useMemo<Promesa[]>(() => {
    return promises.map((p) => ({
      key: `${p.id}`,
      debtorId: p.debtorId,
      inquilino: p.debtorName || '—',
      valorCop: p.amount,
      fechaPrometida: p.dueDate,
      registradaEn: p.createdAt,
      estado: p.derivedStatus,
      quienLaHizo: p.debtorName || '—',
      canal: p.channel,
      mensajeOriginal: p.conditions,
      seguimiento: null,
      resultado: null,
    }))
  }, [promises])

  const incumplidas = useMemo(
    () => promesas.filter((p) => p.estado === 'incumplida'),
    [promesas],
  )

  const visibles = useMemo(
    () => (filtro === 'todas' ? promesas : promesas.filter((p) => p.estado === filtro)),
    [promesas, filtro],
  )

  // ── Header (compartido) ────────────────────────────────────────────────────
  const header = (
    <header className="flex items-start justify-between gap-4 flex-wrap">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Promesas de pago
        </h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          Las promesas de pago que los inquilinos hicieron al agente, con su estado y
          la acción sugerida. El seguimiento real se hace desde el detalle del deudor.
        </p>
      </div>
    </header>
  )

  // ── Primer load ────────────────────────────────────────────────────────────
  if (isLoading && promesas.length === 0 && !error) {
    return (
      <main className="p-6 lg:p-8 space-y-6">
        {header}
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      </main>
    )
  }

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {header}

      {/* Error de carga */}
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-danger-soft border border-danger/30 p-3 text-sm text-danger flex items-center gap-2"
        >
          <Warning className="w-4 h-4 shrink-0" weight="fill" aria-hidden="true" />
          <span>No se pudo cargar las promesas. {error}</span>
        </div>
      )}

      {/* Banner del agente cuando hay incumplidas */}
      {incumplidas.length > 0 && (
        <section
          role="status"
          className="rounded-lg border border-danger/30 bg-danger-soft p-4 flex items-start gap-3"
          data-testid="promesas-banner-incumplidas"
        >
          <Warning
            className="w-5 h-5 shrink-0 text-danger mt-0.5"
            weight="duotone"
            aria-hidden="true"
          />
          <div className="space-y-2 min-w-0">
            <p className="text-sm text-fg leading-relaxed">
              {incumplidas.length === 1 ? (
                <>
                  La promesa de{' '}
                  <span className="font-semibold">{incumplidas[0].inquilino}</span> venció
                  y no se encontró pago conciliado. Recomiendo seguimiento formal o
                  proponer un acuerdo.
                </>
              ) : (
                <>
                  <span className="font-semibold">{incumplidas.length} promesas</span>{' '}
                  vencieron y no se encontró pago conciliado. Recomiendo seguimiento
                  formal o proponer un acuerdo de pago.
                </>
              )}
            </p>
            <Button asChild variant="link" size="sm" hideArrow>
              <Link href={DEUDORES_HREF}>Ver deudores</Link>
            </Button>
          </div>
        </section>
      )}

      {/* Sin promesas → EmptyState honesto + cross-link */}
      {promesas.length === 0 && !error ? (
        <EmptyState
          icon={Handshake}
          title="No hay promesas de pago registradas"
          description="Cuando un inquilino prometa pagar, aparecerá aquí con su estado y seguimiento. El histórico completo de promesas por deudor también está en su detalle."
          primaryCta={{ label: 'Ir a deudores', href: DEUDORES_HREF }}
        />
      ) : (
        promesas.length > 0 && (
          <>
            {/* Filtro por estado — selector excluyente (SegmentedControl) */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <SegmentedControl<EstadoFiltro>
                options={FILTRO_OPCIONES}
                value={filtro}
                onChange={setFiltro}
                aria-label="Filtrar promesas por estado"
              />
              <span className="text-xs text-fg-muted tabular-nums">
                {visibles.length} de {promesas.length}
              </span>
            </div>

            {/* Tabla / lista de promesas */}
            {visibles.length > 0 ? (
              <div className="space-y-3 max-w-3xl">
                {/* Encabezado tipo tabla (solo desktop, contexto de columnas) */}
                <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 text-xs font-medium uppercase tracking-wide text-fg-muted">
                  <span>Inquilino</span>
                  <span className="text-right">Valor</span>
                  <span className="text-right">Fecha prometida</span>
                  <span className="text-right">Estado</span>
                </div>

                <ul className="space-y-3" aria-label="Promesas de pago">
                  {visibles.map((p) => (
                    <li key={p.key} className="space-y-2">
                      <PromesaCard promesa={p} />
                      {/* Acción sugerida por estado — placeholder honesto T-323 */}
                      <div className="flex items-center justify-between gap-3 px-4">
                        <span className="text-xs text-fg-muted">
                          Acción sugerida:{' '}
                          <span className={PROMESA_ESTADO_TOKEN[p.estado].text}>
                            {ACCION_POR_ESTADO[p.estado]}
                          </span>
                        </span>
                        {ESTADOS_QUE_CONTACTAN.includes(p.estado) && p.debtorId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            hideArrow
                            onClick={() => setContactarA(p.debtorId)}
                            title="Enviar una plantilla aprobada por WhatsApp"
                          >
                            {ACCION_POR_ESTADO[p.estado]}
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyState
                icon={Handshake}
                title="Sin promesas en este estado"
                description="Ajusta el filtro para ver otras promesas, o revisa el detalle de cada deudor."
              />
            )}

            {/* Nota honesta de alcance de la fuente */}
            <p className="text-xs text-fg-muted max-w-2xl leading-relaxed">
              Esta vista muestra el histórico de promesas de pago de toda la
              inmobiliaria. El detalle de cada promesa (mensaje original, canal y
              seguimiento) vive en el{' '}
              <Link
                href={DEUDORES_HREF}
                className="text-primary underline-offset-4 hover:underline font-medium"
              >
                detalle de cada deudor
              </Link>
              .
            </p>
          </>
        )
      )}

      {contactarA && (
        <ManualWAModal
          open
          onClose={() => setContactarA(null)}
          debtorId={contactarA}
          debtorName=""
          prefill={{}}
          onSuccess={() => {
            setContactarA(null)
            void refetch()
          }}
        />
      )}
    </main>
  )
}

export default function PromesasPage() {
  return (
    <PageGuard module="cobranza">
      <PromesasContent />
    </PageGuard>
  )
}
