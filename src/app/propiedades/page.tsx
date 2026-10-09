'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LandingChrome } from '@/components/landing-v2/LandingChrome';
import { PortadaDelMarketplace } from '@/components/marketplace/PortadaDelMarketplace';
import { PropertySearchView } from '@/components/property/PropertySearchView';
import { hayBusqueda, leerBusqueda } from '@/lib/marketplace/busqueda';
import { I18nProvider } from '@/lib/i18n';

/**
 * Buscar inmueble — el marketplace público (Nico, 09-10-2026).
 *
 * Sin nada buscado, la portada: «Buscar» o «Publicar», con IA o sin IA. Con
 * algo en la dirección, los resultados. La dirección ES la búsqueda
 * (`src/lib/marketplace/busqueda.ts`): una búsqueda compartida abre igual.
 *
 * Lleva el MISMO header de la landing, con «Buscar inmueble» marcado: es la
 * misma casa (antes traía el mega-menú viejo, `layout/Navbar`).
 */
function Marketplace() {
  const params = useSearchParams();
  const busqueda = leerBusqueda(new URLSearchParams(params.toString()));
  return hayBusqueda(busqueda) ? <PropertySearchView sinNavbar /> : <PortadaDelMarketplace />;
}

export default function PropiedadesPage() {
  return (
    <LandingChrome activo="inmuebles">
      {/* El orbe de Ori y las líneas del pensamiento hablan con las traducciones
          del panel: sin el proveedor, la página pública se caía. */}
      <I18nProvider>
        <Suspense>
          <Marketplace />
        </Suspense>
      </I18nProvider>
    </LandingChrome>
  );
}
