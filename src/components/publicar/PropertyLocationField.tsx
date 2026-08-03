'use client';

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
          }}
        />
      </div>
    </div>
  );
}
