---
phase: "07-ux-polish"
plan: "04"
title: "Property Detail Page Redesign"
wave: 2
autonomous: true
must_haves:
  truths:
    - "Full-width image gallery at top of page"
    - "Two-column layout with info left, sticky CTA right"
    - "Property sections use accordion pattern"
    - "Postularme CTA is sticky on scroll"
  artifacts:
    - path: "src/app/propiedades/[id]/page.tsx"
      description: "Redesigned property detail page"
      min_lines: 150
    - path: "src/components/property/PropertyAccordion.tsx"
      description: "Accordion for property sections"
      min_lines: 60
    - path: "src/components/ui/accordion.tsx"
      description: "shadcn accordion component"
      min_lines: 40
  key_links:
    - from: "propiedades/[id]/page"
      to: "PropertyAccordion"
      via: "direct import"
    - from: "PropertyAccordion"
      to: "accordion.tsx"
      via: "shadcn component"
---

# Plan 04: Property Detail Page Redesign

## Objective

Redesign the property detail page with Luxterra-inspired layout: hero gallery, accordion sections, sticky CTA.

## Context

Current property detail page is functional but basic. This redesign creates a premium feel:
- Full-width image gallery (hero-style)
- Two-column layout below fold
- Collapsible sections for content organization
- Sticky CTA card for easy conversion

### Current Layout
```
[Header]
[Image Carousel - contained width]
[Property Info - full width]
[Postularme Button - inline]
```

### Target Layout
```
[Header]
[Full-width Image Gallery - hero style]
[Two Columns:]
  [Left 60%: Accordion sections]
  [Right 40%: Sticky CTA card]
```

## Tasks

### Task 1: Install Accordion Component
**Command**: `npx shadcn@latest add accordion`

Install shadcn accordion component for collapsible sections.

**Verification**: `src/components/ui/accordion.tsx` exists.

### Task 2: Create PropertyAccordion Component
**File**: `src/components/property/PropertyAccordion.tsx`

Create accordion for property sections:
```tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Property } from '@/lib/types/property';

interface PropertyAccordionProps {
  property: Property;
}

export function PropertyAccordion({ property }: PropertyAccordionProps) {
  return (
    <Accordion type="multiple" defaultValue={['description', 'features']}>
      <AccordionItem value="description">
        <AccordionTrigger>Descripción</AccordionTrigger>
        <AccordionContent>
          <p className="text-muted-foreground">{property.description}</p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="features">
        <AccordionTrigger>Características</AccordionTrigger>
        <AccordionContent>
          {/* Beds, baths, area, amenities */}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="location">
        <AccordionTrigger>Ubicación</AccordionTrigger>
        <AccordionContent>
          {/* Map placeholder, neighborhood info */}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="policies">
        <AccordionTrigger>Políticas</AccordionTrigger>
        <AccordionContent>
          {/* Pet policy, smoking, etc. */}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
```

**Verification**: Accordion sections expand/collapse smoothly.

### Task 3: Create StickyCTA Component
**File**: `src/components/property/StickyCTA.tsx`

Create sticky CTA card for right column:
```tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatPrice } from '@/lib/format';
import Link from 'next/link';

interface StickyCTAProps {
  propertyId: string;
  price: number;
  adminFee?: number;
}

export function StickyCTA({ propertyId, price, adminFee }: StickyCTAProps) {
  return (
    <Card className="sticky top-24">
      <CardHeader>
        <div className="text-2xl font-bold">{formatPrice(price)}</div>
        <div className="text-sm text-muted-foreground">/mes</div>
        {adminFee && (
          <div className="text-sm text-muted-foreground">
            + {formatPrice(adminFee)} administración
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full" size="lg">
          <Link href={`/aplicar/${propertyId}`}>
            Postularme
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-3">
          Proceso 100% en línea
        </p>
      </CardContent>
    </Card>
  );
}
```

**Verification**: CTA card stays visible while scrolling.

### Task 4: Update ImageCarousel for Hero Mode
**File**: `src/components/property/ImageCarousel.tsx`

Add hero variant for full-width display:
```tsx
interface ImageCarouselProps {
  images: string[];
  variant?: 'default' | 'hero';
}

// Hero variant: full-width, taller, edge-to-edge
// Default variant: contained width (existing behavior)
```

**Verification**: Hero variant displays full-width images.

### Task 5: Redesign Property Detail Page
**File**: `src/app/propiedades/[id]/page.tsx`

Restructure page layout:
```tsx
export default function PropertyDetailPage({ params }) {
  const property = getPropertyById(params.id);

  return (
    <div>
      {/* Hero Gallery - full width */}
      <div className="w-full -mx-4 md:-mx-8 lg:-mx-16">
        <ImageCarousel images={property.images} variant="hero" />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-8">
        {/* Left Column - Info */}
        <div className="lg:col-span-3">
          <h1 className="text-2xl font-bold mb-2">{property.title}</h1>
          <p className="text-muted-foreground mb-6">{property.location}</p>

          <PropertyAccordion property={property} />
        </div>

        {/* Right Column - Sticky CTA */}
        <div className="lg:col-span-2">
          <StickyCTA
            propertyId={property.id}
            price={property.price}
            adminFee={property.adminFee}
          />
        </div>
      </div>
    </div>
  );
}
```

**Verification**: Two-column layout with hero gallery and sticky CTA.

### Task 6: Add Smooth Transitions
**File**: `src/components/property/PropertyAccordion.tsx`

Ensure accordion has smooth animations:
```tsx
// AccordionContent with transition
<AccordionContent className="transition-all data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
```

**Verification**: Accordion animations are smooth.

## Verification Checklist

- [ ] Accordion component installed from shadcn
- [ ] PropertyAccordion renders all sections
- [ ] StickyCTA stays visible on scroll
- [ ] ImageCarousel has hero variant
- [ ] Page has two-column layout on desktop
- [ ] Mobile view stacks columns properly
- [ ] Animations are smooth

## Output

After completion:
1. Property detail page has premium Luxterra-inspired layout
2. Information organized in collapsible sections
3. CTA is always visible for conversion
4. Ready for AI search enhancement
