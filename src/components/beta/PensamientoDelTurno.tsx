'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CaretDown, Check, X } from '@phosphor-icons/react';
import { AnimatedNumber, Collapse, motionDistance, motionDuration, motionEase } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { agenteDelDespacho, type AgenteDelEquipo } from '@/lib/agentes/equipo';
import type { EstadoDelOrbe, PasoDeRazonamiento } from '@/lib/agentes/agente-que-habla';
import {
  agentesDelPensamiento,
  conNombreDelEquipo,
  duracionEnPalabras,
  lineaParaLectores,
  partirPorLaCifra,
  type PasoDelPensamiento,
  type ResultadoDelPaso,
} from '@/lib/chat/pensamiento';
import { OrbeDeAgente } from '@/components/agentes/OrbeDeAgente';
import { PasosDelRazonamiento } from '@/components/agentes/TurnoDelEquipo';

/**
 * ══ EL PENSAMIENTO EN VIVO (Nico, 02-10-2026) ══════════════════════════════
 *
 * «Quiero que se sienta extremadamente inteligente ese chat, que la gente diga
 * WTF, ¡qué es esto tan hermoso e inteligente!». Cada paso que da el micro
 * entra MIENTRAS pasa, con lo concreto de la pregunta y de los datos
 * (`src/lib/chat/pensamiento.ts`):
 *
 *   ✓ Contratos que vencen entre el 1 y el 30 de noviembre de 2026
 *   ✓ Tu cartera al 2 de octubre → $985.507.187 en 561 clientes
 *   ◉ Le pido a Reportes: “Contratos que vencen…”…          ← el brillo lo recorre
 *       Revisando las 14 filas de contratos…                   ← lo que hace ahora
 *
 * Cuando llega la respuesta, la lista se PLIEGA sin salto en «Cómo lo pensó»,
 * que al abrirse muestra EXACTAMENTE las mismas líneas que pasaron (Nico,
 * 09-10-2026: «que se vea exactamente lo que pasó») y la delegación del turno.
 * Las frases de `done.razonamiento` quedan para las respuestas sin pasos.
 *
 * Sobrio, con la tipografía y los grises del chat: sin cajas, un riel fino que
 * une los pasos, el especialista con su orbe. Movimiento con Framer y los tokens
 * de Cadence (sólo `transform`/`opacity`; la altura, con `Collapse`); con
 * movimiento reducido no hay desplazamientos ni brillo. Para un lector de
 * pantalla, una sola línea `aria-live="polite"` con lo esencial: el paso que
 * corre o el resultado del que terminó — nunca cada brillo ni cada cifra que cuenta.
 */

const ESTADO_DEL_ORBE: Record<PasoDelPensamiento['estado'], EstadoDelOrbe> = {
  en_curso: 'trabajando',
  listo: 'listo',
  fallo: 'fallo',
};

const formatoDeLaCifra = (formato: 'numero' | 'moneda') => (n: number) => {
  const s = Math.round(n).toLocaleString('es-CO');
  return formato === 'moneda' ? `$${s}` : s;
};

/** El resultado de un paso, con su cifra contando desde 0 la primera vez que aparece. */
function Resultado({ r, agente }: { r: ResultadoDelPaso; agente?: string }) {
  const { t } = useI18n();
  const partes = partirPorLaCifra(r);
  if (!partes) return <span>{conNombreDelEquipo(r.texto, agente, t)}</span>;
  return (
    <span>
      {partes.antes}
      <AnimatedNumber
        value={partes.cifra}
        from={0}
        format={formatoDeLaCifra(partes.formato)}
        // Proporcional, como el resto del texto del chat: con cifras tabulares
        // los puntos de miles quedaban anchos («$48 . 600 . 000»).
        className="font-medium text-fg proportional-nums"
      />
      {conNombreDelEquipo(partes.despues, agente, t)}
    </span>
  );
}

/**
 * El texto del paso que corre, con un brillo que lo recorre. Son dos capas del
 * mismo texto: la de abajo en gris; la de arriba, clara, se ve sólo por una
 * ventana que viaja de izquierda a derecha mientras el texto de adentro viaja
 * al revés con la misma curva (las dos sólo con `transform`), así las letras
 * quedan quietas y lo que se mueve es la luz. Con movimiento reducido la capa
 * clara no existe (`globals.css`).
 */
function TextoConBrillo({ texto }: { texto: string }) {
  return (
    // `inline-block`: la luz recorre el ancho del TEXTO, no el de la fila
    // (en un paso corto, una ventana del ancho de la fila casi nunca pasa por él).
    <span className="chat-brillo inline-block max-w-full align-top">
      <span className="block line-clamp-2">{texto}</span>
      <span aria-hidden className="chat-brillo__capa">
        <span className="chat-brillo__ventana">
          <span className="chat-brillo__texto block line-clamp-2 text-fg">{texto}</span>
        </span>
      </span>
    </span>
  );
}

