'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import Map, { MapRef, Marker } from 'react-map-gl/mapbox';
import type { Property } from '@/lib/types/property';
import { INITIAL_VIEW_STATE, MAP_STYLE, ZOOM_LEVELS } from '@/lib/constants/map';
import { useSupercluster } from '@/lib/hooks/useSupercluster';
import { PriceMarker } from './PriceMarker';
import { ClusterMarker } from './ClusterMarker';
import { cn } from '@/lib/utils';

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
  hoveredPropertyId?: string | null;
  onPropertySelect?: (id: string) => void;
  onPropertyHover?: (id: string | null) => void;
  className?: string;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/**
 * Interactive property map with price markers and clustering
 * Airbnb/Zillow style with bidirectional list-map interaction
 */
export function PropertyMap({
  properties,
  onMapMove,
  selectedPropertyId,
  hoveredPropertyId,
  onPropertySelect,
  onPropertyHover,
  className,
}: PropertyMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [zoom, setZoom] = useState(INITIAL_VIEW_STATE.zoom);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);

  // Supercluster for marker clustering
  const { points, getClusterExpansionZoom } = useSupercluster(
    properties,
    bounds,
    zoom
  );

  // Update bounds and zoom on map movement
  const updateMapState = useCallback(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      const mapBounds = map.getBounds();
      if (mapBounds) {
        const newBounds = {
          north: mapBounds.getNorth(),
          south: mapBounds.getSouth(),
          east: mapBounds.getEast(),
          west: mapBounds.getWest(),
        };
        setBounds(newBounds);
        setZoom(map.getZoom());
        onMapMove?.(newBounds);
      }
    }
  }, [onMapMove]);

  // Handle cluster click - zoom to cluster
  const handleClusterClick = useCallback(
    (clusterId: number, lng: number, lat: number) => {
      const expansionZoom = getClusterExpansionZoom(clusterId);
      mapRef.current?.flyTo({
        center: [lng, lat],
        zoom: Math.min(expansionZoom, ZOOM_LEVELS.property),
        duration: 500,
      });
    },
    [getClusterExpansionZoom]
  );

  // Pan to hovered property from list (only when zoomed in enough)
  useEffect(() => {
    if (hoveredPropertyId && mapRef.current && zoom >= ZOOM_LEVELS.city) {
      const property = properties.find((p) => p.id === hoveredPropertyId);
      if (property) {
        mapRef.current.panTo([property.longitude, property.latitude], {
          duration: 300,
        });
      }
    }
  }, [hoveredPropertyId, properties, zoom]);

  // Don't render without token
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'YOUR_MAPBOX_TOKEN') {
    return (
      <div
        className={cn('flex items-center justify-center bg-slate-100', className)}
        role="img"
        aria-label="Mapa no disponible"
      >
        <div className="text-center p-8">
          <p className="text-sm text-muted-foreground">
            Configure NEXT_PUBLIC_MAPBOX_TOKEN para ver el mapa
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Obten un token gratis en{' '}
            <a
              href="https://www.mapbox.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              mapbox.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative w-full h-full', className)}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        onLoad={updateMapState}
        onMoveEnd={updateMapState}
        attributionControl={false}
        reuseMaps
      >
        {points.map((point) => {
          const [lng, lat] = point.geometry.coordinates;

          if (point.type === 'cluster') {
            return (
              <Marker
                key={`cluster-${point.id}`}
                longitude={lng}
                latitude={lat}
                anchor="center"
              >
                <ClusterMarker
                  count={point.properties.point_count}
                  onClick={() => handleClusterClick(point.id, lng, lat)}
                />
              </Marker>
            );
          }

          return (
            <Marker
              key={point.id}
              longitude={lng}
              latitude={lat}
              anchor="center"
            >
              <PriceMarker
                price={point.properties.monthlyRent}
                isSelected={selectedPropertyId === point.id}
                isHovered={hoveredPropertyId === point.id}
                onClick={() => onPropertySelect?.(point.id)}
                onMouseEnter={() => onPropertyHover?.(point.id)}
                onMouseLeave={() => onPropertyHover?.(null)}
              />
            </Marker>
          );
        })}
      </Map>
    </div>
  );
}
