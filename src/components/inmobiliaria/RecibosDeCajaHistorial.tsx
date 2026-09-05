'use client';

/**
 * RecibosDeCajaHistorial — los abonos de un cobro, uno por documento.
 *
 * Cada abono parcial es un recibo propio, numerado. Anular pide motivo (el back
 * lo exige) y 🔴 el anulado NO desaparece de la lista: queda tachado y marcado,
 * porque es plata que volvió al saldo y alguien va a tener que explicar por qué.
 */

import * as React from 'react';
import { toast } from '@/components/ui/toast';
import { ArrowClockwise, CheckCircle, Prohibit, Receipt } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Banner, KeyValueList } from '@leasefy/cadence';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { estaVivo, type ReciboDeCaja } from '@/lib/api/recibos-de-caja.types';

export interface RecibosDeCajaHistorialProps {
  recibos: ReciboDeCaja[];
  cargando?: boolean;
  fallo?: boolean;
  onReintentar?: () => void;
  /** Anula el recibo en el back. Debe relanzar el error para que el diálogo lo muestre. */
  onAnular?: (recibo: ReciboDeCaja, motivo: string) => Promise<void>;
  className?: string;
}

/** Más reciente arriba; a igual fecha, el consecutivo más alto primero. */
function masRecientePrimero(a: ReciboDeCaja, b: ReciboDeCaja): number {
  const porFecha = String(b.fecha ?? '').localeCompare(String(a.fecha ?? ''));
  if (porFecha !== 0) return porFecha;
  return String(b.numero ?? '').localeCompare(String(a.numero ?? ''), undefined, {
    numeric: true,
  });
}

