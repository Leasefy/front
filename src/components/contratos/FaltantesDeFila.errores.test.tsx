/**
 * Sistema de errores (02-10-2026) en la corrección de una fila de la migración
 * de contratos:
 *
 *  · el cliente ataja con los MISMOS topes y frases que `ResolverFilaDto`;
 *  · un 400 con `campos` se pinta debajo de SU campo y le da el foco;
 *  · un 5xx dice que fue de nuestro lado, con la referencia, sin culpar a la
 *    conexión; «conexión» sólo cuando no hubo respuesta.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/inmobiliaria.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/inmobiliaria.service')>(
    '@/lib/api/inmobiliaria.service',
  )
  return {
    ...actual,
    propietariosApi: { ...actual.propietariosApi, getAll: vi.fn().mockResolvedValue([]) },
  }
})

vi.mock('@/lib/api/contracts.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contracts.service')>(
    '@/lib/api/contracts.service',
  )
  return {
    ...actual,
    contractsApi: {
      migracion: {
        resolver: vi.fn(),
        crearInmueble: vi.fn(),
        registrarPropietario: vi.fn(),
        buscarInmuebles: vi.fn().mockResolvedValue([]),
      },
    },
  }
})

import { ApiError } from '@/lib/api/client'
import { contractsApi, type FilaDeMigracion } from '@/lib/api/contracts.service'
import { FaltantesDeFila, idDelCampo } from './FaltantesDeFila'
import { MENSAJES_DE_LA_MIGRACION as M } from '@/components/migracion/limites-de-la-migracion'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.mocked(contractsApi.migracion.resolver).mockReset()
  vi.mocked(contractsApi.migracion.registrarPropietario).mockReset()
})

function fila(faltantes: string[]): FilaDeMigracion {
  return {
    id: 'f-1',
    lote: 'lote-1',
    fila: 0,
    datos: { direccion: 'Cra 1', inquilino: { nombre: 'Ana', correo: 'ana@x.co' } },
    propertyId: 'prop-1',
    propietarioId: null,
    tenantId: null,
    candidatos: [],
    estado: 'PENDIENTE',
    faltantes,
    contractId: null,
    overrides: [],
  } as FilaDeMigracion
}

function pintar(faltantes: string[]) {
  act(() => {
    root.render(<FaltantesDeFila fila={fila(faltantes)} onResuelta={() => {}} />)
  })
}

function escribir(el: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(el, valor)
  act(() => {
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function guardar(texto = 'Guardar') {
  const b = Array.from(container.querySelectorAll('button')).find((x) =>
    x.textContent?.includes(texto),
  )!
  await act(async () => {
    b.click()
  })
  await act(async () => {})
}

/** El cuerpo de un 400 `DATOS_INVALIDOS` del back, como lo guarda `ApiError`. */
function datosInvalidos(campo: string, mensaje: string) {
  return new ApiError(400, [mensaje], 'DATOS_INVALIDOS', {
    statusCode: 400,
    code: 'DATOS_INVALIDOS',
    message: [mensaje],
    campos: [{ campo, regla: 'maximo', mensaje }],
  })
}

const errorDe = (id: string) => document.getElementById(`${id}-error`)
const avisoDeLaFila = () => container.querySelector('[data-testid="error-de-faltantes"]')

describe('el canon de una fila', () => {
  const idCanon = idDelCampo('f-1', 'monthlyRent')

  it('🔴 once cifras se atajan en el cliente: la frase del back debajo, foco, y no viaja', async () => {
    pintar(['canon'])
    const campo = document.getElementById(idCanon) as HTMLInputElement
    escribir(campo, '30000000000')
    await guardar()

    expect(contractsApi.migracion.resolver).not.toHaveBeenCalled()
    expect(errorDe(idCanon)?.textContent).toBe(M.canonMaximoAlCorregir)
    expect(campo.getAttribute('aria-invalid')).toBe('true')
    expect(campo.getAttribute('aria-describedby')).toBe(`${idCanon}-error`)
    expect(document.activeElement).toBe(campo)
  })

  it('un canon real viaja como número entero', async () => {
    vi.mocked(contractsApi.migracion.resolver).mockResolvedValue(fila([]))
    pintar(['canon'])
    escribir(document.getElementById(idCanon) as HTMLInputElement, '1850000')
    await guardar()
    expect(contractsApi.migracion.resolver).toHaveBeenCalledWith('f-1', { monthlyRent: 1_850_000 })
  })

  it('🔴 un 400 del back en monthlyRent va debajo del canon, con el foco, y no al aviso de la fila', async () => {
    vi.mocked(contractsApi.migracion.resolver).mockRejectedValue(
      datosInvalidos('monthlyRent', M.canonMaximoAlCorregir),
    )
    pintar(['canon'])
    const campo = document.getElementById(idCanon) as HTMLInputElement
    escribir(campo, '1850000')
    await guardar()

    expect(errorDe(idCanon)?.textContent).toBe(M.canonMaximoAlCorregir)
    expect(campo.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(campo)
    expect(avisoDeLaFila()).toBeNull()

    // Al volver a escribir, el error del back se va.
    escribir(campo, '1900000')
    expect(campo.getAttribute('aria-invalid')).toBeNull()
  })

  it('🔴 un 5xx dice que fue de nuestro lado, con la referencia, y no culpa a la conexión', async () => {
    vi.mocked(contractsApi.migracion.resolver).mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor.',
        referencia: 'ab12cd34',
      }),
    )
    pintar(['canon'])
    escribir(document.getElementById(idCanon) as HTMLInputElement, '1850000')
    await guardar()

    const texto = avisoDeLaFila()?.textContent ?? ''
    expect(texto).toMatch(/^No pudimos guardar el cambio: algo falló de nuestro lado/)
    expect(texto).toContain('ab12cd34')
    expect(texto).not.toMatch(/conexi[oó]n/)
    expect(texto).not.toContain('Error interno del servidor')
  })

  it('sin respuesta (la red): ahí sí se habla de la conexión', async () => {
    vi.mocked(contractsApi.migracion.resolver).mockRejectedValue(new TypeError('Failed to fetch'))
    pintar(['canon'])
    escribir(document.getElementById(idCanon) as HTMLInputElement, '1850000')
    await guardar()
    expect(avisoDeLaFila()?.textContent).toMatch(/conexión/)
  })
})

