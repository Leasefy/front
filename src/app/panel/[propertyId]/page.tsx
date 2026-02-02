'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Users, Clock, CheckCircle, XCircle, AlertCircle, Eye, FileText, Send, CheckCircle2, AlertTriangle, Info, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { getLandlordProperty, getCandidatesForProperty } from '@/lib/data/mock-landlord-data';
import { getCandidateById } from '@/lib/data/mock-candidates';
import { formatCurrency } from '@/lib/data/mock-dashboard';
import { PlanStatsCard, PlanStatsGrid } from '@/components/ui/plan/PlanStatsCard';
import { PlanTable, PlanTableColumn } from '@/components/ui/plan/PlanTable';
import { PlanTabs, PlanTab } from '@/components/ui/plan/PlanTabs';
import { PlanDetailSheet, QuickAction, DetailSection } from '@/components/ui/plan/PlanDetailSheet';
import { PlanRiskBadge, PlanStatusBadge, PlanStatusType } from '@/components/ui/plan/PlanStatusBadge';
import { PlanProgressBar } from '@/components/ui/plan/PlanProgressBar';
import type { LandlordCandidate, LandlordCandidateStatus } from '@/lib/types/landlord';
import type { Candidate } from '@/lib/types/candidate';
import { RISK_LEVELS } from '@/lib/types/risk-score';

