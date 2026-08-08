'use client'

/**
 * ARCO Detail Page — Phase 36 plan 36-08.
 *
 * Two-column layout (md+): status timeline on the left, requester info
 * sidebar on the right. Left column also holds the resolve panel with
 * the two-key counsel gate (inline amber Alert) and per-type form.
 *
 * Requirements: COBR-UI-12, XR-03
 * Decisions: D-36-03 (counsel gate), D-36-05 (inline Alert, never redirect),
 *            D-36-10 (audit log chip), D-36-11, D-36-12
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowSquareOut } from '@phosphor-icons/react'
import { toast } from 'sonner'

import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { useArcoDetail } from '@/lib/hooks/cobranza/use-arco-detail'
import { useArcoGate } from '@/lib/hooks/cobranza/use-arco-gate'
import { SlaCountdownBadge } from '@/components/inmobiliaria/cobranza/SlaCountdownBadge'
import { ArcoStatusBadge } from '@/components/inmobiliaria/cobranza/ArcoStatusBadge'
import { BackButton } from '@/components/ui/back-button'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
// Piezas que resuelve el design system: no rehacerlas a mano.
import {
  Card,
  KeyValueList,
  MonoLabel,
  Timeline,
  type KeyValueItem,
  type TimelineEntry,
} from '@leasefy/cadence'
import type { ArcoDetailTimelineEntry } from '@/lib/hooks/cobranza/use-arco-detail'
import type { ArcoRequestType } from '@/lib/hooks/cobranza/use-arco-requests'

/** Mismo mapeo tipo → variante de badge que la bandeja, para no divergir. */
const TYPE_VARIANT: Record<ArcoRequestType, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  acceso: 'default',
  rectificacion: 'secondary',
  cancelacion: 'warning',
  oposicion: 'destructive',
}

/**
 * Base de las acciones sobre una solicitud.
 *
 * El agente monta este router en `/api/agency/:agencyId/arco` (ver su
 * `index.ts`), NO en `/api/agency/:agencyId/cobranza/arco-requests`, que era a
 * donde apuntaban los botones: los POST caían en un 404 y, como nadie miraba
 * `res.ok`, la pantalla se comportaba como si hubieran funcionado.
 */
function useArcoActionBase(requestId: string): string | null {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  if (!agencyId) return null
  return `${process.env.NEXT_PUBLIC_AGENT_URL}/api/agency/${agencyId}/arco/requests/${requestId}`
}

// ─── FORMATO DE FECHAS ──────────────────────────────────────────────────────────

/**
 * Los segundos no aportan nada a un plazo que se cuenta en días hábiles, y
 * `toLocaleString('es-CO')` los mete siempre («14/7/2026, 4:04:24 p. m.»).
 *
 * Van dos formatos porque las dos columnas no miden lo mismo: el timeline tiene
 * ancho de sobra y lleva el año completo; la ficha de la derecha son 320px y con
 * el año de cuatro cifras la etiqueta se truncaba.
 */
const timelineDateTime = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

const shortDateTime = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

// ─── STATUS TIMELINE ────────────────────────────────────────────────────────────

interface StatusTimelineProps {
  transitions: ArcoDetailTimelineEntry[]
  requestId: string
  t: (key: string, opts?: Record<string, string>) => string
}

/**
 * Usa el `Timeline` de Cadence: los puntos, el conector vertical y la
 * tipografía los resuelve el DS. Antes era una `<ol>` con puntos y una línea de
 * 1px dibujados a mano, más un mapa de colores propio.
 *
 * El enlace a auditoría es UNO solo al pie, no uno por evento: la URL es
 * idéntica en todos (filtra por la solicitud entera), así que repetirla en cada
 * fila era ruido.
 */
function StatusTimeline({ transitions, requestId, t }: StatusTimelineProps) {
  const entries: TimelineEntry[] = transitions.map((step, idx) => ({
    id: `${step.event}-${idx}`,
    label: t(`inmobiliaria.ai.arco.detail.timeline.event.${step.event}`),
    timestamp: step.at ? timelineDateTime.format(new Date(step.at)) : '—',
    // El último evento es el estado en el que está la solicitud ahora.
    current: idx === transitions.length - 1,
  }))

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-fg">
        {t('inmobiliaria.ai.arco.detail.timeline.title')}
      </h2>

      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-fg-muted">
          {t('inmobiliaria.ai.arco.detail.timeline.empty')}
        </p>
      ) : (
        <>
          <Timeline entries={entries} className="mt-4" />
          <Link
            href={`/panel/inmobiliaria/ai/cobranza/compliance/audit?arco_request_id=${requestId}`}
            className="mt-4 inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
          >
            <ArrowSquareOut className="h-3 w-3" weight="regular" aria-hidden="true" />
            {t('inmobiliaria.ai.arco.detail.viewAudit')}
          </Link>
        </>
      )}
    </Card>
  )
}

