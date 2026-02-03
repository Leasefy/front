import Link from "next/link";
import { SectionLabel } from "@/components/ui/section-label";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/components/property/PropertyCard";
import { mockProperties } from "@/lib/data/mock-properties";

export function PropertiesSection() {
  const displayedProperties = mockProperties.slice(0, 6);

  return (
    <section className="bg-white pt-16 md:pt-24 pb-24 md:pb-32 relative -mt-px overflow-visible">
      {/* Vertical grid lines */}
      <div className="absolute inset-0 -bottom-32 mx-auto max-w-[1400px] px-6 md:px-12 pointer-events-none hidden lg:block">
        <div className="h-full grid grid-cols-3">
          <div className="border-r border-border" />
          <div className="border-r border-border" />
          <div />
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 md:px-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <SectionLabel className="text-muted-foreground mb-4 justify-center">
            Propiedades
          </SectionLabel>
          <h2 className="text-[2.5rem] md:text-[3rem] font-light text-foreground leading-[1.1] tracking-[-0.02em]">
            Propiedades
          </h2>
        </div>

        {/* Property Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
          {displayedProperties.map((property) => (
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
