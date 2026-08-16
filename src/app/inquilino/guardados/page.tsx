'use client';

import { useState } from 'react';
import { Heart, MagnifyingGlass, TrashSimple, MapPin, CaretRight, House, Plus, Check } from '@phosphor-icons/react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useWishlist } from '@/lib/stores/wishlist';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { useWishlistedProperties } from '@/lib/hooks/useProperties';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { PropertyDetailSheet } from '@/components/tenant/PropertyDetailSheet';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { IconButton } from '@leasefy/cadence';
import { Spinner } from '@/components/ui/spinner';
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

  // Loading state
  if (isOnboardingLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" variant="current" className="text-primary" />
      </div>
    );
  }

  // Show "complete profile first" if onboarding not done
  if (!isOnboardingComplete) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <CompleteProfileFirst context="saved" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-medium text-fg tracking-tight">
                {t('saved.title')}
              </h1>
              <p className="mt-2 text-fg-muted">
                {displayCount === 0
                  ? (locale === 'es' ? 'Guarda propiedades que te interesen para verlas después' : 'Save properties you like to view them later')
                  : displayCount === 1
                  ? (locale === 'es' ? '1 propiedad guardada' : '1 saved property')
                  : (locale === 'es' ? `${displayCount} propiedades guardadas` : `${displayCount} saved properties`)}
              </p>
            </div>
            {/* El botón del encabezado solo cuando hay guardadas: sin nada, el
                estado vacío ya ofrece la misma acción justo debajo, y dos
                botones distintos para lo mismo en la misma pantalla confunden
                sobre cuál es el camino. */}
            {properties.length > 0 && (
              <Link
                href="/inquilino/explorar"
                className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full text-sm font-medium hover:opacity-90 transition-colors"
              >
                <MagnifyingGlass className="w-4 h-4" />
                {locale === 'es' ? 'Buscar propiedades' : 'Search properties'}
              </Link>
            )}
          </div>
        </motion.header>

        {/* Content

            Acá el vacío son TRES cosas distintas, y hay cómo saber cuál es
            porque la lista de guardados es local (localStorage) y los inmuebles
            vienen del backend:

              wishlist vacía            → nunca guardaste nada  → salí a mirar
              wishlist llena + fallo    → no se pudo traer      → reintentar
              wishlist llena + 404s     → las bajaron           → decilo así

            El tercero se veía como el primero: «No tienes propiedades
            guardadas» a alguien que guardó cinco y se las despublicaron. */}
        {cargandoGuardadas && wishlist.length > 0 ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : errorGuardadas ? (
          <FalloDeCarga
            error={errorGuardadas}
            queEs="tus guardadas"
            onReintentar={recargarGuardadas}
          />
        ) : properties.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
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
                    ? 'No tienes propiedades guardadas'
                    : 'No saved properties'
              }
              description={
                yaNoDisponibles > 0
                  ? locale === 'es'
                    ? 'Se arrendaron o las quitaron del catálogo. Buscá otras y volvé a guardar las que te sirvan.'
                    : 'They were rented or removed from the catalog. Browse others and save the ones you like.'
                  : locale === 'es'
                    ? 'Toca el corazón en las propiedades que te interesen y las encuentras acá para compararlas.'
                    : 'Tap the heart on the properties you like and find them here to compare them.'
              }
              action={{
                label: locale === 'es' ? 'Ver propiedades para mí' : 'View properties for me',
                href: '/inquilino/para-ti',
              }}
            />
          </motion.div>
        ) : (
          /* Properties Grid */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {properties.map((property, index) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="group relative overflow-hidden rounded-xl border border-border bg-surface hover:border-border-strong transition-all duration-300"
                >
                  {/* Image */}
                  <button
                    onClick={() => handleViewProperty(property)}
                    className="block relative aspect-[16/10] overflow-hidden w-full"
                  >
                    <Image
                      src={property.thumbnailUrl || property.images?.[0] || ''}
                      alt={property.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
                      className="absolute top-3 right-3 w-9 h-9 rounded-full hover:scale-110 transition-all backdrop-blur-xl bg-surface/20 border border-white/30 hover:bg-danger group/btn"
                      title={t('saved.remove')}
                      aria-label={t('saved.remove')}
                      icon={
                        <>
                          <Heart className="w-4 h-4 text-white fill-white group-hover/btn:hidden" />
                          <TrashSimple className="w-4 h-4 text-white hidden group-hover/btn:block" />
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
                        <h3 className="font-semibold text-fg group-hover:text-primary transition-colors line-clamp-1">
                          {property.title}
                        </h3>
                      </button>
                      <p className="text-lg font-bold text-fg whitespace-nowrap flex-shrink-0">
                        {formatCurrency(property.monthlyRent)}
                        <span className="text-xs font-normal text-fg-muted">/{locale === 'es' ? 'mes' : 'mo'}</span>
                      </p>
                    </div>

                    <p className="text-sm text-fg-muted flex items-center gap-1.5 mb-3">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      {property.neighborhood}, {property.city}
                    </p>

                    <div className="flex items-center gap-2 pt-3 border-t border-border-faint">
                      <span className="px-2.5 py-1 bg-surface-muted rounded-md text-xs text-fg-muted font-medium">
                        {property.bedrooms} {locale === 'es' ? 'hab' : 'bed'}
                      </span>
                      <span className="px-2.5 py-1 bg-surface-muted rounded-md text-xs text-fg-muted font-medium">
                        {property.bathrooms}{' '}
                        {locale === 'es'
                          ? property.bathrooms === 1
                            ? 'baño'
                            : 'baños'
                          : 'bath'}
                      </span>
                      <span className="px-2.5 py-1 bg-surface-muted rounded-md text-xs text-fg-muted font-medium">
                        {property.area} m²
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Add More Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + properties.length * 0.05 }}
              >
                <Link
                  href="/inquilino/explorar"
                  className="flex flex-col items-center justify-center h-full min-h-[280px] rounded-xl border-2 border-dashed border-border bg-surface-muted/50 hover:border-primary/30 hover:bg-primary-soft/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center mb-3 group-hover:bg-primary-soft transition-colors">
                    <Plus className="w-6 h-6 text-fg-subtle group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-fg-muted group-hover:text-primary transition-colors">
                    {locale === 'es' ? 'Agregar más' : 'Add more'}
                  </p>
                  <p className="text-xs text-fg-subtle mt-1">
                    {locale === 'es' ? 'Explorar propiedades' : 'Explore properties'}
                  </p>
                </Link>
              </motion.div>
            </div>

            {/* Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 rounded-xl bg-primary-soft border border-primary/30 p-6"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface border border-primary/30 flex items-center justify-center">
                    <Heart className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-fg">
                      {displayCount} {displayCount === 1 ? (locale === 'es' ? 'propiedad guardada' : 'saved property') : (locale === 'es' ? 'propiedades guardadas' : 'saved properties')}
                    </p>
                    <p className="text-sm text-fg-muted">
                      {locale === 'es' ? '¿Listo para postularte a alguna?' : 'Ready to apply to one?'}
                    </p>
                  </div>
                </div>
                <Link
                  href="/inquilino/explorar"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full text-sm font-medium hover:opacity-90 transition-colors"
                >
                  <MagnifyingGlass className="w-4 h-4" />
                  {locale === 'es' ? 'Ver más propiedades' : 'View more properties'}
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Property Detail Sheet */}
      <PropertyDetailSheet
        property={selectedProperty}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
