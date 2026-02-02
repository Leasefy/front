import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

/**
 * CandidateCardSkeleton - Skeleton loader matching CandidateCard structure
 *
 * Layout matches CandidateCard:
 * - Header: Avatar (14x14), name/occupation, risk badge
 * - Metrics section: 3 columns
 * - AI snippet section
 * - Footer: 3 action buttons
 */
export function CandidateCardSkeleton() {
  return (
    <Card className="flex flex-col">
      {/* Header: Photo + Info + Badge */}
      <CardHeader className="flex-row items-start gap-4 pb-3">
        {/* Avatar placeholder */}
        <Skeleton className="h-14 w-14 flex-shrink-0 rounded-sm" />

        {/* Name and occupation */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>

        {/* Risk badge placeholder */}
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      </CardHeader>

      {/* Metrics Section */}
      <CardContent className="border-t border-border py-3">
        <div className="grid grid-cols-3 gap-4">
          {/* Income */}
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
          {/* Stability */}
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
          {/* History */}
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-14" />
          </div>
        </div>
      </CardContent>

      {/* AI Snippet Section */}
      <CardContent className="border-t border-border py-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </CardContent>

      {/* Action Buttons */}
      <CardFooter className="flex gap-2 border-t border-border pt-3">
        <Skeleton className="h-8 flex-1 rounded-sm" />
        <Skeleton className="h-8 flex-1 rounded-sm" />
        <Skeleton className="h-8 flex-1 rounded-sm" />
      </CardFooter>
    </Card>
  );
}
