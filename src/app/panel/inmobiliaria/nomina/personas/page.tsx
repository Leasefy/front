'use client';

/**
 * Las personas de nómina: los cuatro tipos y qué implica cada uno.
 */

import Link from 'next/link';

import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { PersonasDeNominaPanel } from '@/components/nomina/PersonasDeNomina';

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
export default function PersonasDeNominaPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <div className="space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          <Link href="/panel/inmobiliaria/nomina" className="inline-flex items-center text-body-sm text-fg-muted hover:text-fg">
            Nómina
          </Link>
          <EncabezadoDePantalla
            seccion="Nómina"
            titulo="Personas"
            descripcion="Quién está en nómina y cómo se le liquida: empleados, asesores, contratistas y aprendices."
            ayuda={
              <ParaEntenderMas etiqueta="¿Cómo funciona?" titulo="Cómo funciona: Personas" variante="secundario">
                <div className="space-y-3 text-body-sm text-fg-muted">
                  <p>Empleados con contrato laboral, asesores por comisiones (la comisión se registra como novedad y es SALARIO), contratistas de prestación de servicios —que no son nómina laboral— y aprendices del SENA.</p>
                  <p>El tipo decide cómo se liquida: se elige, no se deduce.</p>
                </div>
              </ParaEntenderMas>
            }
          />
        </div>
        <PersonasDeNominaPanel />
      </div>
    </PageGuard>
  );
}
