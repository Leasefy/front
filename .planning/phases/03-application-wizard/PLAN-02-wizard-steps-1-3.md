# PLAN-02: Wizard Steps 1-3 (Personal, Empleo, Ingresos)

**Phase**: 03-application-wizard
**Focus**: First three wizard step forms
**Estimated Scope**: ~5 files, ~800 LOC
**Depends on**: PLAN-01

---

## Goal Statement

Implement the first three wizard steps with complete form fields, validation, and Luxterra-style UI. Each step collects data essential for the AI risk scoring algorithm.

---

## Success Criteria

- [ ] Step 1 (Personal) collects identity, contact, and stability data
- [ ] Step 2 (Empleo) collects employment type, company, and tenure
- [ ] Step 3 (Ingresos) collects income, obligations, and computes available rent budget
- [ ] All fields validate inline with helpful error messages
- [ ] Forms auto-save to context on change
- [ ] UI matches Luxterra minimal style (text-xs, rounded-sm, gray palette)

---

## Files to Create

```
src/components/wizard/steps/StepPersonal.tsx
src/components/wizard/steps/StepEmployment.tsx
src/components/wizard/steps/StepIncome.tsx
src/lib/validation/applicationValidation.ts
```

---

## Step 1: Personal Information

### Fields Required for Scoring

| Field | Type | Scoring Purpose |
|-------|------|-----------------|
| fullName | text | Identity |
| documentType | select | Identity |
| documentNumber | text | Identity verification |
| dateOfBirth | date | Age factor |
| phone | tel | Contact |
| email | email | Contact |
| currentAddress | text | Verification |
| timeAtCurrentAddress | number (months) | **Stability indicator** |
| maritalStatus | select | Demographics |
| dependents | number | **Payment capacity factor** |

### UI Layout

```
┌────────────────────────────────────────┐
│ Informacion Personal                   │
│ Cuéntanos sobre ti                     │
├────────────────────────────────────────┤
│ Nombre completo                        │
│ [________________________]             │
│                                        │
│ Tipo documento    Número documento     │
│ [CC ▼]            [______________]     │
│                                        │
│ Fecha nacimiento  Teléfono             │
│ [__________]      [______________]     │
│                                        │
│ Email                                  │
│ [________________________]             │
│                                        │
│ Dirección actual                       │
│ [________________________]             │
│                                        │
│ Tiempo en dirección actual (meses)     │
│ [____]                                 │
│                                        │
│ Estado civil       Dependientes        │
│ [Soltero ▼]        [__]                │
└────────────────────────────────────────┘
```

---

## Step 2: Employment Information

### Fields Required for Scoring

| Field | Type | Scoring Purpose |
|-------|------|-----------------|
| employmentStatus | select | **Primary risk factor** |
| companyName | text | Verification |
| industry | select | **Industry stability factor** |
| position | text | Income verification |
| contractType | select | **Job security indicator** |
| timeAtJob | number (months) | **Employment stability** |
| employerPhone | tel | Verification |
| employerAddress | text | Verification |

### Conditional Logic

- If `employmentStatus === 'unemployed'`: show only explanation field
- If `employmentStatus === 'student'`: show institution fields
- If `employmentStatus === 'retired'`: show pension info

### UI Layout

```
┌────────────────────────────────────────┐
│ Información Laboral                    │
│ Tu situación de empleo                 │
├────────────────────────────────────────┤
│ Situación laboral                      │
│ [Empleado ▼]                           │
│                                        │
│ ── Si empleado/independiente ──        │
│                                        │
│ Empresa                                │
│ [________________________]             │
│                                        │
│ Industria          Cargo               │
│ [Tecnología ▼]     [______________]    │
│                                        │
│ Tipo de contrato   Antigüedad (meses)  │
│ [Indefinido ▼]     [____]              │
│                                        │
│ Teléfono empleador                     │
│ [________________________]             │
│                                        │
│ Dirección empleador                    │
│ [________________________]             │
└────────────────────────────────────────┘
```

---

## Step 3: Income Information

### Fields Required for Scoring

| Field | Type | Scoring Purpose |
|-------|------|-----------------|
| monthlySalary | currency | **Primary income** |
| additionalIncome | currency | **Secondary income** |
| additionalIncomeSource | text | Verification |
| monthlyObligations | currency | **Debt-to-income ratio** |
| rentBudgetPercent | computed | **Affordability indicator** |

### Computed Fields (shown but not editable)

- **Total Monthly Income** = salary + additional
- **Available for Rent** = total - obligations
- **Recommended Max Rent** = available × 0.30 (30% rule)

### UI Layout

