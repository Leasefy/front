'use client';
import { TEXTO_CANON_POR_CONFIRMAR } from '@/lib/inmuebles/canon-por-confirmar';
import { PageGuard } from '@/components/auth/PageGuard';
import { mesEnTitulo } from '@/lib/utils/mes';

import { Suspense, useState, useEffect, useId, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
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
  FileText,
  Download,
  Plus,
  Tag,
  Copy,
  Check,
  Note,
} from '@phosphor-icons/react';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { BotonEnviarMensaje } from '@/components/messages/BotonEnviarMensaje';
import { InterruptorDeWhatsapp } from '@/components/messages/InterruptorDeWhatsapp';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { SegmentedControl, IconButton, CrossFade, Pressable, Stagger, StaggerItem } from '@leasefy/cadence';
import { BackButton } from '@/components/ui/back-button';
import { AlertaAccionable } from '@/components/ui/alerta-accionable';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { PerfilTributarioDelPropietario } from '@/components/inmobiliaria/PerfilTributarioDelPropietario';
import { ExtractosEnviadosDelPropietario } from '@/components/inmobiliaria/ExtractosEnviadosDelPropietario';
import { DeduccionesDelPropietario } from '@/components/inmobiliaria/deducciones/DeduccionesDelPropietario';
import { CambioDeCuentaBancaria } from '@/components/inmobiliaria/mandato/CambioDeCuentaBancaria';
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
import { InvitarAlPortal } from '@/components/inmobiliaria/InvitarAlPortal';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  errorAlGuardarPropietario,
  type ErrorAlGuardarPropietario,
} from '@/lib/propietarios/errores-del-propietario';
import { ResumenEnLaFicha } from '@/components/estado-de-cuenta/ResumenEnLaFicha';
import {
  usePropietario,
  useConsignaciones,
  useDispersiones,
} from '@/lib/hooks/useInmobiliaria';
import { propietariosApi } from '@/lib/api/inmobiliaria.service';
import { descargarDatosDelPropietario } from '@/lib/propietarios/exportar-datos';
import { conRegreso, lugarDeRegreso, rutaDeRegreso } from '@/lib/nav/ruta-de-regreso';
import type { PropietarioFormData, Consignacion, Dispersion, InmuebleDelPropietario } from '@/lib/types/inmobiliaria';
import { formatCurrency, formatParticipacion } from '@/lib/types/inmobiliaria';
import { textoDeLaComision } from '@/lib/inmuebles/comision-del-mandato';
import { documentoConTipo } from '@/lib/propietarios/datos-por-completar';
import { DatosPorCompletar } from '@/components/inmobiliaria/DatosPorCompletar';
import { SinPorcentajeDelPropietario } from '@/components/inmobiliaria/SinPorcentajeDelPropietario';
import { FALTA_EL_PORCENTAJE } from '@/lib/inmuebles/participaciones-desconocidas';
import { datosPendientesDelPropietario } from '@/lib/propietarios/giros-del-propietario';
import { CajonDelFormularioDelPropietario } from '@/components/inmobiliaria/CajonDelFormularioDelPropietario';
import { documentoDelPropietarioConDv } from '@/lib/propietarios/documento-con-dv';
import { BitacoraDelRecurso } from '@/components/movimientos/BitacoraDelRecurso';

const LISTA_DE_PROPIETARIOS = '/panel/inmobiliaria/propietarios';

/**
 * La cáscara de los tres diálogos de la ficha: editar, eliminar y notas.
 *
 * Era un portal hecho a mano (capa `fixed inset-0`, ✕ propia y bloqueo del
 * scroll del body), sin Esc, sin foco atrapado y sin `role="dialog"`. Ahora es
 * el `Dialog` de la plataforma (DESIGN.md §17): el velo, la ✕, el Esc, el foco
 * y el bloqueo del scroll los pone la primitiva.
 *
 * El pie va por `footer` y no dentro de `children`: el `DialogContent` reparte
 * sólo a sus hijos DIRECTOS, y un pie metido en el cuerpo se iría con el
 * scroll. `variant="destructive"` (eliminar) pone el medallón rojo; el botón
 * rojo lo trae el pie.
 */
function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  variant,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'destructive';
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        if (!abierto) onClose();
      }}
    >
      <DialogContent
        size={size}
        variant={variant}
        // Sin descripción visible, Radix no tiene a qué apuntar: se le avisa.
        {...(description ? {} : { 'aria-describedby': undefined })}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Property Card Component
 *
 * 🔴 P-18 (QA-PROP, 03-10): era un `div` con cursor de mano y sin `onClick`:
 * no llevaba a ningún lado y con el teclado no se llegaba. Ahora es un enlace a
 * la ficha del inmueble. El subtítulo repetía el título (casi siempre el título
 * ES la dirección): sale sólo si dice otra cosa. Y en copropiedad dice qué
 * parte es suya — «Copropiedad · 50 %» —, que antes no se veía.
 *
 * 🔴 P-22: a 390 px cortaba la dirección y el inquilino («David…»): el título
 * se parte en renglones y las cifras bajan de renglón cuando no caben.
 */