/** El glifo de cada paso: el orbe del especialista, o un punto vivo / un visto / una equis. */
function Glifo({ paso, agente }: { paso: PasoDelPensamiento; agente: AgenteDelEquipo | null }) {
  if (agente && paso.fase === 'despacho') {
    return <OrbeDeAgente agente={agente} estado={ESTADO_DEL_ORBE[paso.estado]} tamano={16} decorativo />;
  }
  if (paso.estado === 'en_curso') {
    return (
      <span className="chat-pensando-punto relative flex size-4 items-center justify-center" data-testid="paso-vivo">
        <span className="size-[5px] rounded-full bg-fg" />
      </span>
    );
  }
  if (paso.estado === 'fallo') {
    return (
      <span className="flex size-4 items-center justify-center text-danger">
        <X size={10} weight="bold" />
      </span>
    );
  }
  return (
    <span className="chat-paso-listo flex size-4 items-center justify-center text-fg-subtle">
      <Check size={10} weight="bold" />
    </span>
  );
}

/** Una fila del pensamiento: entra con su altura (sin empujar de golpe) y se asienta con su resultado. */
function FilaDelPaso({ paso, ultima }: { paso: PasoDelPensamiento; ultima: boolean }) {
  const { t } = useI18n();
  const agente = paso.fase === 'despacho' ? agenteDelDespacho(paso.agente) : null;
  const corriendo = paso.estado === 'en_curso';
  const texto = conNombreDelEquipo(paso.texto, paso.agente, t);
  return (
    <li className="m-0 p-0" data-estado={paso.estado} data-fase={paso.fase} data-testid="paso-del-pensamiento">
      <Collapse open initial>
        <motion.div
          initial={{ opacity: 0, y: motionDistance.xs }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
          className="relative flex gap-3 pb-2"
        >
          {!ultima && <span aria-hidden className="absolute bottom-0 left-[7.5px] top-[19px] w-px bg-border" />}
          <span className="relative z-10 mt-[3px] flex size-4 shrink-0 items-center justify-center">
            <Glifo paso={paso} agente={agente} />
          </span>
          <div className="min-w-0 flex-1 font-body text-[14px] leading-[1.5]">
            {corriendo ? (
              <span className="block text-fg-muted">
                <TextoConBrillo texto={texto} />
              </span>
            ) : (
              <span className={cn('block', paso.estado === 'fallo' ? 'text-fg' : 'text-fg-muted')}>
                <motion.span
                  key={texto}
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: motionDuration.base, ease: motionEase.standard }}
                >
                  {texto}
                </motion.span>
                {paso.resultado && (
                  <motion.span
                    initial={{ opacity: 0, x: -motionDistance.xs }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
                    className={cn('inline', paso.estado === 'fallo' ? 'text-fg-muted' : 'text-fg')}
                  >
                    <ArrowRight size={11} aria-hidden className="mx-1.5 inline-block -translate-y-px text-fg-subtle" />
                    <Resultado r={paso.resultado} agente={paso.agente} />
                  </motion.span>
                )}
              </span>
            )}
            {corriendo && paso.actividad && (
              <motion.span
                key={paso.actividad}
                initial={{ opacity: 0, y: motionDistance.xs }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionDuration.base, ease: motionEase.enter }}
                className="mt-0.5 block truncate text-[12.5px] text-fg-subtle"
              >
                {conNombreDelEquipo(paso.actividad, paso.agente, t)}
              </motion.span>
            )}
          </div>
        </motion.div>
      </Collapse>
    </li>
  );
}

