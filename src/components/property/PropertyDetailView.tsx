'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Bed, Bathtub, ArrowsOut, Buildings, CaretRight, ArrowSquareOut, ArrowLeft } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { PhotoGalleryModal } from '@/components/property/PhotoGalleryModal';
import { PropertyAccordion } from '@/components/property/PropertyAccordion';
import { StickyCTA, MobileStickyCTA } from '@/components/property/StickyCTA';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { useProperty } from '@/lib/hooks/useProperties';
import { useAuth } from '@/lib/auth/use-auth';
import { useAprobacion } from '@/lib/hooks/use-aprobacion';
import { superaReferencia, referenciaCanon } from '@/lib/api/aprobacion.service';
import { SobreTopeAlert } from '@/components/tenant/TopeAprobadoBanner';
import { formatCurrency, formatArea } from '@/lib/format';

// Offering-agency social networks rendered in the compact "Síguenos" row.
// X / Facebook / Instagram SVGs mirror src/components/layout/FooterCompact.tsx;
// TikTok + WhatsApp added here. Icons are w-4 h-4, fill currentColor.
const AGENCY_SOCIAL_NETWORKS: {
  key: 'instagram' | 'facebook' | 'x' | 'tiktok' | 'whatsapp';
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    key: 'instagram',
    label: 'Instagram',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
      </svg>
    ),
  },
  {
    key: 'facebook',
    label: 'Facebook',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    key: 'x',
    label: 'X',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
];

// Leasefy's own socials — shown to logged-OUT viewers (or as the fallback when
// a logged-in viewer's agency has no socials). Same set/hrefs as FooterCompact.
const LEASEFY_SOCIAL_HREFS: Partial<Record<
  (typeof AGENCY_SOCIAL_NETWORKS)[number]['key'],
  string
>> = {
  instagram: 'https://instagram.com/leasefy',
  facebook: 'https://facebook.com/leasefy',
  x: 'https://x.com/leasefy',
};

export interface PropertyDetailViewProps {
  propertyId: string;
  /**
   * Prefix for links to OTHER property details. Reserved for cross-property
   * navigation (e.g. "similar properties"). Defaults to the public listing.
   */
  basePath?: string;
  /** Where the "back to listings" breadcrumb goes (public '/propiedades', tenant '/inquilino/explorar'). */
  listingHref?: string;
  /**
   * Cómo se llama ese origen en el breadcrumb.
   *
   * Era fijo en "Propiedades", así que quien venía de SU catálogo aterrizaba
   * en una migaja que no tenía nada que ver con donde había empezado — y el
   * link lo devolvía al listado general, perdiendo su tope y su contexto.
   */
  listingLabel?: string;
}

/**
 * Chrome-free property detail body — Luxterra style.
 * Image grid hero + two-column layout with sticky CTA.
 *
 * Rendered by both the public property page (with Navbar + compact footer) and
 * the tenant route (inside the tenant sidebar/header shell). It intentionally
 * renders NO Navbar/Footer so each wrapper supplies its own chrome.
 */
