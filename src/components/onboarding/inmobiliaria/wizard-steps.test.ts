import { describe, it, expect } from 'vitest'
import { WIZARD_STEPS, wizardStepIndex, wizardStepLabel } from './wizard-steps'

// `payment_provider` was made an invisible auto-skip step
// (see `PaymentProviderAutoSkipStep` / fix/onboarding-skip-payment) — it must
// no longer appear in the visible stepper.
describe('WIZARD_STEPS', () => {
  it('does not list a "Pago" / payment_provider entry', () => {
    expect(WIZARD_STEPS.some((s) => s.key === 'payment_provider')).toBe(false)
    expect(WIZARD_STEPS.some((s) => s.label === 'Pago')).toBe(false)
  })
})

describe('wizardStepIndex', () => {
  it('returns 0 for null/start', () => {
    expect(wizardStepIndex(null)).toBe(0)
    expect(wizardStepIndex('start')).toBe(0)
  })

  it('resolves a normal visible step', () => {
    expect(wizardStepIndex('policy')).toBe(WIZARD_STEPS.findIndex((s) => s.key === 'policy'))
  })

  it('pins payment_provider to the same index as members (the previous visible step)', () => {
    expect(wizardStepIndex('payment_provider')).toBe(wizardStepIndex('members'))
  })
})

describe('wizardStepLabel', () => {
  it('resolves a normal visible step label', () => {
    expect(wizardStepLabel('policy')).toBe('Política')
  })

  it('falls back to the members label while on the invisible payment_provider step', () => {
    expect(wizardStepLabel('payment_provider')).toBe('Miembros')
  })

  it('falls back to Agencia for null/start', () => {
    expect(wizardStepLabel(null)).toBe('Agencia')
    expect(wizardStepLabel('start')).toBe('Agencia')
  })
})
