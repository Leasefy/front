/**
 * CobriEsteMes — la sección de Cobri dentro de «Agente de pagos» (08-10-2026,
 * traída de cambios-nico-10 sin quitar el equipo de seis).
 *
 * Lo que no puede volver: decir «Apagado» sin haber preguntado, y repetir la
 * cadencia dos veces en la misma pantalla.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => ({
  resumen: {
    data: null as null | Record<string, unknown>,
    cargando: false,
    error: null as unknown,
    recargar: vi.fn(async () => {}),
  },
  links: vi.fn(),
  enLaBandeja: { porCuota: new Map<string, string>(), ids: [] as string[], total: 0 },
}))

vi.mock('@/lib/hooks/use-payu', () => ({ useResumenDePayu: () => h.resumen }))
vi.mock('@/lib/hooks/use-cobros-en-la-bandeja', () => ({ useCobrosEnLaBandeja: () => h.enLaBandeja }))
// La lista tiene su propia prueba (`LinksDePago.test.tsx`): acá importa qué le llega.
vi.mock('@/components/inmobiliaria/pagos/payu/LinksDePago', () => ({
  LinksDePago: (props: { titulo?: string; descripcion?: string | null; resumen?: React.ReactNode; mes?: string }) => {
    h.links(props)
    return React.createElement(
      'section',
      { 'data-testid': 'links-de-pago', 'data-mes': props.mes },
      React.createElement('h2', null, props.titulo),
      props.resumen,
    )
  },
}))

import { CobriEsteMes } from './CobriEsteMes'

let contenedor: HTMLDivElement
let root: Root

const RESUMEN = {
  mes: '2026-10',
  payuActivo: true,
  cuotas: 40,
  linksEnviados: 12,
  pagadosPorLink: 5,
  montoCobradoPorLinkCop: 7_500_000,
  pendientesCop: 10_000_000,
}

function render() {
  act(() => {
    root.render(<CobriEsteMes />)
  })
}

const q = (sel: string) => contenedor.querySelector(sel)
const estado = () => q('[data-testid="estado-de-cobri"]')

beforeEach(() => {
  h.resumen.data = null
  h.resumen.error = null
  h.resumen.recargar.mockClear()
  h.links.mockClear()
  h.enLaBandeja = { porCuota: new Map(), ids: [], total: 0 }
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

describe('Cobri dentro de «Agente de pagos»', () => {
  it('prendido: la frase del mes con lo que mandó, encima del link de cada cuota', () => {
    h.resumen.data = RESUMEN
    render()
    expect(estado()?.textContent).toMatch(/Prendido/)
    const frase = q('[data-testid="frase-de-cobri"]')?.textContent ?? ''
    expect(frase).toMatch(/Cobri/)
    // Revisora r25 (#1): la cifra y su frase van ARRIBA, fuera de la tabla y antes de ella.
    const frasePintada = q('[data-testid="frase-de-cobri"]')!
    const tabla = q('[data-testid="links-de-pago"]')!
    expect(tabla.contains(frasePintada)).toBe(false)
    expect(frasePintada.compareDocumentPosition(tabla) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Y no repite lo que la cifra ya dice («N de M cuotas»).
    expect(frase).not.toMatch(/de \d+ cuotas/)
    // La tarjeta se titula por lo que muestra y va sin bajada: la cadencia ya se dijo arriba.
    expect(h.links).toHaveBeenLastCalledWith(expect.objectContaining({ titulo: 'El enlace de cada cuota', descripcion: null }))
  })

  it('apagado en el servidor: lo dice, sin inventar números', () => {
    h.resumen.data = { ...RESUMEN, payuActivo: false, linksEnviados: 0, pagadosPorLink: 0, montoCobradoPorLinkCop: 0 }
    render()
    expect(estado()?.textContent).toMatch(/Apagado/)
    expect(q('[data-testid="frase-de-cobri"]')?.textContent).not.toMatch(/\$\s?\d/)
  })

  it('🔴 si el resumen no se pudo leer: «Sin verificar», nunca «Apagado», y una línea con reintentar', async () => {
    h.resumen.error = new Error('503')
    render()
    expect(estado()?.textContent).toMatch(/Sin verificar/)
    expect(estado()?.textContent).not.toMatch(/Apagado/)
    const fallo = q('[data-testid="frase-de-cobri-fallo"]')
    expect(fallo?.textContent).toContain('No se pudo leer el resumen de Cobri')
    // La lista sigue viva debajo.
    expect(q('[data-testid="links-de-pago"]')).not.toBeNull()
    await act(async () => {
      fallo?.querySelector('button')?.click()
    })
    expect(h.resumen.recargar).toHaveBeenCalled()
  })

  it('🔴 COBRI-4: dice cuántos links esperan aprobación, con el camino a la Bandeja, y le pasa la lista a cada cuota', () => {
    h.resumen.data = RESUMEN
    render()
    // Sin nada en la Bandeja, ni una palabra.
    expect(q('[data-testid="cobri-espera-aprobacion"]')).toBeNull()

    const porCuota = new Map([['c-1', 'hold:d-1']])
    h.enLaBandeja = { porCuota, ids: ['hold:d-1'], total: 1 }
    render()
    const aviso = q('[data-testid="cobri-espera-aprobacion"]')
    expect(aviso?.textContent).toContain('Un enlace de pago espera tu aprobación')
    // Uno solo: el enlace abre ESE caso, no la Bandeja entera.
    expect(aviso?.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/piloto?item=hold%3Ad-1')
    expect(aviso?.querySelector('a')?.textContent).toContain('Revisar y aprobar')
    expect(h.links).toHaveBeenLastCalledWith(expect.objectContaining({ esperanEnLaBandeja: porCuota }))

    h.enLaBandeja = { porCuota, ids: ['hold:d-1', 'hold:d-2', 'hold:d-3'], total: 3 }
    render()
    const varios = q('[data-testid="cobri-espera-aprobacion"]')
    expect(varios?.textContent).toContain('3 enlaces de pago esperan tu aprobación')
    expect(varios?.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/piloto?bandeja=1')
    expect(varios?.querySelector('a')?.textContent).toContain('Abrir la Bandeja')
  })

  it('cuándo escribe se dice UNA vez: los tres avisos y el tope', () => {
    h.resumen.data = RESUMEN
    render()
    const cuando = q('[data-testid="cobri-cuando-escribe"]')
    expect(cuando?.querySelectorAll('li')).toHaveLength(3)
    expect(cuando?.textContent).toContain('máximo tres mensajes por cuota')
    expect(contenedor.textContent?.match(/3 días antes/g)).toHaveLength(1)
  })
})
