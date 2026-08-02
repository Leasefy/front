'use client';

import { use } from 'react';

import { Navbar } from '@/components/layout/Navbar';
import { FooterCompact } from '@/components/layout/FooterCompact';
import { PropertyDetailView } from '@/components/property/PropertyDetailView';

interface PropertyDetailPageProps {
  params: Promise<{ id: string }> | { id: string };
}

/**
 * Public property detail page — thin wrapper.
 * Renders the public chrome (Navbar + compact footer) around the shared
 * chrome-free PropertyDetailView.
 */
export default function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  const resolvedParams = params instanceof Promise ? use(params) : params;

  return (
    <>
      <Navbar />
      <main id="main-content">
        <PropertyDetailView
          propertyId={resolvedParams.id}
          basePath="/propiedades"
          listingHref="/propiedades"
        />
      </main>
      <FooterCompact />
    </>
  );
}
