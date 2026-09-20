/**
 * Las invitaciones a firmar (A-13).
 *
 * 🔴 Lo que fija este test es la decisión menos obvia: al vencer, **el inmueble
 * NO se libera** — sigue reservado hasta que una persona cancele. La pantalla lo
 * dice en la fila y la casilla de liberar nace APAGADA, porque republicar solo
 * un inmueble prácticamente cerrado es recibir postulaciones por algo que ya no
 * está disponible.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

const { api, permisos } = vi.hoisted(() => ({
  api: {
    barrido: (() => Promise.resolve(null)) as () => Promise<unknown>,
    cancelar: vi.fn(async () => ({ cancelada: true, inmuebleLiberado: false })),
  },
  permisos: { edit: true },
}))

vi.mock('@/lib/api/crm.service', async () => {
  const real =
    await vi.importActual<typeof import('@/lib/api/crm.service')>(
      '@/lib/api/crm.service',
    )
  return {
    ...real,
    invitacionApi: {
      barrido: () => api.barrido(),
      cancelar: api.cancelar,
    },
  }
})
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({
    isLoading: false,
    canAccess: (_m: string, a: string) => (a === 'edit' ? permisos.edit : true),
  }),
}))

import { FirmasClient } from './FirmasClient'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const BARRIDO = {
  disponible: true,
  motivo: null,
  recordatorios: [
    {
      contractId: 'ct-1',
      numero: 1,
      de: 2,
      diasQueFaltan: 4,
      correo: 'ana@ejemplo.com',
      mensaje: 'Ana: te quedan 4 días para firmar el contrato.',
    },
  ],
  vencidas: [
    {
      contractId: 'ct-2',
      contratoVolvioABorrador: true,
      inmuebleLiberado: false,
      aviso:
        'La invitación a firmar de Juan Pérez se venció después de 7 días sin firma. El contrato volvió a borrador y el inmueble SIGUE reservado: cancela la invitación si ya no va, o reenvíala.',
    },
  ],
}

let root: Root | null = null
let contenedor: HTMLDivElement

async function pintar() {
  await act(async () => {
    root!.render(<FirmasClient />)
  })
}
const $ = (sel: string) => contenedor.querySelector(sel)
async function clic(sel: string) {
  await act(async () => {
    contenedor
      .querySelector<HTMLElement>(sel)
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

beforeEach(() => {
  api.barrido = vi.fn(() => Promise.resolve(BARRIDO))
  api.cancelar.mockClear()
  permisos.edit = true
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(async () => {
  await act(async () => {
    root!.unmount()
  })
  root = null
  contenedor.remove()
})

describe('FirmasClient', () => {
  it('🔴 la vencida dice que el inmueble NO se liberó', async () => {
    await pintar()
    const fila = $('[data-testid="vencida-ct-2"]')?.textContent ?? ''
    expect(fila).toContain('volvió a borrador')
    expect(fila).toContain('El inmueble NO se liberó')
  })

  it('🔴 la casilla de liberar nace APAGADA', async () => {
    await pintar()
    await clic('[data-testid="cancelar-ct-2"]')
    const casilla = contenedor.querySelector<HTMLElement>(
      '[data-testid="liberar-ct-2"]',
    )
    expect(casilla).not.toBeNull()
    // Radix marca el estado en `data-state` / `aria-checked`.
    expect(casilla?.getAttribute('data-state')).not.toBe('checked')
    expect(casilla?.getAttribute('aria-checked')).not.toBe('true')
  })

  it('cancelar exige motivo: sin él, el botón no va', async () => {
    await pintar()
    await clic('[data-testid="cancelar-ct-2"]')
    const boton = contenedor.querySelector<HTMLButtonElement>(
      '[data-testid="confirmar-cancelar-ct-2"]',
    )
    expect(boton?.disabled).toBe(true)
    expect(api.cancelar).not.toHaveBeenCalled()
  })

  it('el recordatorio dice cuál de cuántos, y que la pantalla no envía', async () => {
    await pintar()
    const r = $('[data-testid="recordatorio-ct-1"]')?.textContent ?? ''
    expect(r).toContain('Recordatorio 1 de 2')
    expect(contenedor.textContent).toContain('no envía')
  })

  it('un 503 se avisa como «todavía no está disponible», no como un error', async () => {
    const { ApiError } = await import('@/lib/api/client')
    api.barrido = vi.fn(() =>
      Promise.reject(
        new ApiError(503, [
          'falta aplicar la migración 20260918163000_captacion_listas_y_firma_del_mandato',
        ]),
      ),
    )
    await pintar()
    const aviso = $('[data-testid="firmas-no-habilitadas"]')?.textContent ?? ''
    // 🔴 El identificador de la migración es para quien despliega, no para la
    // inmobiliaria (Nico, 18-09-2026). Lo que queda es el aviso, y NO un error.
    expect(aviso).not.toContain('20260918163000')
    expect(aviso).toContain('todavía no está disponible')
    expect($('[data-testid="fallo-de-carga"]')).toBeNull()
  })

  it('sin permiso no ofrece cancelar', async () => {
    permisos.edit = false
    await pintar()
    expect($('[data-testid="cancelar-ct-2"]')).toBeNull()
  })
})
