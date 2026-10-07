/**
 * QA-INQ (03-10-2026) · el contrato manual visto desde Inquilinos.
 *
 *  · I-29: «Crear su contrato» llega con `?inquilino=<identidad>` y el bloque
 *    de partes la recibe ya elegida.
 *  · I-30 (regla de ARREGLOS-4 Q2): la pantalla NO abre con errores rojos.
 *    Antes salían «El canon no puede ser menor que $100.000» (con
 *    `aria-invalid`) y «Sube el PDF del contrato» antes de escribir nada. Un
 *    campo vacío dice su error al dejarlo; el botón apagado dice qué falta.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { post, acciones, router, url, partes } = vi.hoisted(() => ({
  post: vi.fn(),
  acciones: { uploadPdf: vi.fn(), create: vi.fn(), createManual: vi.fn(), isSubmitting: false, lastError: null },
  router: { push: vi.fn(), replace: vi.fn(), back: vi.fn() },
  url: { query: 'modo=manual' },
  partes: { props: null as null | Record<string, unknown> },
}))

vi.mock('@/lib/api/client', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client')
  return { ...real, apiClient: { post } }
})
vi.mock('@/lib/api/inventario-del-inmueble.service', () => ({
  inventarioDelInmuebleApi: { paraIniciar: vi.fn().mockResolvedValue({ exigible: false, consignacionId: null }) },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(url.query),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/lib/hooks/useContracts', async () => {
  const real = await vi.importActual<typeof import('@/lib/hooks/useContracts')>('@/lib/hooks/useContracts')
  return { ...real, useContractActions: () => acciones }
})
vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: { getByApplicationId: vi.fn().mockResolvedValue(null) },
}))
vi.mock('@/lib/api/applications.service', () => ({
  landlordApplicationsApi: { getDetail: vi.fn(), getEvaluationResult: vi.fn() },
}))
vi.mock('@/lib/api/properties.service', () => ({ propertiesApi: { getById: vi.fn() } }))
vi.mock('@/components/inmobiliaria/recorrido/RecorridoHilo', () => ({ RecorridoHilo: () => null }))
vi.mock('@/components/inmobiliaria/RespaldoDelArriendo', () => ({ RespaldoDelArriendo: () => null }))
vi.mock('@/components/contratos/PartesDelContratoManual', async () => {
  const real = await vi.importActual<typeof import('@/components/contratos/PartesDelContratoManual')>(
    '@/components/contratos/PartesDelContratoManual',
  )
  return {
    ...real,
    PartesDelContratoManual: (props: Record<string, unknown>) => {
      partes.props = props
      return null
    },
  }
})

import NuevoContratoPage from './page'

let contenedor: HTMLDivElement
let raiz: Root

async function montar() {
  post.mockResolvedValue({
    codigo: 'CONTRATO_VIVIENDA', nombre: 'x', descripcion: 'x', uso: 'VIVIENDA', nombreSugerido: 'x',
    inmueble: null, campos: [], clausulas: [], iaDisponible: false,
    topes: { canonMaximo: null, valorComercialMaximo: null, ipcAno: 2025, ipcValor: 5, fuente: 'x' },
  })
  await act(async () => {
    raiz.render(<NuevoContratoPage />)
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 300))
  })
}

beforeEach(() => {
  url.query = 'modo=manual'
  partes.props = null
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})
afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

const canon = () => contenedor.querySelector<HTMLInputElement>('#contrato-monthlyRent')!

describe('I-30 · la pantalla no abre regañando', () => {
  it('🔴 al abrir, el canon vacío NO está en rojo y no dice «Sube el PDF» como error', async () => {
    await montar()
    expect(canon()).not.toBeNull()
    expect(canon().getAttribute('aria-invalid')).toBeNull()
    expect(contenedor.querySelector('#contrato-monthlyRent-error')?.textContent ?? '').not.toContain('no puede ser menor')
    expect(contenedor.querySelector('#contrato-pdfFile-error')?.textContent ?? '').toBe('')
    expect(contenedor.querySelector('[aria-invalid="true"]')).toBeNull()
  })

  it('el botón apagado dice qué falta, en palabras y sin rojo', async () => {
    await montar()
    const nota = contenedor.querySelector('[data-testid="lo-que-falta"]')!
    expect(nota.textContent).toContain('el PDF del contrato')
    expect(nota.textContent).toContain('el canon')
    expect(nota.className).not.toContain('danger')
  })

  it('al DEJAR el canon vacío, su error sí sale', async () => {
    await montar()
    await act(async () => {
      canon().focus()
      canon().blur()
      canon().dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300))
    })
    expect(canon().getAttribute('aria-invalid')).toBe('true')
  })
})

describe('I-29 · llega con la persona elegida', () => {
  it('🔴 `?inquilino=` llega al bloque de partes, ya elegida', async () => {
    url.query = 'modo=manual&inquilino=doc%3A55'
    await montar()
    expect(partes.props!.inquilinoPedido).toBe('doc:55')
    expect(partes.props!.valor).toMatchObject({ inquilino: { modo: 'existente', tenantId: 'doc:55' } })
  })

  it('sin el parámetro, como siempre', async () => {
    await montar()
    expect(partes.props!.inquilinoPedido).toBeNull()
    expect(partes.props!.valor).toMatchObject({ inquilino: { modo: 'existente', tenantId: '' } })
  })
})
