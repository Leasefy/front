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

import {
  ArrowCounterClockwise,
  CheckCircle,
  ClockClockwise,
  Prohibit,
  ShieldCheck,
  User,
} from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { CandidatoDeConciliacion, MovimientoBancario } from '@/lib/api/conciliacion-bancaria.types';
import { diaLegible, mesesLegibles, plata } from './formato';
import { MuchosAUno } from './MuchosAUno';
import { PropuestaDeLaPasarela } from './PropuestaDeLaPasarela';
import { PropuestaDeLaPasarelaGiro } from './PropuestaDeLaPasarelaGiro';
import { nombreDeLaCuenta } from './cuentas-del-extracto';
import { DeshacerLaConciliacion } from './DeshacerLaConciliacion';
// C2-SALIDAS (Nico, P5): las salidas se concilian (giros, egresos, gastos del banco, reversos).
import { SalidaDelExtracto } from './SalidaDelExtracto';

interface Props {
  movimiento: MovimientoBancario;
  ocupado: boolean;
  puedeConciliar: boolean;
  puedeEditar: boolean;
  onConciliar: (movimiento: MovimientoBancario, candidato: CandidatoDeConciliacion) => void;
  /** Conciliar contra la cartera ENTERA de un cliente, sin elegir cobro. */
  onConciliarConCliente: (movimiento: MovimientoBancario) => void;
  onIgnorar: (movimiento: MovimientoBancario) => void;
  onReabrir: (movimiento: MovimientoBancario) => void;
  /**
   * Muchos a uno (02-10-2026): ¿ya se sabe que falta la tabla de vínculos?
   * Lo descubre una fila y lo saben todas: «Aprobar» se apaga en la tabla entera.
   */
  sinTablaDeVinculos?: boolean;
  onSinTablaDeVinculos?: () => void;
  /** Conciliar contra recibos cambió la cola: la pantalla vuelve a leer lista y resumen. */
  onCambio?: () => void;
}

