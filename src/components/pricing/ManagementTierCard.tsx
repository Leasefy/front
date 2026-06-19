'use client';

import { cn } from '@/lib/utils';
import { Check, Sparkle, Shield, Star } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import type { ManagementTier } from '@/lib/constants/subscription-plans';

export interface ManagementTierCardProps {
  tier: ManagementTier;
  exampleRent?: number;
  onSelect?: (tierId: string) => void;
  className?: string;
}

/**
 * ManagementTierCard - Card for property management service tiers
 * Shows percentage fee and calculates example cost based on rent
 */
export function ManagementTierCard({
  tier,
  exampleRent = 2000000, // Default 2M COP
  onSelect,
  className,
}: ManagementTierCardProps) {
  const monthlyCost = Math.round((exampleRent * tier.feePercentage) / 100);

  // Highlighted (premium) card design
  if (tier.highlighted) {
    return (
      <div
        className={cn(
          'relative flex flex-col rounded-xl p-6 transition-all overflow-hidden',
          'bg-gradient-to-br from-sand-50 via-sand-50 to-sand-100/80',
          'border border-sand-200/80 shadow-sand-200/30',
          className
        )}
      >
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-sand-200/40 to-transparent rounded-bl-full" />

        {/* Badge with icon */}
        <div className="absolute top-4 right-4 z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-medium text-white">
            <Sparkle className="w-3 h-3" />
            {tier.badge}
          </span>
        </div>

        {/* Premium icon */}
        <div className="mb-4">
          <div className="w-10 h-10 rounded-xl bg-sand-200/60 flex items-center justify-center">
            <Shield className="w-5 h-5 text-sand-700" />
          </div>
        </div>

        {/* Header */}
        <div className="mb-5">
          <h3 className="text-[19px] font-heading font-semibold text-foreground">{tier.name}</h3>
          <p className="mt-1 text-[13px] text-sand-700">{tier.description}</p>
        </div>

        {/* Pricing with highlight */}
        <div className="mb-6 p-4 -mx-1 rounded-xl bg-white/60 border border-sand-200/50">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[40px] font-heading font-bold text-foreground tracking-tight">
              {tier.feePercentage}%
            </span>
            <span className="text-[14px] text-sand-600">del arriendo</span>
          </div>
          <p className="mt-1 text-[12px] text-sand-600">
            Ejemplo: ${monthlyCost.toLocaleString('es-CL')}/mes para arriendo de $
            {exampleRent.toLocaleString('es-CL')}
          </p>
        </div>

        {/* Features */}
        <ul className="mb-6 flex-1 space-y-2.5">
          {tier.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2.5">
              <div className="mt-0.5 w-4 h-4 rounded-full bg-[#E8F3EC] flex items-center justify-center flex-shrink-0">
                <Check className="h-2.5 w-2.5 text-[#2C7A53]" strokeWidth={3} />
              </div>
              <span className="text-[13px] text-sand-800 leading-snug">{feature}</span>
            </li>
          ))}
        </ul>

        {/* Trust indicator */}
        <div className="mb-4 flex items-center gap-2 text-[12px] text-sand-600">
          <div className="flex -space-x-1">
            {[...Array(3)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 text-[#B7791F] fill-[#B7791F]" />
            ))}
          </div>
          <span>+2,400 propietarios confían en nosotros</span>
        </div>

        {/* CTA */}
        <Button
          onClick={() => onSelect?.(tier.id)}
          variant="outline"
          className="w-full h-12 bg-foreground text-white border-foreground hover:bg-foreground/90 hover:border-foreground/90"
        >
          Comenzar ahora
        </Button>
      </div>
    );
  }

  // Standard card design
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl border bg-white border-neutral-200 p-6 transition-all hover: hover:border-neutral-300',
        className
      )}
    >
      {/* Icon */}
      <div className="mb-4">
        <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
          <Shield className="w-5 h-5 text-neutral-500" />
        </div>
      </div>

      {/* Header */}
      <div className="mb-5">
        <h3 className="text-[19px] font-heading font-semibold text-foreground">{tier.name}</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">{tier.description}</p>
      </div>

      {/* Pricing */}
      <div className="mb-6 p-4 -mx-1 rounded-xl bg-neutral-50 border border-neutral-100">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[40px] font-heading font-bold text-foreground tracking-tight">
            {tier.feePercentage}%
          </span>
          <span className="text-[14px] text-muted-foreground">del arriendo</span>
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Ejemplo: ${monthlyCost.toLocaleString('es-CL')}/mes para arriendo de $
          {exampleRent.toLocaleString('es-CL')}
        </p>
      </div>

      {/* Features */}
      <ul className="mb-6 flex-1 space-y-2.5">
        {tier.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2.5">
            <div className="mt-0.5 w-4 h-4 rounded-full bg-[#E8F3EC] flex items-center justify-center flex-shrink-0">
              <Check className="h-2.5 w-2.5 text-[#2C7A53]" strokeWidth={3} />
            </div>
            <span className="text-[13px] text-muted-foreground leading-snug">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Button
        onClick={() => onSelect?.(tier.id)}
        variant="outline"
        hideArrow
        className="w-full h-11 hover:bg-neutral-50"
      >
        Comenzar
      </Button>
    </div>
  );
}

export default ManagementTierCard;
