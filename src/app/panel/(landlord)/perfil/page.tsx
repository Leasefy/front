'use client';

import { useContratosAdministrados } from '@/components/landlord/ContratosConLaInmobiliaria';
import { useState, useRef } from 'react';
import Image from 'next/image';
import { User, Envelope, Phone, MapPin, Calendar, Shield, Camera, FloppyDisk, WarningCircle, UserPlus, TrashSimple, Pencil, Upload, Buildings, FileText } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button, Input } from '@/components/ui';
import Link from 'next/link';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ListaParaEmpezar } from '@/components/pantalla/ListaParaEmpezar';
import {
  Collapse,
  CrossFade,
  IconButton,
  Avatar,
} from '@leasefy/cadence';
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
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { revisarDatosPersonales, type CampoPersonal } from '@/lib/perfil/datos-personales';
import { pasosDelPerfilDelPropietario, type IdDelPasoDelPerfil } from '@/lib/perfil/pasos-del-perfil-del-propietario';

import { ariaDelCampoDeDia } from '@/components/contabilidad/CampoDeDia';
import { CampoDeNacimiento } from '@/components/ui/campo-de-nacimiento';
/**
 * Los campos que esta pantalla muestra. El nombre y el contacto de emergencia
 * son UN campo cada uno («Nombre completo», «Nombre - Teléfono»), así que los
 * errores del back por `firstName`/`lastName` o por las dos partes del
 * contacto caen en ese campo.
 */
