'use client';

import { useState, useCallback, useId } from 'react';
import {
  User,
  Envelope,
  MapPin,
  Percent,
  Buildings,
  UserCircle,
  PaperPlaneTilt,
} from '@phosphor-icons/react';
import { Button, Input, Textarea } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { Banner, Presence, RadioCardGroup, RadioCard } from '@leasefy/cadence';
import { useI18n } from '@/lib/i18n';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { leerElError } from '@/lib/conexion/leer-el-error';
import { CODIGO_LIMITE_DEL_PLAN } from '@/lib/errores/codigos-del-plan';
import {
  MAX_LARGO_NOMBRE_DEL_INVITADO,
  MENSAJES_DE_LA_INMOBILIARIA,
} from '@/lib/configuracion/limites-de-la-inmobiliaria';
import type { AgenteRole, AgencyRole, UserInvite } from '@/lib/types/inmobiliaria';
import { getRoleLabel, ROLES_DEL_SISTEMA } from '@/lib/types/inmobiliaria';

/**
 * Unified modal for creating agents AND inviting users.
 *
 * - variant='agent'  → from /panel/inmobiliaria/configuracion/equipo: role locked to agente, agent fields only
 * - variant='member' → from /panel/inmobiliaria/configuracion: role selector, agent fields shown when role='agente'
 *
 * Both submit a UserInvite object to the same endpoint (POST /inmobiliaria/agency/members).
 */
interface AgenteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Tiene que RECHAZAR si el back no guardó la invitación: el modal se queda
   * abierto con lo escrito y dice qué pasó (por campo si el 400 trae `campos`).
   */
  onSubmit: (data: UserInvite) => Promise<void> | void;
  /** 'agent' = agent-only (default), 'member' = full invite with role selector */
  variant?: 'agent' | 'member';
  isLoading?: boolean;
}

/**
 * Los campos del formulario que pueden traer un error del servidor.
 *
 * 02-10-2026 · Sin teléfono: el modal lo pedía (obligatorio para un asesor) y
 * NUNCA se guardaba. `InviteMemberDto` no tiene `phone`, `inviteUser` lo
 * quitaba del cuerpo antes de mandarlo y la fila del equipo muestra el
 * teléfono del USUARIO (su perfil), no uno escrito al invitar. Se le pedía a
 * la persona un dato que se tiraba a la basura.
 */
type CampoDelFormulario = 'name' | 'email' | 'zone' | 'commissionSplit';
const CAMPOS_DEL_FORMULARIO: readonly CampoDelFormulario[] = ['name', 'email', 'zone', 'commissionSplit'];

/** Dónde se ven y se cambian los planes (el 402 del tope de asesores). */
const PAGINA_DE_LOS_PLANES = '/panel/inmobiliaria/upgrade';

