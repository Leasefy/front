/**
 * application-active — la regla de "postulación activa" tiene que espejar EXACTO
 * el guard anti-duplicados del back. Si esta lista se desalinea, el front deja
 * iniciar el wizard y el inquilino se come un 409 al final (la mala UX que esto
 * previene). Se testea toda la tabla que dio el back.
 */

import { describe, it, expect } from 'vitest'
import { isActiveApplicationStatus } from './application-active'

describe('isActiveApplicationStatus', () => {
  // Tabla del back: activa = cualquiera salvo WITHDRAWN / REJECTED.
  it.each([
    'DRAFT',
    'SUBMITTED',
    'UNDER_REVIEW',
    'NEEDS_INFO',
    'PREAPPROVED',
    'APPROVED',
    'CONTRACT_FAILED',
  ])('%s bloquea re-postular (activa)', (status) => {
    expect(isActiveApplicationStatus(status)).toBe(true)
  })

  it.each(['WITHDRAWN', 'REJECTED'])('%s NO bloquea (permite re-postular)', (status) => {
    expect(isActiveApplicationStatus(status)).toBe(false)
  })

  it('es case-insensitive y tolera espacios', () => {
    expect(isActiveApplicationStatus('withdrawn')).toBe(false)
    expect(isActiveApplicationStatus('  Rejected ')).toBe(false)
    expect(isActiveApplicationStatus('under_review')).toBe(true)
  })

  it('un estado desconocido bloquea por defecto (lectura conservadora)', () => {
    expect(isActiveApplicationStatus('SOME_NEW_STATUS')).toBe(true)
  })
})
