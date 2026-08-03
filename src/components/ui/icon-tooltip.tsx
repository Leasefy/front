'use client';

import * as React from 'react';
import { Tooltip as CadenceTooltip } from '@leasefy/cadence';

/**
 * IconTooltip — instant (no-delay) tooltip for icon-only actions.
 *
 * Now renders the Cadence `Tooltip` (dark ink body `bg-fg` + white text +
 * arrow — the Cadence dark spec) instead of the legacy cobalt Radix tooltip.
 * The Cadence Tooltip ships its own Provider, so this stays self-contained and
 * works anywhere without a root-level provider.
 *
 * `delayDuration={0}` preserves the original instant-on-hover behavior (the
 * native `title` attribute only surfaces after a ~1s delay). Always keep an
 * `aria-label` on the child for screen readers (the tooltip is visual only).
 *
 * Public API (label / side / children) is unchanged.
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
    <CadenceTooltip content={label} side={side} delayDuration={0}>
      {children}
    </CadenceTooltip>
  );
}
