/**
 * «Registrar la venta» y la comisión de venta en el mandato (Nico, 02-10-2026).
 *
 * Lo que fija este test:
 *   · se ve la comisión VIVA, o la ANULADA con su motivo, quién y cuándo;
 *   · registrar = fecha de la escritura + precio escriturado → PREVISUALIZAR
 *     (sin escribir) → registrar; lo que el back rechazaría se dice en su campo
 *     antes de mandar;
 *   · anular pide MOTIVO, siempre;
 *   · registrar y anular SÓLO con `portafolio:edit` (quien edita mandatos);
 *   · sin la tabla en la base (o el 503 `COMISION_DE_VENTA_SIN_MIGRACION`) la
 *     pantalla lo dice con una frase y no deja registrar.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

const h = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  puede: { editar: true },
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
  usePermissions: () => ({
    canAccess: (modulo: string, accion: string) =>
      modulo === 'portafolio' && (accion === 'view' || h.puede.editar),
    isLoading: false,
  }),
}))
vi.mock('@/lib/api/crm.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/crm.service')>('@/lib/api/crm.service')
  return { ...real, captacionApi: h.api }
})

import { ApiError } from '@/lib/api/client'
import { MENSAJES_DE_LA_VENTA } from '@/lib/captacion/venta-del-inmueble'
import { VentaDelInmueble } from './VentaDelInmueble'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const VIVA = {
  id: 'com-1',
  consignacionId: 'c-1',
  contractId: 'k-1',
  fechaDeLaEscritura: '2026-10-15',
  precioDeVentaCop: 850_000_000,
  porcentaje: 3,
  comisionCop: 25_500_000,
  createdAt: '2026-10-15T15:00:00.000Z',
  estado: 'VIVA' as const,
  registradoPor: { userId: 'u-ana', nombre: 'Ana Ruiz' },
  anulacion: null,
}

const ANULADA = {
  ...VIVA,
  id: 'com-0',
  estado: 'ANULADA' as const,
  anulacion: {
    anuladaEl: '2026-10-16T15:00:00.000Z',
    por: { userId: 'u-luis', nombre: 'Luis Gómez' },
    motivo: 'El precio de la escritura quedó mal digitado',
  },
}

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
  contrato: { id: 'k-1', codigo: 24, inquilino: 'María Gómez' },
}

let contenedor: HTMLDivElement
let raiz: Root

async function montar() {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
  await act(async () => {
    raiz.render(<VentaDelInmueble consignacionId="c-1" />)
  })
}

const esperar = (fn: () => void) => vi.waitFor(fn, { timeout: 3000, interval: 20 })
const seccion = () => contenedor.querySelector<HTMLElement>('[data-testid="venta-del-inmueble"]')!
const dialogo = () => document.querySelector<HTMLElement>('[role="dialog"]')
const boton = (raizDeBusqueda: ParentNode, texto: string) =>
  Array.from(raizDeBusqueda.querySelectorAll('button')).find((b) => b.textContent?.trim() === texto)

async function clic(el: Element | null | undefined) {
  if (!el) throw new Error('No está el elemento')
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

async function escribir(el: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!
  await act(async () => {
    setter.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  h.puede.editar = true
  h.api.comisionesDeVenta.mockResolvedValue({ disponible: true, motivo: null, viva: null, anuladas: [] })
  h.api.previsualizarVenta.mockResolvedValue(VISTA)
  h.api.registrarComisionDeVenta.mockResolvedValue(VIVA)
  h.api.anularComisionDeVenta.mockResolvedValue(ANULADA)
})

afterEach(() => {
  act(() => raiz?.unmount())
  contenedor?.remove()
  document.body.innerHTML = ''
})

describe('lo que muestra el mandato', () => {
  it('🔴 la comisión VIVA: cuánto, sobre qué escritura, quién la registró y cuándo', async () => {
    h.api.comisionesDeVenta.mockResolvedValue({ disponible: true, motivo: null, viva: VIVA, anuladas: [ANULADA] })
    await montar()
    await esperar(() => expect(seccion().querySelector('[data-testid="comision-viva"]')).not.toBeNull())
    const texto = seccion().textContent ?? ''
    expect(texto).toContain('25.500.000')
    expect(texto).toContain('3 %')
    expect(texto).toContain('Escritura del 15 de octubre de 2026')
    expect(texto).toContain('La registró Ana Ruiz el 15 de octubre de 2026')
    // Con una viva no se ofrece registrar otra.
    expect(boton(seccion(), 'Registrar la venta')).toBeUndefined()
    expect(boton(seccion(), 'Anular la comisión')).toBeDefined()
  })

  it('🔴 sin viva, la ANULADA con su motivo, quién y cuándo, y se puede volver a registrar', async () => {
    h.api.comisionesDeVenta.mockResolvedValue({ disponible: true, motivo: null, viva: null, anuladas: [ANULADA] })
    await montar()
    await esperar(() => expect(seccion().querySelector('[data-testid="comision-anulada"]')).not.toBeNull())
    const texto = seccion().querySelector('[data-testid="comision-anulada"]')!.textContent ?? ''
    expect(texto).toContain('Comisión anulada')
    expect(texto).toContain('La anuló Luis Gómez el 16 de octubre de 2026')
    expect(texto).toContain('El precio de la escritura quedó mal digitado')
    expect(boton(seccion(), 'Registrar la venta')).toBeDefined()
  })

  it('🔴 sin `portafolio:edit` se ve, pero no se registra ni se anula', async () => {
    h.puede.editar = false
    h.api.comisionesDeVenta.mockResolvedValue({ disponible: true, motivo: null, viva: VIVA, anuladas: [] })
    await montar()
    await esperar(() => expect(seccion().querySelector('[data-testid="comision-viva"]')).not.toBeNull())
    expect(boton(seccion(), 'Anular la comisión')).toBeUndefined()

    act(() => raiz.unmount())
    h.api.comisionesDeVenta.mockResolvedValue({ disponible: true, motivo: null, viva: null, anuladas: [] })
    await montar()
    await esperar(() => expect(seccion().querySelector('[data-testid="sin-comision-viva"]')).not.toBeNull())
    expect(boton(seccion(), 'Registrar la venta')).toBeUndefined()
  })

  it('🔴 sin la tabla en la base: una frase, sin jerga, y sin botón de registrar', async () => {
    h.api.comisionesDeVenta.mockResolvedValue({
      disponible: false,
      motivo: 'Todavía no se puede registrar la comisión de venta: a esta base le falta la migración 20261002200000_comisiones_de_venta.',
      viva: null,
      anuladas: [],
    })
    await montar()
    await esperar(() => expect(seccion().querySelector('[data-testid="venta-sin-migracion"]')).not.toBeNull())
    expect(seccion().textContent).toContain(MENSAJES_DE_LA_VENTA.sinMigracion)
    expect(seccion().textContent).not.toMatch(/20261002200000/)
    expect(boton(seccion(), 'Registrar la venta')).toBeUndefined()
  })
})

describe('«Registrar la venta»: previsualizar y registrar', () => {
  async function abrir() {
    await montar()
    await esperar(() => expect(boton(seccion(), 'Registrar la venta')).toBeDefined())
    await clic(boton(seccion(), 'Registrar la venta'))
    await esperar(() => expect(dialogo()?.querySelector('[data-testid="venta-datos"]')).not.toBeNull())
  }

  const fecha = () => dialogo()!.querySelector<HTMLInputElement>('#venta-fechaDeLaEscritura')!
  const precio = () => dialogo()!.querySelector<HTMLInputElement>('#venta-precioDeVentaCop')!

  it('sin fecha ni precio no se previsualiza: cada error va bajo su campo, con la frase del back', async () => {
    await abrir()
    await clic(boton(dialogo()!, 'Ver qué pasa'))
    await esperar(() =>
      expect(dialogo()!.querySelector('#venta-fechaDeLaEscritura-error')?.textContent).toBe(
        MENSAJES_DE_LA_VENTA.escrituraNoEsUnDia,
      ),
    )
    expect(dialogo()!.querySelector('#venta-precioDeVentaCop-error')?.textContent).toBe(MENSAJES_DE_LA_VENTA.precioFalta)
    expect(h.api.previsualizarVenta).not.toHaveBeenCalled()
  })

  it('🔴 previsualiza SIN escribir y muestra el camino, la comisión y el contrato; después registra', async () => {
    await abrir()
    await clic(boton(dialogo()!, 'Al inquilino'))
    await escribir(fecha(), '2026-10-15')
    await escribir(precio(), '850000000')
    await clic(boton(dialogo()!, 'Ver qué pasa'))

    expect(h.api.previsualizarVenta).toHaveBeenCalledWith('c-1', {
      comprador: 'EL_INQUILINO',
      fechaDeLaEscritura: '2026-10-15',
      precioDeVentaCop: 850_000_000,
    })
    expect(h.api.registrarComisionDeVenta).not.toHaveBeenCalled()
    await esperar(() => expect(dialogo()!.querySelector('[data-testid="venta-revisar"]')).not.toBeNull())
    const texto = dialogo()!.textContent ?? ''
    expect(texto).toContain('cambia de propietario')
    expect(texto).toContain('25.500.000')
    expect(texto).toContain('Sobre el contrato N.º 24 de María Gómez')

    await clic(boton(dialogo()!, 'Registrar la comisión'))
    expect(h.api.registrarComisionDeVenta).toHaveBeenCalledWith('c-1', {
      contractId: 'k-1',
      fechaDeLaEscritura: '2026-10-15',
      precioDeVentaCop: 850_000_000,
    })
    await esperar(() => expect(h.toast.success).toHaveBeenCalledWith('Comisión de venta registrada', expect.anything()))
    // Vuelve a leer la comisión para mostrar la viva.
    await esperar(() => expect(h.api.comisionesDeVenta).toHaveBeenCalledTimes(2))
  })

  it('si el mandato no pactó comisión o el inmueble no tiene contrato, se dice y no se deja registrar', async () => {
    h.api.previsualizarVenta.mockResolvedValue({
      ...VISTA,
      comision: { precioDeVentaCop: 850_000_000, porcentaje: 0, comisionCop: 0, pactada: false },
      contrato: null,
    })
    await abrir()
    await escribir(fecha(), '2026-10-15')
    await escribir(precio(), '850000000')
    await clic(boton(dialogo()!, 'Ver qué pasa'))
    await esperar(() => expect(dialogo()!.querySelector('[data-testid="venta-revisar"]')).not.toBeNull())
    // ARREGLOS-3: sin la frase del back (uno anterior), la de arriendo.
    expect(dialogo()!.querySelector('[data-testid="venta-sin-comision"]')?.textContent).toContain(
      'mandato de VENTA',
    )
    expect(dialogo()!.querySelector('[data-testid="venta-sin-contrato"]')).not.toBeNull()
    expect(boton(dialogo()!, 'Registrar la comisión')?.disabled).toBe(true)
  })

  it('🔴 en un mandato de ARRIENDO no dice «Ponla en el mandato» (un callejón): dice que hace falta un mandato de VENTA y cómo crearlo (ARREGLOS-3)', async () => {
    h.api.previsualizarVenta.mockResolvedValue({
      ...VISTA,
      comision: { precioDeVentaCop: 850_000_000, porcentaje: 0, comisionCop: 0, pactada: false },
      tipoDeMandato: 'RENT',
      sinComision:
        'Este es un mandato de ARRIENDO: la comisión de venta no se pacta aquí sino en un mandato de VENTA, así que desde este mandato no hay comisión que registrar. Para cobrarla, crea el inmueble en venta con su mandato y su porcentaje de comisión (Inmuebles → «Nuevo inmueble», tipo de negocio «Venta») y registra la venta desde ese mandato.',
    })
    await abrir()
    await escribir(fecha(), '2026-10-15')
    await escribir(precio(), '850000000')
    await clic(boton(dialogo()!, 'Ver qué pasa'))
    await esperar(() => expect(dialogo()!.querySelector('[data-testid="venta-sin-comision"]')).not.toBeNull())
    const frase = dialogo()!.querySelector('[data-testid="venta-sin-comision"]')!.textContent ?? ''
    expect(frase).not.toContain('Ponla en el mandato')
    expect(frase).toContain('mandato de ARRIENDO')
    expect(frase).toContain('«Nuevo inmueble», tipo de negocio «Venta»')
    expect(boton(dialogo()!, 'Registrar la comisión')?.disabled).toBe(true)
  })

  it('en un mandato de VENTA sin porcentaje: que se edite ese mandato', async () => {
    h.api.previsualizarVenta.mockResolvedValue({
      ...VISTA,
      comision: { precioDeVentaCop: 850_000_000, porcentaje: 0, comisionCop: 0, pactada: false },
      tipoDeMandato: 'SALE',
    })
    await abrir()
    await escribir(fecha(), '2026-10-15')
    await escribir(precio(), '850000000')
    await clic(boton(dialogo()!, 'Ver qué pasa'))
    await esperar(() => expect(dialogo()!.querySelector('[data-testid="venta-sin-comision"]')).not.toBeNull())
    expect(dialogo()!.querySelector('[data-testid="venta-sin-comision"]')!.textContent).toContain('Edita el mandato')
  })

  it('🔴 sin la tabla, la previsualización lo dice y el botón no deja registrar', async () => {
    h.api.previsualizarVenta.mockResolvedValue({ ...VISTA, sePuedeRegistrarLaComision: false })
    await abrir()
    await escribir(fecha(), '2026-10-15')
    await escribir(precio(), '850000000')
    await clic(boton(dialogo()!, 'Ver qué pasa'))
    await esperar(() => expect(dialogo()!.querySelector('[data-testid="venta-sin-migracion"]')).not.toBeNull())
    expect(boton(dialogo()!, 'Registrar la comisión')?.disabled).toBe(true)
  })

  it('🔴 el 503 COMISION_DE_VENTA_SIN_MIGRACION al registrar se dice con la frase, no como «falló de nuestro lado»', async () => {
    h.api.registrarComisionDeVenta.mockRejectedValue(
      new ApiError(503, 'Todavía no se puede…', 'COMISION_DE_VENTA_SIN_MIGRACION', {
        statusCode: 503,
        code: 'COMISION_DE_VENTA_SIN_MIGRACION',
        message: 'Todavía no se puede registrar la comisión de venta: a esta base le falta la migración 20261002200000_comisiones_de_venta.',
      }),
    )
    await abrir()
    await escribir(fecha(), '2026-10-15')
    await escribir(precio(), '850000000')
    await clic(boton(dialogo()!, 'Ver qué pasa'))
    await esperar(() => expect(boton(dialogo()!, 'Registrar la comisión')).toBeDefined())
    await clic(boton(dialogo()!, 'Registrar la comisión'))
    await esperar(() =>
      expect(dialogo()!.querySelector('[role="alert"]')?.textContent).toBe(MENSAJES_DE_LA_VENTA.sinMigracion),
    )
    expect(h.toast.success).not.toHaveBeenCalled()
  })

  it('un 400 del back con el campo vuelve a los datos y lo pone bajo su campo', async () => {
    h.api.registrarComisionDeVenta.mockRejectedValue(
      new ApiError(400, ['El precio de la escritura no puede pasar de $100.000.000.000.'], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: ['El precio de la escritura no puede pasar de $100.000.000.000.'],
        campos: [
          {
            campo: 'precioDeVentaCop',
            regla: 'maximo',
            mensaje: 'El precio de la escritura no puede pasar de $100.000.000.000.',
          },
        ],
      }),
    )
    await abrir()
    await escribir(fecha(), '2026-10-15')
    await escribir(precio(), '850000000')
    await clic(boton(dialogo()!, 'Ver qué pasa'))
    await esperar(() => expect(boton(dialogo()!, 'Registrar la comisión')).toBeDefined())
    await clic(boton(dialogo()!, 'Registrar la comisión'))
    await esperar(() =>
      expect(dialogo()!.querySelector('#venta-precioDeVentaCop-error')?.textContent).toBe(
        'El precio de la escritura no puede pasar de $100.000.000.000.',
      ),
    )
  })
})

describe('anular la comisión: SIEMPRE con motivo', () => {
  async function abrir() {
    h.api.comisionesDeVenta.mockResolvedValue({ disponible: true, motivo: null, viva: VIVA, anuladas: [] })
    await montar()
    await esperar(() => expect(boton(seccion(), 'Anular la comisión')).toBeDefined())
    await clic(boton(seccion(), 'Anular la comisión'))
    await esperar(() => expect(dialogo()?.querySelector('[data-testid="anular-formulario"]')).not.toBeNull())
  }
  const motivo = () => dialogo()!.querySelector<HTMLTextAreaElement>('#anular-motivo')!
  const confirmar = () => dialogo()!.querySelector<HTMLButtonElement>('[data-testid="confirmar-anulacion"]')

  it('🔴 sin motivo (o con espacios) no se anula: el error va bajo el motivo', async () => {
    await abrir()
    await escribir(motivo(), '    ')
    await clic(confirmar())
    await esperar(() =>
      expect(dialogo()!.querySelector('#anular-motivo-error')?.textContent).toBe(
        MENSAJES_DE_LA_VENTA.motivoDeAnulacionCorto,
      ),
    )
    expect(h.api.anularComisionDeVenta).not.toHaveBeenCalled()
  })

  it('🔴 con motivo anula (recortado), avisa y vuelve a leer: ya se puede registrar otra', async () => {
    await abrir()
    expect(dialogo()!.textContent).toContain('queda anulada con tu motivo, quién y cuándo')
    await escribir(motivo(), '  El precio de la escritura quedó mal digitado  ')
    await clic(confirmar())
    expect(h.api.anularComisionDeVenta).toHaveBeenCalledWith(
      'c-1',
      'com-1',
      'El precio de la escritura quedó mal digitado',
    )
    await esperar(() => expect(h.toast.success).toHaveBeenCalledWith('Comisión de venta anulada', expect.anything()))
    await esperar(() => expect(h.api.comisionesDeVenta).toHaveBeenCalledTimes(2))
  })

  it('si otra persona ya la anuló, se dice con el motivo del back', async () => {
    h.api.anularComisionDeVenta.mockRejectedValue(
      new ApiError(409, 'Esta comisión de venta ya estaba anulada. Vuelve a abrir el mandato para ver cómo quedó.', 'COMISION_DE_VENTA_YA_ANULADA', {
        statusCode: 409,
        code: 'COMISION_DE_VENTA_YA_ANULADA',
        message: 'Esta comisión de venta ya estaba anulada. Vuelve a abrir el mandato para ver cómo quedó.',
      }),
    )
    await abrir()
    await escribir(motivo(), 'Precio mal digitado')
    await clic(confirmar())
    await esperar(() =>
      expect(dialogo()!.querySelector('[role="alert"]')?.textContent).toContain('ya estaba anulada'),
    )
  })
})
