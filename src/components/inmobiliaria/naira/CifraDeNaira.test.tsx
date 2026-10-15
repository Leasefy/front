/**
 * @vitest-environment happy-dom
 *
 * CifraDeNaira — valor + corte + enlace en UN contenedor (D13-8, FG13-5, FG13-10, UI-SPEC §6.1 y §7.1). La cadena
 * completa del modo ejemplo se prueba desde VistaDeNaira (el origen del ok llega a cada cifra).
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const permisos = vi.hoisted(() => ({ permitido: vi.fn((_modulo: string, _accion: string) => true) }))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) =>
    React.createElement('a', { href, ...rest }, children),
}))
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <div data-testid="popover">{children}</div>,
}))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({ canAccess: permisos.permitido }),
  usePermissionsContextSafe: () => null,
}))

import { formatearValorDeNaira } from '@/lib/naira/formato'

import { CifraDeNaira, type CifraDeNairaProps } from './CifraDeNaira'
import { VistaDeNaira } from './VistaDeNaira'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const AHORA = new Date('2026-10-06T00:15:00.000Z')
const DE_CARTERA = { kind: 'metrica', metricId: 'cartera.morosidad_rate' } as const
const VOLVER = { label: 'Volver a la lista (prueba)', href: '/panel/inmobiliaria/x' }

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  permisos.permitido.mockImplementation(() => true)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

function montar(nodo: React.ReactNode): void {
  act(() => {
    root.render(nodo)
  })
}

function cifra(props: Partial<CifraDeNairaProps> = {}): React.ReactElement {
  return <CifraDeNaira valor="12.5" unidad="pct" asOf="2026-10-05T11:15:00.000Z" de={DE_CARTERA} ahora={AHORA} {...props} />
}

const numeros = () => [...container.querySelectorAll('[data-naira-numero]')]
const norm = (s: string) => s.replace(/\s+/g, ' ')
const texto = () => norm(container.textContent ?? '')
/** El valor formateado por el front, con los mismos espacios normalizados que `texto()`. */
const formateado = () => norm(formatearValorDeNaira('12.5', 'pct') ?? 'IMPOSIBLE')

