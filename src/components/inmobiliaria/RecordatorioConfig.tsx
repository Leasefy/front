'use client';

import * as React from 'react';
import { toast } from '@/components/ui/toast';
import { Stagger, StaggerItem } from '@leasefy/cadence';
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
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';

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
  id,
  options,
  selected,
  onChange,
  label,
  error,
}: {
  /** El id del grupo de días; su error vive en `${id}-error`. */
  id: string;
  options: readonly number[];
  selected: number[];
  onChange: (days: number[]) => void;
  label: string;
  /** Lo que el servidor dijo de estos días (02-10-2026). */
  error?: string | null;
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
      <label id={`${id}-etiqueta`} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div
        id={id}
        role="group"
        aria-labelledby={`${id}-etiqueta`}
        aria-describedby={`${id}-error`}
        className="flex flex-wrap gap-2"
      >
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
      <ErrorDelCampo id={`${id}-error`} mensaje={error} />
    </div>
  );
}

type CampoDeLosRecordatorios = 'daysBefore' | 'daysAfter';
/** Los días del back (`UpdateAgencyDto`) → el selector de la pantalla. */
const DIAS_DEL_SERVIDOR = {
  reminderDaysBefore: 'daysBefore',
  reminderDaysAfter: 'daysAfter',
} as const;
const ID_DEL_SELECTOR: Record<CampoDeLosRecordatorios, string> = {
  daysBefore: 'recordatorio-dias-antes',
  daysAfter: 'recordatorio-dias-despues',
};

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
  /** Lo que el servidor dijo de cada grupo de días (02-10-2026). */
  const [erroresDelServidor, setErroresDelServidor] = React.useState<
    Partial<Record<CampoDeLosRecordatorios, string>>
  >({});

  // Reset local config when opening
  React.useEffect(() => {
    if (isOpen) {
      setLocalConfig(config);
      setErroresDelServidor({});
    }
  }, [isOpen, config]);

  // Handle days before change
  const handleDaysBeforeChange = (days: number[]) => {
    setLocalConfig((prev) => ({ ...prev, daysBefore: days }));
    setErroresDelServidor(({ daysBefore: _quitado, ...resto }) => resto);
  };

  // Handle days after change
  const handleDaysAfterChange = (days: number[]) => {
    setLocalConfig((prev) => ({ ...prev, daysAfter: days }));
    setErroresDelServidor(({ daysAfter: _quitado, ...resto }) => resto);
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
      /*
       * 02-10-2026 · Un 400 sobre los días va bajo SU grupo, con el foco en el
       * primer día; lo demás va al toast por el traductor (un 5xx dice que fue
       * nuestro, con la referencia; «conexión» sólo sin respuesta). Antes era
       * `error.message` crudo: un 500 decía «Internal server error».
       */
      const { porCampo, orden, sueltos } = repartirErroresDelServidor<CampoDeLosRecordatorios>(error, {
        mapa: DIAS_DEL_SERVIDOR,
        campos: ['daysBefore', 'daysAfter'],
        porDefecto: t('inmobiliaria.cobros.recordatorioConfig.guardarError'),
        accion: 'guardar los recordatorios',
      });
      setErroresDelServidor(porCampo);
      const primero = orden[0];
      if (primero) {
        document.getElementById(ID_DEL_SELECTOR[primero])?.querySelector<HTMLElement>('button')?.focus();
      }
      if (sueltos.length > 0) {
        toast.error(t('inmobiliaria.cobros.recordatorioConfig.guardarError'), {
          description: sueltos.join(' · '),
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Cajon abierto={isOpen} onOpenChange={(open) => !open && onClose()} ancho="sm:max-w-lg">
      <CajonCabecera
        titulo={
          <span className="flex items-center gap-2">
            <Gear className="w-5 h-5 text-primary" />
            {t('inmobiliaria.cobros.recordatorioConfig.title')}
          </span>
        }
        descripcion={t('inmobiliaria.cobros.recordatorioConfig.description')}
      />

      <CajonCuerpo>
        {/* Movimiento (ola 2, 03-10-2026): las secciones llegan escalonadas con
            el techo del sistema (320 ms) y 4 px mientras entra el cajón. Antes
            cada una tenía su retraso a mano (0,1 → 0,4 s): la última terminaba
            de llegar más de medio segundo después. */}
        <Stagger className="space-y-8" distance="xs" layout={false}>
        {/* Pre-vencimiento Section */}
        <StaggerItem as="section" key="antes" className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Calendar className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              {t('inmobiliaria.cobros.recordatorioConfig.preExpiry')}
            </h3>
          </div>
          <DaySelector
            id={ID_DEL_SELECTOR.daysBefore}
            options={DAYS_BEFORE_OPTIONS}
            selected={localConfig.daysBefore}
            onChange={handleDaysBeforeChange}
            label={t('inmobiliaria.cobros.recordatorioConfig.daysBefore')}
            error={erroresDelServidor.daysBefore}
          />
        </StaggerItem>

        {/* Post-vencimiento Section */}
        <StaggerItem as="section" key="despues" className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Warning className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-semibold text-foreground">
              {t('inmobiliaria.cobros.recordatorioConfig.postExpiry')}
            </h3>
          </div>
          <DaySelector
            id={ID_DEL_SELECTOR.daysAfter}
            options={DAYS_AFTER_OPTIONS}
            selected={localConfig.daysAfter}
            onChange={handleDaysAfterChange}
            label={t('inmobiliaria.cobros.recordatorioConfig.daysAfter')}
            error={erroresDelServidor.daysAfter}
          />
        </StaggerItem>

        {/* Notification Channels Section */}
        <StaggerItem as="section" key="canales" className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Bell className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              {t('inmobiliaria.cobros.recordatorioConfig.notificationChannels')}
            </h3>
          </div>
          <div
            role="group"
            aria-label={t('inmobiliaria.cobros.recordatorioConfig.notificationChannels')}
            aria-describedby="recordatorio-canales-error"
            className="space-y-3"
          >
            {CHANNELS.map((channel) => (
              <ChannelToggle
                key={channel.value}
                channel={channel}
                enabled={localConfig.channels.includes(channel.value)}
                onChange={(enabled) => handleChannelToggle(channel.value, enabled)}
              />
            ))}
          </div>
          {/* El error del grupo de canales entra suave, como el de cualquier campo. */}
          <ErrorDelCampo
            id="recordatorio-canales-error"
            mensaje={
              localConfig.channels.length === 0
                ? t('inmobiliaria.cobros.recordatorioConfig.selectAtLeastOneChannel')
                : null
            }
          />
          {/* El back guarda los DÍAS (`agency.reminderDaysBefore/After`) y no
              tiene columna para los canales. Decirlo es preferible a que el
              cartel de «guardado» abarque algo que no se guardó. */}
          <p className="text-[11px] text-muted-foreground">
            {t('inmobiliaria.cobros.recordatorioConfig.canalesNoSeGuardan')}
          </p>
        </StaggerItem>

        {/* Message Templates Section */}
        <StaggerItem as="section" key="plantillas" className="space-y-4">
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
        </StaggerItem>
        </Stagger>
      </CajonCuerpo>

      {/* Acciones: en el pie fijo del cajón, la principal a la derecha. */}
      <CajonPie>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSaving}
        >
          {t('inmobiliaria.cobros.recordatorioConfig.cancel')}
        </Button>
        <Button
          type="button"
          className="bg-primary hover:opacity-90 text-primary-fg"
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
      </CajonPie>
    </Cajon>
  );
}

export default RecordatorioConfig;
