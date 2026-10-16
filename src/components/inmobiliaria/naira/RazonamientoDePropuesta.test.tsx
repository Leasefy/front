/**
 * RazonamientoDePropuesta.test.tsx — el razonamiento de una propuesta, detrás de un tap (13-05, Tarea 3).
 *
 * Qué prueba: cerrado al montar (nada del razonamiento en el DOM) y abierto solo al tocarlo, con `aria-expanded` y una
 * región con nombre; cada hecho es una cifra DATO con SU corte pegado y el enlace de su fuente; la fuente cruda sale solo en
 * la referencia técnica; el grado de certeza, la volatilidad y el id del hecho no se pintan (U11); un valor ilegible lo
 * dice; sin investigación lo dice; los enlaces son los que da la página; y con datos de ejemplo cada corte es de ejemplo.
 *
 * Arnés (molde de 13-04): createRoot + act, stub de i18n real (es.json), `next/link` → `<a>`, permisos falsos y popover
 * plano. Marcador en el TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RESPUESTA_ESTRICTA_POR_ENDPOINT, type NairaActionDetail } from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA } from '@/lib/data/mock-naira'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ href, prefetch, children, ...resto }: React.PropsWithChildren<{ href: string; prefetch?: boolean } & Record<string, unknown>>) =>
    React.createElement('a', { href, 'data-prefetch': String(prefetch), ...resto }, children),
}))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({ canAccess: () => true, isAdmin: false, agencyRole: 'ADMIN' }),
}))
// #33: la ficha de la señal, sin red; cada prueba elige su estado (por defecto, no disponible: no pinta nada).
const senal = vi.hoisted(() => ({ estado: { kind: 'no_disponible' } as unknown, pedidas: [] as string[] }))
vi.mock('@/lib/hooks/naira/use-naira-senal', () => ({
  useNairaSenal: (promocionId: string) => {
    senal.pedidas.push(promocionId)
    return { estado: senal.estado, recargar: () => {} }
  },
}))
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <div data-testid="popover">{children}</div>,
}))

import { ProveedorDeOrigen, type OrigenDeLosDatos } from './OrigenDeNaira'
import { RazonamientoDePropuesta, type RazonamientoDePropuestaProps } from './RazonamientoDePropuesta'

const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['acciones.detalle']
const DETALLE = EJEMPLOS_DE_NAIRA['acciones.detalle']
const CORTE_1 = '2000-01-03T11:15:00.000Z'
const CORTE_2 = '2000-01-02T11:15:00.000Z'

type Razonamiento = NairaActionDetail['razonamiento']

function razonamientoCon(over: Partial<Razonamiento> = {}): Razonamiento {
  const razonamiento: Razonamiento = {
    senal: { senalId: 'SEN-1', promocionId: 'PROMO-1', detectorId: 'cartera.recaudo_tendencia', metricId: 'cartera.recovered_cop_30d' },
    hechos: [
      {
        value: 4711,
        source: 'agent.payments',
        asOf: CORTE_1,
        confidence: 0.8765,
        volatility: 'VOLATIL-SECRETO',
        trust: 'system',
        factId: 'FACT-SECRETO',
      },
      { value: '5923', source: 'naira.metric_catalog', asOf: CORTE_2, confidence: 0.4321, volatility: 'fast', trust: 'third_party' },
    ],
    investigacion: { kind: 'referencia', id: 'PROMO-1' },
    ...over,
  }
  return ESTRICTO.parse({ ...DETALLE, razonamiento }).razonamiento
}

let contenedor: HTMLDivElement
let root: Root

function montar(over: Partial<RazonamientoDePropuestaProps> = {}, origen: OrigenDeLosDatos = 'agente') {
  const props: RazonamientoDePropuestaProps = {
    razonamiento: razonamientoCon(),
    hrefDeLaSenal: '/s/PROMO-1',
    hrefDeLaExplicacion: '/e/PROMO-1',
    ...over,
  }
  act(() => {
    root.render(
      <ProveedorDeOrigen origen={origen}>
        <RazonamientoDePropuesta {...props} />
      </ProveedorDeOrigen>,
    )
  })
}

const disparador = () => contenedor.querySelector<HTMLButtonElement>('[data-naira-disparador-del-razonamiento]')

async function tocar() {
  await act(async () => {
    disparador()?.click()
  })
}

/** El texto del contenedor sin lo que vive dentro de los popovers (la referencia técnica). */
function textoSinPopovers(): string {
  const copia = contenedor.cloneNode(true) as HTMLElement
  for (const p of Array.from(copia.querySelectorAll('[data-testid="popover"]'))) p.remove()
  return copia.textContent ?? ''
}

/** Cerrado, Radix deja la región vacía y oculta (`hidden`, sin hijos): no hay contenido visible del razonamiento. */
function sinContenidoVisible(): boolean {
  const region = contenedor.querySelector('[data-naira-razonamiento]')
  return region === null || (region.hasAttribute('hidden') && region.childElementCount === 0 && (region.textContent ?? '') === '')
}

