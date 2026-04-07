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
  PaperPlaneTilt,
  Briefcase,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { AgenteRole, AgencyRole, UserInvite } from '@/lib/types/inmobiliaria';

/**
 * Unified modal for creating agents AND inviting users.
 *
 * - variant='agent'  → from /panel/inmobiliaria/agentes: role locked to agente, agent fields only
 * - variant='member' → from /panel/inmobiliaria/configuracion: role selector, agent fields shown when role='agente'
 *
 * Both submit a UserInvite object to the same endpoint (POST /inmobiliaria/agency/members).
 */
interface AgenteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserInvite) => Promise<void> | void;
  /** 'agent' = agent-only (default), 'member' = full invite with role selector */
  variant?: 'agent' | 'member';
  isLoading?: boolean;
}

const ZONE_OPTIONS = [
  'Norte', 'Sur', 'Este', 'Oeste', 'Centro',
  'Chapinero', 'Usaquen', 'Suba', 'Kennedy', 'Fontibon',
];

export function AgenteFormModal({
  isOpen,
  onClose,
  onSubmit,
  variant = 'agent',
  isLoading = false,
}: AgenteFormModalProps) {
  const { t } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  // Shared fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [systemRole, setSystemRole] = useState<AgencyRole>(variant === 'agent' ? 'agente' : 'agente');

  // Agent-specific fields
  const [agentRole, setAgentRole] = useState<AgenteRole>('agent');
  const [zone, setZone] = useState('');
  const [specialization, setSpecialization] = useState<'residential' | 'commercial' | 'both'>('residential');
  const [commissionSplit, setCommissionSplit] = useState(50);

  // Member-only fields
  const [position, setPosition] = useState('');
  const [message, setMessage] = useState('');

  const showAgentFields = variant === 'agent' || systemRole === 'agente';

  const AGENT_ROLE_OPTIONS: { value: AgenteRole; label: string; description: string }[] = [
    { value: 'agent', label: t('inmobiliaria.agente.roleAgent'), description: t('inmobiliaria.agente.roleAgentDesc') },
    { value: 'coordinator', label: t('inmobiliaria.agente.roleCoordinator'), description: t('inmobiliaria.agente.roleCoordinatorDesc') },
    { value: 'director', label: t('inmobiliaria.agente.roleDirector'), description: t('inmobiliaria.agente.roleDirectorDesc') },
  ];

  const SYSTEM_ROLE_OPTIONS: { value: AgencyRole; label: string }[] = [
    { value: 'admin', label: 'Administrador' },
    { value: 'agente', label: 'Agente' },
    { value: 'contador', label: 'Contable' },
    { value: 'viewer', label: 'Viewer' },
  ];

  const SPECIALIZATION_OPTIONS = [
    { value: 'residential', label: t('inmobiliaria.agente.specResidential') },
    { value: 'commercial', label: t('inmobiliaria.agente.specCommercial') },
    { value: 'both', label: t('inmobiliaria.agente.specBoth') },
  ];

  useEffect(() => { setMounted(true); }, []);

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

  const resetForm = useCallback(() => {
    setName(''); setEmail(''); setPhone('');
    setSystemRole(variant === 'agent' ? 'agente' : 'agente');
    setAgentRole('agent'); setZone(''); setSpecialization('residential');
    setCommissionSplit(50); setPosition(''); setMessage('');
    setErrors({});
  }, [variant]);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t('inmobiliaria.agente.errorNameRequired');
    if (!email.trim()) newErrors.email = t('inmobiliaria.agente.errorEmailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = t('inmobiliaria.agente.errorEmailInvalid');
    if (showAgentFields && !phone.trim()) newErrors.phone = t('inmobiliaria.agente.errorPhoneRequired');
    if (showAgentFields && (commissionSplit < 0 || commissionSplit > 100)) newErrors.commissionSplit = t('inmobiliaria.agente.errorCommissionRange');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, email, phone, commissionSplit, showAgentFields, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const invite: UserInvite = {
        email,
        name,
        role: variant === 'agent' ? 'agente' : systemRole,
      };

      if (variant === 'member') {
        invite.position = position.trim() || undefined;
        invite.message = message || undefined;
      }

      if (showAgentFields) {
        invite.phone = phone || undefined;
        invite.zone = zone || undefined;
        invite.specialization = specialization.toUpperCase() as UserInvite['specialization'];
        invite.commissionSplit = commissionSplit;
        invite.agentRole = agentRole.toUpperCase() as UserInvite['agentRole'];
      }

      await onSubmit(invite);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error submitting:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => { if (!isSubmitting) onClose(); };

  const isFormLoading = isSubmitting || isLoading;

  // --- Shared input classes ---
  const inputCls = (hasError: boolean) => cn(
    'w-full px-4 py-2.5 rounded-xl border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all',
    hasError ? 'border-rose-500' : 'border-border'
  );

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={handleClose}
            className="bg-black/50 backdrop-blur-sm"
            style={{ position: 'fixed', top: '-100px', left: '-100px', width: 'calc(100vw + 200px)', height: 'calc(100vh + 200px)', zIndex: 99998 }}
          />

          {/* Modal */}
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
                    <h2 className="text-lg font-semibold text-foreground">
                      {variant === 'agent' ? t('inmobiliaria.agente.newAgent') : 'Invitar usuario'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {variant === 'agent'
                        ? t('inmobiliaria.agente.newAgentDescription')
                        : 'Envía una invitación por correo para unirse a tu agencia.'}
                    </p>
                  </div>
                </div>
                <button onClick={handleClose} disabled={isFormLoading} className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Form — scrollable */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-5">

                {/* System Role Selector — only in member variant */}
                {variant === 'member' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Rol del sistema *</label>
                    <div className="grid grid-cols-4 gap-2">
                      {SYSTEM_ROLE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSystemRole(opt.value)}
                          className={cn(
                            'py-2.5 px-2 rounded-xl border text-center transition-all text-xs',
                            systemRole === opt.value
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                              : 'border-border hover:bg-muted'
                          )}
                        >
                          <p className={cn('font-medium', systemRole === opt.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-foreground')}>
                            {opt.label}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    {t('inmobiliaria.agente.fullName')} *
                  </label>
                  <input type="text" value={name} onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => { const n = { ...p }; delete n.name; return n; }); }} placeholder="Juan Perez" className={inputCls(!!errors.name)} />
                  {errors.name && <p className="text-xs text-rose-500">{errors.name}</p>}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Envelope className="w-4 h-4 text-muted-foreground" />
                    Email *
                  </label>
                  <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => { const n = { ...p }; delete n.email; return n; }); }} placeholder="juan@inmobiliaria.com" className={inputCls(!!errors.email)} />
                  {errors.email && <p className="text-xs text-rose-500">{errors.email}</p>}
                </div>

                {/* Phone — always for agent, shown for member when agente */}
                {(variant === 'agent' || showAgentFields) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      {t('inmobiliaria.agente.phone')} {showAgentFields ? '*' : ''}
                    </label>
                    <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); if (errors.phone) setErrors((p) => { const n = { ...p }; delete n.phone; return n; }); }} placeholder="+57 300 123 4567" className={inputCls(!!errors.phone)} />
                    {errors.phone && <p className="text-xs text-rose-500">{errors.phone}</p>}
                  </div>
                )}

                {/* Position / Cargo — member variant only */}
                {variant === 'member' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      Cargo
                    </label>
                    <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Ej: Agente Senior, Administrador General" maxLength={100} className={inputCls(false)} />
                  </div>
                )}

                {/* ──── Agent-specific fields ──── */}
                {showAgentFields && (
                  <>
                    {variant === 'member' && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Datos del agente</p>
                      </div>
                    )}

                    {/* Agent Business Role */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t('inmobiliaria.agente.role')}</label>
                      <div className="grid grid-cols-3 gap-2">
                        {AGENT_ROLE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setAgentRole(opt.value)}
                            className={cn(
                              'p-3 rounded-xl border text-center transition-all',
                              agentRole === opt.value
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'border-border hover:bg-muted'
                            )}
                          >
                            <p className={cn('text-sm font-medium', agentRole === opt.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-foreground')}>
                              {opt.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Zone + Specialization */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          {t('inmobiliaria.agente.zone')}
                        </label>
                        <select value={zone} onChange={(e) => setZone(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                          <option value="">{t('inmobiliaria.agente.selectZone')}</option>
                          {ZONE_OPTIONS.map((z) => <option key={z} value={z}>{z}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Buildings className="w-4 h-4 text-muted-foreground" />
                          {t('inmobiliaria.agente.specialization')}
                        </label>
                        <select value={specialization} onChange={(e) => setSpecialization(e.target.value as typeof specialization)} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                          {SPECIALIZATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Commission */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Percent className="w-4 h-4 text-muted-foreground" />
                        {t('inmobiliaria.agente.commissionPercentage')}
                      </label>
                      <div className="flex items-center gap-4">
                        <input type="range" min={0} max={100} value={commissionSplit} onChange={(e) => setCommissionSplit(parseInt(e.target.value))} className="flex-1 h-2 bg-muted rounded-full appearance-none cursor-pointer accent-indigo-500" />
                        <div className="relative w-20">
                          <input type="number" min={0} max={100} value={commissionSplit} onChange={(e) => setCommissionSplit(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))} className="w-full px-3 py-2 pr-7 rounded-xl border border-border bg-background text-sm font-medium text-foreground text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">%</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{t('inmobiliaria.agente.commissionPercentageDesc')}</p>
                      {errors.commissionSplit && <p className="text-xs text-rose-500">{errors.commissionSplit}</p>}
                    </div>
                  </>
                )}

                {/* Message — member variant only */}
                {variant === 'member' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Mensaje personalizado (opcional)</label>
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Agrega un mensaje para el invitado..." rows={3} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none" />
                  </div>
                )}
              </form>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                <button type="button" onClick={handleClose} disabled={isFormLoading} className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
                  {t('inmobiliaria.agente.cancel')}
                </button>
                <button type="submit" onClick={handleSubmit} disabled={isFormLoading} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50">
                  {isFormLoading ? (
                    <>
                      <SpinnerGap className="w-4 h-4 animate-spin" />
                      {variant === 'agent' ? t('inmobiliaria.agente.creating') : 'Enviando...'}
                    </>
                  ) : variant === 'agent' ? (
                    t('inmobiliaria.agente.createAgent')
                  ) : (
                    <>
                      <PaperPlaneTilt className="w-4 h-4" />
                      Enviar invitación
                    </>
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
