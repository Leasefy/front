'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Building2,
  Plus,
  MapPin,
  Bed,
  Bath,
  Square,
  Eye,
  Edit2,
  MoreVertical,
  Users,
  TrendingUp,
  DollarSign,
  Search,
  Filter,
  Grid,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockProperties } from '@/lib/data/mock-properties';
import { getCandidatesByProperty } from '@/lib/data/mock-candidates';
import { formatCurrency } from '@/lib/data/mock-dashboard';
import { PlanStatsCard, PlanStatsGrid } from '@/components/ui/plan/PlanStatsCard';
import { PlanStatusBadge } from '@/components/ui/plan/PlanStatusBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'available' | 'rented' | 'pending';

export default function PropiedadesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter properties by landlord (simulating logged-in user)
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
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">Mis Propiedades</h1>
            <p className="mt-1 text-[#6B7280]">
              Gestiona tus propiedades publicadas
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#111827] text-white text-sm font-medium hover:bg-[#1F2937] transition-colors">
            <Plus className="w-4 h-4" />
            Nueva Propiedad
          </button>
        </div>

        {/* Stats */}
        <PlanStatsGrid columns={4} className="mb-8">
          <PlanStatsCard
            label="Total propiedades"
            value={totalProperties}
            icon={Building2}
          />
          <PlanStatsCard
            label="Disponibles"
            value={availableCount}
            sublabel="Buscando inquilino"
            icon={Eye}
          />
          <PlanStatsCard
            label="Arrendadas"
            value={rentedCount}
            sublabel="Con contrato activo"
            icon={Users}
          />
          <PlanStatsCard
            label="Ingreso mensual"
            value={formatCurrency(totalMonthlyIncome)}
            sublabel="De propiedades arrendadas"
            icon={DollarSign}
            variant="accent"
          />
        </PlanStatsGrid>

        {/* Filters */}
        <div className="bg-white border border-[#E5E7EB] p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar propiedad..."
                className="w-full h-10 pl-10 pr-4 bg-[#F9FAFB] border border-[#E5E7EB] text-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#111827]"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'available', label: 'Disponibles' },
                { id: 'rented', label: 'Arrendadas' },
                { id: 'pending', label: 'Pendientes' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setFilterStatus(filter.id as FilterStatus)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium transition-colors',
                    filterStatus === filter.id
                      ? 'bg-[#111827] text-white'
                      : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* View Toggle */}
            <div className="flex items-center border border-[#E5E7EB]">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-2 transition-colors',
                  viewMode === 'grid' ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]'
                )}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2 transition-colors',
                  viewMode === 'list' ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]'
                )}
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
                    className="bg-white border border-[#E5E7EB] overflow-hidden group hover:shadow-lg transition-shadow block"
                  >
                    {/* Image */}
                    <div className="relative h-48 bg-[#F3F4F6]">
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="absolute top-3 right-3 p-1.5 bg-white/90 hover:bg-white text-[#6B7280] transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem asChild>
                              <Link href={`/panel/${property.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                Ver detalle
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/panel/${property.id}`}>
                                <Users className="w-4 h-4 mr-2" />
                                Ver candidatos
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-medium text-[#111827] mb-1 line-clamp-1">
                        {property.title}
                      </h3>
                      <p className="text-sm text-[#6B7280] flex items-center gap-1 mb-3">
                        <MapPin className="w-3.5 h-3.5" />
                        {property.neighborhood}, {property.city}
                      </p>

                      {/* Features */}
                      <div className="flex items-center gap-4 text-sm text-[#6B7280] mb-4">
                        <span className="flex items-center gap-1">
                          <Bed className="w-4 h-4" />
                          {property.bedrooms}
                        </span>
                        <span className="flex items-center gap-1">
                          <Bath className="w-4 h-4" />
                          {property.bathrooms}
                        </span>
                        <span className="flex items-center gap-1">
                          <Square className="w-4 h-4" />
                          {property.area}m²
                        </span>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB]">
                        <div>
                          <p className="text-lg font-semibold text-[#111827]">
                            {formatCurrency(property.monthlyRent)}
                          </p>
                          <p className="text-xs text-[#9CA3AF]">/mes</p>
                        </div>
                        {candidates.length > 0 && (
                          <span className="flex items-center gap-1 text-sm text-[#111827]">
                            <Users className="w-4 h-4" />
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
            <div className="bg-white border border-[#E5E7EB]">
              {filteredProperties.map((property, index) => {
                const candidates = getCandidatesByProperty(property.id);
                return (
                  <Link
                    key={property.id}
                    href={`/panel/${property.id}`}
                    className={cn(
                      'flex items-center gap-4 p-4 hover:bg-[#F9FAFB] transition-colors',
                      index !== filteredProperties.length - 1 && 'border-b border-[#E5E7EB]'
                    )}
                  >
                    {/* Image */}
                    <div className="relative w-24 h-24 bg-[#F3F4F6] flex-shrink-0">
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
                        <h3 className="font-medium text-[#111827] truncate">
                          {property.title}
                        </h3>
                        {getStatusBadge(property.status)}
                      </div>
                      <p className="text-sm text-[#6B7280] flex items-center gap-1 mb-2">
                        <MapPin className="w-3.5 h-3.5" />
                        {property.address}, {property.city}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-[#6B7280]">
                        <span className="flex items-center gap-1">
                          <Bed className="w-4 h-4" />
                          {property.bedrooms} hab
                        </span>
                        <span className="flex items-center gap-1">
                          <Bath className="w-4 h-4" />
                          {property.bathrooms} baños
                        </span>
                        <span className="flex items-center gap-1">
                          <Square className="w-4 h-4" />
                          {property.area}m²
                        </span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="text-lg font-semibold text-[#111827]">
                        {formatCurrency(property.monthlyRent)}
                      </p>
                      <p className="text-xs text-[#9CA3AF]">/mes</p>
                    </div>

                    {/* Candidates */}
                    {candidates.length > 0 && (
                      <span className="flex items-center gap-1 px-3 py-1.5 bg-[#F3F4F6] text-sm text-[#111827]">
                        <Users className="w-4 h-4" />
                        {candidates.length}
                      </span>
                    )}

                    {/* Actions */}
                    <div onClick={(e) => e.preventDefault()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem asChild>
                            <Link href={`/panel/${property.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver detalle
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        ) : (
          <div className="bg-white border border-[#E5E7EB] py-16 text-center">
            <Building2 className="w-12 h-12 text-[#D1D5DB] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#111827] mb-2">
              No tienes propiedades
            </h3>
            <p className="text-[#6B7280] mb-4">
              Publica tu primera propiedad para empezar a recibir candidatos
            </p>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#111827] text-white text-sm font-medium hover:bg-[#1F2937] transition-colors">
              <Plus className="w-4 h-4" />
              Publicar propiedad
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
