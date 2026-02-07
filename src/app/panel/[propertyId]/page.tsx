'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Users, Clock, CheckCircle, XCircle, WarningCircle, Eye, FileText, PaperPlaneTilt, Warning, Info, TrendUp, CalendarBlank, Buildings, Chat, X, Download, Shield, CalendarCheck } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { getLandlordProperty, getCandidatesForProperty } from '@/lib/data/mock-landlord-data';
import { getCandidateById } from '@/lib/data/mock-candidates';
import { getVisitsForProperty } from '@/lib/data/mock-visits';
import { getContractsForProperty } from '@/lib/data/mock-contracts';
import { CONTRACT_TYPE_LABELS } from '@/lib/types/contract';
import { VISIT_STATUS_LABELS } from '@/lib/types/visit';
import type { Visit, VisitStatus } from '@/lib/types/visit';
import { formatCurrency } from '@/lib/data/mock-dashboard';
import { PlanStatsCard, PlanStatsGrid } from '@/components/ui/plan/PlanStatsCard';
import { PlanTable, PlanTableColumn } from '@/components/ui/plan/PlanTable';
import { PlanTabs, PlanTab } from '@/components/ui/plan/PlanTabs';
import { PlanDetailSheet, QuickAction, DetailSection, SecondaryPanel } from '@/components/ui/plan/PlanDetailSheet';
import { PlanRiskBadge, PlanStatusBadge, PlanStatusType } from '@/components/ui/plan/PlanStatusBadge';

const VISIT_STATUS_TO_PLAN: Record<VisitStatus, PlanStatusType> = {
  requested: 'new',
  confirmed: 'in_progress',
  completed: 'completed',
  cancelled: 'rejected',
  no_show: 'important',
};
import { PlanProgressBar } from '@/components/ui/plan/PlanProgressBar';
import type { LandlordCandidate, LandlordCandidateStatus } from '@/lib/types/landlord';
import type { Candidate } from '@/lib/types/candidate';
import { RISK_LEVELS } from '@/lib/types/risk-score';
import { AvailabilityScheduleEditor } from '@/components/panel/AvailabilityScheduleEditor';
import { DEFAULT_AVAILABILITY_SCHEDULE, type AvailabilitySchedule } from '@/lib/types/property';

// ============================================================================
// TextTs
// ============================================================================

interface PropertyCandidatesPageProps {
  params: {
    propertyId: string;
  };
}

interface CandidateRow extends LandlordCandidate {
  // Additional display properties
  name: string;  // alias for fullName
  score: number; // alias for numericScore
}

// ============================================================================
// Component
// ============================================================================

