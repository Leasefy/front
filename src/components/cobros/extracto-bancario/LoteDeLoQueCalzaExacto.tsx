'use client';

/**
 * 🔴 El LOTE de lo que calza EXACTO (17-09-2026).
 *
 * «Conciliación bancaria: sólo lo que calza EXACTO (referencia de recaudo +
 * valor exacto): el sistema arma el LOTE completo de los que sí calzan y un
 * funcionario lo aprueba de una vez, lo que genera los recibos. Lo que no calza
 * va a la cola manual. Un administrador puede reversar.»
 *
 * Arriba de la tabla del extracto:
 *   · el lote PROPUESTO, con cada línea (inquilino, inmueble, meses, valor) y
 *     «Aprobar el lote» — quien hace caja (`cobros:create`);
 *   · «Volver a armar» cuando entraron movimientos nuevos;
 *   · los últimos lotes aprobados, con «Reversar» sólo para un administrador y
 *     con motivo (anula los recibos que emitió el lote).
 *
 * Lo que queda en la tabla de abajo es la COLA MANUAL.
 */

import { useCallback, useEffect, useState } from 'react';
import { Stack } from '@phosphor-icons/react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { conciliacionBancariaApi } from '@/lib/api/conciliacion-bancaria.service';
import type { LoteActual, LoteDeConciliacion } from '@/lib/api/conciliacion-bancaria.types';
import { diaLegible, mensajeDe, mesesLegibles, plata } from './formato';

const ORIGEN: Record<LoteDeConciliacion['armadoPor'], string> = {
  persona: 'armado a mano',
  extracto: 'armado al cargar el extracto',
  piloto: 'propuesto por el agente',
};

interface Props {
  /** Sube cada vez que cambia el extracto (carga, conciliación): se vuelve a leer. */
  version: number;
  /** Aprobar o reversar cambia la cola manual de abajo. */
  onCambio: () => void;
}

