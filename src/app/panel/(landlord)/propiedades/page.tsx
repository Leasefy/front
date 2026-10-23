'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PortadaDelInmueble } from '@/components/property/PortadaDelInmueble';
import Link from 'next/link';
import { Buildings, Plus, MapPin, Bed, Bathtub, Square, Users, GridFour, List, House, TrendUp } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useLandlordProperties } from '@/lib/hooks/useLandlord';
import { useI18n } from '@/lib/i18n';
import { PlanStatusBadge } from '@/components/ui/plan/PlanStatusBadge';
import { Button, Card } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useEntradaTrasCargar } from '@/components/portales/use-entrada-tras-cargar';
import { FranjaDeCifras, KpiCard, SearchInput, SegmentedControl, CrossFade, StaggerItem } from '@leasefy/cadence';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { barrioYCiudad } from '@/lib/inmuebles/barrio-y-ciudad';
import { PanelEnPausa, esElPanelEnPausa } from '@/components/portales/PanelEnPausa';

type ViewMode = 'grid' | 'list';

/**
 * La forma de lo que viene (contadores, filtro y tarjetas) mientras carga: con
 * el vacío en su lugar, la pantalla decía «Aún no tienes propiedades» a quien
 * sí las tenía. Semántica de carga como `EsqueletoDePagina`.
 */
function EsqueletoDeLasPropiedades({ etiqueta }: { etiqueta: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={etiqueta} data-testid="esqueleto-de-las-propiedades">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-5 space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border p-4 mb-6 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-56 max-w-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border overflow-hidden">
            <Skeleton className="h-48 w-full rounded-none" />
            <div className="p-5 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">{etiqueta}…</span>
    </div>
  );
}
type FunnelStatus = 'all' | 'available' | 'rented' | 'pending';

