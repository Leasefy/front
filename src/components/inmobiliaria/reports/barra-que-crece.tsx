'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { motionDuration, motionEase } from '@leasefy/cadence';

export interface BarraQueCreceProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'transition'> {
  /** `y` (por defecto): crece desde abajo. `x`: crece desde la izquierda. */
  eje?: 'x' | 'y';
}

/**
 * Una barra de los gráficos hechos a mano de Reportes que CRECE desde su base
 * al aparecer, como las de recharts (movimiento ola 2, 03-10-2026).
 *
 * Sólo `transform` (`scaleY` / `scaleX`): el alto o el ancho siguen siendo el
 * dato, en `style`, y ya no se animan (antes `transition-all` recalculaba el
 * layout en cada cuadro). Con movimiento reducido, el `MotionProvider` del
 * layout (`reducedMotion="user"`) la deja aparecer quieta.
 */
export function BarraQueCrece({ eje = 'y', style, ...props }: BarraQueCreceProps) {
  const desde = eje === 'y' ? { scaleY: 0 } : { scaleX: 0 };
  const hasta = eje === 'y' ? { scaleY: 1 } : { scaleX: 1 };
  const origen = eje === 'y' ? { originY: 1 } : { originX: 0 };
  return (
    <motion.div
      initial={desde}
      animate={hasta}
      transition={{ duration: motionDuration.reveal, ease: motionEase.enter }}
      style={{ ...origen, ...style }}
      {...props}
    />
  );
}
