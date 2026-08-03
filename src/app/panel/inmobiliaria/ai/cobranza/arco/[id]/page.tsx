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

import { useState } from 'react'
import Link from 'next/link'
import { ArrowSquareOut } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { useArcoDetail } from '@/lib/hooks/cobranza/use-arco-detail'
import { useArcoGate } from '@/lib/hooks/cobranza/use-arco-gate'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { ArcoDetailTimeline } from '@/lib/hooks/cobranza/use-arco-detail'
import type { ArcoRequestRow } from '@/lib/hooks/cobranza/use-arco-requests'

// ─── DOT COLOR MAP ─────────────────────────────────────────────────────────────

const DOT_COLOR: Record<string, string> = {
  resolved: 'bg-success',
  in_progress: 'bg-primary',
  pending_email_verification: 'bg-warning',
  pending_admin_triage: 'bg-warning',
  pending_counsel_review: 'bg-warning',
  rejected: 'bg-danger',
}

// ─── TYPE BADGE COLORS (same as inbox) ─────────────────────────────────────────

const TYPE_COLORS: Record<ArcoRequestRow['type'], string> = {
  acceso: 'text-primary bg-primary-soft',
  rectificacion: 'text-fg-muted bg-surface-muted',
  cancelacion: 'text-warning bg-warning-soft',
  oposicion: 'text-danger bg-danger-soft',
}

// ─── STATUS TIMELINE ────────────────────────────────────────────────────────────

interface StatusTimelineProps {
  transitions: ArcoDetailTimeline[]
  requestId: string
  t: (key: string, opts?: Record<string, string>) => string
}

