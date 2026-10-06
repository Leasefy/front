'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { User, Envelope, Phone, MapPin, Shield, Camera, FloppyDisk, CheckCircle, WarningCircle, Briefcase, UserPlus, TrashSimple, Pencil, Upload, Buildings } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import { AgenteHorarioVisitas } from '@/components/inmobiliaria/AgenteHorarioVisitas';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { useI18n } from '@/lib/i18n';
import { Button, Input, Spinner } from '@/components/ui';
import { AnimatedNumber, CrossFade, IconButton, motionDuration, motionEase } from '@leasefy/cadence';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import {
  enfocarCampoPersonal,
  idDelCampoPersonal,
  revisarDatosPersonales,
  type CampoPersonal,
  type ErroresPersonales,
} from '@/lib/perfil/datos-personales';
import { usePermissionsContext } from '@/lib/context/PermissionsContext';
import { settingsApi } from '@/lib/api/settings.service';
import { accountDeletionCopy } from '@/lib/account-deletion/copy';

// Setup steps definition
interface SetupStep {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
  action?: string;
}

import {
  datosDelUsuario,
  oNulo,
  type DatosDelPerfil,
} from './datos-del-perfil';

type EditingSection = 'avatar' | 'personal' | 'emergency' | null;

// 🔴 `DatosDelPerfil`, `datosDelUsuario` y `oNulo` viven en
// `datos-del-perfil.ts`: un archivo de página no puede exportar nada fuera del
// juego que Next admite, y estaban exportados para poder probarlos.

const AGENCY_ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  AGENTE: 'Asesor comercial',
  CONTADOR: 'Contador',
  VIEWER: 'Visualizador',
  // O-05 (18-09-2026): los tres roles nuevos.
  COORDINADOR: 'Coordinador',
  AUXILIAR_CARTERA: 'Auxiliar de cartera',
  ABOGADO_EXTERNO: 'Abogado externo',
};

const AGENCY_ROLE_DESC: Record<string, string> = {
  ADMIN: 'Acceso completo',
  AGENTE: 'Gestión de propiedades y pipeline',
  CONTADOR: 'Acceso financiero y contable',
  VIEWER: 'Solo lectura',
  COORDINADOR: 'Ve el equipo y reasigna. No mueve plata.',
  AUXILIAR_CARTERA: 'Hace recibos. No anula ni condona.',
  ABOGADO_EXTERNO: 'Sólo sus casos jurídicos.',
};

/** Prefijo de los `id` de los campos de esta pantalla (foco y `aria-describedby`). */
const PREFIJO_DEL_PERFIL = 'perfil-inmobiliaria';
const CAMPOS_PERSONALES_VISIBLES: readonly CampoPersonal[] = ['firstName', 'lastName', 'phone', 'address'];
const CAMPOS_DE_EMERGENCIA: readonly CampoPersonal[] = ['emergencyContactName', 'emergencyContactPhone'];

