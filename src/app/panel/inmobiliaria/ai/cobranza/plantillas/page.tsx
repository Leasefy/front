'use client'

/**
 * Templates List Page — Phase 36 plan 36-10 (COTI-UI-10, XR-03, XR-05, D-36-12)
 *
 * Displays all 27 cobranza templates grouped in 3 category tabs:
 *   - Etapas de cobranza (14 stage templates)
 *   - WhatsApp (8 WA templates)
 *   - Manejadores de objeciones (5 objection handlers)
 *
 * Tab switching is client-side over the in-memory list from useTemplates() —
 * no network call per tab switch.
 *
 * Token badge thresholds:
 *   - amber: tokenCount >= 1600 (80% of 2000-token budget)
 *   - rose:  tokenCount >= 2000 (100% of budget — over limit)
 *
 * All interactive elements have min-h-[44px] touch targets (XR-03).
 * All strings are i18n keys via t('inmobiliaria.ai.templates.*') (D-36-12, XR-05).
 */

import { useMemo, useCallback, useState } from 'react'
import Link from 'next/link'
import {
  Clock,
  CheckCircle,
  WarningCircle,
  PencilSimple,
} from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { useTemplates, type TemplateRow } from '@/lib/hooks/cobranza/use-templates'
import { NoDataYetBadge } from '@/components/data-display/no-data-yet-badge'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'

// =============================================================================
// Constants
// =============================================================================

const TOKEN_BUDGET = 2000
const TOKEN_AMBER_THRESHOLD = 0.8 * TOKEN_BUDGET // 1600

// =============================================================================
// Token badge helper
// =============================================================================

function tokenBadgeClass(count: number): string {
  if (count >= TOKEN_BUDGET) {
    return 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400'
  }
  if (count >= TOKEN_AMBER_THRESHOLD) {
    return 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300'
  }
  return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
}

function tokenBadgeLevel(count: number): 'normal' | 'amber' | 'rose' {
  if (count >= TOKEN_BUDGET) return 'rose'
  if (count >= TOKEN_AMBER_THRESHOLD) return 'amber'
  return 'normal'
}

// =============================================================================
// Status pill
// =============================================================================

function StatusPill({ status, t }: { status: 'draft' | 'published'; t: (k: string) => string }) {
  if (status === 'published') {
    return (
      <span className="inline-flex items-center text-xs rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5">
        {t('inmobiliaria.ai.templates.status.published')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-xs rounded-full border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 px-2 py-0.5">
      {t('inmobiliaria.ai.templates.status.draft')}
    </span>
  )
}

// =============================================================================
// WA approval pill
// =============================================================================

function WaPill({
  status,
  t,
}: {
  status: 'pending' | 'approved' | 'rejected'
  t: (k: string) => string
}) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 text-xs rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5">
        <CheckCircle className="h-3 w-3" weight="fill" />
        {t('inmobiliaria.ai.templates.waStatus.approved')}
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 text-xs rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 px-2 py-0.5">
        <WarningCircle className="h-3 w-3" weight="fill" />
        {t('inmobiliaria.ai.templates.waStatus.rejected')}
      </span>
    )
  }
  // pending
  return (
    <span className="inline-flex items-center gap-1 text-xs rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 px-2 py-0.5">
      <Clock className="h-3 w-3" weight="fill" />
      {t('inmobiliaria.ai.templates.waStatus.pending')}
    </span>
  )
}

// =============================================================================
// Skeleton grid (loading state)
// =============================================================================

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4 space-y-3 animate-pulse"
        >
          <div className="flex items-center gap-2">
            <div className="h-4 w-40 rounded bg-neutral-200 dark:bg-neutral-700" />
            <div className="h-4 w-16 rounded-full bg-neutral-200 dark:bg-neutral-700" />
          </div>
          <div className="h-12 rounded bg-neutral-100 dark:bg-neutral-800" />
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 rounded bg-neutral-200 dark:bg-neutral-700" />
            <div className="h-8 w-16 rounded bg-neutral-200 dark:bg-neutral-700" />
          </div>
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// Template card
// =============================================================================

