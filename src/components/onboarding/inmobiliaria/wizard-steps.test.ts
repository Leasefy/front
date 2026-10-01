import { describe, it, expect } from 'vitest'
import { WIZARD_STEPS, wizardStepIndex } from './wizard-steps'

// `payment_provider` and `policy` are invisible auto-skip steps (see
// `PaymentProviderAutoSkipStep` / `PolicyAutoSkipStep`) — neither must appear
// in the visible stepper.
describe('WIZARD_STEPS', () => {
  it('does not list a "Pago" / payment_provider entry', () => {
    expect(WIZARD_STEPS.some((s) => s.key === 'payment_provider')).toBe(false)
    expect(WIZARD_STEPS.some((s) => s.label === 'Pago')).toBe(false)
  })

  it('does not list a "Política" / policy entry', () => {
    expect(WIZARD_STEPS.some((s) => s.key === 'policy')).toBe(false)
    expect(WIZARD_STEPS.some((s) => s.label === 'Política')).toBe(false)
  })
})

describe('wizardStepIndex', () => {
  it('returns 0 for null/start', () => {
    expect(wizardStepIndex(null)).toBe(0)
    expect(wizardStepIndex('start')).toBe(0)
  })

  it('resolves a normal visible step', () => {
    expect(wizardStepIndex('habeas_data')).toBe(WIZARD_STEPS.findIndex((s) => s.key === 'habeas_data'))
  })

  it('pins payment_provider to the same index as members (the previous visible step)', () => {
    expect(wizardStepIndex('payment_provider')).toBe(wizardStepIndex('members'))
  })

  it('pins policy to the same index as members (the previous visible step)', () => {
    expect(wizardStepIndex('policy')).toBe(wizardStepIndex('members'))
  })
})

// `wizardStepLabel` se retiró con el marco compartido: el título del paso lo
// resuelve `contenido-de-los-pasos.ts` (y lo pinta `OnboardingStepTitle`).
