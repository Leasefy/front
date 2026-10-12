'use client';

import { Suspense, use } from 'react';

import { LandingChrome } from '@/components/landing-v2/LandingChrome';
import { LandingFooterV2 } from '@/components/landing-v2/LandingFooterV2';
import { PaginaDeLaInmobiliaria } from '@/components/marketplace/inmobiliaria/PaginaDeLaInmobiliaria';
import { I18nProvider } from '@/lib/i18n';

/**
 * `leasefy.co/i/<nombre>` — la página de una inmobiliaria en el marketplace
 * (Nico, 09-10-2026, opción 1 «Conversación primero»): su chat, lo que dicen
 * de ella, sus videos y sus inmuebles. El mismo header de la landing, con
 * «Buscar inmueble» marcado: es parte del marketplace.
 */
export default function PaginaDeLaInmobiliariaPage({ params }: { params: Promise<{ nombre: string }> }) {
  const { nombre } = use(params);
  return (
    <LandingChrome activo="inmuebles">
      <main id="main-content" className="min-h-screen bg-background pt-16 lg:pt-[76px]">
        <I18nProvider>
          <Suspense>
            <PaginaDeLaInmobiliaria nombre={decodeURIComponent(nombre)} />
          </Suspense>
        </I18nProvider>
      </main>
      <LandingFooterV2 />
    </LandingChrome>
  );
}
