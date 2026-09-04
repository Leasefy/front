/**
 * CommandPalette — lo que Nico vio abierto el ⌘K y no puede volver a pasar.
 *
 *  1. «Novedades» mostraba la clave cruda del audit log
 *     (`precall.held_for_approval` / `debtor · hace 6h`). Acá se fija que sale
 *     la frase en español y el tiempo bien escrito, y que un evento que nadie
 *     tradujo igual sale humanizado — nunca un slug.
 *  2. El pie decía «↑↓ navegar» y en el estado vacío las flechas no hacían
 *     nada: las acciones rápidas no estaban en la lista navegable. Acá se fija
 *     que ↓ + ↵ abren la SEGUNDA acción rápida.
 *  3. Sin resultados hay una sugerencia, no una pantalla muda.
 *
 * Convención del repo: createRoot + act + happy-dom (sin RTL).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const cerrar = vi.fn()
vi.mock('@/lib/context/CommandPaletteContext', () => ({
  useCommandPalette: () => ({ isOpen: true, open: vi.fn(), close: cerrar }),
}))

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/panel/inmobiliaria',
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    agency: { id: 'agency-1' },
    user: null,
    isAuthenticated: true,
    isLoading: false,
  }),
}))

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({
    permissions: null,
    isLoading: false,
    error: null,
    canAccess: () => true,
    isAdmin: true,
    agencyRole: 'ADMIN',
    refetch: vi.fn(),
  }),
  usePermissionsContextSafe: () => null,
}))

// El stub resuelve contra el es.json REAL: los literales que se afirman abajo
// son los que ve el usuario, no una clave.
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

interface EntradaDeAuditoria {
  id: string
  action: string
  actor_type: string
  actor_id: string | null
  entity_type: string | null
  entity_id: string | null
  ip: string | null
  user_agent: string | null
  occurred_at: string
}

let auditoria: {
  items: EntradaDeAuditoria[]
  isLoading: boolean
  error: string | null
} = { items: [], isLoading: false, error: null }

vi.mock('@/lib/hooks/cobranza/use-audit-log', () => ({
  useAuditLog: () => ({
    ...auditoria,
    isLoadingMore: false,
    hasMore: false,
    loadMore: vi.fn(),
    refetch: vi.fn(),
  }),
}))

interface EstadoDeBusqueda {
  bySource: Record<string, { isLoading: boolean; error: string | null; results: unknown[] }>
  flat: unknown[]
  isAnyLoading: boolean
}

let busqueda: EstadoDeBusqueda = { bySource: {}, flat: [], isAnyLoading: false }

vi.mock('@/lib/hooks/useFederatedSearch', () => ({
  useFederatedSearch: () => busqueda,
}))

// ---------------------------------------------------------------------------
// Sujeto
// ---------------------------------------------------------------------------

import { CommandPalette } from './CommandPalette'

// ---------------------------------------------------------------------------
// Andamio
// ---------------------------------------------------------------------------

let contenedor: HTMLDivElement
let root: Root

function montar() {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
  act(() => {
    root.render(<CommandPalette />)
  })
}

/** El diálogo va a un portal: lo que se ve está en `document.body`. */
function texto(): string {
  return document.body.textContent ?? ''
}

function opciones(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll<HTMLElement>('[role="option"]'))
}

function input(): HTMLInputElement {
  const el = document.body.querySelector<HTMLInputElement>('input[role="combobox"]')
  if (!el) throw new Error('no se encontró el input del buscador')
  return el
}

function tecla(key: string) {
  act(() => {
    input().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })
}

beforeEach(() => {
  push.mockClear()
  cerrar.mockClear()
  auditoria = { items: [], isLoading: false, error: null }
  busqueda = { bySource: {}, flat: [], isAnyLoading: false }
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
  document.body.innerHTML = ''
})

// ---------------------------------------------------------------------------
// Novedades
// ---------------------------------------------------------------------------

