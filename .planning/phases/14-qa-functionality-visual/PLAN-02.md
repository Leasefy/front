# PLAN-02: Empty States, Form Feedback & Wizard Persistence

**Phase**: 14 - QA Audit - Functionality & Visual
**Requirements**: QAFN-03, QAFN-04, QAFN-07
**Depends on**: None
**Goal**: Every list/grid has an empty state, every form has clear submit feedback, and wizard flows persist on refresh

## Discovery Findings

1. **Empty states**: Several pages need verification — messages, notifications, documents, profile, settings, candidatos, contratos
2. **Form feedback**: All forms must show loading state on submit and success/error feedback
3. **Wizard persistence**: Application wizard should resume from localStorage after page refresh (QAFN-07)

## Tasks

### Task 1: Audit & Add Empty States (QAFN-04)

Check every list/grid page for proper empty states:
- `/inquilino/mensajes` — messages list
- `/inquilino/notificaciones` — notifications list
- `/inquilino/documentos` — documents list
- `/inquilino/perfil` — profile sections
- `/inquilino/configuracion` — settings
- `/panel/candidatos` — candidates list
- `/panel/contratos` — contracts list
- `/panel/propiedades` — properties list (when no properties)
- Any other list/grid views

For pages missing empty states, add using the existing `EmptyState` component pattern.

### Task 2: Audit Form Submit Feedback (QAFN-03)

Check every form for clear submit action and feedback:
- Application wizard submit step
- Login/Register forms
- Contact/support forms
- Profile edit forms
- Any settings forms
- Contract signing forms

Each form must show:
- Loading/disabled state while "submitting"
- Success feedback (toast, redirect, or inline message)
- Error feedback if validation fails

### Task 3: Verify Wizard Resume on Refresh (QAFN-07)

Test application wizard localStorage persistence:
- Verify form state saves to localStorage on each step change
- Verify refreshing the page restores the correct step and data
- Verify completing/canceling the wizard clears localStorage
- If not working, fix the persistence mechanism

## Acceptance Criteria

- [ ] Every list/grid page has a proper empty state with helpful message and CTA
- [ ] Every form shows clear submit feedback (loading + success/error)
- [ ] Application wizard resumes from correct step after page refresh

## Scope

- ~10-12 page files for empty state audit
- ~6-8 form components for feedback audit
- ~2-3 files for wizard persistence verification
