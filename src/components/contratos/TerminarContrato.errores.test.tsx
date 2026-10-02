/**
 * 02-10-2026 · Terminar el contrato y cambiar de propietario con el sistema de
 * errores.
 *
 *  · La penalidad tiene el tope de su columna (`ConceptoDeUnaVez.valorCop`): una
 *    cifra con ceros de más no deja confirmar y se dice debajo de la penalidad,
 *    con la frase del back (antes el back la dejaba pasar hasta 10.000 millones
 *    y la base respondía un error sin campo).
 *  · Un 400 con `campos` va debajo de SU campo; un 5xx dice «de nuestro lado»
 *    con la referencia; la conexión, sólo sin respuesta. El 403 sigue con su
 *    frase propia.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/ciclo-de-vida.service', () => ({
  cicloDeVidaApi: {
    motivosDeTerminacion: vi.fn(),
    vistaPreviaDeTerminacion: vi.fn(),
    terminar: vi.fn(),
    registrarCesion: vi.fn(),
  },
}))
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  propietariosApi: { getAll: vi.fn(async () => [{ id: 'po-2', name: 'Beto Ruiz', documentNumber: '71211270' }]) },
}))
vi.mock('@/components/contratos/SelectorDePropietario', () => ({
  SelectorDePropietario: ({ onElegir }: { onElegir: (p: { id: string; name: string }) => void }) => (
    <button type="button" data-testid="elegir-dueno" onClick={() => onElegir({ id: 'po-2', name: 'Beto Ruiz' })}>
      Beto
    </button>
  ),
}))
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { cicloDeVidaApi } from '@/lib/api/ciclo-de-vida.service'
import { ApiError } from '@/lib/api/client'
import { toast } from '@/components/ui/toast'
import { TerminarContrato } from './TerminarContrato'
import { CesionDelInmueble } from './CesionDelInmueble'

const api = cicloDeVidaApi as unknown as Record<string, ReturnType<typeof vi.fn>>
const toastError = toast.error as unknown as ReturnType<typeof vi.fn>

const TOPE = 'La penalidad no puede pasar de $2.000.000.000. Revisa que no sobren ceros.'

let root: Root | null = null
let container: HTMLDivElement | null = null

beforeEach(() => {
  vi.clearAllMocks()
  api.motivosDeTerminacion.mockResolvedValue({
    motivos: [{ codigo: 'MUTUO_ACUERDO', nombre: 'Mutuo acuerdo', exigeNota: false }],
  })
  api.vistaPreviaDeTerminacion.mockResolvedValue({
    puedeTerminarse: true,
    razon: null,
    finPactado: '2026-12-31',
    disponible: true,
    prorrateoDelUltimoMes: null,
  })
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  container?.remove()
})

async function montar(el: React.ReactElement) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(el)
  })
}

const q = <T extends HTMLElement = HTMLElement>(sel: string) => document.body.querySelector(sel) as T | null

async function escribir(input: HTMLInputElement, valor: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function elegirMotivo() {
  const select = q<HTMLSelectElement>('[data-testid="motivo-de-terminacion"]')!
  await act(async () => {
    select.value = 'MUTUO_ACUERDO'
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

async function confirmar(testId: string) {
  await act(async () => {
    q(`[data-testid="${testId}"]`)!.click()
    await Promise.resolve()
  })
}

const terminar = () => (
  <TerminarContrato contractId="c1" abierto onCerrar={vi.fn()} onTerminado={vi.fn()} />
)

describe('<TerminarContrato> — errores en su campo', () => {
  it('🔴 una penalidad con ceros de más no deja confirmar y se dice debajo de la penalidad', async () => {
    await montar(terminar())
    await elegirMotivo()
    const penalidad = q<HTMLInputElement>('[data-testid="penalidad-de-terminacion"]')!
    await escribir(penalidad, '30000000000')
    expect(q('#penalidad-error')?.textContent).toBe(TOPE)
    expect(penalidad.getAttribute('aria-invalid')).toBe('true')
    expect(q<HTMLButtonElement>('[data-testid="confirmar-terminacion"]')!.disabled).toBe(true)
  })

  it('🔴 un 400 con `campos` va debajo de su campo, con el foco, y no al toast', async () => {
    api.terminar.mockRejectedValue(
      new ApiError(400, [TOPE], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [TOPE],
        campos: [{ campo: 'penalidadCop', regla: 'maximo', mensaje: TOPE }],
      }),
    )
    await montar(terminar())
    await elegirMotivo()
    await escribir(q<HTMLInputElement>('[data-testid="penalidad-de-terminacion"]')!, '4500000')
    await confirmar('confirmar-terminacion')
    expect(q('#penalidad-error')?.textContent).toBe(TOPE)
    expect(document.activeElement).toBe(q('#penalidad'))
    expect(toastError).not.toHaveBeenCalled()
  })

  it('un 5xx va al toast con la referencia, sin culpar a la conexión', async () => {
    api.terminar.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor.',
        referencia: 'ab12cd34',
      }),
    )
    await montar(terminar())
    await elegirMotivo()
    await confirmar('confirmar-terminacion')
    const { description } = toastError.mock.calls[0][1] as { description: string }
    expect(description).toContain('de nuestro lado')
    expect(description).toContain('ab12cd34')
    expect(description).not.toMatch(/conexión/i)
  })

  it('sin respuesta (status 0), y sólo entonces, habla de la conexión', async () => {
    api.terminar.mockRejectedValue(new ApiError(0, 'Failed to fetch'))
    await montar(terminar())
    await elegirMotivo()
    await confirmar('confirmar-terminacion')
    const { description } = toastError.mock.calls[0][1] as { description: string }
    expect(description).toMatch(/conexión/i)
  })

  it('el 403 sigue diciendo que no tiene permisos, sin más', async () => {
    api.terminar.mockRejectedValue(new ApiError(403, 'Forbidden resource'))
    await montar(terminar())
    await elegirMotivo()
    await confirmar('confirmar-terminacion')
    expect(toastError).toHaveBeenCalledWith('No tienes permisos para terminar contratos.')
  })
})

/**
 * 🔴 02-10-2026 · El tope de la penalidad LO DEFINE CADA INMOBILIARIA (Nico).
 * La vista previa trae N cánones (del contrato o de la configuración) por el
 * canon, con la frase del back: se dice como ayuda, se ataja antes de mandar,
 * y el 400 `PENALIDAD_SOBRE_EL_TOPE` del back cae bajo el mismo campo.
 */
