/**
 * T-0033 contract.md §3.2.G2/G3 — el trozado secuencial de `CHUNK_MASIVA =
 * 100` y el reporte honesto de una masiva de selección de todo el lote.
 *
 * Lo que importa acá, en orden de gravedad:
 *
 *  1. **Los ids que se mandan son los de `ids`, no los de `seleccionadas`.**
 *     Con selección de todo el lote, `seleccionadas` (lo cargado de la
 *     página actual) es un subconjunto — mandar ESE sería aplicar el cambio
 *     a 25 filas creyendo que se aplicó a 1.365.
 *  2. **Un trozo que falla a mitad de camino no borra lo que ya se aplicó
 *     antes.** Con 1.365 filas en 14 tandas, la tanda 8 puede fallar — lo
 *     que las 7 anteriores ya lograron tiene que seguir visible, y el error
 *     tiene que decir hasta dónde llegó.
 *  3. **`omitidas` se reporta aparte de `fallidas`**, con la frase congelada
 *     del contrato — nunca como un fallo.
 *
 * Los tests usan el modo "mismo propietario" (inputs de texto simples), no
 * "definir el uso" (Radix `<Select>`, cuyo portal no vale la pena simular acá
 * — completar dos inputs de texto alcanza para ejercitar el trozado).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: {
    migracion: {
      resolverMasivo: vi.fn(),
    },
  },
}))

import { contractsApi } from '@/lib/api/contracts.service'
import type { FilaDeMigracion, ResultadoMasivo } from '@/lib/api/contracts.service'
import { ResolucionMasiva } from './ResolucionMasiva'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

function fila(over: Partial<FilaDeMigracion> = {}): FilaDeMigracion {
  return {
    id: 'f-1',
    lote: 'lote-1',
    fila: 1,
    datos: { direccion: 'Cra 1', inquilino: { nombre: 'Ana', correo: 'a@x.co' } },
    propertyId: 'prop-1',
    propietarioId: null,
    tenantId: null,
    candidatos: [],
    estado: 'PENDIENTE',
    faltantes: ['propietario'],
    contractId: null,
    ...over,
  }
}

function resultadoVacio(over: Partial<ResultadoMasivo> = {}): ResultadoMasivo {
  return { pedidas: 0, aplicadas: 0, fallidas: [], ...over }
}

function render(props: React.ComponentProps<typeof ResolucionMasiva>) {
  act(() => {
    root.render(<ResolucionMasiva {...props} />)
  })
}

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

function boton(texto: string) {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(texto),
  ) as HTMLButtonElement | undefined
}

function setNativeValue(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Entra al modo "mismo propietario" y completa nombre + documento. */
function completarModoPropietario() {
  boton('Mismo propietario')?.click()
}

async function elegirYCompletarPropietario() {
  act(() => {
    completarModoPropietario()
  })
  await esperar()
  const inputs = Array.from(container.querySelectorAll('input')) as HTMLInputElement[]
  act(() => {
    setNativeValue(inputs[0], 'Jorge Restrepo')
    setNativeValue(inputs[1], '71234567')
  })
  await esperar()
}

describe('<ResolucionMasiva> — trocea la selección en tandas de 100 (§3.2.G2)', () => {
  it('con 250 ids manda 3 tandas secuenciales de 100/100/50', async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `f-${i}`)
    vi.mocked(contractsApi.migracion.resolverMasivo).mockImplementation(
      async (trozo) => resultadoVacio({ pedidas: trozo.length, aplicadas: trozo.length }),
    )

    render({ ids, seleccionadas: [fila()], onListo: vi.fn() })
    await elegirYCompletarPropietario()

    await act(async () => {
      boton(`Aplicar a ${ids.length}`)?.click()
      for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0))
    })

    expect(contractsApi.migracion.resolverMasivo).toHaveBeenCalledTimes(3)
    const llamadas = vi.mocked(contractsApi.migracion.resolverMasivo).mock.calls
    expect(llamadas[0][0]).toHaveLength(100)
    expect(llamadas[1][0]).toHaveLength(100)
    expect(llamadas[2][0]).toHaveLength(50)
  })

  it('manda los ids del prop `ids`, NO los derivados de `seleccionadas`', async () => {
    // Selección de todo el lote: sólo 1 fila está cargada en `seleccionadas`
    // (la página visible), pero `ids` tiene 3 — el escenario exacto de
    // seleccionar todo el lote sin haber paginado por él.
    vi.mocked(contractsApi.migracion.resolverMasivo).mockResolvedValue(
      resultadoVacio({ pedidas: 3, aplicadas: 3 }),
    )

    render({
      ids: ['f-1', 'f-2', 'f-3'],
      seleccionadas: [fila({ id: 'f-1' })],
      onListo: vi.fn(),
    })
    await elegirYCompletarPropietario()

    await act(async () => {
      boton('Aplicar a 3')?.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(contractsApi.migracion.resolverMasivo).toHaveBeenCalledWith(
      ['f-1', 'f-2', 'f-3'],
      expect.anything(),
    )
  })

  it('un trozo que falla a mitad de camino conserva lo que aplicaron los anteriores', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `f-${i}`)
    vi.mocked(contractsApi.migracion.resolverMasivo)
      .mockResolvedValueOnce(resultadoVacio({ pedidas: 100, aplicadas: 100 }))
      .mockRejectedValueOnce(new Error('la red se cayó'))

    render({ ids, seleccionadas: [fila()], onListo: vi.fn() })
    await elegirYCompletarPropietario()

    await act(async () => {
      boton(`Aplicar a ${ids.length}`)?.click()
      for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0))
    })

    const resultado = container.querySelector('[data-testid="resultado-masivo"]')
    expect(resultado?.textContent).toContain('100')
    // El error dice hasta dónde llegó — no sólo "falló".
    const errorEl = container.querySelector('[data-testid="error-masivo"]')
    expect(errorEl?.textContent).toContain('100')
    expect(errorEl?.textContent).toMatch(/red se cayó/)
  })
})

