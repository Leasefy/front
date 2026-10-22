'use client';

/**
 * Contabilidad — la portada.
 *
 * Guard por `module="reportes"` y `view`: el back no tiene módulo
 * `contabilidad` en la matriz de permisos todavía (`ContabilidadEscrituraGuard`
 * explica por qué), y «reportes» es el módulo financiero que tienen ADMIN y
 * CONTADOR y no tiene el AGENTE. 🔴 Antes era `configuracion`, que el
 * CONTADOR NO tiene (`role-defaults.ts`): el único rol no-ADMIN al que el back
 * deja escribir asientos no podía ni abrir la pantalla (auditoría 2026-09-01).
 * Escribir lo decide el back (ADMIN o CONTADOR) y las pantallas muestran ese
 * 403 en palabras.
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { HubDeContabilidad } from '@/components/contabilidad/HubDeContabilidad';
import { ROLES_DE_LA_CONTABILIDAD } from '@/lib/auth/roles-de-la-contabilidad';

export default function ContabilidadPage() {
  return (
    <PageGuard module="reportes" roles={ROLES_DE_LA_CONTABILIDAD} seccion="Contabilidad">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Revisora r23 (Contabilidad #5): el encabezado común, con la sección del menú («Dinero») y una línea. */}
        <EncabezadoDePantalla
          seccion="Dinero"
          titulo="Contabilidad"
          descripcion="Cierra el mes con el libro en orden y entrégale al contador lo que firma."
        />
        <HubDeContabilidad />
      </div>
    </PageGuard>
  );
}
