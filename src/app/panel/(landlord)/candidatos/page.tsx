'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, MagnifyingGlass, Buildings, UserCheck, UserMinus, Eye, FileText, Chat, Warning, Question, CaretDown, Shield, Briefcase, CreditCard, House, Scales, UserPlus, Clock, CheckCircle, XCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { getAllCandidates, getCandidateById } from '@/lib/data/mock-candidates';
import { formatCurrency } from '@/lib/data/mock-dashboard';
import { PlanTable, PlanTableColumn } from '@/components/ui/plan/PlanTable';
import { PlanTabs, PlanTab } from '@/components/ui/plan/PlanTabs';
import { PlanDetailSheet, QuickAction, DetailSection } from '@/components/ui/plan/PlanDetailSheet';
import { PlanRiskBadge, PlanStatusBadge, PlanStatusType } from '@/components/ui/plan/PlanStatusBadge';
import { PlanProgressBar } from '@/components/ui/plan/PlanProgressBar';
import { useTranslation } from '@/lib/i18n';
import type { Candidate } from '@/lib/types/candidate';

type StatusFunnel = 'all' | 'new' | 'reviewing' | 'approved' | 'rejected';
type RiskFunnel = 'all' | 'A' | 'B' | 'C' | 'D';

// Simulated status for candidates
const candidateStatuses: Record<string, StatusFunnel> = {
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
  status: StatusFunnel;
}

