'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, MagnifyingGlass, Buildings, UserCheck, UserMinus, Eye, FileText, Chat, Warning, Question, CaretDown, Shield, Briefcase, CreditCard, House, Scales, UserPlus, Clock, CheckCircle, XCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { useCandidates, useCandidate, useCandidateDecision } from '@/lib/hooks/useLandlord';
import { landlordApi } from '@/lib/api/landlord.service';
import { DocumentAnalysisSection } from '@/components/landlord/DocumentAnalysisSection';
import { PlanTable, PlanTableColumn } from '@/components/ui/plan/PlanTable';
import { PlanTabs, PlanTab } from '@/components/ui/plan/PlanTabs';
import { PlanDetailSheet, QuickAction, DetailSection } from '@/components/ui/plan/PlanDetailSheet';
import { PlanRiskBadge, PlanStatusBadge, PlanStatusType } from '@/components/ui/plan/PlanStatusBadge';
import { PlanProgressBar } from '@/components/ui/plan/PlanProgressBar';
import { useI18n } from '@/lib/i18n';
import { Button, Spinner, Card, Badge } from '@/components/ui';
import { PageHeader, KpiCard, SearchInput, SegmentedControl, MonoLabel } from '@leasefy/cadence';
import type { Candidate } from '@/lib/types/candidate';

type StatusFunnel = 'all' | 'new' | 'reviewing' | 'approved' | 'rejected';
type RiskFunnel = 'all' | 'A' | 'B' | 'C' | 'D';

// Map LandlordCandidateStatus to StatusFunnel for display
const STATUS_TO_FUNNEL: Record<string, StatusFunnel> = {
  'pending': 'new',
  'approved': 'approved',
  'rejected': 'rejected',
  'more-info': 'reviewing',
};

interface CandidateRow extends Candidate {
  status: StatusFunnel;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

// The candidate-detail endpoint does not expose income figures, so they arrive
// as 0. Render an em-dash for unknown (0) instead of fabricating "$0" as a real
// number — unknown ≠ zero.
function formatCurrencyOrDash(value: number): string {
  return value > 0 ? formatCurrency(value) : '—';
}

function ScoringGuide() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  const SCORE_CATEGORIES = [
    { icon: Briefcase, labelKey: 'landlord.candidates.scoreCategoryEmployment', descKey: 'landlord.candidates.scoreCategoryEmploymentDesc', weight: '30%' },
    { icon: CreditCard, labelKey: 'landlord.candidates.scoreCategoryFinancial', descKey: 'landlord.candidates.scoreCategoryFinancialDesc', weight: '25%' },
    { icon: Shield, labelKey: 'landlord.candidates.scoreCategoryCredit', descKey: 'landlord.candidates.scoreCategoryCreditDesc', weight: '20%' },
    { icon: House, labelKey: 'landlord.candidates.scoreCategoryRental', descKey: 'landlord.candidates.scoreCategoryRentalDesc', weight: '15%' },
    { icon: Scales, labelKey: 'landlord.candidates.scoreCategoryProfile', descKey: 'landlord.candidates.scoreCategoryProfileDesc', weight: '10%' },
  ];

  const RISK_LEVEL_DETAILS = [
    { level: 'A', labelKey: 'landlord.candidates.riskExcellent', range: '85–100', color: 'bg-success', textColor: 'text-success', bgColor: 'bg-success-soft', descKey: 'landlord.candidates.riskExcellentDesc' },
    { level: 'B', labelKey: 'landlord.candidates.riskGood', range: '70–84', color: 'bg-primary', textColor: 'text-primary', bgColor: 'bg-primary-soft', descKey: 'landlord.candidates.riskGoodDesc' },
    { level: 'C', labelKey: 'landlord.candidates.riskFair', range: '50–69', color: 'bg-warning', textColor: 'text-warning', bgColor: 'bg-warning-soft', descKey: 'landlord.candidates.riskFairDesc' },
    { level: 'D', labelKey: 'landlord.candidates.riskPoor', range: '0–49', color: 'bg-danger', textColor: 'text-danger', bgColor: 'bg-danger-soft', descKey: 'landlord.candidates.riskPoorDesc' },
  ];

