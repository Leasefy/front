'use client';

/**
 * Las características del inmueble en el Resumen de su ficha: área,
 * habitaciones, baños, parqueaderos, estrato, piso, año (revisión de diseño de
 * la ficha, 21-10-2026).
 *
 * Reemplaza a «Información del inmueble», que repetía entera la portada
 * (dirección, barrio, ciudad, fecha de inicio) mientras `useProperty` ya traía
 * estos datos y ninguna pestaña los mostraba. Sólo van los que existen; sin
 * ninguno, se dice y se ofrece completarlos. Debajo, si el inmueble no está en
 * el mapa, el renglón de la ubicación con su acción (`ubicacion`).
 */

import type { ComponentType, ReactNode } from 'react';
import { Bathtub, Bed, Buildings, CalendarBlank, Car, ChartBar, CheckCircle, Ruler } from '@phosphor-icons/react';
import { Stagger, StaggerItem } from '@leasefy/cadence';
import { CARACTERISTICAS, NOMBRE_DEL_GRUPO, type GrupoDeCaracteristicas } from '@/lib/inmuebles/caracteristicas';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTr } from '@/lib/i18n/use-tr';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';
import { cn } from '@/lib/utils';
import type { Property } from '@/lib/types/property';
import { TarjetaDeLaFicha as SectionCard } from '@/components/pantalla/TarjetaDeLaFicha';

interface FichaDelInmuebleProps {
  property: Property | null | undefined;
  cargando?: boolean;
  /** El renglón de «sin ubicación en el mapa» (va dentro, separado por una línea). */
  ubicacion?: ReactNode;
  /** Abre «Editar» para completar lo que falta. */
  onEditar?: () => void;
  /** La lista de lo que falta ya pide área, habitaciones y baños: aquí no se repite. */
  loQueFaltaEnLaLista?: boolean;
  className?: string;
}

export interface Caracteristica {
  clave: string;
  rotulo: string;
  valor: string;
}

/** Lo que el inmueble trae, en el orden en que se busca. `null`/`undefined` = no se sabe y no se muestra. */
export function caracteristicasDelInmueble(p: Property, tr: (es: string) => string): Caracteristica[] {
  const n = (v: number) => v.toLocaleString(localeDeLasCifras());
  const lista: (Caracteristica | null)[] = [
    p.area != null && p.area > 0 ? { clave: 'area', rotulo: tr('Área'), valor: `${n(p.area)} m²` } : null,
    p.bedrooms != null ? { clave: 'habitaciones', rotulo: tr('Habitaciones'), valor: n(p.bedrooms) } : null,
    p.bathrooms != null ? { clave: 'banos', rotulo: tr('Baños'), valor: n(p.bathrooms) } : null,
    p.parkingSpaces != null ? { clave: 'parqueaderos', rotulo: tr('Parqueaderos'), valor: n(p.parkingSpaces) } : null,
    p.stratum != null && p.stratum > 0 ? { clave: 'estrato', rotulo: tr('Estrato'), valor: n(p.stratum) } : null,
    p.floor != null ? { clave: 'piso', rotulo: tr('Piso'), valor: n(p.floor) } : null,
    p.yearBuilt != null && p.yearBuilt > 0 ? { clave: 'anio', rotulo: tr('Construido en'), valor: String(p.yearBuilt) } : null,
  ];
  return lista.filter((c): c is Caracteristica => c !== null);
}

const ICONO_DE_LA_CARACTERISTICA: Record<string, ComponentType<{ size?: number; weight?: 'duotone'; 'aria-hidden'?: boolean | 'true' }>> = {
  area: Ruler,
  habitaciones: Bed,
  banos: Bathtub,
  parqueaderos: Car,
  estrato: ChartBar,
  piso: Buildings,
  anio: CalendarBlank,
};

const ORDEN_DE_LOS_GRUPOS: GrupoDeCaracteristicas[] = ['inmueble', 'conjunto', 'sector'];

