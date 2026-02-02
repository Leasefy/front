import { Skeleton } from '@/components/ui/skeleton';

/**
 * ApplicationCardSkeleton - Skeleton loader matching ApplicationCard structure
 *
 * Layout matches ApplicationCard:
 * - Left: Property thumbnail (square, w-28/w-36)
 * - Right: Title, status badge, location, price
 * - Footer: Date, tracking code, chevron
 */
export function ApplicationCardSkeleton() {
  return (
    <div className="w-full bg-white border border-border rounded-sm overflow-hidden">
      {/* Main content row */}
      <div className="flex">
        {/* Property thumbnail */}
        <div className="relative w-28 sm:w-36 flex-shrink-0">
          <div className="aspect-square">
            <Skeleton className="h-full w-full" />
          </div>
        </div>

        {/* Property details */}
        <div className="flex-1 p-3 sm:p-4 min-w-0">
          {/* Title and badge row */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-20 rounded-full flex-shrink-0" />
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 mb-1">
            <Skeleton className="h-3.5 w-3.5 flex-shrink-0" />
            <Skeleton className="h-4 w-32" />
          </div>

          {/* Price */}
          <Skeleton className="h-5 w-28" />
        </div>
      </div>

      {/* Footer row */}
      <div className="px-3 sm:px-4 py-2.5 border-t border-border bg-muted/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {/* Submitted date */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Skeleton className="h-3.5 w-3.5 flex-shrink-0" />
            <Skeleton className="h-3 w-20" />
          </div>

          {/* Tracking code */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Skeleton className="h-3.5 w-3.5 flex-shrink-0" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        {/* Chevron */}
        <Skeleton className="h-4 w-4 flex-shrink-0" />
      </div>
    </div>
  );
}
