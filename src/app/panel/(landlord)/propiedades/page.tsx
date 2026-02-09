'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Buildings, Plus, MapPin, Bed, Bathtub, Square, Eye, PencilSimple, DotsThreeVertical, Users, CurrencyDollar, MagnifyingGlass, GridFour, List, House, TrendUp } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { mockProperties } from '@/lib/data/mock-properties';
import { getCandidatesByProperty } from '@/lib/data/mock-candidates';
import { formatCurrency } from '@/lib/data/mock-dashboard';
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
        return <PlanStatusBadge status="in_progress" label="Disponible" size="sm" />;
      case 'rented':
        return <PlanStatusBadge status="accepted" label="Arrendada" size="sm" />;
      case 'pending':
        return <PlanStatusBadge status="new" label="Pendiente" size="sm" />;
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
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Mis Propiedades</h1>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">
              Gestiona tus propiedades publicadas
            </p>
          </div>
          <Link
            href="/publicar?from=panel"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Propiedad
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                <Buildings className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{totalProperties}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Total propiedades</p>
          </div>

          <div className="bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <House className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{availableCount}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Disponibles</p>
          </div>

          <div className="bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{rentedCount}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Arrendadas</p>
          </div>

          <div className="bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <TrendUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{formatCurrency(totalMonthlyIncome)}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Ingreso mensual</p>
          </div>
        </div>

        {/* Funnels */}
        <div className="bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* MagnifyingGlass */}
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setMagnifyingGlassQuery(e.target.value)}
                placeholder="Buscar propiedad..."
                aria-label="Buscar propiedad"
                className="w-full h-11 pl-10 pr-4 bg-neutral-100 dark:bg-neutral-800 border-0 rounded-xl text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Status Funnel */}
            <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'available', label: 'Disponibles' },
                { id: 'rented', label: 'Arrendadas' },
                { id: 'pending', label: 'Pendientes' },
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
                aria-label="Vista cuadrícula"
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
                aria-label="Vista lista"
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
                              aria-label="Más opciones"
                            >
                              <DotsThreeVertical className="w-4 h-4" />
                            </button>
                          </DropdownListTrigger>
                          <DropdownListContent align="end" className="w-40 rounded-xl">
                            <DropdownListItem asChild className="rounded-lg">
                              <Link href={`/panel/${property.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                Ver detalle
                              </Link>
                            </DropdownListItem>
                            <DropdownListItem className="rounded-lg">
                              <PencilSimple className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownListItem>
                            <DropdownListItem asChild className="rounded-lg">
                              <Link href={`/panel/${property.id}`}>
                                <Users className="w-4 h-4 mr-2" />
                                Ver candidatos
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
                            {formatCurrency(property.monthlyRent)}
                          </p>
                          <p className="text-xs text-neutral-400">/mes</p>
                        </div>
                        {candidates.length > 0 && (
                          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-sm font-medium text-indigo-600 dark:text-indigo-400">
                            <Users className="w-3.5 h-3.5" />
                            {candidates.length} candidato{candidates.length !== 1 ? 's' : ''}
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
            <div className="bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
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
                          {property.bedrooms} hab
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Bathtub className="w-4 h-4" />
                          {property.bathrooms} baños
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
                        {formatCurrency(property.monthlyRent)}
                      </p>
                      <p className="text-xs text-neutral-400">/mes</p>
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
                              Ver detalle
                            </Link>
                          </DropdownListItem>
                          <DropdownListItem className="rounded-lg">
                            <PencilSimple className="w-4 h-4 mr-2" />
                            Editar
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
          <div className="bg-white dark:bg-[#222224] rounded-3xl border border-neutral-200 dark:border-neutral-700 py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-700 mx-auto mb-5 flex items-center justify-center">
              <Buildings className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
              No tienes propiedades
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
              Publica tu primera propiedad para empezar a recibir candidatos calificados
            </p>
            <Link
              href="/publicar?from=panel"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Publicar propiedad
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
