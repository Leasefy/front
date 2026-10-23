'use client';

import { useParams } from 'next/navigation';
import { Buildings } from '@phosphor-icons/react';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
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
      <div className="p-6 lg:p-8">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="detail" />
      </div>
    );
  }

  if (unavailable || !detalle) {
    return (
      <PortalPlaceholder
        seccion="Contratos y plata"
        title="Detalle del inmueble"
        subtitle="El historial de pagos, novedades y contrato de tu inmueble."
        icon={Buildings}
        tituloDelVacio="Lo de este inmueble está en Arriendos"
        emptyDescription="Ahí ves su contrato y lo que te paga el inquilino. El historial con las novedades llega cuando una inmobiliaria te administra los inmuebles en Leasefy."
        accion={{ label: 'Ver mis arriendos', href: '/panel/leases' }}
      />
    );
  }

  return <InmuebleDetalleView detalle={detalle} pagos={pagos} />;
}