export default function InmobiliariaPerfilPage() {
  const { t, locale } = useI18n();
  const { user, agency, updateProfile, logout } = useAuth();
  /*
   * El rol sale del contexto, no de una llamada propia.
   *
   * Esta pantalla pedía `GET /users/me/permissions` por su cuenta y se comía el
   * fallo con un `.catch(() => {})` sin cancelación: el mismo pedido que
   * `PermissionsProvider` ya hizo para todo el panel, repetido en cada visita
   * al perfil, y con un `setState` que podía llegar después del desmontaje.
   */
  const { agencyRole: memberRole } = usePermissionsContext();
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Avatar upload state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state — sourced from auth context, no mock data
  const [formData, setFormData] = useState<DatosDelPerfil>(() => datosDelUsuario(user));
  /** El error de cada campo: del cliente (las reglas del back) o del back. */
  const [errores, setErrores] = useState<ErroresPersonales>({});

  /*
   * El formulario sigue al usuario del contexto mientras NO se esté editando.
   *
   * Sin esto, `formData` era una foto del primer render: si `/users/me`
   * resolvía después de montar —o si otra pantalla actualizaba el perfil— la
   * ficha seguía mostrando lo viejo, y como la vista de lectura pinta
   * `formData`, la pantalla afirmaba datos que ya no eran los guardados.
   * Mientras hay una sección abierta no se toca: pisaría lo que la persona
   * está escribiendo.
   */
  const usuarioGuardado = JSON.stringify(datosDelUsuario(user));
  useEffect(() => {
    if (editingSection !== null) return;
    setFormData(JSON.parse(usuarioGuardado) as DatosDelPerfil);
  }, [usuarioGuardado, editingSection]);

  // Setup steps derived from data the user has ACTUALLY provided — never
  // hardcoded. There is no phone/identity verification system in the backend,
  // so no "verify X" steps are shown.
  const setupSteps: SetupStep[] = [
    {
      id: 'basic-info',
      label: locale === 'es' ? 'Información básica' : 'Basic information',
      description: locale === 'es' ? 'Nombre y apellido' : 'First and last name',
      icon: User,
      completed: !!(user?.firstName && user?.lastName),
    },
    {
      id: 'phone',
      label: locale === 'es' ? 'Teléfono' : 'Phone',
      description: locale === 'es' ? 'Agrega tu número de teléfono' : 'Add your phone number',
      icon: Phone,
      completed: !!user?.phone,
    },
    {
      id: 'address',
      label: locale === 'es' ? 'Dirección' : 'Address',
      description: locale === 'es' ? 'Agrega tu dirección' : 'Add your address',
      icon: MapPin,
      completed: !!user?.address,
    },
    {
      id: 'agency-info',
      label: locale === 'es' ? 'Datos de la agencia' : 'Agency details',
      description: locale === 'es' ? 'Completa el NIT de tu inmobiliaria' : 'Complete your agency tax ID',
      icon: Buildings,
      completed: !!(agency?.name && agency?.nit),
    },
    {
      id: 'emergency-contact',
      label: locale === 'es' ? 'Contacto de emergencia' : 'Emergency contact',
      description: locale === 'es' ? 'Agrega un contacto de emergencia' : 'Add an emergency contact',
      icon: UserPlus,
      completed: !!(user?.emergencyContactName && user?.emergencyContactPhone),
    },
  ];

  const completedSteps = setupSteps.filter(s => s.completed).length;
  const totalSteps = setupSteps.length;
  const completionPercentage = Math.round((completedSteps / totalSteps) * 100);

  // Real verification signal: Supabase email confirmation (exposed by the auth
  // context). There is no phone/identity/agency verification system in the
  // backend, so no other badge is shown.
  const emailVerified = !!user?.emailConfirmedAt;

  const handleInputChange = (field: CampoPersonal, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrores(prev => {
      if (prev[field] === undefined) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  /** Las props de accesibilidad de un campo con su error debajo. */
  const propsDelCampo = (campo: CampoPersonal) => ({
    id: idDelCampoPersonal(PREFIJO_DEL_PERFIL, campo),
    'aria-invalid': errores[campo] ? true : undefined,
    'aria-describedby': errores[campo] ? `${idDelCampoPersonal(PREFIJO_DEL_PERFIL, campo)}-error` : undefined,
  });
  const errorDelCampo = (campo: CampoPersonal) => (
    <ErrorDelCampo id={`${idDelCampoPersonal(PREFIJO_DEL_PERFIL, campo)}-error`} mensaje={errores[campo]} />
  );

  /*
   * 🔴 La foto guardada sale del usuario, no de esta sesión.
   *
   * Arrancaba en `null` y sólo se llenaba tras una subida exitosa: al recargar
   * la página, la foto que la persona YA había subido desaparecía y la ficha
   * volvía a la inicial del nombre. El backend la devuelve en `avatarUrl`
   * (`GET /users/me`) y el contexto la expone como `user.avatar`.
   */
  const [avatarSubido, setAvatarSubido] = useState<string | null>(null);
  const savedAvatar = avatarSubido ?? user?.avatar ?? null;

  const handleSave = async (section: EditingSection) => {
    const datos =
      section === 'personal'
        ? {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            phone: oNulo(formData.phone),
            address: oNulo(formData.address),
            birthDate: oNulo(formData.birthDate),
          }
        : section === 'emergency'
          ? {
              emergencyContactName: oNulo(formData.emergencyContactName),
              emergencyContactPhone: oNulo(formData.emergencyContactPhone),
            }
          : null;

    // Los campos que la sección MUESTRA: la fecha de nacimiento viaja (es la
    // guardada) pero no tiene campo acá, así que su error va al toast.
    const visibles: readonly CampoPersonal[] =
      section === 'personal' ? CAMPOS_PERSONALES_VISIBLES : section === 'emergency' ? CAMPOS_DE_EMERGENCIA : [];

    // Lo que el back rechazaría no sale: las mismas reglas y frases del DTO.
    if (datos) {
      const delCliente = revisarDatosPersonales(datos);
      const conError = (Object.keys(datos) as CampoPersonal[]).filter((c) => delCliente[c] !== undefined);
      if (conError.length > 0) {
        const enCampo = conError.filter((c) => visibles.includes(c));
        setErrores(Object.fromEntries(enCampo.map((c) => [c, delCliente[c]])));
        enfocarCampoPersonal(PREFIJO_DEL_PERFIL, enCampo[0]);
        const sinCampo = conError.filter((c) => !visibles.includes(c)).map((c) => delCliente[c]);
        if (sinCampo.length > 0) toast.error(sinCampo.join(' · '));
        return;
      }
    }

    setIsSaving(true);
    try {
      if (section === 'avatar' && avatarFile) {
        const { url } = await settingsApi.uploadAvatar(avatarFile);
        setAvatarSubido(url);
        setAvatarFile(null);
      } else if (datos) {
        await updateProfile(datos);
      }
      setErrores({});
      setEditingSection(null);
      toast.success(locale === 'es' ? 'Cambios guardados' : 'Changes saved');
    } catch (err) {
      // El backend dice EXACTAMENTE qué pasó —«Solo se permiten imagenes JPG,
      // PNG o WebP», el formato del celular— y eso es lo único que le dice a
      // la persona qué corregir. 02-10-2026: por el traductor, con la regla de
      // oro. Lo que trae campo va debajo de SU campo; al toast, sólo lo suelto
      // (un 5xx dice que fue nuestro y da la referencia; «conexión», sólo sin
      // respuesta). Antes era `err.message` crudo.
      const reparto = repartirErroresDelServidor<CampoPersonal>(err, {
        campos: visibles,
        accion: section === 'avatar' ? 'subir tu foto' : 'guardar tu perfil',
        porDefecto: locale === 'es' ? 'No pudimos guardar los cambios. Prueba de nuevo en un momento.' : 'Error saving changes',
      });
      setErrores(reparto.porCampo);
      enfocarCampoPersonal(PREFIJO_DEL_PERFIL, reparto.orden[0]);
      if (reparto.sueltos.length > 0) toast.error(reparto.sueltos.join(' · '));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setAvatarPreview(null);
    setAvatarFile(null);
    // Cancelar descarta: el formulario vuelve a lo que está guardado. Sin esta
    // línea lo tipeado sobrevivía en `formData` —que es lo que pinta la vista
    // de lectura— y el siguiente «Guardar» lo mandaba al backend.
    setFormData(datosDelUsuario(user));
    setErrores({});
  };

  // Avatar upload handlers
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    // Los mismos tres de `accept` y de `UsersService.AVATAR_ALLOWED_MIME_TYPES`:
    // arrastrar un HEIC esquiva el selector, y el rechazo tiene que llegar acá
    // y no como un 400 después de apretar Guardar.
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(
        locale === 'es'
          ? 'Solo se permiten imágenes JPG, PNG o WebP'
          : 'Only JPG, PNG or WebP images are allowed',
      );
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(locale === 'es' ? 'La imagen debe ser menor a 5MB' : 'Image must be less than 5MB');
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenDeleteModal = () => {
    setShowDeleteModal(true);
    setDeleteStep(1);
    setDeleteConfirmText('');
  };

  // El paso y la palabra se reinician al ABRIR (arriba), no al cerrar: el
  // Dialog sale con su animación y, si se reiniciaran acá, el paso 2 se
  // convertiría en el 1 mientras se desvanece.
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setIsDeleting(false);
  };

  /*
   * Escape, la ✕ y el velo los maneja el `Dialog`. No se sale mientras se
   * borra (la petición ya salió) ni en la despedida (cierra la sesión sola).
   */
  const sePuedeCerrarLaBaja = !isDeleting && deleteStep !== 3;
  const alCambiarModalDeBaja = (abierto: boolean) => {
    if (!abierto && sePuedeCerrarLaBaja) handleCloseDeleteModal();
  };

  // Canonical deletion strings (single source of truth for all five flows).
  const deletionCopy = accountDeletionCopy(locale);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== deletionCopy.confirmWord) return;

    setIsDeleting(true);
    try {
      await settingsApi.deleteAccount();
      setDeleteStep(3);
      toast.success(deletionCopy.successToast);
      // Let the user read the goodbye screen + toast (same pattern as the
      // tenant/landlord flows), THEN sign out and leave the panel.
      setTimeout(() => {
        // Right-to-erasure: actually sign out and leave the panel.
        void logout().finally(() => {
          window.location.replace('/auth');
        });
      }, 2000);
    } catch (err) {
      // Surface the backend's reason (e.g. 403: active leases /
      // last-agency-admin, in Spanish) instead of a generic message.
      toast.error(
        mensajeParaLaPersona(err, {
          porDefecto: deletionCopy.errorFallback,
          accion: 'eliminar tu cuenta',
        }),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Shared field shells (DS tokens, rounded-md)
  const fieldDisplay = 'flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-md';

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-h2 text-fg">
            {locale === 'es' ? 'Mi perfil' : 'My profile'}
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl line-clamp-2">
            {locale === 'es' ? 'Gestiona tu información personal y preferencias' : 'Manage your personal information and preferences'}
          </p>
        </div>

        {/* Setup Progress Section — hidden once the profile is 100% complete */}
        {completionPercentage < 100 && (
        <section className="rounded-lg bg-primary-soft border border-border p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Progress Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-card flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" weight="duotone" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-fg">
                    {locale === 'es' ? 'Completar perfil' : 'Complete profile'}
                  </h2>
                  <p className="text-sm text-primary">
                    {locale === 'es'
                      ? `${completedSteps} de ${totalSteps} pasos completados`
                      : `${completedSteps} of ${totalSteps} steps completed`}
                  </p>
                </div>
              </div>
              <div className="h-2 bg-card/60 rounded-full overflow-hidden">
                {/* Avanza con `translateX` (sólo transform; el extremo redondo
                    no se deforma como con `scaleX`), con la curva del sistema. */}
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: `${completionPercentage - 100}%` }}
                  transition={{ duration: motionDuration.reveal, ease: motionEase.enter }}
                  className="h-full w-full bg-primary rounded-full"
                />
              </div>
              <p className="text-xs text-fg-muted mt-2">
                {completionPercentage === 100
                  ? (locale === 'es' ? '¡Perfil completo! Tienes acceso a todas las funciones.' : 'Profile complete! You have access to all features.')
                  : (locale === 'es' ? 'Completa tu perfil para acceder a todas las funciones' : 'Complete your profile to access all features')}
              </p>
            </div>

            {/* Percentage Badge */}
            <div className="flex items-center justify-center">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-card"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="text-primary"
                    initial={{ strokeDasharray: '0 251.2' }}
                    animate={{ strokeDasharray: `${completionPercentage * 2.512} 251.2` }}
                    transition={{ duration: motionDuration.reveal, ease: motionEase.enter }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Cuenta junto con el anillo; si cambia, desde la anterior. */}
                  <AnimatedNumber
                    value={completionPercentage}
                    from={0}
                    format={(n) => `${Math.round(n)}%`}
                    className="text-2xl font-semibold tabular-nums text-fg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Steps List — iconography step pattern (DS, duotone icons) */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {setupSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={cn(
                    'rounded-lg p-4 transition-colors',
                    step.completed
                      ? 'bg-card'
                      : 'bg-card border border-dashed border-primary/30'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0',
                      step.completed
                        ? 'bg-success-soft text-success'
                        : 'bg-primary-soft text-primary'
                    )}>
                      {step.completed ? (
                        <CheckCircle className="w-4 h-4" weight="fill" />
                      ) : (
                        <Icon className="w-4 h-4" weight="duotone" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg truncate">
                        {step.label}
                      </p>
                      {step.completed ? (
                        <span className="text-xs text-success">{locale === 'es' ? 'Completado' : 'Completed'}</span>
                      ) : (
                        <span className="text-xs text-fg-muted">{locale === 'es' ? 'Pendiente' : 'Pending'}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        )}

        {/* Visit hours — each agent sets their own schedule for visits */}
        <AgenteHorarioVisitas self />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            {/* Avatar Card */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="relative bg-primary-soft h-28">
                {editingSection !== 'avatar' && (
                  <IconButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAvatarPreview(savedAvatar);
                      setEditingSection('avatar');
                    }}
                    aria-label={locale === 'es' ? 'Editar foto' : 'Edit photo'}
                    className="absolute top-3 right-3 bg-card/70 hover:bg-card backdrop-blur-sm text-fg"
                    icon={<Pencil className="w-4 h-4" />}
                  />
                )}
              </div>
              <div className="px-6 pb-6">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  // Exactamente los tres formatos que acepta
                  // `UsersService.uploadAvatar`. Con `image/*` el selector
                  // dejaba elegir un HEIC o un GIF y el backend contestaba 400
                  // recién al guardar.
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="relative -mt-14 mb-4">
                  <div
                    className={cn(
                      "w-28 h-28 rounded-full border-4 border-card overflow-hidden",
                      editingSection === 'avatar' && "cursor-pointer"
                    )}
                    onClick={editingSection === 'avatar' ? handleAvatarClick : undefined}
                  >
                    {(editingSection === 'avatar' ? avatarPreview : savedAvatar) ? (
                      <Image
                        src={(editingSection === 'avatar' ? avatarPreview : savedAvatar)!}
                        alt="Avatar"
                        width={112}
                        height={112}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-4xl">
                        {(formData.firstName || user?.email || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {editingSection === 'avatar' && (
                    <IconButton
                      variant="solid"
                      size="sm"
                      onClick={handleAvatarClick}
                      aria-label={locale === 'es' ? 'Cambiar foto' : 'Change photo'}
                      className="absolute bottom-1 right-1 bg-fg text-bg hover:opacity-90"
                      icon={<Camera className="w-4 h-4" />}
                    />
                  )}
                </div>

                {/* Avatar upload area when editing */}
                {editingSection === 'avatar' && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleAvatarClick}
                    className={cn(
                      "mb-4 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                      isDragging
                        ? "border-primary/40 bg-primary-soft"
                        : "border-border hover:border-primary/40 hover:bg-surface-muted"
                    )}
                  >
                    {avatarPreview ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                            <Image
                              src={avatarPreview}
                              alt="Preview"
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-fg">
                              {locale === 'es' ? 'Imagen seleccionada' : 'Image selected'}
                            </p>
                            <p className="text-xs text-fg-muted">
                              {locale === 'es' ? 'Haz clic para cambiar' : 'Click to change'}
                            </p>
                          </div>
                        </div>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAvatar();
                          }}
                          aria-label={locale === 'es' ? 'Quitar imagen' : 'Remove image'}
                          className="text-fg-muted hover:text-danger hover:bg-danger-soft"
                          icon={<TrashSimple className="w-4 h-4" />}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-md bg-surface-muted flex items-center justify-center mx-auto mb-3">
                          <Upload className="w-6 h-6 text-fg-muted" />
                        </div>
                        <p className="text-sm font-medium text-fg">
                          {isDragging
                            ? (locale === 'es' ? 'Suelta la imagen aquí' : 'Drop the image here')
                            : (locale === 'es' ? 'Subir foto de perfil' : 'Upload profile photo')}
                        </p>
                        <p className="text-xs text-fg-muted mt-1">
                          {locale === 'es' ? 'Arrastra o haz clic — JPG, PNG (máx. 5MB)' : 'Drag or click - JPG, PNG (max 5MB)'}
                        </p>
                      </>
                    )}
                  </div>
                )}

                <h2 className="text-base font-semibold text-fg">
                  {[formData.firstName, formData.lastName].filter(Boolean).join(' ') || user?.email || '—'}
                </h2>
                <p className="text-sm text-fg-muted mt-1">
                  {memberRole ? (AGENCY_ROLE_LABELS[memberRole] ?? memberRole) : '—'}
                </p>

                {/* Save/Cancel buttons for avatar section */}
                {editingSection === 'avatar' && (
                  <div className="flex items-center gap-2 mt-4">
                    <Button variant="secondary" size="sm" hideArrow className="flex-1 justify-center" onClick={handleCancelEdit}>
                      {locale === 'es' ? 'Cancelar' : 'Cancel'}
                    </Button>
                    <Button size="sm" hideArrow className="flex-1 justify-center" onClick={() => handleSave('avatar')} disabled={isSaving}>
                      {isSaving ? <Spinner size="sm" variant="current" /> : <FloppyDisk className="w-4 h-4" />}
                      {locale === 'es' ? 'Guardar' : 'Save'}
                    </Button>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="mt-6 pt-6 border-t border-border space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-success-soft flex items-center justify-center">
                      <Buildings className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-fg">
                        {memberRole ? `Rol: ${AGENCY_ROLE_LABELS[memberRole] ?? memberRole}` : '—'}
                      </p>
                      <p className="text-xs text-fg-muted">
                        {memberRole ? (AGENCY_ROLE_DESC[memberRole] ?? '') : ''}
                      </p>
                    </div>
                  </div>
                  {agency?.name && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-primary-soft flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-fg">{agency.name}</p>
                        <p className="text-xs text-fg-muted">
                          {agency.nit ? `NIT: ${agency.nit}` : (locale === 'es' ? 'Agencia actual' : 'Current agency')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Status Card — only real signals (Supabase email
                confirmation). There is no phone/identity/agency verification
                system in the backend, so nothing else is shown as verified. */}
            {emailVerified && (
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="text-base font-semibold text-fg mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-fg-muted" />
                  {locale === 'es' ? 'Estado de verificación' : 'Verification status'}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-md bg-surface-muted">
                    <span className="text-sm font-medium text-fg">Email</span>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-success bg-success-soft px-2.5 py-1 rounded-full">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {locale === 'es' ? 'Verificado' : 'Verified'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-semibold text-fg">
                  {locale === 'es' ? 'Información personal' : 'Personal information'}
                </h3>
                {/* «Editar» ⇄ «Cancelar / Guardar» se cruzan en su lugar. */}
                <CrossFade swapKey={editingSection === 'personal' ? 'editando' : 'viendo'} mode="popLayout">
                {editingSection !== 'personal' ? (
                  <Button variant="ghost" size="sm" hideArrow onClick={() => setEditingSection('personal')}>
                    <Pencil className="w-3.5 h-3.5" />
                    {locale === 'es' ? 'Editar' : 'Edit'}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" hideArrow onClick={handleCancelEdit}>
                      {locale === 'es' ? 'Cancelar' : 'Cancel'}
                    </Button>
                    <Button size="sm" hideArrow onClick={() => handleSave('personal')} disabled={isSaving}>
                      {isSaving ? <Spinner size="sm" variant="current" /> : <FloppyDisk className="w-3.5 h-3.5" />}
                      {locale === 'es' ? 'Guardar' : 'Save'}
                    </Button>
                  </div>
                )}
                </CrossFade>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-fg mb-2">
                    {locale === 'es' ? 'Nombre' : 'First name'}
                  </label>
                  {editingSection === 'personal' ? (
                    <>
                      <Input type="text" {...propsDelCampo('firstName')} value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} />
                      {errorDelCampo('firstName')}
                    </>
                  ) : (
                    <div className={fieldDisplay}>
                      <User className="w-4 h-4 text-fg-muted" />
                      <span className="text-sm text-fg">{formData.firstName || '—'}</span>
                    </div>
                  )}
                </div>

                {/* Apellido */}
                <div>
                  <label className="block text-sm font-medium text-fg mb-2">
                    {locale === 'es' ? 'Apellido' : 'Last name'}
                  </label>
                  {editingSection === 'personal' ? (
                    <>
                      <Input type="text" {...propsDelCampo('lastName')} value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} />
                      {errorDelCampo('lastName')}
                    </>
                  ) : (
                    <div className={fieldDisplay}>
                      <User className="w-4 h-4 text-fg-muted" />
                      <span className="text-sm text-fg">{formData.lastName || '—'}</span>
                    </div>
                  )}
                </div>

                {/* Email — read-only */}
                <div>
                  <label className="block text-sm font-medium text-fg mb-2">Email</label>
                  <div className={fieldDisplay}>
                    <Envelope className="w-4 h-4 text-fg-muted" />
                    <span className="text-sm text-fg">{formData.email || '—'}</span>
                  </div>
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-medium text-fg mb-2">
                    {locale === 'es' ? 'Teléfono' : 'Phone'}
                  </label>
                  {editingSection === 'personal' ? (
                    <>
                      <Input type="tel" {...propsDelCampo('phone')} value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} />
                      {errorDelCampo('phone')}
                    </>
                  ) : (
                    <div className={fieldDisplay}>
                      <Phone className="w-4 h-4 text-fg-muted" />
                      <span className="text-sm text-fg">{formData.phone || '—'}</span>
                    </div>
                  )}
                </div>

                {/* Rol — read-only, definido por la agencia */}
                <div>
                  <label className="block text-sm font-medium text-fg mb-2">
                    {locale === 'es' ? 'Rol en la agencia' : 'Agency role'}
                  </label>
                  <div className={fieldDisplay}>
                    <Briefcase className="w-4 h-4 text-fg-muted" />
                    <span className="text-sm text-fg">
                      {memberRole ? (AGENCY_ROLE_LABELS[memberRole] ?? memberRole) : '—'}
                    </span>
                  </div>
                </div>

                {/* Dirección */}
                <div>
                  <label className="block text-sm font-medium text-fg mb-2">
                    {locale === 'es' ? 'Dirección' : 'Address'}
                  </label>
                  {editingSection === 'personal' ? (
                    <>
                      <Input type="text" {...propsDelCampo('address')} value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} />
                      {errorDelCampo('address')}
                    </>
                  ) : (
                    <div className={fieldDisplay}>
                      <MapPin className="w-4 h-4 text-fg-muted" />
                      <span className="text-sm text-fg">{formData.address || '—'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-semibold text-fg">
                  {locale === 'es' ? 'Contacto de emergencia' : 'Emergency contact'}
                </h3>
                {/* «Editar» ⇄ «Cancelar / Guardar» se cruzan en su lugar. */}
                <CrossFade swapKey={editingSection === 'emergency' ? 'editando' : 'viendo'} mode="popLayout">
                {editingSection !== 'emergency' ? (
                  <Button variant="ghost" size="sm" hideArrow onClick={() => setEditingSection('emergency')}>
                    <Pencil className="w-3.5 h-3.5" />
                    {locale === 'es' ? 'Editar' : 'Edit'}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" hideArrow onClick={handleCancelEdit}>
                      {locale === 'es' ? 'Cancelar' : 'Cancel'}
                    </Button>
                    <Button size="sm" hideArrow onClick={() => handleSave('emergency')} disabled={isSaving}>
                      {isSaving ? <Spinner size="sm" variant="current" /> : <FloppyDisk className="w-3.5 h-3.5" />}
                      {locale === 'es' ? 'Guardar' : 'Save'}
                    </Button>
                  </div>
                )}
                </CrossFade>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg mb-2">
                    {locale === 'es' ? 'Nombre' : 'Name'}
                  </label>
                  {editingSection === 'emergency' ? (
                    <>
                      <Input type="text" {...propsDelCampo('emergencyContactName')} value={formData.emergencyContactName}
                        onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                        placeholder={locale === 'es' ? 'Nombre del contacto' : 'Contact name'} />
                      {errorDelCampo('emergencyContactName')}
                    </>
                  ) : (
                    <div className={fieldDisplay}>
                      <UserPlus className="w-4 h-4 text-fg-muted" />
                      <span className="text-sm text-fg">{formData.emergencyContactName || '—'}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg mb-2">
                    {locale === 'es' ? 'Teléfono' : 'Phone'}
                  </label>
                  {editingSection === 'emergency' ? (
                    <>
                      <Input type="tel" {...propsDelCampo('emergencyContactPhone')} value={formData.emergencyContactPhone}
                        onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                        placeholder="3001234567" />
                      {errorDelCampo('emergencyContactPhone')}
                    </>
                  ) : (
                    <div className={fieldDisplay}>
                      <Phone className="w-4 h-4 text-fg-muted" />
                      <span className="text-sm text-fg">{formData.emergencyContactPhone || '—'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-lg border border-danger/30 bg-danger-soft/40 p-6">
              <h3 className="text-base font-semibold text-danger mb-2 flex items-center gap-2">
                <WarningCircle className="w-5 h-5" />
                {locale === 'es' ? 'Zona de peligro' : 'Danger zone'}
              </h3>
              {/* Lo que dice la copia canónica: hay 30 días para volver. Decir
                  «irreversible» acá y «se recupera si inicias sesión» dos
                  clics después es contarle dos cosas distintas a la misma
                  persona. */}
              <p className="text-sm text-fg-muted mb-4">{deletionCopy.recovery}</p>
              <Button variant="destructive" hideArrow onClick={handleOpenDeleteModal}>
                {locale === 'es' ? 'Eliminar mi cuenta' : 'Delete my account'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/*
        * Baja de la cuenta — el `Dialog` destructivo del DS, en tres pasos
        * (aviso → escribir la palabra → despedida) dentro del MISMO modal: la
        * cabecera, el cuerpo y el pie cambian con el paso y la variante lo
        * sigue (rojo en los dos primeros, verde en la despedida). Portal,
        * foco atrapado, Escape, velo y Lenis los pone la primitiva.
        *
        * El velo no cierra (nunca lo hizo): es una baja, no un aviso.
        */}
      <Dialog open={showDeleteModal} onOpenChange={alCambiarModalDeBaja}>
        <DialogContent
          size="sm"
          variant={deleteStep === 3 ? 'success' : 'destructive'}
          hideClose={!sePuedeCerrarLaBaja}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <CrossFade swapKey={deleteStep} className="flex min-w-0 flex-col gap-1.5">
              {deleteStep === 1 && (
                <>
                  <DialogTitle>{deletionCopy.warningTitle}</DialogTitle>
                  <DialogDescription>{deletionCopy.recovery}</DialogDescription>
                </>
              )}
              {deleteStep === 2 && (
                <>
                  <DialogTitle>{locale === 'es' ? 'Confirmar eliminación' : 'Confirm deletion'}</DialogTitle>
                  <DialogDescription>
                    {deletionCopy.confirmInstructionPrefix}{' '}
                    <span className="font-semibold text-danger">{deletionCopy.confirmWord}</span>{' '}
                    {deletionCopy.confirmInstructionSuffix}
                  </DialogDescription>
                </>
              )}
              {deleteStep === 3 && (
                <>
                  <DialogTitle>{deletionCopy.goodbyeTitle}</DialogTitle>
                  <DialogDescription>{deletionCopy.goodbyeBody}</DialogDescription>
                </>
              )}
            </CrossFade>
          </DialogHeader>

          {deleteStep !== 3 && (
            <CrossFade swapKey={deleteStep}>
              {deleteStep === 1 ? (
                /*
                 * 🔴 Esta lista decía que se eliminaban «Datos de la agencia
                 * y configuración», «Historial de propiedades y contratos»,
                 * «Información de cobros y dispersiones» y «Conversaciones y
                 * mensajes». Nada de eso pasa.
                 *
                 * `DELETE /users/me/account` (UsersService.deleteAccount)
                 * hace UNA cosa: marca TU usuario con `isActive: false` y
                 * `deletedAt`, y revoca tus sesiones. La inmobiliaria, sus
                 * inmuebles, sus contratos, sus cobros y sus mensajes
                 * siguen ahí — de hecho el backend te BLOQUEA la baja si
                 * eres el único administrador, justamente para que nadie se
                 * quede sin dueño. Decirle a alguien que borra la operación
                 * de su agencia cuando lo único que pierde es su acceso es
                 * la peor clase de mentira: la que aterra.
                 */
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-fg mb-3">
                      {locale === 'es' ? 'Perderás:' : 'You will lose:'}
                    </p>
                    <ul className="space-y-2">
                      {(locale === 'es'
                        ? [
                            'Tu perfil y tus datos personales',
                            'El acceso al panel de la inmobiliaria',
                            'Tu sesión en todos tus dispositivos',
                          ]
                        : [
                            'Your profile and personal data',
                            'Access to the agency panel',
                            'Your session on every device',
                          ]
                      ).map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-fg-muted">
                          <TrashSimple className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-fg mb-3">
                      {locale === 'es' ? 'No se elimina:' : 'What is not deleted:'}
                    </p>
                    <ul className="space-y-2">
                      {(locale === 'es'
                        ? [
                            'La información de la inmobiliaria: inmuebles, contratos, cobros y dispersiones siguen siendo de la agencia',
                            'Las conversaciones y los documentos que ya generaste, que la agencia sigue viendo',
                          ]
                        : [
                            'The agency’s data: properties, contracts, payments and disbursements stay with the agency',
                            'Conversations and documents you already generated, which the agency keeps seeing',
                          ]
                      ).map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-fg-muted">
                          <Buildings className="w-4 h-4 text-fg-muted mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-fg-muted">
                    {locale === 'es'
                      ? 'No vas a poder darte de baja si tienes contratos de arriendo activos a tu nombre o si eres el único administrador de la inmobiliaria.'
                      : 'You cannot delete your account while you have active leases in your name, or while you are the agency’s only administrator.'}
                  </p>
                </div>
              ) : (
                <Input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  placeholder={deletionCopy.inputPlaceholder}
                  aria-label={deletionCopy.confirmInstruction}
                  autoFocus
                  className="text-center tracking-widest focus-visible:ring-danger/30"
                />
              )}
            </CrossFade>
          )}

          {deleteStep === 1 && (
            <DialogFooter>
              <Button variant="outline" hideArrow onClick={handleCloseDeleteModal}>
                {locale === 'es' ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button hideArrow onClick={() => setDeleteStep(2)}>
                {locale === 'es' ? 'Continuar' : 'Continue'}
              </Button>
            </DialogFooter>
          )}

          {deleteStep === 2 && (
            <DialogFooter>
              <Button variant="outline" hideArrow onClick={() => setDeleteStep(1)} disabled={isDeleting}>
                {locale === 'es' ? 'Volver' : 'Back'}
              </Button>
              <Button
                variant="destructive"
                hideArrow
                isLoading={isDeleting}
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== deletionCopy.confirmWord || isDeleting}
              >
                {isDeleting ? deletionCopy.deleting : deletionCopy.deleteButton}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
