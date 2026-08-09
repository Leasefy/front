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
  FileText,
} from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { useTemplates, type TemplateRow } from '@/lib/hooks/cobranza/use-templates'
import { NoDataYetBadge } from '@/components/data-display/no-data-yet-badge'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Button, Badge } from '@/components/ui'
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
    return 'bg-danger-soft text-danger'
  }
  if (count >= TOKEN_AMBER_THRESHOLD) {
    return 'bg-warning-soft text-warning'
  }
  return 'bg-muted text-muted-foreground'
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
      <Badge variant="success">
        {t('inmobiliaria.ai.templates.status.published')}
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
  // pending
  return (
    <Badge variant="warning">
      <Clock className="h-3 w-3" weight="fill" />
      {t('inmobiliaria.ai.templates.waStatus.pending')}
    </Badge>
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
  // El texto vivo, no el borrador: la tarjeta muestra lo que hoy le llega al
  // deudor y la píldora avisa si hay cambios sin publicar.
  const preview = tpl.liveBody
  const level = tokenBadgeLevel(tpl.tokenCount)

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      {/* Top row: name + pills */}
      <div className="flex items-center flex-wrap gap-2">
        <span className="font-medium text-sm text-fg flex-1 min-w-0 truncate">
          {tpl.name}
        </span>
        <StatusPill status={tpl.status} t={t} />
        {tpl.category === 'whatsapp' && tpl.waSubmissionStatus && (
          <WaPill status={tpl.waSubmissionStatus} t={t} />
        )}
      </div>

      {/* Body preview */}
      <p className="text-xs text-fg-muted line-clamp-3 bg-surface-muted rounded p-2">
        {preview || '—'}
      </p>

      {/* Footer: token badge + timestamp + Edit button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            data-token-badge={level}
            className={`inline-flex items-center text-xs rounded-full px-2 py-0.5 tabular-nums ${tokenBadgeClass(tpl.tokenCount)}`}
          >
            {tpl.tokenCount} tokens
          </span>
          <span className="text-xs text-fg-subtle tabular-nums">
            {t('inmobiliaria.ai.templates.card.lastEdited')}:{' '}
            {new Date(tpl.updatedAt).toLocaleDateString()}
          </span>
        </div>
        <Button
          asChild
          variant="secondary"
          size="sm"
          hideArrow
          aria-label={`${t('inmobiliaria.ai.templates.card.ariaEdit').replace('{name}', tpl.name)}`}
        >
          <Link href={`/panel/inmobiliaria/ai/cobranza/plantillas/${tpl.id}`}>
            <PencilSimple className="h-3.5 w-3.5" weight="bold" />
            {t('inmobiliaria.ai.templates.card.edit')}
          </Link>
        </Button>
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

  // Phase 38-05a: list skeleton during initial fetch — replaces local SkeletonGrid.
  if (isLoading && !data) {
    return <PageSkeleton variant="list" />
  }

  // Phase 38-05a: page-level EmptyState when the catalog is empty (backend
  // returned zero rows or only the user truly has no customizations and the
  // defaults endpoint surfaced nothing). Per-tab "no items in this category"
  // continues to use NoDataYetBadge inside TemplateGrid below.
  if (data && data.templates.length === 0 && !error) {
    return (
      <main className="p-6 lg:p-8 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-fg" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
            {t('inmobiliaria.ai.templates.title')}
          </h1>
        </header>
        {/*
          Sin CTA a propósito. Había un «Crear plantilla» que apuntaba a
          `?tab=drafts` — un parámetro que esta página no lee — así que
          recargaba la misma pantalla. Y no podría hacer otra cosa: el agente
          expone list / draft / publish / wa-status, no hay endpoint de creación.
          Un botón que no puede cumplir es peor que no tener botón.
        */}
        <EmptyState
          icon={FileText}
          title={t('inmobiliaria.ai.cobranza.plantillas.empty.title')}
          description={t('inmobiliaria.ai.cobranza.plantillas.empty.description')}
        />
      </main>
    )
  }

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg" style={{ fontFamily: 'var(--font-heading, inherit)' }}>
            {t('inmobiliaria.ai.templates.title')}
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          hideArrow
          onClick={() => void refetch()}
          className="shrink-0"
        >
          {t('inmobiliaria.ai.templates.error.retry')}
        </Button>
      </header>

      {/* Error banner */}
      {error && !data && (
        <div className="rounded-lg bg-danger-soft border border-danger/30 text-danger px-4 py-3 text-sm flex items-center justify-between gap-4">
          <span>{t('inmobiliaria.ai.templates.error.load')}</span>
          <Button
            variant="link"
            size="sm"
            hideArrow
            onClick={handleRetry}
            className="px-0 h-auto text-danger"
          >
            {t('inmobiliaria.ai.templates.error.retry')}
          </Button>
        </div>
      )}

      {/* Tabs */}
      {data && (
        <Tabs defaultValue="stage">
          <TabsList>
            {/*
              Los conteos van sobre lo que hay, no sobre lo que se esperaba.
              Las etiquetas traían «(14)», «(8)» y «(5)» quemados en el copy —
              las 27 plantillas que la fase 36 dio por sentadas— así que la
              pestaña decía «WhatsApp (8)» encima de dos tarjetas.
            */}
            <TabsTrigger value="stage">
              {t('inmobiliaria.ai.templates.tabs.stages')} ({stageTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="whatsapp">
              {t('inmobiliaria.ai.templates.tabs.whatsapp')} ({waTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="objection">
              {t('inmobiliaria.ai.templates.tabs.objections')} ({objectionTemplates.length})
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
        <div className="fixed bottom-4 right-4 z-50 max-w-xs rounded-lg border border-danger/30 bg-danger-soft text-danger px-4 py-3 text-sm">
          {errorToast}
        </div>
      )}
    </main>
  )
}