export function MovimientoFila({
  movimiento: m,
  ocupado,
  puedeConciliar,
  puedeEditar,
  onConciliar,
  onConciliarConCliente,
  onIgnorar,
  onReabrir,
  sinTablaDeVinculos = false,
  onSinTablaDeVinculos = () => {},
  onCambio = () => {},
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
          {/* (02-10-2026, Fase 1) De qué cuenta es la línea; los pagos en línea no son de una cuenta. */}
          {m.cuenta && (
            <span className="text-caption text-fg-muted" data-testid={`cuenta-de-${m.id}`}>
              {nombreDeLaCuenta(m.cuenta)}
            </span>
          )}
          {m.deLaPasarela && <Badge variant="outline">Pago en línea</Badge>}
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
        {/* 🔴 Muchos a uno: si el movimiento es la suma de recibos YA emitidos,
            eso va primero. Conciliarlo contra una cuota EMITIRÍA otro recibo
            por la misma plata. */}
        {/* 🔴 (Nico, P4) Puede ser un pago en línea: va primero. Si es esa
            plata, conciliarla contra una cuota emitiría un segundo recibo. */}
        {esPendiente && !esSalida && m.pasarela && m.pasarela.propuestas.length > 0 && (
          <PropuestaDeLaPasarela
            movimiento={m}
            propuestas={m.pasarela.propuestas}
            puedeEditar={puedeEditar}
            ocupado={ocupado}
            onCambio={onCambio}
          />
        )}
        {/* 🔴 C2-AGREGADOR (Nico, P2): el giro de Leasefy (el neto de una liquidación). Va
            arriba: conciliarlo contra una cuota emitiría otro recibo por plata que ya tiene los suyos. */}
        {esPendiente && !esSalida && m.giroDeLeasefy && m.giroDeLeasefy.propuestas.length > 0 && (
          <PropuestaDeLaPasarelaGiro
            movimiento={m}
            propuestas={m.giroDeLeasefy.propuestas}
            puedeEditar={puedeEditar}
            ocupado={ocupado}
            onCambio={onCambio}
          />
        )}
        {/* El pago en línea que no calzó con el canon: lo resuelve la inmobiliaria. */}
        {esPendiente && m.deLaPasarela && (
          <p className="mb-2 text-caption text-fg-muted" data-testid={`no-calzo-${m.id}`}>
            Pago en línea que no calzó con el canon: concílialo contra el cliente (la plata va a su deuda más
            vieja) o ignóralo con su motivo si se devolvió. Nunca se concilia solo.
          </p>
        )}
        {/* C2-SALIDAS: una entrada que habla de un reverso o de la devolución de un giro. */}
        {esPendiente && !esSalida && (
          <SalidaDelExtracto movimiento={m} puedeConciliar={puedeConciliar} ocupado={ocupado} onCambio={onCambio} />
        )}
        {esPendiente && !esSalida && m.muchosAUno && (
          <MuchosAUno
            movimiento={m}
            puedeConciliar={puedeConciliar}
            ocupado={ocupado}
            sinTabla={sinTablaDeVinculos}
            onSinTabla={onSinTablaDeVinculos}
            onCambio={onCambio}
          />
        )}
        {esPendiente && !esSalida ? (
          m.candidatos.length === 0 ? (
            /*
             * 🔴 Antes acá decía «ningún cobro con saldo se parece», y eso
             * describía mal el mundo: la deuda nace con el contrato, no con el
             * cobro del mes, y en la inmobiliaria migrada no hay un solo cobro
             * emitido contra 30.951 cuotas pendientes. Si ninguna cuota calza,
             * la salida es el cliente: el back reparte la plata sobre su deuda
             * más vieja, y lo que sobre abona a los meses que siguen.
             */
            <div className="space-y-1.5">
              <p className="text-caption text-fg-muted">
                Ninguna cuota pendiente se parece a este movimiento. Concilia contra el cliente y la
                plata se reparte sobre su deuda más vieja.
              </p>
              <Button
                size="sm"
                variant="secondary"
                hideArrow
                disabled={!puedeConciliar || ocupado}
                onClick={() => onConciliarConCliente(m)}
                data-testid={`conciliar-cliente-${m.id}`}
              >
                <User className="h-4 w-4" aria-hidden="true" />
                Conciliar con un cliente
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5" aria-label="Cuotas que se parecen">
              {m.candidatos.map((c) => (
                <li
                  key={c.contractId}
                  className={cn(
                    'flex flex-col gap-1.5 rounded-md border px-2.5 py-1.5 sm:flex-row sm:items-center sm:justify-between',
                    c.seguro ? 'border-primary bg-primary-soft' : 'border-border bg-surface-muted',
                  )}
                  data-testid={`candidato-${m.id}-${c.contractId}`}
                  data-seguro={c.seguro}
                  data-adelanto={c.adelanto}
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="flex flex-wrap items-center gap-x-2 text-body-sm">
                      <span className="tabular-nums font-medium text-fg">
                        {plata(c.pendienteCop)}
                      </span>
                      <span className="text-fg">· {c.tenantName ?? 'Sin nombre'}</span>
                      <span className="text-fg-muted">· {c.propertyTitle}</span>
                      <span className="text-fg-muted">· {mesesLegibles(c.meses)}</span>
                      {/* Un tramo que todavía no vence no es una deuda atrasada:
                          es plata adelantada, y quien concilia tiene que verlo. */}
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
              {/* Ninguno de los candidatos es: la plata igual puede ir contra
                  la cartera del cliente, que es el camino completo. */}
              <li>
                <Button
                  size="sm"
                  variant="ghost"
                  hideArrow
                  disabled={!puedeConciliar || ocupado}
                  onClick={() => onConciliarConCliente(m)}
                  data-testid={`conciliar-cliente-${m.id}`}
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  Ninguno: conciliar con un cliente
                </Button>
              </li>
            </ul>
          )
        ) : esPendiente && esSalida ? (
          /* C2-SALIDAS (Nico, P5): el giro, el egreso, el pago al proveedor o el gasto del banco. */
          <SalidaDelExtracto
            movimiento={m}
            puedeConciliar={puedeConciliar}
            ocupado={ocupado}
            onCambio={onCambio}
            vacio={
              <p className="text-caption text-fg-muted">
                Una salida no se concilia contra una cuota; se puede ignorar.
              </p>
            }
          />
        ) : m.estado === 'IGNORADO' && m.motivoIgnorado ? (
          <p className="text-caption text-fg-muted">Motivo: {m.motivoIgnorado}</p>
        ) : (
          /* C2-SALIDAS: la salida conciliada dice contra qué quedó. */
          <SalidaDelExtracto
            movimiento={m}
            puedeConciliar={puedeConciliar}
            ocupado={ocupado}
            onCambio={onCambio}
            vacio={<span className="text-fg-subtle">—</span>}
          />
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
        ) : m.estado === 'CONCILIADO' ? (
          /* C2-DESHACER (Nico, P11): sólo administrador o contador; sin anular el recibo. */
          <DeshacerLaConciliacion movimiento={m} ocupado={ocupado} onCambio={onCambio} />
        ) : (
          <span className="text-fg-subtle">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}
