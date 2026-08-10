'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { User as UserIcon, Envelope, Phone, MapPin, Calendar, Shield, Camera, FloppyDisk, CheckCircle, WarningCircle, UserPlus, X, Warning, TrashSimple, Pencil, Upload } from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';
import { useAuth } from '@/lib/auth';
import {
  buildChangedFields,
  formDataFromUser,
  editablePersonalFields,
  isRutLocked,
  EMERGENCY_FIELDS,
  type ProfileFormData,
} from './profile-form';
import { settingsApi } from '@/lib/api/settings.service';
import { accountDeletionCopy } from '@/lib/account-deletion/copy';
import { PreferencesSection } from './PreferencesSection';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Setup steps definition (derived from real profile data — never hardcoded)
interface SetupStep {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
  section: EditingSection;
}

type EditingSection = 'avatar' | 'personal' | 'emergency' | null;

export default function PerfilPage() {
  const { t, locale } = useI18n();
  const { user, updateProfile, refreshUser, signOut } = useAuth();
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

  // Form state — seeded from the real authenticated user
  const [formData, setFormData] = useState<ProfileFormData>(() => formDataFromUser(user));

  // Re-seed whenever the user loads/refreshes while not editing (also resets on cancel)
  useEffect(() => {
    if (!editingSection) {
      setFormData(formDataFromUser(user));
    }
  }, [user, editingSection]);

  // Setup steps derived from fields the user has actually filled in
  const setupSteps: SetupStep[] = [
    {
      id: 'basic-info',
      label: locale === 'es' ? 'Información básica' : 'Basic information',
      description: locale === 'es' ? 'Nombre y apellido' : 'First and last name',
      icon: UserIcon,
      completed: !!(user?.firstName && user?.lastName),
      section: 'personal',
    },
    {
      id: 'phone',
      label: t('profile.phone'),
      description: locale === 'es' ? 'Agrega tu número de teléfono' : 'Add your phone number',
      icon: Phone,
      completed: !!user?.phone,
      section: 'personal',
    },
    {
      id: 'id-number',
      label: t('profile.idNumber'),
      description: locale === 'es' ? 'Agrega tu documento de identidad' : 'Add your ID number',
      icon: Shield,
      completed: !!user?.rut,
      section: 'personal',
    },
    {
      id: 'address',
      label: t('profile.address'),
      description: locale === 'es' ? 'Agrega tu dirección actual' : 'Add your current address',
      icon: MapPin,
      completed: !!user?.address,
      section: 'personal',
    },
    {
      id: 'emergency-contact',
      label: t('profile.emergencyContact'),
      description: locale === 'es' ? 'Agrega un contacto de emergencia' : 'Add an emergency contact',
      icon: UserPlus,
      completed: !!(user?.emergencyContactName && user?.emergencyContactPhone),
      section: 'emergency',
    },
  ];

  const completedSteps = setupSteps.filter(s => s.completed).length;
  const totalSteps = setupSteps.length;
  const completionPercentage = Math.round((completedSteps / totalSteps) * 100);

  // Real verification signal: Supabase email confirmation (exposed by the auth
  // context). There is no phone/identity verification system in the backend,
  // so no other badge is shown.
  const emailVerified = !!user?.emailConfirmedAt;

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async (fields: readonly (keyof ProfileFormData)[]) => {
    const payload = buildChangedFields(fields, formData, user);

    if (Object.keys(payload).length === 0) {
      setEditingSection(null);
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile(payload);
      setEditingSection(null);
      toast.success(locale === 'es' ? 'Cambios guardados' : 'Changes saved');
    } catch (err) {
      // Surface the backend message (e.g. the Colombian phone format error)
      const message = err instanceof Error && err.message
        ? err.message
        : (locale === 'es' ? 'No se pudieron guardar los cambios' : 'Could not save changes');
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAvatar = async () => {
    if (!avatarFile) {
      setEditingSection(null);
      setAvatarPreview(null);
      return;
    }

    setIsSaving(true);
    try {
      await settingsApi.uploadAvatar(avatarFile);
      await refreshUser();
      setEditingSection(null);
      setAvatarPreview(null);
      setAvatarFile(null);
      toast.success(locale === 'es' ? 'Foto de perfil actualizada' : 'Profile photo updated');
    } catch (err) {
      const message = err instanceof Error && err.message
        ? err.message
        : (locale === 'es' ? 'No se pudo subir la foto' : 'Could not upload the photo');
      toast.error(message);
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
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(locale === 'es' ? 'Por favor selecciona una imagen' : 'Please select an image');
      return;
    }
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(locale === 'es' ? 'La imagen debe ser menor a 5MB' : 'Image must be less than 5MB');
      return;
    }
    setAvatarFile(file);
    // Create preview URL
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
      setIsDeleting(false);
      setDeleteStep(3);
      // Let the user read the goodbye screen, then clear the session.
      setTimeout(() => {
        void signOut();
      }, 2000);
    } catch (err) {
      setIsDeleting(false);
      const message = err instanceof Error && err.message
        ? err.message
        : deletionCopy.errorFallback;
      toast.error(message);
    }
  };

  const displayName = user?.name ?? '';
  const savedAvatar = user?.avatar ?? null;
  const notSet = locale === 'es' ? 'No registrado' : 'Not set';

  if (!user) {
    // ProtectedRoute guards this page; user is only briefly null during hydration.
    return <div className="min-h-screen bg-bg" data-testid="perfil-loading" />;
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div>
            <h1 className="text-3xl font-medium text-fg tracking-tight">
              {t('profile.title')}
            </h1>
            <p className="mt-1 text-fg-muted">
              {t('profile.subtitle')}
            </p>
          </div>
        </motion.header>

        {/* Setup Progress Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="rounded-xl bg-primary-soft p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Progress Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-fg">
                      {t('profile.completion.title')}
                    </h2>
                    <p className="text-sm text-primary">
                      {locale === 'es'
                        ? `${completedSteps} de ${totalSteps} pasos completados`
                        : `${completedSteps} of ${totalSteps} steps completed`}
                    </p>
                  </div>
                </div>
                <div className="h-2 bg-surface/50 rounded-full overflow-hidden">
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
                    : t('profile.completion.completeFor')}
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
                      stroke="white"
                      strokeWidth="8"
                      opacity="0.5"
                      className="dark:opacity-20"
                    />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#1A40FF"
                      strokeWidth="8"
                      strokeLinecap="round"
                      initial={{ strokeDasharray: '0 251.2' }}
                      animate={{ strokeDasharray: `${completionPercentage * 2.512} 251.2` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-fg">
                      {completionPercentage}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Steps List */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {setupSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                    className={cn(
                      'rounded-xl p-4 transition-all',
                      step.completed
                        ? 'bg-surface/80'
                        : 'bg-surface border-2 border-dashed border-primary/30'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
                        step.completed
                          ? 'bg-success-soft'
                          : 'bg-primary-soft'
                      )}>
                        {step.completed ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <Icon className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium truncate',
                          step.completed ? 'text-fg' : 'text-primary'
                        )}>
                          {step.label}
                        </p>
                        {step.completed ? (
                          <span className="text-xs text-success">{locale === 'es' ? 'Completado' : 'Completed'}</span>
                        ) : (
                          <Button
                            variant="link"
                            size="sm"
                            hideArrow
                            onClick={() => setEditingSection(step.section)}
                            className="px-0 text-xs text-primary"
                          >
                            {locale === 'es' ? 'Completar' : 'Complete'} →
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* Avatar Card */}
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="relative bg-primary-soft h-28">
                {/* Edit button for avatar section */}
                {editingSection !== 'avatar' && (
                  <IconButton
                    variant="ghost"
                    onClick={() => setEditingSection('avatar')}
                    className="absolute top-3 right-3 p-2 bg-surface/20 hover:bg-surface/30 backdrop-blur-sm rounded-full text-white"
                    aria-label={locale === 'es' ? 'Editar foto' : 'Edit photo'}
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
                  {/* Avatar circle with image preview */}
                  <div
                    className={cn(
                      "w-28 h-28 rounded-full border-4 border-surface overflow-hidden",
                      editingSection === 'avatar' && "cursor-pointer"
                    )}
                    onClick={editingSection === 'avatar' ? handleAvatarClick : undefined}
                  >
                    {(editingSection === 'avatar' ? (avatarPreview ?? savedAvatar) : savedAvatar) ? (
                      <Image
                        src={(editingSection === 'avatar' ? (avatarPreview ?? savedAvatar) : savedAvatar)!}
                        alt="Avatar"
                        width={112}
                        height={112}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface-muted flex items-center justify-center text-fg uppercase tracking-wide font-mono font-bold text-4xl">
                        {(displayName || user.email).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {editingSection === 'avatar' && (
                    <IconButton
                      variant="ghost"
                      onClick={handleAvatarClick}
                      className="absolute bottom-1 right-1 p-2.5 bg-primary rounded-full text-primary-fg hover:bg-primary-hover"
                      aria-label={locale === 'es' ? 'Cambiar foto' : 'Change photo'}
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
                      "mb-4 border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all",
                      isDragging
                        ? "border-primary/30 bg-primary-soft"
                        : "border-border hover:border-primary/30 hover:bg-surface-muted"
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAvatar();
                          }}
                          className="p-2 rounded-md text-fg-subtle hover:text-danger hover:bg-danger-soft"
                          aria-label={locale === 'es' ? 'Quitar imagen' : 'Remove image'}
                          icon={<TrashSimple className="w-4 h-4" />}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-surface-muted flex items-center justify-center mx-auto mb-3">
                          <Upload className="w-6 h-6 text-fg-subtle" />
                        </div>
                        <p className="text-sm font-medium text-fg-muted">
                          {isDragging
                            ? (locale === 'es' ? 'Suelta la imagen aquí' : 'Drop the image here')
                            : (locale === 'es' ? 'Subir foto de perfil' : 'Upload profile photo')}
                        </p>
                        <p className="text-xs text-fg-muted mt-1">
                          {locale === 'es' ? 'Arrastra o haz clic • JPG, PNG (máx. 5MB)' : 'Drag or click • JPG, PNG (max 5MB)'}
                        </p>
                      </>
                    )}
                  </div>
                )}

                <h2 className="text-xl font-semibold text-fg">{displayName}</h2>
                <p className="text-sm text-fg-muted mt-1">{user.email}</p>

                {/* FloppyDisk/Cancel buttons for avatar section */}
                {editingSection === 'avatar' && (
                  <div className="flex items-center gap-2 mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      hideArrow
                      onClick={handleCancelEdit}
                      className="flex-1 rounded-md"
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      hideArrow
                      isLoading={isSaving}
                      onClick={handleSaveAvatar}
                      disabled={isSaving}
                      className="flex-1 rounded-md bg-primary text-primary-fg hover:bg-primary-hover"
                    >
                      {!isSaving && <FloppyDisk className="w-4 h-4" />}
                      {t('common.save')}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Verification Status Card — only real signals (Supabase email confirmation).
                There is no phone/identity verification system in the backend. */}
            {emailVerified && (
              <div className="rounded-xl border border-border bg-surface p-6">
                <h3 className="font-semibold text-fg mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-fg-subtle" />
                  {t('profile.verification.title')}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-surface-muted border border-border-faint">
                    <span className="text-sm font-medium text-fg">Email</span>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-success bg-success-soft px-2.5 py-1 rounded-full">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {t('profile.verification.verified')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Profile Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Personal Information */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-fg">{t('profile.personalInfo')}</h3>
                {editingSection !== 'personal' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    hideArrow
                    onClick={() => setEditingSection('personal')}
                    className="gap-1.5 rounded-md text-fg-muted hover:text-fg"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {locale === 'es' ? 'Editar' : 'Edit'}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      hideArrow
                      onClick={handleCancelEdit}
                      className="rounded-md"
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      hideArrow
                      isLoading={isSaving}
                      onClick={() => handleSaveProfile(editablePersonalFields(user))}
                      disabled={isSaving}
                      className="gap-1.5 rounded-md bg-primary text-primary-fg hover:bg-primary-hover"
                    >
                      {!isSaving && <FloppyDisk className="w-3.5 h-3.5" />}
                      {t('common.save')}
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-fg-muted mb-2">
                    {t('profile.firstName')}
                  </label>
                  {editingSection === 'personal' ? (
                    <Input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="w-full rounded-xl bg-surface-muted"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-xl">
                      <UserIcon className="w-4 h-4 text-fg-subtle" />
                      <span className="text-sm text-fg">{user.firstName || notSet}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-muted mb-2">
                    {t('profile.lastName')}
                  </label>
                  {editingSection === 'personal' ? (
                    <Input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="w-full rounded-xl bg-surface-muted"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-xl">
                      <UserIcon className="w-4 h-4 text-fg-subtle" />
                      <span className="text-sm text-fg">{user.lastName || notSet}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-muted mb-2">
                    Email
                  </label>
                  {/* Email is managed by the auth provider and is not editable here */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-xl">
                    <Envelope className="w-4 h-4 text-fg-subtle" />
                    <span className="text-sm text-fg">{user.email}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-muted mb-2">
                    {t('profile.phone')}
                  </label>
                  {editingSection === 'personal' ? (
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+573001234567"
                      className="w-full rounded-xl bg-surface-muted"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-xl">
                      <Phone className="w-4 h-4 text-fg-subtle" />
                      <span className="text-sm text-fg">{user.phone || notSet}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-muted mb-2">
                    {t('profile.idNumber')}
                  </label>
                  {editingSection === 'personal' ? (
                    <>
                      <Input
                        type="text"
                        value={formData.rut}
                        onChange={(e) => handleInputChange('rut', e.target.value)}
                        disabled={isRutLocked(user)}
                        className="w-full rounded-xl bg-surface-muted"
                      />
                      {isRutLocked(user) && (
                        <p className="mt-2 text-xs text-fg-subtle">
                          {locale === 'es'
                            ? 'Para modificar tu número de documento, contacta al soporte de Leasefy.'
                            : 'To change your document number, contact Leasefy support.'}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-xl">
                      <Shield className="w-4 h-4 text-fg-subtle" />
                      <span className="text-sm text-fg">{user.rut || notSet}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-muted mb-2">
                    {t('profile.dateOfBirth')}
                  </label>
                  {editingSection === 'personal' ? (
                    <Input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => handleInputChange('birthDate', e.target.value)}
                      className="w-full rounded-xl bg-surface-muted"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-xl">
                      <Calendar className="w-4 h-4 text-fg-subtle" />
                      <span className="text-sm text-fg">
                        {user.birthDate
                          ? new Date(user.birthDate.slice(0, 10) + 'T00:00:00').toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : notSet}
                      </span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-fg-muted mb-2">
                    {t('profile.address')}
                  </label>
                  {editingSection === 'personal' ? (
                    <Input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full rounded-xl bg-surface-muted"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-xl">
                      <MapPin className="w-4 h-4 text-fg-subtle" />
                      <span className="text-sm text-fg">{user.address || notSet}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-fg">{t('profile.emergencyContact')}</h3>
                {editingSection !== 'emergency' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    hideArrow
                    onClick={() => setEditingSection('emergency')}
                    className="gap-1.5 rounded-md text-fg-muted hover:text-fg"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {locale === 'es' ? 'Editar' : 'Edit'}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      hideArrow
                      onClick={handleCancelEdit}
                      className="rounded-md"
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      hideArrow
                      isLoading={isSaving}
                      onClick={() => handleSaveProfile(EMERGENCY_FIELDS)}
                      disabled={isSaving}
                      className="gap-1.5 rounded-md bg-primary text-primary-fg hover:bg-primary-hover"
                    >
                      {!isSaving && <FloppyDisk className="w-3.5 h-3.5" />}
                      {t('common.save')}
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-fg-muted mb-2">
                    {locale === 'es' ? 'Nombre' : 'Name'}
                  </label>
                  {editingSection === 'emergency' ? (
                    <Input
                      type="text"
                      value={formData.emergencyContactName}
                      onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                      className="w-full rounded-xl bg-surface-muted"
                      placeholder={locale === 'es' ? 'Nombre del contacto' : 'Contact name'}
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-xl">
                      <UserPlus className="w-4 h-4 text-fg-subtle" />
                      <span className="text-sm text-fg">{user.emergencyContactName || notSet}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-muted mb-2">
                    {t('profile.phone')}
                  </label>
                  {editingSection === 'emergency' ? (
                    <Input
                      type="tel"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                      className="w-full rounded-xl bg-surface-muted"
                      placeholder="3001234567"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-xl">
                      <Phone className="w-4 h-4 text-fg-subtle" />
                      <span className="text-sm text-fg">{user.emergencyContactPhone || notSet}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Housing preferences (tenant_preferences table — authoritative) */}
            <PreferencesSection />

            {/* Danger Zone */}
            <div className="rounded-xl border border-danger/30 bg-danger-soft/30 p-6">
              <h3 className="font-semibold text-danger mb-2 flex items-center gap-2">
                <WarningCircle className="w-5 h-5" />
                {locale === 'es' ? 'Zona de peligro' : 'Danger zone'}
              </h3>
              <p className="text-sm text-fg-muted mb-4">
                {locale === 'es'
                  ? 'Estas acciones son irreversibles. Por favor, procede con precaución.'
                  : 'These actions are irreversible. Please proceed with caution.'}
              </p>
              <Button
                variant="outline"
                hideArrow
                onClick={handleOpenDeleteModal}
                className="rounded-full border-danger/30 text-danger hover:bg-danger-soft hover:text-danger"
              >
                {t('settings.account.deleteAccount')}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-surface rounded-xl max-w-md w-full overflow-hidden"
          >
            {/* Step 1: Warning */}
            {deleteStep === 1 && (
              <>
                {/* Header with icon */}
                <div className="bg-danger-soft px-6 py-8 text-center border-b border-danger/30">
                  <div className="w-16 h-16 rounded-full bg-danger-soft flex items-center justify-center mx-auto mb-4">
                    <Warning className="w-8 h-8 text-danger" />
                  </div>
                  <h3 className="text-xl font-semibold text-danger">
                    {deletionCopy.warningTitle}
                  </h3>
                  <p className="text-sm text-danger mt-1">
                    {deletionCopy.recovery}
                  </p>
                </div>

                <div className="p-6">
                  {/* What will be deleted */}
                  <div className="mb-6">
                    <p className="text-sm font-medium text-fg mb-3">
                      {locale === 'es' ? 'Se eliminará permanentemente:' : 'Will be permanently deleted:'}
                    </p>
                    <ul className="space-y-2">
                      {(locale === 'es' ? [
                        'Tu perfil y toda tu información personal',
                        'Historial de postulaciones y documentos',
                        'Historial de pagos y contratos',
                        'Acceso a propiedades guardadas',
                        'Conversaciones y mensajes',
                      ] : [
                        'Your profile and all personal information',
                        'Application and document history',
                        'Payment and contract history',
                        'Access to saved properties',
                        'Conversations and messages',
                      ]).map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-fg-muted">
                          <TrashSimple className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Active lease warning */}
                  <div className="p-4 rounded-xl bg-warning-soft border border-warning/30 mb-6">
                    <div className="flex items-start gap-3">
                      <WarningCircle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-warning">
                          {locale === 'es' ? '¿Tienes un arriendo activo?' : 'Do you have an active rental?'}
                        </p>
                        <p className="text-xs text-warning mt-0.5">
                          {locale === 'es'
                            ? 'Eliminar tu cuenta no cancela un contrato de arriendo vigente. Deberás contactar a tu arrendador.'
                            : 'Deleting your account does not cancel a current lease agreement. You will need to contact your landlord.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      hideArrow
                      onClick={handleCloseDeleteModal}
                      className="flex-1 rounded-full"
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      variant="destructive"
                      hideArrow
                      onClick={() => setDeleteStep(2)}
                      className="flex-1 rounded-full"
                    >
                      {locale === 'es' ? 'Continuar' : 'Continue'}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Confirmation */}
            {deleteStep === 2 && (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-faint">
                  <h3 className="text-lg font-semibold text-fg">
                    {locale === 'es' ? 'Confirmar eliminación' : 'Confirm deletion'}
                  </h3>
                  <IconButton
                    variant="ghost"
                    onClick={handleCloseDeleteModal}
                    className="p-2 rounded-full hover:bg-surface-muted"
                    aria-label={locale === 'es' ? 'Cerrar' : 'Close'}
                    icon={<X className="w-5 h-5 text-fg-muted" />}
                  />
                </div>

                <div className="p-6">
                  <p className="text-sm text-fg-muted mb-4">
                    {deletionCopy.confirmInstructionPrefix}{' '}
                    <span className="font-mono font-semibold text-danger">{deletionCopy.confirmWord}</span>{' '}
                    {deletionCopy.confirmInstructionSuffix}
                  </p>

                  <Input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                    placeholder={deletionCopy.inputPlaceholder}
                    className="w-full rounded-xl bg-surface-muted font-mono text-center tracking-widest focus-visible:border-danger/30 focus-visible:ring-danger/20"
                  />

                  <div className="flex gap-3 mt-6">
                    <Button
                      variant="outline"
                      hideArrow
                      onClick={() => setDeleteStep(1)}
                      className="flex-1 rounded-full"
                    >
                      {locale === 'es' ? 'Volver' : 'Back'}
                    </Button>
                    <Button
                      variant="destructive"
                      hideArrow
                      isLoading={isDeleting}
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== deletionCopy.confirmWord || isDeleting}
                      className="flex-1 rounded-full"
                    >
                      {isDeleting ? deletionCopy.deleting : deletionCopy.deleteButton}
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
                <h3 className="text-xl font-semibold text-fg mb-2">
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
