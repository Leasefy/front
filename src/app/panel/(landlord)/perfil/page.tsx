'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { User, Envelope, Phone, MapPin, Calendar, Shield, Camera, FloppyDisk, CheckCircle, WarningCircle, Briefcase, UserPlus, X, Warning, TrashSimple, Pencil, Upload, Buildings, FileText } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button, Input, Spinner } from '@/components/ui';
import { IconButton } from '@leasefy/cadence';
import { useI18n } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import { settingsApi } from '@/lib/api/settings.service';
import { getSupabase } from '@/lib/supabase/client';

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

export default function PropietarioPerfilPage() {
  const { t, locale } = useI18n();
  const { user, updateProfile } = useAuth();
  const router = useRouter();
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

  // Form state — sourced from auth context, Colombian demo fallbacks
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || 'propietario@example.com',
    phone: user?.phone || '+57 300 123 4567',
    rut: user?.rut || '1.020.345.678',
    address: user?.address || 'Cra. 7 #71-21, Bogotá',
    birthDate: user?.birthDate || '1980-08-15',
    emergencyContactName: user?.emergencyContactName || 'Ana López',
    emergencyContactPhone: user?.emergencyContactPhone || '+57 301 876 5432',
  });

  // Display helpers for the single-field UI (name + emergency contact)
  const fullName = [formData.firstName, formData.lastName].filter(Boolean).join(' ') || (locale === 'es' ? 'Propietario' : 'Landlord');
  const emergencyContactDisplay = [formData.emergencyContactName, formData.emergencyContactPhone].filter(Boolean).join(' - ');

  // Setup steps
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
      id: 'property-verify',
      label: locale === 'es' ? 'Publicar propiedad' : 'Publish property',
      description: locale === 'es' ? 'Publica tu primera propiedad' : 'Publish your first property',
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

  // Single "Nombre completo" input → split into firstName / lastName
  const handleNameChange = (value: string) => {
    const parts = value.trim().split(/\s+/);
    const firstName = parts.shift() ?? '';
    const lastName = parts.join(' ');
    setFormData(prev => ({ ...prev, firstName, lastName }));
  };

  // Single "Nombre - Teléfono" input → split into name / phone parts
  const handleEmergencyContactChange = (value: string) => {
    const [name, ...rest] = value.split(' - ');
    setFormData(prev => ({
      ...prev,
      emergencyContactName: (name ?? '').trim(),
      emergencyContactPhone: rest.join(' - ').trim(),
    }));
  };

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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
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
    reader.onload = (e) => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenDeleteModal = () => { setShowDeleteModal(true); setDeleteStep(1); setDeleteConfirmText(''); };
  const handleCloseDeleteModal = () => { setShowDeleteModal(false); setDeleteStep(1); setDeleteConfirmText(''); setIsDeleting(false); };

  const handleDeleteAccount = async () => {
    const requiredText = locale === 'es' ? 'ELIMINAR' : 'DELETE';
    if (deleteConfirmText !== requiredText) return;
    setIsDeleting(true);
    try {
      // Real, irreversible deletion (soft-delete + sign-out). Never show the
      // success step without a persisted backend effect (Ley 1581 / ARCO).
      await settingsApi.deleteAccount();
      const supabase = getSupabase();
      if (supabase) await supabase.auth.signOut();
      setIsDeleting(false);
      setDeleteStep(3);
      setTimeout(() => {
        toast.success(locale === 'es' ? 'Tu cuenta ha sido eliminada' : 'Your account has been deleted');
        handleCloseDeleteModal();
        router.push('/');
      }, 1500);
    } catch (err) {
      setIsDeleting(false);
      toast.error((err as Error)?.message || (locale === 'es' ? 'Error al eliminar cuenta' : 'Error deleting account'));
    }
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
            <h1 className="text-3xl font-medium text-neutral-900 dark:text-white tracking-tight">
              {locale === 'es' ? 'Mi Perfil' : 'My Profile'}
            </h1>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">
              {locale === 'es' ? 'Gestiona tu información personal y preferencias' : 'Manage your personal information and preferences'}
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
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-[#1A40FF] dark:text-[#5570FF]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                      {locale === 'es' ? 'Completar perfil' : 'Complete profile'}
                    </h2>
                    <p className="text-sm text-[#1A40FF] dark:text-[#5570FF]">
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
                    className="h-full bg-[#1A40FF] rounded-full"
                  />
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                  {completionPercentage === 100
                    ? (locale === 'es' ? 'Perfil completo! Tienes acceso a todas las funciones.' : 'Profile complete! You have access to all features.')
                    : (locale === 'es' ? 'Completa tu perfil para acceder a todas las funciones' : 'Complete your profile to access all features')}
                </p>
              </div>

              <div className="flex items-center justify-center">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="8" opacity="0.5" className="dark:opacity-20" />
                    <motion.circle
                      cx="50" cy="50" r="40" fill="none" stroke="#1A40FF" strokeWidth="8" strokeLinecap="round"
                      initial={{ strokeDasharray: '0 251.2' }}
                      animate={{ strokeDasharray: `${completionPercentage * 2.512} 251.2` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-neutral-900 dark:text-white">{completionPercentage}%</span>
                  </div>
                </div>
              </div>
            </div>

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
                        ? 'bg-white/80 dark:bg-white/10'
                        : 'bg-white dark:bg-neutral-800/80 border-2 border-dashed border-[#1A40FF]/30 dark:border-[#B7791F]/30'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
                        step.completed ? 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15' : 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15'
                      )}>
                        {step.completed ? (
                          <CheckCircle className="w-4 h-4 text-[#2C7A53] dark:text-[#3EAE70]" />
                        ) : (
                          <Icon className="w-4 h-4 text-[#1A40FF] dark:text-[#5570FF]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium truncate', step.completed ? 'text-neutral-900 dark:text-white' : 'text-[#1A40FF] dark:text-white')}>
                          {step.label}
                        </p>
                        {step.completed ? (
                          <span className="text-xs text-[#2C7A53] dark:text-[#3EAE70]">{locale === 'es' ? 'Completado' : 'Completed'}</span>
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
            <div className="rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1a1a1c] overflow-hidden">
              <div className="relative bg-[#EEF1FF] dark:bg-[#1A40FF]/12 h-28">
                {editingSection !== 'avatar' && (
                  <IconButton
                    variant="ghost"
                    size="sm"
                    onClick={() => { setAvatarPreview(savedAvatar); setEditingSection('avatar'); }}
                    aria-label={locale === 'es' ? 'Editar foto' : 'Edit photo'}
                    className="absolute top-3 right-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white"
                    icon={<Pencil className="w-4 h-4" />}
                  />
                )}
              </div>
              <div className="px-6 pb-6">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

                <div className="relative -mt-14 mb-4">
                  <div
                    className={cn("w-28 h-28 rounded-full border-4 border-white dark:border-[#1a1a1c] overflow-hidden", editingSection === 'avatar' && "cursor-pointer")}
                    onClick={editingSection === 'avatar' ? handleAvatarClick : undefined}
                  >
                    {(editingSection === 'avatar' ? avatarPreview : savedAvatar) ? (
                      <Image src={(editingSection === 'avatar' ? avatarPreview : savedAvatar)!} alt="Avatar" width={112} height={112} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white dark:bg-[#1A40FF] flex items-center justify-center text-neutral-900 dark:text-white uppercase tracking-wide font-mono font-bold text-4xl">
                        {fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {editingSection === 'avatar' && (
                    <IconButton
                      variant="solid"
                      size="sm"
                      onClick={handleAvatarClick}
                      aria-label={locale === 'es' ? 'Cambiar foto' : 'Change photo'}
                      className="absolute bottom-1 right-1 bg-[#1A40FF] text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100"
                      icon={<Camera className="w-4 h-4" />}
                    />
                  )}
                </div>

                {editingSection === 'avatar' && (
                  <div
                    onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={handleAvatarClick}
                    className={cn(
                      "mb-4 border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all",
                      isDragging ? "border-[#1A40FF]/30 bg-[#EEF1FF] dark:bg-[#1A40FF]/15" : "border-neutral-200 dark:border-white/20 hover:border-[#1A40FF]/30 dark:hover:border-[#1A40FF]/30 hover:bg-neutral-50 dark:hover:bg-white/5"
                    )}
                  >
                    {avatarPreview ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                            <Image src={avatarPreview} alt="Preview" width={40} height={40} className="w-full h-full object-cover" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-neutral-900 dark:text-white">{locale === 'es' ? 'Imagen seleccionada' : 'Image selected'}</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{locale === 'es' ? 'Haz clic para cambiar' : 'Click to change'}</p>
                          </div>
                        </div>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleRemoveAvatar(); }}
                          aria-label={locale === 'es' ? 'Quitar imagen' : 'Remove image'}
                          className="text-neutral-400 hover:text-[#C4503B] hover:bg-[#F8EAE7] dark:hover:bg-[#C4503B]/30"
                          icon={<TrashSimple className="w-4 h-4" />}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-white/10 flex items-center justify-center mx-auto mb-3">
                          <Upload className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
                        </div>
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          {isDragging ? (locale === 'es' ? 'Suelta la imagen aquí' : 'Drop the image here') : (locale === 'es' ? 'Subir foto de perfil' : 'Upload profile photo')}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{locale === 'es' ? 'Arrastra o haz clic - JPG, PNG (máx. 5MB)' : 'Drag or click - JPG, PNG (max 5MB)'}</p>
                      </>
                    )}
                  </div>
                )}

                {editingSection === 'avatar' ? (
                  <Input type="text" value={fullName} onChange={(e) => handleNameChange(e.target.value)} className="text-lg font-semibold" />
                ) : (
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">{fullName}</h2>
                )}
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  {locale === 'es' ? 'Propietario desde Enero 2024' : 'Landlord since January 2024'}
                </p>

                {editingSection === 'avatar' && (
                  <div className="flex items-center gap-2 mt-4">
                    <Button variant="ghost" size="sm" hideArrow onClick={handleCancelEdit} className="flex-1 justify-center">
                      {locale === 'es' ? 'Cancelar' : 'Cancel'}
                    </Button>
                    <Button size="sm" hideArrow onClick={() => handleSave('avatar')} disabled={isSaving} className="flex-1 justify-center gap-2">
                      {isSaving ? <Spinner size="sm" variant="current" /> : <FloppyDisk className="w-4 h-4" />}
                      {locale === 'es' ? 'Guardar' : 'Save'}
                    </Button>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-white/10 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E8F3EC] dark:bg-[#2C7A53]/15 flex items-center justify-center">
                      <Buildings className="w-5 h-5 text-[#2C7A53] dark:text-[#3EAE70]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        {locale === 'es' ? 'Propiedades publicadas' : 'Published properties'}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {locale === 'es' ? 'Gestiona tus propiedades' : 'Manage your properties'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        {locale === 'es' ? 'Contratos activos' : 'Active contracts'}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {locale === 'es' ? 'Arriendos vigentes' : 'Current leases'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Status Card */}
            <div className="rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1a1a1c] p-6">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                {locale === 'es' ? 'Estado de verificación' : 'Verification status'}
              </h3>
              <div className="space-y-3">
                {[
                  { key: 'email', label: 'Email', verified: true },
                  { key: 'phone', label: locale === 'es' ? 'Teléfono' : 'Phone', verified: true },
                  { key: 'identity', label: locale === 'es' ? 'Identidad' : 'Identity', verified: true },
                  { key: 'property', label: locale === 'es' ? 'Propiedad' : 'Property', verified: true },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-600">
                    <span className="text-sm font-medium text-neutral-700 dark:text-white">{item.label}</span>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-[#2C7A53] dark:text-[#3EAE70] bg-[#E8F3EC] dark:bg-[#2C7A53]/15 px-2.5 py-1 rounded-full">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {locale === 'es' ? 'Verificado' : 'Verified'}
                    </span>
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
            <div className="rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1a1a1c] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  {locale === 'es' ? 'Información personal' : 'Personal information'}
                </h3>
                {editingSection !== 'personal' ? (
                  <Button variant="ghost" size="sm" hideArrow onClick={() => setEditingSection('personal')} className="gap-1.5">
                    <Pencil className="w-3.5 h-3.5" />
                    {locale === 'es' ? 'Editar' : 'Edit'}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" hideArrow onClick={handleCancelEdit}>
                      {locale === 'es' ? 'Cancelar' : 'Cancel'}
                    </Button>
                    <Button size="sm" hideArrow onClick={() => handleSave('personal')} disabled={isSaving} className="gap-1.5">
                      {isSaving ? <Spinner size="sm" variant="current" /> : <FloppyDisk className="w-3.5 h-3.5" />}
                      {locale === 'es' ? 'Guardar' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{locale === 'es' ? 'Nombre completo' : 'Full name'}</label>
                  {editingSection === 'personal' ? (
                    <Input type="text" value={fullName} onChange={(e) => handleNameChange(e.target.value)} />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-white/5 rounded-xl">
                      <User className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-sm text-neutral-900 dark:text-white">{fullName}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t('landlordProfile.fields.cedula')}</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-white/5 rounded-xl">
                    <Shield className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                    <span className="text-sm text-neutral-900 dark:text-white">{formData.rut}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Email</label>
                  {editingSection === 'personal' ? (
                    <Input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-white/5 rounded-xl">
                      <Envelope className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-sm text-neutral-900 dark:text-white">{formData.email}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{locale === 'es' ? 'Teléfono' : 'Phone'}</label>
                  {editingSection === 'personal' ? (
                    <Input type="tel" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-white/5 rounded-xl">
                      <Phone className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-sm text-neutral-900 dark:text-white">{formData.phone}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{locale === 'es' ? 'Fecha de nacimiento' : 'Date of birth'}</label>
                  {editingSection === 'personal' ? (
                    <Input type="date" value={formData.birthDate} onChange={(e) => handleInputChange('birthDate', e.target.value)} />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-white/5 rounded-xl">
                      <Calendar className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-sm text-neutral-900 dark:text-white">
                        {new Date(formData.birthDate).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{locale === 'es' ? 'Dirección' : 'Address'}</label>
                  {editingSection === 'personal' ? (
                    <Input type="text" value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-white/5 rounded-xl">
                      <MapPin className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-sm text-neutral-900 dark:text-white">{formData.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1a1a1c] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-neutral-900 dark:text-white">{locale === 'es' ? 'Contacto de emergencia' : 'Emergency contact'}</h3>
                {editingSection !== 'emergency' ? (
                  <Button variant="ghost" size="sm" hideArrow onClick={() => setEditingSection('emergency')} className="gap-1.5">
                    <Pencil className="w-3.5 h-3.5" />
                    {locale === 'es' ? 'Editar' : 'Edit'}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" hideArrow onClick={handleCancelEdit}>
                      {locale === 'es' ? 'Cancelar' : 'Cancel'}
                    </Button>
                    <Button size="sm" hideArrow onClick={() => handleSave('emergency')} disabled={isSaving} className="gap-1.5">
                      {isSaving ? <Spinner size="sm" variant="current" /> : <FloppyDisk className="w-3.5 h-3.5" />}
                      {locale === 'es' ? 'Guardar' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{locale === 'es' ? 'Nombre y teléfono' : 'Name and phone'}</label>
                {editingSection === 'emergency' ? (
                  <Input type="text" value={emergencyContactDisplay} onChange={(e) => handleEmergencyContactChange(e.target.value)}
                    placeholder={locale === 'es' ? 'Nombre - Teléfono' : 'Name - Phone'} />
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-white/5 rounded-xl">
                    <UserPlus className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                    <span className="text-sm text-neutral-900 dark:text-white">{emergencyContactDisplay}</span>
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
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                {locale === 'es' ? 'Estas acciones son irreversibles. Por favor, procede con precaución.' : 'These actions are irreversible. Please proceed with caution.'}
              </p>
              <Button variant="destructive" hideArrow onClick={handleOpenDeleteModal}>
                {locale === 'es' ? 'Eliminar mi cuenta' : 'Delete my account'}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-[#1a1a1c] rounded-xl max-w-md w-full overflow-hidden">
            {deleteStep === 1 && (
              <>
                <div className="bg-[#F8EAE7] dark:bg-[#C4503B]/15 px-6 py-8 text-center border-b border-[#C4503B]/30 dark:border-[#C4503B]/40">
                  <div className="w-16 h-16 rounded-full bg-[#F8EAE7] dark:bg-[#C4503B]/15 flex items-center justify-center mx-auto mb-4">
                    <Warning className="w-8 h-8 text-[#C4503B] dark:text-[#E0664D]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#C4503B] dark:text-[#E0664D]">{locale === 'es' ? '¿Eliminar tu cuenta?' : 'Delete your account?'}</h3>
                  <p className="text-sm text-[#C4503B] dark:text-[#E0664D] mt-1">{locale === 'es' ? 'Esta acción es permanente e irreversible' : 'This action is permanent and irreversible'}</p>
                </div>
                <div className="p-6">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white mb-3">{locale === 'es' ? 'Se eliminará permanentemente:' : 'Will be permanently deleted:'}</p>
                  <ul className="space-y-2 mb-6">
                    {(locale === 'es' ? [
                      'Tu perfil y toda tu información personal',
                      'Propiedades publicadas y candidatos',
                      'Historial de contratos y pagos',
                      'Conversaciones y mensajes',
                    ] : [
                      'Your profile and all personal information',
                      'Published properties and candidates',
                      'Contract and payment history',
                      'Conversations and messages',
                    ]).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <TrashSimple className="w-4 h-4 text-[#C4503B] dark:text-[#E0664D] mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-3">
                    <Button variant="outline" hideArrow onClick={handleCloseDeleteModal} className="flex-1 justify-center">{locale === 'es' ? 'Cancelar' : 'Cancel'}</Button>
                    <Button variant="destructive" hideArrow onClick={() => setDeleteStep(2)} className="flex-1 justify-center">{locale === 'es' ? 'Continuar' : 'Continue'}</Button>
                  </div>
                </div>
              </>
            )}
            {deleteStep === 2 && (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-white/10">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{locale === 'es' ? 'Confirmar eliminación' : 'Confirm deletion'}</h3>
                  <IconButton variant="ghost" size="sm" onClick={handleCloseDeleteModal} aria-label={locale === 'es' ? 'Cerrar' : 'Close'} icon={<X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />} />
                </div>
                <div className="p-6">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                    {locale === 'es' ? <>Para confirmar, escribe <span className="font-mono font-semibold text-[#C4503B] dark:text-[#E0664D]">ELIMINAR</span>:</> : <>To confirm, type <span className="font-mono font-semibold text-[#C4503B] dark:text-[#E0664D]">DELETE</span>:</>}
                  </p>
                  <Input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())} placeholder={locale === 'es' ? 'Escribe ELIMINAR' : 'Type DELETE'}
                    className="font-mono text-center tracking-widest focus-visible:ring-[#C4503B]/30" />
                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" hideArrow onClick={() => setDeleteStep(1)} className="flex-1 justify-center">{locale === 'es' ? 'Volver' : 'Back'}</Button>
                    <Button
                      variant="destructive"
                      hideArrow
                      onClick={handleDeleteAccount}
                      disabled={(locale === 'es' ? deleteConfirmText !== 'ELIMINAR' : deleteConfirmText !== 'DELETE') || isDeleting}
                      className="flex-1 justify-center gap-2"
                    >
                      {isDeleting ? <><Spinner size="sm" variant="current" />{locale === 'es' ? 'Eliminando...' : 'Deleting...'}</> : (locale === 'es' ? 'Eliminar mi cuenta' : 'Delete my account')}
                    </Button>
                  </div>
                </div>
              </>
            )}
            {deleteStep === 3 && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-white/10 flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8 text-neutral-600 dark:text-neutral-400" /></div>
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">{locale === 'es' ? 'Cuenta eliminada' : 'Account deleted'}</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{locale === 'es' ? 'Tu cuenta ha sido eliminada exitosamente.' : 'Your account has been successfully deleted.'}</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
