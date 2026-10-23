'use client';

import { useMemo } from 'react';
import {
  MagnifyingGlass,
  X,
  Buildings,
  House,
  Storefront,
  Warehouse,
  Briefcase,
  Car,
  Mountains,
  Faders,
} from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Avatar, Chip, IconButton, Presence } from '@leasefy/cadence';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Consignacion, Propietario, Agente } from '@/lib/types/inmobiliaria';
import {
  CAJONES_DEL_INMUEBLE,
  type CajonDelInmueble,
} from '@/lib/inmobiliaria/cajon-del-inmueble';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';
import { useTr } from '@/lib/i18n/use-tr';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface ConsignacionFiltersState {
  search: string;
  /**
   * 🔴 Era `availability: PropertyAvailability | 'all'` y filtraba por el
   * campo crudo del mandato. Eso hacía que la ficha «Arrendadas 105» y el chip
   * «Arrendado 104» contaran cosas distintas: la ficha preguntaba por el
   * CONTRATO y el chip por la disponibilidad. Ahora las dos leen
   * `cajonDelInmueble`, que es una partición: los cajones suman el total.
   */
  cajon: CajonDelInmueble | 'all';
  agenteId: string | 'all';
  propietarioId: string | 'all';
  city: string | 'all';
  propertyType: Consignacion['propertyType'] | 'all';
  /**
   * COMERCIAL (Nico, 04-10-2026): «más de 30 días vacante» y «mandato por
   * vencer o vencido». Opcional: sin él, ninguno.
   */
  comercial?: FiltroComercial;
}

export type FiltroComercial = 'vacante30' | 'mandato';

interface ConsignacionFiltersProps {
  filters: ConsignacionFiltersState;
  onFiltersChange: (filters: ConsignacionFiltersState) => void;
  consignaciones: Consignacion[];
  propietarios: Propietario[];
  agentes: Agente[];
  /**
   * Cuántos hay en cada cajón, y cuántos en total. Van EN EL CHIP: el número
   * y la forma de ver ese número tienen que ser el mismo control, y de paso
   * la franja se puede conciliar a ojo (los cajones suman el total).
   */
  conteo: Record<CajonDelInmueble, number> | null;
  total: number | null;
  /** COMERCIAL: cuántos hay en cada filtro comercial; sin él no se muestran. */
  conteoComercial?: Record<FiltroComercial, number> | null;
}

const ROTULO_DEL_CAJON: Record<CajonDelInmueble, string> = {
  disponible: 'inmobiliaria.consignaciones.filters.available',
  arrendado: 'inmobiliaria.consignaciones.filters.rented',
  enProceso: 'inmobiliaria.consignaciones.filters.inProcess',
  mantenimiento: 'inmobiliaria.consignaciones.filters.maintenance',
  // QA con avatares (04-10): un borrador no está publicado; antes salía como
  // «Disponible» y contaba entre las vacantes.
  borrador: 'inmobiliaria.consignaciones.filters.draft',
  // 🔴 El cajón que faltaba: 25 inmuebles cargados sin mandato que estaban en
  // la tabla y en ningún número. Sin este chip no se podían mirar solos.
  sinMandato: 'inmobiliaria.consignaciones.filters.sinMandato',
};

const FILTROS_COMERCIALES: { id: FiltroComercial; rotulo: string }[] = [
  { id: 'vacante30', rotulo: 'Vacantes hace más de 30 días' },
  { id: 'mandato', rotulo: 'Mandato por vencer o vencido' },
];

const PROPERTY_TYPE_OPTIONS: { value: Consignacion['propertyType'] | 'all'; labelKey: string; icon: React.ElementType }[] = [
  { value: 'all', labelKey: 'inmobiliaria.consignaciones.filters.allTypes', icon: Buildings },
  { value: 'apartment', labelKey: 'inmobiliaria.consignaciones.filters.apartment', icon: Buildings },
  { value: 'house', labelKey: 'inmobiliaria.consignaciones.filters.house', icon: House },
  { value: 'studio', labelKey: 'inmobiliaria.consignaciones.filters.studio', icon: Buildings },
  { value: 'commercial', labelKey: 'inmobiliaria.consignaciones.filters.commercial', icon: Storefront },
  { value: 'office', labelKey: 'inmobiliaria.consignaciones.filters.office', icon: Briefcase },
  { value: 'warehouse', labelKey: 'inmobiliaria.consignaciones.filters.warehouse', icon: Warehouse },
  { value: 'parking', labelKey: 'inmobiliaria.consignaciones.filters.parking', icon: Car },
  { value: 'land', labelKey: 'inmobiliaria.consignaciones.filters.land', icon: Mountains },
];

