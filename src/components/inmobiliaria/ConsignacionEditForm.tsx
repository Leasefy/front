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
  FloppyDisk,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { RadioCardGroup, RadioCard } from '@leasefy/cadence';
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

// Sugerencias de barrio, no la lista completa: son sólo de Bogotá y el campo
// es de texto libre. Ver el <datalist> más abajo.
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
      <label className="text-sm font-medium text-fg dark:text-fg-subtle">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {helper && !error && (
        <p className="text-xs text-fg-muted dark:text-fg-subtle">{helper}</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
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

  // contract-addendum-2.md §A.1 — the discriminator is derived server-side
  // and lives on the mandate itself; a sale mandate never has a canon.
  const isSaleListing = consignacion.listingType === 'sale';

  // Form state
  const [formData, setFormData] = useState({
    propertyTitle: consignacion.propertyTitle,
    propertyAddress: consignacion.propertyAddress,
    propertyCity: consignacion.propertyCity,
    propertyZone: consignacion.propertyZone,
    propertyType: consignacion.propertyType,
    // `null` on a sale mandate (§A.2) — the number input renders it as ''.
    monthlyRent: consignacion.monthlyRent ?? '',
    adminFee: consignacion.adminFee || 0,
    commissionPercent: consignacion.commissionPercent,
    // `null` on a rent mandate and on a pre-addendum sale row (§A.2) —
    // never render/send `0 %`.
    saleCommissionPercent: consignacion.saleCommissionPercent ?? '',
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
    // contract-addendum-2.md §A.2 — `!null` is `true` in JS, so a naive
    // `!formData.monthlyRent` check made a sale mandate (monthlyRent: null)
    // permanently unsaveable. Branch on `isSaleListing` instead of on the
    // value's truthiness.
    if (isSaleListing) {
      if (!formData.saleCommissionPercent || Number(formData.saleCommissionPercent) <= 0) {
        newErrors.saleCommissionPercent = t('inmobiliaria.consignaciones.editForm.validation.saleCommissionPositive');
      }
    } else {
      if (!formData.monthlyRent || Number(formData.monthlyRent) <= 0) {
        newErrors.monthlyRent = t('inmobiliaria.consignaciones.editForm.validation.rentPositive');
      }
      if (!formData.commissionPercent || formData.commissionPercent <= 0) {
        newErrors.commissionPercent = t('inmobiliaria.consignaciones.editForm.validation.commissionPositive');
      }
    }
    // NOTE: agenteId is intentionally NOT validated/required — agent
    // reassignment is disabled below (agente ids are AgencyMember ids while
    // the backend consignacion stores a User id; wiring it would corrupt the
    // assignment). The service strips agenteId from the update payload.
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
        // contract-addendum-2.md §A.2/§A.7 — `Number(null) === 0`, which used
        // to send a C6-violating `monthlyRent: 0` (and an R2 400) on a sale
        // mandate. Sale sends `saleCommissionPercent` and `commissionPercent:
        // 0` instead; monthlyRent/adminFee/minimumTerm are OMITTED, never 0.
        ...(isSaleListing
          ? {
              commissionPercent: 0,
              saleCommissionPercent: Number(formData.saleCommissionPercent),
            }
          : {
              monthlyRent: Number(formData.monthlyRent),
              adminFee: Number(formData.adminFee) || undefined,
              commissionPercent: Number(formData.commissionPercent),
              minimumTerm: Number(formData.minimumTerm) || undefined,
            }),
        agenteId: formData.agenteId,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate estimated commission — rent mandates only (§A.3: a sale
  // mandate's commission is a percentage of the sale price, which this form
  // does not edit — Property.salePrice lives on a different entity).
  const estimatedCommission = useMemo(() => {
    if (!isSaleListing && formData.monthlyRent && formData.commissionPercent) {
      return Math.round(Number(formData.monthlyRent) * (Number(formData.commissionPercent) / 100));
    }
    return 0;
  }, [isSaleListing, formData.monthlyRent, formData.commissionPercent]);

  // Use i18n formatCurrency instead of local function

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Property Info Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-fg">
          <Buildings className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">{t('inmobiliaria.consignaciones.editForm.propertyInfo')}</h3>
        </div>

        {/* Property Type */}
        <InputWrapper label={t('inmobiliaria.consignaciones.editForm.propertyTypeLabel')} required error={errors.propertyType}>
          <RadioCardGroup
            className="grid grid-cols-3 gap-2"
            value={formData.propertyType}
            onValueChange={(v) => setFormData((prev) => ({ ...prev, propertyType: v as Consignacion['propertyType'] }))}
          >
            {PROPERTY_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <RadioCard
                  key={type.value}
                  value={type.value}
                  label={
                    <span className="inline-flex flex-col items-center gap-1.5 text-center text-xs font-medium">
                      <Icon className="w-5 h-5" />
                      {t(type.labelKey)}
                    </span>
                  }
                />
              );
            })}
          </RadioCardGroup>
        </InputWrapper>

        {/* Title */}
        <InputWrapper label={t('inmobiliaria.consignaciones.editForm.propertyTitle')} required error={errors.propertyTitle}>
          <Input
            type="text"
            name="propertyTitle"
            value={formData.propertyTitle}
            onChange={handleChange}
            placeholder={t('inmobiliaria.consignaciones.editForm.propertyTitlePlaceholder')}
            className={cn('w-full', errors.propertyTitle && 'border-danger/30')}
          />
        </InputWrapper>

        {/* Address */}
        <InputWrapper label={t('inmobiliaria.consignaciones.editForm.address')} required error={errors.propertyAddress}>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle" />
            <Input
              type="text"
              name="propertyAddress"
              value={formData.propertyAddress}
              onChange={handleChange}
              placeholder={t('inmobiliaria.consignaciones.editForm.addressPlaceholder')}
              className={cn('w-full pl-10', errors.propertyAddress && 'border-danger/30')}
            />
          </div>
        </InputWrapper>

        {/* City & Zone */}
        <div className="grid grid-cols-2 gap-4">
          <InputWrapper label={t('inmobiliaria.consignaciones.editForm.city')} required error={errors.propertyCity}>
            <Input
              type="text"
              name="propertyCity"
              value={formData.propertyCity}
              onChange={handleChange}
              placeholder={t('inmobiliaria.consignaciones.editForm.cityPlaceholder')}
              className={cn('w-full', errors.propertyCity && 'border-danger/30')}
            />
          </InputWrapper>

          {/* El barrio se escribe; la lista de Bogotá queda como SUGERENCIA.
              Era un <Select> cerrado con barrios de Bogotá únicamente: una
              inmobiliaria de Medellín no podía elegir el suyo, y un inmueble
              en El Poblado abría el formulario con el campo en blanco —
              guardar desde ahí le cambiaba el barrio o se lo borraba. */}
          <InputWrapper label={t('inmobiliaria.consignaciones.editForm.zone')} required error={errors.propertyZone}>
            <Input
              value={formData.propertyZone || ''}
              list="zonas-sugeridas"
              placeholder={t('inmobiliaria.consignaciones.editForm.selectZone')}
              onChange={(e) => {
                const v = e.target.value;
                setFormData((prev) => ({ ...prev, propertyZone: v }));
                if (errors.propertyZone) setErrors((prev) => ({ ...prev, propertyZone: '' }));
              }}
              className={cn('w-full', errors.propertyZone && 'border-danger/30')}
            />
            <datalist id="zonas-sugeridas">
              {ZONES.map((zone) => (
                <option key={zone} value={zone} />
              ))}
            </datalist>
          </InputWrapper>
        </div>
      </div>

      {/* Financial Info Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-fg">
          <CurrencyDollar className="w-5 h-5 text-success" />
          <h3 className="font-semibold">{t('inmobiliaria.consignaciones.editForm.financialInfo')}</h3>
        </div>

        {isSaleListing ? (
          // contract-addendum-2.md §A.2 — a sale mandate has no canon and no
          // administration fee. Only the sale commission is editable here.
          <InputWrapper
            label={t('inmobiliaria.consignaciones.editForm.saleCommission')}
            required
            error={errors.saleCommissionPercent}
          >
            <div className="relative">
              <Input
                type="number"
                name="saleCommissionPercent"
                value={formData.saleCommissionPercent}
                onChange={handleChange}
                placeholder="3"
                min="0"
                max="100"
                step="0.5"
                className={cn('w-full pr-10', errors.saleCommissionPercent && 'border-danger/30')}
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
            </div>
          </InputWrapper>
        ) : (
          <>
            {/* Monthly Rent & Admin Fee */}
            <div className="grid grid-cols-2 gap-4">
              <InputWrapper label={t('inmobiliaria.consignaciones.editForm.monthlyRent')} required error={errors.monthlyRent}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle">$</span>
                  <Input
                    type="number"
                    name="monthlyRent"
                    value={formData.monthlyRent}
                    onChange={handleChange}
                    placeholder="3200000"
                    min="0"
                    step="50000"
                    className={cn('w-full pl-8', errors.monthlyRent && 'border-danger/30')}
                  />
                </div>
              </InputWrapper>

              <InputWrapper label={t('inmobiliaria.consignaciones.editForm.administration')} helper={t('common.optional')}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle">$</span>
                  <Input
                    type="number"
                    name="adminFee"
                    value={formData.adminFee}
                    onChange={handleChange}
                    placeholder="250000"
                    min="0"
                    step="10000"
                    className="w-full pl-8"
                  />
                </div>
              </InputWrapper>
            </div>

            {/* Commission */}
            <InputWrapper label={t('inmobiliaria.consignaciones.editForm.administrationCommission')} required error={errors.commissionPercent}>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    name="commissionPercent"
                    value={formData.commissionPercent}
                    onChange={handleChange}
                    placeholder="10"
                    min="1"
                    max="20"
                    step="0.5"
                    className={cn('w-full pr-10', errors.commissionPercent && 'border-danger/30')}
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
                </div>
                {estimatedCommission > 0 && (
                  <div className="px-3 py-2 rounded-md bg-success-soft text-success text-sm">
                    {t('inmobiliaria.consignaciones.editForm.estimatedPerMonth', { amount: fmtCurrency(estimatedCommission) })}
                  </div>
                )}
              </div>
            </InputWrapper>
          </>
        )}
      </div>

      {/* Contract Info Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-fg">
          <CalendarBlank className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">{t('inmobiliaria.consignaciones.editForm.contractTerms')}</h3>
        </div>

        {/* Agente: el valor es el User id (`agente.userId`), que es lo que
            `assign-agent` exige y lo que la consignación guarda en `agenteId`.
            Los agentes sin cuenta todavía (invitación pendiente) no se listan:
            no se les puede asignar nada. La página llama a assign-agent sólo
            si cambió. */}
        <InputWrapper
          label={t('inmobiliaria.consignaciones.editForm.assignedAgent')}
          helper={t('inmobiliaria.consignaciones.editForm.agentReassignHelp')}
        >
          <Select
            value={formData.agenteId || undefined}
            onValueChange={(v) => {
              setFormData((prev) => ({ ...prev, agenteId: v }));
              if (errors.agenteId) setErrors((prev) => ({ ...prev, agenteId: '' }));
            }}
          >
            <SelectTrigger className={cn('w-full', errors.agenteId && 'border-danger/30')}>
              <User className="w-5 h-5 text-fg-subtle shrink-0" />
              <SelectValue placeholder={t('inmobiliaria.consignaciones.editForm.selectAgent')} />
            </SelectTrigger>
            <SelectContent>
              {agentes
                .filter((agente) => !!agente.userId)
                .map((agente) => (
                  <SelectItem key={agente.id} value={agente.userId!}>
                    {agente.name} - {agente.zone || t('inmobiliaria.consignaciones.editForm.noZone')}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </InputWrapper>

        {/* Contract Dates */}
        <div className="grid grid-cols-2 gap-4">
          <InputWrapper label={t('inmobiliaria.consignaciones.editForm.contractStartDate')} required error={errors.contractDate}>
            <Input
              type="date"
              name="contractDate"
              value={formData.contractDate}
              onChange={handleChange}
              className={cn('w-full', errors.contractDate && 'border-danger/30')}
            />
          </InputWrapper>

          <InputWrapper label={t('inmobiliaria.consignaciones.editForm.contractEndDate')} helper={t('common.optional')}>
            <Input
              type="date"
              name="contractEndDate"
              value={formData.contractEndDate}
              onChange={handleChange}
              className="w-full"
            />
          </InputWrapper>
        </div>

        {/* Minimum Term — contract-addendum-2.md §A.2: null, always, on a
            sale mandate. There is no lease term to bound. */}
        {!isSaleListing && (
          <InputWrapper label={t('inmobiliaria.consignaciones.editForm.minimumLeaseTerm')} helper={t('inmobiliaria.consignaciones.editForm.inMonths')}>
            <div className="relative">
              <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle" />
              <Input
                type="number"
                name="minimumTerm"
                value={formData.minimumTerm}
                onChange={handleChange}
                placeholder="12"
                min="1"
                max="36"
                className="w-full pl-10"
              />
            </div>
          </InputWrapper>
        )}
      </div>

      {/* Info Alert */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-primary-soft border border-primary/30">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-primary">
          {t('inmobiliaria.consignaciones.editForm.changesNotice')}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-border-faint dark:border-border-strong">
        <Button
          type="button"
          variant="secondary"
          hideArrow
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1"
        >
          {t('inmobiliaria.consignaciones.editForm.cancel')}
        </Button>
        <Button
          type="submit"
          hideArrow
          disabled={isSubmitting}
          isLoading={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            t('inmobiliaria.consignaciones.editForm.saving')
          ) : (
            <>
              <FloppyDisk className="w-4 h-4" />
              {t('inmobiliaria.consignaciones.editForm.saveChanges')}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default ConsignacionEditForm;
