'use client';

/**
 * CONC-12 (QA de agentes 17-10; Nico: «el agente propone el par»): la línea
 * paga el arriendo de DOS inquilinos y sus cuotas suman exacto. Se propone el
 * par; con un clic el back le emite un recibo a cada uno y los une a la línea.
 * Nunca entra solo.
 */
import { CheckCircle, UsersThree } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import type { ParDeLaLinea as Par } from '@/lib/api/conciliacion-bancaria.types';
import { mesesLegibles, plata } from './formato';

export function ParDeLaLinea({
  movimientoId,
  par,
  deshabilitado,
  onConciliar,
}: {
  movimientoId: string;
  par: Par;
  deshabilitado: boolean;
  onConciliar: () => void;
}) {
  return (
    <div
      className="flex flex-col gap-1.5 rounded-md border border-border bg-surface-muted px-2.5 py-1.5"
      data-testid={`par-${movimientoId}`}
    >
      <p className="inline-flex items-center gap-1.5 text-body-sm font-medium text-fg">
        <UsersThree className="h-4 w-4" aria-hidden="true" /> Pago de {par.partes.length} inquilinos
      </p>
      <ul className="space-y-0.5">
        {par.partes.map((p) => (
          <li key={p.contractId} className="flex flex-wrap gap-x-2 text-body-sm">
            <span className="tabular-nums font-medium text-fg">{plata(p.valorCop)}</span>
            <span className="text-fg">· {p.tenantName ?? 'Sin nombre'}</span>
            <span className="text-fg-muted">· {p.propertyTitle}</span>
            <span className="text-fg-muted">· {mesesLegibles(p.meses)}</span>
          </li>
        ))}
      </ul>
      <p className="text-caption text-fg-muted">{par.porQue.join(' ')}</p>
      <Button
        size="sm"
        variant="secondary"
        hideArrow
        disabled={deshabilitado}
        onClick={onConciliar}
        className="shrink-0 self-start"
        data-testid={`conciliar-par-${movimientoId}`}
      >
        <CheckCircle className="h-4 w-4" aria-hidden="true" />
        Conciliar con los {par.partes.length}
      </Button>
    </div>
  );
}
