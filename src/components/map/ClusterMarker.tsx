'use client';

import { cn } from '@/lib/utils';

interface ClusterMarkerProps {
  count: number;
  onClick?: () => void;
}

/**
 * Cluster marker showing property count
 * Circular with count, click to zoom in
 */
export function ClusterMarker({ count, onClick }: ClusterMarkerProps) {
  // Size based on count for visual hierarchy
  const sizeClass = count > 100 ? 'w-12 h-12' : count > 10 ? 'w-10 h-10' : 'w-8 h-8';
  const textClass = count > 100 ? 'text-sm' : count > 10 ? 'text-sm' : 'text-xs';

  // Format count for display
  const displayCount = count > 99 ? '99+' : count;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${count} propiedades en esta zona. Haz clic para acercar.`}
      className={cn(
        // Size
        sizeClass,
        // Circle shape and centering
        'rounded-full flex items-center justify-center',
        // Colors - primary for cluster visibility
        'bg-primary text-white uppercase tracking-wide font-mono font-semibold',
        // Shadow and depth
        'shadow-md hover:shadow-lg',
        // Transitions
        'transition-all duration-150 ease-out',
        // Hover effect
        'hover:scale-110 cursor-pointer',
        // Text size
        textClass
      )}
    >
      {displayCount}
    </button>
  );
}
