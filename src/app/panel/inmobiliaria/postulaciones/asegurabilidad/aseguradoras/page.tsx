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
import { Button } from '@/components/ui/button'
import { SectionLabel } from '@/components/ui/section-label'
import { toast } from '@/components/ui/toast'

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

  // Seed localOverrides when server data first arrives
  useEffect(() => {
    if (data?.overrides) {
      setLocalOverrides(data.overrides)
    }
  }, [data?.overrides])

  // El toast de la casa (sonner por el envoltorio), no un <div fixed> propio
  // que se pintaba abajo a la derecha con otra cara y otro tiempo.
  const avisarFallo = useCallback(
    (err: unknown) => {
      toast.error(
        err instanceof Error
          ? err.message
          : t('inmobiliaria.ai.cotizador.aseguradoras.popover.saveError'),
      )
    },
    [t],
  )

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
        avisarFallo(err)
      }
    },
    [localOverrides, saveOverride, avisarFallo],
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
        avisarFallo(err)
      }
    },
    [localOverrides, resetOverride, avisarFallo],
  )

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Encabezado de la casa; la única acción de la pantalla, a la derecha. */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1.5">
          <SectionLabel>{t('inmobiliaria.ai.nav.cotizador')}</SectionLabel>
          <h1 className="text-h2 text-fg">
            {t('inmobiliaria.ai.cotizador.aseguradoras.title')}
          </h1>
          <p className="max-w-2xl text-sm text-fg-muted line-clamp-2">
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

      {/* La carga, el fallo y el vacío viven DENTRO de la tabla, como en el
          resto del panel: antes cada uno reemplazaba la página entera y la
          persona perdía el encabezado y el botón de actualizar. */}
      <CarrierRegistryTable
        rows={finalMergedRows}
        isLoading={isLoading && !data}
        error={data ? null : error}
        onReintentar={refetch}
        canConfigure={canConfigure}
        onSaveOverride={handleSave}
        onResetOverride={handleReset}
      />
    </main>
  )
}
