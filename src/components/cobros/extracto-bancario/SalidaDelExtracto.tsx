'use client';

/**
 * 🔴 UNA SALIDA DEL EXTRACTO, en su fila (Nico, P5): lo que puede ser y con
 * qué quedó conciliada.
 *
 *   · PENDIENTE: hasta 3 propuestas (la mejor primero), cada una con su regla
 *     con nombre, «Segura» si el back la da alta + única, y su porqué.
 *     «Conciliar» manda esa propuesta; el back la vuelve a verificar. Si nada
 *     calza, «Es un gasto del banco» la marca como 4×1000, comisión, IVA o
 *     cuota de manejo (lo decide la persona); si no, se ignora con su motivo.
 *   · CONCILIADA: contra qué quedó (y si la concilió el Piloto) y «Deshacer»
 *     con motivo, sólo administrador o contador (P11).
 *   · Una ENTRADA que habla de un reverso: «Puede ser el reverso de…» o la
 *     devolución de un giro (nunca solo).
 */

import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUUpLeft, Bank, CheckCircle, Robot, ShieldCheck } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { leerFallo, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import type { MovimientoBancario } from '@/lib/api/conciliacion-bancaria.types';
import {
  NOMBRE_DEL_GASTO,
  salidasDelExtractoApi,
  textoDelVinculo,
  type ClaseDeGastoBancario,
  type PropuestaDeSalida,
} from '@/lib/api/salidas-del-extracto';
import { diaLegible, plata } from './formato';
import { useAparecer } from './cuentas-del-extracto';
import { useSalidaDeLaFila } from './SalidasDelExtracto';

const ROLES_QUE_DESHACEN = new Set(['ADMIN', 'CONTADOR']);
const MOTIVO_MINIMO = 5;
const MOTIVO_MAXIMO = 500;
const CLASES: ClaseDeGastoBancario[] = ['GMF_4X1000', 'COMISION', 'IVA_COMISION', 'CUOTA_DE_MANEJO'];

interface Props {
  movimiento: MovimientoBancario;
  puedeConciliar: boolean;
  ocupado: boolean;
  onCambio: () => void;
  /** Lo que se pinta si no hay nada de salidas que decir (o el back no lo sabe). */
  vacio?: ReactNode;
}

export function SalidaDelExtracto({ movimiento: m, puedeConciliar, ocupado, onCambio, vacio = null }: Props) {
  const aparecer = useAparecer();
  const { agencyRole } = usePermissions();
  const { salida, sinTabla, marcarSinTabla, leido } = useSalidaDeLaFila(m.id);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [gasto, setGasto] = useState(false);
  const [deshaciendo, setDeshaciendo] = useState(false);

  const esSalida = m.valorCop < 0;
  const vinculo = salida?.vinculos[0] ?? null;
  const propuestas = salida?.evaluacion?.propuestas ?? [];

  const conciliar = async (llave: string, pedido: { tipo: PropuestaDeSalida['tipo']; destinoId?: string | null; clase?: ClaseDeGastoBancario | null }) => {
    setEnviando(llave);
    try {
      await salidasDelExtractoApi.conciliar(m.id, pedido);
      toast.success('La salida quedó conciliada.');
      setGasto(false);
      onCambio();
    } catch (e) {
      if (leerFallo(e).code === 'FALTA_UNA_MIGRACION') marcarSinTabla();
      toast.error(
        mensajeParaLaPersona(e, { porDefecto: 'No se pudo conciliar la salida.', accion: 'conciliar la salida' }),
      );
    } finally {
      setEnviando(null);
    }
  };

  // ── Conciliada: contra qué quedó ──
  if (m.estado === 'CONCILIADO' && vinculo) {
    const puedeDeshacer = !!agencyRole && ROLES_QUE_DESHACEN.has(agencyRole);
    return (
      <div className="space-y-1.5" data-testid={`salida-conciliada-${m.id}`}>
        <p className="flex flex-wrap items-center gap-1.5 text-body-sm text-fg">
          <Badge variant="success">{textoDelVinculo(vinculo)}</Badge>
          {vinculo.conciliadoPor === 'piloto' && (
            <span className="inline-flex items-center gap-1 text-caption text-fg-muted">
              <Robot className="h-3.5 w-3.5" aria-hidden="true" /> La concilió el Piloto
            </span>
          )}
        </p>
        {vinculo.porQue.length > 0 && <p className="text-caption text-fg-muted">{vinculo.porQue.join(' ')}</p>}
        {puedeDeshacer && (
          <Button
            size="sm"
            variant="ghost"
            hideArrow
            disabled={ocupado}
            onClick={() => setDeshaciendo(true)}
            data-testid={`deshacer-salida-${m.id}`}
          >
            <ArrowUUpLeft className="h-4 w-4" aria-hidden="true" />
            Deshacer
          </Button>
        )}
        <DeshacerLaSalida
          movimiento={m}
          abierto={deshaciendo}
          onCerrar={() => setDeshaciendo(false)}
          onHecho={() => {
            setDeshaciendo(false);
            onCambio();
          }}
        />
      </div>
    );
  }

  // Sin la respuesta del back (todavía, o un back sin la ruta): como antes.
  if (m.estado !== 'PENDIENTE' || !leido || !salida) return <>{vacio}</>;
  // Una entrada sólo se muestra acá si el back la ve como reverso o devolución.
  if (!esSalida && propuestas.length === 0) return <>{vacio}</>;

  const apagado = !puedeConciliar || ocupado || enviando !== null || sinTabla;

  return (
    <AnimatePresence initial={false}>
      <motion.section
        key="salida"
        {...aparecer}
        className="mb-2 space-y-2"
        aria-label={esSalida ? 'Qué puede ser esta salida' : 'Puede ser un reverso'}
        data-testid={`salida-${m.id}`}
      >
        {propuestas.length > 0 ? (
          <ul className="flex flex-col gap-1.5" aria-label="Propuestas de la salida">
            {propuestas.map((p) => (
              <li
                key={p.llave}
                className={
                  p.sePuedeAplicarSola
                    ? 'flex flex-col gap-1.5 rounded-md border border-primary bg-primary-soft px-2.5 py-1.5 sm:flex-row sm:items-center sm:justify-between'
                    : 'flex flex-col gap-1.5 rounded-md border border-border bg-surface-muted px-2.5 py-1.5 sm:flex-row sm:items-center sm:justify-between'
                }
                data-testid={`propuesta-de-salida-${m.id}-${p.llave}`}
                data-segura={p.sePuedeAplicarSola}
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="flex flex-wrap items-center gap-x-2 text-body-sm text-fg">
                    <span className="font-medium">{p.destino?.etiqueta ?? p.tipo}</span>
                    {p.destino?.fecha && <span className="text-fg-muted">· {diaLegible(p.destino.fecha)}</span>}
                    <span className="tabular-nums text-fg-muted">· {plata(p.valorCop)}</span>
                    {p.sePuedeAplicarSola && (
                      <span className="inline-flex items-center gap-1 text-caption font-medium text-primary">
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Segura
                      </span>
                    )}
                  </p>
                  <p className="text-caption text-fg-muted">
                    <span className="font-medium">{p.regla.nombre}.</span> {p.porQue.join(' ')}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={p.sePuedeAplicarSola ? 'default' : 'secondary'}
                  hideArrow
                  className="shrink-0"
                  disabled={apagado}
                  isLoading={enviando === p.llave}
                  onClick={() => void conciliar(p.llave, { tipo: p.tipo, destinoId: p.destinoId, clase: p.clase })}
                  aria-label={`Conciliar con ${p.destino?.etiqueta ?? p.tipo}`}
                >
                  <CheckCircle className="h-4 w-4" aria-hidden="true" />
                  {p.tipo === 'REVERSO' ? 'Es un reverso' : p.tipo === 'DEVOLUCION_DE_GIRO' ? 'Es la devolución' : 'Conciliar'}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-caption text-fg-muted" data-testid={`salida-sin-propuesta-${m.id}`}>
            Ningún giro, egreso ni pago registrado calza con esta salida. Si es un cobro del banco, márcala como
            gasto del banco; si no, ignórala con su motivo.
          </p>
        )}
        {salida?.evaluacion?.ambigua && (
          <p className="text-caption text-fg-muted">
            Hay más de una respuesta con la misma fuerza (o puede que el pago saliera dos veces): decide tú.
          </p>
        )}
        {sinTabla && (
          <p className="text-caption text-fg-muted">
            Todavía no se pueden conciliar las salidas: falta un paso del equipo de Leasefy. Las propuestas se ven igual.
          </p>
        )}
        {esSalida && (
          <Button
            size="sm"
            variant="ghost"
            hideArrow
            disabled={apagado}
            onClick={() => setGasto(true)}
            data-testid={`gasto-del-banco-${m.id}`}
          >
            <Bank className="h-4 w-4" aria-hidden="true" />
            Es un gasto del banco
          </Button>
        )}

        <Dialog open={gasto} onOpenChange={(v) => !v && enviando === null && setGasto(false)}>
          <DialogContent variant="confirm" icon={<Bank weight="bold" />}>
            <DialogHeader>
              <DialogTitle>¿Qué cobró el banco?</DialogTitle>
              <DialogDescription>
                «{m.descripcion}» del {diaLegible(m.fecha)}, por {plata(m.valorCop)}. Queda conciliada como gasto del
                banco y la contabilidad lo asienta.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 sm:grid-cols-2">
              {CLASES.map((c) => (
                <Button
                  key={c}
                  variant="secondary"
                  hideArrow
                  disabled={enviando !== null}
                  isLoading={enviando === `GASTO_BANCARIO:${c}`}
                  onClick={() => void conciliar(`GASTO_BANCARIO:${c}`, { tipo: 'GASTO_BANCARIO', clase: c })}
                  data-testid={`gasto-${c}-${m.id}`}
                >
                  {NOMBRE_DEL_GASTO[c]}
                </Button>
              ))}
            </div>
            <DialogFooter>
              <Button variant="ghost" hideArrow onClick={() => setGasto(false)} disabled={enviando !== null}>
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.section>
    </AnimatePresence>
  );
}

/** Deshacer la conciliación de una salida, con motivo (P11). */
function DeshacerLaSalida({
  movimiento: m,
  abierto,
  onCerrar,
  onHecho,
}: {
  movimiento: MovimientoBancario;
  abierto: boolean;
  onCerrar: () => void;
  onHecho: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const largo = motivo.trim().length;
  const valido = largo >= MOTIVO_MINIMO && largo <= MOTIVO_MAXIMO;

  const deshacer = async () => {
    setEnviando(true);
    setError(null);
    try {
      await salidasDelExtractoApi.desvincular(m.id, motivo);
      toast.success('La salida volvió a pendientes. Queda escrito quién lo hizo y por qué.');
      setMotivo('');
      onHecho();
    } catch (e) {
      const { porCampo, sueltos } = repartirErroresDelServidor(e, {
        campos: ['motivo'] as const,
        porDefecto: 'No se pudo deshacer la conciliación de la salida.',
        accion: 'deshacer la conciliación de la salida',
      });
      if (porCampo.motivo) setError(porCampo.motivo);
      if (sueltos.length > 0) toast.error(sueltos.join(' · '));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && !enviando && onCerrar()}>
      <DialogContent variant="confirm" icon={<ArrowUUpLeft weight="bold" />}>
        <DialogHeader>
          <DialogTitle>Deshacer la conciliación de esta salida</DialogTitle>
          <DialogDescription>
            «{m.descripcion}» del {diaLegible(m.fecha)}, por {plata(m.valorCop)}. La línea vuelve a pendientes; si era
            un gasto del banco, la contabilidad reversa su asiento.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`motivo-salida-${m.id}`}>Motivo</Label>
          <Textarea
            id={`motivo-salida-${m.id}`}
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setError(null);
            }}
            placeholder="Se concilió contra el giro de otro propietario."
            rows={3}
            maxLength={MOTIVO_MAXIMO}
            aria-invalid={error ? true : undefined}
            aria-describedby={`motivo-salida-${m.id}-error`}
          />
          <ErrorDelCampo
            id={`motivo-salida-${m.id}-error`}
            mensaje={error}
            pista={`Entre ${MOTIVO_MINIMO} y ${MOTIVO_MAXIMO} caracteres.`}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" hideArrow onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            hideArrow
            disabled={!valido}
            isLoading={enviando}
            onClick={() => void deshacer()}
            data-testid={`confirmar-deshacer-salida-${m.id}`}
          >
            Deshacer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
