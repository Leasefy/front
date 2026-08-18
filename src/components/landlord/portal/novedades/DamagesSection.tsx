'use client';

import { Card } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import type { DanosResponse } from '@/lib/api/owner-novedades.types';

const ESTADO_LABEL: Record<string, string> = {
  en_proceso: 'En proceso',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
};

function estadoVariant(estado: string): 'warning' | 'success' | 'secondary' {
  if (estado === 'en_proceso') return 'warning';
  if (estado === 'resuelto') return 'success';
  return 'secondary';
}

/**
 * Sección de daños (F5) — fail-soft. Si `danos` es null o `available:false` (la tabla de
 * mantenimiento de Martín no existe aún), muestra "Próximamente" SOLO para daños, sin romper el hub.
 */
export function DamagesSection({ danos }: { danos: DanosResponse | null }) {
  const { formatCurrency, formatDate } = useI18n();

  return (
    <Card className="p-4 sm:p-6 mt-6">
      <h2 className="text-base font-semibold mb-4">Daños de tus inmuebles</h2>

      {!danos || !danos.available ? (
        <p className="text-sm text-fg-muted">
          Próximamente. La coordinación de daños con proveedores se activa cuando tu inmobiliaria
          habilite el módulo de mantenimiento.
        </p>
      ) : danos.tickets.length === 0 ? (
        <p className="text-sm text-fg-muted">No hay daños registrados en tus inmuebles.</p>
      ) : (
        <ul className="divide-y divide-border">
          {danos.tickets.map((t) => (
            <li key={t.id} className="py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium capitalize">
                  {t.category ?? 'Daño'}
                  {t.severity ? <span className="text-fg-muted"> · {t.severity}</span> : null}
                </p>
                <p className="text-xs text-fg-muted">
                  Reportado {formatDate(t.createdAt)}
                  {t.resolvedAt ? ` · resuelto ${formatDate(t.resolvedAt)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {t.costoFinalCop != null && (
                  <span className="text-sm font-medium font-mono tabular-nums">
                    {formatCurrency(t.costoFinalCop)}
                  </span>
                )}
                <Badge variant={estadoVariant(t.estadoDisplay)}>
                  {ESTADO_LABEL[t.estadoDisplay] ?? t.estadoDisplay}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
