'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Buildings,
  Envelope,
  Phone,
  IdentificationCard,
  MapPin,
  Bank,
  Wallet,
  CaretDown,
  SpinnerGap,
  Check,
  Warning,
  Info,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { Propietario, PropietarioFormData, DocumentType } from '@/lib/types/inmobiliaria';
import {
  COLOMBIAN_BANKS,
  type BankCode,
  type AccountType,
} from '@/lib/types/payment-accounts';

interface PropietarioFormProps {
  initialData?: Propietario;
  onSubmit: (data: PropietarioFormData) => Promise<void>;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

const DOCUMENT_TYPES: { value: DocumentType; label: string; hint: string }[] = [
  { value: 'CC', label: 'Cédula de Ciudadanía', hint: 'Ej: 80.123.456' },
  { value: 'CE', label: 'Cédula de Extranjería', hint: 'Ej: 123456' },
  { value: 'NIT', label: 'NIT (Empresas)', hint: 'Ej: 900.456.789-1' },
  { value: 'PASSPORT', label: 'Pasaporte', hint: 'Ej: AB123456' },
];

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'savings', label: 'Ahorros' },
  { value: 'checking', label: 'Corriente' },
];

/**
 * InputWrapper - Reusable wrapper for form fields
 * Defined outside of PropietarioForm to prevent re-creation on each render
 */
