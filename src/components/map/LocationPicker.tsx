'use client';

/**
 * LocationPicker — MapLibre map with a single draggable marker for choosing
 * a property's exact coordinates. Uses the same OpenFreeMap tiles as
 * PropertyMap (no API key). Complements AddressAutocomplete: the
 * autocomplete narrows the address, this lets the user fine-tune the pin.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import Map, { Marker, type MapRef, type MapLayerMouseEvent, type MarkerDragEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin } from '@phosphor-icons/react';
import { MAP_STYLES, INITIAL_VIEW_STATE, ZOOM_LEVELS, getCityCoordinates } from '@/lib/constants/map';
import { cn } from '@/lib/utils';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LocationPickerProps {
  /** Currently picked coordinates, or null when none have been set yet. */
  value: LatLng | null;
  onChange: (coords: LatLng) => void;
  /** Used to center the map when there's no value yet. */
  city?: string;
  className?: string;
}

/**
 * Resolves where the pin should start:
 *   1. `value` (already-picked coordinates) always wins.
 *   2. The selected city's center, when known (`getCityCoordinates`).
 *   3. Colombia's country-level center (`INITIAL_VIEW_STATE`) as the last resort.
 */
export function resolveInitialPinPosition(value: LatLng | null, city?: string): LatLng {
  if (value) return value;
  const cityCoords = city ? getCityCoordinates(city) : null;
  if (cityCoords) return cityCoords;
  return { lat: INITIAL_VIEW_STATE.latitude, lng: INITIAL_VIEW_STATE.longitude };
}

export function LocationPicker({ value, onChange, city, className }: LocationPickerProps) {
  const mapRef = useRef<MapRef>(null);
  // Tracks the coordinates we last emitted ourselves (via click/drag) so an
  // external `value` change (e.g. picking an autocomplete suggestion) is the
  // only thing that re-centers the map — dragging the pin shouldn't fight
  // the user by flying the map back to where it already is.
  const lastEmittedRef = useRef<LatLng | null>(value);

  const initialPin = useMemo(() => resolveInitialPinPosition(value, city), [value, city]);
  const pin = value ?? initialPin;

  const emit = useCallback(
    (coords: LatLng) => {
      lastEmittedRef.current = coords;
      onChange(coords);
    },
    [onChange],
  );

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      emit({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    },
    [emit],
  );

  const handleMarkerDragEnd = useCallback(
    (e: MarkerDragEvent) => {
      emit({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    },
    [emit],
  );

  useEffect(() => {
    if (!value) return;
    const last = lastEmittedRef.current;
    const isExternalChange = !last || last.lat !== value.lat || last.lng !== value.lng;
    if (isExternalChange) {
      mapRef.current?.flyTo({ center: [value.lng, value.lat], zoom: ZOOM_LEVELS.property, duration: 600 });
    }
    lastEmittedRef.current = value;
  }, [value]);

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="relative w-full h-64 rounded-xl overflow-hidden border border-border">
        <Map
          ref={mapRef}
          initialViewState={{
            latitude: initialPin.lat,
            longitude: initialPin.lng,
            zoom: value ? ZOOM_LEVELS.property : city ? ZOOM_LEVELS.neighborhood : ZOOM_LEVELS.country,
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={MAP_STYLES.light}
          onClick={handleMapClick}
          reuseMaps
        >
          <Marker
            longitude={pin.lng}
            latitude={pin.lat}
            anchor="bottom"
            draggable
            onDragEnd={handleMarkerDragEnd}
          >
            <MapPin className="w-8 h-8 text-primary" weight="fill" aria-hidden="true" />
          </Marker>
        </Map>
      </div>
      <p className="text-xs text-fg-muted">
        Arrastrá el marcador o hacé clic en el mapa para ajustar la ubicación exacta.
      </p>
    </div>
  );
}
