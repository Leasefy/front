'use client';

/**
 * Una línea del extracto, como FILA DE TABLA.
 *
 * Antes era un `<li>` con su propia tarjeta: la lista se leía distinto a todas
 * las demás del panel y no se podía escanear en columnas (Nico, 2026-09-03).
 * Ahora es la tabla estándar y cada fila conserva lo que hacía: los cobros que
 * se le parecen con su «por qué», conciliar (que emite el recibo), ignorar con
 * motivo y volver a pendiente.
 *
 * Los cobros candidatos viven en su propia celda —«Cruce sugerido»— porque son
 * la decisión de la fila: cuál de los cobros con saldo es este movimiento.
 */

import { ArrowCounterClockwise, CheckCircle, Prohibit, ShieldCheck } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
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
  const esPendiente = m.estado === 'PENDIENTE';

  return (
    <TableRow
      className={cn(ocupado && 'opacity-60')}
      data-testid={`movimiento-${m.id}`}
      data-estado={m.estado}
    >
      {/* Fecha */}
      <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
        {diaLegible(m.fecha)}
      </TableCell>

      {/* Movimiento: la descripción del banco, su referencia y su etiqueta */}
      <TableCell className="max-w-[320px]">
        <p className="truncate font-medium text-fg" title={m.descripcion}>
          {m.descripcion}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {m.referencia && (
            <span className="font-mono text-caption text-fg-muted">Ref. {m.referencia}</span>
          )}
          {esSalida && <Badge variant="secondary">Salida</Badge>}
          {m.estado === 'CONCILIADO' && m.recibo && (
            <Badge variant={m.recibo.anuladoAt ? 'destructive' : 'success'}>
              Recibo N.º {m.recibo.numero}
              {m.recibo.anuladoAt ? ' (anulado)' : ''}
            </Badge>
          )}
          {m.estado === 'IGNORADO' && <Badge variant="outline">Ignorado</Badge>}
        </div>
      </TableCell>

      {/* Valor */}
      <TableCell
        className={cn('whitespace-nowrap tabular-nums', esSalida ? 'text-fg-muted' : 'text-fg')}
      >
        {plata(m.valorCop)}
      </TableCell>

      {/* Cruce sugerido: la decisión de la fila */}
      <TableCell className="max-w-[460px]">
        {esPendiente && !esSalida ? (
          m.candidatos.length === 0 ? (
            <p className="text-caption text-fg-muted">
              Ningún cobro con saldo se parece a este movimiento. Si es un pago, registralo a mano
              desde el cobro; si no lo es, ignoralo.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5" aria-label="Cobros que se parecen">
              {m.candidatos.map((c) => (
                <li
                  key={c.cobroId}
                  className={cn(
                    'flex flex-col gap-1.5 rounded-md border px-2.5 py-1.5 sm:flex-row sm:items-center sm:justify-between',
                    c.seguro ? 'border-primary bg-primary-soft' : 'border-border bg-surface-muted',
                  )}
                  data-testid={`candidato-${m.id}-${c.cobroId}`}
                  data-seguro={c.seguro}
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="flex flex-wrap items-center gap-x-2 text-body-sm">
                      <span className="tabular-nums font-medium text-fg">{plata(c.saldoCop)}</span>
                      <span className="text-fg">· {c.tenantName ?? 'Sin nombre'}</span>
                      <span className="text-fg-muted">· {c.propertyTitle}</span>
                      <span className="text-fg-muted">· {mesLegible(c.month)}</span>
                      {c.seguro && (
                        <span className="inline-flex items-center gap-1 text-caption font-medium text-primary">
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Seguro
                        </span>
                      )}
                    </p>
                    <p className="text-caption text-fg-muted">{c.porQue.join(' ')}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={c.seguro ? 'default' : 'secondary'}
                    hideArrow
                    disabled={!puedeConciliar || ocupado}
                    onClick={() => onConciliar(m, c)}
                    aria-label={`Conciliar con ${c.tenantName ?? c.propertyTitle}`}
                    className="shrink-0"
                  >
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    Conciliar
                  </Button>
                </li>
              ))}
            </ul>
          )
        ) : esPendiente && esSalida ? (
          <p className="text-caption text-fg-muted">
            Una salida no se concilia contra un cobro; se puede ignorar.
          </p>
        ) : m.estado === 'IGNORADO' && m.motivoIgnorado ? (
          <p className="text-caption text-fg-muted">Motivo: {m.motivoIgnorado}</p>
        ) : (
          <span className="text-fg-subtle">—</span>
        )}
      </TableCell>

      {/* Acciones */}
      <TableCell className="whitespace-nowrap">
        {esPendiente ? (
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
        ) : m.estado === 'IGNORADO' ? (
          <Button
            size="sm"
            variant="secondary"
            hideArrow
            disabled={!puedeEditar || ocupado}
            onClick={() => onReabrir(m)}
          >
            <ArrowCounterClockwise className="h-4 w-4" aria-hidden="true" />
            Volver a pendiente
          </Button>
        ) : (
          <span className="text-fg-subtle">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}
