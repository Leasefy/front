'use client'

/**
 * SubscriptionToggles — Phase 34 plan 34-08 (D-34-06 per-user opt-in).
 *
 * Two independent boolean switches (email + WhatsApp). Optimistic local
 * update; the parent hook (use-subscription) debounces the PATCH at 300ms
 * and reverts on error.
 *
 * No "Save" button — toggles persist automatically. The error banner
 * propagates from the hook when the PATCH fails.
 */

import { Envelope, WhatsappLogo, type Icon } from '@phosphor-icons/react'
import { MonoLabel } from '@leasefy/cadence'

import type { SubscriptionRow } from '@/lib/hooks/cobranza/use-subscription'
import { useI18n } from '@/lib/i18n'
import { Switch } from '@/components/ui/switch'

export interface SubscriptionTogglesProps {
  data: SubscriptionRow
  isSaving: boolean
  error: string | null
  onToggle: (patch: { email_enabled?: boolean; whatsapp_enabled?: boolean }) => void
}

export function SubscriptionToggles({
  data,
  isSaving,
  error,
  onToggle,
}: SubscriptionTogglesProps) {
  const { t, locale } = useI18n()

  return (
    <div className="space-y-3">
      <ToggleRow
        Icon={Envelope}
        label={t('inmobiliaria.ai.cobranza.reporte.subscription.emailToggle')}
        checked={data.email_enabled}
        onChange={(v) => onToggle({ email_enabled: v })}
      />
      <ToggleRow
        Icon={WhatsappLogo}
        label={t('inmobiliaria.ai.cobranza.reporte.subscription.whatsappToggle')}
        checked={data.whatsapp_enabled}
        onChange={(v) => onToggle({ whatsapp_enabled: v })}
      />
      {isSaving && (
        <MonoLabel className="block text-[10px] text-muted-foreground tracking-wide">
          {locale.startsWith('es') ? 'Guardando…' : 'Saving…'}
        </MonoLabel>
      )}
      {error && (
        <div className="rounded-sm border border-danger/30 bg-danger-soft text-danger font-mono">
          {locale.startsWith('es') ? 'Error al actualizar suscripción' : 'Subscription update failed'}: {error}
        </div>
      )}
    </div>
  )
}

function ToggleRow({
  Icon,
  label,
  checked,
  onChange,
}: {
  Icon: Icon
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 cursor-pointer hover:bg-muted/30 transition">
      <span className="flex items-center gap-2 text-sm text-foreground">
        <Icon className="w-4 h-4 text-muted-foreground" aria-hidden={true} />
        {label}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  )
}
