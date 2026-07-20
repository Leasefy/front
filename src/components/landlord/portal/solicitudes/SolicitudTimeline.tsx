'use client';

import { CheckCircle, Megaphone, ArrowRight } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import type { TimelineEntry } from '@/lib/api/owner-solicitudes.types';
import { STATUS_LABELS } from '@/lib/api/owner-solicitudes.types';

/**
 * Timeline de debido proceso de una solicitud (F4): eventos de gestión + llamados de atención.
 *
 * ⚠️ El `llamado` se muestra MÍNIMO (`situationKey`, fecha) — sin emisor ni notas (anti-PII).
 * ⚠️ El front NUNCA computa ni sugiere "terminación elegible": sólo muestra la línea de tiempo.
 * La decisión de terminar es humana (agencia).
 */
export function SolicitudTimeline({ timeline }: { timeline: TimelineEntry[] }) {
  const { formatDate } = useI18n();

  if (timeline.length === 0) {
    return <p className="text-sm text-fg-muted">Todavía no hay movimientos registrados.</p>;
  }

  // Newest first (defensivo: el back puede venir ordenado, pero no lo asumimos).
  const ordered = [...timeline].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <ol className="space-y-4">
      {ordered.map((entry, i) => (
        <li key={i} className="flex gap-3">
          <div className="mt-0.5 shrink-0">
            {entry.kind === 'llamado' ? (
              <Megaphone className="w-4 h-4 text-fg-muted" />
            ) : (
              <CheckCircle className="w-4 h-4 text-primary" />
            )}
          </div>
          <div className="min-w-0">
            {entry.kind === 'llamado' ? (
              <>
                <p className="text-sm font-medium">Llamado de atención</p>
                <p className="text-sm text-fg-muted capitalize">
                  {entry.situationKey.replace(/_/g, ' ')}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium capitalize">{entry.tipo.replace(/_/g, ' ')}</p>
                {entry.from && entry.to && (
                  <p className="text-sm text-fg-muted inline-flex items-center gap-1">
                    {STATUS_LABELS[entry.from] ?? entry.from}
                    <ArrowRight className="w-3 h-3" />
                    {STATUS_LABELS[entry.to] ?? entry.to}
                  </p>
                )}
                {entry.motivo && <p className="text-sm text-fg-muted">{entry.motivo}</p>}
                {entry.rejectionReason && (
                  <p className="text-sm text-fg-muted">{entry.rejectionReason}</p>
                )}
              </>
            )}
            <p className="text-xs text-fg-muted mt-0.5">{formatDate(entry.at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
