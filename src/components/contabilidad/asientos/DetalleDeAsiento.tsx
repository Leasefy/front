'use client';

import Link from 'next/link';

/**
 * Un asiento abierto en un cajón: sus líneas, sus totales y la única acción
 * que admite — reversar. No hay «editar» ni «borrar» porque el back no los
 * tiene, y no los tiene a propósito: un asiento es historia.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
  type ResultadoDeReversa,
} from '@/lib/api/contabilidad.service';
import { NOMBRE_DE_ORIGEN, totalesDeAsiento } from '@/lib/contabilidad/asientos';
import { diaLegible, hoy } from '@/lib/contabilidad/fechas';
import { Monto } from '../Monto';

const LARGO_MAXIMO_DEL_MOTIVO = 200;

export interface DetalleDeAsientoProps {
  asiento: AsientoContable | null;
  abierto: boolean;
  onCerrar: () => void;
  /** Se llama con el original y la reversa; el padre refresca la lista. */
  onReversado?: (resultado: ResultadoDeReversa) => void;
}

export function DetalleDeAsiento({ asiento, abierto, onCerrar, onReversado }: DetalleDeAsientoProps) {
  const { stop: pararLenis, start: seguirLenis } = useLenis();
  const [reversando, setReversando] = useState(false);

  useEffect(() => {
    if (abierto) pararLenis();
    else seguirLenis();
    return () => seguirLenis();
  }, [abierto, pararLenis, seguirLenis]);

  const totales = useMemo(
    () => (asiento ? totalesDeAsiento(asiento) : { debitos: 0, creditos: 0 }),
    [asiento],
  );

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
      <SheetContent
        className="flex w-full flex-col p-0 sm:max-w-xl"
        data-testid="detalle-de-asiento"
      >
        {asiento ? (
          <>
            <SheetHeader className="sticky top-0 z-10 border-b border-border bg-surface p-6 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3 pr-10">
                <div className="space-y-1">
                  <p className="font-mono text-xs uppercase tracking-wide text-fg-muted">
                    Asiento n.º {asiento.numero}
                  </p>
                  <SheetTitle className="text-lg font-semibold text-fg">
                    {asiento.descripcion}
                  </SheetTitle>
                  <p className="font-mono text-sm tabular-nums text-fg-muted">
                    {diaLegible(asiento.fecha)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{NOMBRE_DE_ORIGEN[asiento.origen] ?? asiento.origen}</Badge>
                  {asiento.cerrado ? (
                    <Badge variant="outline" className="gap-1">
                      <LockSimple className="h-3 w-3" aria-hidden="true" />
                      Cerrado
                    </Badge>
                  ) : null}
                </div>
              </div>
            </SheetHeader>

            <div
              className="flex-1 space-y-6 overflow-y-auto p-6"
              data-lenis-prevent
              style={{ overscrollBehavior: 'contain' }}
            >
              <div className="overflow-x-auto rounded-md border border-border">
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
                          <span className="font-mono text-xs tabular-nums text-fg-muted">
                            {m.cuenta?.codigo ?? '—'}
                          </span>
                          <span className="block text-sm text-fg">{m.cuenta?.nombre ?? m.cuentaId}</span>
                        </TableCell>
                        <TableCell muted>
                          <span className="block text-sm">{m.descripcion ?? ''}</span>
                          {m.terceroTipo ? (
                            <span className="block font-mono text-xs text-fg-subtle">
                              {m.terceroTipo} · {m.terceroId}
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
              </div>

              {asiento.origenId ? (
                <p className="font-mono text-xs text-fg-subtle" data-testid="origen-del-asiento">
                  {asiento.origen === 'RECIBO_DE_CAJA' ? (
                    <>Generado por el recibo de caja · {asiento.origenId}</>
                  ) : asiento.origen === 'DISPERSION' ? (
                    <>
                      Generado por el lote de dispersión ·{' '}
                      <Link
                        href={`/panel/inmobiliaria/dispersiones/lotes/${asiento.origenId}`}
                        className="underline underline-offset-2 hover:text-fg"
                      >
                        abrir el lote
                      </Link>
                    </>
                  ) : asiento.origen === 'MANUAL' ? (
                    <>Reversa del asiento · {asiento.origenId}</>
                  ) : (
                    <>
                      Generado por {NOMBRE_DE_ORIGEN[asiento.origen]?.toLowerCase() ?? asiento.origen} ·{' '}
                      {asiento.origenId}
                    </>
                  )}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted p-4">
                <p className="max-w-sm text-sm text-fg-muted">
                  Un asiento no se edita ni se borra. Si está mal, se reversa: se crea su espejo y
                  los dos quedan en el libro.
                </p>
                <Button
                  variant="outline"
                  hideArrow
                  onClick={() => setReversando(true)}
                  data-testid="abrir-reversar"
                >
                  <ArrowUUpLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Reversar
                </Button>
              </div>
            </div>

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reversar el asiento n.º {asiento.numero}</DialogTitle>
          <DialogDescription>
            Se crea un asiento espejo con los mismos montos al revés. El original no se toca.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reversa-fecha">Fecha de la reversa</Label>
            <Input
              id="reversa-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              disabled={enviando}
            />
            <p className="text-xs text-fg-muted">
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
            <p className="font-mono text-xs tabular-nums text-fg-subtle">
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
          <Button variant="ghost" hideArrow onClick={cerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button
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