function TemplateCard({
  tpl,
  t,
}: {
  tpl: TemplateRow
  t: (k: string) => string
}) {
  const preview = tpl.bodyPublished ?? tpl.bodyDraft ?? ''
  const level = tokenBadgeLevel(tpl.tokenCount)

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4 flex flex-col gap-3">
      {/* Top row: name + pills */}
      <div className="flex items-center flex-wrap gap-2">
        <span className="font-medium text-sm text-neutral-900 dark:text-white flex-1 min-w-0 truncate">
          {tpl.name}
        </span>
        <StatusPill status={tpl.status} t={t} />
        {tpl.category === 'whatsapp' && tpl.waSubmissionStatus && (
          <WaPill status={tpl.waSubmissionStatus} t={t} />
        )}
      </div>

      {/* Body preview */}
      <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 line-clamp-3 bg-neutral-50 dark:bg-neutral-800/50 rounded p-2">
        {preview || '—'}
      </p>

      {/* Footer: token badge + timestamp + Edit button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            data-token-badge={level}
            className={`inline-flex items-center text-xs rounded-full px-2 py-0.5 font-mono ${tokenBadgeClass(tpl.tokenCount)}`}
          >
            {tpl.tokenCount} tokens
          </span>
          <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono tabular-nums">
            {t('inmobiliaria.ai.templates.card.lastEdited')}:{' '}
            {new Date(tpl.updatedAt).toLocaleDateString()}
          </span>
        </div>
        <Link
          href={`/panel/inmobiliaria/ai/cobranza/plantillas/${tpl.id}`}
          aria-label={`${t('inmobiliaria.ai.templates.card.ariaEdit').replace('{name}', tpl.name)}`}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          <PencilSimple className="h-3.5 w-3.5" weight="bold" />
          {t('inmobiliaria.ai.templates.card.edit')}
        </Link>
      </div>
    </div>
  )
}

// =============================================================================
// Tab content with card grid
// =============================================================================

function TemplateGrid({
  templates,
  t,
}: {
  templates: TemplateRow[]
  t: (k: string) => string
}) {
  if (templates.length === 0) {
    return (
      <div className="py-8 flex justify-center">
        <NoDataYetBadge
          reason={t('inmobiliaria.ai.templates.empty.body')}
          phase={36}
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {templates.map((tpl) => (
        <TemplateCard key={tpl.id} tpl={tpl} t={t} />
      ))}
    </div>
  )
}

// =============================================================================
// Page
// =============================================================================

export default function PlantillasPage() {
  const { t } = useI18n()
  const { data, isLoading, error, refetch } = useTemplates()
  const [errorToast, setErrorToast] = useState<string | null>(null)

  const showErrorToast = useCallback((msg: string) => {
    setErrorToast(msg)
    setTimeout(() => setErrorToast(null), 4000)
  }, [])

  const stageTemplates = useMemo(
    () => (data?.templates ?? []).filter((t) => t.category === 'stage'),
    [data],
  )
  const waTemplates = useMemo(
    () => (data?.templates ?? []).filter((t) => t.category === 'whatsapp'),
    [data],
  )
  const objectionTemplates = useMemo(
    () => (data?.templates ?? []).filter((t) => t.category === 'objection'),
    [data],
  )

  const handleRetry = useCallback(() => {
    void refetch().catch((err) => {
      showErrorToast(err instanceof Error ? err.message : t('inmobiliaria.ai.templates.error.load'))
    })
  }, [refetch, showErrorToast, t])

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
            {t('inmobiliaria.ai.templates.title')}
          </h1>
        </div>
        <button
          onClick={() => void refetch()}
          className="inline-flex items-center gap-1 min-h-[44px] text-xs font-mono uppercase tracking-wide px-3 py-2 rounded-md border border-border text-foreground hover:bg-muted active:scale-[0.97] transition"
        >
          {t('inmobiliaria.ai.templates.error.retry')}
        </button>
      </header>

      {/* Loading skeleton */}
      {isLoading && !data && <SkeletonGrid />}

      {/* Error banner */}
      {error && !data && (
        <div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-4 py-3 text-sm flex items-center justify-between gap-4">
          <span>{t('inmobiliaria.ai.templates.error.load')}</span>
          <button
            onClick={handleRetry}
            className="underline text-sm font-medium hover:no-underline min-h-[44px] px-2"
          >
            {t('inmobiliaria.ai.templates.error.retry')}
          </button>
        </div>
      )}

      {/* Tabs */}
      {data && (
        <Tabs defaultValue="stage">
          <TabsList>
            <TabsTrigger value="stage">
              {t('inmobiliaria.ai.templates.tabs.stages')}
            </TabsTrigger>
            <TabsTrigger value="whatsapp">
              {t('inmobiliaria.ai.templates.tabs.whatsapp')}
            </TabsTrigger>
            <TabsTrigger value="objection">
              {t('inmobiliaria.ai.templates.tabs.objections')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stage">
            <TemplateGrid templates={stageTemplates} t={t} />
          </TabsContent>
          <TabsContent value="whatsapp">
            <TemplateGrid templates={waTemplates} t={t} />
          </TabsContent>
          <TabsContent value="objection">
            <TemplateGrid templates={objectionTemplates} t={t} />
          </TabsContent>
        </Tabs>
      )}

      {/* Error toast — refetch failures */}
      {errorToast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-xs rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 px-4 py-3 text-sm shadow-lg">
          {errorToast}
        </div>
      )}
    </main>
  )
}
