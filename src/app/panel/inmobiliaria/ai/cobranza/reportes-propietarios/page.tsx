'use client'

/**
 * /ai/cobranza/reportes-propietarios — "Reportes a propietarios" (visión #14).
 *
 * OJO: distinto del /reporte (diario/mensual de cartera). Esto es el reporte de
 * GESTIÓN DE COBRANZA por propietario: un resumen redactado del estado de mora,
 * gestiones realizadas, promesas y recomendación, listo para enviar al dueño del
 * inmueble.
 *
 * CABLEADO (2026-06-17): se conecta a los endpoints nuevos del agente vía
 * useOwnerReports (GET list/detail, POST generate, POST approve, GET pdf):
 *   - La lista se llena con reportes REALES cuando el backend responde.
 *   - "Generar" = POST generate → crea un borrador desde data real de cartera.
 *   - "Aprobar / Enviar" = POST approve (markAsSent) con CONFIRMACIÓN HUMANA.
 *   - "Descargar PDF" = GET pdf; el backend responde 501 hasta que la plantilla
 *     exista → mostramos un estado honesto.
 *
 * FAIL-SOFT: si el endpoint responde 404/empty/error la lista degrada a [] y la
 *   pantalla muestra SÓLO el estado vacío — nunca un reporte de ejemplo, que se
 *   lee como cartera propia. NUNCA rompe.
 *
 * T-323: el reporte SIEMPRE requiere aprobación humana explícita antes de enviarse
 * al propietario; nunca se auto-envía ni se auto-escala. "Aprobar / Enviar" sólo
 * se dispara con un click real del operador.
 *
 * Estilo: contrato UI-DS-CONTRACT-2026-06-16 — DS desde el inicio, cero hex inline,
 * un solo primary CTA por vista, tokens semánticos.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Buildings,
  CheckCircle,
  DownloadSimple,
  FileText,
  PaperPlaneTilt,
  ShieldCheck,
  UsersThree,
} from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Button, Card, CardContent, Spinner } from '@/components/ui'
import { SegmentedControl, Eyebrow } from '@leasefy/cadence'
import {
  DebtorPicker,
  type PickedDebtor,
} from '@/components/inmobiliaria/cobranza/DebtorPicker'
import {
  useOwnerReports,
  type OwnerReport,
  type OwnerReportStatus,
} from '@/lib/hooks/cobranza/use-owner-reports'

const BASE = '/panel/inmobiliaria/ai/cobranza'
const PROPIETARIOS_HREF = '/panel/inmobiliaria/propietarios'

// ── Estado del reporte (vocabulario propio de esta superficie de preview) ─────

type ReporteEstado = 'borrador' | 'pendiente' | 'enviado'

const ESTADO_TOKEN: Record<
  ReporteEstado,
  { label: string; bg: string; text: string; ring: string }
> = {
  borrador: {
    label: 'Borrador',
    bg: 'bg-surface-muted',
    text: 'text-fg-muted',
    ring: 'ring-border',
  },
  pendiente: {
    label: 'Pendiente aprobación',
    bg: 'bg-warning-soft',
    text: 'text-warning',
    ring: 'ring-warning',
  },
  enviado: {
    label: 'Enviado',
    bg: 'bg-success-soft',
    text: 'text-success',
    ring: 'ring-success',
  },
}

function EstadoBadge({ estado }: { estado: ReporteEstado }) {
  const token = ESTADO_TOKEN[estado]
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ring-1 shrink-0 ${token.bg} ${token.text} ${token.ring}`}
    >
      {token.label}
    </span>
  )
}

// Mapa estado backend (draft|pending_approval|sent) → vocabulario de esta vista.
const BACKEND_ESTADO: Record<OwnerReportStatus, ReporteEstado> = {
  draft: 'borrador',
  pending_approval: 'pendiente',
  sent: 'enviado',
}

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

// ── Shape que consumen las filas y la vista del reporte ─────────────────────
// Todo sale del backend: no hay fuente de ejemplo.

interface ReportePreview {
  id: string
  propietario: string
  inmueble: string
  diasMora: number
  valor: string
  estado: ReporteEstado
  /** Narrativa redactada por el backend (cuando el reporte es REAL). */
  narrativa?: string
  /** Reporte crudo del backend (presente solo en reportes reales). */
  raw?: OwnerReport
}

