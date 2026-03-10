'use client';

import { Suspense } from 'react';
import { PropertySearchView } from '@/components/property/PropertySearchView';

/**
 * Public property listing page with full-height split layout
 * - Left: AI search + filters + property grid (scrollable)
 * - Right: Map (fixed, full height)
 */
export default function PropiedadesPage() {
  return (
    <Suspense>
      <PropertySearchView />
    </Suspense>
  );
}
