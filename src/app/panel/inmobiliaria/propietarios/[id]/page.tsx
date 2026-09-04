'use client';
import { PageGuard } from '@/components/auth/PageGuard';
import { mesEnTitulo } from '@/lib/utils/mes';

import { Suspense, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CaretLeft,
  User,
  Buildings,
  Envelope,
  Phone,
  MapPin,
  PencilSimple,
  DotsThree,
  TrashSimple,
  Clock,
  CurrencyDollar,
  House,
  CheckCircle,
  X,
  FileText,
  Download,
  Plus,
  Tag,
  Copy,
  Check,
  Note,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BotonEnviarMensaje } from '@/components/messages/BotonEnviarMensaje';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { SegmentedControl, IconButton } from '@leasefy/cadence';
import { BackButton } from '@/components/ui/back-button';
import { AlertaAccionable } from '@/components/ui/alerta-accionable';
import { PerfilTributarioDelPropietario } from '@/components/inmobiliaria/PerfilTributarioDelPropietario';
import { ExtractosEnviadosDelPropietario } from '@/components/inmobiliaria/ExtractosEnviadosDelPropietario';
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListSeparator,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu';
import {
  PropietarioStats,
  PropietarioBankInfo,
  PropietarioForm,
} from '@/components/inmobiliaria';
import { ExtractoDelPropietarioDialog } from '@/components/inmobiliaria/ExtractoDelPropietarioDialog';
import {
  usePropietario,
  useConsignaciones,
  useDispersiones,
} from '@/lib/hooks/useInmobiliaria';
import { propietariosApi } from '@/lib/api/inmobiliaria.service';
import { ApiError } from '@/lib/api/client';
import { descargarDatosDelPropietario } from '@/lib/propietarios/exportar-datos';
import { conRegreso, lugarDeRegreso, rutaDeRegreso } from '@/lib/nav/ruta-de-regreso';
import type { PropietarioFormData, Consignacion, Dispersion } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

const LISTA_DE_PROPIETARIOS = '/panel/inmobiliaria/propietarios';

/** Qué decirle a quien falló una llamada: el mensaje del back si vino, si no el genérico. */
function mensajeDe(error: unknown, porDefecto: string): string {
  if (error instanceof ApiError) return error.messages?.join(' · ') ?? error.message;
  if (error instanceof Error && error.message) return error.message;
  return porDefecto;
}

/**
 * Modal Component - Uses portal to render at document.body level
 */
function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const [mounted, setMounted] = useState(false);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Block body scroll when modal is open
  useEffect(() => {
    if (open) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
        document.documentElement.style.overflow = '';
      };
    }
  }, [open]);

  if (!open || !mounted) return null;

  const modalContent = (
    <>
      {/* Backdrop - separate fixed element */}
      {/* Modal layer = z-[300] (misma capa que <Dialog>/<Sheet>). Antes z-[9998/9999],
          que tapaba cualquier AlertDialog disparado desde adentro. Ver DESIGN.md §17. */}
      <div
        className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm"
        style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-[300] flex items-center justify-center p-4 pointer-events-none"
        style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Modal */}
        <div
          className={cn(
            'pointer-events-auto bg-card w-full rounded-[20px] flex flex-col max-h-[85vh]',
            sizeClasses[size]
          )}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
            <h3 className="text-base font-semibold text-foreground">
              {title}
            </h3>
            <IconButton
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Cerrar"
              icon={<X className="w-4 h-4" />}
            />
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain p-6">{children}</div>
        </div>
      </div>
    </>
  );

  // Render modal at document.body level to escape any transform contexts
  return createPortal(modalContent, document.body);
}

/**
 * Property Card Component
 */
