'use client';

import { cn } from '@/lib/utils';
import { Shield, Camera, Star, Wrench, Check, Plus } from '@phosphor-icons/react';
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
 * AddOnCard - Clear interactive toggle style
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
          <div className="text-right shrink-0">
            <p className="text-[15px] font-medium text-foreground">{addon.price}% <span className="text-[11px] font-normal text-muted-foreground">del arriendo</span></p>
            <p className="text-[11px] text-muted-foreground">
              ~${monthlyCost.toLocaleString('es-CL')}/mes
            </p>
          </div>
        );
      case 'monthly':
        return (
          <div className="text-right shrink-0">
            <p className="text-[15px] font-medium text-foreground">
              ${addon.price.toLocaleString('es-CL')} <span className="text-[11px] font-normal text-muted-foreground">/mes</span>
            </p>
          </div>
        );
      case 'one-time':
        return (
          <div className="text-right shrink-0">
            <p className="text-[15px] font-medium text-foreground">
              ${addon.price.toLocaleString('es-CL')} <span className="text-[11px] font-normal text-muted-foreground">único</span>
            </p>
          </div>
        );
    }
  };

  return (
    <button
      onClick={() => onToggle?.(addon.id)}
      className={cn(
        'group relative flex items-center gap-4 p-5 text-left transition-all duration-200 w-full bg-white cursor-pointer',
        selected
          ? 'ring-2 ring-foreground'
          : 'hover:bg-muted/30',
        className
      )}
      style={{ border: '1px solid rgba(0,0,0,0.06)' }}
    >
      {/* Action button - very prominent */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center transition-all duration-200',
          selected
            ? 'bg-foreground text-background'
            : 'bg-transparent text-foreground/60 group-hover:bg-foreground group-hover:text-background'
        )}
        style={!selected ? { border: '1.5px solid rgba(0,0,0,0.15)' } : undefined}
      >
        {selected ? (
          <Check className="h-4 w-4" strokeWidth={2.5} />
        ) : (
          <Plus className="h-4 w-4" strokeWidth={2} />
        )}
      </div>

      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-foreground/[0.04] text-foreground/50">
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-[14px] font-medium text-foreground">
          {addon.name}
        </h4>
        <p className="mt-0.5 text-[12px] text-muted-foreground line-clamp-1">{addon.description}</p>
      </div>

      {/* Price */}
      {formatPrice()}

      {/* Selected label */}
      {selected && (
        <div className="absolute top-2 right-2">
          <span className="text-[10px] font-medium text-foreground/60 uppercase tracking-wider">
            Agregado
          </span>
        </div>
      )}
    </button>
  );
}

export default AddOnCard;