export default function PropiedadesPage() {
  const { t, locale, formatCurrency: i18nFormatCurrency } = useI18n();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFunnelStatus] = useState<FunnelStatus>('all');
  const [searchQuery, setMagnifyingGlassQuery] = useState('');

  // Fetch landlord properties with candidate counts from API
  const {
    properties: myProperties,
    isLoading: isLoadingProperties,
    error: errorDeCarga,
    errorCrudo,
    refetch,
  } = useLandlordProperties();
  // Ronda 28 (revisora r27): la pausa del panel independiente es un estado, no un error (sin «Reintentar»).
  const enPausa = esElPanelEnPausa(errorCrudo);
  /*
   * 🔴 ARREGLOS-2 punto 5 (03-10-2026, visto por MOV-A5 a 390 px): mientras
   * cargaba se pintaba el VACÍO («Aún no tienes propiedades») y los contadores
   * en 0, y con un error también. Ahora: el esqueleto mientras carga, el error
   * con su reintento si falló, y el contenido entra suave tras el esqueleto.
   */
  const entrada = useEntradaTrasCargar(isLoadingProperties);

  // Apply filters. Lo pendiente primero (glow up, 21-10-2026): los inmuebles con
  // candidatos por revisar van arriba, el que más tiene primero; los demás quedan
  // en el orden de siempre.
  const filteredProperties = myProperties
    .filter(p => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !p.address.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (b.p.candidateCount ?? 0) - (a.p.candidateCount ?? 0) || a.i - b.i)
    .map(({ p }) => p);

  // Calculate stats
  const totalProperties = myProperties.length;
  const availableCount = myProperties.filter(p => p.status === 'available').length;
  const rentedCount = myProperties.filter(p => p.status === 'rented').length;
  // `?? 0` here is a type-safety fallback, not a real-data path: a property
  // with `status === 'rented'` was, by definition, leased — a SALE listing
  // (whose `monthlyRent` is `null`, contract.md §3.2.4) never reaches this
  // status (there is no `SOLD` member yet, contract.md §8.2).
  const totalMonthlyIncome = myProperties
    .filter(p => p.status === 'rented')
    .reduce((sum, p) => sum + (p.monthlyRent ?? 0) + p.adminFee, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <PlanStatusBadge status="in_progress" label={t('landlord.properties.statusAvailable')} size="sm" />;
      case 'rented':
        return <PlanStatusBadge status="accepted" label={t('landlord.properties.statusRented')} size="sm" />;
      case 'pending':
        return <PlanStatusBadge status="new" label={t('landlord.properties.statusPending')} size="sm" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div>
        {/* Header. A 390 px el botón con su texto no cabía al lado del título y
            se montaba sobre el encabezado (y se salía de la pantalla): en
            pantallas chicas va sólo el «+», con su nombre para el lector. */}
        <EncabezadoDePantalla
          className="mb-6"
          seccion="Mis inmuebles"
          titulo={t('landlord.properties.title')}
          descripcion={t('landlord.properties.subtitle')}
          accionPrincipal={
            // Revisora r25: a 390 el botón a lo ancho dice lo que hace (antes un «+» solo en un botón azul ancho).
            // En pausa, sin el azul: la única acción de la pantalla es la del aviso.
            <Button asChild size="sm" hideArrow variant={enPausa ? 'outline' : undefined} className="max-lg:flex-1">
              <Link
                href="/publicar?from=panel"
                aria-label={t('landlord.properties.newProperty')}
                title={t('landlord.properties.newProperty')}
                data-testid="nueva-propiedad"
              >
                <Plus className="w-4 h-4" />
                <span>{t('landlord.properties.newProperty')}</span>
              </Link>
            </Button>
          }
        />

        {isLoadingProperties ? (
          <EsqueletoDeLasPropiedades etiqueta={t('landlord.properties.title')} />
        ) : enPausa ? (
          <PanelEnPausa />
        ) : errorDeCarga ? (
          <div
            role="alert"
            data-testid="propiedades-error"
            className="bg-surface rounded-lg border border-border py-16 px-6 text-center"
          >
            <p className="text-fg mb-4">{errorDeCarga}</p>
            <Button type="button" variant="outline" hideArrow onClick={() => void refetch()}>
              {t('common.retry')}
            </Button>
          </div>
        ) : (
        <motion.div {...entrada}>
        {/* Stats Cards. Por debajo de lg el total y el ingreso van a lo ancho:
            a 390 px el ingreso («$ 8.900.000») no cabía en media fila y se
            salía de su tarjeta. Así quedan tres filas sin huecos. */}
        <FranjaDeCifras fila="xl" className="mb-6" data-testid="cifras-de-las-propiedades">
          <KpiCard
            label={t('landlord.properties.totalProperties')}
            value={String(totalProperties)}
            icon={<Buildings />}
          />
          <KpiCard
            label={t('landlord.properties.available')}
            value={String(availableCount)}
            icon={<House />}
          />
          <KpiCard
            label={t('landlord.properties.rented')}
            value={String(rentedCount)}
            icon={<Users />}
          />
          <KpiCard
            label={t('landlord.properties.monthlyIncome')}
            value={i18nFormatCurrency(totalMonthlyIncome)}
            icon={<TrendUp />}
          />
        </FranjaDeCifras>

        {/* Funnels */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* MagnifyingGlass */}
            <div className="flex-1 min-w-0">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setMagnifyingGlassQuery(e.target.value)}
                onClear={() => setMagnifyingGlassQuery('')}
                placeholder={t('landlord.properties.searchPlaceholder')}
                aria-label={t('landlord.properties.searchLabel')}
                inputSize="md"
              />
            </div>

            {/* El estado y la vista en una fila. A 390 px los cuatro estados no
                caben: se desplazan DENTRO de su riel (nunca la página entera) y
                la vista se queda a su lado, de su tamaño. */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-testid="filtro-de-estado">
                <SegmentedControl
                  size="md"
                  aria-label={t('landlord.properties.subtitle')}
                  value={filterStatus}
                  onChange={(value) => setFunnelStatus(value as FunnelStatus)}
                  options={[
                    { value: 'all', label: t('landlord.properties.filterAll') },
                    { value: 'available', label: t('landlord.properties.filterAvailable') },
                    { value: 'rented', label: t('landlord.properties.filterRented') },
                    { value: 'pending', label: t('landlord.properties.filterPending') },
                  ]}
                />
              </div>

              {/* View Toggle */}
              <SegmentedControl
                size="md"
                className="shrink-0"
                aria-label={t('landlord.properties.gridView')}
                value={viewMode}
                onChange={(value) => setViewMode(value as ViewMode)}
                options={[
                  { value: 'grid', label: <GridFour className="w-4 h-4" />, ariaLabel: t('landlord.properties.gridView') },
                  { value: 'list', label: <List className="w-4 h-4" />, ariaLabel: t('landlord.properties.listView') },
                ]}
              />
            </div>
          </div>
        </Card>

        {/* Properties Grid/List — cambiar de vista (o quedar sin resultados) cruza
            el contenido; buscar o filtrar saca y mete tarjetas con la salida y la
            entrada del sistema, y las demás se corren. Lo que ya estaba no se anima. */}
        <CrossFade swapKey={filteredProperties.length > 0 ? viewMode : 'vacio'}>
        {filteredProperties.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence initial={false} mode="popLayout">
              {filteredProperties.map((property) => {
                const candidateCount = property.candidateCount ?? 0;
                return (
                  <StaggerItem key={property.id} className="grid">
                  <Link
                    key={property.id}
                    href={`/panel/${property.id}`}
                    className="bg-surface rounded-lg border border-border overflow-hidden group hover:border-border-strong transition-[border-color] duration-slow block"
                  >
                    {/* Image */}
                    <div className="relative h-48 bg-surface-muted overflow-hidden">
                      <PortadaDelInmueble
                        property={property}
                        alt={property.title}
                        className="group-hover:scale-105 transition-transform duration-reveal"
                      />
                      <div className="absolute top-3 left-3">
                        {getStatusBadge(property.status)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="font-medium text-fg mb-1 line-clamp-1">
                        {property.title}
                      </h3>
                      <p className="text-sm text-fg-muted flex items-center gap-1.5 mb-4">
                        <MapPin className="w-3.5 h-3.5" />
                        {barrioYCiudad(property.neighborhood, property.city)}
                      </p>

                      {/* Features */}
                      <div className="flex items-center gap-4 text-sm text-fg-muted mb-4">
                        <span className="flex items-center gap-1.5">
                          <Bed className="w-4 h-4" />
                          {property.bedrooms}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Bathtub className="w-4 h-4" />
                          {property.bathrooms}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Square className="w-4 h-4" />
                          {property.area}m²
                        </span>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-border-faint">
                        <div>
                          {/* A sale listing has no canon. `—`, never `$ 0` (C6). */}
                          <p className="font-mono text-lg font-normal text-fg tabular-nums">
                            {property.monthlyRent != null ? i18nFormatCurrency(property.monthlyRent) : '—'}
                          </p>
                          {property.monthlyRent != null && (
                            <p className="text-caption text-fg-subtle">/{t('landlord.properties.perMonth')}</p>
                          )}
                        </div>
                        {candidateCount > 0 && (
                          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-muted rounded-full text-sm text-fg">
                            <Users className="w-3.5 h-3.5" />
                            {candidateCount !== 1 ? t('landlord.properties.candidatesCountPlural', { count: candidateCount }) : t('landlord.properties.candidatesCount', { count: candidateCount })}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                  </StaggerItem>
                );
              })}
              </AnimatePresence>
            </div>
          ) : (
            /* List View */
            <div className="relative bg-surface rounded-lg border border-border overflow-hidden">
              <AnimatePresence initial={false} mode="popLayout">
              {filteredProperties.map((property, index) => {
                const candidateCount = property.candidateCount ?? 0;
                return (
                  <StaggerItem key={property.id} className="grid">
                  <Link
                    key={property.id}
                    href={`/panel/${property.id}`}
                    className={cn(
                      'flex items-center gap-5 p-5 hover:bg-surface-hover transition-colors',
                      index !== filteredProperties.length - 1 && 'border-b border-border-faint'
                    )}
                  >
                    {/* Image */}
                    <div className="relative w-28 h-20 bg-surface-muted rounded-lg flex-shrink-0 overflow-hidden">
                      <PortadaDelInmueble
                        property={property}
                        alt={property.title}
                        compacta
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-fg truncate">
                          {property.title}
                        </h3>
                        {getStatusBadge(property.status)}
                      </div>
                      <p className="text-sm text-fg-muted flex items-center gap-1.5 mb-2">
                        <MapPin className="w-3.5 h-3.5" />
                        {property.address}, {property.city}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-fg-muted">
                        <span className="flex items-center gap-1.5">
                          <Bed className="w-4 h-4" />
                          {property.bedrooms} {t('landlord.properties.rooms')}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Bathtub className="w-4 h-4" />
                          {property.bathrooms} {t('landlord.properties.bathrooms')}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Square className="w-4 h-4" />
                          {property.area}m²
                        </span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      {/* A sale listing has no canon. `—`, never `$ 0` (C6). */}
                      <p className="font-mono text-lg font-normal text-fg tabular-nums">
                        {property.monthlyRent != null ? i18nFormatCurrency(property.monthlyRent) : '—'}
                      </p>
                      {property.monthlyRent != null && (
                        <p className="text-caption text-fg-subtle">/{t('landlord.properties.perMonth')}</p>
                      )}
                    </div>

                    {/* Candidates */}
                    {candidateCount > 0 && (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-muted rounded-full text-sm text-fg">
                        <Users className="w-3.5 h-3.5" />
                        {candidateCount}
                      </span>
                    )}

                  </Link>
                  </StaggerItem>
                );
              })}
              </AnimatePresence>
            </div>
          )
        ) : (
          /* Vacío. Con inmuebles pero sin coincidencias, lo dice y deja limpiar
             la búsqueda: antes decía «No tienes propiedades» a quien sí tenía. */
          myProperties.length > 0 ? (
            <EmptyState
              icon={Buildings}
              title={locale === 'en' ? 'No property matches' : 'Ningún inmueble coincide'}
              description={
                locale === 'en'
                  ? 'Try another search or status.'
                  : 'Prueba con otra búsqueda u otro estado.'
              }
              action={{
                label: locale === 'en' ? 'See all' : 'Ver todos',
                onClick: () => {
                  setMagnifyingGlassQuery('');
                  setFunnelStatus('all');
                },
              }}
            />
          ) : (
            <EmptyState
              ilustracion="casa"
              icon={Buildings}
              title={t('landlord.properties.emptyTitle')}
              description={t('landlord.properties.emptyDescription')}
              action={{ label: t('landlord.properties.publishProperty'), href: '/publicar?from=panel' }}
            />
          )
        )}
        </CrossFade>
        </motion.div>
        )}
      </div>
    </div>
  );
}
