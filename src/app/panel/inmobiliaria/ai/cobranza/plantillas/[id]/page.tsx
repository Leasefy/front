'use client'

/**
 * Template Detail Editor — Phase 36 plan 36-10 (COTI-UI-10, XR-03, XR-05, D-36-12)
 *
 * Sticky header: template name + status pill + live token-count badge +
 *   "Guardar borrador" (ghost/PUT) + "Publicar" (indigo/AlertDialog → POST /publish).
 *
 * Two-column body on md+:
 *   Left:  monospace <Textarea> editor with variable picker above it.
 *   Right: live preview panel with sample variable substitution.
 *
 * Token count debounced 300ms; thresholds amber ≥80% (1600/2000), rose ≥100% (2000/2000).
 *
 * WA section (only for category='whatsapp'):
 *   Shows Meta submission status pill + last-checked + "Actualizar estado" button.
 *   Rejected templates show a destructive Alert with rejection reason.
 *
 * Security (T-36-10-01): If draft contains unknown {{variable}} tokens (not in
 *   KNOWN_VARIABLES allowlist), shows amber Alert warning the admin before save.
 *   Server-side enforcement is in plan 36-05 backend (422 on unknown vars).
 *
 * Optimistic publish (T-36-10-02): Updates local status pill immediately;
 *   reverts to previous value on any 4xx response.
 *
 * All interactive elements: min-h-[44px] (XR-03).
 * All strings: t('inmobiliaria.ai.templates.*') (D-36-12, XR-05).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Clock,
  CheckCircle,
  WarningCircle,
} from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { useTemplates, type TemplateRow } from '@/lib/hooks/cobranza/use-templates'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { Textarea } from '@/components/ui/textarea'
import { Spinner, Badge } from '@/components/ui'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

// =============================================================================
// Constants
// =============================================================================

const TOKEN_BUDGET = 2000
const TOKEN_AMBER_THRESHOLD = 0.8 * TOKEN_BUDGET // 1600
const DEBOUNCE_MS = 300

/**
 * Known variable names (aligned with ALLOWED_VARIABLES in plan 36-05 backend).
 * These are the {{variable_name}} double-brace tokens the templates editor accepts.
 * Expand this list as new templates are authored in production.
 */
const KNOWN_VARIABLES: string[] = [
  // D-36-06 canonical variables
  'deudor_nombre',
  'deuda_total',
  'fecha_limite',
  'link_pago',
  'empresa_nombre',
  'numero_dias',
  'cuota_minima',
  'agente_nombre',
  // From cobranza scripts (single-brace named — also allowed in double-brace form)
  'deudor_name',
  'deudor_nombre_completo',
  'dias_mora',
  'monto_total',
  'monto_canones',
  'monto_descuento',
  'monto_descuento_total',
  'descuento_pct',
  'fecha_vencimiento',
  'fecha_limite_beneficio',
  'nombre_inmobiliaria',
  'num_contrato',
  'num_siniestro',
  'inmueble',
  'direccion_inmueble',
  'fiador_nombre',
  'interes_clause',
  'plan_agreed',
  'canon',
  'monto_intereses',
  // WA alias stubs
  'placeholder_1',
  'placeholder_2',
  'placeholder_3',
]

/**
 * Sample values for live preview substitution.
 * Used to replace {{variable_name}} with example text in the preview panel.
 */
