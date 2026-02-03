'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ManagementTier } from '@/lib/data/mock-subscriptions';

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

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-sm border bg-card p-6 transition-all',
        tier.highlighted
          ? 'border-primary shadow-lg ring-1 ring-primary'
          : 'border-border hover:border-border',
        className
      )}
    >
      {/* Badge */}
      {tier.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
            {tier.badge}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">{tier.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
      </div>

      {/* Pricing */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-foreground">
            {tier.feePercentage}%
          </span>
          <span className="text-muted-foreground">del arriendo</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Ejemplo: ${monthlyCost.toLocaleString('es-CO')}/mes para arriendo de $
          {exampleRent.toLocaleString('es-CO')}
        </p>
      </div>

      {/* Features */}
      <ul className="mb-6 flex-1 space-y-3">
        {tier.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span className="text-sm text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Button
        onClick={() => onSelect?.(tier.id)}
        variant={tier.highlighted ? 'default' : 'outline'}
        className="w-full"
        size="lg"
      >
        Comenzar
      </Button>
    </div>
  );
}

export default ManagementTierCard;
