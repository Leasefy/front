/**
 * «Crear contrato» — las dos tarjetas que estaban muertas.
 *
 * Lo que se prueba acá y no en el panel:
 *   · que «Generar con IA» quede DESHABILITADA cuando el backend dice que no
 *     está configurada, y que lo diga en vez de prometer un «próximamente»;
 *   · que el `uploadedPdfPath` del contrato armado por el sistema llegue al
 *     submit EXACTAMENTE igual que el del PDF subido a mano. Es la razón por la
 *     que el backend devuelve esa forma: de ahí para abajo no hay rama nueva.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { post, acciones, router } = vi.hoisted(() => ({
  post: vi.fn(),
  acciones: {
    uploadPdf: vi.fn(),
    create: vi.fn(),
    createManual: vi.fn(),
    isSubmitting: false,
    lastError: null as Error | null,
  },
  router: { push: vi.fn(), replace: vi.fn(), back: vi.fn() },
}))

vi.mock('@/lib/api/client', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client')
  return { ...real, apiClient: { post } }
})
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams('modo=manual'),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/lib/hooks/useContracts', () => ({ useContractActions: () => acciones }))
vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: { getByApplicationId: vi.fn().mockResolvedValue(null) },
}))
vi.mock('@/lib/api/applications.service', () => ({
  landlordApplicationsApi: { getDetail: vi.fn(), getEvaluationResult: vi.fn() },
}))
vi.mock('@/lib/api/properties.service', () => ({ propertiesApi: { getById: vi.fn() } }))
vi.mock('@/components/inmobiliaria/recorrido/RecorridoHilo', () => ({
  RecorridoHilo: () => null,
}))
vi.mock('@/components/inmobiliaria/RespaldoDelArriendo', () => ({
  RespaldoDelArriendo: () => null,
}))

// El bloque de partes se reemplaza por un botón que elige un inmueble y un
// inquilino válidos de una: lo que importa acá es el origen del PDF, no el
// selector de inquilinos (que ya tiene su propio test).
vi.mock('@/components/contratos/PartesDelContratoManual', async () => {
  const real = await vi.importActual<
    typeof import('@/components/contratos/PartesDelContratoManual')
  >('@/components/contratos/PartesDelContratoManual')
  return {
    ...real,
    PartesDelContratoManual: ({
      onCambio,
      onInmuebleElegido,
    }: {
      onCambio: (p: { propertyId: string; inquilino: unknown }) => void
      onInmuebleElegido?: (c: unknown) => void
    }) => (
      <button
        type="button"
        data-testid="elegir-partes"
        onClick={() => {
          onCambio({ propertyId: 'p-1', inquilino: { modo: 'existente', tenantId: 't-1' } })
          onInmuebleElegido?.({
            id: 'g-1',
            propertyTitle: 'Apto 302',
            propertyAddress: 'Calle 100 # 15-20',
            monthlyRent: 2_500_000,
          })
        }}
      >
        elegir
      </button>
    ),
  }
})

import NuevoContratoPage from './page'
import type { PreparacionDeContrato } from '@/lib/api/contratos-plantilla.service'

// ─── Datos ───────────────────────────────────────────────────────────────────

function preparacion(iaDisponible: boolean): PreparacionDeContrato {
  return {
    codigo: 'CONTRATO_VIVIENDA',
    nombre: 'Contrato de arrendamiento de vivienda urbana',
    descripcion: 'Ley 820 de 2003.',
    uso: 'VIVIENDA',
    nombreSugerido: 'Contrato — Calle 100 # 15-20',
    inmueble: { id: 'g-1', titulo: 'Apto 302', direccion: 'Calle 100 # 15-20' },
    campos: [],
    clausulas: [],
    iaDisponible,
    topes: {
      canonMaximo: null,
      valorComercialMaximo: null,
      ipcAno: 2025,
      ipcValor: 5.2,
      fuente: 'https://www.dane.gov.co/',
    },
  }
}

const ARMADO = {
  uploadedPdfPath: 'contracts/uploads/u-1/1770000000000-abc123.pdf',
  contractOrigin: 'UPLOADED_PDF' as const,
  codigo: 'CONTRATO_VIVIENDA' as const,
  uso: 'VIVIENDA' as const,
  nombreSugerido: 'Contrato — Calle 100 # 15-20',
  clausulas: [],
}

// ─── Arnés ───────────────────────────────────────────────────────────────────

let contenedor: HTMLDivElement
let raiz: Root

function porTestId(id: string): HTMLElement | null {
  return contenedor.querySelector<HTMLElement>(`[data-testid="${id}"]`)
}

function porTexto(selector: string, texto: string): HTMLElement | null {
  return (
    Array.from(contenedor.querySelectorAll<HTMLElement>(selector)).find((el) =>
      el.textContent?.includes(texto),
    ) ?? null
  )
}

function clic(el: Element | null) {
  if (!el) throw new Error('No existe el elemento a clickear')
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 500))
  })
}

beforeEach(() => {
  post.mockReset()
  acciones.uploadPdf.mockReset()
  acciones.create.mockReset()
  acciones.createManual.mockReset()
  acciones.createManual.mockResolvedValue({
    contract: { id: 'c-1' },
    inquilino: { invitado: false },
  })
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})

afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

async function montar(iaDisponible = true) {
  post.mockImplementation((ruta: string) => {
    if (ruta.endsWith('/preparar')) return Promise.resolve(preparacion(iaDisponible))
    if (ruta.endsWith('/generar')) return Promise.resolve(ARMADO)
    return Promise.resolve({})
  })
  await act(async () => {
    raiz.render(<NuevoContratoPage />)
  })
  await esperar()
}

function tarjeta(titulo: string): HTMLButtonElement {
  const el = porTexto('button[aria-pressed]', titulo)
  if (!el) throw new Error(`No está la tarjeta «${titulo}»`)
  return el as HTMLButtonElement
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('las tres formas de traer el contrato', () => {
  it('«Usar plantilla» ya no está deshabilitada ni dice «Próximamente»', async () => {
    await montar()
    const plantilla = tarjeta('Usar plantilla')
    expect(plantilla.disabled).toBe(false)
    expect(contenedor.textContent).not.toContain('Próximamente')
  })

  it('«Generar con IA» queda DESHABILITADA cuando iaDisponible es false, y dice por qué', async () => {
    await montar(false)
    const ia = tarjeta('Generar con IA')
    expect(ia.disabled).toBe(true)
    // La verdad, no un «próximamente»: la clave no está configurada en esta cuenta.
    expect(ia.textContent).toContain('No está configurada en tu cuenta')
    expect(ia.textContent).not.toContain('Próximamente')

    // Y no se puede entrar al modo aunque se le haga clic.
    clic(ia)
    expect(porTestId('armar-contrato-desde-plantilla')).toBeNull()
  })

  it('«Generar con IA» se habilita cuando el backend dice que sí', async () => {
    await montar(true)
    const ia = tarjeta('Generar con IA')
    expect(ia.disabled).toBe(false)

    clic(ia)
    await act(async () => {
      await Promise.resolve()
    })
    expect(porTestId('armar-contrato-desde-plantilla')).not.toBeNull()
    expect(porTestId('plantilla-instrucciones')).not.toBeNull()
  })

  it('mientras no se sabe, la tarjeta de IA está apagada y lo dice', async () => {
    // La preparación no vuelve nunca: `iaDisponible` se queda en null.
    post.mockImplementation(() => new Promise(() => {}))
    await act(async () => {
      raiz.render(<NuevoContratoPage />)
    })
    await esperar()
    const ia = tarjeta('Generar con IA')
    expect(ia.disabled).toBe(true)
    expect(ia.textContent).toContain('Comprobando')
  })
})

describe('el PDF armado por el sistema llega al submit igual que el subido a mano', () => {
  async function elegirPartes() {
    clic(porTestId('elegir-partes'))
    await act(async () => {
      await Promise.resolve()
    })
  }

  function botonDeCrear(): HTMLButtonElement {
    const el = porTexto('button[type="submit"]', 'Crear contrato')
    if (!el) throw new Error('No está el botón de crear')
    return el as HTMLButtonElement
  }

  it('subido a mano: uploadPdf → { contractOrigin, uploadedPdfPath }', async () => {
    acciones.uploadPdf.mockResolvedValue({ uploadedPdfPath: 'contracts/uploads/u-1/mano.pdf' })
    await montar()
    await elegirPartes()

    const input = contenedor.querySelector<HTMLInputElement>('#pdf-upload')!
    const archivo = new File(['%PDF-1.4'], 'contrato.pdf', { type: 'application/pdf' })
    Object.defineProperty(input, 'files', { value: [archivo], configurable: true })
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(botonDeCrear().disabled).toBe(false)
    clic(botonDeCrear())
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const enviado = acciones.createManual.mock.calls[0][0]
    expect(enviado.contractOrigin).toBe('UPLOADED_PDF')
    expect(enviado.uploadedPdfPath).toBe('contracts/uploads/u-1/mano.pdf')
  })

  it('armado desde la plantilla: el mismo par de campos, sin ninguna rama nueva', async () => {
    await montar()
    await elegirPartes()

    clic(tarjeta('Usar plantilla'))
    await esperar()

    // Sin armar el contrato no se puede crear: un contrato sin su documento no
    // se manda a firmar.
    expect(botonDeCrear().disabled).toBe(true)

    clic(porTestId('plantilla-generar'))
    await act(async () => {
      await Promise.resolve()
    })
    expect(porTestId('plantilla-contrato-listo')).not.toBeNull()

    expect(botonDeCrear().disabled).toBe(false)
    clic(botonDeCrear())
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const enviado = acciones.createManual.mock.calls[0][0]
    expect(enviado.contractOrigin).toBe('UPLOADED_PDF')
    expect(enviado.uploadedPdfPath).toBe(ARMADO.uploadedPdfPath)
    // El PDF no se sube dos veces: lo produjo el backend al generar.
    expect(acciones.uploadPdf).not.toHaveBeenCalled()
    // Y nada de la plantilla se cuela en el cuerpo de `POST /contracts`.
    expect(enviado).not.toHaveProperty('clausulas')
    expect(enviado).not.toHaveProperty('valores')
  })
})
