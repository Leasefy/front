'use client';

import Link from 'next/link';

/**
 * Un asiento abierto en un cajón: sus líneas, sus totales y la única acción
 * que admite — reversar. No hay «editar» ni «borrar» porque el back no los
 * tiene, y no los tiene a propósito: un asiento es historia.
 *
 * 🔴 CB-13 / CB-14 (QA de Contabilidad, 03-10-2026): el cajón pintaba ids
 * crudos («PROPIETARIO · 9e09fd33-…», «Reversa del asiento · 7d800802-…»,
 * «Generado por cobro · d8e5b110-…») y ofrecía «Reversar» a un asiento ya
 * reversado y a la reversa misma. Ahora:
 *   · al abrir se lee el detalle (`GET /asientos/:id`), que trae el nombre del
 *     tercero, `reversaDe`/`reversadoPor` y el rótulo del origen; mientras
 *     tanto se ve lo que vino en la lista;
 *   · nunca se pinta un uuid: sin nombre, nada;
 *   · «Reversa del N.º 18» / «Reversado por el N.º 165» abren ese asiento en
 *     el mismo cajón;
 *   · sin «Reversar» cuando ya está reversado o cuando es una reversa.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/components/ui/toast';
import { ArrowUUpLeft, LockSimple } from '@phosphor-icons/react';
import { Banner } from '@leasefy/cadence';

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
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTable, SheetTitle } from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useLenis } from '@/components/providers/SmoothScroll';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import {
  contabilidadApi,
  type AsientoContable,
  type ReferenciaDeAsiento,
  type ResultadoDeReversa,
} from '@/lib/api/contabilidad.service';
import {
  esReversa,
  estadoDelAsiento,
  nombreDelOrigen,
  NOMBRE_DEL_ESTADO,
  sePuedeReversar,
  textoDelOrigen,
  textoDelTercero,
  totalesDeAsiento,
} from '@/lib/contabilidad/asientos';
import { diaLegible, hoy } from '@/lib/contabilidad/fechas';
import { CampoDeDia } from '../CampoDeDia';
import { Monto } from '../Monto';

const LARGO_MAXIMO_DEL_MOTIVO = 200;

export interface DetalleDeAsientoProps {
  asiento: AsientoContable | null;
  abierto: boolean;
  onCerrar: () => void;
  /** Se llama con el original y la reversa; el padre refresca la lista. */
  onReversado?: (resultado: ResultadoDeReversa) => void;
}

