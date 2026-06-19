'use client'

/**
 * CarrierRegistryTable — Phase 35 plan 35-07.
 *
 * Two-column Global/Tenant table with:
 *  - Sticky first column on sm viewports
 *  - Override row accent: border-l-4 border-[#1A40FF]/30 + "Personalizado" pill
 *  - Conflict Alert (rose inline) when tenantEnabled=true AND globalEnabled=false
 *  - Kebab menu (shadcn Popover) with "Editar" + "Restablecer al global"
 *  - "Restablecer al global" opens shadcn AlertDialog — NEVER browser confirm()
 *  - All write controls disabled when canConfigure=false
 *  - All strings keyed via i18n
 */

import { useState } from 'react'
import { DotsThreeVertical } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useI18n } from '@/lib/i18n'

import { CarrierOverridePopover } from './CarrierOverridePopover'
import type { OverrideFields } from './CarrierOverridePopover'
import type { GlobalCarrierRow, TenantOverrideRow } from '@/lib/hooks/cotizador/use-carrier-registry'

// =============================================================================
// Types
// =============================================================================

export interface MergedCarrierRow {
  global: GlobalCarrierRow
  override: TenantOverrideRow | null
  hasOverride: boolean
}

export interface CarrierRegistryTableProps {
  rows: MergedCarrierRow[]
  canConfigure: boolean
  onSaveOverride: (name: string, route: string, fields: Partial<OverrideFields>) => Promise<void>
  onResetOverride: (name: string, route: string) => Promise<void>
}

// =============================================================================
// Helpers
// =============================================================================

