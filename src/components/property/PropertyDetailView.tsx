'use client';

import { barrioYCiudad } from '@/lib/inmuebles/barrio-y-ciudad';
import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Bed, Bathtub, ArrowsOut, CaretRight, ArrowSquareOut, ArrowLeft, Play } from '@phosphor-icons/react';

import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { tieneCoordenadas } from '@/components/map/coordenadas';
import { PhotoGalleryModal } from '@/components/property/PhotoGalleryModal';
import { StickyCTA, MobileStickyCTA } from '@/components/property/StickyCTA';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { useProperty } from '@/lib/hooks/useProperties';
import { useAuth } from '@/lib/auth/use-auth';
import { useAprobacion } from '@/lib/hooks/use-aprobacion';
import { superaReferencia, referenciaCanon } from '@/lib/api/aprobacion.service';
import { SobreTopeAlert } from '@/components/tenant/TopeAprobadoBanner';
import { TePodemosArrendar } from '@/components/property/TePodemosArrendar';
import { AdministradoPor } from '@/components/property/AdministradoPor';
import { PortadaSinFotos } from '@/components/property/PortadaSinFotos';
import { videoDelInmueble } from '@/lib/marketplace/video';
import { useTarjetasDeInmobiliarias } from '@/lib/marketplace/use-inmobiliarias';
import {
  CostosDelArriendo,
  DatosClave,
  Descripcion,
  LoEspecial,
  MasDeLaInmobiliaria,
  MosaicoDeFotos,
  OfrecidoPor,
  publicadoHace,
  SimilaresCerca,
  SobreLaInmobiliaria,
  TotalAlMes,
} from '@/components/property/ficha/PiezasDeLaFicha';
import { formatCurrency, formatArea } from '@/lib/format';

// MapLibre toca `window`: sin SSR, con un esqueleto de la misma altura.
const MapaDelInmueble = dynamic(
  () => import('@/components/map/MapaDelInmueble').then((m) => m.MapaDelInmueble),
  { ssr: false, loading: () => <Skeleton className="h-56 sm:h-64 w-full rounded-lg" /> },
);