describe('Novedades — nunca una clave cruda', () => {
  const hace6h = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()

  function evento(action: string, entity_type: string | null): EntradaDeAuditoria {
    return {
      id: `ev-${action}`,
      action,
      actor_type: 'agent',
      actor_id: null,
      entity_type,
      entity_id: 'x',
      ip: null,
      user_agent: null,
      occurred_at: hace6h,
    }
  }

  it('traduce el evento de la captura y escribe «hace 6 h»', () => {
    auditoria = {
      items: [evento('precall.held_for_approval', 'debtor')],
      isLoading: false,
      error: null,
    }
    montar()

    expect(texto()).toContain('Llamada retenida para aprobación')
    expect(texto()).toContain('deudor · hace 6 h')
    expect(texto()).not.toContain('precall.held_for_approval')
    expect(texto()).not.toContain('debtor ·')
  })

  it('un evento que nadie tradujo sale humanizado, sin puntos ni guiones', () => {
    auditoria = {
      items: [evento('cobranza.algo_totalmente_nuevo', 'una_entidad_nueva')],
      isLoading: false,
      error: null,
    }
    montar()

    expect(texto()).toContain('Cobranza algo totalmente nuevo')
    expect(texto()).toContain('una entidad nueva')
    expect(texto()).not.toContain('cobranza.algo_totalmente_nuevo')
  })

  it('si el feed falla, el grupo entero desaparece (el ⌘K no es un log de errores)', () => {
    auditoria = { items: [], isLoading: false, error: '500' }
    montar()

    expect(texto()).not.toContain('Novedades')
    // Las acciones rápidas siguen ahí: el buscador no se cae con el feed.
    expect(texto()).toContain('Nueva consignación')
  })

  it('sin eventos lo dice, no inventa filas', () => {
    montar()
    expect(texto()).toContain('Novedades')
    expect(texto()).toContain('Sin actividad reciente')
  })
})

// ---------------------------------------------------------------------------
// Teclado en el estado vacío
// ---------------------------------------------------------------------------

describe('estado vacío — el pie no miente', () => {
  it('las acciones rápidas son filas navegables del listbox', () => {
    montar()
    const filas = opciones()
    expect(filas.length).toBe(5)
    expect(filas[0]?.textContent).toContain('Nueva consignación')
    expect(filas[0]?.getAttribute('aria-selected')).toBe('true')
  })

  it('↓ mueve el foco y ↵ abre esa acción', () => {
    montar()
    tecla('ArrowDown')

    expect(opciones()[1]?.getAttribute('aria-selected')).toBe('true')

    tecla('Enter')
    expect(push).toHaveBeenCalledWith('/panel/inmobiliaria/cobros/cobranza')
    expect(cerrar).toHaveBeenCalled()
  })

  it('↑ en la primera fila no se sale de la lista', () => {
    montar()
    tecla('ArrowUp')
    expect(opciones()[0]?.getAttribute('aria-selected')).toBe('true')
  })

  it('no dibuja chevrons (el «>» que no era un control)', () => {
    montar()
    // El chevron venía de un <svg> extra al final de cada fila; una fila
    // navegable tiene exactamente un icono.
    for (const fila of opciones()) {
      expect(fila.querySelectorAll('svg').length).toBe(1)
    }
  })
})

// ---------------------------------------------------------------------------
// Con búsqueda
// ---------------------------------------------------------------------------

describe('con búsqueda', () => {
  function escribir(valor: string) {
    act(() => {
      const el = input()
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set
      setter?.call(el, valor)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }

  it('agrupa por fuente, con el contador, y muestra el contexto a la derecha', () => {
    busqueda = {
      bySource: {
        navegacion: {
          isLoading: false,
          error: null,
          results: [
            {
              id: 'navegacion:1',
              sourceId: 'navegacion',
              type: 'pagina',
              title: 'Cobranza',
              subtitle: 'Cobros',
              badges: [],
              href: '/panel/inmobiliaria/cobros/cobranza',
              preview: {},
            },
            {
              id: 'navegacion:2',
              sourceId: 'navegacion',
              type: 'accion',
              title: 'Nuevo contrato',
              subtitle: 'Contratos',
              badges: [{ label: 'Acción', color: 'violet' }],
              href: '/panel/inmobiliaria/contratos',
              preview: {},
            },
          ],
        },
      },
      flat: [],
      isAnyLoading: false,
    }
    montar()
    escribir('cob')

    expect(texto()).toContain('Navegación')
    expect(texto()).toContain('Cobranza')
    expect(texto()).toContain('Cobros')
    expect(texto()).toContain('Acción')
    expect(opciones().length).toBe(2)
    // El contador del encabezado.
    expect(texto()).toContain('2')
  })

  it('sin resultados dice qué probar', () => {
    busqueda = {
      bySource: { navegacion: { isLoading: false, error: null, results: [] } },
      flat: [],
      isAnyLoading: false,
    }
    montar()
    escribir('zzzz')

    expect(texto()).toContain('Sin resultados para “zzzz”')
    expect(texto()).toContain('Probá con el código, el nombre o el documento.')
  })

  it('mientras carga no dice «sin resultados»', () => {
    busqueda = {
      bySource: { navegacion: { isLoading: true, error: null, results: [] } },
      flat: [],
      isAnyLoading: true,
    }
    montar()
    escribir('zz')

    expect(texto()).not.toContain('Sin resultados')
  })
})
