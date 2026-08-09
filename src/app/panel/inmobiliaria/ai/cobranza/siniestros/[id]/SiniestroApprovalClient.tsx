'use client'

/**
 * SiniestroApprovalClient — Phase 32 plan 32-09 (COBR-UI-07, XR-05).
 *
 * Operator approval surface for an AI-proposed insurance claim filing:
 *   - PDF preview iframe (packet.pdf).
 *   - 4-insurer checkbox group (Sura / Mapfre / Solidaria / Acción) — all
 *     checked by default (operator can prune).
 *   - Aprobar / Rechazar buttons gated on canAccess('cobranza','approve').
 *   - Per-insurer result overlay after approve (filed/sent/error from
 *     CarteraSiniestroApproveResponse.insurerResults).
 *   - Inline RechazarForm (shared) on Rechazar click.
 *
 * Deferred per 32-CONTEXT: "Modificar antes de enviar" single-button
 * placeholder is not surfaced here.
 */

import * as React from 'react'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { Button, Checkbox } from '@/components/ui'
import { BackButton } from '@leasefy/cadence'
import {
  useSiniestroApproval,
  type SiniestroInsurer,
} from '@/lib/hooks/cobranza/use-siniestro-approval'
import {
  RechazarForm,
  type RejectReasonSlug,
} from '@/components/inmobiliaria/cobranza/approval/RechazarForm'

void React

const INSURERS: ReadonlyArray<SiniestroInsurer> = ['sura', 'mapfre', 'solidaria', 'accion']

interface Props {
  claimId: string
}

