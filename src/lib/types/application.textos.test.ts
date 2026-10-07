import { describe, it, expect } from 'vitest'

import { CONTRACT_TYPE_OPTIONS, DOCUMENT_TYPES, INDUSTRY_OPTIONS } from './application'

// QA-IA-A (04-10-2026): el asistente de postulación decía «Cedula de
// Ciudadania», «Termino indefinido», «Tecnologia»… Español de Colombia, con tildes.
describe('textos del asistente de postulación', () => {
  it('las opciones llevan sus tildes', () => {
    const todas = [...DOCUMENT_TYPES, ...CONTRACT_TYPE_OPTIONS, ...INDUSTRY_OPTIONS].map((o) => o.label)
    expect(todas).toContain('Cédula de ciudadanía')
    expect(todas).toContain('Cédula de extranjería')
    expect(todas).toContain('Término indefinido')
    expect(todas).toContain('Prestación de servicios')
    expect(todas).toContain('Tecnología')
    for (const sinTilde of ['Cedula', 'Termino', 'Prestacion', 'Tecnologia', 'Educacion', 'Construccion', 'Hoteleria']) {
      expect(todas.some((t) => t.startsWith(sinTilde))).toBe(false)
    }
  })
})
