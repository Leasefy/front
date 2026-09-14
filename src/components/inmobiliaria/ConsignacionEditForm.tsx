'use client';

/**
 * ConsignacionEditForm — el cajón «Editar» de la ficha del inmueble.
 *
 * ── Qué es ─────────────────────────────────────────────────────────────────
 * UN solo «Editar» que edita el INMUEBLE (`Property`, `PATCH /properties/:id`)
 * y el MANDATO (`Consignacion`, `PUT /inmobiliaria/consignaciones/:id`), en
 * secciones: Inmueble · Precio · Mandato · Publicación · Fotos y documentos.
 *
 * ── Por qué existe así (Nico, 2026-09-13, con la captura del botón) ────────
 * «Cuando uno le dé editar al inmueble, revisa que sí tenga toooodo lo que se
 * pueda editar.» Hasta hoy este formulario editaba SÓLO el mandato: título,
 * dirección, ciudad, barrio y tipo se cambiaban en las columnas copiadas del
 * mandato y el aviso (`Property`) quedaba viejo; descripción, habitaciones,
 * baños, área, piso, parqueaderos, estrato, año, amenidades (mascotas,
 * amoblado), depósito, fecha de consignación, código de la inmobiliaria,
 * ubicación con coordenadas y publicación no se podían editar en NINGUNA
 * pantalla; las fechas del mandato eran inputs muertos y la comisión de venta
 * se perdía al guardar.
 *
 * ── Reglas ─────────────────────────────────────────────────────────────────
 *  - Sólo se manda lo que cambió: cada guardado es un diff contra lo que llegó.
 *  - Lo que el mandato COPIA del inmueble (título, dirección, ciudad, barrio,
 *    tipo, canon, administración) se manda UNA vez, al inmueble; el back
 *    arrastra la copia (`PropertiesService.sincronizarCopiaDelMandato`). Sin
 *    inmueble vinculado (cartera migrada) esos campos van al mandato.
 *  - Un 409 del back (tipo de operación con mandato, código en uso, mandato
 *    terminado) se dice en palabras adentro del cajón, no en un toast genérico.
 *  - Con el mandato TERMINADO sólo se edita el inmueble: sus términos son
 *    historia y el back los rechaza con 409.
 *  - Es un cajón (Sheet) y no un modal: cinco secciones y un mapa no caben en
 *    los 640 px de alto de un diálogo (DESIGN.md §17: «long sectioned
 *    content» → drawer).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bed,
  Briefcase,
  Buildings,
  CalendarBlank,
  Car,
  CurrencyDollar,
  FileText,
  Globe,
  House,
  Images,
  Info,
  MapPin,
  Mountains,
  Percent,
  Storefront,
  Timer,
  User,
  Warehouse,
  WarningCircle,
} from '@phosphor-icons/react';
import { RadioCard, RadioCardGroup } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/components/ui/toast';
import {
  Button,
  Checkbox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@/components/ui';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { LocationPicker, type LatLng } from '@/components/map/LocationPicker';
import { tieneCoordenadas } from '@/components/map/coordenadas';
import { ApiError } from '@/lib/api/client';
import { propertiesApi } from '@/lib/api/properties.service';
import { consignacionesApi, type ConsignacionUpdateInput } from '@/lib/api/inmobiliaria.service';
import { useAgentes } from '@/lib/hooks/useInmobiliaria';
import { AMENITIES_OPTIONS } from '@/lib/types/publish';
import { COLOMBIAN_DEPARTMENTS, type Consignacion } from '@/lib/types/inmobiliaria';
import { COLOMBIAN_CITIES, type Property, type PropertyType } from '@/lib/types/property';

export interface ConsignacionEditFormProps {
  abierto: boolean;
  onCerrar: () => void;
  consignacion: Consignacion;
  /** El inmueble detrás del mandato; `null` mientras carga o si no se pudo traer. */
  property: Property | null;
  cargandoProperty?: boolean;
  /** Tras guardar: la consignación releída, con la copia del inmueble ya sincronizada. */
  onGuardado: (consignacion: Consignacion) => void;
}

/** Tipo físico del inmueble. Con inmueble vinculado hay 9 (el `room` que el mandato no conoce). */
const TIPOS_DE_INMUEBLE: { value: PropertyType; icon: React.ElementType }[] = [
  { value: 'apartment', icon: Buildings },
  { value: 'house', icon: House },
  { value: 'studio', icon: Buildings },
  { value: 'room', icon: Bed },
  { value: 'commercial', icon: Storefront },
  { value: 'office', icon: Briefcase },
  { value: 'warehouse', icon: Warehouse },
  { value: 'parking', icon: Car },
  { value: 'land', icon: Mountains },
];

const ESTRATOS = ['1', '2', '3', '4', '5', '6'] as const;
/** Radix `Select` no admite `value=""`: «sin estrato» viaja con este valor y se traduce a `''`. */
const SIN_ESTRATO = 'ninguno';

