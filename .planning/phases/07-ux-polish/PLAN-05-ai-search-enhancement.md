---
phase: "07-ux-polish"
plan: "05"
title: "AI Search Enhancement"
wave: 2
autonomous: true
must_haves:
  truths:
    - "AI search input has conversational feel with larger size"
    - "Loading state shows 'Buscando...' message with animation"
    - "Search results animate in smoothly"
    - "Load More pagination button works"
  artifacts:
    - path: "src/components/property/AISearchInput.tsx"
      description: "Enhanced conversational AI search input"
      min_lines: 80
    - path: "src/components/property/PropertyGrid.tsx"
      description: "Grid with Load More pagination"
      min_lines: 100
  key_links:
    - from: "AISearchInput"
      to: "PropertyGrid"
      via: "filter state updates"
    - from: "PropertyGrid"
      to: "Load More button"
      via: "pagination state"
---

# Plan 05: AI Search Enhancement

## Objective

Create a ChatGPT-style AI search experience with conversational feel and smooth animations.

## Context

The current AI search is functional but basic. This enhancement creates:
- Larger, centered input with conversational placeholder
- Loading state with "Buscando el inmueble de tus sueños..." message
- Animated reveal of search results
- Load More pagination (Luxterra pattern)

### Current State
- AISearchInput with chip suggestions
- Filter integration working
- No loading animation
- No pagination

### Target State
- Conversational input with typing feel
- Animated loading state
- Smooth result transitions
- "Cargar más" button for pagination

## Tasks

### Task 1: Enhance AISearchInput UI
**File**: `src/components/property/AISearchInput.tsx`

Make input more conversational:
```tsx
// Larger input with conversational placeholder
<div className="relative max-w-2xl mx-auto">
  <div className="absolute left-4 top-1/2 -translate-y-1/2">
    <Sparkles className="h-5 w-5 text-primary" />
  </div>
  <Input
    className="pl-12 pr-4 py-6 text-lg rounded-full border-2 focus:border-primary"
    placeholder="Describe tu hogar ideal..."
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
  />
  <Button
    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
    size="sm"
    onClick={handleSearch}
  >
    Buscar
  </Button>
</div>
```

**Verification**: Input has sparkle icon, larger size, rounded style.

### Task 2: Add Loading State Animation
**File**: `src/components/property/AISearchInput.tsx`

Add animated loading message:
```tsx
const [isSearching, setIsSearching] = useState(false);

const handleSearch = async () => {
  setIsSearching(true);
  // Simulate AI processing
  await new Promise(resolve => setTimeout(resolve, 1200));
  // Apply filters
  setIsSearching(false);
};

{isSearching && (
  <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground animate-pulse">
    <Loader2 className="h-4 w-4 animate-spin" />
    <span>Buscando el inmueble de tus sueños...</span>
  </div>
)}
```

**Verification**: Loading message appears with spinner during search.

### Task 3: Add Result Animation
**File**: `src/components/property/PropertyGrid.tsx`

Animate result appearance using Framer Motion:
```tsx
import { motion, AnimatePresence } from 'framer-motion';

<AnimatePresence mode="popLayout">
  {properties.map((property, index) => (
    <motion.div
      key={property.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
    >
      <PropertyCard property={property} />
    </motion.div>
  ))}
</AnimatePresence>
```

**Verification**: Cards animate in with staggered fade-up effect.

### Task 4: Add Load More Pagination
**File**: `src/components/property/PropertyGrid.tsx`

Add pagination state and button:
```tsx
interface PropertyGridProps {
  properties: Property[];
  isLoading?: boolean;
  pageSize?: number;
}

export function PropertyGrid({ properties, isLoading, pageSize = 9 }) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const visibleProperties = properties.slice(0, visibleCount);
  const hasMore = visibleCount < properties.length;

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setVisibleCount(prev => prev + 6);
    setIsLoadingMore(false);
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleProperties.map(property => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-8">
          <Button
            variant="outline"
            size="lg"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cargando...
              </>
            ) : (
              `Cargar más (${properties.length - visibleCount} restantes)`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Verification**: "Cargar más" button loads more properties.

### Task 5: Enhance Example Chips
**File**: `src/components/property/AISearchInput.tsx`

Improve chip styling and examples:
```tsx
const EXAMPLE_SEARCHES = [
  "Apartamento en Bogotá con 2 habitaciones",
  "Casa con piscina en Medellín",
  "Estudio económico en Chapinero",
  "3 habitaciones cerca al parque",
];

<div className="flex flex-wrap justify-center gap-2 mt-4">
  {EXAMPLE_SEARCHES.map((example) => (
    <button
      key={example}
      onClick={() => {
        setQuery(example);
        handleSearch();
      }}
      className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-full transition-colors"
    >
      {example}
    </button>
  ))}
</div>
```

**Verification**: Chips are clickable and trigger search.

### Task 6: Add Search Result Summary
**File**: `src/app/propiedades/page.tsx`

Show result count after search:
```tsx
{filteredProperties.length > 0 && (
  <p className="text-muted-foreground mb-4">
    {filteredProperties.length} propiedades encontradas
  </p>
)}
```

**Verification**: Result count displayed after filtering.

## Verification Checklist

- [ ] AISearchInput has conversational feel with sparkle icon
- [ ] Loading state shows "Buscando..." with animation
- [ ] Search results animate in with staggered effect
- [ ] "Cargar más" button loads additional properties
- [ ] Example chips trigger search on click
- [ ] Result count shows after search

## Output

After completion:
1. ChatGPT-style AI search experience
2. Smooth loading and result animations
3. Load More pagination pattern
4. Premium conversational feel