  return (
    <div className="mb-6">
      <Button
        type="button"
        variant="outline"
        hideArrow
        onClick={() => setOpen(!open)}
        className={cn('gap-2.5 rounded-lg', open && 'bg-primary-soft border-primary/30 text-primary')}
      >
        <Question className="w-4 h-4" />
        <span>{t('landlord.candidates.scoringGuideToggle')}</span>
        <CaretDown className={cn('w-3.5 h-3.5 transition-transform ml-1', open && 'rotate-180')} />
      </Button>

      {open && (
        <div className="mt-4 bg-surface rounded-lg border border-border overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-border-faint bg-surface-muted">
            <h3 className="text-base font-semibold text-fg">{t('landlord.candidates.scoringGuideTitle')}</h3>
            <p className="text-sm text-fg-muted mt-1">
              {t('landlord.candidates.scoringGuideDescription')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border-faint">
            {/* Left: Score categories */}
            <div className="p-6">
              <MonoLabel className="block mb-4 tracking-wider text-fg-muted">{t('landlord.candidates.categoriesTitle')}</MonoLabel>
              <div className="space-y-4">
                {SCORE_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <div key={cat.labelKey} className="flex gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary-soft flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-fg">{t(cat.labelKey)}</span>
                          <span className="text-xs text-fg-subtle">{t('landlord.candidates.weight', { weight: cat.weight })}</span>
                        </div>
                        <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">{t(cat.descKey)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Risk levels */}
            <div className="p-6">
              <MonoLabel className="block mb-4 tracking-wider text-fg-muted">{t('landlord.candidates.riskLevelsTitle')}</MonoLabel>
              <div className="space-y-3">
                {RISK_LEVEL_DETAILS.map((risk) => (
                  <div key={risk.level} className={cn('p-3 rounded-lg', risk.bgColor)}>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={cn('w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white', risk.color)}>
                        {risk.level}
                      </span>
                      <div>
                        <span className={cn('text-sm font-semibold', risk.textColor)}>{t(risk.labelKey)}</span>
                        <span className="text-xs text-fg-subtle ml-2">{t('landlord.candidates.scoreRange', { range: risk.range })}</span>
                      </div>
                    </div>
                    <p className="text-xs text-fg-muted leading-relaxed ml-10">{t(risk.descKey)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-warning-soft rounded-lg">
                <p className="text-xs text-warning leading-relaxed">
                  <strong>{t('landlord.candidates.scoringNoteLabel')}</strong> {t('landlord.candidates.scoringNote')}
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
  const { t } = useI18n();
  const [statusFunnel, setStatusFunnel] = useState<StatusFunnel>('all');
  const [riskFunnel, setRiskFunnel] = useState<RiskFunnel>('all');
  const [searchQuery, setMagnifyingGlassQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Fetch candidates from API
  const { candidates: landlordCandidates, stats, isLoading, error, refetch } = useCandidates();
  const { decide } = useCandidateDecision();

  // Map to Candidate type for display (extend with default values for full Candidate fields)
  const allCandidates: (Candidate & { _status: StatusFunnel })[] = landlordCandidates.map(lc => ({
    id: lc.id,
    fullName: lc.fullName,
    photo: lc.photo,
    age: lc.age,
    occupation: lc.occupation,
    riskLevel: lc.riskLevel,
    numericScore: lc.numericScore,
    appliedAt: lc.appliedAt,
    propertyId: lc.propertyId,
    propertyTitle: lc.propertyTitle,
    applicationId: '',
    documentType: 'cc' as const,
    documentNumber: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    currentAddress: '',
    timeAtCurrentAddress: 0,
    maritalStatus: 'single' as const,
    dependents: 0,
    employmentStatus: 'employed' as const,
    monthlySalary: 0,
    additionalIncome: 0,
    totalIncome: 0,
    monthlyObligations: 0,
    availableForRent: 0,
    riskScore: { level: lc.riskLevel, numericScore: lc.numericScore, categories: [], drivers: [], flags: [], suggestedConditions: [], aiExplanation: '' },
    previousLandlordsCount: 0,
    employmentReferencesCount: 0,
    personalReferencesCount: 0,
    hasIdDocument: false,
    hasIncomeProof: false,
    hasEmploymentLetter: false,
    hasBankStatements: false,
    _status: STATUS_TO_FUNNEL[lc.status] || 'new',
  }));

  // Apply filters
  const filteredCandidates = allCandidates.filter(c => {
    if (statusFunnel !== 'all' && c._status !== statusFunnel) return false;
    if (riskFunnel !== 'all' && c.riskLevel !== riskFunnel) return false;
    if (searchQuery &&
        !c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(c.propertyTitle?.toLowerCase().includes(searchQuery.toLowerCase())) &&
        !c.occupation.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Count by status
  const statusCounts = {
    all: stats.total,
    new: stats.pending,
    reviewing: allCandidates.filter(c => c._status === 'reviewing').length,
    approved: stats.approved,
    rejected: stats.rejected,
  };

  // Transform for table
  const tableData: CandidateRow[] = filteredCandidates.map(c => ({
    ...c,
    status: c._status,
  }));

  // Map status to Plan status type
  const getStatusType = (status: StatusFunnel): PlanStatusType => {
    const map: Record<StatusFunnel, PlanStatusType> = {
      'new': 'new',
      'reviewing': 'in_progress',
      'approved': 'accepted',
      'rejected': 'rejected',
      'all': 'new',
    };
    return map[status];
  };

  const getStatusLabel = (status: StatusFunnel): string => {
    const map: Record<StatusFunnel, string> = {
      'new': t('landlord.candidates.statusNew'),
      'reviewing': t('landlord.candidates.statusReviewing'),
      'approved': t('landlord.candidates.statusApproved'),
      'rejected': t('landlord.candidates.statusRejected'),
      'all': t('landlord.candidates.statusAll'),
    };
    return map[status];
  };

  // Table columns - compact and scannable
  const columns: PlanTableColumn<CandidateRow>[] = [
    {
      key: 'fullName',
      header: t('landlord.candidates.colCandidate'),
      sortable: true,
      type: 'avatar',
      nameKey: 'fullName',
      subtitleKey: 'occupation',
    },
    {
      key: 'propertyTitle',
      header: t('landlord.candidates.colProperty'),
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Buildings className="w-4 h-4 text-fg-subtle" />
          <span className="text-sm text-fg-muted truncate max-w-[200px]">
            {row.propertyTitle}
          </span>
        </div>
      ),
    },
    {
      key: 'riskLevel',
      header: t('landlord.candidates.colRisk'),
      sortable: true,
      render: (row) => (
        <PlanRiskBadge level={row.riskLevel} />
      ),
    },
    {
      key: 'numericScore',
      header: t('landlord.candidates.colScore'),
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
          <span className="text-xs text-fg-muted">{row.numericScore}</span>
        </div>
      ),
    },
    {
      key: 'totalIncome',
      header: t('landlord.candidates.colIncome'),
      sortable: true,
      render: (row) => (
        <span className="text-sm font-medium text-fg">
          {formatCurrencyOrDash(row.totalIncome)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('landlord.candidates.colStatus'),
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
      header: t('landlord.candidates.colDate'),
      sortable: true,
      type: 'date',
    },
  ];

  const handleRowClick = useCallback(async (row: CandidateRow) => {
    // Open immediately with the slim row so the sheet appears instantly, then
    // hydrate with the authoritative candidate detail. The global list endpoint
    // returns only slim cards (email/phone/finances/risk were hardcoded blanks),
    // so without this fetch the detail sheet rendered fabricated zeros.
    setSelectedCandidate(row);
    setSheetOpen(true);
    try {
      const full = await landlordApi.getCandidate(row.id);
      setSelectedCandidate((prev) => (prev && prev.id === row.id ? full : prev));
    } catch {
      toast.error(t('landlord.candidates.loadDetailError'));
    }
  }, [t]);

  const handleApprove = async (candidate: Candidate) => {
    const result = await decide(candidate.id, { decision: 'approved' });
    setSheetOpen(false);
    if (result) {
      toast.success(t('landlord.candidates.approvedToast'), {
        description: t('landlord.candidates.approvedToastDesc', { name: candidate.fullName }),
      });
      refetch();
      router.push(`/panel/${candidate.propertyId}/contract/${candidate.id}?new=true`);
    }
  };

  const handleReject = async (candidate: Candidate) => {
    const result = await decide(candidate.id, { decision: 'rejected' });
    setSheetOpen(false);
    if (result) {
      toast(t('landlord.candidates.rejectedToast'), {
        description: t('landlord.candidates.rejectedToastDesc', { name: candidate.fullName }),
        icon: '❌',
      });
      refetch();
    }
  };

  // Quick actions for detail sheet
  const getQuickActions = (candidate: Candidate): QuickAction[] => [
    {
      id: 'approve',
      label: t('landlord.candidates.approveAction'),
      icon: <UserCheck className="w-4 h-4" />,
      onClick: () => handleApprove(candidate),
      variant: 'primary',
    },
    {
      id: 'reject',
      label: t('landlord.candidates.rejectAction'),
      icon: <UserMinus className="w-4 h-4" />,
      onClick: () => handleReject(candidate),
      variant: 'danger',
    },
    {
      id: 'message',
      label: t('landlord.candidates.messageAction'),
      icon: <Chat className="w-4 h-4" />,
      onClick: () => router.push(`/panel/mensajes?to=${candidate.id}`),
    },
    {
      id: 'property',
      label: t('landlord.candidates.viewPropertyAction'),
      icon: <Buildings className="w-4 h-4" />,
      onClick: () => router.push(`/panel/${candidate.propertyId}`),
    },
  ];

  // Detail sections
  const getDetailSections = (candidate: Candidate): DetailSection[] => [
    {
      id: 'risk-score',
      title: t('landlord.candidates.riskAssessmentTitle'),
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <PlanRiskBadge level={candidate.riskLevel} />
            <div className="text-right">
              <span className="text-2xl font-bold font-mono tabular-nums text-fg">{candidate.numericScore}</span>
              <span className="text-sm text-fg-muted">/100</span>
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
                    <span className="text-fg-muted">{cat.label}</span>
                    <span className="font-medium text-fg">{cat.score}%</span>
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
      id: 'ai-analysis',
      title: 'Analisis IA de documentos',
      content: (
        <DocumentAnalysisSection applicationId={candidate.applicationId || candidate.id} />
      ),
    },
    {
      id: 'financial',
      title: t('landlord.candidates.financialTitle'),
      content: (
        <div className="space-y-2">
          <div className="flex justify-between py-2 border-b border-border-faint">
            <span className="text-sm text-fg-muted">{t('landlord.candidates.monthlyIncome')}</span>
            <span className="text-sm font-medium text-fg">{formatCurrencyOrDash(candidate.totalIncome)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border-faint">
            <span className="text-sm text-fg-muted">{t('landlord.candidates.obligations')}</span>
            <span className="text-sm font-medium text-fg">{formatCurrencyOrDash(candidate.monthlyObligations)}</span>
          </div>
          <div className="flex justify-between py-2 bg-success-soft px-3 -mx-3 rounded-md">
            <span className="text-sm text-success">{t('landlord.candidates.availableForRent')}</span>
            <span className="text-sm font-semibold text-success">{formatCurrencyOrDash(candidate.availableForRent)}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'employment',
      title: t('landlord.candidates.employmentTitle'),
      content: (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-fg-muted">{t('landlord.candidates.occupation')}</span>
            <span className="text-sm text-fg">{candidate.occupation}</span>
          </div>
          {candidate.companyName && (
            <div className="flex justify-between">
              <span className="text-sm text-fg-muted">{t('landlord.candidates.company')}</span>
              <span className="text-sm text-fg">{candidate.companyName}</span>
            </div>
          )}
          {candidate.timeAtJob && (
            <div className="flex justify-between">
              <span className="text-sm text-fg-muted">{t('landlord.candidates.timeAtJob')}</span>
              <span className="text-sm text-fg">{t('landlord.candidates.yearsMonths', { years: Math.floor(candidate.timeAtJob / 12), months: candidate.timeAtJob % 12 })}</span>
            </div>
          )}
        </div>
      ),
    },
    ...(candidate.riskScore?.flags && candidate.riskScore.flags.length > 0 ? [{
      id: 'flags',
      title: t('landlord.candidates.alertsTitle'),
      content: (
        <div className="space-y-2">
          {candidate.riskScore.flags.map(flag => (
            <div
              key={flag.id}
              className={cn(
                'flex items-start gap-2 p-3 text-sm rounded-md',
                flag.severity === 'high' ? 'bg-danger-soft text-danger' :
                flag.severity === 'medium' ? 'bg-warning-soft text-warning' :
                'bg-primary-soft text-primary'
              )}
            >
              <Warning className="w-4 h-4 flex-shrink-0 mt-0.5" />
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
    { id: 'all', label: t('landlord.candidates.tabAll'), count: statusCounts.all },
    { id: 'new', label: t('landlord.candidates.tabNew'), count: statusCounts.new },
    { id: 'reviewing', label: t('landlord.candidates.tabReviewing'), count: statusCounts.reviewing },
    { id: 'approved', label: t('landlord.candidates.tabApproved'), count: statusCounts.approved },
    { id: 'rejected', label: t('landlord.candidates.tabRejected'), count: statusCounts.rejected },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <PageHeader
          title={t('landlord.candidates.title')}
          subtitle={t('landlord.candidates.subtitle')}
          className="mb-6"
        />

        {/* Scoring Guide — prominent placement */}
        <ScoringGuide />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            label={t('landlord.candidates.totalCandidates')}
            value={String(statusCounts.all)}
            icon={<Users className="w-5 h-5" />}
          />

          <Card className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-fg">{statusCounts.new}</p>
            <p className="text-sm text-fg-muted">{t('landlord.candidates.newCandidates')}</p>
            {statusCounts.new > 0 && (
              <Badge variant="default" className="mt-2">
                {t('landlord.candidates.toReview')}
              </Badge>
            )}
          </Card>

          <KpiCard
            label={t('landlord.candidates.approvedCandidates')}
            value={String(statusCounts.approved)}
            icon={<CheckCircle className="w-5 h-5" />}
          />

          <KpiCard
            label={t('landlord.candidates.rejectedCandidates')}
            value={String(statusCounts.rejected)}
            icon={<XCircle className="w-5 h-5" />}
          />
        </div>

        {/* Status funnel — exclusive selector → SegmentedControl */}
        <div className="mb-6">
          <SegmentedControl<StatusFunnel>
            value={statusFunnel}
            onChange={setStatusFunnel}
            aria-label="Filtrar por estado"
            options={tabs.map((tab) => ({
              value: tab.id as StatusFunnel,
              ariaLabel: tab.label,
              label: (
                <span className="flex items-center gap-2">
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-surface-muted text-fg-muted tabular-nums">
                      {tab.count}
                    </span>
                  )}
                </span>
              ),
            }))}
          />
        </div>

        {/* Funnels Row */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* MagnifyingGlass */}
            <div className="flex-1">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setMagnifyingGlassQuery(e.target.value)}
                onClear={() => setMagnifyingGlassQuery('')}
                placeholder={t('landlord.candidates.searchPlaceholder')}
                aria-label={t('landlord.candidates.searchLabel')}
                inputSize="md"
              />
            </div>

            {/* Risk funnel — exclusive selector → SegmentedControl */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-fg-muted">{t('landlord.candidates.riskLabel')}</span>
              <SegmentedControl<RiskFunnel>
                value={riskFunnel}
                onChange={setRiskFunnel}
                aria-label={t('landlord.candidates.riskLabel')}
                options={(['all', 'A', 'B', 'C', 'D'] as const).map((level) => ({
                  value: level,
                  ariaLabel: level === 'all' ? t('landlord.candidates.riskAll') : level,
                  label: level === 'all' ? t('landlord.candidates.riskAll') : level,
                }))}
              />
            </div>
          </div>
        </Card>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft p-6 text-center">
            <p className="text-sm text-danger">{error}</p>
            <Button variant="link" hideArrow onClick={refetch} className="mt-3 h-auto p-0 text-danger hover:text-danger">
              Reintentar
            </Button>
          </div>
        )}

        {/* Table with Pagination */}
        {!isLoading && !error && allCandidates.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('landlord.candidates.emptyTitle')}
            description={t('landlord.candidates.emptyDescription')}
            action={{ label: t('landlord.candidates.emptyAction'), href: "/panel/propiedades" }}
          />
        ) : (
          <div className="bg-surface rounded-lg border border-border overflow-hidden">
            <PlanTable
              data={tableData}
              columns={columns}
              keyExtractor={(row) => row.id}
              onRowClick={handleRowClick}
              emptyMessage={
                searchQuery || statusFunnel !== 'all' || riskFunnel !== 'all'
                  ? t('landlord.candidates.emptyFilteredMessage')
                  : t('landlord.candidates.emptyDefaultMessage')
              }
              stickyHeader
              pagination
              pageSize={10}
            />
          </div>
        )}
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
            status: getStatusType(allCandidates.find(c => c.id === selectedCandidate.id)?._status || 'new'),
            statusLabel: getStatusLabel(allCandidates.find(c => c.id === selectedCandidate.id)?._status || 'new'),
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
