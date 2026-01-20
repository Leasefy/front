---
phase: "09-interactive-map"
plan: "02"
title: "Map Integration - Markers, Clustering & Split Layout"
wave: 1
autonomous: true
must_haves:
  truths:
    - "Split layout with property list (left) and map (right) on desktop"
    - "Property markers show rent price as label"
    - "Clusters show property count at low zoom levels"
    - "Click on marker filters/highlights property in list"
    - "Map bounds sync with visible properties"
    - "Mobile toggle button to show/hide map"
  artifacts:
    - path: "src/components/map/PriceMarker.tsx"
      description: "Custom marker with price label"
      min_lines: 40
    - path: "src/components/map/ClusterMarker.tsx"
      description: "Cluster marker with count"
      min_lines: 30
    - path: "src/app/propiedades/page.tsx"
      description: "Updated with split layout"
      min_lines: 150
  key_links:
    - from: "propiedades/page.tsx"
      to: "PropertyMap"
      via: "split layout composition"
    - from: "PropertyMap"
      to: "PriceMarker"
      via: "marker rendering"
---

# Plan 02: Map Integration - Markers, Clustering & Split Layout

## Objective

Implement Airbnb-style map with price markers, clustering, and bidirectional interaction with property list.

## Context

Plan 01 set up the foundation. Now we implement:
1. Custom price markers (pill-shaped with rent amount)
2. Cluster markers (circle with count)
3. Split layout for propiedades page
4. Bidirectional sync (map ↔ list)
5. Mobile toggle

### Design Specifications

**Price Marker:**
- Pill shape: bg-slate-800, text-white, rounded-full
- Shows formatted price: "$2.5M"
- Hover: scale-110, shadow-lg
- Selected: ring-2 ring-primary, scale-110

**Cluster Marker:**
- Circle: bg-primary, text-white
- Shows count: "15"
- Click: zoom to cluster bounds

**Layout:**
- Desktop: 55% list, 45% map
- Tablet: 60% list, 40% map
- Mobile: List only, "Mapa" toggle button

## Tasks

### Task 1: Install Supercluster for Clustering
**Command**: `pnpm add supercluster @types/supercluster`

Supercluster provides efficient point clustering for maps.

**Verification**: supercluster installed.

### Task 2: Create PriceMarker Component
**File**: `src/components/map/PriceMarker.tsx`

```tsx
'use client'

import { formatPrice } from '@/lib/format'

interface PriceMarkerProps {
  price: number
  isSelected?: boolean
  isHovered?: boolean
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export function PriceMarker({
  price,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: PriceMarkerProps) {
  // Format price: 2500000 -> "$2.5M"
  const formattedPrice = formatCompactPrice(price)

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        'px-3 py-1.5 rounded-full text-sm font-medium',
        'bg-slate-800 text-white',
        'shadow-md hover:shadow-lg',
        'transition-all duration-150',
        'hover:scale-110',
        isSelected && 'ring-2 ring-primary scale-110 bg-primary',
        isHovered && 'scale-110 z-10'
      )}
    >
      {formattedPrice}
    </button>
  )
}

// Helper to format price compactly: 2500000 -> "$2.5M"
function formatCompactPrice(price: number): string {
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(1)}M`
  }
  if (price >= 1000) {
    return `$${Math.round(price / 1000)}K`
  }
  return `$${price}`
}
```

**Verification**: PriceMarker renders with proper styling.

### Task 3: Create ClusterMarker Component
**File**: `src/components/map/ClusterMarker.tsx`

```tsx
'use client'

interface ClusterMarkerProps {
  count: number
  onClick?: () => void
}

export function ClusterMarker({ count, onClick }: ClusterMarkerProps) {
  // Size based on count
  const size = count > 100 ? 'w-12 h-12' : count > 10 ? 'w-10 h-10' : 'w-8 h-8'

  return (
    <button
      onClick={onClick}
      className={cn(
        size,
        'rounded-full flex items-center justify-center',
        'bg-primary text-white font-semibold',
        'shadow-md hover:shadow-lg',
        'transition-all duration-150 hover:scale-110',
        'text-sm'
      )}
    >
      {count > 99 ? '99+' : count}
    </button>
  )
}
```

**Verification**: ClusterMarker renders with count.

### Task 4: Create useSupercluster Hook
**File**: `src/lib/hooks/useSupercluster.ts`

```tsx
import { useMemo, useRef } from 'react'
import Supercluster from 'supercluster'
import type { Property } from '@/lib/types/property'