function PropertyCard({
  consignacion,
  propietarioId,
  inmueble,
  sinPorcentaje = false,
}: {
  consignacion: Consignacion;
  propietarioId: string;
  /**
   * 🔴 P-02 (back 5731a4e2): el inmueble visto desde ESTE dueño — su %, si hay
   * contrato vigente y SU parte del canon del contrato. Sin él (un back
   * anterior, o la plata oculta), lo de siempre: el canon del mandato.
   */
  inmueble?: InmuebleDelPropietario | null;
  /**
   * 🔴 Copropiedad migrada sin porcentaje (Nico, 04-10-2026): su % es
   * provisional; se dice «Sin porcentaje» y no se calcula «su parte».
   */
  sinPorcentaje?: boolean;
}) {
  const { t } = useI18n();
  // Copropiedad: su parte del canon del contrato, con el entero al lado.
  const suParteDelCanon =
    !sinPorcentaje && inmueble && inmueble.participacionBps < 10_000 && inmueble.canonCop !== null
      ? inmueble
      : null;
  // El canon que se cobra es el del CONTRATO vigente (P-01), si lo hay.
  const canonDelContrato = inmueble?.arrendado ? inmueble.canonDelContratoCop : null;
  const direccionDistinta =
    !!consignacion.propertyAddress &&
    consignacion.propertyAddress.trim().toLowerCase() !== (consignacion.propertyTitle ?? '').trim().toLowerCase();
  // Con un solo dueño no se dice nada: el 100 % es lo normal.
  const suParte =
    inmueble && inmueble.participacionBps < 10_000
      ? inmueble.participacionBps
      : (consignacion.copropietarios?.length ?? 0) > 1
        ? consignacion.copropietarios.find((c) => c.propietarioId === propietarioId)?.participacionBps ?? null
        : null;

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
    <Link
      href={`/panel/inmobiliaria/inmuebles/${consignacion.id}`}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      data-testid={`inmueble-del-propietario-${consignacion.id}`}
    >
    <Pressable
      press="sm"
      className="p-4 rounded-lg border border-border bg-card"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Thumbnail */}
        <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl bg-surface-muted flex items-center justify-center shrink-0 overflow-hidden">
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
            <div className="min-w-0">
              <h4 className="text-base font-semibold text-foreground break-words">
                {consignacion.propertyTitle}
              </h4>
              {direccionDistinta && (
                <p className="text-sm text-muted-foreground break-words" data-testid="direccion-del-inmueble">
                  {consignacion.propertyAddress}
                </p>
              )}
              {sinPorcentaje ? (
                <span
                  className="mt-1 inline-block rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning"
                  data-testid="copropiedad-sin-porcentaje"
                >
                  Copropiedad · {FALTA_EL_PORCENTAJE.toLowerCase()}
                </span>
              ) : suParte != null && (
                <span
                  className="mt-1 inline-block rounded-full bg-primary-soft px-2 py-0.5 font-mono text-[11px] tabular-nums text-primary"
                  data-testid="copropiedad-del-inmueble"
                >
                  {t('inmobiliaria.propietarios.detail.copropiedadPct', { pct: formatParticipacion(suParte) })}
                </span>
              )}
            </div>
            <span className={cn('px-2 py-1 rounded-full text-xs font-medium shrink-0', statusColors[consignacion.availability])}>
              {statusLabels[consignacion.availability]}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
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
                {suParteDelCanon ? (
                  <div data-testid="su-parte-del-canon">
                    <p className="text-base font-semibold tabular-nums text-foreground">
                      {formatCurrency(suParteDelCanon.canonCop ?? 0)}
                    </p>
                    <p className="text-caption text-muted-foreground">
                      {suParteDelCanon.canonDelContratoCop !== null
                        ? t('inmobiliaria.propietarios.detail.suParteDe', {
                            canon: formatCurrency(suParteDelCanon.canonDelContratoCop),
                          })
                        : t('inmobiliaria.propietarios.detail.suParteAlMes')}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-base font-semibold tabular-nums text-foreground">
                      {canonDelContrato !== null && canonDelContrato !== undefined
                        ? formatCurrency(canonDelContrato)
                        : consignacion.canonPorConfirmar
                          ? TEXTO_CANON_POR_CONFIRMAR
                          : consignacion.monthlyRent != null ? formatCurrency(consignacion.monthlyRent) : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('inmobiliaria.common.perMonth')}</p>
                  </div>
                )}
                <div className="hidden h-8 w-px bg-border sm:block" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {textoDeLaComision(consignacion)}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.agentes.commission')}</p>
                </div>
              </>
            )}
            {consignacion.currentTenantName && (
              <>
                <div className="hidden h-8 w-px bg-border sm:block" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground break-words">
                    {consignacion.currentTenantName}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.propietarios.detail.tenant')}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Pressable>
    </Link>
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
            {/* P-26: «1 propiedad», «3 propiedades»; no «propiedad(es)». */}
            {dispersion.items.length}{' '}
            {t(
              dispersion.items.length === 1
                ? 'inmobiliaria.propietarios.detail.propertiesCountUno'
                : 'inmobiliaria.propietarios.detail.propertiesCount',
            )}
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
  etiquetaCopiado,
  mono,
}: {
  etiqueta: string;
  valor: string | null | undefined;
  href?: string;
  onCopiar?: () => void;
  copiado?: boolean;
  /** Lo que HACE el botón («Copiar el correo»). */
  etiquetaCopiar?: string;
  /**
   * Lo que pasó, sólo después de copiar. 🔴 23-09 (QA): el botón se anunciaba
   * «Copiado al portapapeles» antes de que nadie copiara nada.
   */
  etiquetaCopiado?: string;
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
            aria-label={(copiado ? etiquetaCopiado : etiquetaCopiar) ?? etiquetaCopiar ?? 'Copiar'}
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
  /** COLA-FRONT (04-10): el resumen dijo «Sin día de giro» (algo arrendado y ningún giro programado). */
  const [sinDiaDeGiro, setSinDiaDeGiro] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showExtracto, setShowExtracto] = useState(false);
  // Sube cada vez que se manda el extracto desde el diálogo: la lista de huellas se relee.
  const [extractosVersion, setExtractosVersion] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [activeTab, setTab] = useState<'properties' | 'payments' | 'deducciones' | 'notes'>('properties');
  const [notesValue, setNotesValue] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  // El motivo del back al editar, dentro del diálogo (duplicado → al lado del documento).
  const [errorAlEditar, setErrorAlEditar] = useState<ErrorAlGuardarPropietario | null>(null);
  // «Editar» va en el CAJÓN de «Nuevo propietario» (Nico, 03-10): su pie manda el formulario por `form=`.
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const idDeLaEdicion = `propietario-editar-${useId().replace(/:/g, '')}`;
  /*
   * 🔴 P-24 (QA-PROP, 03-10): la invitación que NO salió. El back crea la cuenta
   * igual (y devuelve su id), así que el bloque «Invitar» desaparecía como si el
   * correo hubiera llegado. Mientras esto tenga algo, el bloque se queda en
   * «Invitación sin entregar» con «Reintentar».
   */
  const [invitacionSinEntregar, setInvitacionSinEntregar] = useState<{ motivo?: string } | null>(null);
  // Sube cuando el lápiz de la cuenta pide abrir «Cambiar cuenta».
  const [pedirCambioDeCuenta, setPedirCambioDeCuenta] = useState(0);

  /*
   * 🔴 Las llaves con que el back protege cada acción de esta ficha
   * (`propietarios.controller.ts`: PUT e invitar-al-portal → edit, DELETE →
   * delete). Un CONTADOR o un VIEWER tienen sólo `view`: veían Editar,
   * Eliminar y las notas, y el clic terminaba en 403.
   */
  const { canAccess, isLoading: cargandoPermisos } = usePermissions();
  const puedeEditar = canAccess('propietarios', 'edit');
  const puedeEliminar = canAccess('propietarios', 'delete');
  /*
   * 🔴 La PLATA del propietario (su cuenta, sus giros, sus deducciones y su
   * extracto) pide `dispersiones:view` desde el 17-09-2026. El asesor comercial
   * capta al propietario pero no ve su plata (Nico: «nada de operaciones»): la
   * ficha no le ofrece lo que el back le va a negar.
   */
  const veLaPlata = canAccess('dispersiones', 'view');
  /*
   * 🔴 PR-11 (QA-PROP, 03-10): los inmuebles salen de `GET /consignaciones`,
   * que el back protege con `portafolio:view`. El contador y el auxiliar no lo
   * tienen: la pestaña terminaba en un 403 pintado como «no pudimos leer». Sin
   * el permiso no se pide y la pestaña dice por qué.
   */
  const vePortafolio = canAccess('portafolio', 'view');
  /*
   * El perfil tributario decide el IVA del canon y las retenciones de los
   * giros: lo cambian un administrador o el contador, nunca el asesor (Nico,
   * 03-10, P-20). Es la llave de mover la plata del propietario.
   */
  const puedeEditarPerfil = canAccess('dispersiones', 'edit');

  // Fetch propietario and keep local state for updates
  const {
    propietario: fetchedPropietario,
    isLoading,
    // El error entero, no su mensaje: `FalloDeCarga` lo clasifica para saber si
    // reintentar sirve. Sin esto, un 500 o la red caída llegaban acá como
    // `propietario === undefined` y la ficha decía «este propietario no
    // existe» — afirmando una baja que nadie hizo.
    errorCrudo: errorPropietario,
    refetch,
  } = usePropietario(id);
  const [propietario, setPropietario] = useState(fetchedPropietario);

  // Update local state when fetched data changes
  useEffect(() => {
    if (fetchedPropietario) {
      setPropietario(fetchedPropietario);
    }
  }, [fetchedPropietario]);

  /*
   * Los inmuebles y los giros de este propietario.
   *
   * Se toman también `isLoading` y `errorCrudo`: estas dos listas alimentan
   * las pestañas, sus contadores Y el Excel de «Exportar datos». Ignorar el
   * fallo dejaba las tres mintiendo con la misma cara —«0 inmuebles», «este
   * propietario no tiene inmuebles consignados» y un archivo con la hoja
   * Inmuebles vacía— sobre alguien que puede tener doce.
   */
  const {
    consignaciones,
    isLoading: cargandoConsignaciones,
    errorCrudo: errorConsignaciones,
    refetch: recargarConsignaciones,
  } = useConsignaciones({ propietarioId: id }, { skip: cargandoPermisos || !vePortafolio });
  const {
    dispersiones,
    isLoading: cargandoDispersiones,
    errorCrudo: errorDispersiones,
    refetch: recargarDispersiones,
  } = useDispersiones({ propietarioId: id }, { skip: cargandoPermisos || !veLaPlata });

  /*
   * `?cambiarCuenta=1` (P-14): el enlace «Cambiar cuenta» del formulario de la
   * LISTA trae aquí, porque el cambio de una cuenta que ya existe pasa por el
   * flujo controlado de la ficha (certificación, confirmación del propietario,
   * aprobación). Hasta hoy la ficha ignoraba el parámetro y no abría nada.
   * Con la ficha leída y el permiso, se pide UNA vez y se quita de la URL (un
   * «atrás» o un refresco no lo vuelven a abrir).
   */
  const cambioDeCuentaPedidoPorUrl = useRef(false);
  const pideCambiarCuenta = searchParams.get('cambiarCuenta') === '1';
  useEffect(() => {
    if (!pideCambiarCuenta || cambioDeCuentaPedidoPorUrl.current) return;
    if (!propietario || cargandoPermisos) return;
    cambioDeCuentaPedidoPorUrl.current = true;
    if (puedeEditar && veLaPlata && !propietario.datosBancariosOcultos) {
      setPedirCambioDeCuenta((n) => n + 1);
    }
    const resto = new URLSearchParams(searchParams.toString());
    resto.delete('cambiarCuenta');
    const consulta = resto.toString();
    router.replace(`${rutaDeEstaFicha}${consulta ? `?${consulta}` : ''}`, { scroll: false });
  }, [pideCambiarCuenta, propietario, cargandoPermisos, puedeEditar, veLaPlata, searchParams, router, rutaDeEstaFicha]);

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

  /*
   * 🔴 Falló la carga ≠ el propietario no existe.
   *
   * Hasta acá cualquier fallo —500, red caída, sesión vencida, 403— pintaba
   * «Propietario no encontrado», que es una afirmación sobre la base de datos
   * que nadie verificó: quien la lee piensa que lo borraron. `FalloDeCarga`
   * clasifica el error y dice lo que de verdad pasó, y sólo ofrece reintentar
   * cuando reintentar puede cambiar algo (un 404 sí es «no existe», y ahí
   * muestra exactamente eso, con el camino de vuelta).
   */
  if (!propietario && errorPropietario) {
    return (
      <div className="p-6 lg:p-8 space-y-6" data-testid="propietario-fallo">
        <BackButton href={rutaDeVuelta} label={etiquetaDeVuelta} />
        <FalloDeCarga
          error={errorPropietario}
          queEs="el propietario"
          onReintentar={refetch}
          volverA={{ label: etiquetaDeVuelta, href: rutaDeVuelta }}
        />
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
    setErrorAlEditar(null);
    setGuardandoEdicion(true);
    try {
      const actualizado = await propietariosApi.update(propietario.id, data);
      setPropietario(actualizado);
      toast.success(t('inmobiliaria.propietarios.toasts.updated'));
      setShowEditModal(false);
      await refetch();
    } catch (error) {
      // No un toast que se va solo: «ese documento ya está cargado» va al lado
      // del documento y el diálogo se queda abierto con lo que escribiste.
      setErrorAlEditar(errorAlGuardarPropietario(error));
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const cerrarEdicion = () => {
    setShowEditModal(false);
    setErrorAlEditar(null);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await propietariosApi.delete(propietario.id);
      toast.success(t('inmobiliaria.propietarios.toasts.deleted', { name: propietario.name }));
      router.push(LISTA_DE_PROPIETARIOS);
    } catch (error) {
      // El motivo con la regla de oro: el 409 dice qué lo retiene; un 5xx no
      // culpa a nadie; «conexión» sólo si no hubo respuesta.
      toast.error(t('inmobiliaria.propietarios.toasts.deleteError'), {
        description: mensajeParaLaPersona(error, { porDefecto: '', accion: 'eliminar el propietario' }),
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
        description: mensajeParaLaPersona(error, { porDefecto: '', accion: 'guardar las notas' }),
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleExport = async () => {
    /*
     * 🔴 No se exporta lo que no se pudo leer.
     *
     * El Excel tiene tres hojas —ficha, inmuebles, giros— y las dos últimas
     * salen de estas listas. Con una de ellas caída el archivo se bajaba
     * igual, con la hoja vacía y sin una sola marca de que faltaba algo: un
     * documento que se guarda, se manda por correo y se lee meses después
     * como si el propietario no tuviera inmuebles. Un archivo incompleto es
     * peor que ningún archivo, porque sobrevive al error que lo causó.
     */
    /*
     * PR-11: sin permiso para el portafolio o la plata, esas hojas no se
     * pudieron leer por una razón que reintentar no arregla. Se dice ESA razón
     * y no «no pudimos leer…».
     */
    if (!vePortafolio || !veLaPlata) {
      toast.error(t('inmobiliaria.propietarios.detail.exportError'), {
        description: t('inmobiliaria.propietarios.detail.exportSinPermiso'),
      });
      return;
    }
    if (errorConsignaciones || errorDispersiones) {
      toast.error(t('inmobiliaria.propietarios.detail.exportError'), {
        description: t('inmobiliaria.propietarios.detail.exportIncompleto'),
      });
      return;
    }
    setIsExporting(true);
    try {
      const archivo = await descargarDatosDelPropietario(propietario, consignaciones, dispersiones);
      toast.success(t('inmobiliaria.propietarios.detail.exportDone'), {
        description: t('inmobiliaria.propietarios.detail.exportDoneDesc', { archivo }),
      });
    } catch (error) {
      toast.error(t('inmobiliaria.propietarios.detail.exportError'), {
        description: mensajeParaLaPersona(error, { porDefecto: '' }),
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
                {/* P-06: un NIT con su dígito de verificación («NIT 900555006-0»). */}
                {documentoConTipo(propietario.documentType, documentoDelPropietarioConDv(propietario), ' ')}
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
            {/* T-0128: una ficha creada por la migración puede venir sin documento. */}
            <DatosPorCompletar
              pendientes={
                sinDiaDeGiro
                  ? datosPendientesDelPropietario({ ...propietario, proximoGiro: null })
                  : datosPendientesDelPropietario(propietario)
              }
              onCompletar={puedeEditar ? () => setShowEditModal(true) : undefined}
            />
            {/* 🔴 Copropiedad migrada sin porcentaje: no se le gira (Nico, 04-10). */}
            <SinPorcentajeDelPropietario inmuebles={propietario.inmueblesSinPorcentaje} />
            <p className="text-sm text-muted-foreground" data-testid="propietario-resumen">
              {[
                // 🔴 23-09 (QA): quitarle la «s» a «Propiedades» daba «1 propiedade».
                // El singular y el plural son claves, no una regla sobre la palabra.
                propietario.propertyCount === 1
                  ? t('inmobiliaria.propietario.stats.unaPropiedad')
                  : t('inmobiliaria.propietario.stats.nPropiedades', { n: propietario.propertyCount }),
                // Sus copropiedades, aparte: el minoritario también es dueño.
                (propietario.copropiedadesCount ?? 0) > 0
                  ? t('inmobiliaria.propietario.stats.copropiedades', { n: propietario.copropiedadesCount ?? 0 })
                  : null,
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

          {puedeEditar && (
            <Button variant="secondary" hideArrow onClick={() => setShowEditModal(true)}>
              <PencilSimple className="w-4 h-4" />
              {t('inmobiliaria.propietarios.edit')}
            </Button>
          )}

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
              {veLaPlata && (
                <DropdownListItem onSelect={() => setShowExtracto(true)} data-testid="accion-extracto">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">{t('inmobiliaria.propietarios.detail.generateStatement')}</span>
                </DropdownListItem>
              )}
              <DropdownListItem onSelect={() => void handleExport()} disabled={isExporting} data-testid="accion-exportar">
                <Download className="w-4 h-4" />
                <span className="text-sm">{t('inmobiliaria.propietarios.detail.exportData')}</span>
              </DropdownListItem>
              {puedeEliminar && (
                <>
                  <DropdownListSeparator />
                  <DropdownListItem
                    onSelect={() => setShowDeleteModal(true)}
                    className="text-danger focus:bg-danger-soft focus:text-danger"
                    data-testid="accion-eliminar"
                  >
                    <TrashSimple className="w-4 h-4" />
                    <span className="text-sm">{t('inmobiliaria.common.delete')}</span>
                  </DropdownListItem>
                </>
              )}
            </DropdownListContent>
          </DropdownList>
        </div>
      </div>

      {/* El estado de cuenta, resumido (CEO, 2026-09-13): lo que la
          inmobiliaria le ha girado y lo que le falta por girar. Se pinta solo
          si hay contratos; si la llamada falla, no se pinta nada, porque un
          «$0» sobre datos que no llegaron se lee «no le debemos nada». */}
      {/* Sin `dispersiones:view` el back niega el resumen (403): no se pide. */}
      {veLaPlata && (
        <ResumenEnLaFicha
          tipo="propietario"
          id={propietario.id}
          volverA={`/panel/inmobiliaria/propietarios/${propietario.id}`}
          tieneArrendados={(propietario.activeLeases ?? 0) + (propietario.copropiedadesArrendadas ?? 0) > 0}
          onSinDiaDeGiro={setSinDiaDeGiro}
        />
      )}

      {/* Stats */}
      <PropietarioStats
        propietario={propietario}
        variant="full"
        sinDiaDeGiro={sinDiaDeGiro}
        consignaciones={consignaciones}
        onCargarCuenta={puedeEditar ? () => setShowEditModal(true) : undefined}
      />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Contact & Bank */}
        <div className="space-y-4">
          {/* El permiso para escribirle por WhatsApp desde el chat
              (2026-09-12). Sólo si tiene cuenta de portal: el hilo del chat es
              con un `User`, y sin cuenta no hay a quién prendérselo. */}
          <InterruptorDeWhatsapp personaId={propietario.cuentaDePortalId} />
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
                etiquetaCopiar={t('inmobiliaria.propietarios.detail.copiarCorreo')}
                etiquetaCopiado={t('inmobiliaria.propietarios.detail.copied')}
              />
              <FilaDeContacto
                etiqueta={t('inmobiliaria.propietarios.phone')}
                valor={phone}
                href={phone ? `tel:${phone}` : undefined}
                onCopiar={phone ? () => handleCopy(phone, 'phone') : undefined}
                copiado={copiedPhone}
                etiquetaCopiar={t('inmobiliaria.propietarios.detail.copiarTelefono')}
                etiquetaCopiado={t('inmobiliaria.propietarios.detail.copied')}
              />
              <FilaDeContacto
                etiqueta={t('inmobiliaria.propietarios.detail.address')}
                valor={[propietario.address, propietario.city, propietario.department].filter(Boolean).join(', ') || null}
              />
              {propietario.externalId ? (
                <FilaDeContacto etiqueta={t('inmobiliaria.propietarios.detail.refExterna')} valor={propietario.externalId} mono />
              ) : null}
            </div>
            {/*
             * 🔴 Sin cuenta en Leasefy, se DICE y se ofrece resolverlo (O4).
             *
             * Arriba, «Enviar mensaje» sólo se dibuja con `cuentaDePortalId`, y
             * en la cartera real de Nico 1.676 de 1.733 propietarios no tienen
             * cuenta: el hueco se leía como «acá no se puede escribir», no como
             * «esta persona no tiene cuenta». Es el mismo aviso que la ficha del
             * inmueble (`ConsignacionDetailSections`). Al invitar, el back
             * devuelve la cuenta y el mensaje aparece sin recargar.
             *
             * Detrás de `propietarios:edit`, que es con lo que el back protege
             * `POST :id/invitar-al-portal`.
             */}
            {(!propietario.cuentaDePortalId || invitacionSinEntregar) && puedeEditar && (
              <InvitarAlPortal
                propietarioId={propietario.id}
                correo={propietario.email}
                sinEntregar={invitacionSinEntregar}
                onSinEntregar={setInvitacionSinEntregar}
                onInvitado={(cuenta) =>
                  setPropietario((p) => (p ? { ...p, cuentaDePortalId: cuenta } : p))
                }
              />
            )}
          </section>

          {/* P-20: el perfil dice él mismo qué cambió, con «Deshacer», en UN
              aviso que se reemplaza (antes se apilaban «Propietario
              actualizado»). */}
          <PerfilTributarioDelPropietario
            propietario={propietario}
            puedeEditar={puedeEditarPerfil}
            onActualizado={setPropietario}
          />

          {/* P-21: con la cuenta oculta por rol (`datosBancariosOcultos`) no se
              dibuja «sin cuenta bancaria»: se dice que no la puede ver. */}
          {veLaPlata && !propietario.datosBancariosOcultos ? (
            <>
              {/* Huellas del extracto mensual: qué mes salió, solo o a mano, y por qué no. */}
              <ExtractosEnviadosDelPropietario propietarioId={propietario.id} version={extractosVersion} />

              {/* Bank Info */}
              {/* El lápiz: con cuenta, «Cambiar cuenta» (certificación,
                  confirmación y aprobación: el back no deja cambiarla desde
                  «Editar», P-14); sin cuenta, «Editar» para cargar la primera. */}
              <PropietarioBankInfo
                bankAccount={propietario.bankAccount}
                propietario={{ nombre: propietario.name, documento: propietario.documentNumber ?? '' }}
                onEdit={
                  puedeEditar
                    ? propietario.bankAccount?.accountNumber
                      ? () => setPedirCambioDeCuenta((n) => n + 1)
                      : () => setShowEditModal(true)
                    : undefined
                }
              />

              {/* 🔴 17-09: cambiar una cuenta que ya existe pide certificación,
                  confirmación del propietario y aprobación de un administrador.
                  Va dentro de `veLaPlata`: es la cuenta bancaria del propietario. */}
              <CambioDeCuentaBancaria
                propietarioId={propietario.id}
                tieneCuenta={!!propietario.bankAccount?.accountNumber}
                propietario={{ nombre: propietario.name, documento: propietario.documentNumber ?? '' }}
                puedeEditar={puedeEditar}
                onCuentaCambiada={() => void refetch()}
                pedirCambio={pedirCambioDeCuenta}
              />
            </>
          ) : (
            <div
              className="p-4 rounded-lg border border-dashed border-border bg-surface text-sm text-fg-muted"
              data-testid="propietario-plata-oculta"
            >
              La cuenta bancaria, los giros, las deducciones y el extracto de este propietario no hacen parte de
              tu rol. Si los necesitas, pídele a un administrador el permiso de ver dispersiones.
            </div>
          )}
        </div>

        {/* Right Column - Properties & Payments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs — P-22: a 390 px las cuatro no caben (la página medía 406);
              se corren dentro de su riel en vez de correr la página. */}
          <div className="max-w-full overflow-x-auto overscroll-x-contain" data-lenis-prevent data-testid="pestanas-del-propietario">
          <SegmentedControl<typeof activeTab>
            value={activeTab}
            onChange={setTab}
            aria-label={t('inmobiliaria.propietarios.detail.properties')}
            options={[
              {
                value: 'properties',
                ariaLabel: t('inmobiliaria.propietarios.detail.properties'),
                /* El contador sale sólo cuando la lista se leyó: un «0» sobre
                   una petición que falló es un número inventado. */
                label: (
                  <span className="flex items-center gap-2">
                    {t('inmobiliaria.propietarios.detail.properties')}
                    {vePortafolio && !cargandoConsignaciones && !errorConsignaciones && (
                      <span className="tabular-nums text-fg-muted">{consignaciones.length}</span>
                    )}
                  </span>
                ),
              },
              ...(veLaPlata
                ? [
                    {
                      value: 'payments' as const,
                      ariaLabel: t('inmobiliaria.propietarios.detail.payments'),
                      label: (
                        <span className="flex items-center gap-2">
                          {t('inmobiliaria.propietarios.detail.payments')}
                          {!cargandoDispersiones && !errorDispersiones && (
                            <span className="tabular-nums text-fg-muted">{dispersiones.length}</span>
                          )}
                        </span>
                      ),
                    },
                    {
                      value: 'deducciones' as const,
                      label: t('inmobiliaria.deducciones.tab'),
                    },
                  ]
                : []),
              {
                value: 'notes',
                label: t('inmobiliaria.propietarios.detail.notes'),
              },
            ]}
          />
          </div>

          {/* Tab Content — el contenido de la pestaña se cruza con el de la
              nueva (`CrossFade`: sale en 150 ms y el nuevo sube 4 px). */}
          <CrossFade
            swapKey={activeTab}
            className={activeTab === 'properties' || activeTab === 'payments' ? 'space-y-4' : undefined}
          >
            {/* Carga → fallo → vacío → datos, en ese orden y en un solo
                lugar. Antes el vacío se evaluaba primero y «este
                propietario no tiene inmuebles consignados» salía tanto
                mientras cargaba como cuando la petición se caía. */}
            {activeTab === 'properties' && !vePortafolio && !cargandoPermisos && (
              <div
                className="p-4 rounded-lg border border-dashed border-border bg-surface text-sm text-fg-muted"
                data-testid="propietario-portafolio-oculto"
              >
                {t('inmobiliaria.propietarios.detail.portafolioOculto')}
              </div>
            )}
            {activeTab === 'properties' && (vePortafolio || cargandoPermisos) && (
              <EstadoDeDatos
                cargando={cargandoConsignaciones || cargandoPermisos}
                error={errorConsignaciones}
                queEs="los inmuebles de este propietario"
                onReintentar={recargarConsignaciones}
                vacio={consignaciones.length === 0}
                cuandoVacio={
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
                }
              >
                <Stagger className="space-y-4">
                  {consignaciones.map((consignacion) => (
                    <StaggerItem key={consignacion.id}>
                      <PropertyCard
                        consignacion={consignacion}
                        propietarioId={propietario.id}
                        inmueble={propietario.inmuebles?.find((i) => i.consignacionId === consignacion.id) ?? null}
                        sinPorcentaje={
                          propietario.inmueblesSinPorcentaje?.some(
                            (i) => i.consignacionId === consignacion.id,
                          ) ?? false
                        }
                      />
                    </StaggerItem>
                  ))}
                </Stagger>
              </EstadoDeDatos>
            )}

            {/* Lo mismo del otro lado, y acá pesa más: «no hay giros»
                sobre una lectura caída se lee como «no le hemos pagado». */}
            {veLaPlata && activeTab === 'payments' && (
              <EstadoDeDatos
                cargando={cargandoDispersiones}
                error={errorDispersiones}
                queEs="los giros a este propietario"
                onReintentar={recargarDispersiones}
                vacio={dispersiones.length === 0}
                cuandoVacio={
                  <div className="flex flex-col items-center text-center py-14 rounded-lg border border-border bg-card">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                      <CurrencyDollar className="w-6 h-6 text-muted-foreground" weight="duotone" />
                    </div>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      {t('inmobiliaria.propietarios.detail.noPayments')}
                    </p>
                  </div>
                }
              >
                <Stagger className="space-y-4">
                  {dispersiones.map((dispersion) => (
                    <StaggerItem key={dispersion.id}>
                      <PaymentHistoryItem dispersion={dispersion} />
                    </StaggerItem>
                  ))}
                </Stagger>
              </EstadoDeDatos>
            )}

            {/* Los inmuebles salen de las consignaciones ya leídas: el
                descuento puede quedar atado a uno o a ninguno. */}
            {veLaPlata && activeTab === 'deducciones' && (
              <DeduccionesDelPropietario
                propietarioId={propietario.id}
                inmuebles={consignaciones.map((c) => ({
                  consignacionId: c.id,
                  titulo: c.propertyTitle,
                }))}
              />
            )}

            {activeTab === 'notes' && (
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

                {puedeEditar && (
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
                )}
              </div>
            )}
          </CrossFade>
        </div>
      </div>

      {/* 🔴 22-09: quién tocó a este propietario, con su rol —crearlo,
          editarlo, cambiarle la cuenta, bajar su extracto— y lo que se intentó
          sin permiso. Debajo de las pestañas: vale para todas. */}
      <BitacoraDelRecurso tipo="propietario" id={propietario.id} />

      {/* Editar — el MISMO cajón de «Nuevo propietario» y de «Editar» en la
          lista (Nico, 03-10: el formulario del propietario va en un cajón, no
          en un modal). Cabecera, cuerpo que se desplaza y pie fijo; lo que el
          back dijo sin campo, arriba del cuerpo. «Cambiar cuenta» abre el
          cambio controlado aquí mismo (P-14). */}
      <CajonDelFormularioDelPropietario
        abierto={showEditModal && puedeEditar}
        onCerrar={cerrarEdicion}
        titulo={t('inmobiliaria.propietarios.editOwner')}
        descripcion={propietario.name}
        aviso={errorAlEditar?.general}
        idDelFormulario={idDeLaEdicion}
        textoDelBoton={t('inmobiliaria.propietario.form.saveChanges')}
        guardando={guardandoEdicion}
      >
        <PropietarioForm
          initialData={propietario}
          onSubmit={handleEditSubmit}
          onCancel={cerrarEdicion}
          mode="edit"
          serverError={errorAlEditar?.campo ?? null}
          serverErrors={errorAlEditar?.porCampo ?? null}
          accionesAfuera
          idDelFormulario={idDeLaEdicion}
          onCambiarCuenta={() => {
            cerrarEdicion();
            setPedirCambioDeCuenta((n) => n + 1);
          }}
        />
      </CajonDelFormularioDelPropietario>

      {/* Delete Modal — destructiva: dice qué se borra (la ficha entera; el
          back hace un `delete`, no lo archiva) y, si algo lo retiene, por qué
          y a dónde ir. Con algo que lo retiene, el botón no se ofrece. */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('inmobiliaria.propietarios.deleteOwner')}
        description={t('inmobiliaria.propietarios.deleteConfirm', { name: propietario.name })}
        size="sm"
        variant="destructive"
        footer={
          <>
            <Button variant="secondary" hideArrow onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>
              {t('inmobiliaria.common.cancel')}
            </Button>
            {propietario.propertyCount === 0 && (propietario.copropiedadesCount ?? 0) === 0 && (
              <Button variant="destructive" hideArrow onClick={handleDelete} isLoading={isDeleting} disabled={isDeleting}>
                {t('inmobiliaria.common.delete')}
              </Button>
            )}
          </>
        }
      >
        {/* Con inmuebles consignados el back no lo deja borrar: se dice
            antes, con lo que hay que hacer, y el botón no se ofrece. */}
        {propietario.propertyCount > 0 && (
          <AlertaAccionable
            severidad="danger"
            titulo={
              propietario.propertyCount === 1
                ? t('inmobiliaria.propietarios.deleteBloqueado.tituloUno')
                : t('inmobiliaria.propietarios.deleteBloqueado.tituloN', { count: propietario.propertyCount })
            }
            accion={{ label: t('inmobiliaria.propietarios.deleteBloqueado.accion'), href: '/panel/inmobiliaria/inmuebles' }}
            data-testid="borrar-bloqueado"
          >
            {t('inmobiliaria.propietarios.deleteBloqueado.detalle')}
          </AlertaAccionable>
        )}
        {/* Lo mismo si es COPROPIETARIO sin ser principal: la FK lo retiene
            igual y el back responde 409 (antes era un 500). */}
        {propietario.propertyCount === 0 && (propietario.copropiedadesCount ?? 0) > 0 && (
          <AlertaAccionable
            severidad="danger"
            titulo={
              propietario.copropiedadesCount === 1
                ? t('inmobiliaria.propietarios.deleteBloqueado.tituloCopropietarioUno')
                : t('inmobiliaria.propietarios.deleteBloqueado.tituloCopropietarioN', { count: propietario.copropiedadesCount ?? 0 })
            }
            accion={{ label: t('inmobiliaria.propietarios.deleteBloqueado.accion'), href: '/panel/inmobiliaria/inmuebles' }}
            data-testid="borrar-bloqueado-copropietario"
          >
            {t('inmobiliaria.propietarios.deleteBloqueado.detalleCopropietario')}
          </AlertaAccionable>
        )}
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
        footer={
          <>
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
          </>
        }
      >
        <div>
          <label htmlFor="notas-internas-del-propietario" className="block text-sm font-medium text-foreground mb-2">
            {t('inmobiliaria.propietarios.detail.notesAbout', { name: propietario.name })}
          </label>
          <Textarea
            id="notas-internas-del-propietario"
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
