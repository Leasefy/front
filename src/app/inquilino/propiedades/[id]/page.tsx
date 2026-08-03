'use client';

import { use } from 'react';

import { PropertyDetailView } from '@/components/property/PropertyDetailView';

interface TenantPropertyDetailPageProps {
  params: Promise<{ id: string }> | { id: string };
}

/**
 * Tenant property detail page.
 * Renders the shared chrome-free PropertyDetailView inside the tenant
 * sidebar/header shell (see inquilino/layout.tsx) — no marketing chrome.
 * Links back to the tenant explore listing and keeps cross-property
 * navigation inside the tenant app.
 */
export default function TenantPropertyDetailPage({ params }: TenantPropertyDetailPageProps) {
  const resolvedParams = params instanceof Promise ? use(params) : params;

  return (
    <PropertyDetailView
      propertyId={resolvedParams.id}
      basePath="/inquilino/propiedades"
      listingHref="/inquilino/explorar"
    />
  );
}
