'use client';

import * as React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * IconTooltip — instant (no-delay) tooltip for icon-only actions.
 *
 * The native `title` attribute only surfaces after a ~1s browser delay, which
 * makes icon-only buttons hard to read on hover. This wraps the trigger in a
 * Radix tooltip with `delayDuration={0}` so the label appears immediately.
 *
 * Self-contained: it ships its own TooltipProvider, so it works anywhere without
 * a root-level provider. Always keep an `aria-label` on the child for screen
 * readers (the tooltip is visual only).
 *
 * Usage:
 *   <IconTooltip label="Ver propiedad">
 *     <button aria-label="Ver propiedad" onClick={...}><Eye /></button>
 *   </IconTooltip>
 */
export function IconTooltip({
  label,
  side = 'top',
  children,
}: {
  label: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side}>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
