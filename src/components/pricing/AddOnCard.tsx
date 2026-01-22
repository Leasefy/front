'use client';

import { cn } from '@/lib/utils';
import { Shield, Camera, Star, Wrench } from 'lucide-react';
import type { AddOn } from '@/lib/data/mock-subscriptions';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  shield: Shield,
  camera: Camera,
  star: Star,
  wrench: Wrench,
};

export interface AddOnCardProps {
  addon: AddOn;
  exampleRent?: number;
  selected?: boolean;
  onToggle?: (addonId: string) => void;
  className?: string;
}

/**
 * AddOnCard - Card for optional add-on services
 * Supports one-time, monthly, and percentage-based pricing
 */
export function AddOnCard({
  addon,
  exampleRent = 2000000,
  selected = false,
  onToggle,
  className,
}: AddOnCardProps) {
  const Icon = ICONS[addon.icon] || Shield;

  const formatPrice = () => {
    switch (addon.priceType) {
      case 'percentage':
        const monthlyCost = Math.round((exampleRent * addon.price) / 100);
        return (
          <>
            <span className="text-2xl font-bold text-slate-900">
              {addon.price}%
            </span>
            <span className="text-sm text-slate-500 ml-1">del arriendo</span>
            <span className="block text-xs text-slate-400 mt-1">
              ~${monthlyCost.toLocaleString('es-CO')}/mes
            </span>
          </>
        );
      case 'monthly':
        return (
          <>
            <span className="text-2xl font-bold text-slate-900">
              ${addon.price.toLocaleString('es-CO')}
            </span>
            <span className="text-sm text-slate-500 ml-1">/mes</span>
          </>
        );
      case 'one-time':
        return (
          <>
            <span className="text-2xl font-bold text-slate-900">
              ${addon.price.toLocaleString('es-CO')}
            </span>
            <span className="text-sm text-slate-500 ml-1">unico</span>
          </>
        );
    }
  };

  return (
    <button
      onClick={() => onToggle?.(addon.id)}
      className={cn(
        'flex items-start gap-4 rounded-sm border p-4 text-left transition-all w-full',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-sm',
          selected ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-slate-900">{addon.name}</h4>
        <p className="mt-1 text-sm text-slate-500">{addon.description}</p>
      </div>

      {/* Price */}
      <div className="text-right shrink-0">{formatPrice()}</div>
    </button>
  );
}

export default AddOnCard;