describe('<ResolucionMasiva> — omitidas (§3.2.G3)', () => {
  it('reporta omitidas aparte de fallidas, con la frase congelada del contrato', async () => {
    vi.mocked(contractsApi.migracion.resolverMasivo).mockResolvedValue(
      resultadoVacio({
        pedidas: 2,
        aplicadas: 1,
        omitidas: [{ id: 'f-2', fila: 5, motivo: 'Sin inmueble: la consignación es del inmueble.' }],
      }),
    )

    render({
      ids: ['f-1', 'f-2'],
      seleccionadas: [fila({ id: 'f-1' }), fila({ id: 'f-2', propertyId: null, fila: 5 })],
      onListo: vi.fn(),
    })
    await elegirYCompletarPropietario()

    await act(async () => {
      boton('Aplicar a 2')?.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    const resultado = container.querySelector('[data-testid="resultado-masivo"]')
    // La razón la dice el back (hoy hay dos: sin inmueble, o activada que ya
    // tenía propietario); la pantalla la repite tal cual, con cuántas.
    expect(resultado?.textContent).toContain('1 fila — Sin inmueble: la consignación es del inmueble.')
    expect(resultado?.textContent).not.toContain('no se pudieron')
  })

  it('agrupa las omitidas por razón: las activadas que ya tenían propietario no se mezclan con las sin inmueble', async () => {
    vi.mocked(contractsApi.migracion.resolverMasivo).mockResolvedValue(
      resultadoVacio({
        pedidas: 4,
        aplicadas: 1,
        omitidas: [
          { id: 'f-2', fila: 5, motivo: 'Sin inmueble: la consignación es del inmueble.' },
          { id: 'f-3', fila: 6, motivo: 'Ya tiene propietario: en un contrato activado se corrige desde el inmueble.' },
          { id: 'f-4', fila: 7, motivo: 'Ya tiene propietario: en un contrato activado se corrige desde el inmueble.' },
        ],
      }),
    )

    render({
      ids: ['f-1', 'f-2', 'f-3', 'f-4'],
      seleccionadas: [fila({ id: 'f-1' }), fila({ id: 'f-2', propertyId: null, fila: 5 })],
      onListo: vi.fn(),
    })
    await elegirYCompletarPropietario()

    await act(async () => {
      boton('Aplicar a 4')?.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    const lineas = Array.from(container.querySelectorAll('[data-testid="omitidas-masivo"]')).map((e) => e.textContent)
    expect(lineas).toEqual([
      '1 fila — Sin inmueble: la consignación es del inmueble.',
      '2 filas — Ya tiene propietario: en un contrato activado se corrige desde el inmueble.',
    ])
  })

  it('sin omitidas en la respuesta, no renderiza esa línea', async () => {
    vi.mocked(contractsApi.migracion.resolverMasivo).mockResolvedValue(
      resultadoVacio({ pedidas: 1, aplicadas: 1 }),
    )

    render({ ids: ['f-1'], seleccionadas: [fila()], onListo: vi.fn() })
    await elegirYCompletarPropietario()

    await act(async () => {
      boton('Aplicar a 1')?.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    const resultado = container.querySelector('[data-testid="resultado-masivo"]')
    expect(resultado?.textContent).not.toContain('sin inmueble')
  })
})

describe('<ResolucionMasiva> — progreso visible (§3.2.G2)', () => {
  it('mientras corre, muestra cuántas tandas ya se aplicaron', async () => {
    const ids = Array.from({ length: 200 }, (_, i) => `f-${i}`)
    let resolverPrimerTrozo!: (v: ResultadoMasivo) => void
    const primerTrozo = new Promise<ResultadoMasivo>((resolve) => {
      resolverPrimerTrozo = resolve
    })
    vi.mocked(contractsApi.migracion.resolverMasivo)
      .mockImplementationOnce(async () => primerTrozo)
      .mockResolvedValueOnce(resultadoVacio({ pedidas: 100, aplicadas: 100 }))

    render({ ids, seleccionadas: [fila()], onListo: vi.fn() })
    await elegirYCompletarPropietario()

    act(() => {
      boton(`Aplicar a ${ids.length}`)?.click()
    })
    await esperar()

    // Primera tanda todavía en vuelo: nada aplicado todavía.
    expect(container.textContent).toMatch(/0\s*\/\s*200/)

    await act(async () => {
      resolverPrimerTrozo(resultadoVacio({ pedidas: 100, aplicadas: 100 }))
      for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r, 0))
    })

    // Terminó: la segunda tanda ya se resolvió y el progreso da paso al
    // resultado final.
    expect(container.textContent).toContain('200 de 200 resueltas.')
  })
})

/*
 * Sistema de errores (02-10-2026): un 400 con `campos` del back
 * (`ResolverMasivoDto.propietario.<campo>`) va debajo de SU campo y le da el
 * foco; la comisión se ataja en el cliente con la regla del back (0–100); un
 * 5xx sale «de nuestro lado» con la referencia.
 */
describe('<ResolucionMasiva> — el error en su lugar', () => {
  const ids = ['f-1', 'f-2']

  async function aplicar() {
    await act(async () => {
      boton(`Aplicar a ${ids.length}`)?.click()
      for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0))
    })
  }

  it('🔴 un 400 en propietario.documento va debajo del documento, con foco', async () => {
    const { ApiError } = await import('@/lib/api/client')
    vi.mocked(contractsApi.migracion.resolverMasivo).mockRejectedValue(
      new ApiError(400, ['El documento no es válido.'], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: ['El documento no es válido.'],
        campos: [{ campo: 'propietario.documento', regla: 'formato', mensaje: 'El documento no es válido.' }],
      }),
    )
    render({ ids, seleccionadas: [fila()], onListo: vi.fn() })
    await elegirYCompletarPropietario()
    await aplicar()

    const input = document.getElementById('masiva-documento') as HTMLInputElement
    expect(document.getElementById('masiva-documento-error')?.textContent).toBe('El documento no es válido.')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(input)
    // El aviso dice hasta dónde llegó, sin repetir lo que ya está en el campo.
    const aviso = container.querySelector('[data-testid="error-masivo"]')?.textContent ?? ''
    expect(aviso).toContain('Revisa lo marcado arriba')
    expect(aviso).not.toContain('El documento no es válido.')
  })

  it('una comisión de 150 % se ataja con la frase, sin mandar nada', async () => {
    vi.mocked(contractsApi.migracion.resolverMasivo).mockClear()
    render({ ids, seleccionadas: [fila()], onListo: vi.fn() })
    await elegirYCompletarPropietario()
    const comision = document.getElementById('masiva-comisionPorcentaje') as HTMLInputElement
    act(() => {
      setNativeValue(comision, '150')
    })
    await aplicar()
    expect(contractsApi.migracion.resolverMasivo).not.toHaveBeenCalled()
    expect(document.getElementById('masiva-comisionPorcentaje-error')?.textContent).toBe(
      'La comisión va de 0 a 100 %.',
    )
  })

  it('🔴 un 5xx: de nuestro lado, con la referencia, sin «conexión»', async () => {
    const { ApiError } = await import('@/lib/api/client')
    vi.mocked(contractsApi.migracion.resolverMasivo).mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor.',
        referencia: 'ab12cd34',
      }),
    )
    render({ ids, seleccionadas: [fila()], onListo: vi.fn() })
    await elegirYCompletarPropietario()
    await aplicar()
    const aviso = container.querySelector('[data-testid="error-masivo"]')?.textContent ?? ''
    expect(aviso).toContain('No pudimos aplicar el cambio: algo falló de nuestro lado')
    expect(aviso).toContain('ab12cd34')
    expect(aviso).not.toMatch(/conexi[oó]n/)
  })

  it('sin respuesta: la conexión', async () => {
    vi.mocked(contractsApi.migracion.resolverMasivo).mockRejectedValue(new TypeError('Failed to fetch'))
    render({ ids, seleccionadas: [fila()], onListo: vi.fn() })
    await elegirYCompletarPropietario()
    await aplicar()
    expect(container.querySelector('[data-testid="error-masivo"]')?.textContent).toMatch(/conexión/)
  })
})
