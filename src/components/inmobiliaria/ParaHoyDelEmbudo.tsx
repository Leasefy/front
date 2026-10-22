'use client';

/**
 * «Para hoy» (ronda 18, 22-10-2026): arriba de Prospección, a quién hay que mover hoy y qué le
 * toca. Una acción por fila; el nombre abre el cajón del interesado. Con nada pendiente, una línea.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTr } from '@/lib/i18n/use-tr';
import { formatCurrency } from '@/lib/format';
import type { PipelineItem } from '@/lib/types/inmobiliaria';
import type { PendienteDeHoy } from '@/lib/pipeline/para-hoy';
import { diaCortoDelEmbudo as diaCorto, rotuloDeLaVencida } from '@/lib/pipeline/proxima-accion';

const VISIBLES = 5;

export function ParaHoyDelEmbudo({
  pendientes,
  onAbrir,
  onAgendar,
  className,
}: {
  pendientes: readonly PendienteDeHoy[];
  onAbrir: (item: PipelineItem) => void;
  onAgendar?: (item: PipelineItem) => void;
  className?: string;
}) {
  const tr = useTr();
  const [todos, setTodos] = useState(false);

  if (pendientes.length === 0) {
    return (
      <p
        className={cn('flex items-center gap-2 text-body-sm text-fg-muted', className)}
        data-testid="para-hoy-vacio"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-success-500" aria-hidden="true" />
        {tr('Nada vencido: todos tienen su próximo paso con fecha.')}
      </p>
    );
  }

  const visibles = todos ? pendientes : pendientes.slice(0, VISIBLES);
  const porQue = (p: PendienteDeHoy) =>
    p.porQue === 'vencida'
      ? // Ronda 20: «Visita vencida» cuando la acción es una visita (antes decía «Acción» justo para las visitas).
        `${tr(rotuloDeLaVencida(p.item.nextAction))} · ${diaCorto(p.dia!)}`
      : p.porQue === 'hoy'
        ? tr('Para hoy · {dia}', { dia: diaCorto(p.dia!) })
        : tr('{n} días sin moverse', { n: p.item.daysInStage });

  return (
    <section className={cn('rounded-lg border border-border bg-surface', className)} data-testid="para-hoy">
      <header className="flex items-baseline gap-2 border-b border-border-faint px-4 py-3">
        <h2 className="text-body font-medium text-fg">{tr('Para hoy')}</h2>
        <span className="font-mono text-caption tabular-nums text-fg-muted">{pendientes.length}</span>
      </header>
      <ul className="divide-y divide-border-faint">
        {visibles.map((p) => (
          <li
            key={p.item.id}
            className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
            data-testid="para-hoy-fila"
          >
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <span
                className={cn(
                  'mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full',
                  p.porQue === 'vencida' ? 'bg-error-500' : p.porQue === 'hoy' ? 'bg-primary' : 'bg-warning-500',
                )}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => onAbrir(p.item)}
                  className="max-w-full truncate text-left text-body-sm font-medium text-fg hover:text-primary"
                >
                  {p.item.candidateName}
                </button>
                <p className="truncate text-caption text-fg-muted">
                  {p.item.propertyTitle}
                  {typeof p.item.monthlyRent === 'number' ? (
                    <span className="font-mono tabular-nums"> · {formatCurrency(p.item.monthlyRent)}</span>
                  ) : null}
                </p>
              </div>
            </div>
            <p
              className={cn(
                'text-body-sm sm:w-56 sm:shrink-0',
                p.porQue === 'vencida' ? 'text-danger' : 'text-fg-muted',
              )}
            >
              {porQue(p)}
            </p>
            {onAgendar ? (
              <Button
                variant="secondary"
                size="sm"
                hideArrow
                className="self-start sm:self-auto"
                onClick={() => onAgendar(p.item)}
                data-testid="para-hoy-agendar"
              >
                {p.porQue === 'quieto' ? tr('Agendar visita') : tr('Reagendar')}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {pendientes.length > VISIBLES ? (
        <div className="border-t border-border-faint px-4 py-2">
          <Button variant="link" size="sm" hideArrow onClick={() => setTodos((v) => !v)}>
            {todos ? tr('Ver menos') : tr('Ver los {n}', { n: pendientes.length })}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
