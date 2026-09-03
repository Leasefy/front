'use client';

/**
 * MapaDelInmueble — el mapa de UN inmueble, sólo lectura.
 *
 * Mismo MapLibre y mismos tiles de OpenFreeMap (sin API key) que
 * `LocationPicker`, pero sin arrastre: acá el pin ya está puesto y lo único
 * que se hace es mirarlo, abrirlo en Google Maps o pedir cómo llegar.
 *
 * Decisiones de interacción:
 * - `scrollZoom` apagado: la ficha scrollea con Lenis y un mapa que se come
 *   la rueda deja al usuario atascado. El zoom va por los botones (+/−).
 * - `cooperativeGestures`: en el celular un dedo sigue scrolleando la página
 *   y el mapa pide dos; en escritorio el arrastre con el mouse funciona.
 * - Estilo según el tema (`next-themes`): positron en claro, liberty en oscuro.
 *   Fuera de un ThemeProvider (detalle público) cae al claro.
 * - Atribución compacta pero presente: OpenFreeMap/OSM la exigen.
 *
 * Toca `window`, así que se monta con `dynamic(..., { ssr: false })`.
 */

import { useMemo } from 'react';
import Map, { AttributionControl, Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from 'next-themes';
import { ArrowSquareOut, MapPin, NavigationArrow } from '@phosphor-icons/react';
import { MAP_STYLES, ZOOM_LEVELS } from '@/lib/constants/map';
import { useOptionalI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface MapaDelInmuebleProps {
  latitude: number;
  longitude: number;
  /** Nombre del inmueble: va al `aria-label` del mapa y al `title` del pin. */
  titulo: string;
  /** Dirección legible que se muestra debajo del mapa. */
  direccion?: string;
  className?: string;
}

export function urlDeGoogleMaps(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function urlDeComoLlegar(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

// Textos de los gestos cooperativos de MapLibre, en español.
const LOCALE_MAPA = {
  'CooperativeGesturesHandler.WindowsHelpText': 'Usá Ctrl + rueda para hacer zoom en el mapa',
  'CooperativeGesturesHandler.MacHelpText': 'Usá ⌘ + rueda para hacer zoom en el mapa',
  'CooperativeGesturesHandler.MobileHelpText': 'Usá dos dedos para mover el mapa',
};

export function MapaDelInmueble({ latitude, longitude, titulo, direccion, className }: MapaDelInmuebleProps) {
  const { resolvedTheme } = useTheme();
  const i18n = useOptionalI18n();
  const etiquetas = useMemo(
    () => ({
      abrir: i18n?.t('inmobiliaria.inmuebles.ubicacion.abrirEnGoogleMaps') ?? 'Abrir en Google Maps',
      comoLlegar: i18n?.t('inmobiliaria.inmuebles.ubicacion.comoLlegar') ?? 'Cómo llegar',
    }),
    [i18n],
  );
  const mapStyle = resolvedTheme === 'dark' ? MAP_STYLES.dark : MAP_STYLES.light;

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className="relative w-full h-56 sm:h-64 rounded-lg border border-border overflow-hidden"
        data-testid="mapa-del-inmueble"
      >
        <Map
          initialViewState={{ latitude, longitude, zoom: ZOOM_LEVELS.property }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={mapStyle}
          scrollZoom={false}
          dragRotate={false}
          cooperativeGestures
          locale={LOCALE_MAPA}
          attributionControl={false}
        >
          <NavigationControl position="top-right" showCompass={false} />
          <AttributionControl compact position="bottom-right" />
          <Marker longitude={longitude} latitude={latitude} anchor="bottom">
            <MapPin className="w-8 h-8 text-primary drop-shadow-sm" weight="fill" aria-hidden="true" />
            <span className="sr-only">{titulo}</span>
          </Marker>
        </Map>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {direccion && (
          <p className="flex items-start gap-1.5 text-sm text-fg min-w-0">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-fg-subtle" aria-hidden="true" />
            <span className="truncate">{direccion}</span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 shrink-0">
          <a
            href={urlDeGoogleMaps(latitude, longitude)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowSquareOut className="w-4 h-4" aria-hidden="true" />
            {etiquetas.abrir}
          </a>
          <a
            href={urlDeComoLlegar(latitude, longitude)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <NavigationArrow className="w-4 h-4" aria-hidden="true" />
            {etiquetas.comoLlegar}
          </a>
        </div>
      </div>
    </div>
  );
}
