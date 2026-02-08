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
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
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
