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

import type { ReactNode } from 'react';
import { Ruler } from '@phosphor-icons/react';

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
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4" data-testid="caracteristicas-del-inmueble">
          {caracteristicas.map((c) => (
            <div key={c.clave} className="min-w-0">
              <dt className="font-mono text-caption uppercase tracking-[0.1em] text-fg-subtle">{c.rotulo}</dt>
              <dd className="mt-1.5 whitespace-nowrap font-mono text-[17px] tabular-nums text-fg">{c.valor}</dd>
            </div>
          ))}
        </dl>
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
