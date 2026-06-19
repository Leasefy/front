'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Buildings,
  HouseLine,
  MapPin,
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
  CaretDown,
  Pencil,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { Propietario, Agente, PropietarioFormData, ConsignacionFormData, InventoryItem, Consignacion } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { PropietarioSelector } from './PropietarioSelector';
import { AgenteSelector } from './AgenteSelector';

// ============================================================================
// Shared Types
// ============================================================================

export interface WizardFormData extends ConsignacionFormData {
  newPropietarioData?: PropietarioFormData;
  inventoryItems: InventoryItem[];
  inventoryNotes: string;
  contractStartDate: string;
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
  { value: 'excellent', labelKey: 'inmobiliaria.consignaciones.wizard.step5.conditionExcellent', color: 'text-[#2C7A53] dark:text-[#3EAE70]' },
  { value: 'good', labelKey: 'inmobiliaria.consignaciones.wizard.step5.conditionGood', color: 'text-[#1A40FF] dark:text-[#5570FF]' },
  { value: 'fair', labelKey: 'inmobiliaria.consignaciones.wizard.step5.conditionFair', color: 'text-[#B7791F] dark:text-[#D2992F]' },
  { value: 'poor', labelKey: 'inmobiliaria.consignaciones.wizard.step5.conditionPoor', color: 'text-[#C4503B] dark:text-[#E0664D]' },
];

// ============================================================================
// Step 1: Select Propietario
// ============================================================================