// ─── PER-TYPE RESOLVE FORM ──────────────────────────────────────────────────────

/**
 * Cuerpo del POST de resolución, por tipo de solicitud. Los nombres NO son
 * libres: el agente valida con un Zod distinto según el tipo
 * (`ResolveBodyAcceso` / `ResolveBodyRectificacion`), y un campo mal nombrado
 * o de otro tipo devuelve 400.
 *
 * Lo que había antes no validaba en ningún caso: mandaba `url` donde el back
 * espera `presigned_url`, `affected_rows` como texto donde espera un número, y
 * nunca mandaba `fields_modified`, que es obligatorio.
 */
type ResolvePayload =
  | { presigned_url: string; expires_at: string }
  | { affected_rows: number; fields_modified: string[] }
  | { reason: string }
  | Record<string, never>

interface ResolveFormProps {
  type: ArcoRequestType
  disabled: boolean
  t: (key: string, opts?: Record<string, string>) => string
  onResolveData: (data: ResolvePayload) => void
}

function ResolveForm({ type, disabled, t, onResolveData }: ResolveFormProps) {
  const [url, setUrl] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [affectedRows, setAffectedRows] = useState('')
  const [fieldsModified, setFieldsModified] = useState('')
  const [reason, setReason] = useState('')

  /**
   * Se recalcula en cada render en vez de en un `onChange` del contenedor: el
   * `onChange` que había sólo se dispara con eventos que burbujean, así que el
   * último carácter tecleado podía quedar fuera del payload.
   */
  useEffect(() => {
    if (type === 'acceso') {
      onResolveData({ presigned_url: url, expires_at: expiresAt })
    } else if (type === 'rectificacion') {
      onResolveData({
        affected_rows: Number(affectedRows) || 0,
        // El back exige al menos un campo; se escriben separados por coma.
        fields_modified: fieldsModified
          .split(',')
          .map((f) => f.trim())
          .filter(Boolean),
      })
    } else {
      onResolveData({ reason })
    }
  }, [type, url, expiresAt, affectedRows, fieldsModified, reason, onResolveData])

  if (type === 'acceso') {
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="arco-url" className="text-xs font-medium text-fg-muted">
            {t('inmobiliaria.ai.arco.detail.resolve.fields.acceso.url')}
          </label>
          <Input
            id="arco-url"
            type="url"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="arco-expires" className="text-xs font-medium text-fg-muted">
            {t('inmobiliaria.ai.arco.detail.resolve.fields.acceso.expires_at')}
          </label>
          <Input
            id="arco-expires"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
    )
  }

  if (type === 'rectificacion') {
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="arco-rows" className="text-xs font-medium text-fg-muted">
            {t('inmobiliaria.ai.arco.detail.resolve.fields.rectificacion.affectedRows')}
          </label>
          <Input
            id="arco-rows"
            type="number"
            min={0}
            value={affectedRows}
            onChange={(e) => setAffectedRows(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="arco-fields" className="text-xs font-medium text-fg-muted">
            {t('inmobiliaria.ai.arco.detail.resolve.fields.rectificacion.fieldsModified')}
          </label>
          <Input
            id="arco-fields"
            value={fieldsModified}
            onChange={(e) => setFieldsModified(e.target.value)}
            disabled={disabled}
            placeholder={t('inmobiliaria.ai.arco.detail.resolve.fields.rectificacion.fieldsPlaceholder')}
          />
        </div>
      </div>
    )
  }

  // cancelacion | oposicion
  return (
    <div className="space-y-1.5">
      <label htmlFor="arco-reason" className="text-xs font-medium text-fg-muted">
        {t(`inmobiliaria.ai.arco.detail.resolve.fields.${type}.reason`)}
      </label>
      <Textarea
        id="arco-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={disabled}
        className="min-h-[88px]"
        placeholder={t('inmobiliaria.ai.arco.detail.resolve.fields.reasonPlaceholder')}
      />
    </div>
  )
}

// ─── RESOLVE PANEL ──────────────────────────────────────────────────────────────

interface ResolvePanelProps {
  requestId: string
  type: ArcoRequestType
  gateBlocked: boolean
  detailRefetch: () => Promise<void>
  t: (key: string, opts?: Record<string, string>) => string
}

