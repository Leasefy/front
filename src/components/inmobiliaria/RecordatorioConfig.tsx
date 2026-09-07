'use client';

import * as React from 'react';
import { toast } from '@/components/ui/toast';
import { motion } from 'framer-motion';
import {
  Bell,
  Gear,
  Envelope,
  DeviceMobile,
  WhatsappLogo,
  Calendar,
  Warning,
  Check,
  X,
  Info,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Chip } from '@leasefy/cadence';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

// Available day options for pre-vencimiento
const DAYS_BEFORE_OPTIONS = [1, 3, 5, 7] as const;

// Available day options for post-vencimiento
const DAYS_AFTER_OPTIONS = [1, 3, 7, 15, 30] as const;

// Notification channels
type Channel = 'email' | 'sms' | 'whatsapp';

const CHANNELS: { value: Channel; label: string; icon: React.ElementType }[] = [
  { value: 'email', label: 'Email', icon: Envelope },
  { value: 'sms', label: 'SMS', icon: DeviceMobile },
  { value: 'whatsapp', label: 'WhatsApp', icon: WhatsappLogo },
];

export interface RecordatorioConfigData {
  daysBefore: number[];
  daysAfter: number[];
  channels: Channel[];
}

interface RecordatorioConfigProps {
  isOpen: boolean;
  onClose: () => void;
  config: RecordatorioConfigData;
  /**
   * Guarda de verdad. Devuelve la promesa del back: el cajón NO anuncia
   * «Configuración guardada» hasta que responde, y si falla lo dice.
   */
  onSave: (config: RecordatorioConfigData) => Promise<void> | void;
}

// Message template previews (these contain dynamic placeholders, not translatable)
const PRE_VENCIMIENTO_TEMPLATE = `Hola {inquilino},

Te recordamos que el pago de tu arriendo en {propiedad} vence el {fecha}.

Monto a pagar: {monto}

Puedes realizar tu pago por transferencia, PSE o en efectivo.

Gracias,
Arriendos Premium`;

const MORA_TEMPLATE = `Hola {inquilino},

Tu pago del arriendo en {propiedad} se encuentra vencido desde el {fecha}.

Monto pendiente: {monto} (incluye intereses por mora)

Por favor realiza tu pago lo antes posible para evitar acciones adicionales.

Gracias,
Arriendos Premium`;

/**
 * DaySelector - Multi-select component for day selection
 */
function DaySelector({
  options,
  selected,
  onChange,
  label,
}: {
  options: readonly number[];
  selected: number[];
  onChange: (days: number[]) => void;
  label: string;
}) {
  const { t } = useI18n();

  const toggleDay = (day: number) => {
    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day].sort((a, b) => a - b));
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((day) => {
          const isSelected = selected.includes(day);
          return (
            <Chip
              key={day}
              selected={isSelected}
              onClick={() => toggleDay(day)}
            >
              {day === 1
                ? t('inmobiliaria.cobros.recordatorioConfig.day', { count: day })
                : t('inmobiliaria.cobros.recordatorioConfig.days', { count: day })}
              {isSelected && <Check className="inline-block w-3.5 h-3.5 ml-1" />}
            </Chip>
          );
        })}
      </div>
      {selected.length === 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Info className="w-3.5 h-3.5" />
          {t('inmobiliaria.cobros.recordatorioConfig.selectAtLeastOneDay')}
        </p>
      )}
    </div>
  );
}

/**
 * ChannelToggle - Switch component for notification channel
 */
function ChannelToggle({
  channel,
  enabled,
  onChange,
}: {
  channel: (typeof CHANNELS)[number];
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const Icon = channel.icon;

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 rounded-lg border transition-colors',
        enabled
          ? 'border-primary/30 bg-primary-soft/50 dark:border-primary/30 dark:bg-primary/20'
          : 'border-border bg-card'
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-md flex items-center justify-center',
            enabled
              ? 'bg-primary-soft'
              : 'bg-muted'
          )}
        >
          <Icon
            className={cn(
              'w-5 h-5',
              enabled
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
          />
        </div>
        <span
          className={cn(
            'font-medium',
            enabled ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {channel.label}
        </span>
      </div>
      <Switch checked={enabled} onCheckedChange={onChange} />
    </div>
  );
}

/**
 * MessagePreview - Shows template with variables highlighted
 */
function MessagePreview({
  title,
  template,
}: {
  title: string;
  template: string;
}) {
  // Highlight variables in template
  const highlightedTemplate = template.replace(
    /\{([^}]+)\}/g,
    '<span class="px-1.5 py-0.5 rounded bg-primary-soft text-primary text-xs font-medium">{$1}</span>'
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{title}</label>
      <div className="p-4 rounded-lg border border-border bg-muted/30">
        <p
          className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlightedTemplate }}
        />
      </div>
    </div>
  );
}

/**
 * RecordatorioConfig - Configuration panel for reminder settings
 * Allows setting reminder days, channels, and viewing templates
 */
