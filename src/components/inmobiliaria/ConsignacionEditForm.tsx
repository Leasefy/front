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
import { useI18n } from '@/lib/i18n';
import type { Consignacion, ConsignacionFormData } from '@/lib/types/inmobiliaria';
import { useAgentes } from '@/lib/hooks/useInmobiliaria';

interface ConsignacionEditFormProps {
  consignacion: Consignacion;
  onSubmit: (data: ConsignacionFormData) => Promise<void>;
  onCancel: () => void;
}

// Property types with icons (labels resolved via i18n)
const PROPERTY_TYPES: { value: Consignacion['propertyType']; labelKey: string; icon: React.ElementType }[] = [
  { value: 'apartment', labelKey: 'inmobiliaria.consignaciones.propertyType.apartment', icon: Buildings },
  { value: 'house', labelKey: 'inmobiliaria.consignaciones.propertyType.house', icon: House },
  { value: 'studio', labelKey: 'inmobiliaria.consignaciones.propertyType.studio', icon: Buildings },
  { value: 'commercial', labelKey: 'inmobiliaria.consignaciones.propertyType.commercial', icon: Storefront },
  { value: 'office', labelKey: 'inmobiliaria.consignaciones.propertyType.office', icon: Briefcase },
  { value: 'warehouse', labelKey: 'inmobiliaria.consignaciones.propertyType.warehouse', icon: Warehouse },
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
        {required && <span className="text-[#C4503B] ml-0.5">*</span>}
      </label>
      {children}
      {helper && !error && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{helper}</p>
      )}
      {error && <p className="text-xs text-[#C4503B]">{error}</p>}
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
  const { t, formatCurrency: fmtCurrency } = useI18n();

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
  const { agentes: allAgentes } = useAgentes();
  const agentes = useMemo(() => allAgentes.filter(a => a.status === 'active'), [allAgentes]);

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
      newErrors.propertyTitle = t('inmobiliaria.consignaciones.editForm.validation.titleRequired');
    }
    if (!formData.propertyAddress.trim()) {
      newErrors.propertyAddress = t('inmobiliaria.consignaciones.editForm.validation.addressRequired');
    }
    if (!formData.propertyCity.trim()) {
      newErrors.propertyCity = t('inmobiliaria.consignaciones.editForm.validation.cityRequired');
    }
    if (!formData.propertyZone) {
      newErrors.propertyZone = t('inmobiliaria.consignaciones.editForm.validation.zoneRequired');
    }
    if (!formData.monthlyRent || formData.monthlyRent <= 0) {
      newErrors.monthlyRent = t('inmobiliaria.consignaciones.editForm.validation.rentPositive');
    }
    if (!formData.commissionPercent || formData.commissionPercent <= 0) {
      newErrors.commissionPercent = t('inmobiliaria.consignaciones.editForm.validation.commissionPositive');
    }
    if (!formData.agenteId) {
      newErrors.agenteId = t('inmobiliaria.consignaciones.editForm.validation.agentRequired');
    }
    if (!formData.contractDate) {
      newErrors.contractDate = t('inmobiliaria.consignaciones.editForm.validation.startDateRequired');
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

  // Use i18n formatCurrency instead of local function

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Property Info Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-neutral-900 dark:text-white">
          <Buildings className="w-5 h-5 text-[#1A40FF]" />
          <h3 className="font-semibold">{t('inmobiliaria.consignaciones.editForm.propertyInfo')}</h3>
        </div>

        {/* Property Type */}
        <InputWrapper label={t('inmobiliaria.consignaciones.editForm.propertyTypeLabel')} required error={errors.propertyType}>
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
                      ? 'border-[#1A40FF]/30 bg-[#EEF1FF] dark:bg-[#1A40FF]/15'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5',
                      isSelected
                        ? 'text-[#1A40FF]'
                        : 'text-neutral-500 dark:text-neutral-400'
                    )}
                  />
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isSelected
                        ? 'text-[#1A40FF] dark:text-[#5570FF]'
                        : 'text-neutral-600 dark:text-neutral-400'
                    )}
                  >
                    {t(type.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </InputWrapper>

        {/* Title */}
        <InputWrapper label={t('inmobiliaria.consignaciones.editForm.propertyTitle')} required error={errors.propertyTitle}>
          <input
            type="text"
            name="propertyTitle"
            value={formData.propertyTitle}
            onChange={handleChange}
            placeholder={t('inmobiliaria.consignaciones.editForm.propertyTitlePlaceholder')}
            className={cn(
              'w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#141416] text-neutral-900 dark:text-white placeholder:text-neutral-400',
              errors.propertyTitle
                ? 'border-[#C4503B]/30 dark:border-[#C4503B]/40'
                : 'border-neutral-200 dark:border-neutral-700 focus:border-[#1A40FF]/30 dark:focus:border-[#1A40FF]/30'
            )}
          />
        </InputWrapper>

        {/* Address */}
        <InputWrapper label={t('inmobiliaria.consignaciones.editForm.address')} required error={errors.propertyAddress}>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              name="propertyAddress"
              value={formData.propertyAddress}
              onChange={handleChange}
              placeholder={t('inmobiliaria.consignaciones.editForm.addressPlaceholder')}
              className={cn(
                'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-[#141416] text-neutral-900 dark:text-white placeholder:text-neutral-400',
                errors.propertyAddress
                  ? 'border-[#C4503B]/30 dark:border-[#C4503B]/40'
                  : 'border-neutral-200 dark:border-neutral-700 focus:border-[#1A40FF]/30 dark:focus:border-[#1A40FF]/30'
              )}
            />
          </div>
        </InputWrapper>

        {/* City & Zone */}
        <div className="grid grid-cols-2 gap-4">
          <InputWrapper label={t('inmobiliaria.consignaciones.editForm.city')} required error={errors.propertyCity}>
            <input
              type="text"
              name="propertyCity"
              value={formData.propertyCity}
              onChange={handleChange}
              placeholder={t('inmobiliaria.consignaciones.editForm.cityPlaceholder')}
              className={cn(
                'w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#141416] text-neutral-900 dark:text-white placeholder:text-neutral-400',
                errors.propertyCity
                  ? 'border-[#C4503B]/30 dark:border-[#C4503B]/40'
                  : 'border-neutral-200 dark:border-neutral-700 focus:border-[#1A40FF]/30 dark:focus:border-[#1A40FF]/30'
              )}
            />
          </InputWrapper>

          <InputWrapper label={t('inmobiliaria.consignaciones.editForm.zone')} required error={errors.propertyZone}>
            <select
              name="propertyZone"
              value={formData.propertyZone}
              onChange={handleChange}
              className={cn(
                'w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#141416] text-neutral-900 dark:text-white',
                errors.propertyZone
                  ? 'border-[#C4503B]/30 dark:border-[#C4503B]/40'
                  : 'border-neutral-200 dark:border-neutral-700 focus:border-[#1A40FF]/30 dark:focus:border-[#1A40FF]/30'
              )}
            >
              <option value="">{t('inmobiliaria.consignaciones.editForm.selectZone')}</option>
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
          <CurrencyDollar className="w-5 h-5 text-[#2C7A53]" />
          <h3 className="font-semibold">{t('inmobiliaria.consignaciones.editForm.financialInfo')}</h3>
        </div>

        {/* Monthly Rent & Admin Fee */}
        <div className="grid grid-cols-2 gap-4">
          <InputWrapper label={t('inmobiliaria.consignaciones.editForm.monthlyRent')} required error={errors.monthlyRent}>
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
                    ? 'border-[#C4503B]/30 dark:border-[#C4503B]/40'
                    : 'border-neutral-200 dark:border-neutral-700 focus:border-[#1A40FF]/30 dark:focus:border-[#1A40FF]/30'
                )}
              />
            </div>
          </InputWrapper>

          <InputWrapper label={t('inmobiliaria.consignaciones.editForm.administration')} helper={t('common.optional')}>
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
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-[#1A40FF]/30 dark:focus:border-[#1A40FF]/30"
              />
            </div>
          </InputWrapper>
        </div>

        {/* Commission */}
        <InputWrapper label={t('inmobiliaria.consignaciones.editForm.administrationCommission')} required error={errors.commissionPercent}>
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
                    ? 'border-[#C4503B]/30 dark:border-[#C4503B]/40'
                    : 'border-neutral-200 dark:border-neutral-700 focus:border-[#1A40FF]/30 dark:focus:border-[#1A40FF]/30'
                )}
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            </div>
            {estimatedCommission > 0 && (
              <div className="px-3 py-2 rounded-md bg-[#E8F3EC] dark:bg-[#2C7A53]/15 text-[#2C7A53] dark:text-[#3EAE70] text-sm">
                {t('inmobiliaria.consignaciones.editForm.estimatedPerMonth', { amount: fmtCurrency(estimatedCommission) })}
              </div>
            )}
          </div>
        </InputWrapper>
      </div>

      {/* Contract Info Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-neutral-900 dark:text-white">
          <CalendarBlank className="w-5 h-5 text-[#1A40FF]" />
          <h3 className="font-semibold">{t('inmobiliaria.consignaciones.editForm.contractTerms')}</h3>
        </div>

        {/* Agent Selection */}
        <InputWrapper label={t('inmobiliaria.consignaciones.editForm.assignedAgent')} required error={errors.agenteId}>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <select
              name="agenteId"
              value={formData.agenteId}
              onChange={handleChange}
              className={cn(
                'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-[#141416] text-neutral-900 dark:text-white',
                errors.agenteId
                  ? 'border-[#C4503B]/30 dark:border-[#C4503B]/40'
                  : 'border-neutral-200 dark:border-neutral-700 focus:border-[#1A40FF]/30 dark:focus:border-[#1A40FF]/30'
              )}
            >
              <option value="">{t('inmobiliaria.consignaciones.editForm.selectAgent')}</option>
              {agentes.map((agente) => (
                <option key={agente.id} value={agente.id}>
                  {agente.name} - {agente.zone || t('inmobiliaria.consignaciones.editForm.noZone')}
                </option>
              ))}
            </select>
          </div>
        </InputWrapper>

        {/* Contract Dates */}
        <div className="grid grid-cols-2 gap-4">
          <InputWrapper label={t('inmobiliaria.consignaciones.editForm.contractStartDate')} required error={errors.contractDate}>
            <input
              type="date"
              name="contractDate"
              value={formData.contractDate}
              onChange={handleChange}
              className={cn(
                'w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#141416] text-neutral-900 dark:text-white',
                errors.contractDate
                  ? 'border-[#C4503B]/30 dark:border-[#C4503B]/40'
                  : 'border-neutral-200 dark:border-neutral-700 focus:border-[#1A40FF]/30 dark:focus:border-[#1A40FF]/30'
              )}
            />
          </InputWrapper>

          <InputWrapper label={t('inmobiliaria.consignaciones.editForm.contractEndDate')} helper={t('common.optional')}>
            <input
              type="date"
              name="contractEndDate"
              value={formData.contractEndDate}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white focus:border-[#1A40FF]/30 dark:focus:border-[#1A40FF]/30"
            />
          </InputWrapper>
        </div>

        {/* Minimum Term */}
        <InputWrapper label={t('inmobiliaria.consignaciones.editForm.minimumLeaseTerm')} helper={t('inmobiliaria.consignaciones.editForm.inMonths')}>
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
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-[#1A40FF]/30 dark:focus:border-[#1A40FF]/30"
            />
          </div>
        </InputWrapper>
      </div>

      {/* Info Alert */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 border border-[#1A40FF]/30 dark:border-[#1A40FF]/40">
        <Info className="w-5 h-5 text-[#1A40FF] shrink-0 mt-0.5" />
        <p className="text-sm text-[#1A40FF] dark:text-[#5570FF]">
          {t('inmobiliaria.consignaciones.editForm.changesNotice')}
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
          {t('inmobiliaria.consignaciones.editForm.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A40FF] text-white font-medium hover:opacity-90 transition-colors disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <SpinnerGap className="w-4 h-4 animate-spin" />
              {t('inmobiliaria.consignaciones.editForm.saving')}
            </>
          ) : (
            <>
              <FloppyDisk className="w-4 h-4" />
              {t('inmobiliaria.consignaciones.editForm.saveChanges')}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default ConsignacionEditForm;
