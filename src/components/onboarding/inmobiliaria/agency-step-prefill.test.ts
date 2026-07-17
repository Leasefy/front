/**
 * agency-step-prefill.test.ts — pure merge logic for the "Agencia" step
 * prefill (see agency-step-prefill.ts header for the full rationale).
 */
import { describe, it, expect } from 'vitest'
import { computeAgencyStepPrefill } from './agency-step-prefill'

describe('computeAgencyStepPrefill', () => {
  it('prefills legalName and nit from the in-session pre-step values', () => {
    const result = computeAgencyStepPrefill(
      { legalName: 'Inmobiliaria Andes SAS', nit: '900123456-7' },
      null,
    )

    expect(result).toEqual({
      legalName: 'Inmobiliaria Andes SAS',
      nit: '900123456-7',
    })
  })

  it('falls back to the resume draft (proposedAgencyName/contactEmail) when pre-step values are absent', () => {
    const result = computeAgencyStepPrefill(null, {
      proposedAgencyName: 'Inmobiliaria Andes SAS',
      contactEmail: 'ana@andes.test',
    })

    expect(result).toEqual({
      legalName: 'Inmobiliaria Andes SAS',
      primaryContactEmail: 'ana@andes.test',
    })
  })

  it('maps contactPhone from the draft to primaryContactPhone when present', () => {
    const result = computeAgencyStepPrefill(null, { contactPhone: '+57 300 000 0000' })

    expect(result).toEqual({ primaryContactPhone: '+57 300 000 0000' })
  })

  it('the pre-step legalName wins over draft.proposedAgencyName', () => {
    const result = computeAgencyStepPrefill(
      { legalName: 'Inmobiliaria Andes SAS' },
      { proposedAgencyName: 'Nombre Viejo Ltda' },
    )

    expect(result.legalName).toBe('Inmobiliaria Andes SAS')
  })

  it('nit only ever comes from the pre-step — the draft never carries it', () => {
    const result = computeAgencyStepPrefill(null, {
      proposedAgencyName: 'Inmobiliaria Andes SAS',
      // Even if some future draft shape smuggled a `nit` key, it must be ignored:
      // NIT is not part of the agent's onboarding-start draft contract today.
      nit: '900999999-1',
    })

    expect(result.nit).toBeUndefined()
  })

  it('tolerates both sources missing — returns an empty prefill, no crash', () => {
    expect(computeAgencyStepPrefill(null, null)).toEqual({})
    expect(computeAgencyStepPrefill(undefined, undefined)).toEqual({})
  })

  it('ignores blank/whitespace-only draft strings', () => {
    const result = computeAgencyStepPrefill(null, { proposedAgencyName: '   ', contactEmail: '' })

    expect(result).toEqual({})
  })

  it('ignores non-string draft values for known keys', () => {
    const result = computeAgencyStepPrefill(null, { proposedAgencyName: 42, contactEmail: null })

    expect(result).toEqual({})
  })

  it('ignores unknown draft keys entirely', () => {
    const result = computeAgencyStepPrefill(null, { someFutureField: 'whatever' })

    expect(result).toEqual({})
  })
})
