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
