'use client';

/**
 * El cajón con TODOS los cruces de una línea del extracto (revisora r25, Movimientos #1).
 *
 * Antes la fila pintaba cada cuota que se le parecía con su explicación entera y un
 * «Conciliar» por cuota: filas de ≈700 px y una página de 9.386 px con 11 líneas. Ahora la
 * fila dice el mejor cruce en una línea, con su «Conciliar», y este cajón guarda los demás
 * con su porqué. Conciliar desde aquí es la MISMA acción de la fila (`onConciliar`): emite
 * el recibo contra ese cliente; nada nuevo del back.
 */

import { CheckCircle, ClockClockwise, ShieldCheck, User } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { cn } from '@/lib/utils';
import type { CandidatoDeConciliacion, MovimientoBancario } from '@/lib/api/conciliacion-bancaria.types';
import { diaLegible, mesesLegibles, plata } from './formato';

interface Props {
  movimiento: MovimientoBancario;
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  puedeConciliar: boolean;
  ocupado: boolean;
  onConciliar: (movimiento: MovimientoBancario, candidato: CandidatoDeConciliacion) => void;
  onConciliarConCliente: (movimiento: MovimientoBancario) => void;
}

/** El cruce que la fila muestra: el del seguro si hay, si no el primero que manda el back. */
export function mejorCruce(m: MovimientoBancario): CandidatoDeConciliacion | null {
  return m.candidatos.find((c) => c.seguro) ?? m.candidatos[0] ?? null;
}

/** «Ver los 3 cruces» · «Ver por qué» (con uno solo, lo que queda por ver es su porqué). */
export function textoDeVerLosCruces(cuantos: number): string {
  return cuantos > 1 ? `Ver los ${cuantos.toLocaleString('es-CO')} cruces` : 'Ver por qué';
}

export function CrucesDelMovimiento({
  movimiento: m,
  abierto,
  onOpenChange,
  puedeConciliar,
  ocupado,
  onConciliar,
  onConciliarConCliente,
}: Props) {
  const cuantos = m.candidatos.length;
  return (
    <Cajon abierto={abierto} onOpenChange={onOpenChange} tamano="md" data-testid={`cajon-de-cruces-${m.id}`}>
      <CajonCabecera
        titulo={cuantos === 1 ? 'La cuota que se parece' : `Las ${cuantos.toLocaleString('es-CO')} cuotas que se parecen`}
        descripcion={`Línea del ${diaLegible(m.fecha)} por ${plata(m.valorCop)}: «${m.descripcion}»`}
      />
      <CajonCuerpo>
        <ul className="flex flex-col gap-3" aria-label="Cuotas que se parecen">
          {m.candidatos.map((c) => (
            <li
              key={c.contractId}
              className={cn(
                'space-y-2 rounded-md border p-3',
                c.seguro ? 'border-primary bg-primary-soft' : 'border-border bg-surface',
              )}
              data-testid={`cruce-${m.id}-${c.contractId}`}
              data-seguro={c.seguro}
              data-adelanto={c.adelanto}
            >
              <div className="min-w-0 space-y-0.5">
                <p className="flex flex-wrap items-baseline gap-x-2 text-body-sm">
                  <span className="font-mono tabular-nums text-fg">{plata(c.pendienteCop)}</span>
                  <span className="text-fg">· {c.tenantName ?? 'Sin nombre'}</span>
                </p>
                <p className="text-caption text-fg-muted">
                  {c.propertyTitle} · {mesesLegibles(c.meses)}
                </p>
                {(c.adelanto || c.seguro) && (
                  <p className="flex flex-wrap items-center gap-3 pt-0.5">
                    {/* Un tramo que todavía no vence no es deuda atrasada: es plata adelantada. */}
                    {c.adelanto && (
                      <span className="inline-flex items-center gap-1 text-caption font-medium text-fg-muted">
                        <ClockClockwise className="h-3.5 w-3.5" aria-hidden="true" /> Adelanto
                      </span>
                    )}
                    {c.seguro && (
                      <span className="inline-flex items-center gap-1 text-caption font-medium text-primary">
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Seguro
                      </span>
                    )}
                  </p>
                )}
              </div>
              {c.porQue.length > 0 && <p className="text-caption text-fg-muted">{c.porQue.join(' ')}</p>}
              <Button
                size="sm"
                variant={c.seguro ? 'default' : 'secondary'}
                hideArrow
                disabled={!puedeConciliar || ocupado}
                onClick={() => {
                  onConciliar(m, c);
                  onOpenChange(false);
                }}
                aria-label={`Conciliar con ${c.tenantName ?? c.propertyTitle}`}
              >
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                Conciliar
              </Button>
            </li>
          ))}
        </ul>
      </CajonCuerpo>
      <CajonPie ayuda="Conciliar emite el recibo de caja a ese cliente.">
        <Button variant="secondary" hideArrow onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
        <Button
          variant="ghost"
          hideArrow
          disabled={!puedeConciliar || ocupado}
          onClick={() => {
            onOpenChange(false);
            onConciliarConCliente(m);
          }}
          data-testid={`conciliar-cliente-cajon-${m.id}`}
        >
          <User className="h-4 w-4" aria-hidden="true" />
          Ninguna: conciliar con un cliente
        </Button>
      </CajonPie>
    </Cajon>
  );
}
