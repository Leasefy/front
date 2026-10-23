'use client';

/**
 * La nómina electrónica de la DIAN: los documentos, su CUNE y la cola.
 */

import Link from 'next/link';

import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { NominaElectronicaPanel } from '@/components/nomina/NominaElectronica';

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
export default function NominaElectronicaPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <div className="space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          <Link href="/panel/inmobiliaria/nomina" className="inline-flex items-center text-body-sm text-fg-muted hover:text-fg">
            Nómina
          </Link>
          <EncabezadoDePantalla
            seccion="Dinero"
            titulo="Nómina electrónica (DIAN)"
            descripcion="Los documentos de nómina electrónica, su CUNE y lo que falta por transmitir."
            ayuda={
              <ParaEntenderMas etiqueta="¿Cómo funciona?" titulo="Cómo funciona: Nómina electrónica (DIAN)" variante="secundario">
                <div className="space-y-3 text-body-sm text-fg-muted">
                  <p>Leasefy informa la nómina electrónica por el mismo proveedor de la factura electrónica.</p>
                  <p>Generar numera el documento; transmitir es lo que habla con el proveedor. Un CUNE que empieza por «PRUEBA-» no llegó a la DIAN.</p>
                  <p>La planilla PILA se hace por fuera.</p>
                </div>
              </ParaEntenderMas>
            }
          />
        </div>
        <NominaElectronicaPanel />
      </div>
    </PageGuard>
  );
}
