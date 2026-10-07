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
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button, Input, Textarea } from '@/components/ui';
import { Collapse, Presence, RadioCardGroup, RadioCard } from '@leasefy/cadence';
import { CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente';
import {
  MAX_LARGO_TITULO_DEL_MANTENIMIENTO,
  MENSAJES_DEL_MANTENIMIENTO,
  fotosQueEntran,
} from '@/lib/mantenimiento/limites-del-mantenimiento';
import { SelectorDeFotosDelMantenimiento } from '@/components/inmobiliaria/mantenimiento/SelectorDeFotosDelMantenimiento';
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
  | 'paidBy';

/** En el orden en que se ven: el foco va al primero con error. */
export const CAMPOS_DEL_MANTENIMIENTO: readonly CampoDelMantenimiento[] = [
  'consignacionId',
  'type',
  'priority',
  'title',
  'description',
  'photoUrls',
  'paidBy',
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

function PropertySelector({ consignaciones, selectedId, onSelect, t }: PropertySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  /** Envuelve AL BUSCADOR Y A LA LISTA: un clic acá adentro no cierra nada. */
  const contenedorRef = useRef<HTMLDivElement>(null);

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

  const filteredConsignaciones = useMemo(() => {
    if (!searchQuery.trim()) return consignaciones;
    const query = searchQuery.toLowerCase();
    return consignaciones.filter(
      (c) =>
        c.propertyTitle.toLowerCase().includes(query) ||
        c.propertyAddress.toLowerCase().includes(query) ||
        c.propertyZone?.toLowerCase().includes(query)
    );
  }, [consignaciones, searchQuery]);

  const selectedConsignacion = consignaciones.find((c) => c.id === selectedId);

  // Sin inmuebles arrendados no hay nada que buscar: el buscador abría un
  // desplegable con «No se encontraron propiedades» encima de la sección
  // siguiente (Nico, 2026-09-03). Se dice de frente y sin desplegable.
  if (consignaciones.length === 0) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
          {t('inmobiliaria.mantenimiento.property')} <span className="text-danger">*</span>
        </label>
        <p
          className="rounded-lg border border-dashed border-border bg-surface-muted px-4 py-3 text-sm text-fg-muted"
          data-testid="mantenimiento-sin-inmuebles"
        >
          {t('inmobiliaria.mantenimiento.noRentedProperties')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
        {t('inmobiliaria.mantenimiento.property')} <span className="text-danger">*</span>
      </label>

      {selectedConsignacion ? (
        <div className="p-4 rounded-lg border border-primary/30 bg-primary-soft">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {selectedConsignacion.propertyThumbnail ? (
                <img
                  src={selectedConsignacion.propertyThumbnail}
                  alt={selectedConsignacion.propertyTitle}
                  className="w-16 h-12 rounded-md object-cover"
                />
              ) : (
                <div className="w-16 h-12 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center">
                  <HouseLine className="w-6 h-6 text-fg-subtle" />
                </div>
              )}
              <div>
                <p className="font-medium text-fg">
                  {selectedConsignacion.propertyTitle}
                </p>
                <p className="text-sm text-fg-muted dark:text-fg-subtle">
                  {selectedConsignacion.propertyAddress}
                </p>
                {selectedConsignacion.currentTenantName && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-fg-muted dark:text-fg-subtle">
                    <User className="w-3 h-3" />
                    <span>{selectedConsignacion.currentTenantName}</span>
                  </div>
                )}
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
              type="text"
              placeholder={t('inmobiliaria.mantenimiento.searchProperty')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              className="w-full pl-10"
            />
          </div>

          {/* Los resultados bajan apenas desde el buscador y se van rápido. */}
          <Presence
            show={isOpen}
            direction="down"
            distance="xs"
            className="absolute z-10 w-full mt-2 max-h-64 overflow-y-auto rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg"
          >
                {filteredConsignaciones.length > 0 ? (
                  filteredConsignaciones.map((consignacion) => (
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
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-fg-muted dark:text-fg-subtle">
                    {t('inmobiliaria.mantenimiento.noPropertiesFound')}
                  </div>
                )}
          </Presence>
        </div>
      )}
    </div>
  );
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
                  'font-semibold',
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
  }>({
    consignacionId: preselectedConsignacionId || '',
    type: '',
    priority: '',
    title: '',
    description: '',
    fotos: [],
    paidBy: 'owner',
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
    const { entran, problemas } = fotosQueEntran(formData.fotos.length, elegidas);
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
        <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
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
        <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
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
        <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
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
