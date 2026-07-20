'use client';

import { Bell } from '@phosphor-icons/react';
import { PortalPlaceholder } from '@/components/landlord/portal/PortalPlaceholder';

/**
 * Novedades (F5) — shell de fundación (v8-01). La vista real (digest mensual + estado de daños
 * fail-soft + preferencias de consentimiento) llega en v8-05, cableada a
 * `/api/portal/{agencyId}/propietario/{danos,digest/{periodo},digests}`.
 */
export default function NovedadesPage() {
  return (
    <PortalPlaceholder
      title="Novedades"
      subtitle="Tu resumen mensual y el estado de los daños, sin tener que llamar."
      icon={Bell}
      emptyDescription="Vas a recibir un resumen de fin de mes y a ver el estado de los daños de tu inmueble, con tus preferencias de aviso bajo control. Se activa cuando tu inmobiliaria habilite el Portal del Propietario."
    />
  );
}
