'use client';

/**
 * El plan de cuentas, fuera de la migración.
 *
 * Es el MISMO componente del paso 4 (`PlanDeCuentas`), sin el pie que manda
 * al paso 5: acá no hay secuencia que seguir.
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { BackButton } from '@/components/ui/back-button';
import { PlanDeCuentas } from '@/components/migracion/PlanDeCuentas';
import { ROLES_DE_LA_CONTABILIDAD } from '@/lib/auth/roles-de-la-contabilidad';

export default function PlanDeCuentasPage() {
  return (
    <PageGuard module="reportes" roles={ROLES_DE_LA_CONTABILIDAD} seccion="Contabilidad">
      <div className="space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          <BackButton href="/panel/inmobiliaria/contabilidad" label="Volver a Contabilidad" />
          <EncabezadoDePantalla
            seccion="Finanzas"
            titulo="Plan de cuentas"
            descripcion="El PUC de la inmobiliaria. El código de una cuenta no se cambia; una cuenta con movimientos no se borra, se desactiva."
          />
        </div>
        <PlanDeCuentas sinPaso5 />
      </div>
    </PageGuard>
  );
}
