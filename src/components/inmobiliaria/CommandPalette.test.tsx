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
let abierta = true
vi.mock('@/lib/context/CommandPaletteContext', () => ({
  useCommandPalette: () => ({ isOpen: abierta, open: vi.fn(), close: cerrar }),
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
  details?: unknown
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
  abierta = true
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
  const hace19min = new Date(Date.now() - 19 * 60 * 1000).toISOString()

  function evento(action: string, entity_type: string | null, extra: Partial<EntradaDeAuditoria> = {}): EntradaDeAuditoria {
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
      ...extra,
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
    expect(texto()).toContain('Deudor')
    expect(texto()).toContain('hace 6 h')
    expect(texto()).not.toContain('precall.held_for_approval')
    expect(texto()).not.toContain('debtor')
  })

  it('un evento que nadie tradujo sale humanizado, sin puntos ni guiones', () => {
    auditoria = {
      items: [evento('cobranza.algo_totalmente_nuevo', 'una_entidad_nueva')],
      isLoading: false,
      error: null,
    }
    montar()

    expect(texto()).toContain('Cobranza algo totalmente nuevo')
    expect(texto()).toContain('Una entidad nueva')
    expect(texto()).not.toContain('cobranza.algo_totalmente_nuevo')
  })

  it('la captura del 02-10: cuatro «Piloto retenido por autonomia» son UNA fila, en español y con tilde', () => {
    auditoria = {
      items: [1, 2, 3, 4].map((n) =>
        evento('piloto_retenido_por_autonomia', 'piloto_retencion', { id: `r-${n}`, occurred_at: hace19min }),
      ),
      isLoading: false,
      error: null,
    }
    montar()

    const filas = document.body.querySelectorAll('section[aria-label="Novedades"] li')
    expect(filas.length).toBe(1)
    expect(filas[0]?.textContent).toContain('Acción retenida para tu aprobación')
    expect(filas[0]?.textContent).toContain('Piloto automático · 4 veces')
    expect(filas[0]?.textContent).toContain('hace 19 min')
    expect(texto()).not.toMatch(/autonomia|piloto retencion|Piloto retenido/)
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
  it('las acciones rápidas son filas navegables del listbox, con su línea de apoyo', () => {
    montar()
    const filas = opciones()
    expect(filas.length).toBe(5)
    expect(filas[0]?.textContent).toContain('Nueva consignación')
    expect(filas[0]?.textContent).toContain('Un inmueble nuevo con su propietario')
    expect(filas[1]?.textContent).toContain('Deudores, llamadas y acuerdos de pago')
    expect(filas[0]?.getAttribute('aria-selected')).toBe('true')
  })

  it('el campo anuncia la fila activa (aria-activedescendant) y las filas no van en el Tab', () => {
    montar()
    expect(input().getAttribute('aria-activedescendant')).toBe(opciones()[0]?.id)
    tecla('ArrowDown')
    expect(input().getAttribute('aria-activedescendant')).toBe(opciones()[1]?.id)
    for (const fila of opciones()) expect(fila.getAttribute('tabindex')).toBe('-1')
  })

  it('las cinco acciones siguen yendo a las mismas rutas', () => {
    montar()
    const destinos: string[] = []
    for (let i = 0; i < 5; i++) {
      act(() => opciones()[i]!.click())
      destinos.push(push.mock.calls.at(-1)?.[0] as string)
    }
    expect(destinos).toEqual([
      '/panel/inmobiliaria/inmuebles/nuevo',
      '/panel/inmobiliaria/pagos/cobranza',
      '/panel/inmobiliaria/postulaciones/asegurabilidad',
      '/panel/inmobiliaria/reportes',
      '/panel/inmobiliaria/inmuebles',
    ])
  })

  it('↓ mueve el foco y ↵ abre esa acción', () => {
    montar()
    tecla('ArrowDown')

    expect(opciones()[1]?.getAttribute('aria-selected')).toBe('true')

    tecla('Enter')
    expect(push).toHaveBeenCalledWith('/panel/inmobiliaria/pagos/cobranza')
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
              href: '/panel/inmobiliaria/pagos/cobranza',
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
    // Lo escrito se resalta en el título, sin importar mayúsculas.
    const marcas = Array.from(opciones()[0]!.querySelectorAll('mark')).map((m) => m.textContent)
    expect(marcas).toEqual(['Cob'])
    expect(opciones()[1]!.querySelectorAll('mark').length).toBe(0)
  })

  it('sin resultados dice qué probar', () => {
    busqueda = {
      bySource: { navegacion: { isLoading: false, error: null, results: [] } },
      flat: [],
      isAnyLoading: false,
    }
    montar()
    escribir('zzzz')

    expect(document.body.querySelector('[data-testid="cp-sin-resultados"]')).toBeTruthy()
    expect(texto()).toContain('Sin resultados para “zzzz”')
    expect(texto()).toContain('Prueba con el código, el nombre o el documento.')
  })

  it('mientras carga no dice «sin resultados»: filas fantasma y el hilo bajo el campo', () => {
    busqueda = {
      bySource: { navegacion: { isLoading: true, error: null, results: [] } },
      flat: [],
      isAnyLoading: true,
    }
    montar()
    escribir('zz')

    expect(texto()).not.toContain('Sin resultados')
    expect(document.body.querySelector('[data-testid="cp-cargando"]')).toBeTruthy()
    expect(document.body.querySelector('[data-testid="cp-buscando"]')).toBeTruthy()
    expect(texto()).toContain('Buscando…')
  })
})

// ---------------------------------------------------------------------------
// Abrir y cerrar (framer-motion, Nico 02-10: «cada interacción con su animación»)
// ---------------------------------------------------------------------------

describe('abrir y cerrar', () => {
  /** `skipAnimations` (vitest.setup) termina la salida en el próximo cuadro. */
  async function dejarTerminarLaSalida() {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60))
    })
  }

  it('el velo y la caja son de framer; un clic en el velo cierra', () => {
    montar()
    const velo = document.body.querySelector<HTMLElement>('[data-testid="cp-velo"]')
    expect(velo).toBeTruthy()
    expect(document.body.querySelector('[data-testid="cp-caja"]')).toBeTruthy()
    act(() => velo!.click())
    expect(cerrar).toHaveBeenCalled()
  })

  it('una sola ✕, la del producto (Cadence no pinta la suya sobre el marco)', () => {
    montar()
    expect(document.body.querySelectorAll('[data-testid="dialog-close"]').length).toBe(1)
  })

  it('al cerrar, la caja SALE y recién entonces se desmonta y se borra lo escrito', async () => {
    montar()
    act(() => {
      const el = input()
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set?.call(el, 'cob')
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(input().value).toBe('cob')

    abierta = false
    act(() => root.render(<CommandPalette />))
    // Saliendo: el diálogo sigue montado y la lista no cambió a mitad del fundido.
    expect(document.body.querySelector('[role="dialog"]')).toBeTruthy()
    expect(document.body.querySelector<HTMLInputElement>('input[role="combobox"]')?.value).toBe('cob')
    await dejarTerminarLaSalida()
    expect(document.body.querySelector('[data-testid="cp-caja"]')).toBeNull()
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()

    // Al volver a abrir, el campo arranca vacío.
    abierta = true
    act(() => root.render(<CommandPalette />))
    expect(input().value).toBe('')
  })
})
