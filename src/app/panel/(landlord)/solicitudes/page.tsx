'use client';

import Link from 'next/link';
import { ChatCircleText, CaretRight, Plus } from '@phosphor-icons/react';
import { PageHeader } from '@leasefy/cadence';
import { Button, Card, Spinner } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useOwnerSolicitudes } from '@/lib/hooks/useOwnerPortal';
import { PortalPlaceholder } from '@/components/landlord/portal/PortalPlaceholder';
import { STATUS_LABELS, REQUEST_TYPE_OPTIONS } from '@/lib/api/owner-solicitudes.types';

const TIPO_LABELS: Record<string, string> = Object.fromEntries(
  REQUEST_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

/**
 * Solicitudes (F4) — lista. Loading→Spinner; portal no cableado→"Próximamente"; con agencyId
 * sin solicitudes → estado legítimo; con solicitudes → lista. Botón para crear una nueva.
 */
export default function SolicitudesPage() {
  const { formatDate } = useI18n();
  const { solicitudes, isLoading, unavailable } = useOwnerSolicitudes();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (unavailable) {
    return (
      <PortalPlaceholder
        title="Solicitudes"
        subtitle="Pedí lo que necesites; tu inmobiliaria lo gestiona con debido proceso."
        icon={ChatCircleText}
        emptyDescription="Vas a poder abrir solicitudes operativas y seguir su estado en una línea de tiempo, con el debido proceso documentado. Se activa cuando tu inmobiliaria habilite el Portal del Propietario."
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader
          title="Solicitudes"
          subtitle="Pedí lo que necesites; tu inmobiliaria lo gestiona con debido proceso."
          actions={
            <Button asChild hideArrow>
              <Link href="/panel/solicitudes/nueva">
                <Plus className="w-4 h-4" />
                Nueva solicitud
              </Link>
            </Button>
          }
        />

        {solicitudes.length === 0 ? (
          <Card className="p-6 mt-8">
            <p className="text-sm text-muted-foreground">
              Todavía no abriste ninguna solicitud. Usá “Nueva solicitud” para pedirle algo a tu
              inmobiliaria; vas a poder seguir su estado acá.
            </p>
          </Card>
        ) : (
          <ul className="mt-8 space-y-3">
            {solicitudes.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/panel/solicitudes/${s.id}`}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-faint hover:bg-surface-muted transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{TIPO_LABELS[s.tipo] ?? s.tipo}</p>
                    <p className="text-sm text-muted-foreground truncate">{s.descripcion}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-medium">{STATUS_LABELS[s.status] ?? s.status}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(s.createdAt)}</p>
                    </div>
                    <CaretRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
