'use client';

import { useState, useMemo } from 'react';
import {
  Buildings,
  House,
  Storefront,
  Warehouse,
  Briefcase,
  MapPin,
  CurrencyDollar,
  Percent,
  CalendarBlank,
  Timer,
  User,
  Info,
  SpinnerGap,
  FloppyDisk,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { Consignacion, ConsignacionFormData } from '@/lib/types/inmobiliaria';
import { MOCK_AGENTES } from '@/lib/data/mock-inmobiliaria';

interface ConsignacionEditFormProps {
  consignacion: Consignacion;
  onSubmit: (data: ConsignacionFormData) => Promise<void>;
  onCancel: () => void;
}

// Property types with icons
const PROPERTY_TYPES: { value: Consignacion['propertyType']; label: string; icon: React.ElementType }[] = [
  { value: 'apartment', label: 'Apartamento', icon: Buildings },
  { value: 'house', label: 'Casa', icon: House },
  { value: 'studio', label: 'Estudio', icon: Buildings },
  { value: 'commercial', label: 'Local Comercial', icon: Storefront },
  { value: 'office', label: 'Oficina', icon: Briefcase },
  { value: 'warehouse', label: 'Bodega', icon: Warehouse },
];

// Zones in Bogotá
const ZONES = [
  'Chicó',
  'Chapinero',
  'Usaquén',
  'Cedritos',
  'Rosales',
  'La Cabrera',
  'Salitre',
  'Centro Internacional',
  'Santa Bárbara',
  'Country',
  'Virrey',
  'Contador',
  'El Nogal',
  'Parque 93',
  'Zona G',
  'Teusaquillo',
];

function InputWrapper({
  label,
  required,
  helper,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {helper && !error && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{helper}</p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/**
 * ConsignacionEditForm - Form for editing property/consignacion data
 */
export function ConsignacionEditForm({
  consignacion,
  onSubmit,
  onCancel,
}: ConsignacionEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    propertyTitle: consignacion.propertyTitle,
    propertyAddress: consignacion.propertyAddress,
    propertyCity: consignacion.propertyCity,
    propertyZone: consignacion.propertyZone,
    propertyType: consignacion.propertyType,
    monthlyRent: consignacion.monthlyRent,
    adminFee: consignacion.adminFee || 0,
    commissionPercent: consignacion.commissionPercent,
    agenteId: consignacion.agenteId,
    minimumTerm: consignacion.minimumTerm || 12,
    contractDate: consignacion.contractDate.split('T')[0],
    contractEndDate: consignacion.contractEndDate?.split('T')[0] || '',
  });

  // Get agentes list
  const agentes = useMemo(() => MOCK_AGENTES.filter(a => a.status === 'active'), []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value,
    }));
    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.propertyTitle.trim()) {
      newErrors.propertyTitle = 'El título es requerido';
    }
    if (!formData.propertyAddress.trim()) {
      newErrors.propertyAddress = 'La dirección es requerida';
    }
    if (!formData.propertyCity.trim()) {
      newErrors.propertyCity = 'La ciudad es requerida';
    }
    if (!formData.propertyZone) {
      newErrors.propertyZone = 'La zona es requerida';
    }
    if (!formData.monthlyRent || formData.monthlyRent <= 0) {
      newErrors.monthlyRent = 'El canon mensual debe ser mayor a 0';
    }
    if (!formData.commissionPercent || formData.commissionPercent <= 0) {
      newErrors.commissionPercent = 'La comisión debe ser mayor a 0';
    }
    if (!formData.agenteId) {
      newErrors.agenteId = 'Debe seleccionar un agente';
    }
    if (!formData.contractDate) {
      newErrors.contractDate = 'La fecha de inicio es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        propietarioId: consignacion.propietarioId,
        propertyTitle: formData.propertyTitle,
        propertyAddress: formData.propertyAddress,
        propertyCity: formData.propertyCity,
        propertyZone: formData.propertyZone,
        propertyType: formData.propertyType,
        monthlyRent: Number(formData.monthlyRent),
        adminFee: Number(formData.adminFee) || undefined,
        commissionPercent: Number(formData.commissionPercent),
        agenteId: formData.agenteId,
        minimumTerm: Number(formData.minimumTerm) || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate estimated commission
  const estimatedCommission = useMemo(() => {
    if (formData.monthlyRent && formData.commissionPercent) {
      return Math.round(Number(formData.monthlyRent) * (Number(formData.commissionPercent) / 100));
    }
    return 0;
  }, [formData.monthlyRent, formData.commissionPercent]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Property Info Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-neutral-900 dark:text-white">
          <Buildings className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold">Información del inmueble</h3>
        </div>

        {/* Property Type */}
        <InputWrapper label="Tipo de inmueble" required error={errors.propertyType}>
          <div className="grid grid-cols-3 gap-2">
            {PROPERTY_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = formData.propertyType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, propertyType: type.value }))}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all',
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5',
                      isSelected
                        ? 'text-indigo-500'
                        : 'text-neutral-500 dark:text-neutral-400'
                    )}
                  />
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isSelected
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-neutral-600 dark:text-neutral-400'
                    )}
                  >
                    {type.label}
                  </span>
                </button>
              );
            })}
          </div>
        </InputWrapper>

        {/* Title */}
        <InputWrapper label="Título del inmueble" required error={errors.propertyTitle}>
          <input
            type="text"
            name="propertyTitle"
            value={formData.propertyTitle}
            onChange={handleChange}
            placeholder="Ej: Apartamento Moderno Chicó"
            className={cn(
              'w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#141416] text-neutral-900 dark:text-white placeholder:text-neutral-400',
              errors.propertyTitle
                ? 'border-red-300 dark:border-red-700'
                : 'border-neutral-200 dark:border-neutral-700 focus:border-indigo-500 dark:focus:border-indigo-500'
            )}
          />
        </InputWrapper>

        {/* Address */}
        <InputWrapper label="Dirección" required error={errors.propertyAddress}>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              name="propertyAddress"
              value={formData.propertyAddress}
              onChange={handleChange}
              placeholder="Cra 11 #94-45, Apto 701"
              className={cn(
                'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-[#141416] text-neutral-900 dark:text-white placeholder:text-neutral-400',
                errors.propertyAddress
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-neutral-200 dark:border-neutral-700 focus:border-indigo-500 dark:focus:border-indigo-500'
              )}
            />
          </div>
        </InputWrapper>

        {/* City & Zone */}
        <div className="grid grid-cols-2 gap-4">
          <InputWrapper label="Ciudad" required error={errors.propertyCity}>
            <input
              type="text"
              name="propertyCity"
              value={formData.propertyCity}
              onChange={handleChange}
              placeholder="Bogotá"
              className={cn(
                'w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#141416] text-neutral-900 dark:text-white placeholder:text-neutral-400',
                errors.propertyCity
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-neutral-200 dark:border-neutral-700 focus:border-indigo-500 dark:focus:border-indigo-500'
              )}
            />
          </InputWrapper>

          <InputWrapper label="Zona" required error={errors.propertyZone}>
            <select
              name="propertyZone"
              value={formData.propertyZone}
              onChange={handleChange}
              className={cn(
                'w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#141416] text-neutral-900 dark:text-white',
                errors.propertyZone
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-neutral-200 dark:border-neutral-700 focus:border-indigo-500 dark:focus:border-indigo-500'
              )}
            >
              <option value="">Seleccionar zona</option>
              {ZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </InputWrapper>
        </div>
      </div>

      {/* Financial Info Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-neutral-900 dark:text-white">
          <CurrencyDollar className="w-5 h-5 text-emerald-500" />
          <h3 className="font-semibold">Información financiera</h3>
        </div>

        {/* Monthly Rent & Admin Fee */}
        <div className="grid grid-cols-2 gap-4">
          <InputWrapper label="Canon mensual" required error={errors.monthlyRent}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
              <input
                type="number"
                name="monthlyRent"
                value={formData.monthlyRent}
                onChange={handleChange}
                placeholder="3200000"
                min="0"
                step="50000"
                className={cn(
                  'w-full pl-8 pr-4 py-2.5 rounded-xl border bg-white dark:bg-[#141416] text-neutral-900 dark:text-white placeholder:text-neutral-400',
                  errors.monthlyRent
                    ? 'border-red-300 dark:border-red-700'
                    : 'border-neutral-200 dark:border-neutral-700 focus:border-indigo-500 dark:focus:border-indigo-500'
                )}
              />
            </div>
          </InputWrapper>

          <InputWrapper label="Administración" helper="Opcional">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
              <input
                type="number"
                name="adminFee"
                value={formData.adminFee}
                onChange={handleChange}
                placeholder="250000"
                min="0"
                step="10000"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-indigo-500 dark:focus:border-indigo-500"
              />
            </div>
          </InputWrapper>
        </div>

        {/* Commission */}
        <InputWrapper label="Comisión de administración" required error={errors.commissionPercent}>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="number"
                name="commissionPercent"
                value={formData.commissionPercent}
                onChange={handleChange}
                placeholder="10"
                min="1"
                max="20"
                step="0.5"
                className={cn(
                  'w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#141416] text-neutral-900 dark:text-white placeholder:text-neutral-400',
                  errors.commissionPercent
                    ? 'border-red-300 dark:border-red-700'
                    : 'border-neutral-200 dark:border-neutral-700 focus:border-indigo-500 dark:focus:border-indigo-500'
                )}
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            </div>
            {estimatedCommission > 0 && (
              <div className="px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm">
                ≈ {formatCurrency(estimatedCommission)}/mes
              </div>
            )}
          </div>
        </InputWrapper>
      </div>

      {/* Contract Info Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-neutral-900 dark:text-white">
          <CalendarBlank className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold">Términos del contrato</h3>
        </div>

        {/* Agent Selection */}
        <InputWrapper label="Agente asignado" required error={errors.agenteId}>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <select
              name="agenteId"
              value={formData.agenteId}
              onChange={handleChange}
              className={cn(
                'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-[#141416] text-neutral-900 dark:text-white',
                errors.agenteId
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-neutral-200 dark:border-neutral-700 focus:border-indigo-500 dark:focus:border-indigo-500'
              )}
            >
              <option value="">Seleccionar agente</option>
              {agentes.map((agente) => (
                <option key={agente.id} value={agente.id}>
                  {agente.name} - {agente.zone || 'Sin zona'}
                </option>
              ))}
            </select>
          </div>
        </InputWrapper>

        {/* Contract Dates */}
        <div className="grid grid-cols-2 gap-4">
          <InputWrapper label="Fecha inicio contrato" required error={errors.contractDate}>
            <input
              type="date"
              name="contractDate"
              value={formData.contractDate}
              onChange={handleChange}
              className={cn(
                'w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#141416] text-neutral-900 dark:text-white',
                errors.contractDate
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-neutral-200 dark:border-neutral-700 focus:border-indigo-500 dark:focus:border-indigo-500'
              )}
            />
          </InputWrapper>

          <InputWrapper label="Fecha fin contrato" helper="Opcional">
            <input
              type="date"
              name="contractEndDate"
              value={formData.contractEndDate}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-500"
            />
          </InputWrapper>
        </div>

        {/* Minimum Term */}
        <InputWrapper label="Plazo mínimo arriendo" helper="En meses">
          <div className="relative">
            <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="number"
              name="minimumTerm"
              value={formData.minimumTerm}
              onChange={handleChange}
              placeholder="12"
              min="1"
              max="36"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-indigo-500 dark:focus:border-indigo-500"
            />
          </div>
        </InputWrapper>
      </div>

      {/* Info Alert */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Los cambios se aplicarán inmediatamente. El propietario será notificado de cualquier modificación en los términos financieros.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <SpinnerGap className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <FloppyDisk className="w-4 h-4" />
              Guardar cambios
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default ConsignacionEditForm;
