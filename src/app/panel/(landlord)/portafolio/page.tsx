'use client';

import { Wallet } from '@phosphor-icons/react';
import { Spinner } from '@/components/ui';
import { useOwnerFinanzas } from '@/lib/hooks/useOwnerPortal';
import { PortalPlaceholder } from '@/components/landlord/portal/PortalPlaceholder';
import { MiPlataView } from '@/components/landlord/portal/finanzas/MiPlataView';

/**
 * Mi plata (F3) — v8-02. Cableado a los endpoints de finanzas del back
 * (`/api/portal/{agencyId}/propietario/{portafolio,inmuebles,proyeccion,recaudo/anual,informe.pdf}`).
 *
 * Tres estados: cargando → Spinner; no-disponible (flag-OFF / owner-JWT no cableado) → "Próximamente"
 * honesto; con data → `MiPlataView`. NUNCA se fabrican números.
 */
export default function PortafolioPage() {
  const { portafolio, inmuebles, proyeccion, recaudoAnual, isLoading, unavailable, agencyId } =
    useOwnerFinanzas();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (unavailable || !portafolio) {
    return (
      <PortalPlaceholder
        title="Mi plata"
        subtitle="Tus pagos, la proyección de tu contrato y tu portafolio, en un solo lugar."
        icon={Wallet}
        emptyDescription="Acá vas a ver cuánto te pagaron, cuándo y por qué concepto, la proyección de tus ingresos y el consolidado de todos tus inmuebles —con informe descargable. Se activa cuando tu inmobiliaria habilite el Portal del Propietario."
      />
    );
  }

  return (
    <MiPlataView
      agencyId={agencyId}
      portafolio={portafolio}
      inmuebles={inmuebles}
      proyeccion={proyeccion}
      recaudoAnual={recaudoAnual}
    />
  );
}
