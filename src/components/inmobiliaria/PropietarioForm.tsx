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
  Check,
  Warning,
  Info,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Chip } from '@leasefy/cadence';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import type { Propietario, PropietarioFormData, DocumentType } from '@/lib/types/inmobiliaria';
import {
  COLOMBIAN_BANKS,
  type BankCode,
  type AccountType,
} from '@/lib/types/payment-accounts';

interface PropietarioFormProps {
  initialData?: Propietario;
  /**
   * Prefills from already-staged wizard data (`PropietarioFormData` — flat
   * bank fields) instead of a persisted `Propietario` (nested
   * `bankAccount`). Takes precedence over `initialData` when both are set.
   * Used when re-opening the form to edit an owner the wizard already
   * created in this session (T-0011) — without it, "Editar" reopened a
   * completely blank form.
   */
  initialFormData?: PropietarioFormData;
  onSubmit: (data: PropietarioFormData) => Promise<void>;
  onCancel: () => void;
  mode: 'create' | 'edit';
  /**
   * A field-scoped error from a persist attempt that happened OUTSIDE this
   * form (T-0011: the wizard's "Siguiente" persists on step transition, not
   * on this form's own submit — see contract.md §3.3, the 409 duplicate
   * document case). Injected into local `errors`/`touched` so it renders
   * through the existing error UI instead of a second error path.
   */
  serverError?: { field: keyof PropietarioFormData; message: string } | null;
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
      <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
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
        <p className="text-xs text-fg-subtle">{hint}</p>
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
  initialFormData,
  onSubmit,
  onCancel,
  mode,
  serverError,
}: PropietarioFormProps) {
  const { t } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState<PropietarioFormData>(
    initialFormData ?? {
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
    },
  );

  // Surface a persist error that happened outside this form (the wizard's
  // "Siguiente" 409) through the same error UI as a local validation error.
  useEffect(() => {
    if (!serverError) return;
    setErrors((prev) => ({ ...prev, [serverError.field]: serverError.message }));
    setTouched((prev) => ({ ...prev, [serverError.field]: true }));
  }, [serverError]);

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
        <div className="flex items-center gap-2 text-fg dark:text-white">
          {isCompany ? (
            <Buildings className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
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
            <Select
              value={formData.documentType}
              onValueChange={(value) => updateField('documentType', value as DocumentType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPE_VALUES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {t(DOCUMENT_TYPE_LABEL_KEYS[type.value])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InputWrapper>

          {/* Document Number */}
          <InputWrapper
            label={formData.documentType === 'NIT' ? 'NIT' : t('inmobiliaria.propietario.form.documentNumber')}
            required
            error={touched.documentNumber ? errors.documentNumber : undefined}
            hint={DOCUMENT_TYPE_VALUES.find((dt) => dt.value === formData.documentType)?.hint}
          >
            <div className="relative">
              <IdentificationCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle z-10" />
              <Input
                type="text"
                value={formData.documentNumber}
                onChange={(e) => updateField('documentNumber', e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, documentNumber: true }))}
                placeholder={DOCUMENT_TYPE_VALUES.find((dt) => dt.value === formData.documentType)?.hint}
                className={cn(
                  'pl-10',
                  touched.documentNumber && errors.documentNumber && 'border-danger/30'
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
              <Buildings className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle" />
            ) : (
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle" />
            )}
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
              placeholder={isCompany ? 'Inversiones ABC S.A.S.' : 'Juan Pérez García'}
              className={cn('pl-10', touched.name && errors.name && 'border-danger/30')}
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
              <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle z-10" />
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                placeholder="email@ejemplo.com"
                className={cn('pl-10', touched.email && errors.email && 'border-danger/30')}
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
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle z-10" />
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                placeholder="+57 310 234 5678"
                className={cn('pl-10', touched.phone && errors.phone && 'border-danger/30')}
              />
            </div>
          </InputWrapper>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Address */}
          <InputWrapper label={t('inmobiliaria.propietario.form.address')} hint={t('inmobiliaria.propietario.form.optional')}>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle z-10" />
              <Input
                type="text"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="Cra 15 #93-45, Apto 802"
                className="pl-10"
              />
            </div>
          </InputWrapper>

          {/* City */}
          <InputWrapper label={t('inmobiliaria.propietario.form.city')} hint={t('inmobiliaria.propietario.form.optional')}>
            <Input
              type="text"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="Bogotá"
            />
          </InputWrapper>
        </div>
      </div>

      {/* Bank Account */}
      <div className="space-y-4 pt-4 border-t border-border-faint dark:border-border-strong">
        <div className="flex items-center gap-2 text-fg dark:text-white">
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
            <Select
              value={formData.bankCode || undefined}
              onValueChange={(value) => updateField('bankCode', value as BankCode)}
            >
              <SelectTrigger
                className={cn(
                  'gap-2',
                  touched.bankCode && errors.bankCode && 'border-danger/30'
                )}
              >
                <Bank className="w-5 h-5 text-fg-subtle shrink-0" />
                <SelectValue placeholder={t('inmobiliaria.propietario.form.selectBank')} />
              </SelectTrigger>
              <SelectContent>
                {COLOMBIAN_BANKS.map((bank) => (
                  <SelectItem key={bank.code} value={bank.code}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InputWrapper>

          {/* Account Type */}
          <InputWrapper
            label={t('inmobiliaria.propietario.form.accountType')}
            required
            error={touched.accountType ? errors.accountType : undefined}
          >
            <div className="flex gap-3">
              {ACCOUNT_TYPE_VALUES.map((accType) => (
                <Chip
                  key={accType}
                  selected={formData.accountType === accType}
                  onClick={() => updateField('accountType', accType)}
                  className="flex-1 justify-center"
                >
                  {t(ACCOUNT_TYPE_LABEL_KEYS[accType])}
                </Chip>
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
          <Input
            type="text"
            value={formData.accountNumber}
            onChange={(e) => updateField('accountNumber', e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={() => setTouched((prev) => ({ ...prev, accountNumber: true }))}
            placeholder="1234567890"
            maxLength={20}
            className={cn(
              'font-mono',
              touched.accountNumber && errors.accountNumber && 'border-danger/30'
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
          <Input
            type="text"
            value={formData.accountHolder}
            onChange={(e) => updateField('accountHolder', e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, accountHolder: true }))}
            placeholder={formData.name || 'Nombre del titular'}
            className={cn(touched.accountHolder && errors.accountHolder && 'border-danger/30')}
          />
        </InputWrapper>
      </div>

      {/* Notes */}
      <div className="space-y-4 pt-4 border-t border-border-faint dark:border-border-strong">
        <InputWrapper label={t('inmobiliaria.propietario.form.internalNotes')} hint={t('inmobiliaria.propietario.form.hintTeamOnly')}>
          <Textarea
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Agregar notas sobre este propietario..."
            rows={3}
            className="resize-none"
          />
        </InputWrapper>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-faint dark:border-border-strong">
        <Button
          type="button"
          variant="secondary"
          hideArrow
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {t('inmobiliaria.propietario.form.cancel')}
        </Button>
        <Button
          type="submit"
          hideArrow
          disabled={isSubmitting}
          className="gap-2"
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" variant="current" />
              {t('inmobiliaria.propietario.form.saving')}
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              {mode === 'create' ? t('inmobiliaria.propietario.form.createOwner') : t('inmobiliaria.propietario.form.saveChanges')}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default PropietarioForm;
