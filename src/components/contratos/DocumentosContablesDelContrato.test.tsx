/**
 * Los comprobantes del sistema anterior, en la ficha del contrato.
 *
 * Lo que este test cuida es que la sección no AFIRME nada que no verificó:
 *
 *  · Un fallo no se pinta como «este contrato no tiene comprobantes». Son dos
 *    cosas distintas y la segunda es una mentira dicha con confianza.
 *  · El tope sale del dato del back (`total` vs `mostrados`), no de contar las
 *    filas visibles: dibujar 500 sin decir que había 1.842 afirma que ésas son
 *    todas.
 *  · Un monto que no se pudo leer (`null`) se muestra como «—», nunca como
 *    «$ 0» — que es lo que devuelve `formatCurrency(null)`.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/contabilidad.service', () => ({
  contabilidadApi: {
    migracion: { documentos: { porContrato: vi.fn() } },
  },
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) =>
    React.createElement('a', { href, ...rest }, children),
}))

import {
  contabilidadApi,
  type DocumentoMigradoVista,
  type DocumentosDeUnContrato,
} from '@/lib/api/contabilidad.service'
import { DocumentosContablesDelContrato } from './DocumentosContablesDelContrato'

const porContrato = contabilidadApi.migracion.documentos
  .porContrato as unknown as ReturnType<typeof vi.fn>

function comprobante(over: Partial<DocumentoMigradoVista> = {}): DocumentoMigradoVista {
  return {
    id: 'doc-1',
    prefijo: 'FV',
    consecutivo: 26766,
    tipo: 'Factura',
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
    ...over,
  }
}

function respuesta(over: Partial<DocumentosDeUnContrato> = {}): DocumentosDeUnContrato {
  const documentos = over.documentos ?? [comprobante()]
  return {
    contractId: 'c-1',
    total: documentos.length,
    mostrados: documentos.length,
    tope: 500,
    ...over,
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
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function montar() {
  await act(async () => {
    root.render(<DocumentosContablesDelContrato contractId="c-1" />)
    await new Promise((r) => setTimeout(r, 0))
  })
}

const texto = () =>
  container.querySelector('[data-testid="documentos-contables-del-contrato"]')?.textContent ?? ''

describe('<DocumentosContablesDelContrato>', () => {
  it('pide los comprobantes de ESE contrato y los lista', async () => {
    porContrato.mockResolvedValue(respuesta())
    await montar()

    expect(porContrato).toHaveBeenCalledWith('c-1')
    expect(container.querySelectorAll('[data-testid="comprobante-migrado"]')).toHaveLength(1)
    const t = texto()
    expect(t).toContain('Factura')
    expect(t).toContain('FV-26766')
    expect(t).toContain('CANON SEPTIEMBRE')
    expect(t).toContain('1.008.403')
  })

  it('sin comprobantes lo dice, y no como un error', async () => {
    porContrato.mockResolvedValue(respuesta({ documentos: [], total: 0, mostrados: 0 }))
    await montar()

    expect(container.querySelector('[data-testid="sin-datos"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).toBeNull()
    expect(texto()).toContain('Sin comprobantes del sistema anterior')
  })

  /*
   * 🔴 La falla que este test existe para impedir: `catch` → `setDatos([])`
   * pinta «este contrato no tiene comprobantes» sobre una petición que murió.
   */
  it('un fallo se dice como fallo, nunca como «no tiene comprobantes»', async () => {
    porContrato.mockRejectedValue(new Error('boom'))
    await montar()

    expect(container.querySelector('[data-testid="fallo-de-carga"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="sin-datos"]')).toBeNull()
    expect(texto()).not.toContain('Sin comprobantes del sistema anterior')
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
    expect(container.querySelectorAll('[data-testid="comprobante-migrado"]')).toHaveLength(1)
  })

  /*
   * El back devuelve los más recientes hasta su tope. Dibujar esas filas sin
   * decir cuántas quedaron afuera afirma que son todas.
   */
  it('cuando el back recorta, lo dice con los dos números', async () => {
    porContrato.mockResolvedValue(
      respuesta({
        documentos: [comprobante(), comprobante({ id: 'doc-2', consecutivo: 26767 })],
        total: 1842,
        mostrados: 2,
      }),
    )
    await montar()

    const aviso =
      container.querySelector('[data-testid="comprobantes-recortados"]')?.textContent ?? ''
    expect(aviso).toContain('2')
    expect(aviso).toContain('1.842')
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
})
