'use client'

/**
 * Carrier Registry Page — Phase 35 plan 35-07.
 *
 * Agency OWNER/ADMIN: full write access via canAccess('cotizador','configure-carrier').
 * VIEWER/OPERATOR: all write controls render disabled.
 *
 * Optimistic save/reset with full revert on error + error toast.
 * All strings keyed via t(...) — no hardcoded es/en text in JSX.
 *
 * The cotizador layout already enforces cotizador:view via PageGuard.
 * This page does NOT re-check view permission.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Buildings } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import {
  useCarrierRegistry,
  type TenantOverrideRow,
} from '@/lib/hooks/cotizador/use-carrier-registry'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { CarrierRegistryTable, type MergedCarrierRow } from '@/components/inmobiliaria/cotizador/CarrierRegistryTable'
import type { OverrideFields } from '@/components/inmobiliaria/cotizador/CarrierOverridePopover'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Button } from '@/components/ui/button'

// =============================================================================
// Page
// =============================================================================

export default function AseguradorasPage() {
  const { t } = useI18n()
  const { data, isLoading, error, refetch, saveOverride, resetOverride } = useCarrierRegistry()
  const { canAccess } = usePermissionsContext()
  const canConfigure = canAccess('cotizador', 'configure-carrier')

  // Optimistic local override state — seeded from server data
  const [localOverrides, setLocalOverrides] = useState<TenantOverrideRow[]>([])
  const [errorToast, setErrorToast] = useState<string | null>(null)

  // Seed localOverrides when server data first arrives
  useEffect(() => {
    if (data?.overrides) {
      setLocalOverrides(data.overrides)
    }
  }, [data?.overrides])

  const showErrorToast = useCallback((msg: string) => {
    setErrorToast(msg)
    setTimeout(() => setErrorToast(null), 4000)
  }, [])

  // Derive merged rows from server global data + optimistic local overrides
  const finalMergedRows = useMemo<MergedCarrierRow[]>(() => {
    if (!data?.global) return []
    return data.global.map((globalRow) => {
      const override =
        localOverrides.find(
          (ov) => ov.name === globalRow.name && ov.route === globalRow.route,
        ) ?? null
      const hasOverride =
        override !== null &&
        (override.enabled !== null ||
          override.priority !== null ||
          override.mode !== null ||
          override.maxCanonCop !== null)
      return { global: globalRow, override, hasOverride }
    })
  }, [data?.global, localOverrides])

  // Optimistic save — immediately update local state, revert on error
  const handleSave = useCallback(
    async (name: string, route: string, fields: Partial<OverrideFields>) => {
      // Snapshot for revert
      const snapshot = [...localOverrides]

      // Optimistic update
      setLocalOverrides((prev) => {
        const idx = prev.findIndex((ov) => ov.name === name && ov.route === route)
        if (idx !== -1) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], ...fields }
          return updated
        }
        // New override
        return [
          ...prev,
          {
            name,
            route,
            enabled: fields.enabled ?? null,
            priority: fields.priority ?? null,
            mode: fields.mode ?? null,
            maxCanonCop: fields.maxCanonCop ?? null,
          },
        ]
      })

      try {
        await saveOverride(name, route, fields)
      } catch (err) {
        // Revert on error
        setLocalOverrides(snapshot)
        showErrorToast(
          err instanceof Error
            ? err.message
            : t('inmobiliaria.ai.cotizador.aseguradoras.popover.saveError'),
        )
      }
    },
    [localOverrides, saveOverride, showErrorToast, t],
  )

  // Optimistic reset — immediately remove override from local state, revert on error
  const handleReset = useCallback(
    async (name: string, route: string) => {
      const snapshot = [...localOverrides]

      setLocalOverrides((prev) => prev.filter((ov) => !(ov.name === name && ov.route === route)))

      try {
        await resetOverride(name, route)
      } catch (err) {
        setLocalOverrides(snapshot)
        showErrorToast(
          err instanceof Error
            ? err.message
            : t('inmobiliaria.ai.cotizador.aseguradoras.popover.saveError'),
        )
      }
    },
    [localOverrides, resetOverride, showErrorToast, t],
  )

  // Phase 38-05b: skeleton + EmptyState early returns (D-38-04: list page gets both)
  if (isLoading && !data) return <PageSkeleton variant="list" />
  if (!isLoading && data && finalMergedRows.length === 0) {
    return (
      <EmptyState
        icon={Buildings}
        title={t('inmobiliaria.ai.cotizador.aseguradoras.empty.title')}
        description={t('inmobiliaria.ai.cotizador.aseguradoras.empty.description')}
        primaryCta={{
          label: t('inmobiliaria.ai.cotizador.aseguradoras.empty.cta.label'),
          href: 'mailto:soporte@leasefy.co',
        }}
      />
    )
  }

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {t('inmobiliaria.ai.cotizador.aseguradoras.title')}
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl">
            {t('inmobiliaria.ai.cotizador.aseguradoras.subtitle')}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          hideArrow
          onClick={() => void refetch()}
          className="shrink-0"
        >
          {t('inmobiliaria.ai.cotizador.aseguradoras.refresh')}
        </Button>
      </header>

      {/* Error banner */}
      {error && !data && (
        <div className="rounded-xl bg-danger-soft border border-danger/30 text-danger px-4 py-3 text-sm flex items-center justify-between gap-4">
          <span>{t('inmobiliaria.ai.cotizador.aseguradoras.errorLoading')}</span>
          <Button
            variant="outline"
            size="sm"
            hideArrow
            onClick={() => void refetch()}
            className="shrink-0"
          >
            {t('inmobiliaria.ai.cotizador.aseguradoras.retry')}
          </Button>
        </div>
      )}

      {/* Table */}
      {data && finalMergedRows.length > 0 && (
        <CarrierRegistryTable
          rows={finalMergedRows}
          canConfigure={canConfigure}
          onSaveOverride={handleSave}
          onResetOverride={handleReset}
        />
      )}

      {/* Error toast — mutation failures */}
      {errorToast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-xs rounded-xl border border-danger/30 bg-danger-soft text-danger px-4 py-3 text-sm">
          {errorToast}
        </div>
      )}
    </main>
  )
}