function StatusTimeline({ transitions, requestId, t }: StatusTimelineProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-xl font-semibold text-fg">
        {t('inmobiliaria.ai.arco.detail.timeline.title')}
      </h2>
      <ol className="space-y-2 mt-4">
        {transitions.map((step, idx) => {
          const dotColor = DOT_COLOR[step.status] ?? 'bg-fg-subtle'
          const isLast = idx === transitions.length - 1
          return (
            <li key={`${step.status}-${idx}`} className="flex gap-3 items-start">
              {/* Dot + connector */}
              <div className="flex flex-col items-center">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
                {!isLast && (
                  <div className="w-px flex-1 bg-surface-muted mt-1" />
                )}
              </div>
              {/* Entry body */}
              <div className="pb-4 min-w-0 flex-1">
                <p className="text-sm font-semibold text-fg">
                  {t(`inmobiliaria.ai.arco.status.${step.status}`)}
                </p>
                <p className="text-xs text-fg-muted font-mono tabular-nums">
                  {step.timestamp ? new Date(step.timestamp).toLocaleString() : '—'}
                </p>
                {/* Audit log chip — link to compliance audit filtered by this request */}
                <Link
                  href={`/panel/inmobiliaria/ai/cobranza/compliance/audit?arco_request_id=${requestId}`}
                  className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline mt-0.5"
                >
                  <ArrowSquareOut className="h-3 w-3" weight="regular" />
                  {t('inmobiliaria.ai.arco.detail.viewAudit')}
                </Link>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// ─── PER-TYPE RESOLVE FORM ──────────────────────────────────────────────────────

interface ResolveFormProps {
  type: ArcoRequestRow['type']
  disabled: boolean
  t: (key: string, opts?: Record<string, string>) => string
  onResolveData: (data: Record<string, string>) => void
}

function ResolveForm({ type, disabled, t, onResolveData }: ResolveFormProps) {
  const [url, setUrl] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [affectedRows, setAffectedRows] = useState('')
  const [reason, setReason] = useState('')

  const handleChange = () => {
    if (type === 'acceso') {
      onResolveData({ url, expires_at: expiresAt })
    } else if (type === 'rectificacion') {
      onResolveData({ affected_rows: affectedRows })
    } else {
      onResolveData({ reason })
    }
  }

  if (type === 'acceso') {
    return (
      <div className="space-y-4" onChange={handleChange}>
        <div className="space-y-1.5">
          <label className="text-xs text-fg-muted font-medium">
            {t('inmobiliaria.ai.arco.detail.resolve.fields.acceso.url')}
          </label>
          <Input
            type="url"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={disabled}
            className="min-h-[44px]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-fg-muted font-medium">
            {t('inmobiliaria.ai.arco.detail.resolve.fields.acceso.expires_at')}
          </label>
          <Input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            disabled={disabled}
            className="min-h-[44px]"
          />
        </div>
      </div>
    )
  }

  if (type === 'rectificacion') {
    return (
      <div className="space-y-1.5" onChange={handleChange}>
        <label className="text-xs text-fg-muted font-medium">
          {t('inmobiliaria.ai.arco.detail.resolve.fields.rectificacion.affectedRows')}
        </label>
        <Input
          type="number"
          min={0}
          value={affectedRows}
          onChange={(e) => setAffectedRows(e.target.value)}
          disabled={disabled}
          className="min-h-[44px]"
        />
      </div>
    )
  }

  // cancelacion | oposicion
  return (
    <div className="space-y-1.5" onChange={handleChange}>
      <label className="text-xs text-fg-muted font-medium">
        {t(`inmobiliaria.ai.arco.detail.resolve.fields.${type}.reason`)}
      </label>
      <Textarea
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
  type: ArcoRequestRow['type']
  gateBlocked: boolean
  detailRefetch: () => Promise<void>
  t: (key: string, opts?: Record<string, string>) => string
}

function ResolvePanel({ requestId, type, gateBlocked, detailRefetch, t }: ResolvePanelProps) {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [isResolving, setIsResolving] = useState(false)
  const [resolveData, setResolveData] = useState<Record<string, string>>({})

  const handleResolve = async () => {
    if (!agencyId) return
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) return
    setIsResolving(true)
    try {
      await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/arco-requests/${requestId}/resolve`,
        {
          method: 'POST',
          headers: agentAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(resolveData),
        },
      )
      await detailRefetch()
    } finally {
      setIsResolving(false)
    }
  }

  const handleReject = async () => {
    if (!agencyId) return
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) return
    try {
      await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/arco-requests/${requestId}/reject`,
        {
          method: 'POST',
          headers: agentAuthHeaders(),
        },
      )
      await detailRefetch()
    } catch {
      // non-fatal — detailRefetch will update state
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <h2 className="text-xl font-semibold text-fg">
        {t('inmobiliaria.ai.arco.detail.resolve.title')}
      </h2>

      {/* Counsel gate inline Alert — D-36-05: NOT a redirect, NOT a toast */}
      {gateBlocked && (
        <Alert className="bg-warning-soft border border-warning/30 text-warning">
          <AlertTitle>{t('inmobiliaria.ai.arco.counselGate.title')}</AlertTitle>
          <AlertDescription>{t('inmobiliaria.ai.arco.counselGate.description')}</AlertDescription>
        </Alert>
      )}

      {/* Per-type resolve form */}
      <ResolveForm
        type={type}
        disabled={gateBlocked}
        t={t}
        onResolveData={setResolveData}
      />

      {/* Resolve CTA */}
      <Button
        variant="default"
        disabled={gateBlocked || isResolving}
        onClick={() => void handleResolve()}
        className={`w-full min-h-[44px] ${gateBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {t('inmobiliaria.ai.arco.resolve')}
      </Button>

      {/* Reject CTA — shadcn AlertDialog confirmation (XR-03 / D-36-05) */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full min-h-[44px]"
          >
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
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleReject()}
              tone="danger"
            >
              {t('inmobiliaria.ai.arco.rejectDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── REQUESTER SIDEBAR ──────────────────────────────────────────────────────────

interface RequesterSidebarProps {
  detail: import('@/lib/hooks/cobranza/use-arco-detail').ArcoDetailData
  t: (key: string, opts?: Record<string, string>) => string
}

function RequesterSidebar({ detail, t }: RequesterSidebarProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <h2 className="text-xl font-semibold text-fg">
        {t('inmobiliaria.ai.arco.detail.requester.title')}
      </h2>
      <dl className="space-y-3">
        {/* Nombre */}
        <div>
          <dt className="text-xs text-fg-muted">
            {t('inmobiliaria.ai.arco.detail.requester.name')}
          </dt>
          <dd className="text-sm text-fg mt-0.5">
            {detail.requesterName}
          </dd>
        </div>
        {/* Cédula — masked, list-level (T-36-08-01) */}
        <div>
          <dt className="text-xs text-fg-muted">
            {t('inmobiliaria.ai.arco.detail.requester.cedula')}
          </dt>
          <dd className="text-sm mt-0.5">
            <Mask field="cedula" value={detail.requesterCedulaHash} />
          </dd>
        </div>
        {/* Email — full, per UI-SPEC */}
        <div>
          <dt className="text-xs text-fg-muted">
            {t('inmobiliaria.ai.arco.detail.requester.email')}
          </dt>
          <dd className="text-sm text-fg mt-0.5">
            {detail.requesterEmail}
          </dd>
        </div>
        {/* Tipo */}
        <div>
          <dt className="text-xs text-fg-muted">
            {t('inmobiliaria.ai.arco.detail.requester.type')}
          </dt>
          <dd className="mt-0.5">
            <span
              className={`inline-flex items-center text-xs font-medium rounded-full px-2 py-0.5 ${TYPE_COLORS[detail.type]}`}
            >
              {t(`inmobiliaria.ai.arco.type.${detail.type}`)}
            </span>
          </dd>
        </div>
        {/* Descripción */}
        <div>
          <dt className="text-xs text-fg-muted">
            {t('inmobiliaria.ai.arco.detail.requester.description')}
          </dt>
          <dd className="text-sm text-fg-muted mt-0.5 max-h-40 overflow-y-auto">
            {detail.subjectDescription}
          </dd>
        </div>
        {/* Enviada */}
        <div>
          <dt className="text-xs text-fg-muted">
            {t('inmobiliaria.ai.arco.detail.requester.submitted')}
          </dt>
          <dd className="text-xs font-mono tabular-nums text-fg-muted mt-0.5">
            {new Date(detail.submittedAt).toLocaleString()}
          </dd>
        </div>
        {/* Verificada */}
        <div>
          <dt className="text-xs text-fg-muted">
            {t('inmobiliaria.ai.arco.detail.requester.verified')}
          </dt>
          <dd className="text-xs font-mono tabular-nums text-fg-muted mt-0.5">
            {detail.emailVerifiedAt
              ? new Date(detail.emailVerifiedAt).toLocaleString()
              : <span className="text-fg-subtle">{t('inmobiliaria.ai.arco.detail.requester.pending')}</span>}
          </dd>
        </div>
      </dl>
    </div>
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

  const { request: detail, timeline } = data

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Back link + page title */}
      <div className="flex items-center gap-3">
        <Link
          href="/panel/inmobiliaria/ai/cobranza/arco"
          className="text-xs text-primary underline-offset-4 hover:underline"
        >
          ← {t('inmobiliaria.ai.arco.detail.backToInbox')}
        </Link>
      </div>
      <h1 className="text-3xl font-semibold text-fg">
        {t('inmobiliaria.ai.arco.detail.title')}
      </h1>

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
