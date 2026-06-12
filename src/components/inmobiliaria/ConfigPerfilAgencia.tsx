'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Buildings,
  Envelope,
  Phone,
  MapPin,
  Globe,
  IdentificationCard,
  User,
  Certificate,
  CaretDown,
  Percent,
  Calendar,
  Bell,
  Check,
  SpinnerGap,
  Warning,
  Info,
  X,
  Plus,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import type {
  InmobiliariaConfigExtended,
  AgencyContactInfo,
  AgencyLegalInfo,
  AgencyDefaults,
} from '@/lib/types/inmobiliaria';
import { COLOMBIAN_DEPARTMENTS } from '@/lib/types/inmobiliaria';

interface ConfigPerfilAgenciaProps {
  config: InmobiliariaConfigExtended;
  onSave?: (config: InmobiliariaConfigExtended) => void;
  isLoading?: boolean;
}

// Day options for reminder chips
const REMINDER_DAYS_OPTIONS = [1, 2, 3, 5, 7, 10, 15, 30];

/**
 * ConfigPerfilAgencia - Form for editing agency profile information
 * Includes profile, contact, legal, and default settings sections
 */
export function ConfigPerfilAgencia({
  config,
  onSave,
  isLoading = false,
}: ConfigPerfilAgenciaProps) {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Form state
  const [formData, setFormData] = useState({
    name: config.name,
    contact: { ...config.contact },
    legal: { ...config.legal },
    defaults: { ...config.defaults },
  });

  // Defensive: the read-only view must not crash when the loaded config is
  // partial (the backend may omit contact/legal/defaults). Fall back to {} so
  // missing fields render blank instead of throwing on `.phone` etc.
  const contact = config.contact ?? ({} as InmobiliariaConfigExtended['contact']);
  const legal = config.legal ?? ({} as InmobiliariaConfigExtended['legal']);
  const defaults = config.defaults ?? ({} as InmobiliariaConfigExtended['defaults']);

  const updateContact = useCallback(
    (field: keyof AgencyContactInfo, value: string) => {
      setFormData((prev) => ({
        ...prev,
        contact: { ...prev.contact, [field]: value },
      }));
      setTouched((prev) => ({ ...prev, [`contact.${field}`]: true }));
      if (errors[`contact.${field}`]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[`contact.${field}`];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const updateLegal = useCallback(
    (field: keyof AgencyLegalInfo, value: string) => {
      setFormData((prev) => ({
        ...prev,
        legal: { ...prev.legal, [field]: value },
      }));
      setTouched((prev) => ({ ...prev, [`legal.${field}`]: true }));
      if (errors[`legal.${field}`]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[`legal.${field}`];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const updateDefaults = useCallback(
    (field: keyof AgencyDefaults, value: number | number[]) => {
      setFormData((prev) => ({
        ...prev,
        defaults: { ...prev.defaults, [field]: value },
      }));
    },
    []
  );

  const toggleReminderDay = (
    field: 'reminderDaysBefore' | 'reminderDaysAfter',
    day: number
  ) => {
    const current = formData.defaults[field];
    const newDays = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    updateDefaults(field, newDays);
  };

  // NIT format validation: XXX.XXX.XXX-X
  const validateNIT = (nit: string): boolean => {
    const nitPattern = /^\d{3}\.\d{3}\.\d{3}-\d$/;
    // Also accept without dots: 9 digits + dash + 1 digit
    const nitPatternAlt = /^\d{9}-\d$/;
    return nitPattern.test(nit) || nitPatternAlt.test(nit);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = t('inmobiliaria.config.profile.validation.nameRequired');
    }

    // Contact validation
    if (!formData.contact.phone.trim()) {
      newErrors['contact.phone'] = t('inmobiliaria.config.profile.validation.phoneRequired');
    }
    if (!formData.contact.email.trim()) {
      newErrors['contact.email'] = t('inmobiliaria.config.profile.validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact.email)) {
      newErrors['contact.email'] = t('inmobiliaria.config.profile.validation.emailInvalid');
    }
    if (!formData.contact.address.trim()) {
      newErrors['contact.address'] = t('inmobiliaria.config.profile.validation.addressRequired');
    }
    if (!formData.contact.city.trim()) {
      newErrors['contact.city'] = t('inmobiliaria.config.profile.validation.cityRequired');
    }
    if (!formData.contact.department) {
      newErrors['contact.department'] = t('inmobiliaria.config.profile.validation.departmentRequired');
    }

    // Legal validation
    if (!formData.legal.nit.trim()) {
      newErrors['legal.nit'] = t('inmobiliaria.config.profile.validation.nitRequired');
    } else if (!validateNIT(formData.legal.nit)) {
      newErrors['legal.nit'] = t('inmobiliaria.config.profile.validation.nitInvalid');
    }
    if (!formData.legal.razonSocial.trim()) {
      newErrors['legal.razonSocial'] = t('inmobiliaria.config.profile.validation.razonSocialRequired');
    }
    if (!formData.legal.representanteLegal.trim()) {
      newErrors['legal.representanteLegal'] =
        t('inmobiliaria.config.profile.validation.representanteRequired');
    }
    if (!formData.legal.representanteCedula.trim()) {
      newErrors['legal.representanteCedula'] =
        t('inmobiliaria.config.profile.validation.cedulaRequired');
    }

    // Defaults validation
    if (
      formData.defaults.defaultCommissionPercent < 0 ||
      formData.defaults.defaultCommissionPercent > 100
    ) {
      newErrors['defaults.commission'] = t('inmobiliaria.config.profile.validation.commissionRange');
    }
    if (
      formData.defaults.defaultAdminFeePercent < 0 ||
      formData.defaults.defaultAdminFeePercent > 100
    ) {
      newErrors['defaults.adminFee'] =
        t('inmobiliaria.config.profile.validation.adminFeeRange');
    }
    if (
      formData.defaults.paymentDueDay < 1 ||
      formData.defaults.paymentDueDay > 28
    ) {
      newErrors['defaults.paymentDueDay'] = t('inmobiliaria.config.profile.validation.dayRange');
    }
    if (
      formData.defaults.disbursementDay < 1 ||
      formData.defaults.disbursementDay > 28
    ) {
      newErrors['defaults.disbursementDay'] = t('inmobiliaria.config.profile.validation.dayRange');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error(t('inmobiliaria.config.profile.validation.fixErrors'));
      return;
    }

    setIsSaving(true);
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      const updatedConfig: InmobiliariaConfigExtended = {
        ...config,
        name: formData.name,
        contact: formData.contact,
        legal: formData.legal,
        defaults: formData.defaults,
        updatedAt: new Date().toISOString(),
      };

      // Save to localStorage for demo
      localStorage.setItem(
        'inmobiliaria-config',
        JSON.stringify(updatedConfig)
      );

      onSave?.(updatedConfig);
      setIsEditing(false);
      toast.success(t('inmobiliaria.config.toasts.configSaved'));
    } catch (err) {
      toast.error(t('inmobiliaria.config.profile.validation.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: config.name,
      contact: { ...config.contact },
      legal: { ...config.legal },
      defaults: { ...config.defaults },
    });
    setErrors({});
    setTouched({});
    setIsEditing(false);
  };

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
        {required && <span className="text-[#C4503B] ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-[#C4503B] flex items-center gap-1">
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
    color = 'text-[#1A40FF]',
  }: {
    icon: React.ElementType;
    title: string;
    color?: string;
  }) => (
    <div className="flex items-center gap-2 text-foreground">
      <Icon className={cn('w-5 h-5', color)} />
      <h3 className="font-semibold">{title}</h3>
    </div>
  );

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{config.name}</h2>
          <p className="text-sm text-muted-foreground">
            {t('inmobiliaria.config.profile.subtitle')}
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 rounded-xl bg-[#1A40FF] hover:opacity-90 text-white text-sm font-medium transition-colors"
          >
            {t('inmobiliaria.common.edit')}
          </button>
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
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, name: e.target.value }));
                  setTouched((prev) => ({ ...prev, name: true }));
                }}
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all',
                  touched.name && errors.name
                    ? 'border-[#C4503B]/30'
                    : 'border-border'
                )}
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
          color="text-[#2C7A53]"
        />

        {isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputWrapper
              label={t('inmobiliaria.config.profile.mainPhone')}
              required
              error={touched['contact.phone'] ? errors['contact.phone'] : undefined}
            >
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="tel"
                  value={formData.contact.phone}
                  onChange={(e) => updateContact('phone', e.target.value)}
                  placeholder="+57 601 345 6789"
                  className={cn(
                    'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all',
                    touched['contact.phone'] && errors['contact.phone']
                      ? 'border-[#C4503B]/30'
                      : 'border-border'
                  )}
                />
              </div>
            </InputWrapper>

            <InputWrapper label={t('inmobiliaria.config.profile.alternatePhone')} hint={t('common.optional')}>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="tel"
                  value={formData.contact.alternatePhone || ''}
                  onChange={(e) => updateContact('alternatePhone', e.target.value)}
                  placeholder="+57 601 000 0000"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all"
                />
              </div>
            </InputWrapper>

            <InputWrapper
              label={t('inmobiliaria.config.profile.mainEmail')}
              required
              error={touched['contact.email'] ? errors['contact.email'] : undefined}
            >
              <div className="relative">
                <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={formData.contact.email}
                  onChange={(e) => updateContact('email', e.target.value)}
                  placeholder="contacto@agencia.co"
                  className={cn(
                    'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all',
                    touched['contact.email'] && errors['contact.email']
                      ? 'border-[#C4503B]/30'
                      : 'border-border'
                  )}
                />
              </div>
            </InputWrapper>

            <InputWrapper label={t('inmobiliaria.config.profile.supportEmail')} hint={t('common.optional')}>
              <div className="relative">
                <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={formData.contact.supportEmail || ''}
                  onChange={(e) => updateContact('supportEmail', e.target.value)}
                  placeholder="soporte@agencia.co"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all"
                />
              </div>
            </InputWrapper>

            <InputWrapper label="WhatsApp" hint={t('common.optional')}>
              <div className="relative">
                <WhatsappLogo className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="tel"
                  value={formData.contact.whatsapp || ''}
                  onChange={(e) => updateContact('whatsapp', e.target.value)}
                  placeholder="+57 310 555 1234"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all"
                />
              </div>
            </InputWrapper>

            <InputWrapper label={t('inmobiliaria.config.profile.website')} hint={t('common.optional')}>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="url"
                  value={formData.contact.website || ''}
                  onChange={(e) => updateContact('website', e.target.value)}
                  placeholder="https://agencia.co"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all"
                />
              </div>
            </InputWrapper>

            <div className="sm:col-span-2">
              <InputWrapper
                label={t('inmobiliaria.config.profile.address')}
                required
                error={touched['contact.address'] ? errors['contact.address'] : undefined}
              >
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <textarea
                    value={formData.contact.address}
                    onChange={(e) => updateContact('address', e.target.value)}
                    placeholder="Cra 11 #82-76, Oficina 501"
                    rows={2}
                    className={cn(
                      'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all resize-none',
                      touched['contact.address'] && errors['contact.address']
                        ? 'border-[#C4503B]/30'
                        : 'border-border'
                    )}
                  />
                </div>
              </InputWrapper>
            </div>

            <InputWrapper
              label={t('inmobiliaria.config.profile.city')}
              required
              error={touched['contact.city'] ? errors['contact.city'] : undefined}
            >
              <input
                type="text"
                value={formData.contact.city}
                onChange={(e) => updateContact('city', e.target.value)}
                placeholder="Bogota"
                className={cn(
                  'w-full px-4 py-2.5 rounded-xl border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all',
                  touched['contact.city'] && errors['contact.city']
                    ? 'border-[#C4503B]/30'
                    : 'border-border'
                )}
              />
            </InputWrapper>

            <InputWrapper
              label={t('inmobiliaria.config.profile.department')}
              required
              error={touched['contact.department'] ? errors['contact.department'] : undefined}
            >
              <div className="relative">
                <select
                  value={formData.contact.department}
                  onChange={(e) => updateContact('department', e.target.value)}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-xl border bg-background text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all',
                    touched['contact.department'] && errors['contact.department']
                      ? 'border-[#C4503B]/30'
                      : 'border-border'
                  )}
                >
                  <option value="">{t('inmobiliaria.config.profile.selectPlaceholder')}</option>
                  {COLOMBIAN_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                <CaretDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </InputWrapper>

            <InputWrapper label={t('inmobiliaria.config.profile.postalCode')} hint={t('common.optional')}>
              <input
                type="text"
                value={formData.contact.postalCode || ''}
                onChange={(e) => updateContact('postalCode', e.target.value)}
                placeholder="110221"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all"
              />
            </InputWrapper>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t('inmobiliaria.config.profile.phone')}:</span>
              <span className="ml-2 text-foreground">{contact.phone}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('inmobiliaria.config.profile.email')}:</span>
              <span className="ml-2 text-foreground">{contact.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground">WhatsApp:</span>
              <span className="ml-2 text-foreground">{contact.whatsapp || '-'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('inmobiliaria.config.profile.website')}:</span>
              <span className="ml-2 text-foreground">{contact.website || '-'}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">{t('inmobiliaria.config.profile.address')}:</span>
              <span className="ml-2 text-foreground">
                {[contact.address, contact.city, contact.department].filter(Boolean).join(', ') || '—'}
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
          color="text-neutral-600 dark:text-neutral-300"
        />

        {isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputWrapper
              label={t('inmobiliaria.config.profile.nit')}
              required
              error={touched['legal.nit'] ? errors['legal.nit'] : undefined}
              hint={t('inmobiliaria.config.profile.nitFormat')}
            >
              <div className="relative">
                <IdentificationCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={formData.legal.nit}
                  onChange={(e) => updateLegal('nit', e.target.value)}
                  placeholder="901.234.567-8"
                  className={cn(
                    'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all',
                    touched['legal.nit'] && errors['legal.nit']
                      ? 'border-[#C4503B]/30'
                      : 'border-border'
                  )}
                />
              </div>
            </InputWrapper>

            <InputWrapper
              label={t('inmobiliaria.config.profile.legalName')}
              required
              error={touched['legal.razonSocial'] ? errors['legal.razonSocial'] : undefined}
            >
              <input
                type="text"
                value={formData.legal.razonSocial}
                onChange={(e) => updateLegal('razonSocial', e.target.value)}
                placeholder="Nombre S.A.S."
                className={cn(
                  'w-full px-4 py-2.5 rounded-xl border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all',
                  touched['legal.razonSocial'] && errors['legal.razonSocial']
                    ? 'border-[#C4503B]/30'
                    : 'border-border'
                )}
              />
            </InputWrapper>

            <InputWrapper
              label={t('inmobiliaria.config.profile.legalRep')}
              required
              error={touched['legal.representanteLegal'] ? errors['legal.representanteLegal'] : undefined}
            >
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={formData.legal.representanteLegal}
                  onChange={(e) => updateLegal('representanteLegal', e.target.value)}
                  placeholder="Juan Perez Garcia"
                  className={cn(
                    'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all',
                    touched['legal.representanteLegal'] && errors['legal.representanteLegal']
                      ? 'border-[#C4503B]/30'
                      : 'border-border'
                  )}
                />
              </div>
            </InputWrapper>

            <InputWrapper
              label={t('inmobiliaria.config.profile.legalRepId')}
              required
              error={touched['legal.representanteCedula'] ? errors['legal.representanteCedula'] : undefined}
            >
              <div className="relative">
                <IdentificationCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={formData.legal.representanteCedula}
                  onChange={(e) => updateLegal('representanteCedula', e.target.value)}
                  placeholder="80.123.456"
                  className={cn(
                    'w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all',
                    touched['legal.representanteCedula'] && errors['legal.representanteCedula']
                      ? 'border-[#C4503B]/30'
                      : 'border-border'
                  )}
                />
              </div>
            </InputWrapper>

            <InputWrapper label={t('inmobiliaria.config.profile.realEstateRegistration')} hint={t('common.optional')}>
              <input
                type="text"
                value={formData.legal.matriculaInmobiliaria || ''}
                onChange={(e) => updateLegal('matriculaInmobiliaria', e.target.value)}
                placeholder="INM-2024-001234"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all"
              />
            </InputWrapper>

            <InputWrapper label={t('inmobiliaria.config.profile.chamberRegistration')} hint={t('common.optional')}>
              <input
                type="text"
                value={formData.legal.registroCamara || ''}
                onChange={(e) => updateLegal('registroCamara', e.target.value)}
                placeholder="S0012345"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all"
              />
            </InputWrapper>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t('inmobiliaria.config.profile.nit')}:</span>
              <span className="ml-2 text-foreground font-mono">{legal.nit}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('inmobiliaria.config.profile.legalName')}:</span>
              <span className="ml-2 text-foreground">{legal.razonSocial}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('inmobiliaria.config.profile.legalRep')}:</span>
              <span className="ml-2 text-foreground">{legal.representanteLegal}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('inmobiliaria.config.profile.legalRepId')}:</span>
              <span className="ml-2 text-foreground font-mono">{legal.representanteCedula}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('inmobiliaria.config.profile.realEstateRegistration')}:</span>
              <span className="ml-2 text-foreground">{legal.matriculaInmobiliaria || '-'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('inmobiliaria.config.profile.chamberRegistrationShort')}:</span>
              <span className="ml-2 text-foreground">{legal.registroCamara || '-'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Default Settings */}
      <div className="space-y-4 p-5 rounded-xl bg-card border border-border">
        <SectionHeader
          icon={Percent}
          title={t('inmobiliaria.config.profile.defaultSettings')}
          color="text-[#B7791F]"
        />

        {isEditing ? (
          <>
            <div className="p-4 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 border border-[#1A40FF]/30 dark:border-[#1A40FF]/40">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-[#1A40FF] shrink-0 mt-0.5" />
                <p className="text-sm text-[#1A40FF] dark:text-[#5570FF]">
                  {t('inmobiliaria.config.profile.defaultSettingsHint')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InputWrapper
                label={t('inmobiliaria.config.profile.commissionPercent')}
                required
                error={errors['defaults.commission']}
              >
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={formData.defaults.defaultCommissionPercent}
                    onChange={(e) =>
                      updateDefaults('defaultCommissionPercent', parseFloat(e.target.value) || 0)
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all"
                  />
                </div>
              </InputWrapper>

              <InputWrapper
                label={t('inmobiliaria.config.profile.adminFeePercent')}
                required
                error={errors['defaults.adminFee']}
              >
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={formData.defaults.defaultAdminFeePercent}
                    onChange={(e) =>
                      updateDefaults('defaultAdminFeePercent', parseFloat(e.target.value) || 0)
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all"
                  />
                </div>
              </InputWrapper>

              <InputWrapper
                label={t('inmobiliaria.config.profile.lateFeePercent')}
                required
              >
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={formData.defaults.defaultLateFeePercent}
                    onChange={(e) =>
                      updateDefaults('defaultLateFeePercent', parseFloat(e.target.value) || 0)
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all"
                  />
                </div>
              </InputWrapper>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InputWrapper
                label={t('inmobiliaria.config.profile.paymentDueDay')}
                required
                error={errors['defaults.paymentDueDay']}
              >
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={formData.defaults.paymentDueDay}
                    onChange={(e) =>
                      updateDefaults('paymentDueDay', parseInt(e.target.value) || 1)
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all"
                  />
                </div>
              </InputWrapper>

              <InputWrapper
                label={t('inmobiliaria.config.profile.disbursementDay')}
                required
                error={errors['defaults.disbursementDay']}
              >
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={formData.defaults.disbursementDay}
                    onChange={(e) =>
                      updateDefaults('disbursementDay', parseInt(e.target.value) || 15)
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all"
                  />
                </div>
              </InputWrapper>

              <InputWrapper
                label={t('inmobiliaria.config.profile.gracePeriodDays')}
                required
              >
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={formData.defaults.gracePeriodDays}
                  onChange={(e) =>
                    updateDefaults('gracePeriodDays', parseInt(e.target.value) || 0)
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all"
                />
              </InputWrapper>
            </div>

            {/* Reminder Days */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{t('inmobiliaria.config.profile.reminders')}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputWrapper label={t('inmobiliaria.config.profile.daysBeforeDue')}>
                  <div className="flex flex-wrap gap-2">
                    {REMINDER_DAYS_OPTIONS.map((day) => (
                      <button
                        key={`before-${day}`}
                        type="button"
                        onClick={() => toggleReminderDay('reminderDaysBefore', day)}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                          formData.defaults.reminderDaysBefore.includes(day)
                            ? 'bg-[#EEF1FF] text-[#1A40FF] dark:bg-[#1A40FF]/15 dark:text-[#5570FF]'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        {day}d
                      </button>
                    ))}
                  </div>
                </InputWrapper>

                <InputWrapper label={t('inmobiliaria.config.profile.daysAfterDue')}>
                  <div className="flex flex-wrap gap-2">
                    {REMINDER_DAYS_OPTIONS.map((day) => (
                      <button
                        key={`after-${day}`}
                        type="button"
                        onClick={() => toggleReminderDay('reminderDaysAfter', day)}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                          formData.defaults.reminderDaysAfter.includes(day)
                            ? 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F]'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        {day}d
                      </button>
                    ))}
                  </div>
                </InputWrapper>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div className="p-3 rounded-md bg-muted/50">
                <div className="text-muted-foreground text-xs">{t('inmobiliaria.config.profile.commission')}</div>
                <div className="text-foreground font-semibold">
                  {defaults.defaultCommissionPercent}%
                </div>
              </div>
              <div className="p-3 rounded-md bg-muted/50">
                <div className="text-muted-foreground text-xs">{t('inmobiliaria.config.profile.adminFee')}</div>
                <div className="text-foreground font-semibold">
                  {defaults.defaultAdminFeePercent}%
                </div>
              </div>
              <div className="p-3 rounded-md bg-muted/50">
                <div className="text-muted-foreground text-xs">{t('inmobiliaria.config.profile.lateFee')}</div>
                <div className="text-foreground font-semibold">
                  {defaults.defaultLateFeePercent}%
                </div>
              </div>
              <div className="p-3 rounded-md bg-muted/50">
                <div className="text-muted-foreground text-xs">{t('inmobiliaria.config.profile.paymentDay')}</div>
                <div className="text-foreground font-semibold">
                  {defaults.paymentDueDay}
                </div>
              </div>
              <div className="p-3 rounded-md bg-muted/50">
                <div className="text-muted-foreground text-xs">{t('inmobiliaria.config.profile.disbursementDayLabel')}</div>
                <div className="text-foreground font-semibold">
                  {defaults.disbursementDay}
                </div>
              </div>
              <div className="p-3 rounded-md bg-muted/50">
                <div className="text-muted-foreground text-xs">{t('inmobiliaria.config.profile.gracePeriodDays')}</div>
                <div className="text-foreground font-semibold">
                  {defaults.gracePeriodDays}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t('inmobiliaria.config.profile.remindersBefore')}:</span>
                <span className="ml-2 text-foreground">
                  {(defaults.reminderDaysBefore ?? []).map((d) => `${d}d`).join(', ')}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('inmobiliaria.config.profile.remindersAfter')}:</span>
                <span className="ml-2 text-foreground">
                  {(defaults.reminderDaysAfter ?? []).map((d) => `${d}d`).join(', ')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {isEditing && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            {t('inmobiliaria.common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A40FF] hover:opacity-90 text-white font-medium transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <SpinnerGap className="w-4 h-4 animate-spin" />
                {t('inmobiliaria.common.saving')}
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {t('inmobiliaria.config.profile.saveChanges')}
              </>
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default ConfigPerfilAgencia;