interface ClusterPoint {
  type: 'cluster'
  id: number
  properties: {
    cluster: true
    cluster_id: number
    point_count: number
  }
  geometry: { coordinates: [number, number] }
}

interface PropertyPoint {
  type: 'property'
  id: string
  properties: Property
  geometry: { coordinates: [number, number] }
}

export type MapPoint = ClusterPoint | PropertyPoint

export function useSupercluster(
  properties: Property[],
  bounds: { north: number; south: number; east: number; west: number } | null,
  zoom: number
) {
  const superclusterRef = useRef<Supercluster | null>(null)

  const points: MapPoint[] = useMemo(() => {
    if (!bounds || !properties.length) return []

    // Create GeoJSON points from properties
    const geoPoints = properties.map((property) => ({
      type: 'Feature' as const,
      properties: { ...property },
      geometry: {
        type: 'Point' as const,
        coordinates: [property.longitude, property.latitude],
      },
    }))

    // Initialize supercluster
    const index = new Supercluster({
      radius: 60,
      maxZoom: 14,
    })
    index.load(geoPoints)
    superclusterRef.current = index

    // Get clusters for current view
    const clusters = index.getClusters(
      [bounds.west, bounds.south, bounds.east, bounds.north],
      Math.floor(zoom)
    )

    return clusters.map((cluster) => {
      const [lng, lat] = cluster.geometry.coordinates
      if (cluster.properties.cluster) {
        return {
          type: 'cluster' as const,
          id: cluster.properties.cluster_id,
          properties: {
            cluster: true,
            cluster_id: cluster.properties.cluster_id,
            point_count: cluster.properties.point_count,
          },
          geometry: { coordinates: [lng, lat] as [number, number] },
        }
      }
      return {
        type: 'property' as const,
        id: cluster.properties.id,
        properties: cluster.properties as Property,
        geometry: { coordinates: [lng, lat] as [number, number] },
      }
    })
  }, [properties, bounds, zoom])

  const getClusterExpansionZoom = (clusterId: number) => {
    return superclusterRef.current?.getClusterExpansionZoom(clusterId) ?? zoom + 2
  }

  return { points, getClusterExpansionZoom }
}
```

**Verification**: Clustering logic works.

### Task 5: Update PropertyMap with Markers
**File**: `src/components/map/PropertyMap.tsx`

Add marker rendering with clustering:
```tsx
import { Marker } from 'react-map-gl'
import { useSupercluster } from '@/lib/hooks/useSupercluster'
import { PriceMarker } from './PriceMarker'
import { ClusterMarker } from './ClusterMarker'

// Inside component:
const [bounds, setBounds] = useState(null)
const [zoom, setZoom] = useState(INITIAL_VIEW.zoom)

const { points, getClusterExpansionZoom } = useSupercluster(
  properties,
  bounds,
  zoom
)

const handleMoveEnd = useCallback(() => {
  if (mapRef.current) {
    const map = mapRef.current.getMap()
    const mapBounds = map.getBounds()
    setBounds({
      north: mapBounds.getNorth(),
      south: mapBounds.getSouth(),
      east: mapBounds.getEast(),
      west: mapBounds.getWest(),
    })
    setZoom(map.getZoom())
    onMapMove?.(bounds)
  }
}, [onMapMove])

// Render markers
{points.map((point) => {
  const [lng, lat] = point.geometry.coordinates

  if (point.type === 'cluster') {
    return (
      <Marker key={`cluster-${point.id}`} longitude={lng} latitude={lat}>
        <ClusterMarker
          count={point.properties.point_count}
          onClick={() => {
            const expansionZoom = getClusterExpansionZoom(point.id)
            mapRef.current?.flyTo({ center: [lng, lat], zoom: expansionZoom })
          }}
        />
      </Marker>
    )
  }

  return (
    <Marker key={point.id} longitude={lng} latitude={lat}>
      <PriceMarker
        price={point.properties.monthlyRent}
        isSelected={selectedPropertyId === point.id}
        onClick={() => onPropertySelect?.(point.id)}
      />
    </Marker>
  )
})}
```

**Verification**: Markers render with clustering behavior.

### Task 6: Create MapToggle Component for Mobile
**File**: `src/components/map/MapToggle.tsx`

```tsx
'use client'

import { Map, List } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MapToggleProps {
  showMap: boolean
  onToggle: () => void
}

