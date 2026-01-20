'use client';

import { useState } from 'react';
import { FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';
import { ApplicationCard } from '@/components/tenant/ApplicationCard';
import { ApplicationDetail } from '@/components/tenant/ApplicationDetail';
import { useTenantApplications } from '@/lib/context/TenantApplicationContext';
import { mockProperties } from '@/lib/data/mock-properties';
import type { TenantApplication } from '@/lib/types/tenant-application';
import type { Property } from '@/lib/types/property';

// ============================================================================
// Summary Card Component
// ============================================================================

interface SummaryCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}

function SummaryCard({ icon: Icon, label, value, color }: SummaryCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-sm ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
          <p className="text-sm text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function MisAplicacionesPage() {
  const { applications, summary, withdrawApplication, isHydrated } = useTenantApplications();
  const [selectedApplication, setSelectedApplication] = useState<TenantApplication | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Handle card click - open detail drawer
  const handleCardClick = (application: TenantApplication) => {
    const property = mockProperties.find((p) => p.id === application.propertyId);
    setSelectedApplication(application);
    setSelectedProperty(property || null);
  };

  // Handle drawer close
  const handleCloseDetail = () => {
    setSelectedApplication(null);
    setSelectedProperty(null);
  };

  // Handle withdraw
  const handleWithdraw = (id: string) => {
    withdrawApplication(id);
  };

  // Sort applications: active first (by updated), then completed (by updated)
  const sortedApplications = [...applications].sort((a, b) => {
    const aIsActive = ['submitted', 'under_review', 'pre_approved'].includes(a.status);
    const bIsActive = ['submitted', 'under_review', 'pre_approved'].includes(b.status);

    // Active applications first
    if (aIsActive && !bIsActive) return -1;
    if (!aIsActive && bIsActive) return 1;

    // Within same group, sort by updatedAt (newest first)
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // Show loading skeleton during hydration
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header skeleton */}
          <div className="h-8 w-48 bg-slate-200 rounded-sm animate-pulse mb-2" />
          <div className="h-5 w-64 bg-slate-200 rounded-sm animate-pulse mb-8" />

          {/* Summary cards skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-slate-200 rounded-sm animate-pulse" />
            ))}
          </div>

          {/* Application cards skeleton */}
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-sm animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Mis Aplicaciones
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sigue el estado de tus aplicaciones de arrendamiento
          </p>
        </div>

        {applications.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No tienes aplicaciones aun"
            description="Explora propiedades y envia tu primera aplicacion."
            action={{ label: 'Explorar propiedades', href: '/propiedades' }}
          />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <SummaryCard
                icon={FileText}
                label="Total"
                value={summary.total}
                color="bg-slate-100 text-slate-600"
              />
              <SummaryCard
                icon={Clock}
                label="Pendientes"
                value={summary.pending}
                color="bg-blue-100 text-blue-600"
              />
              <SummaryCard
                icon={CheckCircle2}
                label="Aprobadas"
                value={summary.approved}
                color="bg-emerald-100 text-emerald-600"
              />
              <SummaryCard
                icon={XCircle}
                label="Rechazadas"
                value={summary.rejected}
                color="bg-red-100 text-red-600"
              />
            </div>

            {/* Application List */}
            <div className="space-y-3">
              {sortedApplications.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  onClick={() => handleCardClick(application)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Application Detail Drawer */}
      <ApplicationDetail
        application={selectedApplication}
        property={selectedProperty}
        open={!!selectedApplication}
        onClose={handleCloseDetail}
        onWithdraw={handleWithdraw}
      />
    </div>
  );
}
