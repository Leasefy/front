'use client'

/**
 * /ai/cobranza/disputas — "Disputas" (visión #12).
 *
 * El nombre es UNO SOLO en toda la superficie: el nav decía «Disputas» y la
 * pantalla «Controversias». Se unificó en «disputa» (2026-08-09).
 *
 * DISPOSICIÓN — maestro-detalle. Antes era una columna de tarjetas con
 * `max-w-3xl` y casi media pantalla vacía a la derecha. Una disputa es texto
 * largo que hay que leer entero para decidir, así que la lista sólo trae lo
 * necesario para ELEGIR (quién, estado, monto, antigüedad) y el panel derecho
 * trae lo que hay que LEER y HACER. La resolución dejó de ser un modal: se
 * abría encima del motivo, justo el texto sobre el que había que decidir.
 *
 * Acciones (T-323 — confirmación HUMANA explícita, nunca auto-ejecuta):
 *   - "Abrir disputa": modal que registra una disputa (POST /disputes). NO
 *     pausa la cobranza; sólo deja constancia + escalación humana.
 *   - "Resolver": en el panel (POST /disputes/:id/resolve) con resultado +
 *     nota obligatoria. NO reactiva cobranza; el backend devuelve una
 *     recomendación sobre la que decide una persona.
 */

import { useEstadoEnLaUrl } from '@/lib/cobranza/use-estado-en-la-url'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Lock, MagnifyingGlass, Scales } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'

import { PageGuard } from '@/components/auth/PageGuard'
import { useAuth } from '@/lib/auth'
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Button } from '@/components/ui'
import { CampoDePlata } from '@/components/ui/campo-de-plata'
import { Textarea } from '@/components/ui/textarea'
import { CrossFade, Presence, Card } from '@leasefy/cadence'
// El Dialog del ADAPTADOR local (z del panel y la ✕ del producto), no el de Cadence pelado.
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  useDisputes,
  type CobranzaDispute,
  type DisputeOutcome,
  type DisputeStatus,
} from '@/lib/hooks/cobranza/use-disputes'
import { DisputasList } from '@/components/inmobiliaria/cobranza/DisputasList'
import { DisputaDetailPanel } from '@/components/inmobiliaria/cobranza/DisputaDetailPanel'
import { TablePagination } from '@/components/ui/pagination'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import { mensajeDeLaAccion } from '@/lib/hooks/cobranza/mensaje-de-la-accion'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import {
  DebtorPicker,
  type PickedDebtor,
} from '@/components/inmobiliaria/cobranza/DebtorPicker'
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { antiguedadDeLaCola, diasEnPalabras } from '@/lib/cobranza/antiguedad-de-la-cola'
import { formatCurrency } from '@/lib/format'
import { debtorLabel } from '@/lib/cobranza/dispute-vocab'
import { Input } from '@/components/ui/input'
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado'


const REASON_MIN = 1
/** El mismo tope del micro (`reason: z.string().trim().min(1).max(2000)`). */
const REASON_MAX = 2000

/** Los campos del formulario de abrir disputa, con el nombre que usa el micro en `campos`. */
type CampoDeLaDisputa = 'debtorId' | 'reason' | 'disputedAmount'
const ID_DEL_CAMPO_DE_LA_DISPUTA: Record<CampoDeLaDisputa, string> = {
  debtorId: 'disputa-debtor',
  reason: 'disputa-reason',
  disputedAmount: 'disputa-monto',
}
const CAMPOS_DE_LA_DISPUTA = Object.keys(ID_DEL_CAMPO_DE_LA_DISPUTA) as CampoDeLaDisputa[]

/**
 * Alto de la cabecera del panel + las secciones de Cobros + las pestañas de
 * Cobranza, para el sticky. Las dos barras publican su alto en variables CSS
 * (`BarraDePestanas`); la de secciones vale 0 si no se dibuja.
 *
 * ⚠️ Los espacios alrededor del `+` NO son opcionales: en `style` inline
 * `calc(4rem+3rem)` es CSS inválido y el navegador lo descarta en silencio.
 * (En una clase de Tailwind se puede escribir pegado porque Tailwind
 * normaliza el `calc` al generar el CSS; acá no hay quien lo haga.)
 */

