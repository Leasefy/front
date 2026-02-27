/**
 * Pre-written AI explanations for risk assessments
 * Written in conversational Spanish with "asesor de confianza" tone
 * These simulate what the AI scoring system would generate
 */

import type { RiskLevel } from '@/lib/types/risk-score';

// ============================================================================
// Explanation Templates by Level
// ============================================================================

/**
 * Level A - Excellent profile explanations
 * Tone: Confident, reassuring, highlights strengths
 */
export const LEVEL_A_EXPLANATIONS = [
  `Basado en lo que veo, este candidato tiene un perfil excelente. Su estabilidad laboral de mas de 3 años en la misma empresa y sus ingresos consistentes demuestran responsabilidad financiera. El historial de arrendamientos anteriores es positivo, con referencias que confirman pagos puntuales. No identifico banderas rojas significativas.`,

  `Este es un perfil muy solido. Los ingresos son holgados respecto al arriendo (el ratio esta muy por debajo del 30% recomendado), y la estabilidad laboral en una empresa reconocida es un excelente indicador. Las referencias personales y laborales respaldan el perfil. Puede proceder con confianza.`,

  `Me genera mucha confianza este candidato. Tiene un contrato laboral indefinido con 4 años de antiguedad, sus obligaciones financieras son minimas, y el margen entre sus ingresos y el arriendo es muy saludable. Las referencias de arrendadores anteriores son todas positivas.`,

  `Un perfil ejemplar en varios aspectos. La combinacion de empleo estable, buenos ingresos, bajo nivel de obligaciones y referencias verificables hace de este candidato una opcion muy segura. El historial crediticio informal (pagos de servicios, arriendos anteriores) es impecable.`,
];

/**
 * Level B - Good profile explanations
 * Tone: Positive with minor observations, balanced
 */
export const LEVEL_B_EXPLANATIONS = [
  `Este candidato presenta un buen perfil en general. Aunque el tiempo en su empleo actual es relativamente corto (8 meses), sus ingresos cubren comodamente el arriendo propuesto. Recomendaria verificar las referencias laborales, pero los indicadores principales son positivos.`,

  `Un perfil solido con algunos aspectos a considerar. Los ingresos son adecuados y el empleo es estable, aunque veo que tiene algunas obligaciones crediticias que reducen su capacidad. El ratio sigue siendo aceptable (alrededor del 28%). Las referencias de empleadores anteriores son buenas.`,

  `Me parece un buen candidato. Su situacion laboral como independiente es estable segun los documentos de ingresos de los ultimos 6 meses, y el promedio de ingresos es consistente. Sugeriria solicitar un mes adicional de extractos bancarios para mayor seguridad.`,

  `Perfil positivo en general. La estabilidad en su residencia actual (2 años) es un buen indicador. Los ingresos son suficientes, aunque el ratio de obligaciones es ligeramente mayor al ideal. Verificar la referencia del arrendador actual seria prudente.`,

  `Veo un candidato confiable. El empleo de termino fijo tiene renovacion reciente (hace 3 meses), lo cual muestra continuidad. Los ingresos son buenos y las referencias personales son solidas. Solo noto que no tiene historial de arrendamiento previo, lo cual es menor.`,
];

/**
 * Level C - Mixed profile explanations
 * Tone: Balanced, clear about concerns, offers mitigations
 */
export const LEVEL_C_EXPLANATIONS = [
  `Veo algunos aspectos a considerar con este candidato. Si bien los ingresos son suficientes, el ratio de obligaciones es algo elevado (cerca del 35%). El historial laboral muestra cambios frecuentes. Sugeriria considerar un deposito adicional o un codeudor para mitigar el riesgo.`,

  `Este perfil presenta factores mixtos. La situacion laboral actual es estable, pero el tiempo en el empleo es corto (4 meses) y hay un gap de empleo en el último año. Los ingresos son justos para el arriendo. Recomiendo solicitar un codeudor con mejor perfil.`,

  `Hay aspectos positivos y otros que merecen atencion. Como freelancer, los ingresos son variables - los ultimos 3 meses muestran fluctuacion del 40%. Sin embargo, tiene buenas referencias personales y un historial de arrendamiento sin problemas. Un deposito mayor seria prudente.`,

  `Debo señalar algunas consideraciones. El candidato tiene capacidad de pago, pero las obligaciones actuales (credito de vehiculo y tarjetas) limitan su margen. Ademas, el contrato laboral es de prestacion de servicios sin historial largo. Sugiero condiciones adicionales de garantia.`,

  `Perfil con factores a evaluar. Los ingresos principales provienen de comisiones de ventas, lo cual genera variabilidad. El promedio de los ultimos 6 meses cubre el arriendo, pero meses individuales no. Considere requerir un deposito de 2 meses o un codeudor.`,
];

/**
 * Level D - High risk profile explanations
 * Tone: Transparent but not alarmist, always offers path forward
 */
