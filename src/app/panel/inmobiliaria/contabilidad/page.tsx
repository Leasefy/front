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
import { SectionLabel } from '@/components/ui/section-label';
import { HubDeContabilidad } from '@/components/contabilidad/HubDeContabilidad';

export default function ContabilidadPage() {
  return (
    <PageGuard module="reportes">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <SectionLabel>Finanzas</SectionLabel>
          <h1 className="text-h2 text-fg">Contabilidad</h1>
          <p className="max-w-2xl text-sm text-fg-muted line-clamp-2">
            El plan de cuentas, el libro de asientos y los informes con los que el contador firma.
            Un asiento nunca se edita ni se borra: se reversa.
          </p>
        </header>
        <HubDeContabilidad />
      </div>
    </PageGuard>
  );
}
