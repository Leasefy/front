'use client';

/**
 * AvanceDeRetomar — en qué va «Retomar» una carga de terceros (02-10-2026).
 *
 * Nico tocó «Retomar» en una carga de 1.729 inquilinos y la pantalla no cambió;
 * volvió a tocar y quedaron siete `revisar` colgados. Esto es lo que se ve
 * mientras se abre la carga, para que nadie tenga que adivinar si «hizo algo»:
 *
 *  - Dos tramos, uno por paso (poner al día las filas → traer la lista), con el
 *    mismo lenguaje que la pastilla del recordatorio de migración: lleno lo
 *    hecho, marcado el que va, gris lo que falta. Son pasos REALES, no un
 *    porcentaje inventado: el back revisa el lote en una sola petición y no
 *    cuenta por dónde va.
 *  - El tramo en curso lleva un barrido (`x`, sólo `transform`) al ritmo de
 *    espera del sistema (el `shimmer` del Skeleton de Cadence, 1,4 s lineal).
 *    Con movimiento reducido no hay barrido: el tramo queda marcado, quieto.
 *  - Al pasar de paso, el tramo hecho se llena con `scaleX` (curva de entrada,
 *    `reveal`) y el texto cambia con `CrossFade`.
 *  - El aviso de «está tardando» entra y sale con `Presence`.
 */

import { motion } from 'framer-motion';
import {
  CrossFade,
  Presence,
  motionDuration,
  motionEase,
  usePrefersReducedMotion,
} from '@leasefy/cadence';
import { cn } from '@/lib/utils';

export type FaseDeRetomar = 'poniendo-al-dia' | 'leyendo';

const PASOS: readonly FaseDeRetomar[] = ['poniendo-al-dia', 'leyendo'];

/** El ritmo de «esperando» del sistema: el `shimmer` del Skeleton de Cadence (1,4 s lineal). */
const SEGUNDOS_DEL_BARRIDO = 1.4;

export interface AvanceDeRetomarProps {
  /** Identifica la carga en los `data-testid`. */
  lote: string;
  fase: FaseDeRetomar;
  /** Las filas vivas de la carga (las que la revisión vuelve a mirar). */
  filas: number;
  /**
   * Cuántas filas puso al día la revisión, cuando ya volvió. `null` mientras
   * no se sabe o si la revisión falló (se lista igual, sin decir que quedaron al día).
   */
  puestasAlDia: number | null;
  /** Pasó el tiempo normal: se ofrece soltar la espera. */
  tarda: boolean;
}

function cifra(n: number): string {
  return n.toLocaleString('es-CO');
}

function textoDelPaso(fase: FaseDeRetomar, filas: number, puestasAlDia: number | null): string {
  if (fase === 'poniendo-al-dia') {
    return `Poniendo al día ${filas === 1 ? 'la fila' : `las ${cifra(filas)} filas`} con las reglas de hoy…`;
  }
  if (puestasAlDia && puestasAlDia > 0) {
    return `${puestasAlDia === 1 ? 'Una fila quedó' : `${cifra(puestasAlDia)} filas quedaron`} al día. Trayendo la lista de lo que falta…`;
  }
  return 'Trayendo la lista de lo que falta…';
}

export function AvanceDeRetomar({ lote, fase, filas, puestasAlDia, tarda }: AvanceDeRetomarProps) {
  const reducido = usePrefersReducedMotion();
  const enCurso = PASOS.indexOf(fase);
  const texto = textoDelPaso(fase, filas, puestasAlDia);

  return (
    <div className="mt-2 max-w-md space-y-1.5" data-testid={`avance-retomar-${lote}`}>
      <div
        className="flex items-center gap-2.5"
        role="progressbar"
        aria-label="Avance al retomar la carga"
        aria-valuemin={0}
        aria-valuemax={PASOS.length}
        aria-valuenow={enCurso}
        aria-valuetext={`Paso ${enCurso + 1} de ${PASOS.length}: ${texto}`}
      >
        <span className="flex w-28 shrink-0 gap-[3px]" aria-hidden="true">
          {PASOS.map((p, i) => {
            const hecho = i < enCurso;
            const actual = i === enCurso;
            return (
              <span
                key={p}
                className={cn(
                  'relative h-1.5 flex-1 overflow-hidden rounded-full',
                  actual ? 'bg-primary/25 ring-1 ring-inset ring-primary' : 'bg-surface-muted',
                )}
                data-estado={hecho ? 'hecho' : actual ? 'en-curso' : 'pendiente'}
              >
                {/* Lo hecho se llena desde la izquierda (transform, nunca width). */}
                <motion.span
                  className="absolute inset-0 origin-left rounded-full bg-primary"
                  initial={false}
                  animate={{ scaleX: hecho ? 1 : 0 }}
                  transition={{
                    duration: reducido ? 0 : motionDuration.reveal,
                    ease: motionEase.enter,
                  }}
                />
                {/* Sólo existe después de un toque (nunca en el HTML del
                    servidor), así que decidirlo con `reducido` no rompe la
                    hidratación. */}
                {actual && !reducido ? (
                  <motion.span
                    data-barrido=""
                    className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-primary/70"
                    initial={{ x: '-100%' }}
                    animate={{ x: '250%' }}
                    transition={{
                      duration: SEGUNDOS_DEL_BARRIDO,
                      ease: 'linear',
                      repeat: Infinity,
                    }}
                  />
                ) : null}
              </span>
            );
          })}
        </span>
        <span className="shrink-0 text-caption font-semibold tabular-nums text-fg">
          Paso {enCurso + 1} de {PASOS.length}
        </span>
      </div>

      <div aria-live="polite" data-testid={`retomando-${lote}`}>
        <CrossFade swapKey={fase} className="text-caption text-fg">
          {texto}
        </CrossFade>
        <Presence show={tarda}>
          <p className="mt-1 text-caption text-fg-muted">
            Está tardando más de lo normal. Puedes dejar de esperar y volver a intentarlo cuando
            quieras: lo que alcance a quedar al día no se repite y no se duplica a nadie.
          </p>
        </Presence>
      </div>
    </div>
  );
}
