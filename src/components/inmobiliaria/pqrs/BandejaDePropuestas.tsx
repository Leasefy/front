'use client';

/**
 * 🔴 LO QUE EL AGENTE PROPONE RADICAR (I-02, Nico 17/18-09-2026).
 *
 * «Una queja por WhatsApp o llamada: el agente la DETECTA y PROPONE radicarla,
 * una persona CONFIRMA y queda con la fecha del mensaje original».
 *
 * El rail por donde el agente las deja quedó construido el 18-09 y esta bandeja
 * no existía: las propuestas se acumulaban donde nadie las veía. El agente
 * detectaba quejas y ninguna llegaba a radicarse.
 *
 * Tres decisiones que esta pantalla sostiene:
 *
 * 🔴 NADA SE RADICA SOLO. El agente propone, una persona confirma. Una PQRS mal
 * radicada arranca un reloj legal contra la inmobiliaria — es la misma razón
 * por la que el nivel por defecto del agente es «sombra».
 *
 * 🔴 LA FECHA ES LA DEL MENSAJE ORIGINAL, no la de confirmar. Si alguien
 * escribió el lunes y se confirma el jueves, el plazo corrió desde el lunes.
 * Es el derecho de quien se quejó; la pantalla lo dice en cada tarjeta para que
 * nadie crea que demorarse en confirmar le compra tiempo.
 *
 * 🔴 DESCARTAR EXIGE MOTIVO. «No era una PQRS» sin decir por qué no le enseña
 * nada a nadie: ni al agente que la propuso, ni a quien revise después.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkle, Check, X, ChatCircleText, Phone } from '@phosphor-icons/react';

import { Button, Badge, Input } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { cn } from '@/lib/utils';
import {
  propuestasDePqrsApi,
  type PropuestaDePqrs,
} from '@/lib/api/propuestas-de-pqrs.service';

const ORIGEN_EN_PALABRAS: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  LLAMADA: 'una llamada',
  CORREO: 'un correo',
  PORTAL: 'el portal',
  PANEL: 'el panel',
};

const TIPO_EN_PALABRAS: Record<string, string> = {
  PETICION: 'Petición',
  QUEJA: 'Queja',
  RECLAMO: 'Reclamo',
  SUGERENCIA: 'Sugerencia',
};

export function BandejaDePropuestas({ onRadicada }: { onRadicada?: () => void }) {
  const { canAccess } = usePermissions();
  const puedeConfirmar = canAccess('operaciones', 'create');
  const puedeDescartar = canAccess('operaciones', 'edit');

  const [propuestas, setPropuestas] = useState<PropuestaDePqrs[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [descartando, setDescartando] = useState<PropuestaDePqrs | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setPropuestas(await propuestasDePqrsApi.listar());
    } catch {
      // Una bandeja que no carga NO puede tumbar la pantalla de solicitudes:
      // es un agregado, no la lista principal. Queda vacía y en silencio.
      setPropuestas([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const pendientes = useMemo(
    () => propuestas.filter((p) => !p.confirmadaAt && !p.descartadaAt),
    [propuestas],
  );

  // Sin nada pendiente la bandeja NO se dibuja: un bloque vacío permanente
  // arriba de la pantalla enseña a la gente a ignorar esa zona.
  if (cargando || pendientes.length === 0) return null;

  const confirmar = async (p: PropuestaDePqrs) => {
    setOcupada(p.id);
    try {
      await propuestasDePqrsApi.confirmar(p.id);
      toast.success(
        `Radicada con la fecha del mensaje original (${fechaCorta(p.recibidaAt)}).`,
      );
      await cargar();
      onRadicada?.();
    } catch (e) {
      toast.error(mensajeDeError(e, 'No se pudo radicar'));
    } finally {
      setOcupada(null);
    }
  };

  return (
    <section
      className="space-y-3 rounded-lg border border-primary/30 bg-primary-soft/40 p-4"
      data-testid="bandeja-de-propuestas"
    >
      <div className="flex items-start gap-2">
        <Sparkle className="mt-0.5 h-5 w-5 shrink-0 text-primary" weight="duotone" />
        <div>
          <h2 className="text-sm font-semibold text-fg">
            {pendientes.length === 1
              ? 'El agente detectó una posible PQRS'
              : `El agente detectó ${pendientes.length} posibles PQRS`}
          </h2>
          <p className="text-xs text-fg-muted">
            No se radica nada hasta que alguien lo confirme. Al confirmar, la PQRS
            queda con la fecha del mensaje original, no con la de hoy.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {pendientes.map((p) => (
          <li
            key={p.id}
            data-testid="propuesta"
            className="rounded-md border border-border bg-surface p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {TIPO_EN_PALABRAS[p.tipo] ?? p.tipo}
                  </Badge>
                  <span className="flex items-center gap-1 text-xs text-fg-muted">
                    {p.origen === 'LLAMADA' ? (
                      <Phone className="h-3.5 w-3.5" />
                    ) : (
                      <ChatCircleText className="h-3.5 w-3.5" />
                    )}
                    Llegó por {ORIGEN_EN_PALABRAS[p.origen] ?? p.origen}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-fg">{p.asunto}</p>
                <p className="text-xs text-fg-muted">
                  {p.solicitanteNombre}
                  {p.solicitanteContacto ? ` · ${p.solicitanteContacto}` : ''}
                </p>
                {/*
                  El extracto es lo que la persona dijo TEXTUAL. Va entre
                  comillas y sin recortar: quien confirma tiene que poder juzgar
                  si el agente entendió bien antes de arrancar un reloj legal.
                */}
                {p.extracto && (
                  <blockquote className="mt-2 border-l-2 border-border pl-2 text-xs italic text-fg-muted">
                    «{p.extracto}»
                  </blockquote>
                )}
                <p className="mt-2 text-xs text-fg-muted">
                  <strong className="text-fg">Se recibió el {fechaCorta(p.recibidaAt)}</strong>
                  {' — el plazo corre desde ahí, no desde hoy.'}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                {puedeConfirmar && (
                  <Button
                    hideArrow
                    isLoading={ocupada === p.id}
                    disabled={ocupada !== null}
                    onClick={() => void confirmar(p)}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Radicar
                  </Button>
                )}
                {puedeDescartar && (
                  <Button
                    variant="ghost"
                    hideArrow
                    disabled={ocupada !== null}
                    onClick={() => setDescartando(p)}
                  >
                    <X className="mr-1 h-4 w-4" />
                    No era
                  </Button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {descartando && (
        <DialogoDeDescarte
          propuesta={descartando}
          onCerrar={() => setDescartando(null)}
          onDescartada={async () => {
            setDescartando(null);
            await cargar();
          }}
        />
      )}
    </section>
  );
}

