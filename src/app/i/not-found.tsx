import Link from 'next/link';

import { LandingChrome } from '@/components/landing-v2/LandingChrome';
import { LandingFooterV2 } from '@/components/landing-v2/LandingFooterV2';

/**
 * `leasefy.co/i/<nombre>` de una inmobiliaria que no existe: el mismo mensaje
 * de la página, pero con un 404 de verdad (QA del marketplace, 10-10-2026).
 */
export default function InmobiliariaNoEncontrada() {
  return (
    <LandingChrome activo="inmuebles">
      <main id="main-content" className="min-h-screen bg-background pt-16 lg:pt-[76px]">
        <div className="mx-auto max-w-[720px] px-4 py-24 text-center" data-testid="inmobiliaria-no-existe">
          <h1 className="font-heading text-[28px] font-semibold text-fg">No encontramos esa inmobiliaria</h1>
          <p className="mt-2 text-[15px] text-fg-muted">
            Puede que haya cambiado su nombre corto. Búscala entre las inmobiliarias de Leasefy.
          </p>
          <Link
            href="/propiedades"
            className="mt-6 inline-flex h-10 items-center rounded-full bg-primary px-5 text-[14px] font-medium text-primary-fg hover:bg-primary-600"
          >
            Ir al buscador
          </Link>
        </div>
      </main>
      <LandingFooterV2 />
    </LandingChrome>
  );
}
