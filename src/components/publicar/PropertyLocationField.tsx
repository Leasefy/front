'use client';

import { useRef } from 'react';

/**
 * PropertyLocationField — combines AddressAutocomplete + LocationPicker so
 * every property form gets both the address combobox AND a draggable map
 * pin from a single drop-in component.
 *
 * Sync rules:
 *   - Picking an autocomplete suggestion sets address + coords (geocoded)
 *     and re-centers the pin.
 *   - Editing the address as free text invalidates the previously geocoded
 *     coords (same fail-closed behavior as the bare AddressAutocomplete).
 *   - Dragging/clicking the pin updates coords only, tagging them as
 *     'geocoded' since they now come from a deliberate user placement.
 *
 * Does NOT touch city/neighborhood — same as the original wizard step, the
 * suggestion's city/neighborhood are intentionally discarded here.
 */

import { AddressAutocomplete, type AddressSelection } from './AddressAutocomplete';
import { LocationPicker, type LatLng } from '@/components/map/LocationPicker';
import { useReverseGeocode } from '@/lib/hooks/use-reverse-geocode';

export interface PropertyLocationValue {
  address?: string;
  latitude?: number;
  longitude?: number;
  geocodePlaceId?: string;
  coordsSource?: 'geocoded' | 'city';
}

export interface PropertyLocationFieldProps {
  address: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  onChange: (partial: PropertyLocationValue) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function PropertyLocationField({
  address,
  city,
  latitude,
  longitude,
  onChange,
  id,
  placeholder,
  disabled,
  className,
}: PropertyLocationFieldProps) {
  const pinValue: LatLng | null =
    typeof latitude === 'number' && typeof longitude === 'number' ? { lat: latitude, lng: longitude } : null;

  /**
   * There was no reverse geocoding anywhere in the repo: LocationPicker's
   * onChange only ever emitted {lat, lng}, so clicking/dragging the map pin
   * never touched the address field — only AddressAutocomplete's onSelect
   * did. Debounced so a rapid click/drag doesn't fire a request per
   * interaction; echoes the SAME coords back with the result so a slow
   * resolve can never null out a newer pin position (onChange below always
   * sets latitude/longitude, and an undefined value there would wipe them).
   * Fail-closed: no result (or a failed request) keeps the coordinates,
   * leaves the address exactly as the user last typed it — never wiped.
   */
  /*
   * 🔴 27-10-2026 (QA del asistente nuevo): al escribir la CIUDAD el mapa se centra en ella y mueve el pin; esa
   * vuelta preguntaba la dirección del centro del municipio y PISABA la que la persona ya había escrito («Carrera
   * 76 # 33-20» pasaba a otra calle, o a vacío si la respuesta no traía calle) y «Siguiente» se apagaba sin que
   * nadie supiera por qué. Ahora el mapa sólo LLENA la dirección cuando está vacía; lo escrito manda y nunca se
   * borra. Las coordenadas sí se actualizan siempre.
   */
  const direccionActual = useRef(address);
  direccionActual.current = address;
  const { reverseGeocode } = useReverseGeocode((result, coords) => {
    if (!result) return;
    const sugerida = (result.road || result.label || '').trim();
    const yaEscrita = direccionActual.current.trim().length > 0;
    onChange({
      ...(sugerida && !yaEscrita ? { address: sugerida } : {}),
      latitude: coords.lat,
      longitude: coords.lng,
      geocodePlaceId: result.placeId,
      coordsSource: 'geocoded',
    });
  });

  return (
    <div className={className}>
      <AddressAutocomplete
        id={id}
        placeholder={placeholder}
        disabled={disabled}
        value={address}
        onChangeText={(text) => {
          onChange({
            address: text,
            latitude: undefined,
            longitude: undefined,
            geocodePlaceId: undefined,
            coordsSource: undefined,
          });
        }}
        onSelect={(selection: AddressSelection) => {
          onChange({
            address: selection.address,
            latitude: selection.latitude,
            longitude: selection.longitude,
            geocodePlaceId: selection.placeId,
            coordsSource: 'geocoded',
          });
        }}
      />
      <div className="mt-3">
        <LocationPicker
          value={pinValue}
          city={city}
          onChange={(coords) => {
            onChange({
              latitude: coords.lat,
              longitude: coords.lng,
              coordsSource: 'geocoded',
            });
            reverseGeocode(coords.lat, coords.lng);
          }}
        />
      </div>
    </div>
  );
}
