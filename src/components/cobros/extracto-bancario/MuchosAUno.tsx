'use client';

/**
 * «Este movimiento son N recibos» — en la fila del movimiento PENDIENTE.
 *
 * Pedido de Nico (02-10-2026): «hazlo muy inteligente para que la
 * conciliación y el agente de conciliación pueda detectar muy bien cuáles son
 * los recibos todos de ese registro y lo pueda conciliar mínimo con un 98 %».
 *
 * Una aseguradora paga en UNA consignación los siniestros de seis inquilinos;
 * una empresa paga el arriendo de varios empleados; un movimiento de más de
 * $2.000M llega partido en varios recibos; el efectivo del día se deposita
 * junto. Los recibos YA están emitidos: conciliar acá no emite nada, VINCULA
 * el movimiento con ellos.
 *
 * Tres caras:
 *   · la propuesta clara: los recibos, la suma contra el banco, la confianza y
 *     el porqué, con «Aprobar» (un clic) y «Corregir» (el cajón);
 *   · la AMBIGUA (dos combinaciones suman igual): se ve distinto y NUNCA tiene
 *     un «Aprobar» de un clic — obliga a elegir en el cajón;
 *   · la que necesita una regla (GMF, comisión, retención): se ve la
 *     diferencia con su regla, y la persona decide (nunca se aplica sola).
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Collapse } from '@leasefy/cadence';
import { ArrowsSplit, CheckCircle, PencilSimple, Stack, StackMinus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { conciliacionBancariaApi } from '@/lib/api/conciliacion-bancaria.service';
import type {
  MovimientoBancario,
  PropuestaMuchosAUno,
  PropuestaParcial,
} from '@/lib/api/conciliacion-bancaria.types';
import { plata } from './formato';
import {
  combinacionesEnPalabras,
  estadoDeLaSuma,
  leerElRechazo,
  nivelDeLaConfianza,
  nombreDeLaDiferencia,
  seDejaEnviar,
  tituloDeLaPropuesta,
  type Rechazo,
} from './muchos-a-uno';
import { useMovimientoDeMuchosAUno, type MovimientoDeMuchosAUno } from './movimiento-de-muchos-a-uno';
import {
  AvisoDelRechazo,
  AvisoSinTabla,
  Calza,
  CifraQueCuenta,
  ConfianzaDeLaPropuesta,
  ReciboEnLinea,
} from './PiezasDeMuchosAUno';
import { CorregirLosRecibos } from './CorregirLosRecibos';

/** Cuántos recibos se ven sin abrir «Ver los demás». */
const RECIBOS_A_LA_VISTA = 5;

interface Props {
  movimiento: MovimientoBancario;
  puedeConciliar: boolean;
  /** La fila está ocupada con otra acción (conciliar con un cliente, ignorar). */
  ocupado: boolean;
  /** Ya se sabe que falta la tabla de vínculos (lo descubrió esta u otra fila). */
  sinTabla: boolean;
  onSinTabla: () => void;
  /** Algo cambió en el servidor: la pantalla vuelve a leer la lista y el resumen. */
  onCambio: () => void;
}

/** Lo que pasa al enviar un conjunto de recibos, compartido por la tarjeta y el cajón. */
export interface EnvioDeRecibos {
  enviando: boolean;
  rechazo: Rechazo | null;
  aplicar: (reciboIds: string[], sumaCop: number) => Promise<boolean>;
  limpiar: () => void;
}

