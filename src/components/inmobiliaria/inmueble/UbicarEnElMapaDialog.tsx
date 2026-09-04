'use client';

/**
 * UbicarEnElMapaDialog — ponerle ubicación a un inmueble que no la tiene.
 *
 * Los inmuebles que entran por CSV o por enlace suelen llegar sin
 * coordenadas (el back guarda `null`). Este diálogo reusa el mismo buscador
 * de direcciones del asistente de publicación (`PropertyLocationField`:
 * autocompletar + pin arrastrable) con la dirección de la consignación ya
 * escrita, y guarda con `PATCH /properties/:id { latitude, longitude }`.
 *
 * Si el proxy de geocodificación contesta 503 (sin LocationIQ configurado)
 * se dice tal cual y se deja igual poner el pin a mano sobre el mapa,
 * centrado en la ciudad del inmueble.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Info } from '@phosphor-icons/react';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LocationPicker, type LatLng } from '@/components/map/LocationPicker';
import { PropertyLocationField, type PropertyLocationValue } from '@/components/publicar/PropertyLocationField';
import { geocodeApi, GeocodeApiError } from '@/lib/api/geocode.service';
import { propertiesApi } from '@/lib/api/properties.service';
import { useI18n } from '@/lib/i18n';

export interface UbicarEnElMapaDialogProps {
  abierto: boolean;
  onCerrar: () => void;
  propertyId: string;
  /** Dirección de la consignación: se precarga como consulta del buscador. */
  direccion: string;
  ciudad: string;
  /** Se llama después de guardar; la ficha vuelve a pedir el inmueble. */
  onGuardado: () => void;
}

export function UbicarEnElMapaDialog({
  abierto,
  onCerrar,
  propertyId,
  direccion,
  ciudad,
  onGuardado,
}: UbicarEnElMapaDialogProps) {
  const { t } = useI18n();
  const [ubicacion, setUbicacion] = useState<PropertyLocationValue>({ address: direccion });
  // `null` = todavía no se sabe; `true` = el proxy contestó 503.
  const [busquedaNoDisponible, setBusquedaNoDisponible] = useState<boolean | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Cada apertura arranca limpia con la dirección de la consignación.
  useEffect(() => {
    if (!abierto) return;
    setUbicacion({ address: direccion });
    setBusquedaNoDisponible(null);
    let cancelado = false;
    // Sonda: una consulta real al proxy. Un 503 significa «sin clave», y
    // en ese caso no vale la pena ofrecer un buscador que no busca.
    geocodeApi
      .autocomplete(direccion || ciudad)
      .then(() => {
        if (!cancelado) setBusquedaNoDisponible(false);
      })
      .catch((e: unknown) => {
        if (cancelado) return;
        setBusquedaNoDisponible(e instanceof GeocodeApiError && e.status === 503);
      });
    return () => {
      cancelado = true;
    };
  }, [abierto, direccion, ciudad]);

  const coords = useMemo<LatLng | null>(
    () =>
      typeof ubicacion.latitude === 'number' && typeof ubicacion.longitude === 'number'
        ? { lat: ubicacion.latitude, lng: ubicacion.longitude }
        : null,
    [ubicacion.latitude, ubicacion.longitude],
  );

  const guardar = useCallback(async () => {
    if (!coords || guardando) return;
    setGuardando(true);
    try {
      await propertiesApi.update(propertyId, { latitude: coords.lat, longitude: coords.lng });
      toast.success(t('inmobiliaria.inmuebles.ubicacion.dialogo.guardada'));
      onGuardado();
      onCerrar();
    } catch (e) {
      toast.error(t('inmobiliaria.inmuebles.ubicacion.dialogo.errorAlGuardar'), {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setGuardando(false);
    }
  }, [coords, guardando, propertyId, t, onGuardado, onCerrar]);

  return (
    <Dialog
      open={abierto}
      onOpenChange={(open) => {
        if (!open && !guardando) onCerrar();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('inmobiliaria.inmuebles.ubicacion.dialogo.titulo')}</DialogTitle>
          <DialogDescription>{t('inmobiliaria.inmuebles.ubicacion.dialogo.descripcion')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          {busquedaNoDisponible ? (
            <>
              <p
                role="status"
                className="flex items-start gap-2 rounded-lg border border-info/30 bg-info-soft px-3 py-2 text-sm text-info"
                data-testid="ubicar-busqueda-no-disponible"
              >
                <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                {t('inmobiliaria.inmuebles.ubicacion.dialogo.busquedaNoConfigurada')}
              </p>
              <LocationPicker
                value={coords}
                city={ciudad}
                onChange={(c) => setUbicacion((prev) => ({ ...prev, latitude: c.lat, longitude: c.lng }))}
              />
            </>
          ) : (
            <PropertyLocationField
              id="ubicar-direccion"
              address={ubicacion.address ?? ''}
              city={ciudad}
              latitude={ubicacion.latitude}
              longitude={ubicacion.longitude}
              placeholder={t('inmobiliaria.inmuebles.ubicacion.dialogo.placeholder')}
              onChange={(partial) => setUbicacion((prev) => ({ ...prev, ...partial }))}
            />
          )}
          {!coords && (
            <p className="text-xs text-fg-muted" data-testid="ubicar-sin-pin">
              {t('inmobiliaria.inmuebles.ubicacion.dialogo.sinPin')}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" hideArrow onClick={onCerrar} disabled={guardando}>
            {t('common.cancel')}
          </Button>
          <Button hideArrow onClick={guardar} disabled={!coords || guardando} isLoading={guardando}>
            {t('inmobiliaria.inmuebles.ubicacion.dialogo.guardar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
