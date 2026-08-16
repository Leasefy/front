'use client';

import { Suspense } from 'react';
import { LandingChrome } from '@/components/landing-v2/LandingChrome';
import { PropertySearchView } from '@/components/property/PropertySearchView';

/**
 * Buscar inmueble — el marketplace público.
 *
 * Lleva el MISMO header de la landing, con «Buscar inmueble» marcado: es la
 * misma casa. Antes traía el mega-menú viejo (`layout/Navbar`), con otras
 * rutas, otra tipografía y otra forma — dos headers para un solo sitio hacen
 * que parezcan dos sitios, y el visitante que llega desde la landing siente
 * que se cayó a otra parte.
 *
 * `PropertySearchView` recibe `sinNavbar` para no montar el suyo.
 */
export default function PropiedadesPage() {
  return (
    <LandingChrome activo="inmuebles">
      <Suspense>
        <PropertySearchView sinNavbar />
      </Suspense>
    </LandingChrome>
  );
}
