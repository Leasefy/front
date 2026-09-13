'use client';

/**
 * AccionPropuestaCard — «Tenés 5 en mora, ¿le mando el recordatorio a los tres
 * de más de 30 días?», con un botón que lo manda de verdad.
 *
 * 🔴 Lo que distingue esta tarjeta de `<DecisionCard>`: aquélla registra una
 * decisión y la ejecución vive en otro frente; ésta EJECUTA. Por eso muestra,
 * antes de preguntar, las tres cosas que el operador necesita para decidir:
 *   - a QUIÉNES (con el contacto enmascarado y su detalle real: días y plata),
 *   - a quién NO y por qué (la Ley 2300, un opt-out, una cuenta que falta) —
 *     tachado, no escondido: si la tarjeta dice «3» y salen 2, el operador tiene
 *     derecho a saber por qué antes de confirmar,
 *   - el TEXTO exacto que va a salir.
 *
 * Y después de confirmar muestra lo que de verdad pasó, incluido lo que no
 * salió. Un «listo» sin detalle es como se termina creyendo que un envío salió
 * cuando no salió.
 *
 * La tarjeta no inventa nada: todo lo que pinta viene de la propuesta guardada
 * en el agente, y el botón sólo manda su id.
 */

import { useEffect, useState } from 'react';
import { Badge, Button } from '@leasefy/cadence';

import type { BackendAccionPropuesta } from '@/lib/api/ai-hub-acciones';
import { propuestaVencida, type ResultadoDeAccion } from '@/lib/api/ai-hub-acciones';

export type EstadoDeTarjeta =
  | 'pendiente'
  | 'confirmando'
  | 'ejecutada'
  | 'fallida'
  | 'cancelada'
  | 'vencida';

export interface AccionPropuestaCardProps {
  propuesta: BackendAccionPropuesta;
  estado: EstadoDeTarjeta;
  resultado?: ResultadoDeAccion | null;
  /** Motivo en palabras cuando algo salió mal antes de ejecutar (410, 409, 403). */
  error?: string | null;
  onConfirmar: () => void;
  onCancelar: () => void;
}

const INSIGNIA: Record<
  EstadoDeTarjeta,
  { variante: 'warning' | 'success' | 'neutral' | 'danger' | 'primary'; texto: string }
> = {
  pendiente: { variante: 'warning', texto: 'Requiere confirmación' },
  confirmando: { variante: 'primary', texto: 'Enviando…' },
  ejecutada: { variante: 'success', texto: 'Hecho' },
  fallida: { variante: 'danger', texto: 'No salió' },
  cancelada: { variante: 'neutral', texto: 'Cancelada' },
  vencida: { variante: 'neutral', texto: 'Venció' },
};

/** Minutos que le quedan a la propuesta, para que el operador no confirme tarde. */
function minutosRestantes(iso: string, ahora: number): number {
  const vence = Date.parse(iso);
  if (!Number.isFinite(vence)) return 0;
  return Math.max(0, Math.ceil((vence - ahora) / 60_000));
}

export function AccionPropuestaCard({
  propuesta,
  estado,
  resultado,
  error,
  onConfirmar,
  onCancelar,
}: AccionPropuestaCardProps) {
  // El reloj corre solo: una tarjeta que dice «quedan 3 minutos» y nunca cambia
  // miente igual que un número inventado.
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (estado !== 'pendiente') return;
    const id = setInterval(() => setAhora(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [estado]);

  const vencida = estado === 'vencida' || (estado === 'pendiente' && propuestaVencida(propuesta, new Date(ahora)));
  const estadoReal: EstadoDeTarjeta = vencida && estado === 'pendiente' ? 'vencida' : estado;
  const insignia = INSIGNIA[estadoReal];
  const abierta = estadoReal === 'pendiente' || estadoReal === 'confirmando';
  const incluidos = propuesta.destinatarios.filter((d) => !d.excluidoPor);
  const excluidos = propuesta.destinatarios.filter((d) => d.excluidoPor);
  const minutos = minutosRestantes(propuesta.venceEn, ahora);

  return (
    <div
      role="region"
      aria-label={propuesta.titulo}
      data-estado={estadoReal}
      className="flex w-full flex-col gap-3 rounded-[14px] border border-border-faint bg-surface p-4"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          aria-hidden
          className="inline-flex size-[26px] shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary"
        >
          {propuesta.titulo.slice(0, 1)}
        </span>
        <Badge variant={insignia.variante}>{insignia.texto}</Badge>
        {estadoReal === 'pendiente' && (
          <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
            {minutos > 0 ? `vence en ${minutos} min` : 'a punto de vencer'}
          </span>
        )}
      </div>

      <p className="font-body text-body-sm leading-relaxed text-fg">{propuesta.resumen}</p>

      {propuesta.destinatarios.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {incluidos.map((d) => (
            <li key={`${d.nombre}-${d.contacto}`} className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-body text-[13px] text-fg">{d.nombre}</span>
              <span className="font-mono text-[11px] tabular-nums text-fg-subtle">{d.contacto}</span>
              {d.detalle && (
                <span className="font-mono text-[11px] tabular-nums text-fg-muted">{d.detalle}</span>
              )}
            </li>
          ))}
          {excluidos.map((d) => (
            <li
              key={`x-${d.nombre}-${d.contacto}`}
              className="flex flex-wrap items-baseline gap-x-2 text-fg-subtle"
            >
              <span className="font-body text-[13px] line-through">{d.nombre}</span>
              <span className="font-body text-[11px]">no se le escribe: {d.excluidoPor}</span>
            </li>
          ))}
        </ul>
      )}

      {propuesta.texto && (
        <div className="rounded-[10px] border border-border-faint bg-bg px-3 py-2.5 font-body text-[12.5px] leading-relaxed text-fg-muted">
          {propuesta.texto}
        </div>
      )}

      {resultado && (
        <p
          className={`font-body text-[12.5px] leading-relaxed ${
            resultado.enviados > 0 ? 'text-success' : 'text-danger'
          }`}
        >
          {resultado.resumen}
        </p>
      )}

      {error && !resultado && (
        <p className="font-body text-[12.5px] leading-relaxed text-danger">{error}</p>
      )}

      {abierta && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <Button
            variant="primary"
            size="sm"
            loading={estadoReal === 'confirmando'}
            disabled={estadoReal === 'confirmando' || incluidos.length === 0}
            onClick={onConfirmar}
          >
            {incluidos.length > 1 ? `Confirmar (${incluidos.length})` : 'Confirmar'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={estadoReal === 'confirmando'}
            onClick={onCancelar}
          >
            Cancelar
          </Button>
        </div>
      )}

      {estadoReal === 'vencida' && !resultado && (
        <p className="font-body text-[12.5px] leading-relaxed text-fg-muted">
          Pedímela de nuevo y la preparo con los números de ahora.
        </p>
      )}
    </div>
  );
}
