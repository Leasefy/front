import { Skeleton } from '@/components/ui/skeleton';

/**
 * MessageRowSkeleton - Skeleton loader for message conversation items
 */
export function MessageRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
      <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

export function MessageRowSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <MessageRowSkeleton key={i} />
      ))}
    </div>
  );
}
