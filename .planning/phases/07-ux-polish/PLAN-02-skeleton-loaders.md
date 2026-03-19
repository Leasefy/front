---
phase: "07-ux-polish"
plan: "02"
title: "Skeleton Loaders & Loading States"
wave: 1
autonomous: true
must_haves:
  truths:
    - "Property grid shows skeleton cards while loading"
    - "Property detail page has skeleton for image and content"
    - "Landlord dashboard shows skeleton for candidate cards"
    - "Tenant applications page shows skeleton while loading"
  artifacts:
    - path: "src/components/skeleton/PropertyCardSkeleton.tsx"
      description: "Skeleton matching PropertyCard shape"
      min_lines: 30
    - path: "src/components/skeleton/PropertyDetailSkeleton.tsx"
      description: "Skeleton for property detail page"
      min_lines: 40
    - path: "src/components/skeleton/CandidateCardSkeleton.tsx"
      description: "Skeleton for candidate cards"
      min_lines: 30
    - path: "src/components/skeleton/ApplicationCardSkeleton.tsx"
      description: "Skeleton for tenant application cards"
      min_lines: 30
  key_links:
    - from: "PropertyGrid"
      to: "PropertyCardSkeleton"
      via: "loading state prop"
    - from: "propiedades/[id]/page"
      to: "PropertyDetailSkeleton"
      via: "Suspense boundary"
---

# Plan 02: Skeleton Loaders & Loading States

## Objective

Add skeleton loaders to all list and detail views for perceived performance.

## Context

Skeletons provide visual feedback during data loading. For a frontend-only app with mock data, we simulate loading states to demonstrate the pattern.

### Existing Components
- `src/components/ui/skeleton.tsx` - Base skeleton component from shadcn
- PropertyCard, CandidateCard, ApplicationCard - Target components

### Pattern to Follow
Use shadcn Skeleton component with matching dimensions:
```tsx
<Skeleton className="h-48 w-full rounded-md" /> // Image area
<Skeleton className="h-4 w-3/4" /> // Title
<Skeleton className="h-3 w-1/2" /> // Subtitle
```

## Tasks

### Task 1: Create PropertyCardSkeleton
**File**: `src/components/skeleton/PropertyCardSkeleton.tsx`

Match PropertyCard structure:
```tsx
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function PropertyCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-48 w-full" /> {/* Image */}
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" /> {/* Title */}
        <Skeleton className="h-4 w-1/2" /> {/* Location */}
        <div className="flex gap-4">
          <Skeleton className="h-4 w-16" /> {/* Beds */}
          <Skeleton className="h-4 w-16" /> {/* Baths */}
          <Skeleton className="h-4 w-16" /> {/* Area */}
        </div>
        <Skeleton className="h-6 w-32" /> {/* Price */}
      </CardContent>
    </Card>
  );
}
```

**Verification**: Skeleton matches PropertyCard dimensions.

### Task 2: Create PropertyDetailSkeleton
**File**: `src/components/skeleton/PropertyDetailSkeleton.tsx`

Match property detail page structure:
- Image carousel skeleton
- Title/location skeleton
- Amenities grid skeleton
- Description skeleton

**Verification**: Skeleton matches detail page layout.

### Task 3: Create CandidateCardSkeleton
**File**: `src/components/skeleton/CandidateCardSkeleton.tsx`

Match CandidateCard structure:
- Avatar skeleton
- Name/badge skeleton
- Metrics skeleton
- Buttons skeleton

**Verification**: Skeleton matches CandidateCard dimensions.

### Task 4: Create ApplicationCardSkeleton
**File**: `src/components/skeleton/ApplicationCardSkeleton.tsx`

Match ApplicationCard structure:
- Property thumbnail skeleton
- Title/status skeleton
- Date/tracking code skeleton

**Verification**: Skeleton matches ApplicationCard dimensions.

### Task 5: Create Skeleton Barrel Export
**File**: `src/components/skeleton/index.ts`

Export all skeletons:
```tsx
export { PropertyCardSkeleton } from './PropertyCardSkeleton';
export { PropertyDetailSkeleton } from './PropertyDetailSkeleton';
export { CandidateCardSkeleton } from './CandidateCardSkeleton';
export { ApplicationCardSkeleton } from './ApplicationCardSkeleton';
```

### Task 6: Add Loading State to PropertyGrid
**File**: `src/components/property/PropertyGrid.tsx`

Add isLoading prop with skeleton display:
```tsx
interface PropertyGridProps {
  properties: Property[];
  isLoading?: boolean;
}

// When isLoading, show 6 PropertyCardSkeletons
```

**Verification**: PropertyGrid shows skeletons when loading.

### Task 7: Add Demo Loading State
**File**: `src/app/propiedades/page.tsx`

Add simulated loading state to demonstrate skeletons:
```tsx
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  // Simulate initial load
  const timer = setTimeout(() => setIsLoading(false), 800);
  return () => clearTimeout(timer);
}, []);
```

**Verification**: Page shows skeleton briefly on load.

## Verification Checklist

- [ ] All 4 skeleton components created
- [ ] Skeletons match actual component dimensions
- [ ] PropertyGrid accepts isLoading prop
- [ ] Demo loading state works on /propiedades
- [ ] Animations are smooth (pulse effect)

## Output

After completion:
1. Skeleton components ready for all major views
2. Loading pattern demonstrated
3. Ready for empty states in Plan 03
