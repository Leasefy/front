'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Buildings, Plus, MapPin, Bed, Bathtub, Square, Eye, PencilSimple, DotsThreeVertical, Users, CurrencyDollar, MagnifyingGlass, GridFour, List, House, TrendUp } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { mockProperties } from '@/lib/data/mock-properties';
import { getCandidatesByProperty } from '@/lib/data/mock-candidates';
import { formatCurrency } from '@/lib/data/mock-dashboard';
import { useI18n } from '@/lib/i18n';
import { PlanStatusBadge } from '@/components/ui/plan/PlanStatusBadge';
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu';

type ViewMode = 'grid' | 'list';
type FunnelStatus = 'all' | 'available' | 'rented' | 'pending';

export default function PropiedadesPage() {
  const { t, formatCurrency: i18nFormatCurrency } = useI18n();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFunnelStatus] = useState<FunnelStatus>('all');
  const [searchQuery, setMagnifyingGlassQuery] = useState('');

  // Funnel properties by landlord (simulating logged-in user)
  const landlordId = 'landlord-001';
  const myProperties = mockProperties.filter(p => p.landlordId === landlordId);

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
  const totalMonthlyIncome = myProperties
    .filter(p => p.status === 'rented')
    .reduce((sum, p) => sum + p.monthlyRent + p.adminFee, 0);

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
    <div className="min-h-screen bg-stone-50 dark:bg-[#1a1a1c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">{t('landlord.properties.title')}</h1>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">
              {t('landlord.properties.subtitle')}
            </p>
          </div>
          <Link
            href="/publicar?from=panel"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('landlord.properties.newProperty')}
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                <Buildings className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{totalProperties}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.properties.totalProperties')}</p>
          </div>

          <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <House className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{availableCount}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.properties.available')}</p>
          </div>

          <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{rentedCount}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.properties.rented')}</p>
          </div>

          <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <TrendUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{i18nFormatCurrency(totalMonthlyIncome)}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.properties.monthlyIncome')}</p>
          </div>
        </div>

        {/* Funnels */}
        <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* MagnifyingGlass */}
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setMagnifyingGlassQuery(e.target.value)}
                placeholder={t('landlord.properties.searchPlaceholder')}
                aria-label={t('landlord.properties.searchLabel')}
                className="w-full h-11 pl-10 pr-4 bg-neutral-100 dark:bg-neutral-800 border-0 rounded-xl text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Status Funnel */}
            <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
              {[
                { id: 'all', label: t('landlord.properties.filterAll') },
                { id: 'available', label: t('landlord.properties.filterAvailable') },
                { id: 'rented', label: t('landlord.properties.filterRented') },
                { id: 'pending', label: t('landlord.properties.filterPending') },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setFunnelStatus(filter.id as FunnelStatus)}
                  className={cn(
                    'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                    filterStatus === filter.id
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-2.5 rounded-lg transition-all',
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                )}
                aria-label={t('landlord.properties.gridView')}
              >
                <GridFour className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2.5 rounded-lg transition-all',
                  viewMode === 'list'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                )}
                aria-label={t('landlord.properties.listView')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Properties Grid/List */}
        {filteredProperties.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => {
                const candidates = getCandidatesByProperty(property.id);
                return (
                  <Link
                    key={property.id}
                    href={`/panel/${property.id}`}
                    className="bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden group hover:shadow-xl hover:shadow-neutral-200/50 dark:hover:shadow-neutral-900/50 transition-all duration-300 block"
                  >
                    {/* Image */}
                    <div className="relative h-48 bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
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
                            <button
                              className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-neutral-800/90 hover:bg-white dark:hover:bg-neutral-700 rounded-lg text-neutral-600 dark:text-neutral-300 transition-colors"
                              aria-label={t('landlord.properties.moreOptions')}
                            >
                              <DotsThreeVertical className="w-4 h-4" />
                            </button>
                          </DropdownListTrigger>
                          <DropdownListContent align="end" className="w-40 rounded-xl">
                            <DropdownListItem asChild className="rounded-lg">
                              <Link href={`/panel/${property.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                {t('landlord.properties.viewDetail')}
                              </Link>
                            </DropdownListItem>
                            <DropdownListItem className="rounded-lg">
                              <PencilSimple className="w-4 h-4 mr-2" />
                              {t('landlord.properties.edit')}
                            </DropdownListItem>
                            <DropdownListItem asChild className="rounded-lg">
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
                      <h3 className="font-semibold text-neutral-900 dark:text-white mb-1 line-clamp-1">
                        {property.title}
                      </h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mb-4">
                        <MapPin className="w-3.5 h-3.5" />
                        {property.neighborhood}, {property.city}
                      </p>

                      {/* Features */}
                      <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400 mb-4">
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
                      <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-700">
                        <div>
                          <p className="text-lg font-bold text-neutral-900 dark:text-white">
                            {i18nFormatCurrency(property.monthlyRent)}
                          </p>
                          <p className="text-xs text-neutral-400">/{t('landlord.properties.perMonth')}</p>
                        </div>
                        {candidates.length > 0 && (
                          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-sm font-medium text-indigo-600 dark:text-indigo-400">
                            <Users className="w-3.5 h-3.5" />
                            {candidates.length !== 1 ? t('landlord.properties.candidatesCountPlural', { count: candidates.length }) : t('landlord.properties.candidatesCount', { count: candidates.length })}
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
            <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              {filteredProperties.map((property, index) => {
                const candidates = getCandidatesByProperty(property.id);
                return (
                  <Link
                    key={property.id}
                    href={`/panel/${property.id}`}
                    className={cn(
                      'flex items-center gap-5 p-5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors',
                      index !== filteredProperties.length - 1 && 'border-b border-neutral-100 dark:border-neutral-700'
                    )}
                  >
                    {/* Image */}
                    <div className="relative w-28 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-xl flex-shrink-0 overflow-hidden">
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
                        <h3 className="font-semibold text-neutral-900 dark:text-white truncate">
                          {property.title}
                        </h3>
                        {getStatusBadge(property.status)}
                      </div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mb-2">
                        <MapPin className="w-3.5 h-3.5" />
                        {property.address}, {property.city}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
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
                      <p className="text-lg font-bold text-neutral-900 dark:text-white">
                        {i18nFormatCurrency(property.monthlyRent)}
                      </p>
                      <p className="text-xs text-neutral-400">/{t('landlord.properties.perMonth')}</p>
                    </div>

                    {/* Candidates */}
                    {candidates.length > 0 && (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        <Users className="w-3.5 h-3.5" />
                        {candidates.length}
                      </span>
                    )}

                    {/* Actions */}
                    <div onClick={(e) => e.preventDefault()}>
                      <DropdownList>
                        <DropdownListTrigger asChild>
                          <button className="p-2.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                            <DotsThreeVertical className="w-4 h-4" />
                          </button>
                        </DropdownListTrigger>
                        <DropdownListContent align="end" className="w-40 rounded-xl">
                          <DropdownListItem asChild className="rounded-lg">
                            <Link href={`/panel/${property.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              {t('landlord.properties.viewDetail')}
                            </Link>
                          </DropdownListItem>
                          <DropdownListItem className="rounded-lg">
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
          <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-700 mx-auto mb-5 flex items-center justify-center">
              <Buildings className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
              {t('landlord.properties.emptyTitle')}
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
              {t('landlord.properties.emptyDescription')}
            </p>
            <Link
              href="/publicar?from=panel"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('landlord.properties.publishProperty')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
