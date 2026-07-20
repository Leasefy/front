'use client';

import { Wallet } from '@phosphor-icons/react';
import { PortalPlaceholder } from '@/components/landlord/portal/PortalPlaceholder';

/**
 * Mi plata (F3) — shell de fundación (v8-01). La vista real (portafolio consolidado, proyección,
 * recaudo anual, descargar informe PDF) llega en v8-02, cableada a
 * `/api/portal/{agencyId}/propietario/{portafolio,inmuebles,recaudo,proyeccion,informe.pdf}`.
 */
export default function PortafolioPage() {
  return (
    <PortalPlaceholder
      title="Mi plata"
      subtitle="Tus pagos, la proyección de tu contrato y tu portafolio, en un solo lugar."
      icon={Wallet}
      emptyDescription="Acá vas a ver cuánto te pagaron, cuándo y por qué concepto, la proyección de tus ingresos y el consolidado de todos tus inmuebles —con informe descargable. Se activa cuando tu inmobiliaria habilite el Portal del Propietario."
    />
  );
}
