'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ImageCarousel } from '@/components/property/ImageCarousel';
import { PropertyDetails } from '@/components/property/PropertyDetails';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { mockProperties } from '@/lib/data/mock-properties';

interface PropertyDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Property detail page
 * Route: /propiedades/[id]
 */
export default function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  const resolvedParams = use(params);
  const { isWishlisted, toggleWishlist } = useWishlist();

  const property = mockProperties.find((p) => p.id === resolvedParams.id);

  // 404 handling
  if (!property) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">
          Propiedad no encontrada
        </h1>
        <p className="mt-2 text-muted-foreground">
          La propiedad que buscas no existe o ha sido removida.
        </p>
        <Link href="/propiedades">
          <Button className="mt-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a propiedades
          </Button>
        </Link>
      </div>
    );
  }

  const handleWishlistToggle = () => {
    toggleWishlist(property.id);
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Back link */}
      <div className="container mx-auto px-4 py-4">
        <Link
          href="/propiedades"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a propiedades
        </Link>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Left column: Image carousel */}
          <div className="lg:w-3/5">
            <ImageCarousel
              images={property.images}
              alt={property.title}
              className="sticky top-4"
            />
          </div>

          {/* Right column: Property details */}
          <div className="lg:w-2/5">
            <PropertyDetails
              property={property}
              isWishlisted={isWishlisted(property.id)}
              onWishlistToggle={handleWishlistToggle}
            />

            {/* Desktop CTA - visible on lg screens */}
            <div className="mt-8 hidden lg:block">
              <Link href={`/aplicar/${property.id}`}>
                <Button size="lg" className="w-full text-lg">
                  Postularme a esta propiedad
                </Button>
              </Link>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Completa tu solicitud en minutos
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA - visible on smaller screens */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 shadow-lg lg:hidden">
        <div className="container mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="font-bold text-foreground">
                {property.monthlyRent.toLocaleString('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
                <span className="text-sm font-normal text-muted-foreground">
                  /mes
                </span>
              </p>
            </div>
            <Link href={`/aplicar/${property.id}`}>
              <Button size="lg">Postularme</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