// Adapta un reporte real del backend al shape que consumen las filas/preview.
function adaptOwnerReport(r: OwnerReport): ReportePreview {
  return {
    id: r.id,
    propietario: r.ownerName?.trim() || 'Propietario sin nombre',
    inmueble: r.propertyId?.trim() || 'Inmueble',
    diasMora: r.daysInMora ?? 0,
    valor: r.overdueAmount != null ? COP.format(r.overdueAmount) : '—',
    estado: BACKEND_ESTADO[r.status] ?? 'borrador',
    narrativa: r.narrative,
    raw: r,
  }
}

// Acá vivían tres botones deshabilitados —«Editar antes de enviar», «Guardar en
// expediente», «Programar reporte semanal»— con la etiqueta «Próximamente», en
// CADA fila. Ninguno tiene endpoint (la superficie de owner-reports es list,
// generate, detalle, approve y pdf: nada más). Tres botones apagados no son una
// función pendiente, son ruido que promete algo que no existe. Se quitaron; si
// alguno se construye, se agrega el botón junto con su endpoint.

// ── Fila de la lista de reportes preparados ───────────────────────────────────

function ReporteRow({
  reporte,
  selected,
  onSelect,
}: {
  reporte: ReportePreview
  selected: boolean
  onSelect: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={[
          'w-full text-left rounded-xl border bg-card p-4 transition-colors',
          'hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          selected ? 'border-primary ring-1 ring-primary/30' : 'border-border',
        ].join(' ')}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 min-w-0">
              <Buildings
                className="w-4 h-4 shrink-0 text-fg-muted"
                weight="duotone"
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-fg truncate">
                {reporte.inmueble}
              </span>
            </div>
            <p className="text-xs text-fg-muted truncate">
              Propietario: {reporte.propietario}
            </p>
          </div>
          <EstadoBadge estado={reporte.estado} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted tabular-nums">
          <span>
            <span className="font-medium text-fg">{reporte.diasMora}</span> días de mora
          </span>
          <span>
            Valor: <span className="font-medium text-fg">{reporte.valor}</span>
          </span>
        </div>
      </button>
    </li>
  )
}

// ── Vista del reporte (texto redactado) ───────────────────────────────────────
//
// La narrativa la escribe el backend. Cuando falta, se DICE que falta.
//
// Acá vivía un cuerpo de muestra que se pintaba en su lugar: «se realizaron 4
// gestiones de cobro (2 llamadas y 2 mensajes de WhatsApp). El inquilino
// prometió pagar el 12 de junio». Ninguno de esos hechos salía de ningún lado
// —ni las cuatro gestiones, ni el 12 de junio— y como el aviso de «vista previa»
// dependía de `!reporte.raw`, en un reporte REAL sin narrativa el texto
// inventado salía SIN aviso. Es un documento que se le manda al dueño del
// inmueble: no puede tener hechos que nadie midió.

// ── Generar un reporte nuevo ─────────────────────────────────────────────────
//
// El endpoint pide un `debtorId`, así que el punto de entrada es elegir al
// deudor. Vive en el encabezado —no dentro de un reporte— porque generar el
// PRIMERO es justamente lo que no se podía hacer.

function NuevoReporte({
  isGenerating,
  onGenerar,
}: {
  isGenerating: boolean
  onGenerar: (debtorId: string) => void
}) {
  const [deudor, setDeudor] = useState<PickedDebtor | null>(null)

  return (
    <div className="w-full max-w-sm space-y-2">
      <label
        htmlFor="reporte-deudor"
        className="block text-xs font-medium text-fg-muted"
      >
        Generar reporte de
      </label>
      <DebtorPicker inputId="reporte-deudor" value={deudor} onChange={setDeudor} />
      <Button
        size="sm"
        hideArrow
        disabled={!deudor || isGenerating}
        onClick={() => deudor && onGenerar(deudor.id)}
        title={
          deudor
            ? 'Generar el borrador con la cartera del deudor'
            : 'Elegí un deudor primero'
        }
      >
        {isGenerating ? <Spinner size="sm" variant="current" /> : null}
        Generar reporte
      </Button>
    </div>
  )
}

