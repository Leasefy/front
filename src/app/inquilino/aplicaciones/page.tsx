'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, MapPin, Calendar } from 'lucide-react';

import { getActiveApplications, getCompletedApplications } from '@/lib/data/mock-tenant-applications';
import { mockProperties } from '@/lib/data/mock-properties';
import { PlanTabs, PlanTabPanel } from '@/components/ui/plan/PlanTabs';
import { PlanTable, PlanTableColumn } from '@/components/ui/plan/PlanTable';
import { PlanStatusBadge, getApplicationStatus } from '@/components/ui/plan/PlanStatusBadge';
import { PlanProgressBar } from '@/components/ui/plan/PlanProgressBar';
import { PlanStatsCard, PlanStatsGrid } from '@/components/ui/plan/PlanStatsCard';

interface ApplicationRow {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  trackingCode: string;
  status: string;
  statusLabel: string;
  progress: number;
  updatedAt: string;
}

/**
 * Tenant Applications Page - PLan CRM Style
 */
export default function AplicacionesPage() {
  const [activeTab, setActiveTab] = useState('active');
  const activeApplications = getActiveApplications();
  const completedApplications = getCompletedApplications();

  const getPropertyForApplication = (propertyId: string) => {
    return mockProperties.find(p => p.id === propertyId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const statusLabels: Record<string, string> = {
    submitted: 'Enviada',
    under_review: 'En revision',
    pre_approved: 'Pre-aprobada',
    approved: 'Aprobada',
    rejected: 'Rechazada',
    withdrawn: 'Retirada',
  };

  const progressMap: Record<string, number> = {
    submitted: 25,
    under_review: 50,
    pre_approved: 75,
    approved: 100,
    rejected: 100,
    withdrawn: 100,
  };

  // Transform applications to table rows
  const transformToRow = (app: typeof activeApplications[0]): ApplicationRow => {
    const property = getPropertyForApplication(app.propertyId);
    return {
      id: app.id,
      propertyId: app.propertyId,
      propertyTitle: property?.title || 'Propiedad',
      propertyAddress: property?.address || '',
      trackingCode: app.trackingCode,
      status: app.status,
      statusLabel: statusLabels[app.status] || app.status,
      progress: progressMap[app.status] || 25,
      updatedAt: app.updatedAt,
    };
  };

  const activeRows = activeApplications.map(transformToRow);
  const completedRows = completedApplications.map(transformToRow);

  const columns: PlanTableColumn<ApplicationRow>[] = [
    {
      key: 'propertyTitle',
      header: 'Propiedad',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-plan-secondary" />
          </div>
          <div>
            <p className="font-medium text-plan-primary">{row.propertyTitle}</p>
            <p className="text-xs text-plan-muted flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />
              {row.propertyAddress}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'trackingCode',
      header: 'Codigo',
      render: (row) => (
        <span className="text-sm font-mono text-plan-secondary">{row.trackingCode}</span>
      ),
    },
    {
      key: 'progress',
      header: 'Progreso',
      width: '120px',
      render: (row) => (
        <PlanProgressBar value={row.progress} size="sm" />
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => (
        <PlanStatusBadge
          status={getApplicationStatus(row.status)}
          label={row.statusLabel}
          size="sm"
        />
      ),
    },
    {
      key: 'updatedAt',
      header: 'Actualizado',
      render: (row) => (
        <span className="text-sm text-plan-secondary flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(row.updatedAt)}
        </span>
      ),
    },
  ];

  const tabs = [
    { id: 'active', label: 'En Proceso', count: activeApplications.length },
    { id: 'completed', label: 'Historial', count: completedApplications.length },
  ];

  return (
    <div className="min-h-screen bg-plan-page">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/inquilino" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 lg:hidden">
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-plan-primary">
            Mis aplicaciones
          </h1>
          <p className="mt-1 text-plan-secondary">
            Seguimiento de tus aplicaciones de arriendo
          </p>
        </header>

        {/* Stats */}
        <PlanStatsGrid columns={3} className="mb-8">
          <PlanStatsCard
            label="Total aplicaciones"
            value={activeApplications.length + completedApplications.length}
            icon={FileText}
          />
          <PlanStatsCard
            label="En proceso"
            value={activeApplications.length}
            sublabel="Aplicaciones activas"
            variant="accent"
          />
          <PlanStatsCard
            label="Completadas"
            value={completedApplications.length}
            sublabel="Aprobadas o rechazadas"
          />
        </PlanStatsGrid>

        {/* Tabs */}
        <div className="bg-card  border border-plan-border overflow-hidden">
          <div className="px-5 py-4 border-b border-plan-border">
            <PlanTabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={setActiveTab}
              variant="underline"
            />
          </div>

          {/* Active Applications */}
          <PlanTabPanel value="active" activeTab={activeTab}>
            {activeRows.length > 0 ? (
              <PlanTable
                data={activeRows}
                columns={columns}
                keyExtractor={(row) => row.id}
                onRowClick={(row) => {
                  window.location.href = `/inquilino/aplicaciones/${row.id}`;
                }}
                className="border-0 rounded-none"
                pagination
                pageSize={5}
              />
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-plan-muted" />
                </div>
                <p className="text-plan-secondary mb-2">Sin aplicaciones activas</p>
                <Link href="/propiedades" className="text-sm text-plan-primary font-medium hover:underline">
                  Explorar propiedades
                </Link>
              </div>
            )}
          </PlanTabPanel>

          {/* Completed Applications */}
          <PlanTabPanel value="completed" activeTab={activeTab}>
            {completedRows.length > 0 ? (
              <PlanTable
                data={completedRows}
                columns={columns}
                keyExtractor={(row) => row.id}
                className="border-0 rounded-none opacity-80"
                pagination
                pageSize={5}
              />
            ) : (
              <div className="p-12 text-center">
                <p className="text-plan-secondary">Sin historial de aplicaciones</p>
              </div>
            )}
          </PlanTabPanel>
        </div>

      </div>
    </div>
  );
}