function useEnvioDeRecibos(
  m: MovimientoBancario,
  { onSinTabla, onCambio, onHecho }: { onSinTabla: () => void; onCambio: () => void; onHecho: () => void },
): EnvioDeRecibos {
  const [enviando, setEnviando] = useState(false);
  const [rechazo, setRechazo] = useState<Rechazo | null>(null);

  const aplicar = async (reciboIds: string[], sumaCop: number): Promise<boolean> => {
    setEnviando(true);
    setRechazo(null);
    try {
      const r = await conciliacionBancariaApi.conciliarConRecibos(m.id, reciboIds);
      const numeros = [...(r.recibos ?? [])].sort((a, b) => a.numero - b.numero).map((x) => String(x.numero));
      const cuantos = numeros.length || reciboIds.length;
      // Se dice lo que PASÓ: con cuántos recibos, cuáles y con qué diferencia; no «listo».
      toast.success(
        `Movimiento conciliado con ${cuantos} ${cuantos === 1 ? 'recibo' : 'recibos'}` +
          (numeros.length > 0 && numeros.length <= 6 ? ` (N.º ${unirEnEspanol(numeros)})` : '') +
          (r.diferencia
            ? `, con la diferencia de ${plata(r.diferencia.valorCop)} por ${nombreDeLaDiferencia(r.diferencia)}.`
            : '.'),
      );
      onHecho();
      return true;
    } catch (error) {
      const r = leerElRechazo(error, { sumaCop, valorCop: m.valorCop });
      setRechazo(r);
      if (r.tipo === 'sinTabla') onSinTabla();
      if (r.tipo === 'movimientoYaNoEsPendiente') {
        // La fila ya no es pendiente: se dice y se vuelve a leer la lista.
        toast.error(r.mensaje);
        onCambio();
      }
      return false;
    } finally {
      setEnviando(false);
    }
  };

  return { enviando, rechazo, aplicar, limpiar: () => setRechazo(null) };
}

