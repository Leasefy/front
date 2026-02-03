'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Building2,
  UserCheck,
  UserX,
  Eye,
  FileText,
  MessageSquare,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  Shield,
  Briefcase,
  CreditCard,
  Home,
  Scale,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getAllCandidates, getCandidateById } from '@/lib/data/mock-candidates';
import { formatCurrency } from '@/lib/data/mock-dashboard';
import { PlanTable, PlanTableColumn } from '@/components/ui/plan/PlanTable';
import { PlanTabs, PlanTab } from '@/components/ui/plan/PlanTabs';
import { PlanDetailSheet, QuickAction, DetailSection } from '@/components/ui/plan/PlanDetailSheet';
import { PlanRiskBadge, PlanStatusBadge, PlanStatusType } from '@/components/ui/plan/PlanStatusBadge';
import { PlanProgressBar } from '@/components/ui/plan/PlanProgressBar';
import { PlanStatsCard, PlanStatsGrid } from '@/components/ui/plan/PlanStatsCard';
import type { Candidate } from '@/lib/types/candidate';

type StatusFilter = 'all' | 'new' | 'reviewing' | 'approved' | 'rejected';
type RiskFilter = 'all' | 'A' | 'B' | 'C' | 'D';

// Simulated status for candidates
const candidateStatuses: Record<string, StatusFilter> = {
  'cand-001': 'approved',
  'cand-002': 'reviewing',
  'cand-003': 'new',
  'cand-004': 'reviewing',
  'cand-005': 'new',
  'cand-006': 'new',
  'cand-007': 'reviewing',
  'cand-008': 'rejected',
  'cand-009': 'new',
  'cand-010': 'reviewing',
  'cand-011': 'rejected',
  'cand-012': 'new',
};

interface CandidateRow extends Candidate {
  status: StatusFilter;
}

const SCORE_CATEGORIES = [
  { icon: Briefcase, label: 'Estabilidad laboral', weight: '30%', description: 'Tipo de contrato, antigüedad, industria y cargo. Un contrato indefinido con más de 2 años pesa significativamente.' },
  { icon: CreditCard, label: 'Capacidad financiera', weight: '25%', description: 'Relación ingreso/arriendo, obligaciones mensuales e ingreso adicional. Idealmente el arriendo no supera el 30% del ingreso.' },
  { icon: Shield, label: 'Historial crediticio', weight: '20%', description: 'Reportes en centrales de riesgo, deudas vigentes y hábitos de pago. Sin reportes negativos suma puntos.' },
  { icon: Home, label: 'Historial de arriendo', weight: '15%', description: 'Referencias de arrendadores anteriores, tiempo en viviendas previas y motivos de cambio.' },
  { icon: Scale, label: 'Perfil general', weight: '10%', description: 'Documentación completa, coherencia de datos y verificación de identidad.' },
];

