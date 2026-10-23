'use client';

/**
 * La liquidación del período: el borrador, su aprobación, el asiento contable y el pago.
 */

import Link from 'next/link';

import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { PeriodosDeNominaPanel } from '@/components/nomina/PeriodosDeNomina';

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
export default function PeriodosDeNominaPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <div className="space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          <Link href="/panel/inmobiliaria/nomina" className="inline-flex items-center text-body-sm text-fg-muted hover:text-fg">
            Nómina
          </Link>
          <EncabezadoDePantalla
            seccion="Nómina"
            titulo="Liquidación"
            descripcion="Armar el borrador de cada período, aprobarlo, asentarlo y marcarlo pagado."
            ayuda={
              <ParaEntenderMas etiqueta="¿Cómo funciona?" titulo="Cómo funciona: Liquidación" variante="secundario">
                <div className="space-y-3 text-body-sm text-fg-muted">
                  <p>Un borrador se recalcula tantas veces como haga falta.</p>
                  <p>Aprobar congela las líneas, escribe las provisiones del mes y le manda a cada persona su desprendible. Aprobar no es pagar.</p>
                  <p>Asentar exige el período contable abierto y todos los conceptos con su cuenta del PUC.</p>
                </div>
              </ParaEntenderMas>
            }
          />
        </div>
        <PeriodosDeNominaPanel />
      </div>
    </PageGuard>
  );
}
