'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import Map, { MapRef, Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
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

/**
 * Interactive property map with price markers and clustering
 * Airbnb/Zillow style with bidirectional list-map interaction
 */
// Calculate initial bounds from properties
function getInitialBounds(properties: Property[]): MapBounds {
  if (properties.length === 0) {
    // Default to Colombia bounds
    return { north: 13.5, south: -4.5, east: -66.5, west: -82.0 };
  }

  const lats = properties.map(p => p.latitude);
  const lngs = properties.map(p => p.longitude);

  return {
    north: Math.max(...lats) + 1,
    south: Math.min(...lats) - 1,
    east: Math.max(...lngs) + 1,
    west: Math.min(...lngs) - 1,
  };
}

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
  // Initialize bounds from properties so markers render immediately
  const [bounds, setBounds] = useState<MapBounds>(() => getInitialBounds(properties));
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

  // Fly to hovered property from list (Airbnb-style)
  useEffect(() => {
    if (hoveredPropertyId && mapRef.current) {
      const property = properties.find((p) => p.id === hoveredPropertyId);
      if (property) {
        // Fly to property with smooth animation and zoom to neighborhood level
        mapRef.current.flyTo({
          center: [property.longitude, property.latitude],
          zoom: Math.max(zoom, ZOOM_LEVELS.neighborhood), // At least neighborhood zoom
          duration: 600,
          essential: true,
        });
      }
    }
  }, [hoveredPropertyId, properties, zoom]);

  // Handle map load - ensure bounds are set after map is ready
  const handleMapLoad = useCallback(() => {
    // Small delay to ensure map is fully initialized
    setTimeout(() => {
      updateMapState();
    }, 100);
  }, [updateMapState]);

  return (
    <div className={cn('relative w-full h-full', className)}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        onLoad={handleMapLoad}
        onMoveEnd={updateMapState}
        attributionControl={true}
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
