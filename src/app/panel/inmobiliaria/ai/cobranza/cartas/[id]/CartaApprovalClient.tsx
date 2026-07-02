'use client'

/**
 * CartaApprovalClient — Phase 32 plan 32-09 (COBR-UI-08, XR-05).
 *
 * Operator approval surface for an AI-proposed pre-judicial letter:
 *   - PDF preview iframe (legal-artifacts/:id/pdf).
 *   - physicalSendMethod dropdown + sentToAddress input (UI gate per plan;
 *     not yet on the wire — see use-carta-approval.ts deviation note).
 *   - Aprobar button (gated on canAccess('cobranza','approve') + both
 *     UI fields populated).
 *   - Download link card (amber legal notice + 7-day TTL countdown) renders
 *     after approveResult is non-null; pdfDownloadUrl = response.signedUrl.
 *   - Rechazar shared inline form.
 */

import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { Button, Input } from '@/components/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCartaApproval,
  type CartaPhysicalSendMethod,
} from '@/lib/hooks/cobranza/use-carta-approval'
import {
  RechazarForm,
  type RejectReasonSlug,
} from '@/components/inmobiliaria/cobranza/approval/RechazarForm'

void React

const SEND_METHODS: ReadonlyArray<CartaPhysicalSendMethod> = [
  'servicio_472',
  'email_only',
  'operator_manual',
]

// Map slug → i18n suffix (matches inmobiliaria.ai.cobranza.cartas.physicalSend.*).
const SEND_METHOD_I18N: Record<CartaPhysicalSendMethod, string> = {
  servicio_472: 'servicio472',
  email_only: 'emailOnly',
  operator_manual: 'operatorManual',
}

interface Props {
  artifactId: string
}

function computeDaysRemaining(approvedAt: Date | null, now: Date): number {
  if (!approvedAt) return 0
  const elapsedMs = now.getTime() - approvedAt.getTime()
  return Math.max(0, 7 - Math.floor(elapsedMs / (1000 * 60 * 60 * 24)))
}