export const LEVEL_D_EXPLANATIONS = [
  `Debo ser transparente: este perfil presenta varios factores de riesgo. El ratio de obligaciones supera lo recomendado (45% de ingresos) y el historial laboral muestra inestabilidad. Si decide proceder, recomiendo firmemente requerir un codeudor con buen perfil crediticio.`,

  `Este candidato tiene desafios importantes. Actualmente desempleado con 2 meses buscando trabajo, aunque tiene ahorros documentados para 4 meses de arriendo. El historial laboral previo era estable. Si hay interes, sugiero un codeudor obligatorio y verificacion de la nueva situacion laboral en 60 dias.`,

  `Veo riesgos significativos en este perfil. Los ingresos como emprendedor son inconsistentes - hay meses con ingresos muy bajos. Adicionalmente, tiene obligaciones crediticias importantes. Para proceder de forma segura, seria necesario un codeudor con ingresos demostrables y estables.`,

  `Debo plantear preocupaciones con este candidato. El ratio arriendo/ingresos excede el 40% recomendado, hay historial de pagos atrasados en referencias anteriores, y el empleo actual tiene menos de 3 meses. Si decide considerarlo, exija garantias adicionales sustanciales.`,

  `Este perfil requiere atencion especial. Si bien la persona tiene empleo, sus ingresos no cubren comodamente el arriendo propuesto, y las obligaciones actuales son altas. Hubo un arrendamiento previo con terminacion anticipada. Recomendaria buscar un inmueble de menor valor o requerir codeudor solido.`,
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all explanation templates for a level
 */
export function getExplanationTemplates(level: RiskLevel): string[] {
  const templates = {
    A: LEVEL_A_EXPLANATIONS,
    B: LEVEL_B_EXPLANATIONS,
    C: LEVEL_C_EXPLANATIONS,
    D: LEVEL_D_EXPLANATIONS,
  };
  return templates[level];
}

/**
 * Get a random explanation for a level (for mock data generation)
 */
export function getRandomExplanation(level: RiskLevel): string {
  const templates = getExplanationTemplates(level);
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Get a specific explanation by index (for consistent mock data)
 */
export function getExplanationByIndex(level: RiskLevel, index: number): string {
  const templates = getExplanationTemplates(level);
  return templates[index % templates.length];
}

// ============================================================================
// Common Phrases for Custom Explanations
// ============================================================================

/**
 * Positive driver phrases
 */
export const POSITIVE_DRIVERS = {
  stability: {
    longTermJob: 'Estabilidad laboral de mas de X años',
    longTermResidence: 'Residencia estable por X años',
    indefiniteContract: 'Contrato laboral indefinido',
    consistentIncome: 'Ingresos consistentes documentados',
  },
  financial: {
    healthyRatio: 'Ratio arriendo/ingresos saludable (X%)',
    lowObligations: 'Pocas obligaciones financieras',
    goodMargin: 'Amplio margen entre ingresos y obligaciones',
    savings: 'Ahorros documentados',
  },
  references: {
    positiveLandlord: 'Referencias de arrendadores anteriores positivas',
    employerVerified: 'Empleo verificado por empleador',
    strongPersonal: 'Referencias personales solidas',
  },
};

/**
 * Concern phrases (non-alarmist)
 */
export const CONCERN_PHRASES = {
  employment: {
    shortTenure: 'Tiempo corto en empleo actual',
    frequentChanges: 'Historial con cambios laborales frecuentes',
    contractType: 'Tipo de contrato con menor estabilidad',
    variableIncome: 'Ingresos con variabilidad',
  },
  financial: {
    highRatio: 'Ratio de obligaciones elevado',
    tightMargin: 'Margen ajustado para el arriendo',
    recentDebts: 'Obligaciones crediticias recientes',
  },
  history: {
    noRentalHistory: 'Sin historial de arrendamiento previo',
    shortRentals: 'Arrendamientos anteriores de corta duración',
    earlyTermination: 'Terminacion anticipada en arriendo previo',
  },
};

/**
 * Recommendation phrases
 */
export const RECOMMENDATION_PHRASES = {
  proceed: {
    withConfidence: 'Puede proceder con confianza.',
    verifyReferences: 'Verificar referencias es recomendable.',
    standardConditions: 'Condiciones estandar del contrato.',
  },
  caution: {
    additionalDeposit: 'Considere un deposito adicional.',
    coSigner: 'Recomiendo solicitar un codeudor.',
    verifyDocuments: 'Verifique documentacion adicional.',
    shorterTerm: 'Un contrato de plazo inicial mas corto seria prudente.',
  },
  essential: {
    mandatoryCosigner: 'Un codeudor es firmemente recomendado.',
    additionalGuarantees: 'Garantias adicionales son necesarias.',
    alternativeProperty: 'Considere un inmueble de menor valor.',
  },
};
