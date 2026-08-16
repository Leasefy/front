'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MapPin, Users, Clock, CheckCircle, XCircle, WarningCircle, Eye, FileText, PaperPlaneTilt, Warning, Info, TrendUp, CalendarBlank, Buildings, Chat, X, Download, Shield, CalendarCheck } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { BackButton } from '@/components/ui/back-button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button, Spinner, Card } from '@/components/ui';
import { IconButton, MonoLabel } from '@leasefy/cadence';
import { useLandlordProperty, useCandidate, useCandidateDecision, useCandidates } from '@/lib/hooks/useLandlord';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { ApiError } from '@/lib/api/client';
import { useCandidateDocuments } from '@/lib/hooks/useDocuments';
import { documentsApi, type DocumentItem } from '@/lib/api/documents.service';
import { landlordApi } from '@/lib/api/landlord.service';
import { useVisits } from '@/lib/hooks/useVisits';
import { useContracts } from '@/lib/hooks/useContracts';
import { getContractTypeLabel } from '@/lib/types/contract';
import { VISIT_STATUS_LABELS } from '@/lib/types/visit';
import type { Visit, VisitStatus } from '@/lib/types/visit';
import { PlanStatsCard, PlanStatsGrid } from '@/components/ui/plan/PlanStatsCard';
import { PlanTable, PlanTableColumn } from '@/components/ui/plan/PlanTable';
import { PlanTabs, PlanTab } from '@/components/ui/plan/PlanTabs';
import { PlanDetailSheet, QuickAction, DetailSection, SecondaryPanel } from '@/components/ui/plan/PlanDetailSheet';
import { PlanRiskBadge, PlanStatusBadge, PlanStatusType } from '@/components/ui/plan/PlanStatusBadge';

