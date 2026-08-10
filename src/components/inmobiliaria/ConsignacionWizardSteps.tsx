'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Buildings,
  HouseLine,
  CurrencyDollar,
  Percent,
  CalendarBlank,
  Clock,
  UserCircle,
  Camera,
  Plus,
  Trash,
  Package,
  NotePencil,
  Check,
  Warning,
  Pencil,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { IconButton, RadioCardGroup, RadioCard } from '@leasefy/cadence';
import { useI18n } from '@/lib/i18n';
import type { Propietario, Agente, PropietarioFormData, ConsignacionFormData, InventoryItem, Consignacion } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { PropietarioSelector } from './PropietarioSelector';
import { AgenteSelector } from './AgenteSelector';
import { PropertyLocationField, type PropertyLocationValue } from '@/components/publicar/PropertyLocationField';

// ============================================================================
// Shared Types
// ============================================================================

export interface WizardFormData extends ConsignacionFormData {
  newPropietarioData?: PropietarioFormData;
  inventoryItems: InventoryItem[];
  inventoryNotes: string;
  contractStartDate: string;
  /** Real coordinates from AddressAutocomplete/LocationPicker (LocationIQ). */
  propertyLatitude?: number;
  propertyLongitude?: number;
  propertyGeocodePlaceId?: string;
  propertyCoordsSource?: 'geocoded' | 'city';
}

export interface StepProps {
  formData: Partial<WizardFormData>;
  updateFormData: (data: Partial<WizardFormData>) => void;
  propietarios: Propietario[];
  agentes: Agente[];
}

// ============================================================================
// Property Type Options
// ============================================================================

const PROPERTY_TYPES: { value: Consignacion['propertyType']; labelKey: string; icon: string }[] = [
  { value: 'apartment', labelKey: 'inmobiliaria.consignaciones.propertyType.apartment', icon: '🏢' },
  { value: 'house', labelKey: 'inmobiliaria.consignaciones.propertyType.house', icon: '🏠' },
  { value: 'studio', labelKey: 'inmobiliaria.consignaciones.propertyType.studio', icon: '🛋️' },
  { value: 'commercial', labelKey: 'inmobiliaria.consignaciones.propertyType.commercial', icon: '🏪' },
  { value: 'office', labelKey: 'inmobiliaria.consignaciones.propertyType.office', icon: '🏬' },
  { value: 'warehouse', labelKey: 'inmobiliaria.consignaciones.propertyType.warehouse', icon: '🏭' },
];

const MINIMUM_TERMS: { value: number; labelKey: string }[] = [
  { value: 6, labelKey: 'inmobiliaria.consignaciones.wizard.step3.months6' },
  { value: 12, labelKey: 'inmobiliaria.consignaciones.wizard.step3.months12' },
  { value: 18, labelKey: 'inmobiliaria.consignaciones.wizard.step3.months18' },
  { value: 24, labelKey: 'inmobiliaria.consignaciones.wizard.step3.months24' },
];

const INVENTORY_CONDITIONS: { value: InventoryItem['condition']; labelKey: string; color: string }[] = [
  { value: 'excellent', labelKey: 'inmobiliaria.consignaciones.wizard.step5.conditionExcellent', color: 'text-success' },
  { value: 'good', labelKey: 'inmobiliaria.consignaciones.wizard.step5.conditionGood', color: 'text-primary' },
  { value: 'fair', labelKey: 'inmobiliaria.consignaciones.wizard.step5.conditionFair', color: 'text-warning' },
  { value: 'poor', labelKey: 'inmobiliaria.consignaciones.wizard.step5.conditionPoor', color: 'text-danger' },
];

// ============================================================================
// Step 1: Select Propietario
// ============================================================================

