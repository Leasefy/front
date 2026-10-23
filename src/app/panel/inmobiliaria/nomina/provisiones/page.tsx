'use client';

/**
 * Las prestaciones sociales: la provisión mensual y el cruce al pagarlas.
 */

import Link from 'next/link';

import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
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
        <div className="space-y-3">
          <Link href="/panel/inmobiliaria/nomina" className="inline-flex items-center text-body-sm text-fg-muted hover:text-fg">
            Nómina
          </Link>
          <EncabezadoDePantalla
            seccion="Dinero"
            titulo="Prestaciones sociales"
            descripcion="Prima, cesantías, intereses y vacaciones: lo causado cada mes por persona y su pago."
            ayuda={
              <ParaEntenderMas etiqueta="¿Cómo funciona?" titulo="Cómo funciona: Prestaciones sociales" variante="secundario">
                <div className="space-y-3 text-body-sm text-fg-muted">
                  <p>Lo causado cada mes por persona, y el cruce cuando se pagan.</p>
                  <p>Las cuatro bases NO son la misma: vacaciones no lleva auxilio de transporte ni horas extras.</p>
                </div>
              </ParaEntenderMas>
            }
          />
        </div>
        <ProvisionesDeNominaPanel />
      </div>
    </PageGuard>
  );
}
