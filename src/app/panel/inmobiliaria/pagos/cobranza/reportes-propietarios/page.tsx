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
 *   - "Aprobar y enviar" = POST approve (markAsSent) con CONFIRMACIÓN HUMANA.
 *   - "Descargar PDF" = GET pdf: la carta que recibe el propietario.
 *
 * 🔴 MORI-33 (QA de los agentes; Nico 19-10-2026: «por correo»). El reporte no
 * sabía a quién iba («Para: Propietario sin nombre», título «Inmueble»), el PDF
 * decía «próximamente» y «Aprobar» lo marcaba enviado sin mandar nada. Ahora el
 * propietario y el inmueble salen del contrato del caso (`GET …/destino`, los
 * correos tapados), el PDF lo arma el back y «Aprobar y enviar» se lo manda por
 * correo: queda «Enviado» sólo si el correo salió; si no, dice por qué.
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

import { EsqueletoTarjetas } from '@/components/estado/EsqueletoTabla'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Buildings,
  CheckCircle,
  DownloadSimple,
  FileText,
  PaperPlaneTilt,
  ShieldCheck,
  UsersThree,
  MagnifyingGlass,
} from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Badge, Button, Card, CardContent, Spinner } from '@/components/ui'
import { confirmar } from '@/components/ui/confirmar'
import { mensajeDeLaAccion } from '@/lib/hooks/cobranza/mensaje-de-la-accion'
import { CrossFade, Eyebrow, MotionIndicator, Presence, Stagger, StaggerItem } from '@leasefy/cadence'
import {
  DebtorPicker,
  type PickedDebtor,
} from '@/components/inmobiliaria/cobranza/DebtorPicker'
import {
  useOwnerReports,
  type LecturaDelDestino,
  type OwnerReport,
  type OwnerReportStatus,
} from '@/lib/hooks/cobranza/use-owner-reports'
import { plataEnPantalla } from '@/lib/plata/escribir-plata'
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { antiguedadDeLaCola, diasEnPalabras } from '@/lib/cobranza/antiguedad-de-la-cola'
import { Input } from '@/components/ui/input'
import { TablePagination } from '@/components/ui/pagination'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'

const BASE = '/panel/inmobiliaria/pagos/cobranza'
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
    label: 'Por aprobar',
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

// UI (vara): el estado con la insignia de la casa, no una píldora armada a mano.
const VARIANTE_DEL_ESTADO: Record<ReporteEstado, 'secondary' | 'warning' | 'success'> = {
  borrador: 'secondary',
  pendiente: 'warning',
  enviado: 'success',
}

function EstadoBadge({ estado }: { estado: ReporteEstado }) {
  return (
    <Badge variant={VARIANTE_DEL_ESTADO[estado]} className="shrink-0">
      {ESTADO_TOKEN[estado].label}
    </Badge>
  )
}

// Mapa estado backend (draft|pending_approval|sent) → vocabulario de esta vista.
const BACKEND_ESTADO: Record<OwnerReportStatus, ReporteEstado> = {
  draft: 'borrador',
  pending_approval: 'pendiente',
  sent: 'enviado',
}

