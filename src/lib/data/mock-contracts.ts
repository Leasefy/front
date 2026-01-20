/**
 * Mock contract data for development
 * Includes templates for 3 contract types and sample signed contracts
 */

import type {
  Contract,
  ContractTemplate,
  ContractClause,
  ContractStep,
  ContractType,
} from '@/lib/types/contract';
import { mockProperties } from './mock-properties';
import { MOCK_CANDIDATES } from './mock-candidates';

// ============================================================================
// Contract Clauses by Type
// ============================================================================

const COMMON_CLAUSES: ContractClause[] = [
  {
    id: 'clause-objeto',
    title: 'CLAUSULA PRIMERA: Objeto del Contrato',
    content:
      'El ARRENDADOR entrega al ARRENDATARIO a titulo de arrendamiento el inmueble ubicado en la direccion indicada, para ser destinado exclusivamente a vivienda del arrendatario y su nucleo familiar.',
    required: true,
  },
  {
    id: 'clause-canon',
    title: 'CLAUSULA SEGUNDA: Canon de Arrendamiento',
    content:
      'El canon de arrendamiento mensual sera la suma indicada en este contrato, pagadera por periodos mensuales anticipados dentro de los primeros cinco (5) dias de cada periodo.',
    required: true,
  },
  {
    id: 'clause-deposito',
    title: 'CLAUSULA TERCERA: Deposito de Garantia',
    content:
      'El ARRENDATARIO entrega al ARRENDADOR la suma indicada como deposito de garantia, la cual sera devuelta al terminar el contrato, una vez verificado el estado del inmueble y el pago de todos los servicios.',
    required: true,
  },
  {
    id: 'clause-duracion',
    title: 'CLAUSULA CUARTA: Duracion',
    content:
      'El termino de duracion del presente contrato es el indicado, contado a partir de la fecha de inicio estipulada. A su vencimiento, se prorrogara automaticamente por periodos iguales y sucesivos.',
    required: true,
  },
  {
    id: 'clause-obligaciones-arrendatario',
    title: 'CLAUSULA QUINTA: Obligaciones del Arrendatario',
    content:
      'Son obligaciones del ARRENDATARIO: a) Pagar el canon de arrendamiento dentro del plazo estipulado. b) Pagar oportunamente los servicios publicos. c) Mantener el inmueble en buen estado de conservacion. d) No modificar la estructura del inmueble sin autorizacion escrita. e) Permitir la visita del propietario con previo aviso. f) Restituir el inmueble al termino del contrato.',
    required: true,
  },
  {
    id: 'clause-obligaciones-arrendador',
    title: 'CLAUSULA SEXTA: Obligaciones del Arrendador',
    content:
      'Son obligaciones del ARRENDADOR: a) Entregar el inmueble en buen estado. b) Mantener en el inmueble los servicios, cosas y usos conexos. c) Abstenerse de efectuar obras que perturben el goce del arrendatario.',
    required: true,
  },
  {
    id: 'clause-terminacion',
    title: 'CLAUSULA SEPTIMA: Causales de Terminacion',
    content:
      'El contrato podra darse por terminado anticipadamente por: a) Mutuo acuerdo. b) Incumplimiento de las obligaciones contractuales. c) Destinacion del inmueble a fines distintos a vivienda. d) Subarriendo no autorizado.',
    required: true,
  },
  {
    id: 'clause-preaviso',
    title: 'CLAUSULA OCTAVA: Preaviso',
    content:
      'Para terminar el contrato, cualquiera de las partes debera dar aviso escrito con no menos de tres (3) meses de anticipacion.',
    required: true,
  },
  {
    id: 'clause-ley',
    title: 'CLAUSULA NOVENA: Legislacion Aplicable',
    content:
      'Este contrato se rige por la Ley 820 de 2003 y demas normas concordantes del Codigo Civil colombiano.',
    required: true,
  },
];

const FURNISHED_CLAUSES: ContractClause[] = [
  {
    id: 'clause-inventario',
    title: 'CLAUSULA ADICIONAL: Inventario de Bienes Muebles',
    content:
      'El inmueble se entrega con los muebles y enseres relacionados en el inventario anexo, los cuales forman parte integral del presente contrato. El ARRENDATARIO se obliga a conservarlos y devolverlos en buen estado.',
    required: true,
  },
  {
    id: 'clause-danos-muebles',
    title: 'CLAUSULA ADICIONAL: Danos a Bienes Muebles',
    content:
      'Los danos a los muebles o enseres por uso indebido o negligencia seran de responsabilidad del ARRENDATARIO, quien debera pagar el valor de reposicion o reparacion.',
    required: true,
  },
];

