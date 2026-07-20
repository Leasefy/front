'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CaretLeft, ChatCircleText } from '@phosphor-icons/react';
import { Card, Spinner } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useOwnerSolicitud } from '@/lib/hooks/useOwnerPortal';
import { PortalPlaceholder } from '@/components/landlord/portal/PortalPlaceholder';
import { SolicitudTimeline } from '@/components/landlord/portal/solicitudes/SolicitudTimeline';
import { STATUS_LABELS, REQUEST_TYPE_OPTIONS } from '@/lib/api/owner-solicitudes.types';

const TIPO_LABELS: Record<string, string> = Object.fromEntries(
  REQUEST_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

/**
 * Detalle de solicitud (F4) — v8-04. Cabecera + timeline de debido proceso.
 * Loading→Spinner; no-disponible→"Próximamente"; con data→detalle real.
 */
export default function SolicitudDetallePage() {
  const params = useParams<{ requestId: string }>();
  const requestId = params?.requestId ?? '';
  const { formatDate } = useI18n();
  const { detalle, isLoading, unavailable } = useOwnerSolicitud(requestId);

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
        title="Solicitud"
        subtitle="El estado y la línea de tiempo de tu solicitud."
        icon={ChatCircleText}
        emptyDescription="Acá vas a ver el estado de tu solicitud y su línea de tiempo con debido proceso. Se activa cuando tu inmobiliaria habilite el Portal del Propietario."
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href="/panel/solicitudes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <CaretLeft className="w-4 h-4" /> Solicitudes
        </Link>

        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold">{TIPO_LABELS[detalle.tipo] ?? detalle.tipo}</h1>
          <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs bg-surface-muted text-muted-foreground">
            {STATUS_LABELS[detalle.status] ?? detalle.status}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Creada el {formatDate(detalle.createdAt)}</p>

        <Card className="p-4 sm:p-6 mt-6">
          <h2 className="text-sm font-medium mb-1">Descripción</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detalle.descripcion}</p>
          {detalle.rejectionReason && (
            <div className="mt-4 pt-4 border-t border-faint">
              <h2 className="text-sm font-medium mb-1">Motivo de rechazo</h2>
              <p className="text-sm text-muted-foreground">{detalle.rejectionReason}</p>
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-6 mt-6">
          <h2 className="text-base font-semibold mb-4">Línea de tiempo</h2>
          <SolicitudTimeline timeline={detalle.timeline} />
        </Card>
      </div>
    </div>
  );
}
