'use client';

/**
 * La tarjeta con «Sí, hazlo» del chat del portal: mismo dibujo que la de las
 * acciones del chat del panel (`beta/AccionPropuestaCard`), sin lo que sólo
 * tiene sentido allá (destinatarios, «vence en N min»). Nada se hace sin este
 * clic; el resultado se queda escrito en la tarjeta.
 *
 * Desde el 29-10 también trae DECISIONES (reparaciones y sobrecostos del
 * propietario): «Aprobar», «Rechazar» (con un porqué opcional que ve la
 * inmobiliaria) y «La hago yo», cada una su propio clic; la que pidió en
 * palabras va resaltada. El extracto es una descarga (sin «Ahora no»).
 */
import { useId, useState } from 'react';
import { Badge, Button, Collapse } from '@leasefy/cadence';

import { Textarea } from '@/components/ui/textarea';
import type {
  OpcionDeLaTarjetaDelPortal as Opcion,
  TarjetaDelChatDelPortal as Tarjeta,
} from '@/lib/portales/chat-del-portal';

export type EstadoDeLaTarjetaDelPortal = 'pendiente' | 'haciendo' | 'hecha' | 'fallida' | 'cancelada';

type Insignia = { variante: 'warning' | 'primary' | 'success' | 'danger' | 'neutral'; texto: string };

const INSIGNIA: Record<EstadoDeLaTarjetaDelPortal, Insignia> = {
  pendiente: { variante: 'warning', texto: 'Espera tu sí' },
  haciendo: { variante: 'primary', texto: 'En curso…' },
  hecha: { variante: 'success', texto: 'Hecho' },
  fallida: { variante: 'danger', texto: 'No salió' },
  cancelada: { variante: 'neutral', texto: 'No se hizo' },
};

/** Lo que espera cada tarjeta mientras nadie la toca. */
const PENDIENTE_POR_ACCION: Partial<Record<Tarjeta['accion'], Insignia>> = {
  bajar_extracto: { variante: 'neutral', texto: 'Para descargar' },
  decidir_reparacion: { variante: 'warning', texto: 'Por decidir' },
  decidir_sobrecosto: { variante: 'warning', texto: 'Por decidir' },
};

/** Sin «Ahora no»: decidir (no tocarla es no decidir) y descargar (no cambia nada). */
const SIN_AHORA_NO: ReadonlySet<Tarjeta['accion']> = new Set(['bajar_extracto', 'decidir_reparacion', 'decidir_sobrecosto']);

function Decisiones({
  opciones,
  haciendo,
  onDecidir,
}: {
  opciones: Opcion[];
  haciendo: boolean;
  onDecidir: (opcion: Opcion, motivo?: string) => void;
}) {
  const id = useId();
  const [conMotivo, setConMotivo] = useState<Opcion | null>(null);
  const [motivo, setMotivo] = useState('');
  const [elegida, setElegida] = useState<Opcion['accion'] | null>(null);
  const decidir = (o: Opcion, m?: string) => {
    setElegida(o.accion);
    onDecidir(o, m);
  };
  return (
    <div className="flex flex-col gap-3 pt-0.5">
      {!conMotivo && (
        <div className="flex flex-wrap items-center gap-2">
          {opciones.map((o) => (
            <Button
              key={o.accion}
              variant={o.principal ? 'primary' : 'outline'}
              size="sm"
              disabled={haciendo}
              loading={haciendo && elegida === o.accion}
              onClick={() => (o.pideMotivo ? setConMotivo(o) : decidir(o))}
            >
              {o.boton}
            </Button>
          ))}
        </div>
      )}
      <Collapse open={conMotivo !== null}>
        {conMotivo && (
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-motivo`} className="font-body text-[13px] text-fg-muted">
              ¿Por qué? Es opcional y lo ve tu inmobiliaria.
            </label>
            <Textarea
              id={`${id}-motivo`}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              maxLength={500}
              disabled={haciendo}
              className="min-h-[64px] resize-none"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" size="sm" loading={haciendo} disabled={haciendo} onClick={() => decidir(conMotivo, motivo)}>
                {conMotivo.boton}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={haciendo}
                onClick={() => {
                  setConMotivo(null);
                  setMotivo('');
                }}
              >
                Volver
              </Button>
            </div>
          </div>
        )}
      </Collapse>
    </div>
  );
}

export function TarjetaDelChatDelPortal({
  tarjeta,
  estado,
  resultado,
  onSi,
  onAhoraNo,
  onDecidir,
  ocultarBotones = false,
  children,
}: {
  tarjeta: Tarjeta;
  estado: EstadoDeLaTarjetaDelPortal;
  resultado?: string | null;
  onSi: () => void;
  onAhoraNo: () => void;
  /** El clic en una de las decisiones de la tarjeta (con el porqué, si lo escribió). */
  onDecidir?: (opcion: Opcion, motivo?: string) => void;
  /** Mientras el formulario de la tarjeta está abierto, los botones son los suyos. */
  ocultarBotones?: boolean;
  /** Lo que se puede hacer DESPUÉS (la foto del daño) o el formulario que abre la tarjeta. */
  children?: React.ReactNode;
}) {
  const insignia = (estado === 'pendiente' && PENDIENTE_POR_ACCION[tarjeta.accion]) || INSIGNIA[estado];
  const abierta = estado === 'pendiente' || estado === 'haciendo';
  const opciones = tarjeta.opciones ?? [];
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
          className={`font-body text-[13px] leading-relaxed ${
            estado === 'hecha' ? 'text-success' : estado === 'fallida' ? 'text-danger' : 'text-fg-muted'
          }`}
        >
          {resultado}
        </p>
      )}

      {abierta && !ocultarBotones && opciones.length > 0 && onDecidir && (
        <Decisiones opciones={opciones} haciendo={estado === 'haciendo'} onDecidir={onDecidir} />
      )}

      {abierta && !ocultarBotones && opciones.length === 0 && (
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
          {!SIN_AHORA_NO.has(tarjeta.accion) && (
            <Button variant="outline" size="sm" disabled={estado === 'haciendo'} onClick={onAhoraNo}>
              Ahora no
            </Button>
          )}
        </div>
      )}

      {children}
    </div>
  );
}
