'use client';

import { useParams } from 'next/navigation';
import { Buildings } from '@phosphor-icons/react';
import { Spinner } from '@/components/ui';
import { useOwnerInmueble } from '@/lib/hooks/useOwnerPortal';
import { PortalPlaceholder } from '@/components/landlord/portal/PortalPlaceholder';
import { InmuebleDetalleView } from '@/components/landlord/portal/finanzas/InmuebleDetalleView';

/**
 * Detalle de un inmueble (F3) — v8-02. Cableado a `/inmuebles/{ref}` + `/inmuebles/{ref}/pagos`.
 * Loading → Spinner; no-disponible → "Próximamente" honesto; con data → detalle real.
 */
export default function InmuebleDetallePage() {
  const params = useParams<{ propertyRef: string }>();
  const propertyRef = params?.propertyRef ?? '';
  const { detalle, pagos, isLoading, unavailable } = useOwnerInmueble(propertyRef);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (unavailable || !detalle) {
    return (
      <PortalPlaceholder
        title="Detalle del inmueble"
        subtitle="El historial de pagos, novedades y contrato de tu inmueble."
        icon={Buildings}
        emptyDescription="Acá vas a ver el contrato, las novedades y el historial de pagos de este inmueble. Se activa cuando tu inmobiliaria habilite el Portal del Propietario."
      />
    );
  }

  return <InmuebleDetalleView detalle={detalle} pagos={pagos} />;
}
