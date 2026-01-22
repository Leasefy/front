import { Skeleton } from '@/components/ui/skeleton';

/**
 * PropertyCardSkeleton - Skeleton loader matching PropertyCard structure
 *
 * Layout matches PropertyCard:
 * - 4:3 aspect ratio image area
 * - Title and location row
 * - Price aligned right
 * - Features row with icons (area, beds, baths)
 */
export function PropertyCardSkeleton() {
  return (
    <div className="group block">
      {/* Image container - matches aspect-[4/3] rounded-[2px] */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-[2px]">
        <Skeleton className="h-full w-full" />

        {/* Badge placeholders - top left */}
        <div className="absolute top-3 left-3 flex gap-2">
          <Skeleton className="h-6 w-20 rounded-[2px] bg-white/50" />
          <Skeleton className="h-6 w-24 rounded-[2px] bg-white/50" />
        </div>
      </div>

      {/* Content - matches PropertyCard pt-4 */}
      <div className="pt-4">
        {/* Title and price row */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            {/* Title */}
            <Skeleton className="h-5 w-3/4" />
            {/* Location */}
            <Skeleton className="h-4 w-1/2" />
          </div>
          {/* Price */}
          <Skeleton className="h-5 w-28" />
        </div>

        {/* Features row - icons with text */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-3 w-10" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-3 w-10" />
          </div>
        </div>
      </div>
    </div>
  );
}
