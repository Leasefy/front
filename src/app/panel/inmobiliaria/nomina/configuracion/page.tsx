'use client';

/**
 * Los parámetros del año. Es la pantalla donde Leasefy admite lo que no sabe: el salario mínimo, el auxilio de transporte y la UVT los fija el Estado y no vienen sembrados.
 */

import Link from 'next/link';

import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { ParametrosDeNominaPanel } from '@/components/nomina/ParametrosDeNomina';

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
export default function ConfiguracionDeNominaPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <div className="space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          <Link href="/panel/inmobiliaria/nomina" className="inline-flex items-center text-body-sm text-fg-muted hover:text-fg">
            Nómina
          </Link>
          <EncabezadoDePantalla
            seccion="Dinero"
            titulo="Configuración del año"
            descripcion="Las cifras del año y los factores con los que se liquida, cada uno con su norma."
            ayuda={
              <ParaEntenderMas etiqueta="¿Cómo funciona?" titulo="Cómo funciona: Configuración del año" variante="secundario">
                <div className="space-y-3 text-body-sm text-fg-muted">
                  <p>El salario mínimo, el auxilio de transporte y la UVT Leasefy NO los inventa: los fija el Gobierno cada diciembre y la DIAN por resolución.</p>
                  <p>Los factores de horas extras, las tarifas de aportes y los porcentajes de prestaciones son editables y tienen su norma al lado.</p>
                </div>
              </ParaEntenderMas>
            }
          />
        </div>
        <ParametrosDeNominaPanel />
      </div>
    </PageGuard>
  );
}
