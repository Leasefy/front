import { MonoLabel } from "@leasefy/cadence";
import { cn } from "@/lib/utils";

type DotVariant = 'default' | 'warning' | 'info' | 'success' | 'neutral';

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
  dotVariant?: DotVariant;
}

// Cadence eyebrow dot — cobalt by default; status variants reuse the Cadence
// feedback hues (amber/info-blue/green). Square 2px corner like the DS Eyebrow.
// `neutral` is for a state that is over, not a status to watch (a finished
// lease): a warm grey dot, so the eyebrow keeps its rhythm without a hue.
const dotColors: Record<DotVariant, string> = {
  default: 'bg-primary',
  warning: 'bg-warning',
  info: 'bg-info',
  success: 'bg-success',
  neutral: 'bg-border-strong',
};

/**
 * SectionLabel — Cadence Eyebrow (DM Mono MAYÚSCULA).
 *
 * Renders the Cadence `MonoLabel` voice (DM Mono 11px/500, +6% tracking,
 * `text-fg-subtle`). Cadence 2 (20-10-2026): sin el cuadrito azul delante —
 * repetido en cada pantalla era adorno y no decía nada. El punto sólo sale
 * cuando DICE algo: un `dotVariant` de estado (warning / info / success /
 * neutral) para un sobretítulo que avisa.
 *
 * Public API (children / className / dotVariant) is unchanged — all importers
 * keep working.
 */
export function SectionLabel({ children, className, dotVariant = 'default' }: SectionLabelProps) {
  const conPunto = dotVariant !== 'default';
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {conPunto ? (
        <span
          aria-hidden="true"
          className={cn("inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full", dotColors[dotVariant])}
        />
      ) : null}
      <MonoLabel>{children}</MonoLabel>
    </div>
  );
}
