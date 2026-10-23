'use client';
import { documentoLegible } from '@/components/mantenimientos/TablaDeProveedores';
import { CambiarCorreoDeEntrada } from '@/components/cuenta/CambiarCorreoDeEntrada';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { User, Phone, MapPin, Shield, Camera, FloppyDisk, CheckCircle, WarningCircle, Briefcase, UserPlus, TrashSimple, Pencil, Upload, Buildings } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import { AgenteHorarioVisitas } from '@/components/inmobiliaria/AgenteHorarioVisitas';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { useI18n } from '@/lib/i18n';
import { Button, Input, Spinner } from '@/components/ui';
import { Avatar, CrossFade, IconButton } from '@leasefy/cadence';
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
import { ListaParaEmpezar } from '@/components/pantalla/ListaParaEmpezar';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
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
  AUXILIAR_COMERCIAL: 'Auxiliar comercial',
  AUXILIAR_ADMINISTRATIVO: 'Auxiliar administrativo',
  AUXILIAR_CONTABLE: 'Auxiliar contable',
  AUXILIAR_MANTENIMIENTO: 'Auxiliar de mantenimiento',
};

const AGENCY_ROLE_DESC: Record<string, string> = {
  ADMIN: 'Acceso completo',
  AGENTE: 'Gestión de propiedades y pipeline',
  CONTADOR: 'Acceso financiero y contable',
  VIEWER: 'Solo lectura',
  COORDINADOR: 'Ve el equipo y reasigna. No mueve plata.',
  AUXILIAR_CARTERA: 'Hace recibos. No anula ni condona.',
  ABOGADO_EXTERNO: 'Sólo sus casos jurídicos.',
  AUXILIAR_COMERCIAL: 'Apoya al asesor: interesados, visitas e inmuebles. No ve la plata del propietario ni firma.',
  AUXILIAR_ADMINISTRATIVO: 'Arma contratos, documentos y actas; atiende solicitudes. No firma, no ve plata, no termina contratos.',
  AUXILIAR_CONTABLE: 'Registra asientos, egresos y facturas de proveedor. No cierra el mes, no aprueba pagos, no anula ni emite facturas.',
  AUXILIAR_MANTENIMIENTO: 'Solicitudes y reparaciones; coordina proveedores. No aprueba costos ni pagos.',
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

  /** Abre la sección donde se completa el paso y la trae a la vista. */
  const irA = (seccion: 'personal' | 'emergency', id: string) => {
    setEditingSection(seccion);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const accionDelPaso = (id: string) => {
    const etiqueta = locale === 'es' ? 'Completar' : 'Complete';
    if (id === 'emergency-contact') {
      return <Button size="sm" variant="secondary" hideArrow onClick={() => irA('emergency', 'perfil-emergencia')}>{etiqueta}</Button>;
    }
    if (id === 'agency-info') {
      return (
        <Button asChild size="sm" variant="secondary" hideArrow>
          <Link href="/panel/inmobiliaria/configuracion/perfil">{etiqueta}</Link>
        </Button>
      );
    }
    return <Button size="sm" variant="secondary" hideArrow onClick={() => irA('personal', 'perfil-personal')}>{etiqueta}</Button>;
  };

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
  // Un campo vacío dice «Sin registrar», en gris (revisora r25: cuatro «—»).
  // Ronda 30 (revisora r27): el teléfono se lee «320 523 4056» (antes «3205234056» de corrido).
  const telefonoLegible = (v: string) => {
    const d = v.replace(/\D/g, '');
    return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : v;
  };
  const dato = (v: string | null | undefined, comoSeLee?: (v: string) => string) =>
    v ? (
      <span className="text-sm text-fg">{comoSeLee ? comoSeLee(v) : v}</span>
    ) : (
      <span className="text-sm text-fg-subtle">{locale === 'es' ? 'Sin registrar' : 'Not set'}</span>
    );

  return (
    <div className="min-h-screen bg-bg">
      {/* Revisora r25: el contenedor y el encabezado de las demás pantallas
          del panel (antes `max-w-7xl p-4` y un h1 a mano, 8 px corrido). */}
      <div className="space-y-6 p-6 lg:p-8">
        <EncabezadoDePantalla
          seccion={locale === 'es' ? 'Tu cuenta' : 'Your account'}
          titulo={locale === 'es' ? 'Mi perfil' : 'My profile'}
          descripcion={locale === 'es' ? 'Tus datos, tu foto y tu horario de visitas.' : 'Your details, your photo and your visiting hours.'}
        />

        {/* Lo que falta del perfil (Cadence 2, «Lo que falta para empezar»): antes el avance salía
            TRES veces —barra, anillo de 60 % y cinco tarjetas—; ahora es una lista con lo que falta
            arriba, cada cosa con el botón que la resuelve. Se esconde con el perfil completo. */}
        {completionPercentage < 100 && (
          <ListaParaEmpezar
            paraQue={locale === 'es' ? 'completar tu perfil' : 'complete your profile'}
            recordarComo="perfil"
            data-testid="lo-que-falta-del-perfil"
            requisitos={setupSteps.map((step) => ({
              id: step.id,
              titulo: step.label,
              detalle: step.completed ? undefined : step.description,
              estado: step.completed ? 'listo' : 'falta',
              accion: accionDelPaso(step.id),
            }))}
          />
        )}

        {/* Visit hours — each agent sets their own schedule for visits */}
        <AgenteHorarioVisitas self />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            {/* Avatar Card */}
            {/* Sin la portada gris de adorno de 110 px (revisora r25). */}
            <div className="relative rounded-lg border border-border bg-card overflow-hidden">
                {editingSection !== 'avatar' && (
                  <IconButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAvatarPreview(savedAvatar);
                      setEditingSection('avatar');
                    }}
                    aria-label={locale === 'es' ? 'Editar foto' : 'Edit photo'}
                    className="absolute top-3 right-3 text-fg"
                    icon={<Pencil className="w-4 h-4" />}
                  />
                )}
              <div className="p-6">
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

                <div className="relative mb-4">
                  <div
                    className={cn(
                      "w-28 h-28 rounded-[30%] border-4 border-card overflow-hidden",
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
                      // Cadence 2: la persona con su tono (sale del nombre: el mismo que en el resto).
                      <Avatar
                        name={[formData.firstName, formData.lastName].filter(Boolean).join(' ') || user?.email || '?'}
                        size="xl"
                        className="!size-full [&>span]:!size-full [&>span]:!rounded-none [&>span]:!text-[40px]"
                      />
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
                            <p className="text-caption text-fg-muted">
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
                        <Upload className="w-6 h-6 text-fg-muted shrink-0 mx-auto" aria-hidden="true" />
                        <p className="text-sm font-medium text-fg">
                          {isDragging
                            ? (locale === 'es' ? 'Suelta la imagen aquí' : 'Drop the image here')
                            : (locale === 'es' ? 'Subir foto de perfil' : 'Upload profile photo')}
                        </p>
                        <p className="text-caption text-fg-muted mt-1">
                          {locale === 'es' ? 'Arrastra o haz clic — JPG, PNG (máx. 5MB)' : 'Drag or click - JPG, PNG (max 5MB)'}
                        </p>
                      </>
                    )}
                  </div>
                )}

                <h2 className="text-base font-semibold text-fg">
                  {[formData.firstName, formData.lastName].filter(Boolean).join(' ') || user?.email || '—'}
                </h2>
                {/* El rol UNA vez (antes tres: aquí, «Rol: …» y «Rol en la agencia»). */}
                {memberRole ? (
                  <>
                    <p className="text-sm text-fg-muted mt-1">{AGENCY_ROLE_LABELS[memberRole] ?? memberRole}</p>
                    {AGENCY_ROLE_DESC[memberRole] ? (
                      <p className="text-caption text-fg-subtle mt-1">{AGENCY_ROLE_DESC[memberRole]}</p>
                    ) : null}
                  </>
                ) : null}

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

                {/* La inmobiliaria en la que estás */}
                {agency?.name && (
                <div className="mt-6 pt-6 border-t border-border space-y-4">
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-5 h-5 text-fg-muted shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium text-fg">{agency.name}</p>
                        <p className="text-caption text-fg-muted">
                          {agency.nit ? `NIT ${documentoLegible(agency.nit)}` : (locale === 'es' ? 'Agencia actual' : 'Current agency')}
                        </p>
                      </div>
                    </div>
                </div>
                )}
              </div>
            </div>

            {/* Verification Status Card — only real signals (Supabase email
                confirmation). There is no phone/identity/agency verification
                system in the backend, so nothing else is shown as verified. */}
            {emailVerified && (
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="text-base font-medium text-fg mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-fg-muted" />
                  {locale === 'es' ? 'Estado de verificación' : 'Verification status'}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-md bg-surface-muted">
                    <span className="text-sm font-medium text-fg">{locale === 'es' ? 'Correo' : 'Email'}</span>
                    <span className="flex items-center gap-1.5 text-caption font-medium text-success bg-success-soft px-2.5 py-1 rounded-full">
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
            <div id="perfil-personal" className="scroll-mt-6 rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-medium text-fg">
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
                      {dato(formData.firstName)}
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
                      {dato(formData.lastName)}
                    </div>
                  )}
                </div>

                {/* Email — read-only */}
                <div>
                  <label className="block text-sm font-medium text-fg mb-2">{locale === 'es' ? 'Correo' : 'Email'}</label>
                  {/* El correo de entrada, con su «Cambiar» (21-10-2026). */}
                  <CambiarCorreoDeEntrada correo={formData.email} className={fieldDisplay} />
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
                      {dato(formData.phone, telefonoLegible)}
                    </div>
                  )}
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
                      {dato(formData.address)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div id="perfil-emergencia" className="scroll-mt-6 rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-medium text-fg">
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
                      {dato(formData.emergencyContactName)}
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
                      {dato(formData.emergencyContactPhone)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-lg border border-danger/30 bg-danger-soft/40 p-6">
              <h3 className="text-base font-medium text-danger mb-2 flex items-center gap-2">
                <WarningCircle className="w-5 h-5" />
                {locale === 'es' ? 'Zona de peligro' : 'Danger zone'}
              </h3>
              {/* Lo que dice la copia canónica: hay 30 días para volver. Decir
                  «irreversible» aquí y «se recupera si inicias sesión» dos
                  clics después es contarle dos cosas distintas a la misma
                  persona. */}
              {/* Ronda 30 (revisora r27): primero qué pasa al eliminarla; después cómo se recupera. */}
              <p className="text-sm text-fg-muted mb-4">
                {locale === 'es' ? 'Se cierra tu acceso a Leasefy. ' : 'Your access to Leasefy is closed. '}
                {deletionCopy.recovery}
              </p>
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
                  <p className="text-caption text-fg-muted">
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