/** Las amenidades del inmueble agrupadas como en el formulario (del inmueble, del conjunto, del sector). */
export function amenidadesPorGrupo(p: Property): Array<{ grupo: GrupoDeCaracteristicas; nombres: string[] }> {
  const ids = new Set((p.amenities ?? []).map((a) => a.id));
  const sueltas = (p.amenities ?? []).filter((a) => !CARACTERISTICAS.some((c) => c.id === a.id)).map((a) => a.name).filter(Boolean);
  const grupos = ORDEN_DE_LOS_GRUPOS.map((grupo) => ({
    grupo,
    nombres: CARACTERISTICAS.filter((c) => c.grupo === grupo && ids.has(c.id)).map((c) => c.nombre),
  }));
  if (sueltas.length > 0) grupos[0] = { grupo: 'inmueble', nombres: [...grupos[0].nombres, ...sueltas] };
  return grupos.filter((g) => g.nombres.length > 0);
}

export function FichaDelInmueble({ property, cargando = false, ubicacion, onEditar, loQueFaltaEnLaLista = false, className }: FichaDelInmuebleProps) {
  const tr = useTr();
  const caracteristicas = property ? caracteristicasDelInmueble(property, tr) : [];
  const faltanLasBasicas = !!property && property.area == null && property.bedrooms == null && property.bathrooms == null;

  return (
    <SectionCard title={tr('Características')} icon={<Ruler className="h-4 w-4" />} className={className}>
      {cargando && !property ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4" aria-busy="true" data-testid="ficha-del-inmueble-cargando">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </div>
      ) : caracteristicas.length > 0 ? (
        // Mosaicos con su ícono (reunión con Juan, 27-10-2026: «características mejor presentadas»): el valor grande y
        // el rótulo debajo, como se lee una ficha de un portal; el orden es el de lo que más se busca.
        <Stagger as="ul" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4" data-testid="caracteristicas-del-inmueble">
          {caracteristicas.map((c) => {
            const Icono = ICONO_DE_LA_CARACTERISTICA[c.clave] ?? Ruler;
            return (
              <StaggerItem
                as="li"
                key={c.clave}
                className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 rounded-xl border border-border-faint bg-surface-muted/40 px-3.5 py-3 dark:border-border-strong"
              >
                {/* La grilla pone el valor arriba y el rótulo debajo; el lector de pantalla lee «Área, 80 m²». */}
                <span className="contents">
                  <span className="row-span-2 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Icono size={18} weight="duotone" aria-hidden="true" />
                  </span>
                  <span className="col-start-2 row-start-2 truncate text-caption text-fg-muted">{c.rotulo}</span>
                </span>
                <span className="col-start-2 row-start-1 whitespace-nowrap text-[17px] font-medium leading-tight tabular-nums text-fg">{c.valor}</span>
              </StaggerItem>
            );
          })}
        </Stagger>
      ) : null}
      {property && amenidadesPorGrupo(property).length > 0 ? (
        <div className="mt-5 space-y-4 border-t border-border-faint pt-5 dark:border-border-strong" data-testid="amenidades-del-inmueble">
          {amenidadesPorGrupo(property).map(({ grupo, nombres }) => (
            <div key={grupo}>
              <p className="text-caption font-medium text-fg-muted">{tr(NOMBRE_DEL_GRUPO[grupo])}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {nombres.map((nombre) => (
                  <li key={nombre} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm text-fg">
                    <CheckCircle size={14} weight="fill" className="text-success" aria-hidden="true" />
                    {tr(nombre)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
      {/* Faltan lo que más busca quien arrienda (área, habitaciones, baños): se dice con su
          salida aunque haya otros datos (revisión 21-10: con sólo «Estrato 3» no se ofrecía). */}
      {!(cargando && !property) && (caracteristicas.length === 0 || (faltanLasBasicas && !loQueFaltaEnLaLista)) ? (
        <div
          className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', caracteristicas.length > 0 && 'mt-5 border-t border-border-faint pt-5 dark:border-border-strong')}
          data-testid="sin-caracteristicas"
        >
          <p className="text-body-sm text-fg-muted">
            {property
              ? caracteristicas.length > 0
                ? tr('Faltan el área, las habitaciones y los baños: es lo primero que busca quien arrienda.')
                : tr('Sin área, habitaciones ni baños cargados.')
              : tr('No pudimos traer los datos del inmueble.')}
          </p>
          {property && onEditar ? (
            <Button variant="secondary" size="sm" hideArrow className="shrink-0 self-start sm:self-auto" onClick={onEditar}>
              {tr('Completar la ficha')}
            </Button>
          ) : null}
        </div>
      ) : null}

      {ubicacion ? (
        <div className={cn('mt-5 border-t border-border-faint pt-5 dark:border-border-strong')}>{ubicacion}</div>
      ) : null}
    </SectionCard>
  );
}