/** Lo que ven los inputs: texto, siempre. Vacío = «no se sabe» en los que pueden faltar. */
interface Valores {
  title: string;
  description: string;
  type: PropertyType;
  department: string;
  city: string;
  neighborhood: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  bedrooms: string;
  bathrooms: string;
  area: string;
  floor: string;
  parkingSpaces: string;
  stratum: string;
  yearBuilt: string;
  amenities: string[];
  externalId: string;
  monthlyRent: string;
  salePrice: string;
  adminFee: string;
  deposit: string;
  consignedAt: string;
  commissionPercent: string;
  saleCommissionPercent: string;
  contractDate: string;
  contractEndDate: string;
  minimumTerm: string;
  agenteId: string;
  publicado: boolean;
}

const texto = (v: number | string | null | undefined): string => (v == null ? '' : String(v));
const soloFecha = (iso: string | null | undefined): string => (iso ? iso.split('T')[0] : '');

/** El estado CRUDO del inmueble (`DRAFT|AVAILABLE|…`): decide si hay interruptor de publicación. */
function estadoCrudoDelInmueble(consignacion: Consignacion, property: Property | null) {
  if (consignacion.propertyStatus) return consignacion.propertyStatus;
  if (!property) return undefined;
  // El mapper del front funde DRAFT y PENDING en `pending`: ahí no se sabe cuál es.
  if (property.status === 'available') return 'AVAILABLE';
  if (property.status === 'rented') return 'RENTED';
  return undefined;
}

function valoresIniciales(consignacion: Consignacion, property: Property | null): Valores {
  const conCoordenadas = !!property && tieneCoordenadas(property.latitude, property.longitude);
  return {
    title: property?.title ?? consignacion.propertyTitle,
    description: property?.description ?? '',
    type: property?.type ?? consignacion.propertyType,
    department: property?.department ?? '',
    city: property?.city ?? consignacion.propertyCity,
    neighborhood: property ? (property.neighborhood ?? '') : (consignacion.propertyZone ?? ''),
    address: property?.address ?? consignacion.propertyAddress,
    latitude: conCoordenadas ? property!.latitude : null,
    longitude: conCoordenadas ? property!.longitude : null,
    bedrooms: texto(property?.bedrooms),
    bathrooms: texto(property?.bathrooms),
    area: texto(property?.area),
    floor: texto(property?.floor),
    parkingSpaces: texto(property?.parkingSpaces),
    stratum: texto(property?.stratum),
    yearBuilt: texto(property?.yearBuilt),
    amenities: property?.amenities.map((a) => a.id) ?? [],
    // `GET /properties/:id` es PUBLIC y no trae estos dos: vienen planos en el mandato.
    externalId: property?.externalId ?? consignacion.propertyExternalId ?? '',
    monthlyRent: property ? texto(property.monthlyRent) : texto(consignacion.monthlyRent),
    salePrice: texto(property?.salePrice),
    adminFee: property ? texto(property.adminFee ?? 0) : texto(consignacion.adminFee ?? 0),
    deposit: texto(property?.deposit ?? 0),
    consignedAt: property?.consignedAt ?? consignacion.propertyConsignedAt ?? '',
    commissionPercent: texto(consignacion.commissionPercent),
    saleCommissionPercent: texto(consignacion.saleCommissionPercent),
    contractDate: soloFecha(consignacion.contractDate),
    contractEndDate: soloFecha(consignacion.contractEndDate),
    minimumTerm: texto(consignacion.minimumTerm),
    agenteId: consignacion.agenteId ?? '',
    publicado: estadoCrudoDelInmueble(consignacion, property) === 'AVAILABLE',
  };
}

const mismaLista = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

/** `''` → null; cualquier otra cosa → número. Para los campos que pueden faltar. */
const numeroONull = (v: string): number | null => (v.trim() === '' ? null : Number(v));

