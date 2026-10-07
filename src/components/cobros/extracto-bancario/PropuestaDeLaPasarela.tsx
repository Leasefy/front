'use client';

/**
 * 🔴 «Puede ser el pago en línea de…» (Nico, P4, 02-10-2026).
 *
 * La pasarela sólo deja una línea del banco por fuera SOLA cuando la línea
 * trae el id de la transacción. Con el mismo valor y la fecha cerca, pero sin
 * el id, puede ser el pago en línea… o la consignación de OTRO inquilino que
 * pagó lo mismo esa semana. Lo decide la persona:
 *
 *   · «Es este pago en línea»: la línea queda por fuera con el recibo de ese
 *     pago (no se emite nada) y ese pago no se le propone a otra línea;
 *   · si no lo es, se concilia como siempre con los cruces de abajo.
 *
 * Va ARRIBA de los cruces: si la línea es esa plata, conciliarla contra una
 * cuota emitiría un segundo recibo por el mismo pago.
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CreditCard } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { conciliacionBancariaApi } from '@/lib/api/conciliacion-bancaria.service';
import type { MovimientoBancario, PropuestaDePasarela } from '@/lib/api/conciliacion-bancaria.types';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { diaLegible, plata } from './formato';
import { useAparecer } from './cuentas-del-extracto';

interface Props {
  movimiento: MovimientoBancario;
  propuestas: PropuestaDePasarela[];
  puedeEditar: boolean;
  ocupado: boolean;
  onCambio: () => void;
}

export function PropuestaDeLaPasarela({ movimiento, propuestas, puedeEditar, ocupado, onCambio }: Props) {
  const mov = useAparecer();
  const [enviando, setEnviando] = useState<string | null>(null);

  const confirmar = async (p: PropuestaDePasarela) => {
    setEnviando(p.pagoEnLineaId);
    try {
      await conciliacionBancariaApi.esDeLaPasarela(movimiento.id, p.pagoEnLineaId);
      toast.success(
        `La línea quedó como la plata del pago en línea${p.reciboNumero !== null ? ` (recibo N.º ${p.reciboNumero})` : ''}. No se emitió nada.`,
      );
      onCambio();
    } catch (error) {
      toast.error(
        mensajeParaLaPersona(error, {
          porDefecto: 'No se pudo marcar la línea como el pago en línea.',
          accion: 'marcar la línea como el pago en línea',
        }),
      );
    } finally {
      setEnviando(null);
    }
  };

  return (
    <AnimatePresence initial={false}>
      <motion.section
        key="pasarela"
        {...mov}
        className="mb-2 space-y-2 rounded-md border border-warning/40 bg-warning-soft px-2.5 py-2"
        aria-label="Puede ser un pago en línea"
        data-testid={`pasarela-${movimiento.id}`}
      >
        <p className="flex items-center gap-1.5 text-caption font-medium text-fg">
          <CreditCard className="h-4 w-4" aria-hidden="true" />
          Puede ser un pago en línea que ya tiene recibo
        </p>
        <ul className="space-y-1.5">
          {propuestas.map((p) => (
            <li key={p.pagoEnLineaId} className="flex flex-col gap-1.5">
              <div className="min-w-0 space-y-0.5">
                <p className="text-body-sm text-fg">
                  <span className="tabular-nums font-medium">{plata(p.valorCop)}</span>
                  {p.tenantName ? ` · ${p.tenantName}` : ''} · {diaLegible(p.fecha)}
                  {p.reciboNumero !== null ? ` · recibo N.º ${p.reciboNumero}` : ''}
                </p>
                <p className="text-caption text-fg-muted">{p.porQue.join(' ')}</p>
              </div>
              {p.diferenciaCop === 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  hideArrow
                  className="shrink-0 self-start"
                  disabled={!puedeEditar || ocupado || enviando !== null}
                  isLoading={enviando === p.pagoEnLineaId}
                  onClick={() => void confirmar(p)}
                  data-testid={`es-de-la-pasarela-${movimiento.id}`}
                >
                  Es este pago en línea
                </Button>
              )}
            </li>
          ))}
        </ul>
      </motion.section>
    </AnimatePresence>
  );
}