const SHARED_CLAUSES: ContractClause[] = [
  {
    id: 'clause-areas-comunes',
    title: 'CLAUSULA ADICIONAL: Areas Comunes',
    content:
      'El ARRENDATARIO tendra derecho al uso de las areas comunes del inmueble (cocina, sala, banos compartidos) de acuerdo con las normas de convivencia establecidas.',
    required: true,
  },
  {
    id: 'clause-convivencia',
    title: 'CLAUSULA ADICIONAL: Normas de Convivencia',
    content:
      'El ARRENDATARIO se obliga a respetar las normas de convivencia del inmueble, incluyendo horarios de silencio, uso de areas comunes, y trato respetuoso con los demas ocupantes.',
    required: true,
  },
  {
    id: 'clause-servicios-incluidos',
    title: 'CLAUSULA ADICIONAL: Servicios Incluidos',
    content:
      'El canon de arrendamiento incluye los siguientes servicios: agua, energia electrica, gas, internet. Cualquier consumo excesivo sera facturado de manera proporcional.',
    required: true,
  },
];

// ============================================================================
// Contract Templates
// ============================================================================

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'template-basico',
    type: 'basico',
    name: 'Contrato Basico',
    description:
      'Arriendo estandar sin muebles. Ideal para inquilinos que tienen sus propios muebles y buscan un espacio vacio para personalizar.',
    clauses: COMMON_CLAUSES,
  },
  {
    id: 'template-amoblado',
    type: 'amoblado',
    name: 'Contrato Amoblado',
    description:
      'Arriendo con muebles incluidos. Incluye inventario detallado de bienes y condiciones especiales para su cuidado.',
    clauses: [...COMMON_CLAUSES, ...FURNISHED_CLAUSES],
  },
  {
    id: 'template-compartido',
    type: 'compartido',
    name: 'Contrato Compartido',
    description:
      'Arriendo de habitacion con areas comunes compartidas. Incluye normas de convivencia y servicios basicos.',
    clauses: [...COMMON_CLAUSES, ...SHARED_CLAUSES],
  },
];

// ============================================================================
// Mock Contracts
// ============================================================================

/**
 * Sample contracts in different states for testing
 */
