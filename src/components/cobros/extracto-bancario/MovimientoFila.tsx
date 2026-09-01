'use client';

import { ArrowCounterClockwise, CheckCircle, Prohibit, ShieldCheck } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CandidatoDeConciliacion, MovimientoBancario } from '@/lib/api/conciliacion-bancaria.types';
import { diaLegible, mesLegible, plata } from './formato';

interface Props {
  movimiento: MovimientoBancario;
  ocupado: boolean;
  puedeConciliar: boolean;
  puedeEditar: boolean;
  onConciliar: (movimiento: MovimientoBancario, candidato: CandidatoDeConciliacion) => void;
  onIgnorar: (movimiento: MovimientoBancario) => void;
  onReabrir: (movimiento: MovimientoBancario) => void;
}

export function MovimientoFila({
  movimiento: m,
  ocupado,
  puedeConciliar,
  puedeEditar,
  onConciliar,
  onIgnorar,
  onReabrir,
}: Props) {
  const esSalida = m.valorCop < 0;

  return (
    <li
      className={cn('space-y-3 p-4', ocupado && 'opacity-60')}
      data-testid={`movimiento-${m.id}`}
      data-estado={m.estado}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs tabular-nums text-fg-muted">{diaLegible(m.fecha)}</span>
            {m.referencia && <span className="font-mono text-xs text-fg-muted">· ref. {m.referencia}</span>}
            {esSalida && <Badge variant="secondary">Salida</Badge>}
            {m.estado === 'CONCILIADO' && m.recibo && (
              <Badge variant={m.recibo.anuladoAt ? 'destructive' : 'success'}>
                Recibo N.º {m.recibo.numero}
                {m.recibo.anuladoAt ? ' (anulado)' : ''}
              </Badge>
            )}
            {m.estado === 'IGNORADO' && <Badge variant="outline">Ignorado</Badge>}
          </div>
          <p className="truncate text-sm text-fg" title={m.descripcion}>
            {m.descripcion}
          </p>
          {m.estado === 'IGNORADO' && m.motivoIgnorado && (
            <p className="text-xs text-fg-muted">Motivo: {m.motivoIgnorado}</p>
          )}
        </div>
        <p
          className={cn(
            'shrink-0 font-mono text-base tabular-nums',
            esSalida ? 'text-fg-muted' : 'text-fg',
          )}
        >
          {plata(m.valorCop)}
        </p>
      </div>

      {m.estado === 'PENDIENTE' && !esSalida && (
        <div className="space-y-2">
          {m.candidatos.length === 0 ? (
            <p className="text-xs text-fg-muted">
              Ningún cobro con saldo se parece a este movimiento. Si es un pago, registralo a mano desde
              el cobro; si no lo es, ignoralo.
            </p>
          ) : (
            <ul className="flex flex-col gap-2" aria-label="Cobros que se parecen">
              {m.candidatos.map((c) => (
                <li
                  key={c.cobroId}
                  className={cn(
                    'flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between',
                    c.seguro ? 'border-primary bg-primary-soft' : 'border-border bg-surface-muted',
                  )}
                  data-testid={`candidato-${m.id}-${c.cobroId}`}
                  data-seguro={c.seguro}
                >
                  <div className="min-w-0 space-y-0.5 text-sm">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-mono tabular-nums text-fg">{plata(c.saldoCop)}</span>
                      <span className="text-fg">· {c.tenantName ?? 'Sin nombre'}</span>
                      <span className="text-fg-muted">· {c.propertyTitle}</span>
                      <span className="text-fg-muted">· {mesLegible(c.month)}</span>
                      {c.seguro && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Seguro
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-fg-muted">{c.porQue.join(' ')}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={c.seguro ? 'default' : 'secondary'}
                    hideArrow
                    disabled={!puedeConciliar || ocupado}
                    onClick={() => onConciliar(m, c)}
                    aria-label={`Conciliar con ${c.tenantName ?? c.propertyTitle}`}
                  >
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    Conciliar
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              hideArrow
              disabled={!puedeEditar || ocupado}
              onClick={() => onIgnorar(m)}
              aria-label={`Ignorar «${m.descripcion}»`}
            >
              <Prohibit className="h-4 w-4" aria-hidden="true" />
              Ignorar
            </Button>
          </div>
        </div>
      )}

      {m.estado === 'PENDIENTE' && esSalida && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-fg-muted">Una salida no se concilia contra un cobro; se puede ignorar.</p>
          <Button size="sm" variant="ghost" hideArrow disabled={!puedeEditar || ocupado} onClick={() => onIgnorar(m)}>
            <Prohibit className="h-4 w-4" aria-hidden="true" />
            Ignorar
          </Button>
        </div>
      )}

      {m.estado === 'IGNORADO' && (
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" hideArrow disabled={!puedeEditar || ocupado} onClick={() => onReabrir(m)}>
            <ArrowCounterClockwise className="h-4 w-4" aria-hidden="true" />
            Volver a pendiente
          </Button>
        </div>
      )}

    </li>
  );
}
