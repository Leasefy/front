/**
 * Mock candidate data for testing risk score display
 * 12 realistic Colombian profiles with varied risk levels
 */

import type { Candidate } from '@/lib/types/candidate';
import type { RiskScore, ScoreCategory, RiskFlag, SuggestedCondition } from '@/lib/types/risk-score';
import { getExplanationByIndex } from './mock-explanations';

// ============================================================================
// Helper Functions for Building Mock Data
// ============================================================================

function createScoreCategories(
  financial: number,
  employment: number,
  history: number,
  documents: number
): ScoreCategory[] {
  return [
    {
      name: 'financial',
      label: 'Capacidad Financiera',
      score: financial,
      weight: 0.35,
      factors: financial >= 80
        ? ['Ingresos holgados', 'Bajo nivel de deuda', 'Buen margen']
        : financial >= 60
        ? ['Ingresos adecuados', 'Deuda moderada']
        : ['Ingresos ajustados', 'Deuda elevada'],
    },
    {
      name: 'employment',
      label: 'Estabilidad Laboral',
      score: employment,
      weight: 0.30,
      factors: employment >= 80
        ? ['Contrato indefinido', 'Larga antiguedad', 'Empresa reconocida']
        : employment >= 60
        ? ['Empleo estable', 'Antiguedad moderada']
        : ['Empleo reciente', 'Historial variable'],
    },
    {
      name: 'history',
      label: 'Historial de Arrendamiento',
      score: history,
      weight: 0.25,
      factors: history >= 80
        ? ['Referencias excelentes', 'Pagos puntuales', 'Larga estabilidad']
        : history >= 60
        ? ['Buenas referencias', 'Sin problemas reportados']
        : ['Referencias mixtas', 'Historial limitado'],
    },
    {
      name: 'documents',
      label: 'Documentacion',
      score: documents,
      weight: 0.10,
      factors: documents >= 80
        ? ['Documentacion completa', 'Verificable']
        : documents >= 60
        ? ['Documentacion parcial']
        : ['Documentacion incompleta'],
    },
  ];
}

function createRiskScore(
  level: 'A' | 'B' | 'C' | 'D',
  numericScore: number,
  categories: ScoreCategory[],
  drivers: string[],
  flags: RiskFlag[],
  conditions: SuggestedCondition[],
  explanationIndex: number
): RiskScore {
  return {
    level,
    numericScore,
    categories,
    drivers,
    flags,
    suggestedConditions: conditions,
    aiExplanation: getExplanationByIndex(level, explanationIndex),
  };
}

// ============================================================================
// Mock Candidates
// ============================================================================