/**
 * ConsignacionFilters - Inline filter bar for consignacion portfolio page
 * Uses pill-style tabs and compact dropdowns
 */
export function ConsignacionFilters({
  filters,
  onFiltersChange,
  consignaciones,
  propietarios,
  agentes,
  conteo,
  total,
  conteoComercial,
}: ConsignacionFiltersProps) {
  const { t } = useI18n();
  const tr = useTr();
  /**
   * Revisora r24 (Inmuebles #1): a 390 el primer inmueble quedaba fuera de la primera pantalla (tres renglones de
   * filtros). En el celular, Propietario y Ciudad entran en «Filtros (n)», junto al buscador, y los cajones van en un
   * riel de un renglón que se desliza de lado.
   */
  const enElCelular = useIsMobile();

  // Extract unique cities from consignaciones
  const uniqueCities = useMemo(() => {
    const cities = new Set(consignaciones.map((c) => c.propertyCity));
    return Array.from(cities).sort();
  }, [consignaciones]);

  // Count active filters (excluding search and availability tabs)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.agenteId !== 'all') count++;
    if (filters.propietarioId !== 'all') count++;
    if (filters.city !== 'all') count++;
    if (filters.propertyType !== 'all') count++;
    return count;
  }, [filters]);

  const hasAnyFilter =
    filters.search || filters.cajon !== 'all' || activeFiltersCount > 0 || Boolean(filters.comercial);

  const updateFilter = <K extends keyof ConsignacionFiltersState>(
    key: K,
    value: ConsignacionFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  /** Cuántos de los filtros del botón «Filtros» están puestos (decisión 25). */
  const filtrosEnElBoton =
    (filters.agenteId !== 'all' ? 1 : 0) +
    (filters.propertyType !== 'all' ? 1 : 0) +
    (enElCelular ? (filters.propietarioId !== 'all' ? 1 : 0) + (filters.city !== 'all' ? 1 : 0) : 0);

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      cajon: 'all',
      agenteId: 'all',
      propietarioId: 'all',
      city: 'all',
      propertyType: 'all',
    });
  };

  // Get labels for current selections
  const getAgenteLabel = () => {
    if (filters.agenteId === 'all') return t('inmobiliaria.consignaciones.filters.agentLabel');
    const agente = agentes.find((a) => a.id === filters.agenteId);
    return agente?.name || t('inmobiliaria.consignaciones.filters.agentLabel');
  };

  const getPropietarioLabel = () => {
    if (filters.propietarioId === 'all') return t('inmobiliaria.consignaciones.filters.ownerLabel');
    const prop = propietarios.find((p) => p.id === filters.propietarioId);
    return prop?.name || t('inmobiliaria.consignaciones.filters.ownerLabel');
  };

  const getCityLabel = () => {
    return filters.city === 'all' ? t('inmobiliaria.consignaciones.filters.cityLabel') : filters.city;
  };

  const getPropertyTypeLabel = () => {
    if (filters.propertyType === 'all') return t('inmobiliaria.consignaciones.filters.typeLabel');
    const option = PROPERTY_TYPE_OPTIONS.find((o) => o.value === filters.propertyType);
    return option ? t(option.labelKey) : t('inmobiliaria.consignaciones.filters.typeLabel');
  };

  const propietarioYCiudad = (
    <>
          {/* Propietario Dropdown */}
          <Select
            value={filters.propietarioId}
            onValueChange={(v) => updateFilter('propietarioId', v as ConsignacionFiltersState['propietarioId'])}
          >
            <SelectTrigger className={cn('w-full gap-2', !enElCelular && 'sm:w-auto sm:max-w-[160px]')}>
              <span className="truncate">{getPropietarioLabel()}</span>
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="all">{t('inmobiliaria.consignaciones.filters.allOwners')}</SelectItem>
              {propietarios.map((prop) => (
                <SelectItem key={prop.id} value={prop.id}>{prop.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* City Dropdown */}
          <Select
            value={filters.city}
            onValueChange={(v) => updateFilter('city', v as ConsignacionFiltersState['city'])}
          >
            <SelectTrigger className={cn('w-full gap-2', !enElCelular && 'sm:w-auto sm:min-w-[110px] sm:max-w-[160px]')}>
              <span className="truncate">{getCityLabel()}</span>
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="all">{t('inmobiliaria.consignaciones.filters.allCities')}</SelectItem>
              {uniqueCities.map((city) => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>

    </>
  );

  /*
   * IN-03 (QA 04-10): el filtro «Tipo» caía solo a un segundo renglón a 1440
   * px: los seis chips, el separador y los cuatro desplegables no cabían en una
   * fila. Ahora el buscador y los desplegables van en la PRIMERA fila (caben a
   * 1440) y los cajones, que son la forma de ver los números, en la segunda.
   * A 390 px los desplegables se apilan de a dos y los chips se acomodan solos.
   */
  return (
    <div className="p-4 space-y-3 border-b border-border">
      {/* Fila 1: buscador + desplegables */}
      <div
        className={cn('flex gap-3', enElCelular ? 'flex-row items-center gap-2' : 'flex-col lg:flex-row lg:items-center')}
        data-testid="filtros-fila-1"
      >
        <div className={cn('relative', enElCelular ? 'min-w-0 flex-1' : 'w-full lg:max-w-md lg:flex-1')}>
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <Input
            type="text"
            // Revisora r24 (Inmuebles #6): a 390 el texto largo se cortaba («…propietario, inquili…»).
            placeholder={enElCelular ? tr('Buscar inmueble') : t('inmobiliaria.consignaciones.filters.searchPlaceholder')}
            aria-label={t('inmobiliaria.consignaciones.filters.searchPlaceholder')}
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-10 pr-4"
          />
          {/* La equis aparece y se va con un fundido (sin moverse: el
              `-translate-y-1/2` la centra). */}
          <Presence show={Boolean(filters.search)} direction="none" className="absolute right-2 top-1/2 -translate-y-1/2">
            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => updateFilter('search', '')}
              aria-label="Limpiar búsqueda"
              className="text-muted-foreground"
              icon={<X className="w-4 h-4" />}
            />
          </Presence>
        </div>

        <div
          className={cn(enElCelular ? 'flex shrink-0 items-center gap-1' : 'grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center lg:flex-nowrap')}
          data-testid="filtros-desplegables"
        >
          {enElCelular ? null : propietarioYCiudad}

          {/* Decisión 25 de Nico (22-10): en la fila, el buscador, Propietario y Ciudad; Asesor y Tipo van en
              «Filtros (n)», con cuántos de esos dos están puestos. */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" hideArrow className={cn('gap-2', enElCelular ? 'shrink-0' : 'w-full sm:w-auto')} data-testid="filtros-mas">
                <Faders className="h-4 w-4" aria-hidden="true" />
                {filtrosEnElBoton > 0 ? `Filtros (${filtrosEnElBoton})` : 'Filtros'}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-3" data-testid="filtros-mas-contenido">
              {enElCelular ? propietarioYCiudad : null}
              {/* Agente Dropdown */}
              <Select
                value={filters.agenteId}
                onValueChange={(v) => updateFilter('agenteId', v as ConsignacionFiltersState['agenteId'])}
              >
                <SelectTrigger className="w-full gap-2" aria-label={t('inmobiliaria.consignaciones.filters.allAgents')}>
                  <span className="truncate">{getAgenteLabel()}</span>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">{t('inmobiliaria.consignaciones.filters.allAgents')}</SelectItem>
                  {agentes.map((agente) => (
                    <SelectItem key={agente.id} value={agente.id}>
                      <span className="flex items-center gap-2">
                        {/* Cadence 2: el Avatar del sistema, nunca iniciales a mano. */}
                        <Avatar name={agente.name} src={agente.avatar || undefined} size="xs" />
                        <span className="truncate">{agente.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Tipo Dropdown */}
              <Select
                value={filters.propertyType}
                onValueChange={(v) => updateFilter('propertyType', v as ConsignacionFiltersState['propertyType'])}
              >
                <SelectTrigger className="w-full gap-2">
                  <span className="truncate">{getPropertyTypeLabel()}</span>
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {t(option.labelKey)}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

            </PopoverContent>
          </Popover>

          {/* Clear Filters */}
          {/* «Limpiar» aparece con el primer filtro y se va al limpiarlos. */}
          <Presence show={Boolean(hasAnyFilter)} direction="none" className={cn('flex items-center', enElCelular ? 'shrink-0' : 'col-span-2 sm:col-span-1')}>
            <Button
              variant="ghost"
              size="sm"
              hideArrow
              onClick={clearAllFilters}
              className="gap-1.5 text-danger hover:bg-danger-soft hover:text-danger"
            >
              <X className="w-4 h-4" aria-hidden="true" />
              {/* En el celular sólo la equis (el buscador necesita el ancho); el nombre sigue para el lector. */}
              <span className={cn(enElCelular && 'sr-only')}>{t('inmobiliaria.consignaciones.filters.clear')}</span>
            </Button>
          </Presence>
        </div>
      </div>

      {/* Fila 2: los cajones, con su número EN el chip */}
      <div
        className={cn(
          'flex items-center gap-1.5',
          enElCelular ? '-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&>*]:shrink-0' : 'flex-wrap',
        )}
        data-testid="filtros-cajones"
      >
        {/* Revisora r25 (T2): las pestañas de estado de la casa (antes chips rectangulares hechos a
            mano). Nico (22-10, decisión 23): un cajón en 0 no sale, salvo el elegido; sin conteo
            salen todos, sin número. El punto ámbar, sólo en «Sin mandato» (no cobran ni se publican). */}
        <PestanasDeEstado<CajonDelInmueble | 'all'>
          etiqueta={t('inmobiliaria.consignaciones.filters.all')}
          valor={filters.cajon}
          onCambio={(v) => updateFilter('cajon', v)}
          pestanas={[
            { valor: 'all', etiqueta: t('inmobiliaria.consignaciones.filters.all'), cuantos: total, fija: true, testid: 'cajon-all' },
            ...CAJONES_DEL_INMUEBLE.map((cajon) => ({
              valor: cajon,
              etiqueta: t(ROTULO_DEL_CAJON[cajon]),
              cuantos: conteo === null ? null : conteo[cajon],
              ...(cajon === 'sinMandato' ? { tono: 'aviso' as const } : {}),
              testid: `cajon-${cajon}`,
            })),
          ]}
          className="contents"
        />
        {/* COMERCIAL (Nico, 04-10-2026): las vacantes largas y los mandatos
            que se vencen. Un segundo clic quita el filtro. */}
        {conteoComercial && FILTROS_COMERCIALES.some((f) => conteoComercial[f.id] > 0 || filters.comercial === f.id) ? (
          <>
            <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
            {/* Revisora r22 (Inmuebles #1): las alertas en 0 no salen (como los cajones, decisión 23), salvo la elegida. */}
            {FILTROS_COMERCIALES.filter((f) => conteoComercial[f.id] > 0 || filters.comercial === f.id).map((f) => (
              <Chip
                key={f.id}
                selected={filters.comercial === f.id}
                onClick={() => updateFilter('comercial', filters.comercial === f.id ? undefined : f.id)}
                className="whitespace-nowrap"
                data-testid={`filtro-${f.id}`}
              >
                {conteoComercial[f.id] > 0 ? <PuntoDeAtencion /> : null}
                {f.rotulo} {conteoComercial[f.id].toLocaleString(localeDeLasCifras())}
              </Chip>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}

/** El punto de «esto pide atención»: el mismo ámbar de los estados, sin texto (el rótulo lo dice). */
function PuntoDeAtencion() {
  return <span className="mr-1.5 inline-block size-1.5 shrink-0 rounded-full bg-warning align-middle" aria-hidden="true" data-testid="punto-de-atencion" />;
}

export default ConsignacionFilters;
