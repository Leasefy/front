import Link from "next/link";
import Image from "next/image";
import { SectionLabel } from "@/components/ui/section-label";
import { mockProperties } from "@/lib/data/mock-properties";
import { formatCurrency, formatArea } from "@/lib/format";

export function PropertiesSection() {
  // Filter properties - show first 6
  const displayedProperties = mockProperties.slice(0, 6);

  const typeLabels: Record<string, string> = {
    apartment: "Apartamento",
    house: "Casa",
    studio: "Estudio",
    room: "Habitación",
  };

  return (
    <section className="bg-white py-24 md:py-32 relative">
      {/* Vertical grid lines - Luxterra signature detail */}
      <div className="absolute inset-0 mx-auto max-w-[1400px] px-6 md:px-12 pointer-events-none hidden lg:block">
        <div className="h-full grid grid-cols-3">
          <div className="border-r border-gray-100" />
          <div className="border-r border-gray-100" />
          <div />
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 md:px-12 relative z-10">
        {/* Header - Centered like Luxterra */}
        <div className="text-center mb-16">
          <SectionLabel className="text-gray-400 mb-4 justify-center">
            Propiedades
          </SectionLabel>
          <h2 className="text-[2.5rem] md:text-[3rem] font-light text-gray-900 leading-[1.1] tracking-[-0.02em]">
            Propiedades
          </h2>
        </div>

        {/* Property Grid - Luxterra: 3 columns, no rounded corners */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
          {displayedProperties.map((property) => (
            <Link
              key={property.id}
              href={`/propiedades/${property.id}`}
              className="group block"
            >
              {/* Image container - NO rounded corners like Luxterra */}
              <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                <Image
                  src={property.thumbnailUrl}
                  alt={property.title}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                {/* Badges - Luxterra: white bg with subtle border */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="bg-white text-gray-800 text-[11px] font-normal px-3 py-1.5 border border-gray-100">
                    En arriendo
                  </span>
                  <span className="bg-white text-gray-800 text-[11px] font-normal px-3 py-1.5 border border-gray-100">
                    {typeLabels[property.type] || property.type}
                  </span>
                </div>
              </div>

              {/* Content - Luxterra exact spacing, no divider line */}
              <div className="pt-5">
                {/* Title row with price on right */}
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-[15px] font-medium text-gray-900 leading-snug tracking-[-0.01em] group-hover:text-gray-600 transition-colors">
                    {property.title}
                  </h3>
                  <p className="text-[15px] font-normal text-gray-900 whitespace-nowrap tracking-[-0.01em]">
                    {formatCurrency(property.monthlyRent)}
                  </p>
                </div>

                {/* Location */}
                <p className="text-[13px] text-gray-400 tracking-[-0.01em] mt-1">
                  {property.neighborhood}, {property.city}
                </p>

                {/* Features row - Luxterra: with icons, NO border */}
                <div className="flex items-center gap-5 text-[13px] text-gray-400 mt-4">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 4h16v16H4z" />
                      <path d="M4 9h16M9 4v16" />
                    </svg>
                    <span className="tracking-[-0.01em]">{formatArea(property.area)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 21V7a2 2 0 012-2h14a2 2 0 012 2v14" />
                      <path d="M3 11h18" />
                      <path d="M7 11V7" />
                    </svg>
                    <span className="tracking-[-0.01em]">{property.bedrooms} Bed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 12h16a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4a2 2 0 012-2z" />
                      <path d="M6 12V8a2 2 0 012-2h8a2 2 0 012 2v4" />
                      <circle cx="8" cy="8" r="1" />
                    </svg>
                    <span className="tracking-[-0.01em]">{property.bathrooms} Bath</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Load More Button - Luxterra: black border, no fill */}
        <div className="text-center mt-20">
          <Link
            href="/propiedades"
            className="inline-flex items-center justify-center text-[13px] font-normal text-gray-900 tracking-[-0.01em] py-3 px-8 border border-gray-900 hover:bg-gray-900 hover:text-white transition-all duration-200"
          >
            Ver más
          </Link>
        </div>
      </div>
    </section>
  );
}
