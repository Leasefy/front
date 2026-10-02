'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { User, Envelope, Phone, MapPin, Calendar, Shield, Camera, FloppyDisk, CheckCircle, WarningCircle, Briefcase, UserPlus, TrashSimple, Pencil, Upload, Buildings, FileText } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button, Input, Spinner } from '@/components/ui';
import { CrossFade, IconButton } from '@leasefy/cadence';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { useI18n } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import { settingsApi } from '@/lib/api/settings.service';
import { accountDeletionCopy } from '@/lib/account-deletion/copy';
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
  // El paso y la palabra se reinician al ABRIR (arriba), no al cerrar: el
  // Dialog sale con su animación y, si se reiniciaran acá, el paso 2 (o la
  // despedida) se convertiría en el 1 mientras se desvanece.
  const handleCloseDeleteModal = () => { setShowDeleteModal(false); setIsDeleting(false); };

  /*
   * Escape, la ✕ y el velo los maneja el `Dialog`. No se sale mientras se
   * borra (la petición ya salió) ni en la despedida (se va sola al inicio).
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
      // Real, irreversible deletion (soft-delete + sign-out). Never show the
      // success step without a persisted backend effect (Ley 1581 / ARCO).
      await settingsApi.deleteAccount();
      const supabase = getSupabase();
      if (supabase) await supabase.auth.signOut();
      setIsDeleting(false);
      setDeleteStep(3);
      setTimeout(() => {
        toast.success(deletionCopy.successToast);
        handleCloseDeleteModal();
        router.push('/');
      }, 1500);
    } catch (err) {
      setIsDeleting(false);
      toast.error(
        mensajeParaLaPersona(err, {
          porDefecto: deletionCopy.errorFallback,
          accion: 'eliminar tu cuenta',
        }),
      );
    }
  };

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
              {locale === 'es' ? 'Mi Perfil' : 'My Profile'}
            </h1>
            <p className="mt-1 text-fg-muted">
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
          <div className="rounded-lg bg-[#EEF1FF] dark:bg-[#1A40FF]/12 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-[#1A40FF] dark:text-[#5570FF]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-fg">
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
                <p className="text-xs text-fg-muted mt-2">
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
                    <span className="text-2xl font-bold text-fg">{completionPercentage}%</span>
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
                      'rounded-lg p-4 transition-all',
                      step.completed
                        ? 'bg-white/80 dark:bg-white/10'
                        : 'bg-surface border-2 border-dashed border-[#1A40FF]/30 dark:border-[#B7791F]/30'
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
                        <p className={cn('text-sm font-medium truncate', step.completed ? 'text-fg' : 'text-[#1A40FF] dark:text-white')}>
                          {step.label}
                        </p>
                        {step.completed ? (
                          <span className="text-xs text-[#2C7A53] dark:text-[#3EAE70]">{locale === 'es' ? 'Completado' : 'Completed'}</span>
                        ) : (
                          <span className="text-xs text-fg-muted">{locale === 'es' ? 'Pendiente' : 'Pending'}</span>
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
            <div className="rounded-lg border border-border bg-surface overflow-hidden">
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
                    className={cn("w-28 h-28 rounded-full border-4 border-surface overflow-hidden", editingSection === 'avatar' && "cursor-pointer")}
                    onClick={editingSection === 'avatar' ? handleAvatarClick : undefined}
                  >
                    {(editingSection === 'avatar' ? avatarPreview : savedAvatar) ? (
                      <Image src={(editingSection === 'avatar' ? avatarPreview : savedAvatar)!} alt="Avatar" width={112} height={112} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white dark:bg-[#1A40FF] flex items-center justify-center text-fg uppercase tracking-wide font-mono font-bold text-4xl">
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
                      className="absolute bottom-1 right-1 bg-primary text-primary-fg hover:bg-neutral-800 dark:hover:bg-neutral-100"
                      icon={<Camera className="w-4 h-4" />}
                    />
                  )}
                </div>

                {editingSection === 'avatar' && (
                  <div
                    onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={handleAvatarClick}
                    className={cn(
                      "mb-4 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
                      isDragging ? "border-[#1A40FF]/30 bg-[#EEF1FF] dark:bg-[#1A40FF]/15" : "border-border hover:border-[#1A40FF]/30 dark:hover:border-[#1A40FF]/30 hover:bg-surface-muted"
                    )}
                  >
                    {avatarPreview ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                            <Image src={avatarPreview} alt="Preview" width={40} height={40} className="w-full h-full object-cover" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-fg">{locale === 'es' ? 'Imagen seleccionada' : 'Image selected'}</p>
                            <p className="text-xs text-fg-muted">{locale === 'es' ? 'Haz clic para cambiar' : 'Click to change'}</p>
                          </div>
                        </div>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleRemoveAvatar(); }}
                          aria-label={locale === 'es' ? 'Quitar imagen' : 'Remove image'}
                          className="text-fg-subtle hover:text-danger hover:bg-danger-soft"
                          icon={<TrashSimple className="w-4 h-4" />}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-surface-muted flex items-center justify-center mx-auto mb-3">
                          <Upload className="w-6 h-6 text-fg-subtle" />
                        </div>
                        <p className="text-sm font-medium text-fg-muted">
                          {isDragging ? (locale === 'es' ? 'Suelta la imagen aquí' : 'Drop the image here') : (locale === 'es' ? 'Subir foto de perfil' : 'Upload profile photo')}
                        </p>
                        <p className="text-xs text-fg-muted mt-1">{locale === 'es' ? 'Arrastra o haz clic - JPG, PNG (máx. 5MB)' : 'Drag or click - JPG, PNG (max 5MB)'}</p>
                      </>
                    )}
                  </div>
                )}

                {editingSection === 'avatar' ? (
                  <Input type="text" value={fullName} onChange={(e) => handleNameChange(e.target.value)} className="text-lg font-semibold" />
                ) : (
                  <h2 className="text-xl font-semibold text-fg">{fullName}</h2>
                )}
                <p className="text-sm text-fg-muted mt-1">
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
                <div className="mt-6 pt-6 border-t border-border-faint space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E8F3EC] dark:bg-[#2C7A53]/15 flex items-center justify-center">
                      <Buildings className="w-5 h-5 text-[#2C7A53] dark:text-[#3EAE70]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-fg">
                        {locale === 'es' ? 'Propiedades publicadas' : 'Published properties'}
                      </p>
                      <p className="text-xs text-fg-muted">
                        {locale === 'es' ? 'Gestiona tus propiedades' : 'Manage your properties'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-fg">
                        {locale === 'es' ? 'Contratos activos' : 'Active contracts'}
                      </p>
                      <p className="text-xs text-fg-muted">
                        {locale === 'es' ? 'Arriendos vigentes' : 'Current leases'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Status Card */}
            <div className="rounded-lg border border-border bg-surface p-6">
              <h3 className="font-semibold text-fg mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-fg-subtle" />
                {locale === 'es' ? 'Estado de verificación' : 'Verification status'}
              </h3>
              <div className="space-y-3">
                {[
                  { key: 'email', label: 'Email', verified: true },
                  { key: 'phone', label: locale === 'es' ? 'Teléfono' : 'Phone', verified: true },
                  { key: 'identity', label: locale === 'es' ? 'Identidad' : 'Identity', verified: true },
                  { key: 'property', label: locale === 'es' ? 'Propiedad' : 'Property', verified: true },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-surface-muted border border-border-faint">
                    <span className="text-sm font-medium text-fg-muted">{item.label}</span>
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
            <div className="rounded-lg border border-border bg-surface p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-fg">
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
                  <label className="block text-sm font-medium text-fg-muted mb-2">{locale === 'es' ? 'Nombre completo' : 'Full name'}</label>
                  {editingSection === 'personal' ? (
                    <Input type="text" value={fullName} onChange={(e) => handleNameChange(e.target.value)} />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-lg">
                      <User className="w-4 h-4 text-fg-subtle" />
                      <span className="text-sm text-fg">{fullName}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-muted mb-2">{t('landlordProfile.fields.cedula')}</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-lg">
                    <Shield className="w-4 h-4 text-fg-subtle" />
                    <span className="text-sm text-fg">{formData.rut}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-muted mb-2">Email</label>
                  {editingSection === 'personal' ? (
                    <Input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-lg">
                      <Envelope className="w-4 h-4 text-fg-subtle" />
                      <span className="text-sm text-fg">{formData.email}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-muted mb-2">{locale === 'es' ? 'Teléfono' : 'Phone'}</label>
                  {editingSection === 'personal' ? (
                    <Input type="tel" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-lg">
                      <Phone className="w-4 h-4 text-fg-subtle" />
                      <span className="text-sm text-fg">{formData.phone}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-muted mb-2">{locale === 'es' ? 'Fecha de nacimiento' : 'Date of birth'}</label>
                  {editingSection === 'personal' ? (
                    <Input type="date" value={formData.birthDate} onChange={(e) => handleInputChange('birthDate', e.target.value)} />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-lg">
                      <Calendar className="w-4 h-4 text-fg-subtle" />
                      <span className="text-sm text-fg">
                        {new Date(formData.birthDate).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-fg-muted mb-2">{locale === 'es' ? 'Dirección' : 'Address'}</label>
                  {editingSection === 'personal' ? (
                    <Input type="text" value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-lg">
                      <MapPin className="w-4 h-4 text-fg-subtle" />
                      <span className="text-sm text-fg">{formData.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="rounded-lg border border-border bg-surface p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-fg">{locale === 'es' ? 'Contacto de emergencia' : 'Emergency contact'}</h3>
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
                <label className="block text-sm font-medium text-fg-muted mb-2">{locale === 'es' ? 'Nombre y teléfono' : 'Name and phone'}</label>
                {editingSection === 'emergency' ? (
                  <Input type="text" value={emergencyContactDisplay} onChange={(e) => handleEmergencyContactChange(e.target.value)}
                    placeholder={locale === 'es' ? 'Nombre - Teléfono' : 'Name - Phone'} />
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-lg">
                    <UserPlus className="w-4 h-4 text-fg-subtle" />
                    <span className="text-sm text-fg">{emergencyContactDisplay}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-lg border border-[#C4503B]/30 dark:border-[#C4503B]/40 bg-[#F8EAE7]/30 dark:bg-[#C4503B]/20 p-6">
              <h3 className="font-semibold text-[#C4503B] dark:text-[#E0664D] mb-2 flex items-center gap-2">
                <WarningCircle className="w-5 h-5" />
                {locale === 'es' ? 'Zona de peligro' : 'Danger zone'}
              </h3>
              <p className="text-sm text-fg-muted mb-4">
                {locale === 'es' ? 'Estas acciones son irreversibles. Por favor, procede con precaución.' : 'These actions are irreversible. Please proceed with caution.'}
              </p>
              <Button variant="destructive" hideArrow onClick={handleOpenDeleteModal}>
                {locale === 'es' ? 'Eliminar mi cuenta' : 'Delete my account'}
              </Button>
            </div>
          </motion.div>
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
                    <span className="font-mono font-semibold text-danger">{deletionCopy.confirmWord}</span>{' '}
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
                 * Esta lista decía «Se eliminará permanentemente: tu perfil,
                 * las propiedades publicadas y candidatos, el historial de
                 * contratos y pagos y las conversaciones». `DELETE
                 * /users/me/account` (UsersService.deleteAccount) no borra
                 * nada de eso: marca TU usuario con `isActive: false` y
                 * `deletedAt`, revoca tus sesiones, y con un arriendo activo
                 * a tu nombre (`lease.status = ACTIVE`) responde 403 y no da
                 * de baja. Lo mismo que ya dice el perfil de la inmobiliaria.
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
                            'El acceso a tu panel de propietario',
                            'Tu sesión en todos tus dispositivos',
                          ]
                        : [
                            'Your profile and personal data',
                            'Access to your owner panel',
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
                      <li className="flex items-start gap-2 text-sm text-fg-muted">
                        <Buildings className="w-4 h-4 text-fg-muted mt-0.5 flex-shrink-0" />
                        {locale === 'es'
                          ? 'Tus inmuebles, contratos y pagos: quedan registrados'
                          : 'Your properties, contracts and payments: they stay on record'}
                      </li>
                    </ul>
                  </div>
                  <p className="text-sm text-fg-muted">
                    {locale === 'es'
                      ? 'No vas a poder darte de baja si tienes contratos de arriendo activos a tu nombre.'
                      : 'You cannot delete your account while you have active leases in your name.'}
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
                  className="font-mono text-center tracking-widest focus-visible:ring-danger/30"
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
