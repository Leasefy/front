'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Buildings,
  Envelope,
  Phone,
  MapPin,
  Globe,
  WhatsappLogo,
  IdentificationCard,
  User,
  Certificate,
  Percent,
  Calendar,
  Bell,
  Check,
  Warning,
  Info,
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
import { Chip } from '@leasefy/cadence';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import type { AgencyProfile, UpdateAgencyPayload } from '@/lib/types/inmobiliaria';
import { COLOMBIAN_DEPARTMENTS } from '@/lib/types/inmobiliaria';

interface ConfigPerfilAgenciaProps {
  /** Real agency row from GET /inmobiliaria/config (`agency` key) */
  agency: AgencyProfile;
  /**
   * Called with ONLY the changed fields (backend UpdateAgencyDto shape).
   * Should throw/reject on failure so the form stays in edit mode.
   */
  onSave?: (payload: UpdateAgencyPayload) => Promise<void> | void;
  /** Agency ADMINs only — the backend rejects PUT /inmobiliaria/agency otherwise */
  canEdit?: boolean;
  isLoading?: boolean;
}

/** Editable fields — the exact subset the backend UpdateAgencyDto accepts */
interface PerfilFormState {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  supportEmail: string;
  website: string;
  address: string;
  city: string;
  department: string;
  postalCode: string;
  nit: string;
  razonSocial: string;
  legalRepresentative: string;
  legalDocumentNumber: string;
  matriculaInmobiliaria: string;
  registroCamara: string;
  defaultCommissionPercent: number;
  defaultLateFeePercent: number;
  paymentDueDay: number;
  disbursementDay: number;
  reminderDaysBefore: number[];
  reminderDaysAfter: number[];
}

// Day offsets offered as reminder chips (backend accepts 0..30)
const REMINDER_DAYS_OPTIONS = [1, 2, 3, 5, 7, 10, 15, 30];

/** Chip options: the presets plus any day already saved outside them. */
function reminderDayOptions(current: number[]): number[] {
  return Array.from(new Set([...REMINDER_DAYS_OPTIONS, ...current])).sort((a, b) => a - b);
}

// Module-level so React doesn't remount the inputs (and drop focus) on every
// keystroke — a defect the previous inline-component version had.
const InputWrapper = ({
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
}) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-foreground">
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
      <p className="text-xs text-muted-foreground">{hint}</p>
    ) : null}
  </div>
);

const SectionHeader = ({
  icon: Icon,
  title,
  color = 'text-fg-muted',
}: {
  icon: React.ElementType;
  title: string;
  color?: string;
}) => (
  <div className="flex items-center gap-2 text-foreground">
    <Icon className={cn('w-5 h-5', color)} weight="duotone" />
    <h3 className="text-base font-semibold">{title}</h3>
  </div>
);

function buildFormState(agency: AgencyProfile): PerfilFormState {
  return {
    name: agency.name ?? '',
    phone: agency.phone ?? '',
    whatsapp: agency.whatsapp ?? '',
    email: agency.email ?? '',
    supportEmail: agency.supportEmail ?? '',
    website: agency.website ?? '',
    address: agency.address ?? '',
    city: agency.city ?? '',
    department: agency.department ?? '',
    postalCode: agency.postalCode ?? '',
    nit: agency.nit ?? '',
    razonSocial: agency.razonSocial ?? '',
    legalRepresentative: agency.legalRepresentative ?? '',
    legalDocumentNumber: agency.legalDocumentNumber ?? '',
    matriculaInmobiliaria: agency.matriculaInmobiliaria ?? '',
    registroCamara: agency.registroCamara ?? '',
    defaultCommissionPercent: agency.defaultCommissionPercent ?? 10,
    defaultLateFeePercent: agency.defaultLateFeePercent ?? 2,
    paymentDueDay: agency.paymentDueDay ?? 5,
    disbursementDay: agency.disbursementDay ?? 15,
    reminderDaysBefore: [...(agency.reminderDaysBefore ?? [])].sort((a, b) => a - b),
    reminderDaysAfter: [...(agency.reminderDaysAfter ?? [])].sort((a, b) => a - b),
  };
}

