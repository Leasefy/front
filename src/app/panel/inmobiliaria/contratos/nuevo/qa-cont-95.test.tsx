/**
 * QA-CONT-95 (04-10-2026) · el contrato manual: fecha de cartera y plantilla con
 * un inquilino que ya existe. (Arnés copiado de `qa-inquilinos.test.tsx`.)
 *
 * Abajo, lo que decía la prueba original del arnés:
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

const campoCartera = () => contenedor.querySelector<HTMLInputElement>('#contrato-fechaDeCartera')

function escribir(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  setter.call(input, valor)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('QA-CONT-95 · C-16 la fecha de cartera', () => {
  it('🔴 el formulario pide «Desde cuándo se cobra» (vacía = desde el inicio)', async () => {
    await montar()
    expect(campoCartera()).not.toBeNull()
    expect(contenedor.textContent).toContain('Desde cuándo se cobra')
  })

  it('una fecha de cartera ANTES del inicio se dice bajo su campo al dejarlo', async () => {
    await montar()
    const inicio = contenedor.querySelector<HTMLInputElement>('#contrato-startDate')!.value
    const antes = new Date(`${inicio}T12:00:00Z`)
    antes.setUTCDate(antes.getUTCDate() - 3)
    await act(async () => {
      escribir(campoCartera()!, antes.toISOString().slice(0, 10))
      campoCartera()!.focus()
      campoCartera()!.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300))
    })
    expect(contenedor.querySelector('#contrato-fechaDeCartera-error')?.textContent ?? '').toContain('No puede ser antes de la fecha de inicio')
  })
})

describe('QA-CONT-95 · «Usar plantilla» con «Ya es inquilino»', () => {
  it('🔴 el borrador que se prepara lleva el nombre y el documento de la persona elegida', async () => {
    await montar()
    const props = partes.props as { onCambio: (p: unknown) => void; onPersonaDelInquilino?: (p: unknown) => void; valor: Record<string, unknown> }
    expect(typeof props.onPersonaDelInquilino).toBe('function')
    await act(async () => {
      props.onCambio({ propertyId: 'prop-1', inquilino: { modo: 'existente', tenantId: 't-ivan' } })
      props.onPersonaDelInquilino!({ nombre: 'Iván Pérez', documento: '1037111222', correo: 'ivan@x.co', telefono: '300' })
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600))
    })
    const cuerpos = post.mock.calls
      .filter((c) => String(c[0]).includes('plantilla/preparar'))
      .map((c) => c[1] as Record<string, unknown>)
    expect(cuerpos.some((b) => b.arrendatarioNombre === 'Iván Pérez' && b.arrendatarioDocumento === '1037111222')).toBe(true)
  })
})
