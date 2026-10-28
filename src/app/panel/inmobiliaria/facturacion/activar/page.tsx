'use client';

import { PageGuard } from '@/components/auth/PageGuard';
import { GuiaDeHabilitacion } from '@/components/facturacion/habilitacion/GuiaDeHabilitacion';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';

/** Activa tu facturación electrónica con Feel (Nico, 28-10-2026): la guía paso a paso. */
export default function ActivarFacturacionPage() {
  return (
    <PageGuard module="cobros" roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]} seccion="Facturación">
      <GuiaDeHabilitacion />
    </PageGuard>
  );
}
