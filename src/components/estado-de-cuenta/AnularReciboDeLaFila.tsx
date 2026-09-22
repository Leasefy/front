'use client';

/**
 * «Anular» sobre la fila del estado de cuenta que pagó un recibo de caja.
 *
 * 🔴 QA 22-09 (P1): el único botón de anular un recibo vivía en el detalle de
 * un COBRO. Los recibos que abonan directo a la cuota (`cobro_id = null`, que
 * es el camino nuevo) no aparecían en ninguna pantalla con esa acción — la API
 * sí anula, y la deuda vuelve exacta—. La fila del estado de cuenta es donde
 * se ve ese recibo, así que la acción va ahí.
 *
 * Sólo en el PANEL y sólo para un administrador (CEO: «Anular recibo de caja:
 * sólo un administrador, con motivo»). Por eso llega por contexto: el mismo
 * documento se monta en los portales y en el enlace público, y ahí el contexto
 * no existe y no se pinta nada.
 *
 * La fila trae el NÚMERO del recibo, no su id: se busca en los recibos de ese
 * día (`GET /inmobiliaria/recibos-de-caja?desde&hasta`) y se anula ése. Si no
 * aparece, se dice — no se anula otro.
 */

import * as React from 'react';
import { Banner } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/format';
import { recibosDeCajaApi } from '@/lib/api/recibos-de-caja.service';
import { estaVivo, type ReciboDeCaja } from '@/lib/api/recibos-de-caja.types';
import type { FilaDelEstadoDeCuenta } from '@/lib/types/estado-de-cuenta';

const ContextoDeAnular = React.createContext<((fila: FilaDelEstadoDeCuenta) => void) | null>(null);

/** Los dígitos del número, sin prefijo ni ceros a la izquierda: «RC-0011» → «11». */
export function mismoNumero(a: string | number, b: string | number): boolean {
  const limpio = (x: string | number) => String(x).replace(/\D/g, '').replace(/^0+/, '');
  const la = limpio(a);
  return la !== '' && la === limpio(b);
}

/** ¿Esta fila se pagó con un recibo de caja que se puede anular desde acá? */
export function filaConReciboAnulable(fila: FilaDelEstadoDeCuenta): boolean {
  const doc = fila.documentoDePago;
  return Boolean(doc && doc.tipo === 'INGRESO' && !doc.pagador && doc.numero);
}

/** El botón de la fila. Sin proveedor (portales, enlace público) no pinta nada. */
export function BotonAnularRecibo({ fila }: { fila: FilaDelEstadoDeCuenta }) {
  const abrir = React.useContext(ContextoDeAnular);
  if (!abrir || !filaConReciboAnulable(fila)) return null;
  return (
    <button
      type="button"
      onClick={() => abrir(fila)}
      className="mt-0.5 text-caption font-medium text-danger hover:underline print:hidden"
      data-testid="anular-recibo-de-la-fila"
    >
      Anular recibo
    </button>
  );
}

/**
 * Envuelve el documento del panel. `onAnulado` recarga el documento: la cuota
 * vuelve a pendiente y la tabla tiene que decirlo.
 */
export function ProveedorDeAnularRecibo({
  children,
  habilitado,
  onAnulado,
}: {
  children: React.ReactNode;
  /** `false` (no es administrador): el botón no se pinta. */
  habilitado: boolean;
  onAnulado: () => void;
}) {
  const [fila, setFila] = React.useState<FilaDelEstadoDeCuenta | null>(null);
  const [motivo, setMotivo] = React.useState('');
  const [anulando, setAnulando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const cerrar = () => {
    setFila(null);
    setMotivo('');
    setError(null);
  };

  const confirmar = async () => {
    const doc = fila?.documentoDePago;
    if (!fila || !doc) return;
    const limpio = motivo.trim();
    if (!limpio) return;
    setAnulando(true);
    setError(null);
    try {
      const dia = fila.fechaDePago?.slice(0, 10);
      const delDia = await recibosDeCajaApi.listar(dia ? { desde: dia, hasta: dia } : {});
      const recibo: ReciboDeCaja | undefined = delDia.find(
        (r) => estaVivo(r) && mismoNumero(r.numero, doc.numero),
      );
      if (!recibo) {
        setError(`No encontramos el recibo ${doc.numero} vivo${dia ? ` del ${dia}` : ''}. No se anuló nada.`);
        return;
      }
      await recibosDeCajaApi.anular(recibo.id, limpio);
      toast.success(`Recibo ${doc.numero} anulado`, {
        description: `${formatCurrency(recibo.valorCop)} vuelven a la deuda del contrato.`,
      });
      cerrar();
      onAnulado();
    } catch (e) {
      // El mensaje del back va tal cual: dice POR QUÉ no se pudo.
      setError(e instanceof Error ? e.message : 'No se pudo anular el recibo.');
    } finally {
      setAnulando(false);
    }
  };

  return (
    <ContextoDeAnular.Provider value={habilitado ? setFila : null}>
      {children}
      <Dialog open={fila !== null} onOpenChange={(abierto) => !abierto && cerrar()}>
        <DialogContent className="sm:max-w-md" data-testid="anular-recibo-dialogo">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Anular el recibo {fila?.documentoDePago?.numero ?? ''}
            </DialogTitle>
            <DialogDescription>
              El recibo queda anulado —no se borra— y lo que pagó vuelve a la deuda del contrato. Si
              generó una factura, ésta sigue ahí.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="motivo-anular-recibo" className="text-sm font-medium text-foreground">
              Motivo
            </label>
            <Textarea
              id="motivo-anular-recibo"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Por qué se anula (queda en la bitácora)"
              className="w-full resize-none"
            />
          </div>
          {error && <Banner variant="danger">{error}</Banner>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cerrar} disabled={anulando}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              hideArrow
              onClick={() => void confirmar()}
              disabled={anulando || motivo.trim().length === 0}
              isLoading={anulando}
              data-testid="anular-recibo-confirmar"
            >
              Anular el recibo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ContextoDeAnular.Provider>
  );
}
