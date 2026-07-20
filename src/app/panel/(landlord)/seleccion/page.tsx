'use client';

import { UsersThree } from '@phosphor-icons/react';
import { PortalPlaceholder } from '@/components/landlord/portal/PortalPlaceholder';

/**
 * Elegir inquilino (F2) — shell de fundación (v8-01). La vista real (comparación simultánea de
 * postulados asegurables + elección one-click con WYSIWYS) llega en v8-03, cableada a
 * `/api/portal/{agencyId}/propietario/procesos{,/{id}/comparacion,/{id}/eleccion}`.
 */
export default function SeleccionPage() {
  return (
    <PortalPlaceholder
      title="Elegir inquilino"
      subtitle="Compará los postulados asegurables y elegí vos quién vive en tu inmueble."
      icon={UsersThree}
      emptyDescription="Vas a poder comparar lado a lado los postulados asegurables de tu inmueble y elegir con un clic —tu elección se auto-valida. Se activa cuando tu inmobiliaria habilite el Portal del Propietario."
    />
  );
}
