'use client';

import { use } from 'react';

import { LandingChrome } from '@/components/landing-v2/LandingChrome';
import { LandingFooterV2 } from '@/components/landing-v2/LandingFooterV2';
import { PropertyDetailView } from '@/components/property/PropertyDetailView';

interface PropertyDetailPageProps {
  params: Promise<{ id: string }> | { id: string };
}

/**
 * Ficha pública del inmueble — envoltorio delgado.
 *
 * Lleva el MISMO header que la landing y que el catálogo, con «Buscar
 * inmueble» marcado: entrar a una ficha no es salir del sitio. Antes traía el
 * mega-menú viejo (`layout/Navbar`), así que el header cambiaba entero al
 * hacer clic en una tarjeta.
 *
 * `LandingChrome` fuerza además el modo claro: la hoja de la landing no tiene
 * variante oscura, y con el tema oscuro puesto el header salía claro sobre una
 * ficha oscura.
 *
 * El pie también es el de la landing. Cerraba con `FooterCompact` —uno corto
 * con redes— y era el único pie distinto que quedaba en el sitio público
 * (Nico, 2026-09-05: «poné el de la landing ahí también»).
 */
export default function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  const resolvedParams = params instanceof Promise ? use(params) : params;

  return (
    <LandingChrome activo="inmuebles">
      {/* El header es `position:fixed` y mide 64px (76 desde lg): sin este
          hueco la ficha arranca por debajo de él. */}
      <main id="main-content" className="pt-16 lg:pt-[76px]">
        <PropertyDetailView
          propertyId={resolvedParams.id}
          basePath="/propiedades"
          listingHref="/propiedades"
        />
      </main>
      <LandingFooterV2 />
    </LandingChrome>
  );
}