export function RecordatorioConfig({
  isOpen,
  onClose,
  config,
  onSave,
}: RecordatorioConfigProps) {
  const { t } = useI18n();
  const [localConfig, setLocalConfig] = React.useState<RecordatorioConfigData>(config);
  const [isSaving, setIsSaving] = React.useState(false);

  // Reset local config when opening
  React.useEffect(() => {
    if (isOpen) {
      setLocalConfig(config);
    }
  }, [isOpen, config]);

  // Handle days before change
  const handleDaysBeforeChange = (days: number[]) => {
    setLocalConfig((prev) => ({ ...prev, daysBefore: days }));
  };

  // Handle days after change
  const handleDaysAfterChange = (days: number[]) => {
    setLocalConfig((prev) => ({ ...prev, daysAfter: days }));
  };

  // Handle channel toggle
  const handleChannelToggle = (channel: Channel, enabled: boolean) => {
    setLocalConfig((prev) => ({
      ...prev,
      channels: enabled
        ? [...prev.channels, channel]
        : prev.channels.filter((c) => c !== channel),
    }));
  };

  // Validate config
  const isValid =
    localConfig.daysBefore.length > 0 &&
    localConfig.daysAfter.length > 0 &&
    localConfig.channels.length > 0;

  /**
   * Guardar.
   *
   * Antes esto era `setTimeout(500)` + `onSave(localConfig)` + un
   * `toast.success('Configuración guardada')`, y `onSave` en la página era un
   * `setState` a secas: no había ni un `fetch`. Los días vivían en
   * `agency.reminderDaysBefore/After` y se recargaban al volver a entrar, así
   * que lo editado se perdía y el back seguía mandando con lo viejo.
   *
   * Ahora el guardado es real y el cartel sale DESPUÉS de la respuesta.
   */
  const handleSave = async () => {
    if (!isValid) return;

    setIsSaving(true);
    try {
      await onSave(localConfig);
      toast.success(t('inmobiliaria.cobros.toasts.configSaved'), {
        description: t('inmobiliaria.cobros.toasts.configSavedDesc'),
      });
      onClose();
    } catch (error) {
      toast.error(
        t('inmobiliaria.cobros.recordatorioConfig.guardarError'),
        {
          description:
            error instanceof Error ? error.message : String(error),
        },
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-lg font-semibold text-fg">
            <Gear className="w-5 h-5 text-primary" />
            {t('inmobiliaria.cobros.recordatorioConfig.title')}
          </SheetTitle>
          <SheetDescription>
            {t('inmobiliaria.cobros.recordatorioConfig.description')}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8">
          {/* Pre-vencimiento Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Calendar className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                {t('inmobiliaria.cobros.recordatorioConfig.preExpiry')}
              </h3>
            </div>
            <DaySelector
              options={DAYS_BEFORE_OPTIONS}
              selected={localConfig.daysBefore}
              onChange={handleDaysBeforeChange}
              label={t('inmobiliaria.cobros.recordatorioConfig.daysBefore')}
            />
          </motion.section>

          {/* Post-vencimiento Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Warning className="w-4 h-4 text-warning" />
              <h3 className="text-sm font-semibold text-foreground">
                {t('inmobiliaria.cobros.recordatorioConfig.postExpiry')}
              </h3>
            </div>
            <DaySelector
              options={DAYS_AFTER_OPTIONS}
              selected={localConfig.daysAfter}
              onChange={handleDaysAfterChange}
              label={t('inmobiliaria.cobros.recordatorioConfig.daysAfter')}
            />
          </motion.section>

          {/* Notification Channels Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Bell className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                {t('inmobiliaria.cobros.recordatorioConfig.notificationChannels')}
              </h3>
            </div>
            <div className="space-y-3">
              {CHANNELS.map((channel) => (
                <ChannelToggle
                  key={channel.value}
                  channel={channel}
                  enabled={localConfig.channels.includes(channel.value)}
                  onChange={(enabled) => handleChannelToggle(channel.value, enabled)}
                />
              ))}
            </div>
            {localConfig.channels.length === 0 && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <Warning className="w-3.5 h-3.5" />
                {t('inmobiliaria.cobros.recordatorioConfig.selectAtLeastOneChannel')}
              </p>
            )}
            {/* El back guarda los DÍAS (`agency.reminderDaysBefore/After`) y no
                tiene columna para los canales. Decirlo es preferible a que el
                cartel de «guardado» abarque algo que no se guardó. */}
            <p className="text-[11px] text-muted-foreground">
              {t('inmobiliaria.cobros.recordatorioConfig.canalesNoSeGuardan')}
            </p>
          </motion.section>

          {/* Message Templates Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Envelope className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                {t('inmobiliaria.cobros.recordatorioConfig.messageTemplates')}
              </h3>
            </div>
            <MessagePreview
              title={t('inmobiliaria.cobros.recordatorioConfig.preExpiryTemplate')}
              template={PRE_VENCIMIENTO_TEMPLATE}
            />
            <MessagePreview
              title={t('inmobiliaria.cobros.recordatorioConfig.overdueTemplate')}
              template={MORA_TEMPLATE}
            />
            <p className="text-xs text-muted-foreground">
              {t('inmobiliaria.cobros.recordatorioConfig.templateNote')}
            </p>
          </motion.section>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex gap-3 pt-4 border-t border-border"
          >
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isSaving}
            >
              {t('inmobiliaria.cobros.recordatorioConfig.cancel')}
            </Button>
            <Button
              type="button"
              className="flex-1 bg-primary hover:opacity-90 text-primary-fg"
              onClick={handleSave}
              disabled={!isValid || isSaving}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" variant="current" />
                  {t('inmobiliaria.cobros.recordatorioConfig.saving')}
                </span>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {t('inmobiliaria.cobros.recordatorioConfig.save')}
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default RecordatorioConfig;