export function PropertyDetailView({
  propertyId,
  listingHref = '/propiedades',
  listingLabel = 'Propiedades',
}: PropertyDetailViewProps) {
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { user } = useAuth();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  // Open gallery at specific image
  const openGallery = useCallback((index: number = 0) => {
    setGalleryInitialIndex(index);
    setGalleryOpen(true);
  }, []);

  // Fetch property from API
  const { property, isLoading: propertyLoading, error: propertyError } = useProperty(propertyId);

  // Aprobación del inquilino: si esta propiedad supera su tope aprobado, se lo
  // avisamos acá igual que en el catálogo (mismo `superaReferencia`). Sin
  // aprobación vigente (o sin tope) no se muestra nada — la lógica gatea sola,
  // así que un usuario inmobiliaria/propietario nunca ve esto.
  const { aprobacion, vigente: aprobacionVigente } = useAprobacion();

  // Scroll to top on page load and when property changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [propertyId]);

  // Loading state
  if (propertyLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-20 container-platform">
          <div className="animate-pulse space-y-6">
            <div className="h-[45vh] md:h-[65vh] bg-surface-muted rounded-xl" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 py-10">
              <div className="lg:col-span-7 space-y-4">
                <div className="h-4 bg-surface-muted rounded w-40" />
                <div className="h-8 bg-surface-muted rounded w-3/4" />
                <div className="h-10 bg-surface-muted rounded w-48" />
                <div className="grid grid-cols-4 gap-3 mt-6">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-surface-muted rounded-xl" />)}
                </div>
              </div>
              <div className="lg:col-span-5 hidden lg:block">
                <div className="h-64 bg-surface-muted rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!property || propertyError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-normal text-foreground tracking-tight">
            Propiedad no encontrada
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            La propiedad que buscas no existe o ha sido removida.
          </p>
          <Link href={listingHref}>
            <Button className="mt-6">Volver a propiedades</Button>
          </Link>
        </div>
      </div>
    );
  }

  const typeLabels: Record<string, string> = {
    apartment: 'Apartamento',
    house: 'Casa',
    studio: 'Estudio',
    room: 'Habitacion',
  };

  // "Síguenos" row — whose socials show depends on the viewer:
  //  - logged IN + agency has ≥1 social → the offering agency's socials
  //  - logged OUT, or agency has none → Leasefy's own socials (default, so the
  //    row always shows something).
  // Agency socials are present only on the detail response (GET /properties/:id).
  const agencySocials = property.agencySocials ?? null;
  const agencySocialLinks = agencySocials
    ? AGENCY_SOCIAL_NETWORKS.filter(
        (n) => (agencySocials[n.key] ?? '').trim().length > 0
      ).map((n) => ({ key: n.key, label: n.label, icon: n.icon, href: (agencySocials[n.key] ?? '').trim() }))
    : [];

  const leasefySocialLinks = AGENCY_SOCIAL_NETWORKS
    .filter((n) => LEASEFY_SOCIAL_HREFS[n.key])
    .map((n) => ({ key: n.key, label: n.label, icon: n.icon, href: LEASEFY_SOCIAL_HREFS[n.key]! }));

  const showAgencySocials = !!user && agencySocialLinks.length > 0;
  const displaySocialLinks = showAgencySocials ? agencySocialLinks : leasefySocialLinks;

  return (
    <>
      <div className="min-h-screen bg-background">
        {/*
          Volver, de verdad.
          La miga de pan sola no alcanza: es un rastro, no un control. Quien
          entra a una ficha desde el buscador quiere volver A SEGUIR BUSCANDO, y
          para eso tiene que haber un botón que se vea como un botón.
          La miga se queda —dice dónde estás— pero el que devuelve es el botón.
        */}
        <div className="pt-6">
          <div className="container-platform">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                href={listingHref}
                className="group inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card pl-3 pr-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <ArrowLeft
                  className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
                  aria-hidden="true"
                />
                Volver a {listingLabel.toLowerCase()}
              </Link>

              <nav
                aria-label="Ruta"
                className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground"
              >
                <Link href={listingHref} className="hover:text-foreground transition-colors">
                  {listingLabel}
                </Link>
                <CaretRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate text-foreground/70">{property.title}</span>
              </nav>
            </div>
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
                className="md:col-span-2 relative overflow-hidden rounded-xl cursor-pointer group"
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
                    className="relative overflow-hidden rounded-xl cursor-pointer group"
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
                    className="relative overflow-hidden rounded-xl cursor-pointer group"
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
                        className="absolute bottom-4 right-4 px-4 py-2.5 bg-white/95 backdrop-blur-sm text-foreground text-[13px] font-medium rounded-xl hover:bg-white transition-colors"
                      >
                        Ver {property.images.length} fotos
                      </span>
                    )}
                  </button>
                ) : (
                  <div className="relative overflow-hidden rounded-xl bg-surface-muted" />
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
                  <span className="text-[32px] md:text-[38px] font-mono tabular-nums font-bold text-foreground tracking-[-0.03em]">
                    {formatCurrency(property.monthlyRent)}
                  </span>
                  <span className="text-[15px] text-muted-foreground">/mes</span>
                </div>
                {property.adminFee > 0 && (
                  <p className="text-[13px] text-muted-foreground mt-1">
                    + <span className="font-mono tabular-nums">{formatCurrency(property.adminFee)}</span> de administración
                  </p>
                )}
              </div>

              {/* Aviso "supera tu tope" + salida por codeudor (mismo criterio
                  que el overlay del catálogo). Solo aparece con aprobación
                  vigente cuyo tope real se pasa este canon. */}
              {aprobacionVigente &&
                superaReferencia(property.monthlyRent, aprobacion) === true && (
                  <SobreTopeAlert
                    monthlyRent={property.monthlyRent}
                    referencia={referenciaCanon(aprobacion)}
                    className="mb-8"
                  />
                )}

              {/*
                Acá iba `SocialProofBanner`: "7 viendo ahora" con un punto que
                latía, "38 visitas hoy" y una insignia de "demanda muy alta".
                Nada de eso se medía — salía de `generateMockStats(propertyId)`,
                un número derivado de las letras del id, y el contador de
                "viendo ahora" se movía solo cada 8 segundos para parecer vivo.

                Va fuera y no se reemplaza por un cero: es urgencia inventada,
                puesta justo en la pantalla donde la persona decide postularse.
                Vuelve cuando haya visitas de verdad que contar.
              */}

              {/* Stats Row - Premium card style */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
                <div className="bg-surface-muted border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowsOut className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Área</span>
                  </div>
                  <p className="text-[20px] font-mono tabular-nums font-bold text-foreground">{formatArea(property.area)}</p>
                </div>
                <div className="bg-surface-muted border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bed className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Habitaciones</span>
                  </div>
                  <p className="text-[20px] font-mono tabular-nums font-bold text-foreground">{property.bedrooms}</p>
                </div>
                <div className="bg-surface-muted border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bathtub className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Baños</span>
                  </div>
                  <p className="text-[20px] font-mono tabular-nums font-bold text-foreground">{property.bathrooms}</p>
                </div>
                <div className="bg-surface-muted border border-border rounded-xl p-4">
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
                <div className="border border-border rounded-xl bg-surface-muted p-8 flex flex-col items-center justify-center gap-5 text-center">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
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

              {/* Offering agency attribution + compact "Síguenos" social row.
                  Icons are the agency's when a logged-in viewer's agency has
                  socials, otherwise Leasefy's — so the row always shows. */}
              {displaySocialLinks.length > 0 && (
                <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    {property.agencyName && (
                      <p className="text-[13px] text-muted-foreground">
                        Ofrecido por <span className="font-medium text-foreground">{property.agencyName}</span>
                      </p>
                    )}
                    <p className="text-[13px] font-medium text-foreground mt-0.5">Síguenos</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {displaySocialLinks.map((network) => (
                      <a
                        key={network.key}
                        href={network.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={network.label}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        {network.icon}
                      </a>
                    ))}
                  </div>
                </div>
              )}
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
      </div>

      {/* Mobile Sticky CTA */}
      <MobileStickyCTA
        propertyId={property.id}
        price={property.monthlyRent}
      />

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