export const MOCK_CANDIDATES: Candidate[] = [
  // ============================================================
  // LEVEL A - Excellent Profiles (2 candidates)
  // ============================================================
  {
    id: 'cand-001',
    fullName: 'Maria Fernanda Garcia Lopez',
    photo: '/avatars/maria-garcia.jpg',
    age: 34,
    occupation: 'Ingeniera de Software Senior',
    riskLevel: 'A',
    numericScore: 92,
    appliedAt: '2026-01-15T10:30:00Z',

    documentType: 'cc',
    documentNumber: '52.987.654',
    dateOfBirth: '1991-08-12',
    phone: '+57 310 456 7890',
    email: 'maria.garcia@email.com',
    currentAddress: 'Calle 100 #15-25, Apto 502, Bogota',
    timeAtCurrentAddress: 36,
    maritalStatus: 'single',
    dependents: 0,

    employmentStatus: 'employed',
    companyName: 'Globant Colombia',
    industry: 'technology',
    position: 'Senior Software Engineer',
    contractType: 'indefinite',
    timeAtJob: 48,
    employerPhone: '+57 1 234 5678',

    monthlySalary: 12000000,
    additionalIncome: 2000000,
    totalIncome: 14000000,
    monthlyObligations: 1500000,
    availableForRent: 12500000,

    applicationId: 'app-001',
    propertyId: 'prop-001',
    propertyTitle: 'Apartamento en Chapinero Alto',

    previousLandlordsCount: 2,
    employmentReferencesCount: 2,
    personalReferencesCount: 3,

    hasIdDocument: true,
    hasIncomeProof: true,
    hasEmploymentLetter: true,
    hasBankStatements: true,

    riskScore: createRiskScore(
      'A', 92,
      createScoreCategories(95, 92, 88, 100),
      [
        'Estabilidad laboral de 4 años en empresa reconocida',
        'Ingresos holgados (ratio 21%)',
        'Excelentes referencias de arrendadores anteriores',
        'Documentacion completa verificada',
      ],
      [],
      [],
      0
    ),
  },
  {
    id: 'cand-002',
    fullName: 'Nicolás Andres Rodriguez Mejia',
    photo: '/avatars/carlos-rodriguez.jpg',
    age: 42,
    occupation: 'Medico Especialista',
    riskLevel: 'A',
    numericScore: 89,
    appliedAt: '2026-01-14T14:20:00Z',

    documentType: 'cc',
    documentNumber: '79.654.321',
    dateOfBirth: '1983-03-25',
    phone: '+57 315 789 0123',
    email: 'carlos.rodriguez@clinica.com',
    currentAddress: 'Carrera 7 #82-15, Apto 1201, Bogota',
    timeAtCurrentAddress: 48,
    maritalStatus: 'married',
    dependents: 2,

    employmentStatus: 'employed',
    companyName: 'Clinica del Country',
    industry: 'healthcare',
    position: 'Cardiologo',
    contractType: 'indefinite',
    timeAtJob: 60,
    employerPhone: '+57 1 530 0470',

    monthlySalary: 18000000,
    additionalIncome: 5000000,
    totalIncome: 23000000,
    monthlyObligations: 4000000,
    availableForRent: 19000000,

    applicationId: 'app-002',
    propertyId: 'prop-002',
    propertyTitle: 'Casa en Rosales',

    previousLandlordsCount: 1,
    employmentReferencesCount: 2,
    personalReferencesCount: 2,

    hasIdDocument: true,
    hasIncomeProof: true,
    hasEmploymentLetter: true,
    hasBankStatements: true,

    riskScore: createRiskScore(
      'A', 89,
      createScoreCategories(92, 95, 82, 100),
      [
        '5 años como medico especialista estable',
        'Alto ingreso con bajo ratio de obligaciones',
        'Profesion con alta demanda laboral',
        'Propiedad actual por 4 años sin problemas',
      ],
      [],
      [],
      1
    ),
  },

  // ============================================================
  // LEVEL B - Good Profiles (4 candidates)
  // ============================================================
  {
    id: 'cand-003',
    fullName: 'Ana Sofia Lopez Herrera',
    photo: '/avatars/ana-lopez.jpg',
    age: 29,
    occupation: 'Analista Financiero',
    riskLevel: 'B',
    numericScore: 78,
    appliedAt: '2026-01-16T09:15:00Z',

    documentType: 'cc',
    documentNumber: '1.020.789.456',
    dateOfBirth: '1996-11-08',
    phone: '+57 320 123 4567',
    email: 'ana.lopez@banco.com',
    currentAddress: 'Calle 85 #11-50, Apto 304, Bogota',
    timeAtCurrentAddress: 14,
    maritalStatus: 'single',
    dependents: 0,

    employmentStatus: 'employed',
    companyName: 'Bancolombia',
    industry: 'finance',
    position: 'Analista Senior',
    contractType: 'indefinite',
    timeAtJob: 8,
    employerPhone: '+57 4 510 9000',

    monthlySalary: 6500000,
    additionalIncome: 0,
    totalIncome: 6500000,
    monthlyObligations: 800000,
    availableForRent: 5700000,

    applicationId: 'app-003',
    propertyId: 'prop-003',
    propertyTitle: 'Apartamento en Cedritos',

    previousLandlordsCount: 1,
    employmentReferencesCount: 1,
    personalReferencesCount: 2,

    hasIdDocument: true,
    hasIncomeProof: true,
    hasEmploymentLetter: true,
    hasBankStatements: false,

    riskScore: createRiskScore(
      'B', 78,
      createScoreCategories(82, 72, 78, 85),
      [
        'Empleo en empresa reconocida del sector financiero',
        'Ingresos adecuados para el arriendo',
        'Sin obligaciones crediticias significativas',
      ],
      [
        {
          id: 'flag-003-1',
          severity: 'low',
          message: 'Tiempo en empleo actual relativamente corto (8 meses)',
          suggestion: 'Verificar referencias del empleador anterior',
        },
      ],
      [
        {
          id: 'cond-003-1',
          condition: 'Solicitar extractos bancarios de los ultimos 3 meses',
          reason: 'Completar documentacion financiera',
        },
      ],
      0
    ),
  },
  {
    id: 'cand-004',
    fullName: 'Juan Pablo Martinez Gomez',
    photo: '/avatars/juan-martinez.jpg',
    age: 38,
    occupation: 'Contador Publico',
    riskLevel: 'B',
    numericScore: 75,
    appliedAt: '2026-01-13T16:45:00Z',

    documentType: 'cc',
    documentNumber: '80.123.456',
    dateOfBirth: '1987-06-20',
    phone: '+57 311 234 5678',
    email: 'juan.martinez@contable.com',
    currentAddress: 'Carrera 15 #100-20, Apto 802, Bogota',
    timeAtCurrentAddress: 24,
    maritalStatus: 'married',
    dependents: 1,

    employmentStatus: 'employed',
    companyName: 'KPMG Colombia',
    industry: 'finance',
    position: 'Contador Senior',
    contractType: 'indefinite',
    timeAtJob: 30,
    employerPhone: '+57 1 618 3800',

    monthlySalary: 8000000,
    additionalIncome: 1500000,
    totalIncome: 9500000,
    monthlyObligations: 2200000,
    availableForRent: 7300000,

    applicationId: 'app-004',
    propertyId: 'prop-004',
    propertyTitle: 'Apartamento en Santa Barbara',

    previousLandlordsCount: 2,
    employmentReferencesCount: 2,
    personalReferencesCount: 2,

    hasIdDocument: true,
    hasIncomeProof: true,
    hasEmploymentLetter: true,
    hasBankStatements: true,

    riskScore: createRiskScore(
      'B', 75,
      createScoreCategories(74, 80, 75, 100),
      [
        'Estabilidad laboral de 2.5 años',
        'Profesion con demanda constante',
        'Buenos antecedentes de arrendamiento',
      ],
      [
        {
          id: 'flag-004-1',
          severity: 'low',
          message: 'Obligaciones crediticias moderadas (23% de ingresos)',
          suggestion: 'Verificar estado de creditos actuales',
        },
      ],
      [],
      1
    ),
  },
  {
    id: 'cand-005',
    fullName: 'Valentina Restrepo Cardenas',
    photo: '/avatars/valentina-restrepo.jpg',
    age: 31,
    occupation: 'Disenadora UX/UI',
    riskLevel: 'B',
    numericScore: 73,
    appliedAt: '2026-01-17T11:00:00Z',

    documentType: 'cc',
    documentNumber: '1.018.456.789',
    dateOfBirth: '1994-02-14',
    phone: '+57 318 567 8901',
    email: 'valentina.restrepo@design.co',
    currentAddress: 'Calle 72 #10-25, Apto 601, Bogota',
    timeAtCurrentAddress: 18,
    maritalStatus: 'single',
    dependents: 0,

    employmentStatus: 'self-employed',
    companyName: 'Freelance',
    industry: 'technology',
    position: 'UX/UI Designer',
    contractType: 'freelance',
    timeAtJob: 36,

    monthlySalary: 7000000,
    additionalIncome: 2000000,
    totalIncome: 9000000,
    monthlyObligations: 1000000,
    availableForRent: 8000000,

    applicationId: 'app-005',
    propertyId: 'prop-005',
    propertyTitle: 'Apartamento en La Macarena',

    previousLandlordsCount: 2,
    employmentReferencesCount: 0,
    personalReferencesCount: 3,

    hasIdDocument: true,
    hasIncomeProof: true,
    hasEmploymentLetter: false,
    hasBankStatements: true,

    riskScore: createRiskScore(
      'B', 73,
      createScoreCategories(78, 68, 80, 75),
      [
        '3 años de experiencia freelance documentada',
        'Ingresos promedio consistentes',
        'Excelentes referencias de arrendadores',
      ],
      [
        {
          id: 'flag-005-1',
          severity: 'medium',
          message: 'Ingresos variables como freelancer',
          suggestion: 'Revisar consistencia de ultimos 6 meses de ingresos',
        },
      ],
      [
        {
          id: 'cond-005-1',
          condition: 'Solicitar declaracion de renta del ultimo ano',
          reason: 'Verificar estabilidad de ingresos anuales',
        },
      ],
      2
    ),
  },
  {
    id: 'cand-006',
    fullName: 'Santiago Ramirez Ospina',
    photo: '/avatars/santiago-ramirez.jpg',
    age: 27,
    occupation: 'Ingeniero Civil',
    riskLevel: 'B',
    numericScore: 71,
    appliedAt: '2026-01-18T08:30:00Z',

    documentType: 'cc',
    documentNumber: '1.022.345.678',
    dateOfBirth: '1998-09-03',
    phone: '+57 312 890 1234',
    email: 'santiago.ramirez@construir.com',
    currentAddress: 'Carrera 11 #90-50, Apto 203, Bogota',
    timeAtCurrentAddress: 12,
    maritalStatus: 'single',
    dependents: 0,

    employmentStatus: 'employed',
    companyName: 'Constructora Colpatria',
    industry: 'construction',
    position: 'Ingeniero de Proyectos',
    contractType: 'fixed-term',
    timeAtJob: 14,
    employerPhone: '+57 1 756 0000',

    monthlySalary: 5500000,
    additionalIncome: 0,
    totalIncome: 5500000,
    monthlyObligations: 500000,
    availableForRent: 5000000,

    applicationId: 'app-006',
    propertyId: 'prop-006',
    propertyTitle: 'Apartaestudio en Chapinero',

    previousLandlordsCount: 0,
    employmentReferencesCount: 2,
    personalReferencesCount: 2,

    hasIdDocument: true,
    hasIncomeProof: true,
    hasEmploymentLetter: true,
    hasBankStatements: true,

    riskScore: createRiskScore(
      'B', 71,
      createScoreCategories(80, 70, 60, 100),
      [
        'Profesion con buena demanda laboral',
        'Bajo nivel de obligaciones',
        'Documentacion completa',
      ],
      [
        {
          id: 'flag-006-1',
          severity: 'low',
          message: 'Sin historial de arrendamiento previo (primer arriendo)',
          suggestion: 'Solicitar referencias adicionales de familia o trabajo',
        },
        {
          id: 'flag-006-2',
          severity: 'low',
          message: 'Contrato a termino fijo',
          suggestion: 'Verificar fecha de renovacion del contrato',
        },
      ],
      [
        {
          id: 'cond-006-1',
          condition: 'Considerar solicitar codeudor o deposito adicional',
          reason: 'Primer arrendamiento, mitigar falta de historial',
        },
      ],
      4
    ),
  },

  // ============================================================
  // LEVEL C - Mixed Profiles (4 candidates)
  // ============================================================
  {
    id: 'cand-007',
    fullName: 'Sofia Alejandra Hernandez Ruiz',
    photo: '/avatars/sofia-hernandez.jpg',
    age: 33,
    occupation: 'Consultora Independiente',
    riskLevel: 'C',
    numericScore: 62,
    appliedAt: '2026-01-16T15:20:00Z',

    documentType: 'cc',
    documentNumber: '52.456.789',
    dateOfBirth: '1992-07-30',
    phone: '+57 316 345 6789',
    email: 'sofia.hernandez@consultor.co',
    currentAddress: 'Calle 53 #7-20, Apto 401, Bogota',
    timeAtCurrentAddress: 10,
    maritalStatus: 'divorced',
    dependents: 1,

    employmentStatus: 'self-employed',
    companyName: 'Independiente',
    industry: 'other',
    position: 'Consultora de Marketing',
    contractType: 'freelance',
    timeAtJob: 18,

    monthlySalary: 5000000,
    additionalIncome: 2500000,
    totalIncome: 7500000,
    monthlyObligations: 2000000,
    availableForRent: 5500000,

    applicationId: 'app-007',
    propertyId: 'prop-007',
    propertyTitle: 'Apartamento en Galerias',

    previousLandlordsCount: 2,
    employmentReferencesCount: 0,
    personalReferencesCount: 2,

    hasIdDocument: true,
    hasIncomeProof: true,
    hasEmploymentLetter: false,
    hasBankStatements: true,

    riskScore: createRiskScore(
      'C', 62,
      createScoreCategories(58, 55, 72, 75),
      [
        'Referencias de arrendadores anteriores buenas',
        '18 meses de actividad freelance documentada',
      ],
      [
        {
          id: 'flag-007-1',
          severity: 'medium',
          message: 'Ingresos variables - fluctuacion del 35% entre meses',
          suggestion: 'Solicitar contratos de clientes actuales',
        },
        {
          id: 'flag-007-2',
          severity: 'medium',
          message: 'Ratio de obligaciones elevado (27%)',
          suggestion: 'Verificar estado de obligaciones actuales',
        },
      ],
      [
        {
          id: 'cond-007-1',
          condition: 'Solicitar deposito de 2 meses',
          reason: 'Mitigar variabilidad de ingresos',
        },
        {
          id: 'cond-007-2',
          condition: 'Considerar codeudor',
          reason: 'Respaldo adicional para obligaciones',
        },
      ],
      2
    ),
  },
  {
    id: 'cand-008',
    fullName: 'Pedro Antonio Diaz Castro',
    photo: '/avatars/pedro-diaz.jpg',
    age: 36,
    occupation: 'Vendedor Comercial',
    riskLevel: 'C',
    numericScore: 58,
    appliedAt: '2026-01-15T13:40:00Z',

    documentType: 'cc',
    documentNumber: '79.789.012',
    dateOfBirth: '1989-12-05',
    phone: '+57 314 567 8901',
    email: 'pedro.diaz@ventas.com',
    currentAddress: 'Carrera 68 #22-15, Apto 102, Bogota',
    timeAtCurrentAddress: 8,
    maritalStatus: 'married',
    dependents: 2,

    employmentStatus: 'employed',
    companyName: 'Distribuidora Nacional',
    industry: 'retail',
    position: 'Ejecutivo de Ventas',
    contractType: 'indefinite',
    timeAtJob: 6,
    employerPhone: '+57 1 234 5000',

    monthlySalary: 2500000,
    additionalIncome: 3000000,
    totalIncome: 5500000,
    monthlyObligations: 1200000,
    availableForRent: 4300000,

    applicationId: 'app-008',
    propertyId: 'prop-008',
    propertyTitle: 'Apartamento en Kennedy',

    previousLandlordsCount: 3,
    employmentReferencesCount: 1,
    personalReferencesCount: 2,

    hasIdDocument: true,
    hasIncomeProof: true,
    hasEmploymentLetter: true,
    hasBankStatements: false,

    riskScore: createRiskScore(
      'C', 58,
      createScoreCategories(55, 50, 65, 75),
      [
        'Contrato laboral indefinido',
        'Historial de arrendamiento sin problemas mayores',
      ],
      [
        {
          id: 'flag-008-1',
          severity: 'medium',
          message: 'Ingreso principal basado en comisiones (55% del total)',
          suggestion: 'Revisar promedio de comisiones ultimos 6 meses',
        },
        {
          id: 'flag-008-2',
          severity: 'medium',
          message: 'Historial laboral con cambios frecuentes (3 empleos en 5 años)',
          suggestion: 'Verificar razon de cambios laborales',
        },
        {
          id: 'flag-008-3',
          severity: 'low',
          message: 'Poco tiempo en empleo actual (6 meses)',
        },
      ],
      [
        {
          id: 'cond-008-1',
          condition: 'Solicitar codeudor con ingresos fijos',
          reason: 'Mitigar variabilidad de comisiones',
        },
        {
          id: 'cond-008-2',
          condition: 'Solicitar extractos bancarios 6 meses',
          reason: 'Verificar consistencia de ingresos',
        },
      ],
      4
    ),
  },
  {
    id: 'cand-009',
    fullName: 'Camila Andrea Torres Vargas',
    photo: '/avatars/camila-torres.jpg',
    age: 25,
    occupation: 'Community Manager',
    riskLevel: 'C',
    numericScore: 55,
    appliedAt: '2026-01-17T17:00:00Z',

    documentType: 'cc',
    documentNumber: '1.024.567.890',
    dateOfBirth: '2000-04-18',
    phone: '+57 319 012 3456',
    email: 'camila.torres@social.co',
    currentAddress: 'Calle 45 #15-30, Apto 505, Bogota',
    timeAtCurrentAddress: 6,
    maritalStatus: 'single',
    dependents: 0,

    employmentStatus: 'employed',
    companyName: 'Agencia Digital XYZ',
    industry: 'technology',
    position: 'Community Manager',
    contractType: 'contractor',
    timeAtJob: 4,
    employerPhone: '+57 1 789 0000',

    monthlySalary: 3500000,
    additionalIncome: 500000,
    totalIncome: 4000000,
    monthlyObligations: 800000,
    availableForRent: 3200000,

    applicationId: 'app-009',
    propertyId: 'prop-009',
    propertyTitle: 'Habitacion en Chapinero',

    previousLandlordsCount: 1,
    employmentReferencesCount: 1,
    personalReferencesCount: 2,

    hasIdDocument: true,
    hasIncomeProof: true,
    hasEmploymentLetter: false,
    hasBankStatements: false,

    riskScore: createRiskScore(
      'C', 55,
      createScoreCategories(60, 45, 55, 60),
      [
        'Ingresos cubren el arriendo propuesto',
        'Sin obligaciones crediticias grandes',
      ],
      [
        {
          id: 'flag-009-1',
          severity: 'medium',
          message: 'Contrato de prestacion de servicios (4 meses)',
          suggestion: 'Verificar renovacion del contrato',
        },
        {
          id: 'flag-009-2',
          severity: 'medium',
          message: 'Poco historial de arrendamiento',
          suggestion: 'Solicitar referencias adicionales',
        },
        {
          id: 'flag-009-3',
          severity: 'low',
          message: 'Documentacion incompleta',
          suggestion: 'Solicitar carta laboral y extractos bancarios',
        },
      ],
      [
        {
          id: 'cond-009-1',
          condition: 'Codeudor requerido',
          reason: 'Contrato laboral inestable y poco historial',
        },
        {
          id: 'cond-009-2',
          condition: 'Deposito de 2 meses',
          reason: 'Garantia adicional por perfil',
        },
      ],
      1
    ),
  },
  {
    id: 'cand-010',
    fullName: 'Luis Fernando Moreno Pena',
    photo: '/avatars/luis-moreno.jpg',
    age: 45,
    occupation: 'Comerciante',
    riskLevel: 'C',
    numericScore: 52,
    appliedAt: '2026-01-14T10:00:00Z',

    documentType: 'cc',
    documentNumber: '79.012.345',
    dateOfBirth: '1980-10-22',
    phone: '+57 313 678 9012',
    email: 'luis.moreno@negocio.com',
    currentAddress: 'Carrera 30 #1-15, Local 5, Bogota',
    timeAtCurrentAddress: 24,
    maritalStatus: 'married',
    dependents: 3,

    employmentStatus: 'self-employed',
    companyName: 'Ferreteria El Constructor',
    industry: 'retail',
    position: 'Propietario',
    contractType: 'freelance',
    timeAtJob: 84,

    monthlySalary: 6000000,
    additionalIncome: 0,
    totalIncome: 6000000,
    monthlyObligations: 2500000,
    availableForRent: 3500000,

    applicationId: 'app-010',
    propertyId: 'prop-010',
    propertyTitle: 'Apartamento en Suba',

    previousLandlordsCount: 1,
    employmentReferencesCount: 0,
    personalReferencesCount: 2,

    hasIdDocument: true,
    hasIncomeProof: true,
    hasEmploymentLetter: false,
    hasBankStatements: true,

    riskScore: createRiskScore(
      'C', 52,
      createScoreCategories(48, 60, 55, 75),
      [
        '7 años con negocio propio',
        'Estabilidad en residencia actual',
      ],
      [
        {
          id: 'flag-010-1',
          severity: 'high',
          message: 'Ratio de obligaciones elevado (42%)',
          suggestion: 'Revisar detalle de deudas actuales',
        },
        {
          id: 'flag-010-2',
          severity: 'medium',
          message: 'Ingresos de negocio variables por temporada',
          suggestion: 'Solicitar estados financieros del negocio',
        },
      ],
      [
        {
          id: 'cond-010-1',
          condition: 'Codeudor con ingresos fijos requerido',
          reason: 'Alto nivel de obligaciones existentes',
        },
        {
          id: 'cond-010-2',
          condition: 'Verificar estados financieros del negocio',
          reason: 'Confirmar viabilidad de ingresos',
        },
      ],
      3
    ),
  },

  // ============================================================
  // LEVEL D - High Risk Profiles (2 candidates)
  // ============================================================
  {
    id: 'cand-011',
    fullName: 'Laura Patricia Sanchez Marin',
    photo: '/avatars/laura-sanchez.jpg',
    age: 28,
    occupation: 'En busqueda de empleo',
    riskLevel: 'D',
    numericScore: 38,
    appliedAt: '2026-01-18T14:30:00Z',

    documentType: 'cc',
    documentNumber: '1.019.234.567',
    dateOfBirth: '1997-05-12',
    phone: '+57 317 890 1234',
    email: 'laura.sanchez@email.com',
    currentAddress: 'Calle 80 #30-45, Apto 301, Bogota',
    timeAtCurrentAddress: 24,
    maritalStatus: 'single',
    dependents: 0,

    employmentStatus: 'unemployed',

    monthlySalary: 0,
    additionalIncome: 1500000,
    totalIncome: 1500000,
    monthlyObligations: 400000,
    availableForRent: 1100000,

    applicationId: 'app-011',
    propertyId: 'prop-011',
    propertyTitle: 'Habitacion en Teusaquillo',

    previousLandlordsCount: 2,
    employmentReferencesCount: 1,
    personalReferencesCount: 3,

    hasIdDocument: true,
    hasIncomeProof: false,
    hasEmploymentLetter: false,
    hasBankStatements: true,

    riskScore: createRiskScore(
      'D', 38,
      createScoreCategories(25, 20, 65, 50),
      [
        'Buen historial de arrendamiento previo',
        'Ahorros documentados para 4 meses',
      ],
      [
        {
          id: 'flag-011-1',
          severity: 'high',
          message: 'Actualmente desempleada (2 meses)',
          suggestion: 'Verificar plan de busqueda de empleo',
        },
        {
          id: 'flag-011-2',
          severity: 'high',
          message: 'Ingresos actuales insuficientes para el arriendo',
          suggestion: 'Requiere fuente de ingresos adicional o codeudor',
        },
        {
          id: 'flag-011-3',
          severity: 'medium',
          message: 'Sin comprobante de ingresos estables',
        },
      ],
      [
        {
          id: 'cond-011-1',
          condition: 'Codeudor con empleo estable obligatorio',
          reason: 'Situacion laboral actual inestable',
        },
        {
          id: 'cond-011-2',
          condition: 'Verificar situacion laboral en 60 dias',
          reason: 'Confirmar obtencion de nuevo empleo',
        },
        {
          id: 'cond-011-3',
          condition: 'Deposito de 3 meses',
          reason: 'Garantia adicional por situacion de riesgo',
        },
      ],
      1
    ),
  },
  {
    id: 'cand-012',
    fullName: 'Andres Felipe Gutierrez Rojas',
    photo: '/avatars/andres-gutierrez.jpg',
    age: 32,
    occupation: 'Emprendedor',
    riskLevel: 'D',
    numericScore: 42,
    appliedAt: '2026-01-13T09:45:00Z',

    documentType: 'cc',
    documentNumber: '80.567.890',
    dateOfBirth: '1993-08-28',
    phone: '+57 315 123 4567',
    email: 'andres.gutierrez@startup.co',
    currentAddress: 'Carrera 13 #85-20, Apto 702, Bogota',
    timeAtCurrentAddress: 6,
    maritalStatus: 'single',
    dependents: 0,

    employmentStatus: 'self-employed',
    companyName: 'TechStartup SAS',
    industry: 'technology',
    position: 'Fundador',
    contractType: 'freelance',
    timeAtJob: 18,

    monthlySalary: 2000000,
    additionalIncome: 3000000,
    totalIncome: 5000000,
    monthlyObligations: 2800000,
    availableForRent: 2200000,

    applicationId: 'app-012',
    propertyId: 'prop-012',
    propertyTitle: 'Apartamento en Usaquen',

    previousLandlordsCount: 1,
    employmentReferencesCount: 0,
    personalReferencesCount: 2,

    hasIdDocument: true,
    hasIncomeProof: true,
    hasEmploymentLetter: false,
    hasBankStatements: true,

    riskScore: createRiskScore(
      'D', 42,
      createScoreCategories(35, 40, 50, 75),
      [
        'Documentacion financiera del emprendimiento',
        'Ingresos han crecido los ultimos 3 meses',
      ],
      [
        {
          id: 'flag-012-1',
          severity: 'high',
          message: 'Ratio de obligaciones muy elevado (56%)',
          suggestion: 'Evaluar capacidad real de pago',
        },
        {
          id: 'flag-012-2',
          severity: 'high',
          message: 'Ingresos de startup muy variables e inconsistentes',
          suggestion: 'Solicitar proyecciones financieras del negocio',
        },
        {
          id: 'flag-012-3',
          severity: 'medium',
          message: 'Arriendo anterior termino anticipadamente',
          suggestion: 'Verificar motivo de terminacion',
        },
      ],
      [
        {
          id: 'cond-012-1',
          condition: 'Codeudor con perfil A o B obligatorio',
          reason: 'Alto riesgo financiero del perfil',
        },
        {
          id: 'cond-012-2',
          condition: 'Considerar arriendo de menor valor',
          reason: 'Capacidad de pago limitada',
        },
        {
          id: 'cond-012-3',
          condition: 'Deposito de 3 meses',
          reason: 'Mitigar riesgo de impago',
        },
      ],
      2
    ),
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all candidates
 */
export function getAllCandidates(): Candidate[] {
  return MOCK_CANDIDATES;
}

/**
 * Get candidate by ID
 */
export function getCandidateById(id: string): Candidate | undefined {
  return MOCK_CANDIDATES.find((c) => c.id === id);
}

/**
 * Get candidates by property ID
 */
export function getCandidatesByProperty(propertyId: string): Candidate[] {
  return MOCK_CANDIDATES.filter((c) => c.propertyId === propertyId);
}

/**
 * Get candidates by risk level
 */
export function getCandidatesByLevel(level: 'A' | 'B' | 'C' | 'D'): Candidate[] {
  return MOCK_CANDIDATES.filter((c) => c.riskLevel === level);
}

/**
 * Get candidate count summary by level
 */
export function getCandidateCountByLevel(): Record<'A' | 'B' | 'C' | 'D', number> {
  return {
    A: MOCK_CANDIDATES.filter((c) => c.riskLevel === 'A').length,
    B: MOCK_CANDIDATES.filter((c) => c.riskLevel === 'B').length,
    C: MOCK_CANDIDATES.filter((c) => c.riskLevel === 'C').length,
    D: MOCK_CANDIDATES.filter((c) => c.riskLevel === 'D').length,
  };
}
