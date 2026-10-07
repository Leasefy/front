'use client';

import { AgentOrb, type AgentOrbState } from '@leasefy/cadence';

import { ORBE_DEL_ORQUESTADOR } from '@/lib/agentes/nombre-del-orquestador';
import { cn } from '@/lib/utils';

interface ChatOrbProps {
  /** Diámetro en px del cuerpo del orbe. El resplandor vive fuera de esa caja. */
  size?: number;
  className?: string;
  /** Texto para lectores de pantalla; `null` lo marca decorativo. */
  label?: string | null;
  /** Por defecto `thinking`: es el «pensando» del chat. */
  state?: AgentOrbState;
}

/**
 * ChatOrb — el orbe grande del «pensando» del chat.
 *
 * ── Historia ──────────────────────────────────────────────────────────────
 * Nació como un fragment shader propio (27-08, «uy no, eso está horrible, yo
 * realmente quiero algo top»): una gota de cobalto con estrías y filo
 * nacarado. Funcionaba, pero cada instancia abría SU contexto WebGL y el
 * navegador corta en ~16, así que el resto de los orbes del equipo se pasaron
 * a SVG y el chat quedó hablando otro idioma.
 *
 * Desde Cadence v1.2.0 (02-10) todos los orbes son el mismo fluido de luz,
 * pintado por UN motor compartido (un solo contexto para toda la página). El
 * orbe del chat es Ori, el orquestador, con su paleta y su semilla del
 * registro (`ORBE_DEL_ORQUESTADOR`): el mismo que se ve en «El equipo», sólo
 * que más grande. Sin WebGL cae al orbe SVG; con `prefers-reduced-motion`
 * queda un cuadro fijo.
 *
 * La caja sigue midiendo `size × 1,9` (como el canvas de antes) para que el
 * layout del chat no se mueva; el orbe va centrado y su halo sale de su caja.
 */
export function ChatOrb({ size = 30, className, label = null, state = 'thinking' }: ChatOrbProps) {
  const box = Math.round(size * 1.9);
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: box, height: box }}
      role={label ? 'status' : undefined}
      aria-label={label ?? undefined}
      aria-hidden={label ? undefined : true}
    >
      <AgentOrb
        palette={ORBE_DEL_ORQUESTADOR.paleta}
        seed={ORBE_DEL_ORQUESTADOR.semilla}
        variant="orchestrator"
        state={state}
        size={size}
        label={null}
      />
    </span>
  );
}
