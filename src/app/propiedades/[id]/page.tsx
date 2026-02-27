'use client';

import { use, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { MapPin, ArrowLeft, Bed, Bathtub, ArrowsOut, Buildings, CaretRight, ArrowSquareOut } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PhotoGalleryModal } from '@/components/property/PhotoGalleryModal';
import { PropertyAccordion } from '@/components/property/PropertyAccordion';
import { StickyCTA, MobileStickyCTA } from '@/components/property/StickyCTA';
import { SocialProofBanner } from '@/components/property/SocialProof';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { useProperty } from '@/lib/hooks/useProperties';
import { formatCurrency, formatArea } from '@/lib/format';
import { cn } from '@/lib/utils';

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
  const router = useRouter();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  // Open gallery at specific image
  const openGallery = useCallback((index: number = 0) => {
    setGalleryInitialIndex(index);
    setGalleryOpen(true);
  }, []);

  // Fetch property from API
  const { property, isLoading: propertyLoading, error: propertyError } = useProperty(resolvedParams.id);

  // Scroll to top on page load and when property changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [resolvedParams.id]);

  // Loading state
  if (propertyLoading) {
    return (
      <>
        <Navbar />
        <main id="main-content" className="min-h-screen bg-background">
          <div className="pt-20 container-platform">
            <div className="animate-pulse space-y-6">
              <div className="h-[45vh] md:h-[65vh] bg-neutral-100 rounded-2xl" />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 py-10">
                <div className="lg:col-span-7 space-y-4">
                  <div className="h-4 bg-neutral-100 rounded w-40" />
                  <div className="h-8 bg-neutral-100 rounded w-3/4" />
                  <div className="h-10 bg-neutral-100 rounded w-48" />
                  <div className="grid grid-cols-4 gap-3 mt-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-neutral-100 rounded-xl" />)}
                  </div>
                </div>
                <div className="lg:col-span-5 hidden lg:block">
                  <div className="h-64 bg-neutral-100 rounded-2xl" />
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!property || propertyError) {
    return (
      <>
        <Navbar />
        <main id="main-content" className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-normal text-foreground tracking-tight">
              Propiedad no encontrada
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
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
      <main id="main-content" className="min-h-screen bg-background">
        {/* Back Compass - Breadcrumb style */}
        <div className="pt-6">
          <div className="container-platform">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/propiedades" className="hover:text-foreground transition-colors">
                Propiedades
              </Link>
              <CaretRight className="w-3.5 h-3.5" />
              <span className="text-foreground/70 truncate max-w-[200px]">{property.title}</span>
            </nav>
          </div>
        </div>

        {/* Hero Image Grid - Premium style with rounded corners */}
        <section className="pt-4 md:pt-6">
          <div className="container-platform">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 h-[45vh] md:h-[65vh]">
              {/* Main large image */}
              <button
                onClick={() => openGallery(0)}
                aria-label={`Ver galeria de imagenes de ${property.title}`}
                className="md:col-span-2 relative overflow-hidden rounded-2xl cursor-pointer group"
              >
                <Image
                  src={property.images[0]}
                  alt={property.title}
                  fill
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 66vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
              {/* Side images stack */}
              <div className="hidden md:grid grid-rows-2 gap-2 md:gap-3">
                {property.images[1] && (
                  <button
                    onClick={() => openGallery(1)}
                    aria-label="Ver imagen 2 en galeria"
                    className="relative overflow-hidden rounded-2xl cursor-pointer group"
                  >
                    <Image
                      src={property.images[1]}
                      alt={`${property.title} - 2`}
                      fill
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      sizes="33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </button>
                )}
                {property.images[2] ? (
                  <button
                    onClick={() => openGallery(2)}
                    aria-label="Ver imagen 3 en galeria"
                    className="relative overflow-hidden rounded-2xl cursor-pointer group"
                  >
                    <Image
                      src={property.images[2]}
                      alt={`${property.title} - 3`}
                      fill
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {/* Show all images button */}
                    {property.images.length > 3 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          openGallery(0);
                        }}
                        className="absolute bottom-4 right-4 px-4 py-2.5 bg-white/95 backdrop-blur-sm text-foreground text-[13px] font-medium rounded-xl hover:bg-white transition-colors shadow-lg"
                      >
                        Ver {property.images.length} fotos
                      </span>
                    )}
                  </button>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl bg-neutral-100" />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Main Content - Two Column Layout */}
        <section className="container-platform py-10 md:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
            {/* Left Column - Property Info */}
            <div className="lg:col-span-7">
              {/* Header */}
              <div className="mb-8">
                {/* Location with primary color */}
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  <span className="text-[14px] text-muted-foreground">{property.neighborhood}, {property.city}</span>
                </div>

                {/* Title - using font-heading */}
                <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-heading font-semibold text-foreground tracking-[-0.02em] leading-[1.15]">
                  {property.title}
                </h1>

                {/* Price - More prominent */}
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-[32px] md:text-[38px] font-heading font-bold text-foreground tracking-[-0.03em]">
                    {formatCurrency(property.monthlyRent)}
                  </span>
                  <span className="text-[15px] text-muted-foreground">/mes</span>
                </div>
                {property.adminFee > 0 && (
                  <p className="text-[13px] text-muted-foreground mt-1">
                    + {formatCurrency(property.adminFee)} de administración
                  </p>
                )}
              </div>

              {/* Social Proof Banner - Styled */}
              <SocialProofBanner propertyId={property.id} className="mb-8" />

              {/* Stats Row - Premium card style */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
                <div className="bg-neutral-50 border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowsOut className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Área</span>
                  </div>
                  <p className="text-[20px] font-heading font-bold text-foreground">{formatArea(property.area)}</p>
                </div>
                <div className="bg-neutral-50 border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bed className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Habitaciones</span>
                  </div>
                  <p className="text-[20px] font-heading font-bold text-foreground">{property.bedrooms}</p>
                </div>
                <div className="bg-neutral-50 border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bathtub className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Baños</span>
                  </div>
                  <p className="text-[20px] font-heading font-bold text-foreground">{property.bathrooms}</p>
                </div>
                <div className="bg-neutral-50 border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Buildings className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Tipo</span>
                  </div>
                  <p className="text-[20px] font-heading font-bold text-foreground">{typeLabels[property.type]}</p>
                </div>
              </div>

              {/* Description */}
              <div className="mb-10">
                <h2 className="text-[13px] font-semibold text-foreground uppercase tracking-wide mb-4">Descripción</h2>
                <p className="text-[15px] text-foreground/70 leading-relaxed">
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
                  <h2 className="text-[13px] font-semibold text-foreground uppercase tracking-wide mb-4">Galería</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {property.images.slice(0, 6).map((image, index) => (
                      <button
                        key={index}
                        onClick={() => openGallery(index)}
                        aria-label={`Ver imagen ${index + 1} en galeria`}
                        className="relative aspect-[4/3] overflow-hidden rounded-xl group cursor-pointer"
                      >
                        <Image
                          src={image}
                          alt={`${property.title} - ${index + 1}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          sizes="(max-width: 768px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </button>
                    ))}
                  </div>
                  {property.images.length > 6 && (
                    <button
                      onClick={() => openGallery(0)}
                      className="mt-4 text-[13px] font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Ver todas las fotos ({property.images.length}) →
                    </button>
                  )}
                </div>
              )}

              {/* Map / Location */}
              <div className="mt-12">
                <h2 className="text-[13px] font-semibold text-foreground uppercase tracking-wide mb-4">Ubicación</h2>
                <div className="border border-border rounded-2xl bg-gradient-to-br from-neutral-50 to-neutral-100/50 p-8 flex flex-col items-center justify-center gap-5 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[17px] font-heading font-semibold text-foreground">
                      {property.neighborhood}
                    </p>
                    <p className="text-[14px] text-muted-foreground mt-1">{property.city}, Colombia</p>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.neighborhood + ', ' + property.city + ', Colombia')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-primary bg-primary/10 rounded-xl hover:bg-primary/15 transition-colors"
                  >
                    <ArrowSquareOut className="w-4 h-4" />
                    Ver en Google Maps
                  </a>
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
