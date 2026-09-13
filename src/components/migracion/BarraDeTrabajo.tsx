'use client';

/**
 * BarraDeTrabajo — en qué va, cuánto falta y cómo salir.
 *
 * 🔴 Nico pidió esto tres veces en dos días, una por cada espera larga:
 * activar inmuebles («¿es normal que lleve activando más de 5 min?»), activar
 * contratos, y después el plan de cuentas y los registros contables. Las tres
 * son iguales: miles de filas, una transacción por fila contra una base
 * remota, y un botón que sólo gira.
 *
 * Una espera larga necesita las mismas tres cosas siempre — en qué va, cuánto
 * falta y cómo salir— así que vive acá una vez y no cuatro.
 *
 * ── Por qué la estimación NO es un promedio ──────────────────────────────
 *
 * El promedio desde el arranque miente cuando el ritmo cambia dentro de la
 * misma corrida, y cambia siempre: en inmuebles, las filas cuyo inmueble ya
 * existe se re-apuntan a ~170/min y las nuevas se crean a ~40/min. Un archivo
 * re-subido empieza volando y termina arrastrándose, así que el promedio queda
 * anclado a la parte rápida y promete de menos justo al final, que es cuando
 * la persona mira. Medido el 2026-09-11: decía «faltan unos 3 min» y tardó 8.
 *
 * Por eso el ritmo sale de una VENTANA de las últimas mediciones.
 */

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

/**
 * Cuántas mediciones mira la estimación.
 *
 * Las tandas del back duran hasta ~15 s, así que seis muestras son ~90 s de
 * historia: suficiente para que el número no salte con cada tanda, y corto
 * para que siga el cambio de ritmo.
 */
const MUESTRAS_DE_RITMO = 6;

export interface BarraDeTrabajoProps {
  /** Qué se está haciendo, en presente: «Creando los inmuebles». */
  titulo: string;
  /** Cuántas filas van. */
  hechas: number;
  /** Cuántas hay en total. El total se toma del SERVIDOR en cada vuelta
   *  (hechas + restantes), nunca de una foto del arranque. */
  total: number;
  /** Qué hacer al tocar «Detener». Sin esto no se dibuja el botón. */
  onDetener?: () => void;
  /** El «Detener» ya se tocó: se está esperando a que termine la tanda. */
  deteniendo?: boolean;
  /** Una línea extra debajo, si hace falta explicar algo. */
  nota?: string;
  /** Prefijo de los `data-testid`: `<testid>-progreso`, `-porcentaje`, `-detener`. */
  testid: string;
}

export function BarraDeTrabajo({
  titulo,
  hechas,
  total,
  onDetener,
  deteniendo = false,
  nota,
  testid,
}: BarraDeTrabajoProps) {
  const muestras = useRef<{ t: number; hechas: number }[]>([]);
  const [minutos, setMinutos] = useState<number | null>(null);

  useEffect(() => {
    muestras.current = [...muestras.current, { t: Date.now(), hechas }].slice(
      -MUESTRAS_DE_RITMO,
    );
    const ms = muestras.current;
    if (ms.length < 2 || total <= hechas) {
      setMinutos(null);
      return;
    }
    const filas = ms[ms.length - 1].hechas - ms[0].hechas;
    const transcurrido = ms[ms.length - 1].t - ms[0].t;
    // Sin avance medible en la ventana no se inventa un número: la barra dice
    // en qué va y se calla lo que no sabe.
    if (filas <= 0 || transcurrido <= 0) {
      setMinutos(null);
      return;
    }
    const faltan = Math.ceil(((total - hechas) * (transcurrido / filas)) / 60_000);
    setMinutos(faltan > 0 ? faltan : null);
  }, [hechas, total]);

  const porcentaje =
    total > 0 ? Math.min(100, Math.round((hechas / total) * 100)) : 0;

  return (
    <div className="space-y-2" data-testid={`${testid}-progreso`} aria-live="polite">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm text-fg-muted dark:text-fg-subtle">
          {titulo} — {hechas} de {total}
          {minutos != null && !deteniendo ? (
            <span className="text-fg-subtle"> · faltan unos {minutos} min</span>
          ) : null}
        </p>
        {onDetener ? (
          <Button
            type="button"
            variant="ghost"
            hideArrow
            onClick={onDetener}
            disabled={deteniendo}
            data-testid={`${testid}-detener`}
          >
            {deteniendo ? 'Deteniendo…' : 'Detener'}
          </Button>
        ) : null}
      </div>
      <Progress value={porcentaje} size="xs" />
      <p
        className="text-right font-mono text-xs tabular-nums text-fg-subtle dark:text-fg-muted"
        data-testid={`${testid}-porcentaje`}
      >
        {porcentaje}%
      </p>
      {nota ? (
        <p className="text-xs text-fg-subtle dark:text-fg-muted">{nota}</p>
      ) : null}
    </div>
  );
}