function ResolvePanel({ requestId, type, gateBlocked, detailRefetch, t }: ResolvePanelProps) {
  const [isResolving, setIsResolving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [resolveData, setResolveData] = useState<ResolvePayload>({})

  const actionBase = useArcoActionBase(requestId)

  const handleResolve = async () => {
    if (!actionBase) return
    setIsResolving(true)
    try {
      const res = await agentFetch(`${actionBase}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resolveData),
      })
      if (!res.ok) throw new Error(String(res.status))
      toast.success(t('inmobiliaria.ai.arco.toast.resolved'))
      await detailRefetch()
    } catch {
      // Una acción de cumplimiento que falla en silencio es peor que una que
      // no existe: el operador cree que respondió y el plazo sigue corriendo.
      toast.error(t('inmobiliaria.ai.arco.error.resolve'))
    } finally {
      setIsResolving(false)
    }
  }

  const handleReject = async () => {
    if (!actionBase) return
    setIsRejecting(true)
    try {
      const res = await agentFetch(`${actionBase}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rejectReason.trim() ? { reason: rejectReason.trim() } : {}),
      })
      if (!res.ok) throw new Error(String(res.status))
      toast.success(t('inmobiliaria.ai.arco.toast.rejected'))
      setRejectReason('')
      await detailRefetch()
    } catch {
      toast.error(t('inmobiliaria.ai.arco.error.reject'))
    } finally {
      setIsRejecting(false)
    }
  }

  const busy = isResolving || isRejecting

  return (
    <Card>
      <div className="space-y-4 p-5">
        <h2 className="text-lg font-semibold text-fg">
          {t('inmobiliaria.ai.arco.detail.resolve.title')}
        </h2>

        {/* Counsel gate inline Alert — D-36-05: NOT a redirect, NOT a toast */}
        {gateBlocked && (
          <Alert className="bg-warning-soft border border-warning/30 text-warning">
            <AlertTitle>{t('inmobiliaria.ai.arco.counselGate.title')}</AlertTitle>
            <AlertDescription>{t('inmobiliaria.ai.arco.counselGate.description')}</AlertDescription>
          </Alert>
        )}

        <ResolveForm
          type={type}
          disabled={gateBlocked || busy}
          t={t}
          onResolveData={setResolveData}
        />
      </div>

      {/* Pie de acciones: resolver a la derecha como acción principal, rechazar
          a la izquierda y discreto. Antes eran dos botones a todo el ancho,
          apilados y con el mismo peso — un patrón de formulario móvil que en un
          panel de escritorio hace que rechazar pese igual que resolver. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" hideArrow disabled={busy}>
              {t('inmobiliaria.ai.arco.reject')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('inmobiliaria.ai.arco.rejectDialog.title')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('inmobiliaria.ai.arco.rejectDialog.body')}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {/* El motivo queda en el `resolutionPayload` de la solicitud: es el
                sustento de por qué se rechazó. El back lo acepta opcional. */}
            <div className="space-y-1.5">
              <label htmlFor="arco-reject-reason" className="text-xs font-medium text-fg-muted">
                {t('inmobiliaria.ai.arco.rejectDialog.reasonLabel')}
              </label>
              <Textarea
                id="arco-reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                maxLength={1000}
                className="min-h-[88px]"
                placeholder={t('inmobiliaria.ai.arco.rejectDialog.reasonPlaceholder')}
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={() => void handleReject()} tone="danger">
                {t('inmobiliaria.ai.arco.rejectDialog.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          variant="default"
          hideArrow
          isLoading={isResolving}
          disabled={gateBlocked || busy}
          onClick={() => void handleResolve()}
        >
          {t('inmobiliaria.ai.arco.resolve')}
        </Button>
      </div>
    </Card>
  )
}

// ─── TOMAR LA SOLICITUD (TRIAGE) ────────────────────────────────────────────────

/**
 * Pasa la solicitud de «llegó y nadie la tomó» a «alguien la está trabajando»
 * (`pending_admin_triage` → `in_progress`) y deja el rastro en auditoría.
 *
 * El endpoint existía en el agente desde la fase 36 y ninguna pantalla lo
 * llamaba: una solicitud se quedaba en «sin tomar» hasta que alguien la
 * resolvía o la rechazaba, así que dos personas del mismo equipo no tenían cómo
 * saber si la otra ya la había agarrado.
 *
 * NO lo tapa el gate de asesor jurídico —ese sólo cubre `resolve`—, y es
 * deliberado: se puede tomar y estudiar una solicitud mientras jurídica
 * habilita la resolución.
 */
function TriageButton({
  requestId,
  detailRefetch,
  t,
}: {
  requestId: string
  detailRefetch: () => Promise<void>
  t: (key: string, opts?: Record<string, string>) => string
}) {
  const actionBase = useArcoActionBase(requestId)
  const [isBusy, setIsBusy] = useState(false)

  const handleTriage = async () => {
    if (!actionBase) return
    setIsBusy(true)
    try {
      const res = await agentFetch(`${actionBase}/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (!res.ok) throw new Error(String(res.status))
      toast.success(t('inmobiliaria.ai.arco.toast.triaged'))
      await detailRefetch()
    } catch {
      toast.error(t('inmobiliaria.ai.arco.error.triage'))
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Button
      variant="outline"
      hideArrow
      isLoading={isBusy}
      disabled={isBusy || !actionBase}
      onClick={() => void handleTriage()}
    >
      {t('inmobiliaria.ai.arco.triage')}
    </Button>
  )
}

// ─── REQUESTER SIDEBAR ──────────────────────────────────────────────────────────

interface RequesterSidebarProps {
  detail: import('@/lib/hooks/cobranza/use-arco-detail').ArcoDetailData
  t: (key: string, opts?: Record<string, string>) => string
}

/**
 * Ficha del solicitante.
 *
 * `KeyValueList` es el primitivo de **resumen financiero** del DS: etiqueta a la
 * izquierda que se trunca, valor a la derecha en mono, `tabular-nums` y
 * `shrink-0`. Está hecho para cifras cortas («$1.850.000», «12 días»), y por eso
 * el valor nunca se encoge.
 *
 * Meterle texto libre lo rompía de dos maneras a la vez: el nombre de una
 * persona y un correo salían en mono —que en el DS significa «esto es un dato
 * técnico»—, y la descripción (hasta 2.000 caracteres, `arco-public.ts:167`) se
 * desbordaba fuera de la tarjeta porque `shrink-0` no la deja envolver.
 *
 * Así que el texto libre sale del KeyValueList: identidad arriba en prosa,
 * descripción abajo en su propio bloque, y en el KeyValueList quedan sólo los
 * cuatro pares que sí son datos cortos.
 */
function RequesterSidebar({ detail, t }: RequesterSidebarProps) {
  // El endpoint de detalle no expone `submittedAt` / `emailVerifiedAt` sueltos:
  // ambas fechas viven dentro del timeline, así que se leen de ahí.
  const submittedAt = detail.timeline.find((e) => e.event === 'submitted')?.at ?? null
  const verifiedAt = detail.timeline.find((e) => e.event === 'email_verified')?.at ?? null

  const fecha = (iso: string | null) =>
    iso ? (
      <span className="font-mono text-xs tabular-nums">
        {shortDateTime.format(new Date(iso))}
      </span>
    ) : (
      <span className="text-fg-subtle">—</span>
    )

  const items: KeyValueItem[] = [
    {
      label: t('inmobiliaria.ai.arco.detail.requester.type'),
      value: (
        <Badge variant={TYPE_VARIANT[detail.type]}>
          {t(`inmobiliaria.ai.arco.type.${detail.type}`)}
        </Badge>
      ),
    },
    {
      label: t('inmobiliaria.ai.arco.detail.requester.submitted'),
      value: fecha(submittedAt),
    },
    {
      label: t('inmobiliaria.ai.arco.detail.requester.verified'),
      value: verifiedAt ? (
        fecha(verifiedAt)
      ) : (
        <span className="text-xs text-fg-subtle">
          {t('inmobiliaria.ai.arco.detail.requester.pending')}
        </span>
      ),
    },
    {
      // El plazo decide la urgencia, así que va en la ficha y no sólo en la lista.
      label: t('inmobiliaria.ai.arco.detail.requester.slaTitle'),
      value: (
        <SlaCountdownBadge
          remainingDays={detail.slaRemainingDays}
          isClosed={detail.isClosed}
          isPaused={detail.status === 'pending_email_verification'}
        />
      ),
    },
  ]

  return (
    <Card className="space-y-4 p-5">
      <h2 className="text-lg font-semibold text-fg">
        {t('inmobiliaria.ai.arco.detail.requester.title')}
      </h2>

      {/* Identidad — texto libre, en prosa. `break-words` en el nombre y
          `break-all` en el correo: un correo largo no tiene espacios donde
          cortar, así que sin eso se sale de la tarjeta. */}
      <div className="space-y-1">
        <p className="break-words text-body-sm font-medium text-fg">
          {detail.requesterName}
        </p>
        <p className="break-all text-caption text-fg-muted">{detail.requesterEmail}</p>
        {/* La cédula sólo existe hasheada (se hashea al recibir la solicitud y
            el valor crudo no se vuelve a usar), así que se muestra una
            referencia corta, no un enmascarado que fingiría ser la cédula. */}
        <MonoLabel title={t('inmobiliaria.ai.arco.table.refHint')}>
          {t('inmobiliaria.ai.arco.table.ref')} {detail.cedulaRef}
        </MonoLabel>
      </div>

      <KeyValueList items={items} compact />

      {/* Lo que pide: prosa, no una cifra. Va a lo ancho de la tarjeta y
          envuelve.

          El texto va dentro de un pozo (`bg-surface-muted`) en vez de suelto
          sobre la tarjeta porque puede llegar a 2.000 caracteres y hay que
          recortarlo. Suelto, el recorte parte una línea por la mitad y parece
          que la pantalla se rompió; dentro de una caja se lee como lo que es,
          un panel con más contenido del que cabe.

          `data-lenis-prevent`: Lenis escucha la rueda en `window`, así que sin
          esto el scroll interno nunca le llega al panel. */}
      {detail.subjectDescription && (
        <div className="space-y-1.5 border-t border-border-faint pt-4">
          <MonoLabel>{t('inmobiliaria.ai.arco.detail.requester.description')}</MonoLabel>
          <p
            data-lenis-prevent
            // `rounded-sm` = 8px: Cadence remapea toda la escala de radios y
            // aquí `rounded-lg` son 22px, no los 8px de Tailwind por defecto.
            className="max-h-56 overflow-y-auto whitespace-pre-line break-words rounded-sm bg-surface-muted p-3 text-body-sm leading-relaxed text-fg"
          >
            {detail.subjectDescription}
          </p>
        </div>
      )}
    </Card>
  )
}

// ─── PAGE ────────────────────────────────────────────────────────────────────────

interface ArcoDetailPageProps {
  params: { id: string }
}

export default function ArcoDetailPage({ params }: ArcoDetailPageProps) {
  const { t } = useI18n()
  const { data, isLoading, error, refetch: detailRefetch } = useArcoDetail(params.id)
  const { data: gateData } = useArcoGate()

  const gateBlocked = gateData?.blocked ?? true // fail-closed: blocked until gate confirms otherwise

  // Loading skeleton (Phase 38-05a: PageSkeleton primitive)
  if (isLoading && !data) return <PageSkeleton variant="detail" />


  // Error state
  if (error) {
    return (
      <div className="p-4 md:p-6">
        <Alert variant="destructive">
          <AlertTitle>{t('common.error')}</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void detailRefetch()}
              className="min-h-[44px] shrink-0"
            >
              {t('common.retry')}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!data) return null

  // El agente devuelve el detalle PLANO (no `{ request, timeline }`), con el
  // timeline como una propiedad más. Ver `use-arco-detail.ts`.
  const detail = data
  const timeline = data.timeline

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Volver: primitivo del DS (`backButtonVariants` de Cadence), no un
          Link con una flecha escrita a mano. */}
      <BackButton
        variant="subtle"
        href="/panel/inmobiliaria/ai/cobranza/arco"
        label={t('inmobiliaria.ai.arco.detail.backToInbox')}
      />
      {/* El estado va acá arriba y no sólo en la bandeja: al abrir una
          solicitud no había forma de ver en qué estado está — había que
          deducirlo del último evento del timeline. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {t('inmobiliaria.ai.arco.detail.title')}
          </h1>
          <ArcoStatusBadge status={detail.status} />
        </div>
        {detail.status === 'pending_admin_triage' && (
          <TriageButton requestId={params.id} detailRefetch={detailRefetch} t={t} />
        )}
      </div>

      {/* Two-column layout: left (timeline + resolve panel), right (sidebar) */}
      <div className="grid md:grid-cols-[1fr_320px] gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          <StatusTimeline
            transitions={timeline}
            requestId={params.id}
            t={t}
          />
          <ResolvePanel
            requestId={params.id}
            type={detail.type}
            gateBlocked={gateBlocked}
            detailRefetch={detailRefetch}
            t={t}
          />
        </div>

        {/* RIGHT COLUMN — requester sidebar */}
        <div>
          <RequesterSidebar detail={detail} t={t} />
        </div>
      </div>
    </div>
  )
}
