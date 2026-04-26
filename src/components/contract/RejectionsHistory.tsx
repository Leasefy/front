'use client';

import { useState } from 'react';
import { XCircle, PencilSimple, CaretDown, CaretUp, User } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { ContractRejection } from '@/lib/types/contract';

interface RejectionsHistoryProps {
  rejections: ContractRejection[];
  /** If true, collapses the list after the first item. Useful in tight spaces. */
  collapsible?: boolean;
  className?: string;
}

export function RejectionsHistory({ rejections, collapsible = true, className }: RejectionsHistoryProps) {
  const [expanded, setExpanded] = useState(false);

  if (rejections.length === 0) return null;

  const [latest, ...rest] = rejections;
  const hasHistory = rest.length > 0;
  const showCollapseToggle = collapsible && hasHistory;
  const visibleHistory = showCollapseToggle && !expanded ? [] : rest;

  return (
    <section className={cn('rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 p-5 space-y-3', className)}>
      <header className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm text-foreground">
            {hasHistory ? `Modificaciones solicitadas (${rejections.length})` : 'Modificación solicitada'}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Historial de rechazos del inquilino
          </p>
        </div>
      </header>

      <RejectionCard rejection={latest} highlight />

      {showCollapseToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline py-1"
        >
          {expanded ? (
            <>
              <CaretUp className="w-3.5 h-3.5" /> Ocultar historial previo
            </>
          ) : (
            <>
              <CaretDown className="w-3.5 h-3.5" /> Ver {rest.length} rechazo{rest.length > 1 ? 's' : ''} anterior{rest.length > 1 ? 'es' : ''}
            </>
          )}
        </button>
      )}

      {visibleHistory.length > 0 && (
        <div className="space-y-2 pt-1">
          {visibleHistory.map((r) => (
            <RejectionCard key={r.id} rejection={r} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Subcomponent ──────────────────────────────────────────────────────────

function RejectionCard({ rejection, highlight = false }: { rejection: ContractRejection; highlight?: boolean }) {
  const isDefinitive = rejection.type === 'DEFINITIVE';
  const Icon = isDefinitive ? XCircle : PencilSimple;
  const typeLabel = isDefinitive ? 'Rechazo definitivo' : 'Pidió modificaciones';

  return (
    <div
      className={cn(
        'rounded-xl border p-3 flex items-start gap-3',
        highlight
          ? 'bg-white dark:bg-neutral-900 border-amber-300 dark:border-amber-700'
          : 'bg-white/50 dark:bg-neutral-900/40 border-border'
      )}
    >
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
        isDefinitive
          ? 'bg-rose-100 dark:bg-rose-900/30'
          : 'bg-amber-100 dark:bg-amber-900/30'
      )}>
        <Icon className={cn(
          'w-4 h-4',
          isDefinitive ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-semibold text-foreground">{typeLabel}</span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {formatDate(rejection.createdAt)}
          </span>
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
          {rejection.reason}
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <User className="w-3 h-3" />
          <span>{rejection.rejectedBy.firstName} {rejection.rejectedBy.lastName}</span>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}
