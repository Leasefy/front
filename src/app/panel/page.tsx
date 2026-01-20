import { Metadata } from 'next';
import { Building2, Sparkles } from 'lucide-react';

import { LANDLORD_PROPERTIES, getLandlordSummary } from '@/lib/data/mock-landlord-data';
import { PropertyDashboardCard } from '@/components/landlord/PropertyDashboardCard';
import { DashboardSummary } from '@/components/landlord/DashboardSummary';

export const metadata: Metadata = {
  title: 'Mi Panel | Arrienda Seguro',
  description: 'Administra tus propiedades y revisa candidatos con IA',
};

/**
 * Landlord Dashboard Page
 * Entry point for landlord experience showing properties and candidate stats
 *
 * Layout:
 * +-----------------------------------------------------+
 * |  Mi Panel                                            |
 * |                                                      |
 * |  +------------------------------------------------+ |
 * |  | 12 candidatos | 5 pendientes | 2 pre-aprobados | |
 * |  +------------------------------------------------+ |
 * |                                                      |
 * |  +-------------+ Premium Advisor Card +------------+ |
 * |  |                                                 | |
 * |  +------------------------------------------------+ |
 * |                                                      |
 * |  Mis Propiedades (3)                                |
 * |                                                      |
 * |  +----------+ +----------+ +----------+             |
 * |  | Prop 1   | | Prop 2   | | Prop 3   |             |
 * |  | 5 cand   | | 4 cand   | | 3 cand   |             |
 * |  +----------+ +----------+ +----------+             |
 * +-----------------------------------------------------+
 */
export default function PanelPage() {
  const summary = getLandlordSummary();
  const properties = LANDLORD_PROPERTIES;

  return (
    <main className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Mi Panel
            </h1>
          </div>
          <p className="text-slate-500">
            Administra tus propiedades y revisa candidatos
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Summary Stats */}
        <DashboardSummary summary={summary} />

        {/* Premium Advisor Card */}
        <div className="mt-8 p-6 bg-gradient-to-br from-primary/5 via-primary/10 to-blue-50 rounded-sm border border-primary/20">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-white rounded-sm shadow-sm">
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

        {/* Properties Section */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-slate-900">
              Mis Propiedades
              <span className="text-slate-400 font-normal ml-2">
                ({properties.length})
              </span>
            </h2>
          </div>

          {/* Properties Grid */}
          {properties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

        {/* Help Text */}
        <div className="mt-12 text-center text-sm text-slate-400">
          <p>
            Haz clic en una propiedad para ver los candidatos y sus analisis de riesgo
          </p>
        </div>
      </div>
    </main>
  );
}
