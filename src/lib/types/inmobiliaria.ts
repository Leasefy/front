/**
 * Types for the Inmobiliaria (Real Estate Agency) module
 * Handles portfolio management, agents, property owners, and collections
 */

import type { BankCode, AccountType } from './payment-accounts';

// ============================================================================
// Propietario (Property Owner/Client)
// ============================================================================

export type DocumentType = 'CC' | 'CE' | 'NIT' | 'PASSPORT';

export interface PropietarioBankAccount {
  bank: BankCode;
  accountType: AccountType;
  accountNumber: string;
  accountHolder: string;
}

export interface Propietario {
  id: string;
  name: string;
  email: string;
  phone: string;
  documentType: DocumentType;
  documentNumber: string;
  address?: string;
  city?: string;
  bankAccount: PropietarioBankAccount;
  propertyCount: number;
  activeLeases: number;
  totalMonthlyRent: number;
  pendingBalance: number;
  lastPaymentDate?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PropietarioFormData {
  name: string;
  email: string;
  phone: string;
  documentType: DocumentType;
  documentNumber: string;
  address?: string;
  city?: string;
  bankCode: BankCode | '';
  accountType: AccountType | '';
  accountNumber: string;
  accountHolder: string;
  notes?: string;
}

// ============================================================================
// Agente Inmobiliario (Real Estate Agent)
// ============================================================================

export type AgenteRole = 'agent' | 'coordinator' | 'director';
export type AgenteStatus = 'active' | 'inactive' | 'on_leave';

export interface AgenteMetrics {
  assignedProperties: number;
  activeLeases: number;
  closedThisMonth: number;
  closedThisYear: number;
  totalCommissions: number;
  commissionsThisMonth: number;
  avgDaysToClose: number;
  conversionRate: number;
}

export interface Agente {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: AgenteRole;
  status: AgenteStatus;
  commissionSplit: number; // % of agency commission that goes to agent
  assignedPropertyIds: string[];
  hireDate: string;
  zone?: string; // Geographic zone they cover
  specialization?: 'residential' | 'commercial' | 'both';
  metrics: AgenteMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface AgenteFormData {
  name: string;
  email: string;
  phone: string;
  role: AgenteRole;
  commissionSplit: number;
  zone?: string;
  specialization?: 'residential' | 'commercial' | 'both';
}

// ============================================================================
// Consignacion (Property Consignment Agreement)
// ============================================================================

export type ConsignacionStatus = 'active' | 'terminated' | 'expired' | 'pending';
export type PropertyAvailability = 'available' | 'rented' | 'in_process' | 'maintenance';

export interface Consignacion {
  id: string;
  propertyId: string;
  propietarioId: string;
  agenteId: string;

  // Property info (denormalized for convenience)
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  propertyZone: string;
  propertyType: 'apartment' | 'house' | 'studio' | 'commercial' | 'office' | 'warehouse';
  propertyThumbnail?: string;
  monthlyRent: number;
  adminFee?: number;

  // Consignment terms
  commissionPercent: number; // Agency commission (typically 8-12%)
  contractDate: string;
  contractEndDate?: string;
  minimumTerm?: number; // Minimum lease term in months

  // Status
  status: ConsignacionStatus;
  availability: PropertyAvailability;
  currentLeaseId?: string;
  currentTenantName?: string;
  leaseEndDate?: string;

  // Documents
  consignmentContractUrl?: string;
  actaEntregaUrl?: string;
  photosUrls?: string[];

  // Inventory
  inventoryItems?: InventoryItem[];

  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
  photoUrl?: string;
}

export interface ConsignacionFormData {
  propietarioId: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  propertyZone: string;
  propertyType: Consignacion['propertyType'];
  monthlyRent: number;
  adminFee?: number;
  commissionPercent: number;
  agenteId: string;
  minimumTerm?: number;
}

// ============================================================================
// Pipeline de Arriendos (Rental Pipeline)
// ============================================================================

export type PipelineStage =
  | 'lead'              // Interesado - Initial contact
  | 'visit_scheduled'   // Visita programada
  | 'visit_done'        // Visita realizada
  | 'application'       // Aplicación enviada
  | 'evaluation'        // En evaluación
  | 'approved'          // Aprobado
  | 'contract'          // Contrato en firma
  | 'handover'          // En entrega
  | 'completed'         // Cerrado - Arrendado
  | 'lost';             // Perdido

export interface PipelineItem {
  id: string;
  consignacionId: string;
  propertyId: string;
  candidateId: string;
  agenteId: string;

  // Property info (denormalized)
  propertyTitle: string;
  propertyAddress: string;
  propertyThumbnail?: string;
  monthlyRent: number;

  // Candidate info (denormalized)
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  candidateAvatar?: string;
  riskScore?: number;
  riskLevel?: 'A' | 'B' | 'C' | 'D' | 'E';

  // Pipeline tracking
  stage: PipelineStage;
  enteredStageAt: string;
  daysInStage: number;

  // Activity
  nextAction?: string;
  nextActionDate?: string;
  lastContactDate?: string;
  notes?: string;

  // Outcome
  lostReason?: string;
  completedLeaseId?: string;