// ============================================================================
// Types
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

  // State for tabs
  const [activeTab, setActiveTab] = useState('all');

  // State for candidate list
  const [candidates, setCandidates] = useState(initialCandidates);

  // State for detail drawer
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // State for expanded sections in detail view
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);

  // Filter candidates by tab
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
      // Reset expanded sections
      setShowFullProfile(false);
      setShowDocuments(false);
    }
  }, []);

  // Handle close detail drawer
  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
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
      label: showFullProfile ? 'Ocultar perfil' : 'Ver perfil completo',
      icon: <Eye className="w-4 h-4" />,
      onClick: () => setShowFullProfile(!showFullProfile),
      variant: showFullProfile ? 'primary' : 'default',
    },
    {
      id: 'view-docs',
      label: showDocuments ? 'Ocultar documentos' : 'Ver documentos',
      icon: <FileText className="w-4 h-4" />,
      onClick: () => setShowDocuments(!showDocuments),
      variant: showDocuments ? 'primary' : 'default',
    },
    {
      id: 'send-message',
      label: 'Enviar mensaje',
      icon: <Send className="w-4 h-4" />,
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
    // Full Profile Section (conditional)
    ...(showFullProfile ? [{
      id: 'full-profile',
      title: 'Perfil Completo',
      content: (
        <div className="space-y-4">
          {/* Employment */}
          <div>
            <p className="text-xs font-medium text-plan-secondary uppercase mb-2">Información Laboral</p>
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
            <p className="text-xs font-medium text-plan-secondary uppercase mb-2">Información Financiera</p>
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
            <p className="text-xs font-medium text-plan-secondary uppercase mb-2">Vivienda Actual</p>
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
            <p className="text-xs font-medium text-plan-secondary uppercase mb-2">Referencias</p>
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
      ),
    }] : []),
    // Documents Section (conditional)
    ...(showDocuments ? [{
      id: 'documents',
      title: 'Documentos del Candidato',
      content: (
        <div className="space-y-3">
          <div className={`flex items-center justify-between p-3 rounded ${selectedCandidate.hasIdDocument ? 'bg-emerald-50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-3">
              <FileText className={`w-5 h-5 ${selectedCandidate.hasIdDocument ? 'text-emerald-600' : 'text-gray-400'}`} />
              <div>
                <p className="text-sm font-medium text-plan-primary">Documento de identidad</p>
                <p className="text-xs text-plan-secondary">Cédula de ciudadanía</p>
              </div>
            </div>
            {selectedCandidate.hasIdDocument ? (
              <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded">Verificado</span>
            ) : (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">Pendiente</span>
            )}
          </div>
          <div className={`flex items-center justify-between p-3 rounded ${selectedCandidate.hasIncomeProof ? 'bg-emerald-50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-3">
              <FileText className={`w-5 h-5 ${selectedCandidate.hasIncomeProof ? 'text-emerald-600' : 'text-gray-400'}`} />
              <div>
                <p className="text-sm font-medium text-plan-primary">Comprobante de ingresos</p>
                <p className="text-xs text-plan-secondary">Últimos 3 meses</p>
              </div>
            </div>
            {selectedCandidate.hasIncomeProof ? (
              <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded">Verificado</span>
            ) : (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">Pendiente</span>
            )}
          </div>
          <div className={`flex items-center justify-between p-3 rounded ${selectedCandidate.hasEmploymentLetter ? 'bg-emerald-50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-3">
              <FileText className={`w-5 h-5 ${selectedCandidate.hasEmploymentLetter ? 'text-emerald-600' : 'text-gray-400'}`} />
              <div>
                <p className="text-sm font-medium text-plan-primary">Carta laboral</p>
                <p className="text-xs text-plan-secondary">Certificación de empleo</p>
              </div>
            </div>
            {selectedCandidate.hasEmploymentLetter ? (
              <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded">Verificado</span>
            ) : (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">Pendiente</span>
            )}
          </div>
          <div className={`flex items-center justify-between p-3 rounded ${selectedCandidate.hasBankStatements ? 'bg-emerald-50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-3">
              <FileText className={`w-5 h-5 ${selectedCandidate.hasBankStatements ? 'text-emerald-600' : 'text-gray-400'}`} />
              <div>
                <p className="text-sm font-medium text-plan-primary">Extractos bancarios</p>
                <p className="text-xs text-plan-secondary">Últimos 3 meses</p>
              </div>
            </div>
            {selectedCandidate.hasBankStatements ? (
              <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded">Verificado</span>
            ) : (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">Pendiente</span>
            )}
          </div>
          {/* Summary */}
          <div className="mt-4 p-3 bg-gray-100 rounded">
            <p className="text-sm text-plan-secondary">
              <span className="font-medium text-plan-primary">
                {[selectedCandidate.hasIdDocument, selectedCandidate.hasIncomeProof, selectedCandidate.hasEmploymentLetter, selectedCandidate.hasBankStatements].filter(Boolean).length}
              </span> de 4 documentos verificados
            </p>
          </div>
        </div>
      ),
    }] : []),
    {
      id: 'risk-evaluation',
      title: 'Evaluacion de Riesgo',
      content: (
        <div className="space-y-5">
          {/* Score Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
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
              <p className="text-xs font-medium text-plan-secondary uppercase mb-3">Desglose por categoría</p>
              <div className="space-y-3">
                {selectedCandidate.riskScore.categories.map((cat) => (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">{cat.label}</span>
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
              <p className="text-xs font-medium text-plan-secondary uppercase mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Factores positivos
              </p>
              <ul className="space-y-1.5">
                {selectedCandidate.riskScore.drivers.slice(0, 4).map((driver, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {driver}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk Flags (if any) */}
          {selectedCandidate.riskScore?.flags && selectedCandidate.riskScore.flags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-plan-secondary uppercase mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Puntos a considerar
              </p>
              <ul className="space-y-2">
                {selectedCandidate.riskScore.flags.map((flag) => (
                  <li key={flag.id} className={`flex items-start gap-2 text-sm p-2 rounded ${
                    flag.severity === 'high' ? 'bg-red-50 text-red-700' :
                    flag.severity === 'medium' ? 'bg-amber-50 text-amber-700' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
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
              <p className="text-xs font-medium text-plan-secondary uppercase mb-2 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Recomendaciones
              </p>
              <ul className="space-y-2">
                {selectedCandidate.riskScore.suggestedConditions.map((cond) => (
                  <li key={cond.id} className="text-sm bg-gray-100 p-2 rounded">
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

  // Property not found
  if (!property) {
    return (
      <div className="min-h-screen bg-plan-page">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-plan-muted" />
            </div>
            <h1 className="text-xl font-semibold text-plan-primary mb-2">
              Propiedad no encontrada
            </h1>
            <p className="text-plan-secondary mb-4">
              La propiedad que buscas no existe o no tienes acceso.
            </p>
            <Link
              href="/panel"
              className="inline-flex items-center gap-2 px-4 py-2 bg-plan-primary text-white rounded-sm text-sm font-medium hover:bg-gray-800 transition-colors"
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
    <div className="min-h-screen bg-plan-page">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Back Link */}
        <Link
          href="/panel/propiedades"
          className="inline-flex items-center gap-2 text-sm text-plan-secondary hover:text-plan-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a mis propiedades
        </Link>

        {/* Property Header */}
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Property Image */}
            <div className="relative w-full lg:w-64 h-40 rounded-sm overflow-hidden flex-shrink-0 bg-gray-100">
              <Image
                src={property.thumbnailUrl}
                alt={property.title}
                fill
                className="object-cover"
              />
            </div>

            {/* Property Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-plan-primary">
                {property.title}
              </h1>
              <p className="text-plan-secondary mt-1 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {property.neighborhood}, {property.city}
              </p>
              <p className="text-2xl font-semibold text-plan-primary mt-4">
                {formatCurrency(property.monthlyRent)}
                <span className="text-base font-normal text-plan-secondary">/mes</span>
              </p>
            </div>
          </div>
        </header>

        {/* Stats Row */}
        <PlanStatsGrid columns={4} className="mb-8">
          <PlanStatsCard
            label="Total candidatos"
            value={counts.all}
            sublabel="Aplicaciones recibidas"
            icon={Users}
          />
          <PlanStatsCard
            label="Pendientes"
            value={counts.pending}
            sublabel="Por revisar"
            icon={Clock}
            variant={counts.pending > 0 ? 'accent' : 'default'}
          />
          <PlanStatsCard
            label="Pre-aprobados"
            value={counts.preApproved}
            sublabel="En evaluacion"
            icon={AlertCircle}
          />
          <PlanStatsCard
            label="Aprobados"
            value={counts.approved}
            sublabel="Listos para contrato"
            icon={CheckCircle}
          />
        </PlanStatsGrid>

        {/* Tabs */}
        <PlanTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="underline"
          className="mb-6"
        />

        {/* Candidates Table */}
        <PlanTable
          data={tableData}
          columns={columns}
          keyExtractor={(row) => row.id}
          onRowClick={handleRowClick}
          emptyMessage={
            activeTab === 'all'
              ? 'Aun no hay candidatos para esta propiedad'
              : `No hay candidatos ${tabs.find(t => t.id === activeTab)?.label.toLowerCase() || ''}`
          }
          stickyHeader
        />

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
        />

      </div>
    </div>
  );
}