function PropertyCard({ consignacion }: { consignacion: Consignacion }) {
  const { t } = useI18n();

  const statusColors = {
    available: 'bg-success-soft text-success',
    rented: 'bg-primary-soft text-primary',
    in_process: 'bg-warning-soft text-warning',
    maintenance: 'bg-danger-soft text-danger',
  };

  const statusLabels = {
    available: t('inmobiliaria.portafolio.status.available'),
    rented: t('inmobiliaria.portafolio.status.rented'),
    in_process: t('inmobiliaria.propietarios.detail.statusInProcess'),
    maintenance: t('inmobiliaria.portafolio.status.maintenance'),
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-4 rounded-lg border border-border bg-card transition-all cursor-pointer"
    >
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="w-20 h-20 rounded-xl bg-surface-muted flex items-center justify-center shrink-0 overflow-hidden">
          {consignacion.propertyThumbnail ? (
            <img
              src={consignacion.propertyThumbnail}
              alt={consignacion.propertyTitle}
              className="w-full h-full object-cover"
            />
          ) : (
            <House className="w-8 h-8 text-fg-subtle" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-base font-semibold text-foreground line-clamp-1">
                {consignacion.propertyTitle}
              </h4>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {consignacion.propertyAddress}
              </p>
            </div>
            <span className={cn('px-2 py-1 rounded-full text-xs font-medium shrink-0', statusColors[consignacion.availability])}>
              {statusLabels[consignacion.availability]}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-3">
            {/* contract-addendum-2.md §A.2/§A.10 — a SALE mandate has no
                canon (`monthlyRent: null`) and `commissionPercent: 0`; the
                agreed figure lives in `saleCommissionPercent` instead. */}
            {consignacion.listingType === 'sale' ? (
              <div>
                <p className="text-sm font-medium text-foreground">
                  {consignacion.saleCommissionPercent != null ? `${consignacion.saleCommissionPercent}%` : '—'}
                </p>
                <p className="text-xs text-muted-foreground">{t('inmobiliaria.propietarios.detail.saleCommission')}</p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-base font-semibold tabular-nums text-foreground">
                    {consignacion.monthlyRent != null ? formatCurrency(consignacion.monthlyRent) : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.common.perMonth')}</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {consignacion.commissionPercent}%
                  </p>
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.agentes.commission')}</p>
                </div>
              </>
            )}
            {consignacion.currentTenantName && (
              <>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="text-sm font-medium text-foreground line-clamp-1">
                    {consignacion.currentTenantName}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.propietarios.detail.tenant')}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Payment History Item Component
 */
function PaymentHistoryItem({ dispersion }: { dispersion: Dispersion }) {
  const { t, locale } = useI18n();

  const statusColors = {
    pending: 'bg-warning-soft text-warning',
    processing: 'bg-primary-soft text-primary',
    completed: 'bg-success-soft text-success',
    failed: 'bg-danger-soft text-danger',
  };

  const statusLabels = {
    pending: t('inmobiliaria.dispersiones.status.pending'),
    processing: t('inmobiliaria.dispersiones.status.processed'),
    completed: t('inmobiliaria.common.completed'),
    failed: t('inmobiliaria.dispersiones.status.failed'),
  };

  // `new Date('2026-08-01')` es medianoche UTC: en Colombia cae al 31 de julio
  // y la fila decía «julio» sobre el giro de agosto. Ver lib/utils/mes.
  const monthLabel = mesEnTitulo(dispersion.month, locale === 'en' ? 'en' : 'es');

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-4">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center',
          dispersion.status === 'completed'
            ? 'bg-success-soft'
            : 'bg-warning-soft'
        )}>
          {dispersion.status === 'completed' ? (
            <CheckCircle className="w-5 h-5 text-success" />
          ) : (
            <Clock className="w-5 h-5 text-warning" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {monthLabel}
          </p>
          <p className="text-sm text-muted-foreground">
            {dispersion.items.length} {t('inmobiliaria.propietarios.detail.propertiesCount')}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {formatCurrency(dispersion.netToPropietario)}
        </p>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statusColors[dispersion.status])}>
          {statusLabels[dispersion.status]}
        </span>
      </div>
    </div>
  );
}

/**
 * Propietario Detail Page
 * Full profile view with properties, payments, and history
 */
function FilaDeContacto({
  etiqueta,
  valor,
  href,
  onCopiar,
  copiado,
  etiquetaCopiar,
  mono,
}: {
  etiqueta: string;
  valor: string | null | undefined;
  href?: string;
  onCopiar?: () => void;
  copiado?: boolean;
  etiquetaCopiar?: string;
  mono?: boolean;
}) {
  const texto = valor && valor.trim() ? valor : null;
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{etiqueta}</span>
      <span className="flex min-w-0 items-center justify-end gap-1 text-right">
        {texto ? (
          href ? (
            <a href={href} className={cn('truncate font-medium text-foreground hover:text-primary transition-colors', mono && 'font-mono tabular-nums')}>
              {texto}
            </a>
          ) : (
            <span className={cn('font-medium text-foreground', mono && 'font-mono tabular-nums')}>{texto}</span>
          )
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
        {texto && onCopiar ? (
          <IconButton
            variant="ghost"
            size="sm"
            onClick={onCopiar}
            aria-label={etiquetaCopiar ?? 'Copiar'}
            icon={copiado ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          />
        ) : null}
      </span>
    </div>
  );
}

function PropietarioDetailContent() {
  const { t, locale } = useI18n();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;

  // De dónde se entró (`?volver=`): el contrato, el inmueble, un cobro o la
  // lista. «Volver» lleva ahí, y lo dice.
  const rutaDeVuelta = rutaDeRegreso(searchParams.get('volver'), LISTA_DE_PROPIETARIOS);
  const etiquetaDeVuelta = t(`inmobiliaria.propietarios.detail.backTo.${lugarDeRegreso(rutaDeVuelta)}`);
  const rutaDeEstaFicha = `${LISTA_DE_PROPIETARIOS}/${id}`;

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showExtracto, setShowExtracto] = useState(false);
  // Sube cada vez que se manda el extracto desde el diálogo: la lista de huellas se relee.
  const [extractosVersion, setExtractosVersion] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [activeTab, setTab] = useState<'properties' | 'payments' | 'notes'>('properties');
  const [notesValue, setNotesValue] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Fetch propietario and keep local state for updates
  const { propietario: fetchedPropietario, isLoading, refetch } = usePropietario(id);
  const [propietario, setPropietario] = useState(fetchedPropietario);

  // Update local state when fetched data changes
  useEffect(() => {
    if (fetchedPropietario) {
      setPropietario(fetchedPropietario);
    }
  }, [fetchedPropietario]);

  // Fetch related data
  const { consignaciones } = useConsignaciones({ propietarioId: id });
  const { dispersiones } = useDispersiones({ propietarioId: id });

  // Mientras carga no es «no encontrado»: ese cartel salía un instante en
  // cada ficha y después llegaba el dato (Nico, 2026-09-02 12:47).
  if (!propietario && isLoading) {
    return (
      <div className="p-6 lg:p-8" role="status" aria-live="polite" data-testid="propietario-cargando">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Spinner size="sm" />
          {t('common.loading')}
        </div>
      </div>
    );
  }

  if (!propietario) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex flex-col items-center justify-center text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
            <User className="w-6 h-6 text-muted-foreground" weight="duotone" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1.5">
            {t('inmobiliaria.propietarios.notFound')}
          </h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            {t('inmobiliaria.propietarios.notFoundDesc')}
          </p>
          <Button hideArrow onClick={() => router.push(rutaDeVuelta)}>
            <CaretLeft className="w-4 h-4" />
            {etiquetaDeVuelta}
          </Button>
        </div>
      </div>
    );
  }

  const isCompany = propietario.documentType === 'NIT';
  const email = propietario.email;
  const phone = propietario.phone;

  const handleCopy = async (text: string, type: 'email' | 'phone') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'email') {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } else {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
      }
      toast.success(t('inmobiliaria.propietarios.detail.copied'));
    } catch (err) {
      toast.error(t('inmobiliaria.propietarios.detail.copyError'));
    }
  };

  // Editar, borrar y las notas iban contra un `setTimeout`: el cartel verde
  // salía y nada se guardaba. Ahora pegan al back y la ficha se vuelve a leer.
  const handleEditSubmit = async (data: PropietarioFormData) => {
    try {
      const actualizado = await propietariosApi.update(propietario.id, data);
      setPropietario(actualizado);
      toast.success(t('inmobiliaria.propietarios.toasts.updated'));
      setShowEditModal(false);
      await refetch();
    } catch (error) {
      toast.error(t('inmobiliaria.propietarios.toasts.updateError'), {
        description: mensajeDe(error, ''),
      });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await propietariosApi.delete(propietario.id);
      toast.success(t('inmobiliaria.propietarios.toasts.deleted', { name: propietario.name }));
      router.push(LISTA_DE_PROPIETARIOS);
    } catch (error) {
      toast.error(t('inmobiliaria.propietarios.toasts.deleteError'), {
        description: mensajeDe(error, ''),
      });
      setIsDeleting(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      const actualizado = await propietariosApi.update(propietario.id, { notes: notesValue });
      setPropietario(actualizado);
      toast.success(t('inmobiliaria.propietarios.detail.notesSaved'));
      setShowNotesModal(false);
      await refetch();
    } catch (error) {
      toast.error(t('inmobiliaria.propietarios.toasts.updateError'), {
        description: mensajeDe(error, ''),
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const archivo = await descargarDatosDelPropietario(propietario, consignaciones, dispersiones);
      toast.success(t('inmobiliaria.propietarios.detail.exportDone'), {
        description: t('inmobiliaria.propietarios.detail.exportDoneDesc', { archivo }),
      });
    } catch (error) {
      toast.error(t('inmobiliaria.propietarios.detail.exportError'), {
        description: mensajeDe(error, ''),
      });
    } finally {
      setIsExporting(false);
    }
  };

  // «Nueva consignación» abre el asistente con este propietario ya elegido, y
  // al terminar vuelve acá — con el inmueble nuevo en la lista.
  const nuevaConsignacion = () =>
    router.push(
      conRegreso(`/panel/inmobiliaria/inmuebles/nuevo?propietarioId=${propietario.id}`, rutaDeEstaFicha),
    );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Volver: a donde se entró, y dice a dónde. Antes había una miga de
          pan en texto chico que no se leía como navegación. */}
      <BackButton href={rutaDeVuelta} label={etiquetaDeVuelta} />

      {/* Header: quién es, de un vistazo. El nombre es el título; el
          documento, el tipo de persona y las etiquetas van en chips; y una
          línea dice cuántos inmuebles, dónde y desde cuándo. */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className={cn(
            'w-14 h-14 rounded-xl flex items-center justify-center shrink-0',
            isCompany ? 'bg-muted text-muted-foreground' : 'bg-primary-soft text-primary'
          )}>
            {isCompany ? <Buildings className="w-7 h-7" /> : <User className="w-7 h-7" />}
          </div>
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-h2 text-fg">
              {propietario.name}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5" data-testid="propietario-chips">
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 font-mono text-xs tabular-nums text-foreground">
                {propietario.documentType} {propietario.documentNumber}
              </span>
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                {t(isCompany ? 'inmobiliaria.propietarios.detail.personaJuridica' : 'inmobiliaria.propietarios.detail.personaNatural')}
              </span>
              {(propietario.tags ?? []).map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-sm text-muted-foreground" data-testid="propietario-resumen">
              {[
                propietario.propertyCount === 1
                  ? `1 ${t('inmobiliaria.propietario.stats.properties').toLowerCase().replace(/s$/, '')}`
                  : `${propietario.propertyCount} ${t('inmobiliaria.propietario.stats.properties').toLowerCase()}`,
                propietario.city || null,
                t('inmobiliaria.propietarios.detail.desde', {
                  fecha: new Date(propietario.createdAt).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', { month: 'long', year: 'numeric' }),
                }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Sólo si tiene cuenta en el portal. `Propietario` es la ficha
              comercial de la agencia y no es un usuario: sin cuenta no hay
              dónde escribirle, y ofrecerlo igual sería un botón que falla. */}
          {propietario.cuentaDePortalId && (
            <BotonEnviarMensaje counterpartId={propietario.cuentaDePortalId} />
          )}

          <Button variant="secondary" hideArrow onClick={() => setShowEditModal(true)}>
            <PencilSimple className="w-4 h-4" />
            {t('inmobiliaria.propietarios.edit')}
          </Button>

          {/* Las tres acciones del menú hacen algo: extracto del mes (con
              PDF y correo), exportar a Excel, eliminar. Antes las dos primeras
              no tenían `onClick`. */}
          <DropdownList>
            <DropdownListTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                hideArrow
                aria-label={t('inmobiliaria.propietarios.detail.moreActions')}
                data-testid="propietario-acciones"
              >
                <DotsThree className="w-5 h-5" weight="bold" />
              </Button>
            </DropdownListTrigger>
            <DropdownListContent align="end" className="w-52">
              <DropdownListItem onSelect={() => setShowExtracto(true)} data-testid="accion-extracto">
                <FileText className="w-4 h-4" />
                <span className="text-sm">{t('inmobiliaria.propietarios.detail.generateStatement')}</span>
              </DropdownListItem>
              <DropdownListItem onSelect={() => void handleExport()} disabled={isExporting} data-testid="accion-exportar">
                <Download className="w-4 h-4" />
                <span className="text-sm">{t('inmobiliaria.propietarios.detail.exportData')}</span>
              </DropdownListItem>
              <DropdownListSeparator />
              <DropdownListItem
                onSelect={() => setShowDeleteModal(true)}
                className="text-danger focus:bg-danger-soft focus:text-danger"
                data-testid="accion-eliminar"
              >
                <TrashSimple className="w-4 h-4" />
                <span className="text-sm">{t('inmobiliaria.common.delete')}</span>
              </DropdownListItem>
            </DropdownListContent>
          </DropdownList>
        </div>
      </div>

      {/* Stats */}
      <PropietarioStats
        propietario={propietario}
        variant="full"
        consignaciones={consignaciones}
        onCargarCuenta={() => setShowEditModal(true)}
      />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Contact & Bank */}
        <div className="space-y-4">
          {/* Contacto en filas compactas, como la ficha del contrato: antes
              cada dato tenía su ícono en un cuadro de 40 px y la tarjeta
              ocupaba media pantalla para tres líneas. */}
          <section className="rounded-lg border border-border bg-card p-5 space-y-3" data-testid="contacto">
            <div className="flex items-center gap-2">
              <Envelope className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-base font-semibold text-foreground">
                {t('inmobiliaria.propietarios.detail.contactInfo')}
              </h3>
            </div>
            <div className="space-y-2">
              <FilaDeContacto
                etiqueta={t('inmobiliaria.propietarios.email')}
                valor={email}
                href={email ? `mailto:${email}` : undefined}
                onCopiar={email ? () => handleCopy(email, 'email') : undefined}
                copiado={copiedEmail}
                etiquetaCopiar={t('inmobiliaria.propietarios.detail.copied')}
              />
              <FilaDeContacto
                etiqueta={t('inmobiliaria.propietarios.phone')}
                valor={phone}
                href={phone ? `tel:${phone}` : undefined}
                onCopiar={phone ? () => handleCopy(phone, 'phone') : undefined}
                copiado={copiedPhone}
                etiquetaCopiar={t('inmobiliaria.propietarios.detail.copied')}
              />
              <FilaDeContacto
                etiqueta={t('inmobiliaria.propietarios.detail.address')}
                valor={[propietario.address, propietario.city].filter(Boolean).join(', ') || null}
              />
              {propietario.externalId ? (
                <FilaDeContacto etiqueta={t('inmobiliaria.propietarios.detail.refExterna')} valor={propietario.externalId} mono />
              ) : null}
            </div>
          </section>

          <PerfilTributarioDelPropietario
            propietario={propietario}
            onActualizado={(p) => {
              setPropietario(p);
              toast.success(t('inmobiliaria.propietarios.toasts.updated'));
            }}
          />

          {/* Huellas del extracto mensual: qué mes salió, solo o a mano, y por qué no. */}
          <ExtractosEnviadosDelPropietario propietarioId={propietario.id} version={extractosVersion} />

          {/* Bank Info */}
          <PropietarioBankInfo
            bankAccount={propietario.bankAccount}
            onEdit={() => setShowEditModal(true)}
          />
        </div>

        {/* Right Column - Properties & Payments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <SegmentedControl<typeof activeTab>
            value={activeTab}
            onChange={setTab}
            aria-label={t('inmobiliaria.propietarios.detail.properties')}
            options={[
              {
                value: 'properties',
                ariaLabel: t('inmobiliaria.propietarios.detail.properties'),
                label: (
                  <span className="flex items-center gap-2">
                    {t('inmobiliaria.propietarios.detail.properties')}
                    <span className="tabular-nums text-fg-muted">{consignaciones.length}</span>
                  </span>
                ),
              },
              {
                value: 'payments',
                ariaLabel: t('inmobiliaria.propietarios.detail.payments'),
                label: (
                  <span className="flex items-center gap-2">
                    {t('inmobiliaria.propietarios.detail.payments')}
                    <span className="tabular-nums text-fg-muted">{dispersiones.length}</span>
                  </span>
                ),
              },
              {
                value: 'notes',
                label: t('inmobiliaria.propietarios.detail.notes'),
              },
            ]}
          />

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'properties' && (
              <motion.div
                key="properties"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {consignaciones.length > 0 ? (
                  consignaciones.map((consignacion) => (
                    <PropertyCard key={consignacion.id} consignacion={consignacion} />
                  ))
                ) : (
                  <div className="flex flex-col items-center text-center py-14 rounded-lg border border-border bg-card">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                      <House className="w-6 h-6 text-muted-foreground" weight="duotone" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                      {t('inmobiliaria.propietarios.detail.noProperties')}
                    </p>
                    <Button hideArrow onClick={nuevaConsignacion} data-testid="nueva-consignacion">
                      <Plus className="w-4 h-4" />
                      {t('inmobiliaria.propietarios.detail.newConsignment')}
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'payments' && (
              <motion.div
                key="payments"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {dispersiones.length > 0 ? (
                  dispersiones.map((dispersion) => (
                    <PaymentHistoryItem key={dispersion.id} dispersion={dispersion} />
                  ))
                ) : (
                  <div className="flex flex-col items-center text-center py-14 rounded-lg border border-border bg-card">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                      <CurrencyDollar className="w-6 h-6 text-muted-foreground" weight="duotone" />
                    </div>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      {t('inmobiliaria.propietarios.detail.noPayments')}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'notes' && (
              <motion.div
                key="notes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="p-5 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2 mb-4">
                    <Note className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-base font-semibold text-foreground">
                      {t('inmobiliaria.propietarios.detail.internalNotes')}
                    </h3>
                  </div>

                  {propietario.notes ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {propietario.notes}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">{t('inmobiliaria.propietarios.detail.noNotes')}</p>
                  )}

                  <Button
                    variant="link"
                    hideArrow
                    className="mt-4 h-auto p-0"
                    onClick={() => {
                      setNotesValue(propietario.notes || '');
                      setShowNotesModal(true);
                    }}
                  >
                    {propietario.notes ? t('inmobiliaria.propietarios.detail.editNotes') : t('inmobiliaria.propietarios.detail.addNotes')}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t('inmobiliaria.propietarios.editOwner')}
        size="lg"
      >
        <PropietarioForm
          initialData={propietario}
          onSubmit={handleEditSubmit}
          onCancel={() => setShowEditModal(false)}
          mode="edit"
        />
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('inmobiliaria.propietarios.deleteOwner')}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('inmobiliaria.propietarios.deleteConfirm', { name: propietario.name })}
          </p>
          {/* Con inmuebles consignados el back no lo deja borrar: se dice
              antes, con lo que hay que hacer, y el botón no se ofrece. */}
          {propietario.propertyCount > 0 && (
            <AlertaAccionable
              severidad="danger"
              titulo={t('inmobiliaria.propietarios.deleteBloqueado.titulo', { count: propietario.propertyCount })}
              accion={{ label: t('inmobiliaria.propietarios.deleteBloqueado.accion'), href: '/panel/inmobiliaria/inmuebles' }}
              data-testid="borrar-bloqueado"
            >
              {t('inmobiliaria.propietarios.deleteBloqueado.detalle')}
            </AlertaAccionable>
          )}
          <div className="flex items-center gap-3 justify-end pt-4">
            <Button variant="secondary" hideArrow onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>
              {t('inmobiliaria.common.cancel')}
            </Button>
            {propietario.propertyCount === 0 && (
              <Button variant="destructive" hideArrow onClick={handleDelete} isLoading={isDeleting} disabled={isDeleting}>
                {t('inmobiliaria.common.delete')}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Extracto del mes */}
      <ExtractoDelPropietarioDialog
        propietarioId={propietario.id}
        propietarioName={propietario.name}
        abierto={showExtracto}
        onOpenChange={setShowExtracto}
        onEnviado={() => setExtractosVersion((v) => v + 1)}
      />

      {/* Notes Modal */}
      <Modal
        open={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        title={t('inmobiliaria.propietarios.detail.internalNotes')}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('inmobiliaria.propietarios.detail.notesAbout', { name: propietario.name })}
            </label>
            <Textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder={t('inmobiliaria.propietarios.detail.notesPlaceholder')}
              rows={6}
              className="resize-none"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {t('inmobiliaria.propietarios.detail.notesPrivacy')}
            </p>
          </div>
          <div className="flex items-center gap-3 justify-end pt-2">
            <Button variant="secondary" hideArrow onClick={() => setShowNotesModal(false)}>
              {t('inmobiliaria.common.cancel')}
            </Button>
            <Button
              hideArrow
              onClick={handleSaveNotes}
              isLoading={isSavingNotes}
              disabled={isSavingNotes}
            >
              {isSavingNotes ? t('inmobiliaria.common.saving') : t('inmobiliaria.propietarios.detail.saveNotes')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function PropietarioDetailPage() {
  return (
    <PageGuard module="propietarios">
      {/* `useSearchParams` obliga a un límite de Suspense: sin él, `next build`
          falla al prerenderizar la ruta. */}
      <Suspense fallback={null}>
        <PropietarioDetailContent />
      </Suspense>
    </PageGuard>
  );
}