/** «101, 102 y 103». */
function unirEnEspanol(partes: string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

export function MuchosAUno({ movimiento: m, puedeConciliar, ocupado, sinTabla, onSinTabla, onCambio }: Props) {
  const mov = useMovimientoDeMuchosAUno();
  const [hecho, setHecho] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const envio = useEnvioDeRecibos(m, { onSinTabla, onCambio, onHecho: () => setHecho(true) });

  const datos = m.muchosAUno;
  const ambigua = Boolean(datos?.ambigua);
  const mejor = datos?.mejor ?? null;
  const parcial = !ambigua && !mejor ? (datos?.parcial ?? null) : null;
  if (!datos || (!mejor && !ambigua && !parcial)) return null;
  const cara = ambigua ? 'ambigua' : mejor ? 'clara' : 'parcial';

  const abrir = () => {
    envio.limpiar();
    setAbierto(true);
  };

  return (
    <>
      {/* La salida al conciliar: la tarjeta se va y DESPUÉS la pantalla vuelve
          a leer la lista (la fila deja de estar pendiente). */}
      <AnimatePresence onExitComplete={() => hecho && onCambio()}>
        {!hecho && (
          <motion.section
            key="propuesta"
            aria-label={
              cara === 'ambigua'
                ? 'Varias combinaciones de recibos'
                : cara === 'parcial'
                  ? 'Recibos que explican parte del movimiento'
                  : 'Recibos que componen el movimiento'
            }
            className={cn(
              'mb-2 rounded-md border p-3',
              cara === 'clara' ? 'border-primary bg-primary-soft' : 'border-warning bg-warning-soft',
            )}
            data-testid={`muchos-a-uno-${m.id}`}
            data-ambigua={ambigua}
            data-cara={cara}
            {...mov.tarjeta}
          >
            {cara === 'ambigua' && (
              <Ambigua m={m} mejor={mejor} total={datos.total} mov={mov} onElegir={abrir} deshabilitado={ocupado} />
            )}
            {cara === 'clara' && mejor && (
              <PropuestaClara
                m={m}
                propuesta={mejor}
                mov={mov}
                sinTabla={sinTabla}
                puedeConciliar={puedeConciliar}
                ocupado={ocupado}
                envio={envio}
                onCorregir={abrir}
                mostrarRechazo={!abierto}
              />
            )}
            {cara === 'parcial' && parcial && <Parcial m={m} parcial={parcial} mov={mov} />}
          </motion.section>
        )}
      </AnimatePresence>

      <CorregirLosRecibos
        abierto={abierto}
        onOpenChange={(a) => {
          setAbierto(a);
          if (!a) envio.limpiar();
        }}
        movimiento={m}
        puedeConciliar={puedeConciliar}
        sinTabla={sinTabla}
        onSinTabla={onSinTabla}
        envio={envio}
      />
    </>
  );
}

function PropuestaClara({
  m,
  propuesta: p,
  mov,
  sinTabla,
  puedeConciliar,
  ocupado,
  envio,
  onCorregir,
  mostrarRechazo,
}: {
  m: MovimientoBancario;
  propuesta: PropuestaMuchosAUno;
  mov: MovimientoDeMuchosAUno;
  sinTabla: boolean;
  puedeConciliar: boolean;
  ocupado: boolean;
  envio: EnvioDeRecibos;
  onCorregir: () => void;
  mostrarRechazo: boolean;
}) {
  const [verTodos, setVerTodos] = useState(false);
  const estado = estadoDeLaSuma(p.reciboIds, p.sumaCop, m.valorCop, [p]);
  const aLaVista = p.recibos.slice(0, RECIBOS_A_LA_VISTA);
  const resto = p.recibos.slice(RECIBOS_A_LA_VISTA);
  const idDelResto = `recibos-restantes-${m.id}`;
  const rechazo = mostrarRechazo && envio.rechazo && envio.rechazo.tipo !== 'sinTabla' ? envio.rechazo : null;

  return (
    <div className="space-y-2.5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-body-sm font-semibold text-fg">
          <Stack className="h-4 w-4" aria-hidden="true" />
          {tituloDeLaPropuesta(p.recibos.length)}
        </p>
        <ConfianzaDeLaPropuesta nivel={p.nivel} confianza={p.confianza} movimiento={mov} />
      </header>

      <ul className="space-y-1.5" aria-label="Recibos que lo componen">
        {aLaVista.map((r, i) => (
          <motion.li key={r.id} {...mov.recibo(i, aLaVista.length)}>
            <ReciboEnLinea recibo={r} />
          </motion.li>
        ))}
      </ul>
      {resto.length > 0 && (
        <>
          <Collapse open={verTodos} id={idDelResto}>
            <ul className="space-y-1.5" aria-label="Los demás recibos">
              {resto.map((r) => (
                <li key={r.id}>
                  <ReciboEnLinea recibo={r} />
                </li>
              ))}
            </ul>
          </Collapse>
          <button
            type="button"
            className="text-caption font-medium text-primary underline-offset-2 hover:underline"
            aria-expanded={verTodos}
            aria-controls={idDelResto}
            onClick={() => setVerTodos((v) => !v)}
          >
            {verTodos ? 'Ver menos' : `Ver los otros ${resto.length} recibos`}
          </button>
        </>
      )}

      {/* La suma contra el valor del banco: cuenta hasta su valor y, al cuadrar, «calza». */}
      <div className="space-y-1" data-testid={`suma-${m.id}`}>
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-body-sm">
          <span className="text-fg-muted">Suman</span>
          <CifraQueCuenta valor={p.sumaCop} cuenta={mov.cuenta} desdeCero className="font-semibold text-fg" />
          <span className="text-fg-muted">de {plata(m.valorCop)} del banco</span>
          {estado.tipo === 'calza' && <Calza movimiento={mov}>Calza exacto</Calza>}
        </p>
        {p.diferencia && (
          <p className="text-caption text-fg" data-testid={`diferencia-${m.id}`}>
            <span className="font-medium text-warning">
              Diferencia de {plata(p.diferencia.valorCop)} por {nombreDeLaDiferencia(p.diferencia)}:
            </span>{' '}
            {p.diferencia.regla} No se aplica sola: tú decides si la apruebas.
          </p>
        )}
      </div>

      {p.porQue.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-4 text-caption text-fg-muted" aria-label="Por qué">
          {p.porQue.map((frase) => (
            <li key={frase}>{frase}</li>
          ))}
        </ul>
      )}

      <AnimatePresence initial={false}>
        {sinTabla && <AvisoSinTabla key="sin-tabla" movimiento={mov} />}
        {rechazo && <AvisoDelRechazo key={`rechazo-${rechazo.tipo}`} rechazo={rechazo} movimiento={mov} />}
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          hideArrow
          disabled={!puedeConciliar || ocupado || sinTabla || !seDejaEnviar(estado) || envio.enviando}
          isLoading={envio.enviando}
          onClick={() => void envio.aplicar(p.reciboIds, p.sumaCop)}
          data-testid={`aprobar-recibos-${m.id}`}
          aria-label={`Aprobar: conciliar con ${p.recibos.length} ${p.recibos.length === 1 ? 'recibo' : 'recibos'}`}
        >
          <CheckCircle className="h-4 w-4" aria-hidden="true" />
          Aprobar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          hideArrow
          disabled={ocupado || envio.enviando}
          onClick={onCorregir}
          data-testid={`corregir-recibos-${m.id}`}
        >
          <PencilSimple className="h-4 w-4" aria-hidden="true" />
          Corregir
        </Button>
      </div>
    </div>
  );
}

