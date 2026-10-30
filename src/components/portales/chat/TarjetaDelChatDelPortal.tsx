'use client';

/**
 * La tarjeta con «Sí, hazlo» del chat del portal: mismo dibujo que la de las
 * acciones del chat del panel (`beta/AccionPropuestaCard`), sin lo que sólo
 * tiene sentido allá (destinatarios, «vence en N min»). Nada se hace sin este
 * clic; el resultado se queda escrito en la tarjeta.
 */
import { Badge, Button } from '@leasefy/cadence';

import type { TarjetaDelChatDelPortal as Tarjeta } from '@/lib/portales/chat-del-portal';

export type EstadoDeLaTarjetaDelPortal = 'pendiente' | 'haciendo' | 'hecha' | 'fallida' | 'cancelada';

const INSIGNIA: Record<
  EstadoDeLaTarjetaDelPortal,
  { variante: 'warning' | 'primary' | 'success' | 'danger' | 'neutral'; texto: string }
> = {
  pendiente: { variante: 'warning', texto: 'Espera tu sí' },
  haciendo: { variante: 'primary', texto: 'En curso…' },
  hecha: { variante: 'success', texto: 'Hecho' },
  fallida: { variante: 'danger', texto: 'No salió' },
  cancelada: { variante: 'neutral', texto: 'No se hizo' },
};

export function TarjetaDelChatDelPortal({
  tarjeta,
  estado,
  resultado,
  onSi,
  onAhoraNo,
  children,
}: {
  tarjeta: Tarjeta;
  estado: EstadoDeLaTarjetaDelPortal;
  resultado?: string | null;
  onSi: () => void;
  onAhoraNo: () => void;
  /** Lo que se puede hacer DESPUÉS (p. ej. agregar la foto a la solicitud radicada). */
  children?: React.ReactNode;
}) {
  const insignia = INSIGNIA[estado];
  const abierta = estado === 'pendiente' || estado === 'haciendo';
  return (
    <div
      role="region"
      aria-label={tarjeta.titulo}
      data-estado={estado}
      className="flex w-full flex-col gap-3 rounded-[14px] border border-border-faint bg-surface p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <span className="font-body text-body-sm text-fg">{tarjeta.titulo}</span>
        <Badge variant={insignia.variante}>{insignia.texto}</Badge>
      </div>

      <p className="font-body text-[13px] leading-relaxed text-fg-muted">{tarjeta.detalle}</p>

      {resultado && (
        <p
          role="status"
          className={`font-body text-[13px] leading-relaxed ${estado === 'hecha' ? 'text-success' : 'text-danger'}`}
        >
          {resultado}
        </p>
      )}

      {abierta && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <Button
            variant="primary"
            size="sm"
            loading={estado === 'haciendo'}
            disabled={estado === 'haciendo'}
            onClick={onSi}
          >
            {tarjeta.boton}
          </Button>
          <Button variant="outline" size="sm" disabled={estado === 'haciendo'} onClick={onAhoraNo}>
            Ahora no
          </Button>
        </div>
      )}

      {children}
    </div>
  );
}
