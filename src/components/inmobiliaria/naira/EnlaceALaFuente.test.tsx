/**
 * @vitest-environment happy-dom
 *
 * EnlaceALaFuente — drill-down por mapa cerrado, con la etiqueta y el gate del destino (D13-7, FG13-6, UI-SPEC §6.2).
 * Popover plano (molde PilotoModoHeader.test.tsx:56-61): lo que se prueba es que la referencia técnica vive SOLO en el
 * contenido del popover y nunca en un href.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

import { RUTA_DE_LA_METRICA, RUTA_POR_FUENTE, rutaDeLaMetrica } from '@/lib/naira/fuente-a-ruta'

import { EnlaceALaFuente, type FuenteDelDato } from './EnlaceALaFuente'
import { ProveedorDeOrigen } from './OrigenDeNaira'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const RUTAS_CERRADAS = new Set(
  [...Object.values(RUTA_DE_LA_METRICA), ...Object.values(RUTA_POR_FUENTE)].filter((r): r is string => typeof r === 'string'),
)

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  permisos.permitido.mockReset()
  permisos.permitido.mockImplementation(() => true)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function montar(de: FuenteDelDato, referenciaTecnica?: string, origen: 'agente' | 'ejemplo' = 'agente'): void {
  act(() => {
    root.render(
      <ProveedorDeOrigen origen={origen}>
        <EnlaceALaFuente de={de} referenciaTecnica={referenciaTecnica} />
      </ProveedorDeOrigen>,
    )
  })
}

const estadoDelEnlace = () => container.querySelector('[data-naira-enlace]')?.getAttribute('data-naira-enlace')

describe('<EnlaceALaFuente>', () => {
  it('[N13:control-positivo] una métrica del mapa enlaza a su pantalla con la palabra del panel y el gate de su módulo', () => {
    montar({ kind: 'metrica', metricId: 'cartera.morosidad_rate' })
    const enlaces = container.querySelectorAll('a')
    expect(enlaces).toHaveLength(1)
    expect(enlaces[0]?.getAttribute('href')).toBe(rutaDeLaMetrica('cartera.morosidad_rate'))
    expect(enlaces[0]?.textContent).toContain('Ver en Cartera')
    expect(estadoDelEnlace()).toBe('activo')
    expect(permisos.permitido).toHaveBeenCalledWith('cobros', 'view')
  })

  it('[N13:sin-href-del-agente] todo href visto es de los mapas cerrados; los ids hostiles no pintan enlace', () => {
    const validas: FuenteDelDato[] = [
      { kind: 'metrica', metricId: 'cartera.morosidad_rate' },
      { kind: 'metrica', metricId: 'portafolio.vacancy_rate' },
      { kind: 'metrica', metricId: 'prospectos.leads_sin_contacto_count' },
      { kind: 'fuente', fuente: 'agent.debtors' },
      { kind: 'fuente', fuente: 'public.consignaciones' },
    ]
    const hostiles: FuenteDelDato[] = [
      { kind: 'metrica', metricId: 'https://evil.test' },
      { kind: 'metrica', metricId: 'javascript:alert(1)' },
      { kind: 'metrica', metricId: 'constructor' },
      { kind: 'metrica', metricId: '/panel/inmobiliaria/pagos' },
      { kind: 'metrica', metricId: 'cartera.morosidad_rate/../x' },
      { kind: 'fuente', fuente: 'https://evil.test' },
      { kind: 'fuente', fuente: '__proto__' },
      { kind: 'fuente', fuente: '/panel/inmobiliaria/inmuebles' },
    ]
    let vistos = 0
    for (const de of [...validas, ...hostiles]) {
      montar(de, 'https://evil.test/x')
      const hrefs = [...container.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') ?? '')
      vistos += hrefs.length
      for (const href of hrefs) {
        expect(RUTAS_CERRADAS.has(href), JSON.stringify(de) + ' ⇒ ' + href).toBe(true)
        expect(href, JSON.stringify(de)).not.toContain('evil')
      }
      if (hostiles.includes(de)) {
        expect(container.querySelector('a'), JSON.stringify(de)).toBeNull()
        expect(estadoDelEnlace(), JSON.stringify(de)).toBe('sin-ruta')
      } else {
        expect(hrefs, JSON.stringify(de)).toHaveLength(1)
      }
    }
    // Control: el recorrido vio enlaces de verdad (uno por cada válida).
    expect(vistos).toBe(validas.length)
  })

  it('[N13:enlace-sin-permiso] sin permiso del módulo destino no hay enlace y se dice por qué', () => {
    permisos.permitido.mockImplementation((modulo: string) => modulo !== 'cobros')
    montar({ kind: 'metrica', metricId: 'cartera.morosidad_rate' })
    expect(container.querySelector('a')).toBeNull()
    expect(container.textContent).toContain('Tu rol no puede abrir Cartera')
    expect(estadoDelEnlace()).toBe('sin-permiso')
  })

  it('[N13:simulado-visible] con datos de ejemplo el enlace queda inactivo y lo dice', () => {
    montar({ kind: 'metrica', metricId: 'cartera.morosidad_rate' }, undefined, 'ejemplo')
    expect(container.querySelector('a')).toBeNull()
    expect(container.textContent).toContain('Enlace inactivo: datos de ejemplo')
    expect(estadoDelEnlace()).toBe('inactivo-ejemplo')
  })

  it('[N13:fuente-sin-ruta] una fuente sin pantalla (B-5) o una métrica desconocida dicen que no hay pantalla', () => {
    for (const de of [
      { kind: 'fuente', fuente: 'agent.agency_members' },
      { kind: 'metrica', metricId: 'metrica.inexistente' },
    ] as const) {
      montar(de)
      expect(container.querySelector('a'), JSON.stringify(de)).toBeNull()
      expect(container.textContent, JSON.stringify(de)).toContain('Esta fuente no tiene una pantalla en el panel')
      expect(estadoDelEnlace(), JSON.stringify(de)).toBe('sin-ruta')
    }
  })

  it('[N13:referencia-tecnica] la fuente cruda vive solo en el popover, detrás de un botón con nombre', () => {
    montar({ kind: 'metrica', metricId: 'cartera.morosidad_rate' }, 'agent.debtor_states')
    const popover = container.querySelector('[data-testid="popover"]')
    expect(popover?.textContent).toContain('agent.debtor_states')
    expect(popover?.textContent).toContain('Referencia técnica')
    const copia = container.cloneNode(true) as HTMLElement
    copia.querySelector('[data-testid="popover"]')?.remove()
    expect(copia.textContent).not.toContain('agent.debtor_states')
    expect(copia.innerHTML).not.toContain('agent.debtor_states')
    const boton = container.querySelector('button[aria-label="Ver la referencia técnica"]')
    expect(boton).not.toBeNull()

    montar({ kind: 'metrica', metricId: 'cartera.morosidad_rate' })
    expect(container.querySelector('button')).toBeNull()
    expect(container.querySelector('[data-testid="popover"]')).toBeNull()
  })
})
