/**
 * El informe por origen en pantalla.
 *
 * Lo que fija este test es lo que decide una cancelación de cuenta:
 *   · la columna que se lee primero es «arriendos cerrados», no «leads»;
 *   · un portal configurado que no trajo NADA sale en cero, con su etiqueta, y
 *     no desaparece;
 *   · la lectura en palabras señala el portal que no cerró nada, que es el que
 *     hay que mirar antes de renovar;
 *   · un 503 se avisa como «todavía no está disponible», no como un error que falta, NO como un
 *     error con botón de reintentar.
 *
 * Se monta con `createRoot` + `act` (el repo no tiene testing-library).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { ApiError } from '@/lib/api/client'

const { api } = vi.hoisted(() => ({
  api: {
    informe: (() => Promise.resolve(null)) as () => Promise<unknown>,
    configuracion: (() => Promise.resolve(null)) as () => Promise<unknown>,
    guardar: (async () => undefined) as (cuerpo: unknown) => Promise<unknown>,
  },
}))

vi.mock('@/lib/api/crm.service', async () => {
  const real =
    await vi.importActual<typeof import('@/lib/api/crm.service')>(
      '@/lib/api/crm.service',
    )
  return {
    ...real,
    leadsApi: {
      informePorOrigen: () => api.informe(),
      configuracion: () => api.configuracion(),
      guardarConfiguracion: (cuerpo: unknown) => api.guardar(cuerpo),
    },
  }
})

import { OrigenesClient } from './OrigenesClient'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const INFORME = {
  disponible: true,
  motivo: null,
  renglones: [
    {
      origen: 'FINCARAIZ',
      nombre: 'Fincaraíz',
      leads: 5,
      abiertos: 2,
      cerrados: 2,
      perdidos: 1,
      conversion: 40,
    },
    {
      origen: 'METROCUADRADO',
      nombre: 'Metrocuadrado',
      leads: 4,
      abiertos: 1,
      cerrados: 0,
      perdidos: 3,
      conversion: 0,
    },
    {
      origen: 'MERCADO_LIBRE',
      nombre: 'Mercado Libre',
      leads: 0,
      abiertos: 0,
      cerrados: 0,
      perdidos: 0,
      conversion: 0,
    },
  ],
  totales: {
    leads: 9,
    abiertos: 3,
    cerrados: 2,
    perdidos: 4,
    conversion: 22.22,
  },
}

const CONFIG = {
  disponible: true,
  motivo: null,
  horasParaResponderLead: 24,
  origenesDeLead: ['FINCARAIZ', 'METROCUADRADO', 'MERCADO_LIBRE'],
  minimoDeFotosParaPublicar: null,
  margenDeBajaDePrecioPct: null,
  horasDeAvisoAlInquilino: null,
  diasParaFirmarElContrato: null,
  pesosDelMatching: null,
}

let root: Root | null = null
let contenedor: HTMLDivElement

async function pintar() {
  await act(async () => {
    root!.render(<OrigenesClient />)
  })
}

const $ = (sel: string) => contenedor.querySelector(sel)

beforeEach(() => {
  api.informe = vi.fn(() => Promise.resolve(INFORME))
  api.configuracion = vi.fn(() => Promise.resolve(CONFIG))
  api.guardar = vi.fn(async () => undefined)
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(async () => {
  await act(async () => {
    root!.unmount()
  })
  root = null
  contenedor.remove()
})

describe('OrigenesClient', () => {
  it('🔴 «Arriendos cerrados» va antes que «Leads»: es la columna que decide', async () => {
    await pintar()
    const encabezados = Array.from(
      contenedor.querySelectorAll('[data-testid="tabla-por-origen"] thead th'),
    ).map((th) => th.textContent?.trim())
    expect(encabezados[0]).toBe('Origen')
    expect(encabezados[1]).toBe('Arriendos cerrados')
    expect(encabezados[2]).toBe('Leads')
  })

  it('🔴 un portal que no trajo nada sale en CERO, con su etiqueta', async () => {
    await pintar()
    const fila = $('[data-testid="fila-MERCADO_LIBRE"]')
    expect(fila?.textContent).toContain('Mercado Libre')
    expect(fila?.textContent).toContain('sin leads')
  })

  it('la lectura señala el portal que no cerró nada', async () => {
    await pintar()
    const lectura = $('[data-testid="lectura"]')?.textContent ?? ''
    expect(lectura).toContain('Fincaraíz')
    expect(lectura).toContain('Metrocuadrado')
    expect(lectura).toContain('antes de renovar')
  })

  it('los totales salen del back, no se recalculan en pantalla', async () => {
    await pintar()
    expect($('[data-testid="fila-totales"]')?.textContent).toContain('22.22 %')
  })

  it('🔴 un 503 se avisa como «todavía no está disponible», no como un error', async () => {
    api.informe = vi.fn(() =>
      Promise.reject(
        new ApiError(503, [
          'Todavía no se puede usar esta parte del CRM en esta base: falta aplicar la migración 20260918160000_leads_contacto_origen_y_asignacion.',
        ]),
      ),
    )
    await pintar()
    const aviso = $('[data-testid="informe-no-habilitado"]')?.textContent ?? ''
    expect(aviso).toContain('todavía no está disponible')
    // 🔴 El identificador de la migración es para quien despliega.
    expect(aviso).not.toContain('20260918160000')
    expect(aviso).toContain('todavía no está disponible')
    expect($('[data-testid="tabla-por-origen"]')).toBeNull()
  })

  it('el plazo de respuesta se muestra con su consecuencia', async () => {
    await pintar()
    expect(contenedor.textContent).toContain('24 horas')
    expect(contenedor.textContent).toContain('pasa al siguiente asesor del turno')
  })

  it('🔴 un fallo de verdad (500) SÍ ofrece reintentar, y no dice «próximamente»', async () => {
    api.informe = vi.fn(() => Promise.reject(new ApiError(500, 'boom')))
    await pintar()
    expect($('[data-testid="informe-no-habilitado"]')).toBeNull()
    expect(contenedor.textContent).not.toContain('Próximamente: ')
  })
})

/**
 * 02-10-2026 · Guardar el plazo: antes no había `catch` (un 400 o un 500
 * dejaban la pantalla callada, como si se hubiera guardado).
 */
