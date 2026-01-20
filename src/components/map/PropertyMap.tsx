'use client';

import { useRef, useCallback } from 'react';
import Map, { MapRef } from 'react-map-gl/mapbox';
import type { Property } from '@/lib/types/property';
import { COLOMBIA_BOUNDS, ZOOM_LEVELS } from '@/lib/constants/map';

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface PropertyMapProps {
  properties: Property[];
  onMapMove?: (bounds: MapBounds) => void;
  selectedPropertyId?: string | null;
  onPropertySelect?: (id: string) => void;
  className?: string;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Colombia center point for initial view
const INITIAL_VIEW = {
  latitude: 4.5709,
  longitude: -74.2973,
  zoom: ZOOM_LEVELS.country,
};

export function PropertyMap({
  properties,
  onMapMove,
  selectedPropertyId,
  onPropertySelect,
  className,
}: PropertyMapProps) {
  const mapRef = useRef<MapRef>(null);

  // Handle map movement to get visible bounds
  const handleMoveEnd = useCallback(() => {
    if (mapRef.current && onMapMove) {
      const bounds = mapRef.current.getBounds();
      if (bounds) {
        onMapMove({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        });
      }
    }
  }, [onMapMove]);

  // Fit map to show all properties
  const fitToProperties = useCallback(() => {
    if (!mapRef.current || properties.length === 0) return;

    const lngs = properties.map((p) => p.longitude);
    const lats = properties.map((p) => p.latitude);

    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    // Add padding around the bounds
    const padding = 0.1;
    mapRef.current.fitBounds(
      [
        [minLng - padding, minLat - padding],
        [maxLng + padding, maxLat + padding],
      ],
      { duration: 1000 }
    );
  }, [properties]);

  // Focus on a specific property
  const focusProperty = useCallback((property: Property) => {
    if (!mapRef.current) return;

    mapRef.current.flyTo({
      center: [property.longitude, property.latitude],
      zoom: ZOOM_LEVELS.neighborhood,
      duration: 1000,
    });
  }, []);

  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'YOUR_MAPBOX_TOKEN') {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        role="img"
        aria-label="Mapa no disponible"
      >
        <div className="text-center p-6">
          <p className="text-muted-foreground mb-2">
            Mapa no disponible
          </p>
          <p className="text-sm text-muted-foreground">
            Configure NEXT_PUBLIC_MAPBOX_TOKEN en .env.local
          </p>
        </div>
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={INITIAL_VIEW}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      onMoveEnd={handleMoveEnd}
      maxBounds={[
        [COLOMBIA_BOUNDS.west, COLOMBIA_BOUNDS.south],
        [COLOMBIA_BOUNDS.east, COLOMBIA_BOUNDS.north],
      ]}
      attributionControl={false}
      reuseMaps
    >
      {/* Markers will be added in Plan 02 */}
    </Map>
  );
}
