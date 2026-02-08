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

const PROPERTY_TYPES: { value: Consignacion['propertyType']; label: string; icon: string }[] = [
  { value: 'apartment', label: 'Apartamento', icon: '🏢' },
  { value: 'house', label: 'Casa', icon: '🏠' },
  { value: 'studio', label: 'Estudio', icon: '🛋️' },
  { value: 'commercial', label: 'Local comercial', icon: '🏪' },
  { value: 'office', label: 'Oficina', icon: '🏬' },
  { value: 'warehouse', label: 'Bodega', icon: '🏭' },
];

const MINIMUM_TERMS: { value: number; label: string }[] = [
  { value: 6, label: '6 meses' },
  { value: 12, label: '12 meses (recomendado)' },
  { value: 18, label: '18 meses' },
  { value: 24, label: '24 meses' },
];

const INVENTORY_CONDITIONS: { value: InventoryItem['condition']; label: string; color: string }[] = [
  { value: 'excellent', label: 'Excelente', color: 'text-emerald-600 dark:text-emerald-400' },
  { value: 'good', label: 'Bueno', color: 'text-blue-600 dark:text-blue-400' },
  { value: 'fair', label: 'Regular', color: 'text-amber-600 dark:text-amber-400' },
  { value: 'poor', label: 'Malo', color: 'text-red-600 dark:text-red-400' },
];

// ============================================================================
// Step 1: Select Propietario
// ============================================================================

