'use client';

import { Percent, CalendarBlank, CurrencyDollar } from '@phosphor-icons/react';

export interface AgencyOperationsFormData {
  defaultCommission: number;
  collectionDay: number;
  dispersionDay: number;
}

interface AgencyOperationsFormProps {
  data: AgencyOperationsFormData;
  onChange: (updates: Partial<AgencyOperationsFormData>) => void;
}

function NumberInput({
  label,
  description,
  value,
  min,
  max,
  onChange,
  suffix,
  icon: Icon,
}: {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  suffix?: string;
  icon?: React.ElementType;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value, 10);
    if (isNaN(raw)) return;
    const clamped = Math.min(max, Math.max(min, raw));
    onChange(clamped);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
        <span className="flex items-center gap-1.5">
          {Icon && <Icon className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />}
          {label}
        </span>
      </label>
      {description && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">{description}</p>
      )}
      <div className="relative">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={handleChange}
          className="w-full px-4 py-3 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400 dark:text-neutral-500">
            {suffix}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
        Valor entre {min} y {max}
      </p>
    </div>
  );
}

/**
 * AgencyOperationsForm - Step 2 of AgencySetupWizard
 * Default operational settings (all optional with sensible defaults)
 */
export function AgencyOperationsForm({ data, onChange }: AgencyOperationsFormProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Configura los valores por defecto para tu operación. Puedes cambiarlos en cualquier momento desde Configuración.
      </p>

      <NumberInput
        label="Comisión por defecto"
        description="Porcentaje que cobras sobre el arriendo mensual"
        value={data.defaultCommission}
        min={0}
        max={100}
        onChange={(val) => onChange({ defaultCommission: val })}
        suffix="%"
        icon={Percent}
      />

      <NumberInput
        label="Día de cobro"
        description="Día del mes en que se cobra el arriendo a los inquilinos"
        value={data.collectionDay}
        min={1}
        max={28}
        onChange={(val) => onChange({ collectionDay: val })}
        suffix="del mes"
        icon={CalendarBlank}
      />

      <NumberInput
        label="Día de dispersión"
        description="Día del mes en que se transfiere el pago a los propietarios"
        value={data.dispersionDay}
        min={1}
        max={28}
        onChange={(val) => onChange({ dispersionDay: val })}
        suffix="del mes"
        icon={CurrencyDollar}
      />
    </div>
  );
}