function ReportePreviewCard({ reporte }: { reporte: ReportePreview }) {
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        {/* Encabezado del documento */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <Eyebrow>Reporte de gestión</Eyebrow>
            <h2 className="text-base font-semibold text-fg">
              Estado de cobranza — {reporte.inmueble}
            </h2>
            <p className="text-xs text-fg-muted truncate">
              Para: {reporte.propietario}
            </p>
          </div>
          <EstadoBadge estado={reporte.estado} />
        </div>

        {/* Cuerpo redactado del reporte */}
        <div className="space-y-3 text-sm text-fg leading-relaxed border-t border-border pt-4">
          {reporte.narrativa ? (
            <p>{reporte.narrativa}</p>
          ) : (
            <>
              {/* Los únicos hechos que sí vienen del reporte. */}
              <p>
                El inquilino del <span className="font-medium">{reporte.inmueble}</span> presenta{' '}
                <span className="font-medium">{reporte.diasMora} días de mora</span> por un valor de{' '}
                <span className="font-medium">{reporte.valor}</span>.
              </p>
              <p className="text-fg-muted">
                Todavía no hay una narrativa redactada para este reporte. Volvé a
                generarlo para que el agente componga el resumen de gestiones y la
                recomendación con la información de cartera del deudor.
              </p>
            </>
          )}
        </div>

        {/* Nota de aprobación humana (T-323) */}
        <div className="flex items-start gap-2 rounded-lg bg-primary-soft p-3 text-xs text-fg">
          <ShieldCheck className="w-4 h-4 shrink-0 text-primary mt-0.5" weight="duotone" aria-hidden="true" />
          <p>
            Este reporte requiere tu revisión y aprobación antes de enviarse al propietario. Ningún
            reporte se envía de forma automática.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────

// Mapa filtro de la vista → estado backend (para refetch real).
const FILTER_TO_STATUS: Record<string, OwnerReportStatus | undefined> = {
  todos: undefined,
  borrador: 'draft',
  pendiente: 'pending_approval',
  enviado: 'sent',
}

function ReportesPropietariosContent() {
  const {
    reports,
    isLoading,
    refetch,
    generate,
    isGenerating,
    generateError,
    approve,
    isApproving,
    approveError,
    downloadPdf,
    isDownloading,
  } = useOwnerReports()

  // Reportes reales adaptados al shape de la vista.
  const realReportes = useMemo<ReportePreview[]>(
    () => reports.map(adaptOwnerReport),
    [reports],
  )


  // La única fuente es el backend. Antes había tres reportes de ejemplo
  // quemados como fallback: se veían como cartera propia (nombre del
  // propietario, mora, monto, estado de aprobación) y no lo eran.
  const hayReales = realReportes.length > 0
  const fuente = realReportes

  const estadoOptions = [
    { value: 'todos', label: 'Todos' },
    { value: 'borrador', label: 'Borradores' },
    { value: 'pendiente', label: 'Por aprobar' },
    { value: 'enviado', label: 'Enviados' },
  ]
  const [estadoFilter, setEstadoFilter] = useState<string>('todos')

  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Estado honesto del PDF (501 → "Próximamente").
  const [pdfMsg, setPdfMsg] = useState<string | null>(null)
  // Feedback de aprobación / generación (T-323).
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const visibles =
    estadoFilter === 'todos'
      ? fuente
      : fuente.filter((r) => r.estado === estadoFilter)

  /**
   * Selección segura: si el id elegido ya no está en la fuente, caemos al
   * primero disponible.
   *
   * OJO con el tipo: `visibles[0]` se tipa como `ReportePreview` aunque el
   * array esté vacío (no hay `noUncheckedIndexedAccess`), así que TypeScript
   * cree que esto nunca es null y NO avisa de los accesos de abajo. En runtime
   * sí puede ser null — por eso el render se corta antes con `if
   * (!seleccionado)`, no con optional chaining disperso.
   */
  const seleccionado: ReportePreview | null =
    fuente.find((r) => r.id === selectedId) ?? visibles[0] ?? fuente[0] ?? null

  const esReal = Boolean(seleccionado?.raw)
  const yaEnviado = seleccionado?.estado === 'enviado'

  // El filtro segmentado también pide al backend la lista filtrada (camino real).
  const onFilterChange = (value: string) => {
    setEstadoFilter(value)
    setPdfMsg(null)
    setActionMsg(null)
    void refetch(FILTER_TO_STATUS[value])
  }

  // ── Acción REAL: generar un reporte para CUALQUIER deudor ────────────────────
  const onGenerarParaDeudor = async (debtorId: string) => {
    setActionMsg(null)
    const created = await generate({ debtorId })
    if (created) {
      setSelectedId(created.id)
      setEstadoFilter('todos')
      setActionMsg('Borrador generado con la información de cartera del deudor.')
    }
  }

  // ── Acción REAL: regenerar el borrador del reporte abierto ───────────────────
  const onGenerar = async () => {
    const debtorId = seleccionado.raw?.debtorId
    if (!debtorId) return
    setActionMsg(null)
    const created = await generate({
      debtorId,
      ownerName: seleccionado.raw?.ownerName ?? undefined,
      propertyId: seleccionado.raw?.propertyId ?? undefined,
      ownerId: seleccionado.raw?.ownerId ?? undefined,
    })
    if (created) {
      setSelectedId(created.id)
      setActionMsg('Borrador generado con la información de cartera del deudor.')
    }
  }

  // ── Acción REAL: aprobar / enviar (POST approve) — T-323, click humano ───────
  const onAprobarEnviar = async () => {
    if (!esReal || yaEnviado) return
    // Confirmación humana explícita antes de marcar como enviado al propietario.
    const ok = globalThis.confirm(
      `¿Confirmás que revisaste este reporte y querés enviarlo a ${seleccionado.propietario}? Esta acción lo marca como enviado al propietario.`,
    )
    if (!ok) return
    setActionMsg(null)
    const updated = await approve(seleccionado.id, true)
    if (updated) {
      setActionMsg('Reporte aprobado y marcado como enviado al propietario.')
    }
  }

  // ── Acción REAL: descargar PDF (GET pdf) — 501 → estado honesto ──────────────
  const onDescargarPdf = async () => {
    if (!esReal) return
    setPdfMsg(null)
    const result = await downloadPdf(seleccionado.id)
    if (result.status === 'unavailable' && result.message !== 'ok') {
      setPdfMsg('La descarga en PDF estará disponible próximamente.')
    }
  }

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Reportes a propietarios
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl">
            Resúmenes de gestión de cobranza por propietario: estado de mora, gestiones realizadas y
            recomendación, listos para que los revises y envíes al dueño del inmueble.
          </p>
        </div>
        <NuevoReporte isGenerating={isGenerating} onGenerar={onGenerarParaDeudor} />
      </header>

      {generateError && (
        <p className="text-sm text-danger" role="alert">
          No pudimos generar el reporte. Intentá de nuevo.
        </p>
      )}

      {/*
        Sin reportes reales: SOLO el estado vacío.

        Antes se caía a tres reportes de ejemplo quemados en el archivo —
        «María González · Apartamento Laureles · 18 días de mora · $2.450.000 ·
        Pendiente aprobación»— con un aviso arriba diciendo que era una vista
        previa. Nadie lee el aviso: lo que se ve es el nombre de una persona,
        una deuda y un estado de aprobación que no existen. Un ejemplo con
        forma de dato ES un dato para quien lo mira.

        Y el estado vacío mandaba a Propietarios: el único botón para GENERAR el
        primer reporte vivía dentro de un reporte ya seleccionado, así que con la
        lista vacía —el estado inicial de toda inmobiliaria— la pantalla no podía
        producir jamás su primer reporte. Ahora el camino de salida es generarlo.
      */}
      {isLoading && !hayReales ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-fg-muted">
          <Spinner size="sm" variant="muted" className="shrink-0" />
          Cargando reportes…
        </div>
      ) : !seleccionado ? (
        <EmptyState
          icon={FileText}
          title="Todavía no hay reportes de gestión"
          description="Elegí un deudor arriba y generá el primero: el agente redacta el estado de mora, las gestiones hechas y una recomendación, para que lo revises y lo apruebes antes de enviárselo al propietario."
          primaryCta={{ label: 'Ver mis propietarios', href: PROPIETARIOS_HREF }}
        />
      ) : (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Columna izquierda — lista de reportes preparados */}
        <section className="space-y-3" aria-label="Reportes preparados">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-fg">Reportes preparados</h2>
            <SegmentedControl
              options={estadoOptions}
              value={estadoFilter}
              onChange={onFilterChange}
              aria-label="Filtrar por estado"
            />
          </div>

          {isLoading && !hayReales ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-fg-muted">
              <Spinner size="sm" variant="muted" className="shrink-0" />
              Cargando reportes…
            </div>
          ) : visibles.length > 0 ? (
            <ul className="space-y-3">
              {visibles.map((reporte) => (
                <ReporteRow
                  key={reporte.id}
                  reporte={reporte}
                  selected={reporte.id === seleccionado.id}
                  onSelect={() => {
                    setSelectedId(reporte.id)
                    setPdfMsg(null)
                    setActionMsg(null)
                  }}
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={CheckCircle}
              title="Sin reportes en este estado"
              description="No hay reportes que coincidan con el filtro seleccionado."
            />
          )}
        </section>

        {/* Columna derecha — reporte seleccionado + acciones */}
        <section className="space-y-4" aria-label="Vista del reporte">
          <ReportePreviewCard reporte={seleccionado} />

          {/* Acciones. enviar/aprobar y PDF se cablean a endpoints reales cuando
              el reporte es real; el resto queda como placeholder honesto.
              La acción principal (Enviar) requiere aprobación humana — T-323. */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="text-base font-semibold text-fg">Acciones</h3>

              <div className="flex flex-wrap gap-2">
                {/* Acción principal — Aprobar / Enviar (POST approve, T-323) */}
                <Button
                  variant="default"
                  size="sm"
                  hideArrow
                  disabled={!esReal || yaEnviado || isApproving}
                  onClick={onAprobarEnviar}
                  title={
                    !esReal
                      ? 'Disponible al generar un reporte real'
                      : yaEnviado
                        ? 'Este reporte ya fue enviado'
                        : 'Aprobar y enviar al propietario'
                  }
                >
                  {isApproving ? (
                    <Spinner size="sm" variant="current" />
                  ) : (
                    <PaperPlaneTilt className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  {yaEnviado ? 'Enviado' : 'Aprobar y enviar'}
                </Button>

                {/* Generar borrador (POST generate) — necesita un deudor real */}
                <Button
                  variant="outline"
                  size="sm"
                  hideArrow
                  disabled={!seleccionado.raw?.debtorId || isGenerating}
                  onClick={onGenerar}
                  title={
                    seleccionado.raw?.debtorId
                      ? 'Generar un borrador con la información actual de cartera'
                      : 'Disponible para reportes con deudor asociado'
                  }
                >
                  {isGenerating ? (
                    <Spinner size="sm" variant="current" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  Generar borrador
                </Button>

                {/* Descargar PDF (GET pdf) — 501 → estado honesto */}
                <Button
                  variant="outline"
                  size="sm"
                  hideArrow
                  disabled={!esReal || isDownloading}
                  onClick={onDescargarPdf}
                  title={
                    esReal ? 'Descargar el reporte en PDF' : 'Disponible para reportes reales'
                  }
                >
                  {isDownloading ? (
                    <Spinner size="sm" variant="current" />
                  ) : (
                    <DownloadSimple className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  Descargar PDF
                </Button>

              </div>

              {/* Feedback honesto de las acciones */}
              {actionMsg && (
                <p className="text-xs text-success">{actionMsg}</p>
              )}
              {pdfMsg && <p className="text-xs text-fg-muted">{pdfMsg}</p>}
              {approveError && (
                <p className="text-xs text-danger">
                  No se pudo aprobar el reporte. Intentá de nuevo.
                </p>
              )}
              {generateError && (
                <p className="text-xs text-danger">
                  No se pudo generar el borrador. Intentá de nuevo.
                </p>
              )}

              <p className="text-xs text-fg-muted">
                El envío al propietario siempre requiere tu aprobación explícita.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
      )}
    </main>
  )
}

export default function ReportesPropietariosPage() {
  return (
    <PageGuard module="cobranza">
      <ReportesPropietariosContent />
    </PageGuard>
  )
}
