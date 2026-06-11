import { Skeleton } from '@/components/ui/skeleton';

/**
 * PaymentRowSkeleton - Skeleton loader for payment history rows
 */
export function PaymentRowSkeleton() {
  return (
    <div className="flex items-center justify-between py-4 border-b border-neutral-200 dark:border-neutral-800 last:border-0">
      <div className="flex items-center gap-4">
        {/* Icon placeholder */}
        <Skeleton className="h-10 w-10 rounded-md" />

        <div className="space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right space-y-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

/**
 * PaymentRowSkeletonList - Multiple payment skeletons
 */
export function PaymentRowSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
      {Array.from({ length: count }).map((_, i) => (
        <PaymentRowSkeleton key={i} />
      ))}
    </div>
  );
}
