'use client';

/**
 * UbicacionDelInmueble — la sección «Ubicación» de la ficha del inmueble.
 *
 * Con coordenadas reales pinta el mapa (`MapaDelInmueble`, cargado sin SSR
 * porque MapLibre toca `window`). Sin coordenadas dice la verdad —«este
 * inmueble no tiene ubicación en el mapa»— y, si el usuario puede editar el
 * portafolio, ofrece ponerla con `UbicarEnElMapaDialog`.
 *
 * La regla de «tiene o no tiene» es `tieneCoordenadas`: `null`, `(0,0)` y
 * cualquier cosa fuera de rango cuentan como «sin ubicación».
 */

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, MapTrifold } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { tieneCoordenadas } from '@/components/map/coordenadas';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { TarjetaDeLaFicha } from '@/components/pantalla/TarjetaDeLaFicha';
import type { Property } from '@/lib/types/property';
import type { Consignacion } from '@/lib/types/inmobiliaria';
import { UbicarEnElMapaDialog } from './UbicarEnElMapaDialog';

function EsqueletoDelMapa() {
  return <Skeleton className="h-56 sm:h-64 w-full rounded-lg" data-testid="ubicacion-esqueleto" />;
}

const MapaDelInmueble = dynamic(
  () => import('@/components/map/MapaDelInmueble').then((m) => m.MapaDelInmueble),
  { ssr: false, loading: () => <EsqueletoDelMapa /> },
);

export interface UbicacionDelInmuebleProps {
  /** `null` mientras carga o si el inmueble no se pudo traer. */
  property: Property | null;
  cargando?: boolean;
  consignacion: Pick<Consignacion, 'propertyAddress' | 'propertyZone' | 'propertyCity' | 'propertyTitle'>;
  /** Tras guardar coordenadas: la ficha vuelve a pedir el inmueble y el mapa aparece. */
  onActualizado: () => void;
  /**
   * `tarjeta` (por defecto): la sección con su título y el mapa. `fila`: sólo el
   * renglón de «sin ubicación» con su acción, sin tarjeta propia — va DENTRO de
   * la ficha del inmueble (revisión de diseño 21-10: una tarjeta entera con una
   * caja gris adentro para un solo dato que falta era tarjeta dentro de tarjeta).
   */
  variante?: 'tarjeta' | 'fila';
}

export function UbicacionDelInmueble({ property, cargando, consignacion, onActualizado, variante = 'tarjeta' }: UbicacionDelInmuebleProps) {
  const { t } = useI18n();
  const permisos = usePermissionsContextSafe();
  // Mientras los permisos resuelven, `canAccess` en false es «todavía no sé»,
  // no «no puedes» (ver PermissionsContext). Mismo criterio que ReglasDeMora.
  const puedeEditar = permisos ? permisos.isLoading || permisos.canAccess('portafolio', 'edit') : false;
  const [dialogoAbierto, setDialogoAbierto] = useState(false);

  const direccion = [consignacion.propertyAddress, consignacion.propertyZone, consignacion.propertyCity]
    .filter(Boolean)
    .join(', ');

  const conMapa = !!property && tieneCoordenadas(property.latitude, property.longitude);

  // Sin coordenadas: un renglón con su acción, no una caja gris de 260 px que
  // parecía un mapa roto (21-10, impacto visual).
  const vacio = (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        variante === 'tarjeta' && 'rounded-[16px] bg-surface-muted px-4 py-4',
      )}
      data-testid="ubicacion-vacia"
    >
      <div className="flex min-w-0 items-start gap-3">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-fg-subtle" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-body-sm font-medium text-fg">{t('inmobiliaria.inmuebles.ubicacion.sinUbicacion')}</p>
          <p className="mt-0.5 text-caption text-fg-muted">
            {property
              ? t('inmobiliaria.inmuebles.ubicacion.sinUbicacionDesc')
              : t('inmobiliaria.inmuebles.ubicacion.inmuebleNoCargo')}
          </p>
        </div>
      </div>
      {property && puedeEditar && (
        <Button variant="secondary" size="sm" hideArrow className="shrink-0 self-start sm:self-auto" onClick={() => setDialogoAbierto(true)}>
          <MapPin className="w-4 h-4" aria-hidden="true" />
          {t('inmobiliaria.inmuebles.ubicacion.ubicarEnElMapa')}
        </Button>
      )}
    </div>
  );

  const dialogo = property ? (
    <UbicarEnElMapaDialog
      abierto={dialogoAbierto}
      onCerrar={() => setDialogoAbierto(false)}
      propertyId={property.id}
      direccion={consignacion.propertyAddress}
      ciudad={consignacion.propertyCity}
      onGuardado={onActualizado}
    />
  ) : null;

  if (variante === 'fila') {
    return (
      <div data-testid="ubicacion-del-inmueble">
        {cargando && !property ? <Skeleton className="h-10 w-full rounded-lg" data-testid="ubicacion-esqueleto" /> : vacio}
        {dialogo}
      </div>
    );
  }

  return (
    // 21-10: la misma tarjeta de las demás secciones de la ficha.
    <TarjetaDeLaFicha
      title={t('inmobiliaria.inmuebles.ubicacion.titulo')}
      icon={<MapTrifold className="h-4 w-4" />}
      data-testid="ubicacion-del-inmueble"
    >
        {cargando && !property ? (
          <EsqueletoDelMapa />
        ) : conMapa && property ? (
          <MapaDelInmueble
            latitude={property.latitude as number}
            longitude={property.longitude as number}
            titulo={consignacion.propertyTitle}
            direccion={direccion}
          />
        ) : (
          vacio
        )}
      {dialogo}
    </TarjetaDeLaFicha>
  );
}
