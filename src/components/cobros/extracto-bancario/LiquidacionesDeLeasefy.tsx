'use client';

/**
 * 🔴 C2-AGREGADOR (Nico, P2): las liquidaciones del recaudo en línea. Leasefy
 * recauda los pagos en línea en su cuenta de Wompi y te gira el NETO: cada
 * liquidación dice qué pagos incluye (con su recibo) y qué se descontó, tal
 * como viene. El giro se concilia solo con la línea del banco que trae su
 * referencia; si no, aparece en la fila como «Es el giro de Leasefy».
 *
 * Sin liquidaciones (o sin la migración del back) no se pinta nada: no es un
 * error, es que todavía no hay giros.
 */

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { motionDuration, motionEase } from '@leasefy/cadence';
import { Bank, CaretDown } from '@phosphor-icons/react';
import { conciliacionBancariaApi } from '@/lib/api/conciliacion-bancaria.service';
import type { LiquidacionDeLeasefy } from '@/lib/api/conciliacion-bancaria.types';
import { diaLegible, plata } from './formato';
import { useAparecer } from './cuentas-del-extracto';

interface Props {
  /** Cambia cuando la pantalla recarga (una carga, una conciliación). */
  version?: number;
}

export function LiquidacionesDeLeasefy({ version = 0 }: Props) {
  const mov = useAparecer();
  const reducido = useReducedMotion() ?? false;
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionDeLeasefy[]>([]);
  const [abierta, setAbierta] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await conciliacionBancariaApi.liquidacionesDeLeasefy();
      setLiquidaciones(r.disponible ? r.data : []);
    } catch {
      // Una lectura auxiliar: si falla, la pantalla del extracto sigue igual.
      setLiquidaciones([]);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar, version]);

  if (liquidaciones.length === 0) return null;
  const pendientes = liquidaciones.filter((l) => l.estado === 'pendiente').length;

  return (
    <motion.section
      {...mov}
      className="rounded-lg border border-border bg-surface p-4 space-y-3"
      aria-label="Giros de Leasefy por tus pagos en línea"
      data-testid="liquidaciones-de-leasefy"
    >
      <header className="flex items-start gap-2">
        <Bank className="mt-0.5 h-5 w-5 text-fg-muted" aria-hidden="true" />
        <div>
          <h3 className="text-body font-medium text-fg">Giros de Leasefy por tus pagos en línea</h3>
          <p className="text-caption text-fg-muted">
            Leasefy recauda tus pagos en línea y te gira el neto. Cada pago ya tiene su recibo: el giro sólo se
            concilia con la línea de tu banco. {pendientes > 0 ? `${pendientes} sin su línea del banco todavía.` : 'Todos conciliados.'}
          </p>
        </div>
      </header>
      <ul className="divide-y divide-border">
        {liquidaciones.map((l) => (
          <li key={l.id} className="py-2">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-expanded={abierta === l.id}
              onClick={() => setAbierta(abierta === l.id ? null : l.id)}
              data-testid={`liquidacion-${l.id}`}
            >
              <span className="min-w-0 text-body-sm text-fg">
                Liquidación {l.numero} · {diaLegible(l.fechaDelGiro)} · neto{' '}
                <span className="tabular-nums font-medium">{plata(l.netoCop)}</span>
                <span className={l.estado === 'conciliada' ? ' text-success' : ' text-fg-muted'}>
                  {l.estado === 'conciliada' ? ' · conciliada' : ' · esperando la línea del banco'}
                </span>
              </span>
              <motion.span animate={{ rotate: abierta === l.id ? 180 : 0 }} transition={{ duration: reducido ? 0 : motionDuration.fast, ease: motionEase.enter }}>
                <CaretDown className="h-4 w-4 text-fg-muted" aria-hidden="true" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {abierta === l.id && (
                <motion.div key="detalle" {...mov} className="mt-2 space-y-1 text-caption text-fg-muted">
                  <p>
                    {l.pagos.length} {l.pagos.length === 1 ? 'pago en línea' : 'pagos en línea'} por{' '}
                    <span className="tabular-nums">{plata(l.brutoCop)}</span>
                    {l.descuentos.map((d) => ` − ${d.concepto} ${plata(d.valorCop)}`).join('')} ={' '}
                    <span className="tabular-nums">{plata(l.netoCop)}</span>. Los descuentos vienen de la liquidación.
                  </p>
                  <ul className="space-y-0.5">
                    {l.pagos.map((p) => (
                      <li key={p.transaccionId} className="tabular-nums">
                        {p.reciboNumero !== null ? `Recibo N.º ${p.reciboNumero}` : 'Sin recibo'} · {plata(p.brutoCop)} − {plata(p.comisionCop + p.ivaCop + p.retencionesCop)} = {plata(p.netoCop)}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
