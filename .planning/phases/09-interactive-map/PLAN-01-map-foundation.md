---
phase: "09-interactive-map"
plan: "01"
title: "Map Foundation - Coordinates & Library Setup"
wave: 1
autonomous: true
must_haves:
  truths:
    - "Property type includes latitude and longitude fields"
    - "All mock properties have realistic Colombian coordinates"
    - "Mapbox GL library installed and configured"
    - "Basic map component renders with Colombian bounds"
  artifacts:
    - path: "src/lib/types/property.ts"
      description: "Property type with coordinates"
      min_lines: 50
    - path: "src/lib/data/mock-properties.ts"
      description: "Mock properties with coordinates"
      min_lines: 200
    - path: "src/components/map/PropertyMap.tsx"
      description: "Basic map component"
      min_lines: 50
  key_links:
    - from: "mock-properties.ts"
      to: "Property type"
      via: "coordinates fields"
---

# Plan 01: Map Foundation - Coordinates & Library Setup

## Objective

Add geographic coordinates to properties and set up Mapbox GL for the interactive map.

## Context

Properties currently have city/neighborhood/address but no lat/lng coordinates. We need to:
1. Add coordinate fields to Property type
2. Add realistic coordinates to mock data (Colombian cities)
3. Install and configure Mapbox GL (react-map-gl)
4. Create basic map component

### Colombian City Coordinates Reference

| City | Latitude | Longitude |
|------|----------|-----------|
| Bogota | 4.7110 | -74.0721 |
| Medellin | 6.2442 | -75.5812 |
| Cali | 3.4516 | -76.5320 |
| Barranquilla | 10.9639 | -74.7964 |
| Cartagena | 10.3910 | -75.4794 |
| Bucaramanga | 7.1254 | -73.1198 |
| Pereira | 4.8087 | -75.6906 |
| Santa Marta | 11.2404 | -74.1990 |
| Manizales | 5.0689 | -75.5174 |
| Cucuta | 7.8939 | -72.5078 |

## Tasks

### Task 1: Add Coordinates to Property Type
**File**: `src/lib/types/property.ts`

Add latitude and longitude to Property interface:
```tsx
export interface Property {
  // ... existing fields ...

  // Location
  city: string;
  neighborhood: string;
  address: string;
  latitude: number;   // Add
  longitude: number;  // Add

  // ... rest of fields ...
}
```

**Verification**: Property type includes latitude and longitude.

### Task 2: Install Mapbox Dependencies
**Command**: `pnpm add react-map-gl mapbox-gl`

Also add types:
```bash
pnpm add -D @types/mapbox-gl
```

**Verification**: Dependencies installed in package.json.

### Task 3: Add Mapbox CSS to Layout
**File**: `src/app/layout.tsx`

Add Mapbox CSS import:
```tsx
import 'mapbox-gl/dist/mapbox-gl.css';
```

**Verification**: Mapbox styles loaded.

### Task 4: Create Map Environment Variable
**File**: `.env.local`

Add Mapbox public token (safe to expose):
```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
```

Note: For MVP, we can use a placeholder or free Mapbox token.

**Verification**: Environment variable available.

### Task 5: Add Coordinates to Mock Properties
**File**: `src/lib/data/mock-properties.ts`

Add realistic coordinates to each property based on city:
```tsx
// Bogota properties: around 4.6-4.8 lat, -74.0 to -74.1 lng
// Medellin properties: around 6.2-6.3 lat, -75.5 to -75.6 lng
// etc.

{
  id: '1',
  title: 'Apartamento Moderno en Chapinero',
  city: 'Bogota',
  // Add coordinates with small variance for realistic spread
  latitude: 4.6473,  // Chapinero area
  longitude: -74.0629,
  // ... rest
}
```

Use neighborhood-appropriate coordinates with small random variance.

**Verification**: All 16 properties have valid Colombian coordinates.

### Task 6: Create Basic PropertyMap Component
**File**: `src/components/map/PropertyMap.tsx`

```tsx
'use client'

import { useRef, useCallback } from 'react'
import Map, { MapRef } from 'react-map-gl'
import type { Property } from '@/lib/types/property'

interface PropertyMapProps {
  properties: Property[]
  onMapMove?: (bounds: { north: number; south: number; east: number; west: number }) => void
  selectedPropertyId?: string | null
  onPropertySelect?: (id: string) => void
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

// Colombia center point
const INITIAL_VIEW = {
  latitude: 4.5709,
  longitude: -74.2973,
  zoom: 5,
}

export function PropertyMap({ properties, onMapMove, selectedPropertyId, onPropertySelect }: PropertyMapProps) {
  const mapRef = useRef<MapRef>(null)

  // Handle map movement to get visible bounds
  const handleMoveEnd = useCallback(() => {
    if (mapRef.current) {
      const bounds = mapRef.current.getBounds()
      onMapMove?.({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      })
    }
  }, [onMapMove])

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={INITIAL_VIEW}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      onMoveEnd={handleMoveEnd}
    >
      {/* Markers will be added in Plan 02 */}
    </Map>
  )
}
```

**Verification**: Map renders with Colombian view.

### Task 7: Create Map Barrel Export
**File**: `src/components/map/index.ts`

```tsx
export { PropertyMap } from './PropertyMap'
```

**Verification**: Map component exported.

### Task 8: Create Map Constants
**File**: `src/lib/constants/map.ts`

```tsx
// Colombia bounds for map constraints
export const COLOMBIA_BOUNDS = {
  north: 13.5,
  south: -4.5,
  east: -66.5,
  west: -82.0,
}

// City center coordinates
export const CITY_COORDINATES = {
  Bogota: { lat: 4.7110, lng: -74.0721 },
  Medellin: { lat: 6.2442, lng: -75.5812 },
  Cali: { lat: 3.4516, lng: -76.5320 },
  Barranquilla: { lat: 10.9639, lng: -74.7964 },
  Cartagena: { lat: 10.3910, lng: -75.4794 },
  Bucaramanga: { lat: 7.1254, lng: -73.1198 },
  Pereira: { lat: 4.8087, lng: -75.6906 },
  'Santa Marta': { lat: 11.2404, lng: -74.1990 },
  Manizales: { lat: 5.0689, lng: -75.5174 },
  Cucuta: { lat: 7.8939, lng: -72.5078 },
}

// Default zoom levels
export const ZOOM_LEVELS = {
  country: 5,
  city: 12,
  neighborhood: 14,
  property: 16,
}
```

**Verification**: Map constants available.

## Verification Checklist

- [ ] Property type has latitude and longitude fields
- [ ] react-map-gl and mapbox-gl installed
- [ ] Mapbox CSS imported in layout
- [ ] All mock properties have coordinates
- [ ] Basic PropertyMap component renders
- [ ] Map shows Colombia region
- [ ] Map constants defined

## Output

After completion:
1. Property type extended with coordinates
2. Mock data with realistic coordinates
3. Mapbox library configured
4. Basic map component ready for markers (Plan 02)
