'use client';

import { Metadata } from 'next';
import { Building2, Sparkles } from 'lucide-react';

import { LANDLORD_PROPERTIES, getLandlordSummary } from '@/lib/data/mock-landlord-data';
import { getRecentActivities } from '@/lib/data/mock-activity';
import { PropertyDashboardCard } from '@/components/landlord/PropertyDashboardCard';
import { DashboardHeader } from '@/components/landlord/DashboardHeader';
import { KPIGrid } from '@/components/landlord/KPIGrid';
import { ActivityFeed } from '@/components/landlord/ActivityFeed';

/**
 * Landlord Dashboard Page
 * Entry point for landlord experience showing properties and candidate stats
 *
 * Layout (redesigned):
 * +-----------------------------------------------------+
 * |  Buenos días, Juan!                                  |
 * |  Revisa el estado de tus propiedades...             |
 * +-----------------------------------------------------+
 * |  +----------+ +----------+ +----------+ +----------+ |
 * |  | 12       | | 5        | | 2        | | 1        | |
 * |  | candidat | | pendient | | pre-aprob| | aprobado | |
 * |  +----------+ +----------+ +----------+ +----------+ |
 * +-----------------------------------------------------+
 * |                                                      |
 * |  +--------------------+  +------------------------+ |
 * |  | Mis Propiedades    |  | Actividad Reciente     | |
 * |  |                    |  |                        | |
 * |  | [Property Grid]    |  | [Activity Feed]        | |
 * |  +--------------------+  +------------------------+ |
 * +-----------------------------------------------------+
 */
export default function PanelPage() {
  const summary = getLandlordSummary();
  const properties = LANDLORD_PROPERTIES;
  const recentActivities = getRecentActivities(5);

  return (
    <div className="min-h-screen">
      {/* Content container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header with greeting */}
        <DashboardHeader />

        {/* KPI Grid */}
        <KPIGrid summary={summary} className="mt-6" />

        {/* Premium Advisor Card */}
        <div className="mt-8 p-5 bg-gradient-to-br from-primary/5 via-primary/10 to-blue-50/80 rounded-sm border border-primary/20">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-white rounded-sm shadow-sm flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-medium text-slate-900 mb-1">
                Tu asesor de confianza con IA
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Cada candidato incluye un analisis detallado con nuestra inteligencia artificial.
                Te explicamos en lenguaje claro por que un candidato es confiable, que considerar,
                y que condiciones sugerimos para tu tranquilidad.
              </p>
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Properties Section - 2 columns */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-medium text-slate-900">
                Mis Propiedades
                <span className="text-slate-400 font-normal ml-2">
                  ({properties.length})
                </span>
              </h2>
            </div>

            {/* Properties Grid */}
            {properties.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {properties.map((property) => (
                  <PropertyDashboardCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-sm border border-slate-100">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No tienes propiedades publicadas
                </h3>
                <p className="text-slate-500 text-sm">
                  Publica tu primera propiedad para comenzar a recibir candidatos
                </p>
              </div>
            )}
          </section>

          {/* Activity Feed - 1 column */}
          <aside className="lg:col-span-1">
            <ActivityFeed activities={recentActivities} />
          </aside>
        </div>

        {/* Help Text */}
        <div className="mt-12 text-center text-sm text-slate-400">
          <p>
            Haz clic en una propiedad para ver los candidatos y sus analisis de riesgo
          </p>
        </div>
      </div>
    </div>
  );
}
