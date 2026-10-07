'use client';

import { Wallet } from '@phosphor-icons/react';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { useOwnerFinanzas } from '@/lib/hooks/useOwnerPortal';
import { PortalPlaceholder } from '@/components/landlord/portal/PortalPlaceholder';
import { MiPlataView } from '@/components/landlord/portal/finanzas/MiPlataView';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { ApiError } from '@/lib/api/client';

/**
 * Mi plata (F3) — v8-02. Cableado a los endpoints de finanzas del back
 * (`/api/portal/{agencyId}/propietario/{portafolio,inmuebles,proyeccion,recaudo/anual,informe.pdf}`).
 *
 * Cuatro estados: cargando → esqueleto de la página; falló (403, 5xx, red) → `FalloDeCarga` con reintento;
 * no-disponible (flag-OFF / owner-JWT no cableado) → "Próximamente" honesto; con data → `MiPlataView`.
 * Una caída NUNCA se disfraza de «Próximamente» (O1). NUNCA se fabrican números.
 */
export default function PortafolioPage() {
  const {
    portafolio,
    inmuebles,
    proyeccion,
    recaudoAnual,
    falloProyeccion,
    falloRecaudo,
    isLoading,
    unavailable,
    fallo,
    reintentar,
    agencyId,
  } = useOwnerFinanzas();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="dashboard" className="mx-auto max-w-7xl" />
      </div>
    );
  }

  if (fallo) {
    return (
      <div className="min-h-screen bg-bg px-4 py-10 sm:px-6" data-testid="mi-plata-fallo">
        <div className="mx-auto max-w-3xl">
          {/* El fallo entero (status + cuerpo, con la referencia de un 5xx); el armado a mano queda de respaldo. */}
          <FalloDeCarga
            error={fallo.error ?? new ApiError(fallo.status, fallo.mensaje)}
            queEs="tu plata"
            onReintentar={reintentar}
          />
        </div>
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
      falloProyeccion={falloProyeccion}
      falloRecaudo={falloRecaudo}
    />
  );
}