const BREACH_BADGE_CLASS: Record<string, string> = {
  healthy: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15 text-[#2C7A53] dark:text-[#3EAE70] border-[#2C7A53]/30 dark:border-[#2C7A53]/40',
  degraded: 'bg-[#F8F0E0] dark:bg-[#B7791F]/15 text-[#B7791F] dark:text-[#D2992F] border-[#B7791F]/30 dark:border-[#B7791F]/40',
  breached: 'bg-[#F8EAE7] dark:bg-[#C4503B]/15 text-[#C4503B] dark:text-[#E0664D] border-[#C4503B]/30 dark:border-[#C4503B]/40',
  unknown: '',
}

// =============================================================================
// Row component (keeps per-row state isolated)
// =============================================================================

interface CarrierRowProps {
  row: MergedCarrierRow
  canConfigure: boolean
  onSaveOverride: CarrierRegistryTableProps['onSaveOverride']
  onResetOverride: CarrierRegistryTableProps['onResetOverride']
}

function CarrierTableRow({ row, canConfigure, onSaveOverride, onResetOverride }: CarrierRowProps) {
  const { t } = useI18n()

  const [kebabOpen, setKebabOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)

  const tenantEnabled = row.override?.enabled
  const globalEnabled = row.global.enabled

  // Effective tenant priority/mode for display
  const tenantPriority = row.override?.priority
  const tenantMode = row.override?.mode

  const hasConflict = tenantEnabled === true && globalEnabled === false

  const handleToggle = (checked: boolean) => {
    void onSaveOverride(row.global.name, row.global.route, { enabled: checked })
  }

  const handleEdit = () => {
    setKebabOpen(false)
    setEditOpen(true)
  }

  const handleResetClick = () => {
    setKebabOpen(false)
    setResetConfirmOpen(true)
  }

  const handleResetConfirm = () => {
    void onResetOverride(row.global.name, row.global.route)
    setResetConfirmOpen(false)
  }

  const handleSaveFromPopover = async (fields: Partial<OverrideFields>) => {
    await onSaveOverride(row.global.name, row.global.route, fields)
  }

  const trClass = [
    'hover:bg-neutral-50 dark:hover:bg-neutral-800/30',
    row.hasOverride ? 'border-l-4 border-[#1A40FF]/30' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const breachClass = BREACH_BADGE_CLASS[row.global.breachStatus] ?? BREACH_BADGE_CLASS.unknown

  return (
    <>
      <tr
        className={trClass}
        data-has-override={row.hasOverride ? 'true' : undefined}
      >
        {/* Name + Route — sticky first column */}
        <td className="px-4 py-3 text-sm sticky left-0 bg-white dark:bg-[#1a1a1c] z-10">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-neutral-900 dark:text-white capitalize">
              {row.global.name}
            </span>
            <span className="text-xs text-neutral-500 font-mono">{row.global.route}</span>
            {row.hasOverride && (
              <span
                data-testid="override-pill"
                className="inline-flex self-start text-xs bg-[#EEF1FF] dark:bg-[#1A40FF]/15 text-[#1A40FF] dark:text-[#5570FF] rounded-full px-2 py-0.5 mt-0.5"
              >
                {t('inmobiliaria.ai.cotizador.aseguradoras.table.overridePill')}
              </span>
            )}
          </div>
        </td>

        {/* Mode — global / tenant */}
        <td className="px-4 py-3 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-neutral-700 dark:text-neutral-300">{row.global.mode}</span>
            {row.override?.mode != null ? (
              <span className="text-xs text-neutral-500">{row.override.mode}</span>
            ) : (
              <span className="text-xs text-neutral-400 italic">
                {t('inmobiliaria.ai.cotizador.aseguradoras.table.inherits', { value: row.global.mode })}
              </span>
            )}
          </div>
        </td>

        {/* Global Enabled */}
        <td className="px-4 py-3 text-sm">
          <Badge
            variant="outline"
            className={globalEnabled ? 'text-[#2C7A53] border-[#2C7A53]/30' : 'text-neutral-500'}
          >
            {globalEnabled ? 'On' : 'Off'}
          </Badge>
        </td>

        {/* Tenant Enabled — interactive Switch */}
        <td className="px-4 py-3 text-sm">
          <Switch
            checked={tenantEnabled ?? globalEnabled}
            onCheckedChange={handleToggle}
            disabled={!canConfigure}
            aria-label={t('inmobiliaria.ai.cotizador.aseguradoras.popover.enabledLabel')}
          />
        </td>

        {/* Global Priority */}
        <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
          {row.global.priority}
        </td>

        {/* Tenant Priority */}
        <td className="px-4 py-3 text-sm">
          {tenantPriority != null ? (
            <span className="text-neutral-700 dark:text-neutral-300">{tenantPriority}</span>
          ) : (
            <span className="text-xs text-neutral-400 italic">
              {t('inmobiliaria.ai.cotizador.aseguradoras.table.inherits', { value: String(row.global.priority) })}
            </span>
          )}
        </td>

        {/* Breach Status */}
        <td className="px-4 py-3 text-sm">
          <Badge
            variant={row.global.breachStatus === 'unknown' ? 'outline' : 'outline'}
            className={`text-xs ${breachClass}`}
          >
            {row.global.breachStatus}
          </Badge>
        </td>

        {/* Actions — kebab menu */}
        <td className="px-4 py-3 text-sm">
          <Popover open={kebabOpen} onOpenChange={setKebabOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={`Acciones para ${row.global.name}`}
              >
                <DotsThreeVertical className="h-4 w-4" weight="bold" aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="end">
              <div className="flex flex-col">
                <button
                  className="flex items-center px-3 py-2 text-sm rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-left w-full"
                  onClick={handleEdit}
                >
                  {t('inmobiliaria.ai.cotizador.aseguradoras.table.actionEdit')}
                </button>
                <button
                  className="flex items-center px-3 py-2 text-sm rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[#C4503B] dark:text-[#E0664D] text-left w-full"
                  onClick={handleResetClick}
                >
                  {t('inmobiliaria.ai.cotizador.aseguradoras.table.actionReset')}
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Edit popover (separate Popover for the edit form) */}
          <Popover open={editOpen} onOpenChange={setEditOpen}>
            <PopoverTrigger asChild>
              <span className="sr-only" />
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="end">
              <CarrierOverridePopover
                row={row}
                canConfigure={canConfigure}
                onSave={handleSaveFromPopover}
                open={editOpen}
                onOpenChange={setEditOpen}
              />
            </PopoverContent>
          </Popover>
        </td>
      </tr>

      {/* Conflict Alert — inline below row when tenantEnabled=true AND globalEnabled=false */}
      {hasConflict && (
        <tr>
          <td colSpan={8} className="px-4 pb-2">
            <div
              role="alert"
              data-testid="conflict-alert"
              className="bg-[#F8EAE7] dark:bg-[#C4503B]/15 text-[#C4503B] dark:text-[#E0664D] text-xs rounded-md px-3 py-2"
            >
              {t('inmobiliaria.ai.cotizador.aseguradoras.table.conflictWarning')}
            </div>
          </td>
        </tr>
      )}

      {/* AlertDialog for Reset — shadcn, NOT browser confirm() */}
      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('inmobiliaria.ai.cotizador.aseguradoras.resetDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('inmobiliaria.ai.cotizador.aseguradoras.resetDialog.body', {
                carrier: row.global.name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              tone="danger"
              onClick={handleResetConfirm}
            >
              {t('inmobiliaria.ai.cotizador.aseguradoras.resetDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mode muted */}
      {tenantMode != null && tenantMode !== row.global.mode && (
        <></>
      )}
    </>
  )
}

// =============================================================================
// Table component
// =============================================================================

export function CarrierRegistryTable({
  rows,
  canConfigure,
  onSaveOverride,
  onResetOverride,
}: CarrierRegistryTableProps) {
  const { t } = useI18n()

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
          <thead className="bg-neutral-50 dark:bg-neutral-800/50">
            <tr>
              <th className="px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide text-left sticky left-0 bg-neutral-50 dark:bg-neutral-800/50 z-10">
                {t('inmobiliaria.ai.cotizador.aseguradoras.table.colName')}
              </th>
              <th className="px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide text-left">
                {t('inmobiliaria.ai.cotizador.aseguradoras.table.colMode')}
              </th>
              <th className="px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide text-left">
                {t('inmobiliaria.ai.cotizador.aseguradoras.table.colGlobalEnabled')}
              </th>
              <th className="px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide text-left">
                {t('inmobiliaria.ai.cotizador.aseguradoras.table.colTenantEnabled')}
              </th>
              <th className="px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide text-left">
                {t('inmobiliaria.ai.cotizador.aseguradoras.table.colGlobalPriority')}
              </th>
              <th className="px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide text-left">
                {t('inmobiliaria.ai.cotizador.aseguradoras.table.colTenantPriority')}
              </th>
              <th className="px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide text-left">
                {t('inmobiliaria.ai.cotizador.aseguradoras.table.colBreachStatus')}
              </th>
              <th className="px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide text-left">
                {t('inmobiliaria.ai.cotizador.aseguradoras.table.colActions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {rows.map((row) => (
              <CarrierTableRow
                key={`${row.global.name}:${row.global.route}`}
                row={row}
                canConfigure={canConfigure}
                onSaveOverride={onSaveOverride}
                onResetOverride={onResetOverride}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