/**
 * El motivo es OBLIGATORIO. Descartar sin decir por qué no le enseña nada al
 * agente que la propuso ni a quien revise después por qué el agente se equivoca.
 */
function DialogoDeDescarte({
  propuesta,
  onCerrar,
  onDescartada,
}: {
  propuesta: PropuestaDePqrs;
  onCerrar: () => void;
  onDescartada: () => void | Promise<void>;
}) {
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim() || guardando) return;
    setGuardando(true);
    try {
      await propuestasDePqrsApi.descartar(propuesta.id, motivo.trim());
      toast.success('Descartada. El motivo queda con la propuesta.');
      await onDescartada();
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo descartar'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={guardando ? undefined : onCerrar}
      />
      <form
        onSubmit={enviar}
        className={cn('relative w-full max-w-md rounded-lg bg-background p-6')}
      >
        <h3 className="text-base font-semibold text-fg">¿Por qué no era una PQRS?</h3>
        <p className="mt-1 text-xs text-fg-muted">
          El motivo queda guardado. Es lo que deja ver dónde se equivoca el agente.
        </p>
        <Input
          autoFocus
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          maxLength={500}
          placeholder="Era una consulta de horarios, no un reclamo"
          className="mt-3"
          aria-label="Motivo del descarte"
        />
        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            hideArrow
            onClick={onCerrar}
            disabled={guardando}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            hideArrow
            isLoading={guardando}
            disabled={!motivo.trim() || guardando}
            className="flex-1"
          >
            Descartar
          </Button>
        </div>
      </form>
    </div>
  );
}

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
  });
}

function mensajeDeError(e: unknown, porDefecto: string): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return porDefecto;
}
