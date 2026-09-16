'use client';

/**
 * Las deducciones de un propietario, en su ficha: qué se le va a descontar, en
 * qué liquidación está cada una, lo ya descontado y lo anulado.
 *
 * ── Por qué en la ficha del propietario ─────────────────────────────────────
 *
 * Un descuento manual es de UN propietario —«le pagamos el predial»— y se
 * registra donde está él. Liquidaciones muestra el mes entero y ahí se ve el
 * efecto de cada deducción; acá se registran, se revisan con su soporte y se
 * anulan. Las reparaciones no se registran acá: nacen al aprobar la cotización
 * de mantenimiento, a cargo del propietario.
 *
 * Los permisos son los del back: ver es `propietarios:view`; registrar pide
 * `dispersiones:create` y anular `dispersiones:edit`, porque mueven lo que se
 * le gira.
 */

import { useCallback, useEffect, useState } from 'react';
import { Plus, Receipt } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { deduccionesApi } from '@/lib/api/deducciones.service';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useI18n } from '@/lib/i18n';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import type {
  DeduccionDelListado,
  EstadoDeLaDeduccion,
  ListadoDeDeducciones,
} from '@/lib/types/deducciones';
import { mesEnTitulo } from '@/lib/utils/mes';
import { AnularDeduccionDialog } from './AnularDeduccionDialog';
import {
  RegistrarDescuentoDialog,
  type InmuebleParaElDescuento,
} from './RegistrarDescuentoDialog';
import { SoporteDeLaDeduccion } from './SoporteDeLaDeduccion';

const TONO: Record<EstadoDeLaDeduccion, 'warning' | 'default' | 'success' | 'secondary'> = {
  PENDIENTE: 'warning',
  EN_LIQUIDACION: 'default',
  APLICADA: 'success',
  ANULADA: 'secondary',
  PROYECTADA: 'default',
};

