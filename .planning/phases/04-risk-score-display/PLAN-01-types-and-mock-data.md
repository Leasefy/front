# PLAN-01: Risk Score Types & Mock Data

---
phase: 4
plan: 1
title: Risk Score Types & Mock Data
status: ready
estimated_tasks: 6
---

## Objective

Create the data foundation for all risk score UI components. This includes TypeScript types for scores, candidates, and AI explanations, plus realistic mock data for 10+ candidate profiles with varied risk levels.

## Must Be True When Done

- [ ] RiskScore type defined with level (A/B/C/D), numeric score, categories
- [ ] Candidate type defined with personal info + application + score
- [ ] 10+ mock candidates with realistic Colombian profiles
- [ ] Pre-written AI explanations for each risk level
- [ ] Score level constants exported with colors and labels
- [ ] Types integrate with existing Application types

## Tasks

### Task 1: Define Risk Score Types
**File**: `src/lib/types/risk-score.ts`

```typescript
// Risk level grades
export type RiskLevel = 'A' | 'B' | 'C' | 'D';

// Category scores (0-100)
export interface ScoreCategory {
  name: string;
  label: string;
  score: number;
  weight: number;
  factors: string[]; // Contributing factors
}

// Risk flags - warnings but not alarmist
export interface RiskFlag {
  id: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion?: string;
}

// Suggested conditions based on profile
export interface SuggestedCondition {
  id: string;
  condition: string;
  reason: string;
}

// Full risk score
export interface RiskScore {
  level: RiskLevel;
  numericScore: number; // 0-100
  categories: ScoreCategory[];
  drivers: string[]; // Key positive drivers
  flags: RiskFlag[];
  suggestedConditions: SuggestedCondition[];
  aiExplanation: string; // Pre-written conversational explanation
}

// Level metadata
export const RISK_LEVELS = {
  A: { label: 'Excelente', color: 'emerald', minScore: 85 },
  B: { label: 'Bueno', color: 'blue', minScore: 70 },
  C: { label: 'Regular', color: 'amber', minScore: 50 },
  D: { label: 'Riesgoso', color: 'red', minScore: 0 },
} as const;
```

**Verification**: File exists, types compile without errors

### Task 2: Define Candidate Types
**File**: `src/lib/types/candidate.ts`

```typescript
import type { RiskScore, RiskLevel } from './risk-score';

// Basic candidate info (for list views)
export interface CandidateBasic {
  id: string;
  fullName: string;
  photo?: string;
  age: number;
  occupation: string;
  riskLevel: RiskLevel;
  numericScore: number;
}

// Full candidate with all details
export interface Candidate extends CandidateBasic {
  // Personal
  documentType: string;
  documentNumber: string;
  phone: string;
  email: string;
  currentAddress: string;

  // Employment
  employmentStatus: string;
  companyName?: string;
  position?: string;
  timeAtJob?: number; // months

  // Income
  monthlySalary: number;
  additionalIncome: number;
  totalIncome: number;
  monthlyObligations: number;
  availableForRent: number;

  // Application meta
  applicationId: string;
  propertyId: string;
  appliedAt: string;

  // Full score
  riskScore: RiskScore;
}
```

**Verification**: Types compile, can be used with existing Application types

### Task 3: Create Score Level Constants
**File**: `src/lib/constants/risk-levels.ts`

Export color utilities and level configuration:
- Level to Tailwind color mapping
- Level to badge variant mapping
- Score to level converter function
- Level descriptions for UI

**Verification**: Constants importable and usable in components

### Task 4: Create Mock AI Explanations
**File**: `src/lib/data/mock-explanations.ts`

Pre-written conversational explanations for each level:

**Level A Example**:
```
"Basado en lo que veo, este candidato tiene un perfil excelente. Su estabilidad laboral de 3 años en la misma empresa y sus ingresos consistentes demuestran responsabilidad financiera. El historial de arrendamientos anteriores es positivo, con referencias que confirman pagos puntuales. No identifico banderas rojas significativas."
```

**Level B Example**:
```
"Este candidato presenta un buen perfil en general. Aunque el tiempo en su empleo actual es relativamente corto (8 meses), sus ingresos cubren cómodamente el arriendo propuesto. Recomendaría verificar las referencias laborales, pero los indicadores principales son positivos."
```

**Level C Example**:
```
"Veo algunos aspectos a considerar con este candidato. Si bien los ingresos son suficientes, el ratio de obligaciones es algo elevado. El historial laboral muestra cambios frecuentes. Sugeriría considerar un depósito adicional o un codeudor para mitigar el riesgo."
```

**Level D Example**:
```
"Debo ser transparente: este perfil presenta varios factores de riesgo. El ratio de obligaciones supera lo recomendado y el historial laboral es inestable. Si decide proceder, recomiendo firmemente requerir un codeudor con buen perfil crediticio."
```

**Verification**: Explanations exist for all 4 levels, tone is warm/professional

### Task 5: Create Mock Candidates Data
**File**: `src/lib/data/mock-candidates.ts`

Create 10+ realistic Colombian candidates:

| Name | Level | Occupation | Key Driver |
|------|-------|------------|------------|
| María García | A | Ingeniera Senior | 5 años misma empresa |
| Carlos Rodríguez | A | Médico | Alto ingreso, bajo riesgo |
| Ana López | B | Analista Financiero | Buen perfil, poco tiempo empleo |
| Juan Martínez | B | Contador | Ingreso estable, algunas deudas |
| Sofia Hernández | C | Freelancer | Ingreso variable |
| Pedro Díaz | C | Vendedor | Historial laboral mixto |
| Laura Torres | D | Desempleada reciente | Buscando empleo |
| Andrés Sánchez | D | Emprendedor | Alto riesgo, ingresos inconsistentes |
| ... | ... | ... | ... |

Each candidate should have:
- Realistic Colombian names
- Varied employment situations
- Different income levels
- Appropriate risk flags
- Pre-written AI explanations

**Verification**: 10+ candidates with all required fields, varied levels

### Task 6: Export and Index
**File**: `src/lib/types/index.ts` (update)

Add exports for new types. Create `src/lib/data/index.ts` if needed.

**Verification**: All types and data importable from central locations

## Dependencies

- Existing `Application` types from `src/lib/types/application.ts`
- Existing property types

## Notes

- AI explanations should feel like a trusted advisor, not a robot
- Mock data should be believable - real Colombian scenarios
- Scores should be pre-calculated, no algorithm needed (backend responsibility)
- Colors should work with Luxterra aesthetic (muted, professional)
