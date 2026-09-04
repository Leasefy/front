import { Skeleton } from '@/components/ui/skeleton';

/**
 * LeaseCardSkeleton - Skeleton loader for lease list items
 */
export function LeaseCardSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Property image placeholder */}
          <Skeleton className="h-16 w-16 rounded-md flex-shrink-0" />

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-800 p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * LeaseCardSkeletonList - Multiple lease skeletons
 */
export function LeaseCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <LeaseCardSkeleton key={i} />
      ))}
    </div>
  );
}
