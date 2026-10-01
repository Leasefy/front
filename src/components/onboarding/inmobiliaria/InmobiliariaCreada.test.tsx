import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// Se renderiza con `createRoot` + `act` directo (el patrón de la casa).
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { CompleteStepForm, RUTA_DEL_PANEL } from './CompleteStepForm'
import {
  InmobiliariaCreada,
  MOMENTO_DE_SALIR_MS,
  DURACION_DE_LA_SALIDA_MS,
  type InmobiliariaCreadaProps,
} from './InmobiliariaCreada'

// En happy-dom no hay canvas: el confeti se espía. `prefers-reduced-motion`
// se controla desde cada prueba.
const { confettiMock, movimiento, refreshUser, routerReplace } = vi.hoisted(() => ({
  confettiMock: Object.assign(vi.fn(), { reset: vi.fn() }),
  movimiento: { reducido: false },
  refreshUser: vi.fn(async () => {}),
  routerReplace: vi.fn(),
}))
vi.mock('canvas-confetti', () => ({ default: confettiMock }))
// Para montarla como en producción, dentro de `CompleteStepForm`.
vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ refreshUser, user: null, isAuthenticated: false, isLoading: false }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace, push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('framer-motion', async (original) => ({
  ...(await original<typeof import('framer-motion')>()),
  useReducedMotion: () => movimiento.reducido,
}))

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false })
  confettiMock.mockClear()
  confettiMock.reset.mockClear()
  refreshUser.mockReset()
  refreshUser.mockImplementation(async () => {})
  routerReplace.mockReset()
  movimiento.reducido = false
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.useRealTimers()
})

function render(props: Partial<InmobiliariaCreadaProps> = {}) {
  const todas: InmobiliariaCreadaProps = {
    nombre: 'Puertoski',
    onIrAlPanel: vi.fn(),
    yendo: false,
    ...props,
  }
  act(() => {
    root.render(<InmobiliariaCreada {...todas} />)
  })
  return todas
}

/** La celebración va por portal a `document.body`, fuera del contenedor. */
function enElDocumento(testId: string): HTMLElement | null {
  return document.body.querySelector(`[data-testid="${testId}"]`)
}

