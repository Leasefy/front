import { Skeleton } from '@/components/ui/skeleton';

/**
 * PropertyDetailSkeleton - Skeleton loader for property detail page
 *
 * Matches the Luxterra-style property detail layout:
 * - Hero image grid (3-column on desktop)
 * - Two-column layout: content + sticky CTA
 * - Location, title, price header
 * - Stats row
 * - Description + accordion sections
 */
export function PropertyDetailSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Image Grid Skeleton */}
      <section className="pt-28 md:pt-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 h-[50vh] md:h-[70vh]">
            {/* Main large image */}
            <div className="md:col-span-2 relative overflow-hidden rounded-sm">
              <Skeleton className="h-full w-full" />
            </div>
            {/* Side images stack */}
            <div className="hidden md:grid grid-rows-2 gap-3 md:gap-4">
              <Skeleton className="w-full h-full rounded-sm" />
              <Skeleton className="w-full h-full rounded-sm" />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content - Two Column Layout */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left Column - Property Info */}
          <div className="lg:col-span-7">
            {/* Header */}
            <div className="mb-10">
              {/* Location */}
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-48" />
              </div>

              {/* Title */}
              <Skeleton className="h-10 w-3/4 mb-4" />

              {/* Price */}
              <div className="flex items-baseline gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-36" />
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4 mb-10 py-6 border-y border-black/10">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-12 mb-2" />
                  <Skeleton className="h-6 w-8" />
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="mb-10">
              <Skeleton className="h-4 w-24 mb-3" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>

            {/* Accordion Sections */}
            <div className="border-t border-black/10">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border-b border-black/10 py-5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-5 w-5" />
                  </div>
                </div>
              ))}
            </div>

            {/* Gallery Section Skeleton */}
            <div className="mt-12">
              <Skeleton className="h-4 w-16 mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="aspect-[4/3] rounded-sm" />
                ))}
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="mt-12">
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="aspect-[16/9] rounded-sm" />
            </div>
          </div>

          {/* Right Column - Sticky CTA */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <div className="border border-black/10 p-6">
                {/* Agent Header */}
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-black/10">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-10 w-10" />
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-3 mb-4">
                  <Skeleton className="h-11 w-full rounded-sm" />
                  <Skeleton className="h-11 w-full rounded-sm" />
                </div>

                {/* CTA Button */}
                <Skeleton className="h-14 w-full" />

                {/* Disclaimer */}
                <Skeleton className="h-3 w-3/4 mx-auto mt-4" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
