'use client';

import { Suspense } from 'react';
import { PropertySearchView } from '@/components/property/PropertySearchView';

/**
 * Tenant property search - embedded within the tenant dashboard layout.
 * Same search experience as /propiedades but stays within the platform.
 */
export default function ExplorarPage() {
  return (
    <Suspense>
      <PropertySearchView embedded />
    </Suspense>
  );
}