function Ambigua({
  m,
  mejor,
  total,
  mov,
  onElegir,
  deshabilitado,
}: {
  m: MovimientoBancario;
  mejor: PropuestaMuchosAUno | null;
  /** Cuántas combinaciones propuso el back (`muchosAUno.total`). */
  total: number;
  mov: MovimientoDeMuchosAUno;
  onElegir: () => void;
  deshabilitado: boolean;
}) {
  return (
    <div className="space-y-2">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-body-sm font-semibold text-fg">
          <ArrowsSplit className="h-4 w-4 text-warning" aria-hidden="true" />
          Este movimiento puede ser más de una combinación de recibos
        </p>
        {mejor && <ConfianzaDeLaPropuesta nivel={mejor.nivel} confianza={mejor.confianza} movimiento={mov} />}
      </header>
      <p className="text-body-sm text-fg" data-testid={`ambigua-${m.id}`}>
        {total >= 2
          ? `Hay ${combinacionesEnPalabras(total)} que suman lo mismo (${plata(m.valorCop)}): elige la correcta.`
          : `Hay más de una combinación que suma lo mismo (${plata(m.valorCop)}): elige la correcta.`}{' '}
        No se concilia hasta que alguien elija.
      </p>
      {mejor && mejor.porQue.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-4 text-caption text-fg-muted" aria-label="Por qué">
          {mejor.porQue.map((frase) => (
            <li key={frase}>{frase}</li>
          ))}
        </ul>
      )}
      <Button
        size="sm"
        variant="secondary"
        hideArrow
        disabled={deshabilitado}
        onClick={onElegir}
        data-testid={`elegir-recibos-${m.id}`}
      >
        <ArrowsSplit className="h-4 w-4" aria-hidden="true" />
        Elegir la combinación
      </Button>
    </div>
  );
}

/**
 * Nico, 02-10-2026: el movimiento trae MÁS plata que los recibos. NO se
 * concilia: se muestra la propuesta parcial (recibos, suma, cuánto sobra) y
 * no hay ningún «Aprobar» que la dé por buena. La línea sigue con sus otras
 * salidas (conciliar contra un cliente, ignorar).
 */
function Parcial({ m, parcial: p, mov }: { m: MovimientoBancario; parcial: PropuestaParcial; mov: MovimientoDeMuchosAUno }) {
  return (
    <div className="space-y-2.5" data-testid={`parcial-${m.id}`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-body-sm font-semibold text-fg">
          <StackMinus className="h-4 w-4 text-warning" aria-hidden="true" />
          {p.recibos.length === 1
            ? 'Un recibo explica parte de este movimiento'
            : `${p.recibos.length} recibos explican parte de este movimiento`}
        </p>
        <ConfianzaDeLaPropuesta nivel={nivelDeLaConfianza(p.confianza)} confianza={p.confianza} movimiento={mov} />
      </header>
      <ul className="space-y-1.5" aria-label="Recibos que explican una parte">
        {p.recibos.map((r, i) => (
          <motion.li key={r.id} {...mov.recibo(i, p.recibos.length)}>
            <ReciboEnLinea recibo={r} />
          </motion.li>
        ))}
      </ul>
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-body-sm" data-testid={`suma-${m.id}`}>
        <span className="text-fg-muted">Suman</span>
        <CifraQueCuenta valor={p.sumaCop} cuenta={mov.cuenta} desdeCero className="font-semibold text-fg" />
        <span className="text-fg-muted">de {plata(m.valorCop)} del banco:</span>
        <span className="font-medium text-warning" data-testid={`sobrante-${m.id}`}>
          sobran {plata(p.sobranteCop)}
        </span>
      </p>
      {p.porQue.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-4 text-caption text-fg-muted" aria-label="Por qué">
          {p.porQue.map((frase) => (
            <li key={frase}>{frase}</li>
          ))}
        </ul>
      )}
      <p className="text-caption text-fg">
        No se concilia: el banco trae más plata que estos recibos. Revisa si falta registrar un recibo, o concilia la
        línea contra un cliente.
      </p>
    </div>
  );
}
