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
  SpinnerGap,
  Info,
  User,
  MapPin,
  MagnifyingGlass,
  Wallet,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
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
    color: 'border-[#6B6B6B] dark:border-[#6B6B6B] bg-[#6B6B6B] dark:bg-[#6B6B6B]/30',
  },
  {
    value: 'medium',
    labelKey: 'inmobiliaria.mantenimiento.priorityMedium',
    descKey: 'inmobiliaria.mantenimiento.priorityMediumDesc',
    color: 'border-[#1A40FF]/30 dark:border-[#1A40FF]/40 bg-[#EEF1FF] dark:bg-[#1A40FF]/15',
  },
  {
    value: 'high',
    labelKey: 'inmobiliaria.mantenimiento.priorityHigh',
    descKey: 'inmobiliaria.mantenimiento.priorityHighDesc',
    color: 'border-[#B7791F]/30 dark:border-[#B7791F]/40 bg-[#F8F0E0] dark:bg-[#B7791F]/15',
  },
  {
    value: 'emergency',
    labelKey: 'inmobiliaria.mantenimiento.priorityEmergency',
    descKey: 'inmobiliaria.mantenimiento.priorityEmergencyDesc',
    color: 'border-[#C4503B]/30 dark:border-[#C4503B]/40 bg-[#F8EAE7] dark:bg-[#C4503B]/15',
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

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {t('inmobiliaria.mantenimiento.property')} <span className="text-[#C4503B]">*</span>
      </label>

      {selectedConsignacion ? (
        <div className="p-4 rounded-xl border border-[#1A40FF]/30 dark:border-[#1A40FF]/40 bg-[#EEF1FF] dark:bg-[#1A40FF]/15">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {selectedConsignacion.propertyThumbnail ? (
                <img
                  src={selectedConsignacion.propertyThumbnail}
                  alt={selectedConsignacion.propertyTitle}
                  className="w-16 h-12 rounded-md object-cover"
                />
              ) : (
                <div className="w-16 h-12 rounded-md bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                  <HouseLine className="w-6 h-6 text-neutral-400" />
                </div>
              )}
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {selectedConsignacion.propertyTitle}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {selectedConsignacion.propertyAddress}
                </p>
                {selectedConsignacion.currentTenantName && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    <User className="w-3 h-3" />
                    <span>{selectedConsignacion.currentTenantName}</span>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onSelect('');
                setIsOpen(true);
              }}
              className="text-sm text-[#1A40FF] dark:text-[#5570FF] hover:underline"
            >
              {t('inmobiliaria.mantenimiento.change')}
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder={t('inmobiliaria.mantenimiento.searchProperty')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all"
            />
          </div>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-10 w-full mt-2 max-h-64 overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]"
              >
                {filteredConsignaciones.length > 0 ? (
                  filteredConsignaciones.map((consignacion) => (
                    <button
                      key={consignacion.id}
                      type="button"
                      onClick={() => {
                        onSelect(consignacion.id);
                        setSearchQuery('');
                        setIsOpen(false);
                      }}
                      className="w-full p-3 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors border-b border-neutral-100 dark:border-neutral-800 last:border-b-0 text-left"
                    >
                      {consignacion.propertyThumbnail ? (
                        <img
                          src={consignacion.propertyThumbnail}
                          alt={consignacion.propertyTitle}
                          className="w-12 h-9 rounded-md object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-9 rounded-md bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                          <HouseLine className="w-5 h-5 text-neutral-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-neutral-900 dark:text-white truncate">
                          {consignacion.propertyTitle}
                        </p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                          {consignacion.propertyAddress}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-neutral-500 dark:text-neutral-400">
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
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {t('inmobiliaria.mantenimiento.maintenanceType')} <span className="text-[#C4503B]">*</span>
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {MANTENIMIENTO_TYPES.map((type) => {
          const Icon = TYPE_ICONS[type.type];
          const isSelected = selected === type.type;

          return (
            <button
              key={type.type}
              type="button"
              onClick={() => onSelect(type.type)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                isSelected
                  ? 'border-[#1A40FF]/30 bg-[#EEF1FF] dark:bg-[#1A40FF]/15'
                  : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:border-neutral-300 dark:hover:border-neutral-600'
              )}
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center text-2xl',
                  isSelected
                    ? 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15'
                    : 'bg-neutral-100 dark:bg-neutral-800'
                )}
              >
                {type.icon}
              </div>
              <span
                className={cn(
                  'text-sm font-medium text-center',
                  isSelected
                    ? 'text-[#1A40FF] dark:text-[#5570FF]'
                    : 'text-neutral-700 dark:text-neutral-300'
                )}
              >
                {type.labelEs}
              </span>
            </button>
          );
        })}
      </div>
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
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {t('inmobiliaria.mantenimiento.priorityLabel')} <span className="text-[#C4503B]">*</span>
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PRIORITY_OPTIONS.map((priority) => {
          const isSelected = selected === priority.value;

          return (
            <button
              key={priority.value}
              type="button"
              onClick={() => onSelect(priority.value)}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all',
                isSelected
                  ? 'border-[#1A40FF]/30 ring-2 ring-[#1A40FF]/20'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600',
                priority.color
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'font-semibold',
                    priority.value === 'emergency' && 'text-[#C4503B] dark:text-[#E0664D]',
                    priority.value === 'high' && 'text-[#B7791F] dark:text-[#D2992F]',
                    priority.value === 'medium' && 'text-[#1A40FF] dark:text-[#5570FF]',
                    priority.value === 'low' && 'text-[#6B6B6B] dark:text-[#6B6B6B]'
                  )}
                >
                  {t(priority.labelKey)}
                </span>
                {priority.value === 'emergency' && (
                  <Warning className="w-5 h-5 text-[#C4503B]" weight="fill" />
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{t(priority.descKey)}</p>
            </button>
          );
        })}
      </div>
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
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {t('inmobiliaria.mantenimiento.photosOptional')}
      </label>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {t('inmobiliaria.mantenimiento.photosHint')}
      </p>

      <div className="flex flex-wrap gap-3 mt-3">
        {/* Photo previews */}
        {photos.map((photo, index) => (
          <div key={index} className="relative w-24 h-24 rounded-xl overflow-hidden group">
            <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute top-1 right-1 p-1 rounded-full bg-[#C4503B] text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {/* Add photo button */}
        {photos.length < 5 && (
          <label className="w-24 h-24 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-600 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#1A40FF]/30 dark:hover:border-[#1A40FF]/30 hover:bg-[#EEF1FF] dark:hover:bg-[#1A40FF]/20 transition-all">
            <Camera className="w-6 h-6 text-neutral-400" />
            <span className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.mantenimiento.addPhoto')}</span>
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
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {t('inmobiliaria.mantenimiento.paymentResponsible')} <span className="text-[#C4503B]">*</span>
      </label>

      <div className="p-4 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 border border-[#1A40FF]/30 dark:border-[#1A40FF]/40 mb-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-[#1A40FF] shrink-0 mt-0.5" />
          <p className="text-sm text-[#1A40FF] dark:text-[#5570FF]">
            {t('inmobiliaria.mantenimiento.paymentInfo')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PAID_BY_OPTIONS.map((option) => {
          const isSelected = selected === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all',
                isSelected
                  ? 'border-[#1A40FF]/30 bg-[#EEF1FF] dark:bg-[#1A40FF]/15'
                  : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:border-neutral-300 dark:hover:border-neutral-600'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Wallet
                  className={cn(
                    'w-4 h-4',
                    isSelected ? 'text-[#1A40FF] dark:text-[#5570FF]' : 'text-neutral-400'
                  )}
                />
                <span
                  className={cn(
                    'font-medium',
                    isSelected
                      ? 'text-[#1A40FF] dark:text-[#5570FF]'
                      : 'text-neutral-700 dark:text-neutral-300'
                  )}
                >
                  {t(option.labelKey)}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{t(option.descKey)}</p>
            </button>
          );
        })}
      </div>
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
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
          <HouseLine className="w-5 h-5 text-[#1A40FF]" />
          {t('inmobiliaria.mantenimiento.property')}
        </h3>
        <PropertySelector
          consignaciones={consignaciones}
          selectedId={formData.consignacionId}
          onSelect={(id) => updateField('consignacionId', id)}
          t={t}
        />
        {touched.consignacionId && errors.consignacionId && (
          <p className="text-sm text-[#C4503B] flex items-center gap-1">
            <Warning className="w-4 h-4" />
            {errors.consignacionId}
          </p>
        )}
      </div>

      {/* Section 2: Request Details */}
      <div className="space-y-6 pt-6 border-t border-neutral-100 dark:border-neutral-800">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
          <Wrench className="w-5 h-5 text-[#1A40FF]" />
          {t('inmobiliaria.mantenimiento.requestDetail')}
        </h3>

        {/* Type */}
        <TypeSelector
          selected={formData.type}
          onSelect={(type) => updateField('type', type)}
          t={t}
        />
        {touched.type && errors.type && (
          <p className="text-sm text-[#C4503B] flex items-center gap-1">
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
          <p className="text-sm text-[#C4503B] flex items-center gap-1">
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
            className="p-4 rounded-xl bg-[#F8F0E0] dark:bg-[#B7791F]/15 border border-[#B7791F]/30 dark:border-[#B7791F]/40"
          >
            <div className="flex gap-3">
              <Warning className="w-5 h-5 text-[#B7791F] shrink-0 mt-0.5" />
              <p className="text-sm text-[#B7791F] dark:text-[#D2992F]">
                {formData.priority === 'emergency'
                  ? t('inmobiliaria.mantenimiento.emergencyWarning')
                  : t('inmobiliaria.mantenimiento.highPriorityWarning')}
              </p>
            </div>
          </motion.div>
        )}

        {/* Title */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('inmobiliaria.mantenimiento.requestTitle')} <span className="text-[#C4503B]">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
            placeholder={t('inmobiliaria.mantenimiento.titlePlaceholder')}
            className={cn(
              'w-full px-4 py-3 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all',
              touched.title && errors.title
                ? 'border-[#C4503B]/30'
                : 'border-neutral-200 dark:border-neutral-700'
            )}
          />
          {touched.title && errors.title && (
            <p className="text-sm text-[#C4503B] flex items-center gap-1">
              <Warning className="w-4 h-4" />
              {errors.title}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('inmobiliaria.mantenimiento.problemDescription')} <span className="text-[#C4503B]">*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, description: true }))}
            rows={4}
            placeholder={t('inmobiliaria.mantenimiento.descriptionPlaceholder')}
            className={cn(
              'w-full px-4 py-3 rounded-xl border bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all resize-none',
              touched.description && errors.description
                ? 'border-[#C4503B]/30'
                : 'border-neutral-200 dark:border-neutral-700'
            )}
          />
          {touched.description && errors.description && (
            <p className="text-sm text-[#C4503B] flex items-center gap-1">
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
      <div className="space-y-6 pt-6 border-t border-neutral-100 dark:border-neutral-800">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-[#1A40FF]" />
          {t('inmobiliaria.mantenimiento.responsibility')}
        </h3>

        <PaidBySelector
          selected={formData.paidBy}
          onSelect={(paidBy) => updateField('paidBy', paidBy)}
          t={t}
        />
      </div>

      {/* Section 4: Additional Info */}
      <div className="space-y-6 pt-6 border-t border-neutral-100 dark:border-neutral-800">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
          <Info className="w-5 h-5 text-[#1A40FF]" />
          {t('inmobiliaria.mantenimiento.additionalInfo')}
        </h3>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('inmobiliaria.mantenimiento.accessInstructions')}
          </label>
          <textarea
            value={formData.accessNotes}
            onChange={(e) => updateField('accessNotes', e.target.value)}
            rows={3}
            placeholder={t('inmobiliaria.mantenimiento.accessPlaceholder')}
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent transition-all resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-neutral-100 dark:border-neutral-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          {t('inmobiliaria.mantenimiento.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1A40FF] hover:opacity-90 text-white font-medium transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <SpinnerGap className="w-5 h-5 animate-spin" />
              {t('inmobiliaria.mantenimiento.creating')}
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              {t('inmobiliaria.mantenimiento.createRequest')}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default MantenimientoForm;