describe('<TerminarContrato> — el tope que definió la inmobiliaria', () => {
  const DESCRIPCION = 'Tu inmobiliaria definió un máximo de 3 cánones ($9.000.000) por terminar antes.'
  const MENSAJE = `${DESCRIPCION} La penalidad no puede pasar de ahí.`

  beforeEach(() => {
    api.vistaPreviaDeTerminacion.mockResolvedValue({
      puedeTerminarse: true,
      razon: null,
      finPactado: '2026-12-31',
      disponible: true,
      prorrateoDelUltimoMes: null,
      penalidadSugerida: { canones: 3, valorCop: 9_000_000 },
      penalidadMaxima: {
        canones: 3,
        valorCop: 9_000_000,
        origen: 'INMOBILIARIA',
        descripcion: DESCRIPCION,
        mensaje: MENSAJE,
      },
    })
  })

  it('la ayuda del campo dice el máximo que definió la inmobiliaria', async () => {
    await montar(terminar())
    expect(q('[data-testid="terminar-contrato"]')?.textContent).toContain(DESCRIPCION)
  })

  it('🔴 más que el tope no deja confirmar y se dice debajo de la penalidad', async () => {
    await montar(terminar())
    await elegirMotivo()
    const penalidad = q<HTMLInputElement>('[data-testid="penalidad-de-terminacion"]')!
    await escribir(penalidad, '9000001')
    expect(q('#penalidad-error')?.textContent).toBe(MENSAJE)
    expect(penalidad.getAttribute('aria-invalid')).toBe('true')
    expect(q<HTMLButtonElement>('[data-testid="confirmar-terminacion"]')!.disabled).toBe(true)
    expect(api.terminar).not.toHaveBeenCalled()
  })

  it('el tope exacto y un valor negociado por debajo se mandan', async () => {
    api.terminar.mockResolvedValue({
      contractId: 'c1',
      terminadoEn: '2026-09-30',
      motivo: 'MUTUO_ACUERDO',
      motivoLegible: 'Mutuo acuerdo',
      finPactadoOriginal: '2026-12-31',
      inmuebleLiberado: true,
      prorrateoDelUltimoMes: null,
    })
    await montar(terminar())
    await elegirMotivo()
    await escribir(q<HTMLInputElement>('[data-testid="penalidad-de-terminacion"]')!, '4500000')
    expect(q<HTMLButtonElement>('[data-testid="confirmar-terminacion"]')!.disabled).toBe(false)
    await confirmar('confirmar-terminacion')
    expect(api.terminar).toHaveBeenCalledWith('c1', expect.objectContaining({ penalidadCop: 4_500_000 }))
  })

  it('🔴 el 400 PENALIDAD_SOBRE_EL_TOPE del back va debajo de la penalidad, no al toast', async () => {
    // P. ej. la inmobiliaria bajó el tope mientras la pantalla seguía abierta.
    api.terminar.mockRejectedValue(
      new ApiError(400, [MENSAJE], 'PENALIDAD_SOBRE_EL_TOPE', {
        statusCode: 400,
        code: 'PENALIDAD_SOBRE_EL_TOPE',
        message: [MENSAJE],
        campos: [{ campo: 'penalidadCop', regla: 'maximo', mensaje: MENSAJE, valor: 8_000_000 }],
      }),
    )
    await montar(terminar())
    await elegirMotivo()
    await escribir(q<HTMLInputElement>('[data-testid="penalidad-de-terminacion"]')!, '8000000')
    await confirmar('confirmar-terminacion')
    expect(q('#penalidad-error')?.textContent).toBe(MENSAJE)
    expect(document.activeElement).toBe(q('#penalidad'))
    expect(toastError).not.toHaveBeenCalled()
  })
})