// ── Filtro por estado (SegmentedControl) ─────────────────────────────────────

type EstadoFiltro = 'todas' | DisputeStatus

// Sin «En revisión» (QA-AGENTES 16-10): ningún camino del micro pone una
// disputa en ese estado, así que el filtro siempre daba 0. Si alguna llegara
// así, se ve en «Todas» con su etiqueta.
const FILTRO_OPCIONES: { value: EstadoFiltro; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'open', label: 'Abiertas' },
  { value: 'resolved', label: 'Resueltas' },
]

// ── Modal: Abrir disputa (POST /disputes) ────────────────────────────────────

interface AbrirDisputaModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (body: {
    debtorId: string
    reason: string
    disputedAmount?: number
  }) => Promise<{ ok: boolean; status: number; persisted: boolean; fallo?: unknown; error?: string }>
}

function AbrirDisputaModal({ isOpen, onClose, onSubmit }: AbrirDisputaModalProps) {
  const [debtor, setDebtor] = useState<PickedDebtor | null>(null)
  const [reason, setReason] = useState('')
  const [monto, setMonto] = useState<number | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  /** El error de cada campo que mandó el micro en `campos` (un 400). */
  const [erroresDelServidor, setErroresDelServidor] = useState<
    Partial<Record<CampoDeLaDisputa, string>>
  >({})

  // El deudor se ELIGE de la cartera; el UUID nunca lo escribe una persona.
  const debtorIdOk = debtor !== null
  const reasonLen = reason.trim().length
  const reasonOk = reasonLen >= REASON_MIN && reasonLen <= REASON_MAX
  const montoNum = monto !== undefined && Number.isFinite(monto) ? monto : undefined
  const montoOk =
    montoNum === undefined || (Number.isFinite(montoNum) && montoNum >= 0)
  const canSubmit = debtorIdOk && reasonOk && montoOk && !submitting

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !debtor) return
    setSubmitting(true)
    setSubmitError(null)
    const res = await onSubmit({
      debtorId: debtor.id,
      reason: reason.trim(),
      ...(montoNum !== undefined ? { disputedAmount: montoNum } : {}),
    })
    setSubmitting(false)
    setErroresDelServidor({})
    if (res.ok) {
      setDebtor(null)
      setReason('')
      setMonto(undefined)
      onClose()
    } else if (res.status === 403) {
      // El 403 del micro no trae un `message` para la persona: se dice acá.
      setSubmitError('No tienes permiso para abrir disputas.')
    } else if (res.status === 404) {
      setSubmitError('No se encontró el deudor con ese identificador.')
    } else if (res.fallo === undefined) {
      // La acción ni salió (sin agente configurado).
      setSubmitError(
        mensajeDeLaAccion(res, {
          porDefecto: 'No pudimos registrar la disputa.',
          accion: 'registrar la disputa',
        }),
      )
    } else {
      // Un 400 con `campos` va a su campo; lo demás (un 5xx con su referencia,
      // la red) abajo. Antes decía «error 500» o culpaba al servicio.
      const reparto = repartirErroresDelServidor<CampoDeLaDisputa>(res.fallo, {
        campos: CAMPOS_DE_LA_DISPUTA,
        porDefecto: 'No pudimos registrar la disputa.',
        accion: 'registrar la disputa',
      })
      setErroresDelServidor(reparto.porCampo)
      const primero = CAMPOS_DE_LA_DISPUTA.find((c) => reparto.porCampo[c])
      if (primero) document.getElementById(ID_DEL_CAMPO_DE_LA_DISPUTA[primero])?.focus()
      setSubmitError(reparto.sueltos.length > 0 ? reparto.sueltos.join(' · ') : null)
    }
  }, [canSubmit, onSubmit, debtor, reason, montoNum, onClose])

  /** Lo que se le dice a la persona debajo de cada campo: el tope del cliente o lo del micro. */
  const errorDelMotivo =
    reasonLen > REASON_MAX
      ? `El motivo puede tener hasta ${REASON_MAX.toLocaleString(localeDeLasCifras())} caracteres.`
      : erroresDelServidor.reason
  const errorDelMonto = !montoOk
    ? 'El monto debe ser un número mayor o igual a cero.'
    : erroresDelServidor.disputedAmount

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Abrir una disputa</DialogTitle>
          <DialogDescription>
            Deja constancia y la pone en la cola de revisión de una persona.
            No pausa la cobranza sola.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Deudor — se elige de la cartera, nunca se escribe un UUID */}
          <div className="space-y-1.5">
            <label
              htmlFor="disputa-debtor"
              className="block text-body-sm font-medium text-fg"
            >
              Deudor <span className="text-danger">*</span>
            </label>
            <DebtorPicker
              inputId="disputa-debtor"
              value={debtor}
              onChange={(d) => {
                setDebtor(d)
                setErroresDelServidor(({ debtorId: _, ...resto }) => resto)
              }}
            />
            <ErrorDelCampo id="disputa-debtor-error" mensaje={erroresDelServidor.debtorId} />
          </div>

          {/* Motivo */}
          <div className="space-y-1.5">
            <label
              htmlFor="disputa-reason"
              className="block text-body-sm font-medium text-fg"
            >
              Motivo de la disputa <span className="text-danger">*</span>
            </label>
            <Textarea
              id="disputa-reason"
              aria-required="true"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setErroresDelServidor(({ reason: _, ...resto }) => resto)
              }}
              rows={4}
              maxLength={REASON_MAX + 50}
              placeholder="Describe qué disputa el deudor (saldo, cargo, etc.)."
              className="leading-relaxed"
              aria-invalid={errorDelMotivo ? true : undefined}
              aria-describedby={errorDelMotivo ? 'disputa-reason-error' : undefined}
            />
            <div className="flex items-start justify-between gap-3">
              <ErrorDelCampo id="disputa-reason-error" mensaje={errorDelMotivo} className="mt-0" />
              <span className="ml-auto shrink-0 text-caption text-fg-muted tabular-nums">
                {reasonLen} / {REASON_MAX}
              </span>
            </div>
          </div>

          {/* Monto disputado (opcional) */}
          <div className="space-y-1.5">
            <label
              htmlFor="disputa-monto"
              className="block text-body-sm font-medium text-fg"
            >
              Monto en disputa (opcional)
            </label>
            {/* Sólo números, con formato de pesos (QA-AGENTES 16-10): antes
                aceptaba «12abc» y «-500» y luego avisaba. */}
            <CampoDePlata
              id="disputa-monto"
              areas="cobros_recibos_y_cartera"
              value={monto}
              onChange={(v) => {
                setMonto(Number.isFinite(v) ? v : undefined)
                setErroresDelServidor(({ disputedAmount: _, ...resto }) => resto)
              }}
              aria-invalid={errorDelMonto ? true : undefined}
              aria-describedby={errorDelMonto ? 'disputa-monto-error' : undefined}
            />
            <ErrorDelCampo id="disputa-monto-error" mensaje={errorDelMonto} />
          </div>

          <Presence as="p" show={Boolean(submitError)} role="alert" className="text-caption text-danger" data-testid="disputa-abrir-error">
              {submitError}
          </Presence>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            hideArrow
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            hideArrow
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            isLoading={submitting}
            data-testid="disputa-abrir-submit"
          >
            {submitting ? 'Registrando…' : 'Registrar disputa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Contenido ────────────────────────────────────────────────────────────────

function DisputasContent() {
  const { user: authUser } = useAuth()

  // Filtro server-side por estado (el endpoint soporta ?status).
  const [filtro, setFiltroInterno] = useState<EstadoFiltro>('todas')
  // C8 (r25): abre en «Abiertas» si hay alguna, y el filtro vive en la URL.
  const estadoUrl = useEstadoEnLaUrl<EstadoFiltro>(FILTRO_OPCIONES.map((o) => o.value))
  useEffect(() => {
    if (estadoUrl.deLaUrl) setFiltroInterno(estadoUrl.deLaUrl)
  }, [estadoUrl.deLaUrl])
  const setFiltro = useCallback(
    (f: EstadoFiltro) => {
      setFiltroInterno(f)
      estadoUrl.escribir(f === 'todas' ? null : f)
    },
    [estadoUrl],
  )
  // Abrir y resolver es `cobranza:intervene` en el micro (también la lista).
  // QA-IA-B (04-10-2026): al contador se le ofrecía «Abrir disputa» y la
  // lista decía «No pudimos cargar las disputas. 403».
  // N-15 (QA-PAGOS-95): y la pedía igual: un 403 del micro en cada visita.
  // Sin el permiso no se pide; el aviso es el mismo.
  const { canAccess, isLoading: permisosCargando } = usePermissionsContext()
  const puedeActuar = canAccess('cobranza', 'intervene')
  const { disputes, isLoading, error, fallo, refetch, openDispute, resolveDispute } =
    useDisputes({
      ...(filtro === 'todas' ? {} : { status: filtro }),
      activo: !permisosCargando && puedeActuar,
    })
  const sinPermiso =
    (!permisosCargando && !puedeActuar) || (fallo as { status?: number } | null)?.status === 403

  useAutoRefresh(refetch)

  const [abrirOpen, setAbrirOpen] = useState(false)
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null)
  /** En móvil no caben las dos columnas: se muestra una u otra. */
  const [verDetalleEnMovil, setVerDetalleEnMovil] = useState(false)

  /** Falló la carga y no tenemos nada: no sabemos si hay o no. */
  const hayError = (error !== null && disputes.length === 0) || sinPermiso

  // Revisora r27 (K3): la lista tiene buscador por deudor, como las demás tablas.
  const [busqueda, setBusqueda] = useState('')
  const disputasVistas = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase('es')
    if (!q) return disputes
    return disputes.filter((d) => debtorLabel(d).toLocaleLowerCase('es').includes(q))
  }, [disputes, busqueda])

  const seleccionada = useMemo(
    () => disputes.find((d) => d.id === seleccionadaId) ?? null,
    [disputes, seleccionadaId],
  )

  // Auto-selección: al cargar, al cambiar de filtro, o si la elegida ya no
  // está en la lista. Sin esto el panel derecho arrancaría vacío siempre.
  useEffect(() => {
    if (disputasVistas.length === 0) {
      setSeleccionadaId(null)
      return
    }
    if (!disputasVistas.some((d) => d.id === seleccionadaId)) {
      setSeleccionadaId(disputasVistas[0].id)
    }
  }, [disputasVistas, seleccionadaId])

  // Paginación de la columna izquierda. El paginado vive acá y no dentro de
  // <DisputasList> porque `filtro` vive acá: al cambiar de estado hay que
  // volver a la página 1, y la lista es un componente de presentación que no
  // conoce el filtro. La selección y los conteos siguen mirando la lista
  // COMPLETA — sólo se recorta lo que se pinta.
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(disputasVistas, { resetKey: `${filtro}|${busqueda}` })

  const counts = useMemo(() => {
    const c = { open: 0, in_review: 0, resolved: 0 }
    for (const d of disputes) {
      if (d.status === 'open') c.open += 1
      else if (d.status === 'in_review') c.in_review += 1
      else if (d.status === 'resolved') c.resolved += 1
    }
    return c
  }, [disputes])

  // El conteo de TODAS se sabe cuando la lista viene sin filtro de estado; con
  // un estado elegido el micro sólo trae ése y los demás quedan como estaban.
  const [conteoDeTodas, setConteoDeTodas] = useState<{
    open: number
    inReview: number
    resolved: number
    total: number
    /** Las que siguen sin resolver (abiertas y en revisión): desde cuándo y por cuánto. */
    sinResolver: Array<{ desde: string; monto: number | null }>
  } | null>(null)
  useEffect(() => {
    if (filtro !== 'todas' || isLoading) return
    setConteoDeTodas({
      open: counts.open,
      inReview: counts.in_review,
      resolved: counts.resolved,
      total: disputes.length,
      sinResolver: disputes
        .filter((d) => d.status !== 'resolved')
        .map((d) => ({ desde: d.opened_at, monto: d.disputed_amount ?? null })),
    })
    if (!estadoUrl.yaEligio() && counts.open > 0) {
      estadoUrl.marcarElegido()
      setFiltroInterno('open' as EstadoFiltro)
    }
  }, [filtro, isLoading, counts, disputes.length, estadoUrl])
  // Revisora r27 (K1 y K2): la cifra no repite el conteo de «Abiertas»; dice la
  // plata en disputa sin resolver, con la barra por antigüedad (en plata). Sin
  // ningún monto registrado, dice cuánto espera la más vieja.
  const sinResolver = conteoDeTodas?.sinResolver ?? []
  const plataEnDisputa = sinResolver.reduce((s, d) => s + (d.monto ?? 0), 0)
  const colaSinResolver = useMemo(
    () =>
      antiguedadDeLaCola(
        sinResolver.map((d) => d.desde),
        plataEnDisputa > 0
          ? { es: true, testid: 'disputas-abiertas', montos: sinResolver.map((d) => d.monto), formato: formatCurrency }
          : { es: true, testid: 'disputas-abiertas' },
      ),
    [sinResolver, plataEnDisputa],
  )
  const pestanas = useMemo(
    () =>
      FILTRO_OPCIONES.map((o) => ({
        valor: o.value,
        etiqueta: o.label,
        cuantos:
          o.value === filtro
            ? disputes.length
            : conteoDeTodas
              ? o.value === 'todas'
                ? conteoDeTodas.total
                : o.value === 'open'
                  ? conteoDeTodas.open
                  : o.value === 'resolved'
                    ? conteoDeTodas.resolved
                    : null
              : null,
        fija: o.value === 'todas',
        tono: o.value === 'open' ? ('aviso' as const) : undefined,
        testid: `disputas-pestana-${o.value}`,
      })),
    [filtro, disputes.length, conteoDeTodas],
  )

  // ── Mutaciones cableadas (refetch tras éxito) ─────────────────────────────
  const handleOpenDispute = useCallback(
    async (body: {
      debtorId: string
      reason: string
      disputedAmount?: number
    }) => {
      const res = await openDispute(body)
      if (res.ok) {
        // Saltar a la disputa recién creada: es lo que la persona acaba de
        // hacer, no tiene por qué buscarla en la lista.
        if (res.data?.dispute?.id) setSeleccionadaId(res.data.dispute.id)
        // Revisora r25 (Disputas #4): registrar se confirma con un aviso.
        toast.success('Disputa registrada: quedó abierta para que una persona la revise.')
        void refetch()
      }
      return {
        ok: res.ok,
        status: res.status,
        persisted: res.data?.persisted ?? false,
        fallo: res.fallo,
        error: res.error,
      }
    },
    [openDispute, refetch],
  )

  const handleResolveDispute = useCallback(
    async (
      id: string,
      body: { outcome: DisputeOutcome; resolutionNote: string },
    ) => {
      // T-323: la resolución exige el userId del operador humano.
      const resolvedByUserId = authUser?.id ?? ''
      const res = await resolveDispute(id, { ...body, resolvedByUserId })
      if (res.ok) void refetch()
      return {
        ok: res.ok,
        status: res.status,
        recommendation: res.data?.recommendation ?? null,
        fallo: res.fallo,
        error: res.error,
      }
    },
    [resolveDispute, refetch, authUser?.id],
  )

  const elegir = useCallback((d: CobranzaDispute) => {
    setSeleccionadaId(d.id)
    setVerDetalleEnMovil(true)
  }, [])

  // ── Header (compartido) ────────────────────────────────────────────────────
  const header = (
    <EncabezadoDePantalla
      seccion="Cobranza"
      titulo="Disputas"
      descripcion="Lo que los deudores discuten de su saldo o de un cargo. Las abre y las resuelve una persona."
      accionPrincipal={
        puedeActuar && !sinPermiso ? (
          <Button
            size="sm"
            hideArrow
            onClick={() => setAbrirOpen(true)}
            data-testid="disputa-abrir"
            className="shrink-0"
          >
            Abrir disputa
          </Button>
        ) : undefined
      }
    />
  )

  // ── Primer load ────────────────────────────────────────────────────────────
  // Movimiento: cargando → disputas en un `CrossFade` (el mismo nodo en las
  // dos ramas); lo que ya estaba al montarse no se anima.
  if (isLoading && disputes.length === 0 && !error) {
    return (
      <CrossFade swapKey="cargando">
      <div className="p-6 lg:p-8 space-y-6">
        {header}
        {/* C6 (r25): esqueleto con la forma de la tabla, no una rueda. */}
        <Card className="overflow-hidden" aria-busy="true"><EsqueletoTabla columnas={5} filas={5} /></Card>
      </div>
      </CrossFade>
    )
  }

  return (
    <CrossFade swapKey="disputas">
    <div className="p-6 lg:p-8 space-y-6">
      {header}

      {/* Error de carga. Cuando falla, ABAJO no puede decirse «no hay
          disputas»: no sabemos si hay o no. C5 (r25): FalloDeCarga, con su
          reintento; sin el permiso, el porqué y a quién pedírselo. */}
      {sinPermiso ? (
        <Card className="flex items-start gap-3 px-5 py-4" role="status" data-testid="disputas-fallo">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
          <p className="text-body-sm text-fg-muted">
            Tu rol no puede ver las disputas: las abre y las resuelve quien gestiona la cobranza. Si
            las necesitas, pídele el acceso a un administrador.
          </p>
        </Card>
      ) : hayError ? (
        <div data-testid="disputas-fallo">
          <FalloDeCarga error={fallo ?? error} queEs="las disputas" onReintentar={() => refetch()} />
        </div>
      ) : (
        /* C3 (r25): LA RESPUESTA y las pestañas DENTRO de la tarjeta, y la lista
           con su detalle en la misma tarjeta. Sin tramos: «Abiertas · Resueltas»
           eran los mismos conteos de las pestañas y no sumaban el total (las «en
           revisión» quedaban fuera); ahora se dicen en el contexto. */
        <Card className="overflow-hidden">
          {conteoDeTodas && conteoDeTodas.total > 0 ? (
            <CifraHeroe
              className="border-b border-border px-5 pb-5 pt-5 sm:px-6"
              data-testid="disputas-abiertas"
              tamano="mediana"
              rotulo={plataEnDisputa > 0 ? 'En disputa, sin resolver' : 'La disputa más vieja sin resolver espera'}
              cifra={
                plataEnDisputa > 0
                  ? formatCurrency(plataEnDisputa)
                  : colaSinResolver.masVieja === null
                    ? '—'
                    : diasEnPalabras(colaSinResolver.masVieja, true)
              }
              contexto={
                plataEnDisputa > 0 && colaSinResolver.masVieja !== null
                  ? colaSinResolver.masVieja === 0
                    ? 'la más vieja se abrió hoy'
                    : `la más vieja espera hace ${diasEnPalabras(colaSinResolver.masVieja, true)}`
                  : undefined
              }
              tramos={colaSinResolver.tramos}
              esCero={conteoDeTodas.open === 0 && conteoDeTodas.inReview === 0}
              cuandoEsCero="Ninguna disputa abierta: todas están resueltas."
            />
          ) : null}

          <div className="border-b border-border px-4 py-3">
            <PestanasDeEstado<EstadoFiltro>
              pestanas={pestanas}
              valor={filtro}
              onCambio={(v) => {
                setFiltro(v)
                setVerDetalleEnMovil(false)
              }}
              etiqueta="Filtrar disputas por estado"
            />
          </div>

          {disputes.length > 0 ? (
            <div className="border-b border-border px-4 py-3">
              <div className="relative w-full sm:w-64">
                <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
                <Input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar deudor"
                  aria-label="Buscar disputas por deudor"
                  className="pl-9"
                  data-testid="disputas-buscar"
                />
              </div>
            </div>
          ) : null}

          {/* Vacío ⇄ maestro-detalle: el uno sale y el otro entra. */}
          <CrossFade swapKey={disputes.length === 0 ? `vacio-${filtro}` : disputasVistas.length === 0 ? 'sin-resultados' : 'lista'}>
          {disputes.length > 0 && disputasVistas.length === 0 ? (
            <EmptyState
              icon={MagnifyingGlass}
              title="Ninguna disputa coincide con la búsqueda"
              description="Revisa el nombre del deudor o borra la búsqueda."
              primaryCta={{ label: 'Borrar la búsqueda', onClick: () => setBusqueda('') }}
            />
          ) : disputes.length === 0 ? (
            /* Revisora r25 (Disputas #3): el vacío ofrece la acción de esta
               pantalla, «Abrir disputa», no mandar a Casos. */
            <EmptyState
              icon={Scales}
              title={
                filtro === 'todas'
                  ? 'No hay disputas registradas'
                  : 'Sin disputas en este estado'
              }
              description={
                filtro === 'todas'
                  ? 'Cuando un deudor discuta su saldo o un cargo, ábrela aquí y resuélvela con un resultado y una nota. La ficha de cada deudor también muestra las suyas.'
                  : 'Cambia la pestaña para ver las demás, o abre una nueva.'
              }
              primaryCta={
                puedeActuar ? { label: 'Abrir disputa', onClick: () => setAbrirOpen(true) } : undefined
              }
            />
          ) : (
            /* Maestro-detalle: la lista elige, el panel muestra y resuelve. */
            <div className="lg:grid lg:grid-cols-[22rem_1fr] lg:items-start">
              {/* Lista — se oculta en móvil cuando hay un detalle abierto */}
              <div className={`lg:border-r lg:border-border ${verDetalleEnMovil ? 'hidden lg:block' : ''}`}>
                {/* `data-lenis-prevent`: Lenis escucha la rueda en `window`, así
                    que sin esto la lista no scrollea dentro de su propia caja. */}
                {/* Revisora r27 (UI): sin caja con scroll propio dentro de una
                    página con scroll (dos barras a 1440); la lista se pagina. */}
                <div>
                  <DisputasList
                    disputes={pageItems}
                    selectedId={seleccionadaId}
                    onSelect={elegir}
                  />
                </div>

                {/* El pie va FUERA de la caja con scroll: se queda a la vista
                    mientras se recorre la lista. */}
                {shouldPaginate && (
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
                )}
              </div>

              {/* Detalle — en móvil reemplaza a la lista */}
              <div className={verDetalleEnMovil ? '' : 'hidden lg:block'}>
                <div className="lg:hidden border-b border-border p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    hideArrow
                    onClick={() => setVerDetalleEnMovil(false)}
                  >
                    Volver a la lista
                  </Button>
                </div>
                <DisputaDetailPanel
                  dispute={seleccionada}
                  onResolve={handleResolveDispute}
                />
              </div>
            </div>
          )}
          </CrossFade>
        </Card>
      )}

      {/* Alta — sigue siendo modal: es una creación, no una lectura */}
      <AbrirDisputaModal
        isOpen={abrirOpen}
        onClose={() => setAbrirOpen(false)}
        onSubmit={handleOpenDispute}
      />
    </div>
    </CrossFade>
  )
}

export default function DisputasPage() {
  return (
    <PageGuard module="cobranza">
      <DisputasContent />
    </PageGuard>
  )
}
