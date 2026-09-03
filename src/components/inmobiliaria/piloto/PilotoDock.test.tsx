/**
 * El tray de procesos (abajo a la derecha).
 *
 * Lo que se protege:
 *  1. Cerrado NO consulta procesos (el hook recibe `activo: false`): el botón
 *     vive en todas las pantallas y no puede martillar al micro.
 *  2. Abierto lista los procesos y cada fila se expande a sus pasos; «Ver
 *     todos» lleva a la página.
 *  3. El botón dice lo que está pasando (llamada en curso > conciliando >
 *     esperando > «Procesos») a partir de la flota compartida, sin pedir nada.
 *  4. Sin flota (sin micro) no hay tray; en la propia página de procesos
 *     tampoco (sería la misma lista dos veces).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { estado, usePilotoProcesosMock } = vi.hoisted(() => ({
  estado: {
    pathname: '/panel/inmobiliaria/contratos',
    flota: null as unknown,
    notAvailable: false,
    procesos: null as unknown,
  },
  usePilotoProcesosMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({ usePathname: () => estado.pathname }))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, string>) => (vars ? `${k}(${Object.values(vars).join(',')})` : k),
    locale: 'es',
  }),
}))
vi.mock('@/lib/hooks/piloto/piloto-flota-context', () => ({
  usePilotoFlotaCompartida: () => ({
    data: estado.flota,
    isLoading: false,
    error: null,
    notAvailable: estado.notAvailable,
    busy: false,
    setModo: async () => ({ ok: true }),
    refetch: async () => {},
  }),
}))
vi.mock('@/lib/hooks/piloto/use-piloto-procesos', () => ({
  usePilotoProcesos: (...a: unknown[]) => {
    usePilotoProcesosMock(...a)
    return { data: estado.procesos, isLoading: false, error: null, notAvailable: false, refetch: async () => {} }
  },
}))
vi.mock('@/components/inmobiliaria/ai/ColaHumana', () => ({ relativeTime: () => 'hace 3 s' }))
vi.mock('@/lib/format', () => ({ formatCurrency: (n: number) => `$${n}` }))
vi.mock('@leasefy/cadence', () => ({
  Chip: ({ children, selected, onClick, ...props }: Record<string, unknown> & { children?: React.ReactNode; selected?: boolean; onClick?: () => void }) => {
    const { size, ...rest } = props
    void size
    return (
      <button type="button" aria-pressed={Boolean(selected)} onClick={onClick} {...(rest as object)}>
        {children}
      </button>
    )
  },
}))
vi.mock('./PilotoCajon', () => ({ PilotoCajon: () => null }))

import { PilotoDock } from './PilotoDock'

const FLOTA = (enVivo = { llamadas: 0, conciliando: 0, esperando: 0 }) => ({
  activo: true,
  modo: 'copiloto',
  agentes: [],
  resumen: { sombra: 0, copiloto: 12, autonomo: 0 },
  enVivo,
  tomadoAt: '2026-09-02T20:00:00Z',
})
const PROCESOS = {
  procesos: [
    {
      id: 'mov:1',
      tipo: 'deposito',
      agente: 'conciliacion',
      estado: 'hecho',
      titulo: 'Detecté un depósito de $2.400.000',
      resumen: 'Lo concilié solo · recibo #1.',
      resultado: 'Conciliado solo',
      quien: { nombre: 'Carlos R.', inmueble: 'Laureles' },
      montoCop: 2_400_000,
      inicioAt: '2026-09-02T01:14:54-05:00',
      ultimoAt: '2026-09-02T01:14:59-05:00',
      pasos: [
        { at: '2026-09-02T01:14:54-05:00', titulo: 'Depósito detectado', estado: 'hecho' },
        { at: '2026-09-02T01:14:59-05:00', titulo: 'Conciliado por el Piloto', detalle: 'Recibo #1', estado: 'hecho' },
      ],
      enVivo: false,
      enlace: null,
    },
  ],
  totales: { deposito: 5, llamada: 2, whatsapp: 0 },
  enVivo: 0,
  fuentes: { deposito: 'ok', llamada: 'ok', whatsapp: 'ok' },
  tomadoAt: '2026-09-02T20:00:00Z',
}

let container: HTMLDivElement
let root: Root
function render() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<PilotoDock />)
  })
}
const q = (s: string) => container.querySelector(s)
const ultimaOpcion = () => usePilotoProcesosMock.mock.calls.at(-1)?.[0] as { activo: boolean; tipo: string }

beforeEach(() => {
  estado.pathname = '/panel/inmobiliaria/contratos'
  estado.flota = FLOTA()
  estado.notAvailable = false
  estado.procesos = PROCESOS
  usePilotoProcesosMock.mockClear()
  try {
    window.localStorage.removeItem('piloto-dock-abierto')
  } catch {
    // happy-dom sin localStorage: el tray arranca cerrado igual
  }
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('PilotoDock', () => {
  it('cerrado: el botón está, el panel no, y NO se consultan procesos', () => {
    render()
    expect(q('[data-testid="piloto-dock-boton"]')).not.toBeNull()
    expect(q('[data-testid="piloto-dock-panel"]')).toBeNull()
    expect(ultimaOpcion().activo).toBe(false)
    expect(q('[data-testid="piloto-dock-boton"]')?.textContent).toContain('inmobiliaria.piloto.dock.boton')
  })

  it('abierto: lista, fila expandible con pasos, «ver todos» y se consulta', async () => {
    render()
    await act(async () => {
      ;(q('[data-testid="piloto-dock-boton"]') as HTMLButtonElement).click()
    })
    expect(q('[data-testid="piloto-dock-panel"]')).not.toBeNull()
    expect(ultimaOpcion().activo).toBe(true)
    expect(q('[data-testid="fila-mov:1"]')?.textContent).toContain('Detecté un depósito de $2.400.000')
    expect(q('[data-testid="fila-detalle-mov:1"]')).toBeNull()
    await act(async () => {
      ;(q('[data-testid="fila-mov:1"] button') as HTMLButtonElement).click()
    })
    expect(q('[data-testid="fila-detalle-mov:1"]')?.textContent).toContain('Recibo #1')
    expect(q('[data-testid="piloto-dock-ver-todos"]')?.getAttribute('href')).toBe('/panel/inmobiliaria/piloto/procesos')
    // Los chips de tipo llevan el total real y cambian el tipo consultado.
    expect(q('[data-testid="dock-tipo-deposito"]')?.textContent).toContain('5')
    await act(async () => {
      ;(q('[data-testid="dock-tipo-llamada"]') as HTMLButtonElement).click()
    })
    expect(ultimaOpcion().tipo).toBe('llamada')
  })

  it('un clic afuera lo cierra; adentro no', async () => {
    render()
    await act(async () => {
      ;(q('[data-testid="piloto-dock-boton"]') as HTMLButtonElement).click()
    })
    expect(q('[data-testid="piloto-dock-panel"]')).not.toBeNull()
    // Adentro: sigue abierto.
    await act(async () => {
      q('[data-testid="piloto-dock-panel"]')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    expect(q('[data-testid="piloto-dock-panel"]')).not.toBeNull()
    // Afuera: se cierra.
    await act(async () => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    expect(q('[data-testid="piloto-dock-panel"]')).toBeNull()
  })

  it('el botón dice lo que pasa: llamada en curso gana; si no, lo que te espera', () => {
    estado.flota = FLOTA({ llamadas: 1, conciliando: 2, esperando: 3 })
    render()
    expect(q('[data-testid="piloto-dock-boton"]')?.textContent).toContain('inmobiliaria.piloto.flota.llamadas(1)')
    act(() => root.unmount()); container.remove()
    estado.flota = FLOTA({ llamadas: 0, conciliando: 0, esperando: 3 })
    render()
    expect(q('[data-testid="piloto-dock-boton"]')?.textContent).toContain('inmobiliaria.piloto.flota.esperando(3)')
    expect(q('[data-testid="piloto-dock-badge"]')?.textContent).toBe('3')
  })

  it('sin flota no hay tray; en la página de procesos tampoco', () => {
    estado.notAvailable = true
    estado.flota = null
    render()
    expect(q('[data-testid="piloto-dock"]')).toBeNull()
    act(() => root.unmount()); container.remove()
    estado.notAvailable = false
    estado.flota = FLOTA()
    estado.pathname = '/panel/inmobiliaria/piloto/procesos'
    render()
    expect(q('[data-testid="piloto-dock"]')).toBeNull()
  })
})
