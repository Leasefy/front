'use client';

import { useParams } from 'next/navigation';
import { UsersThree } from '@phosphor-icons/react';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { useOwnerComparacion } from '@/lib/hooks/useOwnerPortal';
import { PortalPlaceholder } from '@/components/landlord/portal/PortalPlaceholder';
import { ComparacionView } from '@/components/landlord/portal/seleccion/ComparacionView';

/**
 * Comparación + elección (F2) — v8-03. Cableado a `/procesos/{id}/comparacion` + POST `/eleccion`.
 * Loading→Spinner; no-disponible→"Próximamente"; con data→`ComparacionView` (elección WYSIWYS).
 */
export default function ComparacionPage() {
  const params = useParams<{ processId: string }>();
  const processId = params?.processId ?? '';
  const { comparacion, isLoading, unavailable, agencyId, reload } = useOwnerComparacion(processId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="detail" className="mx-auto max-w-7xl" />
      </div>
    );
  }

  if (unavailable || !comparacion) {
    return (
      <PortalPlaceholder
        title="Compara y elige"
        subtitle="Los postulados asegurables de tu inmueble, lado a lado."
        icon={UsersThree}
        emptyDescription="Acá vas a comparar los postulados asegurables y elegir con un clic. Se activa cuando tu inmobiliaria habilite el Portal del Propietario."
      />
    );
  }

  return (
    <ComparacionView agencyId={agencyId} processId={processId} comparacion={comparacion} reload={reload} />
  );
}