  createdAt: string;
  updatedAt: string;
}

export const PIPELINE_STAGES: { stage: PipelineStage; labelEs: string; labelEn: string; color: string }[] = [
  { stage: 'lead', labelEs: 'Interesado', labelEn: 'Lead', color: 'bg-slate-100 text-slate-700' },
  { stage: 'visit_scheduled', labelEs: 'Visita prog.', labelEn: 'Visit sched.', color: 'bg-blue-100 text-blue-700' },
  { stage: 'visit_done', labelEs: 'Visita hecha', labelEn: 'Visit done', color: 'bg-indigo-100 text-indigo-700' },
  { stage: 'application', labelEs: 'Aplicación', labelEn: 'Application', color: 'bg-purple-100 text-purple-700' },
  { stage: 'evaluation', labelEs: 'Evaluación', labelEn: 'Evaluation', color: 'bg-amber-100 text-amber-700' },
  { stage: 'approved', labelEs: 'Aprobado', labelEn: 'Approved', color: 'bg-lime-100 text-lime-700' },
  { stage: 'contract', labelEs: 'Contrato', labelEn: 'Contract', color: 'bg-teal-100 text-teal-700' },
  { stage: 'handover', labelEs: 'Entrega', labelEn: 'Handover', color: 'bg-cyan-100 text-cyan-700' },
  { stage: 'completed', labelEs: 'Cerrado', labelEn: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
  { stage: 'lost', labelEs: 'Perdido', labelEn: 'Lost', color: 'bg-red-100 text-red-700' },
];

// ============================================================================
// Cobros (Collections)
// ============================================================================

export type CobroStatus = 'pending' | 'paid' | 'partial' | 'late' | 'defaulted';

export interface Cobro {
  id: string;
  leaseId: string;
  consignacionId: string;
  propertyId: string;
  propietarioId: string;
  tenantId: string;
  agenteId: string;

  // Property info
  propertyTitle: string;
  propertyAddress: string;

  // Tenant info
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;

  // Amounts
  month: string; // '2026-02'
  rentAmount: number;
  adminAmount: number;
  totalAmount: number;
  lateFee: number;
  totalWithFees: number;

  // Payment info
  status: CobroStatus;
  dueDate: string;
  paidDate?: string;
  paidAmount: number;
  pendingAmount: number;
  paymentMethod?: string;
  paymentReference?: string;

  // Tracking
  daysLate: number;
  remindersSent: number;
  lastReminderDate?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CobroSummary {
  month: string;
  totalExpected: number;
  totalCollected: number;
  totalPending: number;
  totalLate: number;
  collectionRate: number;
  cobrosPaid: number;
  cobrosPending: number;
  cobrosLate: number;
}

// ============================================================================
// Dispersiones (Disbursements to Property Owners)
// ============================================================================

export type DispersionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DispersionItem {
  cobroId: string;
  propertyTitle: string;
  rentCollected: number;
  commissionPercent: number;
  commissionAmount: number;
  netAmount: number;
}

export interface Dispersion {
  id: string;
  propietarioId: string;
  propietarioName: string;
  propietarioBankAccount: PropietarioBankAccount;

  month: string; // '2026-02'
  items: DispersionItem[];

  // Totals
  totalCollected: number;
  totalCommission: number;
  netToPropietario: number;

  // Status
  status: DispersionStatus;
  approvedBy?: string;
  approvedAt?: string;
  processedAt?: string;
  transferReference?: string;
  failureReason?: string;

  createdAt: string;
  updatedAt: string;
}

export interface DispersionSummary {
  month: string;
  totalToDisburse: number;
  totalCommissions: number;
  dispersionsPending: number;
  dispersionsCompleted: number;
  dispersionsFailed: number;
}

// ============================================================================
// Mantenimiento (Maintenance Requests)
// ============================================================================

export type MantenimientoType = 'plumbing' | 'electrical' | 'appliance' | 'structural' | 'painting' | 'locks' | 'other';
export type MantenimientoPriority = 'low' | 'medium' | 'high' | 'emergency';
export type MantenimientoStatus = 'reported' | 'quoted' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
export type MantenimientoPaidBy = 'owner' | 'tenant' | 'split' | 'agency';

export interface MantenimientoQuote {
  id: string;
  providerName: string;
  providerPhone: string;
  amount: number;
  description: string;
  estimatedDays: number;
  createdAt: string;
}

export interface SolicitudMantenimiento {
  id: string;
  consignacionId: string;
  propertyId: string;
  propietarioId: string;
  tenantId: string;
  agenteId: string;

  // Property & people info
  propertyTitle: string;
  propertyAddress: string;
  tenantName: string;
  propietarioName: string;

  // Request details
  type: MantenimientoType;
  priority: MantenimientoPriority;
  title: string;
  description: string;
  photoUrls?: string[];

  // Process
  status: MantenimientoStatus;
  quotes: MantenimientoQuote[];
  selectedQuoteId?: string;
  approvedAmount?: number;
  paidBy: MantenimientoPaidBy;

  // Completion
  completedAt?: string;
  completionNotes?: string;
  completionPhotoUrls?: string[];

  createdAt: string;
  updatedAt: string;
}

export const MANTENIMIENTO_TYPES: { type: MantenimientoType; labelEs: string; labelEn: string; icon: string }[] = [
  { type: 'plumbing', labelEs: 'Plomería', labelEn: 'Plumbing', icon: '🚿' },
  { type: 'electrical', labelEs: 'Electricidad', labelEn: 'Electrical', icon: '⚡' },
  { type: 'appliance', labelEs: 'Electrodomésticos', labelEn: 'Appliances', icon: '🔧' },
  { type: 'structural', labelEs: 'Estructura', labelEn: 'Structural', icon: '🏗️' },
  { type: 'painting', labelEs: 'Pintura', labelEn: 'Painting', icon: '🎨' },
  { type: 'locks', labelEs: 'Cerrajería', labelEn: 'Locks', icon: '🔐' },
  { type: 'other', labelEs: 'Otro', labelEn: 'Other', icon: '📝' },
];

// ============================================================================
// Reportes (Reports)
// ============================================================================

export interface ExtractoPropietario {
  propietarioId: string;
  propietarioName: string;
  month: string;
  generatedAt: string;

  properties: {
    propertyId: string;
    propertyTitle: string;
    propertyAddress: string;
    tenantName: string;
    rentAmount: number;
    adminAmount: number;
    totalCollected: number;
    commissionPercent: number;
    commissionAmount: number;
    netAmount: number;
    paymentDate?: string;
    paymentStatus: CobroStatus;
  }[];

  summary: {
    totalProperties: number;
    totalCollected: number;
    totalCommissions: number;
    netToPropietario: number;
    paymentDate?: string;
    paymentReference?: string;
  };
}

export interface CarteraItem {
  cobroId: string;
  propertyTitle: string;
  propertyAddress: string;
  tenantName: string;
  tenantPhone: string;
  propietarioName: string;
  agenteId: string;
  agenteName: string;
  month: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  daysLate: number;
  bucket: '0-30' | '31-60' | '61-90' | '90+';
}

export interface CarteraReport {
  generatedAt: string;
  items: CarteraItem[];
  summary: {
    totalPending: number;
    bucket0to30: number;
    bucket31to60: number;
    bucket61to90: number;
    bucket90plus: number;
  };
}

// ============================================================================
// Ocupacion Report
// ============================================================================

export interface OcupacionZone {
  zone: string;
  totalProperties: number;
  occupied: number;
  inProcess: number;
  available: number;
  occupancyRate: number;
}

export interface OcupacionReport {
  generatedAt: string;
  totalProperties: number;
  totalOccupied: number;
  totalInProcess: number;
  totalAvailable: number;
  overallOccupancyRate: number;
  previousMonthOccupancyRate?: number;
  zones: OcupacionZone[];
}

// ============================================================================
// Comisiones Agente Report
// ============================================================================

export interface ComisionAgente {
  agenteId: string;
  agenteName: string;
  agenteAvatar?: string;
  closedDeals: number;
  totalCommission: number;
  avgCommissionPerDeal: number;
  topPropertyTitle?: string;
  previousPeriodCommission?: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ComisionesAgenteReport {
  generatedAt: string;
  period: string; // '2026-02' or '2026-Q1'
  totalCommissions: number;
  avgCommissionPerAgent: number;
  totalClosedDeals: number;
  topAgentName: string;
  agentes: ComisionAgente[];
}

// ============================================================================
// Vencimientos Report
// ============================================================================

export type RenewalStatus = 'pending' | 'negotiating' | 'renewed' | 'terminating';

export interface VencimientoItem {
  consignacionId: string;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  tenantName: string;
  tenantPhone: string;
  propietarioName: string;
  contractEndDate: string;
  daysUntilExpiry: number;
  renewalStatus: RenewalStatus;
  bucket: '0-30' | '31-60' | '61-90' | '90+';
}

export interface VencimientosReport {
  generatedAt: string;
  items: VencimientoItem[];
  summary: {
    totalVencimientos: number;
    bucket0to30: number;
    bucket31to60: number;
    bucket61to90: number;
    bucket90plus: number;
  };
}

// ============================================================================
// Flujo de Caja Report
// ============================================================================

export interface FlujoCajaMonth {
  month: string; // '2026-02'
  ingresos: number;
  dispersiones: number;
  comisiones: number;
  balance: number;
}

export interface FlujoCajaReport {
  generatedAt: string;
  period: 'quarter' | 'semester' | 'year';
  months: FlujoCajaMonth[];
  totals: {
    totalIngresos: number;
    totalDispersiones: number;
    totalComisiones: number;
    netBalance: number;
  };
}

// ============================================================================
// Dashboard KPIs
// ============================================================================

export interface InmobiliariaDashboardKPIs {
  // Portfolio
  totalProperties: number;
  propertiesAvailable: number;
  propertiesRented: number;
  propertiesInProcess: number;
  occupancyRate: number;

  // Financial (current month)
  expectedRevenue: number;
  collectedRevenue: number;
  pendingCollections: number;
  lateCollections: number;
  collectionRate: number;
  totalCommissions: number;

  // Pipeline
  activeLeads: number;
  scheduledVisits: number;
  pendingApplications: number;
  contractsInProgress: number;

  // Team
  totalAgents: number;
  closedThisMonth: number;
  avgDaysToClose: number;

  // Owners
  totalPropietarios: number;
  pendingDispersions: number;
}

// ============================================================================
// Configuracion Inmobiliaria
// ============================================================================

export interface InmobiliariaConfig {
  id: string;
  name: string;
  nit: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;

  // Defaults
  defaultCommissionPercent: number;
  defaultLateFeePercent: number;
  paymentDueDay: number; // Day of month rent is due
  disbursementDay: number; // Day of month owner payments are made

  // Collection accounts
  collectionBankAccount?: PropietarioBankAccount;

  // Notifications
  reminderDaysBefore: number[];
  reminderDaysAfter: number[];

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getPipelineStageInfo(stage: PipelineStage) {
  return PIPELINE_STAGES.find(s => s.stage === stage);
}

export function getMantenimientoTypeInfo(type: MantenimientoType) {
  return MANTENIMIENTO_TYPES.find(t => t.type === type);
}

export function calculateCommission(amount: number, percent: number): number {
  return Math.round(amount * (percent / 100));
}

export function calculateNetToPropietario(collected: number, commissionPercent: number): number {
  const commission = calculateCommission(collected, commissionPercent);
  return collected - commission;
}

export function getCobroStatusColor(status: CobroStatus): string {
  const colors: Record<CobroStatus, string> = {
    pending: 'bg-amber-100 text-amber-700',
    paid: 'bg-emerald-100 text-emerald-700',
    partial: 'bg-blue-100 text-blue-700',
    late: 'bg-orange-100 text-orange-700',
    defaulted: 'bg-red-100 text-red-700',
  };
  return colors[status];
}

export function getDispersionStatusColor(status: DispersionStatus): string {
  const colors: Record<DispersionStatus, string> = {
    pending: 'bg-amber-100 text-amber-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
  };
  return colors[status];
}

export function getDispersionStatusLabel(status: DispersionStatus): string {
  const labels: Record<DispersionStatus, string> = {
    pending: 'Pendiente',
    processing: 'Procesando',
    completed: 'Completada',
    failed: 'Fallida',
  };
  return labels[status];
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getDaysLate(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function getAgingBucket(daysLate: number): CarteraItem['bucket'] {
  if (daysLate <= 30) return '0-30';
  if (daysLate <= 60) return '31-60';
  if (daysLate <= 90) return '61-90';
  return '90+';
}

// ============================================================================
// Report Definitions (Centro de Reportes)
// ============================================================================

export type ReportId =
  | 'extractos-propietarios'
  | 'cartera-edades'
  | 'comisiones-agente'
  | 'ocupacion-portafolio'
  | 'vencimientos'
  | 'rendimiento-agentes'
  | 'flujo-caja';

export type ReportFormat = 'pdf' | 'excel';
export type ReportCategory = 'financiero' | 'operativo' | 'agentes';
export type ReportFrequency = 'monthly' | 'weekly' | 'daily' | 'on-demand';

export interface ReportDefinition {
  id: ReportId;
  title: string;
  description: string;
  icon: string; // Phosphor icon name
  category: ReportCategory;
  format: ReportFormat;
  frequency: ReportFrequency;
  lastGenerated?: string;
  isFavorite?: boolean;
  /** Reports marked premium require Pro+ agency plan */
  premium?: boolean;
}

export interface ReportFiltersState {
  period: {
    start: string;
    end: string;
  };
  zone?: string;
  propietarioId?: string;
  agenteId?: string;
}

// Helper functions for reports
export function getReportCategoryColor(category: ReportCategory): string {
  const colors: Record<ReportCategory, string> = {
    financiero: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    operativo: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    agentes: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  };
  return colors[category];
}

export function getReportCategoryLabel(category: ReportCategory): string {
  const labels: Record<ReportCategory, string> = {
    financiero: 'Financiero',
    operativo: 'Operativo',
    agentes: 'Agentes',
  };
  return labels[category];
}

export function getReportFormatColor(format: ReportFormat): string {
  const colors: Record<ReportFormat, string> = {
    pdf: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    excel: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };
  return colors[format];
}

export function getReportFrequencyLabel(frequency: ReportFrequency): string {
  const labels: Record<ReportFrequency, string> = {
    monthly: 'Mensual',
    weekly: 'Semanal',
    daily: 'Diario',
    'on-demand': 'Bajo demanda',
  };
  return labels[frequency];
}

// ============================================================================
// Renovaciones (Contract Renewals)
// ============================================================================

export type RenovacionStatus =
  | 'pending'        // Hasn't started yet
  | 'notified'       // Tenant notified about renewal
  | 'negotiating'    // In negotiation (terms, price)
  | 'approved'       // Both parties agreed
  | 'signed'         // New contract signed
  | 'completed'      // Fully processed
  | 'terminated';    // Won't renew

export interface RenovacionHistoryItem {
  date: string;
  action: string;
  actor: 'system' | 'agent' | 'tenant' | 'owner';
  notes?: string;
}

export interface Renovacion {
  id: string;
  consignacionId: string;
  leaseId: string;
  propertyId: string;
  propietarioId: string;
  tenantId: string;
  agenteId: string;

  // Property info (denormalized)
  propertyTitle: string;
  propertyAddress: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  propietarioName: string;

  // Current lease
  currentRent: number;
  leaseStartDate: string;
  leaseEndDate: string;
  daysUntilExpiry: number;
  urgencyBucket: '0-30' | '31-60' | '61-90' | '90+';

  // IPC calculation
  ipcRate?: number;        // IPC rate applied
  proposedRent?: number;   // New rent after IPC
  negotiatedRent?: number; // If different from proposed

  // Workflow
  status: RenovacionStatus;
  history: RenovacionHistoryItem[];
  notifiedAt?: string;
  approvedAt?: string;
  signedAt?: string;
  completedAt?: string;

  // New lease
  newLeaseId?: string;
  newLeaseStartDate?: string;
  newLeaseEndDate?: string;

  createdAt: string;
  updatedAt: string;
}

export function getRenovacionStatusColor(status: RenovacionStatus): string {
  const colors: Record<RenovacionStatus, string> = {
    pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    notified: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    negotiating: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
    signed: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    terminated: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return colors[status];
}

export function getRenovacionStatusLabel(status: RenovacionStatus): string {
  const labels: Record<RenovacionStatus, string> = {
    pending: 'Pendiente',
    notified: 'Notificado',
    negotiating: 'Negociando',
    approved: 'Aprobado',
    signed: 'Firmado',
    completed: 'Completado',
    terminated: 'Terminado',
  };
  return labels[status];
}

export function getUrgencyColor(bucket: '0-30' | '31-60' | '61-90' | '90+'): string {
  const colors = {
    '0-30': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    '31-60': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    '61-90': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    '90+': 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  };
  return colors[bucket];
}

// ============================================================================
// Configuracion - Extended Agency Config
// ============================================================================

export interface AgencyBranding {
  primaryColor: string;    // Hex color
  secondaryColor: string;  // Hex color
  accentColor: string;     // Hex color
  logoUrl?: string;
  logoFile?: string;       // Base64 for local demo
  favicon?: string;
}

export interface AgencyContactInfo {
  phone: string;
  alternatePhone?: string;
  email: string;
  supportEmail?: string;
  whatsapp?: string;
  website?: string;
  address: string;
  city: string;
  department: string;
  postalCode?: string;
}

export interface AgencyLegalInfo {
  nit: string;
  razonSocial: string;
  representanteLegal: string;
  representanteCedula: string;
  matriculaInmobiliaria?: string;
  registroCamara?: string;
}

export interface AgencyDefaults {
  defaultCommissionPercent: number;
  defaultAdminFeePercent: number;
  defaultLateFeePercent: number;
  paymentDueDay: number;
  disbursementDay: number;
  gracePeriodDays: number;
  reminderDaysBefore: number[];
  reminderDaysAfter: number[];
}

// Extended InmobiliariaConfig with all configuration sections
export interface InmobiliariaConfigExtended extends InmobiliariaConfig {
  branding: AgencyBranding;
  contact: AgencyContactInfo;
  legal: AgencyLegalInfo;
  defaults: AgencyDefaults;
}

// Helper for default branding colors
export function getDefaultBranding(): AgencyBranding {
  return {
    primaryColor: '#4F46E5',   // Indigo
    secondaryColor: '#10B981', // Emerald
    accentColor: '#F59E0B',    // Amber
  };
}

// Colombian departments for address selection
export const COLOMBIAN_DEPARTMENTS = [
  'Amazonas',
  'Antioquia',
  'Arauca',
  'Atlántico',
  'Bolívar',
  'Boyacá',
  'Caldas',
  'Caquetá',
  'Casanare',
  'Cauca',
  'Cesar',
  'Chocó',
  'Córdoba',
  'Cundinamarca',
  'Guainía',
  'Guaviare',
  'Huila',
  'La Guajira',
  'Magdalena',
  'Meta',
  'Nariño',
  'Norte de Santander',
  'Putumayo',
  'Quindío',
  'Risaralda',
  'San Andrés y Providencia',
  'Santander',
  'Sucre',
  'Tolima',
  'Valle del Cauca',
  'Vaupés',
  'Vichada',
] as const;

export type ColombianDepartment = typeof COLOMBIAN_DEPARTMENTS[number];

// ============================================================================
// Configuracion - Integrations
// ============================================================================

export type IntegrationCategory = 'payments' | 'accounting' | 'communications' | 'storage';

export type IntegrationStatus = 'active' | 'inactive' | 'pending' | 'error';

export interface AgencyIntegration {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  icon: string;          // Phosphor icon name
  status: IntegrationStatus;
  isEnabled: boolean;
  configUrl?: string;
  apiKeyConfigured?: boolean;
  lastSyncAt?: string;
  errorMessage?: string;
}

// ============================================================================
// Configuracion - Billing
// ============================================================================

export type BillingPlan = 'starter' | 'professional' | 'enterprise';

export type BillingCycle = 'monthly' | 'annual';

export interface PlanLimits {
  maxProperties: number;
  maxUsers: number;
  maxAgents: number;
  includesReports: boolean;
  includesAnalytics: boolean;
  includesIntegrations: boolean;
  includesApi: boolean;
  supportLevel: 'email' | 'priority' | 'dedicated';
}

export interface AgencyBilling {
  plan: BillingPlan;
  cycle: BillingCycle;
  pricePerMonth: number;
  nextBillingDate: string;
  paymentMethod?: {
    type: 'card' | 'pse' | 'transfer';
    last4?: string;
    brand?: string;
    bankName?: string;
  };
  usage: {
    properties: number;
    users: number;
    agents: number;
  };
  limits: PlanLimits;
}

export interface BillingInvoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  pdfUrl?: string;
}

// Helper functions for Integrations & Billing
export function getPlanLabel(plan: BillingPlan): string {
  const labels: Record<BillingPlan, string> = {
    starter: 'Starter',
    professional: 'Profesional',
    enterprise: 'Enterprise',
  };
  return labels[plan];
}

export function getPlanColor(plan: BillingPlan): string {
  const colors: Record<BillingPlan, string> = {
    starter: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    professional: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    enterprise: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return colors[plan];
}

export function getIntegrationCategoryLabel(category: IntegrationCategory): string {
  const labels: Record<IntegrationCategory, string> = {
    payments: 'Pagos',
    accounting: 'Contabilidad',
    communications: 'Comunicaciones',
    storage: 'Almacenamiento',
  };
  return labels[category];
}

export function getIntegrationStatusColor(status: IntegrationStatus): string {
  const colors: Record<IntegrationStatus, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    inactive: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return colors[status];
}

export function getIntegrationStatusLabel(status: IntegrationStatus): string {
  const labels: Record<IntegrationStatus, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    pending: 'Pendiente',
    error: 'Error',
  };
  return labels[status];
}

// Plan limits configuration
export const PLAN_LIMITS: Record<BillingPlan, PlanLimits> = {
  starter: {
    maxProperties: 20,
    maxUsers: 3,
    maxAgents: 2,
    includesReports: true,
    includesAnalytics: false,
    includesIntegrations: false,
    includesApi: false,
    supportLevel: 'email',
  },
  professional: {
    maxProperties: 100,
    maxUsers: 10,
    maxAgents: 5,
    includesReports: true,
    includesAnalytics: true,
    includesIntegrations: true,
    includesApi: false,
    supportLevel: 'priority',
  },
  enterprise: {
    maxProperties: -1, // unlimited
    maxUsers: -1,
    maxAgents: -1,
    includesReports: true,
    includesAnalytics: true,
    includesIntegrations: true,
    includesApi: true,
    supportLevel: 'dedicated',
  },
};

// ============================================================================
// Configuracion - Users & Permissions
// ============================================================================

export type AgencyRole = 'admin' | 'agente' | 'contador' | 'viewer';

export type PermissionModule =
  | 'dashboard'
  | 'propietarios'
  | 'portafolio'
  | 'pipeline'
  | 'agentes'
  | 'cobros'
  | 'dispersiones'
  | 'operaciones'
  | 'reportes'
  | 'configuracion'
  | 'documentos'
  | 'analytics';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export';

export interface RolePermission {
  module: PermissionModule;
  actions: PermissionAction[];
}

export interface RolePermissions {
  role: AgencyRole;
  permissions: RolePermission[];
}

export interface AgencyUser {
  id: string;
  email: string;
  name: string;
  role: AgencyRole;
  avatar?: string;
  phone?: string;
  status: 'active' | 'invited' | 'inactive';
  invitedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface UserInvite {
  email: string;
  name: string;
  role: AgencyRole;
  message?: string;
}

// Helper functions for users/roles
export function getRoleLabel(role: AgencyRole): string {
  const labels: Record<AgencyRole, string> = {
    admin: 'Administrador',
    agente: 'Agente',
    contador: 'Contador',
    viewer: 'Solo Lectura',
  };
  return labels[role];
}

export function getRoleColor(role: AgencyRole): string {
  const colors: Record<AgencyRole, string> = {
    admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    agente: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    contador: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    viewer: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  };
  return colors[role];
}

export function getUserStatusColor(status: AgencyUser['status']): string {
  const colors = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    invited: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    inactive: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  };
  return colors[status];
}

export function getUserStatusLabel(status: AgencyUser['status']): string {
  const labels = {
    active: 'Activo',
    invited: 'Invitado',
    inactive: 'Inactivo',
  };
  return labels[status];
}

export function getModuleLabel(module: PermissionModule): string {
  const labels: Record<PermissionModule, string> = {
    dashboard: 'Dashboard',
    propietarios: 'Propietarios',
    portafolio: 'Portafolio',
    pipeline: 'Pipeline',
    agentes: 'Agentes',
    cobros: 'Cobros',
    dispersiones: 'Dispersiones',
    operaciones: 'Operaciones',
    reportes: 'Reportes',
    configuracion: 'Configuracion',
    documentos: 'Documentos',
    analytics: 'Analitica',
  };
  return labels[module];
}

export function getActionLabel(action: PermissionAction): string {
  const labels: Record<PermissionAction, string> = {
    view: 'Ver',
    create: 'Crear',
    edit: 'Editar',
    delete: 'Eliminar',
    export: 'Exportar',
  };
  return labels[action];
}

// Default permissions by role
export const DEFAULT_ROLE_PERMISSIONS: Record<AgencyRole, RolePermissions> = {
  admin: {
    role: 'admin',
    permissions: [
      { module: 'dashboard', actions: ['view'] },
      { module: 'propietarios', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'portafolio', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'pipeline', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'agentes', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'cobros', actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { module: 'dispersiones', actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { module: 'operaciones', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'reportes', actions: ['view', 'export'] },
      { module: 'configuracion', actions: ['view', 'edit'] },
      { module: 'documentos', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'analytics', actions: ['view', 'export'] },
    ],
  },
  agente: {
    role: 'agente',
    permissions: [
      { module: 'dashboard', actions: ['view'] },
      { module: 'propietarios', actions: ['view'] },
      { module: 'portafolio', actions: ['view', 'edit'] },
      { module: 'pipeline', actions: ['view', 'create', 'edit'] },
      { module: 'agentes', actions: ['view'] },
      { module: 'cobros', actions: ['view'] },
      { module: 'operaciones', actions: ['view', 'edit'] },
      { module: 'documentos', actions: ['view'] },
    ],
  },
  contador: {
    role: 'contador',
    permissions: [
      { module: 'dashboard', actions: ['view'] },
      { module: 'propietarios', actions: ['view'] },
      { module: 'cobros', actions: ['view', 'create', 'edit', 'export'] },
      { module: 'dispersiones', actions: ['view', 'create', 'edit', 'export'] },
      { module: 'reportes', actions: ['view', 'export'] },
      { module: 'analytics', actions: ['view', 'export'] },
    ],
  },
  viewer: {
    role: 'viewer',
    permissions: [
      { module: 'dashboard', actions: ['view'] },
      { module: 'propietarios', actions: ['view'] },
      { module: 'portafolio', actions: ['view'] },
      { module: 'cobros', actions: ['view'] },
      { module: 'reportes', actions: ['view'] },
    ],
  },
};

// All modules for permission matrix
export const ALL_PERMISSION_MODULES: PermissionModule[] = [
  'dashboard',
  'propietarios',
  'portafolio',
  'pipeline',
  'agentes',
  'cobros',
  'dispersiones',
  'operaciones',
  'reportes',
  'configuracion',
  'documentos',
  'analytics',
];

// All actions for permission matrix
export const ALL_PERMISSION_ACTIONS: PermissionAction[] = [
  'view',
  'create',
  'edit',
  'delete',
  'export',
];

// ============================================================================
// Documentos - Templates & Documents
// ============================================================================

export type DocumentCategory =
  | 'contrato'
  | 'acta'
  | 'inventario'
  | 'poliza'
  | 'carta'
  | 'otro';

export type DocumentStatus =
  | 'draft'
  | 'pending_signature'
  | 'signed'
  | 'expired'
  | 'cancelled';

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: DocumentCategory;
  icon: string;
  version: string;
  lastUpdated: string;
  usageCount: number;
  isDefault: boolean;
  previewUrl?: string;
  variables: string[];  // e.g., ['{{tenant_name}}', '{{property_address}}']
}

export interface PropertyDocument {
  id: string;
  templateId?: string;
  propertyId: string;
  propertyTitle: string;
  consignacionId?: string;
  tenantId?: string;
  tenantName?: string;
  propietarioId: string;
  propietarioName: string;

  name: string;
  category: DocumentCategory;
  status: DocumentStatus;

  fileUrl?: string;
  fileSize?: number;        // in bytes
  mimeType?: string;

  signatures?: {
    signerName: string;
    signerEmail: string;
    signedAt?: string;
    status: 'pending' | 'signed' | 'rejected';
  }[];

  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface DocumentGenerateRequest {
  templateId: string;
  propertyId: string;
  consignacionId?: string;
  tenantId?: string;
  variables: Record<string, string>;
}

// Helper functions for documents
export function getDocumentCategoryLabel(category: DocumentCategory): string {
  const labels: Record<DocumentCategory, string> = {
    contrato: 'Contrato',
    acta: 'Acta',
    inventario: 'Inventario',
    poliza: 'Poliza',
    carta: 'Carta',
    otro: 'Otro',
  };
  return labels[category];
}

export function getDocumentCategoryColor(category: DocumentCategory): string {
  const colors: Record<DocumentCategory, string> = {
    contrato: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    acta: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    inventario: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    poliza: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    carta: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    otro: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  };
  return colors[category];
}

export function getDocumentStatusLabel(status: DocumentStatus): string {
  const labels: Record<DocumentStatus, string> = {
    draft: 'Borrador',
    pending_signature: 'Pendiente Firma',
    signed: 'Firmado',
    expired: 'Vencido',
    cancelled: 'Cancelado',
  };
  return labels[status];
}

export function getDocumentStatusColor(status: DocumentStatus): string {
  const colors: Record<DocumentStatus, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
    pending_signature: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    signed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-400',
  };
  return colors[status];
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Helper to check if role has permission
export function hasPermission(
  permissions: RolePermissions,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  const modulePermission = permissions.permissions.find((p) => p.module === module);
  if (!modulePermission) return false;
  return modulePermission.actions.includes(action);
}

// Helper to clone and update permissions
export function updateRolePermission(
  permissions: RolePermissions,
  module: PermissionModule,
  action: PermissionAction,
  enabled: boolean
): RolePermissions {
  const newPermissions = { ...permissions };
  const moduleIndex = newPermissions.permissions.findIndex((p) => p.module === module);

  if (moduleIndex === -1) {
    if (enabled) {
      newPermissions.permissions = [
        ...newPermissions.permissions,
        { module, actions: [action] },
      ];
    }
  } else {
    const currentActions = newPermissions.permissions[moduleIndex].actions;
    if (enabled && !currentActions.includes(action)) {
      newPermissions.permissions[moduleIndex] = {
        ...newPermissions.permissions[moduleIndex],
        actions: [...currentActions, action],
      };
    } else if (!enabled && currentActions.includes(action)) {
      const newActions = currentActions.filter((a) => a !== action);
      if (newActions.length === 0) {
        newPermissions.permissions = newPermissions.permissions.filter((_, i) => i !== moduleIndex);
      } else {
        newPermissions.permissions[moduleIndex] = {
          ...newPermissions.permissions[moduleIndex],
          actions: newActions,
        };
      }
    }
  }

  return newPermissions;
}

// ============================================================================
// Documentos - Actas de Entrega
// ============================================================================

export type ActaType = 'entrega' | 'devolucion';

export type ItemCondition = 'excelente' | 'bueno' | 'regular' | 'malo' | 'no_aplica';

export type RoomType =
  | 'sala'
  | 'comedor'
  | 'cocina'
  | 'habitacion_principal'
  | 'habitacion_2'
  | 'habitacion_3'
  | 'bano_principal'
  | 'bano_2'
  | 'estudio'
  | 'balcon'
  | 'terraza'
  | 'garaje'
  | 'cuarto_util'
  | 'otro';

export interface ActaInventoryItem {
  id: string;
  room: RoomType;
  name: string;
  description?: string;
  quantity: number;
  condition: ItemCondition;
  conditionNotes?: string;
  photos?: string[];        // Base64 or URLs
  hasDefects: boolean;
  defectDescription?: string;
}

export interface MeterReading {
  type: 'agua' | 'luz' | 'gas';
  reading: string;
  unit: string;
  photoUrl?: string;
}

export interface KeyDelivered {
  type: string;         // "Llave principal", "Control garaje", etc.
  quantity: number;
  notes?: string;
}

export interface ActaSignature {
  party: 'tenant' | 'owner' | 'agent';
  name: string;
  cedula: string;
  signatureData?: string;  // Base64 signature image
  signedAt?: string;
  ipAddress?: string;
}

export interface ActaDeduction {
  concept: string;
  amount: number;
  notes?: string;
}

export interface ActaEntrega {
  id: string;
  type: ActaType;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  consignacionId: string;
  leaseId: string;

  // Parties
  tenantId: string;
  tenantName: string;
  tenantCedula: string;
  tenantPhone: string;
  tenantEmail: string;
  propietarioId: string;
  propietarioName: string;
  agenteId: string;
  agenteName: string;

  // Delivery info
  deliveryDate: string;
  deliveryTime?: string;

  // Inventory
  rooms: RoomType[];
  items: ActaInventoryItem[];

  // Meters
  meterReadings: MeterReading[];

  // Keys
  keysDelivered: KeyDelivered[];

  // General observations
  generalCondition: ItemCondition;
  generalObservations?: string;

  // Signatures
  signatures: ActaSignature[];

  // For devolucion type
  depositAmount?: number;
  deductions?: ActaDeduction[];
  depositToReturn?: number;

  status: 'draft' | 'in_progress' | 'pending_signatures' | 'completed';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  pdfUrl?: string;
}

// Helper functions for Acta de Entrega
export function getRoomLabel(room: RoomType): string {
  const labels: Record<RoomType, string> = {
    sala: 'Sala',
    comedor: 'Comedor',
    cocina: 'Cocina',
    habitacion_principal: 'Habitacion Principal',
    habitacion_2: 'Habitacion 2',
    habitacion_3: 'Habitacion 3',
    bano_principal: 'Bano Principal',
    bano_2: 'Bano 2',
    estudio: 'Estudio',
    balcon: 'Balcon',
    terraza: 'Terraza',
    garaje: 'Garaje',
    cuarto_util: 'Cuarto Util',
    otro: 'Otro',
  };
  return labels[room];
}

export function getConditionLabel(condition: ItemCondition): string {
  const labels: Record<ItemCondition, string> = {
    excelente: 'Excelente',
    bueno: 'Bueno',
    regular: 'Regular',
    malo: 'Malo',
    no_aplica: 'No Aplica',
  };
  return labels[condition];
}

export function getConditionColor(condition: ItemCondition): string {
  const colors: Record<ItemCondition, string> = {
    excelente: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    bueno: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
    regular: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    malo: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    no_aplica: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  };
  return colors[condition];
}

export function getActaTypeLabel(type: ActaType): string {
  return type === 'entrega' ? 'Acta de Entrega' : 'Acta de Devolucion';
}

export function getActaStatusLabel(status: ActaEntrega['status']): string {
  const labels: Record<ActaEntrega['status'], string> = {
    draft: 'Borrador',
    in_progress: 'En Progreso',
    pending_signatures: 'Pendiente Firmas',
    completed: 'Completado',
  };
  return labels[status];
}

export function getActaStatusColor(status: ActaEntrega['status']): string {
  const colors: Record<ActaEntrega['status'], string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    pending_signatures: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  };
  return colors[status];
}

// Default rooms for a typical apartment
export const DEFAULT_ROOMS: RoomType[] = [
  'sala',
  'comedor',
  'cocina',
  'habitacion_principal',
  'bano_principal',
];

// All available room types
export const ALL_ROOM_TYPES: RoomType[] = [
  'sala',
  'comedor',
  'cocina',
  'habitacion_principal',
  'habitacion_2',
  'habitacion_3',
  'bano_principal',
  'bano_2',
  'estudio',
  'balcon',
  'terraza',
  'garaje',
  'cuarto_util',
  'otro',
];

// Common inventory items per room
export const COMMON_ITEMS_BY_ROOM: Record<RoomType, string[]> = {
  sala: ['Piso', 'Paredes', 'Techo', 'Ventanas', 'Puertas', 'Tomas electricos', 'Interruptores'],
  comedor: ['Piso', 'Paredes', 'Techo', 'Ventanas', 'Lampara'],
  cocina: ['Piso', 'Paredes', 'Meson', 'Lavaplatos', 'Estufa', 'Horno', 'Campana extractora', 'Gabinetes', 'Grifo'],
  habitacion_principal: ['Piso', 'Paredes', 'Techo', 'Ventanas', 'Closet', 'Puertas', 'Tomas electricos'],
  habitacion_2: ['Piso', 'Paredes', 'Techo', 'Ventanas', 'Closet', 'Puertas'],
  habitacion_3: ['Piso', 'Paredes', 'Techo', 'Ventanas', 'Closet', 'Puertas'],
  bano_principal: ['Piso', 'Paredes', 'Sanitario', 'Lavamanos', 'Ducha', 'Grifo', 'Espejo', 'Gabinete'],
  bano_2: ['Piso', 'Paredes', 'Sanitario', 'Lavamanos', 'Ducha', 'Grifo'],
  estudio: ['Piso', 'Paredes', 'Techo', 'Ventanas', 'Tomas electricos'],
  balcon: ['Piso', 'Barandas', 'Techo'],
  terraza: ['Piso', 'Barandas', 'Drenaje'],
  garaje: ['Piso', 'Paredes', 'Puerta', 'Iluminacion'],
  cuarto_util: ['Piso', 'Paredes', 'Conexiones lavadora', 'Lavadero'],
  otro: ['Piso', 'Paredes', 'Techo'],
};

// All item conditions
export const ALL_ITEM_CONDITIONS: ItemCondition[] = [
  'excelente',
  'bueno',
  'regular',
  'malo',
  'no_aplica',
];

// ============================================================================
// Analytics - Trends & Forecasting
// ============================================================================

export type TrendDirection = 'up' | 'down' | 'stable';
export type ComparisonPeriod = 'previous_period' | 'previous_year' | 'custom';

export interface PeriodComparison {
  current: {
    label: string;
    startDate: string;
    endDate: string;
    value: number;
  };
  previous: {
    label: string;
    startDate: string;
    endDate: string;
    value: number;
  };
  change: {
    absolute: number;
    percentage: number;
    direction: TrendDirection;
  };
}

export interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
  isProjected?: boolean;
}

export interface SeasonalPattern {
  month: number;
  monthName: string;
  averageValue: number;
  deviation: number;
  isHighSeason: boolean;
  notes?: string;
}

export interface TrendAnomaly {
  date: string;
  value: number;
  expectedValue: number;
  deviationPercent: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface TrendAnalysis {
  metricId: string;
  metricLabel: string;
  data: TrendDataPoint[];
  comparison: PeriodComparison;
  seasonalPatterns: SeasonalPattern[];
  anomalies: TrendAnomaly[];
  trendLine: {
    slope: number;
    direction: TrendDirection;
    confidence: number;
  };
  insights: string[];
}

export interface ForecastDataPoint {
  date: string;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface ForecastScenario {
  id: string;
  name: string;
  description: string;
  assumptions: string[];
  data: ForecastDataPoint[];
  probability: number;
}

export interface ForecastData {
  metricId: string;
  metricLabel: string;
  unit: string;
  historical: TrendDataPoint[];
  baseline: ForecastDataPoint[];
  scenarios: ForecastScenario[];
  factors: {
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
  }[];
  lastUpdated: string;
}

// Helper functions for trends & forecasting
export function getAnomalySeverityColor(severity: TrendAnomaly['severity']): string {
  const colors = {
    low: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    medium: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return colors[severity];
}

export function formatConfidence(confidence: number): string {
  return `${(confidence * 100).toFixed(0)}% confianza`;
}

export function getSeasonColor(isHighSeason: boolean): string {
  return isHighSeason
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    : 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400';
}

export function getMonthName(month: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[month - 1] || '';
}

export function getTrendDirectionColor(direction: TrendDirection): string {
  const colors = {
    up: 'text-emerald-600 dark:text-emerald-400',
    down: 'text-red-600 dark:text-red-400',
    stable: 'text-neutral-600 dark:text-neutral-400',
  };
  return colors[direction];
}

export function getImpactColor(impact: 'positive' | 'negative' | 'neutral'): string {
  const colors = {
    positive: 'text-emerald-600 dark:text-emerald-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-neutral-600 dark:text-neutral-400',
  };
  return colors[impact];
}

export function getScenarioColor(id: string): string {
  const colors: Record<string, string> = {
    optimistic: 'bg-emerald-500 dark:bg-emerald-400',
    conservative: 'bg-blue-500 dark:bg-blue-400',
    pessimistic: 'bg-red-500 dark:bg-red-400',
    baseline: 'bg-neutral-500 dark:bg-neutral-400',
  };
  return colors[id] || colors.baseline;
}

// ============================================================================
// Analytics - Advanced KPIs & Dashboard
// ============================================================================

export type AnalyticsPeriod = 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface TrendData {
  direction: TrendDirection;
  percentage: number;
  previousValue: number;
  currentValue: number;
}

export interface SparklinePoint {
  date: string;
  value: number;
}

export interface AdvancedKPI {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  unit?: string;
  trend: TrendData;
  sparkline: SparklinePoint[];
  target?: number;
  targetLabel?: string;
  category: 'financial' | 'operational' | 'performance';
  description?: string;
}

export interface TimeSeriesData {
  date: string;
  [key: string]: string | number;
}

export interface ChartDataset {
  label: string;
  data: number[];
  color: string;
  type?: 'line' | 'bar' | 'area';
}

export interface AnalyticsChart {
  id: string;
  title: string;
  description?: string;
  type: 'line' | 'bar' | 'area' | 'pie' | 'donut';
  labels: string[];
  datasets: ChartDataset[];
  period: AnalyticsPeriod;
}

export interface AnalyticsFilters {
  period: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
  propertyType?: string;
  zone?: string;
  agentId?: string;
}

export interface AnalyticsData {
  kpis: AdvancedKPI[];
  charts: AnalyticsChart[];
  lastUpdated: string;
}

// Analytics helper functions
export function getTrendColor(direction: TrendDirection, isPositiveGood: boolean = true): string {
  if (direction === 'stable') return 'text-slate-500 dark:text-slate-400';
  const isGood = isPositiveGood ? direction === 'up' : direction === 'down';
  return isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
}

export function getTrendBgColor(direction: TrendDirection, isPositiveGood: boolean = true): string {
  if (direction === 'stable') return 'bg-slate-100 dark:bg-slate-800';
  const isGood = isPositiveGood ? direction === 'up' : direction === 'down';
  return isGood ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30';
}

export function getTrendIcon(direction: TrendDirection): string {
  const icons = {
    up: 'TrendUp',
    down: 'TrendDown',
    stable: 'Minus',
  };
  return icons[direction];
}

export function formatPercentageChange(percentage: number): string {
  const prefix = percentage > 0 ? '+' : '';
  return `${prefix}${percentage.toFixed(1)}%`;
}

export function getCategoryColor(category: AdvancedKPI['category']): string {
  const colors = {
    financial: 'bg-white border-indigo-100 dark:bg-[#1a1a1c] dark:border-indigo-900/50',
    operational: 'bg-white border-indigo-100 dark:bg-[#1a1a1c] dark:border-indigo-900/50',
    performance: 'bg-white border-indigo-100 dark:bg-[#1a1a1c] dark:border-indigo-900/50',
  };
  return colors[category];
}

export function getCategoryIconColor(category: AdvancedKPI['category']): string {
  const colors = {
    financial: 'text-indigo-600 dark:text-indigo-400',
    operational: 'text-indigo-600 dark:text-indigo-400',
    performance: 'text-indigo-600 dark:text-indigo-400',
  };
  return colors[category];
}

export function getCategoryBgColor(category: AdvancedKPI['category']): string {
  const colors = {
    financial: 'bg-indigo-100 dark:bg-indigo-900/30',
    operational: 'bg-indigo-100 dark:bg-indigo-900/30',
    performance: 'bg-indigo-100 dark:bg-indigo-900/30',
  };
  return colors[category];
}

export function getCategoryLabel(category: AdvancedKPI['category']): string {
  const labels = {
    financial: 'Financiero',
    operational: 'Operacional',
    performance: 'Rendimiento',
  };
  return labels[category];
}

export function getPeriodLabel(period: AnalyticsPeriod): string {
  const labels: Record<AnalyticsPeriod, string> = {
    week: 'Semana',
    month: 'Mes',
    quarter: 'Trimestre',
    year: 'Ano',
    custom: 'Personalizado',
  };
  return labels[period];
}
