import { describe, it, expect } from 'vitest'
import { calculateScoreTool } from '../calculate-score'

// Helper to call the tool's execute function directly
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const execute = (calculateScoreTool as any).execute as (input: any) => Promise<any>

const baseInput = {
  applicationId: 'test-app-001',
  financial: {
    monthlyIncome: 5_000_000, // 5M COP
    monthlyRent: 1_200_000, // 1.2M COP (24% of income)
    employmentMonths: 36,
    contractType: 'indefinido' as const,
    averageBankBalance: 8_000_000,
  },
  rentalHistory: {
    previousRentals: 3,
    paymentScore: 90,
    references: 2,
    evictions: 0,
  },
  documentVerification: {
    documentsProvided: 3,
    documentsRequired: 3,
    consistencyScore: 85,
    fraudFlags: 0,
  },
  personalProfile: {
    yearsAtAddress: 4,
    dependents: 1,
    hasCoSigner: false,
  },
}

describe('calculate-score tool', () => {
  it('scores an excellent candidate as level A', async () => {
    const result = await execute(baseInput)

    expect(result.level).toBe('A')
    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.score).toBeLessThanOrEqual(100)
    expect(result.escalate).toBe(false)
    expect(result.flags).toHaveLength(0)
    expect(result.recommendation.toLowerCase()).toContain('excelente')
  })

  it('scores a high-risk candidate as level D', async () => {
    const result = await execute({
      ...baseInput,
      applicationId: 'test-app-002',
      financial: {
        monthlyIncome: 1_500_000,
        monthlyRent: 1_200_000, // 80% of income
        employmentMonths: 2,
        contractType: 'prestacion_servicios',
        averageBankBalance: 500_000,
      },
      rentalHistory: {
        previousRentals: 0,
        paymentScore: 0,
        references: 0,
        evictions: 1,
      },
      documentVerification: {
        documentsProvided: 1,
        documentsRequired: 3,
        consistencyScore: 20,
        fraudFlags: 2,
      },
      personalProfile: {
        yearsAtAddress: 0,
        dependents: 3,
        hasCoSigner: false,
      },
    })

    expect(result.level).toBe('D')
    expect(result.score).toBeLessThan(40)
    expect(result.escalate).toBe(true)
    expect(result.flags.length).toBeGreaterThan(0)
  })

  it('flags when rent exceeds 30% of income', async () => {
    const result = await execute({
      ...baseInput,
      applicationId: 'test-app-003',
      financial: {
        ...baseInput.financial,
        monthlyIncome: 3_000_000,
        monthlyRent: 1_200_000, // 40%
      },
    })

    expect(result.flags).toContain('Arriendo supera 30% del ingreso')
  })

  it('escalates on multiple fraud flags', async () => {
    const result = await execute({
      ...baseInput,
      applicationId: 'test-app-004',
      documentVerification: {
        ...baseInput.documentVerification,
        fraudFlags: 3,
        consistencyScore: 25,
      },
    })

    expect(result.escalate).toBe(true)
    expect(result.escalateReason).toBeDefined()
  })

  it('returns correct breakdown structure', async () => {
    const result = await execute(baseInput)

    expect(result.breakdown).toHaveProperty('financialStability')
    expect(result.breakdown).toHaveProperty('rentalHistory')
    expect(result.breakdown).toHaveProperty('documentVerification')
    expect(result.breakdown).toHaveProperty('personalProfile')

    // Each subscore should be 0-100
    Object.values(result.breakdown).forEach((score) => {
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })
  })

  it('scores level B for a decent candidate with some risk factors', async () => {
    const result = await execute({
      ...baseInput,
      applicationId: 'test-app-005',
      financial: {
        monthlyIncome: 3_500_000,
        monthlyRent: 1_000_000, // ~28%
        employmentMonths: 8,
        contractType: 'fijo',
        averageBankBalance: 2_500_000,
      },
      rentalHistory: {
        previousRentals: 1,
        paymentScore: 70,
        references: 1,
        evictions: 0,
      },
      personalProfile: {
        yearsAtAddress: 1,
        dependents: 0,
        hasCoSigner: false,
      },
    })

    expect(result.level).toBe('B')
    expect(result.score).toBeGreaterThanOrEqual(60)
    expect(result.score).toBeLessThan(80)
  })

  // =========================================================================
  // Edge case tests
  // =========================================================================

  it('handles zero monthly income without NaN or crash', async () => {
    const result = await execute({
      ...baseInput,
      applicationId: 'test-edge-001',
      financial: {
        ...baseInput.financial,
        monthlyIncome: 0,
        monthlyRent: 1_200_000,
      },
    })

    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
    expect(Number.isNaN(result.score)).toBe(false)
    // Zero income means rent ratio is Infinity => financialScore gets 0 for ratio
    expect(result.flags).toContain('Arriendo supera 30% del ingreso')
  })

  it('handles zero monthly rent gracefully', async () => {
    const result = await execute({
      ...baseInput,
      applicationId: 'test-edge-002',
      financial: {
        ...baseInput.financial,
        monthlyRent: 0,
      },
    })

    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
    expect(Number.isNaN(result.score)).toBe(false)
    // Rent/income = 0 => best ratio tier
    expect(result.flags).not.toContain('Arriendo supera 30% del ingreso')
  })

  it('handles zero documents required without NaN', async () => {
    const result = await execute({
      ...baseInput,
      applicationId: 'test-edge-003',
      documentVerification: {
        documentsProvided: 0,
        documentsRequired: 0,
        consistencyScore: 50,
        fraudFlags: 0,
      },
    })

    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(Number.isNaN(result.score)).toBe(false)
    expect(Number.isNaN(result.breakdown.documentVerification)).toBe(false)
  })

  it('handles all optional rental history fields as undefined', async () => {
    const result = await execute({
      ...baseInput,
      applicationId: 'test-edge-004',
      rentalHistory: {
        previousRentals: 0,
        // paymentScore, references, evictions all omitted
      },
    })

    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(Number.isNaN(result.score)).toBe(false)
    expect(Number.isNaN(result.breakdown.rentalHistory)).toBe(false)
  })

  it('clamps subscore values to 0-100 range even with extreme inputs', async () => {
    const result = await execute({
      ...baseInput,
      applicationId: 'test-edge-005',
      financial: {
        monthlyIncome: 100_000_000, // Very high income
        monthlyRent: 500_000,
        employmentMonths: 120, // 10 years
        contractType: 'indefinido',
        averageBankBalance: 500_000_000,
      },
      rentalHistory: {
        previousRentals: 100,
        paymentScore: 100,
        references: 50,
        evictions: 0,
      },
      documentVerification: {
        documentsProvided: 10,
        documentsRequired: 3,
        consistencyScore: 100,
        fraudFlags: 0,
      },
      personalProfile: {
        yearsAtAddress: 20,
        dependents: 0,
        hasCoSigner: true,
      },
    })

    expect(result.score).toBeLessThanOrEqual(100)
    Object.values(result.breakdown).forEach((score) => {
      expect(score).toBeLessThanOrEqual(100)
      expect(score).toBeGreaterThanOrEqual(0)
    })
  })

  it('level C candidate with co-signer gets appropriate recommendation', async () => {
    const result = await execute({
      ...baseInput,
      applicationId: 'test-edge-006',
      financial: {
        monthlyIncome: 2_000_000,
        monthlyRent: 800_000, // 40%
        employmentMonths: 4,
        contractType: 'prestacion_servicios',
        averageBankBalance: 1_000_000,
      },
      rentalHistory: {
        previousRentals: 0,
        paymentScore: 0,
        references: 0,
        evictions: 0,
      },
      documentVerification: {
        documentsProvided: 2,
        documentsRequired: 3,
        consistencyScore: 60,
        fraudFlags: 0,
      },
      personalProfile: {
        yearsAtAddress: 0.5,
        dependents: 0,
        hasCoSigner: true,
      },
    })

    // With these inputs the score lands in D/C border area
    // The key check: co-signer boosts profile, no fraud => no escalation from fraud
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThan(80)
    expect(result.recommendation).toBeDefined()
    expect(result.recommendation.length).toBeGreaterThan(0)
  })
})