const RISK_LEVEL_DETAILS = [
  { level: 'A', label: 'Excelente', range: '85–100', color: 'bg-emerald-500', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', description: 'Perfil muy confiable. Ingresos estables, excelente historial crediticio, empleo sólido. Riesgo mínimo de impago.' },
  { level: 'B', label: 'Bueno', range: '70–84', color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50', description: 'Perfil sólido con fundamentos fuertes. Puede tener algún factor menor a considerar, pero el riesgo es bajo.' },
  { level: 'C', label: 'Regular', range: '50–69', color: 'bg-amber-500', textColor: 'text-amber-700', bgColor: 'bg-amber-50', description: 'Perfil con factores mixtos. Se recomienda solicitar garantías adicionales como un codeudor o depósito mayor.' },
  { level: 'D', label: 'Riesgoso', range: '0–49', color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50', description: 'Perfil con factores de riesgo significativos. Se recomienda precaución y condiciones especiales si se decide aprobar.' },
];

function ScoringGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2.5 px-4 py-2.5 rounded-sm text-sm font-medium transition-colors border',
          open
            ? 'bg-primary/5 border-primary/20 text-primary'
            : 'bg-card border-plan-border text-plan-primary hover:border-primary/30 hover:bg-primary/5'
        )}
      >
        <HelpCircle className="w-4 h-4" />
        <span>¿Cómo funciona el scoring de candidatos?</span>
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform ml-1', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mt-4 bg-card border border-plan-border overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-plan-border">
            <h3 className="text-base font-semibold text-plan-primary">Sistema de evaluación de candidatos</h3>
            <p className="text-sm text-plan-secondary mt-1">
              Cada candidato recibe un puntaje de 0 a 100 basado en múltiples factores verificados. Este score se traduce en un nivel de riesgo (A–D) para facilitar tu decisión.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-plan-border">
            {/* Left: Score categories */}
            <div className="p-6">
              <h4 className="text-sm font-semibold text-plan-primary mb-4 uppercase tracking-wider">Categorías evaluadas</h4>
              <div className="space-y-4">
                {SCORE_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <div key={cat.label} className="flex gap-3">
                      <div className="w-8 h-8 rounded-sm bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-plan-primary">{cat.label}</span>
                          <span className="text-xs text-plan-muted">Peso: {cat.weight}</span>
                        </div>
                        <p className="text-xs text-plan-secondary mt-0.5 leading-relaxed">{cat.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Risk levels */}
            <div className="p-6">
              <h4 className="text-sm font-semibold text-plan-primary mb-4 uppercase tracking-wider">Niveles de riesgo</h4>
              <div className="space-y-3">
                {RISK_LEVEL_DETAILS.map((risk) => (
                  <div key={risk.level} className={cn('p-3 rounded-sm border', risk.bgColor, 'border-transparent')}>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={cn('w-7 h-7 rounded-sm flex items-center justify-center text-xs font-bold text-white', risk.color)}>
                        {risk.level}
                      </span>
                      <div>
                        <span className={cn('text-sm font-semibold', risk.textColor)}>{risk.label}</span>
                        <span className="text-xs text-plan-muted ml-2">Score {risk.range}</span>
                      </div>
                    </div>
                    <p className="text-xs text-plan-secondary leading-relaxed ml-10">{risk.description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-[hsl(var(--sand-50))] rounded-sm">
                <p className="text-xs text-plan-secondary leading-relaxed">
                  <strong className="text-plan-primary">Nota:</strong> El scoring es una herramienta de apoyo, no una decisión automática. Siempre revisa el perfil completo del candidato antes de aprobar o rechazar.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CandidatosPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const allCandidates = getAllCandidates();

  // Apply filters
  const filteredCandidates = allCandidates.filter(c => {
    const status = candidateStatuses[c.id] || 'new';
    if (statusFilter !== 'all' && status !== statusFilter) return false;
    if (riskFilter !== 'all' && c.riskLevel !== riskFilter) return false;
    if (searchQuery &&
        !c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(c.propertyTitle?.toLowerCase().includes(searchQuery.toLowerCase())) &&
        !c.occupation.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Count by status
  const statusCounts = {
    all: allCandidates.length,
    new: allCandidates.filter(c => (candidateStatuses[c.id] || 'new') === 'new').length,
    reviewing: allCandidates.filter(c => candidateStatuses[c.id] === 'reviewing').length,
    approved: allCandidates.filter(c => candidateStatuses[c.id] === 'approved').length,
    rejected: allCandidates.filter(c => candidateStatuses[c.id] === 'rejected').length,
  };

  // Transform for table
  const tableData: CandidateRow[] = filteredCandidates.map(c => ({
    ...c,
    status: candidateStatuses[c.id] || 'new',
  }));

  // Map status to PLan status type
  const getStatusType = (status: StatusFilter): PlanStatusType => {
    const map: Record<StatusFilter, PlanStatusType> = {
      'new': 'new',
      'reviewing': 'in_progress',
      'approved': 'accepted',
      'rejected': 'rejected',
      'all': 'new',
    };
    return map[status];
  };

  const getStatusLabel = (status: StatusFilter): string => {
    const map: Record<StatusFilter, string> = {
      'new': 'Nuevo',
      'reviewing': 'En revisión',
      'approved': 'Aprobado',
      'rejected': 'Rechazado',
      'all': 'Todos',
    };
    return map[status];
  };

  // Table columns - compact and scannable
  const columns: PlanTableColumn<CandidateRow>[] = [
    {
      key: 'fullName',
      header: 'Candidato',
      sortable: true,
      type: 'avatar',
      nameKey: 'fullName',
      subtitleKey: 'occupation',
    },
    {
      key: 'propertyTitle',
      header: 'Propiedad',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-plan-muted" />
          <span className="text-sm text-plan-secondary truncate max-w-[200px]">
            {row.propertyTitle}
          </span>
        </div>
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
      key: 'numericScore',
      header: 'Score',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-16">
            <PlanProgressBar
              value={row.numericScore}
              size="sm"
              variant={row.numericScore >= 70 ? 'success' : row.numericScore >= 50 ? 'warning' : 'danger'}
            />
          </div>
          <span className="text-xs text-plan-secondary">{row.numericScore}</span>
        </div>
      ),
    },
    {
      key: 'totalIncome',
      header: 'Ingresos',
      sortable: true,
      render: (row) => (
        <span className="text-sm font-medium text-plan-primary">
          {formatCurrency(row.totalIncome)}
        </span>
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
      header: 'Fecha',
      sortable: true,
      type: 'date',
    },
  ];

  const handleRowClick = (row: CandidateRow) => {
    setSelectedCandidate(row);
    setSheetOpen(true);
  };

  const handleApprove = (candidate: Candidate) => {
    setSheetOpen(false);
    toast.success('Candidato aprobado', {
      description: `Iniciando proceso de contrato con ${candidate.fullName}`,
    });
    // Use ?new=true to always start fresh contract flow
    router.push(`/panel/${candidate.propertyId}/contract/${candidate.id}?new=true`);
  };

  const handleReject = (candidate: Candidate) => {
    setSheetOpen(false);
    toast('Candidato rechazado', {
      description: `${candidate.fullName} ha sido rechazado y notificado.`,
      icon: '❌',
    });
  };

  // Quick actions for detail sheet
  const getQuickActions = (candidate: Candidate): QuickAction[] => [
    {
      id: 'approve',
      label: 'Aprobar',
      icon: <UserCheck className="w-4 h-4" />,
      onClick: () => handleApprove(candidate),
      variant: 'primary',
    },
    {
      id: 'reject',
      label: 'Rechazar',
      icon: <UserX className="w-4 h-4" />,
      onClick: () => handleReject(candidate),
      variant: 'danger',
    },
    {
      id: 'message',
      label: 'Mensaje',
      icon: <MessageSquare className="w-4 h-4" />,
      onClick: () => router.push(`/panel/mensajes?to=${candidate.id}`),
    },
    {
      id: 'property',
      label: 'Ver propiedad',
      icon: <Building2 className="w-4 h-4" />,
      onClick: () => router.push(`/panel/${candidate.propertyId}`),
    },
  ];

  // Detail sections
  const getDetailSections = (candidate: Candidate): DetailSection[] => [
    {
      id: 'risk-score',
      title: 'Evaluación de Riesgo',
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <PlanRiskBadge level={candidate.riskLevel} />
            <div className="text-right">
              <span className="text-2xl font-bold text-plan-primary">{candidate.numericScore}</span>
              <span className="text-sm text-plan-secondary">/100</span>
            </div>
          </div>
          <PlanProgressBar
            value={candidate.numericScore}
            size="md"
            variant={candidate.numericScore >= 70 ? 'success' : candidate.numericScore >= 50 ? 'warning' : 'danger'}
          />
          {candidate.riskScore?.categories && (
            <div className="space-y-2 pt-2">
              {candidate.riskScore.categories.map(cat => (
                <div key={cat.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-plan-secondary">{cat.label}</span>
                    <span className="font-medium">{cat.score}%</span>
                  </div>
                  <PlanProgressBar value={cat.score} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'financial',
      title: 'Información Financiera',
      content: (
        <div className="space-y-2">
          <div className="flex justify-between py-2 border-b border-plan-border">
            <span className="text-sm text-plan-secondary">Ingresos mensuales</span>
            <span className="text-sm font-medium text-plan-primary">{formatCurrency(candidate.totalIncome)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-plan-border">
            <span className="text-sm text-plan-secondary">Obligaciones</span>
            <span className="text-sm font-medium text-plan-primary">{formatCurrency(candidate.monthlyObligations)}</span>
          </div>
          <div className="flex justify-between py-2 bg-emerald-50 px-2 -mx-2">
            <span className="text-sm text-emerald-700">Disponible para arriendo</span>
            <span className="text-sm font-semibold text-emerald-700">{formatCurrency(candidate.availableForRent)}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'employment',
      title: 'Información Laboral',
      content: (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-plan-secondary">Ocupación</span>
            <span className="text-sm text-plan-primary">{candidate.occupation}</span>
          </div>
          {candidate.companyName && (
            <div className="flex justify-between">
              <span className="text-sm text-plan-secondary">Empresa</span>
              <span className="text-sm text-plan-primary">{candidate.companyName}</span>
            </div>
          )}
          {candidate.timeAtJob && (
            <div className="flex justify-between">
              <span className="text-sm text-plan-secondary">Tiempo en cargo</span>
              <span className="text-sm text-plan-primary">{Math.floor(candidate.timeAtJob / 12)} años {candidate.timeAtJob % 12} meses</span>
            </div>
          )}
        </div>
      ),
    },
    ...(candidate.riskScore?.flags && candidate.riskScore.flags.length > 0 ? [{
      id: 'flags',
      title: 'Alertas',
      content: (
        <div className="space-y-2">
          {candidate.riskScore.flags.map(flag => (
            <div
              key={flag.id}
              className={cn(
                'flex items-start gap-2 p-2 text-sm',
                flag.severity === 'high' ? 'bg-red-50 text-red-700' :
                flag.severity === 'medium' ? 'bg-amber-50 text-amber-700' :
                'bg-blue-50 text-blue-700'
              )}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p>{flag.message}</p>
                {flag.suggestion && (
                  <p className="text-xs opacity-75 mt-1">{flag.suggestion}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ),
    }] : []),
  ];

  // Tabs configuration
  const tabs: PlanTab[] = [
    { id: 'all', label: 'Todos', count: statusCounts.all },
    { id: 'new', label: 'Nuevos', count: statusCounts.new },
    { id: 'reviewing', label: 'En revisión', count: statusCounts.reviewing },
    { id: 'approved', label: 'Aprobados', count: statusCounts.approved },
    { id: 'rejected', label: 'Rechazados', count: statusCounts.rejected },
  ];

  return (
    <div className="min-h-screen bg-plan-page">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-plan-primary">Candidatos</h1>
          <p className="mt-1 text-plan-secondary">
            Evalúa y gestiona las aplicaciones de tus candidatos
          </p>
        </header>

        {/* Scoring Guide — prominent placement */}
        <ScoringGuide />

        {/* Stats */}
        <PlanStatsGrid columns={4} className="mb-8">
          <PlanStatsCard
            label="Total candidatos"
            value={statusCounts.all}
            icon={Users}
          />
          <PlanStatsCard
            label="Nuevos"
            value={statusCounts.new}
            sublabel="Por revisar"
            variant={statusCounts.new > 0 ? 'accent' : 'default'}
          />
          <PlanStatsCard
            label="Aprobados"
            value={statusCounts.approved}
          />
          <PlanStatsCard
            label="Rechazados"
            value={statusCounts.rejected}
          />
        </PlanStatsGrid>

        {/* Tabs */}
        <PlanTabs
          tabs={tabs}
          activeTab={statusFilter}
          onChange={(tab) => setStatusFilter(tab as StatusFilter)}
          variant="underline"
          className="mb-6"
        />

        {/* Filters Row */}
        <div className="bg-card border border-plan-border p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-plan-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar candidato, propiedad u ocupación..."
                aria-label="Buscar candidato"
                className="w-full h-10 pl-10 pr-4 bg-muted border border-plan-border text-sm placeholder:text-plan-muted focus:outline-none focus:ring-1 focus:ring-plan-primary"
              />
            </div>

            {/* Risk Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-plan-secondary">Riesgo:</span>
              {(['all', 'A', 'B', 'C', 'D'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setRiskFilter(level)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium transition-colors',
                    riskFilter === level
                      ? 'bg-primary text-white'
                      : 'bg-muted text-plan-secondary hover:bg-muted'
                  )}
                >
                  {level === 'all' ? 'Todos' : level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table with Pagination */}
        <PlanTable
          data={tableData}
          columns={columns}
          keyExtractor={(row) => row.id}
          onRowClick={handleRowClick}
          emptyMessage={
            searchQuery || statusFilter !== 'all' || riskFilter !== 'all'
              ? 'No se encontraron candidatos con los filtros aplicados'
              : 'Cuando recibas aplicaciones, aparecerán aquí'
          }
          stickyHeader
          pagination
          pageSize={10}
        />
      </div>

      {/* Detail Sheet */}
      {selectedCandidate && (
        <PlanDetailSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          width="md"
          profile={{
            name: selectedCandidate.fullName,
            subtitle: selectedCandidate.occupation,
            status: getStatusType(candidateStatuses[selectedCandidate.id] || 'new'),
            statusLabel: getStatusLabel(candidateStatuses[selectedCandidate.id] || 'new'),
          }}
          contact={{
            email: selectedCandidate.email,
            phone: selectedCandidate.phone,
          }}
          quickActions={getQuickActions(selectedCandidate)}
          sections={getDetailSections(selectedCandidate)}
        />
      )}
    </div>
  );
}
