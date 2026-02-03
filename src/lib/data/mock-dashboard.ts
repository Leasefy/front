/**
 * Aggregated dashboard data for landlord panel
 * Combines data from leases, contracts, and candidates
 */

import { getLandlordStats, getLeasesForLandlord, MOCK_PAYMENTS } from './mock-leases';
import { getContractsForLandlord, getPendingContracts } from './mock-contracts';
import { LANDLORD_PROPERTIES, getAllLandlordCandidates } from './mock-landlord-data';
import { getPendingVisitCount } from './mock-visits';
import type { RiskLevel } from '@/lib/types/risk-score';

// ============================================================================
// Types
// ============================================================================

export interface FinancialStats {
  monthlyIncome: number;
  activeLeases: number;
  collectionRate: number;
  pendingPayments: number;
  latePayments: number;
}

export interface UrgentAction {
  id: string;
  type: 'signature' | 'late_payment' | 'pending_review' | 'ending_lease' | 'pending_visit';
  title: string;
  description: string;
  count: number;
  href: string;
  priority: 'high' | 'medium' | 'low';
}

export interface RiskDistribution {
  A: number;
  B: number;
  C: number;
  D: number;
  total: number;
}

export interface UpcomingEvent {
  id: string;
  type: 'lease_ending' | 'payment_due' | 'contract_renewal' | 'inspection';
  title: string;
  description: string;
  date: string;
  daysUntil: number;
  href?: string;
}

export interface DashboardData {
  financial: FinancialStats;
  urgentActions: UrgentAction[];
  riskDistribution: RiskDistribution;
  upcomingEvents: UpcomingEvent[];
  landlordName: string;
}

// ============================================================================
// Data Aggregation Functions
// ============================================================================

/**
 * Calculate financial statistics for landlord
 */
function getFinancialStats(landlordId: string): FinancialStats {
  const leaseStats = getLandlordStats(landlordId);
  const leases = getLeasesForLandlord(landlordId);

  // Calculate total monthly income from active leases
  const activeLeases = leases.filter(l => l.status === 'active' || l.status === 'ending_soon');
  const monthlyIncome = activeLeases.reduce((sum, l) => sum + l.monthlyRent + l.adminFee, 0);

  // Calculate collection rate (paid vs total due payments)
  const leaseIds = activeLeases.map(l => l.id);
  const relevantPayments = MOCK_PAYMENTS.filter(p => leaseIds.includes(p.leaseId));
  const rentPayments = relevantPayments.filter(p => p.concept === 'rent');
  const paidPayments = rentPayments.filter(p => p.status === 'paid' || p.status === 'late');
  const collectionRate = rentPayments.length > 0
    ? Math.round((paidPayments.length / rentPayments.length) * 100)
    : 100;

  return {
    monthlyIncome,
    activeLeases: leaseStats.activeLeases + leaseStats.endingSoon,
    collectionRate,
    pendingPayments: leaseStats.pendingPayments,
    latePayments: leaseStats.latePayments,
  };
}

/**
 * Get urgent actions requiring landlord attention
 */
