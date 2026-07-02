'use client';

import * as React from 'react';
import { TabsList as DSTabsList } from '@leasefy/cadence';
import type { TabsListProps } from '@leasefy/cadence';
import { cn } from '@/lib/utils';

/**
 * SHIM: Tabs del DS (@leasefy/cadence) — Radix + dos variants en TabsList:
 *   - "underline" (default): hairline border-b, texto activo ink, indicador primary.
 *   - "segmented": control segmentado quieto (surface-muted + fill surface, sin sombra).
 *
 * Uso: <TabsList variant="segmented"> … — los call sites no deben re-pintar
 * estados activos; el contrato de marca vive en el DS.
 */
export { Tabs, TabsTrigger, TabsContent } from '@leasefy/cadence';
export type { TabsListProps } from '@leasefy/cadence';

const TabsList = React.forwardRef<
  React.ElementRef<typeof DSTabsList>,
  TabsListProps
>(({ className, ...props }, ref) => (
  <DSTabsList
    ref={ref}
    className={cn(
      // max-w-full + overflow-x-auto makes long tab sets horizontally
      // scrollable on narrow viewports instead of blowing out the layout
      // (scrollbar hidden). Desktop look for <=4 tabs is unchanged.
      // NOTE for consumers with MANY tabs: pass `justify-start` so the first
      // tab stays reachable when the list overflows (centered flex content
      // clips its start edge inside a scroll container).
      'max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
      className
    )}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

export { TabsList };
