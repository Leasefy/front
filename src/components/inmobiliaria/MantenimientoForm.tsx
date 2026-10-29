'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Wrench,
  Lightning,
  Snowflake,
  HouseLine,
  PaintBrush,
  Key,
  DotsThreeCircle,
  Warning,
  Upload,
  Check,
  User,
  MapPin,
  MagnifyingGlass,
  Wallet,
  Truck,
  Plus,
  UserCircle,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useTr, type Tr } from '@/lib/i18n/use-tr';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { conRegreso } from '@/lib/nav/ruta-de-regreso';
import {
  buscarElInmueble,
  contratosParaBuscar,
  propietariosDelInmueble,
  type ContratoParaBuscar,
} from '@/lib/mantenimiento/buscar-el-inmueble';
import { Button, Input, Textarea } from '@/components/ui';
import { Collapse, Presence, RadioCardGroup, RadioCard } from '@leasefy/cadence';
import { CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente';
import {
  MAX_LARGO_TITULO_DEL_MANTENIMIENTO,
  MENSAJES_DEL_MANTENIMIENTO,
  esArchivoDeVideo,
  fotosQueEntran,
} from '@/lib/mantenimiento/limites-del-mantenimiento';
import { SelectorDeFotosDelMantenimiento } from '@/components/inmobiliaria/mantenimiento/SelectorDeFotosDelMantenimiento';
import { ProveedorDeLaSolicitud } from '@/components/inmobiliaria/mantenimiento/ProveedorDeLaSolicitud';
import type {
  Consignacion,
  MantenimientoType,
  MantenimientoPriority,
  MantenimientoPaidBy,
} from '@/lib/types/inmobiliaria';
import { formatCurrency, MANTENIMIENTO_TYPES } from '@/lib/types/inmobiliaria';

// ============================================================================
// Types
// ============================================================================

export interface MantenimientoFormData {
  consignacionId: string;
  type: MantenimientoType;
  priority: MantenimientoPriority;
  title: string;
  description: string;
  /**
   * 🔴 02-10-2026: los ARCHIVOS, no una URL. Antes viajaba la vista previa del
   * navegador (`blob:`) en `photoUrls` y nadie más la podía abrir. Quien crea
   * la solicitud sube estas fotos después, una por una
   * (`mantenimientoApi.subirFoto`).
   */
  fotos?: File[];
  paidBy: MantenimientoPaidBy;
  /** Portofino 22-10: el proveedor con el que se va a trabajar. Opcional. */
  proveedorId?: string;
}

/**
 * Los campos del formulario, con el nombre que les da `CreateMantenimientoDto`.
 * Las fotos se llaman `photoUrls` en el back: ahí van sus errores.
 */
export type CampoDelMantenimiento =
  | 'consignacionId'
  | 'type'
  | 'priority'
  | 'title'
  | 'description'
  | 'photoUrls'
  | 'paidBy'
  | 'proveedorId';

/** En el orden en que se ven: el foco va al primero con error. */
export const CAMPOS_DEL_MANTENIMIENTO: readonly CampoDelMantenimiento[] = [
  'consignacionId',
  'type',
  'priority',
  'title',
  'description',
  'photoUrls',
  'paidBy',
  'proveedorId',
];

interface MantenimientoFormProps {
  consignaciones: Consignacion[];
  preselectedConsignacionId?: string;
  onSubmit: (data: MantenimientoFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  /**
   * Lo que rechazó el back, por campo (02-10-2026). Se pinta bajo su campo,
   * el primero recibe el foco, y cada uno se borra al corregirlo.
   */
  erroresDelServidor?: Partial<Record<CampoDelMantenimiento, string>>;
}

// ============================================================================
// Constants
// ============================================================================

const TYPE_ICONS: Record<MantenimientoType, React.ElementType> = {
  plumbing: Wrench,
  electrical: Lightning,
  appliance: Snowflake,
  structural: HouseLine,
  painting: PaintBrush,
  locks: Key,
  other: DotsThreeCircle,
};

const PRIORITY_OPTIONS: { value: MantenimientoPriority; labelKey: string; descKey: string; color: string }[] = [
  {
    value: 'low',
    labelKey: 'inmobiliaria.mantenimiento.priorityLow',
    descKey: 'inmobiliaria.mantenimiento.priorityLowDesc',
    color: '',
  },
  {
    value: 'medium',
    labelKey: 'inmobiliaria.mantenimiento.priorityMedium',
    descKey: 'inmobiliaria.mantenimiento.priorityMediumDesc',
    color: '',
  },
  {
    value: 'high',
    labelKey: 'inmobiliaria.mantenimiento.priorityHigh',
    descKey: 'inmobiliaria.mantenimiento.priorityHighDesc',
    color: '',
  },
  {
    value: 'emergency',
    labelKey: 'inmobiliaria.mantenimiento.priorityEmergency',
    descKey: 'inmobiliaria.mantenimiento.priorityEmergencyDesc',
    color: '',
  },
];

const PAID_BY_OPTIONS: { value: MantenimientoPaidBy; labelKey: string; descKey: string }[] = [
  { value: 'owner', labelKey: 'inmobiliaria.mantenimiento.paidByOwner', descKey: 'inmobiliaria.mantenimiento.paidByOwnerDesc' },
  { value: 'tenant', labelKey: 'inmobiliaria.mantenimiento.paidByTenant', descKey: 'inmobiliaria.mantenimiento.paidByTenantDesc' },
  { value: 'split', labelKey: 'inmobiliaria.mantenimiento.paidBySplit', descKey: 'inmobiliaria.mantenimiento.paidBySplitDesc' },
  { value: 'agency', labelKey: 'inmobiliaria.mantenimiento.paidByAgency', descKey: 'inmobiliaria.mantenimiento.paidByAgencyDesc' },
];

// ============================================================================
// Property Selector Component
// ============================================================================

interface PropertySelectorProps {
  consignaciones: Consignacion[];
  selectedId: string;
  onSelect: (id: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/** Portofino 29-10: si el inmueble no está, se crea primero en el portafolio y se vuelve acá. */
const CREAR_EL_INMUEBLE = conRegreso('/panel/inmobiliaria/inmuebles/nuevo', '/panel/inmobiliaria/mantenimientos');

/** «Crear el inmueble»: la salida cuando el inmueble todavía no está en Leasefy. */
function CrearElInmueble({ tr }: { tr: Tr }) {
  return (
    <Button asChild variant="outline" size="sm" hideArrow className="shrink-0" data-testid="mantenimiento-crear-inmueble">
      <Link href={CREAR_EL_INMUEBLE}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        {tr('Crear el inmueble')}
      </Link>
    </Button>
  );
}

function PropertySelector({ consignaciones, selectedId, onSelect, t }: PropertySelectorProps) {
  const tr = useTr();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  /** Envuelve AL BUSCADOR Y A LA LISTA: un clic acá adentro no cierra nada. */
  const contenedorRef = useRef<HTMLDivElement>(null);
  /*
    Portofino 29-10: también por el número del contrato. Los contratos se leen
    UNA vez, al abrir el buscador, y sólo si la persona puede verlos (si no, el
    back respondería 403): sin ellos se busca igual por todo lo demás.
  */
  const permisos = usePermissionsContextSafe();
  const puedeVerContratos = permisos ? permisos.canAccess('contratos', 'view') : true;
  const [contratos, setContratos] = useState<ContratoParaBuscar[]>([]);
  const contratosPedidos = useRef(false);

  useEffect(() => {
    if (!isOpen || contratosPedidos.current || !puedeVerContratos) return;
    contratosPedidos.current = true;
    let vivo = true;
    void contratosParaBuscar().then((lista) => {
      if (vivo) setContratos(lista);
    });
    return () => {
      vivo = false;
    };
  }, [isOpen, puedeVerContratos]);

  /*
    🔴 Antes el cierre lo hacía un `<div className="fixed inset-0">` invisible
    montado ENCIMA del propio buscador: el segundo clic sobre el input no
    llegaba al input, lo comía el manto y la lista se cerraba. O sea, hacer
    clic dos veces para seguir escribiendo cerraba el desplegable.

    El patrón del resto del producto es escuchar el clic de afuera en
    `document` (ver `usePanelFlotante` en components/messages y
    `PaymentAccountsSection`): sin manto, el input sigue siendo clicable.
    Se escucha `mousedown` y no `click` porque con `click` el mismo evento que
    reabre el buscador dispararía primero el cierre. Escape también cierra.
  */
  useEffect(() => {
    if (!isOpen) return;

    const alClicAfuera = (evento: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
        setIsOpen(false);
      }
    };
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', alClicAfuera);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('mousedown', alClicAfuera);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [isOpen]);

  // Las mismas reglas del buscador del panel (Ctrl K): código, contrato,
  // propietario, inquilino, dirección, celular, sin tildes.
  const encontrados = useMemo(
    () => buscarElInmueble(consignaciones, searchQuery, contratos),
    [consignaciones, searchQuery, contratos],
  );

  const selectedConsignacion = consignaciones.find((c) => c.id === selectedId);

  // Sin inmuebles no hay nada que buscar: el buscador abría un desplegable con
  // «No se encontraron propiedades» encima de la sección siguiente (Nico,
  // 2026-09-03). Se dice de frente, sin desplegable y con la salida de crearlo.
  if (consignaciones.length === 0) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
          {t('inmobiliaria.mantenimiento.property')} <span className="text-danger">*</span>
        </label>
        <div
          className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          data-testid="mantenimiento-sin-inmuebles"
        >
          <p className="text-sm text-fg-muted">{t('inmobiliaria.mantenimiento.noRentedProperties')}</p>
          <CrearElInmueble tr={tr} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor="mantenimiento-buscar-inmueble" className="block text-sm font-medium text-fg dark:text-fg-subtle">
        {t('inmobiliaria.mantenimiento.property')} <span className="text-danger">*</span>
      </label>

      {selectedConsignacion ? (
        <div className="p-4 rounded-lg border border-primary/30 bg-primary-soft" data-testid="mantenimiento-inmueble-elegido">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              {selectedConsignacion.propertyThumbnail ? (
                <img
                  src={selectedConsignacion.propertyThumbnail}
                  alt={selectedConsignacion.propertyTitle}
                  className="w-16 h-12 rounded-md object-cover shrink-0"
                />
              ) : (
                <div className="w-16 h-12 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center shrink-0">
                  <HouseLine className="w-6 h-6 text-fg-subtle" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium text-fg">
                  {selectedConsignacion.propertyTitle}
                </p>
                <p className="text-sm text-fg-muted dark:text-fg-subtle">
                  {selectedConsignacion.propertyAddress}
                </p>
                <DatosDelInmueble consignacion={selectedConsignacion} tr={tr} />
              </div>
            </div>
            <Button
              type="button"
              variant="link"
              size="sm"
              hideArrow
              onClick={() => {
                onSelect('');
                setIsOpen(true);
              }}
              className="h-auto p-0 text-sm"
            >
              {t('inmobiliaria.mantenimiento.change')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative" ref={contenedorRef}>
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle z-10" />
            <Input
              id="mantenimiento-buscar-inmueble"
              type="text"
              data-testid="mantenimiento-buscar-inmueble"
              placeholder={tr('Código, contrato, propietario o dirección')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              autoComplete="off"
              className="w-full pl-10"
            />
          </div>
          <p className="mt-1.5 text-caption text-fg-muted">
            {tr('Búscalo por el código del inmueble, el número del contrato, el propietario, el inquilino o la dirección.')}
          </p>

          {/* Los resultados bajan apenas desde el buscador y se van rápido. */}
          <Presence
            show={isOpen}
            direction="down"
            distance="xs"
            className="absolute z-10 w-full mt-2 max-h-72 overflow-y-auto rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg shadow-flotante"
          >
                {encontrados.length > 0 ? (
                  encontrados.map(({ consignacion, contrato }) => (
                    // allowlist: search-result list-row (property thumbnail + 2-line text as ONE
                    // click target) — rich list-row; Button can't host the fill-image row (list-row precedent).
                    <button
                      key={consignacion.id}
                      type="button"
                      onClick={() => {
                        onSelect(consignacion.id);
                        setSearchQuery('');
                        setIsOpen(false);
                      }}
                      className="w-full p-3 flex items-start gap-3 hover:bg-surface-muted dark:hover:bg-ink transition-colors border-b border-border-faint dark:border-border-strong last:border-b-0 text-left"
                    >
                      {consignacion.propertyThumbnail ? (
                        <img
                          src={consignacion.propertyThumbnail}
                          alt={consignacion.propertyTitle}
                          className="w-12 h-9 rounded-md object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-9 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center shrink-0">
                          <HouseLine className="w-5 h-5 text-fg-subtle" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-fg truncate">
                          {consignacion.propertyTitle}
                        </p>
                        <p className="text-sm text-fg-muted dark:text-fg-subtle truncate">
                          {consignacion.propertyAddress}
                        </p>
                        <DatosDelInmueble consignacion={consignacion} contrato={contrato} tr={tr} />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="space-y-3 p-4" data-testid="mantenimiento-inmueble-no-encontrado">
                    <div className="space-y-1">
                      <p className="text-sm text-fg">{tr('No encontramos ese inmueble.')}</p>
                      <p className="text-caption text-fg-muted">
                        {tr('La solicitud se hace sobre un inmueble que ya está en Leasefy. Prueba con su código, el número del contrato o el nombre del propietario; si todavía no está, créalo primero.')}
                      </p>
                    </div>
                    <CrearElInmueble tr={tr} />
                  </div>
                )}
          </Presence>
        </div>
      )}
    </div>
  );
}

/**
 * La línea que deja reconocer el inmueble sin abrirlo: su código, el contrato
 * que coincidió con lo buscado, el propietario y quién vive ahí.
 */
function DatosDelInmueble({ consignacion, contrato = null, tr }: { consignacion: Consignacion; contrato?: string | null; tr: Tr }) {
  const propietario = propietariosDelInmueble(consignacion)[0]?.nombre ?? null;
  const inquilino = consignacion.inquilino?.nombre ?? consignacion.currentTenantName ?? null;
  const partes = [
    consignacion.propertyCode != null ? <span key="codigo" className="font-mono">#{consignacion.propertyCode}</span> : null,
    contrato ? (
      <span key="contrato" className="font-mono text-fg" data-testid="mantenimiento-inmueble-contrato">
        {tr('Contrato {n}', { n: contrato })}
      </span>
    ) : null,
    propietario ? (
      <span key="propietario" className="inline-flex min-w-0 items-center gap-1">
        <UserCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{tr('Propietario: {nombre}', { nombre: propietario })}</span>
      </span>
    ) : null,
    inquilino ? (
      <span key="inquilino" className="inline-flex min-w-0 items-center gap-1">
        <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{tr('Inquilino: {nombre}', { nombre: inquilino })}</span>
      </span>
    ) : null,
  ].filter(Boolean);
  if (partes.length === 0) return null;
  return <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-fg-muted">{partes}</p>;
}

// ============================================================================
// Type Selector Component (Radio Cards)
// ============================================================================

interface TypeSelectorProps {
  selected: MantenimientoType | '';
  onSelect: (type: MantenimientoType) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function TypeSelector({ selected, onSelect, t }: TypeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
        {t('inmobiliaria.mantenimiento.maintenanceType')} <span className="text-danger">*</span>
      </label>
      <RadioCardGroup
        className="grid grid-cols-2 gap-3"
        /* Siempre una cadena: con `undefined` el grupo arranca sin control y
           al elegir pasa a controlado, y Radix lo avisa en consola. */
        value={selected}
        onValueChange={(v) => onSelect(v as MantenimientoType)}
      >
        {MANTENIMIENTO_TYPES.map((type) => (
          <RadioCard
            key={type.type}
            value={type.type}
            label={
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="text-base leading-none">{type.icon}</span>
                {type.labelEs}
              </span>
            }
          />
        ))}
      </RadioCardGroup>
    </div>
  );
}

// ============================================================================
// Priority Selector Component
// ============================================================================

interface PrioritySelectorProps {
  selected: MantenimientoPriority | '';
  onSelect: (priority: MantenimientoPriority) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function PrioritySelector({ selected, onSelect, t }: PrioritySelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
        {t('inmobiliaria.mantenimiento.priorityLabel')} <span className="text-danger">*</span>
      </label>
      {/* Dos columnas: en cuatro, la descripción de cada prioridad se partía
          palabra por palabra (Nico, 2026-09-03). */}
      <RadioCardGroup
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        /* Siempre una cadena: con `undefined` el grupo arranca sin control y
           al elegir pasa a controlado, y Radix lo avisa en consola. */
        value={selected}
        onValueChange={(v) => onSelect(v as MantenimientoPriority)}
      >
        {PRIORITY_OPTIONS.map((priority) => (
          <RadioCard
            key={priority.value}
            value={priority.value}
            className={priority.color}
            label={
              <span
                className={cn(
                  'font-medium',
                  priority.value === 'emergency' && 'text-danger',
                  priority.value === 'high' && 'text-warning',
                  priority.value === 'medium' && 'text-primary',
                  priority.value === 'low' && 'text-fg-muted dark:text-fg-muted'
                )}
              >
                {t(priority.labelKey)}
              </span>
            }
            description={t(priority.descKey)}
            badge={priority.value === 'emergency' ? <Warning className="w-5 h-5 text-danger" weight="fill" /> : undefined}
          />
        ))}
      </RadioCardGroup>
    </div>
  );
}

// ============================================================================
// Paid By Selector Component
// ============================================================================

interface PaidBySelectorProps {
  selected: MantenimientoPaidBy;
  onSelect: (paidBy: MantenimientoPaidBy) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function PaidBySelector({ selected, onSelect, t }: PaidBySelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
        {t('inmobiliaria.mantenimiento.paymentResponsible')} <span className="text-danger">*</span>
      </label>

      {/* Dos columnas: en cuatro, cada tarjeta quedaba de una palabra por
          línea (Nico, 2026-09-08: «se ve super estrecho»). El aviso de
          «se determinará según el contrato» se fue: contradecía al campo. */}
      <RadioCardGroup
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        value={selected}
        onValueChange={(v) => onSelect(v as MantenimientoPaidBy)}
      >
        {PAID_BY_OPTIONS.map((option) => (
          <RadioCard
            key={option.value}
            value={option.value}
            label={
              <span className="flex items-center gap-2 font-medium">
                <Wallet className="w-4 h-4" />
                {t(option.labelKey)}
              </span>
            }
            description={t(option.descKey)}
          />
        ))}
      </RadioCardGroup>
    </div>
  );
}

// ============================================================================
// Main MantenimientoForm Component
// ============================================================================

export function MantenimientoForm({
  consignaciones,
  preselectedConsignacionId,
  onSubmit,
  onCancel,
  isSubmitting = false,
  erroresDelServidor,
}: MantenimientoFormProps) {
  const { t } = useI18n();
  const raiz = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<{
    consignacionId: string;
    type: MantenimientoType | '';
    priority: MantenimientoPriority | '';
    title: string;
    description: string;
    fotos: File[];
    paidBy: MantenimientoPaidBy;
    proveedorId: string | undefined;
  }>({
    consignacionId: preselectedConsignacionId || '',
    type: '',
    priority: '',
    title: '',
    description: '',
    fotos: [],
    paidBy: 'owner',
    proveedorId: undefined,
  });
  // El aviso de prioridad alta se cierra con su altura: mientras se va, sigue
  // diciendo lo que decía (no salta al texto de la otra prioridad).
  const prioridadAlta = useUltimoPresente(
    formData.priority === 'high' || formData.priority === 'emergency' ? formData.priority : null,
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Lo que mandó el servidor entra a los errores de cada campo y lleva el foco
  // al primero. Un objeto nuevo por cada rechazo: el efecto corre una vez.
  useEffect(() => {
    if (!erroresDelServidor) return;
    const conError = CAMPOS_DEL_MANTENIMIENTO.filter((c) => erroresDelServidor[c]);
    if (conError.length === 0) return;
    setErrors((prev) => ({ ...prev, ...erroresDelServidor }) as Record<string, string>);
    setTouched((prev) => ({ ...prev, ...Object.fromEntries(conError.map((c) => [c, true])) }));
    raiz.current
      ?.querySelector<HTMLElement>(`[data-campo="${conError[0]}"] :is(input, textarea, button)`)
      ?.focus();
  }, [erroresDelServidor]);

  const updateField = <K extends keyof typeof formData>(key: K, value: typeof formData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const limpiarErrorDeLasFotos = () => {
    setErrors((prev) => {
      if (!prev.photoUrls) return prev;
      const sin = { ...prev };
      delete sin.photoUrls;
      return sin;
    });
  };

  /**
   * Las fotos elegidas se revisan ANTES de mandar nada, con las reglas del
   * back (tipo, peso y el tope de 30 por solicitud): la que no sirve no entra y el
   * motivo sale bajo las fotos. Las que sí sirven entran igual.
   */
  const agregarFotos = (elegidas: File[]) => {
    const { entran, problemas } = fotosQueEntran(formData.fotos.length, elegidas, formData.fotos.filter(esArchivoDeVideo).length);
    if (entran.length > 0) {
      setFormData((prev) => ({ ...prev, fotos: [...prev.fotos, ...entran] }));
    }
    if (problemas.length > 0) {
      setErrors((prev) => ({ ...prev, photoUrls: problemas.join(' · ') }));
    } else {
      limpiarErrorDeLasFotos();
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.consignacionId) {
      newErrors.consignacionId = t('inmobiliaria.mantenimiento.errSelectProperty');
    }
    if (!formData.type) {
      newErrors.type = t('inmobiliaria.mantenimiento.errSelectType');
    }
    if (!formData.priority) {
      newErrors.priority = t('inmobiliaria.mantenimiento.errSelectPriority');
    }
    if (!formData.title.trim()) {
      newErrors.title = t('inmobiliaria.mantenimiento.errTitleRequired');
    } else if (formData.title.length < 5) {
      newErrors.title = t('inmobiliaria.mantenimiento.errTitleMinLength');
    } else if (formData.title.length > MAX_LARGO_TITULO_DEL_MANTENIMIENTO) {
      // La misma frase del back (`limites-del-mantenimiento.ts`).
      newErrors.title = MENSAJES_DEL_MANTENIMIENTO.tituloLargo;
    }
    if (!formData.description.trim()) {
      newErrors.description = t('inmobiliaria.mantenimiento.errDescRequired');
    } else if (formData.description.length < 20) {
      newErrors.description = t('inmobiliaria.mantenimiento.errDescMinLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      // Mark all fields as touched
      const allTouched: Record<string, boolean> = {};
      Object.keys(formData).forEach((key) => {
        allTouched[key] = true;
      });
      setTouched(allTouched);
      return;
    }

    onSubmit({
      consignacionId: formData.consignacionId,
      type: formData.type as MantenimientoType,
      priority: formData.priority as MantenimientoPriority,
      title: formData.title,
      description: formData.description,
      fotos: formData.fotos.length > 0 ? formData.fotos : undefined,
      paidBy: formData.paidBy,
      ...(formData.proveedorId ? { proveedorId: formData.proveedorId } : {}),
    });
  };

  // Lo que falta se dice en el pie mientras se llena, y el botón espera:
  // antes se podía dar «Crear» con todo vacío y el error salía después.
  const faltantes: string[] = [];
  if (!formData.consignacionId) faltantes.push('el inmueble');
  if (!formData.type) faltantes.push('el tipo');
  if (!formData.priority) faltantes.push('la prioridad');
  if (formData.title.trim().length < 5) faltantes.push('un título de al menos 5 letras');
  if (formData.description.trim().length < 20) faltantes.push('una descripción de al menos 20 letras');
  const loQueFalta =
    faltantes.length === 0
      ? null
      : faltantes.length === 1
        ? `Te falta ${faltantes[0]}.`
        : `Te falta ${faltantes.slice(0, -1).join(', ')} y ${faltantes[faltantes.length - 1]}.`;

  return (
    <form onSubmit={handleSubmit} className="contents">
      <CajonCuerpo>
      <div className="space-y-8" ref={raiz}>
      {/* Section 1: Property Selection */}
      <div className="space-y-4" data-campo="consignacionId">
        <h3 className="flex items-center gap-2 text-sm font-medium text-fg">
          <HouseLine className="h-4 w-4 text-fg-muted" />
          {t('inmobiliaria.mantenimiento.property')}
        </h3>
        <PropertySelector
          consignaciones={consignaciones}
          selectedId={formData.consignacionId}
          onSelect={(id) => updateField('consignacionId', id)}
          t={t}
        />
        <ErrorDelCampo
          id="mantenimiento-consignacionId-error"
          mensaje={touched.consignacionId ? errors.consignacionId : undefined}
        />
      </div>

      {/* Section 2: Request Details */}
      <div className="space-y-6 pt-6 border-t border-border-faint dark:border-border-strong">
        <h3 className="flex items-center gap-2 text-sm font-medium text-fg">
          <Wrench className="h-4 w-4 text-fg-muted" />
          {t('inmobiliaria.mantenimiento.requestDetail')}
        </h3>

        {/* Type */}
        <div data-campo="type">
          <TypeSelector
            selected={formData.type}
            onSelect={(type) => updateField('type', type)}
            t={t}
          />
          <ErrorDelCampo id="mantenimiento-type-error" mensaje={touched.type ? errors.type : undefined} />
        </div>

        {/* Priority */}
        <div data-campo="priority">
          <PrioritySelector
            selected={formData.priority}
            onSelect={(priority) => updateField('priority', priority)}
            t={t}
          />
          <ErrorDelCampo
            id="mantenimiento-priority-error"
            mensaje={touched.priority ? errors.priority : undefined}
          />
        </div>

        {/* Emergency explanation */}
        {/* Se abre con su altura (y ahora también se CIERRA así: antes
            desaparecía de golpe al bajar la prioridad). */}
        <Collapse
          open={formData.priority === 'high' || formData.priority === 'emergency'}
          className="p-4 rounded-lg bg-warning-soft border border-warning/30"
        >
            <div className="flex gap-3">
              <Warning className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-warning">
                {prioridadAlta === 'emergency'
                  ? t('inmobiliaria.mantenimiento.emergencyWarning')
                  : t('inmobiliaria.mantenimiento.highPriorityWarning')}
              </p>
            </div>
        </Collapse>

        {/* Title */}
        <div className="space-y-2" data-campo="title">
          <label htmlFor="mantenimiento-title" className="block text-sm font-medium text-fg dark:text-fg-subtle">
            {t('inmobiliaria.mantenimiento.requestTitle')} <span className="text-danger">*</span>
          </label>
          <Input
            id="mantenimiento-title"
            aria-required="true"
            type="text"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
            placeholder={t('inmobiliaria.mantenimiento.titlePlaceholder')}
            maxLength={MAX_LARGO_TITULO_DEL_MANTENIMIENTO}
            aria-invalid={touched.title && errors.title ? true : undefined}
            aria-describedby={touched.title && errors.title ? 'mantenimiento-title-error' : undefined}
            className={cn('w-full', touched.title && errors.title && 'border-danger/30')}
          />
          <ErrorDelCampo
            id="mantenimiento-title-error"
            mensaje={touched.title ? errors.title : undefined}
            className="mt-0"
          />
        </div>

        {/* Description */}
        <div className="space-y-2" data-campo="description">
          <label htmlFor="mantenimiento-description" className="block text-sm font-medium text-fg dark:text-fg-subtle">
            {t('inmobiliaria.mantenimiento.problemDescription')} <span className="text-danger">*</span>
          </label>
          <Textarea
            id="mantenimiento-description"
            aria-required="true"
            aria-invalid={touched.description && errors.description ? true : undefined}
            aria-describedby={
              touched.description && errors.description ? 'mantenimiento-description-error' : undefined
            }
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, description: true }))}
            rows={4}
            placeholder={t('inmobiliaria.mantenimiento.descriptionPlaceholder')}
            className={cn('w-full resize-none', touched.description && errors.description && 'border-danger/30')}
          />
          <ErrorDelCampo
            id="mantenimiento-description-error"
            mensaje={touched.description ? errors.description : undefined}
            className="mt-0"
          />
        </div>

        {/* Photo Upload */}
        <div data-campo="photoUrls">
        <SelectorDeFotosDelMantenimiento
          id="mantenimiento-fotos"
          etiqueta={t('inmobiliaria.mantenimiento.photosOptional')}
          pista={t('inmobiliaria.mantenimiento.photosHint')}
          textoAgregar={t('inmobiliaria.mantenimiento.addPhoto')}
          idDelError="mantenimiento-photoUrls-error"
          fotos={formData.fotos}
          onAgregar={agregarFotos}
          onQuitar={(index) => {
            updateField(
              'fotos',
              formData.fotos.filter((_, i) => i !== index)
            );
            limpiarErrorDeLasFotos();
          }}
          conError={Boolean(errors.photoUrls)}
        />
        <ErrorDelCampo id="mantenimiento-photoUrls-error" mensaje={errors.photoUrls} />
        </div>
      </div>

      {/* Section 3: Responsibility */}
      <div className="space-y-6 pt-6 border-t border-border-faint dark:border-border-strong">
        <h3 className="flex items-center gap-2 text-sm font-medium text-fg">
          <Wallet className="h-4 w-4 text-fg-muted" />
          {t('inmobiliaria.mantenimiento.responsibility')}
        </h3>

        <div data-campo="paidBy">
          <PaidBySelector
            selected={formData.paidBy}
            onSelect={(paidBy) => updateField('paidBy', paidBy)}
            t={t}
          />
          <ErrorDelCampo id="mantenimiento-paidBy-error" mensaje={errors.paidBy} />
        </div>
      </div>

      {/* Section 4: Proveedor (opcional). Portofino 22-10: «al hacer la
          solicitud, elegir con qué proveedor vamos a trabajar». */}
      <div className="space-y-4 pt-6 border-t border-border-faint dark:border-border-strong" data-campo="proveedorId">
        <h3 className="flex items-center gap-2 text-sm font-medium text-fg">
          <Truck className="h-4 w-4 text-fg-muted" />
          Proveedor <span className="font-normal text-fg-muted">(opcional)</span>
        </h3>
        <ProveedorDeLaSolicitud
          tipo={formData.type}
          valor={formData.proveedorId}
          onCambiar={(id) => updateField('proveedorId', id)}
          error={errors.proveedorId}
        />
      </div>

      </div>
      </CajonCuerpo>

      <CajonPie ayuda={loQueFalta ? <span data-testid="mantenimiento-falta">{loQueFalta}</span> : null}>
        <Button
          type="button"
          variant="outline"
          hideArrow
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {t('inmobiliaria.mantenimiento.cancel')}
        </Button>
        <Button
          type="submit"
          hideArrow
          disabled={isSubmitting || faltantes.length > 0}
          isLoading={isSubmitting}
          data-testid="mantenimiento-crear"
        >
          <Check className="w-5 h-5" />
          {isSubmitting ? t('inmobiliaria.mantenimiento.creating') : t('inmobiliaria.mantenimiento.createRequest')}
        </Button>
      </CajonPie>
    </form>
  );
}

export default MantenimientoForm;
