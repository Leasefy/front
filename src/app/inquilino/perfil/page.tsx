'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { User, Envelope, Phone, MapPin, Calendar, Shield, Camera, FloppyDisk, ArrowLeft, CheckCircle, Circle, WarningCircle, FileText, Buildings, Briefcase, UserPlus, ArrowUpRight, X, Warning, TrashSimple, SpinnerGap, Pencil, Upload, Image as ImageIcon, ArrowClockwise } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { apiClient } from '@/lib/api/client';

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
  const { user, updateProfile } = useAuth();
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

  // Employment verification modal state
  const [employmentForm, setEmploymentForm] = useState({ empresa: '', cargo: '', ingreso: '' });
  const [employmentFile, setEmploymentFile] = useState<File | null>(null);
  const [isSubmittingEmployment, setIsSubmittingEmployment] = useState(false);
  const employmentFileRef = useRef<HTMLInputElement>(null);

  const handleEmploymentSubmit = async () => {
    if (!employmentForm.empresa.trim() || !employmentForm.ingreso.trim()) {
      toast.error(locale === 'es' ? 'Completa empresa e ingreso mensual' : 'Fill in company and monthly income');
      return;
    }
    setIsSubmittingEmployment(true);
    try {
      const nameParts = (user?.name || '').trim().split(/\s+/);
      const firstName = user?.firstName || nameParts[0] || '';
      const lastName = user?.lastName || nameParts.slice(1).join(' ') || firstName;
      const rawIngreso = parseInt(employmentForm.ingreso.replace(/[^0-9]/g, ''), 10);

      await apiClient.post('/users/me/onboarding', {
        userType: 'TENANT',
        firstName,
        lastName,
        companyName: employmentForm.empresa,
        monthlyIncome: isNaN(rawIngreso) ? undefined : rawIngreso,
        employmentType: 'employed',
      });

      if (employmentFile) {
        const formData = new FormData();
        formData.append('file', employmentFile);
        formData.append('type', 'INCOME_PROOF');
        try {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
          const { getAccessToken } = await import('@/lib/api/client');
          await fetch(`${backendUrl}/documents/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getAccessToken()}` },
            body: formData,
          });
        } catch {
          // Document upload requires an active application — employment data was still saved
        }
      }

      toast.success(locale === 'es' ? 'Información laboral guardada correctamente' : 'Employment info saved successfully');
      setShowVerifyModal(null);
      setEmploymentForm({ empresa: '', cargo: '', ingreso: '' });
      setEmploymentFile(null);
    } catch {
      toast.error(locale === 'es' ? 'Error al guardar la información' : 'Error saving information');
    } finally {
      setIsSubmittingEmployment(false);
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    rut: user?.rut || '',
    address: user?.address || '',
    birthDate: user?.birthDate ? user.birthDate.split('T')[0] : '',
    emergencyContactName: user?.emergencyContactName || '',
    emergencyContactPhone: user?.emergencyContactPhone || '',
  });

  // Setup steps with completion status derived from real user data
  const tenantData = user?.tenantOnboardingData
  const setupSteps: SetupStep[] = [
    {
      id: 'basic-info',
      label: locale === 'es' ? 'Información básica' : 'Basic information',
      description: locale === 'es' ? 'Nombre, email y datos personales' : 'Name, email and personal data',
      icon: User,
      completed: !!(user?.firstName || user?.name),
    },
    {
      id: 'phone-verify',
      label: locale === 'es' ? 'Verificar teléfono' : 'Verify phone',
      description: locale === 'es' ? 'Confirma tu número de teléfono' : 'Confirm your phone number',
      icon: Phone,
      completed: !!user?.phone,
    },
    {
      id: 'identity-verify',
      label: locale === 'es' ? 'Verificar identidad' : 'Verify identity',
      description: locale === 'es' ? 'Sube tu documento de identidad' : 'Upload your ID document',
      icon: Shield,
      completed: !!user?.rut,
    },
    {
      id: 'employment-verify',
      label: locale === 'es' ? 'Verificar empleo' : 'Verify employment',
      description: locale === 'es' ? 'Agrega tu información laboral' : 'Add your employment information',
      icon: Briefcase,
      completed: !!(tenantData?.companyName && tenantData?.monthlyIncome),
      action: t('profile.verification.verify'),
    },
    {
      id: 'emergency-contact',
      label: t('profile.emergencyContact'),
      description: locale === 'es' ? 'Agrega un contacto de emergencia' : 'Add an emergency contact',
      icon: UserPlus,
      completed: !!user?.emergencyContactName,
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
      if (section === 'personal') {
        const [firstName, ...rest] = formData.name.trim().split(' ');
        const lastName = rest.join(' ') || undefined;
        await updateProfile({
          firstName: firstName || undefined,
          lastName,
          phone: formData.phone || undefined,
          rut: formData.rut || undefined,
          address: formData.address || undefined,
          birthDate: formData.birthDate || undefined,
        });
      } else if (section === 'emergency') {
        await updateProfile({
          emergencyContactName: formData.emergencyContactName || undefined,
          emergencyContactPhone: formData.emergencyContactPhone || undefined,
        });
      } else if (section === 'avatar' && avatarPreview) {
        setSavedAvatar(avatarPreview);
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
              {t('profile.title')}
            </h1>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">
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
                      {t('profile.completion.title')}
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
                        ) : step.action ? (
                          <button
                            onClick={() => handleVerifyStep(step.id)}
                            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                          >
                            {step.action} →
                          </button>
                        ) : (
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">{t('common.pending')}</span>
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
                {/* Edit button for avatar section */}
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
                  {/* Avatar circle with image preview */}
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
                      <div className="w-full h-full bg-white dark:bg-indigo-600 flex items-center justify-center text-neutral-900 dark:text-white font-bold text-4xl">
                        {formData.name.charAt(0).toUpperCase()}
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
                            ? (locale === 'es' ? 'Suelta la imagen aquí' : 'Drop the image here')
                            : (locale === 'es' ? 'Subir foto de perfil' : 'Upload profile photo')}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          {locale === 'es' ? 'Arrastra o haz clic • JPG, PNG (máx. 5MB)' : 'Drag or click • JPG, PNG (max 5MB)'}
                        </p>
                      </>
                    )}
                  </div>
                )}

                {editingSection === 'avatar' ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 text-lg font-semibold rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                ) : (
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">{formData.name}</h2>
                )}
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  {locale === 'es' ? 'Inquilino desde Enero 2024' : 'Tenant since January 2024'}
                </p>

                {/* FloppyDisk/Cancel buttons for avatar section */}
                {editingSection === 'avatar' && (
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={() => handleSave('avatar')}
                      disabled={isSaving}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
                      {t('common.save')}
                    </button>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-white/10 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                      <Buildings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        {locale === 'es' ? 'Inquilino activo' : 'Active tenant'}
                      </p>
                      {user?.address ? (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{user.address}</p>
                      ) : (
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">
                          {locale === 'es' ? 'Sin dirección registrada' : 'No address registered'}
                        </p>
                      )}
                    </div>
                  </div>
                  {tenantData?.companyName && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          {tenantData.companyName}
                        </p>
                        {tenantData.monthlyIncome && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {locale === 'es' ? 'Ingreso: ' : 'Income: '}
                            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(tenantData.monthlyIncome)}
                          </p>
                        )}
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
                {t('profile.verification.title')}
              </h3>
              <div className="space-y-3">
                {[
                  { key: 'email', label: 'Email', verified: !!user?.email },
                  { key: 'phone', label: locale === 'es' ? 'Teléfono' : 'Phone', verified: !!user?.phone },
                  { key: 'identity', label: locale === 'es' ? 'Identidad' : 'Identity', verified: !!user?.rut },
                  { key: 'employment', label: locale === 'es' ? 'Empleo' : 'Employment', verified: !!(tenantData?.companyName && tenantData?.monthlyIncome) },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-stone-50 dark:bg-neutral-800 border border-stone-100 dark:border-neutral-600">
                    <span className="text-sm font-medium text-neutral-700 dark:text-white">{item.label}</span>
                    {item.verified ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {t('profile.verification.verified')}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleVerifyStep('employment-verify')}
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full transition-colors"
                      >
                        {t('profile.verification.verify')}
                      </button>
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
                <h3 className="font-semibold text-neutral-900 dark:text-white">{t('profile.personalInfo')}</h3>
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
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={() => handleSave('personal')}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? <SpinnerGap className="w-3.5 h-3.5 animate-spin" /> : <FloppyDisk className="w-3.5 h-3.5" />}
                      {t('common.save')}
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    {t('profile.fullName')}
                  </label>
                  {editingSection === 'personal' ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-stone-50 dark:bg-white/5 rounded-xl">
                      <User className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-sm text-neutral-900 dark:text-white">{formData.name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    {t('profile.idNumber')}
                  </label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-stone-50 dark:bg-white/5 rounded-xl">
                    <Shield className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                    <span className="text-sm text-neutral-900 dark:text-white">{formData.rut}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Email
                  </label>
                  {editingSection === 'personal' ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-stone-50 dark:bg-white/5 rounded-xl">
                      <Envelope className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-sm text-neutral-900 dark:text-white">{formData.email}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    {t('profile.phone')}
                  </label>
                  {editingSection === 'personal' ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-stone-50 dark:bg-white/5 rounded-xl">
                      <Phone className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-sm text-neutral-900 dark:text-white">{formData.phone}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    {t('profile.dateOfBirth')}
                  </label>
                  {editingSection === 'personal' ? (
                    <input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => handleInputChange('birthDate', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-stone-50 dark:bg-white/5 rounded-xl">
                      <Calendar className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-sm text-neutral-900 dark:text-white">
                        {formData.birthDate
                          ? new Date(formData.birthDate).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : (locale === 'es' ? 'No especificada' : 'Not specified')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    {t('profile.address')}
                  </label>
                  {editingSection === 'personal' ? (
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-stone-50 dark:bg-white/5 rounded-xl">
                      <MapPin className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-sm text-neutral-900 dark:text-white">{formData.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="rounded-3xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1a1a1c] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-neutral-900 dark:text-white">{t('profile.emergencyContact')}</h3>
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
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={() => handleSave('emergency')}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? <SpinnerGap className="w-3.5 h-3.5 animate-spin" /> : <FloppyDisk className="w-3.5 h-3.5" />}
                      {t('common.save')}
                    </button>
                  </div>
                )}
              </div>
              {editingSection === 'emergency' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      {locale === 'es' ? 'Nombre' : 'Name'}
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyContactName}
                      onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder={locale === 'es' ? 'Ej: Carlos Pérez' : 'E.g. Carlos Pérez'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      {locale === 'es' ? 'Teléfono' : 'Phone'}
                    </label>
                    <input
                      type="tel"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder="3001234567"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 bg-stone-50 dark:bg-white/5 rounded-xl">
                  <UserPlus className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" />
                  {formData.emergencyContactName || formData.emergencyContactPhone ? (
                    <div>
                      {formData.emergencyContactName && (
                        <p className="text-sm text-neutral-900 dark:text-white">{formData.emergencyContactName}</p>
                      )}
                      {formData.emergencyContactPhone && (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{formData.emergencyContactPhone}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-neutral-400 dark:text-neutral-500">
                      {locale === 'es' ? 'No configurado' : 'Not set'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Redo Onboarding */}
            <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-white/[0.02] p-6">
              <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-2 flex items-center gap-2">
                <ArrowClockwise className="w-5 h-5" />
                {locale === 'es' ? 'Reconfigurar perfil' : 'Reconfigure profile'}
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                {locale === 'es'
                  ? 'Vuelve a completar el proceso de configuración para actualizar tu información de inquilino.'
                  : 'Complete the setup process again to update your tenant profile.'}
              </p>
              <Link
                href="/onboarding/inquilino"
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full text-sm font-medium hover:bg-neutral-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                <ArrowClockwise className="w-4 h-4" />
                {locale === 'es' ? 'Re-hacer onboarding' : 'Redo onboarding'}
              </Link>
            </div>

            {/* Danger Zone */}
            <div className="rounded-3xl border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20 p-6">
              <h3 className="font-semibold text-red-800 dark:text-red-400 mb-2 flex items-center gap-2">
                <WarningCircle className="w-5 h-5" />
                {locale === 'es' ? 'Zona de peligro' : 'Danger zone'}
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                {locale === 'es'
                  ? 'Estas acciones son irreversibles. Por favor, procede con precaución.'
                  : 'These actions are irreversible. Please proceed with caution.'}
              </p>
              <button
                onClick={handleOpenDeleteModal}
                className="px-4 py-2.5 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 rounded-full text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                {t('settings.account.deleteAccount')}
              </button>
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
            className="bg-white dark:bg-[#1a1a1c] rounded-3xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                {locale === 'es' ? 'Verificar empleo' : 'Verify employment'}
              </h3>
              <button
                onClick={() => setShowVerifyModal(null)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {locale === 'es' ? 'Empresa' : 'Company'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={employmentForm.empresa}
                  onChange={e => setEmploymentForm(p => ({ ...p, empresa: e.target.value }))}
                  placeholder={locale === 'es' ? 'Nombre de tu empresa' : 'Your company name'}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {locale === 'es' ? 'Cargo' : 'Position'}
                </label>
                <input
                  type="text"
                  value={employmentForm.cargo}
                  onChange={e => setEmploymentForm(p => ({ ...p, cargo: e.target.value }))}
                  placeholder={locale === 'es' ? 'Tu cargo actual' : 'Your current position'}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {locale === 'es' ? 'Ingreso mensual (COP)' : 'Monthly income (COP)'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={employmentForm.ingreso}
                  onChange={e => setEmploymentForm(p => ({ ...p, ingreso: e.target.value }))}
                  placeholder={locale === 'es' ? 'Ej: 1500000' : 'E.g.: 1500000'}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {locale === 'es' ? 'Comprobante de ingresos' : 'Proof of income'}
                </label>
                <input
                  ref={employmentFileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={e => setEmploymentFile(e.target.files?.[0] ?? null)}
                />
                <div
                  onClick={() => employmentFileRef.current?.click()}
                  className="border-2 border-dashed border-neutral-200 dark:border-white/20 rounded-xl p-6 text-center hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors cursor-pointer"
                >
                  <FileText className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                  {employmentFile ? (
                    <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">{employmentFile.name}</p>
                  ) : (
                    <>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {locale === 'es' ? 'Arrastra o haz clic para subir' : 'Drag or click to upload'}
                      </p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                        {locale === 'es' ? 'PDF, JPG o PNG (máx. 5MB)' : 'PDF, JPG or PNG (max. 5MB)'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowVerifyModal(null); setEmploymentForm({ empresa: '', cargo: '', ingreso: '' }); setEmploymentFile(null); }}
                className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 rounded-full text-sm font-medium hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleEmploymentSubmit}
                disabled={isSubmittingEmployment}
                className="flex-1 px-4 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingEmployment ? '...' : (locale === 'es' ? 'Guardar información' : 'Save information')}
              </button>
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
            className="bg-white dark:bg-[#1a1a1c] rounded-3xl max-w-md w-full overflow-hidden"
          >
            {/* Step 1: Warning */}
            {deleteStep === 1 && (
              <>
                {/* Header with icon */}
                <div className="bg-red-50 dark:bg-red-950/30 px-6 py-8 text-center border-b border-red-100 dark:border-red-900/30">
                  <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mx-auto mb-4">
                    <Warning className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-red-800 dark:text-red-300">
                    {locale === 'es' ? '¿Eliminar tu cuenta?' : 'Delete your account?'}
                  </h3>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {locale === 'es' ? 'Esta acción es permanente e irreversible' : 'This action is permanent and irreversible'}
                  </p>
                </div>

                <div className="p-6">
                  {/* What will be deleted */}
                  <div className="mb-6">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white mb-3">
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
                        <li key={index} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                          <TrashSimple className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Active lease warning */}
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 mb-6">
                    <div className="flex items-start gap-3">
                      <WarningCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                          {locale === 'es' ? 'Tienes un arriendo activo' : 'You have an active rental'}
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                          {locale === 'es'
                            ? 'Eliminar tu cuenta no cancela tu contrato de arriendo vigente. Deberás contactar a tu arrendador.'
                            : 'Deleting your account does not cancel your current lease agreement. You will need to contact your landlord.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleCloseDeleteModal}
                      className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 rounded-full text-sm font-medium hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={() => setDeleteStep(2)}
                      className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-full text-sm font-medium hover:bg-red-700 transition-colors"
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
                    {locale === 'es' ? 'Confirmar eliminación' : 'Confirm deletion'}
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
                        Para confirmar la eliminación de tu cuenta, escribe{' '}
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
                          ? 'bg-red-600 text-white hover:bg-red-700'
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
