'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { User, Envelope, Phone, MapPin, Shield, Camera, FloppyDisk, CheckCircle, WarningCircle, Briefcase, UserPlus, X, Warning, TrashSimple, Pencil, Upload, Buildings } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import { AgenteHorarioVisitas } from '@/components/inmobiliaria/AgenteHorarioVisitas';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { Button, Input, Spinner } from '@/components/ui';
import { IconButton } from '@leasefy/cadence';
import { permissionsApi } from '@/lib/api/inmobiliaria.service';
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

type EditingSection = 'avatar' | 'personal' | 'emergency' | null;

const AGENCY_ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  AGENTE: 'Agente',
  CONTADOR: 'Contador',
  VIEWER: 'Visualizador',
};

const AGENCY_ROLE_DESC: Record<string, string> = {
  ADMIN: 'Acceso completo',
  AGENTE: 'Gestión de propiedades y pipeline',
  CONTADOR: 'Acceso financiero y contable',
  VIEWER: 'Solo lectura',
};

export default function InmobiliariaPerfilPage() {
  const { t, locale } = useI18n();
  const { user, agency, updateProfile, logout } = useAuth();
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<EditingSection>(null);

  useEffect(() => {
    permissionsApi.getMyPermissions()
      .then((data) => setMemberRole(data.agencyRole ?? null))
      .catch(() => {});
  }, []);
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
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    birthDate: user?.birthDate || '',
    emergencyContactName: user?.emergencyContactName || '',
    emergencyContactPhone: user?.emergencyContactPhone || '',
  });

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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Saved avatar URL (persists after saving)
  const [savedAvatar, setSavedAvatar] = useState<string | null>(null);

  const handleSave = async (section: EditingSection) => {
    setIsSaving(true);
    try {
      if (section === 'avatar' && avatarFile) {
        const { url } = await settingsApi.uploadAvatar(avatarFile);
        setSavedAvatar(url);
        setAvatarFile(null);
      } else if (section === 'personal') {
        await updateProfile({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim() || undefined,
          address: formData.address.trim() || undefined,
          birthDate: formData.birthDate || undefined,
        });
      } else if (section === 'emergency') {
        await updateProfile({
          emergencyContactName: formData.emergencyContactName.trim() || undefined,
          emergencyContactPhone: formData.emergencyContactPhone.trim() || undefined,
        });
      }
      setEditingSection(null);
      toast.success(locale === 'es' ? 'Cambios guardados' : 'Changes saved');
    } catch {
      toast.error(locale === 'es' ? 'Error al guardar los cambios' : 'Error saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setAvatarPreview(null);
    setAvatarFile(null);
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
    if (!file.type.startsWith('image/')) {
      toast.error(locale === 'es' ? 'Por favor selecciona una imagen' : 'Please select an image');
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

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteStep(1);
    setDeleteConfirmText('');
    setIsDeleting(false);
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
      const message = err instanceof Error && err.message
        ? err.message
        : deletionCopy.errorFallback;
      toast.error(message);
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
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {locale === 'es' ? 'Mi perfil' : 'My profile'}
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl">
            {locale === 'es' ? 'Gestiona tu información personal y preferencias' : 'Manage your personal information and preferences'}
          </p>
        </div>

        {/* Setup Progress Section — hidden once the profile is 100% complete */}
        {completionPercentage < 100 && (
        <section className="rounded-xl bg-primary-soft border border-border p-6">
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
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercentage}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-primary rounded-full"
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
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-semibold tabular-nums text-fg">
                    {completionPercentage}%
                  </span>
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
            <div className="rounded-xl border border-border bg-card overflow-hidden">
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
                  accept="image/*"
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
                      "mb-4 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
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
              <div className="rounded-xl border border-border bg-card p-6">
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
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-semibold text-fg">
                  {locale === 'es' ? 'Información personal' : 'Personal information'}
                </h3>
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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-fg mb-2">
                    {locale === 'es' ? 'Nombre' : 'First name'}
                  </label>
                  {editingSection === 'personal' ? (
                    <Input type="text" value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} />
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
                    <Input type="text" value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} />
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
                    <Input type="tel" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} />
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
                    <Input type="text" value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} />
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
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-semibold text-fg">
                  {locale === 'es' ? 'Contacto de emergencia' : 'Emergency contact'}
                </h3>
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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg mb-2">
                    {locale === 'es' ? 'Nombre' : 'Name'}
                  </label>
                  {editingSection === 'emergency' ? (
                    <Input type="text" value={formData.emergencyContactName}
                      onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                      placeholder={locale === 'es' ? 'Nombre del contacto' : 'Contact name'} />
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
                    <Input type="tel" value={formData.emergencyContactPhone}
                      onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                      placeholder="3001234567" />
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
            <div className="rounded-xl border border-danger/30 bg-danger-soft/40 p-6">
              <h3 className="text-base font-semibold text-danger mb-2 flex items-center gap-2">
                <WarningCircle className="w-5 h-5" />
                {locale === 'es' ? 'Zona de peligro' : 'Danger zone'}
              </h3>
              <p className="text-sm text-fg-muted mb-4">
                {locale === 'es'
                  ? 'Estas acciones son irreversibles. Por favor, procede con precaución.'
                  : 'These actions are irreversible. Please proceed with caution.'}
              </p>
              <Button variant="destructive" hideArrow onClick={handleOpenDeleteModal}>
                {locale === 'es' ? 'Eliminar mi cuenta' : 'Delete my account'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card rounded-xl max-w-md w-full overflow-hidden"
          >
            {/* Step 1: Warning */}
            {deleteStep === 1 && (
              <>
                <div className="bg-danger-soft px-6 py-8 text-center border-b border-danger/20">
                  <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mx-auto mb-4">
                    <Warning className="w-8 h-8 text-danger" />
                  </div>
                  <h3 className="text-base font-semibold text-danger">
                    {deletionCopy.warningTitle}
                  </h3>
                  <p className="text-sm text-danger mt-1">
                    {deletionCopy.recovery}
                  </p>
                </div>

                <div className="p-6">
                  <div className="mb-6">
                    <p className="text-sm font-medium text-fg mb-3">
                      {locale === 'es' ? 'Se eliminará permanentemente:' : 'Will be permanently deleted:'}
                    </p>
                    <ul className="space-y-2">
                      {(locale === 'es' ? [
                        'Tu perfil y toda tu información personal',
                        'Datos de la agencia y configuración',
                        'Historial de propiedades y contratos',
                        'Información de cobros y dispersiones',
                        'Conversaciones y mensajes',
                      ] : [
                        'Your profile and all personal information',
                        'Agency data and configuration',
                        'Property and contract history',
                        'Payment and disbursement information',
                        'Conversations and messages',
                      ]).map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-fg-muted">
                          <TrashSimple className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="secondary" hideArrow className="flex-1 justify-center" onClick={handleCloseDeleteModal}>
                      {locale === 'es' ? 'Cancelar' : 'Cancel'}
                    </Button>
                    <Button variant="destructive" hideArrow className="flex-1 justify-center" onClick={() => setDeleteStep(2)}>
                      {locale === 'es' ? 'Continuar' : 'Continue'}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Confirmation */}
            {deleteStep === 2 && (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h3 className="text-base font-semibold text-fg">
                    {locale === 'es' ? 'Confirmar eliminación' : 'Confirm deletion'}
                  </h3>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseDeleteModal}
                    aria-label={locale === 'es' ? 'Cerrar' : 'Close'}
                    icon={<X className="w-5 h-5 text-fg-muted" />}
                  />
                </div>

                <div className="p-6">
                  <p className="text-sm text-fg-muted mb-4">
                    {deletionCopy.confirmInstructionPrefix}{' '}
                    <span className="font-semibold text-danger">{deletionCopy.confirmWord}</span>{' '}
                    {deletionCopy.confirmInstructionSuffix}
                  </p>

                  <Input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                    placeholder={deletionCopy.inputPlaceholder}
                    className="text-center tracking-widest focus-visible:ring-danger/30"
                  />

                  <div className="flex gap-3 mt-6">
                    <Button variant="secondary" hideArrow className="flex-1 justify-center" onClick={() => setDeleteStep(1)}>
                      {locale === 'es' ? 'Volver' : 'Back'}
                    </Button>
                    <Button
                      variant="destructive"
                      hideArrow
                      className="flex-1 justify-center"
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== deletionCopy.confirmWord || isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <Spinner size="sm" variant="current" />
                          {deletionCopy.deleting}
                        </>
                      ) : (
                        deletionCopy.deleteButton
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Goodbye */}
            {deleteStep === 3 && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-fg-muted" />
                </div>
                <h3 className="text-base font-semibold text-fg mb-2">
                  {deletionCopy.goodbyeTitle}
                </h3>
                <p className="text-sm text-fg-muted">
                  {deletionCopy.goodbyeBody}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
