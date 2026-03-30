'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Envelope,
  Phone,
  MapPin,
  Percent,
  Buildings,
  UserCircle,
  SpinnerGap,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { AgenteFormData, AgenteRole } from '@/lib/types/inmobiliaria';

interface AgenteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AgenteFormData) => Promise<void> | void;
}

const ROLE_VALUES: AgenteRole[] = ['agent', 'coordinator', 'director'];

const SPECIALIZATION_VALUES = ['residential', 'commercial', 'both'] as const;

const ZONE_OPTIONS = [
  'Norte',
  'Sur',
  'Este',
  'Oeste',
  'Centro',
  'Chapinero',
  'Usaquen',
  'Suba',
  'Kennedy',
  'Fontibon',
];

/**
 * AgenteFormModal - Modal form for creating a new agent
 */
export function AgenteFormModal({
  isOpen,
  onClose,
  onSubmit,
}: AgenteFormModalProps) {
  const { t } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  const ROLE_OPTIONS: { value: AgenteRole; label: string; description: string }[] = [
    { value: 'agent', label: t('inmobiliaria.agente.roleAgent'), description: t('inmobiliaria.agente.roleAgentDesc') },
    { value: 'coordinator', label: t('inmobiliaria.agente.roleCoordinator'), description: t('inmobiliaria.agente.roleCoordinatorDesc') },
    { value: 'director', label: t('inmobiliaria.agente.roleDirector'), description: t('inmobiliaria.agente.roleDirectorDesc') },
  ];

  const SPECIALIZATION_OPTIONS = [
    { value: 'residential', label: t('inmobiliaria.agente.specResidential') },
    { value: 'commercial', label: t('inmobiliaria.agente.specCommercial') },
    { value: 'both', label: t('inmobiliaria.agente.specBoth') },
  ];

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Form state
  const [formData, setFormData] = useState<AgenteFormData>({
    name: '',
    email: '',
    phone: '',
    role: 'agent',
    commissionSplit: 50,
    zone: '',
    specialization: 'residential',
  });

  // Update form field
  const updateField = useCallback(<K extends keyof AgenteFormData>(
    key: K,
    value: AgenteFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // Clear error when field is updated
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }, [errors]);

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('inmobiliaria.agente.errorNameRequired');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('inmobiliaria.agente.errorEmailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('inmobiliaria.agente.errorEmailInvalid');
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('inmobiliaria.agente.errorPhoneRequired');
    }

    if (formData.commissionSplit < 0 || formData.commissionSplit > 100) {
      newErrors.commissionSplit = t('inmobiliaria.agente.errorCommissionRange');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // Reset form on success
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'agent',
        commissionSplit: 50,
        zone: '',
        specialization: 'residential',
      });
      onClose();
    } catch (error) {
      console.error('Error creating agent:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - uses viewport units for guaranteed full coverage */}
          <div
            onClick={handleClose}
            className="bg-black/50 backdrop-blur-sm"
            style={{
              position: 'fixed',
              top: '-100px',
              left: '-100px',
              width: 'calc(100vw + 200px)',
              height: 'calc(100vh + 200px)',
              zIndex: 99998,
            }}
          />

          {/* Modal Container - centered with flexbox */}
          <div
            className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
            style={{ zIndex: 99999 }}
            onWheel={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="pointer-events-auto w-full max-w-lg bg-card rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
            >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <UserCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{t('inmobiliaria.agente.newAgent')}</h2>
                  <p className="text-sm text-muted-foreground">{t('inmobiliaria.agente.newAgentDescription')}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-5">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  {t('inmobiliaria.agente.fullName')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Juan Perez"
                  className={cn(
                    'w-full px-4 py-2.5 rounded-xl border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all',
                    errors.name ? 'border-rose-500' : 'border-border'
                  )}
                />
                {errors.name && (
                  <p className="text-xs text-rose-500">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Envelope className="w-4 h-4 text-muted-foreground" />
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="juan@inmobiliaria.com"
                  className={cn(
                    'w-full px-4 py-2.5 rounded-xl border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all',
                    errors.email ? 'border-rose-500' : 'border-border'
                  )}
                />
                {errors.email && (
                  <p className="text-xs text-rose-500">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  {t('inmobiliaria.agente.phone')}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+57 300 123 4567"
                  className={cn(
                    'w-full px-4 py-2.5 rounded-xl border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all',
                    errors.phone ? 'border-rose-500' : 'border-border'
                  )}
                />
                {errors.phone && (
                  <p className="text-xs text-rose-500">{errors.phone}</p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('inmobiliaria.agente.role')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField('role', option.value)}
                      className={cn(
                        'p-3 rounded-xl border text-center transition-all',
                        formData.role === option.value
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-border hover:bg-muted'
                      )}
                    >
                      <p className={cn(
                        'text-sm font-medium',
                        formData.role === option.value
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-foreground'
                      )}>
                        {option.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Zone and Specialization Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Zone */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {t('inmobiliaria.agente.zone')}
                  </label>
                  <select
                    value={formData.zone || ''}
                    onChange={(e) => updateField('zone', e.target.value || undefined)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    <option value="">{t('inmobiliaria.agente.selectZone')}</option>
                    {ZONE_OPTIONS.map((zone) => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                </div>

                {/* Specialization */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Buildings className="w-4 h-4 text-muted-foreground" />
                    {t('inmobiliaria.agente.specialization')}
                  </label>
                  <select
                    value={formData.specialization || 'residential'}
                    onChange={(e) => updateField('specialization', e.target.value as AgenteFormData['specialization'])}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    {SPECIALIZATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Commission Split */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Percent className="w-4 h-4 text-muted-foreground" />
                  {t('inmobiliaria.agente.commissionPercentage')}
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.commissionSplit}
                    onChange={(e) => updateField('commissionSplit', parseInt(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-full appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="relative w-20">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.commissionSplit}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        updateField('commissionSplit', Math.min(100, Math.max(0, val)));
                      }}
                      className="w-full px-3 py-2 pr-7 rounded-xl border border-border bg-background text-sm font-medium text-foreground text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('inmobiliaria.agente.commissionPercentageDesc')}
                </p>
                {errors.commissionSplit && (
                  <p className="text-xs text-rose-500">{errors.commissionSplit}</p>
                )}
              </div>
            </form>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                {t('inmobiliaria.agente.cancel')}
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white uppercase tracking-wide font-mono font-medium transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <SpinnerGap className="w-4 h-4 animate-spin" />
                    {t('inmobiliaria.agente.creating')}
                  </>
                ) : (
                  t('inmobiliaria.agente.createAgent')
                )}
              </button>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

export default AgenteFormModal;