async function pasan(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('<InmobiliariaCreada>', () => {
  it('se anuncia como diálogo con su título y su texto, con el nombre, y el foco en el botón', () => {
    render()
    const dialogo = enElDocumento('inmobiliaria-creada')
    expect(dialogo?.getAttribute('role')).toBe('dialog')
    expect(dialogo?.getAttribute('aria-modal')).toBe('true')

    const titulo = document.getElementById(dialogo?.getAttribute('aria-labelledby') ?? '')
    expect(titulo?.tagName).toBe('H1')
    expect(titulo?.textContent).toBe('Tu inmobiliaria quedó creada')
    const descripcion = document.getElementById(dialogo?.getAttribute('aria-describedby') ?? '')
    expect(descripcion?.textContent).toContain('Puertoski ya tiene su espacio en Leasefy.')

    // El logo de Leasefy reemplazó al ícono, y es decorativo.
    expect(enElDocumento('inmobiliaria-creada-logo')).not.toBeNull()
    expect(enElDocumento('aurora-de-marca')).not.toBeNull()

    // Sin botón (Nico, 2026-09-30: «para qué, si la pantalla solita ya lo
    // lleva»): no hay nada que apretar y el foco vive en el diálogo.
    expect(enElDocumento('inmobiliaria-creada-ir-al-panel')).toBeNull()
    expect(dialogo?.querySelectorAll('button')).toHaveLength(0)
    expect(document.activeElement).toBe(dialogo)
  })

  it('🔴 se va sola al panel UNA vez, cuando termina, sin cuenta regresiva', async () => {
    const { onIrAlPanel } = render()

    await pasan(MOMENTO_DE_SALIR_MS - 50)
    expect(onIrAlPanel).not.toHaveBeenCalled()
    // Nada de números contando hacia atrás (en lo que se lee: el `<style>` de la aurora no cuenta).
    const visible = enElDocumento('inmobiliaria-creada')?.cloneNode(true) as HTMLElement
    visible.querySelectorAll('style').forEach((s) => s.remove())
    expect(visible.textContent).not.toMatch(/\d/)

    await pasan(50)
    expect(onIrAlPanel).toHaveBeenCalledTimes(1)
    expect(enElDocumento('inmobiliaria-creada')?.getAttribute('data-fase')).toBe('saliendo')

    // Pase lo que pase después, no vuelve a navegar.
    await pasan(30_000)
    expect(onIrAlPanel).toHaveBeenCalledTimes(1)
  })

  it('un padre que pasa una función nueva en cada render no reinicia el reloj', async () => {
    const primera = vi.fn()
    render({ onIrAlPanel: primera })
    await pasan(MOMENTO_DE_SALIR_MS - 1_000)

    const segunda = vi.fn()
    render({ onIrAlPanel: segunda })
    await pasan(1_000)

    // Llama a la vigente, a su hora, una vez.
    expect(primera).not.toHaveBeenCalled()
    expect(segunda).toHaveBeenCalledTimes(1)
  })

  it('si la navegación tarda, dice «Entrando a tu panel…» en vez de quedar muda', async () => {
    render()
    await pasan(MOMENTO_DE_SALIR_MS)
    expect(enElDocumento('inmobiliaria-creada-entrando')).toBeNull()

    await pasan(DURACION_DE_LA_SALIDA_MS)
    const estado = enElDocumento('inmobiliaria-creada-entrando')
    expect(estado?.getAttribute('role')).toBe('status')
    expect(estado?.textContent).toContain('Entrando a tu panel…')
  })

  it('la chispa sale del logo una vez dibujado, con la luz de la aurora', async () => {
    render()
    expect(confettiMock).not.toHaveBeenCalled()
    await pasan(1_500)
    expect(confettiMock).toHaveBeenCalled()
    const opciones = confettiMock.mock.calls[0]?.[0] as { colors: string[]; disableForReducedMotion: boolean }
    expect(opciones.disableForReducedMotion).toBe(true)
    // Ni el azul ni el gris de antes: blancos, crema y cielo sobre el azul.
    expect(opciones.colors).toContain('#ffffff')
  })

  it('🔴 con `prefers-reduced-motion`: fondo quieto, sin chispa, y aun así se va sola una vez', async () => {
    movimiento.reducido = true
    const { onIrAlPanel } = render()

    expect(enElDocumento('aurora-de-marca')?.getAttribute('data-animada')).toBe('no')
    expect(enElDocumento('inmobiliaria-creada')?.textContent).toContain('Tu inmobiliaria quedó creada')

    await pasan(MOMENTO_DE_SALIR_MS)
    expect(onIrAlPanel).toHaveBeenCalledTimes(1)
    expect(confettiMock).not.toHaveBeenCalled()

    await pasan(10_000)
    expect(onIrAlPanel).toHaveBeenCalledTimes(1)
  })

  it('sin razón social se celebra igual, sin inventar un nombre', () => {
    render({ nombre: null })
    expect(enElDocumento('inmobiliaria-creada')?.textContent).toContain('Tu inmobiliaria quedó creada')
    expect(enElDocumento('inmobiliaria-creada-nombre')).toBeNull()
    expect(enElDocumento('inmobiliaria-creada')?.textContent).not.toContain('null')
  })

  it('al desmontarse (llegó al panel) no deja relojes vivos', async () => {
    const { onIrAlPanel } = render()
    await pasan(500)
    act(() => {
      root.render(<></>)
    })
    await pasan(MOMENTO_DE_SALIR_MS + 1_000)
    expect(onIrAlPanel).not.toHaveBeenCalled()
    expect(confettiMock.reset).toHaveBeenCalled()
  })
})

/**
 * Lo que pasa al irse sola, con el padre de verdad: el refresco de la sesión
 * antes de navegar (el arreglo del bucle del 07-09) vive en
 * `CompleteStepForm.irAlPanel`, y la salida automática tiene que pasar por ahí
 * igual que el botón.
 */
describe('<InmobiliariaCreada> dentro de <CompleteStepForm>', () => {
  async function crearYCelebrar() {
    act(() => {
      root.render(
        <CompleteStepForm
          isSubmitting={false}
          error={null}
          onNavigateToStep={vi.fn()}
          onSubmit={vi.fn().mockResolvedValue({
            tenantId: 'tenant-1',
            agencyId: 'agency-1',
            sessionId: 'sess-1',
            status: 'COMPLETED',
            dashboardUrl: '/panel/inmobiliaria',
          })}
        />,
      )
    })
    const crear = container.querySelector('[data-testid="complete-step-finish"]') as HTMLButtonElement
    await act(async () => {
      crear.click()
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(enElDocumento('inmobiliaria-creada')).not.toBeNull()
  }

  it('🔴 al irse sola refresca la sesión y LUEGO navega al panel, una sola vez', async () => {
    const orden: string[] = []
    refreshUser.mockImplementation(async () => {
      orden.push('refresh')
    })
    routerReplace.mockImplementation(() => orden.push('replace'))

    await crearYCelebrar()
    await pasan(MOMENTO_DE_SALIR_MS - 100)
    expect(refreshUser).not.toHaveBeenCalled()

    await pasan(100)
    expect(orden).toEqual(['refresh', 'replace'])
    expect(routerReplace).toHaveBeenCalledWith(RUTA_DEL_PANEL)

    await pasan(30_000)
    expect(refreshUser).toHaveBeenCalledTimes(1)
    expect(routerReplace).toHaveBeenCalledTimes(1)
  })

  it('🔴 si refrescar la sesión falla, navega igual: no se queda colgada', async () => {
    refreshUser.mockImplementation(async () => {
      throw new Error('sin red')
    })
    await crearYCelebrar()
    await pasan(MOMENTO_DE_SALIR_MS)

    expect(refreshUser).toHaveBeenCalledTimes(1)
    expect(routerReplace).toHaveBeenCalledTimes(1)
    expect(routerReplace).toHaveBeenCalledWith(RUTA_DEL_PANEL)
  })

  it('con `prefers-reduced-motion` también se va sola, refrescando antes', async () => {
    movimiento.reducido = true
    await crearYCelebrar()
    await pasan(MOMENTO_DE_SALIR_MS)

    expect(refreshUser).toHaveBeenCalledTimes(1)
    expect(routerReplace).toHaveBeenCalledTimes(1)
    expect(confettiMock).not.toHaveBeenCalled()
  })
})
