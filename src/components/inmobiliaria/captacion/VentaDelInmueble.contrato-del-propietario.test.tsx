/**
 * 🔴 ARREGLOS-6b (Nico, ARREGLOS-3 Q4 a): la comisión de venta de un inmueble
 * NUEVO —sin contrato de arriendo— se registra sobre el contrato de OTRO
 * inmueble del mismo propietario. La revisión lo dice (cuál y por qué) y deja
 * registrar sobre ése; el contrato del propio inmueble se dice como siempre.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

const h = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  api: {
    comisionesDeVenta: vi.fn(),
    previsualizarVenta: vi.fn(),
    registrarComisionDeVenta: vi.fn(),
    anularComisionDeVenta: vi.fn(),
  },
}))

vi.mock('@/components/ui/toast', () => ({ toast: h.toast }))
vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ stop: vi.fn(), start: vi.fn() }),
}))
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: (modulo: string) => modulo === 'portafolio', isLoading: false }),
}))
vi.mock('@/lib/api/crm.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/crm.service')>('@/lib/api/crm.service')
  return { ...real, captacionApi: h.api }
})

import { VentaDelInmueble } from './VentaDelInmueble'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const VISTA = {
  camino: {
    comprador: 'UN_TERCERO',
    que: 'CAMBIAR_DE_PROPIETARIO' as const,
    porQue: 'Lo compró un tercero: el contrato NO se termina — cambia de propietario.',
    elInquilino: 'Sigue en su contrato, con las mismas condiciones.',
  },
  comision: { precioDeVentaCop: 850_000_000, porcentaje: 3, comisionCop: 25_500_000, pactada: true },
  falta: null,
  sePuedeRegistrarLaComision: true,
  tipoDeMandato: 'SALE' as const,
  sinComision: null,
  contrato: {
    id: 'k-apto-301',
    codigo: 7,
    inquilino: 'Iván Restrepo',
    delMismoPropietario: true as const,
    direccion: 'Calle 45 # 12-30, apto 301',
  },
}

let contenedor: HTMLDivElement
let raiz: Root

const esperar = (fn: () => void) => vi.waitFor(fn, { timeout: 3000, interval: 20 })
const seccion = () => contenedor.querySelector<HTMLElement>('[data-testid="venta-del-inmueble"]')!
const dialogo = () => document.querySelector<HTMLElement>('[role="dialog"]')
const boton = (donde: ParentNode, texto: string) =>
  Array.from(donde.querySelectorAll('button')).find((b) => b.textContent?.trim() === texto)

async function clic(el: Element | null | undefined) {
  if (!el) throw new Error('No está el elemento')
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

async function escribir(el: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function revisar() {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
  await act(async () => {
    raiz.render(<VentaDelInmueble consignacionId="c-nuevo" />)
  })
  await esperar(() => expect(boton(seccion(), 'Registrar la venta')).toBeDefined())
  await clic(boton(seccion(), 'Registrar la venta'))
  await esperar(() => expect(dialogo()?.querySelector('[data-testid="venta-datos"]')).not.toBeNull())
  await escribir(dialogo()!.querySelector<HTMLInputElement>('#venta-fechaDeLaEscritura')!, '2026-10-15')
  await escribir(dialogo()!.querySelector<HTMLInputElement>('#venta-precioDeVentaCop')!, '850000000')
  await clic(boton(dialogo()!, 'Ver qué pasa'))
  await esperar(() => expect(dialogo()!.querySelector('[data-testid="venta-revisar"]')).not.toBeNull())
}

beforeEach(() => {
  vi.clearAllMocks()
  h.api.comisionesDeVenta.mockResolvedValue({ disponible: true, motivo: null, viva: null, anuladas: [] })
  h.api.previsualizarVenta.mockResolvedValue(VISTA)
  h.api.registrarComisionDeVenta.mockResolvedValue({})
})

afterEach(() => {
  act(() => raiz?.unmount())
  contenedor?.remove()
  document.body.innerHTML = ''
})

describe('🔴 ARREGLOS-6b — el contrato de otro inmueble del mismo propietario', () => {
  it('la revisión dice que el contrato es de otro inmueble del mismo propietario, cuál, y por qué', async () => {
    await revisar()
    const texto = dialogo()!.querySelector('[data-testid="venta-contrato"]')?.textContent ?? ''
    expect(texto).toBe(
      'Sobre el contrato N.º 7 de Iván Restrepo, de otro inmueble del mismo propietario (Calle 45 # 12-30, apto 301): este inmueble no tiene contrato de arriendo.',
    )
    expect(dialogo()!.querySelector('[data-testid="venta-sin-contrato"]')).toBeNull()
  })

  it('deja registrar sobre ese contrato', async () => {
    await revisar()
    const registrar = boton(dialogo()!, 'Registrar la comisión')
    expect(registrar?.disabled).toBe(false)
    await clic(registrar)
    expect(h.api.registrarComisionDeVenta).toHaveBeenCalledWith('c-nuevo', {
      contractId: 'k-apto-301',
      fechaDeLaEscritura: '2026-10-15',
      precioDeVentaCop: 850_000_000,
    })
  })

  it('el contrato del propio inmueble se dice como siempre (sin la frase del propietario)', async () => {
    h.api.previsualizarVenta.mockResolvedValue({
      ...VISTA,
      contrato: { id: 'k-1', codigo: 24, inquilino: 'María Gómez' },
    })
    await revisar()
    expect(dialogo()!.querySelector('[data-testid="venta-contrato"]')?.textContent).toBe(
      'Sobre el contrato N.º 24 de María Gómez.',
    )
  })
})