export function MapToggle({ showMap, onToggle }: MapToggleProps) {
  return (
    <Button
      onClick={onToggle}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden shadow-lg"
      size="lg"
    >
      {showMap ? (
        <>
          <List className="w-4 h-4 mr-2" />
          Ver lista
        </>
      ) : (
        <>
          <Map className="w-4 h-4 mr-2" />
          Ver mapa
        </>
      )}
    </Button>
  )
}
```

**Verification**: Toggle button works on mobile.

### Task 7: Update Propiedades Page with Split Layout
**File**: `src/app/propiedades/page.tsx`

Implement split layout:
```tsx
// State for map interaction
const [mapBounds, setMapBounds] = useState(null)
const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
const [showMap, setShowMap] = useState(false) // Mobile toggle
const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null)

// Filter properties by map bounds (if map is controlling view)
const visibleProperties = useMemo(() => {
  if (!mapBounds) return filteredProperties
  return filteredProperties.filter((p) =>
    p.latitude >= mapBounds.south &&
    p.latitude <= mapBounds.north &&
    p.longitude >= mapBounds.west &&
    p.longitude <= mapBounds.east
  )
}, [filteredProperties, mapBounds])

// Layout
<div className="flex min-h-screen">
  {/* List Panel */}
  <div className={cn(
    'w-full lg:w-[55%] overflow-auto',
    showMap && 'hidden lg:block'
  )}>
    {/* Existing filter bar and grid */}
    <PropertyGrid
      properties={visibleProperties}
      selectedId={selectedPropertyId}
      hoveredId={hoveredPropertyId}
      onHover={setHoveredPropertyId}
    />
  </div>

  {/* Map Panel */}
  <div className={cn(
    'w-full lg:w-[45%] h-screen lg:sticky lg:top-0',
    !showMap && 'hidden lg:block'
  )}>
    <PropertyMap
      properties={filteredProperties}
      selectedPropertyId={selectedPropertyId}
      hoveredPropertyId={hoveredPropertyId}
      onPropertySelect={(id) => {
        setSelectedPropertyId(id)
        // Scroll to property in list
      }}
      onMapMove={setMapBounds}
    />
  </div>

  {/* Mobile Toggle */}
  <MapToggle showMap={showMap} onToggle={() => setShowMap(!showMap)} />
</div>
```

**Verification**: Split layout works on desktop, toggle on mobile.

### Task 8: Add Hover Sync Between List and Map
**File**: `src/components/property/PropertyCard.tsx`

Add hover handlers:
```tsx
interface PropertyCardProps {
  property: Property
  onHoverStart?: () => void
  onHoverEnd?: () => void
  isHighlighted?: boolean
}

// Add to card:
onMouseEnter={onHoverStart}
onMouseLeave={onHoverEnd}
className={cn(..., isHighlighted && 'ring-2 ring-primary')}
```

**Verification**: Hovering card highlights marker, hovering marker highlights card.

### Task 9: Add Scroll-to-Property on Marker Click
**File**: `src/app/propiedades/page.tsx`

```tsx
const propertyRefs = useRef<Record<string, HTMLDivElement>>({})

const handlePropertySelect = (id: string) => {
  setSelectedPropertyId(id)
  // Scroll property into view
  propertyRefs.current[id]?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
}

// In PropertyGrid, pass ref callback
<div ref={(el) => { if (el) propertyRefs.current[property.id] = el }}>
  <PropertyCard ... />
</div>
```

**Verification**: Clicking marker scrolls list to that property.

### Task 10: Update Map Barrel Export
**File**: `src/components/map/index.ts`

```tsx
export { PropertyMap } from './PropertyMap'
export { PriceMarker } from './PriceMarker'
export { ClusterMarker } from './ClusterMarker'
export { MapToggle } from './MapToggle'
```

**Verification**: All map components exported.

## Verification Checklist

- [ ] Split layout: list (55%) | map (45%) on desktop
- [ ] Property markers show price labels ("$2.5M")
- [ ] Clusters show count at low zoom
- [ ] Click cluster zooms in
- [ ] Click marker selects property and scrolls in list
- [ ] Hover card highlights marker
- [ ] Hover marker highlights card
- [ ] Mobile: toggle between list and map
- [ ] Map respects active filters

## Output

After completion:
1. Full Airbnb-style interactive map
2. Bidirectional list ↔ map interaction
3. Clustering for performance
4. Responsive mobile experience
