'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { User, Envelope, Phone, MapPin, Calendar, Shield, Camera, FloppyDisk, ArrowLeft, CheckCircle, Circle, WarningCircle, FileText, Buildings, Briefcase, UserPlus, ArrowUpRight, X, Warning, TrashSimple, Pencil, Upload, Image as ImageIcon } from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Setup steps definition
interface SetupStep {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
  action?: string;
  actionHref?: string;
}

type EditingSection = 'avatar' | 'personal' | 'emergency' | null;

export default function PerfilPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Avatar upload state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: user?.name || 'María González',
    email: user?.email || 'tenant@example.com',
    phone: '+56 9 1234 5678',
    rut: '12.345.678-9',
    address: 'Av. Providencia 1234, Providencia',
    birthDate: '1990-05-15',
    emergencyContact: 'Juan González - +56 9 8765 4321',
  });

  // Setup steps with completion status
  const setupSteps: SetupStep[] = [
    {
      id: 'basic-info',
      label: locale === 'es' ? 'Información básica' : 'Basic information',
      description: locale === 'es' ? 'Nombre, email y datos personales' : 'Name, email and personal data',
      icon: User,
      completed: true,
    },
    {
      id: 'phone-verify',
      label: locale === 'es' ? 'Verificar teléfono' : 'Verify phone',
      description: locale === 'es' ? 'Confirma tu número de teléfono' : 'Confirm your phone number',
      icon: Phone,
      completed: true,
    },
    {
      id: 'identity-verify',
      label: locale === 'es' ? 'Verificar identidad' : 'Verify identity',
      description: locale === 'es' ? 'Sube tu documento de identidad' : 'Upload your ID document',
      icon: Shield,
      completed: true,
    },
    {
      id: 'employment-verify',
      label: locale === 'es' ? 'Verificar empleo' : 'Verify employment',
      description: locale === 'es' ? 'Agrega tu información laboral' : 'Add your employment information',
      icon: Briefcase,
      completed: false,
      action: t('profile.verification.verify'),
    },
    {
      id: 'emergency-contact',
      label: t('profile.emergencyContact'),
      description: locale === 'es' ? 'Agrega un contacto de emergencia' : 'Add an emergency contact',
      icon: UserPlus,
      completed: true,
    },
  ];

  const completedSteps = setupSteps.filter(s => s.completed).length;
  const totalSteps = setupSteps.length;
  const completionPercentage = Math.round((completedSteps / totalSteps) * 100);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Saved avatar URL (persists after saving)
  const [savedAvatar, setSavedAvatar] = useState<string | null>(null);

  const handleSave = async (section: EditingSection) => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    // If saving avatar section, preserve the uploaded image
    if (section === 'avatar' && avatarPreview) {
      setSavedAvatar(avatarPreview);
    }

    setIsSaving(false);
    setEditingSection(null);
    // Don't clear avatarPreview here - it will be cleared by handleCancelEdit if user cancels
    toast.success(locale === 'es' ? 'Cambios guardados' : 'Changes saved');
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    // Reset avatar preview if cancelling avatar edit
    setAvatarPreview(null);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVerifyStep = (stepId: string) => {
    setShowVerifyModal(stepId);
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

  const handleDeleteAccount = async () => {
    const requiredText = locale === 'es' ? 'ELIMINAR' : 'DELETE';
    if (deleteConfirmText !== requiredText) return;

    setIsDeleting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsDeleting(false);
    setDeleteStep(3);

    // In real implementation, would redirect to logout/goodbye page
    setTimeout(() => {
      toast.success(locale === 'es' ? 'Tu cuenta ha sido eliminada' : 'Your account has been deleted');
      handleCloseDeleteModal();
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div>
            <h1 className="text-3xl font-medium text-fg dark:text-white tracking-tight">
              {t('profile.title')}
            </h1>
            <p className="mt-1 text-fg-muted dark:text-fg-subtle">
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
          <div className="rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/12 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Progress Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-surface dark:bg-surface/10 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-[#1A40FF] dark:text-[#5570FF]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-fg dark:text-white">
                      {t('profile.completion.title')}
                    </h2>
                    <p className="text-sm text-[#1A40FF] dark:text-[#5570FF]">
                      {locale === 'es'
                        ? `${completedSteps} de ${totalSteps} pasos completados`
                        : `${completedSteps} of ${totalSteps} steps completed`}
                    </p>
                  </div>
                </div>
                <div className="h-2 bg-surface/50 dark:bg-surface/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercentage}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-[#1A40FF] rounded-full"
                  />
                </div>
                <p className="text-xs text-fg-muted dark:text-fg-subtle mt-2">
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
                    <span className="text-2xl font-bold text-fg dark:text-white">
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
                        ? 'bg-surface/80 dark:bg-surface/10'
                        : 'bg-surface dark:bg-ink/80 border-2 border-dashed border-[#1A40FF]/30 dark:border-[#B7791F]/30'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
                        step.completed
                          ? 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15'
                          : 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15'
                      )}>
                        {step.completed ? (
                          <CheckCircle className="w-4 h-4 text-[#2C7A53] dark:text-[#3EAE70]" />
                        ) : (
                          <Icon className="w-4 h-4 text-[#1A40FF] dark:text-[#5570FF]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium truncate',
                          step.completed ? 'text-fg dark:text-white' : 'text-[#1A40FF] dark:text-white'
                        )}>
                          {step.label}
                        </p>
                        {step.completed ? (
                          <span className="text-xs text-[#2C7A53] dark:text-[#3EAE70]">{locale === 'es' ? 'Completado' : 'Completed'}</span>
                        ) : step.action ? (
                          <Button
                            variant="link"
                            size="sm"
                            hideArrow
                            onClick={() => handleVerifyStep(step.id)}
                            className="px-0 text-xs text-[#1A40FF] dark:text-[#5570FF]"
                          >
                            {step.action} →
                          </Button>
                        ) : (
                          <span className="text-xs text-fg-muted dark:text-fg-subtle">{t('common.pending')}</span>
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
            <div className="rounded-xl border border-border dark:border-white/10 bg-surface dark:bg-[#1a1a1c] overflow-hidden">
              <div className="relative bg-[#EEF1FF] dark:bg-[#1A40FF]/12 h-28">
                {/* Edit button for avatar section */}
                {editingSection !== 'avatar' && (
                  <IconButton
                    variant="ghost"
                    onClick={() => {
                      setAvatarPreview(savedAvatar);
                      setEditingSection('avatar');
                    }}
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
                      "w-28 h-28 rounded-full border-4 border-white dark:border-[#1a1a1c] overflow-hidden",
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
                      <div className="w-full h-full bg-surface dark:bg-[#1A40FF] flex items-center justify-center text-fg dark:text-white uppercase tracking-wide font-mono font-bold text-4xl">
                        {formData.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {editingSection === 'avatar' && (
                    <IconButton
                      variant="ghost"
                      onClick={handleAvatarClick}
                      className="absolute bottom-1 right-1 p-2.5 bg-ink dark:bg-surface rounded-full text-white dark:text-fg hover:bg-ink dark:hover:bg-surface-muted"
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
                        ? "border-[#1A40FF]/30 bg-[#EEF1FF] dark:bg-[#1A40FF]/15"
                        : "border-border dark:border-white/20 hover:border-[#1A40FF]/30 dark:hover:border-[#1A40FF]/30 hover:bg-surface-muted dark:hover:bg-surface/5"
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
                            <p className="text-sm font-medium text-fg dark:text-white">
                              {locale === 'es' ? 'Imagen seleccionada' : 'Image selected'}
                            </p>
                            <p className="text-xs text-fg-muted dark:text-fg-subtle">
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
                          className="p-2 rounded-md text-fg-subtle hover:text-[#C4503B] hover:bg-[#F8EAE7] dark:hover:bg-[#C4503B]/30"
                          aria-label={locale === 'es' ? 'Quitar imagen' : 'Remove image'}
                          icon={<TrashSimple className="w-4 h-4" />}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-surface-muted dark:bg-surface/10 flex items-center justify-center mx-auto mb-3">
                          <Upload className="w-6 h-6 text-fg-subtle dark:text-fg-muted" />
                        </div>
                        <p className="text-sm font-medium text-fg dark:text-fg-subtle">
                          {isDragging
                            ? (locale === 'es' ? 'Suelta la imagen aquí' : 'Drop the image here')
                            : (locale === 'es' ? 'Subir foto de perfil' : 'Upload profile photo')}
                        </p>
                        <p className="text-xs text-fg-muted dark:text-fg-subtle mt-1">
                          {locale === 'es' ? 'Arrastra o haz clic • JPG, PNG (máx. 5MB)' : 'Drag or click • JPG, PNG (max 5MB)'}
                        </p>
                      </>
                    )}
                  </div>
                )}

                {editingSection === 'avatar' ? (
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full text-lg font-semibold rounded-md bg-surface dark:bg-surface/5"
                  />
                ) : (
                  <h2 className="text-xl font-semibold text-fg dark:text-white">{formData.name}</h2>
                )}
                <p className="text-sm text-fg-muted dark:text-fg-subtle mt-1">
                  {locale === 'es' ? 'Inquilino desde Enero 2024' : 'Tenant since January 2024'}
                </p>

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
                      onClick={() => handleSave('avatar')}
                      disabled={isSaving}
                      className="flex-1 rounded-md bg-ink dark:bg-surface text-white dark:text-fg hover:bg-ink dark:hover:bg-surface-muted"
                    >
                      {!isSaving && <FloppyDisk className="w-4 h-4" />}
                      {t('common.save')}
                    </Button>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="mt-6 pt-6 border-t border-border-faint dark:border-white/10 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E8F3EC] dark:bg-[#2C7A53]/15 flex items-center justify-center">
                      <Buildings className="w-5 h-5 text-[#2C7A53] dark:text-[#3EAE70]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-fg dark:text-white">
                        {locale === 'es' ? '1 Arriendo activo' : '1 Active rental'}
                      </p>
                      <p className="text-xs text-fg-muted dark:text-fg-subtle">Departamento Providencia</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-fg dark:text-white">
                        {locale === 'es' ? '12 Pagos realizados' : '12 Payments made'}
                      </p>
                      <p className="text-xs text-fg-muted dark:text-fg-subtle">
                        {locale === 'es' ? '100% a tiempo' : '100% on time'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Status Card */}
            <div className="rounded-xl border border-border dark:border-white/10 bg-surface dark:bg-[#1a1a1c] p-6">
              <h3 className="font-semibold text-fg dark:text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-fg-subtle dark:text-fg-muted" />
                {t('profile.verification.title')}
              </h3>
              <div className="space-y-3">
                {[
                  { key: 'email', label: 'Email', verified: true },
                  { key: 'phone', label: locale === 'es' ? 'Teléfono' : 'Phone', verified: true },
                  { key: 'identity', label: locale === 'es' ? 'Identidad' : 'Identity', verified: true },
                  { key: 'employment', label: locale === 'es' ? 'Empleo' : 'Employment', verified: false },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-surface-muted dark:bg-ink border border-border-faint dark:border-border-strong">
                    <span className="text-sm font-medium text-fg dark:text-white">{item.label}</span>
                    {item.verified ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-[#2C7A53] dark:text-[#3EAE70] bg-[#E8F3EC] dark:bg-[#2C7A53]/15 px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {t('profile.verification.verified')}
                      </span>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        hideArrow
                        onClick={() => handleVerifyStep('employment-verify')}
                        className="rounded-full px-2.5 py-1 text-xs text-[#1A40FF] dark:text-[#5570FF] bg-[#EEF1FF] dark:bg-[#1A40FF]/15"
                      >
                        {t('profile.verification.verify')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Profile Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Personal Information */}
            <div className="rounded-xl border border-border dark:border-white/10 bg-surface dark:bg-[#1a1a1c] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-fg dark:text-white">{t('profile.personalInfo')}</h3>
                {editingSection !== 'personal' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    hideArrow
                    onClick={() => setEditingSection('personal')}
                    className="gap-1.5 rounded-md text-fg-muted dark:text-fg-subtle hover:text-fg dark:hover:text-white"
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
                      onClick={() => handleSave('personal')}
                      disabled={isSaving}
                      className="gap-1.5 rounded-md bg-ink dark:bg-surface text-white dark:text-fg hover:bg-ink dark:hover:bg-surface-muted"
                    >
                      {!isSaving && <FloppyDisk className="w-3.5 h-3.5" />}
                      {t('common.save')}
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-2">
                    {t('profile.fullName')}
                  </label>
                  {editingSection === 'personal' ? (
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full rounded-xl bg-surface dark:bg-surface/5"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted dark:bg-surface/5 rounded-xl">
                      <User className="w-4 h-4 text-fg-subtle dark:text-fg-muted" />
                      <span className="text-sm text-fg dark:text-white">{formData.name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-2">
                    {t('profile.idNumber')}
                  </label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted dark:bg-surface/5 rounded-xl">
                    <Shield className="w-4 h-4 text-fg-subtle dark:text-fg-muted" />
                    <span className="text-sm text-fg dark:text-white">{formData.rut}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-2">
                    Email
                  </label>
                  {editingSection === 'personal' ? (
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full rounded-xl bg-surface dark:bg-surface/5"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted dark:bg-surface/5 rounded-xl">
                      <Envelope className="w-4 h-4 text-fg-subtle dark:text-fg-muted" />
                      <span className="text-sm text-fg dark:text-white">{formData.email}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-2">
                    {t('profile.phone')}
                  </label>
                  {editingSection === 'personal' ? (
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full rounded-xl bg-surface dark:bg-surface/5"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted dark:bg-surface/5 rounded-xl">
                      <Phone className="w-4 h-4 text-fg-subtle dark:text-fg-muted" />
                      <span className="text-sm text-fg dark:text-white">{formData.phone}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-2">
                    {t('profile.dateOfBirth')}
                  </label>
                  {editingSection === 'personal' ? (
                    <Input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => handleInputChange('birthDate', e.target.value)}
                      className="w-full rounded-xl bg-surface dark:bg-surface/5"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted dark:bg-surface/5 rounded-xl">
                      <Calendar className="w-4 h-4 text-fg-subtle dark:text-fg-muted" />
                      <span className="text-sm text-fg dark:text-white">
                        {new Date(formData.birthDate).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-2">
                    {t('profile.address')}
                  </label>
                  {editingSection === 'personal' ? (
                    <Input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full rounded-xl bg-surface dark:bg-surface/5"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted dark:bg-surface/5 rounded-xl">
                      <MapPin className="w-4 h-4 text-fg-subtle dark:text-fg-muted" />
                      <span className="text-sm text-fg dark:text-white">{formData.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="rounded-xl border border-border dark:border-white/10 bg-surface dark:bg-[#1a1a1c] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-fg dark:text-white">{t('profile.emergencyContact')}</h3>
                {editingSection !== 'emergency' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    hideArrow
                    onClick={() => setEditingSection('emergency')}
                    className="gap-1.5 rounded-md text-fg-muted dark:text-fg-subtle hover:text-fg dark:hover:text-white"
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
                      onClick={() => handleSave('emergency')}
                      disabled={isSaving}
                      className="gap-1.5 rounded-md bg-ink dark:bg-surface text-white dark:text-fg hover:bg-ink dark:hover:bg-surface-muted"
                    >
                      {!isSaving && <FloppyDisk className="w-3.5 h-3.5" />}
                      {t('common.save')}
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-2">
                  {locale === 'es' ? 'Nombre y teléfono' : 'Name and phone'}
                </label>
                {editingSection === 'emergency' ? (
                  <Input
                    type="text"
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    className="w-full rounded-xl bg-surface dark:bg-surface/5"
                    placeholder={locale === 'es' ? 'Nombre - Teléfono' : 'Name - Phone'}
                  />
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted dark:bg-surface/5 rounded-xl">
                    <UserPlus className="w-4 h-4 text-fg-subtle dark:text-fg-muted" />
                    <span className="text-sm text-fg dark:text-white">{formData.emergencyContact}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-xl border border-[#C4503B]/30 dark:border-[#C4503B]/40 bg-[#F8EAE7]/30 dark:bg-[#C4503B]/20 p-6">
              <h3 className="font-semibold text-[#C4503B] dark:text-[#E0664D] mb-2 flex items-center gap-2">
                <WarningCircle className="w-5 h-5" />
                {locale === 'es' ? 'Zona de peligro' : 'Danger zone'}
              </h3>
              <p className="text-sm text-fg-muted dark:text-fg-subtle mb-4">
                {locale === 'es'
                  ? 'Estas acciones son irreversibles. Por favor, procede con precaución.'
                  : 'These actions are irreversible. Please proceed with caution.'}
              </p>
              <Button
                variant="outline"
                hideArrow
                onClick={handleOpenDeleteModal}
                className="rounded-full border-[#C4503B]/30 dark:border-[#C4503B]/40 text-[#C4503B] dark:text-[#E0664D] hover:bg-[#F8EAE7] dark:hover:bg-[#C4503B]/30 hover:text-[#C4503B] dark:hover:text-[#E0664D]"
              >
                {t('settings.account.deleteAccount')}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Verify Employment Modal */}
      {showVerifyModal === 'employment-verify' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-surface dark:bg-[#1a1a1c] rounded-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-fg dark:text-white">
                {locale === 'es' ? 'Verificar empleo' : 'Verify employment'}
              </h3>
              <IconButton
                variant="ghost"
                onClick={() => setShowVerifyModal(null)}
                className="p-2 rounded-full hover:bg-surface-muted dark:hover:bg-surface/10"
                aria-label={locale === 'es' ? 'Cerrar' : 'Close'}
                icon={<X className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />}
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-2">
                  {locale === 'es' ? 'Empresa' : 'Company'}
                </label>
                <Input
                  type="text"
                  placeholder={locale === 'es' ? 'Nombre de tu empresa' : 'Your company name'}
                  className="w-full rounded-xl bg-surface dark:bg-surface/5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-2">
                  {locale === 'es' ? 'Cargo' : 'Position'}
                </label>
                <Input
                  type="text"
                  placeholder={locale === 'es' ? 'Tu cargo actual' : 'Your current position'}
                  className="w-full rounded-xl bg-surface dark:bg-surface/5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-2">
                  {locale === 'es' ? 'Ingreso mensual (CLP)' : 'Monthly income (CLP)'}
                </label>
                <Input
                  type="text"
                  placeholder={locale === 'es' ? 'Ej: $1.500.000' : 'E.g.: $1,500,000'}
                  className="w-full rounded-xl bg-surface dark:bg-surface/5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-2">
                  {locale === 'es' ? 'Comprobante de ingresos' : 'Proof of income'}
                </label>
                <div className="border-2 border-dashed border-border dark:border-white/20 rounded-xl p-6 text-center hover:border-[#1A40FF]/30 dark:hover:border-[#1A40FF]/30 transition-colors cursor-pointer">
                  <FileText className="w-8 h-8 text-fg-subtle dark:text-fg-muted mx-auto mb-2" />
                  <p className="text-sm text-fg-muted dark:text-fg-subtle">
                    {locale === 'es' ? 'Arrastra o haz clic para subir' : 'Drag or click to upload'}
                  </p>
                  <p className="text-xs text-fg-subtle dark:text-fg-muted mt-1">
                    {locale === 'es' ? 'PDF, JPG o PNG (máx. 5MB)' : 'PDF, JPG or PNG (max. 5MB)'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                hideArrow
                onClick={() => setShowVerifyModal(null)}
                className="flex-1 rounded-full"
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="secondary"
                hideArrow
                onClick={() => {
                  toast.success(locale === 'es' ? 'Verificación enviada. Te notificaremos cuando sea aprobada.' : 'Verification sent. We will notify you when approved.');
                  setShowVerifyModal(null);
                }}
                className="flex-1 rounded-full bg-ink dark:bg-surface text-white dark:text-fg hover:bg-ink dark:hover:bg-surface-muted"
              >
                {locale === 'es' ? 'Enviar verificación' : 'Submit verification'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-surface dark:bg-[#1a1a1c] rounded-xl max-w-md w-full overflow-hidden"
          >
            {/* Step 1: Warning */}
            {deleteStep === 1 && (
              <>
                {/* Header with icon */}
                <div className="bg-[#F8EAE7] dark:bg-[#C4503B]/15 px-6 py-8 text-center border-b border-[#C4503B]/30 dark:border-[#C4503B]/40">
                  <div className="w-16 h-16 rounded-full bg-[#F8EAE7] dark:bg-[#C4503B]/15 flex items-center justify-center mx-auto mb-4">
                    <Warning className="w-8 h-8 text-[#C4503B] dark:text-[#E0664D]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#C4503B] dark:text-[#E0664D]">
                    {locale === 'es' ? '¿Eliminar tu cuenta?' : 'Delete your account?'}
                  </h3>
                  <p className="text-sm text-[#C4503B] dark:text-[#E0664D] mt-1">
                    {locale === 'es' ? 'Esta acción es permanente e irreversible' : 'This action is permanent and irreversible'}
                  </p>
                </div>

                <div className="p-6">
                  {/* What will be deleted */}
                  <div className="mb-6">
                    <p className="text-sm font-medium text-fg dark:text-white mb-3">
                      {locale === 'es' ? 'Se eliminará permanentemente:' : 'Will be permanently deleted:'}
                    </p>
                    <ul className="space-y-2">
                      {(locale === 'es' ? [
                        'Tu perfil y toda tu información personal',
                        'Historial de aplicaciones y documentos',
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
                        <li key={index} className="flex items-start gap-2 text-sm text-fg-muted dark:text-fg-subtle">
                          <TrashSimple className="w-4 h-4 text-[#C4503B] dark:text-[#E0664D] mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Active lease warning */}
                  <div className="p-4 rounded-xl bg-[#F8F0E0] dark:bg-[#B7791F]/15 border border-[#B7791F]/30 dark:border-[#B7791F]/40 mb-6">
                    <div className="flex items-start gap-3">
                      <WarningCircle className="w-5 h-5 text-[#B7791F] dark:text-[#D2992F] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[#B7791F] dark:text-[#D2992F]">
                          {locale === 'es' ? 'Tienes un arriendo activo' : 'You have an active rental'}
                        </p>
                        <p className="text-xs text-[#B7791F] dark:text-[#D2992F] mt-0.5">
                          {locale === 'es'
                            ? 'Eliminar tu cuenta no cancela tu contrato de arriendo vigente. Deberás contactar a tu arrendador.'
                            : 'Deleting your account does not cancel your current lease agreement. You will need to contact your landlord.'}
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
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-faint dark:border-white/10">
                  <h3 className="text-lg font-semibold text-fg dark:text-white">
                    {locale === 'es' ? 'Confirmar eliminación' : 'Confirm deletion'}
                  </h3>
                  <IconButton
                    variant="ghost"
                    onClick={handleCloseDeleteModal}
                    className="p-2 rounded-full hover:bg-surface-muted dark:hover:bg-surface/10"
                    aria-label={locale === 'es' ? 'Cerrar' : 'Close'}
                    icon={<X className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />}
                  />
                </div>

                <div className="p-6">
                  <p className="text-sm text-fg-muted dark:text-fg-subtle mb-4">
                    {locale === 'es' ? (
                      <>
                        Para confirmar la eliminación de tu cuenta, escribe{' '}
                        <span className="font-mono font-semibold text-[#C4503B] dark:text-[#E0664D]">ELIMINAR</span>{' '}
                        en el campo de abajo:
                      </>
                    ) : (
                      <>
                        To confirm account deletion, type{' '}
                        <span className="font-mono font-semibold text-[#C4503B] dark:text-[#E0664D]">DELETE</span>{' '}
                        in the field below:
                      </>
                    )}
                  </p>

                  <Input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                    placeholder={locale === 'es' ? 'Escribe ELIMINAR' : 'Type DELETE'}
                    className="w-full rounded-xl bg-surface dark:bg-surface/5 font-mono text-center tracking-widest focus-visible:border-[#C4503B]/30 focus-visible:ring-[#C4503B]/20"
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
                      disabled={(locale === 'es' ? deleteConfirmText !== 'ELIMINAR' : deleteConfirmText !== 'DELETE') || isDeleting}
                      className="flex-1 rounded-full"
                    >
                      {isDeleting
                        ? (locale === 'es' ? 'Eliminando...' : 'Deleting...')
                        : (locale === 'es' ? 'Eliminar mi cuenta' : 'Delete my account')}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Goodbye */}
            {deleteStep === 3 && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-surface-muted dark:bg-surface/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-fg-muted dark:text-fg-subtle" />
                </div>
                <h3 className="text-xl font-semibold text-fg dark:text-white mb-2">
                  {locale === 'es' ? 'Cuenta eliminada' : 'Account deleted'}
                </h3>
                <p className="text-sm text-fg-muted dark:text-fg-subtle">
                  {locale === 'es'
                    ? 'Tu cuenta ha sido eliminada exitosamente. Gracias por usar Leasefy.'
                    : 'Your account has been successfully deleted. Thank you for using Leasefy.'}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
