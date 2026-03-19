---
phase: "07-ux-polish"
plan: "03"
title: "Empty States & Error States"
wave: 1
autonomous: true
must_haves:
  truths:
    - "Empty property list shows helpful message with CTA"
    - "Empty wishlist shows message to browse properties"
    - "Empty applications shows message to apply"
    - "Error states have recovery actions"
  artifacts:
    - path: "src/components/ui/empty-state.tsx"
      description: "Reusable empty state component"
      min_lines: 40
    - path: "src/components/ui/error-state.tsx"
      description: "Reusable error state component"
      min_lines: 40
  key_links:
    - from: "PropertyGrid"
      to: "EmptyState"
      via: "empty condition render"
    - from: "page components"
      to: "ErrorState"
      via: "error boundary"
---

# Plan 03: Empty States & Error States

## Objective

Add helpful empty states and error recovery UI across the application.

## Context

Empty states guide users to take action. Error states provide recovery paths. Both are essential for professional UX.

### Pages Needing Empty States
1. `/propiedades` - No properties match filters
2. Wishlist (localStorage empty)
3. `/mis-aplicaciones` - No applications yet
4. `/panel/[propertyId]` - No candidates yet

### Error Scenarios
1. Property not found (404)
2. General page error
3. Network/loading failure (simulated)

## Tasks

### Task 1: Create EmptyState Component
**File**: `src/components/ui/empty-state.tsx`

Create reusable empty state:
```tsx
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>
      {action && (
        <Button asChild>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
```

**Verification**: Component renders icon, text, and optional CTA.

### Task 2: Create ErrorState Component
**File**: `src/components/ui/error-state.tsx`

Create error state with recovery:
```tsx
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Algo salió mal",
  description = "No pudimos cargar esta página. Por favor intenta de nuevo.",
  onRetry
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Intentar de nuevo
        </Button>
      )}
    </div>
  );
}
```

**Verification**: Component shows error with retry button.

### Task 3: Add Empty State to PropertyGrid
**File**: `src/components/property/PropertyGrid.tsx`

Add empty state when no properties match:
```tsx
import { EmptyState } from '@/components/ui/empty-state';
import { Search } from 'lucide-react';

// When properties.length === 0 and not loading:
<EmptyState
  icon={Search}
  title="No encontramos propiedades"
  description="Intenta ajustar los filtros para ver más opciones."
  action={{ label: "Limpiar filtros", href: "/propiedades" }}
/>
```

**Verification**: Empty message shows when filters return no results.

### Task 4: Add Empty State to Mis Aplicaciones
**File**: `src/app/mis-aplicaciones/page.tsx`

Add empty state when no applications:
```tsx
import { EmptyState } from '@/components/ui/empty-state';
import { FileText } from 'lucide-react';

// When applications.length === 0:
<EmptyState
  icon={FileText}
  title="No tienes aplicaciones aún"
  description="Explora propiedades y envía tu primera aplicación."
  action={{ label: "Explorar propiedades", href: "/propiedades" }}
/>
```

**Verification**: Empty state guides to property listing.

### Task 5: Add Empty State to Landlord Candidates
**File**: `src/app/panel/[propertyId]/page.tsx`

Add empty state when no candidates:
```tsx
import { EmptyState } from '@/components/ui/empty-state';
import { Users } from 'lucide-react';

// When candidates.length === 0:
<EmptyState
  icon={Users}
  title="Sin candidatos aún"
  description="Los candidatos aparecerán aquí cuando apliquen a esta propiedad."
/>
```

**Verification**: Empty state explains next steps.

### Task 6: Create NotFound Component
**File**: `src/components/ui/not-found.tsx`

Create 404 component for property not found:
```tsx
import { EmptyState } from './empty-state';
import { Home } from 'lucide-react';

export function NotFound() {
  return (
    <EmptyState
      icon={Home}
      title="Propiedad no encontrada"
      description="Esta propiedad ya no está disponible o la URL es incorrecta."
      action={{ label: "Ver todas las propiedades", href: "/propiedades" }}
    />
  );
}
```

**Verification**: 404 provides helpful navigation.

### Task 7: Export UI Components
**File**: `src/components/ui/index.ts` (or add to existing)

Ensure empty-state and error-state are exported:
```tsx
export { EmptyState } from './empty-state';
export { ErrorState } from './error-state';
export { NotFound } from './not-found';
```

## Verification Checklist

- [ ] EmptyState component created with icon, title, description, CTA
- [ ] ErrorState component created with retry functionality
- [ ] PropertyGrid shows empty state when no properties
- [ ] Mis Aplicaciones shows empty state when no applications
- [ ] Panel shows empty state when no candidates
- [ ] NotFound component created for 404 scenarios

## Output

After completion:
1. Consistent empty states across all list views
2. Error recovery patterns established
3. Professional UX for edge cases