const SAMPLE_VALUES: Record<string, string> = {
  deudor_nombre: 'María Pérez',
  deuda_total: '$850.000',
  fecha_limite: '15 de junio de 2026',
  link_pago: 'https://pago.ejemplo.co/abc123',
  empresa_nombre: 'Inmobiliaria Ejemplo',
  numero_dias: '30',
  cuota_minima: '$200.000',
  agente_nombre: 'Carlos Rodríguez',
  deudor_name: 'María',
  deudor_nombre_completo: 'María Pérez García',
  dias_mora: '45',
  monto_total: '$1.200.000',
  monto_canones: '$800.000',
  monto_descuento: '$120.000',
  monto_descuento_total: '$240.000',
  descuento_pct: '15%',
  fecha_vencimiento: '5 de junio de 2026',
  fecha_limite_beneficio: '30 de junio de 2026',
  nombre_inmobiliaria: 'Inmobiliaria Ejemplo S.A.S.',
  num_contrato: 'CTR-2024-0042',
  num_siniestro: 'SIN-2024-0018',
  inmueble: 'Apto 301, Cra 15 #72-40',
  direccion_inmueble: 'Cra 15 #72-40, Bogotá',
  fiador_nombre: 'Juan García',
  interes_clause: 'intereses de mora del 1.5% mensual',
  plan_agreed: 'tres cuotas de $283.333',
  canon: '$800.000',
  monto_intereses: '$42.000',
  placeholder_1: 'Variable 1',
  placeholder_2: 'Variable 2',
  placeholder_3: 'Variable 3',
}

// =============================================================================
// Token badge helpers
// =============================================================================

function tokenBadgeClass(count: number): string {
  if (count >= TOKEN_BUDGET) {
    return 'bg-danger-soft text-danger'
  }
  if (count >= TOKEN_AMBER_THRESHOLD) {
    return 'bg-warning-soft text-warning'
  }
  return 'bg-surface-muted text-fg-muted'
}

function estimateTokenCount(text: string): number {
  // chars/4 approximation (same proxy used in plan 36-05 backend)
  return Math.ceil(text.length / 4)
}

// =============================================================================
// Status pill
// =============================================================================

function StatusPill({
  status,
  t,
}: {
  status: 'draft' | 'published' | 'wa_pending'
  t: (k: string) => string
}) {
  if (status === 'published') {
    return (
      <Badge variant="success">
        {t('inmobiliaria.ai.templates.status.published')}
      </Badge>
    )
  }
  if (status === 'wa_pending') {
    return (
      <Badge variant="warning">
        <Clock className="h-3 w-3" weight="fill" />
        {t('inmobiliaria.ai.templates.waStatus.pending')}
      </Badge>
    )
  }
  return (
    <Badge variant="outline">
      {t('inmobiliaria.ai.templates.status.draft')}
    </Badge>
  )
}

// =============================================================================
// WA approval pill (for WA section only)
// =============================================================================

function WaStatusPill({
  status,
  t,
}: {
  status: 'pending' | 'approved' | 'rejected'
  t: (k: string) => string
}) {
  if (status === 'approved') {
    return (
      <Badge variant="success">
        <CheckCircle className="h-3 w-3" weight="fill" />
        {t('inmobiliaria.ai.templates.waStatus.approved')}
      </Badge>
    )
  }
  if (status === 'rejected') {
    return (
      <Badge variant="destructive">
        <WarningCircle className="h-3 w-3" weight="fill" />
        {t('inmobiliaria.ai.templates.waStatus.rejected')}
      </Badge>
    )
  }
  return (
    <Badge variant="warning">
      <Clock className="h-3 w-3" weight="fill" />
      {t('inmobiliaria.ai.templates.waStatus.pending')}
    </Badge>
  )
}

// =============================================================================
// Variable pill
// =============================================================================

function VariablePill({
  varName,
  onInsert,
  t,
}: {
  varName: string
  onInsert: (varName: string) => void
  t: (k: string) => string
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={t('inmobiliaria.ai.templates.editor.ariaInsertVar').replace('{name}', varName)}
      onClick={() => onInsert(varName)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onInsert(varName)
        }
      }}
      className="cursor-pointer select-none rounded-md bg-primary-soft text-primary px-2 py-0.5 text-xs font-mono hover:opacity-80 min-h-[44px] flex items-center transition-colors"
    >
      {`{{${varName}}}`}
    </span>
  )
}

