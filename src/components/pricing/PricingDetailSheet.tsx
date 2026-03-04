'use client';

import { useEffect } from 'react';
import { X, CheckCircle, Buildings, Users, Lightning } from '@phosphor-icons/react';
import { useLenis } from '@/components/providers/SmoothScroll';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface PlanFeatureItem {
  name: string;
  description: string;
}

export interface PlanFeatureGroup {
  category: string;
  items: PlanFeatureItem[];
}

export interface PlanAddonDetail {
  label: string;
  price: string;
  description: string;
}

export interface PlanDetail {
  name: string;
  price: string;
  period?: string;
  description: string;
  pitch: string;
  highlights: string[];
  featureGroups: PlanFeatureGroup[];
  addons: PlanAddonDetail[];
  limits: { properties: number | 'ilimitadas'; users: number | 'ilimitados' };
}

interface PricingDetailSheetProps {
  plan: PlanDetail | null;
  open: boolean;
  onClose: () => void;
  onSelect?: () => void;
  isEnterprise?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function PricingDetailSheet({
  plan,
  open,
  onClose,
  onSelect,
  isEnterprise,
}: PricingDetailSheetProps) {
  const lenis = useLenis();

  useEffect(() => {
    if (open) {
      lenis.stop();
    } else {
      lenis.start();
    }
    return () => {
      lenis.start();
    };
  }, [open, lenis]);

  if (!plan) return null;

  const handleSelect = () => {
    onSelect?.();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-hidden p-0 sm:max-w-lg bg-white dark:bg-[#0f0f10]"
        hideCloseButton
      >
        {/* Header */}
        <SheetHeader className="flex-shrink-0 flex flex-row items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-white/10">
          <div>
            <SheetTitle className="text-lg font-semibold text-neutral-900 dark:text-white">
              {plan.name}
            </SheetTitle>
            <SheetDescription className="text-sm text-neutral-500 dark:text-neutral-400">
              {plan.description}
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
          </button>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain" data-lenis-prevent>
          <div className="px-5 py-6 space-y-6">
            {/* Price badge */}
            <div className="flex items-baseline gap-2">
              {isEnterprise ? (
                <span className="text-[28px] font-heading font-bold text-foreground">{plan.price}</span>
              ) : (
                <>
                  <span className="text-[32px] font-heading font-bold text-foreground">${plan.price}</span>
                  {plan.period && <span className="text-muted-foreground text-[14px]">{plan.period}</span>}
                </>
              )}
            </div>

            {/* Limits */}
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/50 rounded-lg">
                <Buildings className="w-4 h-4 text-primary" />
                <span className="text-[13px] font-semibold text-foreground">
                  {plan.limits.properties === 'ilimitadas' ? '∞' : plan.limits.properties}
                </span>
                <span className="text-[11px] text-muted-foreground">propiedades</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/50 rounded-lg">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-[13px] font-semibold text-foreground">
                  {plan.limits.users === 'ilimitados' ? '∞' : plan.limits.users}
                </span>
                <span className="text-[11px] text-muted-foreground">usuarios</span>
              </div>
            </div>

            {/* Pitch */}
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              {plan.pitch}
            </p>

            {/* Highlights */}
            <div className="flex flex-wrap gap-2">
              {plan.highlights.map((h) => (
                <span
                  key={h}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-full bg-primary/10 text-primary"
                >
                  <Lightning className="w-3 h-3" weight="fill" />
                  {h}
                </span>
              ))}
            </div>

            {/* Feature groups */}
            <div className="space-y-5">
              {plan.featureGroups.map((group) => (
                <div key={group.category}>
                  <h4 className="text-[13px] font-mono uppercase text-muted-foreground mb-3">
                    {group.category}
                  </h4>
                  <ul className="space-y-3">
                    {group.items.map((item) => (
                      <li key={item.name} className="flex items-start gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" weight="fill" />
                        <div>
                          <span className="text-[13px] font-medium text-foreground">{item.name}</span>
                          <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Add-ons */}
            {plan.addons.length > 0 && (
              <div>
                <h4 className="text-[13px] font-mono uppercase text-muted-foreground mb-3">
                  Extras disponibles
                </h4>
                <div className="space-y-3">
                  {plan.addons.map((addon) => (
                    <div key={addon.label} className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/30">
                      <div className="flex-1">
                        <span className="text-[13px] font-medium text-foreground">{addon.label}</span>
                        <p className="text-[12px] text-muted-foreground mt-0.5">{addon.description}</p>
                      </div>
                      <span className="text-[13px] font-semibold text-foreground whitespace-nowrap">{addon.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky footer */}
        <div className="flex-shrink-0 border-t border-neutral-100 dark:border-white/10 px-5 py-4">
          {isEnterprise ? (
            <a href="mailto:ventas@leasefy.co" className="block">
              <Button className="w-full rounded-xl" variant="default">
                Solicitar cotización
              </Button>
            </a>
          ) : (
            <Button className="w-full rounded-xl" variant="default" onClick={handleSelect}>
              Seleccionar plan
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
