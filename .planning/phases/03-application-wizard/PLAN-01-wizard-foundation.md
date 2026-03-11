# PLAN-01: Application Wizard Foundation

**Phase**: 03-application-wizard
**Focus**: Core infrastructure for multi-step wizard
**Estimated Scope**: ~8 files, ~600 LOC

---

## Goal Statement

Create the foundational infrastructure for a 6-step application wizard including TypeScript types for all scoring data, React context for form state management with localStorage persistence, and the wizard shell component with step navigation and progress indicator.

---

## Success Criteria

- [ ] All application/scoring types defined in `src/lib/types/application.ts`
- [ ] Wizard context manages form state across all 6 steps
- [ ] Form data persists to localStorage (user can resume)
- [ ] Wizard shell renders with progress indicator
- [ ] Step navigation works (next/back/jump to completed steps)
- [ ] Route `/aplicar/[propertyId]` exists and renders wizard

---

## Files to Create/Modify

### New Files

```
src/lib/types/application.ts          # All application & scoring types
src/lib/context/ApplicationContext.tsx # React context for wizard state
src/components/wizard/WizardShell.tsx  # Main wizard container
src/components/wizard/WizardProgress.tsx # Progress indicator (6 steps)
src/components/wizard/WizardNavigation.tsx # Next/Back buttons
src/app/aplicar/[propertyId]/page.tsx  # Wizard page route
```

### Types to Define (application.ts)

```typescript
// Personal info for scoring
interface PersonalInfo {
  fullName: string;
  documentType: 'cc' | 'ce' | 'passport';
  documentNumber: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  currentAddress: string;
  timeAtCurrentAddress: number; // months (stability indicator)
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  dependents: number;
}

// Employment for scoring
interface EmploymentInfo {
  employmentStatus: 'employed' | 'self-employed' | 'unemployed' | 'retired' | 'student';
  companyName?: string;
  industry?: string;
  position?: string;
  contractType?: 'indefinite' | 'fixed-term' | 'contractor' | 'freelance';
  timeAtJob?: number; // months (stability indicator)
  employerPhone?: string;
  employerAddress?: string;
}

// Income for scoring
interface IncomeInfo {
  monthlySalary: number;
  additionalIncome: number;
  additionalIncomeSource?: string;
  totalMonthlyIncome: number; // computed
  monthlyObligations: number; // debts, credits, other rents
  availableForRent: number; // computed: income - obligations
}

// References for verification
interface ReferenceInfo {
  previousLandlords: {
    name: string;
    phone: string;
    address: string;
    duration: number; // months
    relationship: string;
  }[];
  employmentReferences: {
    name: string;
    phone: string;
    company: string;
    relationship: string;
  }[];
  personalReferences: {
    name: string;
    phone: string;
    relationship: string;
  }[];
}

// Documents for verification
interface DocumentInfo {
  idDocument: File | null;
  incomeProof: File | null; // pay stubs, tax returns
  employmentLetter?: File | null;
  bankStatements?: File | null;
  creditReport?: File | null; // optional self-provided
}

// Full application
interface Application {
  id: string;
  propertyId: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  currentStep: number;
  personal: Partial<PersonalInfo>;
  employment: Partial<EmploymentInfo>;
  income: Partial<IncomeInfo>;
  references: Partial<ReferenceInfo>;
  documents: Partial<DocumentInfo>;
  hasCoSigner: boolean;
  coSigner?: Partial<PersonalInfo & EmploymentInfo & IncomeInfo>;
  createdAt: string;
  updatedAt: string;
}
```

---

## Implementation Steps

### Step 1: Create application types
Create `src/lib/types/application.ts` with all interfaces above. Include:
- Type exports
- Constants for dropdown options (document types, employment status, etc.)
- Validation helper types

### Step 2: Create wizard context
Create `src/lib/context/ApplicationContext.tsx`:
- Store full Application state
- Provide update functions per section
- localStorage sync on every change
- Load from localStorage on mount
- Clear function for when submitted

### Step 3: Create WizardProgress component
Create `src/components/wizard/WizardProgress.tsx`:
- 6 steps with labels: Personal, Empleo, Ingresos, Referencias, Documentos, Review
- Current step highlighted (purple accent)
- Completed steps show checkmark
- Clickable for completed steps only
- Luxterra minimal style

### Step 4: Create WizardNavigation component
Create `src/components/wizard/WizardNavigation.tsx`:
- Back button (disabled on step 1)
- Next/Submit button
- Validation state awareness
- Luxterra button style (rounded-[2px])

### Step 5: Create WizardShell component
Create `src/components/wizard/WizardShell.tsx`:
- Wraps step content
- Shows property summary header
- Includes WizardProgress
- Includes WizardNavigation
- Slot for step content (children)

### Step 6: Create wizard page route
Create `src/app/aplicar/[propertyId]/page.tsx`:
- Fetch property by ID from mock data
- Wrap in ApplicationContext provider
- Render WizardShell
- Placeholder content for each step

---

## Dependencies

- None (foundation layer)

---

## Testing Checklist

- [ ] Navigate to `/aplicar/prop-001` renders wizard
- [ ] Progress indicator shows 6 steps
- [ ] Current step is highlighted
- [ ] Next button advances to next step
- [ ] Back button returns to previous step
- [ ] Refresh page retains form state (localStorage)
- [ ] Clear localStorage resets wizard
- [ ] Property info shows in header

---

## Notes

- All form validation will be in PLAN-02/03 with actual fields
- Document upload UI is in PLAN-03 (Documentos step)
- This plan creates infrastructure only, actual form fields come next