export default function PropertyCandidatesPage({ params }: PropertyCandidatesPageProps) {
  const { propertyId } = params;
  const router = useRouter();

  // Get property and candidates data
  const property = getLandlordProperty(propertyId);
  const initialCandidates = getCandidatesForProperty(propertyId);
  const propertyVisits = getVisitsForProperty(propertyId);

  // Check for active contract on this property
  const propertyContracts = getContractsForProperty(propertyId);
  const activeContract = propertyContracts.find(c => c.status === 'active');

  // State for tabs
  const [activeTab, setActiveTab] = useState('all');

  // State for candidate list
  const [candidates, setCandidates] = useState(initialCandidates);

  // State for detail drawer
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // State for secondary panel view
  const [secondaryView, setSecondaryView] = useState<'profile' | 'documents' | null>(null);

  // State for document preview modal
  const [previewDoc, setPreviewDoc] = useState<{ name: string; subtitle: string; verified: boolean } | null>(null);

  // State for availability schedule
  const [availabilitySchedule, setAvailabilitySchedule] = useState<AvailabilitySchedule>(
    property?.availabilitySchedule || DEFAULT_AVAILABILITY_SCHEDULE
  );

  // Handle save availability schedule
  const handleSaveSchedule = useCallback((schedule: AvailabilitySchedule) => {
    setAvailabilitySchedule(schedule);
    // In a real app, this would make an API call to persist the schedule
    // For now, we just update local state
  }, []);

  // Funnel candidates by tab
  const filteredCandidates = useMemo(() => {
    if (activeTab === 'all') return candidates;
    if (activeTab === 'pending') return candidates.filter(c => c.status === 'pending');
    if (activeTab === 'pre-approved') return candidates.filter(c => c.status === 'pre-approved');
    if (activeTab === 'approved') return candidates.filter(c => c.status === 'approved');
    if (activeTab === 'rejected') return candidates.filter(c => c.status === 'rejected');
    return candidates;
  }, [candidates, activeTab]);

  // Calculate counts
  const counts = useMemo(() => ({
    all: candidates.length,
    pending: candidates.filter(c => c.status === 'pending').length,
    preApproved: candidates.filter(c => c.status === 'pre-approved').length,
    approved: candidates.filter(c => c.status === 'approved').length,
    rejected: candidates.filter(c => c.status === 'rejected').length,
  }), [candidates]);

  // Tabs configuration
  const tabs: PlanTab[] = [
    { id: 'all', label: 'Todos', count: counts.all },
    { id: 'pending', label: 'Pendientes', count: counts.pending },
    { id: 'pre-approved', label: 'Pre-aprobados', count: counts.preApproved },
    { id: 'approved', label: 'Aprobados', count: counts.approved },
    { id: 'rejected', label: 'Rechazados', count: counts.rejected },
    { id: 'visits', label: 'Visitas', count: propertyVisits.length },
    { id: 'schedule', label: 'Horarios' },
  ];

  // Transform candidates for table
  const tableData: CandidateRow[] = filteredCandidates.map(c => ({
    ...c,
    name: c.fullName,
    score: c.numericScore,
  }));

  // Map status to PLan status type
  const getStatusType = (status: LandlordCandidateStatus): PlanStatusType => {
    const map: Record<LandlordCandidateStatus, PlanStatusType> = {
      'pending': 'new',
      'pre-approved': 'in_progress',
      'approved': 'accepted',
      'rejected': 'rejected',
      'more-info': 'pending',
    };
    return map[status];
  };

  // Map status to label
  const getStatusLabel = (status: LandlordCandidateStatus): string => {
    const map: Record<LandlordCandidateStatus, string> = {
      'pending': 'Pendiente',
      'pre-approved': 'Pre-aprobado',
      'approved': 'Aprobado',
      'rejected': 'Rechazado',
      'more-info': 'Requiere info',
    };
    return map[status];
  };

  // Table columns
  const columns: PlanTableColumn<CandidateRow>[] = [
    {
      key: 'name',
      header: 'Candidato',
      sortable: true,
      type: 'avatar',
      nameKey: 'name',
      subtitleKey: 'occupation',
    },
    {
      key: 'age',
      header: 'Edad',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-plan-secondary">{row.age} años</span>
      ),
    },
    {
      key: 'riskLevel',
      header: 'Riesgo',
      sortable: true,
      render: (row) => (
        <PlanRiskBadge level={row.riskLevel} />
      ),
    },
    {
      key: 'score',
      header: 'Score',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-16">
            <PlanProgressBar
              value={row.score}
              size="sm"
              variant={row.score >= 70 ? 'success' : row.score >= 50 ? 'warning' : 'danger'}
            />
          </div>
          <span className="text-xs text-plan-secondary">{row.score}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      render: (row) => (
        <PlanStatusBadge
          status={getStatusType(row.status)}
          label={getStatusLabel(row.status)}
          size="sm"
        />
      ),
    },
    {
      key: 'appliedAt',
      header: 'Aplicacion',
      sortable: true,
      type: 'date',
    },
  ];

  // Handle view details - open drawer with full candidate data
  const handleRowClick = useCallback((row: CandidateRow) => {
    const fullCandidate = getCandidateById(row.id);
    if (fullCandidate) {
      setSelectedCandidate(fullCandidate);
      setIsDetailOpen(true);
      setSecondaryView(null);
    }
  }, []);

  // Handle close detail drawer
  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
    setSecondaryView(null);
    setTimeout(() => setSelectedCandidate(null), 300);
  }, []);

  // Handle decision - update candidate status and take appropriate action
  const handleDecision = useCallback(
    (candidateId: string, newStatus: LandlordCandidateStatus) => {
      const candidate = candidates.find(c => c.id === candidateId);

      // Update local state
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidateId
            ? { ...c, status: newStatus, statusChangedAt: new Date().toISOString() }
            : c
        )
      );

      // Handle each status differently
      if (newStatus === 'approved') {
        // Navigate to contract flow
        handleCloseDetail();
        toast.success('Candidato aprobado', {
          description: `Iniciando proceso de contrato con ${candidate?.fullName}`,
        });
        // Navigate to contract page - use ?new=true to always start fresh
        router.push(`/panel/${propertyId}/contract/${candidateId}?new=true`);
      } else if (newStatus === 'pre-approved') {
        // Pre-approval - keep in list but show next steps
        handleCloseDetail();
        toast.success('Candidato pre-aprobado', {
          description: `${candidate?.fullName} ha sido pre-aprobado. Puedes continuar revisando otros candidatos o aprobar definitivamente.`,
          duration: 5000,
        });
      } else if (newStatus === 'rejected') {
        // Rejection
        handleCloseDetail();
        toast('Candidato rechazado', {
          description: `${candidate?.fullName} ha sido rechazado y notificado.`,
          icon: '❌',
        });
      } else {
        handleCloseDetail();
        toast.info('Estado actualizado', {
          description: `El estado de ${candidate?.fullName} ha sido actualizado.`,
        });
      }
    },
    [handleCloseDetail, candidates, router, propertyId]
  );

  // Quick actions for detail sheet
  const quickActions: QuickAction[] = selectedCandidate ? [
    {
      id: 'view-profile',
      label: secondaryView === 'profile' ? 'Ocultar perfil' : 'Ver perfil completo',
      icon: <Eye className="w-4 h-4" />,
      onClick: () => setSecondaryView(prev => prev === 'profile' ? null : 'profile'),
      variant: secondaryView === 'profile' ? 'primary' : 'default',
    },
    {
      id: 'view-docs',
      label: secondaryView === 'documents' ? 'Ocultar documentos' : 'Ver documentos',
      icon: <FileText className="w-4 h-4" />,
      onClick: () => setSecondaryView(prev => prev === 'documents' ? null : 'documents'),
      variant: secondaryView === 'documents' ? 'primary' : 'default',
    },
    {
      id: 'send-message',
      label: 'Enviar mensaje',
      icon: <PaperPlaneTilt className="w-4 h-4" />,
      onClick: () => {
        handleCloseDetail();
        router.push(`/panel/mensajes?to=${selectedCandidate.id}`);
      },
    },
  ] : [];

  // Detail sections for detail sheet
  const detailSections: DetailSection[] = selectedCandidate ? [
    {
      id: 'personal-info',
      title: 'Informacion Personal',
      content: (
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-plan-secondary">Ocupacion</span>
            <span className="text-plan-primary">{selectedCandidate.occupation}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-plan-secondary">Edad</span>
            <span className="text-plan-primary">{selectedCandidate.age} años</span>
          </div>
          {selectedCandidate.maritalStatus && (
            <div className="flex justify-between">
              <span className="text-plan-secondary">Estado civil</span>
              <span className="text-plan-primary">{selectedCandidate.maritalStatus}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'risk-evaluation',
      title: 'Evaluacion de Riesgo',
      content: (
        <div className="space-y-5">
          {/* Score Summary */}
          <div className="bg-muted p-4 rounded-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <PlanRiskBadge level={selectedCandidate.riskLevel} />
                <div>
                  <p className="text-sm font-medium text-plan-primary">
                    {RISK_LEVELS[selectedCandidate.riskLevel].label}
                  </p>
                  <p className="text-xs text-plan-secondary">
                    {RISK_LEVELS[selectedCandidate.riskLevel].description}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-plan-primary">{selectedCandidate.numericScore}</p>
                <p className="text-xs text-plan-secondary">de 100</p>
              </div>
            </div>
            <PlanProgressBar
              value={selectedCandidate.numericScore}
              size="md"
              variant={selectedCandidate.numericScore >= 85 ? 'success' : selectedCandidate.numericScore >= 70 ? 'default' : selectedCandidate.numericScore >= 50 ? 'warning' : 'danger'}
            />
          </div>

          {/* Category Breakdown */}
          {selectedCandidate.riskScore?.categories && (
            <div>
              <p className="text-xs font-normal text-plan-secondary font-mono uppercase mb-3">Desglose por categoría</p>
              <div className="space-y-3">
                {selectedCandidate.riskScore.categories.map((cat) => (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground">{cat.label}</span>
                      <span className="text-sm font-medium text-plan-primary">{cat.score}%</span>
                    </div>
                    <PlanProgressBar
                      value={cat.score}
                      size="sm"
                      variant={cat.score >= 80 ? 'success' : cat.score >= 60 ? 'default' : 'warning'}
                    />
                    <p className="text-xs text-plan-muted mt-1">
                      {cat.factors.join(' · ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Drivers (Positive Factors) */}
          {selectedCandidate.riskScore?.drivers && selectedCandidate.riskScore.drivers.length > 0 && (
            <div>
              <p className="text-xs font-normal text-plan-secondary font-mono uppercase mb-2 flex items-center gap-1">
                <TrendUp className="w-3 h-3" />
                Factores positivos
              </p>
              <ul className="space-y-1.5">
                {selectedCandidate.riskScore.drivers.slice(0, 4).map((driver, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {driver}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk Flags (if any) */}
          {selectedCandidate.riskScore?.flags && selectedCandidate.riskScore.flags.length > 0 && (
            <div>
              <p className="text-xs font-normal text-plan-secondary font-mono uppercase mb-2 flex items-center gap-1">
                <Warning className="w-3 h-3" />
                Puntos a considerar
              </p>
              <ul className="space-y-2">
                {selectedCandidate.riskScore.flags.map((flag) => (
                  <li key={flag.id} className={`flex items-start gap-2 text-sm p-2 rounded ${
                    flag.severity === 'high' ? 'bg-red-50 text-red-700' :
                    flag.severity === 'medium' ? 'bg-amber-50 text-amber-700' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    <WarningCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p>{flag.message}</p>
                      {flag.suggestion && (
                        <p className="text-xs mt-1 opacity-75">{flag.suggestion}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Conditions */}
          {selectedCandidate.riskScore?.suggestedConditions && selectedCandidate.riskScore.suggestedConditions.length > 0 && (
            <div>
              <p className="text-xs font-normal text-plan-secondary font-mono uppercase mb-2 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Recomendaciones
              </p>
              <ul className="space-y-2">
                {selectedCandidate.riskScore.suggestedConditions.map((cond) => (
                  <li key={cond.id} className="text-sm bg-muted p-2 rounded">
                    <p className="font-medium text-plan-primary">{cond.condition}</p>
                    <p className="text-xs text-plan-secondary mt-0.5">{cond.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      title: 'Acciones',
      content: (
        <div className="space-y-2">
          <button
            onClick={() => handleDecision(selectedCandidate.id, 'pre-approved')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-plan-status-blue-bg text-blue-700 rounded-sm text-sm font-medium hover:bg-blue-200 transition-colors"
          >
            <Clock className="w-4 h-4" />
            Pre-aprobar
          </button>
          <button
            onClick={() => handleDecision(selectedCandidate.id, 'approved')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-plan-status-green-bg text-green-800 rounded-sm text-sm font-medium hover:bg-green-200 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Aprobar
          </button>
          <button
            onClick={() => handleDecision(selectedCandidate.id, 'rejected')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-plan-status-red-bg text-red-800 rounded-sm text-sm font-medium hover:bg-red-200 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Rechazar
          </button>
        </div>
      ),
    },
  ] : [];

  // Build secondary panel
  const secondaryPanelConfig: SecondaryPanel | undefined = selectedCandidate && secondaryView ? {
    open: true,
    title: secondaryView === 'profile' ? 'Perfil Completo' : 'Documentos del Candidato',
    onClose: () => setSecondaryView(null),
    content: secondaryView === 'profile' ? (
      <div className="space-y-4">
        {/* Employment */}
        <div>
          <p className="text-xs font-normal text-plan-secondary font-mono uppercase mb-2">Información Laboral</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-plan-secondary">Empresa</span>
              <span className="text-plan-primary">{selectedCandidate.companyName || 'No especificada'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-plan-secondary">Cargo</span>
              <span className="text-plan-primary">{selectedCandidate.position || selectedCandidate.occupation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-plan-secondary">Tipo de contrato</span>
              <span className="text-plan-primary">{selectedCandidate.contractType === 'indefinite' ? 'Indefinido' : selectedCandidate.contractType || 'No especificado'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-plan-secondary">Antigüedad</span>
              <span className="text-plan-primary">{selectedCandidate.timeAtJob ? `${Math.floor(selectedCandidate.timeAtJob / 12)} años ${selectedCandidate.timeAtJob % 12} meses` : 'No especificada'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-plan-secondary">Industria</span>
              <span className="text-plan-primary">{selectedCandidate.industry || 'No especificada'}</span>
            </div>
          </div>
        </div>
        {/* Income */}
        <div>
          <p className="text-xs font-normal text-plan-secondary font-mono uppercase mb-2">Información Financiera</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-plan-secondary">Salario mensual</span>
              <span className="text-plan-primary font-medium">${selectedCandidate.monthlySalary?.toLocaleString('es-CO')}</span>
            </div>
            {selectedCandidate.additionalIncome > 0 && (
              <div className="flex justify-between">
                <span className="text-plan-secondary">Ingresos adicionales</span>
                <span className="text-plan-primary">${selectedCandidate.additionalIncome?.toLocaleString('es-CO')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-plan-secondary">Ingreso total</span>
              <span className="text-plan-primary font-semibold">${selectedCandidate.totalIncome?.toLocaleString('es-CO')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-plan-secondary">Obligaciones mensuales</span>
              <span className="text-plan-primary">${selectedCandidate.monthlyObligations?.toLocaleString('es-CO')}</span>
            </div>
            <div className="flex justify-between bg-emerald-50 p-2 rounded">
              <span className="text-emerald-700">Disponible para arriendo</span>
              <span className="text-emerald-700 font-semibold">${selectedCandidate.availableForRent?.toLocaleString('es-CO')}</span>
            </div>
          </div>
        </div>
        {/* Housing */}
        <div>
          <p className="text-xs font-normal text-plan-secondary font-mono uppercase mb-2">Vivienda Actual</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-plan-secondary">Dirección</span>
              <span className="text-plan-primary text-right max-w-[60%]">{selectedCandidate.currentAddress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-plan-secondary">Tiempo en dirección</span>
              <span className="text-plan-primary">{selectedCandidate.timeAtCurrentAddress ? `${Math.floor(selectedCandidate.timeAtCurrentAddress / 12)} años ${selectedCandidate.timeAtCurrentAddress % 12} meses` : 'No especificado'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-plan-secondary">Dependientes</span>
              <span className="text-plan-primary">{selectedCandidate.dependents || 0}</span>
            </div>
          </div>
        </div>
        {/* References */}
        <div>
          <p className="text-xs font-normal text-plan-secondary font-mono uppercase mb-2">Referencias</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-plan-secondary">Arrendadores anteriores</span>
              <span className="text-plan-primary">{selectedCandidate.previousLandlordsCount || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-plan-secondary">Referencias laborales</span>
              <span className="text-plan-primary">{selectedCandidate.employmentReferencesCount || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-plan-secondary">Referencias personales</span>
              <span className="text-plan-primary">{selectedCandidate.personalReferencesCount || 0}</span>
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className="space-y-3">
        {[
          { key: 'hasIdDocument' as const, name: 'Documento de identidad', subtitle: 'Cédula de ciudadanía' },
          { key: 'hasIncomeProof' as const, name: 'Comprobante de ingresos', subtitle: 'Últimos 3 meses' },
          { key: 'hasEmploymentLetter' as const, name: 'Carta laboral', subtitle: 'Certificación de empleo' },
          { key: 'hasBankStatements' as const, name: 'Extractos bancarios', subtitle: 'Últimos 3 meses' },
        ].map((doc) => {
          const verified = !!selectedCandidate[doc.key];
          return (
            <button
              key={doc.key}
              type="button"
              onClick={() => setPreviewDoc({ name: doc.name, subtitle: doc.subtitle, verified })}
              className={`w-full flex items-center justify-between p-3 rounded text-left transition-colors hover:ring-1 hover:ring-border ${verified ? 'bg-emerald-50 hover:bg-emerald-100/60' : 'bg-muted hover:bg-muted/80'}`}
            >
              <div className="flex items-center gap-3">
                <FileText className={`w-5 h-5 ${verified ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-sm font-medium text-plan-primary">{doc.name}</p>
                  <p className="text-xs text-plan-secondary">{doc.subtitle}</p>
                </div>
              </div>
              {verified ? (
                <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded">Verificado</span>
              ) : (
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">Pendiente</span>
              )}
            </button>
          );
        })}
        <div className="mt-4 p-3 bg-muted rounded">
          <p className="text-sm text-plan-secondary">
            <span className="font-medium text-plan-primary">
              {[selectedCandidate.hasIdDocument, selectedCandidate.hasIncomeProof, selectedCandidate.hasEmploymentLetter, selectedCandidate.hasBankStatements].filter(Boolean).length}
            </span> de 4 documentos verificados
          </p>
        </div>
      </div>
    ),
  } : undefined;

  // Property not found
  if (!property) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-[#1a1a1c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
              <WarningCircle className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
            </div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
              Propiedad no encontrada
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mb-6">
              La propiedad que buscas no existe o no tienes acceso.
            </p>
            <Link
              href="/panel"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al panel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#1a1a1c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Back Link */}
        <Link
          href="/panel/propiedades"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a mis propiedades
        </Link>

        {/* Property Header - Premium Glass Style */}
        <header className="relative rounded-2xl overflow-hidden mb-8">
          {/* Background Image with Overlay */}
          <div className="absolute inset-0">
            <Image
              src={property.thumbnailUrl}
              alt={property.title}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
          </div>

          {/* Content */}
          <div className="relative px-6 py-8 lg:px-8 lg:py-10">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              {/* Property Image Thumbnail */}
              <div className="relative w-32 h-32 lg:w-36 lg:h-36 rounded-2xl overflow-hidden flex-shrink-0 ring-2 ring-white/20 shadow-2xl">
                <Image
                  src={property.thumbnailUrl}
                  alt={property.title}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Property Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl lg:text-3xl font-semibold text-white">
                  {property.title}
                </h1>
                <p className="text-white/70 mt-2 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {property.neighborhood}, {property.city}
                </p>
                <div className="mt-4 inline-flex items-baseline gap-1.5 bg-white/10 backdrop-blur-sm px-5 py-2.5 rounded-xl border border-white/10">
                  <span className="text-3xl font-bold text-white">
                    {formatCurrency(property.monthlyRent)}
                  </span>
                  <span className="text-lg font-normal text-white/70">/mes</span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex gap-3 lg:gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10 text-center min-w-[80px]">
                  <p className="text-2xl font-bold text-white">{counts.all}</p>
                  <p className="text-xs text-white/60">Candidatos</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10 text-center min-w-[80px]">
                  <p className="text-2xl font-bold text-amber-400">{counts.pending}</p>
                  <p className="text-xs text-white/60">Pendientes</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10 text-center min-w-[80px]">
                  <p className="text-2xl font-bold text-emerald-400">{counts.approved}</p>
                  <p className="text-xs text-white/60">Aprobados</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Rented Property View */}
        {activeContract ? (
          <div className="space-y-6">
            {/* Active lease banner */}
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/20 px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Propiedad arrendada</p>
                <p className="text-xs text-emerald-700/70 dark:text-emerald-300/70 mt-0.5">
                  Contrato activo desde {new Date(activeContract.startDate + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Lease details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Financial summary */}
                <PlanStatsGrid columns={3}>
                  <PlanStatsCard
                    label="Canon mensual"
                    value={formatCurrency(activeContract.monthlyRent)}
                    sublabel={`Día de pago: ${activeContract.paymentDueDay}`}
                    icon={Buildings}
                  />
                  <PlanStatsCard
                    label="Administración"
                    value={activeContract.adminFee > 0 ? formatCurrency(activeContract.adminFee) : 'Incluida'}
                    sublabel="Cuota mensual"
                    icon={Buildings}
                  />
                  <PlanStatsCard
                    label="Vigencia"
                    value={`${Math.round((new Date(activeContract.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30))} meses`}
                    sublabel={`Hasta ${new Date(activeContract.endDate + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                    icon={CalendarBlank}
                  />
                </PlanStatsGrid>

                {/* Contract details card */}
                <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#222224] p-6 space-y-5">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Contrato</p>
                    <p className="text-lg font-semibold text-neutral-900 dark:text-white mt-0.5">{CONTRACT_TYPE_LABELS[activeContract.type]}</p>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-700" />

                  {/* Parties */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">Arrendador</p>
                      <p className="font-medium text-neutral-900 dark:text-white">{activeContract.landlordName}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{activeContract.landlordEmail}</p>
                    </div>
                    <div>
                      <p className="text-xs font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">Arrendatario</p>
                      <p className="font-medium text-neutral-900 dark:text-white">{activeContract.tenantName}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{activeContract.tenantEmail}</p>
                    </div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-700" />

                  {/* Guarantee & Dates */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Garantía</p>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white mt-0.5">
                        {activeContract.guaranteeType === 'poliza' ? 'Póliza de arrendamiento' : 'Codeudor'}
                      </p>
                      {activeContract.guaranteeDetails && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{activeContract.guaranteeDetails}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Firmado</p>
                      <div className="mt-0.5 space-y-1">
                        {activeContract.landlordSignature && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Arrendador — {new Date(activeContract.landlordSignature.signedAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                        {activeContract.tenantSignature && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Arrendatario — {new Date(activeContract.tenantSignature.signedAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar actions */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#222224] p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Acciones rápidas</h3>
                  <Link
                    href={`/panel/${propertyId}/contract/${activeContract.tenantId}`}
                    className="flex items-center gap-3 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">Ver contrato</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Detalles y cláusulas</p>
                    </div>
                  </Link>
                  <Link
                    href={`/panel/mensajes?to=${activeContract.tenantId}`}
                    className="flex items-center gap-3 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <Chat className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">Enviar mensaje</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Contactar al arrendatario</p>
                    </div>
                  </Link>
                </div>

                {/* Tenant summary card */}
                <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#222224] p-5">
                  <p className="text-xs font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">Arrendatario</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                      {activeContract.tenantName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white text-sm">{activeContract.tenantName}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{activeContract.tenantEmail}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Row - Compact Style */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                    <Users className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">{counts.all}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Total candidatos</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">{counts.pending}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Pendientes</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">{counts.preApproved}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Pre-aprobados</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">{counts.approved}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Aprobados</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs - Modern Pill Style */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                      ${activeTab === tab.id
                        ? 'bg-white dark:bg-[#222224] text-neutral-900 dark:text-white shadow-sm'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                      }
                    `}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span
                        className={`
                          px-1.5 py-0.5 rounded-md text-xs font-medium tabular-nums
                          ${activeTab === tab.id
                            ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                          }
                        `}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'schedule' ? (
              <AvailabilityScheduleEditor
                schedule={availabilitySchedule}
                onSave={handleSaveSchedule}
              />
            ) : activeTab !== 'visits' ? (
              <div className="bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                <PlanTable
                  data={tableData}
                  columns={columns}
                  keyExtractor={(row) => row.id}
                  onRowClick={handleRowClick}
                  emptyMessage={
                    activeTab === 'all'
                      ? 'Aún no hay candidatos para esta propiedad'
                      : `No hay candidatos ${tabs.find(t => t.id === activeTab)?.label.toLowerCase() || ''}`
                  }
                  stickyHeader
                  pagination
                  pageSize={4}
                />
              </div>
            ) : (
              <div className="bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                <PlanTable<Visit>
                  data={propertyVisits}
                  pagination
                  pageSize={4}
                  columns={[
                    {
                      key: 'candidateName',
                      header: 'Candidato',
                      sortable: true,
                      type: 'avatar',
                      nameKey: 'candidateName',
                    },
                    {
                      key: 'requestedDate',
                      header: 'Fecha',
                      sortable: true,
                      render: (row: Visit) => (
                        <span className="text-sm text-plan-secondary">
                          {new Date(row.requestedDate + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      ),
                    },
                    {
                      key: 'requestedTime',
                      header: 'Hora',
                      sortable: true,
                      render: (row: Visit) => {
                        const [h, m] = row.requestedTime.split(':');
                        const hour = parseInt(h, 10);
                        return <span className="text-sm text-plan-secondary">{hour > 12 ? hour - 12 : hour}:{m} {hour >= 12 ? 'PM' : 'AM'}</span>;
                      },
                    },
                    {
                      key: 'status',
                      header: 'Estado',
                      sortable: true,
                      render: (row: Visit) => (
                        <PlanStatusBadge
                          status={VISIT_STATUS_TO_PLAN[row.status]}
                          label={VISIT_STATUS_LABELS[row.status]}
                          size="sm"
                        />
                      ),
                    },
                  ]}
                  keyExtractor={(row) => row.id}
                  emptyMessage="No hay visitas para esta propiedad"
                  stickyHeader
                />
              </div>
            )}
          </>
        )}

        {/* Candidate Detail Sheet */}
        <PlanDetailSheet
          open={isDetailOpen}
          onOpenChange={(open) => !open && handleCloseDetail()}
          profile={selectedCandidate ? {
            name: selectedCandidate.fullName,
            subtitle: selectedCandidate.occupation,
          } : undefined}
          contact={selectedCandidate ? {
            email: selectedCandidate.email,
            phone: selectedCandidate.phone,
          } : undefined}
          progress={selectedCandidate ? {
            value: selectedCandidate.numericScore,
            label: 'Score de riesgo',
          } : undefined}
          quickActions={quickActions}
          sections={detailSections}
          secondaryPanel={secondaryPanelConfig}
        />

      </div>

      {/* Document Preview Modal */}
      {previewDoc && selectedCandidate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPreviewDoc(null)} />
          <div className="relative bg-white dark:bg-[#222224] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
              <div>
                <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{previewDoc.name}</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{selectedCandidate.fullName} · {previewDoc.subtitle}</p>
              </div>
              <button type="button" onClick={() => setPreviewDoc(null)} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
              </button>
            </div>

            {/* Document preview area */}
            <div className="flex-1 overflow-auto p-6">
              {previewDoc.verified ? (
                <div className="space-y-5">
                  {/* Status */}
                  <div className="flex items-center gap-2.5 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                    <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Documento verificado</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">Verificación automática completada</p>
                    </div>
                  </div>

                  {/* Mock document preview */}
                  <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 p-8 flex flex-col items-center justify-center min-h-[280px]">
                    <FileText className="w-12 h-12 text-neutral-400 dark:text-neutral-500 mb-3" />
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{previewDoc.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">PDF · Subido el 15 ene, 2026</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">245 KB · 2 páginas</p>
                  </div>

                  {/* Details */}
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 font-mono uppercase tracking-wider">Detalles de verificación</p>
                    <div className="space-y-2.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">Estado</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Aprobado</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">Fecha de carga</span>
                        <span className="text-neutral-900 dark:text-white">15 ene, 2026</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">Verificado el</span>
                        <span className="text-neutral-900 dark:text-white">16 ene, 2026</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">Método</span>
                        <span className="text-neutral-900 dark:text-white">Verificación automática</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <p className="text-base font-medium text-neutral-900 dark:text-white mb-1">Documento pendiente</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs">
                    El candidato aún no ha subido este documento. Se le ha notificado para completar su documentación.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {previewDoc.verified && (
              <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    toast.success('Documento descargado', { description: `${previewDoc.name} guardado exitosamente.` });
                    setPreviewDoc(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Descargar
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
