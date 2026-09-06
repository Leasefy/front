/**
 * El catálogo de procesos: la tabla que responde «¿qué corre acá?».
 *
 * Lo que se fija es la honestidad de la columna «Última señal» —un proceso
 * sin huella dice «No disponible» y el porqué, nunca una fecha— y que los
 * tres cortes (área, modo y buscador) filtren de verdad sobre datos reales.
 */

import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, string>) => (vars ? `${k}(${Object.values(vars).join(',')})` : k),
    locale: 'es',
  }),
}))
vi.mock('@/components/inmobiliaria/ai/ColaHumana', () => ({ relativeTime: () => 'hace 3 s' }))
// `@/components/ui/table` reexporta las primitivas de cadence, así que el
// mock tiene que traerlas todas: si falta una, React recibe `undefined` y la
// tabla entera explota con «Element type is invalid».
vi.mock('@leasefy/cadence', () => {
  // Definido DENTRO de la fábrica: `vi.mock` se iza al tope del archivo y una
  // constante de módulo todavía no existe cuando corre.
  const paso = (tag: string) =>
    function Paso({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) {
      return React.createElement(tag, props as object, children as React.ReactNode)
    }
  return {
  Chip: ({ children, selected, onClick, ...props }: Record<string, unknown> & { children?: React.ReactNode; selected?: boolean; onClick?: () => void }) => {
    const { size, icon, ...rest } = props
    void size
    void icon
    return (
      <button type="button" aria-pressed={Boolean(selected)} onClick={onClick} {...(rest as object)}>
        {children}
      </button>
    )
  },
  Table: paso('table'),
  THead: paso('thead'),
  TFoot: paso('tfoot'),
  TBody: paso('tbody'),
  TH: paso('th'),
  TR: paso('tr'),
  TD: paso('td'),
  Input: paso('input'),
  Pagination: paso('div'),
  MonoLabel: paso('span'),
  }
})
vi.mock('@/components/estado/EstadoDeDatos', () => ({
  EstadoDeDatos: ({ cargando, esqueleto, children }: { cargando: boolean; esqueleto?: React.ReactNode; children?: React.ReactNode }) =>
    cargando ? <div>{esqueleto}</div> : <div>{children}</div>,
}))
vi.mock('@/components/estado/SinDatos', () => ({
  SinDatos: ({ titulo, descripcion }: { titulo: string; descripcion?: string }) => (
    <div data-testid="sin-datos">
      {titulo} {descripcion}
    </div>
  ),
}))
vi.mock('@/components/estado/EsqueletoTabla', () => ({ EsqueletoTabla: () => <div data-testid="esqueleto" /> }))
vi.mock('@/components/ui/pagination', () => ({
  TablePagination: ({ total }: { total: number }) => <div data-testid="pagination">{total}</div>,
}))
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, hideArrow, variant, size, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
    void asChild
    void hideArrow
    void variant
    void size
    return <button {...(props as object)}>{children}</button>
  },
}))
vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...(props as object)} />,
}))

import { PilotoCatalogo } from './PilotoCatalogo'
import type { PilotoCatalogoResponse, ProcesoDelCatalogo } from '@/lib/api/piloto'

function proceso(extra: Partial<ProcesoDelCatalogo>): ProcesoDelCatalogo {
  return {
    clave: 'x',
    id: 'algun-cron',
    nombre: 'Un proceso',
    queHace: 'Hace algo.',
    area: 'dinero',
    quien: { tipo: 'sistema', agente: null, etiqueta: 'El ERP' },
    modo: null,
    modoGobierna: false,
    corre: true,
    porQueNoCorre: null,
    disparador: 'Todos los días.',
    fuente: null,
    ultima: null,
    sinDato: 'Este proceso todavía no dejó nada en esta inmobiliaria.',
    enlace: null,
    ...extra,
  }
}

const DATA: PilotoCatalogoResponse = {
  procesos: [
    proceso({
      clave: 'cobros.generacion',
      nombre: 'Generar los cobros del periodo',
      area: 'dinero',
      ultima: { at: '2026-09-04T05:08:07.000-05:00', que: '38 cobros generados' },
      sinDato: null,
      fuente: 'public.cobros',
      enlace: { label: 'Ver los cobros', href: '/panel/inmobiliaria/cobros' },
    }),
    proceso({
      clave: 'cobranza.preparar',
      nombre: 'Preparar las llamadas del día',
      queHace: 'Elige a quién llamar y arma el guion.',
      area: 'dinero',
      quien: { tipo: 'agente', agente: 'cobranza', etiqueta: 'Laura · cobranza' },
      modo: 'autonomo',
      modoGobierna: true,
    }),
    proceso({
      clave: 'retencion.barrido',
      nombre: 'Detectar al que se va a ir',
      area: 'operacion',
      quien: { tipo: 'agente', agente: 'retencion', etiqueta: 'Vinci · retención' },
      modo: 'sombra',
      corre: false,
      porQueNoCorre: 'El interruptor RETENCION_ENABLED está apagado en el servidor.',
    }),
    proceso({ clave: 'migracion.terceros', nombre: 'Migrar propietarios e inquilinos', area: 'plataforma' }),
  ],
  totales: { total: 4, corriendo: 3, conSenal: 1, sinDato: 3 },
  porArea: { dinero: 2, operacion: 1, captacion: 0, plataforma: 1 },
  activo: true,
  tomadoAt: '2026-09-04T15:00:00Z',
}