export function StepSelectPropietario({ formData, updateFormData, propietarios }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
          Seleccionar Propietario
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400">
          Elige un propietario existente o crea uno nuevo
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
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const errors: Record<string, string> = {};
  if (touched.propertyTitle && !formData.propertyTitle) errors.propertyTitle = 'El titulo es requerido';
  if (touched.propertyAddress && !formData.propertyAddress) errors.propertyAddress = 'La direccion es requerida';
  if (touched.propertyCity && !formData.propertyCity) errors.propertyCity = 'La ciudad es requerida';
  if (touched.propertyZone && !formData.propertyZone) errors.propertyZone = 'La zona es requerida';
  if (touched.monthlyRent && (!formData.monthlyRent || formData.monthlyRent <= 0)) errors.monthlyRent = 'El canon es requerido';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
          Datos de la Propiedad
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400">
          Ingresa la informacion basica del inmueble
        </p>
      </div>

      <div className="space-y-4">
        {/* Property Type */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Tipo de inmueble <span className="text-red-500">*</span>
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
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500/20'
                    : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:border-neutral-300 dark:hover:border-neutral-600'
                )}
              >
                <span className="text-2xl mb-1 block">{type.icon}</span>
                <span className={cn(
                  'text-xs font-medium',
                  formData.propertyType === type.value
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-neutral-600 dark:text-neutral-400'
                )}>
                  {type.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Property Title */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Titulo del inmueble <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.propertyTitle || ''}
            onChange={(e) => updateFormData({ propertyTitle: e.target.value })}
            onBlur={() => handleBlur('propertyTitle')}
            placeholder="Ej: Apartamento moderno en Chapinero Alto"
            className={cn(
              'w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all',
              errors.propertyTitle ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'
            )}
          />
          {errors.propertyTitle && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <Warning className="w-3 h-3" />
              {errors.propertyTitle}
            </p>
          )}
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Direccion <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              value={formData.propertyAddress || ''}
              onChange={(e) => updateFormData({ propertyAddress: e.target.value })}
              onBlur={() => handleBlur('propertyAddress')}
              placeholder="Cra 15 #93-45, Apto 802"
              className={cn(
                'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all',
                errors.propertyAddress ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'
              )}
            />
          </div>
          {errors.propertyAddress && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <Warning className="w-3 h-3" />
              {errors.propertyAddress}
            </p>
          )}
        </div>

        {/* City and Zone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Ciudad <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.propertyCity || ''}
              onChange={(e) => updateFormData({ propertyCity: e.target.value })}
              onBlur={() => handleBlur('propertyCity')}
              placeholder="Bogota"
              className={cn(
                'w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all',
                errors.propertyCity ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'
              )}
            />
            {errors.propertyCity && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <Warning className="w-3 h-3" />
                {errors.propertyCity}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Zona/Barrio <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.propertyZone || ''}
              onChange={(e) => updateFormData({ propertyZone: e.target.value })}
              onBlur={() => handleBlur('propertyZone')}
              placeholder="Chapinero Alto"
              className={cn(
                'w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all',
                errors.propertyZone ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'
              )}
            />
            {errors.propertyZone && (
              <p className="text-xs text-red-500 flex items-center gap-1">
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
              Canon mensual <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <CurrencyDollar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={formData.monthlyRent ? formData.monthlyRent.toLocaleString('es-CO') : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  updateFormData({ monthlyRent: value ? parseInt(value) : 0 });
                }}
                onBlur={() => handleBlur('monthlyRent')}
                placeholder="2.500.000"
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all',
                  errors.monthlyRent ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'
                )}
              />
            </div>
            {errors.monthlyRent && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <Warning className="w-3 h-3" />
                {errors.monthlyRent}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Administracion (opcional)
            </label>
            <div className="relative">
              <CurrencyDollar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={formData.adminFee ? formData.adminFee.toLocaleString('es-CO') : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  updateFormData({ adminFee: value ? parseInt(value) : undefined });
                }}
                placeholder="450.000"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
  const commissionPercent = formData.commissionPercent ?? 10;
  const monthlyRent = formData.monthlyRent || 0;
  const agencyCommission = Math.round(monthlyRent * (commissionPercent / 100));
  const ownerNet = monthlyRent - agencyCommission;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
          Terminos de Comision
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400">
          Define las condiciones del contrato de consignacion
        </p>
      </div>

      <div className="space-y-6">
        {/* Commission Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Porcentaje de comision
            </label>
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {commissionPercent}%
            </span>
          </div>

          <input
            type="range"
            min="8"
            max="15"
            step="0.5"
            value={commissionPercent}
            onChange={(e) => updateFormData({ commissionPercent: parseFloat(e.target.value) })}
            className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />

          <div className="flex justify-between text-xs text-neutral-500">
            <span>8%</span>
            <span>10% (estandar)</span>
            <span>15%</span>
          </div>
        </div>

        {/* Commission Summary */}
        {monthlyRent > 0 && (
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#141416] border border-neutral-100 dark:border-neutral-800">
            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
              Resumen mensual
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">Canon mensual</span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {formatCurrency(monthlyRent)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">
                  Comision agencia ({commissionPercent}%)
                </span>
                <span className="font-medium text-indigo-600 dark:text-indigo-400">
                  -{formatCurrency(agencyCommission)}
                </span>
              </div>
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex justify-between text-sm">
                <span className="font-medium text-neutral-900 dark:text-white">Neto propietario</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(ownerNet)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Minimum Term */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Termino minimo de arrendamiento
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
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500/20'
                    : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:border-neutral-300 dark:hover:border-neutral-600'
                )}
              >
                <span className={cn(
                  'text-sm font-medium',
                  formData.minimumTerm === term.value
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-neutral-600 dark:text-neutral-400'
                )}>
                  {term.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Contract Start Date */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Fecha de inicio del contrato
          </label>
          <div className="relative">
            <CalendarBlank className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="date"
              value={formData.contractStartDate || ''}
              onChange={(e) => updateFormData({ contractStartDate: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
          Asignar Agente
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400">
          Selecciona el agente responsable de esta propiedad
        </p>
      </div>

      <AgenteSelector
        agentes={agentes}
        value={formData.agenteId || null}
        onChange={(id) => updateFormData({ agenteId: id })}
      />
    </div>
  );
}

// ============================================================================
// Step 5: Acta de Entrega (Inventory)
// ============================================================================

export function StepActaEntrega({ formData, updateFormData }: StepProps) {
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
          Acta de Entrega
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400">
          Registra el inventario y estado del inmueble
        </p>
      </div>

      {/* Inventory Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Inventario de bienes
          </h3>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar item
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
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 text-sm font-medium shrink-0">
                    {index + 1}
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Item Name */}
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        placeholder="Nombre del item (ej: Estufa 4 puestos)"
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white placeholder-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                        className="w-20 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">unid.</span>
                    </div>

                    {/* Condition */}
                    <div className="relative">
                      <select
                        value={item.condition}
                        onChange={(e) => updateItem(item.id, { condition: e.target.value as InventoryItem['condition'] })}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        {INVENTORY_CONDITIONS.map((cond) => (
                          <option key={cond.value} value={cond.value}>
                            {cond.label}
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
                      placeholder="Notas adicionales..."
                      className="sm:col-span-2 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white placeholder-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="shrink-0 p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
              No hay items en el inventario
            </p>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar primer item
            </button>
          </div>
        )}
      </div>

      {/* Photo Upload Placeholder */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Fotografias del inmueble
        </h3>
        <div className="p-8 text-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-[#141416]">
          <Camera className="w-12 h-12 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
          <p className="text-neutral-500 dark:text-neutral-400 mb-1">
            Arrastra fotos aqui o haz clic para seleccionar
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            JPG, PNG hasta 10MB cada una
          </p>
          <button
            type="button"
            disabled
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 text-neutral-400 dark:text-neutral-500 font-medium cursor-not-allowed"
          >
            <Camera className="w-4 h-4" />
            Proximamente
          </button>
        </div>
      </div>

      {/* General Notes */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Observaciones generales
        </label>
        <textarea
          value={formData.inventoryNotes || ''}
          onChange={(e) => updateFormData({ inventoryNotes: e.target.value })}
          placeholder="Estado general del inmueble, detalles adicionales..."
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
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
        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
      >
        <Pencil className="w-3 h-3" />
        Editar
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
          Confirmar Consignacion
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400">
          Revisa la informacion antes de crear la consignacion
        </p>
      </div>

      <div className="space-y-4">
        {/* Propietario Section */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <SectionHeader title="Propietario" step={1} />
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              (newPropietario?.documentType === 'NIT' || propietario?.documentType === 'NIT')
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
            )}>
              {(newPropietario?.documentType === 'NIT' || propietario?.documentType === 'NIT') ? (
                <Buildings className="w-5 h-5" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div>
              {newPropietario && (
                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-1">
                  Nuevo
                </span>
              )}
              <p className="font-medium text-neutral-900 dark:text-white">
                {newPropietario?.name || propietario?.name || 'No seleccionado'}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {newPropietario?.email || propietario?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Property Section */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <SectionHeader title="Propiedad" step={2} />
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-2xl">
              {propertyType?.icon || '🏠'}
            </div>
            <div className="flex-1">
              <p className="font-medium text-neutral-900 dark:text-white">
                {formData.propertyTitle || 'Sin titulo'}
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
                  <span className="text-sm font-normal text-neutral-500">/mes</span>
                </span>
                {formData.adminFee && (
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    + {formatCurrency(formData.adminFee)} admin
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Terms Section */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <SectionHeader title="Terminos" step={3} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Comision</p>
              <p className="font-medium text-neutral-900 dark:text-white">{commissionPercent}%</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Termino minimo</p>
              <p className="font-medium text-neutral-900 dark:text-white">
                {formData.minimumTerm || 12} meses
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Comision mensual</p>
              <p className="font-medium text-indigo-600 dark:text-indigo-400">
                {formatCurrency(agencyCommission)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Neto propietario</p>
              <p className="font-medium text-emerald-600 dark:text-emerald-400">
                {formatCurrency(ownerNet)}
              </p>
            </div>
          </div>
        </div>

        {/* Agent Section */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <SectionHeader title="Agente Asignado" step={4} />
          {agente ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                {agente.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">{agente.name}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {agente.zone} - {agente.commissionSplit}% comision
                </p>
              </div>
            </div>
          ) : (
            <p className="text-neutral-500 dark:text-neutral-400">No asignado</p>
          )}
        </div>

        {/* Inventory Section */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <SectionHeader title="Inventario" step={5} />
          {inventoryItems.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {inventoryItems.length} item{inventoryItems.length !== 1 ? 's' : ''} registrado{inventoryItems.length !== 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {inventoryItems.slice(0, 5).map((item) => (
                  <span
                    key={item.id}
                    className="px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-400"
                  >
                    {item.name || 'Sin nombre'} ({item.quantity})
                  </span>
                ))}
                {inventoryItems.length > 5 && (
                  <span className="px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-500">
                    +{inventoryItems.length - 5} mas
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Sin inventario registrado</p>
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
