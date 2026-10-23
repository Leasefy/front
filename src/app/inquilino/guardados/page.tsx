'use client';

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { useState } from 'react';
import { Heart, MagnifyingGlass, TrashSimple, MapPin } from '@phosphor-icons/react';
import { PortadaDelInmueble } from '@/components/property/PortadaDelInmueble';
import { motion } from 'framer-motion';
import { CrossFade, Stagger, StaggerItem } from '@leasefy/cadence';
import { useEntradaTrasCargar } from '@/components/portales/use-entrada-tras-cargar';
import { useWishlist } from '@/lib/stores/wishlist';
import { useI18n } from '@/lib/i18n';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { useWishlistedProperties } from '@/lib/hooks/useProperties';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { PropertyDetailSheet } from '@/components/tenant/PropertyDetailSheet';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { IconButton } from '@leasefy/cadence';
import { Skeleton } from '@/components/ui/skeleton';
import { RUTA_DEL_MARKETPLACE } from '@/lib/nav/portal-del-inquilino';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import type { Property } from '@/lib/types/property';

export default function GuardadosPage() {
  const { t, locale, formatCurrency } = useI18n();
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();
  const { wishlist, removeFromWishlist } = useWishlist();
  // Resolve the actual wishlisted properties directly by ID (no top-100 ceiling,
  // so saved items never vanish just because they fall outside the featured page).
  const {
    properties: resolvedProperties,
    isLoading: cargandoGuardadas,
    errorCrudo: errorGuardadas,
    yaNoDisponibles,
    refetch: recargarGuardadas,
  } = useWishlistedProperties(isOnboardingComplete ? wishlist : []);

  // Property detail sheet state
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Only show wishlist if onboarding is complete. Derive the count from what is
  // actually resolved so the cards and the count always agree.
  const properties = isOnboardingComplete ? resolvedProperties : [];
  const displayCount = properties.length;

  const handleViewProperty = (property: Property) => {
    setSelectedProperty(property);
    setSheetOpen(true);
  };

  // Carga → contenido: entra con 4 px sólo si se vio el esqueleto.
  const entrada = useEntradaTrasCargar(isOnboardingLoading);

  // Qué se ve debajo del encabezado: cuando cambia (cargó, falló, se vació al
  // quitar la última) lo viejo sale y lo nuevo entra.
  const estadoDeGuardadas =
    cargandoGuardadas && wishlist.length > 0
      ? 'cargando'
      : errorGuardadas
        ? 'fallo'
        : properties.length === 0
          ? 'vacio'
          : 'lista';

  // Loading state
  if (isOnboardingLoading) {
    return (
      <div className="min-h-screen bg-bg">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="list" className="mx-auto max-w-7xl" />
      </div>
    );
  }

  // Show "complete profile first" if onboarding not done
  if (!isOnboardingComplete) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="p-6 lg:p-8">
          <CompleteProfileFirst context="saved" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <motion.div {...entrada} className="space-y-6 p-6 lg:p-8">
        <EncabezadoDePantalla
          className="mb-8"
          seccion={locale === 'es' ? 'Buscar arriendo' : 'Find a rental'}
          titulo={t('saved.title')}
          descripcion={
            displayCount === 0
              ? (locale === 'es' ? 'Guarda los inmuebles que te interesen para compararlos después.' : 'Save the homes you like to compare them later.')
              : displayCount === 1
                ? (locale === 'es' ? '1 inmueble guardado: ábrelo para ver la ficha y postularte.' : '1 saved home: open it to see the details and apply.')
                : (locale === 'es' ? `${displayCount} inmuebles guardados: abre uno para ver la ficha y postularte.` : `${displayCount} saved homes: open one to see the details and apply.`)
          }
          acciones={
            properties.length > 0 ? (
              // Buscar se hace en el marketplace, en OTRA pestaña (reunión 21-10).
              <Button asChild size="sm" variant="outline" hideArrow>
                <a href={RUTA_DEL_MARKETPLACE} target="_blank" rel="noopener noreferrer" data-testid="guardados-ir-al-marketplace">
                  <MagnifyingGlass className="mr-2 h-4 w-4" aria-hidden="true" />
                  {locale === 'es' ? 'Buscar en el marketplace' : 'Search the marketplace'}
                </a>
              </Button>
            ) : undefined
          }
        />

        {/* Content

            Aquí el vacío son TRES cosas distintas, y hay cómo saber cuál es
            porque la lista de guardados es local (localStorage) y los inmuebles
            vienen del backend:

              wishlist vacía            → nunca guardaste nada  → sal a mirar
              wishlist llena + fallo    → no se pudo traer      → reintentar
              wishlist llena + 404s     → las bajaron           → decilo así

            El tercero se veía como el primero: «No tienes propiedades
            guardadas» a alguien que guardó cinco y se las despublicaron. */}
        <CrossFade swapKey={estadoDeGuardadas}>
        {cargandoGuardadas && wishlist.length > 0 ? (
          /* El esqueleto con la forma de las tarjetas (antes, una rueda en el medio). */
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="guardados-cargando" aria-busy="true">
            {Array.from({ length: Math.min(Math.max(wishlist.length, 1), 6) }, (_, i) => (
              <div key={i} className="overflow-hidden rounded-lg border border-border bg-surface">
                <Skeleton className="aspect-[16/10] w-full rounded-none" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : errorGuardadas ? (
          <FalloDeCarga
            error={errorGuardadas}
            queEs="tus guardadas"
            onReintentar={recargarGuardadas}
          />
        ) : properties.length === 0 ? (
          /* Empty State */
          <div>
            {/*
              Era un tercer estilo de vacío —círculo gris sobre `surface-muted/80`—
              mientras Documentos, Contratos, Pagos y Postulaciones usan el
              `EmptyState` de Cadence. Tres formas distintas de decir "no hay
              nada" en el mismo panel.

              El mini-tutorial "¿Cómo guardar propiedades? → busca → toca el
              corazón → ¡guardada!" también salió: explicar en tres pasos cómo
              usar un botón que no está en esta pantalla es andamiaje sobre un
              vacío. El corazón se explica solo donde vive, en las tarjetas.
            */}
            <EmptyState
              icon={Heart}
              title={
                yaNoDisponibles > 0
                  ? locale === 'es'
                    ? 'Las que guardaste ya no están publicadas'
                    : 'The ones you saved are no longer listed'
                  : locale === 'es'
                    ? 'No tienes inmuebles guardados'
                    : 'No saved properties'
              }
              description={
                yaNoDisponibles > 0
                  ? locale === 'es'
                    ? 'Se arrendaron o las quitaron del catálogo. Busca otras y vuelve a guardar las que te sirvan.'
                    : 'They were rented or removed from the catalog. Browse others and save the ones you like.'
                  : locale === 'es'
                    ? 'Toca el corazón en los inmuebles que te interesen y los encuentras aquí para compararlos.'
                    : 'Tap the heart on the properties you like and find them here to compare them.'
              }
              action={{
                label: locale === 'es' ? 'Ver inmuebles para mí' : 'See homes for me',
                href: '/inquilino/para-ti',
              }}
            />
          </div>
        ) : (
          /* Properties Grid — llega después de su carga (entra escalonada, techo
             de 320 ms); quitar una guardada la saca y las demás se corren. */
          <div>
            <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {properties.map((property) => (
                <StaggerItem
                  key={property.id}
                  className="group relative overflow-hidden rounded-lg border border-border bg-surface hover:border-border-strong transition-colors duration-slow"
                >
                  {/* Image */}
                  <button
                    onClick={() => handleViewProperty(property)}
                    className="block relative aspect-[16/10] overflow-hidden w-full"
                  >
                    <PortadaDelInmueble
                      property={property}
                      alt={property.title}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="group-hover:scale-105 transition-transform duration-reveal"
                    />

                    {/* Status badge */}
                    {property.status === 'rented' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-sm font-medium bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                          {locale === 'es' ? 'Arrendado' : 'Rented'}
                        </span>
                      </div>
                    )}

                    {/* Remove button - Glass effect */}
                    <IconButton
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWishlist(property.id);
                      }}
                      className="absolute top-3 right-3 w-9 h-9 rounded-full transition-colors bg-surface/95 border border-border hover:bg-danger-soft group/btn"
                      title={t('saved.remove')}
                      aria-label={t('saved.remove')}
                      icon={
                        <>
                          <Heart weight="fill" className="w-4 h-4 text-fg group-hover/btn:hidden" />
                          <TrashSimple className="w-4 h-4 text-danger hidden group-hover/btn:block" />
                        </>
                      }
                    />
                  </button>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <button
                        onClick={() => handleViewProperty(property)}
                        className="text-left flex-1"
                      >
                        <h3 className="font-medium text-fg group-hover:text-primary transition-colors line-clamp-1">
                          {property.title}
                        </h3>
                      </button>
                      <p className="font-mono text-body tabular-nums text-fg whitespace-nowrap flex-shrink-0">
                        {/* A sale listing has no canon. `—`, never `$ 0` (C6). */}
                        {property.monthlyRent != null ? (
                          <>
                            {formatCurrency(property.monthlyRent)}
                            <span className="text-caption font-normal text-fg-muted">/{locale === 'es' ? 'mes' : 'mo'}</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </p>
                    </div>

                    <p className="text-sm text-fg-muted flex items-center gap-1.5 mb-3">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      {property.neighborhood}, {property.city}
                    </p>

                    <div className="flex items-center gap-2 pt-3 border-t border-border-faint">
                      <span className="px-2.5 py-1 bg-surface-muted rounded-md text-caption text-fg-muted">
                        {property.bedrooms} {locale === 'es' ? 'hab' : 'bed'}
                      </span>
                      <span className="px-2.5 py-1 bg-surface-muted rounded-md text-caption text-fg-muted">
                        {property.bathrooms}{' '}
                        {locale === 'es'
                          ? property.bathrooms === 1
                            ? 'baño'
                            : 'baños'
                          : 'bath'}
                      </span>
                      <span className="px-2.5 py-1 bg-surface-muted rounded-md text-caption text-fg-muted">
                        {property.area} m²
                      </span>
                    </div>
                  </div>
                </StaggerItem>
              ))}

            </Stagger>

          </div>
        )}
        </CrossFade>
      </motion.div>

      {/* Property Detail Sheet */}
      <PropertyDetailSheet
        property={selectedProperty}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