function getUrgentActions(landlordId: string): UrgentAction[] {
  const actions: UrgentAction[] = [];

  // Check pending contract signatures
  const pendingContracts = getPendingContracts(landlordId);
  const pendingLandlordSignature = pendingContracts.filter(c => c.status === 'pending_landlord');
  const pendingTenantSignature = pendingContracts.filter(c => c.status === 'pending_tenant');

  if (pendingLandlordSignature.length > 0) {
    actions.push({
      id: 'action-signature-landlord',
      type: 'signature',
      title: 'Firmas pendientes',
      description: `${pendingLandlordSignature.length} contrato${pendingLandlordSignature.length > 1 ? 's' : ''} esperando tu firma`,
      count: pendingLandlordSignature.length,
      href: '/panel/contratos',
      priority: 'high',
    });
  }

  if (pendingTenantSignature.length > 0) {
    actions.push({
      id: 'action-signature-tenant',
      type: 'signature',
      title: 'Esperando firma del inquilino',
      description: `${pendingTenantSignature.length} contrato${pendingTenantSignature.length > 1 ? 's' : ''} pendiente${pendingTenantSignature.length > 1 ? 's' : ''} de firma`,
      count: pendingTenantSignature.length,
      href: '/panel/contratos',
      priority: 'medium',
    });
  }

  // Check late payments
  const leaseStats = getLandlordStats(landlordId);
  if (leaseStats.latePayments > 0) {
    actions.push({
      id: 'action-late-payment',
      type: 'late_payment',
      title: 'Pagos atrasados',
      description: `${leaseStats.latePayments} pago${leaseStats.latePayments > 1 ? 's' : ''} con mora`,
      count: leaseStats.latePayments,
      href: '/panel/arriendos',
      priority: 'high',
    });
  }

  // Check pending candidate reviews
  const pendingReviews = LANDLORD_PROPERTIES.reduce((sum, p) => sum + p.pendingCount, 0);
  if (pendingReviews > 0) {
    actions.push({
      id: 'action-pending-review',
      type: 'pending_review',
      title: 'Candidatos por revisar',
      description: `${pendingReviews} candidato${pendingReviews > 1 ? 's' : ''} esperando evaluacion`,
      count: pendingReviews,
      href: `/panel/${LANDLORD_PROPERTIES[0]?.id || ''}`,
      priority: 'medium',
    });
  }

  // Check ending leases
  const leases = getLeasesForLandlord(landlordId);
  const endingSoon = leases.filter(l => l.status === 'ending_soon');
  if (endingSoon.length > 0) {
    actions.push({
      id: 'action-ending-lease',
      type: 'ending_lease',
      title: 'Contratos por vencer',
      description: `${endingSoon.length} arriendo${endingSoon.length > 1 ? 's' : ''} termina pronto`,
      count: endingSoon.length,
      href: '/panel/arriendos',
      priority: 'medium',
    });
  }

  // Check pending visits
  const pendingVisits = getPendingVisitCount();
  if (pendingVisits > 0) {
    actions.push({
      id: 'action-pending-visit',
      type: 'pending_visit',
      title: 'Visitas por confirmar',
      description: `${pendingVisits} visita${pendingVisits > 1 ? 's' : ''} solicitada${pendingVisits > 1 ? 's' : ''} pendiente${pendingVisits > 1 ? 's' : ''}`,
      count: pendingVisits,
      href: '/panel/visitas',
      priority: 'medium',
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

/**
 * Calculate risk distribution of all candidates
 */
function getRiskDistribution(): RiskDistribution {
  const candidates = getAllLandlordCandidates();

  const distribution: RiskDistribution = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    total: candidates.length,
  };

  for (const candidate of candidates) {
    const level = candidate.riskLevel as RiskLevel;
    if (level in distribution) {
      distribution[level]++;
    }
  }

  return distribution;
}

/**
 * Get upcoming events for the landlord
 */
function getUpcomingEvents(landlordId: string): UpcomingEvent[] {
  const events: UpcomingEvent[] = [];
  const now = new Date();

  // Check for ending leases
  const leases = getLeasesForLandlord(landlordId);
  for (const lease of leases) {
    const endDate = new Date(lease.endDate);
    const daysUntil = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil > 0 && daysUntil <= 90) {
      events.push({
        id: `event-lease-${lease.id}`,
        type: 'lease_ending',
        title: 'Contrato por vencer',
        description: lease.propertyTitle,
        date: lease.endDate,
        daysUntil,
        href: '/panel/arriendos',
      });
    }
  }

  // Check pending payments
  const leaseIds = leases.map(l => l.id);
  const pendingPayments = MOCK_PAYMENTS.filter(
    p => leaseIds.includes(p.leaseId) && p.status === 'pending'
  );

  for (const payment of pendingPayments) {
    const dueDate = new Date(payment.dueDate);
    const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil >= -5 && daysUntil <= 30) {
      const lease = leases.find(l => l.id === payment.leaseId);
      events.push({
        id: `event-payment-${payment.id}`,
        type: 'payment_due',
        title: daysUntil < 0 ? 'Pago vencido' : 'Pago esperado',
        description: lease?.propertyTitle || 'Arriendo mensual',
        date: payment.dueDate,
        daysUntil,
        href: '/panel/arriendos',
      });
    }
  }

  // Sort by date
  return events.sort((a, b) => a.daysUntil - b.daysUntil);
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Get complete dashboard data for a landlord
 */
export function getDashboardData(landlordId: string = 'landlord-001'): DashboardData {
  return {
    financial: getFinancialStats(landlordId),
    urgentActions: getUrgentActions(landlordId),
    riskDistribution: getRiskDistribution(),
    upcomingEvents: getUpcomingEvents(landlordId),
    landlordName: 'Carlos Alberto Mendez',
  };
}

/**
 * Format currency in Colombian Pesos
 */
export function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    const millions = amount / 1000000;
    return `$${millions.toFixed(1)}M`;
  }
  if (amount >= 1000) {
    const thousands = amount / 1000;
    return `$${thousands.toFixed(0)}k`;
  }
  return `$${amount.toLocaleString('es-CO')}`;
}

/**
 * Format currency with full detail
 */
export function formatCurrencyFull(amount: number): string {
  return `$${amount.toLocaleString('es-CO')}`;
}