function InputWrapper({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <Warning className="w-3 h-3" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-neutral-400">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * PropietarioForm - Complete form for creating/editing property owners
 * Includes personal info, document validation, and Colombian bank account fields
 */
export function PropietarioForm({
  initialData,
  onSubmit,
  onCancel,
  mode,
}: PropietarioFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState<PropietarioFormData>({
    name: initialData?.name ?? '',
    email: initialData?.email ?? '',
    phone: initialData?.phone ?? '',
    documentType: initialData?.documentType ?? 'CC',
    documentNumber: initialData?.documentNumber ?? '',
    address: initialData?.address ?? '',
    city: initialData?.city ?? '',
    bankCode: initialData?.bankAccount.bank ?? '',
    accountType: initialData?.bankAccount.accountType ?? '',
    accountNumber: initialData?.bankAccount.accountNumber ?? '',
    accountHolder: initialData?.bankAccount.accountHolder ?? '',
    notes: initialData?.notes ?? '',
  });

  const isCompany = formData.documentType === 'NIT';
  const selectedBank = COLOMBIAN_BANKS.find((b) => b.code === formData.bankCode);

  const updateField = (field: keyof PropietarioFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Clear error when field is modified
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    } else if (!/^\+?[0-9\s-]{10,}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Teléfono inválido';
    }

    if (!formData.documentNumber.trim()) {
      newErrors.documentNumber = 'El documento es requerido';
    } else {
      // Document-specific validation
      if (formData.documentType === 'CC' && !/^[0-9.]{6,12}$/.test(formData.documentNumber.replace(/\./g, ''))) {
        newErrors.documentNumber = 'Cédula inválida (6-12 dígitos)';
      }
      if (formData.documentType === 'NIT' && !/^[0-9.-]{9,15}$/.test(formData.documentNumber)) {
        newErrors.documentNumber = 'NIT inválido';
      }
    }

    // Bank account validation
    if (!formData.bankCode) {
      newErrors.bankCode = 'Selecciona un banco';
    }
    if (!formData.accountType) {
      newErrors.accountType = 'Selecciona tipo de cuenta';
    }
    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Número de cuenta requerido';
    } else if (!/^[0-9]{10,20}$/.test(formData.accountNumber.replace(/[.\s-]/g, ''))) {
      newErrors.accountNumber = 'Número de cuenta inválido (10-20 dígitos)';
    }
    if (!formData.accountHolder.trim()) {
      newErrors.accountHolder = 'Nombre del titular requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      // Mark all fields as touched to show errors
      const allTouched: Record<string, boolean> = {};
      Object.keys(formData).forEach((key) => {
        allTouched[key] = true;
      });
      setTouched(allTouched);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      console.error('Form submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-neutral-900 dark:text-white">
          {isCompany ? (
            <Buildings className="w-5 h-5 text-purple-500" />
          ) : (
            <User className="w-5 h-5 text-indigo-500" />
          )}
          <h3 className="font-semibold">
            {isCompany ? 'Información de la empresa' : 'Información personal'}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Document Type */}
          <InputWrapper label="Tipo de documento" required>
            <div className="relative">
              <select
                value={formData.documentType}
                onChange={(e) => updateField('documentType', e.target.value as DocumentType)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <CaretDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            </div>
          </InputWrapper>

          {/* Document Number */}
          <InputWrapper
            label={formData.documentType === 'NIT' ? 'NIT' : 'Número de documento'}
            required
            error={touched.documentNumber ? errors.documentNumber : undefined}
            hint={DOCUMENT_TYPES.find((t) => t.value === formData.documentType)?.hint}
          >
            <div className="relative">
              <IdentificationCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={formData.documentNumber}
                onChange={(e) => updateField('documentNumber', e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, documentNumber: true }))}
                placeholder={DOCUMENT_TYPES.find((t) => t.value === formData.documentType)?.hint}
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all',
                  touched.documentNumber && errors.documentNumber
                    ? 'border-red-500'
                    : 'border-neutral-200 dark:border-neutral-700'
                )}
              />
            </div>
          </InputWrapper>
        </div>

        {/* Name */}
        <InputWrapper
          label={isCompany ? 'Razón social' : 'Nombre completo'}
          required
          error={touched.name ? errors.name : undefined}
        >
          <div className="relative">
            {isCompany ? (
              <Buildings className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            ) : (
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            )}
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
              placeholder={isCompany ? 'Inversiones ABC S.A.S.' : 'Juan Pérez García'}
              className={cn(
                'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all',
                touched.name && errors.name
                  ? 'border-red-500'
                  : 'border-neutral-200 dark:border-neutral-700'
              )}
            />
          </div>
        </InputWrapper>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Email */}
          <InputWrapper
            label="Email"
            required
            error={touched.email ? errors.email : undefined}
          >
            <div className="relative">
              <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                placeholder="email@ejemplo.com"
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all',
                  touched.email && errors.email
                    ? 'border-red-500'
                    : 'border-neutral-200 dark:border-neutral-700'
                )}
              />
            </div>
          </InputWrapper>

          {/* Phone */}
          <InputWrapper
            label="Teléfono"
            required
            error={touched.phone ? errors.phone : undefined}
          >
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                placeholder="+57 310 234 5678"
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all',
                  touched.phone && errors.phone
                    ? 'border-red-500'
                    : 'border-neutral-200 dark:border-neutral-700'
                )}
              />
            </div>
          </InputWrapper>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Address */}
          <InputWrapper label="Dirección" hint="Opcional">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="Cra 15 #93-45, Apto 802"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </InputWrapper>

          {/* City */}
          <InputWrapper label="Ciudad" hint="Opcional">
            <input
              type="text"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="Bogotá"
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </InputWrapper>
        </div>
      </div>

      {/* Bank Account */}
      <div className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2 text-neutral-900 dark:text-white">
          <Bank className="w-5 h-5 text-emerald-500" />
          <h3 className="font-semibold">Datos bancarios para dispersiones</h3>
        </div>

        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Estos datos se usarán para transferir el canon mensual al propietario, después de descontar la comisión de administración.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Bank */}
          <InputWrapper
            label="Banco"
            required
            error={touched.bankCode ? errors.bankCode : undefined}
          >
            <div className="relative">
              <Bank className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <select
                value={formData.bankCode}
                onChange={(e) => updateField('bankCode', e.target.value as BankCode)}
                onBlur={() => setTouched((prev) => ({ ...prev, bankCode: true }))}
                className={cn(
                  'w-full pl-10 pr-8 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all',
                  touched.bankCode && errors.bankCode
                    ? 'border-red-500'
                    : 'border-neutral-200 dark:border-neutral-700'
                )}
              >
                <option value="">Seleccionar banco...</option>
                {COLOMBIAN_BANKS.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
              <CaretDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            </div>
          </InputWrapper>

          {/* Account Type */}
          <InputWrapper
            label="Tipo de cuenta"
            required
            error={touched.accountType ? errors.accountType : undefined}
          >
            <div className="flex gap-3">
              {ACCOUNT_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => updateField('accountType', type.value)}
                  className={cn(
                    'flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all',
                    formData.accountType === type.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </InputWrapper>
        </div>

        {/* Account Number */}
        <InputWrapper
          label="Número de cuenta"
          required
          error={touched.accountNumber ? errors.accountNumber : undefined}
          hint="Solo dígitos, sin puntos ni guiones"
        >
          <input
            type="text"
            value={formData.accountNumber}
            onChange={(e) => updateField('accountNumber', e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={() => setTouched((prev) => ({ ...prev, accountNumber: true }))}
            placeholder="1234567890"
            maxLength={20}
            className={cn(
              'w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono',
              touched.accountNumber && errors.accountNumber
                ? 'border-red-500'
                : 'border-neutral-200 dark:border-neutral-700'
            )}
          />
        </InputWrapper>

        {/* Account Holder */}
        <InputWrapper
          label="Titular de la cuenta"
          required
          error={touched.accountHolder ? errors.accountHolder : undefined}
          hint="Debe coincidir con el nombre registrado en el banco"
        >
          <input
            type="text"
            value={formData.accountHolder}
            onChange={(e) => updateField('accountHolder', e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, accountHolder: true }))}
            placeholder={formData.name || 'Nombre del titular'}
            className={cn(
              'w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all',
              touched.accountHolder && errors.accountHolder
                ? 'border-red-500'
                : 'border-neutral-200 dark:border-neutral-700'
            )}
          />
        </InputWrapper>
      </div>

      {/* Notes */}
      <div className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        <InputWrapper label="Notas internas" hint="Solo visible para el equipo">
          <textarea
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Agregar notas sobre este propietario..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
          />
        </InputWrapper>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <SpinnerGap className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              {mode === 'create' ? 'Crear propietario' : 'Guardar cambios'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default PropietarioForm;
