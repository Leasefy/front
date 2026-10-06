/**
 * QA-CONT-95 D-10/UC-13 (ronda 3): «Invitaciones a firmar» decía «No hay nadie
 * pendiente de firmar» con el #57 esperando la firma. Lo que va A TIEMPO tiene
 * su tarjeta, con el vencimiento y el próximo recordatorio en palabras.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

const { api } = vi.hoisted(() => ({
  api: { barrido: (() => Promise.resolve(null)) as () => Promise<unknown> },
}))
vi.mock('@/lib/api/crm.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/crm.service')>('@/lib/api/crm.service')
  return { ...real, invitacionApi: { barrido: () => api.barrido(), cancelar: vi.fn() } }
})
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ isLoading: false, canAccess: () => true }),
}))

import { FirmasClient, lineaDelPlazo } from './FirmasClient'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const A57 = {
  invitacionId: 'inv-57',
  contractId: 'c-57',
  code: 57,
  tenantName: 'Laura Sofía Peña',
  esperaA: 'INQUILINO' as const,
  enviadaEl: '2026-10-05T01:36:00.000Z',
  venceEl: '2026-10-12T01:36:00.000Z',
  diasQueFaltan: 7,
  recordatoriosEnviados: 0,
  de: 2,
  proximoRecordatorioEl: '2026-10-08T01:36:00.000Z',
}

let root: Root
let contenedor: HTMLDivElement
beforeEach(() => {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})
afterEach(async () => {
  await act(async () => root.unmount())
  contenedor.remove()
})

describe('Firmas: lo que va a tiempo', () => {
  it('🔴 con el #57 esperando firma NO dice «No hay nadie pendiente»: lo lista a tiempo', async () => {
    api.barrido = vi.fn(() =>
      Promise.resolve({ disponible: true, motivo: null, recordatorios: [], vencidas: [], porVencer: [], aTiempo: [A57] }),
    )
    await act(async () => root.render(<FirmasClient />))
    expect(contenedor.textContent).not.toContain('No hay nadie pendiente de firmar')
    const fila = contenedor.querySelector('[data-testid="a-tiempo-c-57"]')?.textContent ?? ''
    expect(fila).toContain('Contrato #57')
    expect(fila).toContain('Laura Sofía Peña')
    expect(fila).toContain('espera la firma del inquilino')
    // Bogotá: vence el 11 a las 8:36 p. m.; el recordatorio, el 7.
    expect(fila).toContain('Vence el 11 de octubre de 2026 (le quedan 7 días)')
    expect(fila).toContain('Próximo recordatorio: 7 de octubre de 2026')
    expect(contenedor.querySelector('[data-testid="a-tiempo-c-57"] a')?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/contratos/c-57',
    )
  })

  it('sin nada en firma sigue diciendo que no hay nadie', async () => {
    api.barrido = vi.fn(() =>
      Promise.resolve({ disponible: true, motivo: null, recordatorios: [], vencidas: [], porVencer: [], aTiempo: [] }),
    )
    await act(async () => root.render(<FirmasClient />))
    expect(contenedor.textContent).toContain('No hay nadie pendiente de firmar')
  })

  it('el que se mandó sin reloj dice que no vence solo y cómo ponérselo', () => {
    expect(
      lineaDelPlazo({ ...A57, invitacionId: null, venceEl: null, diasQueFaltan: null, proximoRecordatorioEl: null }),
    ).toContain('no vence sola')
  })

  it('el que ya firmó el inquilino no habla de recordatorios', () => {
    expect(lineaDelPlazo({ ...A57, esperaA: 'INMOBILIARIA', diasQueFaltan: 1 })).toBe(
      'Vence el 11 de octubre de 2026 (le queda 1 día)',
    )
  })
})
