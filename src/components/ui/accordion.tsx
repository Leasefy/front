'use client';

import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import {
  Accordion as DSAccordion,
  AccordionItem as DSAccordionItem,
  AccordionTrigger as DSAccordionTrigger,
} from '@leasefy/cadence';
import { cn } from '@/lib/utils';

/**
 * Accordion — ADAPTER fino sobre @leasefy/cadence que preserva la API local:
 * - Accordion / AccordionTrigger: re-export directo del DS (misma API Radix).
 * - AccordionItem: wrapper que restaura el comportamiento de borde del mvp
 *   (border-border en vez de border-border-faint, y el último item CONSERVA su
 *   borde — el DS aplica `last:border-0`).
 * - AccordionContent: implementación local sobre Radix. Se mantiene porque
 *   el Content del DS aplica `className` al nodo exterior Y al interior, lo
 *   que duplicaría paddings pasados por los call sites (p.ej. `pb-5` en
 *   PropertyAccordion). La animación es la del sistema de movimiento de
 *   Cadence (`animate-collapse-open/close`: abre en 300ms con la curva de
 *   énfasis y fundido, cierra en 200ms acelerando) — la misma del DS.
 */

const Accordion = DSAccordion;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof DSAccordionItem>,
  React.ComponentPropsWithoutRef<typeof DSAccordionItem>
>(({ className, ...props }, ref) => (
  <DSAccordionItem
    ref={ref}
    className={cn('border-border last:border-b', className)}
    {...props}
  />
));
AccordionItem.displayName = 'AccordionItem';

const AccordionTrigger = DSAccordionTrigger;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm data-[state=closed]:animate-collapse-close data-[state=open]:animate-collapse-open"
    {...props}
  >
    <div className={cn('pb-4 pt-0', className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
