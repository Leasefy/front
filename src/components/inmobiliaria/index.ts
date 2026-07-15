/**
 * Inmobiliaria (Real Estate Agency) Components
 * Module for managing property portfolios, owners, agents, and collections
 */

// Propietario (Property Owner) Components
export { PropietarioCard } from './PropietarioCard';
export { PropietarioTable } from './PropietarioTable';
export { PropietarioForm } from './PropietarioForm';
export { PropietarioBankInfo, PropietarioBankInfoCompact } from './PropietarioBankInfo';
export { PropietarioStats } from './PropietarioStats';

// Consignacion (Property Consignment) Components
export { ConsignacionCard } from './ConsignacionCard';
export { ConsignacionTable } from './ConsignacionTable';
export { ConsignacionFilters } from './ConsignacionFilters';
export type { ConsignacionFiltersState } from './ConsignacionFilters';

// Consignacion Wizard Components
export { ConsignacionWizard } from './ConsignacionWizard';
export {
  StepSelectPropietario,
  StepPropertyData,
  StepCommissionTerms,
  StepAssignAgent,
  StepActaEntrega,
  StepConfirmation,
} from './ConsignacionWizardSteps';
export type { WizardFormData, StepProps } from './ConsignacionWizardSteps';

// Selector Components
export { PropietarioSelector } from './PropietarioSelector';
export { AgenteSelector } from './AgenteSelector';

// Consignacion Detail Components
export { ConsignacionHeader } from './ConsignacionHeader';
export {
  PropertyInfoSection,
  PropietarioSection,
  AgenteSection,
  CurrentLeaseSection,
  DocumentsSection,
} from './ConsignacionDetailSections';
export { ActaEntregaView } from './ActaEntregaView';
export { ConsignacionTimeline } from './ConsignacionTimeline';
export { ConsignacionEditForm } from './ConsignacionEditForm';

// Agente (Real Estate Agent) Components
export { AgenteCard } from './AgenteCard';
export { AgenteTable } from './AgenteTable';
export { AgenteFilters } from './AgenteFilters';
export type { AgenteFiltersState } from './AgenteFilters';

// Agente Detail Components
export { AgenteProfile } from './AgenteProfile';
export { AgenteMetrics } from './AgenteMetrics';
export { AgentePropertyList } from './AgentePropertyList';
export { AgentePipeline } from './AgentePipeline';

// Agente Management Components
export { AgenteLeaderboard } from './AgenteLeaderboard';
export { AgenteWorkloadChart } from './AgenteWorkloadChart';
export { AsignacionModal } from './AsignacionModal';
export { AgenteFormModal } from './AgenteFormModal';

// Pipeline (Rental Pipeline) Components
export { PipelineCard } from './PipelineCard';
export { PipelineFilters } from './PipelineFilters';
export type { PipelineFiltersState } from './PipelineFilters';
export { PipelineDetail } from './PipelineDetail';
export { PipelineBoard } from './PipelineBoard';

// Cobros (Collections) Components
export { CobroCard } from './CobroCard';
export { CobroTable } from './CobroTable';
export { CobroFilters } from './CobroFilters';
export type { CobroFiltersState } from './CobroFilters';
export { RegistrarPagoModal } from './RegistrarPagoModal';
export { MoraAlert, MoraAlertCompact } from './MoraAlert';
export { CobroResumen, CobroResumenCompact } from './CobroResumen';
export { RecordatorioConfig } from './RecordatorioConfig';
export type { RecordatorioConfigData } from './RecordatorioConfig';
export { CobroDetail } from './CobroDetail';

// Dispersiones (Disbursements) Components
export { DispersionCard, DispersionCardCompact } from './DispersionCard';
export { DispersionTable } from './DispersionTable';
export { DispersionFilters } from './DispersionFilters';
export type { DispersionFiltersState } from './DispersionFilters';
export { DispersionDetail } from './DispersionDetail';
export { ComisionDesglose, ComisionDesgloseCompact } from './ComisionDesglose';
export { ExtractoPropietario } from './ExtractoPropietario';
export { DispersionResumen, DispersionResumenCompact } from './DispersionResumen';
export { DispersionWizard } from './DispersionWizard';

// Reportes (Reports - Phase 8) Components
export { ReporteCard, ReporteCardCompact } from './ReporteCard';
export { ReporteFilters } from './ReporteFilters';
export type { ReporteFiltersState } from './ReporteFilters';
export { ReporteViewer } from './ReporteViewer';

