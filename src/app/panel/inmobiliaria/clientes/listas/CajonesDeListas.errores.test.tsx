/**
 * Sistema de errores, tanda 2 (02-10-2026) — los dos cajones de las listas
 * restrictivas.
 *
 * Lo que fija:
 *   · el espejo de los topes del back se ataja ANTES de mandar, en su campo y
 *     con el foco ahí (la fecha «vigente desde», los nombres y documentos más
 *     largos que su columna, el motivo de la revisión de menos de 5 letras);
 *   · un 400 con `campos` pinta el error debajo de su campo y le da el foco;
 *   · un 5xx dice «de nuestro lado» con la referencia, sin hablar de conexión;
 *   · sin respuesta (status 0) sí se habla de la conexión.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  cargarLista: vi.fn(),
  revisarConsulta: vi.fn(),
  filasDelArchivo: [] as Array<Record<string, string>>,
}))

vi.mock('@/components/ui/toast', () => ({ toast: h.toast }))
vi.mock('@/lib/api/crm.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/crm.service')>()),
  captacionApi: { cargarLista: h.cargarLista, revisarConsulta: h.revisarConsulta },
}))
// El lector del CSV real necesita `Blob.stream()`; acá se le da el archivo ya
// partido: encabezados y un solo lote.
vi.mock('@/lib/migracion/csv-en-trozos', () => ({
  leerCsvEnTrozos: async (
    _archivo: Blob,
    o: {
      onEncabezados?: (e: string[]) => void
      onLote: (l: Array<Record<string, string>>) => Promise<void> | void
    },
  ) => {
    o.onEncabezados?.(['SDN_Name', 'Documento', 'Remarks'])
    await o.onLote(h.filasDelArchivo)
    return { filas: h.filasDelArchivo.length }
  },
}))
vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ stop: vi.fn(), start: vi.fn() }),
}))

import { ApiError } from '@/lib/api/client'
import { CajonDeLaLista } from './CajonDeLaLista'
import { CajonDeLaConsulta } from './CajonDeLaConsulta'
import { MENSAJES_DE_LA_CAPTACION } from '@/lib/captacion/limites-de-la-captacion'

function errorDelBack(status: number, cuerpo: Record<string, unknown>) {
  return new ApiError(status, cuerpo.message as string | string[], cuerpo.code as string, cuerpo)
}

let contenedor: HTMLDivElement
let raiz: Root

beforeEach(() => {
  vi.clearAllMocks()
  h.filasDelArchivo = [{ SDN_Name: 'JUAN PEREZ', Documento: '123', Remarks: 'SDGT' }]
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})

afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

const $ = <T extends Element = HTMLElement>(sel: string) => document.body.querySelector<T>(sel)

function escribir(input: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!
  act(() => {
    setter.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function clic(el: Element | null) {
  await act(async () => {
    el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

// ── Cargar una lista ────────────────────────────────────────────────────────

async function abrirLaLista() {
  await act(async () => {
    raiz.render(<CajonDeLaLista abierto onOpenChange={() => {}} onCargada={() => {}} />)
  })
}

async function elegirElArchivo() {
  const input = $<HTMLInputElement>('[data-testid="lista-archivo"]')!
  const archivo = new File(['x'], 'sdn.csv', { type: 'text/csv' })
  Object.defineProperty(input, 'files', { value: [archivo], configurable: true })
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await Promise.resolve()
  })
}

describe('<CajonDeLaLista> — los errores en su campo', () => {
  it('🔴 «vigente desde» vacía no viaja: error debajo de la fecha, con el foco', async () => {
    await abrirLaLista()
    await elegirElArchivo()
    escribir($<HTMLInputElement>('[data-testid="lista-vigente"]')!, '')
    await clic($('[data-testid="lista-cargar"]'))

    expect(h.cargarLista).not.toHaveBeenCalled()
    expect($('#lista-vigente-error')?.textContent).toBe(MENSAJES_DE_LA_CAPTACION.vigenteDesdeNoEsUnDia)
    const fecha = $<HTMLInputElement>('[data-testid="lista-vigente"]')!
    expect(fecha.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(fecha)
  })

  it('🔴 un nombre más largo que su columna (300) frena la carga y dice en qué fila', async () => {
    h.filasDelArchivo = [
      { SDN_Name: 'ANA', Documento: '', Remarks: '' },
      { SDN_Name: 'X'.repeat(301), Documento: '', Remarks: '' },
    ]
    await abrirLaLista()
    await elegirElArchivo()

    expect($('#lista-archivo-error')?.textContent).toContain('más de 300 caracteres (desde la fila 2)')
    expect($<HTMLButtonElement>('[data-testid="lista-cargar"]')!.disabled).toBe(true)
  })

  it('un detalle de más de 500 se recorta y se dice; la lista entra igual', async () => {
    h.filasDelArchivo = [{ SDN_Name: 'ANA', Documento: '', Remarks: 'r'.repeat(900) }]
    h.cargarLista.mockResolvedValue({
      lista: { id: 'l', lista: 'OFAC', filas: 1 },
      revisados: { revisados: 0, bloqueados: 0, liberados: 0 },
    })
    await abrirLaLista()
    await elegirElArchivo()

    expect($('[data-testid="lista-detalles-recortados"]')?.textContent).toContain('se recortó')
    await clic($('[data-testid="lista-cargar"]'))
    const enviadas = h.cargarLista.mock.calls[0][0].filas as Array<{ detalle?: string }>
    expect(enviadas[0].detalle).toHaveLength(500)
  })

  it('🔴 un 400 en «vigenteDesde» va debajo de la fecha y no al toast', async () => {
    h.cargarLista.mockRejectedValue(
      errorDelBack(400, {
        code: 'DATOS_INVALIDOS',
        message: ['La fecha «vigente desde» debe estar entre el año 1950 y el 2100.'],
        campos: [
          {
            campo: 'vigenteDesde',
            regla: 'fecha',
            mensaje: 'La fecha «vigente desde» debe estar entre el año 1950 y el 2100.',
          },
        ],
      }),
    )
    await abrirLaLista()
    await elegirElArchivo()
    await clic($('[data-testid="lista-cargar"]'))

    expect($('#lista-vigente-error')?.textContent).toContain('entre el año 1950 y el 2100')
    expect(document.activeElement).toBe($('[data-testid="lista-vigente"]'))
    expect(h.toast.error).not.toHaveBeenCalled()
  })

  it('un 400 de una fila (`filas.3.documento`) va al campo del archivo', async () => {
    h.cargarLista.mockRejectedValue(
      errorDelBack(400, {
        code: 'DATOS_INVALIDOS',
        message: ['El documento puede tener hasta 40 caracteres.'],
        campos: [
          { campo: 'filas.3.documento', regla: 'longitud_maxima', mensaje: 'El documento puede tener hasta 40 caracteres.' },
        ],
      }),
    )
    await abrirLaLista()
    await elegirElArchivo()
    await clic($('[data-testid="lista-cargar"]'))

    expect($('#lista-archivo-error')?.textContent).toBe('El documento puede tener hasta 40 caracteres.')
  })

  it('🔴 un 5xx dice «de nuestro lado» con la referencia y no culpa a la conexión', async () => {
    h.cargarLista.mockRejectedValue(
      errorDelBack(500, { code: 'ERROR_INTERNO', message: 'Error interno del servidor.', referencia: 'ab12cd34' }),
    )
    await abrirLaLista()
    await elegirElArchivo()
    await clic($('[data-testid="lista-cargar"]'))

    const dicho = String(h.toast.error.mock.calls[0][0])
    expect(dicho).toMatch(/de nuestro lado/)
    expect(dicho).toContain('ab12cd34')
    expect(dicho).not.toMatch(/conexi[oó]n/)
  })

  it('sin respuesta (status 0) sí habla de la conexión', async () => {
    h.cargarLista.mockRejectedValue(new TypeError('Failed to fetch'))
    await abrirLaLista()
    await elegirElArchivo()
    await clic($('[data-testid="lista-cargar"]'))

    expect(String(h.toast.error.mock.calls[0][0])).toMatch(/conexión/)
  })
})

// ── Revisar una consulta ────────────────────────────────────────────────────

const BLOQUEADA = {
  id: 'c-2',
  terceroTipo: 'PROPIETARIO',
  nombre: 'Juan Pérez',
  documento: '1017234567',
  proveedor: 'LISTAS_CARGADAS',
  resultado: 'COINCIDENCIA' as const,
  estado: 'BLOQUEADO' as const,
  coincidencias: [{ lista: 'OFAC', nombreEnLaLista: 'J PEREZ', parecido: 90 }],
  motivoDeLaRevision: null,
  createdAt: '2026-09-18T10:00:00.000Z',
}

async function abrirLaConsulta() {
  await act(async () => {
    raiz.render(
      <CajonDeLaConsulta
        consulta={BLOQUEADA}
        onCerrar={() => {}}
        onRevisada={() => {}}
        puedeRevisar
        rotulo={{ texto: 'Bloqueado', variant: 'destructive' }}
        porque="Coincide con una lista."
      />,
    )
  })
}

describe('<CajonDeLaConsulta> — el motivo de la revisión', () => {
  it('🔴 «Ok» no viaja: el mínimo del back (5) se dice debajo del motivo, con el foco', async () => {
    await abrirLaConsulta()
    const motivo = $<HTMLTextAreaElement>('[data-testid="motivo-de-la-revision"]')!
    escribir(motivo, 'Ok')
    await clic($('[data-testid="liberar-consulta"]'))

    expect(h.revisarConsulta).not.toHaveBeenCalled()
    expect($('#motivo-de-la-revision-error')?.textContent).toBe(MENSAJES_DE_LA_CAPTACION.motivoCorto)
    expect(motivo.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(motivo)
  })

  it('el tope del campo es el del back (2.000), no 500', async () => {
    await abrirLaConsulta()
    expect($<HTMLTextAreaElement>('[data-testid="motivo-de-la-revision"]')!.maxLength).toBe(2000)
  })

  it('🔴 un 400 en «motivo» va debajo del campo, sin toast', async () => {
    h.revisarConsulta.mockRejectedValue(
      errorDelBack(400, {
        code: 'DATOS_INVALIDOS',
        message: [MENSAJES_DE_LA_CAPTACION.motivoCorto],
        campos: [{ campo: 'motivo', regla: 'longitud_minima', mensaje: MENSAJES_DE_LA_CAPTACION.motivoCorto }],
      }),
    )
    await abrirLaConsulta()
    escribir($<HTMLTextAreaElement>('[data-testid="motivo-de-la-revision"]')!, 'Es un homónimo.')
    await clic($('[data-testid="liberar-consulta"]'))

    expect($('#motivo-de-la-revision-error')?.textContent).toBe(MENSAJES_DE_LA_CAPTACION.motivoCorto)
    expect(document.activeElement).toBe($('[data-testid="motivo-de-la-revision"]'))
    expect(h.toast.error).not.toHaveBeenCalled()
  })

  it('un 5xx dice «de nuestro lado» con la referencia', async () => {
    h.revisarConsulta.mockRejectedValue(
      errorDelBack(500, { code: 'ERROR_INTERNO', message: 'Internal server error', referencia: 'cafe0001' }),
    )
    await abrirLaConsulta()
    escribir($<HTMLTextAreaElement>('[data-testid="motivo-de-la-revision"]')!, 'Es un homónimo.')
    await clic($('[data-testid="liberar-consulta"]'))

    const dicho = String(h.toast.error.mock.calls[0][0])
    expect(dicho).toMatch(/de nuestro lado/)
    expect(dicho).toContain('cafe0001')
    expect(dicho).not.toMatch(/conexi[oó]n/)
  })

  it('sin respuesta (status 0) habla de la conexión', async () => {
    h.revisarConsulta.mockRejectedValue(new TypeError('Failed to fetch'))
    await abrirLaConsulta()
    escribir($<HTMLTextAreaElement>('[data-testid="motivo-de-la-revision"]')!, 'Es un homónimo.')
    await clic($('[data-testid="confirmar-en-lista"]'))

    expect(String(h.toast.error.mock.calls[0][0])).toMatch(/conexión/)
  })
})