// Colombian departments grouped by natural region.
const ZONE_GROUPS: { label: string; zones: string[] }[] = [
  {
    label: 'Andina',
    zones: [
      'Bogotá D.C.', 'Antioquia', 'Boyacá', 'Caldas', 'Cundinamarca', 'Huila',
      'Norte de Santander', 'Quindío', 'Risaralda', 'Santander', 'Tolima',
    ],
  },
  {
    label: 'Caribe',
    zones: [
      'Atlántico', 'Bolívar', 'Cesar', 'Córdoba', 'La Guajira', 'Magdalena',
      'Sucre', 'San Andrés y Providencia',
    ],
  },
  {
    label: 'Pacífica',
    zones: ['Cauca', 'Chocó', 'Nariño', 'Valle del Cauca'],
  },
  {
    label: 'Orinoquía',
    zones: ['Arauca', 'Casanare', 'Meta', 'Vichada'],
  },
  {
    label: 'Amazonía',
    zones: ['Amazonas', 'Caquetá', 'Guainía', 'Guaviare', 'Putumayo', 'Vaupés'],
  },
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
  // Lo que el servidor dijo y no va en ningún campo (un 409, un 5xx, la red).
  // El texto se conserva al ocultarlo: el aviso sale diciendo lo último que
  // dijo, no vacío.
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [verErrorGeneral, setVerErrorGeneral] = useState(false);
  // El 402 del tope de asesores del plan: se dice acá, con «Ver planes».
  const [topeDelPlan, setTopeDelPlan] = useState(false);
  // El pie vive FUERA del <form> (el DialogContent lo saca al pie fijo): el
  // botón de enviar lo apunta con `form=`.
  const idDelFormulario = useId();

  // Shared fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [systemRole, setSystemRole] = useState<AgencyRole>(variant === 'agent' ? 'agente' : 'agente');

  // Agent-specific fields
  const [agentRole, setAgentRole] = useState<AgenteRole>('agent');
  const [zone, setZone] = useState('');
  const [specialization, setSpecialization] = useState<'apartment' | 'house' | 'studio' | 'room' | 'all'>('all');
  const [commissionSplit, setCommissionSplit] = useState(50);

  // Member-only fields
  const [message, setMessage] = useState('');

  const showAgentFields = variant === 'agent' || systemRole === 'agente';

  // Director is not selectable yet — only Agente and Coordinador are enabled for
  // now. The option stays visible (disabled) so the hierarchy is discoverable.
  const AGENT_ROLE_OPTIONS: { value: AgenteRole; label: string; description: string; disabled?: boolean }[] = [
    { value: 'agent', label: t('inmobiliaria.agente.roleAgent'), description: t('inmobiliaria.agente.roleAgentDesc') },
    { value: 'coordinator', label: t('inmobiliaria.agente.roleCoordinator'), description: t('inmobiliaria.agente.roleCoordinatorDesc') },
    { value: 'director', label: t('inmobiliaria.agente.roleDirector'), description: t('inmobiliaria.agente.roleDirectorDesc'), disabled: true },
  ];

  /*
   * 🔴 QA 22-09: esta lista existía y NUNCA se pintaba, así que invitar desde
   * «Miembros y roles» siempre creaba un AGENTE (para tener un contador había
   * que invitarlo como agente y después cambiarle el rol). Ahora se pinta en
   * la variante `member`, con los siete roles del back y los nombres de la
   * tabla del equipo.
   */
  const SYSTEM_ROLE_OPTIONS: { value: AgencyRole; label: string }[] = ROLES_DEL_SISTEMA.map((value) => ({
    value,
    label: getRoleLabel(value),
  }));

  // Specialization by property type (matches the PropertyType enum) + "Todos".
  const SPECIALIZATION_OPTIONS = [
    { value: 'apartment', label: 'Apartamento' },
    { value: 'house', label: 'Casa' },
    { value: 'studio', label: 'Estudio' },
    { value: 'room', label: 'Habitación' },
    { value: 'all', label: 'Todos' },
  ];

  const resetForm = useCallback(() => {
    setName(''); setEmail('');
    setSystemRole(variant === 'agent' ? 'agente' : 'agente');
    setAgentRole('agent'); setZone(''); setSpecialization('all');
    setCommissionSplit(50); setMessage('');
    setErrors({}); setErrorGeneral(null); setVerErrorGeneral(false); setTopeDelPlan(false);
  }, [variant]);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t('inmobiliaria.agente.errorNameRequired');
    else if (name.trim().length > MAX_LARGO_NOMBRE_DEL_INVITADO) newErrors.name = MENSAJES_DE_LA_INMOBILIARIA.nombreDelInvitadoLargo;
    if (!email.trim()) newErrors.email = t('inmobiliaria.agente.errorEmailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = t('inmobiliaria.agente.errorEmailInvalid');
    if (showAgentFields && agentRole === 'agent' && (commissionSplit < 0 || commissionSplit > 100)) newErrors.commissionSplit = t('inmobiliaria.agente.errorCommissionRange');
    setErrors(newErrors);
    const primero = CAMPOS_DEL_FORMULARIO.find((c) => newErrors[c]);
    if (primero) requestAnimationFrame(() => document.getElementById(`${idDelFormulario}-${primero}`)?.focus());
    return Object.keys(newErrors).length === 0;
  }, [name, email, commissionSplit, showAgentFields, t, idDelFormulario, agentRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setVerErrorGeneral(false);
    try {
      const invite: UserInvite = {
        email,
        name,
        role: variant === 'agent' ? 'agente' : systemRole,
      };

      if (variant === 'member') {
        invite.message = message || undefined;
      }

      if (showAgentFields) {
        invite.zone = zone || undefined;
        invite.specialization = specialization.toUpperCase() as UserInvite['specialization'];
        if (agentRole === 'agent') invite.commissionSplit = commissionSplit;
        invite.agentRole = agentRole.toUpperCase() as UserInvite['agentRole'];
      }

      await onSubmit(invite);
      resetForm();
      onClose();
    } catch (error) {
      // 🔴 Antes: `console.error` y nada. SeccionEquipo se tragaba el error,
      // el modal se cerraba y se perdía lo escrito. Ahora se queda abierto,
      // cada error del 400 va a su campo (con el foco en el primero) y lo
      // demás se dice acá arriba del pie, por el traductor.
      const reparto = repartirErroresDelServidor(error, {
        campos: CAMPOS_DEL_FORMULARIO,
        porDefecto: 'No pudimos enviar la invitación. Prueba de nuevo en un momento.',
        accion: 'enviar la invitación',
      });
      const leido = leerElError(error);
      const porCampo: Partial<Record<CampoDelFormulario, string>> = { ...reparto.porCampo };
      let orden: CampoDelFormulario[] = reparto.orden;
      let sueltos = reparto.sueltos;
      /*
       * 🔴 03-10 (pruebas en el navegador): los tres 409 de invitar son del
       * CORREO —ya es miembro activo, ya tiene una invitación pendiente o es de
       * otra inmobiliaria (`AgencyService.inviteMember`)— y llegan sin `campos`.
       * Iban al aviso de abajo, que en un portátil queda fuera de la vista del
       * cuerpo del diálogo: la persona apretaba «Enviar invitación» y no veía
       * nada. Van bajo «Email», con el foco ahí.
       */
      if (leido.status === 409 && orden.length === 0 && sueltos.length > 0) {
        porCampo.email = sueltos.join(' · ');
        orden = ['email'];
        sueltos = [];
      }
      setErrors((prev) => ({ ...prev, ...porCampo }));
      const general = sueltos.length > 0 ? sueltos.join(' · ') : null;
      if (general) setErrorGeneral(general);
      setVerErrorGeneral(!!general);
      setTopeDelPlan(leido.code === CODIGO_LIMITE_DEL_PLAN);
      const primero = orden[0];
      if (primero) requestAnimationFrame(() => document.getElementById(`${idDelFormulario}-${primero}`)?.focus());
      // Lo que no tiene campo se dice abajo, pegado al pie: se trae a la vista
      // (el cuerpo del diálogo se desplaza y el aviso podía quedar escondido).
      else if (general) {
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            document
              .getElementById(idDelFormulario)
              ?.querySelector<HTMLElement>('[data-testid="invitacion-error"]')
              ?.scrollIntoView?.({ block: 'nearest' }),
          ),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => { if (!isSubmitting) onClose(); };

  const isFormLoading = isSubmitting || isLoading;

  // --- Error border for Cadence Input (skin comes from the adapter) ---
  const errorCls = (hasError: boolean) => (hasError ? 'border-danger focus-visible:ring-danger/30' : undefined);

  /*
   * El `Dialog` de la plataforma (DESIGN.md §17). Era un portal a mano con su
   * capa, su ✕ y su bloqueo del scroll del body, sin Esc ni foco atrapado.
   *
   * Las capas: el `Dialog` vive en z-[300] y las listas de los `Select` de
   * este formulario (Rol, Zona, Especialización) abren en su propio portal
   * en z-[400] (`components/ui/select.tsx`): quedan ENCIMA del modal. Con la
   * escala vieja (`z-modal` = 50) el modal tenía que bajarse para no taparlas.
   */
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(abierto) => {
        // Mientras se envía no se sale (ni con Esc, ni con el velo, ni con la ✕).
        if (!abierto && !isFormLoading) handleClose();
      }}
    >
      <DialogContent size="md" icon={<UserCircle weight="bold" />}>
        <DialogHeader>
          <DialogTitle>
            {variant === 'agent' ? t('inmobiliaria.agente.newAgent') : 'Invitar usuario'}
          </DialogTitle>
          <DialogDescription>
            {variant === 'agent'
              ? t('inmobiliaria.agente.newAgentDescription')
              : 'Envía una invitación por correo para unirse a tu agencia.'}
          </DialogDescription>
        </DialogHeader>

        <form id={idDelFormulario} onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <label htmlFor={`${idDelFormulario}-name`} className="text-sm font-medium text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              {t('inmobiliaria.agente.fullName')} *
            </label>
            <Input id={`${idDelFormulario}-name`} aria-invalid={!!errors.name || undefined} aria-describedby={`${idDelFormulario}-name-error`} maxLength={MAX_LARGO_NOMBRE_DEL_INVITADO} type="text" value={name} onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => { const n = { ...p }; delete n.name; return n; }); }} placeholder="Juan Perez" className={errorCls(!!errors.name)} />
            <ErrorDelCampo id={`${idDelFormulario}-name-error`} mensaje={errors.name} className="mt-0" />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label htmlFor={`${idDelFormulario}-email`} className="text-sm font-medium text-foreground flex items-center gap-2">
              <Envelope className="w-4 h-4 text-muted-foreground" />
              Email *
            </label>
            <Input id={`${idDelFormulario}-email`} aria-invalid={!!errors.email || undefined} aria-describedby={`${idDelFormulario}-email-error`} type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => { const n = { ...p }; delete n.email; return n; }); }} placeholder="juan@inmobiliaria.com" className={errorCls(!!errors.email)} />
            <ErrorDelCampo id={`${idDelFormulario}-email-error`} mensaje={errors.email} className="mt-0" />
          </div>

          {/* Rol del sistema — sólo al invitar un miembro */}
          {variant === 'member' && (
            <div className="space-y-2">
              <label htmlFor="rol-del-sistema" className="text-sm font-medium text-foreground">
                Rol *
              </label>
              <Select value={systemRole} onValueChange={(v) => setSystemRole(v as AgencyRole)}>
                <SelectTrigger id="rol-del-sistema" data-testid="rol-del-sistema">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYSTEM_ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                      disabled={opt.disabled}
                    />
                  ))}
                </RadioCardGroup>
              </div>

              {/* Zone + Specialization — persisted on the AgencyMember (backend
                  InviteMemberDto supports zone + specialization). */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {t('inmobiliaria.agente.zone')}
                  </label>
                  <Select value={zone || undefined} onValueChange={(v) => { setZone(v); if (errors.zone) setErrors((p) => { const n = { ...p }; delete n.zone; return n; }); }}>
                    <SelectTrigger id={`${idDelFormulario}-zone`} aria-invalid={!!errors.zone || undefined} aria-describedby={`${idDelFormulario}-zone-error`} className="w-full">
                      <SelectValue placeholder={t('inmobiliaria.agente.selectZone')} />
                    </SelectTrigger>
                    <SelectContent>
                      {ZONE_GROUPS.map((g) => (
                        <SelectGroup key={g.label}>
                          <SelectLabel>{g.label}</SelectLabel>
                          {g.zones.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <ErrorDelCampo id={`${idDelFormulario}-zone-error`} mensaje={errors.zone} className="mt-0" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Buildings className="w-4 h-4 text-muted-foreground" />
                    {t('inmobiliaria.agente.specialization')}
                  </label>
                  <Select value={specialization} onValueChange={(v) => setSpecialization(v as typeof specialization)}>
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
                      <Input id={`${idDelFormulario}-commissionSplit`} aria-invalid={!!errors.commissionSplit || undefined} aria-describedby={`${idDelFormulario}-commissionSplit-error`} type="number" min={0} max={100} value={commissionSplit} onChange={(e) => setCommissionSplit(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))} className="pr-7 text-center font-mono tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">%</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.agente.commissionPercentageDesc')}</p>
                  <ErrorDelCampo id={`${idDelFormulario}-commissionSplit-error`} mensaje={errors.commissionSplit} className="mt-0" />
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

          {/* Lo que el servidor dijo y no va en ningún campo. Entra suave
              (Presence de Cadence: transform/opacity, movimiento reducido). */}
          <Presence show={verErrorGeneral}>
            <Banner variant="danger" role="alert" data-testid="invitacion-error">
              {errorGeneral}
              {topeDelPlan && (
                <>
                  {' '}
                  <Link href={PAGINA_DE_LOS_PLANES} className="font-medium underline underline-offset-2">
                    Ver planes
                  </Link>
                </>
              )}
            </Banner>
          </Presence>
        </form>

        <DialogFooter>
          <Button type="button" variant="secondary" hideArrow onClick={handleClose} disabled={isFormLoading}>
            {t('inmobiliaria.agente.cancel')}
          </Button>
          <Button type="submit" form={idDelFormulario} hideArrow disabled={isFormLoading} isLoading={isFormLoading}>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AgenteFormModal;