/**
 * ConfigPerfilAgencia — agency profile form wired to the real backend contract.
 *
 * Reads from the agency row (GET /inmobiliaria/config → `agency`) and saves via
 * PUT /inmobiliaria/agency with only the changed fields, including the extended
 * design fields (website, whatsapp, razonSocial, matriculaInmobiliaria,
 * registroCamara, department, postalCode, supportEmail) and the reminder day
 * arrays (number[], 0..30 each; empty array = disabled).
 */
export function ConfigPerfilAgencia({
  agency,
  onSave,
  canEdit = true,
  isLoading = false,
}: ConfigPerfilAgenciaProps) {
  const { t, locale } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState<PerfilFormState>(() => buildFormState(agency));

  const reminderDaysBefore = agency.reminderDaysBefore ?? [];
  const reminderDaysAfter = agency.reminderDaysAfter ?? [];

  // NIT is write-once: once the agency has one, it can only be changed by
  // contacting Leasefy support (the backend rejects a change with 403). Lock the
  // field in the UI so the user never hits that error — mirrors the tenant rut
  // lock (isRutLocked) in app/inquilino/perfil.
  const nitLocked = Boolean(agency.nit?.trim());

  const updateField = useCallback(
    (field: keyof PerfilFormState, value: string | number | number[]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setTouched((prev) => ({ ...prev, [field]: true }));
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    []
  );

  const toggleReminderDay = (
    field: 'reminderDaysBefore' | 'reminderDaysAfter',
    day: number
  ) => {
    const current = formData[field];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    updateField(field, next);
  };

  // NIT format validation. Colombian NIT/cédula base numbers are not always 9
  // digits: companies use 9, but natural-person agencies use their cédula, which
  // can be 8-11 digits (e.g. 1090525663-1). Normalize separators (dots/spaces)
  // first, then accept 8-11 base digits + a single verification digit.
  const validateNIT = (nit: string): boolean => {
    const normalized = nit.replace(/[.\s]/g, '');
    return /^\d{8,11}-\d$/.test(normalized);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('inmobiliaria.config.profile.validation.nameRequired');
    }
    // Optional in the backend — validate format only when provided
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('inmobiliaria.config.profile.validation.emailInvalid');
    }
    if (
      formData.supportEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.supportEmail)
    ) {
      newErrors.supportEmail = t('inmobiliaria.config.profile.validation.emailInvalid');
    }
    if (formData.nit.trim() && !validateNIT(formData.nit)) {
      newErrors.nit = t('inmobiliaria.config.profile.validation.nitInvalid');
    }
    if (
      formData.defaultCommissionPercent < 0 ||
      formData.defaultCommissionPercent > 100
    ) {
      newErrors.defaultCommissionPercent = t('inmobiliaria.config.profile.validation.commissionRange');
    }
    if (formData.defaultLateFeePercent < 0 || formData.defaultLateFeePercent > 100) {
      newErrors.defaultLateFeePercent = t('inmobiliaria.config.profile.validation.commissionRange');
    }
    if (formData.paymentDueDay < 1 || formData.paymentDueDay > 28) {
      newErrors.paymentDueDay = t('inmobiliaria.config.profile.validation.dayRange');
    }
    if (formData.disbursementDay < 1 || formData.disbursementDay > 28) {
      newErrors.disbursementDay = t('inmobiliaria.config.profile.validation.dayRange');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** Diff form state against the loaded agency: only changed fields are sent. */
  const buildChangedPayload = (): UpdateAgencyPayload => {
    const original = buildFormState(agency);
    const payload: UpdateAgencyPayload = {};

    const stringFields = [
      'name',
      'phone',
      'whatsapp',
      'email',
      'supportEmail',
      'website',
      'address',
      'city',
      'department',
      'postalCode',
      'nit',
      'razonSocial',
      'legalRepresentative',
      'legalDocumentNumber',
      'matriculaInmobiliaria',
      'registroCamara',
    ] as const;
    for (const field of stringFields) {
      // Never send nit once it's locked — it's immutable server-side and the
      // input is disabled, so a stray value would only earn a 403.
      if (field === 'nit' && nitLocked) continue;
      const value = formData[field].trim();
      if (value !== original[field]) {
        payload[field] = value;
      }
    }

    const numberFields = [
      'defaultCommissionPercent',
      'defaultLateFeePercent',
      'paymentDueDay',
      'disbursementDay',
    ] as const;
    for (const field of numberFields) {
      if (formData[field] !== original[field]) {
        payload[field] = formData[field];
      }
    }

    // Reminder arrays: send the FULL array only when its content changed
    // (both are kept sorted, so a join comparison is exact).
    const arrayFields = ['reminderDaysBefore', 'reminderDaysAfter'] as const;
    for (const field of arrayFields) {
      if (formData[field].join(',') !== original[field].join(',')) {
        payload[field] = formData[field];
      }
    }

    return payload;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error(t('inmobiliaria.config.profile.validation.fixErrors'));
      return;
    }

    const payload = buildChangedPayload();
    if (Object.keys(payload).length === 0) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave?.(payload);
      setIsEditing(false);
    } catch {
      // The parent surfaced the error (toast with the backend message,
      // e.g. 403 for non-admins) — keep the form in edit mode.
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(buildFormState(agency));
    setErrors({});
    setTouched({});
    setIsEditing(false);
  };

  const handleStartEditing = () => {
    // Re-seed from the freshest agency data on entering edit mode
    setFormData(buildFormState(agency));
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded-md w-1/3" />
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-fg">{agency.name}</h2>
          <p className="text-sm text-fg-muted">
            {t('inmobiliaria.config.profile.subtitle')}
          </p>
          {!canEdit && (
            <p className="text-xs text-fg-muted flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              {t('inmobiliaria.config.profile.adminOnlyHint')}
            </p>
          )}
        </div>
        {!isEditing && canEdit && (
          <Button hideArrow size="sm" className="shrink-0" onClick={handleStartEditing}>
            {t('inmobiliaria.common.edit')}
          </Button>
        )}
      </div>

      {/* Agency Name */}
      {isEditing && (
        <div className="space-y-4 p-5 rounded-xl bg-card border border-border">
          <SectionHeader icon={Buildings} title={t('inmobiliaria.config.profile.agencyName')} />
          <InputWrapper
            label={t('inmobiliaria.config.profile.agencyName')}
            required
            error={touched.name ? errors.name : undefined}
          >
            <div className="relative">
              <Buildings className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={cn('w-full pl-10', touched.name && errors.name && 'border-danger/30')}
              />
            </div>
          </InputWrapper>
        </div>
      )}

      {/* Contact Information */}
      <div className="space-y-4 p-5 rounded-xl bg-card border border-border">
        <SectionHeader
          icon={Phone}
          title={t('inmobiliaria.config.profile.contactInfo')}
          color="text-fg-muted"
        />

        {isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputWrapper label={t('inmobiliaria.config.profile.mainPhone')}>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+57 601 345 6789"
                  className="w-full pl-10"
                />
              </div>
            </InputWrapper>

            <InputWrapper
              label={t('inmobiliaria.config.profile.mainEmail')}
              error={touched.email ? errors.email : undefined}
            >
              <div className="relative">
                <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="contacto@agencia.co"
                  className={cn('w-full pl-10', touched.email && errors.email && 'border-danger/30')}
                />
              </div>
            </InputWrapper>

            <InputWrapper
              label={t('inmobiliaria.config.profile.supportEmail')}
              hint={t('common.optional')}
              error={touched.supportEmail ? errors.supportEmail : undefined}
            >
              <div className="relative">
                <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  value={formData.supportEmail}
                  onChange={(e) => updateField('supportEmail', e.target.value)}
                  placeholder="soporte@agencia.co"
                  className={cn('w-full pl-10', touched.supportEmail && errors.supportEmail && 'border-danger/30')}
                />
              </div>
            </InputWrapper>

            <InputWrapper label="WhatsApp" hint={t('common.optional')}>
              <div className="relative">
                <WhatsappLogo className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => updateField('whatsapp', e.target.value)}
                  placeholder="+57 310 555 1234"
                  className="w-full pl-10"
                />
              </div>
            </InputWrapper>

            <InputWrapper label={t('inmobiliaria.config.profile.website')} hint={t('common.optional')}>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="url"
                  value={formData.website}
                  onChange={(e) => updateField('website', e.target.value)}
                  placeholder="https://agencia.co"
                  className="w-full pl-10"
                />
              </div>
            </InputWrapper>

            <div className="sm:col-span-2">
              <InputWrapper label={t('inmobiliaria.config.profile.address')}>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <Textarea
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="Cra 11 #82-76, Oficina 501"
                    rows={2}
                    className="w-full pl-10 resize-none"
                  />
                </div>
              </InputWrapper>
            </div>

            <InputWrapper label={t('inmobiliaria.config.profile.city')}>
              <Input
                type="text"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="Bogota"
                className="w-full"
              />
            </InputWrapper>

            <InputWrapper label={t('inmobiliaria.config.profile.department')} hint={t('common.optional')}>
              <Select
                value={formData.department || undefined}
                onValueChange={(v) => updateField('department', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('inmobiliaria.config.profile.selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {COLOMBIAN_DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </InputWrapper>

            <InputWrapper label={t('inmobiliaria.config.profile.postalCode')} hint={t('common.optional')}>
              <Input
                type="text"
                value={formData.postalCode}
                onChange={(e) => updateField('postalCode', e.target.value)}
                placeholder="110221"
                className="w-full"
              />
            </InputWrapper>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t('inmobiliaria.config.profile.phone')}:</span>
              <span className="ml-2 text-foreground">{agency.phone || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('inmobiliaria.config.profile.email')}:</span>
              <span className="ml-2 text-foreground">{agency.email || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">WhatsApp:</span>
              <span className="ml-2 text-foreground">{agency.whatsapp || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('inmobiliaria.config.profile.website')}:</span>
              <span className="ml-2 text-foreground">{agency.website || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('inmobiliaria.config.profile.supportEmail')}:</span>
              <span className="ml-2 text-foreground">{agency.supportEmail || '—'}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">{t('inmobiliaria.config.profile.address')}:</span>
              <span className="ml-2 text-foreground">
                {[agency.address, agency.city, agency.department, agency.postalCode]
                  .filter(Boolean)
                  .join(', ') || '—'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legal Information */}
      <div className="space-y-4 p-5 rounded-xl bg-card border border-border">
        <SectionHeader
          icon={Certificate}
          title={t('inmobiliaria.config.profile.legalInfo')}
          color="text-fg-muted"
        />

        {isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputWrapper
              label={t('inmobiliaria.config.profile.nit')}
              error={touched.nit ? errors.nit : undefined}
              hint={
                nitLocked
                  ? locale === 'es'
                    ? 'Para cambiar el NIT, contacta al soporte de Leasefy.'
                    : 'To change the NIT, contact Leasefy support.'
                  : t('inmobiliaria.config.profile.nitFormat')
              }
            >
              <div className="relative">
                <IdentificationCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  value={formData.nit}
                  onChange={(e) => updateField('nit', e.target.value)}
                  disabled={nitLocked}
                  placeholder="901.234.567-8"
                  className={cn(
                    'w-full pl-10',
                    nitLocked && 'bg-surface-muted cursor-not-allowed',
                    touched.nit && errors.nit && 'border-danger/30',
                  )}
                />
              </div>
            </InputWrapper>

            <InputWrapper label={t('inmobiliaria.config.profile.legalName')} hint={t('common.optional')}>
              <Input
                type="text"
                value={formData.razonSocial}
                onChange={(e) => updateField('razonSocial', e.target.value)}
                placeholder="Nombre S.A.S."
                className="w-full"
              />
            </InputWrapper>

            <InputWrapper label={t('inmobiliaria.config.profile.legalRep')}>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  value={formData.legalRepresentative}
                  onChange={(e) => updateField('legalRepresentative', e.target.value)}
                  placeholder="Juan Perez Garcia"
                  className="w-full pl-10"
                />
              </div>
            </InputWrapper>

            <InputWrapper label={t('inmobiliaria.config.profile.legalRepId')}>
              <div className="relative">
                <IdentificationCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  value={formData.legalDocumentNumber}
                  onChange={(e) => updateField('legalDocumentNumber', e.target.value)}
                  placeholder="80.123.456"
                  className="w-full pl-10"
                />
              </div>
            </InputWrapper>

            <InputWrapper label={t('inmobiliaria.config.profile.realEstateRegistration')} hint={t('common.optional')}>
              <Input
                type="text"
                value={formData.matriculaInmobiliaria}
                onChange={(e) => updateField('matriculaInmobiliaria', e.target.value)}
                placeholder="INM-2024-001234"
                className="w-full"
              />
            </InputWrapper>

            <InputWrapper label={t('inmobiliaria.config.profile.chamberRegistration')} hint={t('common.optional')}>
              <Input
                type="text"
                value={formData.registroCamara}
                onChange={(e) => updateField('registroCamara', e.target.value)}
                placeholder="S0012345"
                className="w-full"
              />
            </InputWrapper>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t('inmobiliaria.config.profile.nit')}:</span>
              <span className="ml-2 text-foreground tabular-nums">{agency.nit || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('inmobiliaria.config.profile.legalName')}:</span>
              <span className="ml-2 text-foreground">{agency.razonSocial || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('inmobiliaria.config.profile.legalRep')}:</span>
              <span className="ml-2 text-foreground">{agency.legalRepresentative || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('inmobiliaria.config.profile.legalRepId')}:</span>
              <span className="ml-2 text-foreground tabular-nums">{agency.legalDocumentNumber || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('inmobiliaria.config.profile.realEstateRegistration')}:</span>
              <span className="ml-2 text-foreground">{agency.matriculaInmobiliaria || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('inmobiliaria.config.profile.chamberRegistrationShort')}:</span>
              <span className="ml-2 text-foreground">{agency.registroCamara || '—'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Default Settings */}
      <div className="space-y-4 p-5 rounded-xl bg-card border border-border">
        <SectionHeader
          icon={Percent}
          title={t('inmobiliaria.config.profile.defaultSettings')}
          color="text-fg-muted"
        />

        {isEditing ? (
          <>
            <div className="p-4 rounded-lg bg-primary-soft border border-primary/30">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" weight="fill" />
                <p className="text-sm text-primary">
                  {t('inmobiliaria.config.profile.defaultSettingsHint')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputWrapper
                label={t('inmobiliaria.config.profile.commissionPercent')}
                error={errors.defaultCommissionPercent}
              >
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={formData.defaultCommissionPercent}
                    onChange={(e) =>
                      updateField('defaultCommissionPercent', parseFloat(e.target.value) || 0)
                    }
                    className={cn('w-full pl-10', errors.defaultCommissionPercent && 'border-danger/30')}
                  />
                </div>
              </InputWrapper>

              <InputWrapper
                label={t('inmobiliaria.config.profile.lateFeePercent')}
                error={errors.defaultLateFeePercent}
              >
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={formData.defaultLateFeePercent}
                    onChange={(e) =>
                      updateField('defaultLateFeePercent', parseFloat(e.target.value) || 0)
                    }
                    className={cn('w-full pl-10', errors.defaultLateFeePercent && 'border-danger/30')}
                  />
                </div>
              </InputWrapper>

              <InputWrapper
                label={t('inmobiliaria.config.profile.paymentDueDay')}
                error={errors.paymentDueDay}
              >
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    value={formData.paymentDueDay}
                    onChange={(e) =>
                      updateField('paymentDueDay', parseInt(e.target.value) || 1)
                    }
                    className={cn('w-full pl-10', errors.paymentDueDay && 'border-danger/30')}
                  />
                </div>
              </InputWrapper>

              <InputWrapper
                label={t('inmobiliaria.config.profile.disbursementDay')}
                error={errors.disbursementDay}
              >
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    value={formData.disbursementDay}
                    onChange={(e) =>
                      updateField('disbursementDay', parseInt(e.target.value) || 15)
                    }
                    className={cn('w-full pl-10', errors.disbursementDay && 'border-danger/30')}
                  />
                </div>
              </InputWrapper>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="p-3 rounded-md bg-muted/50">
              <div className="text-muted-foreground text-xs">{t('inmobiliaria.config.profile.commission')}</div>
              <div className="text-foreground font-semibold">
                {agency.defaultCommissionPercent ?? '—'}%
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted/50">
              <div className="text-muted-foreground text-xs">{t('inmobiliaria.config.profile.lateFee')}</div>
              <div className="text-foreground font-semibold">
                {agency.defaultLateFeePercent ?? '—'}%
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted/50">
              <div className="text-muted-foreground text-xs">{t('inmobiliaria.config.profile.paymentDay')}</div>
              <div className="text-foreground font-semibold">
                {agency.paymentDueDay ?? '—'}
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted/50">
              <div className="text-muted-foreground text-xs">{t('inmobiliaria.config.profile.disbursementDayLabel')}</div>
              <div className="text-foreground font-semibold">
                {agency.disbursementDay ?? '—'}
              </div>
            </div>
          </div>
        )}

        {/* Reminders — day-offset arrays saved through the same PUT
            (UpdateAgencyDto: number[], 0..30 each; empty array = disabled). */}
        <div className="space-y-2 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{t('inmobiliaria.config.profile.reminders')}</span>
          </div>
          {isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputWrapper
                label={t('inmobiliaria.config.profile.daysBeforeDue')}
                hint={t('inmobiliaria.config.profile.remindersEmptyHint')}
              >
                <div className="flex flex-wrap gap-2">
                  {reminderDayOptions(formData.reminderDaysBefore).map((day) => (
                    <Chip
                      key={`before-${day}`}
                      type="button"
                      data-testid={`reminder-before-${day}`}
                      selected={formData.reminderDaysBefore.includes(day)}
                      onClick={() => toggleReminderDay('reminderDaysBefore', day)}
                    >
                      {day}d
                    </Chip>
                  ))}
                </div>
              </InputWrapper>

              <InputWrapper
                label={t('inmobiliaria.config.profile.daysAfterDue')}
                hint={t('inmobiliaria.config.profile.remindersEmptyHint')}
              >
                <div className="flex flex-wrap gap-2">
                  {reminderDayOptions(formData.reminderDaysAfter).map((day) => (
                    <Chip
                      key={`after-${day}`}
                      type="button"
                      data-testid={`reminder-after-${day}`}
                      selected={formData.reminderDaysAfter.includes(day)}
                      onClick={() => toggleReminderDay('reminderDaysAfter', day)}
                    >
                      {day}d
                    </Chip>
                  ))}
                </div>
              </InputWrapper>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t('inmobiliaria.config.profile.remindersBefore')}:</span>
                <span className="ml-2 text-foreground">
                  {reminderDaysBefore.length > 0 ? reminderDaysBefore.map((d) => `${d}d`).join(', ') : '—'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('inmobiliaria.config.profile.remindersAfter')}:</span>
                <span className="ml-2 text-foreground">
                  {reminderDaysAfter.length > 0 ? reminderDaysAfter.map((d) => `${d}d`).join(', ') : '—'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {isEditing && (
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            hideArrow
            onClick={handleCancel}
            disabled={isSaving}
          >
            {t('inmobiliaria.common.cancel')}
          </Button>
          <Button
            type="button"
            hideArrow
            onClick={handleSave}
            disabled={isSaving || !canEdit}
            isLoading={isSaving}
          >
            {isSaving ? (
              t('inmobiliaria.common.saving')
            ) : (
              <>
                <Check className="w-4 h-4" />
                {t('inmobiliaria.config.profile.saveChanges')}
              </>
            )}
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export default ConfigPerfilAgencia;