// Offering-agency social networks rendered in the compact "Síguenos" row.
// X / Facebook / Instagram SVGs (el viejo `FooterCompact` que los traía ya no existe);
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
  // La inmobiliaria que lo ofrece: su sello, «% la recomienda» y su página.
  const inmobiliarias = useTarjetasDeInmobiliarias(useMemo(() => [property?.agencyId], [property?.agencyId]));
  const inmobiliaria = property?.agencyId ? inmobiliarias.get(property.agencyId) : undefined;

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

        {/* Las fotos en mosaico: se acomoda a cuántas hay, nunca un hueco gris
            (Nico, 09-10-2026, ficha «perfecta» con el plano de Redfin/Zillow). */}
        <section className="pt-4 md:pt-6">
          <div className="container-platform">
            {property.images.length === 0 ? (
              /* Sin fotos (importado por CSV, o el agente todavía no las subió):
                 un espacio acotado y con marca, no una imagen rota en un hero
                 de 65vh en blanco (Nico, 2026-09-02). */
              <div
                className="relative flex h-[240px] md:h-[320px] flex-col items-center justify-start overflow-hidden rounded-xl pt-8 text-center md:pt-10"
                data-testid="hero-sin-fotos"
                role="img"
                aria-label={`Sin fotos de ${property.title}`}
              >
                <PortadaSinFotos tipo={property.type} semilla={property.id} sinLeyenda />
                <p className="relative text-[15px] font-medium text-foreground">Todavía no hay fotos de este inmueble</p>
                <p className="relative mt-1 text-[13px] text-muted-foreground">
                  Pídelas por el chat o agenda una visita para conocerlo.
                </p>
              </div>
            ) : (
              <MosaicoDeFotos
                fotos={property.images}
                titulo={property.title}
                video={videoDelInmueble(property)}
                etiquetas={[
                  property.listingType === 'sale' ? 'En venta' : 'En arriendo',
                  ...(typeLabels[property.type] ? [typeLabels[property.type]] : []),
                ]}
                onAbrir={openGallery}
              />
            )}
          </div>
        </section>

        {/* Main Content - Two Column Layout */}
        <section className="container-platform py-10 md:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
            {/* Left Column - Property Info */}
            <div className="lg:col-span-7">
              {/* Header */}
              <div className="mb-8">
                <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    <span className="text-[14px] text-muted-foreground">{barrioYCiudad(property.neighborhood, property.city)}</span>
                  </span>
                  {publicadoHace(property.createdAt) && (
                    <span className="text-[13px] text-fg-subtle">· {publicadoHace(property.createdAt)}</span>
                  )}
                </div>

                <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-heading font-semibold text-foreground tracking-[-0.02em] leading-[1.15]">
                  {property.title}
                </h1>

                {/* El total al mes (canon + administración), los datos clave y
                    quién lo ofrece: todo sin bajar. */}
                <TotalAlMes p={property} />
                <DatosClave p={property} />
                <OfrecidoPor p={property} t={inmobiliaria} />
              </div>

              {/* Aviso "supera tu tope" + salida por codeudor (mismo criterio
                  que el overlay del catálogo). Solo aparece con aprobación
                  vigente cuyo tope real se pasa este canon. `superaReferencia`
                  ya devuelve `null` (nunca `true`) para un canon `null`
                  (SALE, contract.md §3.2.4), así que esta rama nunca se
                  ejecuta ahí — el `?? 0` es sólo una red de tipos. */}
              {aprobacionVigente &&
                superaReferencia(property.monthlyRent, aprobacion) === true && (
                  <SobreTopeAlert
                    monthlyRent={property.monthlyRent ?? 0}
                    referencia={referenciaCanon(aprobacion)}
                    className="mb-8"
                  />
                )}

              {/* «¿Te podemos arrendar este inmueble?» (Nico, 2026-09-14): el
                  estimado gratis por ingreso y la puerta al estudio con Fianly.
                  Sólo en arriendo con canon, y no a quien ya tiene aprobación
                  vigente: ése ya sabe su tope (lo cubre el aviso de arriba). Tampoco
                  en un inmueble arrendado: el listado ya no lo muestra, y a quien
                  llega por un enlace viejo no se le ofrece arrendar algo ocupado. */}
              {property.listingType !== 'sale' && property.status !== 'rented' && (property.monthlyRent ?? 0) > 0 && !aprobacionVigente && (
                <TePodemosArrendar
                  propertyId={property.id}
                  titulo={property.title}
                  foto={property.images?.[0] ?? null}
                  canon={property.monthlyRent ?? 0}
                  ciudad={property.city}
                  tipo={property.type}
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

              <LoEspecial p={property} />
              <Descripcion texto={property.description} />
              <CostosDelArriendo p={property} />

              {/* El acordeón viejo (detalles, ubicación, comodidades, costos y
                  políticas) repetía lo de arriba y decía «Depósito 1 mes» bajo
                  «Sin depósito» (QA del marketplace, 10-10-2026): fuera. */}

              {/* Map / Location. Con coordenadas reales va el mapa (mismo
                  componente que la ficha del panel); sin ellas queda la
                  tarjeta con el enlace por barrio y ciudad. */}
              <div className="mt-12">
                <h2 className="text-[13px] font-semibold text-foreground uppercase tracking-wide mb-4">Ubicación</h2>
                {tieneCoordenadas(property.latitude, property.longitude) ? (
                  <MapaDelInmueble
                    latitude={property.latitude as number}
                    longitude={property.longitude as number}
                    titulo={property.title}
                    direccion={`${barrioYCiudad(property.neighborhood, property.city)}, Colombia`}
                  />
                ) : (
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
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(barrioYCiudad(property.neighborhood, property.city) + ', Colombia')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-primary bg-primary/10 rounded-xl hover:bg-primary/15 transition-colors"
                  >
                    <ArrowSquareOut className="w-4 h-4" />
                    Ver en Google Maps
                  </a>
                </div>
                )}
              </div>

              {/* Pie: quién lo publicó y cuándo se actualizó. */}
              <p className="mt-12 border-t border-border pt-6 text-[13px] text-fg-subtle" data-testid="pie-de-la-ficha">
                {property.agencyName ? `Publicado por ${property.agencyName}` : 'Publicado en Leasefy'}
                {property.updatedAt && ` · Actualizado el ${new Date(property.updatedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}`}
              </p>
            </div>

            {/* Right Column - Sticky CTA. En el celular también se ve (debajo de la
                ficha): ahí se agenda la visita; «Visita» de la barra lleva hasta acá. */}
            <div className="lg:col-span-5">
              <StickyCTA
                propertyId={property.id}
                arrendado={property.status === 'rented'}
                administrador={
                  property.agencyName
                    ? { agencyId: property.agencyId ?? null, nombre: property.agencyName, logoUrl: property.agencyLogoUrl ?? null }
                    : null
                }
                sobreLaInmobiliaria={inmobiliaria ? <SobreLaInmobiliaria t={inmobiliaria} /> : undefined}
                price={property.monthlyRent ?? 0}
                adminFee={property.adminFee}
                isWishlisted={isWishlisted(property.id)}
                onWishlistToggle={() => toggleWishlist(property.id)}
                listingType={property.listingType}
                salePrice={property.salePrice}
                visitTypes={property.visitTypes}
              />
            </div>
          </div>

          <MasDeLaInmobiliaria p={property} t={inmobiliaria} />
          <SimilaresCerca p={property} />
        </section>
      </div>

      {/* Mobile Sticky CTA */}
      <MobileStickyCTA
        propertyId={property.id}
        arrendado={property.status === 'rented'}
        price={property.monthlyRent ?? 0}
        listingType={property.listingType}
        salePrice={property.salePrice}
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
