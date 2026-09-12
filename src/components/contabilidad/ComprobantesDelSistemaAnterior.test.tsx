/**
 * Los comprobantes del sistema anterior, en pestañas, en la ficha del
 * contrato y en la del inmueble.
 *
 * Lo que este test cuida es que la sección no AFIRME nada que no verificó:
 *
 *  · El número de cada pestaña es el del back (`porClase`), no el largo de
 *    la lista: con el tope de 500 de por medio, contar filas diría 500.
 *  · Una pestaña en cero lo dice sin inventar — y sin pedirla.
 *  · «Otros» sólo existe cuando hay algo que no es ingreso, egreso ni
 *    factura: esconder esas filas sería que las pestañas sumen menos que el
 *    total.
 *  · Un fallo no se pinta como «no tiene comprobantes». Son dos cosas
 *    distintas y la segunda es una mentira dicha con confianza.
 *  · El tope sale del dato del back (`total` vs `mostrados`), por pestaña.
 *  · Un monto que no se pudo leer (`null`) se muestra como «—», nunca como
 *    «$ 0» — que es lo que devuelve `formatCurrency(null)`.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/contabilidad.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  )
  return {
    CLASES_DE_COMPROBANTE: real.CLASES_DE_COMPROBANTE,
    contabilidadApi: {
      migracion: { documentos: { porContrato: vi.fn(), porInmueble: vi.fn() } },
    },
  }
})
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) =>
    React.createElement('a', { href, ...rest }, children),
}))

import {
  contabilidadApi,
  type ClaseDeComprobante,
  type ConteoPorClase,
  type DocumentoMigradoVista,
  type HistoriaDeComprobantes,
} from '@/lib/api/contabilidad.service'
import { ComprobantesDelSistemaAnterior } from './ComprobantesDelSistemaAnterior'

const porContrato = contabilidadApi.migracion.documentos
  .porContrato as unknown as ReturnType<typeof vi.fn>
const porInmueble = contabilidadApi.migracion.documentos
  .porInmueble as unknown as ReturnType<typeof vi.fn>

function comprobante(over: Partial<DocumentoMigradoVista> = {}): DocumentoMigradoVista {
  return {
    id: 'doc-1',
    prefijo: 'CI',
    consecutivo: 26766,
    tipo: 'Comprobante de Ingreso',
    fecha: '2024-09-05',
    concepto: 'INGRESO - CANON SEPTIEMBRE REF 901780503',
    debitos: 1_008_403,
    creditos: 1_008_403,
    balance: 0,
    descuadrado: false,
    anulado: false,
    esAnticipo: false,
    terceroAnticipo: null,
    anticipoAplicado: false,
    valorRestanteAnticipo: null,
    creadoPor: 'ALEXANDER LOPEZ',
    fechaCreacionOrigen: '2024-09-05T10:00:00.000Z',
    terceroDocumento: '901780503',
    terceroNombre: 'CONSTRUCTORA DEL VALLE S.A.S',
    contractId: 'c-1',
    propertyId: 'p-1',
    asociadoPor: 'documento',
    clase: 'ingreso',
    ...over,
  }
}

const egreso = (over: Partial<DocumentoMigradoVista> = {}) =>
  comprobante({
    id: 'doc-e',
    prefijo: 'CE',
    consecutivo: 501,
    tipo: 'Comprobante de Egreso',
    concepto: 'EGRESO POR PAGO A CONSTRUCTORA DEL VALLE',
    clase: 'egreso',
    ...over,
  })

/** La respuesta de UNA pestaña. `porClase` es el número que pinta cada una. */
// 🔴 `Omit<…, 'porClase'>` y no una intersección a secas: `Partial<Historia…>`
// ya trae `porClase?: ConteoPorClase`, y cruzarlo con `Partial<ConteoPorClase>`
// da `ConteoPorClase & Partial<ConteoPorClase>` — que EXIGE las cuatro clases.
// Así los casos de abajo pueden pasar sólo las que les importan.
function respuesta(
  over: Omit<Partial<HistoriaDeComprobantes>, 'porClase'> & {
    porClase?: Partial<ConteoPorClase>
  } = {},
): HistoriaDeComprobantes {
  const documentos = over.documentos ?? [comprobante()]
  const clase: ClaseDeComprobante | 'todas' = over.clase ?? 'ingreso'
  const porClase: ConteoPorClase = {
    ingreso: clase === 'ingreso' ? documentos.length : 0,
    egreso: 0,
    factura: 0,
    otro: 0,
    ...over.porClase,
  }
  return {
    contractId: 'c-1',
    total: documentos.length,
    mostrados: documentos.length,
    tope: 500,
    ...over,
    clase,
    porClase,
    documentos,
  }
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  porContrato.mockReset()
  porInmueble.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function montar(props: { contractId: string } | { propertyId: string } = { contractId: 'c-1' }) {
  await act(async () => {
    root.render(<ComprobantesDelSistemaAnterior {...props} />)
    await new Promise((r) => setTimeout(r, 20))
  })
}

/** Radix Tabs cambia de pestaña en `mousedown`, no en `click`. */
async function activarPestana(clase: ClaseDeComprobante) {
  const el = container.querySelector(`[data-testid="pestana-${clase}"]`) as HTMLElement | null
  expect(el, `la pestaña ${clase} tendría que estar`).toBeTruthy()
  await act(async () => {
    el!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    el!.click()
    await new Promise((r) => setTimeout(r, 20))
  })
}

const texto = () =>
  container.querySelector('[data-testid="comprobantes-del-sistema-anterior"]')?.textContent ?? ''
const pestana = (clase: ClaseDeComprobante) =>
  container.querySelector(`[data-testid="pestana-${clase}"]`)
/** El número que pinta la pestaña, en su píldora. */
const conteo = (clase: ClaseDeComprobante) =>
  container.querySelector(`[data-testid="conteo-${clase}"]`)?.textContent ?? null
const filas = () => container.querySelectorAll('[data-testid="comprobante-migrado"]')

describe('<ComprobantesDelSistemaAnterior>', () => {
  it('pide los ingresos de ESE contrato primero y cada pestaña dice cuántos hay', async () => {
    porContrato.mockResolvedValue(respuesta({ porClase: { ingreso: 1, egreso: 2, factura: 0 } }))
    await montar()

    expect(porContrato).toHaveBeenCalledWith('c-1', 'ingreso')
    expect(filas()).toHaveLength(1)
    // El número de la pestaña es el del back, no el largo de la lista.
    expect(pestana('ingreso')?.textContent).toContain('Ingresos')
    expect(conteo('ingreso')).toBe('1')
    expect(conteo('egreso')).toBe('2')
    expect(conteo('factura')).toBe('0')
    // El total de la cabecera es la suma de las pestañas: 3, no 1.
    expect(
      container.querySelector('[data-testid="comprobantes-total"]')?.textContent,
    ).toBe('3')
    const t = texto()
    expect(t).toContain('Comprobante de Ingreso')
    expect(t).toContain('CI-26766')
    expect(t).toContain('CANON SEPTIEMBRE')
    expect(t).toContain('1.008.403')
  })

  it('«Otros» sólo aparece cuando hay algo que no es ingreso, egreso ni factura', async () => {
    porContrato.mockResolvedValue(respuesta())
    await montar()
    expect(pestana('otro')).toBeNull()

    act(() => root.unmount())
    root = createRoot(container)
    porContrato.mockResolvedValue(respuesta({ porClase: { otro: 4 } }))
    await montar()
    expect(pestana('otro')?.textContent).toContain('Otros')
    expect(conteo('otro')).toBe('4')
  })

  it('una pestaña en cero lo dice sin inventar, y sin pedirla', async () => {
    porContrato.mockResolvedValue(respuesta({ porClase: { ingreso: 1, factura: 0 } }))
    await montar()

    await activarPestana('factura')

    expect(container.querySelector('[data-testid="sin-datos"]')).toBeTruthy()
    expect(texto()).toContain('Sin facturas del sistema anterior')
    expect(filas()).toHaveLength(0)
    // Ya se sabía que estaba vacía: pedirla sería una petición que vuelve vacía.
    expect(porContrato).toHaveBeenCalledTimes(1)
  })

  it('cambiar de pestaña pide ESA pestaña, y volver no la vuelve a pedir', async () => {
    porContrato.mockImplementation(async (_id: string, clase: ClaseDeComprobante) =>
      clase === 'egreso'
        ? respuesta({ clase: 'egreso', documentos: [egreso()], porClase: { ingreso: 1, egreso: 1 } })
        : respuesta({ porClase: { ingreso: 1, egreso: 1 } }),
    )
    await montar()

    await activarPestana('egreso')
    expect(porContrato).toHaveBeenCalledWith('c-1', 'egreso')
    expect(filas()).toHaveLength(1)
    expect(texto()).toContain('CE-501')
    expect(texto()).not.toContain('CI-26766')

    await activarPestana('ingreso')
    expect(texto()).toContain('CI-26766')
    expect(porContrato).toHaveBeenCalledTimes(2)
  })

  /*
   * Abrir la ficha sobre «Sin ingresos» cuando hay 300 egresos es abrir sobre
   * un «no hay nada» que no es verdad. La primera respuesta elige la pestaña.
   */
  it('si los ingresos están en cero, arranca en la primera pestaña con algo', async () => {
    porContrato.mockImplementation(async (_id: string, clase: ClaseDeComprobante) =>
      clase === 'egreso'
        ? respuesta({ clase: 'egreso', documentos: [egreso()], porClase: { ingreso: 0, egreso: 1 } })
        : respuesta({ documentos: [], total: 0, mostrados: 0, porClase: { ingreso: 0, egreso: 1 } }),
    )
    await montar()

    expect(porContrato).toHaveBeenCalledWith('c-1', 'egreso')
    expect(pestana('egreso')?.getAttribute('data-state')).toBe('active')
    expect(texto()).toContain('CE-501')
  })

  it('sin comprobantes en ninguna pestaña lo dice, sin pestañas y no como un error', async () => {
    porContrato.mockResolvedValue(respuesta({ documentos: [], total: 0, mostrados: 0 }))
    await montar()

    expect(container.querySelector('[data-testid="sin-datos"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).toBeNull()
    expect(pestana('ingreso')).toBeNull()
    expect(container.querySelector('[data-testid="comprobantes-total"]')).toBeNull()
    expect(texto()).toContain('Sin comprobantes del sistema anterior')
    // No hay una segunda petición «por si acaso»: ya se sabe que no hay nada.
    expect(porContrato).toHaveBeenCalledTimes(1)
  })

  /*
   * 🔴 La falla que este test existe para impedir: `catch` → «este contrato
   * no tiene comprobantes» sobre una petición que murió.
   */
  it('un fallo se dice como fallo, nunca como «no tiene comprobantes»', async () => {
    porContrato.mockRejectedValue(new Error('boom'))
    await montar()

    expect(container.querySelector('[data-testid="fallo-de-carga"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="sin-datos"]')).toBeNull()
    expect(texto()).not.toContain('Sin comprobantes del sistema anterior')
    // Y no se reintenta solo: contra un back caído sería un bucle.
    expect(porContrato).toHaveBeenCalledTimes(1)
  })

  it('el botón de reintentar vuelve a pedirlos', async () => {
    porContrato.mockRejectedValue(new Error('boom'))
    await montar()

    porContrato.mockResolvedValue(respuesta())
    const reintentar = container.querySelector<HTMLButtonElement>('[data-testid="reintentar"]')
    expect(reintentar).toBeTruthy()
    await act(async () => {
      reintentar?.click()
      await new Promise((r) => setTimeout(r, 600))
    })

    expect(porContrato).toHaveBeenCalledTimes(2)
    expect(filas()).toHaveLength(1)
  })

  /*
   * El back devuelve los más recientes hasta su tope, POR pestaña. Dibujar
   * esas filas sin decir cuántas quedaron afuera afirma que son todas.
   */
  it('cuando el back recorta, lo dice con los dos números', async () => {
    porContrato.mockResolvedValue(
      respuesta({
        documentos: [comprobante(), comprobante({ id: 'doc-2', consecutivo: 26767 })],
        total: 1842,
        mostrados: 2,
        porClase: { ingreso: 1842 },
      }),
    )
    await montar()

    const aviso =
      container.querySelector('[data-testid="comprobantes-recortados"]')?.textContent ?? ''
    expect(aviso).toContain('2')
    expect(aviso).toContain('1.842')
    // La pestaña dice los 1.842 que HAY, no los 500 que caben.
    expect(conteo('ingreso')).toBe('1.842')
  })

  it('sin recorte no inventa el aviso', async () => {
    porContrato.mockResolvedValue(respuesta())
    await montar()
    expect(container.querySelector('[data-testid="comprobantes-recortados"]')).toBeNull()
  })

  it('un monto ilegible se muestra como «—», no como $ 0', async () => {
    porContrato.mockResolvedValue(
      respuesta({ documentos: [comprobante({ debitos: null, creditos: null })] }),
    )
    await montar()

    expect(texto()).toContain('—')
    expect(texto()).not.toContain('$ 0')
  })

  it('marca los descuadrados y los anulados en vez de esconderlos', async () => {
    porContrato.mockResolvedValue(
      respuesta({
        documentos: [
          comprobante({ descuadrado: true, creditos: 900_000 }),
          comprobante({ id: 'doc-2', consecutivo: 26767, anulado: true }),
        ],
      }),
    )
    await montar()

    const t = texto()
    expect(t).toContain('descuadrado')
    expect(t).toContain('900.000')
    expect(t).toContain('anulado')
  })

  it('el consecutivo viaja aunque el prefijo venga vacío', async () => {
    porContrato.mockResolvedValue(
      respuesta({ documentos: [comprobante({ prefijo: '', consecutivo: 84 })] }),
    )
    await montar()
    expect(texto()).toContain('84')
  })

  it('en la ficha del inmueble pide por inmueble, con las mismas pestañas', async () => {
    porInmueble.mockResolvedValue(
      respuesta({ contractId: undefined, propertyId: 'p-1', porClase: { ingreso: 1, egreso: 3 } }),
    )
    await montar({ propertyId: 'p-1' })

    expect(porInmueble).toHaveBeenCalledWith('p-1', 'ingreso')
    expect(porContrato).not.toHaveBeenCalled()
    expect(conteo('egreso')).toBe('3')
    expect(filas()).toHaveLength(1)
  })
})