beforeEach(() => {
  senal.estado = { kind: 'no_disponible' }
  senal.pedidas = []
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

describe('#33 — por qué lo propone Naira, con la explicación investigada', () => {
  const SENAL = EJEMPLOS_DE_NAIRA['senal.detalle']

  it('[33:investigada] abierto, primero el porqué: la explicación investigada de SU señal, con su clase', async () => {
    senal.estado = { kind: 'ok', data: SENAL, origen: 'agente' }
    montar()
    expect(senal.pedidas).toStrictEqual([])
    await tocar()
    expect(senal.pedidas.at(-1)).toBe('PROMO-1')
    const porQue = contenedor.querySelector('[data-naira-por-que]')
    expect(porQue?.getAttribute('data-naira-por-que')).toBe('investigada')
    expect(porQue?.textContent).toContain('Por qué lo propone Naira')
    expect(porQue?.textContent).toContain('Lo explicó Naira al investigar la señal')
    expect(porQue?.textContent).toContain(SENAL.causa.kind === 'citada' ? SENAL.causa.citas[0] : 'x')
    // Va antes de los hechos.
    const region = contenedor.querySelector('[data-naira-razonamiento]')
    expect(region?.firstElementChild?.hasAttribute('data-naira-por-que')).toBe(true)
  })

  it('[33:regla] sin explicación investigada, el texto de la regla: el título de la señal con su cifra', async () => {
    senal.estado = { kind: 'ok', data: { ...SENAL, causa: { kind: 'no_citable', razon: 'sin_explicacion' } }, origen: 'agente' }
    montar()
    await tocar()
    const porQue = contenedor.querySelector('[data-naira-por-que]')
    expect(porQue?.getAttribute('data-naira-por-que')).toBe('regla')
    expect(porQue?.textContent).toContain('Naira lo propone por la regla que la detectó')
    expect(porQue?.textContent).toContain(SENAL.item.titulo)
  })

  it('[33:sin-senal] sin signal-view (sin enlace a la señal), de ejemplo o ilegible: no se pide o no se pinta', async () => {
    senal.estado = { kind: 'ok', data: SENAL, origen: 'agente' }
    montar({ hrefDeLaSenal: null })
    await tocar()
    expect(senal.pedidas).toStrictEqual([])
    expect(contenedor.querySelector('[data-naira-por-que]')).toBeNull()
    act(() => root.unmount())
    root = createRoot(contenedor)
    senal.estado = { kind: 'ok', data: SENAL, origen: 'ejemplo' }
    montar()
    await tocar()
    expect(contenedor.querySelector('[data-naira-por-que]')).toBeNull()
    act(() => root.unmount())
    root = createRoot(contenedor)
    senal.estado = { kind: 'sin_permiso' }
    montar()
    await tocar()
    expect(contenedor.querySelector('[data-naira-por-que]')).toBeNull()
    expect(contenedor.querySelectorAll('[data-naira-hecho]')).toHaveLength(2)
  })
})

describe('RazonamientoDePropuesta', () => {
  it('[N13:control-positivo] tras tocar, los hechos con su valor, el aporte y los enlaces de señal y explicación', async () => {
    montar()
    await tocar()
    const hechos = contenedor.querySelectorAll('[data-naira-hecho]')
    expect(hechos).toHaveLength(2)
    expect(hechos[0]?.querySelector('[data-naira-numero]')?.textContent).toContain('4711')
    expect(hechos[1]?.querySelector('[data-naira-numero]')?.textContent).toContain('5923')
    expect(contenedor.textContent).toContain('Aportado por: Sistema')
    expect(contenedor.textContent).toContain('Aportado por: Tercero')
    expect(contenedor.querySelector('a[href="/s/PROMO-1"]')?.textContent).toBe('Ver la señal')
    expect(contenedor.querySelector('a[href="/e/PROMO-1"]')?.textContent).toBe('Ver la explicación en la señal')
  })

  it('[N13:fixture-es-contrato] el detalle con el razonamiento pasa el esquema estricto y un campo renombrado no', () => {
    const bueno = { ...DETALLE, razonamiento: razonamientoCon() }
    expect(() => ESTRICTO.parse(bueno)).not.toThrow()
    const { hechos, ...resto } = bueno.razonamiento
    expect(() => ESTRICTO.parse({ ...bueno, razonamiento: { ...resto, hechoss: hechos } })).toThrow()
  })

  it('[N13:razonamiento-tras-un-tap] cerrado al montar y sin nada del razonamiento; abierto, una región con nombre', async () => {
    montar()
    const d = disparador()
    expect(d?.getAttribute('aria-expanded')).toBe('false')
    expect(d?.textContent).toContain('Ver el razonamiento')
    expect(sinContenidoVisible()).toBe(true)
    for (const secreto of ['4711', 'agent.payments', 'PROMO-1']) expect(contenedor.innerHTML).not.toContain(secreto)
    await tocar()
    expect(disparador()?.getAttribute('aria-expanded')).toBe('true')
    const controla = disparador()?.getAttribute('aria-controls') ?? ''
    expect(controla).not.toBe('')
    const region = document.getElementById(controla)
    expect(region).not.toBeNull()
    expect(region?.getAttribute('role')).toBe('region')
    expect(region?.getAttribute('aria-label')).toBe('Razonamiento de la propuesta')
    expect(disparador()?.textContent).toContain('Ocultar el razonamiento')
    await tocar()
    expect(disparador()?.getAttribute('aria-expanded')).toBe('false')
    expect(sinContenidoVisible()).toBe(true)
    expect(contenedor.querySelector('[data-naira-hecho]')).toBeNull()
  })

  it('[N13:asof-pegado] cada cifra lleva exactamente su propio corte', async () => {
    montar()
    await tocar()
    const numeros = Array.from(contenedor.querySelectorAll('[data-naira-numero]'))
    expect(numeros).toHaveLength(2)
    const esperados = [CORTE_1, CORTE_2]
    numeros.forEach((n, i) => {
      const cifra = n.closest('[data-naira-cifra]')
      const marcas = cifra?.querySelectorAll('[data-naira-asof]') ?? []
      expect(marcas).toHaveLength(1)
      expect(marcas[0]?.getAttribute('data-naira-asof')).toBe(esperados[i])
    })
  })

  it('[N13:confianza-no-se-pinta] ni la certeza, ni la volatilidad, ni el id del hecho', async () => {
    montar()
    await tocar()
    const html = contenedor.innerHTML
    for (const secreto of ['0.8765', '0,8765', '87,65', '0.4321', 'VOLATIL-SECRETO', 'FACT-SECRETO']) {
      expect(html, secreto).not.toContain(secreto)
    }
    expect(html.toLowerCase()).not.toContain('confianza')
  })

  it('[N13:fuente-solo-en-la-referencia] la fuente cruda solo en la referencia técnica, nunca como destino', async () => {
    montar()
    await tocar()
    expect(contenedor.querySelector('[data-testid="popover"]')?.textContent).toContain('agent.payments')
    expect(textoSinPopovers()).not.toContain('agent.payments')
    for (const a of Array.from(contenedor.querySelectorAll('a[href]'))) {
      expect(a.getAttribute('href') ?? '').not.toContain('agent.payments')
    }
  })

  it('[N13:categoria-por-campo] los hechos viven en un bloque DATO', async () => {
    montar()
    await tocar()
    const bloque = contenedor.querySelector('[data-categoria="dato"][data-seccion="LIVE_DATA"]')
    expect(bloque).not.toBeNull()
    expect(bloque?.querySelectorAll('[data-naira-hecho]')).toHaveLength(2)
  })

  it('[N13:valor-ilegible] un valor que no se puede leer lo dice, sin cifra ni texto crudo', async () => {
    const base = razonamientoCon()
    const primero = base.hechos[0]
    montar({ razonamiento: { ...base, hechos: [{ ...primero, value: { a: 1 } }] } })
    await tocar()
    const hecho = contenedor.querySelector('[data-naira-hecho]')
    expect(hecho?.textContent).toContain('No pude leer este dato')
    expect(hecho?.querySelector('[data-naira-numero]')).toBeNull()
    expect(contenedor.innerHTML).not.toContain('[object Object]')
  })

  it('[N13:sin-investigacion] sin investigación lo dice y no ofrece la explicación', async () => {
    montar({ razonamiento: razonamientoCon({ investigacion: { kind: 'sin_investigacion' } }), hrefDeLaExplicacion: null })
    await tocar()
    expect(contenedor.textContent).toContain('Esta propuesta no tiene investigación detrás.')
    expect(contenedor.textContent).not.toContain('Ver la explicación en la señal')
  })

  it('[N13:sin-href-del-agente] sin los href no hay enlaces de señal ni de explicación', async () => {
    montar({ hrefDeLaSenal: null, hrefDeLaExplicacion: null })
    await tocar()
    expect(contenedor.textContent).toContain('Señal que la originó')
    expect(contenedor.textContent).not.toContain('Ver la señal')
    expect(contenedor.textContent).not.toContain('Ver la explicación en la señal')
    expect(contenedor.querySelector('a[href="/s/PROMO-1"]')).toBeNull()
    expect(contenedor.querySelector('a[href="/e/PROMO-1"]')).toBeNull()
  })

  it('[N13:simulado-visible] con datos de ejemplo cada corte es de ejemplo', async () => {
    montar({}, 'ejemplo')
    await tocar()
    const marcas = Array.from(contenedor.querySelectorAll('[data-naira-asof]'))
    expect(marcas.length).toBeGreaterThan(0)
    for (const m of marcas) expect(m.getAttribute('data-naira-ejemplo')).toBe('true')
    expect(contenedor.textContent).toContain('DATO DE EJEMPLO')
  })
})
