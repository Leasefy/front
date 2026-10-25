'use client';

/**
 * 🔴 «¿De qué inmueble?» (Nico, 21-10-2026): quien arrienda dos o más
 * inmuebles escoge cuáles ver. Las tarjetas de «Pagos» y lo que se puede
 * pagar se recortan a lo escogido; «Todos» los suma. Se puede escoger más de
 * uno («como él quiera»); nunca queda ninguno (quitar el último vuelve a todos).
 */
import { MotionIndicator } from '@leasefy/cadence';
import { House } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { sumar } from '@/lib/plata/plata';
import { nombreDelInmueble, type ArriendoQueSePuedePagar } from '@/lib/api/pago-en-linea.service';

interface Props {
  arriendos: ArriendoQueSePuedePagar[];
  /** Los `leaseId` escogidos. */
  escogidos: string[];
  onCambiar: (escogidos: string[]) => void;
}

export function InmueblesDelInquilino({ arriendos, escogidos, onCambiar }: Props) {
  const { formatCurrency } = useI18n();
  const todos = escogidos.length === arriendos.length;
  const alternar = (leaseId: string) => {
    if (todos) return onCambiar([leaseId]);
    const siguiente = escogidos.includes(leaseId) ? escogidos.filter((x) => x !== leaseId) : [...escogidos, leaseId];
    onCambiar(siguiente.length === 0 ? arriendos.map((a) => a.leaseId) : arriendos.map((a) => a.leaseId).filter((x) => siguiente.includes(x)));
  };

  return (
    <section data-testid="inmuebles-del-inquilino" aria-label="Tus inmuebles" className="mb-6">
      <p className="mb-2 text-label text-fg-subtle">Tus inmuebles</p>
      <div role="group" aria-label="Escoge de qué inmuebles ver y pagar" className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={todos}
          data-testid="inmueble-todos"
          onClick={() => onCambiar(arriendos.map((a) => a.leaseId))}
          className={cn(
            // Glow up 23-10: lo escogido con el tono de la fila activa del menú (como las pestañas de estado).
            'relative isolate inline-flex h-10 items-center gap-2 rounded-full border px-4 text-body-sm transition-colors',
            todos
              ? 'border-transparent font-medium text-[color:var(--menu-activa-tinta)]'
              : 'border-border bg-surface text-fg hover:bg-surface-muted',
          )}
        >
          {todos && (
            <MotionIndicator
              layoutId="inmuebles-del-inquilino-todos"
              className="inset-0 -z-10 rounded-full bg-[color:var(--menu-activa)]"
            />
          )}
          Todos <span className="font-mono text-caption tabular-nums">({arriendos.length})</span>
        </button>
        {arriendos.map((a) => {
          const activo = !todos && escogidos.includes(a.leaseId);
          const debe = sumar(...a.cuotas.map((c) => c.valorCop));
          return (
            <button
              key={a.leaseId}
              type="button"
              aria-pressed={activo}
              data-testid={`escoger-${a.leaseId}`}
              onClick={() => alternar(a.leaseId)}
              className={cn(
                'inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border px-4 py-1.5 text-left text-body-sm transition-colors',
                activo
                  ? 'border-transparent bg-[color:var(--menu-activa)] text-[color:var(--menu-activa-tinta)]'
                  : 'border-border bg-surface text-fg hover:bg-surface-muted',
              )}
            >
              <House className="h-4 w-4 flex-shrink-0" weight={activo ? 'fill' : 'regular'} />
              <span className="min-w-0">
                <span className="block truncate">{nombreDelInmueble(a)}</span>
                <span className="block font-mono text-caption tabular-nums text-fg-muted">
                  {a.contratoNumero !== null ? `Contrato ${a.contratoNumero}` : 'Sin número de contrato'}
                  {debe > 0 ? ` · ${formatCurrency(debe)}` : ''}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
