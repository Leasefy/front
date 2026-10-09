import { describe, it, expect } from 'vitest'

import { motivoDe, queLePaso, type FilaSinAsistente } from './RegistrosSinAsistente'

function fila(o: Partial<FilaSinAsistente> = {}): FilaSinAsistente {
  return {
    id: 'a1',
    name: 'Inmobiliaria de prueba',
    provisioningStatus: 'ACTIVE',
    agentProvisionAttempts: 1,
    lastProvisionError: null,
    invitationAttempts: 2,
    lastInvitationError: 'Agent onboarding start failed: 404 unknown existingTenantId',
    agentSessionId: null,
    ownerCanEnter: true,
    updatedAt: '2026-10-08T23:40:00.000Z',
    ...o,
  }
}

describe('RegistrosSinAsistente', () => {
  it('ACTIVE sin sesión: dice que el asistente no abrió y muestra lo que contestó', () => {
    expect(queLePaso(fila())).toBe('El asistente no abrió el registro')
    expect(motivoDe(fila())).toContain('404 unknown existingTenantId')
  })

  it('el dueño sin membresía en el asistente se dice aparte', () => {
    expect(queLePaso(fila({ ownerCanEnter: false, lastInvitationError: null }))).toBe(
      'El dueño no puede entrar al asistente',
    )
  })

  it('FAILED y PENDING dicen en qué paso quedó', () => {
    expect(queLePaso(fila({ provisioningStatus: 'FAILED' }))).toBe('No se pudo crear en el asistente')
    expect(queLePaso(fila({ provisioningStatus: 'PENDING' }))).toBe('Todavía no se crea en el asistente')
  })

  it('sin error guardado no inventa un motivo', () => {
    expect(motivoDe(fila({ lastInvitationError: null, lastProvisionError: 'timeout' }))).toBe('timeout')
    expect(motivoDe(fila({ lastInvitationError: null }))).toBe(
      'El back no guardó un motivo para esta inmobiliaria.',
    )
  })
})
