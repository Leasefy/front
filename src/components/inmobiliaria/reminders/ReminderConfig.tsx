'use client';

import { useState, useCallback } from 'react';
import {
  Bell,
  Clock,
  Warning,
  ShieldWarning,
  FileText,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Switch } from '@/components/ui/switch';
import type { ReminderConfig, ReminderType, ReminderTypeConfig } from '@/lib/types/reminders';

// ============================================================================
// Reminder type metadata
// ============================================================================

interface ReminderTypeMeta {
  type: ReminderType;
  icon: React.ElementType;
  nameKey: string;
  nameFallback: string;
  descriptionKey: string;
  descriptionFallback: string;
  daysLabel: string;
  iconBg: string;
  iconColor: string;
}

const REMINDER_TYPE_META: ReminderTypeMeta[] = [
  {
    type: 'pre-payment',
    icon: Clock,
    nameKey: 'inmobiliaria.reminders.types.prePayment.name',
    nameFallback: 'Recordatorio de pago',
    descriptionKey: 'inmobiliaria.reminders.types.prePayment.description',
    descriptionFallback: 'Se envia {days} dias antes del vencimiento',
    daysLabel: 'Dias antes',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    type: 'overdue',
    icon: Warning,
    nameKey: 'inmobiliaria.reminders.types.overdue.name',
    nameFallback: 'Aviso de mora',
    descriptionKey: 'inmobiliaria.reminders.types.overdue.description',
    descriptionFallback: 'Se envia {days} dias despues del vencimiento',
    daysLabel: 'Dias despues',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    type: 'escalation',
    icon: ShieldWarning,
    nameKey: 'inmobiliaria.reminders.types.escalation.name',
    nameFallback: 'Escalacion de mora',
    descriptionKey: 'inmobiliaria.reminders.types.escalation.description',
    descriptionFallback: 'Segundo aviso {days} dias despues del vencimiento',
    daysLabel: 'Dias despues',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  {
    type: 'contract-expiry',
    icon: FileText,
    nameKey: 'inmobiliaria.reminders.types.contractExpiry.name',
    nameFallback: 'Vencimiento de contrato',
    descriptionKey: 'inmobiliaria.reminders.types.contractExpiry.description',
    descriptionFallback: 'Alertas a 90, 60 y 30 dias',
    daysLabel: 'Dias antes',
    iconBg: 'bg-violet-100 dark:bg-violet-900/30',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
];

// ============================================================================
// ReminderConfigPanel
// ============================================================================

interface ReminderConfigPanelProps {
  config: ReminderConfig;
  onConfigChange?: (config: ReminderConfig) => void;
}

export function ReminderConfigPanel({ config, onConfigChange }: ReminderConfigPanelProps) {
  const { t } = useI18n();
  const [localConfig, setLocalConfig] = useState<ReminderConfig>(config);

  const updateConfig = useCallback(
    (updater: (prev: ReminderConfig) => ReminderConfig) => {
      setLocalConfig((prev) => {
        const next = updater(prev);
        onConfigChange?.(next);
        return next;
      });
    },
    [onConfigChange]
  );

  const handleGlobalToggle = useCallback(
    (checked: boolean) => {
      updateConfig((prev) => ({ ...prev, globalEnabled: checked }));
    },
    [updateConfig]
  );

  const handleTypeToggle = useCallback(
    (type: ReminderType, checked: boolean) => {
      updateConfig((prev) => ({
        ...prev,
        types: prev.types.map((tc) =>
          tc.type === type ? { ...tc, enabled: checked } : tc
        ),
      }));
    },
    [updateConfig]
  );

  const handleDaysChange = useCallback(
    (type: ReminderType, days: number) => {
      if (days < 1 || days > 365) return;
      updateConfig((prev) => ({
        ...prev,
        types: prev.types.map((tc) =>
          tc.type === type ? { ...tc, days } : tc
        ),
      }));
    },
    [updateConfig]
  );

  const getTypeConfig = (type: ReminderType): ReminderTypeConfig | undefined =>
    localConfig.types.find((tc) => tc.type === type);

  const tryTranslate = (key: string, fallback: string, params?: Record<string, string | number>) => {
    const translated = t(key, params);
    // If t() returns the key itself, use fallback
    return translated === key ? fallback : translated;
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <Bell className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {tryTranslate('inmobiliaria.reminders.configTitle', 'Configuracion de Recordatorios')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {tryTranslate('inmobiliaria.reminders.configSubtitle', 'Automatiza avisos de pago y vencimiento')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {localConfig.globalEnabled
              ? tryTranslate('inmobiliaria.reminders.active', 'Activo')
              : tryTranslate('inmobiliaria.reminders.inactive', 'Inactivo')}
          </span>
          <Switch
            checked={localConfig.globalEnabled}
            onCheckedChange={handleGlobalToggle}
          />
        </div>
      </div>

      {/* Reminder type cards */}
      <div className="p-4 space-y-3">
        {REMINDER_TYPE_META.map((meta) => {
          const typeConfig = getTypeConfig(meta.type);
          if (!typeConfig) return null;

          const isDisabled = !localConfig.globalEnabled;
          const isTypeEnabled = typeConfig.enabled && localConfig.globalEnabled;

          // Build description with days interpolation
          const descFallback = meta.descriptionFallback.replace('{days}', String(typeConfig.days));

          return (
            <div
              key={meta.type}
              className={cn(
                'flex items-center gap-4 p-4 rounded-xl border transition-colors',
                isDisabled
                  ? 'border-border/50 bg-muted/30 opacity-50'
                  : isTypeEnabled
                    ? 'border-border bg-card'
                    : 'border-border/70 bg-muted/20'
              )}
            >
              {/* Toggle */}
              <Switch
                checked={typeConfig.enabled}
                onCheckedChange={(checked) => handleTypeToggle(meta.type, checked)}
                disabled={isDisabled}
                className="shrink-0"
              />

              {/* Icon */}
              <div
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                  isTypeEnabled ? meta.iconBg : 'bg-muted'
                )}
              >
                <meta.icon
                  className={cn(
                    'w-[18px] h-[18px]',
                    isTypeEnabled ? meta.iconColor : 'text-muted-foreground'
                  )}
                />
              </div>

              {/* Name + Description */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium',
                  isTypeEnabled ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {tryTranslate(meta.nameKey, meta.nameFallback)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tryTranslate(meta.descriptionKey, descFallback, { days: typeConfig.days })}
                </p>
              </div>

              {/* Days input */}
              {meta.type !== 'contract-expiry' && (
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={typeConfig.days}
                    onChange={(e) => handleDaysChange(meta.type, parseInt(e.target.value, 10) || 1)}
                    disabled={isDisabled || !typeConfig.enabled}
                    className={cn(
                      'w-16 h-8 px-2 text-center text-sm font-medium rounded-lg border border-border bg-background',
                      'focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                    )}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {meta.daysLabel.toLowerCase()}
                  </span>
                </div>
              )}

              {/* Contract expiry: show fixed label instead of input */}
              {meta.type === 'contract-expiry' && (
                <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                  90 / 60 / 30 dias
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