function InputWrapper({
  label,
  required,
  helper,
  error,
  children,
  testId,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <div className="space-y-1.5" data-testid={testId}>
      <label className="text-sm font-medium text-fg dark:text-fg-subtle">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {helper && !error && <p className="text-xs text-fg-muted dark:text-fg-subtle">{helper}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

function Seccion({
  icon: Icon,
  titulo,
  children,
  testId,
}: {
  icon: React.ElementType;
  titulo: string;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <section className="space-y-4" data-testid={testId}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-primary-soft flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-semibold text-fg">{titulo}</h3>
      </div>
      {children}
    </section>
  );
}

/** Aviso dentro del cajón (DESIGN.md §4 Banners). */
function Aviso({
  tono,
  titulo,
  detalle,
  testId,
}: {
  tono: 'info' | 'warning' | 'danger';
  titulo: string;
  detalle?: string;
  testId?: string;
}) {
  const clases = {
    info: { caja: 'bg-info-soft', texto: 'text-info' },
    warning: { caja: 'bg-warning-soft', texto: 'text-warning' },
    danger: { caja: 'bg-danger-soft', texto: 'text-danger' },
  }[tono];
  const Icono = tono === 'info' ? Info : WarningCircle;
  return (
    <div
      role={tono === 'danger' ? 'alert' : 'status'}
      className={cn('rounded-md border border-border p-3 flex items-start gap-2', clases.caja)}
      data-testid={testId}
    >
      <Icono className={cn('w-5 h-5 flex-shrink-0 mt-0.5', clases.texto)} />
      <div className="min-w-0">
        <p className={cn('text-sm font-medium', clases.texto)}>{titulo}</p>
        {detalle && <p className="text-body-sm text-fg-muted mt-0.5">{detalle}</p>}
      </div>
    </div>
  );
}

/**
 * Las 15 amenidades del catálogo (las mismas que valida el back), como fichas.
 *
 * Cada una es un `<label>` con el `Checkbox` de la casa adentro, no un
 * `<button aria-pressed>`: elegir varias de una lista ES una casilla, y así el
 * lector de pantalla lo anuncia como grupo de casillas y la ficha entera es el
 * área clickeable. El chip es sólo el envoltorio.
 */
function SelectorDeAmenidades({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const alternar = (id: string) =>
    onChange(value.includes(id) ? value.filter((a) => a !== id) : [...value, id]);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" data-testid="editar-amenidades">
      {AMENITIES_OPTIONS.map((a) => {
        const activa = value.includes(a.value);
        return (
          <label
            key={a.value}
            data-testid={`amenidad-${a.value}`}
            data-activa={activa ? 'si' : 'no'}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm cursor-pointer transition-colors duration-150',
              disabled && 'opacity-50 cursor-not-allowed',
              activa
                ? 'border border-primary bg-primary-soft text-fg font-medium'
                : 'border border-border bg-surface text-fg-muted hover:border-border-strong',
            )}
          >
            <Checkbox
              checked={activa}
              disabled={disabled}
              onCheckedChange={() => alternar(a.value)}
              aria-label={a.label}
            />
            {a.label}
          </label>
        );
      })}
    </div>
  );
}

export function ConsignacionEditForm({
  abierto,
  onCerrar,
  consignacion,
  property,
  cargandoProperty,
  onGuardado,
}: ConsignacionEditFormProps) {
  const { t } = useI18n();
  const esVenta = consignacion.listingType === 'sale';
  const mandatoTerminado = consignacion.status === 'terminated';
  const tieneInmueble = !!consignacion.propertyId;
  const estadoCrudo = estadoCrudoDelInmueble(consignacion, property);
  const hayInterruptor = !!property && (estadoCrudo === 'DRAFT' || estadoCrudo === 'AVAILABLE');
  const inmuebleEditable = !!property;

  // `base` es lo que llegó; el diff se calcula contra esto. Tras un guardado
  // parcial (inmueble sí, mandato no) la base del inmueble avanza para que el
  // reintento no vuelva a mandar lo que ya quedó.
  const [base, setBase] = useState<Valores>(() => valoresIniciales(consignacion, property));
  const [valores, setValores] = useState<Valores>(base);
  const [sucio, setSucio] = useState(false);
  const [errores, setErrores] = useState<Partial<Record<keyof Valores, string>>>({});
  const [guardando, setGuardando] = useState(false);
  const [conflicto, setConflicto] = useState<{ titulo: string; detalle: string } | null>(null);

  // Cada apertura arranca de lo que hay. Si el inmueble llega DESPUÉS de abrir
  // (todavía cargaba) y nadie tocó nada, se vuelve a sembrar con él.
  useEffect(() => {
    if (!abierto) return;
    if (sucio) return;
    const frescos = valoresIniciales(consignacion, property);
    setBase(frescos);
    setValores(frescos);
    setErrores({});
    setConflicto(null);
    // `sucio` a propósito fuera: es justamente lo que decide si re-sembrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, consignacion, property]);

  useEffect(() => {
    if (!abierto) setSucio(false);
  }, [abierto]);

  const { agentes: todosLosAgentes } = useAgentes();
  const agentes = useMemo(
    () => todosLosAgentes.filter((a) => a.status === 'active' && !!a.userId),
    [todosLosAgentes],
  );

  const poner = useCallback(<K extends keyof Valores>(campo: K, valor: Valores[K]) => {
    setSucio(true);
    setValores((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => (prev[campo] ? { ...prev, [campo]: undefined } : prev));
  }, []);

  const campo =
    (nombre: keyof Valores) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      poner(nombre, e.target.value as never);

  const tipos = useMemo(
    () => (tieneInmueble ? TIPOS_DE_INMUEBLE : TIPOS_DE_INMUEBLE.filter((x) => x.value !== 'room')),
    [tieneInmueble],
  );

  // ── Validación ────────────────────────────────────────────────────────────
  const validar = (): boolean => {
    const e: Partial<Record<keyof Valores, string>> = {};
    const v = valores;
    const tv = (k: string) => t(`inmobiliaria.consignaciones.editForm.validation.${k}`);
    if (v.title.trim().length < 5) e.title = tv('titleMin');
    if (!v.address.trim()) e.address = tv('addressRequired');
    if (!v.city.trim()) e.city = tv('cityRequired');
    if (inmuebleEditable) {
      if (v.description.trim() && v.description.trim().length < 20) e.description = tv('descriptionMin');
      if (v.externalId.trim().length > 100) e.externalId = tv('externalIdMax');
      for (const k of ['bedrooms', 'bathrooms', 'floor', 'parkingSpaces'] as const) {
        if (v[k] !== '' && Number(v[k]) < 0) e[k] = tv('numeroNoNegativo');
      }
      if (v.area !== '' && Number(v.area) <= 0) e.area = tv('areaPositiva');
      if (v.stratum !== '' && (Number(v.stratum) < 1 || Number(v.stratum) > 6)) e.stratum = tv('estratoEntre');
      if (v.yearBuilt !== '' && (Number(v.yearBuilt) < 1900 || Number(v.yearBuilt) > 2100)) {
        e.yearBuilt = tv('anioEntre');
      }
      if (esVenta) {
        if (!(Number(v.salePrice) > 0)) e.salePrice = tv('salePricePositive');
      } else if (!(Number(v.monthlyRent) > 0)) {
        e.monthlyRent = tv('rentPositive');
      }
    } else if (!tieneInmueble && !esVenta && !(Number(v.monthlyRent) > 0)) {
      e.monthlyRent = tv('rentPositive');
    }
    if (!mandatoTerminado) {
      if (esVenta) {
        if (!(Number(v.saleCommissionPercent) > 0)) e.saleCommissionPercent = tv('saleCommissionPositive');
      } else if (!(Number(v.commissionPercent) > 0)) {
        e.commissionPercent = tv('commissionPositive');
      }
      if (!v.contractDate) e.contractDate = tv('startDateRequired');
      if (v.contractDate && v.contractEndDate && v.contractEndDate <= v.contractDate) {
        e.contractEndDate = tv('contractEndAfterStart');
      }
    }
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  // ── Diffs ─────────────────────────────────────────────────────────────────
  /** Lo que cambió del INMUEBLE, en el vocabulario de `PATCH /properties/:id`. */
  const patchInmueble = (): Record<string, unknown> => {
    if (!inmuebleEditable) return {};
    const p: Record<string, unknown> = {};
    const v = valores;
    const b = base;
    if (v.title.trim() !== b.title) p.title = v.title.trim();
    if (v.description.trim() !== b.description) p.description = v.description.trim();
    if (v.type !== b.type) p.type = v.type;
    if (v.department && v.department !== b.department) p.department = v.department;
    if (v.city.trim() !== b.city) p.city = v.city.trim();
    if (v.neighborhood.trim() !== b.neighborhood) p.neighborhood = v.neighborhood.trim() || null;
    if (v.address.trim() !== b.address) p.address = v.address.trim();
    if (
      v.latitude != null &&
      v.longitude != null &&
      (v.latitude !== b.latitude || v.longitude !== b.longitude)
    ) {
      p.latitude = v.latitude;
      p.longitude = v.longitude;
    }
    for (const k of ['bedrooms', 'bathrooms', 'area', 'floor', 'parkingSpaces', 'stratum', 'yearBuilt'] as const) {
      if (v[k] !== b[k]) p[k] = numeroONull(v[k]);
    }
    if (!mismaLista(v.amenities, b.amenities)) p.amenities = v.amenities;
    if (v.externalId.trim() !== b.externalId) p.externalId = v.externalId.trim() || null;
    if (esVenta) {
      if (v.salePrice !== b.salePrice) p.salePrice = Number(v.salePrice);
    } else if (v.monthlyRent !== b.monthlyRent) {
      p.monthlyRent = Number(v.monthlyRent);
    }
    if (v.adminFee !== b.adminFee) p.adminFee = Number(v.adminFee) || 0;
    if (v.deposit !== b.deposit) p.deposit = Number(v.deposit) || 0;
    if (v.consignedAt !== b.consignedAt) p.consignedAt = v.consignedAt || null;
    if (hayInterruptor && v.publicado !== b.publicado) p.status = v.publicado ? 'AVAILABLE' : 'DRAFT';
    return p;
  };

  /** Lo que cambió del MANDATO. Vacío si el mandato terminó. */
  const patchMandato = (): ConsignacionUpdateInput => {
    if (mandatoTerminado) return {};
    const m: ConsignacionUpdateInput = {};
    const v = valores;
    const b = base;
    if (!tieneInmueble) {
      // Sin inmueble detrás, la copia del mandato es la única verdad.
      if (v.title.trim() !== b.title) m.propertyTitle = v.title.trim();
      if (v.address.trim() !== b.address) m.propertyAddress = v.address.trim();
      if (v.city.trim() !== b.city) m.propertyCity = v.city.trim();
      if (v.neighborhood.trim() !== b.neighborhood) m.propertyZone = v.neighborhood.trim();
      if (v.type !== b.type && v.type !== 'room') m.propertyType = v.type;
      if (!esVenta) {
        if (v.monthlyRent !== b.monthlyRent) m.monthlyRent = Number(v.monthlyRent);
        if (v.adminFee !== b.adminFee) m.adminFee = Number(v.adminFee) || 0;
      }
    }
    if (esVenta) {
      if (v.saleCommissionPercent !== b.saleCommissionPercent) {
        m.saleCommissionPercent = Number(v.saleCommissionPercent);
      }
    } else {
      if (v.commissionPercent !== b.commissionPercent) m.commissionPercent = Number(v.commissionPercent);
      // Vacío no se manda: el back exige ≥ 1 y un plazo «sin valor» no es un
      // dato que el mandato sepa guardar distinto de «no lo cambiaste».
      if (v.minimumTerm !== b.minimumTerm && v.minimumTerm.trim() !== '') {
        m.minimumTerm = Number(v.minimumTerm);
      }
    }
    if (v.contractDate && v.contractDate !== b.contractDate) m.contractDate = v.contractDate;
    if (v.contractEndDate !== b.contractEndDate) m.contractEndDate = v.contractEndDate || null;
    return m;
  };

  // ── Guardar ───────────────────────────────────────────────────────────────
  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    if (!validar()) return;

    const pI = patchInmueble();
    const pM = patchMandato();
    const cambiaAgente =
      !mandatoTerminado && !!valores.agenteId && valores.agenteId !== consignacion.agenteId;
    const hayInmueble = Object.keys(pI).length > 0;
    const hayMandato = Object.keys(pM).length > 0;

    if (!hayInmueble && !hayMandato && !cambiaAgente) {
      toast.info(t('inmobiliaria.consignaciones.editForm.sinCambios'));
      onCerrar();
      return;
    }

    setGuardando(true);
    setConflicto(null);
    let inmuebleGuardado = false;
    try {
      if (hayInmueble && consignacion.propertyId) {
        await propertiesApi.update(consignacion.propertyId, pI);
        inmuebleGuardado = true;
        // La base del inmueble avanza: si el mandato falla, el reintento no lo repite.
        setBase((prev) => ({ ...prev, ...soloInmueble(valores) }));
      }
      if (hayMandato) await consignacionesApi.update(consignacion.id, pM);
      if (cambiaAgente) await consignacionesApi.assignAgent(consignacion.id, valores.agenteId);

      // Releer: la copia del mandato la sincronizó el back y la ficha la lee de ahí.
      const fresca = await consignacionesApi.getById(consignacion.id);
      toast.success(t('inmobiliaria.portafolio.detail.toasts.propertyUpdated'), {
        description: t('inmobiliaria.portafolio.detail.toasts.changesSaved'),
      });
      onGuardado(fresca);
      onCerrar();
    } catch (err) {
      const detalle = err instanceof Error ? err.message : '';
      if (err instanceof ApiError && err.status === 409) {
        setConflicto({
          titulo: inmuebleGuardado
            ? t('inmobiliaria.consignaciones.editForm.guardadoParcial')
            : t('inmobiliaria.consignaciones.editForm.conflictoTitulo'),
          detalle,
        });
      } else {
        toast.error(t('inmobiliaria.portafolio.detail.toasts.updateError'), {
          description: detalle || undefined,
        });
        if (inmuebleGuardado) {
          setConflicto({ titulo: t('inmobiliaria.consignaciones.editForm.guardadoParcial'), detalle });
        }
      }
      // El cajón queda abierto con lo escrito: se corrige y se reintenta.
    } finally {
      setGuardando(false);
    }
  };

  /** Cerrar e ir a una tarjeta de la ficha. La página bloquea el scroll mientras el cajón está abierto. */
  const irA = (ancla: 'fotos' | 'documentos') => {
    onCerrar();
    window.setTimeout(() => {
      document.getElementById(ancla)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 350);
  };

  const coordenadas = useMemo<LatLng | null>(
    () =>
      valores.latitude != null && valores.longitude != null
        ? { lat: valores.latitude, lng: valores.longitude }
        : null,
    [valores.latitude, valores.longitude],
  );

  const tf = (k: string, params?: Record<string, string | number>) =>
    t(`inmobiliaria.consignaciones.editForm.${k}`, params);
  const camposDelMandatoInactivos = mandatoTerminado;

  return (
    <Sheet
      open={abierto}
      onOpenChange={(open) => {
        if (!open && !guardando) onCerrar();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 !p-0 sm:max-w-2xl"
        data-testid="cajon-editar-inmueble"
      >
        <div className="flex-none border-b border-border px-6 py-5 pr-16">
          <SheetTitle className="text-lg font-semibold text-fg">
            {t('inmobiliaria.portafolio.detail.editProperty')}
          </SheetTitle>
          <SheetDescription className="mt-1 text-sm text-fg-muted">{tf('descripcionCajon')}</SheetDescription>
        </div>

        <form
          id="form-editar-inmueble"
          onSubmit={guardar}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-8"
          data-lenis-prevent
          noValidate
        >
          {mandatoTerminado && (
            <Aviso tono="warning" titulo={tf('mandatoTerminado')} testId="aviso-mandato-terminado" />
          )}
          {!tieneInmueble && <Aviso tono="info" titulo={tf('sinInmueble')} testId="aviso-sin-inmueble" />}
          {tieneInmueble && !property && (
            <Aviso
              tono={cargandoProperty ? 'info' : 'warning'}
              titulo={cargandoProperty ? tf('inmuebleCargando') : tf('inmuebleNoCargo')}
              testId="aviso-inmueble-no-cargo"
            />
          )}

          {/* ── Inmueble ─────────────────────────────────────────────────── */}
          <Seccion icon={Buildings} titulo={tf('seccionInmueble')} testId="seccion-inmueble">
            <InputWrapper label={tf('propertyTypeLabel')} required>
              <RadioCardGroup
                className="grid grid-cols-3 gap-2"
                value={valores.type}
                onValueChange={(v) => poner('type', v as PropertyType)}
                disabled={!inmuebleEditable && tieneInmueble}
              >
                {tipos.map(({ value, icon: Icon }) => (
                  <RadioCard
                    key={value}
                    value={value}
                    data-testid={`tipo-${value}`}
                    label={
                      <span className="inline-flex flex-col items-center gap-1.5 text-center text-xs font-medium">
                        <Icon className="w-5 h-5" />
                        {t(`inmobiliaria.consignaciones.propertyType.${value}`)}
                      </span>
                    }
                  />
                ))}
              </RadioCardGroup>
            </InputWrapper>

            <InputWrapper label={tf('propertyTitle')} required error={errores.title}>
              <Input
                name="title"
                value={valores.title}
                onChange={campo('title')}
                disabled={!inmuebleEditable && tieneInmueble}
                placeholder={tf('propertyTitlePlaceholder')}
                className={cn(errores.title && 'border-danger/30')}
                data-testid="editar-title"
              />
            </InputWrapper>

            {inmuebleEditable && (
              <InputWrapper
                label={tf('description')}
                helper={tf('descriptionHelper')}
                error={errores.description}
              >
                <Textarea
                  name="description"
                  value={valores.description}
                  onChange={campo('description')}
                  rows={4}
                  className={cn('resize-none', errores.description && 'border-danger/30')}
                  data-testid="editar-description"
                />
              </InputWrapper>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {inmuebleEditable && (
                <InputWrapper label={tf('department')}>
                  <Select
                    value={valores.department || undefined}
                    onValueChange={(v) => poner('department', v)}
                  >
                    <SelectTrigger className="w-full" data-testid="editar-department">
                      <SelectValue placeholder={tf('selectDepartment')} />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOMBIAN_DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </InputWrapper>
              )}
              <InputWrapper label={tf('city')} required error={errores.city}>
                <Input
                  name="city"
                  list="ciudades-sugeridas"
                  value={valores.city}
                  onChange={campo('city')}
                  disabled={!inmuebleEditable && tieneInmueble}
                  placeholder={tf('cityPlaceholder')}
                  className={cn(errores.city && 'border-danger/30')}
                  data-testid="editar-city"
                />
                <datalist id="ciudades-sugeridas">
                  {COLOMBIAN_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </InputWrapper>
              <InputWrapper label={tf('neighborhood')}>
                <Input
                  name="neighborhood"
                  value={valores.neighborhood}
                  onChange={campo('neighborhood')}
                  disabled={!inmuebleEditable && tieneInmueble}
                  data-testid="editar-neighborhood"
                />
              </InputWrapper>
              <InputWrapper label={tf('address')} required error={errores.address}>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle" />
                  <Input
                    name="address"
                    value={valores.address}
                    onChange={campo('address')}
                    disabled={!inmuebleEditable && tieneInmueble}
                    placeholder={tf('addressPlaceholder')}
                    className={cn('pl-10', errores.address && 'border-danger/30')}
                    data-testid="editar-address"
                  />
                </div>
              </InputWrapper>
            </div>

            {inmuebleEditable && (
              <InputWrapper
                label={tf('ubicacion')}
                helper={coordenadas ? tf('ubicacionHelper') : tf('ubicacionSinPin')}
              >
                <LocationPicker
                  value={coordenadas}
                  city={valores.city}
                  onChange={(c) => {
                    setSucio(true);
                    setValores((prev) => ({ ...prev, latitude: c.lat, longitude: c.lng }));
                  }}
                  className="h-56 sm:h-64"
                />
              </InputWrapper>
            )}

            {inmuebleEditable && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {(
                    [
                      ['bedrooms', 0, 20, 1],
                      ['bathrooms', 0, 10, 1],
                      ['area', 1, 10000, 1],
                      ['floor', 0, 100, 1],
                      ['parkingSpaces', 0, 10, 1],
                    ] as const
                  ).map(([k, min, max, step]) => (
                    <InputWrapper key={k} label={tf(k)} error={errores[k]}>
                      <Input
                        type="number"
                        name={k}
                        min={min}
                        max={max}
                        step={step}
                        value={valores[k]}
                        onChange={campo(k)}
                        className={cn(errores[k] && 'border-danger/30')}
                        data-testid={`editar-${k}`}
                      />
                    </InputWrapper>
                  ))}
                  <InputWrapper label={tf('stratum')} error={errores.stratum}>
                    <Select
                      value={valores.stratum || SIN_ESTRATO}
                      onValueChange={(v) => poner('stratum', v === SIN_ESTRATO ? '' : v)}
                    >
                      <SelectTrigger className="w-full" data-testid="editar-stratum">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SIN_ESTRATO}>{tf('sinEstrato')}</SelectItem>
                        {ESTRATOS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </InputWrapper>
                  <InputWrapper label={tf('yearBuilt')} error={errores.yearBuilt}>
                    <Input
                      type="number"
                      name="yearBuilt"
                      min={1900}
                      max={2100}
                      value={valores.yearBuilt}
                      onChange={campo('yearBuilt')}
                      className={cn(errores.yearBuilt && 'border-danger/30')}
                      data-testid="editar-yearBuilt"
                    />
                  </InputWrapper>
                  <InputWrapper label={tf('externalId')} error={errores.externalId} helper={tf('externalIdHelper')}>
                    <Input
                      name="externalId"
                      value={valores.externalId}
                      onChange={campo('externalId')}
                      maxLength={100}
                      className={cn('font-mono', errores.externalId && 'border-danger/30')}
                      data-testid="editar-externalId"
                    />
                  </InputWrapper>
                </div>

                <InputWrapper label={tf('amenities')}>
                  <SelectorDeAmenidades value={valores.amenities} onChange={(v) => poner('amenities', v)} />
                </InputWrapper>
              </>
            )}
          </Seccion>

          {/* ── Precio ───────────────────────────────────────────────────── */}
          {(inmuebleEditable || !tieneInmueble) && (
            <Seccion icon={CurrencyDollar} titulo={tf('seccionPrecio')} testId="seccion-precio">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {esVenta ? (
                  <InputWrapper label={tf('salePrice')} required error={errores.salePrice}>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle">$</span>
                      <Input
                        type="number"
                        name="salePrice"
                        min={1000}
                        step={1000000}
                        value={valores.salePrice}
                        onChange={campo('salePrice')}
                        className={cn('pl-8', errores.salePrice && 'border-danger/30')}
                        data-testid="editar-salePrice"
                      />
                    </div>
                  </InputWrapper>
                ) : (
                  <InputWrapper label={tf('monthlyRent')} required error={errores.monthlyRent}>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle">$</span>
                      <Input
                        type="number"
                        name="monthlyRent"
                        min={1000}
                        step={50000}
                        value={valores.monthlyRent}
                        onChange={campo('monthlyRent')}
                        disabled={camposDelMandatoInactivos && !inmuebleEditable}
                        className={cn('pl-8', errores.monthlyRent && 'border-danger/30')}
                        data-testid="editar-monthlyRent"
                      />
                    </div>
                  </InputWrapper>
                )}
                {!esVenta && (
                  <InputWrapper label={tf('administration')} helper={t('common.optional')}>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle">$</span>
                      <Input
                        type="number"
                        name="adminFee"
                        min={0}
                        step={10000}
                        value={valores.adminFee}
                        onChange={campo('adminFee')}
                        disabled={camposDelMandatoInactivos && !inmuebleEditable}
                        className="pl-8"
                        data-testid="editar-adminFee"
                      />
                    </div>
                  </InputWrapper>
                )}
                {inmuebleEditable && (
                  <>
                    <InputWrapper label={tf('deposit')} helper={t('common.optional')}>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle">$</span>
                        <Input
                          type="number"
                          name="deposit"
                          min={0}
                          step={100000}
                          value={valores.deposit}
                          onChange={campo('deposit')}
                          className="pl-8"
                          data-testid="editar-deposit"
                        />
                      </div>
                    </InputWrapper>
                    <InputWrapper label={tf('consignedAt')} helper={tf('consignedAtHelper')}>
                      <Input
                        type="date"
                        name="consignedAt"
                        value={valores.consignedAt}
                        onChange={campo('consignedAt')}
                        data-testid="editar-consignedAt"
                      />
                    </InputWrapper>
                  </>
                )}
              </div>
            </Seccion>
          )}

          {/* ── Mandato ──────────────────────────────────────────────────── */}
          <Seccion icon={CalendarBlank} titulo={tf('seccionMandato')} testId="seccion-mandato">
            <fieldset disabled={camposDelMandatoInactivos} className="space-y-4 min-w-0 disabled:opacity-60">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {esVenta ? (
                  <InputWrapper label={tf('saleCommission')} required error={errores.saleCommissionPercent}>
                    <div className="relative">
                      <Input
                        type="number"
                        name="saleCommissionPercent"
                        disabled={camposDelMandatoInactivos}
                        min={0}
                        max={100}
                        step={0.5}
                        value={valores.saleCommissionPercent}
                        onChange={campo('saleCommissionPercent')}
                        className={cn('pr-10', errores.saleCommissionPercent && 'border-danger/30')}
                        data-testid="editar-saleCommissionPercent"
                      />
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
                    </div>
                  </InputWrapper>
                ) : (
                  <>
                    <InputWrapper
                      label={tf('administrationCommission')}
                      required
                      error={errores.commissionPercent}
                    >
                      <div className="relative">
                        <Input
                          type="number"
                          name="commissionPercent"
                        disabled={camposDelMandatoInactivos}
                          min={0}
                          max={100}
                          step={0.5}
                          value={valores.commissionPercent}
                          onChange={campo('commissionPercent')}
                          className={cn('pr-10', errores.commissionPercent && 'border-danger/30')}
                          data-testid="editar-commissionPercent"
                        />
                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
                      </div>
                    </InputWrapper>
                    <InputWrapper label={tf('minimumLeaseTerm')} helper={tf('inMonths')}>
                      <div className="relative">
                        <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle" />
                        <Input
                          type="number"
                          name="minimumTerm"
                        disabled={camposDelMandatoInactivos}
                          min={1}
                          max={36}
                          placeholder="12"
                          value={valores.minimumTerm}
                          onChange={campo('minimumTerm')}
                          className="pl-10"
                          data-testid="editar-minimumTerm"
                        />
                      </div>
                    </InputWrapper>
                  </>
                )}
                <InputWrapper label={tf('contractStartDate')} required error={errores.contractDate}>
                  <Input
                    type="date"
                    name="contractDate"
                    disabled={camposDelMandatoInactivos}
                    value={valores.contractDate}
                    onChange={campo('contractDate')}
                    className={cn(errores.contractDate && 'border-danger/30')}
                    data-testid="editar-contractDate"
                  />
                </InputWrapper>
                <InputWrapper label={tf('contractEndDate')} helper={t('common.optional')} error={errores.contractEndDate}>
                  <Input
                    type="date"
                    name="contractEndDate"
                    disabled={camposDelMandatoInactivos}
                    value={valores.contractEndDate}
                    onChange={campo('contractEndDate')}
                    className={cn(errores.contractEndDate && 'border-danger/30')}
                    data-testid="editar-contractEndDate"
                  />
                </InputWrapper>
              </div>

              {/* Agente: el valor es el User id (`agente.userId`), que es lo que
                  `assign-agent` exige y lo que la consignación guarda. Los agentes
                  sin cuenta todavía no se listan: no se les puede asignar nada. */}
              <InputWrapper label={tf('assignedAgent')} helper={tf('agentReassignHelp')}>
                <Select
                  value={valores.agenteId || undefined}
                  onValueChange={(v) => poner('agenteId', v)}
                  disabled={camposDelMandatoInactivos}
                >
                  <SelectTrigger className="w-full" data-testid="editar-agente">
                    <User className="w-5 h-5 text-fg-subtle shrink-0" />
                    <SelectValue placeholder={tf('selectAgent')} />
                  </SelectTrigger>
                  <SelectContent>
                    {agentes.map((agente) => (
                      <SelectItem key={agente.id} value={agente.userId!}>
                        {agente.name} - {agente.zone || tf('noZone')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InputWrapper>
            </fieldset>
          </Seccion>

          {/* ── Publicación ──────────────────────────────────────────────── */}
          {inmuebleEditable && (
            <Seccion icon={Globe} titulo={tf('seccionPublicacion')} testId="seccion-publicacion">
              {hayInterruptor ? (
                <label className="flex items-start justify-between gap-4 rounded-md border border-border bg-surface p-4 cursor-pointer">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-fg">{tf('publicado')}</span>
                    <span className="block text-xs text-fg-muted mt-0.5">{tf('publicadoHelper')}</span>
                  </span>
                  <Switch
                    checked={valores.publicado}
                    onCheckedChange={(v) => poner('publicado', v)}
                    aria-label={tf('publicado')}
                    data-testid="editar-publicado"
                  />
                </label>
              ) : (
                <Aviso
                  tono="info"
                  titulo={tf('publicacionNoAplica', { estado: estadoCrudo ?? '—' })}
                  testId="publicacion-no-aplica"
                />
              )}
            </Seccion>
          )}

          {/* ── Fotos y documentos: viven en sus tarjetas, esto sólo lleva ── */}
          {tieneInmueble && (
            <Seccion icon={Images} titulo={tf('seccionFotosYDocumentos')} testId="seccion-fotos-documentos">
              <p className="text-sm text-fg-muted">{tf('fotosYDocumentosHelper')}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" hideArrow onClick={() => irA('fotos')} data-testid="ir-a-fotos">
                  <Images className="w-4 h-4" />
                  {tf('irAFotos')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  hideArrow
                  onClick={() => irA('documentos')}
                  data-testid="ir-a-documentos"
                >
                  <FileText className="w-4 h-4" />
                  {tf('irADocumentos')}
                </Button>
              </div>
            </Seccion>
          )}

          {conflicto && (
            <Aviso tono="danger" titulo={conflicto.titulo} detalle={conflicto.detalle} testId="editar-conflicto" />
          )}
        </form>

        <div className="flex-none border-t border-border px-6 py-4 flex items-center gap-3">
          <Button type="button" variant="secondary" hideArrow onClick={onCerrar} disabled={guardando} className="flex-1">
            {tf('cancel')}
          </Button>
          <Button
            type="submit"
            form="form-editar-inmueble"
            hideArrow
            disabled={guardando}
            isLoading={guardando}
            className="flex-1"
            data-testid="editar-guardar"
          >
            {guardando ? tf('saving') : tf('saveChanges')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Sólo los campos del INMUEBLE de `Valores`, para avanzar la base tras un guardado parcial. */
function soloInmueble(v: Valores): Partial<Valores> {
  const {
    commissionPercent: _c,
    saleCommissionPercent: _s,
    contractDate: _d,
    contractEndDate: _e,
    minimumTerm: _m,
    agenteId: _a,
    ...inmueble
  } = v;
  void _c;
  void _s;
  void _d;
  void _e;
  void _m;
  void _a;
  return inmueble;
}

export default ConsignacionEditForm;
