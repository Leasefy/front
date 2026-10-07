'use client';

import { useParams } from 'next/navigation';
import { Bell } from '@phosphor-icons/react';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { useOwnerDigest } from '@/lib/hooks/useOwnerPortal';
import { PortalPlaceholder } from '@/components/landlord/portal/PortalPlaceholder';
import { DigestView } from '@/components/landlord/portal/novedades/DigestView';

/**
 * Detalle de digest mensual (F5) — v8-05. Cableado a `/digest/{periodo}`.
 * Loading→Spinner; no-disponible→"Próximamente"; con data→`DigestView`.
 */
export default function DigestDetallePage() {
  const params = useParams<{ periodo: string }>();
  const periodo = params?.periodo ?? '';
  const { digest, isLoading, unavailable } = useOwnerDigest(periodo);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="detail" className="mx-auto max-w-7xl" />
      </div>
    );
  }

  if (unavailable || !digest) {
    return (
      <PortalPlaceholder
        title="Resumen mensual"
        subtitle="Tu recaudo, ocupación y novedades del mes."
        icon={Bell}
        emptyDescription="Acá vas a ver el resumen de fin de mes de tus inmuebles. Se activa cuando tu inmobiliaria habilite el Portal del Propietario."
      />
    );
  }

  return <DigestView digest={digest} />;
}