```
┌────────────────────────────────────────┐
│ Información de Ingresos                │
│ Tu capacidad financiera                │
├────────────────────────────────────────┤
│ Salario mensual (COP)                  │
│ [$ ________________]                   │
│                                        │
│ Ingresos adicionales (COP)             │
│ [$ ________________]                   │
│                                        │
│ Fuente de ingresos adicionales         │
│ [________________________]             │
│                                        │
│ Obligaciones mensuales (COP)           │
│ [$ ________________]                   │
│ Incluye: créditos, deudas, otros       │
│ arriendos, cuotas de vehículo, etc.    │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ 📊 Tu capacidad de pago          │   │
│ │                                  │   │
│ │ Ingreso total:     $X,XXX,XXX   │   │
│ │ Obligaciones:      $X,XXX,XXX   │   │
│ │ Disponible:        $X,XXX,XXX   │   │
│ │                                  │   │
│ │ Arriendo recomendado (30%):     │   │
│ │ $X,XXX,XXX                       │   │
│ └──────────────────────────────────┘   │
└────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Create validation utilities
Create `src/lib/validation/applicationValidation.ts`:
- Zod schemas for each step
- Colombian document number validation (CC format)
- Phone number validation (Colombian format)
- Email validation
- Currency formatting helpers

### Step 2: Create StepPersonal component
Create `src/components/wizard/steps/StepPersonal.tsx`:
- Form fields as described
- Real-time validation
- Auto-save to context on blur
- Luxterra styling

### Step 3: Create StepEmployment component
Create `src/components/wizard/steps/StepEmployment.tsx`:
- Conditional field rendering
- Industry dropdown with common Colombian industries
- Contract type dropdown

### Step 4: Create StepIncome component
Create `src/components/wizard/steps/StepIncome.tsx`:
- Currency input formatting ($ X,XXX,XXX)
- Auto-compute totals
- Visual capacity summary card
- 30% affordability indicator

### Step 5: Integrate with WizardShell
Update `src/app/aplicar/[propertyId]/page.tsx`:
- Import step components
- Render based on currentStep
- Pass validation state to navigation

---

## Validation Rules

### Personal Step
```typescript
const personalSchema = z.object({
  fullName: z.string().min(3, 'Nombre muy corto'),
  documentType: z.enum(['cc', 'ce', 'passport']),
  documentNumber: z.string().min(6, 'Documento inválido'),
  dateOfBirth: z.string().refine(isAdult, 'Debes ser mayor de edad'),
  phone: z.string().regex(/^3\d{9}$/, 'Teléfono colombiano inválido'),
  email: z.string().email('Email inválido'),
  currentAddress: z.string().min(10, 'Dirección muy corta'),
  timeAtCurrentAddress: z.number().min(0),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']),
  dependents: z.number().min(0).max(20),
});
```

### Employment Step
```typescript
const employmentSchema = z.object({
  employmentStatus: z.enum(['employed', 'self-employed', 'unemployed', 'retired', 'student']),
  companyName: z.string().optional(),
  industry: z.string().optional(),
  position: z.string().optional(),
  contractType: z.enum(['indefinite', 'fixed-term', 'contractor', 'freelance']).optional(),
  timeAtJob: z.number().min(0).optional(),
  employerPhone: z.string().optional(),
  employerAddress: z.string().optional(),
}).refine(/* conditional logic */);
```

### Income Step
```typescript
const incomeSchema = z.object({
  monthlySalary: z.number().min(0),
  additionalIncome: z.number().min(0),
  additionalIncomeSource: z.string().optional(),
  monthlyObligations: z.number().min(0),
}).refine(data => data.monthlySalary + data.additionalIncome >= data.monthlyObligations, {
  message: 'Obligaciones superan ingresos'
});
```

---

## Constants (Dropdowns)

```typescript
export const DOCUMENT_TYPES = [
  { value: 'cc', label: 'Cédula de Ciudadanía' },
  { value: 'ce', label: 'Cédula de Extranjería' },
  { value: 'passport', label: 'Pasaporte' },
];

export const EMPLOYMENT_STATUS = [
  { value: 'employed', label: 'Empleado' },
  { value: 'self-employed', label: 'Independiente' },
  { value: 'unemployed', label: 'Desempleado' },
  { value: 'retired', label: 'Pensionado' },
  { value: 'student', label: 'Estudiante' },
];

export const CONTRACT_TYPES = [
  { value: 'indefinite', label: 'Término indefinido' },
  { value: 'fixed-term', label: 'Término fijo' },
  { value: 'contractor', label: 'Prestación de servicios' },
  { value: 'freelance', label: 'Freelance' },
];

export const INDUSTRIES = [
  { value: 'tech', label: 'Tecnología' },
  { value: 'finance', label: 'Finanzas' },
  { value: 'healthcare', label: 'Salud' },
  { value: 'education', label: 'Educación' },
  { value: 'retail', label: 'Comercio' },
  { value: 'manufacturing', label: 'Manufactura' },
  { value: 'construction', label: 'Construcción' },
  { value: 'hospitality', label: 'Hotelería' },
  { value: 'government', label: 'Gobierno' },
  { value: 'other', label: 'Otro' },
];

export const MARITAL_STATUS = [
  { value: 'single', label: 'Soltero(a)' },
  { value: 'married', label: 'Casado(a)' },
  { value: 'divorced', label: 'Divorciado(a)' },
  { value: 'widowed', label: 'Viudo(a)' },
];
```

---

## Testing Checklist

- [ ] Step 1 renders all personal fields
- [ ] Step 1 validates document number format
- [ ] Step 1 validates Colombian phone (starts with 3, 10 digits)
- [ ] Step 2 shows/hides fields based on employment status
- [ ] Step 3 auto-computes totals
- [ ] Step 3 shows affordability indicator
- [ ] All steps save to context on blur
- [ ] Validation errors show inline
- [ ] Form persists across page refresh

---

## Notes

- Use React Hook Form or native form state (lighter)
- Currency inputs should format on blur (1500000 → $1,500,000)
- Consider adding tooltips explaining why each field matters for scoring
