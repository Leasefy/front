/**
 * 02-10-2026 · Las condiciones del contrato con el sistema de errores.
 *
 *  · El tope de la columna (prima, administración) se ataja ANTES de mandar,
 *    con la frase del back, debajo del valor.
 *  · Un 400 con `campos` va debajo de SU campo, con el foco.
 *  · Lo que no tiene campo va al toast: un 5xx con la referencia; sólo sin
 *    respuesta se habla de la conexión.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/ciclo-de-vida.service', () => ({
  cicloDeVidaApi: {
    condiciones: vi.fn(),
    fijarGastosDeCobranza: vi.fn(),
    aceptarSeguroOpcional: vi.fn(),
    retirarSeguroOpcional: vi.fn(),
    registrarPoliza: vi.fn(),
    fijarAdministracionDeLaCopropiedad: vi.fn(),
  },
}))
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
/*
 * Las fechas del seguro y de la póliza usan el selector de fecha del DS
 * (`CampoDeDia`, sobre el `DatePicker` de Cadence; Nico, 10-10-2026: «este no
 * usa Cadence»), que no se escribe. El doble es un input con el mismo `id`: el
 * formulario sigue hablando en `AAAA-MM-DD` y las validaciones son las mismas.
 */
vi.mock('@/components/contabilidad/CampoDeDia', async () => {
  const R = await import('react')
  return {
    CampoDeDia: ({
      id,
      value,
      onChange,
      invalido,
      describedBy,
      disabled,
    }: {
      id: string
      value: string
      onChange: (v: string) => void
      invalido?: boolean
      describedBy?: string
      disabled?: boolean
    }) =>
      R.createElement('input', {
        id,
        value,
        disabled,
        'aria-invalid': invalido ? true : undefined,
        'aria-describedby': describedBy,
        onChange: (e: { target: { value: string } }) => onChange(e.target.value),
      }),
  }
})
vi.mock('@/lib/api/copropiedades.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/copropiedades.service')>('@/lib/api/copropiedades.service')
  return {
    ...real,
    copropiedadesApi: {
      listar: vi.fn(async () => ({ faltaLaMigracion: false, migracion: 'm', copropiedades: [] })),
      asignarAMandato: vi.fn(),
      crear: vi.fn(),
    },
  }
})

import { cicloDeVidaApi, type CondicionesDelContrato as Condiciones } from '@/lib/api/ciclo-de-vida.service'
import { ApiError } from '@/lib/api/client'
import { toast } from '@/components/ui/toast'
import { CondicionesDelContrato } from './CondicionesDelContrato'

const api = cicloDeVidaApi as unknown as Record<string, ReturnType<typeof vi.fn>>
const toastError = toast.error as unknown as ReturnType<typeof vi.fn>

const TOPE_DE_LA_PRIMA = 'La prima no puede pasar de $2.000.000.000. Revisa que no sobren ceros.'
const TOPE_DE_LA_ADMINISTRACION =
  'El valor de la administración no puede pasar de $2.000.000.000. Revisa que no sobren ceros.'

function condiciones(): Condiciones {
  return {
    contractId: 'c1',
    gastosDeCobranza: { disponible: true, delContrato: null, deLaAgencia: null, resuelto: null },
    seguroOpcional: {
      disponible: true,
      porcentajeDisponible: true,
      oferta: { plan: 'BASIC', nombre: 'Seguro básico', primaCop: 45_000, pct: null },
      aceptado: null,
      pctPorPlan: {},
    },
    poliza: { disponible: true, aseguradora: null, numero: null, cobertura: null, vigenciaDesde: null, vigenciaHasta: null },
    administracion: {
      disponible: true,
      modalidad: 'LA_PAGA_LA_INMOBILIARIA',
      modalidadElegida: 'LA_PAGA_LA_INMOBILIARIA',
      porRespaldo: false,
      valorCop: 300_000,
      delMandatoCop: 250_000,
      consignacionId: 'cons-1',
      copropiedad: null,
      sePuedeDeclararLaCopropiedad: true,
    },
  } as unknown as Condiciones
}

let root: Root
let container: HTMLDivElement

