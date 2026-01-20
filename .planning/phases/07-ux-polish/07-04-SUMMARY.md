---
phase: "07-ux-polish"
plan: "04"
title: "Property Detail Page Redesign"
subsystem: "property-catalog"
tags: ["luxterra", "accordion", "sticky-cta", "property-detail", "reusable-components"]
dependency-graph:
  requires: ["07-01"]
  provides: ["PropertyAccordion", "StickyCTA", "MobileStickyCTA", "ImageCarousel-hero"]
  affects: ["property-detail-page"]
tech-stack:
  added: []
  patterns: ["reusable-accordion-component", "sticky-cta", "hero-image-variant"]
key-files:
  created:
    - "src/components/property/PropertyAccordion.tsx"
    - "src/components/property/StickyCTA.tsx"
  modified:
    - "src/components/property/ImageCarousel.tsx"
    - "src/app/propiedades/[id]/page.tsx"
    - "tailwind.config.ts"
decisions:
  - key: "accordion-component-pattern"
    choice: "Reusable PropertyAccordion using shadcn accordion"
    rationale: "Keeps property sections consistent, enables reuse elsewhere"
  - key: "sticky-cta-separation"
    choice: "Separate StickyCTA and MobileStickyCTA components"
    rationale: "Different layouts require different implementations"
  - key: "image-grid-vs-carousel"
    choice: "Keep existing Luxterra-style image grid for hero"
    rationale: "Better visual impact than carousel for property detail"
  - key: "accordion-animations"
    choice: "Radix accordion with tailwind keyframes (0.2s ease-out)"
    rationale: "Smooth, performant animations using native CSS"
metrics:
  duration: "5 minutes"
  completed: "2026-01-20"
---

# Phase 7 Plan 04: Property Detail Page Redesign Summary

Luxterra-inspired property detail page with reusable components: accordion sections, sticky CTA, hero gallery.

## One-liner

PropertyAccordion + StickyCTA components with smooth animations, integrated into Luxterra-style property detail page.

## What Was Built

### New Components

1. **PropertyAccordion** (`src/components/property/PropertyAccordion.tsx` - 185 lines)
   - Uses shadcn accordion with Luxterra styling
   - Sections: details, location, amenities, costs, policies
   - Configurable defaultOpen array
   - Subtle hover states (bg-black/[0.02])
   - Formatted currency and area using lib/format

2. **StickyCTA** (`src/components/property/StickyCTA.tsx` - 149 lines)
   - Sticky card with lead capture form
   - Price display with admin fee breakdown
   - Wishlist and share action buttons
   - Application link with query params for lead info

3. **MobileStickyCTA** (same file)
   - Fixed bottom CTA for mobile devices
   - Compact price display with Postularme button
   - Hidden on lg breakpoint

### Modified Components

1. **ImageCarousel** - Added hero variant
   - New variant prop: 'default' | 'hero'
   - Hero: full-width, 70vh height, hover zoom
   - onImageClick callback for gallery integration
   - View all images button in hero mode
   - Larger navigation arrows in hero mode

2. **Property Detail Page** - Refactored with reusable components
   - Uses PropertyAccordion for collapsible sections
   - Uses StickyCTA and MobileStickyCTA
   - Removed inline AccordionItem (was 40 lines)
   - Reduced overall complexity
   - Maintains Luxterra image grid layout

3. **Tailwind Config** - Added accordion animations
   - accordion-down keyframe
   - accordion-up keyframe
   - Uses radix content height variable

## Commit History

| Hash | Type | Description |
|------|------|-------------|
| 7478b3b | feat | create PropertyAccordion component |
| 8c6e431 | feat | create StickyCTA component |
| 4b6502b | feat | add hero variant to ImageCarousel |
| cca6c9c | refactor | redesign property detail page with reusable components |
| 9274636 | style | add accordion animation keyframes to tailwind config |

## Verification Checklist

- [x] Accordion component installed from shadcn (already existed)
- [x] PropertyAccordion renders all sections (185 lines > 60 min)
- [x] StickyCTA stays visible on scroll (sticky top-28)
- [x] ImageCarousel has hero variant
- [x] Page has two-column layout on desktop (lg:grid-cols-12)
- [x] Mobile view stacks columns properly (grid-cols-1)
- [x] Animations are smooth (0.2s ease-out)

## Deviations from Plan

### [Rule 3 - Blocking] Accordion already installed

**Found during:** Task 1
**Issue:** shadcn accordion component already existed
**Fix:** Skipped installation, used existing component
**Files modified:** None
**Commit:** N/A

### Design Decision: Keep Image Grid

**Found during:** Task 5
**Issue:** Plan suggested ImageCarousel hero variant, but existing image grid was superior
**Fix:** Kept Luxterra-style image grid for hero, added hero variant to ImageCarousel for future use
**Rationale:** Image grid with 3 images provides better visual impact than single-image carousel

## Notes

- Property detail page reduced from 479 lines to 283 lines (-41%)
- PropertyAccordion includes policies section (pet policy, contract terms, deposit info)
- Gallery images now clickable with hover effects
- MobileStickyCTA has higher z-index (z-30) to appear above footer
- All Spanish text without accents per project convention