describe('<CifraDeNaira>', () => {
  it('[N13:control-positivo] el número sale de formatearValorDeNaira en un <data> mono, con su marca y su enlace', () => {
    montar(cifra())
    const [numero] = numeros()
    expect(numero?.textContent).toBe(formatearValorDeNaira('12.5', 'pct'))
    expect(numero?.tagName.toLowerCase()).toBe('data')
    expect(numero?.getAttribute('value')).toBe('12.5')
    const clases = (numero?.getAttribute('class') ?? '').split(/\s+/)
    expect(clases).toContain('font-mono')
    expect(clases).toContain('tabular-nums')
    expect(container.querySelector('[data-naira-cifra] [data-naira-asof]')).not.toBeNull()
    expect(container.querySelector('[data-naira-cifra] [data-naira-enlace="activo"] a')).not.toBeNull()
  })

  it('[N13:asof-pegado] cada número tiene exactamente su corte dentro de su propio contenedor', () => {
    const fixtures: { valor: string; unidad: string; asOf: string }[] = [
      { valor: '12.5', unidad: 'pct', asOf: '2026-10-01T11:00:00.000Z' },
      { valor: '1500000', unidad: 'cop', asOf: '2026-10-02T11:00:00.000Z' },
      { valor: '42', unidad: 'count', asOf: '2026-10-03T11:00:00.000Z' },
      { valor: '7', unidad: 'days', asOf: '2026-10-04T11:00:00.000Z' },
      { valor: '0.42', unidad: 'ratio', asOf: '2026-10-05T11:00:00.000Z' },
    ]
    montar(
      <div>
        {fixtures.map((f) => (
          <CifraDeNaira key={f.asOf} valor={f.valor} unidad={f.unidad} asOf={f.asOf} de={DE_CARTERA} ahora={AHORA} />
        ))}
      </div>,
    )
    expect(numeros()).toHaveLength(5)
    expect(container.querySelectorAll('[data-naira-cifra]')).toHaveLength(5)
    for (const [i, numero] of numeros().entries()) {
      const caja = numero.closest('[data-naira-cifra]')
      const marcas = caja?.querySelectorAll('[data-naira-asof]') ?? []
      expect(marcas.length, fixtures[i]!.unidad).toBe(1)
      expect(marcas[0]?.getAttribute('data-naira-asof'), fixtures[i]!.unidad).toBe(fixtures[i]!.asOf)
    }
  })

  describe('en otra zona horaria', () => {
    let tzPrevio: string | undefined
    beforeAll(() => {
      tzPrevio = process.env.TZ
      process.env.TZ = 'Asia/Tokyo'
    })
    afterAll(() => {
      if (tzPrevio === undefined) delete process.env.TZ
      else process.env.TZ = tzPrevio
    })

    it('[N13:asof-bogota] la marca de la cifra se escribe en hora de Colombia aunque el proceso esté en Tokio', () => {
      expect(new Date('2026-10-05T03:30:00.000Z').getDate()).toBe(5)
      montar(cifra({ asOf: '2026-10-05T03:30:00.000Z', ahora: new Date('2026-10-05T04:00:00.000Z') }))
      const marca = container.querySelector('[data-naira-cifra] [data-naira-asof]')
      expect(marca?.textContent?.replace(/\s+/g, ' ')).toContain('4 de oct')
      expect(marca?.textContent).not.toContain('5 de oct')
    })
  })

  it('[N13:valor-renderizado] si el contrato trae valorRenderizado, ese es el número; vacío no cuenta; sin corte no se pinta', () => {
    montar(cifra({ valorRenderizado: 'VALOR-DEL-AGENTE (ejemplo)' }))
    expect(numeros()).toHaveLength(1)
    expect(numeros()[0]?.textContent).toBe('VALOR-DEL-AGENTE (ejemplo)')
    expect(numeros()[0]?.getAttribute('value')).toBe('12.5')
    expect(texto()).not.toContain(formateado())

    montar(cifra({ valorRenderizado: '' }))
    expect(numeros()[0]?.textContent).toBe(formatearValorDeNaira('12.5', 'pct'))

    vi.spyOn(console, 'warn').mockImplementation(() => {})
    montar(cifra({ valorRenderizado: 'VALOR-DEL-AGENTE (ejemplo)', asOf: '2026-10-05' }))
    expect(numeros()).toHaveLength(0)
    expect(texto()).toContain('Dato sin corte: no lo mostramos')
    expect(texto()).not.toContain('VALOR-DEL-AGENTE')
  })

  it('[N13:cifra-sin-corte] un corte inválido no deja pintar el número y avisa en consola', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    montar(cifra({ asOf: 'ayer' }))
    expect(numeros()).toHaveLength(0)
    expect(texto()).toContain('Dato sin corte: no lo mostramos')
    expect(texto()).not.toContain(formateado())
    expect(aviso).toHaveBeenCalled()
  })

  it('[N13:cifra-ilegible] un valor ilegible dice que no se pudo leer, nunca 0 ni guion', () => {
    montar(cifra({ valor: 'abc', unidad: 'count' }))
    expect(numeros()).toHaveLength(0)
    expect(texto()).toContain('No pude leer este dato')
    expect(texto()).not.toContain('—')
  })

  it('[N13:unidad-desconocida] una unidad fuera del contrato se pinta cruda, sin adivinar, con su marca', () => {
    montar(cifra({ valor: '0.42', unidad: 'ratio' }))
    expect(numeros()).toHaveLength(1)
    expect(numeros()[0]?.textContent).toBe('0.42')
    const unidad = [...container.querySelectorAll('.text-fg-muted')].find((e) => e.textContent === 'ratio')
    expect(unidad).toBeDefined()
    expect(container.querySelector('[data-naira-cifra] [data-naira-asof]')).not.toBeNull()
  })

  it('[N13:simulado-visible] desde VistaDeNaira, un ok de ejemplo marca cada cifra, sin fecha y sin enlace', () => {
    const dos = () => (
      <>
        <CifraDeNaira valor="12.5" unidad="pct" asOf="2026-10-05T11:15:00.000Z" de={DE_CARTERA} ahora={AHORA} />
        <CifraDeNaira
          valor="3"
          unidad="count"
          asOf="2026-10-05T11:15:00.000Z"
          de={{ kind: 'metrica', metricId: 'portafolio.available_units_count' }}
          ahora={AHORA}
        />
      </>
    )
    montar(
      <VistaDeNaira nombre="briefing" estado={{ kind: 'ok', data: null, origen: 'ejemplo' }} renderOk={dos} queEs="el briefing" volverA={VOLVER} />,
    )
    expect(container.querySelector('[data-testid="aviso-datos-de-ejemplo"]')).not.toBeNull()
    expect(numeros()).toHaveLength(2)
    for (const n of numeros()) expect(n.getAttribute('data-naira-ejemplo')).toBe('true')
    expect(container.querySelectorAll('time')).toHaveLength(0)
    expect(texto().split('DATO DE EJEMPLO').length - 1).toBe(2)
    expect(container.querySelectorAll('a')).toHaveLength(0)

    // Control: el mismo ok del agente tiene fechas y enlaces.
    montar(
      <VistaDeNaira nombre="briefing" estado={{ kind: 'ok', data: null, origen: 'agente' }} renderOk={dos} queEs="el briefing" volverA={VOLVER} />,
    )
    expect(container.querySelectorAll('[data-naira-ejemplo]')).toHaveLength(0)
    expect(container.querySelectorAll('time')).toHaveLength(2)
    expect(container.querySelectorAll('a').length).toBeGreaterThanOrEqual(2)
  })
})
