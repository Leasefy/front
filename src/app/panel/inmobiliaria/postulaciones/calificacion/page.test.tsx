/**
 * La Calificación Leasefy en el panel (QA del 19-10-2026). Lo que sostiene:
 *   · el asesor comercial (sin `contratos:view`) sólo busca: no ve la pestaña
 *     de contratos terminados, que el back le niega (403);
 *   · quien ve contratos pero no los edita ve la lista sin «Evaluar» (el back
 *     le niega guardar);
 *   · la lista va paginada y con buscador (en Portofino son 350).
 */
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { permisos, porEvaluar, preguntas } = vi.hoisted(() => ({
  permisos: { valor: new Set<string>() },
  porEvaluar: vi.fn(),
  preguntas: vi.fn(),
}))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({
    canAccess: (modulo: string, accion: string) => permisos.valor.has(`${modulo}:${accion}`),
  }),
}))
vi.mock('@/lib/api/calificacion-leasefy.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/calificacion-leasefy.service')>(
    '@/lib/api/calificacion-leasefy.service',
  )
  return {
    ...real,
    calificacionLeasefyApi: {
      ...real.calificacionLeasefyApi,
      porEvaluar: () => porEvaluar(),
      preguntas: () => preguntas(),
    },
  }
})

import CalificacionLeasefyPanelPage from './page'

const CONTRATOS = Array.from({ length: 30 }, (_, i) => ({
  contractId: `k${i}`,
  inquilino: i === 17 ? 'Ramírez Ocampo Lucía' : `Inquilino ${i}`,
  direccion: `Calle ${i}`,
  terminoEl: '2026-09-30',
}))

let host: HTMLDivElement | null = null
let root: Root | null = null

const esperar = async (ms = 50) => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })
}

async function montar() {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root!.render(<CalificacionLeasefyPanelPage />)
  })
  await esperar()
}

const texto = () => document.body.textContent ?? ''
const pestana = () =>
  // GLOW UP 21-10: la pestaña lleva al lado cuántos esperan («Contratos terminados 30»).
  [...document.querySelectorAll('[role="tab"]')].find((b) => b.textContent?.startsWith('Contratos terminados')) as
    | HTMLElement
    | undefined

async function abrirContratos() {
  const t = pestana()
  expect(t).toBeTruthy()
  await act(async () => {
    t!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    t!.focus()
  })
  await esperar(700)
}

beforeEach(() => {
  porEvaluar.mockReset().mockResolvedValue({ disponible: true, contratos: CONTRATOS })
  preguntas.mockReset().mockResolvedValue({ preguntas: [] })
})
afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  host = null
  root = null
})

describe('la Calificación Leasefy en el panel, por rol', () => {
  it('el asesor comercial sólo busca: sin la pestaña de contratos terminados', async () => {
    permisos.valor = new Set(['portafolio:view'])
    await montar()
    expect(texto()).toContain('Documento de la persona')
    expect(pestana()).toBeUndefined()
    expect(porEvaluar).not.toHaveBeenCalled()
  })

  it('quien ve contratos pero no los edita ve la lista sin «Evaluar»', async () => {
    permisos.valor = new Set(['portafolio:view', 'contratos:view'])
    await montar()
    await abrirContratos()
    expect(texto()).toContain('Inquilino 0')
    expect(texto()).toContain('Para evaluarlos hace falta poder editar contratos.')
    expect([...document.querySelectorAll('button')].some((b) => b.textContent === 'Evaluar')).toBe(false)
  })

  it('con permiso de editar: paginada, con buscador y «Evaluar» en cada fila', async () => {
    permisos.valor = new Set(['portafolio:view', 'contratos:view', 'contratos:edit'])
    await montar()
    await abrirContratos()
    expect(texto()).toContain('30 contratos')
    const evaluar = () => [...document.querySelectorAll('button')].filter((b) => b.textContent === 'Evaluar')
    // Una página, no las 30.
    expect(evaluar().length).toBeGreaterThan(0)
    expect(evaluar().length).toBeLessThan(30)
    expect(texto()).not.toContain('Inquilino 29')

    // Buscar sin tildes ni mayúsculas encuentra a la de la página 2.
    const buscador = document.getElementById('cal-buscar-contrato') as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(buscador, 'ramirez lucia')
      buscador.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await esperar(300)
    expect(texto()).toContain('1 contrato')
    expect(texto()).toContain('Ramírez Ocampo Lucía')
    expect(evaluar()).toHaveLength(1)
  })

  it('GLOW UP 21-10: la pestaña dice cuántos contratos esperan evaluación, sin abrirla', async () => {
    permisos.valor = new Set(['portafolio:view', 'contratos:view'])
    await montar()
    expect(document.querySelector('[data-testid="calificacion-por-evaluar"]')?.textContent).toBe('30')
  })
})