export function StepSelectPropietario({ formData, updateFormData, propietarios }: StepProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
          {t('inmobiliaria.consignaciones.wizard.step1.title')}
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400">
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
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
          {t('inmobiliaria.consignaciones.wizard.step2.title')}
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.consignaciones.wizard.step2.subtitle')}
        </p>
      </div>

      <div className="space-y-4">
        {/* Property Type */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('inmobiliaria.consignaciones.wizard.step2.propertyTypeLabel')} <span className="text-[#C4503B]">*</span>
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PROPERTY_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => updateFormData({ propertyType: type.value })}
                className={cn(
                  'p-3 rounded-xl border text-center transition-all',
                  formData.propertyType === type.value
                    ? 'border-[#1A40FF]/30 bg-[#EEF1FF] dark:bg-[#1A40FF]/15 ring-2 ring-[#1A40FF]/20'
                    : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:border-neutral-300 dark:hover:border-neutral-600'
                )}
              >
                <span className="text-2xl mb-1 block">{type.icon}</span>
                <span className={cn(
                  'text-xs font-medium',
                  formData.propertyType === type.value
                    ? 'text-[#1A40FF] dark:text-[#5570FF]'
                    : 'text-neutral-600 dark:text-neutral-400'
                )}>
                  {t(type.labelKey)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Property Title */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('inmobiliaria.consignaciones.wizard.step2.propertyTitleLabel')} <span className="text-[#C4503B]">*</span>
          </label>
          <input
            type="text"
            value={formData.propertyTitle || ''}
            onChange={(e) => updateFormData({ propertyTitle: e.target.value })}
            onBlur={() => handleBlur('propertyTitle')}
            placeholder={t('inmobiliaria.consignaciones.wizard.step2.propertyTitlePlaceholder')}
            className={cn(
              'w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all',
              errors.propertyTitle ? 'border-[#C4503B]/30' : 'border-neutral-200 dark:border-neutral-700'
            )}
          />
          {errors.propertyTitle && (
            <p className="text-xs text-[#C4503B] flex items-center gap-1">
              <Warning className="w-3 h-3" />
              {errors.propertyTitle}
            </p>
          )}
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('inmobiliaria.consignaciones.wizard.step2.addressLabel')} <span className="text-[#C4503B]">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              value={formData.propertyAddress || ''}
              onChange={(e) => updateFormData({ propertyAddress: e.target.value })}
              onBlur={() => handleBlur('propertyAddress')}
              placeholder={t('inmobiliaria.consignaciones.wizard.step2.addressPlaceholder')}
              className={cn(
                'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all',
                errors.propertyAddress ? 'border-[#C4503B]/30' : 'border-neutral-200 dark:border-neutral-700'
              )}
            />
          </div>
          {errors.propertyAddress && (
            <p className="text-xs text-[#C4503B] flex items-center gap-1">
              <Warning className="w-3 h-3" />
              {errors.propertyAddress}
            </p>
          )}
        </div>

        {/* City and Zone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t('inmobiliaria.consignaciones.wizard.step2.cityLabel')} <span className="text-[#C4503B]">*</span>
            </label>
            <input
              type="text"
              value={formData.propertyCity || ''}
              onChange={(e) => updateFormData({ propertyCity: e.target.value })}
              onBlur={() => handleBlur('propertyCity')}
              placeholder={t('inmobiliaria.consignaciones.wizard.step2.cityPlaceholder')}
              className={cn(
                'w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all',
                errors.propertyCity ? 'border-[#C4503B]/30' : 'border-neutral-200 dark:border-neutral-700'
              )}
            />
            {errors.propertyCity && (
              <p className="text-xs text-[#C4503B] flex items-center gap-1">
                <Warning className="w-3 h-3" />
                {errors.propertyCity}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t('inmobiliaria.consignaciones.wizard.step2.zoneLabel')} <span className="text-[#C4503B]">*</span>
            </label>
            <input
              type="text"
              value={formData.propertyZone || ''}
              onChange={(e) => updateFormData({ propertyZone: e.target.value })}
              onBlur={() => handleBlur('propertyZone')}
              placeholder={t('inmobiliaria.consignaciones.wizard.step2.zonePlaceholder')}
              className={cn(
                'w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all',
                errors.propertyZone ? 'border-[#C4503B]/30' : 'border-neutral-200 dark:border-neutral-700'
              )}
            />
            {errors.propertyZone && (
              <p className="text-xs text-[#C4503B] flex items-center gap-1">
                <Warning className="w-3 h-3" />
                {errors.propertyZone}
              </p>
            )}
          </div>
        </div>

        {/* Monthly Rent and Admin Fee */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t('inmobiliaria.consignaciones.wizard.step2.monthlyRentLabel')} <span className="text-[#C4503B]">*</span>
            </label>
            <div className="relative">
              <CurrencyDollar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={formData.monthlyRent ? formData.monthlyRent.toLocaleString(locale === 'es' ? 'es-CL' : 'en-US') : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  updateFormData({ monthlyRent: value ? parseInt(value) : 0 });
                }}
                onBlur={() => handleBlur('monthlyRent')}
                placeholder={t('inmobiliaria.consignaciones.wizard.step2.monthlyRentPlaceholder')}
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all',
                  errors.monthlyRent ? 'border-[#C4503B]/30' : 'border-neutral-200 dark:border-neutral-700'
                )}
              />
            </div>
            {errors.monthlyRent && (
              <p className="text-xs text-[#C4503B] flex items-center gap-1">
                <Warning className="w-3 h-3" />
                {errors.monthlyRent}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t('inmobiliaria.consignaciones.wizard.step2.adminFeeLabel')}
            </label>
            <div className="relative">
              <CurrencyDollar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={formData.adminFee ? formData.adminFee.toLocaleString(locale === 'es' ? 'es-CL' : 'en-US') : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  updateFormData({ adminFee: value ? parseInt(value) : undefined });
                }}
                placeholder={t('inmobiliaria.consignaciones.wizard.step2.adminFeePlaceholder')}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all"
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
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
          {t('inmobiliaria.consignaciones.wizard.step3.title')}
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400">
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
            <input
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
              className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-background text-foreground text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all tabular-nums"
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
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#141416] border border-neutral-100 dark:border-neutral-800">
            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
              {t('inmobiliaria.consignaciones.wizard.step3.monthlySummary')}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">{t('inmobiliaria.consignaciones.wizard.step3.monthlyRent')}</span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {formatCurrency(monthlyRent)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">
                  {t('inmobiliaria.consignaciones.wizard.step3.agencyCommission', { percent: commissionPercent })}
                </span>
                <span className="font-medium text-[#1A40FF] dark:text-[#5570FF]">
                  -{formatCurrency(agencyCommission)}
                </span>
              </div>
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex justify-between text-sm">
                <span className="font-medium text-neutral-900 dark:text-white">{t('inmobiliaria.consignaciones.wizard.step3.ownerNet')}</span>
                <span className="font-bold text-[#2C7A53] dark:text-[#3EAE70]">
                  {formatCurrency(ownerNet)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Minimum Term */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('inmobiliaria.consignaciones.wizard.step3.minimumTermLabel')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MINIMUM_TERMS.map((term) => (
              <button
                key={term.value}
                type="button"
                onClick={() => updateFormData({ minimumTerm: term.value })}
                className={cn(
                  'p-3 rounded-xl border text-center transition-all',
                  formData.minimumTerm === term.value
                    ? 'border-[#1A40FF]/30 bg-[#EEF1FF] dark:bg-[#1A40FF]/15 ring-2 ring-[#1A40FF]/20'
                    : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:border-neutral-300 dark:hover:border-neutral-600'
                )}
              >
                <span className={cn(
                  'text-sm font-medium',
                  formData.minimumTerm === term.value
                    ? 'text-[#1A40FF] dark:text-[#5570FF]'
                    : 'text-neutral-600 dark:text-neutral-400'
                )}>
                  {t(term.labelKey)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Contract Start Date */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('inmobiliaria.consignaciones.wizard.step3.contractStartLabel')}
          </label>
          <div className="relative">
            <CalendarBlank className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="date"
              value={formData.contractStartDate || ''}
              onChange={(e) => updateFormData({ contractStartDate: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all"
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
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
          {t('inmobiliaria.consignaciones.wizard.step5.title')}
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.consignaciones.wizard.step5.subtitle')}
        </p>
      </div>

      {/* Inventory Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('inmobiliaria.consignaciones.wizard.step5.inventoryTitle')}
          </h3>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#EEF1FF] dark:bg-[#1A40FF]/15 text-[#1A40FF] dark:text-[#5570FF] text-sm font-medium hover:bg-[#EEF1FF] dark:hover:bg-[#1A40FF]/50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('inmobiliaria.consignaciones.wizard.step5.addItem')}
          </button>
        </div>

        {inventoryItems.length > 0 ? (
          <div className="space-y-3">
            {inventoryItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 text-sm font-medium shrink-0">
                    {index + 1}
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Item Name */}
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        placeholder={t('inmobiliaria.consignaciones.wizard.step5.itemNamePlaceholder')}
                        className="w-full px-3 py-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white placeholder-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                        className="w-20 px-3 py-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent"
                      />
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.consignaciones.wizard.step5.units')}</span>
                    </div>

                    {/* Condition */}
                    <div className="relative">
                      <select
                        value={item.condition}
                        onChange={(e) => updateItem(item.id, { condition: e.target.value as InventoryItem['condition'] })}
                        className="w-full px-3 py-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent"
                      >
                        {INVENTORY_CONDITIONS.map((cond) => (
                          <option key={cond.value} value={cond.value}>
                            {t(cond.labelKey)}
                          </option>
                        ))}
                      </select>
                      <CaretDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                    </div>

                    {/* Notes */}
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                      placeholder={t('inmobiliaria.consignaciones.wizard.step5.additionalNotes')}
                      className="sm:col-span-2 px-3 py-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white placeholder-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="shrink-0 p-2 rounded-md text-[#C4503B] hover:bg-[#F8EAE7] dark:hover:bg-[#C4503B]/20 transition-colors"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-[#141416]">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
            <p className="text-neutral-500 dark:text-neutral-400 mb-3">
              {t('inmobiliaria.consignaciones.wizard.step5.emptyInventory')}
            </p>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A40FF] text-white font-medium hover:opacity-90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('inmobiliaria.consignaciones.wizard.step5.addFirstItem')}
            </button>
          </div>
        )}
      </div>

      {/* Photo Upload Placeholder */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {t('inmobiliaria.consignaciones.wizard.step5.photosTitle')}
        </h3>
        <div className="p-8 text-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-[#141416]">
          <Camera className="w-12 h-12 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
          <p className="text-neutral-500 dark:text-neutral-400 mb-1">
            {t('inmobiliaria.consignaciones.wizard.step5.photosDropzone')}
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {t('inmobiliaria.consignaciones.wizard.step5.photosFormats')}
          </p>
          <button
            type="button"
            disabled
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 text-neutral-400 dark:text-neutral-500 font-medium cursor-not-allowed"
          >
            <Camera className="w-4 h-4" />
            {t('inmobiliaria.consignaciones.wizard.step5.photosSoon')}
          </button>
        </div>
      </div>

      {/* General Notes */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {t('inmobiliaria.consignaciones.wizard.step5.generalNotes')}
        </label>
        <textarea
          value={formData.inventoryNotes || ''}
          onChange={(e) => updateFormData({ inventoryNotes: e.target.value })}
          placeholder={t('inmobiliaria.consignaciones.wizard.step5.generalNotesPlaceholder')}
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all resize-none"
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
      <h3 className="font-semibold text-neutral-900 dark:text-white">{title}</h3>
      <button
        type="button"
        onClick={() => onGoToStep(step)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[#1A40FF] dark:text-[#5570FF] hover:bg-[#EEF1FF] dark:hover:bg-[#1A40FF]/30 transition-colors"
      >
        <Pencil className="w-3 h-3" />
        {t('inmobiliaria.consignaciones.wizard.step6.edit')}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
          {t('inmobiliaria.consignaciones.wizard.step6.title')}
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.consignaciones.wizard.step6.subtitle')}
        </p>
      </div>

      <div className="space-y-4">
        {/* Propietario Section */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <SectionHeader title={t('inmobiliaria.consignaciones.wizard.step6.ownerSection')} step={1} />
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-md flex items-center justify-center',
              (newPropietario?.documentType === 'NIT' || propietario?.documentType === 'NIT')
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                : 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15 text-[#1A40FF] dark:text-[#5570FF]'
            )}>
              {(newPropietario?.documentType === 'NIT' || propietario?.documentType === 'NIT') ? (
                <Buildings className="w-5 h-5" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div>
              {newPropietario && (
                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-[#EEF1FF] dark:bg-[#1A40FF]/15 text-[#1A40FF] dark:text-[#5570FF] mb-1">
                  {t('inmobiliaria.consignaciones.wizard.step6.new')}
                </span>
              )}
              <p className="font-medium text-neutral-900 dark:text-white">
                {newPropietario?.name || propietario?.name || t('inmobiliaria.consignaciones.wizard.step6.notSelected')}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {newPropietario?.email || propietario?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Property Section */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <SectionHeader title={t('inmobiliaria.consignaciones.wizard.step6.propertySection')} step={2} />
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-md bg-[#E8F3EC] dark:bg-[#2C7A53]/15 flex items-center justify-center text-2xl">
              {propertyType?.icon || '🏠'}
            </div>
            <div className="flex-1">
              <p className="font-medium text-neutral-900 dark:text-white">
                {formData.propertyTitle || t('inmobiliaria.consignaciones.wizard.step6.noTitle')}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {formData.propertyAddress}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {formData.propertyZone}, {formData.propertyCity}
              </p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-lg font-bold text-neutral-900 dark:text-white">
                  {formatCurrency(monthlyRent)}
                  <span className="text-sm font-normal text-neutral-500">{t('inmobiliaria.consignaciones.wizard.step6.perMonth')}</span>
                </span>
                {formData.adminFee && (
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    + {formatCurrency(formData.adminFee)} {t('inmobiliaria.consignaciones.wizard.step6.admin')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Terms Section */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <SectionHeader title={t('inmobiliaria.consignaciones.wizard.step6.termsSection')} step={3} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('inmobiliaria.consignaciones.wizard.step6.commission')}</p>
              <p className="font-medium text-neutral-900 dark:text-white">{commissionPercent}%</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('inmobiliaria.consignaciones.wizard.step6.minimumTerm')}</p>
              <p className="font-medium text-neutral-900 dark:text-white">
                {formData.minimumTerm || 12} {t('inmobiliaria.consignaciones.wizard.step6.months')}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('inmobiliaria.consignaciones.wizard.step6.monthlyCommission')}</p>
              <p className="font-medium text-[#1A40FF] dark:text-[#5570FF]">
                {formatCurrency(agencyCommission)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('inmobiliaria.consignaciones.wizard.step6.ownerNetLabel')}</p>
              <p className="font-medium text-[#2C7A53] dark:text-[#3EAE70]">
                {formatCurrency(ownerNet)}
              </p>
            </div>
          </div>
        </div>

        {/* Agent Section */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <SectionHeader title={t('inmobiliaria.consignaciones.wizard.step6.agentSection')} step={4} />
          {agente ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1A40FF] to-[#6B6B6B] flex items-center justify-center text-white font-semibold text-sm">
                {agente.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">{agente.name}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {agente.zone} - {agente.commissionSplit}% {t('inmobiliaria.consignaciones.wizard.step6.agentCommission')}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.consignaciones.wizard.step6.notAssigned')}</p>
          )}
        </div>

        {/* Inventory Section */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <SectionHeader title={t('inmobiliaria.consignaciones.wizard.step6.inventorySection')} step={5} />
          {inventoryItems.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {inventoryItems.length === 1
                  ? t('inmobiliaria.consignaciones.wizard.step6.itemsRegistered', { count: inventoryItems.length })
                  : t('inmobiliaria.consignaciones.wizard.step6.itemsRegisteredPlural', { count: inventoryItems.length })}
              </p>
              <div className="flex flex-wrap gap-2">
                {inventoryItems.slice(0, 5).map((item) => (
                  <span
                    key={item.id}
                    className="px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-400"
                  >
                    {item.name || t('inmobiliaria.consignaciones.wizard.step6.noName')} ({item.quantity})
                  </span>
                ))}
                {inventoryItems.length > 5 && (
                  <span className="px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-500">
                    {t('inmobiliaria.consignaciones.wizard.step6.moreItems', { count: inventoryItems.length - 5 })}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.consignaciones.wizard.step6.noInventory')}</p>
          )}
          {formData.inventoryNotes && (
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
              {formData.inventoryNotes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
