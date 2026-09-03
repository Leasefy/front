/**
 * La píldora del header («Piloto · Copiloto»).
 *
 * Lo que se protege:
 *  1. La píldora dice el modo de la FLOTA que devolvió el micro, y desaparece
 *     (no inventa) cuando el endpoint no existe.
 *  2. Cambiar de modo es UN clic para bajar de autonomía, y una confirmación
 *     para subir a automático (el único cambio con el que el Piloto llama,
 *     escribe y emite recibos sin preguntar).
 *  3. Quien no es admin la ve pero no la mueve; con el Piloto apagado en el
 *     servidor, nadie la mueve y la píldora dice «apagado».
 *  4. Lo «en vivo» se muestra solo cuando hay algo (una llamada en curso).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { estado, setModoMock } = vi.hoisted(() => ({
  estado: {
    data: null as unknown,
    isLoading: false,
    notAvailable: false,
    isAdmin: true,
  },
  setModoMock: vi.fn(async () => ({ ok: true })),
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, string>) =>
      vars ? `${k}(${Object.values(vars).join(',')})` : k,
    locale: 'es',
  }),
}))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({ isAdmin: estado.isAdmin, agencyRole: estado.isAdmin ? 'OWNER' : 'VIEWER' }),
}))
vi.mock('@/lib/hooks/piloto/use-piloto-flota', () => ({
  usePilotoFlota: () => ({
    data: estado.data,
    isLoading: estado.isLoading,
    error: null,
    notAvailable: estado.notAvailable,
    busy: false,
    setModo: setModoMock,
    refetch: async () => {},
  }),
}))
vi.mock('sonner', () => ({ toast: { success: () => {}, error: () => {}, warning: () => {} } }))
// El Popover de Radix se monta en un portal; para leerlo se pinta plano.
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <div data-testid="popover">{children}</div>,
}))
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, hideArrow, variant, size, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
    void asChild; void hideArrow; void variant; void size
    return <button {...(props as object)}>{children}</button>
  },
}))

import { PilotoModoHeader } from './PilotoModoHeader'

const FLOTA = (extra: Record<string, unknown> = {}) => ({
  activo: true,
  modo: 'copiloto',
  agentes: [
    { agente: 'cobranza', modo: 'copiloto', origen: 'piloto', corre: true },
    { agente: 'conciliacion', modo: 'copiloto', origen: 'piloto', corre: true },
  ],
  resumen: { sombra: 0, copiloto: 2, autonomo: 0 },
  enVivo: { llamadas: 0, conciliando: 0, esperando: 0 },
  tomadoAt: '2026-09-02T20:00:00Z',
  ...extra,
})

let container: HTMLDivElement
let root: Root

function render() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<PilotoModoHeader />)
  })
}
const q = (sel: string) => container.querySelector(sel)

beforeEach(() => {
  estado.data = FLOTA()
  estado.isLoading = false
  estado.notAvailable = false
  estado.isAdmin = true
  setModoMock.mockClear()
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('PilotoModoHeader', () => {
  it('dice el modo de la flota y marca la opción actual', () => {
    render()
    const pill = q('[data-testid="piloto-modo-header"]')!
    expect(pill.getAttribute('data-modo')).toBe('copiloto')
    expect(pill.textContent).toContain('inmobiliaria.piloto.flota.modo.copiloto')
    expect(q('[data-testid="piloto-modo-copiloto"]')?.getAttribute('aria-checked')).toBe('true')
    expect(q('[data-testid="piloto-modo-autonomo"]')?.getAttribute('aria-checked')).toBe('false')
    expect(q('[data-testid="piloto-modo-vivo"]')).toBeNull()
  })

  it('sin endpoint no hay píldora: no se inventa un estado', () => {
    estado.data = null
    estado.notAvailable = true
    render()
    expect(q('[data-testid="piloto-modo-header"]')).toBeNull()
  })

  it('bajar de autonomía es un clic; subir a automático pide confirmar', async () => {
    estado.data = FLOTA({ modo: 'autonomo' })
    render()
    await act(async () => {
      ;(q('[data-testid="piloto-modo-sombra"]') as HTMLButtonElement).click()
    })
    expect(setModoMock).toHaveBeenCalledWith('sombra')

    estado.data = FLOTA({ modo: 'copiloto' })
    act(() => root.unmount()); container.remove()
    render()
    await act(async () => {
      ;(q('[data-testid="piloto-modo-autonomo"]') as HTMLButtonElement).click()
    })
    // Todavía no se escribió: hay que confirmar.
    expect(setModoMock).toHaveBeenCalledTimes(1)
    expect(q('[data-testid="piloto-modo-confirmar"]')).not.toBeNull()
    await act(async () => {
      ;(q('[data-testid="piloto-modo-confirmar-si"]') as HTMLButtonElement).click()
    })
    expect(setModoMock).toHaveBeenLastCalledWith('autonomo')
  })

  it('quien no es admin ve el modo pero las otras opciones están deshabilitadas', () => {
    estado.isAdmin = false
    render()
    expect(q('[data-testid="piloto-modo-header"]')).not.toBeNull()
    expect((q('[data-testid="piloto-modo-autonomo"]') as HTMLButtonElement).disabled).toBe(true)
    expect((q('[data-testid="piloto-modo-copiloto"]') as HTMLButtonElement).disabled).toBe(false) // la actual
    expect(container.textContent).toContain('inmobiliaria.piloto.autonomia.soloAdmin')
  })

  it('con el Piloto apagado en el servidor la píldora dice «apagado» y no se mueve', () => {
    estado.data = FLOTA({ activo: false })
    render()
    expect(q('[data-testid="piloto-modo-header"]')?.textContent).toContain('inmobiliaria.piloto.flota.apagado')
    expect((q('[data-testid="piloto-modo-sombra"]') as HTMLButtonElement).disabled).toBe(true)
    expect(container.textContent).toContain('inmobiliaria.piloto.flota.apagadoHint')
  })

  it('con una llamada en curso, la píldora lo muestra y el popover lo lista', () => {
    estado.data = FLOTA({ enVivo: { llamadas: 1, conciliando: 0, esperando: 2 } })
    render()
    expect(q('[data-testid="piloto-modo-vivo"]')?.textContent).toContain('1')
    const ahora = q('[data-testid="piloto-modo-ahora"]')!
    expect(ahora.textContent).toContain('inmobiliaria.piloto.flota.llamadas(1)')
    expect(ahora.textContent).toContain('inmobiliaria.piloto.flota.esperando(2)')
  })

  it('mixto: lo dice con el desglose en vez de esconderlo', () => {
    estado.data = FLOTA({ modo: 'mixto', resumen: { sombra: 0, copiloto: 1, autonomo: 11 } })
    render()
    expect(q('[data-testid="piloto-modo-header"]')?.getAttribute('data-modo')).toBe('mixto')
    expect(container.textContent).toContain('inmobiliaria.piloto.flota.mixtoHint(11,1,0)')
    expect(q('[role="radio"][aria-checked="true"]')).toBeNull()
  })
})
