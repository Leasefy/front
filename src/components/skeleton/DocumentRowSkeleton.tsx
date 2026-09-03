import { Skeleton } from '@/components/ui/skeleton';

/**
 * DocumentRowSkeleton - Skeleton loader for document list items
 */
export function DocumentRowSkeleton() {
  return (
    <div className="flex items-center justify-between py-4 px-4 border-b border-neutral-200 dark:border-neutral-800 last:border-0">
      <div className="flex items-center gap-4">
        {/* File icon placeholder */}
        <Skeleton className="h-10 w-10 rounded-md" />

        <div className="space-y-1">
          <Skeleton className="h-4 w-40" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  );
}

/**
 * DocumentRowSkeletonList - Multiple document skeletons
 */
export function DocumentRowSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <DocumentRowSkeleton key={i} />
      ))}
    </div>
  );
}
