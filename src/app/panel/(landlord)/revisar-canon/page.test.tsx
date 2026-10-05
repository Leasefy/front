import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

/**
 * MANOS-2 (04-10-2026) · «Revisar el canon» en el portal del propietario.
 * El propietario ve lo que le ha costado la vacancia y decide: mantener,
 * escribir otro canon (ve lo que deja de recibir) o pedir un avalúo.
 * 🔴 D-PV-02: nadie le propone un precio.
 */

const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

const api = vi.hoisted(() => ({ delPortal: vi.fn(), responder: vi.fn() }))
vi.mock('@/lib/api/revisiones-del-canon.service', () => ({ revisionesDelCanonApi: api }))

import RevisarCanonPage from './page'
import { ApiError } from '@/lib/api/client'

const PENDIENTE = {
  id: 'r1',
  estado: 'PENDIENTE',
  inmobiliaria: 'Inmobiliaria Uno',
  inmueble: 'Apartamento en Laureles, Medellín',
  canonActualCop: 2_400_000,
  diasVacante: 45,
  vacanteDesde: '2026-08-21',
  costoDeLaVacanciaCop: 3_600_000,
  siSigueVacio: [
    { meses: 1, cuestaCop: 2_400_000 },
    { meses: 2, cuestaCop: 4_800_000 },
    { meses: 3, cuestaCop: 7_200_000 },
  ],
  mesesDelContrato: 12,
  canonPedidoCop: null,
  loQueCuestaElCanonPedido: null,
  comentario: null,
  preguntadaAt: '2026-10-05T14:15:00.000Z',
  respondidaAt: null,
  aplicadaAt: null,
}

let container: HTMLDivElement
let root: Root

async function montar() {
  await act(async () => {
    root.render(<RevisarCanonPage />)
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  toast.success.mockClear()
  toast.error.mockClear()
  api.delPortal.mockReset()
  api.responder.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const q = (sel: string) => container.querySelector(sel) as HTMLElement | null

async function clic(sel: string) {
  await act(async () => {
    q(sel)!.click()
    await Promise.resolve()
  })
}

async function escribirPlata(sel: string, valor: string) {
  const el = q(sel) as HTMLInputElement
  await act(async () => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    set.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('Revisar el canon — lo que ve el propietario', () => {
  it('lo que le ha costado la vacancia y lo que costaría seguir vacío, sin ningún precio sugerido', async () => {
    api.delPortal.mockResolvedValue({ pendientes: [PENDIENTE], historial: [] })
    await montar()
    const cuenta = q('[data-testid="revision-cuenta"]')!.textContent ?? ''
    expect(cuenta).toContain('45 días')
    expect(cuenta).toContain('desde el 21 de agosto de 2026')
    expect(cuenta).toMatch(/van \$\s?3\.600\.000/)
    expect(cuenta).toMatch(/Si sigue vacío 3 meses más:\s?\$\s?7\.200\.000/)
    const todo = container.textContent ?? ''
    expect(todo).toContain('tu inmobiliaria no te propone un precio')
    expect(todo).not.toMatch(/sugerid|recomendad|te proponemos/i)
  })

  it('mantener el canon manda la decisión', async () => {
    api.delPortal.mockResolvedValue({ pendientes: [PENDIENTE], historial: [] })
    api.responder.mockResolvedValue({ ...PENDIENTE, estado: 'MANTENER' })
    await montar()
    await clic('[data-testid="revision-mantener"]')
    expect(api.responder).toHaveBeenCalledWith('r1', expect.objectContaining({ decision: 'MANTENER' }))
    expect(toast.success).toHaveBeenCalledWith('Mantienes el canon', expect.anything())
  })

  it('otro canon: dice lo que deja de recibir mientras escribe, y no deja mandar uno igual o más alto', async () => {
    api.delPortal.mockResolvedValue({ pendientes: [PENDIENTE], historial: [] })
    api.responder.mockResolvedValue({ ...PENDIENTE, estado: 'BAJAR', canonPedidoCop: 2_200_000 })
    await montar()
    await clic('[data-testid="revision-otro"]')
    await escribirPlata('[data-testid="revision-canon"]', '2500000')
    await clic('[data-testid="revision-enviar-canon"]')
    expect(api.responder).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Para dejarlo igual o subirlo escoge «Mantener el canon»')
    await escribirPlata('[data-testid="revision-canon"]', '2200000')
    expect(q('[data-testid="revision-lo-que-cuesta"]')?.textContent).toMatch(/dejarías de recibir\s?\$\s?2\.400\.000 en un año de contrato: es lo mismo que 1 mes vacío/)
    await clic('[data-testid="revision-enviar-canon"]')
    expect(api.responder).toHaveBeenCalledWith('r1', expect.objectContaining({ decision: 'BAJAR', canonPedidoCop: 2_200_000 }))
  })

  it('sin la migración del back lo dice con calma (no es una falla del propietario)', async () => {
    api.delPortal.mockRejectedValue(new ApiError(503, 'Revisar el canon desde aquí todavía no está disponible.', 'FALTA_UNA_MIGRACION'));
    await montar();
    expect(q('[data-testid="revisiones-no-disponible"]')?.textContent).toContain('todavía no está disponible');
    expect(container.textContent).not.toMatch(/problema|referencia/i);
  });

  it('sin nada por revisar lo dice', async () => {
    api.delPortal.mockResolvedValue({ pendientes: [], historial: [] })
    await montar()
    expect(q('[data-testid="revisiones-vacio"]')?.textContent).toContain('No tienes nada por revisar')
  })
})