const VISIT_STATUS_TO_PLAN: Record<VisitStatus, PlanStatusType> = {
  requested:   'new',
  confirmed:   'in_progress',
  completed:   'completed',
  cancelled:   'rejected',
  no_show:     'important',
  rejected:    'rejected',
  rescheduled: 'pending',
};
import { PlanProgressBar } from '@/components/ui/plan/PlanProgressBar';
import type { LandlordCandidate, LandlordCandidateStatus } from '@/lib/types/landlord';
import type { Candidate } from '@/lib/types/candidate';
import { RISK_LEVELS } from '@/lib/types/risk-score';
import { AvailabilityScheduleEditor } from '@/components/panel/AvailabilityScheduleEditor';
import { DEFAULT_AVAILABILITY_SCHEDULE, type AvailabilitySchedule } from '@/lib/types/property';
import { useMySubscription } from '@/lib/hooks/useSubscription';
import { canPlanAccessFeature } from '@/lib/constants/subscription-plans';
import type { PlanId } from '@/lib/types/subscription';
import { LockedFeatureOverlay, LockedBadge } from '@/components/ui/LockedFeatureOverlay';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

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
  const { locale } = useI18n();
  const { propertyId } = params;
  const router = useRouter();

  // Subscription check for feature gating
  const { subscription } = useMySubscription();
  const planId = (subscription?.planId || 'starter') as PlanId;
  const hasAiScoring = canPlanAccessFeature(planId, 'ai_scoring');

  // Fetch property with candidates from API
  const {
    property,
    isLoading: propertyLoading,
    errorCrudo: errorPropiedad,
    refetch: recargarPropiedad,
  } = useLandlordProperty(propertyId);
  const {
    candidates: apiCandidates,
    isLoading: candidatesLoading,
    errorCrudo: errorCandidatos,
    refetch: refetchCandidates,
  } = useCandidates({ propertyId });
  const { decide } = useCandidateDecision();

  // Visits from real API
  const { getForProperty } = useVisits();
  const propertyVisits = getForProperty(propertyId);
  const { getForProperty: getContractsForProperty } = useContracts();
  const propertyContracts = getContractsForProperty(propertyId);
  const activeContract = propertyContracts.find(c => c.status === 'active');

  const isLoading = propertyLoading || candidatesLoading;

  // State for tabs
  const [activeTab, setTab] = useState('all');

  // Use API candidates as local state for optimistic updates
  const [candidates, setCandidates] = useState(apiCandidates);
  useEffect(() => { setCandidates(apiCandidates); }, [apiCandidates]);

  // State for detail drawer
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // State for secondary panel view
  const [secondaryView, setSecondaryView] = useState<'profile' | 'documents' | null>(null);

  // State for document preview modal
  const [previewDoc, setPreviewDoc] = useState<{ name: string; subtitle: string; verified: boolean; url?: string; size?: number; mimeType?: string; createdAt?: string } | null>(null);

  // Fetch real documents for selected candidate
  const { documents: candidateDocuments, isLoading: isLoadingDocs } = useCandidateDocuments(
    selectedCandidate?.id
  );

  // Map document types to display labels
  const DOC_TYPE_LABELS: Record<string, { name: string; subtitle: string }> = {
    id_document: { name: 'Documento de identidad', subtitle: 'Cédula de ciudadanía' },
    income_proof: { name: 'Comprobante de ingresos', subtitle: 'Últimos 3 meses' },
    employment_letter: { name: 'Carta laboral', subtitle: 'Certificación de empleo' },
    bank_statements: { name: 'Extractos bancarios', subtitle: 'Últimos 3 meses' },
    credit_report: { name: 'Reporte crediticio', subtitle: 'Historial de crédito' },
  };

  const EXPECTED_DOC_TYPES = ['id_document', 'income_proof', 'employment_letter', 'bank_statements'];

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
        hasAiScoring ? (
          <PlanRiskBadge level={row.riskLevel} />
        ) : (
          <LockedBadge label="Pro" />
        )
      ),
    },
    {
      key: 'score',
      header: 'Score',
      sortable: true,
      render: (row) => (
        hasAiScoring ? (
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
        ) : (
          <span className="text-xs text-plan-muted">—</span>
        )
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
  const handleRowClick = useCallback(async (row: CandidateRow) => {
    try {
      const fullCandidate = await landlordApi.getCandidate(row.id);
      setSelectedCandidate(fullCandidate);
      setIsDetailOpen(true);
      setSecondaryView(null);
    } catch {
      toast.error('Error cargando detalles del candidato');
    }
  }, []);

  // Handle close detail drawer
  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
    setSecondaryView(null);
    setTimeout(() => setSelectedCandidate(null), 300);
  }, []);

  // Handle decision - update candidate status via API and take appropriate action
  const handleDecision = useCallback(
    async (candidateId: string, newStatus: LandlordCandidateStatus) => {
      const candidate = candidates.find(c => c.id === candidateId);

      // Map to API decision format
      const decisionMap: Record<LandlordCandidateStatus, 'pre-approved' | 'approved' | 'rejected' | 'more-info'> = {
        'pending': 'more-info',
        'pre-approved': 'pre-approved',
        'approved': 'approved',
        'rejected': 'rejected',
        'more-info': 'more-info',
      };

      const result = await decide(candidateId, { decision: decisionMap[newStatus] });

      if (result) {
        // Optimistic local update
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === candidateId
              ? { ...c, status: newStatus, statusChangedAt: new Date().toISOString() }
              : c
          )
        );

        if (newStatus === 'approved') {
          handleCloseDetail();
          toast.success('Candidato aprobado', {
            description: `Iniciando proceso de contrato con ${candidate?.fullName}`,
          });
          router.push(`/panel/${propertyId}/contract/${candidateId}?new=true`);
        } else if (newStatus === 'pre-approved') {
          handleCloseDetail();
          toast.success('Candidato pre-aprobado', {
            description: `${candidate?.fullName} ha sido pre-aprobado. Puedes continuar revisando otros candidatos o aprobar definitivamente.`,
            duration: 5000,
          });
        } else if (newStatus === 'rejected') {
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

        refetchCandidates();
      }
    },
    [handleCloseDetail, candidates, router, propertyId, decide, refetchCandidates]
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
      content: !hasAiScoring ? (
        <LockedFeatureOverlay
          title="Análisis AI de candidatos"
          description="Mejora tu plan para ver el score detallado, desglose por categoría, factores positivos y recomendaciones de cada candidato."
          upgradeHref="/panel/upgrade"
          upgradeLabel="Mejorar plan"
          variant="blur"
        >
          {/* Decorative blurred content */}
          <div className="space-y-5">
            <div className="bg-muted p-4 rounded-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-success-soft" />
                  <div>
                    <p className="text-sm font-medium text-plan-primary">Excelente</p>
                    <p className="text-xs text-plan-secondary">Perfil muy confiable</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-plan-primary">92</p>
                  <p className="text-xs text-plan-secondary">de 100</p>
                </div>
              </div>
              <div className="h-2 bg-success-soft rounded-full" />
            </div>
            <div className="space-y-3">
              <div className="h-2 bg-surface-muted rounded-full w-3/4" />
              <div className="h-2 bg-surface-muted rounded-full w-1/2" />
              <div className="h-2 bg-surface-muted rounded-full w-2/3" />
            </div>
          </div>
        </LockedFeatureOverlay>
      ) : (
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
              <MonoLabel className="block text-xs text-plan-secondary mb-3">Desglose por categoría</MonoLabel>
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
              <MonoLabel className="text-xs text-plan-secondary mb-2 flex items-center gap-1">
                <TrendUp className="w-3 h-3" />
                Factores positivos
              </MonoLabel>
              <ul className="space-y-1.5">
                {selectedCandidate.riskScore.drivers.slice(0, 4).map((driver, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                    {driver}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk Flags (if any) */}
          {selectedCandidate.riskScore?.flags && selectedCandidate.riskScore.flags.length > 0 && (
            <div>
              <MonoLabel className="text-xs text-plan-secondary mb-2 flex items-center gap-1">
                <Warning className="w-3 h-3" />
                Puntos a considerar
              </MonoLabel>
              <ul className="space-y-2">
                {selectedCandidate.riskScore.flags.map((flag) => (
                  <li key={flag.id} className={`flex items-start gap-2 text-sm p-2 rounded ${
                    flag.severity === 'high' ? 'bg-danger-soft text-danger' :
                    flag.severity === 'medium' ? 'bg-warning-soft text-warning' :
                    'bg-primary-soft text-primary'
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
              <MonoLabel className="text-xs text-plan-secondary mb-2 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Recomendaciones
              </MonoLabel>
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
          <Button
            variant="secondary"
            hideArrow
            onClick={() => handleDecision(selectedCandidate.id, 'pre-approved')}
            className="w-full bg-plan-status-blue-bg text-primary rounded-sm hover:bg-primary-soft"
          >
            <Clock className="w-4 h-4" />
            Pre-aprobar
          </Button>
          <Button
            variant="secondary"
            hideArrow
            onClick={() => handleDecision(selectedCandidate.id, 'approved')}
            className="w-full bg-plan-status-green-bg text-success rounded-sm hover:bg-success-soft"
          >
            <CheckCircle className="w-4 h-4" />
            Aprobar
          </Button>
          <Button
            variant="secondary"
            hideArrow
            onClick={() => handleDecision(selectedCandidate.id, 'rejected')}
            className="w-full bg-plan-status-red-bg text-danger rounded-sm hover:bg-danger-soft"
          >
            <XCircle className="w-4 h-4" />
            Rechazar
          </Button>
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
          <MonoLabel className="block text-xs text-plan-secondary mb-2">Información Laboral</MonoLabel>
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
          <MonoLabel className="block text-xs text-plan-secondary mb-2">Información Financiera</MonoLabel>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-plan-secondary">Salario mensual</span>
              <span className="text-plan-primary font-medium">${selectedCandidate.monthlySalary?.toLocaleString(locale === 'es' ? 'es-CL' : 'en-US')}</span>
            </div>
            {selectedCandidate.additionalIncome > 0 && (
              <div className="flex justify-between">
                <span className="text-plan-secondary">Ingresos adicionales</span>
                <span className="text-plan-primary">${selectedCandidate.additionalIncome?.toLocaleString(locale === 'es' ? 'es-CL' : 'en-US')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-plan-secondary">Ingreso total</span>
              <span className="text-plan-primary font-semibold">${selectedCandidate.totalIncome?.toLocaleString(locale === 'es' ? 'es-CL' : 'en-US')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-plan-secondary">Obligaciones mensuales</span>
              <span className="text-plan-primary">${selectedCandidate.monthlyObligations?.toLocaleString(locale === 'es' ? 'es-CL' : 'en-US')}</span>
            </div>
            <div className="flex justify-between bg-success-soft p-2 rounded">
              <span className="text-success">Disponible para arriendo</span>
              <span className="text-success font-semibold">${selectedCandidate.availableForRent?.toLocaleString(locale === 'es' ? 'es-CL' : 'en-US')}</span>
            </div>
          </div>
        </div>
        {/* Housing */}
        <div>
          <MonoLabel className="block text-xs text-plan-secondary mb-2">Vivienda Actual</MonoLabel>
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
          <MonoLabel className="block text-xs text-plan-secondary mb-2">Referencias</MonoLabel>
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
        {isLoadingDocs ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : (
          <>
            {EXPECTED_DOC_TYPES.map((docType) => {
              const realDoc = candidateDocuments.find(d => d.type === docType);
              const labels = DOC_TYPE_LABELS[docType] ?? { name: docType, subtitle: '' };
              const verified = !!realDoc?.verified;
              const uploaded = !!realDoc;
              return (
                <button
                  key={docType}
                  type="button"
                  onClick={() => setPreviewDoc({
                    name: labels.name,
                    subtitle: labels.subtitle,
                    verified,
                    url: realDoc?.url,
                    size: realDoc?.size,
                    mimeType: realDoc?.mimeType,
                    createdAt: realDoc?.createdAt,
                  })}
                  className={`w-full flex items-center justify-between p-3 rounded text-left transition-colors hover:ring-1 hover:ring-border ${uploaded ? (verified ? 'bg-success-soft hover:bg-success-soft/60' : 'bg-primary-soft hover:bg-primary-soft/60') : 'bg-muted hover:bg-muted/80'}`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className={`w-5 h-5 ${verified ? 'text-success' : uploaded ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="text-sm font-medium text-plan-primary">{labels.name}</p>
                      <p className="text-xs text-plan-secondary">{realDoc ? realDoc.fileName : labels.subtitle}</p>
                    </div>
                  </div>
                  {verified ? (
                    <span className="text-xs font-medium text-success bg-success-soft px-2 py-1 rounded">Verificado</span>
                  ) : uploaded ? (
                    <span className="text-xs font-medium text-primary bg-primary-soft px-2 py-1 rounded">Subido</span>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">Pendiente</span>
                  )}
                </button>
              );
            })}
            {/* Show extra docs not in EXPECTED_DOC_TYPES */}
            {candidateDocuments
              .filter(d => !EXPECTED_DOC_TYPES.includes(d.type))
              .map((doc) => {
                const labels = DOC_TYPE_LABELS[doc.type] ?? { name: doc.fileName, subtitle: doc.type };
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setPreviewDoc({
                      name: labels.name,
                      subtitle: labels.subtitle,
                      verified: doc.verified,
                      url: doc.url,
                      size: doc.size,
                      mimeType: doc.mimeType,
                      createdAt: doc.createdAt,
                    })}
                    className={`w-full flex items-center justify-between p-3 rounded text-left transition-colors hover:ring-1 hover:ring-border ${doc.verified ? 'bg-success-soft hover:bg-success-soft/60' : 'bg-primary-soft hover:bg-primary-soft/60'}`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className={`w-5 h-5 ${doc.verified ? 'text-success' : 'text-primary'}`} />
                      <div>
                        <p className="text-sm font-medium text-plan-primary">{labels.name}</p>
                        <p className="text-xs text-plan-secondary">{doc.fileName}</p>
                      </div>
                    </div>
                    {doc.verified ? (
                      <span className="text-xs font-medium text-success bg-success-soft px-2 py-1 rounded">Verificado</span>
                    ) : (
                      <span className="text-xs font-medium text-primary bg-primary-soft px-2 py-1 rounded">Subido</span>
                    )}
                  </button>
                );
              })}
            <div className="mt-4 p-3 bg-muted rounded">
              <p className="text-sm text-plan-secondary">
                <span className="font-medium text-plan-primary">
                  {candidateDocuments.length}
                </span> de {EXPECTED_DOC_TYPES.length} documentos subidos
                {candidateDocuments.filter(d => d.verified).length > 0 && (
                  <> · <span className="text-success">{candidateDocuments.filter(d => d.verified).length} verificados</span></>
                )}
              </p>
            </div>
          </>
        )}
      </div>
    ),
  } : undefined;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Property not found — o, hasta ahora, cualquier otra cosa.
  //
  // `property` queda en null tanto por un 404 como por un 500 o un corte de
  // red, y la pantalla concluía «no existe o no tienes acceso» para los tres.
  // Sobre un fallo de red eso es acusar a la persona de un problema de
  // permisos que no tiene, y encima le saca el botón de reintentar.
  // `FalloDeCarga` lo decide por el status: 404 → «no encontramos», sin
  // reintentar; cualquier otro → con reintentar.
  if (!property) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <FalloDeCarga
            error={errorPropiedad ?? new ApiError(404, 'property not found')}
            queEs="esta propiedad"
            onReintentar={recargarPropiedad}
            volverA={{ label: 'Volver al panel', href: '/panel' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Back Link */}
        <div className="mb-6">
          <BackButton href="/panel/propiedades" label="Volver a mis propiedades" />
        </div>

        {/* Property Header - Premium Glass Style */}
        <header className="relative rounded-xl overflow-hidden mb-8">
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
              <div className="relative w-32 h-32 lg:w-36 lg:h-36 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-white/20">
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
                  <p className="text-2xl font-bold text-warning">{counts.pending}</p>
                  <p className="text-xs text-white/60">Pendientes</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10 text-center min-w-[80px]">
                  <p className="text-2xl font-bold text-success">{counts.approved}</p>
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
            <div className="rounded-xl border border-success/30 dark:border-success/40 bg-success-soft dark:bg-[#2C7A53]/15 px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success-soft dark:bg-[#2C7A53]/15 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success dark:text-[#3EAE70]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-success dark:text-[#3EAE70]">Propiedad arrendada</p>
                <p className="text-xs text-success/70 dark:text-success/70 mt-0.5">
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
                <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
                  <div>
                    <MonoLabel className="block text-xs tracking-wider text-fg-muted">Contrato</MonoLabel>
                    <p className="text-lg font-semibold text-fg mt-0.5">{getContractTypeLabel(activeContract)}</p>
                  </div>

                  <div className="h-px bg-border-faint" />

                  {/* Parties */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <MonoLabel className="block text-xs tracking-wider text-fg-muted mb-2">Arrendador</MonoLabel>
                      <p className="font-medium text-fg">{activeContract.landlordName}</p>
                      <p className="text-sm text-fg-muted">{activeContract.landlordEmail}</p>
                    </div>
                    <div>
                      <MonoLabel className="block text-xs tracking-wider text-fg-muted mb-2">Arrendatario</MonoLabel>
                      <p className="font-medium text-fg">{activeContract.tenantName}</p>
                      <p className="text-sm text-fg-muted">{activeContract.tenantEmail}</p>
                    </div>
                  </div>

                  <div className="h-px bg-border-faint" />

                  {/* Guarantee & Dates */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-fg-muted">Garantía</p>
                      <p className="text-sm font-medium text-fg mt-0.5">
                        {activeContract.guaranteeType === 'poliza' ? 'Póliza de arrendamiento' : 'Codeudor'}
                      </p>
                      {activeContract.guaranteeDetails && (
                        <p className="text-xs text-fg-muted mt-0.5">{activeContract.guaranteeDetails}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-fg-muted">Firmado</p>
                      <div className="mt-0.5 space-y-1">
                        {activeContract.landlordSignature && (
                          <p className="text-xs text-success dark:text-[#3EAE70] flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Arrendador — {new Date(activeContract.landlordSignature.signedAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                        {activeContract.tenantSignature && (
                          <p className="text-xs text-success dark:text-[#3EAE70] flex items-center gap-1">
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
                <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-fg">Acciones rápidas</h3>
                  <Link
                    href={`/panel/${propertyId}/contract/${activeContract.tenantId}`}
                    className="flex items-center gap-3 w-full rounded-xl border border-border p-3 text-left hover:bg-surface-muted transition-colors"
                  >
                    <div className="w-9 h-9 rounded-md bg-primary-soft dark:bg-[#1A40FF]/15 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary dark:text-[#5570FF]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-fg">Ver contrato</p>
                      <p className="text-xs text-fg-muted">Detalles y cláusulas</p>
                    </div>
                  </Link>
                  <Link
                    href={`/panel/mensajes?to=${activeContract.tenantId}`}
                    className="flex items-center gap-3 w-full rounded-xl border border-border p-3 text-left hover:bg-surface-muted transition-colors"
                  >
                    <div className="w-9 h-9 rounded-md bg-primary-soft dark:bg-[#1A40FF]/15 flex items-center justify-center">
                      <Chat className="w-4 h-4 text-primary dark:text-[#5570FF]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-fg">Enviar mensaje</p>
                      <p className="text-xs text-fg-muted">Contactar al arrendatario</p>
                    </div>
                  </Link>
                </div>

                {/* Tenant summary card */}
                <div className="rounded-xl border border-border bg-surface p-5">
                  <MonoLabel className="block text-xs tracking-wider text-fg-muted mb-3">Arrendatario</MonoLabel>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-soft dark:bg-[#1A40FF]/15 flex items-center justify-center text-sm font-semibold text-primary dark:text-[#5570FF]">
                      {activeContract.tenantName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-fg text-sm">{activeContract.tenantName}</p>
                      <p className="text-xs text-fg-muted">{activeContract.tenantEmail}</p>
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
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center">
                    <Users className="w-5 h-5 text-fg-muted" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-fg">{counts.all}</p>
                    <p className="text-xs text-fg-muted">Total candidatos</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-warning-soft dark:bg-[#B7791F]/15 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-warning dark:text-[#D2992F]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-fg">{counts.pending}</p>
                    <p className="text-xs text-fg-muted">Pendientes</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-soft dark:bg-[#1A40FF]/15 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-primary dark:text-[#5570FF]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-fg">{counts.preApproved}</p>
                    <p className="text-xs text-fg-muted">Pre-aprobados</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success-soft dark:bg-[#2C7A53]/15 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-success dark:text-[#3EAE70]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-fg">{counts.approved}</p>
                    <p className="text-xs text-fg-muted">Aprobados</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Tabs - segmented filter over the candidate/visit views */}
            <Tabs value={activeTab} onValueChange={setTab}>
              <TabsList variant="segmented" className="mb-6">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="group flex items-center gap-2"
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-sm text-xs font-medium tabular-nums bg-surface-muted text-fg-muted group-data-[state=active]:bg-primary-soft dark:group-data-[state=active]:bg-[#1A40FF]/15 group-data-[state=active]:text-primary dark:group-data-[state=active]:text-[#5570FF]">
                        {tab.count}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Content based on active tab */}
              <TabsContent value={activeTab} className="mt-0">
            {activeTab === 'schedule' ? (
              <AvailabilityScheduleEditor
                schedule={availabilitySchedule}
                onSave={handleSaveSchedule}
              />
            ) : activeTab !== 'visits' ? (
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                {/* Sin esto, una consulta caída llegaba como `[]` y la tabla
                    afirmaba «Aún no hay candidatos para esta propiedad». A un
                    propietario esperando postulaciones eso no es un detalle:
                    es la respuesta a la única pregunta que vino a hacer. */}
                {errorCandidatos ? (
                  <FalloDeCarga
                    error={errorCandidatos}
                    queEs="los candidatos"
                    onReintentar={refetchCandidates}
                    enmarcado={false}
                  />
                ) : (
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
                )}
              </div>
            ) : (
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
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
              </TabsContent>
            </Tabs>
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
          <div className="relative bg-surface border border-border rounded-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="text-base font-semibold text-fg">{previewDoc.name}</h3>
                <p className="text-xs text-fg-muted mt-0.5">{selectedCandidate.fullName} · {previewDoc.subtitle}</p>
              </div>
              <IconButton
                variant="ghost"
                onClick={() => setPreviewDoc(null)}
                icon={<X className="w-5 h-5" />}
                aria-label="Cerrar"
              />
            </div>

            {/* Document preview area */}
            <div className="flex-1 overflow-auto p-6">
              {previewDoc.url ? (
                <div className="space-y-5">
                  {/* Status */}
                  {previewDoc.verified && (
                    <div className="flex items-center gap-2.5 p-3 bg-success-soft dark:bg-[#2C7A53]/15 rounded-xl border border-success/30 dark:border-success/40">
                      <Shield className="w-5 h-5 text-success dark:text-[#3EAE70] flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-success dark:text-[#3EAE70]">Documento verificado</p>
                        <p className="text-xs text-success dark:text-[#3EAE70]">Verificación automática completada</p>
                      </div>
                    </div>
                  )}

                  {/* Document preview - show image or file icon */}
                  <div className="border border-border rounded-xl bg-surface-muted p-8 flex flex-col items-center justify-center min-h-[280px]">
                    {previewDoc.mimeType?.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewDoc.url} alt={previewDoc.name} className="max-w-full max-h-[400px] rounded-md object-contain" />
                    ) : previewDoc.mimeType === 'application/pdf' ? (
                      <iframe src={previewDoc.url} className="w-full min-h-[400px] rounded-md" title={previewDoc.name} />
                    ) : (
                      <>
                        <FileText className="w-12 h-12 text-fg-subtle mb-3" />
                        <p className="text-sm font-medium text-fg">{previewDoc.name}</p>
                      </>
                    )}
                    <div className="mt-3 text-center">
                      <p className="text-xs text-fg-muted">
                        {previewDoc.mimeType?.split('/')[1]?.toUpperCase() ?? 'Archivo'}
                        {previewDoc.createdAt && ` · Subido el ${new Date(previewDoc.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                      </p>
                      {previewDoc.size != null && (
                        <p className="text-xs text-fg-muted">
                          {previewDoc.size > 1024 * 1024
                            ? `${(previewDoc.size / (1024 * 1024)).toFixed(1)} MB`
                            : `${Math.round(previewDoc.size / 1024)} KB`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-xl bg-surface-muted flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-fg-subtle" />
                  </div>
                  <p className="text-base font-medium text-fg mb-1">Documento pendiente</p>
                  <p className="text-sm text-fg-muted max-w-xs">
                    El candidato aún no ha subido este documento. Se le ha notificado para completar su documentación.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {previewDoc.url && (
              <div className="px-6 py-4 border-t border-border flex gap-3">
                <Button asChild variant="default" hideArrow className="flex-1">
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    onClick={() => {
                      toast.success('Documento descargado', { description: `${previewDoc.name} guardado exitosamente.` });
                    }}
                  >
                    <Download className="w-4 h-4" />
                    Descargar
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPreviewDoc(null)}
                >
                  Cerrar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
