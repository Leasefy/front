'use client';

import { use } from 'react';
import { useSearchParams } from 'next/navigation';

import { PropertyDetailView } from '@/components/property/PropertyDetailView';

interface TenantPropertyDetailPageProps {
  params: Promise<{ id: string }> | { id: string };
}

/**
 * Tenant property detail page.
 * Renders the shared chrome-free PropertyDetailView inside the tenant
 * sidebar/header shell (see inquilino/layout.tsx) — no marketing chrome.
 *
 * El breadcrumb respeta de dónde vino. Quien entra desde su catálogo
 * ("Para ti") volvía a "Propiedades" → Explorar: una migaja que no tenía nada
 * que ver con su recorrido, y que lo sacaba del listado con su tope aplicado.
 */
export default function TenantPropertyDetailPage({ params }: TenantPropertyDetailPageProps) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const desdeParaTi = useSearchParams().get('from') === 'para-ti';

  return (
    <PropertyDetailView
      propertyId={resolvedParams.id}
      basePath="/inquilino/propiedades"
      listingHref={desdeParaTi ? '/inquilino/para-ti' : '/inquilino/explorar'}
      listingLabel={desdeParaTi ? 'Para ti' : 'Explorar'}
    />
  );
}
