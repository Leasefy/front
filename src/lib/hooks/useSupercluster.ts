/**
 * Supercluster hook for property marker clustering
 * Efficiently clusters property markers at different zoom levels
 */

import { useMemo, useRef } from 'react';
import Supercluster from 'supercluster';
import type { Property } from '@/lib/types/property';
import { CLUSTER_CONFIG } from '@/lib/constants/map';
import { tieneCoordenadas } from '@/components/map/coordenadas';

export interface ClusterPoint {
  type: 'cluster';
  id: number;
  properties: {
    cluster: true;
    cluster_id: number;
    point_count: number;
  };
  geometry: { coordinates: [number, number] };
}

export interface PropertyPoint {
  type: 'property';
  id: string;
  properties: Property;
  geometry: { coordinates: [number, number] };
}

export type MapPoint = ClusterPoint | PropertyPoint;

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface UseSuperclusterResult {
  points: MapPoint[];
  getClusterExpansionZoom: (clusterId: number) => number;
}

export function useSupercluster(
  properties: Property[],
  bounds: MapBounds | null,
  zoom: number
): UseSuperclusterResult {
  const superclusterRef = useRef<Supercluster | null>(null);

  const points: MapPoint[] = useMemo(() => {
    if (!bounds || !properties.length) return [];

    // Create GeoJSON points from properties. `latitude`/`longitude` pueden
    // ser null (inmueble sin geocodificar): esos no entran al índice.
    const geoPoints = properties
      .filter((property) => tieneCoordenadas(property.latitude, property.longitude))
      .map((property) => ({
        type: 'Feature' as const,
        properties: { ...property },
        geometry: {
          type: 'Point' as const,
          coordinates: [property.longitude as number, property.latitude as number] as [number, number],
        },
      }));

    // Initialize supercluster
    const index = new Supercluster({
      radius: CLUSTER_CONFIG.clusterRadius,
      maxZoom: CLUSTER_CONFIG.clusterMaxZoom,
      minPoints: CLUSTER_CONFIG.clusterMinPoints,
    });
    index.load(geoPoints);
    superclusterRef.current = index;

    // Get clusters for current view
    const clusters = index.getClusters(
      [bounds.west, bounds.south, bounds.east, bounds.north],
      Math.floor(zoom)
    );

    return clusters.map((cluster) => {
      const [lng, lat] = cluster.geometry.coordinates;
      const properties = cluster.properties;

      if (properties.cluster) {
        return {
          type: 'cluster' as const,
          id: properties.cluster_id,
          properties: {
            cluster: true as const,
            cluster_id: properties.cluster_id,
            point_count: properties.point_count,
          },
          geometry: { coordinates: [lng, lat] as [number, number] },
        };
      }

      return {
        type: 'property' as const,
        id: properties.id,
        properties: properties as Property,
        geometry: { coordinates: [lng, lat] as [number, number] },
      };
    });
  }, [properties, bounds, zoom]);

  const getClusterExpansionZoom = (clusterId: number) => {
    return superclusterRef.current?.getClusterExpansionZoom(clusterId) ?? zoom + 2;
  };

  return { points, getClusterExpansionZoom };
}
