'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LandingChrome } from '@/components/landing-v2/LandingChrome';
import { ConversacionDelMarketplace } from '@/components/marketplace/ConversacionDelMarketplace';
import { InicioDelMarketplace } from '@/components/marketplace/InicioDelMarketplace';
import { GaleriaDelMarketplace } from '@/components/marketplace/GaleriaDelMarketplace';
import { hayBusqueda, leerBusqueda } from '@/lib/marketplace/busqueda';
import { I18nProvider } from '@/lib/i18n';

/**
 * Buscar inmueble — el marketplace público, opción 1 «Conversación primero»
 * (Nico, 09-10-2026).
 *
 * Sin nada buscado, la entrada: la caja del chat de la plataforma y debajo lo
 * que hay publicado. Con algo buscado, la conversación con Ori. Con
 * `vista=lista`, la galería con el mapa flotante de esa misma búsqueda. La dirección ES la
 * búsqueda (`src/lib/marketplace/busqueda.ts`): un enlace compartido abre igual.
 *
 * Lleva el MISMO header de la landing, con «Buscar inmueble» marcado.
 */
function Marketplace() {
  const params = useSearchParams();
  const busqueda = leerBusqueda(new URLSearchParams(params.toString()));
  if (params.get('vista') === 'lista') return <GaleriaDelMarketplace />;
  return hayBusqueda(busqueda) ? <ConversacionDelMarketplace /> : <InicioDelMarketplace />;
}

export default function PropiedadesPage() {
  return (
    <LandingChrome activo="inmuebles">
      {/* El orbe de Ori, las líneas del pensamiento y la caja del chat hablan
          con las traducciones del panel: sin el proveedor, la página pública
          se caía. */}
      <I18nProvider>
        <Suspense>
          <Marketplace />
        </Suspense>
      </I18nProvider>
    </LandingChrome>
  );
}
