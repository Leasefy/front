/**
 * CobranzaTeTocaATi — el tablero de urgencias.
 *
 * Reglas que se protegen acá:
 *  · las celdas cuentan bien: siniestros aparte, el resto por prioridad
 *  · la celda automática es la primera con contenido (siniestros primero,
 *    porque bloquean plata) y trae su leyenda de radicación
 *  · elegir otra celda filtra la lista y la agrupa por tipo de trámite,
 *    SIN pastillas ALTA repetidas (la celda ya dijo la urgencia)
 *  · el tope corta la lista y el botón dice cuántas quedaron ocultas
 *  · sin pendientes → estado vacío honesto (keys i18n)
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const { pendientesMock, reporteMock } = vi.hoisted(() => ({
  pendientesMock: vi.fn(),
  reporteMock: vi.fn(),
}))

vi.mock('@/lib/hooks/cobranza/use-pendientes', () => ({
  usePendientes: () => pendientesMock(),
}))

vi.mock('@/lib/hooks/cobranza/use-daily-report', () => ({
  useDailyReport: () => reporteMock(),
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...(rest as object)}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/ui', () => ({
  Button: ({ children, asChild: _asChild, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => {
    void _asChild
    void rest
    return <span data-testid="boton-mas">{children}</span>
  },
}))

import { CobranzaTeTocaATi } from './CobranzaTeTocaATi'
import type { PendienteItem } from '@/lib/hooks/cobranza/use-pendientes'

const AYER = new Date(Date.now() - 86_400_000).toISOString()

function item(over: Partial<PendienteItem> & Pick<PendienteItem, 'key' | 'grupo'>): PendienteItem {
  return {
    prioridad: 'alta',
    titulo: 'Carlos Andrés Zapata Molina',
    reason: null,
    kind: null,
    montoCop: null,
    dueDate: null,
    fecha: AYER,
    href: '/panel/inmobiliaria/ai/cobranza/pendientes',
    cta: 'revisar',
    ...over,
  }
}

function conPendientes(items: PendienteItem[], extra?: { isLoading?: boolean; error?: string | null }) {
  pendientesMock.mockReturnValue({
    items,
    counts: {},
    isLoading: extra?.isLoading ?? false,
    error: extra?.error ?? null,
    refetch: vi.fn(),
  })
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  reporteMock.mockReturnValue({ data: null })
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.clearAllMocks()
})

function render() {
  act(() => {
    root.render(<CobranzaTeTocaATi enMora={38} gestionados={2} />)
  })
}

function celda(id: string): HTMLButtonElement {
  const el = container.querySelector(`[data-testid="te-toca-celda-${id}"]`)
  expect(el).not.toBeNull()
  return el as HTMLButtonElement
}

const CARTERA: PendienteItem[] = [
  item({ key: 'sin-1', grupo: 'siniestros', titulo: 'María Fernanda Restrepo' }),
  item({ key: 'sin-2', grupo: 'siniestros', titulo: 'Carlos Andrés Zapata' }),
  item({ key: 'carta-1', grupo: 'cartas' }),
  item({ key: 'carta-2', grupo: 'cartas' }),
  item({ key: 'esc-1', grupo: 'escalaciones', titulo: '', reason: 'El agente pidió pasar a una persona' }),
  item({ key: 'ptp-1', grupo: 'promesas', prioridad: 'media', titulo: 'Johan', montoCop: 1_850_000 }),
]

describe('CobranzaTeTocaATi — tablero', () => {
  it('cuenta por celda: siniestros aparte, el resto por prioridad', () => {
    conPendientes(CARTERA)
    render()

    expect(celda('siniestros').textContent).toContain('2')
    expect(celda('alta').textContent).toContain('3')
    expect(celda('media').textContent).toContain('1')
    // La vacía queda deshabilitada y dice «Nada».
    expect(celda('baja').disabled).toBe(true)
    expect(celda('baja').textContent).toContain('Nada')
    // La frase suma TODO lo que espera (siniestros incluidos).
    expect(container.textContent).toContain('6 decisiones esperan tu aprobación.')
  })

  it('arranca en siniestros (bloquean plata) con su leyenda de radicación', () => {
    conPendientes(CARTERA)
    render()

    expect(celda('siniestros').getAttribute('aria-pressed')).toBe('true')
    expect(container.textContent).toContain('Siniestros por firmar')
    expect(container.textContent).toContain('no se radican ante la aseguradora')
    // Las cartas (celda alta) NO están en la lista todavía.
    expect(container.querySelector('[data-testid="te-toca-carta-1"]')).toBeNull()
  })

  it('elegir otra celda filtra la lista y la agrupa por trámite, sin pastillas ALTA', () => {
    conPendientes(CARTERA)
    render()

    act(() => {
      celda('alta').click()
    })

    expect(celda('alta').getAttribute('aria-pressed')).toBe('true')
    expect(container.textContent).toContain('Cartas prejurídicas')
    expect(container.textContent).toContain('Escalaciones')
    expect(container.querySelector('[data-testid="te-toca-carta-1"]')).not.toBeNull()
    // Los siniestros y su leyenda salieron de la lista.
    expect(container.querySelector('[data-testid="te-toca-sin-1"]')).toBeNull()
    expect(container.textContent).not.toContain('no se radican ante la aseguradora')
    // Nada de pastillas de prioridad repetidas por fila.
    expect(container.textContent).not.toContain('ALTA')
  })

  it('sin siniestros, arranca en la primera celda con contenido', () => {
    conPendientes(CARTERA.filter((i) => i.grupo !== 'siniestros'))
    render()

    expect(celda('alta').getAttribute('aria-pressed')).toBe('true')
    expect(container.textContent).not.toContain('no se radican ante la aseguradora')
  })

  it('el tope corta la lista y el botón dice cuántas quedaron ocultas', () => {
    conPendientes(
      Array.from({ length: 8 }, (_, i) =>
        item({ key: `carta-${i}`, grupo: 'cartas', titulo: `Deudor ${i}` }),
      ),
    )
    render()

    expect(container.querySelectorAll('li').length).toBe(6)
    expect(container.textContent).toContain('Ver 2 pendientes más de esta urgencia')
  })

  it('sin pendientes → estado vacío honesto, sin tablero', () => {
    conPendientes([])
    render()

    expect(container.textContent).toContain('Nada espera tu aprobación.')
    expect(container.textContent).toContain('inmobiliaria.ai.cobranza.pendientes.vacio')
    expect(container.querySelector('[data-testid="te-toca-tablero"]')).toBeNull()
  })

  it('mientras carga no afirma nada y no pinta tablero', () => {
    conPendientes([], { isLoading: true })
    render()

    expect(container.textContent).toContain('Contando lo que espera tu aprobación…')
    expect(container.querySelector('[data-testid="te-toca-tablero"]')).toBeNull()
  })

  it('las alertas de umbral van en una línea compacta, no en banner', () => {
    conPendientes(CARTERA)
    reporteMock.mockReturnValue({
      data: {
        alerts: [{ code: 'DELINQUENCY_RATE', level: 'WARNING', message_es: 'Índice de morosidad en 62.22%' }],
      },
    })
    render()

    const alerta = container.querySelector('p[role="alert"]')
    expect(alerta).not.toBeNull()
    expect(alerta?.textContent).toContain('Índice de morosidad')
  })
})
