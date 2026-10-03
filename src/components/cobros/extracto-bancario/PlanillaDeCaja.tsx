'use client';

/**
 * LA PLANILLA DE CAJA DEL DÍA (Nico, P12, 03-10-2026). Sólo si la
 * inmobiliaria recibe efectivo (Configuración → Costos de la plata; apagado por
 * defecto: «sólo transferencia y pasarela»). Cada día con recibos en efectivo
 * es una planilla: su total, qué falta consignar y la línea del banco que le
 * calza. «Conciliar» es el muchos a uno de siempre con esos recibos; la
 * «Segura» es la que el Piloto podría aplicar solo (única, exacta, dice
 * efectivo y sin otra planilla igual cerca).
 */

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Coins } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { cierreDeConciliacionApi, type PlanillasDeCaja } from '@/lib/api/cierre-de-conciliacion';
import { useAparecer } from './cuentas-del-extracto';
import { pesos } from './cierre-del-mes';
import { diaLegible } from './formato';

const ESTADO = {
  CONSIGNADA: { texto: 'Consignada', variante: 'success' as const },
  PARCIAL: { texto: 'Consignada en parte', variante: 'warning' as const },
  POR_CONSIGNAR: { texto: 'Por consignar', variante: 'secondary' as const },
};

export function PlanillaDeCaja({ puedeConciliar, version = 0, onCambio }: { puedeConciliar: boolean; version?: number; onCambio: () => void }) {
  const aparecer = useAparecer();
  const [datos, setDatos] = useState<PlanillasDeCaja | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const leer = useCallback(async () => {
    try {
      setDatos(await cierreDeConciliacionApi.planillas());
    } catch {
      setDatos(null);
    }
  }, []);

  useEffect(() => {
    void leer();
  }, [leer, version]);

  // Con el efectivo apagado (por defecto) no se pinta nada: es como hoy.
  if (!datos?.activo) return null;
  const conAlgo = datos.planillas.filter((p) => p.estado !== 'CONSIGNADA' || p.propuestas.length > 0);

  const conciliar = async (fecha: string, movimientoId: string) => {
    setOcupado(`${fecha}:${movimientoId}`);
    try {
      await cierreDeConciliacionApi.conciliarPlanilla(fecha, movimientoId);
      toast.success(`La planilla del ${fecha} quedó conciliada con su consignación.`);
      await leer();
      onCambio();
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo conciliar la planilla.', accion: 'conciliar la planilla de caja' }));
    } finally {
      setOcupado(null);
    }
  };

  return (
    <motion.section {...aparecer} className="space-y-3 rounded-lg border border-border bg-surface p-4" data-testid="planilla-de-caja">
      <div className="flex items-center gap-2">
        <Coins className="h-5 w-5 text-fg-muted" aria-hidden="true" />
        <h3 className="text-body font-semibold text-fg">Planilla de caja</h3>
        <span className="text-caption text-fg-muted">
          {/* 🔴 (03-10-2026) Las fechas en palabras, como el resto del extracto (antes «Del 2026-08-04 al 2026-10-03»). */}
          Del {datos.desde ? diaLegible(datos.desde) : '—'} al {datos.hasta ? diaLegible(datos.hasta) : '—'}: los recibos en efectivo de cada día contra su consignación.
        </span>
      </div>
      {conAlgo.length === 0 ? (
        <p className="text-caption text-fg-muted">Todo el efectivo de esos días está consignado y conciliado.</p>
      ) : (
        <ul className="divide-y divide-border">
          {conAlgo.slice(0, 15).map((p) => (
            <li key={p.fecha} className="space-y-1 py-2" data-testid={`planilla-${p.fecha}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-body-sm font-medium text-fg">{diaLegible(p.fecha)}</span>
                <Badge variant={ESTADO[p.estado].variante}>{ESTADO[p.estado].texto}</Badge>
                <span className="text-caption text-fg-muted">
                  {p.recibos.length} {p.recibos.length === 1 ? 'recibo' : 'recibos'} · {pesos(p.totalCop)}
                  {p.porConsignarCop !== p.totalCop ? ` · falta ${pesos(p.porConsignarCop)}` : ''}
                  {p.diasSinConsignar !== null && p.diasSinConsignar > 5 ? ` · ${p.diasSinConsignar} días sin consignar` : ''}
                </span>
              </div>
              {p.propuestas.map((x) => (
                <div key={x.movimientoId} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-muted px-3 py-2">
                  <div className="text-caption text-fg">
                    <span className="font-medium">
                      {diaLegible(x.fecha)} · «{x.descripcion}» · {pesos(x.valorCop)}
                    </span>
                    {x.segura && (
                      <Badge variant="success" className="ml-2">
                        Segura
                      </Badge>
                    )}
                    <p className="text-fg-muted">{x.porQue.join(' ')}</p>
                  </div>
                  {puedeConciliar && (
                    <Button
                      size="sm"
                      hideArrow
                      isLoading={ocupado === `${p.fecha}:${x.movimientoId}`}
                      disabled={ocupado !== null}
                      onClick={() => void conciliar(p.fecha, x.movimientoId)}
                      data-testid={`conciliar-planilla-${p.fecha}-${x.movimientoId}`}
                    >
                      Conciliar
                    </Button>
                  )}
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </motion.section>
  );
}
