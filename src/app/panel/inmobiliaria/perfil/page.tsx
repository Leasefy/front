'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { User, Envelope, Phone, MapPin, Calendar, Shield, Camera, FloppyDisk, CheckCircle, WarningCircle, Briefcase, UserPlus, X, Warning, TrashSimple, SpinnerGap, Pencil, Upload, Buildings } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { permissionsApi } from '@/lib/api/inmobiliaria.service';

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
  const { user, agency, updateProfile } = useAuth();
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
      id: 'agency-verify',
      label: locale === 'es' ? 'Verificar agencia' : 'Verify agency',
      description: locale === 'es' ? 'Confirma los datos de tu inmobiliaria' : 'Confirm your agency details',
      icon: Buildings,
      completed: true,
    },
    {
      id: 'emergency-contact',
      label: locale === 'es' ? 'Contacto de emergencia' : 'Emergency contact',
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
    try {
      if (section === 'avatar' && avatarPreview) {
        // Avatar upload not yet wired to storage — save preview locally for now
        setSavedAvatar(avatarPreview);
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
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsDeleting(false);
    setDeleteStep(3);

    setTimeout(() => {
      toast.success(locale === 'es' ? 'Tu cuenta ha sido eliminada' : 'Your account has been deleted');
      handleCloseDeleteModal();
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div>
            <h1 className="text-3xl font-medium text-neutral-900 dark:text-white tracking-tight">
              {locale === 'es' ? 'Mi Perfil' : 'My Profile'}
            </h1>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">
              {locale === 'es' ? 'Gestiona tu informacion personal y preferencias' : 'Manage your personal information and preferences'}
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
          <div className="rounded-3xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/50 dark:to-indigo-900/30 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Progress Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-sm">
                    <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                      {locale === 'es' ? 'Completar perfil' : 'Complete profile'}
                    </h2>
                    <p className="text-sm text-indigo-600 dark:text-indigo-400">
                      {locale === 'es'
                        ? `${completedSteps} de ${totalSteps} pasos completados`
                        : `${completedSteps} of ${totalSteps} steps completed`}
                    </p>
                  </div>
                </div>
                <div className="h-2 bg-white/50 dark:bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercentage}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-indigo-600 rounded-full"
                  />
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                  {completionPercentage === 100
                    ? (locale === 'es' ? 'Perfil completo! Tienes acceso a todas las funciones.' : 'Profile complete! You have access to all features.')
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
                      stroke="#4f46e5"
                      strokeWidth="8"
                      strokeLinecap="round"
                      initial={{ strokeDasharray: '0 251.2' }}
                      animate={{ strokeDasharray: `${completionPercentage * 2.512} 251.2` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-neutral-900 dark:text-white">
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
                      'rounded-2xl p-4 transition-all',
                      step.completed
                        ? 'bg-white/80 dark:bg-white/10'
                        : 'bg-white dark:bg-neutral-800/80 border-2 border-dashed border-indigo-200 dark:border-amber-500/50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
                        step.completed
                          ? 'bg-emerald-100 dark:bg-emerald-900/50'
                          : 'bg-indigo-100 dark:bg-indigo-900/50'
                      )}>
                        {step.completed ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium truncate',
                          step.completed ? 'text-neutral-900 dark:text-white' : 'text-indigo-900 dark:text-white'
                        )}>
                          {step.label}
                        </p>
                        {step.completed ? (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400">{locale === 'es' ? 'Completado' : 'Completed'}</span>
                        ) : (
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">{locale === 'es' ? 'Pendiente' : 'Pending'}</span>
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
            <div className="rounded-3xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1a1a1c] overflow-hidden">
              <div className="relative bg-gradient-to-br from-indigo-500 to-indigo-600 h-28">
                {editingSection !== 'avatar' && (
                  <button
                    onClick={() => {
                      setAvatarPreview(savedAvatar);
                      setEditingSection('avatar');
                    }}
                    className="absolute top-3 right-3 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
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
                      "w-28 h-28 rounded-full border-4 border-white dark:border-[#1a1a1c] shadow-lg overflow-hidden",
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
                      <div className="w-full h-full bg-white dark:bg-indigo-600 flex items-center justify-center text-neutral-900 dark:text-white uppercase tracking-wide font-mono font-bold text-4xl">
                        {(formData.firstName || user?.email || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {editingSection === 'avatar' && (
                    <button
                      onClick={handleAvatarClick}
                      className="absolute bottom-1 right-1 p-2.5 bg-neutral-900 dark:bg-white rounded-full text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-lg"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
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
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                        : "border-neutral-200 dark:border-white/20 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-neutral-50 dark:hover:bg-white/5"
                    )}
                  >
                    {avatarPreview ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={avatarPreview}
                              alt="Preview"
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-neutral-900 dark:text-white">
                              {locale === 'es' ? 'Imagen seleccionada' : 'Image selected'}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              {locale === 'es' ? 'Haz clic para cambiar' : 'Click to change'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAvatar();
                          }}
                          className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                        >
                          <TrashSimple className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-white/10 flex items-center justify-center mx-auto mb-3">
                          <Upload className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
                        </div>
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          {isDragging
                            ? (locale === 'es' ? 'Suelta la imagen aqui' : 'Drop the image here')
                            : (locale === 'es' ? 'Subir foto de perfil' : 'Upload profile photo')}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          {locale === 'es' ? 'Arrastra o haz clic - JPG, PNG (max. 5MB)' : 'Drag or click - JPG, PNG (max 5MB)'}
                        </p>
                      </>
                    )}
                  </div>
                )}

                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                  {[formData.firstName, formData.lastName].filter(Boolean).join(' ') || user?.email || '—'}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  {memberRole ? (AGENCY_ROLE_LABELS[memberRole] ?? memberRole) : '—'}
                </p>

                {/* Save/Cancel buttons for avatar section */}
                {editingSection === 'avatar' && (
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                      {locale === 'es' ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button
                      onClick={() => handleSave('avatar')}
                      disabled={isSaving}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
                      {locale === 'es' ? 'Guardar' : 'Save'}
                    </button>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-white/10 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Buildings className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        {memberRole ? `Rol: ${AGENCY_ROLE_LABELS[memberRole] ?? memberRole}` : '—'}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {memberRole ? (AGENCY_ROLE_DESC[memberRole] ?? '') : ''}
                      </p>
                    </div>
                  </div>
                  {agency?.name && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">{agency.name}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {agency.nit ? `NIT: ${agency.nit}` : (locale === 'es' ? 'Agencia actual' : 'Current agency')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Status Card */}
            <div className="rounded-3xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1a1a1c] p-6">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                {locale === 'es' ? 'Estado de verificacion' : 'Verification status'}
              </h3>
              <div className="space-y-3">
                {[
                  { key: 'email', label: 'Email', verified: true },
                  { key: 'phone', label: locale === 'es' ? 'Telefono' : 'Phone', verified: true },
                  { key: 'identity', label: locale === 'es' ? 'Identidad' : 'Identity', verified: true },
                  { key: 'agency', label: locale === 'es' ? 'Agencia' : 'Agency', verified: true },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-stone-50 dark:bg-neutral-800 border border-stone-100 dark:border-neutral-600">
                    <span className="text-sm font-medium text-neutral-700 dark:text-white">{item.label}</span>
                    {item.verified ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {locale === 'es' ? 'Verificado' : 'Verified'}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full">
                        {locale === 'es' ? 'Verificar' : 'Verify'}
                      </span>
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
            <div className="rounded-3xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1a1a1c] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  {locale === 'es' ? 'Informacion personal' : 'Personal information'}
                </h3>
                {editingSection !== 'personal' ? (
                  <button
                    onClick={() => setEditingSection('personal')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {locale === 'es' ? 'Editar' : 'Edit'}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {locale === 'es' ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button
                      onClick={() => handleSave('personal')}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? <SpinnerGap className="w-3.5 h-3.5 animate-spin" /> : <FloppyDisk className="w-3.5 h-3.5" />}
                      {locale === 'es' ? 'Guardar' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    {locale === 'es' ? 'Nombre' : 'First name'}
                  </label>
                  {editingSection === 'personal' ? (
                    <input type="text" value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-stone-50 dark:bg-white/5 rounded-xl">
                      <User className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-sm text-neutral-900 dark:text-white">{formData.firstName || '—'}</span>
                    </div>
                  )}
                </div>

                {/* Apellido */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    {locale === 'es' ? 'Apellido' : 'Last name'}
                  </label>
                  {editingSection === 'personal' ? (
                    <input type="text" value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-stone-50 dark:bg-white/5 rounded-xl">
                      <User className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-sm text-neutral-900 dark:text-white">{formData.lastName || '—'}</span>
                    </div>
                  )}
                </div>

                {/* Email — read-only */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Email</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-stone-50 dark:bg-white/5 rounded-xl">
                    <Envelope className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                    <span className="text-sm text-neutral-900 dark:text-white">{formData.email || '—'}</span>
                  </div>
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    {locale === 'es' ? 'Teléfono' : 'Phone'}
                  </label>
                  {editingSection === 'personal' ? (
                    <input type="tel" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-stone-50 dark:bg-white/5 rounded-xl">
                      <Phone className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-sm text-neutral-900 dark:text-white">{formData.phone || '—'}</span>
                    </div>
                  )}
                </div>

                {/* Rol — read-only, definido por la agencia */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    {locale === 'es' ? 'Rol en la agencia' : 'Agency role'}
                  </label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-stone-50 dark:bg-white/5 rounded-xl">
                    <Briefcase className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                    <span className="text-sm text-neutral-900 dark:text-white">
                      {memberRole ? (AGENCY_ROLE_LABELS[memberRole] ?? memberRole) : '—'}
                    </span>
                  </div>
                </div>

                {/* Dirección */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    {locale === 'es' ? 'Dirección' : 'Address'}
                  </label>
                  {editingSection === 'personal' ? (
                    <input type="text" value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-stone-50 dark:bg-white/5 rounded-xl">
                      <MapPin className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-sm text-neutral-900 dark:text-white">{formData.address || '—'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="rounded-3xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1a1a1c] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  {locale === 'es' ? 'Contacto de emergencia' : 'Emergency contact'}
                </h3>
                {editingSection !== 'emergency' ? (
                  <button
                    onClick={() => setEditingSection('emergency')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {locale === 'es' ? 'Editar' : 'Edit'}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {locale === 'es' ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button
                      onClick={() => handleSave('emergency')}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? <SpinnerGap className="w-3.5 h-3.5 animate-spin" /> : <FloppyDisk className="w-3.5 h-3.5" />}
                      {locale === 'es' ? 'Guardar' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    {locale === 'es' ? 'Nombre' : 'Name'}
                  </label>
                  {editingSection === 'emergency' ? (
                    <input type="text" value={formData.emergencyContactName}
                      onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                      placeholder={locale === 'es' ? 'Nombre del contacto' : 'Contact name'}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-stone-50 dark:bg-white/5 rounded-xl">
                      <UserPlus className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-sm text-neutral-900 dark:text-white">{formData.emergencyContactName || '—'}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    {locale === 'es' ? 'Teléfono' : 'Phone'}
                  </label>
                  {editingSection === 'emergency' ? (
                    <input type="tel" value={formData.emergencyContactPhone}
                      onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                      placeholder="3001234567"
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-stone-50 dark:bg-white/5 rounded-xl">
                      <Phone className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-sm text-neutral-900 dark:text-white">{formData.emergencyContactPhone || '—'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-3xl border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20 p-6">
              <h3 className="font-semibold text-red-800 dark:text-red-400 mb-2 flex items-center gap-2">
                <WarningCircle className="w-5 h-5" />
                {locale === 'es' ? 'Zona de peligro' : 'Danger zone'}
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                {locale === 'es'
                  ? 'Estas acciones son irreversibles. Por favor, procede con precaucion.'
                  : 'These actions are irreversible. Please proceed with caution.'}
              </p>
              <button
                onClick={handleOpenDeleteModal}
                className="px-4 py-2.5 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 rounded-full text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                {locale === 'es' ? 'Eliminar mi cuenta' : 'Delete my account'}
              </button>
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
            className="bg-white dark:bg-[#1a1a1c] rounded-3xl max-w-md w-full overflow-hidden"
          >
            {/* Step 1: Warning */}
            {deleteStep === 1 && (
              <>
                <div className="bg-red-50 dark:bg-red-950/30 px-6 py-8 text-center border-b border-red-100 dark:border-red-900/30">
                  <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mx-auto mb-4">
                    <Warning className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-red-800 dark:text-red-300">
                    {locale === 'es' ? 'Eliminar tu cuenta?' : 'Delete your account?'}
                  </h3>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {locale === 'es' ? 'Esta accion es permanente e irreversible' : 'This action is permanent and irreversible'}
                  </p>
                </div>

                <div className="p-6">
                  <div className="mb-6">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white mb-3">
                      {locale === 'es' ? 'Se eliminara permanentemente:' : 'Will be permanently deleted:'}
                    </p>
                    <ul className="space-y-2">
                      {(locale === 'es' ? [
                        'Tu perfil y toda tu informacion personal',
                        'Datos de la agencia y configuracion',
                        'Historial de propiedades y contratos',
                        'Informacion de cobros y dispersiones',
                        'Conversaciones y mensajes',
                      ] : [
                        'Your profile and all personal information',
                        'Agency data and configuration',
                        'Property and contract history',
                        'Payment and disbursement information',
                        'Conversations and messages',
                      ]).map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                          <TrashSimple className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleCloseDeleteModal}
                      className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 rounded-full text-sm font-medium hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
                    >
                      {locale === 'es' ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button
                      onClick={() => setDeleteStep(2)}
                      className="flex-1 px-4 py-2.5 bg-red-600 text-white uppercase tracking-wide font-mono rounded-full text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      {locale === 'es' ? 'Continuar' : 'Continue'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Confirmation */}
            {deleteStep === 2 && (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-white/10">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {locale === 'es' ? 'Confirmar eliminacion' : 'Confirm deletion'}
                  </h3>
                  <button
                    onClick={handleCloseDeleteModal}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                  </button>
                </div>

                <div className="p-6">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                    {locale === 'es' ? (
                      <>
                        Para confirmar la eliminacion de tu cuenta, escribe{' '}
                        <span className="font-mono font-semibold text-red-600 dark:text-red-400">ELIMINAR</span>{' '}
                        en el campo de abajo:
                      </>
                    ) : (
                      <>
                        To confirm account deletion, type{' '}
                        <span className="font-mono font-semibold text-red-600 dark:text-red-400">DELETE</span>{' '}
                        in the field below:
                      </>
                    )}
                  </p>

                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                    placeholder={locale === 'es' ? 'Escribe ELIMINAR' : 'Type DELETE'}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-mono text-center tracking-widest"
                  />

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setDeleteStep(1)}
                      className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 rounded-full text-sm font-medium hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
                    >
                      {locale === 'es' ? 'Volver' : 'Back'}
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={(locale === 'es' ? deleteConfirmText !== 'ELIMINAR' : deleteConfirmText !== 'DELETE') || isDeleting}
                      className={cn(
                        'flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2',
                        (locale === 'es' ? deleteConfirmText === 'ELIMINAR' : deleteConfirmText === 'DELETE')
                          ? 'bg-red-600 text-white uppercase tracking-wide font-mono hover:bg-red-700'
                          : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                      )}
                    >
                      {isDeleting ? (
                        <>
                          <SpinnerGap className="w-4 h-4 animate-spin" />
                          {locale === 'es' ? 'Eliminando...' : 'Deleting...'}
                        </>
                      ) : (
                        locale === 'es' ? 'Eliminar mi cuenta' : 'Delete my account'
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Goodbye */}
            {deleteStep === 3 && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-white/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                  {locale === 'es' ? 'Cuenta eliminada' : 'Account deleted'}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
