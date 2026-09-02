'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bank,
  Buildings,
  Receipt,
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
import { Chip, CurrencyInput } from '@leasefy/cadence';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { formatCurrency } from '@/lib/format';
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
  // Cobros y mora (Agency.motorDeCobrosV2 / Agency.diasDePlazo)
  motorDeCobrosV2: boolean;
  diasDePlazo: number;
  /** Días de mora con saldo a partir de los cuales un cobro pasa a siniestro. */
  diasParaSiniestro: number;
  /** Días de mora a partir de los cuales hay que reportar el caso a la aseguradora (antes del siniestro). */
  diasParaAvisoAseguradora: number;
  // Controles de la dispersión (Agency.dispersionExigePin / dispersionMontoDobleAprobacion)
  dispersionExigePin: boolean;
  /** COP entero; `null` = nunca por monto. */
  dispersionMontoDobleAprobacion: number | null;
  // Tarifas tributarias (Agency.ivaPorcentaje … baseMinimaRetefuenteCop)
  ivaPorcentaje: number;
  retefuenteArrendamientoPorcentaje: number;
  retefuenteComisionPorcentaje: number;
  reteicaPorMil: number | null;
  reteivaPorcentaje: number;
  baseMinimaRetefuenteCop: number | null;
  /**
   * Techo legal del interés de mora, como tasa EFECTIVA ANUAL. `null` = sin
   * validar. Lo mantiene al día la inmobiliaria: la usura la certifica la
   * Superfinanciera mes a mes.
   */
  topeInteresMoraEaPorcentaje: number | null;
}

/** Techo de días de plazo — el mismo `@Max(60)` del DTO del back. */
const MAX_DIAS_DE_PLAZO = 60;
/** Rango del siniestro — `@Min(1) @Max(365)` en el DTO del back; 30 es el default del esquema. */
const MIN_DIAS_PARA_SINIESTRO = 1;
const MAX_DIAS_PARA_SINIESTRO = 365;
const DIAS_PARA_SINIESTRO_POR_DEFECTO = 30;
/** Portofino reporta a la aseguradora al día 8 de mora. */
const DIAS_PARA_AVISO_ASEGURADORA_POR_DEFECTO = 8;

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

/**
 * Las tarifas son `Decimal` en Prisma y viajan como TEXTO (`"3.5"`). Sin esta
 * conversión el formulario las rechazaba («Un porcentaje entre 0 y 100») y
 * nadie podía guardar la configuración — visto en QA. `null`/vacío = sin
 * configurar; un texto que no es número se trata como ausente.
 */
function decimalANumero(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

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
    motorDeCobrosV2: agency.motorDeCobrosV2 ?? false,
    diasDePlazo: agency.diasDePlazo ?? 0,
    diasParaSiniestro: agency.diasParaSiniestro ?? DIAS_PARA_SINIESTRO_POR_DEFECTO,
    diasParaAvisoAseguradora:
      agency.diasParaAvisoAseguradora ?? DIAS_PARA_AVISO_ASEGURADORA_POR_DEFECTO,
    dispersionExigePin: agency.dispersionExigePin ?? false,
    dispersionMontoDobleAprobacion: agency.dispersionMontoDobleAprobacion ?? null,
    ivaPorcentaje: decimalANumero(agency.ivaPorcentaje) ?? TARIFAS_POR_DEFECTO.ivaPorcentaje,
    retefuenteArrendamientoPorcentaje:
      decimalANumero(agency.retefuenteArrendamientoPorcentaje) ??
      TARIFAS_POR_DEFECTO.retefuenteArrendamientoPorcentaje,
    retefuenteComisionPorcentaje:
      decimalANumero(agency.retefuenteComisionPorcentaje) ?? TARIFAS_POR_DEFECTO.retefuenteComisionPorcentaje,
    reteicaPorMil: decimalANumero(agency.reteicaPorMil),
    reteivaPorcentaje: decimalANumero(agency.reteivaPorcentaje) ?? TARIFAS_POR_DEFECTO.reteivaPorcentaje,
    baseMinimaRetefuenteCop: agency.baseMinimaRetefuenteCop ?? null,
    // 🔴 `decimalANumero`: un Decimal de Prisma viaja como TEXTO en el JSON, y
    // un `"28.5"` acá rompe la validación numérica sin decir por qué.
    topeInteresMoraEaPorcentaje: decimalANumero(agency.topeInteresMoraEaPorcentaje) ?? null,
  };
}