// Report Visualization Components (Phase 8 - Plan 02)
export { CarteraEdadesTable } from './CarteraEdadesTable';
export { OcupacionChart } from './OcupacionChart';
export { ComisionesTable } from './ComisionesTable';
export { VencimientosTable } from './VencimientosTable';
export { FlujoCajaChart } from './FlujoCajaChart';

// Report Export Components (Phase 8 - Plan 03)
export { ExportButton, ExportButtonCompact } from './ExportButton';
export type { ExportButtonProps, ExportFormat } from './ExportButton';

// Operaciones - Renovaciones (Phase 9)
export { RenovacionesTable } from './RenovacionesTable';

// Operaciones - IPC & Workflow (Phase 9)
export { IPCCalculator } from './IPCCalculator';
export { RenovacionWorkflow } from './RenovacionWorkflow';

// Operaciones - Mantenimiento (Phase 9)
export { MantenimientoList } from './MantenimientoList';
export { MantenimientoKanban } from './MantenimientoKanban';
export { MantenimientoForm } from './MantenimientoForm';
export type { MantenimientoFormData } from './MantenimientoForm';

// Operaciones - Quote Comparison & Viewer (Phase 9 - Plan 04)
export { CotizacionComparator } from './CotizacionComparator';
export type { CotizacionComparatorProps } from './CotizacionComparator';
export { MantenimientoViewer } from './MantenimientoViewer';
export type { MantenimientoViewerProps } from './MantenimientoViewer';

// Configuracion - Company Profile & Branding (Phase 10)
export { ConfigPerfilAgencia } from './ConfigPerfilAgencia';
export { ConfigBranding } from './ConfigBranding';

// Configuracion - Users & Permissions (Phase 10 - Plan 02)
export { ConfigUsuarios } from './ConfigUsuarios';
export { ConfigPermisos } from './ConfigPermisos';

// Configuracion - Integrations & Billing (Phase 10 - Plan 03)
export { ConfigIntegraciones } from './ConfigIntegraciones';
export { ConfigFacturacion } from './ConfigFacturacion';

// Documentos - Templates & Manager (Phase 10 - Plan 04)
export { DocumentoTemplates } from './DocumentoTemplates';
export { DocumentoManager } from './DocumentoManager';

// Documentos - Actas de Entrega (Phase 10 - Plan 05)
export { ActaEntregaForm } from './ActaEntregaForm';
export { ActaEntregaViewer } from './ActaEntregaViewer';

// Analytics - Dashboard & KPIs (Phase 10 - Plan 06)
export { AnalyticsDashboard } from './AnalyticsDashboard';
export { AnalyticsKPICards } from './AnalyticsKPICards';

// Analytics - Trends & Forecasting (Phase 10 - Plan 07)
export { AnalyticsTrends } from './AnalyticsTrends';
export { AnalyticsForecasting } from './AnalyticsForecasting';

// Agency Setup Wizard (P1-01 - Inmobiliaria Registration)
export { AgencySetupWizard } from './AgencySetupWizard';
export { AgencyBasicForm } from './wizard/AgencyBasicForm';
export type { AgencyBasicFormData } from './wizard/AgencyBasicForm';
export { AgencyOperationsForm } from './wizard/AgencyOperationsForm';
export type { AgencyOperationsFormData } from './wizard/AgencyOperationsForm';
export { InviteFirstMemberForm } from './wizard/InviteFirstMemberForm';
export type { InviteFirstMemberFormData, AgencyMemberRoleOption } from './wizard/InviteFirstMemberForm';

// Pricing & Feature Gating
export { AgencyPricingModal } from './AgencyPricingModal';
export { UpgradePrompt, FeatureGate } from './UpgradePrompt';

// AI Agent Components
export { AIAgentCard } from './ai/AIAgentCard';
export { AIAgentActivityFeed } from './ai/AIAgentActivityFeed';
export { AIAgentDetailSidebar } from './ai/AIAgentDetailSidebar';
export { AIAgentExecutionPanel } from './ai/AIAgentExecutionPanel';

// Reminder Components
export { ReminderConfigPanel } from './reminders/ReminderConfig';
export { ReminderLog } from './reminders/ReminderLog';

// Advanced Report Components
export { AgentPerformanceReport } from './reports/AgentPerformanceReport';
export { CollectionsReport } from './reports/CollectionsReport';
export { ExecutiveSummary } from './reports/ExecutiveSummary';
export { OccupancyReport } from './reports/OccupancyReport';
export { ReportPDFExport } from './reports/ReportPDFExport';
export { TrendChart, BarChart } from './reports/TrendChart';
export type { TrendChartDataPoint, BarChartDataPoint } from './reports/TrendChart';