async function escribirHoras(valor: string) {
  const input = contenedor.querySelector<HTMLInputElement>('#horas-lead')!
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function guardar() {
  await act(async () => {
    contenedor.querySelector<HTMLButtonElement>('[data-testid="guardar-horas-lead"]')!.click()
  })
}

const RANGO = 'El plazo para responder va de 1 a 720 horas.'

describe('OrigenesClient — guardar el plazo, con su error en su campo', () => {
  it('🔴 fuera de 1–720 lo dice antes de mandar, con la frase del back, y no guarda', async () => {
    await pintar()
    await escribirHoras('900')
    expect($('#horas-lead-error')?.textContent).toBe(RANGO)
    expect(contenedor.querySelector<HTMLButtonElement>('[data-testid="guardar-horas-lead"]')!.disabled).toBe(true)
    expect(api.guardar).not.toHaveBeenCalled()
  })

  it('🔴 un 400 con campos pinta la frase bajo el campo y le da el foco', async () => {
    api.guardar = vi.fn(() =>
      Promise.reject(
        new ApiError(400, [RANGO], 'DATOS_INVALIDOS', {
          statusCode: 400,
          code: 'DATOS_INVALIDOS',
          message: [RANGO],
          campos: [{ campo: 'horasParaResponderLead', regla: 'maximo', mensaje: RANGO }],
        }),
      ),
    )
    await pintar()
    await escribirHoras('48')
    await guardar()
    const input = contenedor.querySelector<HTMLInputElement>('#horas-lead')!
    expect($('#horas-lead-error')?.textContent).toBe(RANGO)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(input)
  })

  it('🔴 un 5xx dice que es nuestro, con la referencia', async () => {
    api.guardar = vi.fn(() =>
      Promise.reject(
        new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
          statusCode: 500,
          code: 'ERROR_INTERNO',
          message: 'Error interno del servidor',
          referencia: '0a1b2c3d',
        }),
      ),
    )
    await pintar()
    await escribirHoras('48')
    await guardar()
    const texto = $('#horas-lead-error')?.textContent ?? ''
    expect(texto).toContain('de nuestro lado')
    expect(texto).toContain('0a1b2c3d')
  })

  it('🔴 sin respuesta (status 0), la conexión', async () => {
    api.guardar = vi.fn(() => Promise.reject(new ApiError(0, 'Failed to fetch')))
    await pintar()
    await escribirHoras('48')
    await guardar()
    expect($('#horas-lead-error')?.textContent?.toLowerCase()).toContain('conexión')
  })

  it('un plazo válido se manda como número', async () => {
    await pintar()
    await escribirHoras('48')
    await guardar()
    expect(api.guardar).toHaveBeenCalledWith({ horasParaResponderLead: 48 })
  })
})
