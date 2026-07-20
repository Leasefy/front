'use client';

import { ChatCircleText } from '@phosphor-icons/react';
import { PortalPlaceholder } from '@/components/landlord/portal/PortalPlaceholder';

/**
 * Solicitudes (F4) — shell de fundación (v8-01). La vista real (crear/listar solicitud + detalle
 * con timeline de debido proceso y contador de llamados de atención) llega en v8-04, cableada a
 * `/api/portal/{agencyId}/propietario/solicitudes{,/{id}}`.
 */
export default function SolicitudesPage() {
  return (
    <PortalPlaceholder
      title="Solicitudes"
      subtitle="Pedí lo que necesites; tu inmobiliaria lo gestiona con debido proceso."
      icon={ChatCircleText}
      emptyDescription="Vas a poder abrir solicitudes operativas y seguir su estado en una línea de tiempo, con el debido proceso documentado. Se activa cuando tu inmobiliaria habilite el Portal del Propietario."
    />
  );
}
