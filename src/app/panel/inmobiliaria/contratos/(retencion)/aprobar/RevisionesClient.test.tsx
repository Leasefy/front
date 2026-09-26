/**
 * «Por aprobar» de Vinci dice QUÉ es cada cosa (26-09-2026):
 *   · 🔴 `notified` fue un correo INTERNO: nunca «propietario notificado»;
 *   · el mensaje listo se muestra TAL CUAL sale, con «Enviar»;
 *   · una oferta de plata la aprueba sólo el administrador.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

const { decisionesMock, esAdmin } = vi.hoisted(() => ({ decisionesMock: vi.fn(), esAdmin: { valor: false } }))

vi.mock('@/lib/hooks/retencion/use-vinci', () => ({ useDecisionesDeVinci: decisionesMock }))
vi.mock('@/lib/context/PermissionsContext', () => ({ usePermissionsContext: () => ({ isAdmin: esAdmin.valor }) }))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'a1' } }) }))
vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) => React.createElement('a', { href }, children),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }))

import RevisionesClient from './RevisionesClient'

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  decisionesMock.mockReset()
  esAdmin.valor = false
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const fila = (decisionType: string, payload: Record<string, unknown> = {}) => ({
  id: `d-${decisionType}`,
  caseId: 'inquilino:c1',
  ownerId: null,
  decisionType,
  tier: 0,
  reviewable: true,
  reviewedBy: null,
  reviewedAt: null,
  reviewOutcome: null,
  createdAt: '2026-09-28T12:00:00.000Z',
  payload,
})

function render(decisiones: unknown[]) {
  decisionesMock.mockReturnValue({ data: decisiones, isLoading: false, error: null, refetch: vi.fn() })
  act(() => root.render(<RevisionesClient />))
}

describe('Por aprobar · Vinci', () => {
  it('🔴 un aviso interno se llama aviso interno: nunca «propietario notificado»', () => {
    render([fila('notified', { channel: 'email' })])
    expect(container.textContent).toContain('Aviso interno al responsable (al propietario no se le escribió)')
    expect(container.textContent).not.toMatch(/propietario notificado/i)
  })

  it('el mensaje listo se ve tal cual sale, con el porqué y «Enviar»', () => {
    render([
      fila('mensaje_listo', {
        nombre: 'Marta Gómez',
        puntaje: 60,
        senales: [{ clave: 'mora', texto: '70 días de mora', puntos: 40 }],
        mensaje: { nombre: 'Marta Gómez', texto: 'Hola, Marta. Te escribimos de Inmobiliaria Horizonte.' },
      }),
    ])
    expect(container.textContent).toContain('Mensaje de Vinci listo para Marta Gómez')
    expect(container.textContent).toContain('60/100: 70 días de mora (+40)')
    expect(container.querySelector('blockquote')?.textContent).toBe('Hola, Marta. Te escribimos de Inmobiliaria Horizonte.')
    expect([...container.querySelectorAll('button')].map((b) => b.textContent)).toContain('Enviar')
  })

  it('una oferta que cuesta plata: sólo el administrador ve «Aprobar»', () => {
    render([fila('oferta', { tipo: 'descuento_comision', poblacion: 'propietario', detalle: { descuentoPct: 10 } })])
    expect(container.textContent).toContain('sólo el administrador la aprueba')
    expect([...container.querySelectorAll('button')].map((b) => b.textContent)).not.toContain('Aprobar')
    act(() => root.unmount())
    root = createRoot(container)
    esAdmin.valor = true
    render([fila('oferta', { tipo: 'descuento_comision', poblacion: 'propietario', detalle: { descuentoPct: 10 } })])
    expect([...container.querySelectorAll('button')].map((b) => b.textContent)).toContain('Aprobar')
  })
})