beforeEach(() => {
  vi.clearAllMocks()
  api.condiciones.mockResolvedValue(condiciones())
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

const $ = (id: string) => container.querySelector<HTMLElement>(`[data-testid="${id}"]`)

async function montar() {
  await act(async () => {
    root.render(<CondicionesDelContrato contractId="c1" puedeEditar />)
  })
}

async function escribir(input: HTMLInputElement, valor: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function clic(el: HTMLElement) {
  await act(async () => {
    el.click()
    await Promise.resolve()
  })
}

async function llenarElSeguro(prima: string) {
  await clic($('acepta-seguro')!)
  await escribir($('seguro-quien') as HTMLInputElement, 'Ana Gómez')
  await escribir($('seguro-prima') as HTMLInputElement, prima)
}

const fallo400 = (campo: string, mensaje: string) =>
  new ApiError(400, [mensaje], 'DATOS_INVALIDOS', {
    statusCode: 400,
    code: 'DATOS_INVALIDOS',
    message: [mensaje],
    campos: [{ campo, regla: 'maximo', mensaje }],
  })

describe('<CondicionesDelContrato> — el seguro opcional', () => {
  it('🔴 una prima con ceros de más NO se manda: el tope sale debajo de la prima', async () => {
    await montar()
    await llenarElSeguro('30000000000')
    await clic($('guardar-seguro')!)
    expect(api.aceptarSeguroOpcional).not.toHaveBeenCalled()
    const prima = $('seguro-prima') as HTMLInputElement
    expect(container.querySelector('#seguro-prima-error')?.textContent).toBe(TOPE_DE_LA_PRIMA)
    expect(prima.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(prima)
  })

  it('🔴 un 400 del back en la prima va debajo de la prima y no al toast', async () => {
    api.aceptarSeguroOpcional.mockRejectedValue(fallo400('primaCop', TOPE_DE_LA_PRIMA))
    await montar()
    await llenarElSeguro('45000')
    await clic($('guardar-seguro')!)
    expect(api.aceptarSeguroOpcional).toHaveBeenCalledTimes(1)
    expect(container.querySelector('#seguro-prima-error')?.textContent).toBe(TOPE_DE_LA_PRIMA)
    expect(document.activeElement).toBe($('seguro-prima'))
    expect(toastError).not.toHaveBeenCalled()
  })

  it('un 5xx va al toast con la referencia, sin culpar a la conexión', async () => {
    api.aceptarSeguroOpcional.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor.',
        referencia: 'ab12cd34',
      }),
    )
    await montar()
    await llenarElSeguro('45000')
    await clic($('guardar-seguro')!)
    const { description } = toastError.mock.calls[0][1] as { description: string }
    expect(description).toContain('de nuestro lado')
    expect(description).toContain('ab12cd34')
    expect(description).not.toMatch(/conexión/i)
  })

  it('sin respuesta (status 0), y sólo entonces, habla de la conexión', async () => {
    api.aceptarSeguroOpcional.mockRejectedValue(new ApiError(0, 'Failed to fetch'))
    await montar()
    await llenarElSeguro('45000')
    await clic($('guardar-seguro')!)
    const { description } = toastError.mock.calls[0][1] as { description: string }
    expect(description).toMatch(/conexión/i)
  })
})

describe('<CondicionesDelContrato> — la póliza', () => {
  it('🔴 «hasta» antes de «desde» se dice debajo de «hasta», sin llamar al back', async () => {
    await montar()
    await escribir(container.querySelector('#poliza-desde')!, '2026-12-01')
    await escribir(container.querySelector('#poliza-hasta')!, '2026-01-01')
    await clic($('guardar-poliza')!)
    expect(api.registrarPoliza).not.toHaveBeenCalled()
    expect(container.querySelector('#poliza-hasta-error')?.textContent).toBe(
      'La vigencia de la póliza no puede terminar antes de empezar.',
    )
    expect(document.activeElement).toBe(container.querySelector('#poliza-hasta'))
  })

  it('un 400 del back en la vigencia va debajo de su fecha', async () => {
    const frase = 'El inicio de la vigencia no es un día real del calendario (usa AAAA-MM-DD).'
    api.registrarPoliza.mockRejectedValue(fallo400('vigenciaDesde', frase))
    await montar()
    await escribir(container.querySelector('#poliza-aseguradora')!, 'Sura')
    await clic($('guardar-poliza')!)
    expect(container.querySelector('#poliza-desde-error')?.textContent).toBe(frase)
    expect(container.querySelector('#poliza-desde')!.getAttribute('aria-invalid')).toBe('true')
  })
})

describe('<CondicionesDelContrato> — la administración que paga la inmobiliaria', () => {
  it('🔴 un valor con ceros de más NO se manda: el tope sale debajo del valor', async () => {
    await montar()
    await escribir($('valor-administracion') as HTMLInputElement, '30000000000')
    await clic($('guardar-administracion')!)
    expect(api.fijarAdministracionDeLaCopropiedad).not.toHaveBeenCalled()
    expect(container.querySelector('#valor-administracion-error')?.textContent).toBe(TOPE_DE_LA_ADMINISTRACION)
    expect(document.activeElement).toBe($('valor-administracion'))
  })

  it('un 400 del back en el valor va debajo del valor', async () => {
    api.fijarAdministracionDeLaCopropiedad.mockRejectedValue(fallo400('valorCop', TOPE_DE_LA_ADMINISTRACION))
    await montar()
    await clic($('guardar-administracion')!)
    expect(container.querySelector('#valor-administracion-error')?.textContent).toBe(TOPE_DE_LA_ADMINISTRACION)
    expect(document.activeElement).toBe($('valor-administracion'))
    expect(toastError).not.toHaveBeenCalled()
  })
})
