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
import type { Property } from '@/lib/types/property';

export default function GuardadosPage() {
  const { t, locale, formatCurrency } = useI18n();
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();
  const { wishlist, removeFromWishlist } = useWishlist();
  // Resolve the actual wishlisted properties directly by ID (no top-100 ceiling,
  // so saved items never vanish just because they fall outside the featured page).
  const { properties: resolvedProperties } = useWishlistedProperties(
    isOnboardingComplete ? wishlist : [],
  );

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
      <div className="min-h-screen bg-white dark:bg-[#0f0f10] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show "complete profile first" if onboarding not done
  if (!isOnboardingComplete) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <CompleteProfileFirst context="saved" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-medium text-neutral-900 dark:text-white tracking-tight">
                {t('saved.title')}
              </h1>
              <p className="mt-2 text-neutral-500 dark:text-neutral-400">
                {displayCount === 0
                  ? (locale === 'es' ? 'Guarda propiedades que te interesen para verlas después' : 'Save properties you like to view them later')
                  : displayCount === 1
                  ? (locale === 'es' ? '1 propiedad guardada' : '1 saved property')
                  : (locale === 'es' ? `${displayCount} propiedades guardadas` : `${displayCount} saved properties`)}
              </p>
            </div>
            <Link
              href="/inquilino/explorar"
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white uppercase tracking-wide font-mono rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <MagnifyingGlass className="w-4 h-4" />
              {locale === 'es' ? 'Buscar propiedades' : 'Search properties'}
            </Link>
          </div>
        </motion.header>

        {/* Content */}
        {properties.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-neutral-50/80 dark:bg-white/[0.03] p-8 sm:p-12 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-white/[0.06] flex items-center justify-center mx-auto mb-5 shadow-sm dark:shadow-none">
              <Heart className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
            </div>
            <h2 className="text-base font-semibold text-foreground mb-1.5">
              {locale === 'es' ? 'No tienes propiedades guardadas' : 'No saved properties'}
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
              {locale === 'es'
                ? 'Explora propiedades y guarda las que te interesen tocando el corazón. Así podrás compararlas fácilmente.'
                : 'Explore properties and save the ones you like by tapping the heart. This way you can easily compare them.'}
            </p>
            <Button asChild>
              <Link href="/inquilino/explorar">
                {locale === 'es' ? 'Explorar propiedades' : 'Explore properties'}
              </Link>
            </Button>

            {/* Tips */}
            <div className="mt-10 pt-8 border-t border-stone-200 dark:border-neutral-700">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-4">
                {locale === 'es' ? '¿Cómo guardar propiedades?' : 'How to save properties?'}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-[#2a2a2c] flex items-center justify-center">
                    <MagnifyingGlass className="w-4 h-4" />
                  </div>
                  <span>{locale === 'es' ? 'Busca propiedades' : 'Search properties'}</span>
                </div>
                <CaretRight className="w-4 h-4 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-[#2a2a2c] flex items-center justify-center">
                    <Heart className="w-4 h-4 text-red-500" />
                  </div>
                  <span>{locale === 'es' ? 'Toca el corazón' : 'Tap the heart'}</span>
                </div>
                <CaretRight className="w-4 h-4 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-[#2a2a2c] flex items-center justify-center">
                    <Check className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span>{locale === 'es' ? '¡Guardada!' : 'Saved!'}</span>
                </div>
              </div>
            </div>
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
                  className="group relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-lg transition-all duration-300"
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWishlist(property.id);
                      }}
                      className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center hover:scale-110 transition-all backdrop-blur-xl bg-white/20 border border-white/30 shadow-lg hover:bg-red-500 group/btn"
                      title={t('saved.remove')}
                    >
                      <Heart className="w-4 h-4 text-white fill-white group-hover/btn:hidden" />
                      <TrashSimple className="w-4 h-4 text-white hidden group-hover/btn:block" />
                    </button>
                  </button>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <button
                        onClick={() => handleViewProperty(property)}
                        className="text-left flex-1"
                      >
                        <h3 className="font-semibold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                          {property.title}
                        </h3>
                      </button>
                      <p className="text-lg font-bold text-neutral-900 dark:text-white whitespace-nowrap flex-shrink-0">
                        {formatCurrency(property.monthlyRent)}
                        <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">/{locale === 'es' ? 'mes' : 'mo'}</span>
                      </p>
                    </div>

                    <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mb-3">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      {property.neighborhood}, {property.city}
                    </p>

                    <div className="flex items-center gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                      <span className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                        {property.bedrooms} {locale === 'es' ? 'hab' : 'bed'}
                      </span>
                      <span className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                        {property.bathrooms} {locale === 'es' ? 'baños' : 'bath'}
                      </span>
                      <span className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs text-neutral-600 dark:text-neutral-400 font-medium">
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
                  className="flex flex-col items-center justify-center h-full min-h-[280px] rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-[#1a1a1c]/50 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center mb-3 shadow-sm group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
                    <Plus className="w-6 h-6 text-neutral-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {locale === 'es' ? 'Agregar más' : 'Add more'}
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
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
              className="mt-8 rounded-3xl bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/40 dark:to-[#1a1a1c] border border-indigo-100 dark:border-indigo-900/50 p-6"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center shadow-sm">
                    <Heart className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {displayCount} {displayCount === 1 ? (locale === 'es' ? 'propiedad guardada' : 'saved property') : (locale === 'es' ? 'propiedades guardadas' : 'saved properties')}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {locale === 'es' ? '¿Listo para aplicar a alguna?' : 'Ready to apply to one?'}
                    </p>
                  </div>
                </div>
                <Link
                  href="/inquilino/explorar"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white uppercase tracking-wide font-mono rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors"
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
