/**
 * Landlord dashboard components
 * @module components/landlord
 */

// Dashboard layout components (from redesign)
export { DashboardSidebar } from './DashboardSidebar';
export { DashboardHeader } from './DashboardHeader';

// Dashboard KPI components (from redesign)
export { KPICard } from './KPICard';
export type { KPICardProps } from './KPICard';
export { KPIGrid } from './KPIGrid';

// Dashboard components (from PLAN-01)
export { DashboardSummary } from './DashboardSummary';
export { PropertyDashboardCard } from './PropertyDashboardCard';

// Risk visualization (from redesign)
export { RiskGauge, RiskGaugeMini } from './RiskGauge';

// Activity feed (from redesign)
export { ActivityFeed } from './ActivityFeed';

// Property detail components (from redesign)
export { TabNavigation } from './TabNavigation';
export type { Tab } from './TabNavigation';
export { PropertyHeader } from './PropertyHeader';

// Candidate display components (from PLAN-02)
export { CandidateCard } from './CandidateCard';
export { CandidateMetrics } from './CandidateMetrics';
export { AISnippet } from './AISnippet';
export { CandidateList } from './CandidateList';

// Decision workflow components (from PLAN-03)
export { DecisionButtons } from './DecisionButtons';
export { CandidateDetail } from './CandidateDetail';
export { CandidateNotes } from './CandidateNotes';
export { DecisionConfirmation } from './DecisionConfirmation';
export { ContractConfirmation } from './ContractConfirmation';

// Re-export types for convenience
export type { CandidateCardProps } from './CandidateCard';
export type { CandidateMetricsProps } from './CandidateMetrics';
export type { AISnippetProps } from './AISnippet';
export type { CandidateListProps } from './CandidateList';
export type { DashboardSummaryProps } from './DashboardSummary';
export type { PropertyDashboardCardProps } from './PropertyDashboardCard';
export type { DecisionButtonsProps } from './DecisionButtons';
export type { CandidateDetailProps } from './CandidateDetail';
export type { CandidateNotesProps } from './CandidateNotes';
export type { DecisionConfirmationProps } from './DecisionConfirmation';
export type { ContractConfirmationProps } from './ContractConfirmation';
