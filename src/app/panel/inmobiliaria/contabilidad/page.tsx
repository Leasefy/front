'use client';

/**
 * Contabilidad — la portada.
 *
 * Guard por `module="configuracion"` y `view`, igual que las pantallas del
 * PUC en la migración: el back no tiene módulo `contabilidad` en la matriz de
 * permisos todavía (`ContabilidadEscrituraGuard` explica por qué). Leer puede
 * cualquier miembro; escribir lo decide el back (ADMIN o CONTADOR) y las
 * pantallas muestran ese 403 en palabras.
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { HubDeContabilidad } from '@/components/contabilidad/HubDeContabilidad';

export default function ContabilidadPage() {
  return (
    <PageGuard module="configuracion">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <SectionLabel>Finanzas</SectionLabel>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Contabilidad</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            El plan de cuentas, el libro de asientos y los informes con los que el contador firma.
            Un asiento nunca se edita ni se borra: se reversa.
          </p>
        </header>
        <HubDeContabilidad />
      </div>
    </PageGuard>
  );
}