const COP = plataEnPantalla(localeDeLasCifras, {
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
    // MORI-33: el propietario y el inmueble del contrato del caso. Un borrador
    // viejo puede no tenerlos: la vista dice a quién va de verdad (`destino`).
    propietario: r.ownerName?.trim() || 'Propietario por identificar',
    inmueble: r.propertyLabel?.trim() || 'Inmueble del caso',
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
  // Un `StaggerItem` de la lista; el marco del elegido (borde + anillo) se
  // desliza al reporte nuevo (`MotionIndicator`, mismo `layoutId` en toda la
  // lista: hay una sola por pantalla).
  return (
    <StaggerItem as="li">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={[
          // Revisora r27 (UI): la fila vive DENTRO de la tarjeta de las pestañas
          // (antes una tarjeta suelta por reporte, fuera de la lista).
          'relative isolate w-full text-left px-4 py-3 transition-colors border-l-2 border-l-transparent',
          'hover:bg-surface-muted/60 focus:outline-none focus-visible:bg-surface-muted',
        ].join(' ')}
      >
        {selected && (
          <MotionIndicator
            layoutId="reportes-propietarios-elegido"
            className="inset-y-0 -left-0.5 right-0 -z-10 bg-surface-muted border-l-2 border-l-primary"
          />
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 min-w-0">
              <Buildings
                className="w-4 h-4 shrink-0 text-fg-muted"
                weight="duotone"
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-fg truncate">
                {reporte.inmueble}
              </span>
            </div>
            <p className="text-caption text-fg-muted truncate">
              Propietario: {reporte.propietario}
            </p>
          </div>
          <EstadoBadge estado={reporte.estado} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-fg-muted tabular-nums">
          <span>
            <span className="font-medium text-fg">{reporte.diasMora}</span> días de mora
          </span>
          <span>
            Valor: <span className="font-medium text-fg">{reporte.valor}</span>
          </span>
        </div>
      </button>
    </StaggerItem>
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

/**
 * «Nuevo reporte» en un cajón (revisora r25, UI: iba en un <header> armado a
 * mano junto al encabezado común). Elegir el deudor y generar el borrador:
 * la misma llamada de antes.
 */
function NuevoReporte({
  abierto,
  onCerrar,
  isGenerating,
  onGenerar,
}: {
  abierto: boolean
  onCerrar: () => void
  isGenerating: boolean
  onGenerar: (debtorId: string) => void
}) {
  const [deudor, setDeudor] = useState<PickedDebtor | null>(null)

  return (
    <Cajon abierto={abierto} onOpenChange={(v) => !v && onCerrar()} data-testid="reporte-nuevo-cajon">
      <CajonCabecera
        titulo="Nuevo reporte"
        descripcion="El agente redacta la mora, las gestiones hechas y una recomendación. Lo revisas antes de enviarlo."
      />
      <CajonCuerpo className="space-y-2">
        <label htmlFor="reporte-deudor" className="block text-body-sm text-fg">
          ¿De qué deudor?
        </label>
        <DebtorPicker inputId="reporte-deudor" value={deudor} onChange={setDeudor} />
      </CajonCuerpo>
      <CajonPie>
        <Button variant="ghost" size="sm" hideArrow onClick={onCerrar}>
          Cancelar
        </Button>
        <Button
          size="sm"
          hideArrow
          disabled={!deudor || isGenerating}
          isLoading={isGenerating}
          onClick={() => deudor && onGenerar(deudor.id)}
          title={deudor ? 'Generar el borrador con la cartera del deudor' : 'Elige un deudor primero'}
        >
          Generar borrador
        </Button>
      </CajonPie>
    </Cajon>
  )
}

/** «Ana Gómez (ana***@correo.co)» o «Ana Gómez, sin correo registrado». */
function conSuCorreo(p: { nombre: string; correo: string | null }): string {
  return p.correo ? `${p.nombre} (${p.correo})` : `${p.nombre}, sin correo registrado`
}

/** A quién le llega el reporte, leído del contrato del caso (MORI-33). */
function ParaQuien({ reporte, lectura }: { reporte: ReportePreview; lectura: LecturaDelDestino | 'cargando' | null }) {
  if (lectura === 'cargando') {
    return <p className="text-caption text-fg-muted">Buscando el propietario del contrato…</p>
  }
  if (lectura === null) {
    return <p className="text-caption text-fg-muted truncate">Para: {reporte.propietario}</p>
  }
  if (!lectura.destino) {
    return (
      <p className="text-caption text-warning" data-testid="reporte-sin-destino">
        {lectura.porQueNo ?? 'No sabemos a qué propietario va este reporte.'}
      </p>
    )
  }
  const d = lectura.destino
  const sinCorreo = d.propietarios.length > 0 && d.propietarios.every((p) => !p.correo)
  return (
    <div className="space-y-0.5" data-testid="reporte-destino">
      <p className="text-caption text-fg-muted">
        Para: {d.propietarios.length > 0 ? d.propietarios.map(conSuCorreo).join(' · ') : 'el inmueble no tiene propietario registrado'}
      </p>
      <p className="text-caption text-fg-subtle">Contrato {d.contrato}</p>
      {sinCorreo && (
        <p className="text-caption text-warning">
          Ningún propietario tiene correo registrado: agrégalo en su ficha para poder enviárselo.
        </p>
      )}
    </div>
  )
}

function ReportePreviewCard({
  reporte,
  lectura,
}: {
  reporte: ReportePreview
  lectura: LecturaDelDestino | 'cargando' | null
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        {/* Encabezado del documento */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <Eyebrow>Reporte de gestión</Eyebrow>
            <h2 className="text-base font-medium text-fg">
              Estado de cobranza — {lectura && lectura !== 'cargando' && lectura.destino ? lectura.destino.inmueble.nombre : reporte.inmueble}
            </h2>
            <ParaQuien reporte={reporte} lectura={lectura} />
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
                Todavía no hay una narrativa redactada para este reporte. Vuelve a
                generarlo para que el agente componga el resumen de gestiones y la
                recomendación con la información de cartera del deudor.
              </p>
            </>
          )}
        </div>

        {/* Nota de aprobación humana (T-323) */}
        <div className="flex items-start gap-2 rounded-lg bg-surface-muted p-3 text-caption text-fg">
          <ShieldCheck className="w-4 h-4 shrink-0 text-fg-muted mt-0.5" weight="duotone" aria-hidden="true" />
          <p>
            Este reporte requiere tu revisión y aprobación antes de enviarse al propietario. Al
            aprobarlo se le manda por correo, con el reporte en PDF. Ningún reporte se envía de forma
            automática.
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
    generateFallo,
    approve,
    isApproving,
    approveError,
    approveFallo,
    downloadPdf,
    isDownloading,
    leerDestino,
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
  const [nuevoAbierto, setNuevoAbierto] = useState(false)

  // Los conteos de las pestañas salen de la lista completa («Todos»): filtrar
  // pide al back sólo ese estado, así que se recuerdan los de la última vez
  // que se vio todo (null mientras no se sepa).
  const [conteos, setConteos] = useState<Record<ReporteEstado, number> | null>(null)
  // Desde cuándo espera cada reporte por aprobar (revisora r27, K1 y K2).
  const [fechasPorAprobar, setFechasPorAprobar] = useState<string[]>([])
  useEffect(() => {
    if (estadoFilter !== 'todos' || isLoading) return
    const n: Record<ReporteEstado, number> = { borrador: 0, pendiente: 0, enviado: 0 }
    for (const r of realReportes) n[r.estado] += 1
    setConteos(n)
    setFechasPorAprobar(
      realReportes.filter((r) => r.estado === 'pendiente').map((r) => r.raw?.createdAt ?? null).filter((f): f is string => f !== null),
    )
  }, [estadoFilter, isLoading, realReportes])
  const colaPorAprobar = useMemo(
    () => antiguedadDeLaCola(fechasPorAprobar, { es: true, testid: 'reportes-por-aprobar' }),
    [fechasPorAprobar],
  )
  const [busqueda, setBusqueda] = useState('')

  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Si el PDF no se pudo descargar, por qué.
  const [pdfMsg, setPdfMsg] = useState<string | null>(null)
  // Feedback de aprobación / generación (T-323).
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const delEstado =
    estadoFilter === 'todos'
      ? fuente
      : fuente.filter((r) => r.estado === estadoFilter)
  // Revisora r27 (K3): buscador por propietario o inmueble, y la paginación.
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase('es')
    if (!q) return delEstado
    return delEstado.filter((r) =>
      `${r.propietario} ${r.inmueble}`.toLocaleLowerCase('es').includes(q),
    )
  }, [delEstado, busqueda])
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } = useTablePagination(
    visibles,
    { resetKey: `${estadoFilter}|${busqueda}` },
  )

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

  // MORI-33: a quién va el reporte elegido (el contrato del caso, en el back).
  const [destino, setDestino] = useState<{ id: string; lectura: LecturaDelDestino | 'cargando' | null } | null>(null)
  const idElegido = esReal ? (seleccionado?.id ?? null) : null
  useEffect(() => {
    if (!idElegido) return
    let vivo = true
    setDestino({ id: idElegido, lectura: 'cargando' })
    void leerDestino(idElegido).then((lectura) => {
      if (vivo) setDestino({ id: idElegido, lectura })
    })
    return () => {
      vivo = false
    }
  }, [idElegido, leerDestino])
  const lectura = destino && destino.id === idElegido ? destino.lectura : null
  const destinoLeido = lectura && lectura !== 'cargando' ? lectura : null
  /** Se sabe que no le puede llegar a nadie: el botón se apaga y dice por qué. */
  const porQueNoSePuedeEnviar = !destinoLeido
    ? null
    : !destinoLeido.destino
      ? (destinoLeido.porQueNo ?? 'No sabemos a qué propietario va este reporte.')
      : destinoLeido.destino.propietarios.every((p) => !p.correo)
        ? 'Ningún propietario tiene correo registrado: agrégalo en su ficha para poder enviárselo.'
        : null

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
      setNuevoAbierto(false)
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

  // ── Acción REAL: aprobar y enviar (POST approve) — T-323, click humano ──────
  const onAprobarEnviar = async () => {
    if (!esReal || yaEnviado || porQueNoSePuedeEnviar) return
    const propietarios = destinoLeido?.destino?.propietarios.filter((p) => p.correo) ?? []
    // Confirmación humana explícita: con el modal del sistema (02-10-2026).
    const ok = await confirmar({
      titulo:
        propietarios.length > 0
          ? `¿Enviarle el reporte a ${propietarios.map((p) => p.nombre).join(' y ')}?`
          : `¿Aprobar y enviar el reporte de ${seleccionado.inmueble}?`,
      descripcion:
        propietarios.length > 0
          ? `Le llega por correo a ${propietarios.map(conSuCorreo).join(' y ')}, con el reporte en PDF. Queda como enviado sólo si el correo sale.`
          : 'Se le manda por correo al propietario del contrato, con el reporte en PDF. Queda como enviado sólo si el correo sale.',
      accion: 'Aprobar y enviar',
      icono: <PaperPlaneTilt weight="bold" />,
    })
    if (!ok) return
    setActionMsg(null)
    const updated = await approve(seleccionado.id, true)
    if (updated) {
      const llegaron = updated.envio?.destinatarios.filter((d) => d.estado === 'ENVIADO') ?? []
      setActionMsg(
        llegaron.length > 0
          ? `Enviado por correo a ${llegaron.map(conSuCorreo).join(' y ')}.`
          : 'Reporte aprobado y enviado.',
      )
    }
  }

  // ── Acción REAL: descargar PDF (GET pdf) — la carta que recibe el propietario ─
  const onDescargarPdf = async () => {
    if (!esReal) return
    setPdfMsg(null)
    const result = await downloadPdf(seleccionado.id)
    if (result.status === 'error') {
      setPdfMsg(
        mensajeDeLaAccion(
          { fallo: result.fallo },
          { porDefecto: 'No pudimos descargar el PDF.', accion: 'descargar el PDF' },
        ),
      )
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EncabezadoDePantalla
        seccion="Cobranza"
        titulo="Reportes a propietarios"
        descripcion="Lo que se le cuenta a cada propietario de la cobranza de su inmueble: revísalo y envíaselo."
        acciones={
          <Button variant="secondary" size="sm" hideArrow onClick={() => setNuevoAbierto(true)} data-testid="reporte-nuevo">
            Nuevo reporte
          </Button>
        }
      />
      <NuevoReporte
        abierto={nuevoAbierto}
        onCerrar={() => setNuevoAbierto(false)}
        isGenerating={isGenerating}
        onGenerar={onGenerarParaDeudor}
      />

      {/* Antes: «Intenta de nuevo» fijo ante cualquier fallo. */}
      <Presence as="p" show={Boolean(generateError)} className="text-body-sm text-danger" role="alert" data-testid="reporte-generar-error">
          {mensajeDeLaAccion(
            { error: generateError, fallo: generateFallo },
            { porDefecto: 'No pudimos generar el reporte.', accion: 'generar el reporte' },
          )}
      </Presence>

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
      {/* Cargando → vacío → maestro-detalle: cada estado entra con su fundido. */}
      <CrossFade swapKey={isLoading && !hayReales ? 'cargando' : !seleccionado ? 'vacio' : 'reportes'}>
      {isLoading && !hayReales ? (
        // C6 (r25): esqueleto con la forma del maestro-detalle, no una rueda con texto.
        <div aria-busy="true" aria-label="Cargando reportes">
          <EsqueletoTarjetas cantidad={3} />
        </div>
      ) : !seleccionado ? (
        <EmptyState
          icon={FileText}
          title="Todavía no hay reportes de gestión"
          description="Genera el primero: el agente redacta el estado de mora, las gestiones hechas y una recomendación, para que lo revises y lo apruebes antes de enviárselo al propietario."
          primaryCta={{ label: 'Nuevo reporte', onClick: () => setNuevoAbierto(true) }}
          secondaryCta={{ label: 'Ver mis propietarios', href: PROPIETARIOS_HREF }}
        />
      ) : (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Columna izquierda — lista de reportes preparados */}
        <section className="space-y-3" aria-label="Reportes preparados">
          {/* QA-AGENTES 16-10: a 390 px los cuatro filtros no cabían al lado del
              título («Por aprobar» partido) y arrastraban las tarjetas: en el
              celular van debajo, en su riel. */}
          {/* LA RESPUESTA (revisora r25 #1): cuántos esperan tu aprobación; los
              conteos por estado van en las pestañas, una sola vez (C3). */}
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-4">
              <CifraHeroe
                data-testid="reportes-por-aprobar"
                rotulo="El reporte más viejo por aprobar espera"
                tamano="mediana"
                cifra={colaPorAprobar.masVieja === null ? '—' : diasEnPalabras(colaPorAprobar.masVieja, true)}
                tramos={colaPorAprobar.tramos}
                esCero={conteos !== null && conteos.pendiente === 0}
                cuandoEsCero="Ningún reporte espera tu aprobación."
              />
            </div>
            <div className="px-4 py-3">
              <PestanasDeEstado<string>
                etiqueta="Filtrar por estado"
                valor={estadoFilter}
                onCambio={onFilterChange}
                pestanas={estadoOptions.map((o) => ({
                  valor: o.value,
                  etiqueta: o.label,
                  cuantos:
                    conteos === null
                      ? null
                      : o.value === 'todos'
                        ? conteos.borrador + conteos.pendiente + conteos.enviado
                        : conteos[o.value as ReporteEstado],
                  fija: o.value === 'todos',
                  tono: o.value === 'pendiente' ? ('aviso' as const) : undefined,
                  testid: `reportes-pestana-${o.value}`,
                }))}
              />
            </div>
            <div className="border-t border-border px-4 py-3">
              <div className="relative w-full">
                <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
                <Input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar propietario o inmueble"
                  aria-label="Buscar reportes por propietario o inmueble"
                  className="pl-9"
                  data-testid="reportes-buscar"
                />
              </div>
            </div>

          {visibles.length > 0 ? (
            <Stagger as="ul" className="divide-y divide-border border-t border-border">
              {pageItems.map((reporte) => (
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
            </Stagger>
          ) : (
            <div className="border-t border-border">
              <EmptyState
                icon={busqueda.trim() ? MagnifyingGlass : CheckCircle}
                title={busqueda.trim() ? 'Ningún reporte coincide con la búsqueda' : 'Sin reportes en este estado'}
                description={
                  busqueda.trim()
                    ? 'Revisa el nombre del propietario o del inmueble, o borra la búsqueda.'
                    : 'No hay reportes que coincidan con el filtro seleccionado.'
                }
                primaryCta={busqueda.trim() ? { label: 'Borrar la búsqueda', onClick: () => setBusqueda('') } : undefined}
              />
            </div>
          )}
          {shouldPaginate ? (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={total}
                page={page}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          ) : null}
          </div>
        </section>

        {/* Columna derecha — reporte seleccionado + acciones */}
        <section className="space-y-4" aria-label="Vista del reporte">
          {/* Elegir otro reporte cambia la vista con un fundido. */}
          <CrossFade swapKey={seleccionado.id}>
            <ReportePreviewCard reporte={seleccionado} lectura={lectura} />
          </CrossFade>

          {/* Acciones. enviar/aprobar y PDF se cablean a endpoints reales cuando
              el reporte es real; el resto queda como placeholder honesto.
              La acción principal (Enviar) requiere aprobación humana — T-323. */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="text-body-sm font-medium text-fg">Acciones</h3>

              <div className="flex flex-wrap gap-2">
                {/* Acción principal — Aprobar / Enviar (POST approve, T-323) */}
                <Button
                  variant="default"
                  size="sm"
                  hideArrow
                  disabled={!esReal || yaEnviado || isApproving || Boolean(porQueNoSePuedeEnviar)}
                  onClick={onAprobarEnviar}
                  title={
                    !esReal
                      ? 'Disponible al generar un reporte real'
                      : yaEnviado
                        ? 'Este reporte ya fue enviado'
                        : (porQueNoSePuedeEnviar ?? 'Aprobar y enviárselo por correo al propietario')
                  }
                  data-testid="reporte-aprobar-y-enviar"
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
              <Presence as="p" show={Boolean(actionMsg)} className="text-caption text-success">{actionMsg}
              </Presence>
              <Presence as="p" show={Boolean(pdfMsg)} className="text-caption text-danger" role="alert" data-testid="reporte-pdf-error">
                {pdfMsg}
              </Presence>
              <Presence as="p" show={Boolean(approveError)} className="text-caption text-danger" role="alert" data-testid="reporte-aprobar-error">
                  {mensajeDeLaAccion(
                    { error: approveError, fallo: approveFallo },
                    { porDefecto: 'No pudimos aprobar el reporte.', accion: 'aprobar el reporte' },
                  )}
              </Presence>
              <Presence as="p" show={Boolean(generateError)} className="text-caption text-danger">
                  {mensajeDeLaAccion(
                    { error: generateError, fallo: generateFallo },
                    { porDefecto: 'No pudimos generar el borrador.', accion: 'generar el borrador' },
                  )}
              </Presence>

              <p className="text-caption text-fg-muted">
                El envío al propietario siempre requiere tu aprobación explícita: sale por correo, con
                el reporte en PDF adjunto.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
      )}
      </CrossFade>
    </div>
  )
}

export default function ReportesPropietariosPage() {
  return (
    <PageGuard module="cobranza">
      <ReportesPropietariosContent />
    </PageGuard>
  )
}
