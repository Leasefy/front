'use client';

import { use, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PhotoGalleryModal } from '@/components/property/PhotoGalleryModal';
import { PropertyAccordion } from '@/components/property/PropertyAccordion';
import { StickyCTA, MobileStickyCTA } from '@/components/property/StickyCTA';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { mockProperties } from '@/lib/data/mock-properties';
import { formatCurrency } from '@/lib/format';

interface PropertyDetailPageProps {
  params: Promise<{ id: string }> | { id: string };
}

/**
 * Property detail page - Luxterra style
 * Image grid hero + two-column layout with sticky CTA
 * Uses reusable PropertyAccordion and StickyCTA components
 */
export default function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  // Open gallery at specific image
  const openGallery = useCallback((index: number = 0) => {
    setGalleryInitialIndex(index);
    setGalleryOpen(true);
  }, []);

  // Scroll to top on page load and when property changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [resolvedParams.id]);

  const property = mockProperties.find((p) => p.id === resolvedParams.id);

  if (!property) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-normal text-black tracking-tight">
              Propiedad no encontrada
            </h1>
            <p className="mt-2 text-sm text-black/60">
              La propiedad que buscas no existe o ha sido removida.
            </p>
            <Link href="/propiedades">
              <Button className="mt-6">Volver a propiedades</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const typeLabels: Record<string, string> = {
    apartment: 'Apartamento',
    house: 'Casa',
    studio: 'Estudio',
    room: 'Habitacion',
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white">
        {/* Hero Image Grid - Luxterra style */}
        <section className="pt-28 md:pt-32">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 h-[50vh] md:h-[70vh]">
              {/* Main large image */}
              <button
                onClick={() => openGallery(0)}
                className="md:col-span-2 relative overflow-hidden rounded-lg cursor-pointer group"
              >
                <Image
                  src={property.images[0]}
                  alt={property.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 66vw"
                  priority
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </button>
              {/* Side images stack */}
              <div className="hidden md:grid grid-rows-2 gap-3 md:gap-4">
                {property.images[1] && (
                  <button
                    onClick={() => openGallery(1)}
                    className="relative overflow-hidden rounded-lg cursor-pointer group"
                  >
                    <Image
                      src={property.images[1]}
                      alt={`${property.title} - 2`}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="33vw"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </button>
                )}
                {property.images[2] ? (
                  <button
                    onClick={() => openGallery(2)}
                    className="relative overflow-hidden rounded-lg cursor-pointer group"
                  >
                    <Image
                      src={property.images[2]}
                      alt={`${property.title} - 3`}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    {/* Show all images button */}
                    {property.images.length > 3 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          openGallery(0);
                        }}
                        className="absolute bottom-4 right-4 px-4 py-2 bg-white text-black text-xs font-medium tracking-tight rounded-md hover:bg-gray-100 transition-colors shadow-sm"
                      >
                        Ver todas las imagenes ({property.images.length})
                      </span>
                    )}
                  </button>
                ) : (
                  <div className="relative overflow-hidden rounded-lg bg-gray-100" />
                )}
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
                <div className="flex items-center gap-2 text-sm text-black/50 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>{property.neighborhood}, {property.city}</span>
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-normal text-black tracking-[-0.02em] leading-[1.1]">
                  {property.title}
                </h1>

                {/* Price - Luxterra style */}
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-sm text-black/50">Arriendo mensual</span>
                  <span className="text-2xl font-medium text-black">
                    {formatCurrency(property.monthlyRent)}
                  </span>
                </div>
              </div>

              {/* Stats Row - Luxterra style boxes */}
              <div className="grid grid-cols-4 gap-4 mb-10 py-6 border-y border-black/10">
                <div>
                  <p className="text-xs text-black/50 mb-1">Area (m2)</p>
                  <p className="text-lg font-medium text-black">{property.area}</p>
                </div>
                <div>
                  <p className="text-xs text-black/50 mb-1">Habitaciones</p>
                  <p className="text-lg font-medium text-black">{property.bedrooms}</p>
                </div>
                <div>
                  <p className="text-xs text-black/50 mb-1">Banos</p>
                  <p className="text-lg font-medium text-black">{property.bathrooms}</p>
                </div>
                <div>
                  <p className="text-xs text-black/50 mb-1">Tipo</p>
                  <p className="text-lg font-medium text-black">{typeLabels[property.type]}</p>
                </div>
              </div>

              {/* Description */}
              <div className="mb-10">
                <h2 className="text-sm font-medium text-black mb-3">Descripcion</h2>
                <p className="text-base text-black/70 leading-relaxed">
                  {property.description}
                </p>
              </div>

              {/* Accordion Sections - Using reusable PropertyAccordion */}
              <PropertyAccordion
                property={property}
                defaultOpen={['details', 'amenities']}
              />

              {/* Gallery Section */}
              {property.images.length > 1 && (
                <div className="mt-12">
                  <h2 className="text-sm font-medium text-black mb-4">Galeria</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {property.images.slice(0, 6).map((image, index) => (
                      <button
                        key={index}
                        onClick={() => openGallery(index)}
                        className="relative aspect-[4/3] overflow-hidden group cursor-pointer"
                      >
                        <Image
                          src={image}
                          alt={`${property.title} - ${index + 1}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </button>
                    ))}
                  </div>
                  {property.images.length > 6 && (
                    <button
                      onClick={() => openGallery(0)}
                      className="mt-4 text-sm text-black/60 hover:text-black transition-colors"
                    >
                      Ver todas las imagenes ({property.images.length})
                    </button>
                  )}
                </div>
              )}

              {/* Map Placeholder */}
              <div className="mt-12">
                <h2 className="text-sm font-medium text-black mb-4">Mapa de ubicacion</h2>
                <div className="aspect-[16/9] bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-sm text-black/40">Mapa proximamente</span>
                </div>
              </div>
            </div>

            {/* Right Column - Sticky CTA */}
            <div className="lg:col-span-5 hidden lg:block">
              <StickyCTA
                propertyId={property.id}
                price={property.monthlyRent}
                adminFee={property.adminFee}
                isWishlisted={isWishlisted(property.id)}
                onWishlistToggle={() => toggleWishlist(property.id)}
              />
            </div>
          </div>
        </section>
      </main>

      {/* Mobile Sticky CTA */}
      <MobileStickyCTA
        propertyId={property.id}
        price={property.monthlyRent}
      />

      <Footer />

      {/* Photo Gallery Modal */}
      <PhotoGalleryModal
        images={property.images}
        propertyTitle={property.title}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        initialImageIndex={galleryInitialIndex}
      />
    </>
  );
}
