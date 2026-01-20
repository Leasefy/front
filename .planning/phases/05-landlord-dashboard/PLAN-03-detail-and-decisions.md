# PLAN-03: Candidate Detail & Decision Workflow

---
phase: 5
plan: 3
title: Candidate Detail & Decision Workflow
status: ready
estimated_tasks: 6
wave: 2
depends_on: PLAN-01, PLAN-02
autonomous: true
---

## Objective

Create the full candidate detail experience and decision workflow. When a landlord clicks "Ver más" on a candidate card, they see the complete AI explanation from Phase 4. Decision buttons work at both card and detail level. Notes functionality and "request more info" action provide additional landlord tools.

## Must Be True When Done

- [ ] CandidateDetail drawer/modal shows full RiskScoreDisplay
- [ ] Decision buttons (Pre-aprobar, Aprobar, Rechazar) work on card AND detail
- [ ] Decision state persists in localStorage
- [ ] Notes functionality (add/edit notes per candidate)
- [ ] "Solicitar más información" action updates candidate status
- [ ] Visual feedback for decision changes

## Tasks

### Task 1: Create Decision Context
**File**: `src/lib/context/DecisionContext.tsx`

State management for landlord decisions:

```typescript
interface DecisionState {
  decisions: Record<string, CandidateDecision>;
  notes: Record<string, string>;
}

interface CandidateDecision {
  candidateId: string;
  status: CandidateStatus;
  changedAt: string;
}

interface DecisionContextValue {
  getDecision: (candidateId: string) => CandidateDecision | null;
  setDecision: (candidateId: string, status: CandidateStatus) => void;
  getNote: (candidateId: string) => string;
  setNote: (candidateId: string, note: string) => void;
  clearDecision: (candidateId: string) => void;
}

// localStorage key: 'arriendo-facil-decisions'
// Persists across sessions
```

**Verification**: Context provides state, persists to localStorage

### Task 2: Create Decision Buttons Component
**File**: `src/components/landlord/DecisionButtons.tsx`

Reusable decision actions:

```typescript
interface DecisionButtonsProps {
  candidateId: string;
  currentStatus?: CandidateStatus;
  variant: 'card' | 'detail'; // card = compact, detail = full
  onDecision?: (status: CandidateStatus) => void;
}

// Card variant (compact):
// [Pre-aprobar] [Rechazar]

// Detail variant (full with labels):
// ┌──────────────────────────────────────────────────────┐
// │  [✓ Pre-aprobar]  [✓ Aprobar]  [✗ Rechazar]        │
// │  [📋 Solicitar más info]                            │
// └──────────────────────────────────────────────────────┘
```

Features:
- Visual feedback on current status
- Confirmation for Rechazar action
- Uses DecisionContext for state
- Appropriate colors (green approve, red reject)

**Verification**: Buttons work, state updates, visual feedback shown

### Task 3: Create CandidateDetail Component
**File**: `src/components/landlord/CandidateDetail.tsx`

Full candidate view with Phase 4 RiskScoreDisplay:

```typescript
interface CandidateDetailProps {
  candidate: Candidate; // Full candidate with RiskScore
  isOpen: boolean;
  onClose: () => void;
}

// Layout (drawer from right):
// ┌─────────────────────────────────────────────────────────┐
// │  ✕                                                      │
// ├─────────────────────────────────────────────────────────┤
// │  ┌──────┐                                               │
// │  │ Foto │  María García                         [A]    │
// │  │      │  Ingeniera Senior, 32 años                   │
// │  └──────┘  maria.garcia@email.com • +57 300 123 4567   │
// ├─────────────────────────────────────────────────────────┤
// │                                                         │
// │  [Full RiskScoreDisplay from Phase 4]                  │
// │  - AI Explanation with typing animation                │
// │  - Key Drivers                                         │
// │  - Risk Flags                                          │
// │  - Suggested Conditions                                │
// │  - Category Breakdown                                  │
// │                                                         │
// ├─────────────────────────────────────────────────────────┤
// │  Notas                                                 │
// │  ┌─────────────────────────────────────────────────┐   │
// │  │ [Textarea for notes]                            │   │
// │  └─────────────────────────────────────────────────┘   │
// ├─────────────────────────────────────────────────────────┤
// │  [Pre-aprobar] [Aprobar] [Rechazar] [Más info]         │
// └─────────────────────────────────────────────────────────┘
```

Features:
- Slide-in drawer (Sheet from shadcn)
- Full RiskScoreDisplay with animation
- Notes section
- Decision buttons at bottom (sticky)

**Verification**: Drawer opens, shows full score display, notes work

### Task 4: Create Notes Component
**File**: `src/components/landlord/CandidateNotes.tsx`

Notes functionality for landlord annotations:

```typescript
interface CandidateNotesProps {
  candidateId: string;
  variant?: 'inline' | 'textarea';
}

// Inline: Shows note preview, expands on click
// Textarea: Full editing interface
```

Features:
- Auto-save on blur
- Character count (optional)
- Placeholder text: "Agrega notas sobre este candidato..."
- Uses DecisionContext for persistence

**Verification**: Notes save to context and localStorage

### Task 5: Wire Decisions to Cards
**File**: Update `src/components/landlord/CandidateCard.tsx`

Integrate decision state with cards:

```typescript
// Add to CandidateCard:
// - Show current status badge if decided
// - DecisionButtons with card variant
// - Visual styling change for decided candidates
```

Status badges:
- Pre-aprobado: Blue badge
- Aprobado: Green badge
- Rechazado: Red badge with opacity
- Más info: Amber badge

**Verification**: Cards reflect decision state, buttons work

### Task 6: Create Confirmation Dialog
**File**: `src/components/landlord/DecisionConfirmation.tsx`

Confirmation for important decisions:

```typescript
interface DecisionConfirmationProps {
  action: 'reject' | 'approve';
  candidateName: string;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// For Rechazar:
// "¿Está seguro de rechazar a {name}? Esta acción cambiará el estado del candidato."
```

**Verification**: Dialog appears for reject, confirm works

## Integration Notes

This plan completes the landlord experience:
- Full AI explanation from Phase 4 displayed
- Decisions persist across sessions
- Notes provide personal tracking
- Premium "property manager" feel achieved

## Dependencies

- PLAN-01: Types, mock data
- PLAN-02: CandidateCard, CandidateList
- Phase 4: RiskScoreDisplay, AIExplanation, CategoryBreakdown
- shadcn: Sheet (drawer), Dialog, Textarea

## Premium Service Feel

The overall experience should feel like:
- "The AI analyzed everyone for you"
- "Just review the recommendations"
- "Make the final call with confidence"

Language throughout:
- "Nuestro análisis sugiere..."
- "Basado en la evaluación..."
- "Recomendación del sistema..."
