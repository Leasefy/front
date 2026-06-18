'use client'

/**
 * CarrierOverridePopover — Phase 35 plan 35-07.
 *
 * Inline popover with 4 fields:
 *   - Toggle (enabled)
 *   - Priority (1–10 number input)
 *   - Mode (direct | stub select)
 *   - Max Canon COP (number input)
 *
 * Optimistic save fires onSave(fields) then closes.
 * All controls disabled when canConfigure=false.
 * Width: w-72.
 */

import { useState } from 'react'
import { CircleNotch } from '@phosphor-icons/react'

import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useI18n } from '@/lib/i18n'

import type { MergedCarrierRow } from './CarrierRegistryTable'

// =============================================================================
// Types
// =============================================================================

export interface OverrideFields {
  enabled: boolean | null
  priority: number | null
  mode: 'direct' | 'stub' | null
  maxCanonCop: number | null
}

export interface CarrierOverridePopoverProps {
  row: MergedCarrierRow
  canConfigure: boolean
  onSave: (fields: Partial<OverrideFields>) => Promise<void>
  open: boolean
  onOpenChange: (v: boolean) => void
}

// =============================================================================
// Component
// =============================================================================

export function CarrierOverridePopover({
  row,
  canConfigure,
  onSave,
  onOpenChange,
}: CarrierOverridePopoverProps) {
  const { t } = useI18n()

  // Derive effective values (override takes precedence over global if non-null)
  const effectiveEnabled = row.override?.enabled ?? row.global.enabled
  const effectivePriority = row.override?.priority ?? row.global.priority
  const effectiveMode = row.override?.mode ?? row.global.mode
  const effectiveMaxCanon = row.override?.maxCanonCop ?? row.global.maxCanonCop

  const [enabled, setEnabled] = useState<boolean>(effectiveEnabled)
  const [priority, setPriority] = useState<string>(String(effectivePriority ?? ''))
  const [mode, setMode] = useState<'direct' | 'stub'>(effectiveMode ?? 'direct')
  const [maxCanon, setMaxCanon] = useState<string>(
    effectiveMaxCanon !== null ? String(effectiveMaxCanon) : '',
  )

  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [priorityError, setPriorityError] = useState<string | null>(null)

  const validatePriority = (val: string): boolean => {
    const n = parseInt(val, 10)
    if (isNaN(n) || n < 1 || n > 10) {
      setPriorityError(t('inmobiliaria.ai.cotizador.aseguradoras.popover.priorityRangeError'))
      return false
    }
    setPriorityError(null)
    return true
  }

  const handleSave = async () => {
    if (!validatePriority(priority)) return
    setIsSaving(true)
    try {
      const fields: Partial<OverrideFields> = {
        enabled,
        priority: priority !== '' ? parseInt(priority, 10) : null,
        mode,
        maxCanonCop: maxCanon !== '' ? parseInt(maxCanon, 10) : null,
      }
      await onSave(fields)
      onOpenChange(false)
    } catch {
      // Parent handles error toast
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="w-72 p-4 space-y-4">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-neutral-900 dark:text-white capitalize">
          {row.global.name}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
          {row.global.route}
        </p>
      </div>

      {/* Enabled toggle */}
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs text-neutral-700 dark:text-neutral-300">
          {t('inmobiliaria.ai.cotizador.aseguradoras.popover.enabledLabel')}
        </label>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => setEnabled(v)}
          disabled={!canConfigure}
          aria-label={t('inmobiliaria.ai.cotizador.aseguradoras.popover.enabledLabel')}
        />
      </div>

      {/* Priority */}
      <div className="space-y-1">
        <label className="text-xs text-neutral-700 dark:text-neutral-300">
          {t('inmobiliaria.ai.cotizador.aseguradoras.popover.priorityLabel')}
        </label>
        <Input
          type="number"
          min={1}
          max={10}
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value)
            if (priorityError) validatePriority(e.target.value)
          }}
          disabled={!canConfigure}
          className="h-8 text-sm"
        />
        {priorityError && (
          <p className="text-xs text-danger">{priorityError}</p>
        )}
      </div>

      {/* Mode */}
      <div className="space-y-1">
        <label className="text-xs text-neutral-700 dark:text-neutral-300">
          {t('inmobiliaria.ai.cotizador.aseguradoras.popover.modeLabel')}
        </label>
        <Select
          value={mode}
          onValueChange={(v) => setMode(v as 'direct' | 'stub')}
          disabled={!canConfigure}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="direct">direct</SelectItem>
            <SelectItem value="stub">stub</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Max Canon COP */}
      <div className="space-y-1">
        <label className="text-xs text-neutral-700 dark:text-neutral-300">
          {t('inmobiliaria.ai.cotizador.aseguradoras.popover.maxCanonLabel')}
        </label>
        <Input
          type="number"
          min={0}
          value={maxCanon}
          onChange={(e) => setMaxCanon(e.target.value)}
          disabled={!canConfigure}
          className="h-8 text-sm"
          placeholder="—"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="default"
          size="sm"
          hideArrow
          className="flex-1"
          onClick={() => void handleSave()}
          disabled={!canConfigure || isSaving}
        >
          {isSaving ? (
            <>
              <CircleNotch className="h-4 w-4 animate-spin mr-1" aria-hidden="true" />
              {t('inmobiliaria.ai.cotizador.aseguradoras.popover.saving')}
            </>
          ) : (
            t('inmobiliaria.ai.cotizador.aseguradoras.popover.saveBtn')
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenChange(false)}
          disabled={isSaving}
        >
          {t('inmobiliaria.ai.cotizador.aseguradoras.popover.cancelBtn')}
        </Button>
      </div>
    </div>
  )
}