export function RecibosDeCajaHistorial({
  recibos,
  cargando = false,
  fallo = false,
  onReintentar,
  onAnular,
  className,
}: RecibosDeCajaHistorialProps) {
  const { t, formatCurrency, formatDate } = useI18n();

  const [aAnular, setAAnular] = React.useState<ReciboDeCaja | null>(null);
  const [motivo, setMotivo] = React.useState('');
  const [anulando, setAnulando] = React.useState(false);
  const [errorDeAnular, setErrorDeAnular] = React.useState<string | null>(null);

  const ordenados = React.useMemo(() => [...recibos].sort(masRecientePrimero), [recibos]);
  const vivos = React.useMemo(() => ordenados.filter(estaVivo), [ordenados]);
  const recibidoConRecibo = React.useMemo(
    () => vivos.reduce((suma, r) => suma + (r.valorCop ?? 0), 0),
    [vivos],
  );

  const cerrarAnular = React.useCallback(() => {
    setAAnular(null);
    setMotivo('');
    setErrorDeAnular(null);
  }, []);

  const confirmarAnular = React.useCallback(async () => {
    if (!aAnular || !onAnular) return;
    const limpio = motivo.trim();
    if (!limpio) {
      setErrorDeAnular(t('recibos.anular.motivoRequerido'));
      return;
    }
    setAnulando(true);
    setErrorDeAnular(null);
    try {
      await onAnular(aAnular, limpio);
      toast.success(t('recibos.anular.anulado', { numero: String(aAnular.numero) }), {
        description: t('recibos.anular.anuladoDesc', { monto: formatCurrency(aAnular.valorCop) }),
      });
      cerrarAnular();
    } catch (error) {
      // El mensaje del back va tal cual: dice POR QUÉ no se pudo.
      setErrorDeAnular(error instanceof Error ? error.message : t('recibos.anular.fallo'));
    } finally {
      setAnulando(false);
    }
  }, [aAnular, cerrarAnular, formatCurrency, motivo, onAnular, t]);

  return (
    <div className={cn('space-y-3', className)} data-testid="recibos-historial">
      <p className="text-sm text-fg-muted">{t('recibos.queEs')}</p>

      {fallo && (
        <Banner variant="warning">
          <span className="flex flex-wrap items-center gap-2">
            {t('recibos.historial.fallo')}
            {onReintentar && (
              <Button variant="link" size="sm" hideArrow className="h-auto p-0" onClick={onReintentar}>
                <ArrowClockwise className="w-3.5 h-3.5" />
                {t('recibos.historial.reintentar')}
              </Button>
            )}
          </span>
        </Banner>
      )}

      {cargando && ordenados.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <Spinner size="sm" variant="current" />
          {t('recibos.historial.cargando')}
        </p>
      ) : ordenados.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <Receipt className="mx-auto mb-2 h-6 w-6 text-fg-muted" weight="duotone" />
          <p className="text-sm font-medium text-fg">{t('recibos.historial.vacio')}</p>
          <p className="mt-1 text-sm text-fg-muted">{t('recibos.historial.vacioDesc')}</p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {ordenados.map((recibo) => {
              const vivo = estaVivo(recibo);
              const numero = String(recibo.numero ?? '').trim();
              return (
                <li
                  key={recibo.id}
                  className={cn(
                    'rounded-lg border p-3',
                    vivo ? 'border-border bg-muted/30' : 'border-dashed border-border bg-transparent',
                  )}
                  data-anulado={vivo ? undefined : 'true'}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                          vivo ? 'bg-success-soft' : 'bg-muted',
                        )}
                      >
                        {vivo ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <Prohibit className="h-4 w-4 text-fg-muted" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={cn(
                            'font-mono text-sm font-medium tabular-nums',
                            vivo ? 'text-fg' : 'text-fg-muted line-through',
                          )}
                        >
                          {formatCurrency(recibo.valorCop)}
                        </p>
                        <p className="truncate text-xs text-fg-muted">
                          {numero
                            ? t('recibos.historial.numero', { numero })
                            : t('recibos.historial.sinNumero')}
                          {recibo.medio ? ` · ${recibo.medio}` : ''}
                          {recibo.referencia ? ` · ${recibo.referencia}` : ''}
                        </p>
                        {recibo.notas && (
                          <p className="mt-1 text-xs text-fg-muted">{recibo.notas}</p>
                        )}
                        {!vivo && recibo.anuladoAt && (
                          <p className="mt-1 text-xs text-danger">
                            {t('recibos.historial.anuladoEl', {
                              fecha: formatDate(new Date(recibo.anuladoAt), {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              }),
                            })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="text-xs text-fg-muted">
                        {recibo.fecha
                          ? formatDate(new Date(recibo.fecha), { day: 'numeric', month: 'short' })
                          : '—'}
                      </span>
                      {vivo ? (
                        onAnular && (
                          <Button
                            variant="ghost"
                            size="sm"
                            hideArrow
                            className="h-auto px-2 py-1 text-xs text-danger"
                            onClick={() => {
                              setAAnular(recibo);
                              setMotivo('');
                              setErrorDeAnular(null);
                            }}
                          >
                            {t('recibos.historial.anular')}
                          </Button>
                        )
                      ) : (
                        <Badge variant="destructive">{t('recibos.historial.anulado')}</Badge>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="rounded-lg border border-border bg-card px-4 py-1">
            <KeyValueList
              compact
              items={[
                {
                  label: t('recibos.historial.recibidoConRecibo'),
                  value: formatCurrency(recibidoConRecibo),
                  valueColor: 'success',
                },
                {
                  label:
                    vivos.length === 1
                      ? t('recibos.historial.conteoUno')
                      : t('recibos.historial.conteo', { count: vivos.length }),
                  value: '',
                  muted: true,
                },
              ]}
            />
          </div>
        </>
      )}

      {/* Anular — el motivo es obligatorio y el back lo exige. */}
      <Dialog open={aAnular !== null} onOpenChange={(abierto) => !abierto && cerrarAnular()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {t('recibos.anular.titulo', { numero: String(aAnular?.numero ?? '') })}
            </DialogTitle>
            <DialogDescription>
              {t('recibos.anular.queVaAPasar', {
                monto: formatCurrency(aAnular?.valorCop ?? 0),
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label htmlFor="motivo-anulacion" className="text-sm font-medium text-foreground">
              {t('recibos.anular.motivoLabel')}
            </label>
            <Textarea
              id="motivo-anulacion"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={t('recibos.anular.motivoPlaceholder')}
              className="w-full resize-none"
            />
          </div>

          {errorDeAnular && <Banner variant="danger">{errorDeAnular}</Banner>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={cerrarAnular} disabled={anulando}>
              {t('recibos.anular.cancelar')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              hideArrow
              onClick={confirmarAnular}
              disabled={anulando || motivo.trim().length === 0}
              isLoading={anulando}
            >
              {anulando ? t('recibos.anular.anulando') : t('recibos.anular.confirmar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RecibosDeCajaHistorial;