/** El tiempo del turno, discreto: corre mientras piensa y queda quieto al terminar. */
export function RelojDelTurno({ inicio, fin, className }: { inicio: number; fin: number | null; className?: string }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (fin !== null) return;
    const id = window.setInterval(() => setAhora(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [fin]);
  return (
    <span aria-hidden className={cn('font-mono text-[11.5px] tabular-nums text-fg-subtle', className)} data-testid="reloj-del-turno">
      {duracionEnPalabras((fin ?? ahora) - inicio)}
    </span>
  );
}

export interface PensamientoDelTurnoProps {
  /** Los pasos (del turno en curso o los guardados en el mensaje). */
  pasos: readonly PasoDelPensamiento[];
  /** `true` = la lista en vivo; `false` = plegado en «Cómo lo pensó». */
  vivo: boolean;
  /** Cuánto tardó (para «Cómo lo pensó · 8,4 s»). */
  duracionMs?: number | null;
  /** «Cómo lo pensó» del micro (`done.razonamiento`): lo que se ve al abrirlo. */
  razonamiento?: readonly PasoDeRazonamiento[] | null;
  /** La delegación del turno, en una línea, debajo de las frases. */
  resumen?: ReactNode;
  /** Anunciar a un lector de pantalla (una sola copia lo hace: la del hilo). */
  anunciar?: boolean;
  className?: string;
}

/**
 * El pensamiento del turno: en vivo mientras el micro trabaja; plegado en
 * «Cómo lo pensó» cuando llega la respuesta (y en las respuestas viejas).
 */
export function PensamientoDelTurno({
  pasos,
  vivo,
  duracionMs,
  razonamiento,
  resumen,
  anunciar = true,
  className,
}: PensamientoDelTurnoProps) {
  const { t } = useI18n();
  const [abierto, setAbierto] = useState(false);
  const id = useId();
  const agentes = agentesDelPensamiento(pasos);
  // Del razonamiento también: una respuesta guardada sin pasos los trae ahí.
  for (const p of razonamiento ?? []) {
    const a = agenteDelDespacho(p.agente);
    if (a && !agentes.some((x) => x.id === a.id)) agentes.push(a);
  }
  const hayPlegado = pasos.length > 0 || (razonamiento?.length ?? 0) > 0;
  if (!vivo && !hayPlegado) return null;

  const detalle = [
    pasos.length > 0 ? t(pasos.length === 1 ? 'beta.pensamiento.unPaso' : 'beta.pensamiento.pasos', { n: pasos.length }) : null,
    duracionMs && duracionMs > 0 ? duracionEnPalabras(duracionMs) : null,
  ].filter(Boolean);

  return (
    <div className={cn('min-w-0', className)} data-testid="pensamiento-del-turno" data-vivo={vivo}>
      {/* Lo esencial para un lector de pantalla, en una línea. */}
      {anunciar && (
        <p className="sr-only" role="status" aria-live="polite" data-testid="pensamiento-para-lectores">
          {vivo ? lineaParaLectores(pasos, t) : ''}
        </p>
      )}

      {/* En vivo: la lista. Al terminar se pliega con su altura (Collapse). */}
      <Collapse open={vivo}>
        <ol aria-hidden className="m-0 list-none p-0 pt-0.5" data-testid="pensamiento-en-vivo">
          {pasos.map((p, i) => (
            <FilaDelPaso key={p.id} paso={p} ultima={i === pasos.length - 1} />
          ))}
        </ol>
      </Collapse>

      {/* Plegado: «Cómo lo pensó · 6 pasos · 8,4 s», que se abre. */}
      <Collapse open={!vivo && hayPlegado}>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-controls={id}
          className={cn(
            'group -ml-1 inline-flex max-w-full items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-left',
            'font-body text-[13px] text-fg-muted transition-colors duration-fast hover:bg-surface-hover hover:text-fg',
            'outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          data-testid="como-lo-penso"
        >
          {agentes.length > 0 && (
            <span aria-hidden className="flex shrink-0 items-center -space-x-1.5">
              {agentes.slice(0, 4).map((a, i) => (
                <span key={a.id} className="relative rounded-full ring-2 ring-bg" style={{ zIndex: 10 - i }}>
                  <OrbeDeAgente agente={a} tamano={16} quieto decorativo />
                </span>
              ))}
            </span>
          )}
          <span className="font-medium">{t('agentes.turno.comoLoPenso')}</span>
          {detalle.length > 0 && <span className="truncate text-fg-subtle">· {detalle.join(' · ')}</span>}
          <CaretDown
            size={11}
            aria-hidden
            className={cn('shrink-0 text-fg-subtle transition-transform duration-slow ease-enter', abierto && 'rotate-180')}
          />
        </button>
        <Collapse open={abierto} id={id} className="pb-1 pl-1 pt-2.5">
          {/* Abierto: EXACTAMENTE las líneas que pasaron en vivo (Nico, 09-10),
              con su riel, el orbe de cada especialista y lo que trajo. Las
              frases del micro sólo cuando no hay pasos (una respuesta vieja). */}
          {pasos.length > 0 ? (
            <ol className="m-0 list-none p-0" data-testid="pensamiento-abierto">
              {pasos.map((p, i) => (
                <FilaDelPaso key={p.id} paso={p} ultima={i === pasos.length - 1} />
              ))}
            </ol>
          ) : razonamiento && razonamiento.length > 0 ? (
            <PasosDelRazonamiento pasos={razonamiento} />
          ) : null}
          {resumen ? <div className="mt-3">{resumen}</div> : null}
        </Collapse>
      </Collapse>
    </div>
  );
}

/**
 * Mientras no llega el primer paso: nada durante un momento (el micro nuevo
 * manda el primero en menos de 400 ms) y, si no llega, el respaldo de siempre
 * (un micro viejo, que no cuenta su pensamiento).
 */
export function DespuesDeUnMomento({ ms = 700, children }: { ms?: number; children: ReactNode }) {
  const [ya, setYa] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setYa(true), ms);
    return () => window.clearTimeout(id);
  }, [ms]);
  return ya ? <>{children}</> : null;
}
