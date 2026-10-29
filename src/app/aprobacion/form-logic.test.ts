import { describe, it, expect } from 'vitest'
import { vieneDelPaso1 } from './form-logic'

describe('vieneDelPaso1', () => {
  it('sólo con paso=2 en la URL', () => {
    expect(vieneDelPaso1(new URLSearchParams('paso=2&canon=1'))).toBe(true)
    expect(vieneDelPaso1(new URLSearchParams('canon=1'))).toBe(false)
    expect(vieneDelPaso1(new URLSearchParams('paso=1'))).toBe(false)
  })
})
