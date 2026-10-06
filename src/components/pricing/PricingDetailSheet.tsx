'use client';

import { useEffect } from 'react';
import { CheckCircle, Buildings, Users, Lightning } from '@phosphor-icons/react';
import { MonoLabel } from '@leasefy/cadence';
import { useLenis } from '@/components/providers/SmoothScroll';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
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
      <SheetContent side="right" size="md">
        {/* Header — la ✕ la pone `SheetContent`, la misma de todo el producto */}
        <SheetHeader title={plan.name} description={plan.description} />

        {/* Scrollable body */}
        <SheetBody>
          <div className="space-y-6">
            {/* Price badge */}
            <div className="flex items-baseline gap-2">
              {isEnterprise ? (
                <span className="text-[28px] font-mono font-bold tabular-nums text-foreground">{plan.price}</span>
              ) : plan.price === '0' ? (
                <span className="text-[32px] font-mono font-bold tabular-nums text-foreground">Gratis</span>
              ) : plan.price === '1%' ? (
                <>
                  <span className="text-[32px] font-mono font-bold tabular-nums text-foreground">1%</span>
                  {plan.period && <span className="text-muted-foreground text-[14px]">{plan.period}</span>}
                </>
              ) : (
                <>
                  <span className="text-[32px] font-mono font-bold tabular-nums text-foreground">${plan.price}</span>
                  {plan.period && <span className="text-muted-foreground text-[14px]">{plan.period}</span>}
                </>
              )}
            </div>

            {/* Limits */}
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/50 rounded-md">
                <Buildings className="w-4 h-4 text-primary" />
                <span className="text-[13px] font-semibold font-mono tabular-nums text-foreground">
                  {plan.limits.properties === 'ilimitadas' ? '∞' : plan.limits.properties}
                </span>
                <span className="text-[11px] text-muted-foreground">propiedades</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/50 rounded-md">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-[13px] font-semibold font-mono tabular-nums text-foreground">
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
                  <MonoLabel className="block text-[13px] text-muted-foreground mb-3">
                    {group.category}
                  </MonoLabel>
                  <ul className="space-y-3">
                    {group.items.map((item) => (
                      <li key={item.name} className="flex items-start gap-2.5">
                        <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" weight="fill" />
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
                <MonoLabel className="block text-[13px] text-muted-foreground mb-3">
                  Extras disponibles
                </MonoLabel>
                <div className="space-y-3">
                  {plan.addons.map((addon) => (
                    <div key={addon.label} className="flex items-start justify-between gap-4 p-3 rounded-md bg-muted/30">
                      <div className="flex-1">
                        <span className="text-[13px] font-medium text-foreground">{addon.label}</span>
                        <p className="text-[12px] text-muted-foreground mt-0.5">{addon.description}</p>
                      </div>
                      <span className="text-[13px] font-semibold font-mono tabular-nums text-foreground whitespace-nowrap">{addon.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetBody>

        {/* Sticky footer */}
        <SheetFooter>
          {isEnterprise ? (
            <Button asChild variant="default" hideArrow>
              <a href="mailto:ventas@leasefy.co">Solicitar cotización</a>
            </Button>
          ) : (
            <Button variant="default" hideArrow onClick={handleSelect}>
              Seleccionar plan
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