export function DetalleDeAsiento({ asiento: delPadre, abierto, onCerrar, onReversado }: DetalleDeAsientoProps) {
  const { stop: pararLenis, start: seguirLenis } = useLenis();
  const [reversando, setReversando] = useState(false);
  /**
   * El asiento que se MUESTRA: el que eligió el padre, enriquecido con su
   * detalle, o el que se abrió desde «Reversa del N.º …». Se queda montado al
   * cerrar (el padre manda `null`) para que el cajón salga con su contenido.
   */
  const [asiento, setAsiento] = useState<AsientoContable | null>(delPadre);
  const [abriendoOtro, setAbriendoOtro] = useState(false);
  const leidos = useRef(new Set<string>());

  useEffect(() => {
    if (delPadre) setAsiento(delPadre);
  }, [delPadre]);

  useEffect(() => {
    if (!abierto) leidos.current.clear();
  }, [abierto]);

  // El detalle trae lo que la lista no: el nombre del tercero, la reversa y el
  // rótulo del origen. Si falla, queda lo que vino en la lista (sin ids).
  const idDelAsiento = asiento?.id;
  useEffect(() => {
    if (!abierto || !idDelAsiento || leidos.current.has(idDelAsiento)) return;
    leidos.current.add(idDelAsiento);
    let vivo = true;
    Promise.resolve()
      .then(() => contabilidadApi.asientos.detalle(idDelAsiento))
      .then((detalle) => {
        if (!vivo || !detalle || detalle.id !== idDelAsiento) return;
        setAsiento((a) => (a && a.id === detalle.id ? { ...a, ...detalle } : a));
      })
      .catch(() => {
        /* Se queda lo de la lista: ya dice todo menos los nombres. */
      });
    return () => {
      vivo = false;
    };
  }, [abierto, idDelAsiento]);

  const abrirOtro = useCallback(async (ref: Pick<ReferenciaDeAsiento, 'id'>) => {
    setAbriendoOtro(true);
    try {
      const otro = await contabilidadApi.asientos.detalle(ref.id);
      leidos.current.add(otro.id);
      setAsiento(otro);
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo abrir ese asiento.'));
    } finally {
      setAbriendoOtro(false);
    }
  }, []);

  useEffect(() => {
    if (abierto) pararLenis();
    else seguirLenis();
    return () => seguirLenis();
  }, [abierto, pararLenis, seguirLenis]);

  const totales = useMemo(
    () => (asiento ? totalesDeAsiento(asiento) : { debitos: 0, creditos: 0 }),
    [asiento],
  );
  const estado = asiento ? estadoDelAsiento(asiento) : null;

  const reversado = useCallback(
    (r: ResultadoDeReversa) => {
      setReversando(false);
      onReversado?.(r);
      onCerrar();
    },
    [onReversado, onCerrar],
  );

  return (
    <Sheet open={abierto} onOpenChange={(open) => !open && onCerrar()}>
      <SheetContent size="md" data-testid="detalle-de-asiento" aria-describedby={undefined}>
        {asiento ? (
          <>
            <SheetHeader
              actions={
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Badge variant="secondary">{nombreDelOrigen(asiento)}</Badge>
                  {estado === 'REVERSADO' || (estado === 'REVERSA' && nombreDelOrigen(asiento) !== 'Reversa') ? (
                    <Badge variant="outline" data-testid="estado-del-asiento">
                      {NOMBRE_DEL_ESTADO[estado]}
                    </Badge>
                  ) : null}
                  {asiento.cerrado ? (
                    <Badge variant="outline" className="gap-1">
                      <LockSimple className="h-3 w-3" aria-hidden="true" />
                      Cerrado
                    </Badge>
                  ) : null}
                </div>
              }
            >
              <p className="font-mono text-xs uppercase tracking-wide text-fg-muted">
                Asiento n.º {asiento.numero}
              </p>
              <SheetTitle>{asiento.descripcion}</SheetTitle>
              <p className="font-mono text-sm tabular-nums text-fg-muted">
                {diaLegible(asiento.fecha)}
              </p>
            </SheetHeader>

            <SheetBody className="space-y-6">
              {/* A sangre (DESIGN.md §Drawers, «Contenido alineado al padding»): la
                  cabecera y las filas tocan los bordes del cajón y «Cuenta» arranca
                  en la línea del título. Antes iba en una caja con borde. */}
              <SheetTable>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cuenta</TableHead>
                      <TableHead>Detalle</TableHead>
                      <TableHead numeric>Débito</TableHead>
                      <TableHead numeric>Crédito</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {asiento.movimientos.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <span className="font-mono text-caption tabular-nums text-fg-muted">
                            {m.cuenta?.codigo ?? '—'}
                          </span>
                          {/* Sin el nombre de la cuenta, nada: el `cuentaId` es un uuid. */}
                          <span className="block text-sm text-fg">{m.cuenta?.nombre ?? ''}</span>
                        </TableCell>
                        <TableCell muted>
                          <span className="block text-sm">{m.descripcion ?? ''}</span>
                          {textoDelTercero(m) ? (
                            <span
                              className="block text-caption text-fg-subtle"
                              data-testid="tercero-de-la-linea"
                            >
                              {textoDelTercero(m)}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell numeric>
                          <Monto valor={m.debitoCop} vacioSiCero />
                        </TableCell>
                        <TableCell numeric>
                          <Monto valor={m.creditoCop} vacioSiCero />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2} className="text-sm font-medium text-fg">
                        Totales
                      </TableCell>
                      <TableCell numeric>
                        <Monto valor={totales.debitos} className="font-medium" />
                      </TableCell>
                      <TableCell numeric>
                        <Monto valor={totales.creditos} className="font-medium" />
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </SheetTable>

              <LoQueGeneroElAsiento
                asiento={asiento}
                abriendoOtro={abriendoOtro}
                onAbrir={(ref) => void abrirOtro(ref)}
              />

            </SheetBody>

            <SheetFooter
              note={
                !sePuedeReversar(asiento) && asiento.porQueNoSeReversa
                  ? asiento.porQueNoSeReversa
                  : asiento.reversadoPor
                  ? `Este asiento ya tiene su reversa (n.º ${asiento.reversadoPor.numero}): los dos quedan en el libro y se anulan entre sí.`
                  : esReversa(asiento)
                    ? 'Es la reversa de otro asiento: no se reversa. Si hace falta volver a registrar el original, se hace un asiento nuevo.'
                    : 'Un asiento no se edita ni se borra. Si está mal, se reversa: se crea su espejo y los dos quedan en el libro.'
              }
            >
              {sePuedeReversar(asiento) ? (
                <Button
                  variant="outline"
                  hideArrow
                  onClick={() => setReversando(true)}
                  data-testid="abrir-reversar"
                >
                  <ArrowUUpLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Reversar
                </Button>
              ) : null}
            </SheetFooter>

            <ReversarDialogo
              asiento={asiento}
              abierto={reversando}
              onCerrar={() => setReversando(false)}
              onReversado={reversado}
            />
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

// ── Reversar ────────────────────────────────────────────────────────────────

function ReversarDialogo({
  asiento,
  abierto,
  onCerrar,
  onReversado,
}: {
  asiento: AsientoContable;
  abierto: boolean;
  onCerrar: () => void;
  onReversado: (r: ResultadoDeReversa) => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha] = useState(hoy());
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cerrar = useCallback(() => {
    if (enviando) return;
    setMotivo('');
    setFecha(hoy());
    setError(null);
    onCerrar();
  }, [enviando, onCerrar]);

  const confirmar = useCallback(async () => {
    setEnviando(true);
    setError(null);
    try {
      const r = await contabilidadApi.asientos.reversar(asiento.id, {
        motivo: motivo.trim() || undefined,
        fecha: fecha || undefined,
      });
      toast.success(`Asiento n.º ${asiento.numero} reversado`, {
        description: `La reversa quedó como asiento n.º ${r.reversa.numero}.`,
      });
      setMotivo('');
      onReversado(r);
    } catch (e) {
      setError(mensajeDeContabilidad(e, 'No se pudo reversar el asiento.'));
    } finally {
      setEnviando(false);
    }
  }, [asiento.id, asiento.numero, motivo, fecha, onReversado]);

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && cerrar()}>
      {/* Destructiva: no borra nada, pero anula el efecto del asiento en el libro. */}
      <DialogContent variant="destructive" icon={<ArrowUUpLeft weight="bold" />} size="sm">
        <DialogHeader>
          <DialogTitle>Reversar el asiento n.º {asiento.numero}</DialogTitle>
          <DialogDescription>
            Se crea un asiento espejo con los mismos montos al revés. El original no se toca: los
            dos quedan en el libro y se anulan entre sí.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reversa-fecha">Fecha de la reversa</Label>
            <CampoDeDia
              id="reversa-fecha"
              value={fecha}
              onChange={setFecha}
              disabled={enviando}
              testid="reversa-fecha"
            />
            <p className="text-caption text-fg-muted">
              Si el período del original ya está cerrado, la reversa va con una fecha posterior.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reversa-motivo">Motivo</Label>
            <Textarea
              id="reversa-motivo"
              value={motivo}
              maxLength={LARGO_MAXIMO_DEL_MOTIVO}
              rows={3}
              placeholder="Se cargó al inmueble equivocado"
              onChange={(e) => setMotivo(e.target.value)}
              disabled={enviando}
              data-testid="reversa-motivo"
            />
            <p className="font-mono text-caption tabular-nums text-fg-subtle">
              {motivo.length}/{LARGO_MAXIMO_DEL_MOTIVO}
            </p>
          </div>
          {error ? (
            <Banner variant="danger" role="alert">
              {error}
            </Banner>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" hideArrow onClick={cerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            hideArrow
            onClick={() => void confirmar()}
            isLoading={enviando}
            disabled={enviando || !fecha}
            data-testid="confirmar-reversar"
          >
            Reversar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── De dónde salió y con qué otro asiento se anula (CB-13 / CB-14) ──────────

function LoQueGeneroElAsiento({
  asiento,
  abriendoOtro,
  onAbrir,
}: {
  asiento: AsientoContable;
  abriendoOtro: boolean;
  onAbrir: (ref: Pick<ReferenciaDeAsiento, 'id'>) => void;
}) {
  const origen = textoDelOrigen(asiento);
  const enlace =
    'font-medium text-primary underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none disabled:opacity-60';
  // Una reversa de un back anterior a CB-14: se sabe el id del original
  // (`origenId`) pero no su número; se ofrece abrirlo sin pintar el id.
  const reversaSinNumero =
    asiento.reversaDe === undefined && esReversa(asiento) && asiento.origenId
      ? { id: asiento.origenId }
      : null;

  if (!origen && !asiento.reversaDe && !asiento.reversadoPor && !reversaSinNumero) {
    return null;
  }

  return (
    <div className="space-y-1.5 text-caption text-fg-muted" data-testid="origen-del-asiento">
      {asiento.reversaDe ? (
        <p data-testid="reversa-de">
          Reversa del{' '}
          <button
            type="button"
            className={enlace}
            disabled={abriendoOtro}
            onClick={() => onAbrir(asiento.reversaDe!)}
          >
            N.º {asiento.reversaDe.numero}
          </button>
        </p>
      ) : reversaSinNumero ? (
        <p data-testid="reversa-de">
          Es la reversa de otro asiento ·{' '}
          <button
            type="button"
            className={enlace}
            disabled={abriendoOtro}
            onClick={() => onAbrir(reversaSinNumero)}
          >
            Abrir el original
          </button>
        </p>
      ) : null}
      {asiento.reversadoPor ? (
        <p data-testid="reversado-por">
          Reversado por el{' '}
          <button
            type="button"
            className={enlace}
            disabled={abriendoOtro}
            onClick={() => onAbrir(asiento.reversadoPor!)}
          >
            N.º {asiento.reversadoPor.numero}
          </button>
        </p>
      ) : null}
      {origen ? (
        <p>
          {origen}
          {asiento.origen === 'DISPERSION' && asiento.origenId ? (
            <>
              {' · '}
              <Link
                href={`/panel/inmobiliaria/pagos/dispersiones/lotes/${asiento.origenId}`}
                className={enlace}
              >
                abrir el lote
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