let container: HTMLDivElement
let root: Root
function render(props: Partial<React.ComponentProps<typeof PilotoCatalogo>> = {}) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      <PilotoCatalogo data={DATA} isLoading={false} error={null} notAvailable={false} {...props} />,
    )
  })
}

const filas = () => Array.from(container.querySelectorAll('[data-testid="catalogo-fila"]'))
const claves = () => filas().map((f) => f.getAttribute('data-clave'))
const clic = (sel: string) => {
  const el = container.querySelector(sel) as HTMLElement | null
  if (!el) throw new Error(`no existe ${sel}`)
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('la tabla no inventa', () => {
  it('un proceso con huella muestra la fecha, lo contado y de qué tabla salió', () => {
    render()
    const fila = filas().find((f) => f.getAttribute('data-clave') === 'cobros.generacion')
    expect(fila?.textContent).toContain('hace 3 s')
    expect(fila?.textContent).toContain('38 cobros generados')
    expect(fila?.textContent).toContain('public.cobros')
  })

  it('un proceso sin huella dice «no disponible» y el porqué, sin fecha', () => {
    render()
    const fila = filas().find((f) => f.getAttribute('data-clave') === 'cobranza.preparar')
    expect(fila?.textContent).toContain('noDisponible')
    expect(fila?.textContent).toContain('todavía no dejó nada')
    expect(fila?.textContent).not.toContain('hace 3 s')
  })

  it('el proceso apagado se marca y dice qué interruptor lo apaga', () => {
    render()
    const fila = filas().find((f) => f.getAttribute('data-clave') === 'retencion.barrido')
    expect(fila?.querySelector('[data-testid="catalogo-apagado"]')).not.toBeNull()
    expect(fila?.textContent).toContain('RETENCION_ENABLED')
  })

  it('un modo que todavía no gobierna la ejecución se dice, en vez de fingir control', () => {
    render()
    const manda = filas().find((f) => f.getAttribute('data-clave') === 'cobranza.preparar')
    expect(manda?.querySelector('[data-testid="catalogo-modo-no-manda"]')).toBeNull()
    const noManda = filas().find((f) => f.getAttribute('data-clave') === 'retencion.barrido')
    expect(noManda?.querySelector('[data-testid="catalogo-modo-chip"]')).not.toBeNull()
    expect(noManda?.querySelector('[data-testid="catalogo-modo-no-manda"]')).not.toBeNull()
  })

  it('el proceso del sistema no muestra chip de modo', () => {
    render()
    const fila = filas().find((f) => f.getAttribute('data-clave') === 'migracion.terceros')
    expect(fila?.querySelector('[data-testid="catalogo-modo-chip"]')).toBeNull()
    expect(fila?.textContent).toContain('sinModo')
  })

  it('el enlace apunta a la pantalla real del proceso', () => {
    render()
    const fila = filas().find((f) => f.getAttribute('data-clave') === 'cobros.generacion')
    expect(fila?.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/cobros')
  })
})

describe('los tres cortes filtran de verdad', () => {
  it('por área', () => {
    render()
    expect(filas()).toHaveLength(4)
    clic('[data-testid="catalogo-area-operacion"]')
    expect(claves()).toEqual(['retencion.barrido'])
  })

  it('por modo, y «sin modo» son los del sistema', () => {
    render()
    clic('[data-testid="catalogo-modo-autonomo"]')
    expect(claves()).toEqual(['cobranza.preparar'])
    clic('[data-testid="catalogo-modo-sistema"]')
    expect(claves()).toEqual(['cobros.generacion', 'migracion.terceros'])
  })

  it('el buscador mira el nombre y lo que hace', () => {
    render()
    const input = container.querySelector('[data-testid="catalogo-buscar"]') as HTMLInputElement
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
      setter?.call(input, 'guion')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(claves()).toEqual(['cobranza.preparar'])
  })

  it('limpiar devuelve la lista entera', () => {
    render()
    clic('[data-testid="catalogo-area-captacion"]')
    expect(filas()).toHaveLength(0)
    clic('[data-testid="catalogo-limpiar"]')
    expect(filas()).toHaveLength(4)
  })

  it('el vacío por filtro no es el mismo que «no pudimos consultar»', () => {
    render({ data: null, notAvailable: true })
    expect(container.querySelector('[data-testid="sin-datos"]')?.textContent).toContain('sinFuente')
  })
})

describe('la tabla es una tabla del panel', () => {
  it('tiene encabezados y paginación', () => {
    render()
    expect(container.querySelectorAll('th').length).toBeGreaterThan(4)
    expect(container.querySelector('[data-testid="pagination"]')?.textContent).toBe('4')
  })

  it('mientras carga muestra el esqueleto de tabla, no una lista vacía', () => {
    render({ data: null, isLoading: true })
    expect(container.querySelector('[data-testid="esqueleto"]')).not.toBeNull()
  })
})