/**
 * Los defaults del esquema del back (`Agency.iva_porcentaje`, …). Son las
 * tarifas generales de Colombia al escribir esto, NO una decisión del
 * sistema: la pantalla las muestra como «a confirmar con el contador».
 */
const TARIFAS_POR_DEFECTO = {
  ivaPorcentaje: 19,
  retefuenteArrendamientoPorcentaje: 3.5,
  retefuenteComisionPorcentaje: 11,
  reteivaPorcentaje: 15,
} as const;

const CAMPOS_DE_PORCENTAJE = [
  'ivaPorcentaje',
  'retefuenteArrendamientoPorcentaje',
  'retefuenteComisionPorcentaje',
  'reteivaPorcentaje',
] as const;

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
    (field: keyof PerfilFormState, value: string | number | number[] | boolean | null) => {
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
  // El dígito de verificación es OPCIONAL: una cédula no lo tiene y muchas
  // inmobiliarias escriben el NIT sin él. Exigirlo bloqueaba guardar TODA la
  // configuración de una agencia con NIT «1004997858» (visto en QA).
  const validateNIT = (nit: string): boolean => {
    const normalized = nit.replace(/[.\s]/g, '');
    return /^\d{8,11}(-\d)?$/.test(normalized);
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
    if (
      !Number.isInteger(formData.diasDePlazo) ||
      formData.diasDePlazo < 0 ||
      formData.diasDePlazo > MAX_DIAS_DE_PLAZO
    ) {
      newErrors.diasDePlazo = `Entre 0 y ${MAX_DIAS_DE_PLAZO} días`;
    }
    if (
      !Number.isInteger(formData.diasParaSiniestro) ||
      formData.diasParaSiniestro < MIN_DIAS_PARA_SINIESTRO ||
      formData.diasParaSiniestro > MAX_DIAS_PARA_SINIESTRO
    ) {
      newErrors.diasParaSiniestro = `Entre ${MIN_DIAS_PARA_SINIESTRO} y ${MAX_DIAS_PARA_SINIESTRO} días`;
    }
    if (
      !Number.isInteger(formData.diasParaAvisoAseguradora) ||
      formData.diasParaAvisoAseguradora < MIN_DIAS_PARA_SINIESTRO ||
      formData.diasParaAvisoAseguradora > MAX_DIAS_PARA_SINIESTRO
    ) {
      newErrors.diasParaAvisoAseguradora = `Entre ${MIN_DIAS_PARA_SINIESTRO} y ${MAX_DIAS_PARA_SINIESTRO} días`;
    } else if (formData.diasParaAvisoAseguradora >= formData.diasParaSiniestro) {
      // El aviso es ANTES del siniestro; después no avisa nada.
      newErrors.diasParaAvisoAseguradora = 'Tiene que ser antes del siniestro';
    }
    const umbral = formData.dispersionMontoDobleAprobacion;
    if (umbral !== null && (!Number.isInteger(umbral) || umbral < 0)) {
      newErrors.dispersionMontoDobleAprobacion = 'Un monto entero en pesos, o vacío';
    }
    for (const campo of CAMPOS_DE_PORCENTAJE) {
      const v = formData[campo];
      if (!Number.isFinite(v) || v < 0 || v > 100) {
        newErrors[campo] = 'Un porcentaje entre 0 y 100';
      }
    }
    const porMil = formData.reteicaPorMil;
    if (porMil !== null && (!Number.isFinite(porMil) || porMil < 0 || porMil > 100)) {
      newErrors.reteicaPorMil = 'Por mil entre 0 y 100, o vacío';
    }
    const baseMinima = formData.baseMinimaRetefuenteCop;
    if (baseMinima !== null && (!Number.isInteger(baseMinima) || baseMinima < 0)) {
      newErrors.baseMinimaRetefuenteCop = 'Un monto entero en pesos, o vacío';
    }
    const tope = formData.topeInteresMoraEaPorcentaje;
    if (tope !== null && (!Number.isFinite(tope) || tope <= 0 || tope > 200)) {
      newErrors.topeInteresMoraEaPorcentaje = 'Un porcentaje anual mayor que 0, o vacío';
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
      'diasDePlazo',
      'diasParaSiniestro',
      'diasParaAvisoAseguradora',
    ] as const;
    for (const field of numberFields) {
      if (formData[field] !== original[field]) {
        payload[field] = formData[field];
      }
    }

    // Switches: apagar (`false`) también es un cambio que hay que mandar.
    const booleanFields = ['motorDeCobrosV2', 'dispersionExigePin'] as const;
    for (const field of booleanFields) {
      if (formData[field] !== original[field]) {
        payload[field] = formData[field];
      }
    }

    // `null` es un valor («nunca por monto»), no una ausencia: viaja tal cual.
    if (formData.dispersionMontoDobleAprobacion !== original.dispersionMontoDobleAprobacion) {
      payload.dispersionMontoDobleAprobacion = formData.dispersionMontoDobleAprobacion;
    }

    // Tarifas: decimales tal cual (3.5 es 3.5, no 35); null = no configurada.
    for (const campo of CAMPOS_DE_PORCENTAJE) {
      if (formData[campo] !== original[campo]) payload[campo] = formData[campo];
    }
    if (formData.reteicaPorMil !== original.reteicaPorMil) {
      payload.reteicaPorMil = formData.reteicaPorMil;
    }
    if (formData.baseMinimaRetefuenteCop !== original.baseMinimaRetefuenteCop) {
      payload.baseMinimaRetefuenteCop = formData.baseMinimaRetefuenteCop;
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
                hint="% mensual fijo (sólo si el motor de cobros con reglas de mora está apagado)"
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
              <div className="text-[11px] text-muted-foreground">% mensual fijo · sólo con el motor apagado</div>
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

      {/* Cobros y mora — Agency.motorDeCobrosV2 / Agency.diasDePlazo.
          Prender el motor cambia lo que se le cobra a un inquilino real: por
          eso es un switch explícito acá y no un default. */}
      <div className="space-y-4 p-5 rounded-xl bg-card border border-border">
        <SectionHeader icon={Receipt} title="Cobros y mora" />

        {isEditing ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface-muted p-4">
              <div className="space-y-1">
                <label htmlFor="motor-de-cobros" className="block text-sm font-medium text-foreground">
                  Motor de cobros con reglas de mora
                </label>
                <p className="text-xs text-muted-foreground">
                  Apagado: se cobra el % mensual fijo de «{t('inmobiliaria.config.profile.defaultSettings')}».
                  Prendido: mandan las reglas de mora (interés diario, gasto administrativo, topes) y los días de plazo.
                </p>
                <Link
                  href="/panel/inmobiliaria/cobros/reglas-de-mora"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Ver reglas de mora
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <Switch
                id="motor-de-cobros"
                data-testid="motor-de-cobros"
                checked={formData.motorDeCobrosV2}
                onCheckedChange={(v) => updateField('motorDeCobrosV2', v)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputWrapper
                label="Días de plazo antes de la mora"
                error={errors.diasDePlazo}
                hint="Días después de la fecha de cobro en los que todavía no corre mora. Un contrato puede tener los suyos."
              >
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={MAX_DIAS_DE_PLAZO}
                    step={1}
                    value={formData.diasDePlazo}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      updateField('diasDePlazo', Number.isNaN(n) ? 0 : n);
                    }}
                    data-testid="dias-de-plazo"
                    className={cn('w-full pl-10 tabular-nums', errors.diasDePlazo && 'border-danger/30')}
                  />
                </div>
              </InputWrapper>

              <InputWrapper
                label="Días de mora para siniestro"
                error={errors.diasParaSiniestro}
                hint="Días de mora con saldo a partir de los cuales un cobro pasa a siniestro. Sólo aplica con el motor de cobros prendido."
              >
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={MIN_DIAS_PARA_SINIESTRO}
                    max={MAX_DIAS_PARA_SINIESTRO}
                    step={1}
                    value={formData.diasParaSiniestro}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      updateField('diasParaSiniestro', Number.isNaN(n) ? 0 : n);
                    }}
                    data-testid="dias-para-siniestro"
                    className={cn('w-full pl-10 tabular-nums', errors.diasParaSiniestro && 'border-danger/30')}
                  />
                </div>
              </InputWrapper>

              <InputWrapper
                label="Días de mora para avisar a la aseguradora"
                error={errors.diasParaAvisoAseguradora}
                hint="Antes del siniestro: a estos días de mora se avisa al equipo que hay que reportar el caso a la aseguradora del contrato."
              >
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={MIN_DIAS_PARA_SINIESTRO}
                    max={MAX_DIAS_PARA_SINIESTRO}
                    step={1}
                    value={formData.diasParaAvisoAseguradora}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      updateField('diasParaAvisoAseguradora', Number.isNaN(n) ? 0 : n);
                    }}
                    data-testid="dias-para-aviso-aseguradora"
                    className={cn('w-full pl-10 tabular-nums', errors.diasParaAvisoAseguradora && 'border-danger/30')}
                  />
                </div>
              </InputWrapper>

              {/*
               * El techo legal de la tasa de mora. La tasa la pone la
               * inmobiliaria, pero la ley le pone un máximo —la usura— que la
               * Superfinanciera certifica MES A MES: por eso se escribe acá y
               * no viene quemado en el sistema. Vacío = no se valida ninguna
               * tasa, que es como venía funcionando.
               */}
              <InputWrapper
                label="Techo legal del interés de mora (% efectivo anual)"
                error={errors.topeInteresMoraEaPorcentaje}
                hint="La usura vigente, que certifica la Superfinanciera cada mes. Ninguna regla de interés va a poder pasarse de acá. Vacío = sin validar."
              >
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  max={200}
                  placeholder="Sin validar"
                  value={formData.topeInteresMoraEaPorcentaje ?? ''}
                  onChange={(e) =>
                    updateField(
                      'topeInteresMoraEaPorcentaje',
                      e.target.value === '' ? null : Number(e.target.value),
                    )
                  }
                  data-testid="tope-interes-mora"
                  className={cn(
                    'tabular-nums',
                    errors.topeInteresMoraEaPorcentaje && 'border-danger/30',
                  )}
                />
              </InputWrapper>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded-md bg-muted/50">
              <div className="text-muted-foreground text-xs">Motor de cobros</div>
              <div className="text-foreground font-semibold">
                {agency.motorDeCobrosV2
                  ? 'Reglas de mora'
                  : `% mensual fijo (${agency.defaultLateFeePercent ?? '—'}%)`}
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted/50">
              <div className="text-muted-foreground text-xs">Días de plazo antes de la mora</div>
              <div className="text-foreground font-semibold tabular-nums">{agency.diasDePlazo ?? 0}</div>
            </div>
            <div className="p-3 rounded-md bg-muted/50">
              <div className="text-muted-foreground text-xs">Siniestro a los</div>
              <div className="text-foreground font-semibold tabular-nums">
                {agency.diasParaSiniestro ?? DIAS_PARA_SINIESTRO_POR_DEFECTO} días de mora
              </div>
              <div className="text-[11px] text-muted-foreground">
                aviso a la aseguradora a los{' '}
                {agency.diasParaAvisoAseguradora ?? DIAS_PARA_AVISO_ASEGURADORA_POR_DEFECTO} · sólo con el motor prendido
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dispersiones — Agency.dispersionExigePin / dispersionMontoDobleAprobacion.
          El código lo recibe por correo OTRA persona con permiso sobre
          dispersiones (lotes.service.ts): acá sólo se decide cuándo se pide. */}
      <div className="space-y-4 p-5 rounded-xl bg-card border border-border">
        <SectionHeader icon={Bank} title="Dispersiones" />

        {isEditing ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface-muted p-4">
              <div className="space-y-1">
                <label htmlFor="dispersion-exige-pin" className="block text-sm font-medium text-foreground">
                  Pedir código de aprobación en todos los lotes
                </label>
                <p className="text-xs text-muted-foreground">
                  Cada lote de pagos a propietarios necesita el código que le llega por correo a otra persona
                  con permiso sobre dispersiones, sin importar el monto.
                </p>
              </div>
              <Switch
                id="dispersion-exige-pin"
                data-testid="dispersion-exige-pin"
                checked={formData.dispersionExigePin}
                onCheckedChange={(v) => updateField('dispersionExigePin', v)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputWrapper
                label="Segundo aprobador desde (COP)"
                error={errors.dispersionMontoDobleAprobacion}
                hint="Un lote que sume este monto o más exige el código de otra persona. Vacío = nunca por monto."
              >
                <CurrencyInput
                  id="dispersion-monto-doble-aprobacion"
                  data-testid="dispersion-monto-doble-aprobacion"
                  value={formData.dispersionMontoDobleAprobacion ?? undefined}
                  onChange={(v) =>
                    updateField('dispersionMontoDobleAprobacion', Number.isNaN(v) ? null : v)
                  }
                  invalid={Boolean(errors.dispersionMontoDobleAprobacion)}
                />
              </InputWrapper>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-md bg-muted/50">
              <div className="text-muted-foreground text-xs">Código en todos los lotes</div>
              <div className="text-foreground font-semibold">{agency.dispersionExigePin ? 'Sí' : 'No'}</div>
            </div>
            <div className="p-3 rounded-md bg-muted/50">
              <div className="text-muted-foreground text-xs">Segundo aprobador desde</div>
              <div className="text-foreground font-semibold tabular-nums">
                {agency.dispersionMontoDobleAprobacion != null
                  ? formatCurrency(agency.dispersionMontoDobleAprobacion)
                  : 'Nunca por monto'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Impuestos y retenciones — Agency.ivaPorcentaje … baseMinimaRetefuenteCop.
          El sistema no decide impuestos: aplica estas tarifas cuando el perfil
          tributario de las partes dice que corresponde. */}
      <div className="space-y-4 p-5 rounded-xl bg-card border border-border">
        <SectionHeader icon={Percent} title="Impuestos y retenciones" />
        <p className="text-xs text-muted-foreground">
          Tarifas por defecto de Colombia: confirmalas con tu contador. La reteICA depende del municipio
          y hasta que no la configures no se practica. Se aplican sólo cuando el contrato dice quién
          retiene y si el inmueble es comercial.
        </p>

        {isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InputWrapper label="IVA (%)" error={errors.ivaPorcentaje} hint="Canon comercial, comisiones y servicios gravados.">
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                max={100}
                value={formData.ivaPorcentaje}
                onChange={(e) => updateField('ivaPorcentaje', e.target.value === '' ? NaN : Number(e.target.value))}
                data-testid="iva-porcentaje"
                className={cn('tabular-nums', errors.ivaPorcentaje && 'border-danger/30')}
              />
            </InputWrapper>
            <InputWrapper
              label="Retefuente arrendamiento (%)"
              error={errors.retefuenteArrendamientoPorcentaje}
              hint="La practica el inquilino agente retenedor sobre el canon."
            >
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                max={100}
                value={formData.retefuenteArrendamientoPorcentaje}
                onChange={(e) =>
                  updateField('retefuenteArrendamientoPorcentaje', e.target.value === '' ? NaN : Number(e.target.value))
                }
                data-testid="retefuente-arrendamiento"
                className={cn('tabular-nums', errors.retefuenteArrendamientoPorcentaje && 'border-danger/30')}
              />
            </InputWrapper>
            <InputWrapper
              label="Retefuente comisiones (%)"
              error={errors.retefuenteComisionPorcentaje}
              hint="La practica el propietario agente retenedor sobre tu comisión."
            >
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                max={100}
                value={formData.retefuenteComisionPorcentaje}
                onChange={(e) =>
                  updateField('retefuenteComisionPorcentaje', e.target.value === '' ? NaN : Number(e.target.value))
                }
                data-testid="retefuente-comision"
                className={cn('tabular-nums', errors.retefuenteComisionPorcentaje && 'border-danger/30')}
              />
            </InputWrapper>
            <InputWrapper
              label="ReteICA (por mil)"
              error={errors.reteicaPorMil}
              hint="Según el municipio (Bogotá, demás actividades comerciales: 9,66). Vacío = no se practica."
            >
              <Input
                type="number"
                inputMode="decimal"
                step="0.001"
                min={0}
                max={100}
                placeholder="Sin configurar"
                value={formData.reteicaPorMil ?? ''}
                onChange={(e) => updateField('reteicaPorMil', e.target.value === '' ? null : Number(e.target.value))}
                data-testid="reteica-por-mil"
                className={cn('tabular-nums', errors.reteicaPorMil && 'border-danger/30')}
              />
            </InputWrapper>
            <InputWrapper label="ReteIVA (%)" error={errors.reteivaPorcentaje} hint="Sobre el valor del IVA, no sobre la base.">
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                max={100}
                value={formData.reteivaPorcentaje}
                onChange={(e) => updateField('reteivaPorcentaje', e.target.value === '' ? NaN : Number(e.target.value))}
                data-testid="reteiva-porcentaje"
                className={cn('tabular-nums', errors.reteivaPorcentaje && 'border-danger/30')}
              />
            </InputWrapper>
            <InputWrapper
              label="Base mínima de retefuente (COP)"
              error={errors.baseMinimaRetefuenteCop}
              hint="Por debajo de este canon no se practica retefuente (27 UVT). Vacío = sin mínimo."
            >
              <CurrencyInput
                id="base-minima-retefuente"
                data-testid="base-minima-retefuente"
                value={formData.baseMinimaRetefuenteCop ?? undefined}
                onChange={(v) => updateField('baseMinimaRetefuenteCop', Number.isNaN(v) ? null : v)}
                invalid={Boolean(errors.baseMinimaRetefuenteCop)}
              />
            </InputWrapper>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded-md bg-muted/50">
              <div className="text-muted-foreground text-xs">IVA</div>
              <div className="text-foreground font-semibold tabular-nums">
                {agency.ivaPorcentaje ?? TARIFAS_POR_DEFECTO.ivaPorcentaje} %
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted/50">
              <div className="text-muted-foreground text-xs">Retefuente arrendamiento</div>
              <div className="text-foreground font-semibold tabular-nums">
                {agency.retefuenteArrendamientoPorcentaje ?? TARIFAS_POR_DEFECTO.retefuenteArrendamientoPorcentaje} %
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted/50">
              <div className="text-muted-foreground text-xs">Retefuente comisiones</div>
              <div className="text-foreground font-semibold tabular-nums">
                {agency.retefuenteComisionPorcentaje ?? TARIFAS_POR_DEFECTO.retefuenteComisionPorcentaje} %
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted/50">
              <div className="text-muted-foreground text-xs">ReteICA</div>
              <div className="text-foreground font-semibold tabular-nums">
                {agency.reteicaPorMil != null ? `${agency.reteicaPorMil} por mil` : 'Sin configurar — no se practica'}
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted/50">
              <div className="text-muted-foreground text-xs">ReteIVA</div>
              <div className="text-foreground font-semibold tabular-nums">
                {agency.reteivaPorcentaje ?? TARIFAS_POR_DEFECTO.reteivaPorcentaje} % del IVA
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted/50">
              <div className="text-muted-foreground text-xs">Base mínima de retefuente</div>
              <div className="text-foreground font-semibold tabular-nums">
                {agency.baseMinimaRetefuenteCop != null
                  ? formatCurrency(agency.baseMinimaRetefuenteCop)
                  : 'Sin mínimo'}
              </div>
            </div>
          </div>
        )}
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
