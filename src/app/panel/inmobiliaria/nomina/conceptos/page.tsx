'use client';

/**
 * El catálogo de conceptos y su cuenta del PUC. Es el mapeo contable de nómina.
 */

import Link from 'next/link';

import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ConceptosDeNominaPanel, PorQueDosMarcas } from '@/components/nomina/ConceptosDeNomina';

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
export default function ConceptosDeNominaPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <div className="space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          <Link href="/panel/inmobiliaria/nomina" className="inline-flex items-center text-body-sm text-fg-muted hover:text-fg">
            Nómina
          </Link>
          <EncabezadoDePantalla
            seccion="Nómina"
            titulo="Conceptos y cuentas"
            descripcion="Lo que se devenga, se deduce, aporta el empleador y se provisiona, con su cuenta del PUC: sin cuenta se liquida, pero no se asienta (el asiento no se escribe a medias)."
            ayuda={<PorQueDosMarcas />}
          />
        </div>
        <ConceptosDeNominaPanel />
      </div>
    </PageGuard>
  );
}
