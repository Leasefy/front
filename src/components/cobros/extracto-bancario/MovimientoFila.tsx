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

import { useState } from 'react';
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
import { yaLaRespaldanRecibosEmitidos } from './muchos-a-uno';
import { RecibosYaEmitidos } from './RecibosYaEmitidos';
import { PropuestaDeLaPasarela } from './PropuestaDeLaPasarela';
import { PropuestaDeLaPasarelaGiro } from './PropuestaDeLaPasarelaGiro';
import { nombreDeLaCuenta } from './cuentas-del-extracto';
import { DeshacerLaConciliacion } from './DeshacerLaConciliacion';
// C2-SALIDAS (Nico, P5): las salidas se concilian (giros, egresos, gastos del banco, reversos).
import { SalidaDelExtracto } from './SalidaDelExtracto';
// Seguimiento 6: el cajón del movimiento con lo que propone el agente («por el alias», las salidas).
import { LoQueProponeElAgente } from './LoQueProponeElAgente';
import { ParDeLaLinea } from './ParDeLaLinea';
// Revisora r25 (Movimientos #1): los cruces y su porqué viven en el cajón de la línea.
import { CrucesDelMovimiento, mejorCruce, textoDeVerLosCruces } from './CrucesDelMovimiento';

/*
 * A 390 px la fila es una TARJETA (el patrón `max-md:grid` de `CuotasDelMesTabla`):
 * arriba la descripción y el valor, debajo el día, y luego el cruce y las acciones a lo
 * ancho. Antes la tabla se encogía con filas de ≈700 px casi vacías.
 */
const CELDA_EN_TARJETA = 'max-md:block max-md:max-w-none max-md:p-0';