describe('el día de pago', () => {
  it('🔴 un 30 ya no se pierde en silencio: dice el rango y no viaja', async () => {
    pintar(['dia_de_pago'])
    const id = idDelCampo('f-1', 'paymentDay')
    escribir(document.getElementById(id) as HTMLInputElement, '30')
    await guardar()
    expect(contractsApi.migracion.resolver).not.toHaveBeenCalled()
    expect(errorDe(id)?.textContent).toBe(M.diaDePago)
  })
})

describe('las fechas', () => {
  it('el fin antes del inicio se dice debajo del fin, sin viajar', async () => {
    pintar(['fechas'])
    escribir(document.getElementById(idDelCampo('f-1', 'startDate')) as HTMLInputElement, '2026-03-01')
    escribir(document.getElementById(idDelCampo('f-1', 'endDate')) as HTMLInputElement, '2026-02-01')
    await guardar()
    expect(contractsApi.migracion.resolver).not.toHaveBeenCalled()
    expect(errorDe(idDelCampo('f-1', 'endDate'))?.textContent).toBe(M.finAntesDelInicio)
  })

  it('un 400 del back en startDate va debajo del inicio', async () => {
    vi.mocked(contractsApi.migracion.resolver).mockRejectedValue(
      datosInvalidos('startDate', 'La fecha de inicio no es un día real del calendario.'),
    )
    pintar(['fechas'])
    escribir(document.getElementById(idDelCampo('f-1', 'startDate')) as HTMLInputElement, '2026-01-01')
    escribir(document.getElementById(idDelCampo('f-1', 'endDate')) as HTMLInputElement, '2026-12-31')
    await guardar()
    expect(errorDe(idDelCampo('f-1', 'startDate'))?.textContent).toBe(
      'La fecha de inicio no es un día real del calendario.',
    )
    expect(document.activeElement?.id).toBe(idDelCampo('f-1', 'startDate'))
  })
})

describe('registrar al propietario', () => {
  it('🔴 un 400 en el documento va debajo del documento; uno en un campo que no se ve, al aviso', async () => {
    vi.mocked(contractsApi.migracion.registrarPropietario).mockRejectedValue(
      new ApiError(400, ['El documento no es válido.', 'El correo no es válido.'], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: ['El documento no es válido.', 'El correo no es válido.'],
        campos: [
          { campo: 'documento', regla: 'formato', mensaje: 'El documento no es válido.' },
          { campo: 'correo', regla: 'formato', mensaje: 'El correo no es válido.' },
        ],
      }),
    )
    pintar(['propietario'])
    escribir(document.getElementById(idDelCampo('f-1', 'nombre')) as HTMLInputElement, 'Jorge')
    escribir(document.getElementById(idDelCampo('f-1', 'documento')) as HTMLInputElement, '12')
    await guardar('Registrar y consignar')

    const idDoc = idDelCampo('f-1', 'documento')
    expect(errorDe(idDoc)?.textContent).toBe('El documento no es válido.')
    expect(document.activeElement?.id).toBe(idDoc)
    // El correo no tiene campo acá (sale de la ficha elegida): va al aviso.
    expect(avisoDeLaFila()?.textContent).toBe('El correo no es válido.')
  })

  it('una comisión de 150 % se ataja con la frase, sin viajar', async () => {
    pintar(['propietario'])
    escribir(document.getElementById(idDelCampo('f-1', 'nombre')) as HTMLInputElement, 'Jorge')
    escribir(document.getElementById(idDelCampo('f-1', 'documento')) as HTMLInputElement, '71234567')
    escribir(document.getElementById(idDelCampo('f-1', 'comisionPorcentaje')) as HTMLInputElement, '150')
    await guardar('Registrar y consignar')
    expect(contractsApi.migracion.registrarPropietario).not.toHaveBeenCalled()
    expect(errorDe(idDelCampo('f-1', 'comisionPorcentaje'))?.textContent).toBe(M.comision)
  })

  it('una comisión del 0 % viaja como 0 (antes se perdía como «sin dato»)', async () => {
    vi.mocked(contractsApi.migracion.registrarPropietario).mockResolvedValue(fila([]))
    pintar(['propietario'])
    escribir(document.getElementById(idDelCampo('f-1', 'nombre')) as HTMLInputElement, 'Jorge')
    escribir(document.getElementById(idDelCampo('f-1', 'documento')) as HTMLInputElement, '71234567')
    escribir(document.getElementById(idDelCampo('f-1', 'comisionPorcentaje')) as HTMLInputElement, '0')
    await guardar('Registrar y consignar')
    expect(contractsApi.migracion.registrarPropietario).toHaveBeenCalledWith(
      'f-1',
      expect.objectContaining({ comisionPorcentaje: 0 }),
    )
  })
})