type CampoDeLaPantalla = 'nombre' | 'phone' | 'birthDate' | 'address' | 'emergencia';
const CAMPO_EN_PANTALLA: Partial<Record<CampoPersonal, CampoDeLaPantalla | null>> = {
  firstName: 'nombre',
  lastName: 'nombre',
  phone: 'phone',
  birthDate: 'birthDate',
  address: 'address',
  emergencyContactName: 'emergencia',
  emergencyContactPhone: 'emergencia',
  rut: null,
};
const idDelCampo = (campo: CampoDeLaPantalla) => `perfil-propietario-${campo}`;

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
  // QA-PROP-95: ¿una inmobiliaria le administra los inmuebles? (mientras carga, sí)
  const administrados = useContratosAdministrados();
  const deInmobiliaria = administrados.cargando || administrados.doc !== null || Boolean(administrados.fichaSinContratos);
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

  /*
   * Form state — sourced from auth context.
   *
   * 🔴 02-10-2026 · Traía datos de muestra («+57 300 123 4567», «Cra. 7
   * #71-21, Bogotá», 1980-08-15, «Ana López») cuando la persona no los tenía,
   * y «Guardar» los mandaba a `PATCH /users/me` como si fueran suyos. Lo que
   * no está guardado queda vacío y se lee «No registrado».
   */
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    rut: user?.rut || '',
    address: user?.address || '',
    birthDate: user?.birthDate ? user.birthDate.slice(0, 10) : '',
    emergencyContactName: user?.emergencyContactName || '',
    emergencyContactPhone: user?.emergencyContactPhone || '',
  });
  const notSet = locale === 'es' ? 'No registrado' : 'Not set';
  /** El error de cada campo de la pantalla (del cliente o del back). */
  const [errores, setErrores] = useState<Partial<Record<CampoDeLaPantalla, string>>>({});
  const limpiarError = (campo: CampoDeLaPantalla) =>
    setErrores((prev) => {
      if (prev[campo] === undefined) return prev;
      const next = { ...prev };
      delete next[campo];
      return next;
    });
  const propsDelCampo = (campo: CampoDeLaPantalla) => ({
    id: idDelCampo(campo),
    'aria-invalid': errores[campo] ? true : undefined,
    'aria-describedby': errores[campo] ? `${idDelCampo(campo)}-error` : undefined,
  });
  const errorDelCampo = (campo: CampoDeLaPantalla) => (
    <ErrorDelCampo id={`${idDelCampo(campo)}-error`} mensaje={errores[campo]} />
  );

  // Display helpers for the single-field UI (name + emergency contact)
  const fullName = [formData.firstName, formData.lastName].filter(Boolean).join(' ') || (locale === 'es' ? 'Propietario' : 'Landlord');
  const emergencyContactDisplay = [formData.emergencyContactName, formData.emergencyContactPhone].filter(Boolean).join(' - ');

  /*
   * Los pasos del perfil salen de lo que la persona YA guardó (Nico,
   * 02-10-2026: «que sólo quede lo que es verdad»). Antes eran cinco pasos
   * fijos en `completed: true` —«Verificar teléfono», «Verificar identidad»,
   * «Publicar propiedad»— y la tarjeta decía «5 de 5» y «¡Perfil completo!» a
   * todo el mundo. No hay verificación de teléfono ni de identidad en el back,
   * así que no se ofrece ningún «verificar»: son los mismos pasos que el
   * perfil del inquilino.
   */
  // La misma fuente que el «Completa tu perfil» de la barra (ARREGLOS-4).
  const pasosGuardados = pasosDelPerfilDelPropietario(user);
  const completo = (id: IdDelPasoDelPerfil) => pasosGuardados.some((p) => p.id === id && p.completo);
  const setupSteps: SetupStep[] = [
    {
      id: 'basic-info',
      label: locale === 'es' ? 'Información básica' : 'Basic information',
      description: locale === 'es' ? 'Nombre y apellido' : 'First and last name',
      icon: User,
      completed: completo('basic-info'),
    },
    {
      id: 'phone',
      label: locale === 'es' ? 'Teléfono' : 'Phone',
      description: locale === 'es' ? 'Agrega tu número de teléfono' : 'Add your phone number',
      icon: Phone,
      completed: completo('phone'),
    },
    {
      id: 'id-number',
      label: t('landlordProfile.fields.cedula'),
      description: locale === 'es' ? 'Tu documento de identidad' : 'Your ID number',
      icon: Shield,
      completed: completo('id-number'),
    },
    {
      id: 'address',
      label: locale === 'es' ? 'Dirección' : 'Address',
      description: locale === 'es' ? 'Agrega tu dirección' : 'Add your address',
      icon: MapPin,
      completed: completo('address'),
    },
    {
      id: 'emergency-contact',
      label: locale === 'es' ? 'Contacto de emergencia' : 'Emergency contact',
      description: locale === 'es' ? 'Agrega un contacto de emergencia' : 'Add an emergency contact',
      icon: UserPlus,
      completed: completo('emergency-contact'),
    },
  ];


  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'phone' || field === 'birthDate' || field === 'address') limpiarError(field);
  };

  // Single "Nombre completo" input → split into firstName / lastName
  const handleNameChange = (value: string) => {
    const parts = value.trim().split(/\s+/);
    const firstName = parts.shift() ?? '';
    const lastName = parts.join(' ');
    setFormData(prev => ({ ...prev, firstName, lastName }));
    limpiarError('nombre');
  };

  // Single "Nombre - Teléfono" input → split into name / phone parts
  const handleEmergencyContactChange = (value: string) => {
    const [name, ...rest] = value.split(' - ');
    setFormData(prev => ({
      ...prev,
      emergencyContactName: (name ?? '').trim(),
      emergencyContactPhone: rest.join(' - ').trim(),
    }));
    limpiarError('emergencia');
  };

  /** Pone los errores en sus campos y le da el foco al primero. */
  const mostrarErrores = (porCampo: Partial<Record<CampoDeLaPantalla, string>>, primero?: CampoDeLaPantalla) => {
    setErrores(porCampo);
    if (primero && typeof document !== 'undefined') document.getElementById(idDelCampo(primero))?.focus();
  };

  /** Los errores del cliente (las mismas reglas que el back), ya en los campos de la pantalla. */
  const erroresDelCliente = (datos: Partial<Record<CampoPersonal, string | null | undefined>>) => {
    const porCampo: Partial<Record<CampoDeLaPantalla, string>> = {};
    const orden: CampoDeLaPantalla[] = [];
    for (const [campo, mensaje] of Object.entries(revisarDatosPersonales(datos)) as [CampoPersonal, string][]) {
      const destino = CAMPO_EN_PANTALLA[campo];
      if (destino && porCampo[destino] === undefined) {
        porCampo[destino] = mensaje;
        orden.push(destino);
      }
    }
    return { porCampo, orden };
  };

  const [savedAvatar, setSavedAvatar] = useState<string | null>(null);

  const handleSave = async (section: EditingSection) => {
    const datos =
      section === 'personal'
        ? {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            phone: formData.phone.trim() || undefined,
            address: formData.address.trim() || undefined,
            birthDate: formData.birthDate || undefined,
          }
        : section === 'emergency'
          ? {
              emergencyContactName: formData.emergencyContactName.trim() || undefined,
              emergencyContactPhone: formData.emergencyContactPhone.trim() || undefined,
            }
          : null;

    // Lo que el back rechazaría no sale: las mismas reglas y frases del DTO.
    if (datos) {
      const delCliente = erroresDelCliente(datos);
      if (delCliente.orden.length > 0) {
        mostrarErrores(delCliente.porCampo, delCliente.orden[0]);
        return;
      }
    }

    setIsSaving(true);
    try {
      if (section === 'avatar' && avatarFile) {
        const { url } = await settingsApi.uploadAvatar(avatarFile);
        setSavedAvatar(url);
        setAvatarFile(null);
      } else if (datos) {
        await updateProfile(datos);
      }
      setErrores({});
      setEditingSection(null);
      toast.success(locale === 'es' ? 'Cambios guardados' : 'Changes saved');
    } catch (err) {
      // 02-10-2026 · Antes: «Error al guardar los cambios» ante CUALQUIER
      // fallo. Ahora, con la regla de oro: lo del back por campo va a su
      // campo; al toast, sólo lo suelto (un 5xx con su referencia, la red).
      const reparto = repartirErroresDelServidor<CampoDeLaPantalla>(err, {
        mapa: CAMPO_EN_PANTALLA,
        accion: section === 'avatar' ? 'subir tu foto' : 'guardar tu perfil',
        porDefecto: locale === 'es' ? 'No pudimos guardar los cambios. Prueba de nuevo en un momento.' : 'Error saving changes',
      });
      mostrarErrores(reparto.porCampo, reparto.orden[0]);
      if (reparto.sueltos.length > 0) toast.error(reparto.sueltos.join(' · '));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setAvatarPreview(null);
    setAvatarFile(null);
    setErrores({});
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
      toast.error(locale === 'es' ? 'Elige una imagen (JPG o PNG)' : 'Please select an image');
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
      // Real deletion (soft-delete + sign-out; recoverable for 30 days). Never show the
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
      <div className="p-6 lg:p-8">

        {/* GLOW UP 22-10 (como el perfil del inquilino): el encabezado común y lo que falta del perfil en la lista
            de siempre —«Para completar tu perfil te faltan N pasos», cada uno con «Completar»—. Antes, un bloque
            azul con barra, anillo de porcentaje y cinco tarjetas con el ícono en una caja de color. */}
        <EncabezadoDePantalla
          className="mb-8"
          seccion={locale === 'es' ? 'Tu cuenta' : 'Your account'}
          titulo={locale === 'es' ? 'Mi perfil' : 'My profile'}
          descripcion={locale === 'es' ? 'Tus datos personales y cómo te contactamos.' : 'Your personal details and how we reach you.'}
        />

        <ListaParaEmpezar
          className="mb-8"
          paraQue={locale === 'es' ? 'completar tu perfil' : 'complete your profile'}
          requisitos={setupSteps.map((step) => ({
            id: step.id,
            titulo: step.label,
            estado: step.completed ? ('listo' as const) : ('falta' as const),
            accion: (
              <Button
                size="sm"
                variant="outline"
                hideArrow
                onClick={() => {
                  if (step.id === 'basic-info') {
                    setAvatarPreview(savedAvatar);
                    setEditingSection('avatar');
                  } else {
                    setEditingSection(step.id === 'emergency-contact' ? 'emergency' : 'personal');
                  }
                }}
              >
                {locale === 'es' ? 'Completar' : 'Complete'}
              </Button>
            ),
          }))}
          data-testid="perfil-lo-que-falta"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-lg border border-border bg-surface overflow-hidden">
              {/* Sin la franja azul de adorno ni el lápiz de vidrio (blanco sobre azul claro, casi no se veía). */}
              <div className="px-6 pb-6 pt-6">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

                <div className="relative mb-4 w-28">
                  <div
                    className={cn("w-28 h-28 rounded-full border-4 border-surface overflow-hidden", editingSection === 'avatar' && "cursor-pointer")}
                    onClick={editingSection === 'avatar' ? handleAvatarClick : undefined}
                  >
                    {(editingSection === 'avatar' ? avatarPreview : savedAvatar) ? (
                      <Image src={(editingSection === 'avatar' ? avatarPreview : savedAvatar)!} alt="Avatar" width={112} height={112} className="w-full h-full object-cover" />
                    ) : (
                      // Cadence 2: el Avatar del sistema (iniciales y tono del nombre), nunca a mano.
                      <Avatar name={fullName || 'Tú'} size="xl" className="size-full text-4xl" />
                    )}
                  </div>
                  {editingSection === 'avatar' && (
                    <IconButton
                      variant="solid"
                      size="sm"
                      onClick={handleAvatarClick}
                      aria-label={locale === 'es' ? 'Cambiar foto' : 'Change photo'}
                      className="absolute bottom-1 right-1 bg-ink text-white hover:bg-ink/90"
                      icon={<Camera className="w-4 h-4" />}
                    />
                  )}
                </div>

                {/* El área de la foto se abre y se cierra con su altura. */}
                <Collapse open={editingSection === 'avatar'}>
                  <div
                    onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={handleAvatarClick}
                    className={cn(
                      "mb-4 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                      isDragging ? "border-primary/30 bg-primary-soft" : "border-border hover:border-primary/30 hover:bg-surface-muted"
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
                            <p className="text-caption text-fg-muted">{locale === 'es' ? 'Haz clic para cambiar' : 'Click to change'}</p>
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
                        <Upload className="w-6 h-6 text-fg-subtle shrink-0 mx-auto" aria-hidden="true" />
                        <p className="text-sm font-medium text-fg-muted">
                          {isDragging ? (locale === 'es' ? 'Suelta la imagen aquí' : 'Drop the image here') : (locale === 'es' ? 'Subir foto de perfil' : 'Upload profile photo')}
                        </p>
                        <p className="text-caption text-fg-muted mt-1">{locale === 'es' ? 'Arrastra o haz clic - JPG, PNG (máx. 5MB)' : 'Drag or click - JPG, PNG (max 5MB)'}</p>
                      </>
                    )}
                  </div>
                </Collapse>

                {editingSection === 'avatar' ? (
                  <Input type="text" value={fullName} onChange={(e) => handleNameChange(e.target.value)} className="text-lg font-medium" />
                ) : (
                  <h2 className="text-h3 text-fg">{fullName}</h2>
                )}
                {editingSection !== 'avatar' && (
                  <Button
                    variant="outline"
                    size="sm"
                    hideArrow
                    onClick={() => { setAvatarPreview(savedAvatar); setEditingSection('avatar'); }}
                    className="mt-4"
                    aria-label={locale === 'es' ? 'Editar foto' : 'Edit photo'}
                  >
                    <Camera className="w-4 h-4" aria-hidden="true" />
                    {locale === 'es' ? 'Cambiar foto o nombre' : 'Change photo or name'}
                  </Button>
                )}
                {/* «Propietario desde Enero 2024» era una fecha inventada, igual
                    para todos (Nico, 02-10-2026): no se muestra. */}

                <Collapse open={editingSection === 'avatar'}>
                  <div className="flex items-center gap-2 mt-4">
                    <Button variant="ghost" size="sm" hideArrow onClick={handleCancelEdit} className="flex-1 justify-center">
                      {locale === 'es' ? 'Cancelar' : 'Cancel'}
                    </Button>
                    <Button size="sm" hideArrow onClick={() => handleSave('avatar')} disabled={isSaving} className="flex-1 justify-center gap-2">
                      {!isSaving && <FloppyDisk className="w-4 h-4" aria-hidden="true" />}
                      {locale === 'es' ? 'Guardar' : 'Save'}
                    </Button>
                  </div>
                </Collapse>

                {/* Quick Stats — QA-PROP-95: «Propiedades publicadas» y «Contratos
                    activos» son del propietario independiente (publica y arrienda
                    él); a quien le administra una inmobiliaria no le dicen nada. */}
                {!deInmobiliaria && (
                <div className="mt-6 pt-6 border-t border-border-faint space-y-4">
                  {/* Antes, dos filas que no decían nada ni llevaban a ningún lado: ahora son los atajos. */}
                  <Link href="/panel/propiedades" className="flex items-center gap-3 rounded-md hover:bg-surface-muted -mx-2 px-2 py-1.5">
                    <Buildings className="w-5 h-5 text-fg-muted shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm text-fg">{locale === 'es' ? 'Mis inmuebles' : 'My properties'}</span>
                      <span className="block text-caption text-fg-muted">{locale === 'es' ? 'Los que publicas y arriendas' : 'The ones you list and rent'}</span>
                    </span>
                  </Link>
                  <Link href="/panel/leases" className="flex items-center gap-3 rounded-md hover:bg-surface-muted -mx-2 px-2 py-1.5">
                    <FileText className="w-5 h-5 text-fg-muted shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm text-fg">{locale === 'es' ? 'Mis contratos' : 'My contracts'}</span>
                      <span className="block text-caption text-fg-muted">{locale === 'es' ? 'Arriendos vigentes' : 'Current leases'}</span>
                    </span>
                  </Link>
                </div>
                )}
              </div>
            </div>

            {/* «Estado de verificación» decía «Verificado» en el correo, el
                teléfono, la identidad y la propiedad de TODO propietario, sin
                que nada lo verificara (Nico, 02-10-2026): se quitó. */}
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information — Editar ↔ ver: las acciones y los campos se
                cruzan (lo nuevo entra ya, lo viejo sale por encima). */}
            <div className="rounded-lg border border-border bg-surface p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-h3 text-fg">
                  {locale === 'es' ? 'Información personal' : 'Personal information'}
                </h3>
                <CrossFade swapKey={editingSection === 'personal' ? 'editar' : 'ver'} mode="popLayout">
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
                      {!isSaving && <FloppyDisk className="w-4 h-4" aria-hidden="true" />}
                      {locale === 'es' ? 'Guardar' : 'Save'}
                    </Button>
                  </div>
                )}
                </CrossFade>
              </div>
              <CrossFade
                swapKey={editingSection === 'personal' ? 'editar' : 'ver'}
                mode="popLayout"
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div>
                  <label className="block text-sm font-medium text-fg-muted mb-2">{locale === 'es' ? 'Nombre completo' : 'Full name'}</label>
                  {editingSection === 'personal' ? (
                    <>
                      <Input type="text" {...propsDelCampo('nombre')} value={fullName} onChange={(e) => handleNameChange(e.target.value)} />
                      {errorDelCampo('nombre')}
                    </>
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
                    <span className="text-sm text-fg">{formData.rut || notSet}</span>
                  </div>
                </div>

                {/* El correo sólo se lee: «Guardar» no lo manda (`PATCH /users/me`
                    no lo cambia; es el de la cuenta). Era un campo editable que
                    se vaciaba al guardar (Nico, 02-10-2026). */}
                <div>
                  <label className="block text-sm font-medium text-fg-muted mb-2">{locale === 'es' ? 'Correo' : 'Email'}</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-lg">
                    <Envelope className="w-4 h-4 text-fg-subtle" />
                    <span className="text-sm text-fg">{formData.email || notSet}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-muted mb-2">{locale === 'es' ? 'Teléfono' : 'Phone'}</label>
                  {editingSection === 'personal' ? (
                    <>
                      <Input type="tel" {...propsDelCampo('phone')} value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} />
                      {errorDelCampo('phone')}
                    </>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-lg">
                      <Phone className="w-4 h-4 text-fg-subtle" />
                      <span className="text-sm text-fg">{formData.phone || notSet}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-muted mb-2">{locale === 'es' ? 'Fecha de nacimiento' : 'Date of birth'}</label>
                  {editingSection === 'personal' ? (
                    <>
                      <CampoDeNacimiento
                        {...ariaDelCampoDeDia(propsDelCampo('birthDate'))}
                        etiqueta={locale === 'es' ? 'Fecha de nacimiento' : 'Date of birth'}
                        value={formData.birthDate}
                        onChange={(v) => handleInputChange('birthDate', v)}
                      />
                      {errorDelCampo('birthDate')}
                    </>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-lg">
                      <Calendar className="w-4 h-4 text-fg-subtle" />
                      <span className="text-sm text-fg">
                        {formData.birthDate
                          ? new Date(formData.birthDate.slice(0, 10) + 'T00:00:00').toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
                          : notSet}
                      </span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-fg-muted mb-2">{locale === 'es' ? 'Dirección' : 'Address'}</label>
                  {editingSection === 'personal' ? (
                    <>
                      <Input type="text" {...propsDelCampo('address')} value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} />
                      {errorDelCampo('address')}
                    </>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-lg">
                      <MapPin className="w-4 h-4 text-fg-subtle" />
                      <span className="text-sm text-fg">{formData.address || notSet}</span>
                    </div>
                  )}
                </div>
              </CrossFade>
            </div>

            {/* Emergency Contact — mismo cruce que los datos personales. */}
            <div className="rounded-lg border border-border bg-surface p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-h3 text-fg">{locale === 'es' ? 'Contacto de emergencia' : 'Emergency contact'}</h3>
                <CrossFade swapKey={editingSection === 'emergency' ? 'editar' : 'ver'} mode="popLayout">
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
                      {!isSaving && <FloppyDisk className="w-4 h-4" aria-hidden="true" />}
                      {locale === 'es' ? 'Guardar' : 'Save'}
                    </Button>
                  </div>
                )}
                </CrossFade>
              </div>
              <div>
                <label className="block text-sm font-medium text-fg-muted mb-2">{locale === 'es' ? 'Nombre y teléfono' : 'Name and phone'}</label>
                <CrossFade swapKey={editingSection === 'emergency' ? 'editar' : 'ver'} mode="popLayout">
                {editingSection === 'emergency' ? (
                  <>
                    <Input type="text" {...propsDelCampo('emergencia')} value={emergencyContactDisplay} onChange={(e) => handleEmergencyContactChange(e.target.value)}
                      placeholder={locale === 'es' ? 'Nombre - Teléfono' : 'Name - Phone'} />
                    {errorDelCampo('emergencia')}
                  </>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted rounded-lg">
                    <UserPlus className="w-4 h-4 text-fg-subtle" />
                    <span className="text-sm text-fg">{emergencyContactDisplay || notSet}</span>
                  </div>
                )}
                </CrossFade>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-lg border border-danger/30 bg-danger-soft/30 p-6">
              <h3 className="text-h3 text-danger mb-2 flex items-center gap-2">
                <WarningCircle className="w-5 h-5" />
                {locale === 'es' ? 'Zona de peligro' : 'Danger zone'}
              </h3>
              {/* La copia canónica, como en el perfil de la inmobiliaria y el del
                  inquilino (Nico, 02-10-2026): nada se borra; 30 días para
                  volver y después sólo el soporte de Leasefy. */}
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
                    <span className="font-mono font-medium text-danger">{deletionCopy.confirmWord}</span>{' '}
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