export const MOCK_CONTRACTS: Contract[] = [
  // Contract 1: Active contract (both signed)
  {
    id: 'contract-001',
    propertyId: 'prop-002',
    tenantId: 'cand-002',
    landlordId: 'landlord-001',
    templateId: 'template-basico',
    type: 'basico',
    status: 'active',
    propertyAddress: 'Calle 116 #15-40, Apto 1201',
    propertyCity: 'Bogota',
    tenantName: 'Maria Elena Rodriguez',
    tenantEmail: 'maria.rodriguez@email.com',
    tenantPhone: '+57 311 234 5678',
    tenantDocument: '52.987.654',
    landlordName: 'Carlos Alberto Mendez',
    landlordEmail: 'carlos.mendez@email.com',
    landlordDocument: '80.123.456',
    monthlyRent: 3800000,
    depositAmount: 7600000,
    adminFee: 380000,
    startDate: '2026-02-01',
    endDate: '2027-01-31',
    paymentDueDay: 5,
    landlordSignature: {
      signedAt: '2026-01-15T10:30:00Z',
      signedBy: 'Carlos Alberto Mendez',
      signerId: 'landlord-001',
      ipAddress: '190.85.23.145',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      status: 'signed',
    },
    tenantSignature: {
      signedAt: '2026-01-16T14:20:00Z',
      signedBy: 'Maria Elena Rodriguez',
      signerId: 'cand-002',
      ipAddress: '181.52.67.89',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)',
      status: 'signed',
    },
    createdAt: '2026-01-14T09:00:00Z',
    updatedAt: '2026-01-16T14:20:00Z',
  },
  // Contract 2: Pending tenant signature
  {
    id: 'contract-002',
    propertyId: 'prop-001',
    tenantId: 'cand-001',
    landlordId: 'landlord-001',
    templateId: 'template-amoblado',
    type: 'amoblado',
    status: 'pending_tenant',
    propertyAddress: 'Carrera 7 #73-55, Apto 802',
    propertyCity: 'Bogota',
    tenantName: 'Andres Felipe Martinez',
    tenantEmail: 'andres.martinez@email.com',
    tenantPhone: '+57 310 456 7890',
    tenantDocument: '1.098.765.432',
    landlordName: 'Carlos Alberto Mendez',
    landlordEmail: 'carlos.mendez@email.com',
    landlordDocument: '80.123.456',
    monthlyRent: 2800000,
    depositAmount: 5600000,
    adminFee: 250000,
    startDate: '2026-02-15',
    endDate: '2027-02-14',
    paymentDueDay: 1,
    landlordSignature: {
      signedAt: '2026-01-18T16:45:00Z',
      signedBy: 'Carlos Alberto Mendez',
      signerId: 'landlord-001',
      ipAddress: '190.85.23.145',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      status: 'signed',
    },
    tenantSignature: null,
    createdAt: '2026-01-18T15:00:00Z',
    updatedAt: '2026-01-18T16:45:00Z',
  },
  // Contract 3: Pending landlord signature (draft state ready for signing)
  {
    id: 'contract-003',
    propertyId: 'prop-006',
    tenantId: 'cand-006',
    landlordId: 'landlord-001',
    templateId: 'template-compartido',
    type: 'compartido',
    status: 'pending_landlord',
    propertyAddress: 'Calle 10 #43D-20, Apto 501',
    propertyCity: 'Medellin',
    tenantName: 'Laura Patricia Gonzalez',
    tenantEmail: 'laura.gonzalez@email.com',
    tenantPhone: '+57 300 876 5432',
    tenantDocument: '43.567.890',
    landlordName: 'Carlos Alberto Mendez',
    landlordEmail: 'carlos.mendez@email.com',
    landlordDocument: '80.123.456',
    monthlyRent: 1200000,
    depositAmount: 1200000,
    adminFee: 0,
    startDate: '2026-03-01',
    endDate: '2027-02-28',
    paymentDueDay: 10,
    landlordSignature: null,
    tenantSignature: null,
    createdAt: '2026-01-20T09:00:00Z',
    updatedAt: '2026-01-20T09:00:00Z',
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get contract template by ID
 */
export function getTemplateById(templateId: string): ContractTemplate | undefined {
  return CONTRACT_TEMPLATES.find((t) => t.id === templateId);
}

/**
 * Get contract template by type
 */
export function getTemplateByType(type: ContractType): ContractTemplate | undefined {
  return CONTRACT_TEMPLATES.find((t) => t.type === type);
}

/**
 * Get contract by ID
 */
export function getContractById(propertyId: string, candidateId: string): Contract | undefined {
  return MOCK_CONTRACTS.find(
    (c) => c.propertyId === propertyId && c.tenantId === candidateId
  );
}

/**
 * Get all contracts for a property
 */
export function getContractsForProperty(propertyId: string): Contract[] {
  return MOCK_CONTRACTS.filter((c) => c.propertyId === propertyId);
}

/**
 * Get all contracts for a tenant
 */
export function getContractsForTenant(tenantId: string): Contract[] {
  return MOCK_CONTRACTS.filter((c) => c.tenantId === tenantId);
}

/**
 * Generate timeline steps based on contract status
 */
export function getContractSteps(contract: Contract): ContractStep[] {
  const steps: ContractStep[] = [
    {
      id: 'step-1',
      title: 'Contrato creado',
      description: 'El contrato ha sido generado y esta listo para revision.',
      status: 'completed',
      completedAt: contract.createdAt,
    },
    {
      id: 'step-2',
      title: 'Revision del arrendador',
      description: 'El arrendador revisa los terminos y condiciones.',
      status:
        contract.status === 'draft'
          ? 'current'
          : contract.landlordSignature
            ? 'completed'
            : 'pending',
      completedAt: contract.landlordSignature?.signedAt,
    },
    {
      id: 'step-3',
      title: 'Firma del arrendador',
      description: 'El arrendador firma el contrato electronicamente.',
      status:
        contract.status === 'pending_landlord'
          ? 'current'
          : contract.landlordSignature
            ? 'completed'
            : 'pending',
      completedAt: contract.landlordSignature?.signedAt,
    },
    {
      id: 'step-4',
      title: 'Firma del arrendatario',
      description: 'El arrendatario revisa y firma el contrato.',
      status:
        contract.status === 'pending_tenant'
          ? 'current'
          : contract.tenantSignature
            ? 'completed'
            : 'pending',
      completedAt: contract.tenantSignature?.signedAt,
    },
    {
      id: 'step-5',
      title: 'Contrato activo',
      description: 'Ambas partes han firmado. El contrato esta vigente.',
      status: contract.status === 'active' ? 'completed' : 'pending',
      completedAt:
        contract.status === 'active' ? contract.tenantSignature?.signedAt : undefined,
    },
  ];

  return steps;
}

/**
 * Create a new contract from template
 * (Mock implementation - would call API in production)
 */
export function createContractFromTemplate(
  propertyId: string,
  candidateId: string,
  templateType: ContractType
): Contract | null {
  const property = mockProperties.find((p) => p.id === propertyId);
  const candidate = MOCK_CANDIDATES.find((c) => c.id === candidateId);
  const template = getTemplateByType(templateType);

  if (!property || !candidate || !template) {
    return null;
  }

  const now = new Date().toISOString();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() + 1);
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);

  return {
    id: `contract-new-${Date.now()}`,
    propertyId,
    tenantId: candidateId,
    landlordId: 'landlord-001',
    templateId: template.id,
    type: templateType,
    status: 'pending_landlord',
    propertyAddress: property.address,
    propertyCity: property.city,
    tenantName: candidate.fullName,
    tenantEmail: candidate.email,
    tenantPhone: candidate.phone,
    tenantDocument: '1.234.567.890', // Would come from candidate data
    landlordName: 'Carlos Alberto Mendez',
    landlordEmail: 'carlos.mendez@email.com',
    landlordDocument: '80.123.456',
    monthlyRent: property.price,
    depositAmount: property.price * 2,
    adminFee: property.adminFee,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    paymentDueDay: 5,
    landlordSignature: null,
    tenantSignature: null,
    createdAt: now,
    updatedAt: now,
  };
}
