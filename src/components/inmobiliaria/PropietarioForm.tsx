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
import { useI18n } from '@/lib/i18n';
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

const DOCUMENT_TYPE_VALUES: { value: DocumentType; hint: string }[] = [
  { value: 'CC', hint: 'Ej: 80.123.456' },
  { value: 'CE', hint: 'Ej: 123456' },
  { value: 'NIT', hint: 'Ej: 900.456.789-1' },
  { value: 'PASSPORT', hint: 'Ej: AB123456' },
];

const DOCUMENT_TYPE_LABEL_KEYS: Record<DocumentType, string> = {
  CC: 'inmobiliaria.propietario.form.docCC',
  CE: 'inmobiliaria.propietario.form.docCE',
  NIT: 'inmobiliaria.propietario.form.docNIT',
  PASSPORT: 'inmobiliaria.propietario.form.docPassport',
};

const ACCOUNT_TYPE_VALUES: AccountType[] = ['savings', 'checking'];

const ACCOUNT_TYPE_LABEL_KEYS: Record<AccountType, string> = {
  savings: 'inmobiliaria.propietario.form.savings',
  checking: 'inmobiliaria.propietario.form.checking',
};

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
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger flex items-center gap-1">
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
  const { t } = useI18n();
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
      newErrors.name = t('inmobiliaria.propietario.form.errNameRequired');
    } else if (formData.name.length < 3) {
      newErrors.name = t('inmobiliaria.propietario.form.errNameMin');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('inmobiliaria.propietario.form.errEmailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('inmobiliaria.propietario.form.errEmailInvalid');
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('inmobiliaria.propietario.form.errPhoneRequired');
    } else if (!/^\+?[0-9\s-]{10,}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = t('inmobiliaria.propietario.form.errPhoneInvalid');
    }

    if (!formData.documentNumber.trim()) {
      newErrors.documentNumber = t('inmobiliaria.propietario.form.errDocRequired');
    } else {
      // Document-specific validation
      if (formData.documentType === 'CC' && !/^[0-9.]{6,12}$/.test(formData.documentNumber.replace(/\./g, ''))) {
        newErrors.documentNumber = t('inmobiliaria.propietario.form.errCCInvalid');
      }
      if (formData.documentType === 'NIT' && !/^[0-9.-]{9,15}$/.test(formData.documentNumber)) {
        newErrors.documentNumber = t('inmobiliaria.propietario.form.errNITInvalid');
      }
    }

    // Bank account validation
    if (!formData.bankCode) {
      newErrors.bankCode = t('inmobiliaria.propietario.form.errBankRequired');
    }
    if (!formData.accountType) {
      newErrors.accountType = t('inmobiliaria.propietario.form.errAccountTypeRequired');
    }
    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = t('inmobiliaria.propietario.form.errAccountNumRequired');
    } else if (!/^[0-9]{10,20}$/.test(formData.accountNumber.replace(/[.\s-]/g, ''))) {
      newErrors.accountNumber = t('inmobiliaria.propietario.form.errAccountNumInvalid');
    }
    if (!formData.accountHolder.trim()) {
      newErrors.accountHolder = t('inmobiliaria.propietario.form.errHolderRequired');
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
            <Buildings className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
          ) : (
            <User className="w-5 h-5 text-primary" />
          )}
          <h3 className="font-semibold">
            {isCompany ? t('inmobiliaria.propietario.form.companyInfo') : t('inmobiliaria.propietario.form.personalInfo')}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Document Type */}
          <InputWrapper label={t('inmobiliaria.propietario.form.documentType')} required>
            <div className="relative">
              <select
                value={formData.documentType}
                onChange={(e) => updateField('documentType', e.target.value as DocumentType)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                {DOCUMENT_TYPE_VALUES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {t(DOCUMENT_TYPE_LABEL_KEYS[type.value])}
                  </option>
                ))}
              </select>
              <CaretDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            </div>
          </InputWrapper>

          {/* Document Number */}
          <InputWrapper
            label={formData.documentType === 'NIT' ? 'NIT' : t('inmobiliaria.propietario.form.documentNumber')}
            required
            error={touched.documentNumber ? errors.documentNumber : undefined}
            hint={DOCUMENT_TYPE_VALUES.find((dt) => dt.value === formData.documentType)?.hint}
          >
            <div className="relative">
              <IdentificationCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={formData.documentNumber}
                onChange={(e) => updateField('documentNumber', e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, documentNumber: true }))}
                placeholder={DOCUMENT_TYPE_VALUES.find((dt) => dt.value === formData.documentType)?.hint}
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all',
                  touched.documentNumber && errors.documentNumber
                    ? 'border-danger/30'
                    : 'border-neutral-200 dark:border-neutral-700'
                )}
              />
            </div>
          </InputWrapper>
        </div>

        {/* Name */}
        <InputWrapper
          label={isCompany ? t('inmobiliaria.propietario.form.businessName') : t('inmobiliaria.propietario.form.fullName')}
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
                'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all',
                touched.name && errors.name
                  ? 'border-danger/30'
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
                  'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all',
                  touched.email && errors.email
                    ? 'border-danger/30'
                    : 'border-neutral-200 dark:border-neutral-700'
                )}
              />
            </div>
          </InputWrapper>

          {/* Phone */}
          <InputWrapper
            label={t('inmobiliaria.propietario.form.phone')}
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
                  'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all',
                  touched.phone && errors.phone
                    ? 'border-danger/30'
                    : 'border-neutral-200 dark:border-neutral-700'
                )}
              />
            </div>
          </InputWrapper>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Address */}
          <InputWrapper label={t('inmobiliaria.propietario.form.address')} hint={t('inmobiliaria.propietario.form.optional')}>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="Cra 15 #93-45, Apto 802"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          </InputWrapper>

          {/* City */}
          <InputWrapper label={t('inmobiliaria.propietario.form.city')} hint={t('inmobiliaria.propietario.form.optional')}>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="Bogotá"
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </InputWrapper>
        </div>
      </div>

      {/* Bank Account */}
      <div className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2 text-neutral-900 dark:text-white">
          <Bank className="w-5 h-5 text-success" />
          <h3 className="font-semibold">{t('inmobiliaria.propietario.form.bankDataTitle')}</h3>
        </div>

        <div className="p-4 rounded-xl bg-primary-soft border border-primary/30">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-primary">
              {t('inmobiliaria.propietario.form.bankDataInfo')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Bank */}
          <InputWrapper
            label={t('inmobiliaria.propietario.form.bank')}
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
                  'w-full pl-10 pr-8 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all',
                  touched.bankCode && errors.bankCode
                    ? 'border-danger/30'
                    : 'border-neutral-200 dark:border-neutral-700'
                )}
              >
                <option value="">{t('inmobiliaria.propietario.form.selectBank')}</option>
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
            label={t('inmobiliaria.propietario.form.accountType')}
            required
            error={touched.accountType ? errors.accountType : undefined}
          >
            <div className="flex gap-3">
              {ACCOUNT_TYPE_VALUES.map((accType) => (
                <button
                  key={accType}
                  type="button"
                  onClick={() => updateField('accountType', accType)}
                  className={cn(
                    'flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all',
                    formData.accountType === accType
                      ? 'border-primary/30 bg-primary-soft text-primary'
                      : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'
                  )}
                >
                  {t(ACCOUNT_TYPE_LABEL_KEYS[accType])}
                </button>
              ))}
            </div>
          </InputWrapper>
        </div>

        {/* Account Number */}
        <InputWrapper
          label={t('inmobiliaria.propietario.form.accountNumber')}
          required
          error={touched.accountNumber ? errors.accountNumber : undefined}
          hint={t('inmobiliaria.propietario.form.hintDigitsOnly')}
        >
          <input
            type="text"
            value={formData.accountNumber}
            onChange={(e) => updateField('accountNumber', e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={() => setTouched((prev) => ({ ...prev, accountNumber: true }))}
            placeholder="1234567890"
            maxLength={20}
            className={cn(
              'w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono',
              touched.accountNumber && errors.accountNumber
                ? 'border-danger/30'
                : 'border-neutral-200 dark:border-neutral-700'
            )}
          />
        </InputWrapper>

        {/* Account Holder */}
        <InputWrapper
          label={t('inmobiliaria.propietario.form.accountHolder')}
          required
          error={touched.accountHolder ? errors.accountHolder : undefined}
          hint={t('inmobiliaria.propietario.form.hintMatchBank')}
        >
          <input
            type="text"
            value={formData.accountHolder}
            onChange={(e) => updateField('accountHolder', e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, accountHolder: true }))}
            placeholder={formData.name || 'Nombre del titular'}
            className={cn(
              'w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all',
              touched.accountHolder && errors.accountHolder
                ? 'border-danger/30'
                : 'border-neutral-200 dark:border-neutral-700'
            )}
          />
        </InputWrapper>
      </div>

      {/* Notes */}
      <div className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        <InputWrapper label={t('inmobiliaria.propietario.form.internalNotes')} hint={t('inmobiliaria.propietario.form.hintTeamOnly')}>
          <textarea
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Agregar notas sobre este propietario..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
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
          {t('inmobiliaria.propietario.form.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:opacity-90 text-white font-medium transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <SpinnerGap className="w-4 h-4 animate-spin" />
              {t('inmobiliaria.propietario.form.saving')}
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              {mode === 'create' ? t('inmobiliaria.propietario.form.createOwner') : t('inmobiliaria.propietario.form.saveChanges')}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default PropietarioForm;
