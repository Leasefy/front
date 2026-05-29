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

import { useI18n } from '@/lib/i18n'
import {
  useCarrierRegistry,
  type TenantOverrideRow,
} from '@/lib/hooks/cotizador/use-carrier-registry'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { CarrierRegistryTable, type MergedCarrierRow } from '@/components/inmobiliaria/cotizador/CarrierRegistryTable'
import type { OverrideFields } from '@/components/inmobiliaria/cotizador/CarrierOverridePopover'

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

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {t('inmobiliaria.ai.cotizador.aseguradoras.title')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 text-sm">
            {t('inmobiliaria.ai.cotizador.aseguradoras.subtitle')}
          </p>
        </div>
        <button
          onClick={() => void refetch()}
          className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wide px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted active:scale-[0.97] transition"
        >
          {t('inmobiliaria.ai.cotizador.aseguradoras.refresh')}
        </button>
      </header>

      {/* Loading skeleton */}
      {isLoading && !data && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4 space-y-3"
            >
              <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
              <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Error banner */}
      {error && !data && (
        <div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-4 py-3 text-sm flex items-center justify-between gap-4">
          <span>{t('inmobiliaria.ai.cotizador.aseguradoras.errorLoading')}</span>
          <button
            onClick={() => void refetch()}
            className="underline text-sm font-medium hover:no-underline"
          >
            {t('inmobiliaria.ai.cotizador.aseguradoras.retry')}
          </button>
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

      {/* Empty state */}
      {data && finalMergedRows.length === 0 && (
        <p className="text-sm text-neutral-500 text-center py-12">
          {t('inmobiliaria.ai.cotizador.aseguradoras.emptyRegistry')}
        </p>
      )}

      {/* Error toast — mutation failures */}
      {errorToast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-xs rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 px-4 py-3 text-sm shadow-lg">
          {errorToast}
        </div>
      )}
    </main>
  )
}
