'use client';

/**
 * 🔴 C2-AGREGADOR (Nico, P2): «Es el giro de Leasefy». Leasefy recauda los
 * pagos en línea y le gira a la inmobiliaria el NETO de una liquidación (qué
 * pagos incluye y qué se descontó, tal como viene). Si esta línea del banco es
 * ese giro, se marca contra la liquidación: los recibos ya se emitieron con
 * cada pago en línea, así que no se emite nada. La diferencia entre lo bruto y
 * lo neto la DOCUMENTA la liquidación (no se adivina).
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bank } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { conciliacionBancariaApi } from '@/lib/api/conciliacion-bancaria.service';
import type { MovimientoBancario, PropuestaDelGiro } from '@/lib/api/conciliacion-bancaria.types';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { diaLegible, plata } from './formato';
import { useAparecer } from './cuentas-del-extracto';

interface Props {
  movimiento: MovimientoBancario;
  propuestas: PropuestaDelGiro[];
  puedeEditar: boolean;
  ocupado: boolean;
  onCambio: () => void;
}

export function PropuestaDeLaPasarelaGiro({ movimiento, propuestas, puedeEditar, ocupado, onCambio }: Props) {
  const mov = useAparecer();
  const [enviando, setEnviando] = useState<string | null>(null);

  const confirmar = async (p: PropuestaDelGiro) => {
    setEnviando(p.liquidacionId);
    try {
      await conciliacionBancariaApi.esElGiroDeLeasefy(movimiento.id, p.liquidacionId);
      toast.success(
        `La línea quedó como el giro de Leasefy de la liquidación ${p.numero} (${p.cantidadDePagos} ${
          p.cantidadDePagos === 1 ? 'pago en línea' : 'pagos en línea'
        }). No se emitió nada.`,
      );
      onCambio();
    } catch (error) {
      toast.error(
        mensajeParaLaPersona(error, {
          porDefecto: 'No se pudo marcar la línea como el giro de Leasefy.',
          accion: 'marcar la línea como el giro de Leasefy',
        }),
      );
    } finally {
      setEnviando(null);
    }
  };

  return (
    <AnimatePresence initial={false}>
      <motion.section
        key="giro-de-leasefy"
        {...mov}
        className="mb-2 space-y-2 rounded-md border border-info/40 bg-info-soft px-2.5 py-2"
        aria-label="Puede ser el giro de Leasefy"
        data-testid={`giro-de-leasefy-${movimiento.id}`}
      >
        <p className="flex items-center gap-1.5 text-caption font-medium text-fg">
          <Bank className="h-4 w-4" aria-hidden="true" />
          Puede ser el giro de Leasefy por tus pagos en línea
        </p>
        <ul className="space-y-1.5">
          {propuestas.map((p) => (
            <li key={p.liquidacionId} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-0.5">
                <p className="text-body-sm text-fg">
                  Liquidación {p.numero} · {diaLegible(p.fechaDelGiro)} · neto{' '}
                  <span className="tabular-nums font-medium">{plata(p.netoCop)}</span>
                </p>
                <p className="text-caption text-fg-muted">
                  {p.cantidadDePagos} {p.cantidadDePagos === 1 ? 'pago en línea' : 'pagos en línea'} por{' '}
                  <span className="tabular-nums">{plata(p.brutoCop)}</span>
                  {p.descuentos.length > 0 &&
                    ` − ${p.descuentos.map((d) => `${d.concepto} ${plata(d.valorCop)}`).join(', ')} (lo documenta la liquidación)`}
                </p>
                <p className="text-caption text-fg-muted">{p.porQue.join(' ')}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                hideArrow
                className="shrink-0"
                disabled={!puedeEditar || ocupado || enviando !== null}
                isLoading={enviando === p.liquidacionId}
                onClick={() => void confirmar(p)}
                data-testid={`es-el-giro-de-leasefy-${movimiento.id}`}
              >
                Es el giro de Leasefy
              </Button>
            </li>
          ))}
        </ul>
      </motion.section>
    </AnimatePresence>
  );
}
