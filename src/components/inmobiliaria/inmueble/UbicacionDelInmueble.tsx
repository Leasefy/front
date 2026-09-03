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
}

export function UbicacionDelInmueble({ property, cargando, consignacion, onActualizado }: UbicacionDelInmuebleProps) {
  const { t } = useI18n();
  const permisos = usePermissionsContextSafe();
  // Mientras los permisos resuelven, `canAccess` en false es «todavía no sé»,
  // no «no podés» (ver PermissionsContext). Mismo criterio que ReglasDeMora.
  const puedeEditar = permisos ? permisos.isLoading || permisos.canAccess('portafolio', 'edit') : false;
  const [dialogoAbierto, setDialogoAbierto] = useState(false);

  const direccion = [consignacion.propertyAddress, consignacion.propertyZone, consignacion.propertyCity]
    .filter(Boolean)
    .join(', ');

  const conMapa = !!property && tieneCoordenadas(property.latitude, property.longitude);

  return (
    <section
      className="rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg overflow-hidden"
      data-testid="ubicacion-del-inmueble"
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border-faint dark:border-border-strong">
        <div className="w-8 h-8 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center text-fg-muted dark:text-fg-subtle">
          <MapTrifold className="w-4 h-4" />
        </div>
        <h3 className="font-semibold text-fg dark:text-white">{t('inmobiliaria.inmuebles.ubicacion.titulo')}</h3>
      </div>

      <div className="p-5">
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
          <div
            className="h-56 sm:h-64 rounded-lg border border-dashed border-border bg-surface-muted flex flex-col items-center justify-center gap-3 px-6 text-center"
            data-testid="ubicacion-vacia"
          >
            <div className="w-10 h-10 rounded-md bg-surface dark:bg-ink flex items-center justify-center text-fg-subtle">
              <MapPin className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-fg">{t('inmobiliaria.inmuebles.ubicacion.sinUbicacion')}</p>
              <p className="text-xs text-fg-muted mt-1">
                {property
                  ? t('inmobiliaria.inmuebles.ubicacion.sinUbicacionDesc')
                  : t('inmobiliaria.inmuebles.ubicacion.inmuebleNoCargo')}
              </p>
            </div>
            {property && puedeEditar && (
              <Button variant="secondary" size="sm" hideArrow onClick={() => setDialogoAbierto(true)}>
                <MapPin className="w-4 h-4" aria-hidden="true" />
                {t('inmobiliaria.inmuebles.ubicacion.ubicarEnElMapa')}
              </Button>
            )}
          </div>
        )}
      </div>

      {property && (
        <UbicarEnElMapaDialog
          abierto={dialogoAbierto}
          onCerrar={() => setDialogoAbierto(false)}
          propertyId={property.id}
          direccion={consignacion.propertyAddress}
          ciudad={consignacion.propertyCity}
          onGuardado={onActualizado}
        />
      )}
    </section>
  );
}
