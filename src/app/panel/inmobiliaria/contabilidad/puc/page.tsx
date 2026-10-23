'use client';

/**
 * El plan de cuentas, fuera de la migración.
 *
 * Es el MISMO componente del paso 4 (`PlanDeCuentas`), sin el pie que manda
 * al paso 5: acá no hay secuencia que seguir.
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import Link from 'next/link';
import { PlanDeCuentas } from '@/components/migracion/PlanDeCuentas';
import { ROLES_DE_LA_CONTABILIDAD } from '@/lib/auth/roles-de-la-contabilidad';

export default function PlanDeCuentasPage() {
  return (
    <PageGuard module="reportes" roles={ROLES_DE_LA_CONTABILIDAD} seccion="Contabilidad">
      <div className="space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          <Link
            href="/panel/inmobiliaria/contabilidad"
            className="inline-flex items-center text-body-sm text-fg-muted hover:text-fg"
          >
            Contabilidad
          </Link>
          <EncabezadoDePantalla
            seccion="Dinero"
            titulo="Plan de cuentas"
            descripcion="El PUC de la inmobiliaria: las cuentas a las que va cada asiento."
            ayuda={
              <ParaEntenderMas etiqueta="Para entender más" variante="secundario">
                <p className="text-body-sm text-fg-muted">
                  El código de una cuenta no se cambia; una cuenta con movimientos no se borra, se
                  desactiva.
                </p>
              </ParaEntenderMas>
            }
          />
        </div>
        <PlanDeCuentas sinPaso5 />
      </div>
    </PageGuard>
  );
}
