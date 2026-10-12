/**
 * «Cambiar de inquilino» (QA-CONT CR-06, back ff282197). SEGUIMIENTO-FRONT,
 * 03-10-2026.
 *
 *  · Sólo con fecha de hoy o pasada: el campo no deja mañana y lo dice.
 *  · 🔴 Si el saliente debe vencido, el 409 `INQUILINO_SALIENTE_CON_DEUDA` se dice
 *    EN PALABRAS dentro del cajón (no en un toast que se va solo).
 *  · Un 400 con `campos` va bajo su campo. El botón dice qué falta.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

// 10-10-2026: las fechas son campos de Cadence (se eligen, no se escriben); en la
// prueba, un <input> con el mismo id y data-testid (`campos-de-fecha.doble-de-prueba`).
vi.mock('@/components/contabilidad/CampoDeDia', () => import('@/components/ui/campos-de-fecha.doble-de-prueba'))
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/ciclo-de-vida.service', () => ({
  cicloDeVidaApi: { cambiarDeInquilino: vi.fn() },
}))
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { cicloDeVidaApi } from '@/lib/api/ciclo-de-vida.service'
import { ApiError } from '@/lib/api/client'
import { toast } from '@/components/ui/toast'
import { CambioDeInquilino } from './CambioDeInquilino'

const api = cicloDeVidaApi as unknown as { cambiarDeInquilino: ReturnType<typeof vi.fn> }
const toastSuccess = toast.success as unknown as ReturnType<typeof vi.fn>
const toastError = toast.error as unknown as ReturnType<typeof vi.fn>

let root: Root | null = null
let container: HTMLDivElement | null = null

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  container?.remove()
})

const onCerrar = vi.fn()
const onRegistrado = vi.fn()

async function montar() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(
      <CambioDeInquilino
        contractId="c1"
        inquilinoActual="Iván Restrepo"
        abierto
        onCerrar={onCerrar}
        onRegistrado={onRegistrado}
      />,
    )
  })
}

const q = <T extends HTMLElement = HTMLElement>(sel: string) => document.body.querySelector(sel) as T | null

async function escribir(testId: string, valor: string) {
  const input = q<HTMLInputElement>(`[data-testid="${testId}"]`)!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function llenarTodo() {
  await escribir('cambio-nombre', 'Sofía Cárdenas')
  await escribir('cambio-documento', '1037600999')
  await act(async () => {
    q('[data-testid="cambio-acepta"]')!.click()
  })
}

async function confirmar() {
  await act(async () => {
    q('[data-testid="confirmar-cambio-de-inquilino"]')!.click()
    await Promise.resolve()
  })
}

describe('<CambioDeInquilino>', () => {
  it('sin nombre, documento ni la aceptación del propietario no deja registrar, y dice qué falta', async () => {
    await montar()
    expect(q<HTMLButtonElement>('[data-testid="confirmar-cambio-de-inquilino"]')!.disabled).toBe(true)
    expect(q('[data-testid="cambio-lo-que-falta"]')!.textContent).toBe(
      'Falta el nombre, el documento y que el propietario lo aceptó.',
    )
  })

  it('el campo de la fecha no ofrece días futuros (sólo hoy o antes)', async () => {
    await montar()
    const desde = q<HTMLInputElement>('[data-testid="cambio-desde"]')!
    expect(desde.getAttribute('max')).toBe(desde.value)
  })

  it('manda lo escrito, avisa y cierra', async () => {
    api.cambiarDeInquilino.mockResolvedValue({
      contractId: 'c1',
      desde: '2026-10-01',
      inquilinoAnterior: 'Iván Restrepo',
      inquilinoNuevo: 'Sofía Cárdenas',
      cuotasReapuntadas: 2,
      conCuenta: false,
      parteId: 'p1',
    })
    await montar()
    await llenarTodo()
    await confirmar()
    expect(api.cambiarDeInquilino).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ nombre: 'Sofía Cárdenas', documento: '1037600999', aceptaElPropietario: true }),
    )
    expect(toastSuccess).toHaveBeenCalledTimes(1)
    expect(String(toastSuccess.mock.calls[0][1].description)).toContain('lo anterior sigue siendo de Iván Restrepo')
    expect(onCerrar).toHaveBeenCalled()
    expect(onRegistrado).toHaveBeenCalled()
  })

  it('🔴 si el saliente debe vencido, lo dice en palabras DENTRO del cajón (no en un toast)', async () => {
    const frase =
      'Iván Restrepo debe $6.050.000 vencidos de este contrato: el cambio de inquilino se hace cuando esté al día.'
    api.cambiarDeInquilino.mockRejectedValue(
      new ApiError(409, frase, 'INQUILINO_SALIENTE_CON_DEUDA', {
        statusCode: 409,
        code: 'INQUILINO_SALIENTE_CON_DEUDA',
        message: frase,
        deudaCop: 6_050_000,
        cuotas: 2,
      }),
    )
    await montar()
    await llenarTodo()
    await confirmar()
    const aviso = q('[data-testid="cambio-de-inquilino-aviso"]')!
    expect(aviso.textContent).toContain(frase)
    expect(aviso.textContent).not.toContain('INQUILINO_SALIENTE_CON_DEUDA')
    expect(toastError).not.toHaveBeenCalled()
    expect(onCerrar).not.toHaveBeenCalled()
  })

  it('un 400 con `campos` (la fecha futura) va bajo la fecha, con el foco', async () => {
    const mensaje = 'El cambio de inquilino se registra el día en que el nuevo inquilino recibe el inmueble o después.'
    api.cambiarDeInquilino.mockRejectedValue(
      new ApiError(400, [mensaje], 'CAMBIO_DE_INQUILINO_FUTURO', {
        statusCode: 400,
        code: 'CAMBIO_DE_INQUILINO_FUTURO',
        message: [mensaje],
        campos: [{ campo: 'desde', regla: 'cambioDeInquilino', mensaje }],
      }),
    )
    await montar()
    await llenarTodo()
    await confirmar()
    expect(q('#cambio-desde-error')?.textContent).toBe(mensaje)
    expect(document.activeElement).toBe(q('#cambio-desde'))
    expect(q('[data-testid="cambio-de-inquilino-aviso"]')?.textContent ?? '').toBe('')
  })
})
