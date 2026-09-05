'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench,
  Lightning,
  Snowflake,
  HouseLine,
  PaintBrush,
  Key,
  DotsThreeCircle,
  Warning,
  Camera,
  X,
  Upload,
  Check,
  Info,
  User,
  MapPin,
  MagnifyingGlass,
  Wallet,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button, Input, Textarea } from '@/components/ui';
import { IconButton, RadioCardGroup, RadioCard } from '@leasefy/cadence';
import type {
  Consignacion,
  MantenimientoType,
  MantenimientoPriority,
  MantenimientoPaidBy,
} from '@/lib/types/inmobiliaria';
import { formatCurrency, MANTENIMIENTO_TYPES } from '@/lib/types/inmobiliaria';

// ============================================================================
// Types
// ============================================================================

export interface MantenimientoFormData {
  consignacionId: string;
  type: MantenimientoType;
  priority: MantenimientoPriority;
  title: string;
  description: string;
  photoUrls?: string[];
  paidBy: MantenimientoPaidBy;
  accessNotes?: string;
}

interface MantenimientoFormProps {
  consignaciones: Consignacion[];
  preselectedConsignacionId?: string;
  onSubmit: (data: MantenimientoFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const TYPE_ICONS: Record<MantenimientoType, React.ElementType> = {
  plumbing: Wrench,
  electrical: Lightning,
  appliance: Snowflake,
  structural: HouseLine,
  painting: PaintBrush,
  locks: Key,
  other: DotsThreeCircle,
};

const PRIORITY_OPTIONS: { value: MantenimientoPriority; labelKey: string; descKey: string; color: string }[] = [
  {
    value: 'low',
    labelKey: 'inmobiliaria.mantenimiento.priorityLow',
    descKey: 'inmobiliaria.mantenimiento.priorityLowDesc',
    color: 'border-fg-muted bg-surface-muted dark:bg-surface-muted',
  },
  {
    value: 'medium',
    labelKey: 'inmobiliaria.mantenimiento.priorityMedium',
    descKey: 'inmobiliaria.mantenimiento.priorityMediumDesc',
    color: 'border-primary/30 bg-primary-soft',
  },
  {
    value: 'high',
    labelKey: 'inmobiliaria.mantenimiento.priorityHigh',
    descKey: 'inmobiliaria.mantenimiento.priorityHighDesc',
    color: 'border-warning/30 bg-warning-soft',
  },
  {
    value: 'emergency',
    labelKey: 'inmobiliaria.mantenimiento.priorityEmergency',
    descKey: 'inmobiliaria.mantenimiento.priorityEmergencyDesc',
    color: 'border-danger/30 bg-danger-soft',
  },
];

const PAID_BY_OPTIONS: { value: MantenimientoPaidBy; labelKey: string; descKey: string }[] = [
  { value: 'owner', labelKey: 'inmobiliaria.mantenimiento.paidByOwner', descKey: 'inmobiliaria.mantenimiento.paidByOwnerDesc' },
  { value: 'tenant', labelKey: 'inmobiliaria.mantenimiento.paidByTenant', descKey: 'inmobiliaria.mantenimiento.paidByTenantDesc' },
  { value: 'split', labelKey: 'inmobiliaria.mantenimiento.paidBySplit', descKey: 'inmobiliaria.mantenimiento.paidBySplitDesc' },
  { value: 'agency', labelKey: 'inmobiliaria.mantenimiento.paidByAgency', descKey: 'inmobiliaria.mantenimiento.paidByAgencyDesc' },
];

// ============================================================================
// Property Selector Component
// ============================================================================

interface PropertySelectorProps {
  consignaciones: Consignacion[];
  selectedId: string;
  onSelect: (id: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function PropertySelector({ consignaciones, selectedId, onSelect, t }: PropertySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredConsignaciones = useMemo(() => {
    if (!searchQuery.trim()) return consignaciones;
    const query = searchQuery.toLowerCase();
    return consignaciones.filter(
      (c) =>
        c.propertyTitle.toLowerCase().includes(query) ||
        c.propertyAddress.toLowerCase().includes(query) ||
        c.propertyZone?.toLowerCase().includes(query)
    );
  }, [consignaciones, searchQuery]);

  const selectedConsignacion = consignaciones.find((c) => c.id === selectedId);

  // Sin inmuebles arrendados no hay nada que buscar: el buscador abría un
  // desplegable con «No se encontraron propiedades» encima de la sección
  // siguiente (Nico, 2026-09-03). Se dice de frente y sin desplegable.
  if (consignaciones.length === 0) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
          {t('inmobiliaria.mantenimiento.property')} <span className="text-danger">*</span>
        </label>
        <p
          className="rounded-lg border border-dashed border-border bg-surface-muted px-4 py-3 text-sm text-fg-muted"
          data-testid="mantenimiento-sin-inmuebles"
        >
          {t('inmobiliaria.mantenimiento.noRentedProperties')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
        {t('inmobiliaria.mantenimiento.property')} <span className="text-danger">*</span>
      </label>

      {selectedConsignacion ? (
        <div className="p-4 rounded-lg border border-primary/30 bg-primary-soft">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {selectedConsignacion.propertyThumbnail ? (
                <img
                  src={selectedConsignacion.propertyThumbnail}
                  alt={selectedConsignacion.propertyTitle}
                  className="w-16 h-12 rounded-md object-cover"
                />
              ) : (
                <div className="w-16 h-12 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center">
                  <HouseLine className="w-6 h-6 text-fg-subtle" />
                </div>
              )}
              <div>
                <p className="font-medium text-fg">
                  {selectedConsignacion.propertyTitle}
                </p>
                <p className="text-sm text-fg-muted dark:text-fg-subtle">
                  {selectedConsignacion.propertyAddress}
                </p>
                {selectedConsignacion.currentTenantName && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-fg-muted dark:text-fg-subtle">
                    <User className="w-3 h-3" />
                    <span>{selectedConsignacion.currentTenantName}</span>
                  </div>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="link"
              size="sm"
              hideArrow
              onClick={() => {
                onSelect('');
                setIsOpen(true);
              }}
              className="h-auto p-0 text-sm"
            >
              {t('inmobiliaria.mantenimiento.change')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle z-10" />
            <Input
              type="text"
              placeholder={t('inmobiliaria.mantenimiento.searchProperty')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              className="w-full pl-10"
            />
          </div>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-10 w-full mt-2 max-h-64 overflow-y-auto rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg"
              >
                {filteredConsignaciones.length > 0 ? (
                  filteredConsignaciones.map((consignacion) => (
                    // allowlist: search-result list-row (property thumbnail + 2-line text as ONE
                    // click target) — rich list-row; Button can't host the fill-image row (list-row precedent).
                    <button
                      key={consignacion.id}
                      type="button"
                      onClick={() => {
                        onSelect(consignacion.id);
                        setSearchQuery('');
                        setIsOpen(false);
                      }}
                      className="w-full p-3 flex items-start gap-3 hover:bg-surface-muted dark:hover:bg-ink transition-colors border-b border-border-faint dark:border-border-strong last:border-b-0 text-left"
                    >
                      {consignacion.propertyThumbnail ? (
                        <img
                          src={consignacion.propertyThumbnail}
                          alt={consignacion.propertyTitle}
                          className="w-12 h-9 rounded-md object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-9 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center shrink-0">
                          <HouseLine className="w-5 h-5 text-fg-subtle" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-fg truncate">
                          {consignacion.propertyTitle}
                        </p>
                        <p className="text-sm text-fg-muted dark:text-fg-subtle truncate">
                          {consignacion.propertyAddress}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-fg-muted dark:text-fg-subtle">
                    {t('inmobiliaria.mantenimiento.noPropertiesFound')}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {isOpen && <div className="fixed inset-0" onClick={() => setIsOpen(false)} />}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Type Selector Component (Radio Cards)
// ============================================================================

interface TypeSelectorProps {
  selected: MantenimientoType | '';
  onSelect: (type: MantenimientoType) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function TypeSelector({ selected, onSelect, t }: TypeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
        {t('inmobiliaria.mantenimiento.maintenanceType')} <span className="text-danger">*</span>
      </label>
      <RadioCardGroup
        className="grid grid-cols-2 gap-3"
        value={selected || undefined}
        onValueChange={(v) => onSelect(v as MantenimientoType)}
      >
        {MANTENIMIENTO_TYPES.map((type) => (
          <RadioCard
            key={type.type}
            value={type.type}
            label={
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="text-base leading-none">{type.icon}</span>
                {type.labelEs}
              </span>
            }
          />
        ))}
      </RadioCardGroup>
    </div>
  );
}

// ============================================================================
// Priority Selector Component
// ============================================================================

interface PrioritySelectorProps {
  selected: MantenimientoPriority | '';
  onSelect: (priority: MantenimientoPriority) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function PrioritySelector({ selected, onSelect, t }: PrioritySelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
        {t('inmobiliaria.mantenimiento.priorityLabel')} <span className="text-danger">*</span>
      </label>
      {/* Dos columnas: en cuatro, la descripción de cada prioridad se partía
          palabra por palabra (Nico, 2026-09-03). */}
      <RadioCardGroup
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        value={selected || undefined}
        onValueChange={(v) => onSelect(v as MantenimientoPriority)}
      >
        {PRIORITY_OPTIONS.map((priority) => (
          <RadioCard
            key={priority.value}
            value={priority.value}
            className={priority.color}
            label={
              <span
                className={cn(
                  'font-semibold',
                  priority.value === 'emergency' && 'text-danger',
                  priority.value === 'high' && 'text-warning',
                  priority.value === 'medium' && 'text-primary',
                  priority.value === 'low' && 'text-fg-muted dark:text-fg-muted'
                )}
              >
                {t(priority.labelKey)}
              </span>
            }
            description={t(priority.descKey)}
            badge={priority.value === 'emergency' ? <Warning className="w-5 h-5 text-danger" weight="fill" /> : undefined}
          />
        ))}
      </RadioCardGroup>
    </div>
  );
}

// ============================================================================
// Photo Upload Component
// ============================================================================

interface PhotoUploadProps {
  photos: string[];
  onAdd: (url: string) => void;
  onRemove: (index: number) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function PhotoUpload({ photos, onAdd, onRemove, t }: PhotoUploadProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, this would upload to a server
      // For now, create a local URL
      const url = URL.createObjectURL(file);
      onAdd(url);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
        {t('inmobiliaria.mantenimiento.photosOptional')}
      </label>
      <p className="text-xs text-fg-muted dark:text-fg-subtle">
        {t('inmobiliaria.mantenimiento.photosHint')}
      </p>

      <div className="flex flex-wrap gap-3 mt-3">
        {/* Photo previews */}
        {photos.map((photo, index) => (
          <div key={index} className="relative w-24 h-24 rounded-xl overflow-hidden group">
            <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              icon={<X className="w-4 h-4" />}
              onClick={() => onRemove(index)}
              aria-label={t('inmobiliaria.mantenimiento.change')}
              className="absolute top-1 right-1 bg-danger text-white hover:bg-danger/90 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>
        ))}

        {/* Add photo button */}
        {photos.length < 5 && (
          <label className="w-24 h-24 rounded-xl border-2 border-dashed border-border dark:border-border-strong flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/30 hover:bg-primary-soft transition-all">
            <Camera className="w-6 h-6 text-fg-subtle" />
            <span className="text-xs text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.mantenimiento.addPhoto')}</span>
            {/* allowlist: hidden type=file behind a custom camera dropzone tile (playbook hidden/file-input allowlist) */}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Paid By Selector Component
// ============================================================================

interface PaidBySelectorProps {
  selected: MantenimientoPaidBy;
  onSelect: (paidBy: MantenimientoPaidBy) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function PaidBySelector({ selected, onSelect, t }: PaidBySelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
        {t('inmobiliaria.mantenimiento.paymentResponsible')} <span className="text-danger">*</span>
      </label>

      <div className="p-4 rounded-lg bg-primary-soft border border-primary/30 mb-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-primary">
            {t('inmobiliaria.mantenimiento.paymentInfo')}
          </p>
        </div>
      </div>

      <RadioCardGroup
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        value={selected}
        onValueChange={(v) => onSelect(v as MantenimientoPaidBy)}
      >
        {PAID_BY_OPTIONS.map((option) => (
          <RadioCard
            key={option.value}
            value={option.value}
            label={
              <span className="flex items-center gap-2 font-medium">
                <Wallet className="w-4 h-4" />
                {t(option.labelKey)}
              </span>
            }
            description={t(option.descKey)}
          />
        ))}
      </RadioCardGroup>
    </div>
  );
}

// ============================================================================
// Main MantenimientoForm Component
// ============================================================================

export function MantenimientoForm({
  consignaciones,
  preselectedConsignacionId,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: MantenimientoFormProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState<{
    consignacionId: string;
    type: MantenimientoType | '';
    priority: MantenimientoPriority | '';
    title: string;
    description: string;
    photoUrls: string[];
    paidBy: MantenimientoPaidBy;
    accessNotes: string;
  }>({
    consignacionId: preselectedConsignacionId || '',
    type: '',
    priority: '',
    title: '',
    description: '',
    photoUrls: [],
    paidBy: 'owner',
    accessNotes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const updateField = <K extends keyof typeof formData>(key: K, value: typeof formData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.consignacionId) {
      newErrors.consignacionId = t('inmobiliaria.mantenimiento.errSelectProperty');
    }
    if (!formData.type) {
      newErrors.type = t('inmobiliaria.mantenimiento.errSelectType');
    }
    if (!formData.priority) {
      newErrors.priority = t('inmobiliaria.mantenimiento.errSelectPriority');
    }
    if (!formData.title.trim()) {
      newErrors.title = t('inmobiliaria.mantenimiento.errTitleRequired');
    } else if (formData.title.length < 5) {
      newErrors.title = t('inmobiliaria.mantenimiento.errTitleMinLength');
    }
    if (!formData.description.trim()) {
      newErrors.description = t('inmobiliaria.mantenimiento.errDescRequired');
    } else if (formData.description.length < 20) {
      newErrors.description = t('inmobiliaria.mantenimiento.errDescMinLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      // Mark all fields as touched
      const allTouched: Record<string, boolean> = {};
      Object.keys(formData).forEach((key) => {
        allTouched[key] = true;
      });
      setTouched(allTouched);
      return;
    }

    onSubmit({
      consignacionId: formData.consignacionId,
      type: formData.type as MantenimientoType,
      priority: formData.priority as MantenimientoPriority,
      title: formData.title,
      description: formData.description,
      photoUrls: formData.photoUrls.length > 0 ? formData.photoUrls : undefined,
      paidBy: formData.paidBy,
      accessNotes: formData.accessNotes || undefined,
    });
  };

  const selectedConsignacion = consignaciones.find((c) => c.id === formData.consignacionId);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Section 1: Property Selection */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <HouseLine className="h-4 w-4 text-fg-muted" />
          {t('inmobiliaria.mantenimiento.property')}
        </h3>
        <PropertySelector
          consignaciones={consignaciones}
          selectedId={formData.consignacionId}
          onSelect={(id) => updateField('consignacionId', id)}
          t={t}
        />
        {touched.consignacionId && errors.consignacionId && (
          <p className="text-sm text-danger flex items-center gap-1">
            <Warning className="w-4 h-4" />
            {errors.consignacionId}
          </p>
        )}
      </div>

      {/* Section 2: Request Details */}
      <div className="space-y-6 pt-6 border-t border-border-faint dark:border-border-strong">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Wrench className="h-4 w-4 text-fg-muted" />
          {t('inmobiliaria.mantenimiento.requestDetail')}
        </h3>

        {/* Type */}
        <TypeSelector
          selected={formData.type}
          onSelect={(type) => updateField('type', type)}
          t={t}
        />
        {touched.type && errors.type && (
          <p className="text-sm text-danger flex items-center gap-1">
            <Warning className="w-4 h-4" />
            {errors.type}
          </p>
        )}

        {/* Priority */}
        <PrioritySelector
          selected={formData.priority}
          onSelect={(priority) => updateField('priority', priority)}
          t={t}
        />
        {touched.priority && errors.priority && (
          <p className="text-sm text-danger flex items-center gap-1">
            <Warning className="w-4 h-4" />
            {errors.priority}
          </p>
        )}

        {/* Emergency explanation */}
        {(formData.priority === 'high' || formData.priority === 'emergency') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 rounded-lg bg-warning-soft border border-warning/30"
          >
            <div className="flex gap-3">
              <Warning className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-warning">
                {formData.priority === 'emergency'
                  ? t('inmobiliaria.mantenimiento.emergencyWarning')
                  : t('inmobiliaria.mantenimiento.highPriorityWarning')}
              </p>
            </div>
          </motion.div>
        )}

        {/* Title */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
            {t('inmobiliaria.mantenimiento.requestTitle')} <span className="text-danger">*</span>
          </label>
          <Input
            type="text"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
            placeholder={t('inmobiliaria.mantenimiento.titlePlaceholder')}
            className={cn('w-full', touched.title && errors.title && 'border-danger/30')}
          />
          {touched.title && errors.title && (
            <p className="text-sm text-danger flex items-center gap-1">
              <Warning className="w-4 h-4" />
              {errors.title}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
            {t('inmobiliaria.mantenimiento.problemDescription')} <span className="text-danger">*</span>
          </label>
          <Textarea
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, description: true }))}
            rows={4}
            placeholder={t('inmobiliaria.mantenimiento.descriptionPlaceholder')}
            className={cn('w-full resize-none', touched.description && errors.description && 'border-danger/30')}
          />
          {touched.description && errors.description && (
            <p className="text-sm text-danger flex items-center gap-1">
              <Warning className="w-4 h-4" />
              {errors.description}
            </p>
          )}
        </div>

        {/* Photo Upload */}
        <PhotoUpload
          photos={formData.photoUrls}
          onAdd={(url) => updateField('photoUrls', [...formData.photoUrls, url])}
          onRemove={(index) =>
            updateField(
              'photoUrls',
              formData.photoUrls.filter((_, i) => i !== index)
            )
          }
          t={t}
        />
      </div>

      {/* Section 3: Responsibility */}
      <div className="space-y-6 pt-6 border-t border-border-faint dark:border-border-strong">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Wallet className="h-4 w-4 text-fg-muted" />
          {t('inmobiliaria.mantenimiento.responsibility')}
        </h3>

        <PaidBySelector
          selected={formData.paidBy}
          onSelect={(paidBy) => updateField('paidBy', paidBy)}
          t={t}
        />
      </div>

      {/* Section 4: Additional Info */}
      <div className="space-y-6 pt-6 border-t border-border-faint dark:border-border-strong">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Info className="h-4 w-4 text-fg-muted" />
          {t('inmobiliaria.mantenimiento.additionalInfo')}
        </h3>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
            {t('inmobiliaria.mantenimiento.accessInstructions')}
          </label>
          <Textarea
            value={formData.accessNotes}
            onChange={(e) => updateField('accessNotes', e.target.value)}
            rows={3}
            placeholder={t('inmobiliaria.mantenimiento.accessPlaceholder')}
            className="w-full resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-border-faint dark:border-border-strong">
        <Button
          type="button"
          variant="secondary"
          hideArrow
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {t('inmobiliaria.mantenimiento.cancel')}
        </Button>
        <Button
          type="submit"
          hideArrow
          disabled={isSubmitting}
          isLoading={isSubmitting}
        >
          {isSubmitting ? (
            t('inmobiliaria.mantenimiento.creating')
          ) : (
            <>
              <Check className="w-5 h-5" />
              {t('inmobiliaria.mantenimiento.createRequest')}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default MantenimientoForm;