// =============================================================================
// Editor content component (receives template + agencyId)
// =============================================================================

function TemplateEditorContent({
  template,
  agencyId,
}: {
  template: TemplateRow
  agencyId: string
}) {
  const { t } = useI18n()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Local draft state — seeded from template data once
  const [localDraft, setLocalDraft] = useState(
    template.bodyDraft ?? template.bodyPublished ?? '',
  )
  const [localStatus, setLocalStatus] = useState<'draft' | 'published' | 'wa_pending'>(
    template.status,
  )
  const [localWaStatus, setLocalWaStatus] = useState(template.waSubmissionStatus)
  const [localWaRejectionReason, setLocalWaRejectionReason] = useState<string | null>(null)
  const [localWaLastChecked, setLocalWaLastChecked] = useState<string | null>(null)

  // Debounced token count
  const [tokenCount, setTokenCount] = useState(estimateTokenCount(localDraft))

  useEffect(() => {
    const id = setTimeout(() => {
      setTokenCount(estimateTokenCount(localDraft))
    }, DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [localDraft])

  // Unknown variable detection (T-36-10-01 UI layer)
  const unknownVars = useMemo(() => {
    const matches = [...localDraft.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1])
    return matches.filter((v) => !KNOWN_VARIABLES.includes(v))
  }, [localDraft])

  // Saving / publishing state
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isRefreshingWa, setIsRefreshingWa] = useState(false)
  const [errorToast, setErrorToast] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  const showErrorToast = useCallback((msg: string) => {
    setErrorToast(msg)
    setTimeout(() => setErrorToast(null), 4000)
  }, [])

  const showSuccessToast = useCallback((msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 3000)
  }, [])

  // Variable insertion at cursor
  const insertVariable = useCallback((varName: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    textarea.setRangeText(`{{${varName}}}`, start, end, 'end')
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    setLocalDraft(textarea.value)
    textarea.focus()
  }, [])

  // Save draft handler — PUT only (does NOT call /publish)
  const handleSaveDraft = useCallback(async () => {
    setIsSaving(true)
    try {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL ?? ''
      const res = await fetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/templates/${template.id}/draft`,
        {
          method: 'PUT',
          headers: agentAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ bodyDraft: localDraft }),
        },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      showSuccessToast(t('inmobiliaria.ai.templates.saveDraft'))
    } catch (err) {
      showErrorToast(
        err instanceof Error ? err.message : t('inmobiliaria.ai.templates.error.saveDraft'),
      )
    } finally {
      setIsSaving(false)
    }
  }, [agencyId, template.id, localDraft, showSuccessToast, showErrorToast, t])

  // Publish handler — POST /publish; optimistic status update with revert on 4xx
  const handlePublish = useCallback(async () => {
    const prevStatus = localStatus
    // Optimistic update (T-36-10-02)
    setLocalStatus(template.category === 'whatsapp' ? 'wa_pending' : 'published')
    setIsPublishing(true)
    try {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL ?? ''
      const res = await fetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/templates/${template.id}/publish`,
        {
          method: 'POST',
          headers: agentAuthHeaders({ 'Content-Type': 'application/json' }),
        },
      )
      if (!res.ok) {
        // Revert on 4xx (T-36-10-02)
        setLocalStatus(prevStatus)
        if (res.status === 409) {
          showErrorToast(t('inmobiliaria.ai.templates.error.publish'))
        } else {
          throw new Error(`${res.status}`)
        }
        return
      }
      const json = (await res.json()) as { status: string }
      if (json.status === 'wa_pending') {
        setLocalStatus('wa_pending')
        setLocalWaStatus('pending')
      } else {
        setLocalStatus('published')
      }
    } catch (err) {
      setLocalStatus(prevStatus)
      showErrorToast(
        err instanceof Error ? err.message : t('inmobiliaria.ai.templates.error.publish'),
      )
    } finally {
      setIsPublishing(false)
    }
  }, [agencyId, template.id, template.category, localStatus, showErrorToast, t])

  // WA status refresh
  const handleRefreshWaStatus = useCallback(async () => {
    setIsRefreshingWa(true)
    try {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL ?? ''
      const res = await fetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/templates/${template.id}/wa-status`,
        { headers: agentAuthHeaders() },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as {
        waSubmissionStatus: 'pending' | 'approved' | 'rejected'
        waRejectionReason?: string | null
        waLastCheckedAt?: string | null
      }
      setLocalWaStatus(json.waSubmissionStatus)
      setLocalWaRejectionReason(json.waRejectionReason ?? null)
      setLocalWaLastChecked(json.waLastCheckedAt ?? null)
    } catch (err) {
      showErrorToast(
        err instanceof Error ? err.message : t('inmobiliaria.ai.templates.error.waStatus'),
      )
    } finally {
      setIsRefreshingWa(false)
    }
  }, [agencyId, template.id, showErrorToast, t])

  // Live preview — replace known {{var}} with sample values
  const previewText = useMemo(() => {
    return localDraft.replace(/\{\{(\w+)\}\}/g, (_match, varName: string) => {
      return SAMPLE_VALUES[varName] ?? `{{${varName}}}`
    })
  }, [localDraft])

  // AlertDialog titles differ for WA vs non-WA templates
  const dialogTitleKey =
    template.category === 'whatsapp'
      ? 'inmobiliaria.ai.templates.dialog.publishWa.title'
      : 'inmobiliaria.ai.templates.dialog.publish.title'
  const dialogBodyKey =
    template.category === 'whatsapp'
      ? 'inmobiliaria.ai.templates.dialog.publishWa.body'
      : 'inmobiliaria.ai.templates.dialog.publish.body'

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-[#1a1a1c] border-b border-neutral-200 dark:border-neutral-700 py-3 px-4 flex items-center justify-between gap-4 flex-wrap">
        {/* Left: name + status pill */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white truncate">
            {template.name}
          </h1>
          <StatusPill status={localStatus} t={t} />
        </div>

        {/* Right: token badge + Guardar borrador + Publicar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Token count badge */}
          <span
            className={`inline-flex items-center text-xs rounded-full px-2 py-0.5 font-mono ${tokenBadgeClass(tokenCount)}`}
          >
            {tokenCount} tokens
          </span>

          {/* Guardar borrador */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleSaveDraft()}
            disabled={isSaving}
            className="min-h-[44px]"
          >
            {isSaving ? (
              <Spinner size="sm" variant="current" className="mr-1" />
            ) : null}
            {t('inmobiliaria.ai.templates.saveDraft')}
          </Button>

          {/* Publicar — wrapped in AlertDialog */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="default"
                size="sm"
                disabled={isPublishing}
                hideArrow
                className="min-h-[44px]"
              >
                {isPublishing ? (
                  <Spinner size="sm" variant="current" className="mr-1" />
                ) : null}
                {t('inmobiliaria.ai.templates.publish')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t(dialogTitleKey)}</AlertDialogTitle>
                <AlertDialogDescription>{t(dialogBodyKey)}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="min-h-[44px]">
                  {t('inmobiliaria.ai.templates.dialog.publish.cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  className="min-h-[44px]"
                  onClick={() => void handlePublish()}
                >
                  {t('inmobiliaria.ai.templates.dialog.publish.confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Page body */}
      <main className="p-4 md:p-6 space-y-6 flex-1">
        {/* Unknown variable warning (T-36-10-01 UI layer) */}
        {unknownVars.length > 0 && (
          <Alert
            data-unknown-var-alert
            className="border-warning/30 bg-warning-soft text-warning"
          >
            <WarningCircle className="h-4 w-4 text-warning" />
            <AlertDescription>
              {unknownVars
                .map(
                  (v) =>
                    `Variable desconocida detectada: {{${v}}}. El agente ignorará este token.`,
                )
                .join(' ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Variable picker */}
        <section>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
            {t('inmobiliaria.ai.templates.editor.variables')}
          </p>
          <div className="flex flex-wrap gap-2">
            {KNOWN_VARIABLES.map((varName) => (
              <VariablePill
                key={varName}
                varName={varName}
                onInsert={insertVariable}
                t={t}
              />
            ))}
          </div>
        </section>

        {/* Two-column editor + preview */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: monospace textarea */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t('inmobiliaria.ai.templates.editor.bodyLabel')}
            </label>
            <Textarea
              ref={textareaRef}
              value={localDraft}
              onChange={(e) => setLocalDraft(e.target.value)}
              className="font-mono text-sm min-h-[200px] resize-y"
              placeholder="Escribe el cuerpo de la plantilla..."
            />
          </div>

          {/* Right: live preview */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t('inmobiliaria.ai.templates.editor.previewTitle')}
            </p>
            <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-4 min-h-[200px] text-sm whitespace-pre-wrap font-mono text-neutral-800 dark:text-neutral-200">
              {previewText || (
                <span className="text-neutral-400 dark:text-neutral-500 italic">
                  La vista previa aparecerá aquí...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* WA Status section — only for whatsapp templates */}
        {template.category === 'whatsapp' && (
          <section
            data-wa-status-section
            className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-card p-4 mt-4 space-y-3"
          >
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
              {t('inmobiliaria.ai.templates.editor.waStatusTitle')}
            </h2>

            <div className="flex items-center gap-3 flex-wrap">
              {localWaStatus && (
                <WaStatusPill status={localWaStatus} t={t} />
              )}
              {localWaLastChecked && (
                <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
                  {t('inmobiliaria.ai.templates.editor.waLastChecked')}:{' '}
                  {new Date(localWaLastChecked).toLocaleString()}
                </span>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleRefreshWaStatus()}
              disabled={isRefreshingWa}
              aria-label={`${t('inmobiliaria.ai.templates.updateWaStatus')} ${template.name}`}
              className="min-h-[44px]"
            >
              {isRefreshingWa ? (
                <Spinner size="sm" variant="current" className="mr-1" />
              ) : null}
              {t('inmobiliaria.ai.templates.updateWaStatus')}
            </Button>

            {localWaStatus === 'rejected' && localWaRejectionReason && (
              <Alert variant="destructive">
                <WarningCircle className="h-4 w-4" />
                <AlertDescription>{localWaRejectionReason}</AlertDescription>
              </Alert>
            )}
          </section>
        )}
      </main>

      {/* Success toast */}
      {successToast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-xs rounded-md border border-success/30 bg-success-soft text-success px-4 py-3 text-sm">
          {successToast}
        </div>
      )}

      {/* Error toast */}
      {errorToast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-xs rounded-md border border-danger/30 bg-danger-soft text-danger px-4 py-3 text-sm">
          {errorToast}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Page component — receives params from Next.js router
// =============================================================================

export default function TemplatePage({
  params,
}: {
  params: { id: string }
}) {
  const { t } = useI18n()
  const { agency } = useAuth()
  const agencyId = agency?.id ?? ''
  const { data, isLoading } = useTemplates()

  const template = useMemo(
    () => (data?.templates ?? []).find((tpl) => tpl.id === params.id) ?? null,
    [data?.templates, params.id],
  )

  // Phase 38-05a: PageSkeleton primitive (detail variant) — dynamic route, no EmptyState.
  if (isLoading && !data) {
    return <PageSkeleton variant="detail" />
  }

  if (!template) {
    return (
      <div className="p-6 text-sm text-neutral-500">
        {t('inmobiliaria.ai.templates.empty.body')}
      </div>
    )
  }

  return <TemplateEditorContent template={template} agencyId={agencyId} />
}
