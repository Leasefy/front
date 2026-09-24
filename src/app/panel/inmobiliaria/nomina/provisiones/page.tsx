'use client';

/**
 * Las prestaciones sociales: la provisión mensual y el cruce al pagarlas.
 */

import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { SectionLabel } from '@/components/ui/section-label';
import { ProvisionesDeNominaPanel } from '@/components/nomina/ProvisionesDeNomina';

/**
 * 🔴 EL GATE DE ESTA PÁGINA TIENE DOS MITADES, y las dos hacen falta.
 *
 *   · `<PageGuard roles>` es lo que impide que un ASESOR COMERCIAL o un VIEWER
 *     entren escribiendo la URL: nómina la ven sólo administrador y contador.
 *   · El **módulo de pago** NO se gatea acá, a propósito: el back responde 402 y
 *     el componente lo pinta como lo que es —un producto que se contrata—, no
 *     como un «no tienes permiso». Un `PageGuard` que redirigiera al inicio
 *     escondería la única explicación útil.
 */
export default function ProvisionesDeNominaPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <Link
            href="/panel/inmobiliaria/nomina"
            className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Nómina
          </Link>
          <SectionLabel>Nómina</SectionLabel>
          <h1 className="text-h2 text-fg">Prestaciones sociales</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            Prima, cesantías, intereses sobre cesantías y vacaciones: lo causado cada mes por persona, y el cruce cuando se pagan. Las cuatro bases NO son la misma — vacaciones no lleva auxilio de transporte ni horas extras.
          </p>
        </header>
        <ProvisionesDeNominaPanel />
      </div>
    </PageGuard>
  );
}