function ScoringGuide() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const SCORE_CATEGORIES = [
    { icon: Briefcase, labelKey: 'landlord.candidates.scoreCategoryEmployment', descKey: 'landlord.candidates.scoreCategoryEmploymentDesc', weight: '30%' },
    { icon: CreditCard, labelKey: 'landlord.candidates.scoreCategoryFinancial', descKey: 'landlord.candidates.scoreCategoryFinancialDesc', weight: '25%' },
    { icon: Shield, labelKey: 'landlord.candidates.scoreCategoryCredit', descKey: 'landlord.candidates.scoreCategoryCreditDesc', weight: '20%' },
    { icon: House, labelKey: 'landlord.candidates.scoreCategoryRental', descKey: 'landlord.candidates.scoreCategoryRentalDesc', weight: '15%' },
    { icon: Scales, labelKey: 'landlord.candidates.scoreCategoryProfile', descKey: 'landlord.candidates.scoreCategoryProfileDesc', weight: '10%' },
  ];

  const RISK_LEVEL_DETAILS = [
    { level: 'A', labelKey: 'landlord.candidates.riskExcellent', range: '85–100', color: 'bg-emerald-500', textColor: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', descKey: 'landlord.candidates.riskExcellentDesc' },
    { level: 'B', labelKey: 'landlord.candidates.riskGood', range: '70–84', color: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20', descKey: 'landlord.candidates.riskGoodDesc' },
    { level: 'C', labelKey: 'landlord.candidates.riskFair', range: '50–69', color: 'bg-amber-500', textColor: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20', descKey: 'landlord.candidates.riskFairDesc' },
    { level: 'D', labelKey: 'landlord.candidates.riskPoor', range: '0–49', color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20', descKey: 'landlord.candidates.riskPoorDesc' },
  ];

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border',
          open
            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
            : 'bg-white dark:bg-[#222224] border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10'
        )}
      >
        <Question className="w-4 h-4" />
        <span>{t('landlord.candidates.scoringGuideToggle')}</span>
        <CaretDown className={cn('w-3.5 h-3.5 transition-transform ml-1', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mt-4 bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{t('landlord.candidates.scoringGuideTitle')}</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {t('landlord.candidates.scoringGuideDescription')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-neutral-100 dark:divide-neutral-700">
            {/* Left: Score categories */}
            <div className="p-6">
              <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-4 uppercase tracking-wider">{t('landlord.candidates.categoriesTitle')}</h4>
              <div className="space-y-4">
                {SCORE_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <div key={cat.labelKey} className="flex gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-neutral-900 dark:text-white">{t(cat.labelKey)}</span>
                          <span className="text-xs text-neutral-400 dark:text-neutral-500">{t('landlord.candidates.weight', { weight: cat.weight })}</span>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">{t(cat.descKey)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Risk levels */}
            <div className="p-6">
              <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-4 uppercase tracking-wider">{t('landlord.candidates.riskLevelsTitle')}</h4>
              <div className="space-y-3">
                {RISK_LEVEL_DETAILS.map((risk) => (
                  <div key={risk.level} className={cn('p-3 rounded-xl', risk.bgColor)}>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white', risk.color)}>
                        {risk.level}
                      </span>
                      <div>
                        <span className={cn('text-sm font-semibold', risk.textColor)}>{t(risk.labelKey)}</span>
                        <span className="text-xs text-neutral-400 dark:text-neutral-500 ml-2">{t('landlord.candidates.scoreRange', { range: risk.range })}</span>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed ml-10">{t(risk.descKey)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
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
  const { t } = useTranslation();
  const [statusFunnel, setStatusFunnel] = useState<StatusFunnel>('all');
  const [riskFunnel, setRiskFunnel] = useState<RiskFunnel>('all');
  const [searchQuery, setMagnifyingGlassQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const allCandidates = getAllCandidates();

  // Apply filters
  const filteredCandidates = allCandidates.filter(c => {
    const status = candidateStatuses[c.id] || 'new';
    if (statusFunnel !== 'all' && status !== statusFunnel) return false;
    if (riskFunnel !== 'all' && c.riskLevel !== riskFunnel) return false;
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
          <Buildings className="w-4 h-4 text-neutral-400" />
          <span className="text-sm text-neutral-600 dark:text-neutral-300 truncate max-w-[200px]">
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
          <span className="text-xs text-neutral-500 dark:text-neutral-400">{row.numericScore}</span>
        </div>
      ),
    },
    {
      key: 'totalIncome',
      header: t('landlord.candidates.colIncome'),
      sortable: true,
      render: (row) => (
        <span className="text-sm font-medium text-neutral-900 dark:text-white">
          {formatCurrency(row.totalIncome)}
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

  const handleRowClick = (row: CandidateRow) => {
    setSelectedCandidate(row);
    setSheetOpen(true);
  };

  const handleApprove = (candidate: Candidate) => {
    setSheetOpen(false);
    toast.success(t('landlord.candidates.approvedToast'), {
      description: t('landlord.candidates.approvedToastDesc', { name: candidate.fullName }),
    });
    // Use ?new=true to always start fresh contract flow
    router.push(`/panel/${candidate.propertyId}/contract/${candidate.id}?new=true`);
  };

  const handleReject = (candidate: Candidate) => {
    setSheetOpen(false);
    toast(t('landlord.candidates.rejectedToast'), {
      description: t('landlord.candidates.rejectedToastDesc', { name: candidate.fullName }),
      icon: '❌',
    });
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
              <span className="text-2xl font-bold text-neutral-900 dark:text-white">{candidate.numericScore}</span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">/100</span>
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
                    <span className="text-neutral-500 dark:text-neutral-400">{cat.label}</span>
                    <span className="font-medium text-neutral-900 dark:text-white">{cat.score}%</span>
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
      title: t('landlord.candidates.financialTitle'),
      content: (
        <div className="space-y-2">
          <div className="flex justify-between py-2 border-b border-neutral-100 dark:border-neutral-700">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.candidates.monthlyIncome')}</span>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">{formatCurrency(candidate.totalIncome)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-neutral-100 dark:border-neutral-700">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.candidates.obligations')}</span>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">{formatCurrency(candidate.monthlyObligations)}</span>
          </div>
          <div className="flex justify-between py-2 bg-emerald-50 dark:bg-emerald-900/20 px-3 -mx-3 rounded-lg">
            <span className="text-sm text-emerald-700 dark:text-emerald-400">{t('landlord.candidates.availableForRent')}</span>
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{formatCurrency(candidate.availableForRent)}</span>
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
            <span className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.candidates.occupation')}</span>
            <span className="text-sm text-neutral-900 dark:text-white">{candidate.occupation}</span>
          </div>
          {candidate.companyName && (
            <div className="flex justify-between">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.candidates.company')}</span>
              <span className="text-sm text-neutral-900 dark:text-white">{candidate.companyName}</span>
            </div>
          )}
          {candidate.timeAtJob && (
            <div className="flex justify-between">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.candidates.timeAtJob')}</span>
              <span className="text-sm text-neutral-900 dark:text-white">{t('landlord.candidates.yearsMonths', { years: Math.floor(candidate.timeAtJob / 12), months: candidate.timeAtJob % 12 })}</span>
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
                'flex items-start gap-2 p-3 text-sm rounded-lg',
                flag.severity === 'high' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                flag.severity === 'medium' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
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
    <div className="min-h-screen bg-stone-50 dark:bg-[#1a1a1c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">{t('landlord.candidates.title')}</h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {t('landlord.candidates.subtitle')}
          </p>
        </header>

        {/* Scoring Guide — prominent placement */}
        <ScoringGuide />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                <Users className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{statusCounts.all}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.candidates.totalCandidates')}</p>
          </div>

          <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{statusCounts.new}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.candidates.newCandidates')}</p>
            {statusCounts.new > 0 && (
              <span className="inline-flex items-center mt-2 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-medium rounded-full">
                {t('landlord.candidates.toReview')}
              </span>
            )}
          </div>

          <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{statusCounts.approved}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.candidates.approvedCandidates')}</p>
          </div>

          <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{statusCounts.rejected}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.candidates.rejectedCandidates')}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-1.5 mb-6 inline-flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFunnel(tab.id as StatusFunnel)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-xl transition-all flex items-center gap-2',
                statusFunnel === tab.id
                  ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full',
                  statusFunnel === tab.id
                    ? 'bg-neutral-200 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-200'
                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Funnels Row */}
        <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* MagnifyingGlass */}
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setMagnifyingGlassQuery(e.target.value)}
                placeholder={t('landlord.candidates.searchPlaceholder')}
                aria-label={t('landlord.candidates.searchLabel')}
                className="w-full h-11 pl-10 pr-4 bg-neutral-100 dark:bg-neutral-800 border-0 rounded-xl text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Risk Funnel */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">{t('landlord.candidates.riskLabel')}</span>
              <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
                {(['all', 'A', 'B', 'C', 'D'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setRiskFunnel(level)}
                    className={cn(
                      'px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
                      riskFunnel === level
                        ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                    )}
                  >
                    {level === 'all' ? t('landlord.candidates.riskAll') : level}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table with Pagination */}
        {allCandidates.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('landlord.candidates.emptyTitle')}
            description={t('landlord.candidates.emptyDescription')}
            action={{ label: t('landlord.candidates.emptyAction'), href: "/panel/propiedades" }}
          />
        ) : (
          <div className="bg-white dark:bg-[#222224] rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
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
