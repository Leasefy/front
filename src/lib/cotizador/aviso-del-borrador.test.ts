import { describe, it, expect } from 'vitest'
import { mostrarElAvisoDelBorrador } from './aviso-del-borrador'

describe('el aviso «Tienes una cotización en progreso» (QA-IA-95, IA-A-12)', () => {
  it('con un borrador de antes, en el paso 1: sí', () => {
    expect(mostrarElAvisoDelBorrador({ habiaAlEntrar: true, hayBorrador: true, abierto: true, paso: 1 })).toBe(true)
  })
  it('el borrador que el asistente acaba de guardar al pasar al paso 2, 3 o 4: no', () => {
    for (const paso of [2, 3, 4]) expect(mostrarElAvisoDelBorrador({ habiaAlEntrar: false, hayBorrador: true, abierto: true, paso })).toBe(false)
    expect(mostrarElAvisoDelBorrador({ habiaAlEntrar: true, hayBorrador: true, abierto: true, paso: 2 })).toBe(false)
  })
  it('cerrado («Empezar de nuevo» / «Continuar»): no', () => {
    expect(mostrarElAvisoDelBorrador({ habiaAlEntrar: true, hayBorrador: true, abierto: false, paso: 1 })).toBe(false)
  })
})