export default function SiniestroApprovalClient({ claimId }: Props) {
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
    approvedInsurers,
    approve,
    reject,
  } = useSiniestroApproval()

  const [selectedInsurers, setSelectedInsurers] = useState<SiniestroInsurer[]>([
    'sura',
    'mapfre',
    'solidaria',
    'accion',
  ])
  const [rechazarOpen, setRechazarOpen] = useState<boolean>(false)

  const pdfSrc = useMemo(() => {
    if (envMissing) return ''
    return `${agentUrl}/api/agency/${agencyId}/cartera/insurance-claims/${claimId}/packet.pdf`
  }, [agentUrl, agencyId, claimId, envMissing])

  // The PDF endpoint is Bearer-only; an <iframe src> navigation carries no
  // Authorization header and 401'd (blank preview). Fetch the bytes with the
  // bearer header and render an object URL instead.
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState(false)

  React.useEffect(() => {
    if (!pdfSrc) return
    let cancelled = false
    let objectUrl: string | null = null
    setPdfError(false)
    setPdfBlobUrl(null)
    void (async () => {
      try {
        const res = await agentFetch(pdfSrc)
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
  React.useEffect(() => {
    if (rejectResult?.ok) {
      const timer = setTimeout(() => router.back(), 1500)
      return () => clearTimeout(timer)
    }
  }, [rejectResult, router])

  // Phase 38-05a: skeleton during initial auth hydration (first loading state on
  // this page — useSiniestroApproval has no initial fetch, only mutation state).
  if (authLoading && !agency) return <PageSkeleton variant="detail" />

  if (envMissing) {
    return (
      <div className="p-4 lg:p-8">
        <div className="rounded-md border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          {t('inmobiliaria.ai.cobranza.siniestros.envMissing')}
        </div>
      </div>
    )
  }

  const toggleInsurer = (ins: SiniestroInsurer): void => {
    setSelectedInsurers((prev) =>
      prev.includes(ins) ? prev.filter((x) => x !== ins) : [...prev, ins],
    )
  }

  const aprobarDisabled =
    !canApprove || selectedInsurers.length === 0 || isApproving || approveResult !== null
  const rechazarDisabled = !canApprove || isRejecting || rejectResult?.ok === true

  const handleAprobar = async (): Promise<void> => {
    if (aprobarDisabled) return
    await approve(claimId, selectedInsurers)
  }

  const handleRechazarSubmit = async (data: {
    reject_reason: RejectReasonSlug
    reject_comment?: string
  }): Promise<void> => {
    await reject(claimId, data.reject_reason, data.reject_comment)
    setRechazarOpen(false)
  }

  // Per-insurer rows: prefer server-returned insurerResults, fall back to a
  // synthesized row per selected insurer in case the server returned a
  // shorter list. (See header note — server is the source of truth.)
  const insurerResultMap = new Map<string, { sent: boolean; error?: string }>()
  for (const r of approveResult?.insurerResults ?? []) {
    insurerResultMap.set(r.insurer, { sent: r.sent, error: r.error })
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header + Back */}
      <div className="flex items-center justify-between">
        <BackButton
          variant="subtle"
          data-testid="siniestro-back"
          onClick={() => router.back()}
          label={t('inmobiliaria.ai.cobranza.siniestros.back')}
        />
      </div>
      <header>
        <h1 className="text-2xl font-semibold text-fg">
          {t('inmobiliaria.ai.cobranza.siniestros.title')}
        </h1>
      </header>

      {/* PDF preview iframe */}
      <section
        aria-label={t('inmobiliaria.ai.cobranza.siniestros.pdfPreview.title')}
        className="space-y-2"
      >
        <h2 className="text-sm font-medium text-fg-muted">
          {t('inmobiliaria.ai.cobranza.siniestros.pdfPreview.title')}
        </h2>
        <iframe
          data-testid="siniestro-pdf-preview"
          title={t('inmobiliaria.ai.cobranza.siniestros.pdfPreview.title')}
          src={pdfBlobUrl ?? 'about:blank'}
          loading="lazy"
          className="w-full h-96 rounded border border-border"
        />
        {pdfError && (
          <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {t('inmobiliaria.ai.cobranza.siniestros.pdfPreview.error')}
          </div>
        )}
      </section>

      {/* Insurer checkbox group */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-fg-muted">
          {t('inmobiliaria.ai.cobranza.siniestros.insurers.title')}
        </h2>
        <div className="flex flex-wrap gap-3">
          {INSURERS.map((ins) => {
            const checked = selectedInsurers.includes(ins)
            return (
              <label
                key={ins}
                htmlFor={`siniestro-insurer-${ins}`}
                className="inline-flex items-center gap-2 rounded-sm border border-border bg-white px-3 py-2 text-sm text-fg-muted border-border"
              >
                <Checkbox
                  id={`siniestro-insurer-${ins}`}
                  data-testid={`siniestro-insurer-${ins}`}
                  checked={checked}
                  onCheckedChange={() => toggleInsurer(ins)}
                  disabled={isApproving || approveResult !== null}
                />
                {t(`inmobiliaria.ai.cobranza.siniestros.insurers.${ins}`)}
              </label>
            )
          })}
        </div>
        {selectedInsurers.length === 0 && (
          <div className="text-sm text-warning">
            {t('inmobiliaria.ai.cobranza.siniestros.insurers.atLeastOne')}
          </div>
        )}
      </section>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          data-testid="approval-aprobar-siniestro"
          onClick={() => void handleAprobar()}
          disabled={aprobarDisabled}
          isLoading={isApproving}
          hideArrow
          title={
            !canApprove
              ? t('inmobiliaria.ai.cobranza.siniestros.permissionTooltip')
              : undefined
          }
        >
          {isApproving
            ? t('inmobiliaria.ai.cobranza.siniestros.aprobar.submitting')
            : t('inmobiliaria.ai.cobranza.siniestros.aprobar.label')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          data-testid="approval-rechazar-siniestro"
          onClick={() => setRechazarOpen((v) => !v)}
          disabled={rechazarDisabled}
          hideArrow
          title={
            !canApprove
              ? t('inmobiliaria.ai.cobranza.siniestros.permissionTooltip')
              : undefined
          }
        >
          {t('inmobiliaria.ai.cobranza.siniestros.rechazar.label')}
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
          {t('inmobiliaria.ai.cobranza.siniestros.rechazar.success')}
        </div>
      )}

      {/* Per-insurer result overlay (post-approve) */}
      {approveResult && (
        <section
          data-testid="siniestro-results"
          className="space-y-2 rounded-md border border-success/30 bg-success-soft p-4"
        >
          <h2 className="text-sm font-semibold text-success">
            {approveResult.insurerResults.some((r) => !r.sent)
              ? t('inmobiliaria.ai.cobranza.siniestros.aprobar.success.partial')
              : t('inmobiliaria.ai.cobranza.siniestros.aprobar.success.title')}
          </h2>
          <ul className="divide-y divide-success/20">
            {approvedInsurers.map((ins) => {
              const result = insurerResultMap.get(ins)
              const sent = result?.sent ?? false
              return (
                <li
                  key={ins}
                  data-testid={`siniestro-result-${ins}`}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="font-medium text-fg">
                    {t(`inmobiliaria.ai.cobranza.siniestros.insurers.${ins}`)}
                  </span>
                  <span
                    className={sent ? 'text-success' : 'text-warning'}
                  >
                    {sent
                      ? `✓ ${t('inmobiliaria.ai.cobranza.siniestros.aprobar.success.title')}`
                      : `⚠ ${result?.error ?? t('inmobiliaria.ai.cobranza.siniestros.aprobar.success.partial')}`}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Inline Rechazar form */}
      {rechazarOpen && !rejectResult?.ok && (
        <RechazarForm
          decisionType="siniestro"
          onSubmit={(data) => void handleRechazarSubmit(data)}
          onCancel={() => setRechazarOpen(false)}
          isSubmitting={isRejecting}
        />
      )}

      {/*
        DEFERRED: Modificar button (single-button placeholder → note) deferred
        per 32-CONTEXT Deferred Ideas.
      */}
    </div>
  )
}
