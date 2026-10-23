'use client';

/**
 * «¿Dónde va mi solicitud?» — la barra de avance que ven el inquilino y el
 * propietario (Portofino, 21-10-2026: «para la inmobiliaria este pipeline es
 * perfecto, pero para propietarios e inquilinos, una forma de saber dónde va
 * y en qué estado está»). La inmobiliaria trabaja con el tablero; quien
 * reporta ve los mismos pasos como una barra que se llena.
 *
 * Genérica: los pasos y el actual los pone quien la usa (mantenimiento, PQRS,
 * solicitudes). `detenida` es lo que no siguió (no aprobada, cancelada): la
 * barra se queda donde iba y lo dice.
 */
import { motion } from 'framer-motion';
import { Check, XCircle } from '@phosphor-icons/react';
import { enterTransition, usePrefersReducedMotion } from '@leasefy/cadence';
import { cn } from '@/lib/utils';

export interface PasoDelAvance {
  clave: string;
  nombre: string;
}

export function AvanceDeLaSolicitud({
  pasos,
  actual,
  detenida,
  compacta = false,
  className,
}: {
  pasos: readonly PasoDelAvance[];
  /** El índice del paso en que va (el último = terminada). */
  actual: number;
  /** Lo que no siguió: la barra se queda y lo dice («No aprobada»). */
  detenida?: string | null;
  /** Sólo la barra y el nombre del paso (para una fila de lista). */
  compacta?: boolean;
  className?: string;
}) {
  const reducido = usePrefersReducedMotion();
  const total = Math.max(1, pasos.length - 1);
  const indice = Math.min(Math.max(actual, 0), pasos.length - 1);
  const terminada = !detenida && indice === pasos.length - 1;
  const lleno = `${(indice / total) * 100}%`;
  const nombreActual = detenida ?? pasos[indice]?.nombre ?? '';

  return (
    <div
      className={cn('min-w-0', className)}
      role="group"
      aria-label={`Avance de la solicitud: ${nombreActual}${detenida ? '' : ` (paso ${indice + 1} de ${pasos.length})`}`}
      data-testid="avance-de-la-solicitud"
    >
      <div className="relative h-1.5 rounded-full bg-surface-muted dark:bg-border" aria-hidden="true">
        <motion.div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            detenida ? 'bg-danger' : terminada ? 'bg-success' : 'bg-primary',
          )}
          initial={{ width: 0 }}
          animate={{ width: indice === 0 && !detenida ? '6%' : lleno }}
          transition={enterTransition(reducido)}
        />
      </div>
      {compacta ? (
        <p className={cn('mt-1.5 text-caption', detenida ? 'text-danger' : 'text-fg-muted')}>
          {detenida ? nombreActual : `${nombreActual} · paso ${indice + 1} de ${pasos.length}`}
        </p>
      ) : (
        <ol className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}>
          {pasos.map((paso, i) => {
            const hecho = i < indice || terminada;
            const enCurso = i === indice && !terminada && !detenida;
            return (
              <li key={paso.clave} className="min-w-0" aria-current={enCurso ? 'step' : undefined}>
                {/* Glow up 23-10: los mismos círculos de los pasos de la casa (PasosDeLaTarea): hecho en verde
                    suave, el actual en voltaje, lo que viene con su número en mono. */}
                <span
                  className={cn(
                    'flex size-5 items-center justify-center rounded-full font-mono text-[11px]',
                    hecho
                      ? 'bg-success-soft text-success'
                      : enCurso
                        ? 'bg-primary text-primary-fg'
                        : 'border border-border-strong text-fg-muted',
                    detenida && i === indice && 'border-0 bg-danger-soft text-danger',
                  )}
                  aria-hidden="true"
                >
                  {hecho ? (
                    <Check className="size-3" weight="bold" />
                  ) : detenida && i === indice ? (
                    <XCircle className="size-3" weight="bold" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={cn(
                    'mt-1 block text-caption leading-tight break-words',
                    enCurso ? 'font-medium text-fg' : hecho ? 'text-fg-muted' : 'text-fg-subtle',
                  )}
                >
                  {paso.nombre}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {!compacta && detenida && (
        <p className="mt-2 text-caption font-medium text-danger">{detenida}</p>
      )}
    </div>
  );
}