function mensajeDe(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

export function DeduccionesDelPropietario({
  propietarioId,
  inmuebles,
}: {
  propietarioId: string;
  inmuebles: InmuebleParaElDescuento[];
}) {
  const { t, locale } = useI18n();
  const k = (s: string) => `inmobiliaria.deducciones.${s}`;
  const { canAccess } = usePermissions();
  const puedeRegistrar = canAccess('dispersiones', 'create');
  const puedeAnular = canAccess('dispersiones', 'edit');

  const [listado, setListado] = useState<ListadoDeDeducciones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [registrando, setRegistrando] = useState(false);
  const [aAnular, setAAnular] = useState<DeduccionDelListado | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setListado(await deduccionesApi.listar(propietarioId));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [propietarioId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const estadoLegible = (d: DeduccionDelListado) => {
    const mes = d.mesDeLaLiquidacion ? mesEnTitulo(d.mesDeLaLiquidacion, locale === 'en' ? 'en' : 'es') : null;
    if (d.estado === 'EN_LIQUIDACION') {
      return mes ? t(k('estado.EN_LIQUIDACION'), { mes }) : t(k('estado.EN_LIQUIDACION_SIN_MES'));
    }
    if (d.estado === 'APLICADA') {
      return mes ? t(k('estado.APLICADA'), { mes }) : t(k('estado.APLICADA_SIN_MES'));
    }
    return t(k(`estado.${d.estado}`));
  };

  const deducciones = listado?.deducciones ?? [];

  return (
    <section className="space-y-4" data-testid="deducciones-del-propietario">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-fg">{t(k('titulo'))}</h3>
          <p className="max-w-xl text-sm text-fg-muted">{t(k('descripcion'))}</p>
        </div>
        {puedeRegistrar && listado?.disponible && (
          <Button hideArrow onClick={() => setRegistrando(true)} data-testid="registrar-descuento-abrir">
            <Plus className="h-4 w-4" />
            {t(k('registrar'))}
          </Button>
        )}
      </div>

      {listado && !listado.disponible && (
        <p className="rounded-md border border-border bg-info-soft p-3 text-sm text-fg" data-testid="deducciones-sin-tabla">
          {t(k('sinTabla'))}
        </p>
      )}

      {listado?.disponible && (
        <div className="grid gap-3 sm:grid-cols-3" data-testid="deducciones-totales">
          {[
            { etiqueta: t(k('totalPendiente')), valor: listado.totales.pendienteCop },
            { etiqueta: t(k('totalEnLiquidacion')), valor: listado.totales.enLiquidacionCop },
            { etiqueta: t(k('totalSaldoEnContra')), valor: listado.totales.saldoEnContraCop },
          ].map((c) => (
            <div key={c.etiqueta} className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-fg-muted">{c.etiqueta}</p>
              <p className="font-mono text-lg font-semibold tabular-nums text-fg">{formatCurrency(c.valor)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <EstadoDeDatos
          cargando={cargando}
          error={error}
          queEs={t(k('queSon'))}
          onReintentar={() => void cargar()}
          vacio={Boolean(listado?.disponible) && deducciones.length === 0}
          cuandoVacio={
            <div className="flex flex-col items-center py-12 text-center">
              <Receipt className="mb-3 h-6 w-6 text-fg-muted" weight="duotone" />
              <p className="text-sm text-fg-muted">{t(k('vacio'))}</p>
            </div>
          }
        >
          {deducciones.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t(k('colFecha'))}</TableHead>
                    <TableHead>{t(k('colConcepto'))}</TableHead>
                    <TableHead className="text-right">{t(k('colValor'))}</TableHead>
                    <TableHead>{t(k('colEstado'))}</TableHead>
                    <TableHead>{t(k('colSoporte'))}</TableHead>
                    {puedeAnular && <TableHead />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deducciones.map((d) => (
                    <TableRow key={d.id} data-testid={`deduccion-${d.id}`} data-estado={d.estado}>
                      <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums">{d.fecha}</TableCell>
                      <TableCell>
                        <p className="text-sm text-fg">
                          {t(k(`origen.${d.origen}`))}
                          {d.origen !== 'SALDO_ANTERIOR' && `: ${d.motivo}`}
                        </p>
                        {d.participacionBps < 10_000 && (
                          <p className="text-xs text-fg-muted">
                            {t(k('suParte'), {
                              porcentaje: `${(d.participacionBps / 100).toLocaleString('es-CO')} %`,
                              total: formatCurrency(d.valorTotalCop),
                            })}
                          </p>
                        )}
                        {d.estado === 'ANULADA' && d.motivoDeAnulacion && (
                          <p className="text-xs text-fg-muted">
                            {t(k('anuladaPorque'), { motivo: d.motivoDeAnulacion })}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg">
                        {formatCurrency(d.valorCop)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={TONO[d.estado]}>{estadoLegible(d)}</Badge>
                      </TableCell>
                      <TableCell>
                        {d.tieneSoporte ? (
                          <SoporteDeLaDeduccion
                            propietarioId={propietarioId}
                            deduccionId={d.id}
                            nombre={d.soporteNombre}
                          />
                        ) : (
                          <span className="text-fg-muted">{t(k('sinSoporte'))}</span>
                        )}
                      </TableCell>
                      {puedeAnular && (
                        <TableCell className="text-right">
                          {(d.estado === 'PENDIENTE' || d.estado === 'EN_LIQUIDACION') &&
                            d.origen !== 'SALDO_ANTERIOR' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                hideArrow
                                onClick={() => setAAnular(d)}
                                data-testid={`anular-${d.id}`}
                              >
                                {t(k('anular'))}
                              </Button>
                            )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </EstadoDeDatos>
      </div>

      <RegistrarDescuentoDialog
        abierto={registrando}
        onOpenChange={setRegistrando}
        inmuebles={inmuebles}
        onGuardar={async (descuento) => {
          try {
            await deduccionesApi.registrar(propietarioId, descuento);
            toast.success(t(k('nuevo.registrado')));
            await cargar();
          } catch (e) {
            toast.error(t(k('nuevo.noSeRegistro')), { description: mensajeDe(e) });
            throw e;
          }
        }}
      />

      <AnularDeduccionDialog
        abierto={aAnular !== null}
        onOpenChange={(abierto) => {
          if (!abierto) setAAnular(null);
        }}
        concepto={aAnular ? `${t(k(`origen.${aAnular.origen}`))}: ${aAnular.motivo} · ${formatCurrency(aAnular.valorTotalCop)}` : null}
        onAnular={async (motivo) => {
          if (!aAnular) return;
          try {
            await deduccionesApi.anular(propietarioId, aAnular.grupoId, motivo);
            toast.success(t(k('anularDialogo.anulado')));
            await cargar();
          } catch (e) {
            toast.error(t(k('anularDialogo.noSeAnulo')), { description: mensajeDe(e) });
            throw e;
          }
        }}
      />
    </section>
  );
}
