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
 * SectionLabel — Cadence Eyebrow (mono UPPERCASE + brand dot).
 *
 * Renders the Cadence `MonoLabel` voice (JetBrains Mono 11px/500, +10% tracking,
 * `text-fg-subtle`) next to the brand dot. `dotVariant` keeps recoloring the dot
 * for status overlines; the default is the cobalt brand dot.
 *
 * Public API (children / className / dotVariant) is unchanged — all importers
 * keep working.
 */
export function SectionLabel({ children, className, dotVariant = 'default' }: SectionLabelProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className={cn("inline-block h-1.5 w-1.5 flex-shrink-0 rounded-[2px]", dotColors[dotVariant])}
      />
      <MonoLabel>{children}</MonoLabel>
    </div>
  );
}
