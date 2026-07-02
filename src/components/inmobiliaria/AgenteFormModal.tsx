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
  PaperPlaneTilt,
  Briefcase,
} from '@phosphor-icons/react';
import { Button, Input, Textarea } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { IconButton, RadioCardGroup, RadioCard } from '@leasefy/cadence';
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
    if (showAgentFields && agentRole === 'agent' && (commissionSplit < 0 || commissionSplit > 100)) newErrors.commissionSplit = t('inmobiliaria.agente.errorCommissionRange');
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
        if (agentRole === 'agent') invite.commissionSplit = commissionSplit;
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

  // --- Error border for Cadence Input (skin comes from the adapter) ---
  const errorCls = (hasError: boolean) => (hasError ? 'border-danger focus-visible:ring-danger/30' : undefined);

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
              className="pointer-events-auto w-full max-w-lg bg-card rounded-xl flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-fg-muted" weight="duotone" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      {variant === 'agent' ? t('inmobiliaria.agente.newAgent') : 'Invitar usuario'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {variant === 'agent'
                        ? t('inmobiliaria.agente.newAgentDescription')
                        : 'Envía una invitación por correo para unirse a tu agencia.'}
                    </p>
                  </div>
                </div>
                <IconButton
                  variant="ghost"
                  size="sm"
                  icon={<X className="w-5 h-5" />}
                  onClick={handleClose}
                  disabled={isFormLoading}
                  aria-label={t('inmobiliaria.agente.cancel')}
                />
              </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-5">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    {t('inmobiliaria.agente.fullName')} *
                  </label>
                  <Input type="text" value={name} onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => { const n = { ...p }; delete n.name; return n; }); }} placeholder="Juan Perez" className={errorCls(!!errors.name)} />
                  {errors.name && <p className="text-xs text-danger">{errors.name}</p>}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Envelope className="w-4 h-4 text-muted-foreground" />
                    Email *
                  </label>
                  <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => { const n = { ...p }; delete n.email; return n; }); }} placeholder="juan@inmobiliaria.com" className={errorCls(!!errors.email)} />
                  {errors.email && <p className="text-xs text-danger">{errors.email}</p>}
                </div>

                {/* Phone — always for agent, shown for member when agente */}
                {(variant === 'agent' || showAgentFields) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      {t('inmobiliaria.agente.phone')} {showAgentFields ? '*' : ''}
                    </label>
                    <Input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); if (errors.phone) setErrors((p) => { const n = { ...p }; delete n.phone; return n; }); }} placeholder="+57 300 123 4567" className={errorCls(!!errors.phone)} />
                    {errors.phone && <p className="text-xs text-danger">{errors.phone}</p>}
                  </div>
                )}

                {/* Position / Cargo — member variant only */}
                {variant === 'member' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      Cargo
                    </label>
                    <Input type="text" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Ej: Agente Senior, Administrador General" maxLength={100} />
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
                      <RadioCardGroup
                        className="grid grid-cols-3 gap-2"
                        value={agentRole}
                        onValueChange={(v) => setAgentRole(v as AgenteRole)}
                      >
                        {AGENT_ROLE_OPTIONS.map((opt) => (
                          <RadioCard
                            key={opt.value}
                            value={opt.value}
                            label={opt.label}
                            description={opt.description}
                          />
                        ))}
                      </RadioCardGroup>
                    </div>

                    {/* Zone + Specialization — disabled until backend supports them */}
                    <div className="grid grid-cols-2 gap-4 opacity-50 pointer-events-none select-none">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          {t('inmobiliaria.agente.zone')}
                        </label>
                        <Select disabled value={zone || undefined} onValueChange={setZone}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('inmobiliaria.agente.selectZone')} />
                          </SelectTrigger>
                          <SelectContent>
                            {ZONE_OPTIONS.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Buildings className="w-4 h-4 text-muted-foreground" />
                          {t('inmobiliaria.agente.specialization')}
                        </label>
                        <Select disabled value={specialization} onValueChange={(v) => setSpecialization(v as typeof specialization)}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SPECIALIZATION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Commission — solo para agentes, no para coordinator/director */}
                    {agentRole === 'agent' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Percent className="w-4 h-4 text-muted-foreground" />
                          {t('inmobiliaria.agente.commissionPercentage')}
                        </label>
                        <div className="flex items-center gap-4">
                          <Slider
                            min={0}
                            max={100}
                            step={1}
                            value={[commissionSplit]}
                            onValueChange={([v]) => setCommissionSplit(v)}
                            className="flex-1"
                            aria-label={t('inmobiliaria.agente.commissionPercentage')}
                          />
                          <div className="relative w-20">
                            <Input type="number" min={0} max={100} value={commissionSplit} onChange={(e) => setCommissionSplit(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))} className="pr-7 text-center font-mono tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">%</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{t('inmobiliaria.agente.commissionPercentageDesc')}</p>
                        {errors.commissionSplit && <p className="text-xs text-danger">{errors.commissionSplit}</p>}
                      </div>
                    )}
                  </>
                )}

                {/* Message — member variant only */}
                {variant === 'member' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Mensaje personalizado (opcional)</label>
                    <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Agrega un mensaje para el invitado..." rows={3} className="resize-none" />
                  </div>
                )}
              </form>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 p-6 border-t border-border">
                <Button type="button" variant="secondary" hideArrow onClick={handleClose} disabled={isFormLoading}>
                  {t('inmobiliaria.agente.cancel')}
                </Button>
                <Button type="submit" hideArrow onClick={handleSubmit} disabled={isFormLoading} isLoading={isFormLoading}>
                  {isFormLoading ? (
                    variant === 'agent' ? t('inmobiliaria.agente.creating') : 'Enviando...'
                  ) : variant === 'agent' ? (
                    t('inmobiliaria.agente.createAgent')
                  ) : (
                    <>
                      <PaperPlaneTilt className="w-4 h-4" />
                      Enviar invitación
                    </>
                  )}
                </Button>
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
