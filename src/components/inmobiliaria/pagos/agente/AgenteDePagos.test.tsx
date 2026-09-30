/**
 * AgenteDePagos (/pagos/agente) contra DOBLES de las rutas del back:
 * `GET /inmobiliaria/cobros/links/resumen` y `GET /inmobiliaria/cobros/links`.
 *
 * El defecto que no puede volver: la pantalla decía «Apagado» y «tablero no
 * publicado» porque le preguntaba al micro por rutas que no existían. Ahora el
 * resumen es UNA frase con los números del back, y con Cobri apagado lo dice
 * con las palabras de Nico sin inventar cifras.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ children, href, ...resto }: { children: React.ReactNode; href: string } & Record<string, unknown>) =>
    React.createElement('a', { href, ...resto }, children),
}))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }))
vi.mock('@/components/ui/select', async () => {
  const R = await import('react')
  return {
    Select: ({ children }: { children?: React.ReactNode }) => R.createElement('div', null, children),
    SelectTrigger: ({ children }: { children?: React.ReactNode }) => R.createElement('div', null, children),
    SelectValue: () => null,
    SelectContent: ({ children }: { children?: React.ReactNode }) => R.createElement('div', null, children),
    SelectItem: ({ children }: { children?: React.ReactNode }) => R.createElement('span', null, children),
  }
})

// ── Los dobles de las rutas ─────────────────────────────────────────────────
const rutas = {
  resumen: vi.fn(),
  links: vi.fn(),
}
const get = vi.fn(async (ruta: string) => {
  if (ruta.startsWith('/inmobiliaria/cobros/links/resumen')) return rutas.resumen(ruta)
  if (ruta.startsWith('/inmobiliaria/cobros/links')) return rutas.links(ruta)
  throw new Error(`ruta sin doble: ${ruta}`)
})
vi.mock('@/lib/api/client', async (original) => ({
  ...(await original<typeof import('@/lib/api/client')>()),
  apiClient: { get: (ruta: string) => get(ruta) },
}))

import { AgenteDePagos } from './AgenteDePagos'
import { mesActual, sumarMeses } from '@/lib/recaudo/meses'
import type { PaginaDeLinksDePago, ResumenDeLinksDePago } from '@/lib/types/payu'

const MES = mesActual()

const resumen = (parcial: Partial<ResumenDeLinksDePago> = {}): ResumenDeLinksDePago => ({
  mes: MES,
  payuActivo: true,
  cuotas: 105,
  linksEnviados: 40,
  pagadosPorLink: 12,
  montoCobradoPorLinkCop: 18_000_000,
  pendientesCop: 42_000_000,
  ...parcial,
})

const UNA_PAGINA: PaginaDeLinksDePago = {
  items: [
    {
      cuotaId: 'c1',
      contratoId: 'k1',
      contratoNumero: '#43',
      inmueble: 'Apartamento 101',
      inquilino: 'Marta Gómez',
      fechaDeVencimiento: `${MES}-05`,
      montoCop: 1_500_000,
      estado: 'enviado',
      hitosEnviados: ['antes'],
      ultimoEnvioEn: null,
      pagadoEn: null,
      paymentUrl: null,
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
}

let contenedor: HTMLDivElement
let root: Root

beforeEach(() => {
  get.mockClear()
  rutas.resumen.mockReset()
  rutas.links.mockReset()
  rutas.links.mockResolvedValue(UNA_PAGINA)
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

async function montar() {
  await act(async () => root.render(<AgenteDePagos />))
  await act(async () => {
    await Promise.resolve()
  })
}

const q = (sel: string) => contenedor.querySelector(sel)
const pildora = () => q('[data-testid="estado-de-payu"]')
const frase = () => q('[data-testid="frase-de-payu"]')?.textContent ?? ''

describe('AgenteDePagos — Cobri apagado', () => {
  it('🔴 lo dice con honestidad, con icono y palabra, y sin un número inventado', async () => {
    rutas.resumen.mockResolvedValue(
      resumen({ payuActivo: false, linksEnviados: 0, pagadosPorLink: 0, montoCobradoPorLinkCop: 0, pendientesCop: 0 }),
    )
    await montar()
    expect(pildora()?.getAttribute('data-estado')).toBe('apagado')
    expect(pildora()?.textContent).toContain('Apagado')
    expect(pildora()?.querySelector('svg')).not.toBeNull()
    expect(frase().startsWith('Cobri está apagado en el servidor: lo prende Leasefy.')).toBe(true)
    expect(frase()).not.toContain('$')
  })

  it('si alcanzó a mandar links mientras estuvo prendido, cuenta los del back y no otros', async () => {
    rutas.resumen.mockResolvedValue(resumen({ payuActivo: false }))
    await montar()
    expect(frase()).toContain('Cobri está apagado en el servidor: lo prende Leasefy.')
    expect(frase()).toContain('mandó el link de 40 de 105 cuotas')
    expect(frase()).toContain('$ 18.000.000')
  })

  it('🔴 ya no habla de un tablero sin publicar ni le pregunta al micro', async () => {
    rutas.resumen.mockResolvedValue(resumen({ payuActivo: false, linksEnviados: 0 }))
    await montar()
    expect(contenedor.textContent).not.toMatch(/tablero/i)
    for (const [ruta] of get.mock.calls) expect(String(ruta).startsWith('/inmobiliaria/cobros/links')).toBe(true)
  })
})

describe('AgenteDePagos — Cobri prendido', () => {
  it('el resumen del mes en una frase, y debajo el link de cada cuota', async () => {
    rutas.resumen.mockResolvedValue(resumen())
    await montar()
    expect(pildora()?.getAttribute('data-estado')).toBe('prendido')
    expect(pildora()?.textContent).toContain('Prendido')
    expect(frase()).toContain('Cobri mandó el link de 40 de 105 cuotas; 12 se pagaron por link ($ 18.000.000)')
    expect(q('[data-testid="link-c1"]')?.textContent).toContain('Marta Gómez')
  })

  it('la frase y la lista son del MISMO mes, y cambian juntas', async () => {
    rutas.resumen.mockResolvedValue(resumen())
    await montar()
    expect(get).toHaveBeenCalledWith(`/inmobiliaria/cobros/links/resumen?mes=${MES}`)
    expect(get).toHaveBeenCalledWith(`/inmobiliaria/cobros/links?mes=${MES}&page=1&limit=20`)

    const anterior = sumarMeses(MES, -1)
    rutas.resumen.mockResolvedValue(resumen({ mes: anterior }))
    await act(async () => (q('[aria-label="Mes anterior"]') as HTMLButtonElement).click())
    expect(get).toHaveBeenCalledWith(`/inmobiliaria/cobros/links/resumen?mes=${anterior}`)
    expect(get).toHaveBeenCalledWith(`/inmobiliaria/cobros/links?mes=${anterior}&page=1&limit=20`)
  })

  it('🔴 no hay botón para mandar links: los manda el cron', async () => {
    rutas.resumen.mockResolvedValue(resumen())
    await montar()
    const textos = [...contenedor.querySelectorAll('button, a')].map((b) => b.textContent ?? '')
    expect(textos.filter((t) => /enviar|mandar/i.test(t))).toEqual([])
  })
})

describe('AgenteDePagos — el resumen no se pudo leer', () => {
  it('🔴 dice «Sin verificar», nunca «Apagado», ofrece reintentar y la lista sigue', async () => {
    rutas.resumen.mockRejectedValue(new Error('500'))
    await montar()
    expect(pildora()?.getAttribute('data-estado')).toBe('sin-verificar')
    expect(pildora()?.textContent).not.toContain('Apagado')
    expect(frase()).toBe('')
    const reintentar = [...contenedor.querySelectorAll('button')].find((b) => /intentar/i.test(b.textContent ?? ''))
    expect(reintentar).toBeTruthy()
    expect(q('[data-testid="link-c1"]')).not.toBeNull()

    rutas.resumen.mockResolvedValue(resumen({ payuActivo: false, linksEnviados: 0 }))
    await act(async () => reintentar!.click())
    expect(pildora()?.getAttribute('data-estado')).toBe('apagado')
  })

  it('mientras pregunta, «Consultando…» y no una afirmación', async () => {
    rutas.resumen.mockReturnValue(new Promise(() => undefined))
    await montar()
    expect(pildora()?.getAttribute('data-estado')).toBe('cargando')
    expect(frase()).toBe('')
  })
})

describe('AgenteDePagos — el encabezado y la forma del panel (glow up 30-09)', () => {
  /** Ninguna clase de color clavada (hex/rgb/hsl arbitrario) ni degradado: claro y oscuro salen de tokens. */
  function clasesConColorClavado(): string[] {
    const malas: string[] = []
    for (const el of Array.from(contenedor.querySelectorAll('[class]'))) {
      for (const c of (el.getAttribute('class') ?? '').split(/\s+/)) {
        // El estado deshabilitado de los botones de cadence es del sistema de diseño, no de esta pantalla.
        if ((el.tagName === 'BUTTON' || el.tagName === 'A') && c.startsWith('disabled:')) continue
        if (/(^|:)(bg|text|border|from|to|via|fill|stroke)-\[(#|rgb|hsl)/.test(c) || /gradient/.test(c)) malas.push(c)
      }
    }
    return malas
  }

  it('el margen y el encabezado de las demás pantallas: «Agentes IA», h1 y la píldora al lado', async () => {
    rutas.resumen.mockResolvedValue(resumen())
    await montar()
    const raiz = q('[data-testid="agente-de-pagos"]')
    expect(raiz?.className).toContain('p-6')
    expect(raiz?.className).toContain('lg:p-8')
    expect(q('h1')?.textContent).toBe('Agente de pagos · Cobri')
    expect(q('header')?.textContent).toContain('Agentes IA')
    expect(q('header [data-testid="estado-de-payu"]')).not.toBeNull()
  })

  it('cuándo escribe se dice UNA vez: los tres avisos en su tarjeta, sin repetirlos en la de links', async () => {
    rutas.resumen.mockResolvedValue(resumen())
    await montar()
    const cuando = q('[data-testid="cobri-cuando-escribe"]')?.textContent ?? ''
    expect(cuando).toContain('3 días antes')
    expect(cuando).toContain('El día')
    expect(cuando).toContain('3 días después')
    expect(cuando).toContain('la sigue cobranza')
    // Ni la bajada de la página ni el encabezado de la tarjeta de links la repiten
    // (en la FILA sí puede decir «3 días antes»: es qué aviso le salió a esa cuota).
    expect(q('header')?.textContent).not.toMatch(/\d días (antes|después)/)
    const links = q('[data-testid="links-de-pago"]')
    const encabezadoDeLinks = links?.querySelector('header')?.textContent ?? ''
    expect(links?.querySelector('h2')?.textContent).toBe('El link de cada cuota')
    expect(encabezadoDeLinks).not.toMatch(/\d días (antes|después)|no se mandan a pedido/)
  })

  it('🔴 apagado es neutro (no amarillo ni rojo) y no hay alerta de error', async () => {
    rutas.resumen.mockResolvedValue(resumen({ payuActivo: false, linksEnviados: 0 }))
    await montar()
    const clase = pildora()?.getAttribute('class') ?? ''
    expect(clase).toContain('bg-surface-muted')
    expect(clase).not.toMatch(/warning|danger/)
    expect(q('[data-testid="frase-de-payu-fallo"]')).toBeNull()
  })

  it('si el resumen no se pudo leer: una línea con reintentar, no el cartel grande en medio de la tarjeta', async () => {
    rutas.resumen.mockRejectedValue(new Error('500'))
    await montar()
    const fallo = q('[data-testid="frase-de-payu-fallo"]')
    expect(fallo?.textContent).toContain('No se pudo leer el resumen de Cobri')
    expect(fallo?.textContent).not.toMatch(/al día/)
    expect(fallo?.querySelector('button')?.textContent).toMatch(/intentar/i)
  })

  it('claro y oscuro salen de tokens: ninguna clase con color clavado ni degradado', async () => {
    rutas.resumen.mockResolvedValue(resumen())
    await montar()
    expect(clasesConColorClavado()).toEqual([])
  })
})
