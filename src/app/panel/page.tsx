'use client';

import { Building2 } from 'lucide-react';

import { LANDLORD_PROPERTIES } from '@/lib/data/mock-landlord-data';
import { getRecentActivities } from '@/lib/data/mock-activity';
import { getDashboardData } from '@/lib/data/mock-dashboard';
import { PropertyDashboardCard } from '@/components/landlord/PropertyDashboardCard';
import { DashboardHeader } from '@/components/landlord/DashboardHeader';
import { FinancialHeroSection } from '@/components/landlord/FinancialHeroSection';
import { UrgentActionsBanner } from '@/components/landlord/UrgentActionsBanner';
import { ActivityFeed } from '@/components/landlord/ActivityFeed';
import { UpcomingEventsCard } from '@/components/landlord/UpcomingEventsCard';
import { SectionLabel } from '@/components/ui/section-label';

/**
 * Landlord Dashboard Page - Luxterra Style
 * Clean, minimal, elegant design with white background
 */
export default function PanelPage() {
  const properties = LANDLORD_PROPERTIES;
  const recentActivities = getRecentActivities(5);
  const dashboardData = getDashboardData();

  return (
    <div className="min-h-screen bg-white">
      {/* Content container - matches Luxterra max-width */}
      <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-8 md:py-12">
        {/* Header with greeting */}
        <DashboardHeader
          propertyCount={properties.length}
          monthlyIncome={dashboardData.financial.monthlyIncome}
        />

        {/* Subtle notifications - not colorful badges */}
        {dashboardData.urgentActions.length > 0 && (
          <UrgentActionsBanner
            actions={dashboardData.urgentActions}
            className="mt-2"
          />
        )}

        {/* Financial Hero Section - Luxterra style black box */}
        <FinancialHeroSection
          stats={dashboardData.financial}
          className="mt-10"
        />

        {/* Properties Section */}
        <section className="mt-16">
          <div className="mb-8">
            <SectionLabel className="text-slate-400 mb-3">
              Propiedades
            </SectionLabel>
            <h2 className="text-[1.75rem] md:text-[2rem] font-light text-slate-900 tracking-[-0.02em]">
              Mis Propiedades
            </h2>
          </div>

          {/* Properties Grid - 3 columns on large screens */}
          {properties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <PropertyDashboardCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border border-slate-100 rounded-[2px]">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-light text-slate-900 mb-2">
                No tienes propiedades publicadas
              </h3>
              <p className="text-slate-500 text-sm">
                Publica tu primera propiedad para comenzar
              </p>
            </div>
          )}
        </section>

        {/* Activity & Events Grid */}
        <section className="mt-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <SectionLabel className="text-slate-400 mb-3">
                Actividad
              </SectionLabel>
              <h3 className="text-xl font-light text-slate-900 tracking-[-0.02em] mb-6">
                Actividad Reciente
              </h3>
              <ActivityFeed activities={recentActivities} showViewAll={false} />
            </div>
            <div>
              <SectionLabel className="text-slate-400 mb-3">
                Calendario
              </SectionLabel>
              <h3 className="text-xl font-light text-slate-900 tracking-[-0.02em] mb-6">
                Proximos Eventos
              </h3>
              <UpcomingEventsCard events={dashboardData.upcomingEvents} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