interface Props {
  movimiento: MovimientoBancario;
  ocupado: boolean;
  puedeConciliar: boolean;
  puedeEditar: boolean;
  onConciliar: (movimiento: MovimientoBancario, candidato: CandidatoDeConciliacion) => void;
  /** Conciliar contra la cartera ENTERA de un cliente, sin elegir cobro. */
  onConciliarConCliente: (movimiento: MovimientoBancario) => void;
  /** CONC-12: conciliar la línea con los dos inquilinos del par (`m.par`). */
  onConciliarElPar?: (movimiento: MovimientoBancario) => void;
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
  onConciliarElPar,
  onIgnorar,
  onReabrir,
  sinTablaDeVinculos = false,
  onSinTablaDeVinculos = () => {},
  onCambio = () => {},
}: Props) {
  const esSalida = m.valorCop < 0;
  const esPendiente = m.estado === 'PENDIENTE';
  // 🔴 ARREGLOS-5 (Nico Q4 a): recibos ya emitidos suman exacto esta línea: nada de 1:1 (otro recibo por la misma plata).
  const yaTieneSusRecibos = esPendiente && !esSalida && yaLaRespaldanRecibosEmitidos(m);
  // 🔴 ARREGLOS-6b (Nico, ARREGLOS-5 Q4 a): la línea que es el giro de Leasefy no se concilia contra una cuota ni un cliente.
  const esElGiroDeLeasefy = esPendiente && !esSalida && (m.giroDeLeasefy?.propuestas.length ?? 0) > 0;
  const [verCruces, setVerCruces] = useState(false);
  const mejor = mejorCruce(m);

  return (
    <TableRow
      className={cn(
        ocupado && 'opacity-60',
        'max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-2 max-md:border-b max-md:border-border max-md:px-4 max-md:py-4 max-md:last:border-0',
      )}
      data-testid={`movimiento-${m.id}`}
      data-estado={m.estado}
    >
      {/* Fecha */}
      <TableCell className={cn('whitespace-nowrap tabular-nums text-fg-muted max-md:col-start-1 max-md:row-start-2 max-md:text-caption', CELDA_EN_TARJETA)}>
        {diaLegible(m.fecha)}
      </TableCell>

      {/* Movimiento: la descripción del banco, su referencia y su etiqueta */}
      <TableCell className={cn('max-w-[320px] max-md:col-start-1 max-md:row-start-1', CELDA_EN_TARJETA)}>
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
        className={cn(
          'whitespace-nowrap font-mono tabular-nums max-md:col-start-2 max-md:row-start-1 max-md:text-right',
          CELDA_EN_TARJETA,
          esSalida ? 'text-fg-muted' : 'text-fg',
        )}
      >
        {plata(m.valorCop)}
      </TableCell>

      {/* Cruce sugerido: la decisión de la fila.
          🔴 (03-10-2026) Esta celda mide ~300 px aun en un escritorio ancho: las
          tarjetas van APILADAS (texto arriba, botón abajo). Con la fila del breakpoint `sm`
          —que mira la ventana, no la celda— el botón se comía el ancho y el
          texto quedaba de una palabra por línea (filas de 1.500 px). */}
      <TableCell className={cn('max-w-[460px] max-md:col-span-2 max-md:col-start-1 max-md:row-start-3', CELDA_EN_TARJETA)}>
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
        {esElGiroDeLeasefy ? (
          <p className="text-caption text-fg-muted" data-testid={`sin-uno-a-uno-${m.id}`}>
            Si es el giro de Leasefy, confírmalo arriba: sus recibos ya se emitieron con cada pago en línea. Conciliarlo
            contra una cuota o un cliente emitiría otro recibo por la misma plata.
          </p>
        ) : yaTieneSusRecibos ? (
          // ARREGLOS-6b (Q1 a): cuáles recibos, con la regla del back; si no son una propuesta, conciliar con ellos.
          <RecibosYaEmitidos movimiento={m} puedeConciliar={puedeConciliar} ocupado={ocupado} onCambio={onCambio} />
        ) : esPendiente && !esSalida ? (
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
              {m.par && onConciliarElPar && (
                <ParDeLaLinea movimientoId={m.id} par={m.par} deshabilitado={!puedeConciliar || ocupado} onConciliar={() => onConciliarElPar(m)} />
              )}
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
            /* Revisora r25 (Movimientos #1): el MEJOR cruce en una línea —el del seguro si hay,
               si no el primero del back— con su «Conciliar»; los demás y su porqué, en el cajón. */
            <div className="space-y-1.5">
              {m.par && onConciliarElPar && (
                <ParDeLaLinea movimientoId={m.id} par={m.par} deshabilitado={!puedeConciliar || ocupado} onConciliar={() => onConciliarElPar(m)} />
              )}
              {mejor && (
                <div
                  className="space-y-1.5"
                  data-testid={`candidato-${m.id}-${mejor.contractId}`}
                  data-seguro={mejor.seguro}
                  data-adelanto={mejor.adelanto}
                >
                  <p className="flex flex-wrap items-baseline gap-x-2 text-body-sm">
                    <span className="font-mono tabular-nums text-fg">{plata(mejor.pendienteCop)}</span>
                    <span className="text-fg">· {mejor.tenantName ?? 'Sin nombre'}</span>
                    <span className="text-fg-muted">· {mesesLegibles(mejor.meses)}</span>
                    {mejor.adelanto && (
                      <span className="inline-flex items-center gap-1 text-caption font-medium text-fg-muted">
                        <ClockClockwise className="h-3.5 w-3.5" aria-hidden="true" /> Adelanto
                      </span>
                    )}
                    {mejor.seguro && (
                      <span className="inline-flex items-center gap-1 text-caption font-medium text-success">
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Seguro
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      hideArrow
                      disabled={!puedeConciliar || ocupado}
                      onClick={() => onConciliar(m, mejor)}
                      aria-label={`Conciliar con ${mejor.tenantName ?? mejor.propertyTitle}`}
                    >
                      <CheckCircle className="h-4 w-4" aria-hidden="true" />
                      Conciliar
                    </Button>
                    <button
                      type="button"
                      className="text-body-sm text-fg underline underline-offset-2 hover:text-primary disabled:opacity-50"
                      onClick={() => setVerCruces(true)}
                      data-testid={`ver-cruces-${m.id}`}
                    >
                      {textoDeVerLosCruces(m.candidatos.length)}
                    </button>
                  </div>
                </div>
              )}
              {/* Ninguno de los cruces es: la plata igual puede ir contra la cartera del cliente. */}
              <button
                type="button"
                className="inline-flex items-center gap-1 text-caption text-fg-muted underline-offset-2 hover:text-fg hover:underline disabled:opacity-50"
                disabled={!puedeConciliar || ocupado}
                onClick={() => onConciliarConCliente(m)}
                data-testid={`conciliar-cliente-${m.id}`}
              >
                <User className="h-3.5 w-3.5" aria-hidden="true" />
                Es otro: conciliar con un cliente
              </button>
              <CrucesDelMovimiento
                movimiento={m}
                abierto={verCruces}
                onOpenChange={setVerCruces}
                puedeConciliar={puedeConciliar}
                ocupado={ocupado}
                onConciliar={onConciliar}
                onConciliarConCliente={onConciliarConCliente}
              />
            </div>
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
      <TableCell className={cn('whitespace-nowrap max-md:col-span-2 max-md:col-start-1 max-md:row-start-4', CELDA_EN_TARJETA)}>
        {esPendiente ? (
          <div className="flex flex-col items-start gap-1 max-md:flex-row max-md:flex-wrap">
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
            <LoQueProponeElAgente
              movimiento={m}
              puedeConciliar={puedeConciliar}
              puedeEditar={puedeEditar}
              ocupado={ocupado}
              onCambio={onCambio}
            />
          </div>
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
