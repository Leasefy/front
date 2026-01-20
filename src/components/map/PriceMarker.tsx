'use client';

import { cn } from '@/lib/utils';

interface PriceMarkerProps {
  price: number;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/**
 * Format price compactly: 2500000 -> "$2.5M"
 */
function formatCompactPrice(price: number): string {
  if (price >= 1000000) {
    const millions = price / 1000000;
    // Show 1 decimal only if not a whole number
    return millions % 1 === 0 ? `$${millions}M` : `$${millions.toFixed(1)}M`;
  }
  if (price >= 1000) {
    const thousands = Math.round(price / 1000);
    return `$${thousands}K`;
  }
  return `$${price}`;
}

/**
 * Price marker for individual property on map
 * Pill-shaped with price label, Airbnb style
 */
export function PriceMarker({
  price,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: PriceMarkerProps) {
  const formattedPrice = formatCompactPrice(price);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label={`Propiedad ${formattedPrice} por mes`}
      className={cn(
        // Base styles - pill shape
        'px-3 py-1.5 rounded-full text-sm font-medium',
        'whitespace-nowrap cursor-pointer',
        // Default colors
        'bg-slate-800 text-white',
        // Shadow and transitions
        'shadow-md hover:shadow-lg',
        'transition-all duration-150 ease-out',
        // Hover effect
        'hover:scale-110 hover:z-20',
        // Selected state
        isSelected && 'ring-2 ring-primary ring-offset-2 scale-110 bg-primary z-30',
        // Hovered state (from list hover)
        isHovered && !isSelected && 'scale-110 bg-slate-700 z-20'
      )}
    >
      {formattedPrice}
    </button>
  );
}
