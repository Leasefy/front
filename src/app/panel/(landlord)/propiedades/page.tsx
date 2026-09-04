'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Buildings, Plus, MapPin, Bed, Bathtub, Square, Eye, PencilSimple, DotsThreeVertical, Users, CurrencyDollar, GridFour, List, House, TrendUp } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useLandlordProperties } from '@/lib/hooks/useLandlord';
import { useI18n } from '@/lib/i18n';
import { PlanStatusBadge } from '@/components/ui/plan/PlanStatusBadge';
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu';
import { Button, Card } from '@/components/ui';
import { PageHeader, KpiCard, SearchInput, SegmentedControl, IconButton } from '@leasefy/cadence';

type ViewMode = 'grid' | 'list';
type FunnelStatus = 'all' | 'available' | 'rented' | 'pending';

export default function PropiedadesPage() {
  const { t, formatCurrency: i18nFormatCurrency } = useI18n();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFunnelStatus] = useState<FunnelStatus>('all');
  const [searchQuery, setMagnifyingGlassQuery] = useState('');

  // Fetch landlord properties with candidate counts from API
  const { properties: myProperties, isLoading: isLoadingProperties } = useLandlordProperties();

  // Apply filters
  const filteredProperties = myProperties.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.address.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

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
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <PageHeader
          title={t('landlord.properties.title')}
          subtitle={t('landlord.properties.subtitle')}
          actions={
            <Button asChild hideArrow>
              <Link href="/publicar?from=panel">
                <Plus className="w-4 h-4" />
                {t('landlord.properties.newProperty')}
              </Link>
            </Button>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
        </div>

        {/* Funnels */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* MagnifyingGlass */}
            <div className="flex-1">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setMagnifyingGlassQuery(e.target.value)}
                onClear={() => setMagnifyingGlassQuery('')}
                placeholder={t('landlord.properties.searchPlaceholder')}
                aria-label={t('landlord.properties.searchLabel')}
                inputSize="md"
              />
            </div>

            {/* Status Funnel */}
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

            {/* View Toggle */}
            <SegmentedControl
              size="md"
              aria-label={t('landlord.properties.gridView')}
              value={viewMode}
              onChange={(value) => setViewMode(value as ViewMode)}
              options={[
                { value: 'grid', label: <GridFour className="w-4 h-4" />, ariaLabel: t('landlord.properties.gridView') },
                { value: 'list', label: <List className="w-4 h-4" />, ariaLabel: t('landlord.properties.listView') },
              ]}
            />
          </div>
        </Card>

        {/* Properties Grid/List */}
        {filteredProperties.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => {
                const candidateCount = property.candidateCount ?? 0;
                return (
                  <Link
                    key={property.id}
                    href={`/panel/${property.id}`}
                    className="bg-surface rounded-lg border border-border overflow-hidden group hover: hover:shadow-neutral-200/50 dark:hover:shadow-neutral-900/50 transition-all duration-300 block"
                  >
                    {/* Image */}
                    <div className="relative h-48 bg-surface-muted overflow-hidden">
                      <Image
                        src={property.thumbnailUrl}
                        alt={property.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3">
                        {getStatusBadge(property.status)}
                      </div>
                      <div onClick={(e) => e.preventDefault()}>
                        <DropdownList>
                          <DropdownListTrigger asChild>
                            <IconButton
                              variant="solid"
                              className="absolute top-3 right-3 bg-surface/90"
                              icon={<DotsThreeVertical className="w-4 h-4" />}
                              aria-label={t('landlord.properties.moreOptions')}
                            />
                          </DropdownListTrigger>
                          <DropdownListContent align="end" className="w-40 rounded-lg">
                            <DropdownListItem asChild className="rounded-md">
                              <Link href={`/panel/${property.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                {t('landlord.properties.viewDetail')}
                              </Link>
                            </DropdownListItem>
                            <DropdownListItem className="rounded-md">
                              <PencilSimple className="w-4 h-4 mr-2" />
                              {t('landlord.properties.edit')}
                            </DropdownListItem>
                            <DropdownListItem asChild className="rounded-md">
                              <Link href={`/panel/${property.id}`}>
                                <Users className="w-4 h-4 mr-2" />
                                {t('landlord.properties.viewCandidates')}
                              </Link>
                            </DropdownListItem>
                          </DropdownListContent>
                        </DropdownList>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="font-semibold text-fg mb-1 line-clamp-1">
                        {property.title}
                      </h3>
                      <p className="text-sm text-fg-muted flex items-center gap-1.5 mb-4">
                        <MapPin className="w-3.5 h-3.5" />
                        {property.neighborhood}, {property.city}
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
                          <p className="text-lg font-bold text-fg tabular-nums">
                            {property.monthlyRent != null ? i18nFormatCurrency(property.monthlyRent) : '—'}
                          </p>
                          {property.monthlyRent != null && (
                            <p className="text-xs text-fg-subtle">/{t('landlord.properties.perMonth')}</p>
                          )}
                        </div>
                        {candidateCount > 0 && (
                          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-soft rounded-full text-sm font-medium text-primary">
                            <Users className="w-3.5 h-3.5" />
                            {candidateCount !== 1 ? t('landlord.properties.candidatesCountPlural', { count: candidateCount }) : t('landlord.properties.candidatesCount', { count: candidateCount })}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="bg-surface rounded-lg border border-border overflow-hidden">
              {filteredProperties.map((property, index) => {
                const candidateCount = property.candidateCount ?? 0;
                return (
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
                      <Image
                        src={property.thumbnailUrl}
                        alt={property.title}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-fg truncate">
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
                      <p className="text-lg font-bold text-fg tabular-nums">
                        {property.monthlyRent != null ? i18nFormatCurrency(property.monthlyRent) : '—'}
                      </p>
                      {property.monthlyRent != null && (
                        <p className="text-xs text-fg-subtle">/{t('landlord.properties.perMonth')}</p>
                      )}
                    </div>

                    {/* Candidates */}
                    {candidateCount > 0 && (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-soft rounded-full text-sm font-medium text-primary">
                        <Users className="w-3.5 h-3.5" />
                        {candidateCount}
                      </span>
                    )}

                    {/* Actions */}
                    <div onClick={(e) => e.preventDefault()}>
                      <DropdownList>
                        <DropdownListTrigger asChild>
                          <IconButton
                            variant="ghost"
                            icon={<DotsThreeVertical className="w-4 h-4" />}
                            aria-label={t('landlord.properties.moreOptions')}
                          />
                        </DropdownListTrigger>
                        <DropdownListContent align="end" className="w-40 rounded-lg">
                          <DropdownListItem asChild className="rounded-md">
                            <Link href={`/panel/${property.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              {t('landlord.properties.viewDetail')}
                            </Link>
                          </DropdownListItem>
                          <DropdownListItem className="rounded-md">
                            <PencilSimple className="w-4 h-4 mr-2" />
                            {t('landlord.properties.edit')}
                          </DropdownListItem>
                        </DropdownListContent>
                      </DropdownList>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        ) : (
          /* Empty State */
          <div className="bg-surface rounded-lg border border-border py-20 text-center">
            <div className="w-16 h-16 rounded-xl bg-surface-muted mx-auto mb-5 flex items-center justify-center">
              <Buildings className="w-8 h-8 text-fg-subtle" />
            </div>
            <h3 className="text-xl font-semibold text-fg mb-2">
              {t('landlord.properties.emptyTitle')}
            </h3>
            <p className="text-fg-muted mb-6 max-w-sm mx-auto">
              {t('landlord.properties.emptyDescription')}
            </p>
            <Button asChild hideArrow>
              <Link href="/publicar?from=panel">
                <Plus className="w-4 h-4" />
                {t('landlord.properties.publishProperty')}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