export function LoteDeLoQueCalzaExacto({ version, onCambio }: Props) {
  const { canAccess, isLoading: permisosCargando, isAdmin, agencyRole } = usePermissions();
  const puedeAprobar = !permisosCargando && canAccess('cobros', 'create');
  const esAdministrador = isAdmin || agencyRole === 'ADMIN';

  const [actual, setActual] = useState<LoteActual | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [reversando, setReversando] = useState<LoteDeConciliacion | null>(null);
  const [motivo, setMotivo] = useState('');

  const cargar = useCallback(async () => {
    try {
      setActual(await conciliacionBancariaApi.loteActual());
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar, version]);

  const armar = async () => {
    setOcupado(true);
    try {
      const lote = await conciliacionBancariaApi.armarLote();
      toast.success(
        lote
          ? `Lote armado: ${lote.cantidad} ${lote.cantidad === 1 ? 'movimiento calza' : 'movimientos calzan'} exacto.`
          : 'Nada calza exacto (referencia de recaudo + valor): todo queda en la cola manual.',
      );
      await cargar();
    } catch (e) {
      toast.error(mensajeDe(e, 'No se pudo armar el lote.'));
    } finally {
      setOcupado(false);
    }
  };

  const aprobar = async (lote: LoteDeConciliacion) => {
    setOcupado(true);
    try {
      const r = await conciliacionBancariaApi.aprobarLote(lote.id);
      const fallidos = r.fallidos ?? 0;
      (fallidos > 0 ? toast.error : toast.success)(
        `${r.conciliados ?? 0} ${r.conciliados === 1 ? 'recibo emitido' : 'recibos emitidos'}` +
          (fallidos > 0 ? ` · ${fallidos} ya no calzaban y pasaron a la cola manual` : '.'),
      );
      setConfirmando(false);
      await cargar();
      onCambio();
    } catch (e) {
      toast.error(mensajeDe(e, 'No se pudo aprobar el lote.'));
    } finally {
      setOcupado(false);
    }
  };

  const reversar = async () => {
    const lote = reversando;
    if (!lote) return;
    setOcupado(true);
    try {
      await conciliacionBancariaApi.reversarLote(lote.id, motivo.trim());
      toast.success('Lote reversado: sus recibos quedaron anulados y los movimientos volvieron a pendientes.');
      setReversando(null);
      setMotivo('');
      await cargar();
      onCambio();
    } catch (e) {
      toast.error(mensajeDe(e, 'No se pudo reversar el lote.'));
    } finally {
      setOcupado(false);
    }
  };

  if (error) {
    return (
      <section className="rounded-lg border border-border bg-surface p-4" data-testid="lote-error">
        <p className="text-body-sm text-fg-muted">
          No se pudo leer el lote de lo que calza exacto: {mensajeDe(error, 'error desconocido')}
        </p>
      </section>
    );
  }
  if (!actual) return null;

  if (!actual.disponible) {
    return (
      <section className="rounded-lg border border-border bg-surface p-4" data-testid="lote-no-disponible">
        <p className="text-body-sm text-fg-muted">
          La conciliación por lote todavía no está disponible en esta base (falta la migración
          20260917160000). Mientras tanto se concilia movimiento por movimiento.
        </p>
      </section>
    );
  }

  const propuesto = actual.propuesto;
  const aprobados = actual.recientes.filter((l) => l.estado === 'APROBADO');

  return (
    <section className="rounded-lg border border-border bg-surface" data-testid="lote-exacto">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-body font-semibold text-fg">
            <Stack className="h-4 w-4" aria-hidden="true" />
            Lote de lo que calza exacto
          </p>
          <p className="text-body-sm text-fg-muted">
            Referencia de recaudo y valor exacto. Se aprueba de una vez y ahí se emiten los recibos.
            Lo que no calza queda abajo, en la cola manual.
          </p>
        </div>
        {puedeAprobar && (
          <Button
            variant="secondary"
            hideArrow
            disabled={ocupado}
            onClick={() => void armar()}
            data-testid="armar-lote"
            className="shrink-0"
          >
            {propuesto ? 'Volver a armar' : 'Armar el lote'}
          </Button>
        )}
      </div>

      {propuesto ? (
        <div className="space-y-3 p-4" data-testid="lote-propuesto">
          <p className="text-body-sm text-fg">
            <strong>
              {propuesto.cantidad} {propuesto.cantidad === 1 ? 'movimiento' : 'movimientos'} ·{' '}
              {plata(propuesto.totalCop)}
            </strong>{' '}
            <span className="text-fg-muted">
              — {ORIGEN[propuesto.armadoPor]} el {diaLegible(propuesto.armadoAt)}, esperando aprobación.
            </span>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="text-left text-caption text-fg-muted">
                  <th className="py-1 pr-3 font-medium">Inquilino</th>
                  <th className="py-1 pr-3 font-medium">Inmueble</th>
                  <th className="py-1 pr-3 font-medium">Meses</th>
                  <th className="py-1 pr-3 font-medium">Referencia</th>
                  <th className="py-1 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {propuesto.movimientos.map((m) => (
                  <tr key={m.id} className="border-t border-border" data-testid={`lote-movimiento-${m.movimientoId}`}>
                    <td className="py-1.5 pr-3">{m.tenantName ?? '—'}</td>
                    <td className="py-1.5 pr-3">{m.propertyTitle ?? '—'}</td>
                    <td className="py-1.5 pr-3">{mesesLegibles(m.meses)}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{m.referencia ?? '—'}</td>
                    <td className="py-1.5 text-right tabular-nums">{plata(m.valorCop)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {puedeAprobar && (
            <Button hideArrow disabled={ocupado} onClick={() => setConfirmando(true)} data-testid="aprobar-lote">
              Aprobar el lote
            </Button>
          )}
        </div>
      ) : (
        <p className="p-4 text-body-sm text-fg-muted" data-testid="lote-vacio">
          No hay un lote esperando aprobación.
        </p>
      )}

      {aprobados.length > 0 && (
        <div className="border-t border-border p-4" data-testid="lotes-recientes">
          <p className="mb-2 text-caption font-medium text-fg-muted">Últimos lotes aprobados</p>
          <ul className="space-y-2">
            {aprobados.map((l) => (
              <li
                key={l.id}
                className="flex flex-col gap-2 text-body-sm sm:flex-row sm:items-center sm:justify-between"
                data-testid={`lote-aprobado-${l.id}`}
              >
                <span>
                  {l.aprobadoAt ? diaLegible(l.aprobadoAt) : '—'} · {l.conciliados ?? 0}{' '}
                  {l.conciliados === 1 ? 'recibo' : 'recibos'} · {plata(l.totalCop)}
                  {(l.fallidos ?? 0) > 0 ? ` · ${l.fallidos} a la cola manual` : ''}
                </span>
                {esAdministrador && (
                  <Button
                    size="sm"
                    variant="outline"
                    hideArrow
                    disabled={ocupado}
                    onClick={() => {
                      setReversando(l);
                      setMotivo('');
                    }}
                    data-testid={`reversar-lote-${l.id}`}
                  >
                    Reversar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Aprobar {propuesto?.cantidad ?? 0} {propuesto?.cantidad === 1 ? 'movimiento' : 'movimientos'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se emite un recibo de caja por cada línea, por {plata(propuesto?.totalCop ?? 0)} en total. Antes de
              emitir se vuelve a comprobar que cada una siga calzando exacto; la que ya no calce pasa a la cola
              manual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupado}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (propuesto) void aprobar(propuesto);
              }}
              disabled={ocupado}
              data-testid="confirmar-aprobar-lote"
            >
              {ocupado ? 'Emitiendo…' : 'Aprobar y emitir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reversando !== null} onOpenChange={(abierto) => !abierto && setReversando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reversar el lote</AlertDialogTitle>
            <AlertDialogDescription>
              Se anulan los {reversando?.conciliados ?? 0} recibos que emitió y sus movimientos vuelven a pendientes.
              Queda escrito el motivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-reversa">Motivo</Label>
            <Textarea
              id="motivo-reversa"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Se cargó el extracto de otra cuenta."
              rows={3}
              maxLength={280}
            />
            <p className="text-caption text-fg-muted">Entre 5 y 280 caracteres.</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupado}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void reversar();
              }}
              disabled={ocupado || motivo.trim().length < 5}
              data-testid="confirmar-reversar-lote"
            >
              Reversar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