describe('<CesionDelInmueble> — errores en su campo', () => {
  const cesion = () => (
    <CesionDelInmueble contractId="c1" propietarioActual="Ana" abierto onCerrar={vi.fn()} onRegistrada={vi.fn()} />
  )

  it('🔴 un 400 en la fecha va debajo de la fecha, con el foco', async () => {
    const frase = 'La fecha de la cesión tiene que venir como «2026-10-01».'
    api.registrarCesion.mockRejectedValue(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [frase],
        campos: [{ campo: 'desde', regla: 'formato', mensaje: frase }],
      }),
    )
    await montar(cesion())
    await act(async () => q('[data-testid="elegir-dueno"]')!.click())
    await confirmar('confirmar-cesion')
    expect(q('#desde-error')?.textContent).toBe(frase)
    expect(document.activeElement).toBe(q('#desde'))
    expect(toastError).not.toHaveBeenCalled()
  })

  it('un error del dueño nuevo (`nuevosPropietarios.0.propietarioId`) va debajo del selector', async () => {
    const frase = 'Elige un propietario de tu inmobiliaria.'
    api.registrarCesion.mockRejectedValue(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [frase],
        campos: [{ campo: 'nuevosPropietarios.0.propietarioId', regla: 'uuid', mensaje: frase }],
      }),
    )
    await montar(cesion())
    await act(async () => q('[data-testid="elegir-dueno"]')!.click())
    await confirmar('confirmar-cesion')
    expect(q('#cesion-propietario-error')?.textContent).toBe(frase)
  })

  it('un 5xx va al toast con la referencia; la conexión sólo sin respuesta', async () => {
    api.registrarCesion.mockRejectedValueOnce(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        referencia: 'ab12cd34',
      }),
    )
    await montar(cesion())
    await act(async () => q('[data-testid="elegir-dueno"]')!.click())
    await confirmar('confirmar-cesion')
    const primero = (toastError.mock.calls[0][1] as { description: string }).description
    expect(primero).toContain('ab12cd34')
    expect(primero).not.toMatch(/conexión/i)

    api.registrarCesion.mockRejectedValueOnce(new ApiError(0, 'Failed to fetch'))
    await confirmar('confirmar-cesion')
    const segundo = (toastError.mock.calls[1][1] as { description: string }).description
    expect(segundo).toMatch(/conexión/i)
  })
})
