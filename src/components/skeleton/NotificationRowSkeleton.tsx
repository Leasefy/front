import { Skeleton } from '@/components/ui/skeleton';

/**
 * NotificationRowSkeleton - Skeleton loader for notification items
 */
export function NotificationRowSkeleton() {
  return (
    <div className="flex items-start gap-4 px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
      {/* Icon placeholder */}
      <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  );
}

/**
 * NotificationRowSkeletonList - Multiple notification skeletons
 */
export function NotificationRowSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="bg-white dark:bg-[#1a1a1c] rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <NotificationRowSkeleton key={i} />
      ))}
    </div>
  );
}