export function StepSelectPropietario({ formData, updateFormData, propietarios }: StepProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-fg dark:text-white mb-1">
          {t('inmobiliaria.consignaciones.wizard.step1.title')}
        </h2>
        <p className="text-fg-muted dark:text-fg-subtle">
          {t('inmobiliaria.consignaciones.wizard.step1.subtitle')}
        </p>
      </div>

      <PropietarioSelector
        propietarios={propietarios}
        value={formData.propietarioId || null}
        onChange={(id, data) => {
          updateFormData({
            propietarioId: id,
            newPropietarioData: data,
          });
        }}
        newPropietarioData={formData.newPropietarioData}
      />
    </div>
  );
}

// ============================================================================
// Step 2: Property Data
// ============================================================================

export function StepPropertyData({ formData, updateFormData }: StepProps) {
  const { t, locale } = useI18n();
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const errors: Record<string, string> = {};
  if (touched.propertyTitle && !formData.propertyTitle) errors.propertyTitle = t('inmobiliaria.consignaciones.wizard.step2.validation.titleRequired');
  if (touched.propertyAddress && !formData.propertyAddress) errors.propertyAddress = t('inmobiliaria.consignaciones.wizard.step2.validation.addressRequired');
  if (touched.propertyCity && !formData.propertyCity) errors.propertyCity = t('inmobiliaria.consignaciones.wizard.step2.validation.cityRequired');
  if (touched.propertyZone && !formData.propertyZone) errors.propertyZone = t('inmobiliaria.consignaciones.wizard.step2.validation.zoneRequired');
  if (touched.monthlyRent && (!formData.monthlyRent || formData.monthlyRent <= 0)) errors.monthlyRent = t('inmobiliaria.consignaciones.wizard.step2.validation.rentRequired');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-fg dark:text-white mb-1">
          {t('inmobiliaria.consignaciones.wizard.step2.title')}
        </h2>
        <p className="text-fg-muted dark:text-fg-subtle">
          {t('inmobiliaria.consignaciones.wizard.step2.subtitle')}
        </p>
      </div>

      <div className="space-y-4">
        {/* Property Type */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
            {t('inmobiliaria.consignaciones.wizard.step2.propertyTypeLabel')} <span className="text-danger">*</span>
          </label>
          <RadioCardGroup
            className="grid grid-cols-3 sm:grid-cols-6 gap-2"
            value={formData.propertyType || undefined}
            onValueChange={(v) => updateFormData({ propertyType: v as Consignacion['propertyType'] })}
          >
            {PROPERTY_TYPES.map((type) => (
              <RadioCard
                key={type.value}
                value={type.value}
                label={
                  <span className="flex flex-col items-center gap-1 text-xs font-medium text-center">
                    <span className="text-2xl leading-none">{type.icon}</span>
                    {t(type.labelKey)}
                  </span>
                }
              />
            ))}
          </RadioCardGroup>
        </div>

        {/* Property Title */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
            {t('inmobiliaria.consignaciones.wizard.step2.propertyTitleLabel')} <span className="text-danger">*</span>
          </label>
          <Input
            type="text"
            value={formData.propertyTitle || ''}
            onChange={(e) => updateFormData({ propertyTitle: e.target.value })}
            onBlur={() => handleBlur('propertyTitle')}
            placeholder={t('inmobiliaria.consignaciones.wizard.step2.propertyTitlePlaceholder')}
            className={cn('w-full', errors.propertyTitle && 'border-danger/30')}
          />
          {errors.propertyTitle && (
            <p className="text-xs text-danger flex items-center gap-1">
              <Warning className="w-3 h-3" />
              {errors.propertyTitle}
            </p>
          )}
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
            {t('inmobiliaria.consignaciones.wizard.step2.addressLabel')} <span className="text-danger">*</span>
          </label>
          <PropertyLocationField
            address={formData.propertyAddress || ''}
            city={formData.propertyCity}
            latitude={formData.propertyLatitude}
            longitude={formData.propertyLongitude}
            placeholder={t('inmobiliaria.consignaciones.wizard.step2.addressPlaceholder')}
            onChange={(partial: PropertyLocationValue) => {
              handleBlur('propertyAddress');
              updateFormData({
                ...(partial.address !== undefined ? { propertyAddress: partial.address } : {}),
                propertyLatitude: partial.latitude,
                propertyLongitude: partial.longitude,
                propertyGeocodePlaceId: partial.geocodePlaceId,
                propertyCoordsSource: partial.coordsSource,
              });
            }}
          />
          {errors.propertyAddress && (
            <p className="text-xs text-danger flex items-center gap-1">
              <Warning className="w-3 h-3" />
              {errors.propertyAddress}
            </p>
          )}
        </div>

        {/* City and Zone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
              {t('inmobiliaria.consignaciones.wizard.step2.cityLabel')} <span className="text-danger">*</span>
            </label>
            <Input
              type="text"
              value={formData.propertyCity || ''}
              onChange={(e) => updateFormData({ propertyCity: e.target.value })}
              onBlur={() => handleBlur('propertyCity')}
              placeholder={t('inmobiliaria.consignaciones.wizard.step2.cityPlaceholder')}
              className={cn('w-full', errors.propertyCity && 'border-danger/30')}
            />
            {errors.propertyCity && (
              <p className="text-xs text-danger flex items-center gap-1">
                <Warning className="w-3 h-3" />
                {errors.propertyCity}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
              {t('inmobiliaria.consignaciones.wizard.step2.zoneLabel')} <span className="text-danger">*</span>
            </label>
            <Input
              type="text"
              value={formData.propertyZone || ''}
              onChange={(e) => updateFormData({ propertyZone: e.target.value })}
              onBlur={() => handleBlur('propertyZone')}
              placeholder={t('inmobiliaria.consignaciones.wizard.step2.zonePlaceholder')}
              className={cn('w-full', errors.propertyZone && 'border-danger/30')}
            />
            {errors.propertyZone && (
              <p className="text-xs text-danger flex items-center gap-1">
                <Warning className="w-3 h-3" />
                {errors.propertyZone}
              </p>
            )}
          </div>
        </div>

        {/* Monthly Rent and Admin Fee */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
              {t('inmobiliaria.consignaciones.wizard.step2.monthlyRentLabel')} <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <CurrencyDollar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle" />
              <Input
                type="text"
                value={formData.monthlyRent ? formData.monthlyRent.toLocaleString(locale === 'es' ? 'es-CL' : 'en-US') : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  updateFormData({ monthlyRent: value ? parseInt(value) : 0 });
                }}
                onBlur={() => handleBlur('monthlyRent')}
                placeholder={t('inmobiliaria.consignaciones.wizard.step2.monthlyRentPlaceholder')}
                className={cn('w-full pl-10', errors.monthlyRent && 'border-danger/30')}
              />
            </div>
            {errors.monthlyRent && (
              <p className="text-xs text-danger flex items-center gap-1">
                <Warning className="w-3 h-3" />
                {errors.monthlyRent}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
              {t('inmobiliaria.consignaciones.wizard.step2.adminFeeLabel')}
            </label>
            <div className="relative">
              <CurrencyDollar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle" />
              <Input
                type="text"
                value={formData.adminFee ? formData.adminFee.toLocaleString(locale === 'es' ? 'es-CL' : 'en-US') : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  updateFormData({ adminFee: value ? parseInt(value) : undefined });
                }}
                placeholder={t('inmobiliaria.consignaciones.wizard.step2.adminFeePlaceholder')}
                className="w-full pl-10"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Step 3: Commission Terms
// ============================================================================

export function StepCommissionTerms({ formData, updateFormData }: StepProps) {
  const { t } = useI18n();
  const commissionPercent = formData.commissionPercent ?? 10;
  const monthlyRent = formData.monthlyRent || 0;
  const agencyCommission = Math.round(monthlyRent * (commissionPercent / 100));
  const ownerNet = monthlyRent - agencyCommission;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-fg dark:text-white mb-1">
          {t('inmobiliaria.consignaciones.wizard.step3.title')}
        </h2>
        <p className="text-fg-muted dark:text-fg-subtle">
          {t('inmobiliaria.consignaciones.wizard.step3.subtitle')}
        </p>
      </div>

      <div className="space-y-6">
        {/* Commission Input */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">
            {t('inmobiliaria.consignaciones.wizard.step3.commissionLabel')}
          </label>
          <div className="relative">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={commissionPercent}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value >= 0 && value <= 100) {
                  updateFormData({ commissionPercent: value });
                }
              }}
              className="w-full pr-12 text-lg font-semibold tabular-nums"
              placeholder="10"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
              %
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('inmobiliaria.consignaciones.wizard.step3.commissionHelper')}
          </p>
        </div>

        {/* Commission Summary */}
        {monthlyRent > 0 && (
          <div className="p-4 rounded-xl bg-surface-muted dark:bg-[#14130F] border border-border-faint dark:border-border-strong">
            <h4 className="text-sm font-medium text-fg dark:text-fg-subtle mb-3">
              {t('inmobiliaria.consignaciones.wizard.step3.monthlySummary')}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.consignaciones.wizard.step3.monthlyRent')}</span>
                <span className="font-medium text-fg dark:text-white">
                  {formatCurrency(monthlyRent)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-fg-muted dark:text-fg-subtle">
                  {t('inmobiliaria.consignaciones.wizard.step3.agencyCommission', { percent: commissionPercent })}
                </span>
                <span className="font-medium text-primary">
                  -{formatCurrency(agencyCommission)}
                </span>
              </div>
              <div className="pt-2 border-t border-border dark:border-border-strong flex justify-between text-sm">
                <span className="font-medium text-fg dark:text-white">{t('inmobiliaria.consignaciones.wizard.step3.ownerNet')}</span>
                <span className="font-bold text-success">
                  {formatCurrency(ownerNet)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Minimum Term */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
            {t('inmobiliaria.consignaciones.wizard.step3.minimumTermLabel')}
          </label>
          <RadioCardGroup
            className="grid grid-cols-2 sm:grid-cols-4 gap-2"
            value={formData.minimumTerm != null ? String(formData.minimumTerm) : undefined}
            onValueChange={(v) => updateFormData({ minimumTerm: Number(v) })}
          >
            {MINIMUM_TERMS.map((term) => (
              <RadioCard
                key={term.value}
                value={String(term.value)}
                label={<span className="text-sm font-medium">{t(term.labelKey)}</span>}
              />
            ))}
          </RadioCardGroup>
        </div>

        {/* Contract Start Date */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
            {t('inmobiliaria.consignaciones.wizard.step3.contractStartLabel')}
          </label>
          <div className="relative">
            <CalendarBlank className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle" />
            <Input
              type="date"
              value={formData.contractStartDate || ''}
              onChange={(e) => updateFormData({ contractStartDate: e.target.value })}
              className="w-full pl-10"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Step 4: Assign Agent
// ============================================================================

export function StepAssignAgent({ formData, updateFormData, agentes }: StepProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">
          {t('inmobiliaria.consignaciones.wizard.step4.title')}
        </h2>
        <p className="text-muted-foreground">
          {t('inmobiliaria.consignaciones.wizard.step4.subtitle')}
        </p>
      </div>

      <AgenteSelector
        agentes={agentes}
        value={formData.agenteId ?? null}
        onChange={(id) => updateFormData({ agenteId: id || undefined })}
        allowNoAgent
      />
    </div>
  );
}

// ============================================================================
// Step 5: Acta de Entrega (Inventory)
// ============================================================================

export function StepActaEntrega({ formData, updateFormData }: StepProps) {
  const { t } = useI18n();
  const inventoryItems = formData.inventoryItems || [];

  const addItem = () => {
    const newItem: InventoryItem = {
      id: `item-${Date.now()}`,
      name: '',
      quantity: 1,
      condition: 'good',
    };
    updateFormData({
      inventoryItems: [...inventoryItems, newItem],
    });
  };

  const updateItem = (id: string, updates: Partial<InventoryItem>) => {
    updateFormData({
      inventoryItems: inventoryItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    });
  };

  const removeItem = (id: string) => {
    updateFormData({
      inventoryItems: inventoryItems.filter((item) => item.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-fg dark:text-white mb-1">
          {t('inmobiliaria.consignaciones.wizard.step5.title')}
        </h2>
        <p className="text-fg-muted dark:text-fg-subtle">
          {t('inmobiliaria.consignaciones.wizard.step5.subtitle')}
        </p>
      </div>

      {/* Inventory Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-fg dark:text-fg-subtle">
            {t('inmobiliaria.consignaciones.wizard.step5.inventoryTitle')}
          </h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            hideArrow
            onClick={addItem}
          >
            <Plus className="w-4 h-4" />
            {t('inmobiliaria.consignaciones.wizard.step5.addItem')}
          </Button>
        </div>

        {inventoryItems.length > 0 ? (
          <div className="space-y-3">
            {inventoryItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#14130F]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center text-fg-muted dark:text-fg-subtle text-sm font-medium shrink-0">
                    {index + 1}
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Item Name */}
                    <div className="sm:col-span-2">
                      <Input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        placeholder={t('inmobiliaria.consignaciones.wizard.step5.itemNamePlaceholder')}
                        className="w-full h-9 text-sm"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                        className="w-20 h-9 px-3 text-sm text-center"
                      />
                      <span className="text-sm text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.consignaciones.wizard.step5.units')}</span>
                    </div>

                    {/* Condition */}
                    <Select
                      value={item.condition}
                      onValueChange={(v) => updateItem(item.id, { condition: v as InventoryItem['condition'] })}
                    >
                      <SelectTrigger className="w-full h-9 px-3 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INVENTORY_CONDITIONS.map((cond) => (
                          <SelectItem key={cond.value} value={cond.value}>
                            {t(cond.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Notes */}
                    <Input
                      type="text"
                      value={item.notes || ''}
                      onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                      placeholder={t('inmobiliaria.consignaciones.wizard.step5.additionalNotes')}
                      className="sm:col-span-2 h-9 px-3 text-sm"
                    />
                  </div>

                  <IconButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    aria-label={t('inmobiliaria.consignaciones.wizard.step5.addItem')}
                    icon={<Trash className="w-4 h-4" />}
                    className="shrink-0 text-danger hover:bg-danger-soft hover:text-danger"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl border border-dashed border-border dark:border-border-strong bg-surface-muted dark:bg-[#14130F]">
            <Package className="w-12 h-12 mx-auto mb-3 text-fg-subtle dark:text-fg-muted" />
            <p className="text-fg-muted dark:text-fg-subtle mb-3">
              {t('inmobiliaria.consignaciones.wizard.step5.emptyInventory')}
            </p>
            <Button
              type="button"
              hideArrow
              onClick={addItem}
            >
              <Plus className="w-4 h-4" />
              {t('inmobiliaria.consignaciones.wizard.step5.addFirstItem')}
            </Button>
          </div>
        )}
      </div>

      {/* Photo Upload Placeholder */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-fg dark:text-fg-subtle">
          {t('inmobiliaria.consignaciones.wizard.step5.photosTitle')}
        </h3>
        <div className="p-8 text-center rounded-xl border border-dashed border-border dark:border-border-strong bg-surface-muted dark:bg-[#14130F]">
          <Camera className="w-12 h-12 mx-auto mb-3 text-fg-subtle dark:text-fg-muted" />
          <p className="text-fg-muted dark:text-fg-subtle mb-1">
            {t('inmobiliaria.consignaciones.wizard.step5.photosDropzone')}
          </p>
          <p className="text-xs text-fg-subtle dark:text-fg-muted">
            {t('inmobiliaria.consignaciones.wizard.step5.photosFormats')}
          </p>
          <Button
            type="button"
            variant="outline"
            hideArrow
            disabled
            className="mt-4"
          >
            <Camera className="w-4 h-4" />
            {t('inmobiliaria.consignaciones.wizard.step5.photosSoon')}
          </Button>
        </div>
      </div>

      {/* General Notes */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
          {t('inmobiliaria.consignaciones.wizard.step5.generalNotes')}
        </label>
        <Textarea
          value={formData.inventoryNotes || ''}
          onChange={(e) => updateFormData({ inventoryNotes: e.target.value })}
          placeholder={t('inmobiliaria.consignaciones.wizard.step5.generalNotesPlaceholder')}
          rows={4}
          className="w-full resize-none"
        />
      </div>
    </div>
  );
}

// ============================================================================
// Step 6: Confirmation
// ============================================================================

export function StepConfirmation({
  formData,
  propietarios,
  agentes,
  onGoToStep,
}: StepProps & { onGoToStep: (step: number) => void }) {
  const { t } = useI18n();
  const inventoryItems = formData.inventoryItems || [];

  // Find propietario info
  const propietario = formData.propietarioId?.startsWith('new-')
    ? null
    : propietarios.find((p) => p.id === formData.propietarioId);

  const newPropietario = formData.newPropietarioData;

  // Find agente info
  const agente = agentes.find((a) => a.id === formData.agenteId);

  // Calculate commission
  const monthlyRent = formData.monthlyRent || 0;
  const commissionPercent = formData.commissionPercent ?? 10;
  const agencyCommission = Math.round(monthlyRent * (commissionPercent / 100));
  const ownerNet = monthlyRent - agencyCommission;

  const propertyType = PROPERTY_TYPES.find((t) => t.value === formData.propertyType);

  const SectionHeader = ({ title, step }: { title: string; step: number }) => (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-semibold text-fg dark:text-white">{title}</h3>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        hideArrow
        onClick={() => onGoToStep(step)}
        className="h-auto gap-1 px-2 py-1 text-xs text-primary"
      >
        <Pencil className="w-3 h-3" />
        {t('inmobiliaria.consignaciones.wizard.step6.edit')}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-fg dark:text-white mb-1">
          {t('inmobiliaria.consignaciones.wizard.step6.title')}
        </h2>
        <p className="text-fg-muted dark:text-fg-subtle">
          {t('inmobiliaria.consignaciones.wizard.step6.subtitle')}
        </p>
      </div>

      <div className="space-y-4">
        {/* Propietario Section */}
        <div className="p-4 rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#14130F]">
          <SectionHeader title={t('inmobiliaria.consignaciones.wizard.step6.ownerSection')} step={1} />
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-md flex items-center justify-center',
              (newPropietario?.documentType === 'NIT' || propietario?.documentType === 'NIT')
                ? 'bg-surface-muted dark:bg-ink text-fg-muted dark:text-fg-subtle'
                : 'bg-primary-soft text-primary'
            )}>
              {(newPropietario?.documentType === 'NIT' || propietario?.documentType === 'NIT') ? (
                <Buildings className="w-5 h-5" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div>
              {newPropietario && (
                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-primary-soft text-primary mb-1">
                  {t('inmobiliaria.consignaciones.wizard.step6.new')}
                </span>
              )}
              <p className="font-medium text-fg dark:text-white">
                {newPropietario?.name || propietario?.name || t('inmobiliaria.consignaciones.wizard.step6.notSelected')}
              </p>
              <p className="text-sm text-fg-muted dark:text-fg-subtle">
                {newPropietario?.email || propietario?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Property Section */}
        <div className="p-4 rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#14130F]">
          <SectionHeader title={t('inmobiliaria.consignaciones.wizard.step6.propertySection')} step={2} />
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-md bg-success-soft flex items-center justify-center text-2xl">
              {propertyType?.icon || '🏠'}
            </div>
            <div className="flex-1">
              <p className="font-medium text-fg dark:text-white">
                {formData.propertyTitle || t('inmobiliaria.consignaciones.wizard.step6.noTitle')}
              </p>
              <p className="text-sm text-fg-muted dark:text-fg-subtle">
                {formData.propertyAddress}
              </p>
              <p className="text-sm text-fg-muted dark:text-fg-subtle">
                {formData.propertyZone}, {formData.propertyCity}
              </p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-lg font-bold text-fg dark:text-white">
                  {formatCurrency(monthlyRent)}
                  <span className="text-sm font-normal text-fg-muted">{t('inmobiliaria.consignaciones.wizard.step6.perMonth')}</span>
                </span>
                {formData.adminFee && (
                  <span className="text-sm text-fg-muted dark:text-fg-subtle">
                    + {formatCurrency(formData.adminFee)} {t('inmobiliaria.consignaciones.wizard.step6.admin')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Terms Section */}
        <div className="p-4 rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#14130F]">
          <SectionHeader title={t('inmobiliaria.consignaciones.wizard.step6.termsSection')} step={3} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-fg-muted dark:text-fg-subtle mb-1">{t('inmobiliaria.consignaciones.wizard.step6.commission')}</p>
              <p className="font-medium text-fg dark:text-white">{commissionPercent}%</p>
            </div>
            <div>
              <p className="text-xs text-fg-muted dark:text-fg-subtle mb-1">{t('inmobiliaria.consignaciones.wizard.step6.minimumTerm')}</p>
              <p className="font-medium text-fg dark:text-white">
                {formData.minimumTerm || 12} {t('inmobiliaria.consignaciones.wizard.step6.months')}
              </p>
            </div>
            <div>
              <p className="text-xs text-fg-muted dark:text-fg-subtle mb-1">{t('inmobiliaria.consignaciones.wizard.step6.monthlyCommission')}</p>
              <p className="font-medium text-primary">
                {formatCurrency(agencyCommission)}
              </p>
            </div>
            <div>
              <p className="text-xs text-fg-muted dark:text-fg-subtle mb-1">{t('inmobiliaria.consignaciones.wizard.step6.ownerNetLabel')}</p>
              <p className="font-medium text-success">
                {formatCurrency(ownerNet)}
              </p>
            </div>
          </div>
        </div>

        {/* Agent Section */}
        <div className="p-4 rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#14130F]">
          <SectionHeader title={t('inmobiliaria.consignaciones.wizard.step6.agentSection')} step={4} />
          {agente ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-fg-muted flex items-center justify-center text-white font-semibold text-sm">
                {agente.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-fg dark:text-white">{agente.name}</p>
                <p className="text-sm text-fg-muted dark:text-fg-subtle">
                  {agente.zone} - {agente.commissionSplit}% {t('inmobiliaria.consignaciones.wizard.step6.agentCommission')}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.consignaciones.wizard.step6.notAssigned')}</p>
          )}
        </div>

        {/* Inventory Section */}
        <div className="p-4 rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#14130F]">
          <SectionHeader title={t('inmobiliaria.consignaciones.wizard.step6.inventorySection')} step={5} />
          {inventoryItems.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-fg-muted dark:text-fg-subtle">
                {inventoryItems.length === 1
                  ? t('inmobiliaria.consignaciones.wizard.step6.itemsRegistered', { count: inventoryItems.length })
                  : t('inmobiliaria.consignaciones.wizard.step6.itemsRegisteredPlural', { count: inventoryItems.length })}
              </p>
              <div className="flex flex-wrap gap-2">
                {inventoryItems.slice(0, 5).map((item) => (
                  <span
                    key={item.id}
                    className="px-2 py-1 rounded-md bg-surface-muted dark:bg-ink text-xs text-fg-muted dark:text-fg-subtle"
                  >
                    {item.name || t('inmobiliaria.consignaciones.wizard.step6.noName')} ({item.quantity})
                  </span>
                ))}
                {inventoryItems.length > 5 && (
                  <span className="px-2 py-1 rounded-md bg-surface-muted dark:bg-ink text-xs text-fg-muted">
                    {t('inmobiliaria.consignaciones.wizard.step6.moreItems', { count: inventoryItems.length - 5 })}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.consignaciones.wizard.step6.noInventory')}</p>
          )}
          {formData.inventoryNotes && (
            <p className="mt-2 text-sm text-fg-muted dark:text-fg-subtle line-clamp-2">
              {formData.inventoryNotes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
