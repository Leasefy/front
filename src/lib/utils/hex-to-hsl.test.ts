import { describe, it, expect } from 'vitest'
import { hexToHslTriplet } from './hex-to-hsl'

describe('hexToHslTriplet', () => {
  it('converts the default agency blue #1A40FF', () => {
    // #1A40FF → 230° 100% 55%
    expect(hexToHslTriplet('#1A40FF')).toBe('230 100% 55%')
  })

  it('handles black and white', () => {
    expect(hexToHslTriplet('#000000')).toBe('0 0% 0%')
    expect(hexToHslTriplet('#FFFFFF')).toBe('0 0% 100%')
  })

  it('accepts 3-digit shorthand and missing #', () => {
    expect(hexToHslTriplet('#fff')).toBe('0 0% 100%')
    expect(hexToHslTriplet('1A40FF')).toBe('230 100% 55%')
  })

  it('returns null for invalid / empty input (so callers fall back to the DS default)', () => {
    expect(hexToHslTriplet('')).toBeNull()
    expect(hexToHslTriplet(null)).toBeNull()
    expect(hexToHslTriplet(undefined)).toBeNull()
    expect(hexToHslTriplet('not-a-color')).toBeNull()
    expect(hexToHslTriplet('#12')).toBeNull()
    expect(hexToHslTriplet('#1A40FG')).toBeNull()
  })
})
