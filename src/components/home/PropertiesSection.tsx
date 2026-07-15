'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/components/property/PropertyCard";
import { useFeaturedProperties } from "@/lib/hooks/useProperties";

export function PropertiesSection() {
  const { properties, isLoading } = useFeaturedProperties(6);

  return (
    <section className="bg-white pt-16 md:pt-24 pb-24 md:pb-32 relative -mt-px">

      <div className="container-platform relative z-10">
        {/* Header */}
        <div className="mb-14 lg:mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <h2 className="lg:col-span-2 text-[clamp(2.5rem,5.5vw,4rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
              Encuentra tu próximo hogar
            </h2>
            <div className="flex items-start pl-0 lg:pl-6 pt-2">
              <p className="text-[15px] text-muted-foreground leading-relaxed">
                Propiedades verificadas con información transparente. Sin sorpresas, sin comisiones ocultas.
              </p>
            </div>
          </div>
        </div>

        {/* Property Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-4">
                  <div className="aspect-[4/3] bg-surface-muted rounded-xl" />
                  <div className="h-4 bg-surface-muted rounded w-3/4" />
                  <div className="h-4 bg-surface-muted rounded w-1/2" />
                </div>
              ))
            : properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
        </div>

        {/* Load More Button */}
        <div className="text-center mt-20">
          <Button variant="outline" asChild>
            <Link href="/propiedades">Ver más</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
