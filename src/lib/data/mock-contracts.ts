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
// Contract Clauses by Type - Based on Ley 820 de 2003
// ============================================================================

/**
 * IMPORTANT LEGAL NOTES:
 * - Cash deposits are PROHIBITED in Colombia (Art. 16, Ley 820/2003)
 * - Must use codeudor (co-signer) or poliza de arrendamiento instead
 * - Rent increases limited to 100% of IPC annually (Art. 20)
 * - 3 months notice required for termination (Art. 22-24)
 */

const COMMON_CLAUSES: ContractClause[] = [
  {
    id: 'clause-objeto',
    title: 'CLAUSULA PRIMERA: Objeto del Contrato',
    content:
      'El ARRENDADOR entrega al ARRENDATARIO a titulo de arrendamiento el inmueble ubicado en la direccion indicada en este contrato, junto con su matricula inmobiliaria correspondiente, para ser destinado exclusivamente a vivienda del arrendatario y su nucleo familiar. Queda expresamente prohibido darle un uso diferente al pactado.',
    required: true,
  },
  {
    id: 'clause-canon',
    title: 'CLAUSULA SEGUNDA: Canon de Arrendamiento',
    content:
      'El ARRENDATARIO se obliga a pagar al ARRENDADOR, como canon de arrendamiento, la suma mensual indicada en este contrato, pagadera por periodos mensuales anticipados dentro de los primeros cinco (5) dias de cada mes. El pago se realizara mediante transferencia bancaria o consignacion a la cuenta indicada por el ARRENDADOR. El no pago dentro de los diez (10) dias siguientes al vencimiento constituira mora sin necesidad de requerimiento previo.',
    required: true,
  },
  {
    id: 'clause-garantia',
    title: 'CLAUSULA TERCERA: Garantia del Contrato',
    content:
      'De conformidad con el Articulo 16 de la Ley 820 de 2003, que prohibe expresamente los depositos en dinero efectivo, el cumplimiento de las obligaciones del presente contrato se garantiza mediante poliza de arrendamiento expedida por compania de seguros autorizada, o en su defecto, mediante codeudor o deudor solidario quien respaldara las obligaciones del ARRENDATARIO. La poliza o garantia debera mantenerse vigente durante toda la duracion del contrato y sus prorrogas.',
    required: true,
  },
  {
    id: 'clause-duracion',
    title: 'CLAUSULA CUARTA: Duracion y Prorroga',
    content:
      'El termino de duracion del presente contrato es de doce (12) meses, contados a partir de la fecha de inicio estipulada. De conformidad con el Articulo 6 de la Ley 820 de 2003, a su vencimiento el contrato se prorrogara automaticamente por periodos iguales y sucesivos, salvo que alguna de las partes de aviso escrito a la otra con no menos de tres (3) meses de anticipacion a la fecha de terminacion o prorroga.',
    required: true,
  },
  {
    id: 'clause-incremento',
    title: 'CLAUSULA QUINTA: Incremento del Canon',
    content:
      'De conformidad con el Articulo 20 de la Ley 820 de 2003, cada doce (12) meses de ejecucion del contrato, el canon de arrendamiento podra ser reajustado por el ARRENDADOR. El incremento no podra exceder el ciento por ciento (100%) del Indice de Precios al Consumidor (IPC) del ano inmediatamente anterior, certificado por el DANE. El nuevo canon se aplicara a partir del mes siguiente a la fecha del aniversario del contrato.',
    required: true,
  },
  {
    id: 'clause-servicios',
    title: 'CLAUSULA SEXTA: Servicios Publicos',
    content:
      'Seran de cargo del ARRENDATARIO los servicios publicos de energia electrica, gas natural, acueducto, alcantarillado, aseo y telefono o internet que se causen durante la vigencia del contrato. El ARRENDATARIO debera acreditar el pago oportuno de dichos servicios cuando el ARRENDADOR lo solicite. La desconexion de servicios por mora del ARRENDATARIO sera causal de terminacion del contrato segun el Articulo 22 numeral 2 de la Ley 820 de 2003.',
    required: true,
  },
  {
    id: 'clause-obligaciones-arrendador',
    title: 'CLAUSULA SEPTIMA: Obligaciones del Arrendador',
    content:
      'Son obligaciones del ARRENDADOR conforme al Articulo 8 de la Ley 820 de 2003: a) Entregar el inmueble al ARRENDATARIO en buen estado de servicio, seguridad y sanidad. b) Mantener en el inmueble los servicios, cosas y usos conexos y adicionales en buen estado. c) Entregar copia del presente contrato al ARRENDATARIO dentro de los diez (10) dias siguientes a su firma. d) Cuando se trate de vivienda sometida a regimen de propiedad horizontal, entregar copia del reglamento. e) Hacer las reparaciones locativas mayores y estructurales necesarias.',
    required: true,
  },
  {
    id: 'clause-obligaciones-arrendatario',
    title: 'CLAUSULA OCTAVA: Obligaciones del Arrendatario',
    content:
      'Son obligaciones del ARRENDATARIO conforme al Articulo 9 de la Ley 820 de 2003: a) Pagar el canon de arrendamiento dentro del plazo estipulado. b) Pagar cumplidamente los servicios publicos y cuota de administracion. c) Cuidar el inmueble y las cosas recibidas en arrendamiento. d) Pagar las reparaciones locativas menores (Art. 1998 Codigo Civil). e) Restituir el inmueble a la terminacion del contrato en el estado en que lo recibio, salvo el deterioro natural. f) No subarrendar ni ceder el arriendo sin autorizacion escrita. g) Cumplir las normas de propiedad horizontal si aplica.',
    required: true,
  },
  {
    id: 'clause-terminacion-arrendador',
    title: 'CLAUSULA NOVENA: Causales de Terminacion por el Arrendador',
    content:
      'De conformidad con el Articulo 22 de la Ley 820 de 2003, el ARRENDADOR podra terminar unilateralmente el contrato por: a) Mora en el pago del canon de arrendamiento superior a dos (2) meses. b) Mora en el pago de servicios publicos que cause desconexion. c) Cambio de destinacion del inmueble. d) Subarriendo o cesion no autorizada. e) Incumplimiento de las normas de propiedad horizontal. f) Realizacion de mejoras o modificaciones no autorizadas. g) Cuando el arrendador necesite el inmueble para su propia habitacion por un termino no menor de un (1) ano, dando preaviso de tres (3) meses e indemnizacion equivalente a tres (3) meses de arrendamiento.',
    required: true,
  },
  {
    id: 'clause-terminacion-arrendatario',
    title: 'CLAUSULA DECIMA: Causales de Terminacion por el Arrendatario',
    content:
      'De conformidad con el Articulo 24 de la Ley 820 de 2003, el ARRENDATARIO podra terminar unilateralmente el contrato por: a) Suspension de servicios publicos por accion u omision del arrendador. b) Incumplimiento de las obligaciones del arrendador. c) Renuncia voluntaria al contrato, dando preaviso de tres (3) meses y pagando indemnizacion de tres (3) meses de arrendamiento, salvo que la renuncia sea al vencimiento del contrato o de una prorroga.',
    required: true,
  },
  {
    id: 'clause-clausula-penal',
    title: 'CLAUSULA UNDECIMA: Clausula Penal',
    content:
      'En caso de incumplimiento de cualquiera de las obligaciones contenidas en el presente contrato por parte del ARRENDATARIO, este pagara al ARRENDADOR, a titulo de clausula penal, una suma equivalente a tres (3) meses del canon de arrendamiento vigente. Esta clausula penal se hara efectiva sin perjuicio del pago de los canones adeudados, servicios publicos, cuotas de administracion y demas obligaciones pendientes.',
    required: true,
  },
  {
    id: 'clause-notificaciones',
    title: 'CLAUSULA DUODECIMA: Notificaciones',
    content:
      'Todas las comunicaciones entre las partes relacionadas con el presente contrato se realizaran por escrito a las direcciones fisicas o correos electronicos indicados. Se consideraran validas las notificaciones enviadas por correo certificado, correo electronico con confirmacion de lectura, o cualquier medio que permita acreditar su recepcion. Cualquier cambio de direccion debera notificarse a la otra parte dentro de los cinco (5) dias siguientes.',
    required: true,
  },
  {
    id: 'clause-datos-personales',
    title: 'CLAUSULA DECIMOTERCERA: Proteccion de Datos Personales',
    content:
      'En cumplimiento de la Ley 1581 de 2012 sobre proteccion de datos personales, las partes autorizan el tratamiento de sus datos personales para los fines relacionados con la ejecucion del presente contrato, incluyendo verificacion de antecedentes, cobranza de obligaciones y comunicaciones relacionadas. Los datos seran tratados conforme a las politicas de privacidad de ARRIENDA SEGURO.',
    required: true,
  },
  {
    id: 'clause-ley',
    title: 'CLAUSULA DECIMOCUARTA: Legislacion Aplicable',
    content:
      'El presente contrato se rige por la Ley 820 de 2003 sobre arrendamiento de vivienda urbana, el Codigo Civil colombiano, y demas normas concordantes. Para cualquier controversia, las partes acuerdan someterse a la jurisdiccion de los jueces civiles del domicilio del inmueble arrendado, sin perjuicio de acudir a los mecanismos alternativos de solucion de conflictos.',
    required: true,
  },
  {
    id: 'clause-firmas-electronicas',
    title: 'CLAUSULA DECIMOQUINTA: Validez de Firmas Electronicas',
    content:
      'De conformidad con la Ley 527 de 1999 sobre comercio electronico y el Decreto 2364 de 2012, las partes aceptan expresamente que las firmas electronicas estampadas en el presente contrato tienen la misma validez y efectos juridicos que las firmas manuscritas. Las partes renuncian a impugnar la validez del contrato basandose unicamente en el hecho de haber sido firmado electronicamente.',
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
    adminFee: 380000,
    guaranteeType: 'poliza',
    guaranteeDetails: 'Poliza Seguros del Estado #POL-2026-001234',
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
    adminFee: 250000,
    guaranteeType: 'codeudor',
    guaranteeDetails: 'Juan Carlos Martinez - C.C. 79.456.789',
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
    adminFee: 0,
    guaranteeType: 'poliza',
    guaranteeDetails: 'Poliza Liberty Seguros #LIB-2026-005678',
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
    monthlyRent: property.monthlyRent,
    adminFee: property.adminFee,
    guaranteeType: 'poliza', // Default to insurance policy
    guaranteeDetails: undefined, // To be filled by tenant
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    paymentDueDay: 5,
    landlordSignature: null,
    tenantSignature: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get all contracts for a landlord
 */
export function getContractsForLandlord(landlordId: string): Contract[] {
  return MOCK_CONTRACTS.filter((c) => c.landlordId === landlordId);
}

/**
 * Get pending contracts (awaiting signatures)
 */
export function getPendingContracts(landlordId: string): Contract[] {
  return MOCK_CONTRACTS.filter(
    (c) =>
      c.landlordId === landlordId &&
      (c.status === 'pending_landlord' || c.status === 'pending_tenant' || c.status === 'draft')
  );
}

/**
 * Get active contracts
 */
export function getActiveContracts(landlordId: string): Contract[] {
  return MOCK_CONTRACTS.filter(
    (c) => c.landlordId === landlordId && c.status === 'active'
  );
}