export default function CartaApprovalClient({ artifactId }: Props) {
  const { t } = useI18n()
  const router = useRouter()
  const { agency, isLoading: authLoading } = useAuth()
  const { canAccess } = usePermissionsContext()
  const canApprove = canAccess('cobranza', 'approve')

  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
  const agencyId = agency?.id ?? null
  const envMissing = !agentUrl || !agencyId

  const {
    isApproving,
    isRejecting,
    approveResult,
    rejectResult,
    approveError,
    rejectError,
    pdfDownloadUrl,
    pdfApprovedAt,
    approve,
    reject,
  } = useCartaApproval()

  const [sendMethod, setSendMethod] = useState<CartaPhysicalSendMethod | ''>('')
  const [sentToAddress, setSentToAddress] = useState<string>('')
  const [rechazarOpen, setRechazarOpen] = useState<boolean>(false)

  // Hourly tick for TTL countdown.
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    if (!pdfApprovedAt) return
    const id = setInterval(() => setNow(new Date()), 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [pdfApprovedAt])

  const pdfSrc = useMemo(() => {
    if (envMissing) return ''
    return `${agentUrl}/api/agency/${agencyId}/cartera/legal-artifacts/${artifactId}/pdf`
  }, [agentUrl, agencyId, artifactId, envMissing])

  // The PDF endpoint is Bearer-only; an <iframe src> navigation carries no
  // Authorization header and 401'd (blank preview). Fetch the bytes with the
  // bearer header and render an object URL instead. (The post-approve download
  // link below uses a presigned S3 URL and must stay a plain href — untouched.)
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState(false)

  useEffect(() => {
    if (!pdfSrc) return
    let cancelled = false
    let objectUrl: string | null = null
    setPdfError(false)
    setPdfBlobUrl(null)
    void (async () => {
      try {
        const res = await globalThis.fetch(pdfSrc, { headers: agentAuthHeaders() })
        if (!res.ok) throw new Error(`pdf ${res.status}`)
        const blob = await res.blob()
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setPdfBlobUrl(objectUrl)
      } catch {
        if (!cancelled) setPdfError(true)
      }
    })()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [pdfSrc])

  // Navigate back after rejectResult lands.
  useEffect(() => {
    if (rejectResult?.ok) {
      const timer = setTimeout(() => router.back(), 1500)
      return () => clearTimeout(timer)
    }
  }, [rejectResult, router])

  // Phase 38-05a: skeleton during initial auth hydration (first loading state on this page)
  if (authLoading && !agency) return <PageSkeleton variant="detail" />

  if (envMissing) {
    return (
      <div className="p-4 lg:p-8">
        <div className="rounded-md border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          {t('inmobiliaria.ai.cobranza.cartas.envMissing')}
        </div>
      </div>
    )
  }

  const aprobarDisabled =
    !canApprove ||
    !sendMethod ||
    !sentToAddress.trim() ||
    isApproving ||
    approveResult !== null
  const rechazarDisabled = !canApprove || isRejecting || rejectResult?.ok === true

  const handleAprobar = async (): Promise<void> => {
    if (aprobarDisabled || !sendMethod) return
    await approve(artifactId, sendMethod, sentToAddress.trim())
  }

  const handleRechazarSubmit = async (data: {
    reject_reason: RejectReasonSlug
    reject_comment?: string
  }): Promise<void> => {
    await reject(artifactId, data.reject_reason, data.reject_comment)
    setRechazarOpen(false)
  }

  const daysRemaining = computeDaysRemaining(pdfApprovedAt, now)

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Back */}
      <div className="flex items-center justify-between">
        <Button
          variant="link"
          size="sm"
          hideArrow
          data-testid="carta-back"
          onClick={() => router.back()}
          className="h-auto p-0 font-normal text-fg-muted hover:text-fg"
        >
          ← {t('inmobiliaria.ai.cobranza.cartas.back')}
        </Button>
      </div>
      <header>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          {t('inmobiliaria.ai.cobranza.cartas.title')}
        </h1>
      </header>

      {/* PDF preview iframe */}
      <section
        aria-label={t('inmobiliaria.ai.cobranza.cartas.pdfPreview.title')}
        className="space-y-2"
      >
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {t('inmobiliaria.ai.cobranza.cartas.pdfPreview.title')}
        </h2>
        <iframe
          data-testid="carta-pdf-preview"
          title={t('inmobiliaria.ai.cobranza.cartas.pdfPreview.title')}
          src={pdfBlobUrl ?? 'about:blank'}
          loading="lazy"
          className="w-full h-96 rounded border border-neutral-200 dark:border-neutral-800"
        />
        {pdfError && (
          <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {t('inmobiliaria.ai.cobranza.cartas.pdfPreview.error')}
          </div>
        )}
      </section>

      {/* Pre-approve form */}
      <section className="space-y-3 rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="space-y-1">
          <span className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">
            {t('inmobiliaria.ai.cobranza.cartas.physicalSend.label')}
          </span>
          <Select
            value={sendMethod || undefined}
            onValueChange={(v) => setSendMethod(v as CartaPhysicalSendMethod)}
            disabled={approveResult !== null}
          >
            <SelectTrigger data-testid="carta-send-method">
              <SelectValue
                placeholder={t('inmobiliaria.ai.cobranza.cartas.physicalSend.placeholder')}
              />
            </SelectTrigger>
            <SelectContent>
              {SEND_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {t(
                    `inmobiliaria.ai.cobranza.cartas.physicalSend.${SEND_METHOD_I18N[m]}`,
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">
          {t('inmobiliaria.ai.cobranza.cartas.sentToAddress.label')}
          <Input
            type="text"
            data-testid="carta-sent-to-address"
            value={sentToAddress}
            onChange={(e) => setSentToAddress(e.target.value)}
            placeholder={t(
              'inmobiliaria.ai.cobranza.cartas.sentToAddress.placeholder',
            )}
            disabled={approveResult !== null}
            className="mt-1 block w-full"
          />
        </label>
      </section>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          data-testid="approval-aprobar-carta"
          onClick={() => void handleAprobar()}
          disabled={aprobarDisabled}
          isLoading={isApproving}
          hideArrow
          title={
            !canApprove
              ? t('inmobiliaria.ai.cobranza.cartas.permissionTooltip')
              : undefined
          }
        >
          {isApproving
            ? t('inmobiliaria.ai.cobranza.cartas.aprobar.submitting')
            : t('inmobiliaria.ai.cobranza.cartas.aprobar.label')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          data-testid="approval-rechazar-carta"
          onClick={() => setRechazarOpen((v) => !v)}
          disabled={rechazarDisabled}
          hideArrow
          title={
            !canApprove
              ? t('inmobiliaria.ai.cobranza.cartas.permissionTooltip')
              : undefined
          }
        >
          {t('inmobiliaria.ai.cobranza.cartas.rechazar.label')}
        </Button>
      </div>

      {approveError && (
        <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {approveError}
        </div>
      )}
      {rejectError && (
        <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {rejectError}
        </div>
      )}
      {rejectResult?.ok && (
        <div className="rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">
          {t('inmobiliaria.ai.cobranza.cartas.rechazar.success')}
        </div>
      )}

      {/* Post-approve download card */}
      {approveResult && pdfDownloadUrl && (
        <section
          data-testid="carta-download-card"
          className="space-y-3 rounded-md border-l-4 border-warning bg-warning-soft p-4"
        >
          <h2 className="text-sm font-semibold text-warning">
            {t('inmobiliaria.ai.cobranza.cartas.aprobar.success.title')}
          </h2>
          <p
            data-testid="carta-legal-notice"
            className="text-sm text-warning"
          >
            {t('inmobiliaria.ai.cobranza.cartas.aprobar.legalNotice')}
          </p>
          <a
            href={pdfDownloadUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            data-testid="carta-download-link"
            className="inline-flex items-center rounded-md bg-warning px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {t('inmobiliaria.ai.cobranza.cartas.aprobar.download.label')} →
          </a>
          <div className="text-xs text-warning">
            {t('inmobiliaria.ai.cobranza.cartas.aprobar.download.ttl', {
              days: daysRemaining,
            })}
          </div>
        </section>
      )}

      {/* Inline Rechazar form */}
      {rechazarOpen && !rejectResult?.ok && (
        <RechazarForm
          decisionType="carta"
          onSubmit={(data) => void handleRechazarSubmit(data)}
          onCancel={() => setRechazarOpen(false)}
          isSubmitting={isRejecting}
        />
      )}
    </div>
  )
}
