/**
 * CobranzaTeTocaATi — el tablero de urgencias (encerradito, todo visible).
 *
 * Reglas que se protegen acá:
 *  · las columnas cuentan bien: siniestros aparte, el resto por prioridad
 *  · TODO visible a la vez — nada se esconde detrás de un clic (pedido
 *    explícito de Nico: «con tooodas las alertas»)
 *  · dentro de cada columna, el que más lleva esperando va arriba
 *  · la columna de siniestros trae su leyenda de radicación; la vacía dice
 *    «Nada pendiente»
 *  · sin pastillas ALTA repetidas (la columna ya dice la urgencia)
 *  · sin pendientes → estado vacío honesto (keys i18n); cargando → sin
 *    afirmaciones falsas
 *  · el título «Te toca a ti» y la frase viven DENTRO del recuadro, como
 *    primera fila (Nico, 2026-09-03: «debería estar dentro del tablero»)
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

const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString()

function item(over: Partial<PendienteItem> & Pick<PendienteItem, 'key' | 'grupo'>): PendienteItem {
  return {
    prioridad: 'alta',
    titulo: 'Carlos Andrés Zapata Molina',
    reason: null,
    kind: null,
    montoCop: null,
    dueDate: null,
    fecha: hace(1),
    href: '/panel/inmobiliaria/cobros/cobranza/pendientes',
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

function columna(id: string): HTMLElement {
  const el = container.querySelector(`[data-testid="te-toca-col-${id}"]`)
  expect(el).not.toBeNull()
  return el as HTMLElement
}

const CARTERA: PendienteItem[] = [
  item({ key: 'sin-1', grupo: 'siniestros', titulo: 'María Fernanda Restrepo', fecha: hace(22) }),
  item({ key: 'sin-2', grupo: 'siniestros', titulo: 'Nicolás García', fecha: hace(20) }),
  item({ key: 'carta-1', grupo: 'cartas', fecha: hace(15) }),
  item({ key: 'carta-2', grupo: 'cartas', fecha: hace(17) }),
  item({ key: 'esc-1', grupo: 'escalaciones', titulo: '', reason: 'El agente pidió pasar a una persona', fecha: hace(1) }),
  item({ key: 'hilo-1', grupo: 'conversaciones', titulo: 'María Fernanda', reason: 'no puedo pagar este mes', fecha: hace(2) }),
  item({ key: 'ptp-1', grupo: 'promesas', prioridad: 'media', titulo: 'Johan', montoCop: 1_850_000, fecha: hace(0) }),
]

describe('CobranzaTeTocaATi — tablero encerrado', () => {
  it('cuenta por columna: siniestros aparte, el resto por prioridad', () => {
    conPendientes(CARTERA)
    render()

    expect(columna('siniestros').textContent).toContain('2')
    expect(columna('alta').textContent).toContain('4')
    expect(columna('media').textContent).toContain('1')
    expect(columna('baja').textContent).toContain('Nada pendiente')
    expect(container.textContent).toContain('7 decisiones esperan tu aprobación.')
  })

  it('el título y la frase son la primera fila DEL tablero, no un encabezado suelto', () => {
    conPendientes(CARTERA)
    render()

    const tablero = container.querySelector('[data-testid="te-toca-tablero"]') as HTMLElement
    expect(tablero).not.toBeNull()
    const h2 = tablero.querySelector('h2')
    expect(h2?.textContent).toBe('Te toca a ti')
    // Primera fila del recuadro: el título va antes que cualquier columna.
    expect(tablero.firstElementChild?.contains(h2)).toBe(true)
    expect(tablero.firstElementChild?.textContent).toContain('7 decisiones esperan tu aprobación.')
    expect(tablero.firstElementChild?.textContent).toContain('El agente gestionó 2 de tus 38 casos en mora hoy.')
    // Fuera del recuadro no queda ningún h2 huérfano.
    expect(container.querySelectorAll('h2').length).toBe(1)
    // Y la sección se nombra por ese título (a11y).
    const section = container.querySelector('[data-testid="cobranza-te-toca"]')
    expect(section?.getAttribute('aria-labelledby')).toBe(h2?.id)
  })

  it('TODO visible a la vez: siniestros, cartas y promesas en el mismo render', () => {
    conPendientes(CARTERA)
    render()

    for (const key of ['sin-1', 'sin-2', 'carta-1', 'carta-2', 'esc-1', 'hilo-1', 'ptp-1']) {
      expect(container.querySelector(`[data-testid="te-toca-${key}"]`), key).not.toBeNull()
    }
    // Y todo dentro de UN recuadro.
    const tablero = container.querySelector('[data-testid="te-toca-tablero"]')
    expect(tablero).not.toBeNull()
    expect(tablero?.querySelectorAll('[data-testid^="te-toca-col-"]').length).toBe(4)
  })

  it('dentro de la columna, el que más lleva esperando va arriba', () => {
    conPendientes(CARTERA)
    render()

    const fichas = [...columna('alta').querySelectorAll('[data-testid^="te-toca-"]')]
      .map((el) => el.getAttribute('data-testid'))
      .filter((id) => id !== 'te-toca-col-alta')
    // 17d > 15d > 2d > 1d
    expect(fichas).toEqual(['te-toca-carta-2', 'te-toca-carta-1', 'te-toca-hilo-1', 'te-toca-esc-1'])
  })

  it('la columna de siniestros trae su leyenda; el motivo textual acompaña la ficha', () => {
    conPendientes(CARTERA)
    render()

    expect(columna('siniestros').textContent).toContain('no se radican ante la aseguradora')
    // El último mensaje del deudor viaja con la ficha de WhatsApp.
    expect(columna('alta').textContent).toContain('no puedo pagar este mes')
    // La promesa muestra el monto.
    expect(columna('media').textContent).toContain('1.850.000')
    // Nada de pastillas de prioridad repetidas por ficha.
    expect(container.textContent).not.toContain('ALTA')
  })

  it('el pie enlaza a la pantalla de pendientes con el total', () => {
    conPendientes(CARTERA)
    render()

    expect(container.textContent).toContain('Ver los 7 pendientes')
  })

  it('sin pendientes → estado vacío honesto dentro del recuadro, sin columnas ni pie', () => {
    conPendientes([])
    render()

    const tablero = container.querySelector('[data-testid="te-toca-tablero"]') as HTMLElement
    expect(tablero).not.toBeNull()
    expect(tablero.querySelector('h2')?.textContent).toBe('Te toca a ti')
    expect(tablero.textContent).toContain('Nada espera tu aprobación.')
    expect(tablero.textContent).toContain('inmobiliaria.ai.cobranza.pendientes.vacio')
    expect(tablero.querySelectorAll('[data-testid^="te-toca-col-"]').length).toBe(0)
    expect(container.querySelector('[data-testid="boton-mas"]')).toBeNull()
  })

  it('mientras carga no afirma nada y no pinta columnas', () => {
    conPendientes([], { isLoading: true })
    render()

    const tablero = container.querySelector('[data-testid="te-toca-tablero"]') as HTMLElement
    expect(tablero).not.toBeNull()
    expect(tablero.textContent).toContain('Contando lo que espera tu aprobación…')
    expect(tablero.textContent).not.toContain('Nada espera tu aprobación.')
    expect(tablero.querySelectorAll('[data-testid^="te-toca-col-"]').length).toBe(0)
    expect(container.querySelector('[data-testid="boton-mas"]')).toBeNull()
  })

  it('las alertas de umbral van al pie del tablero, en una línea', () => {
    conPendientes(CARTERA)
    reporteMock.mockReturnValue({
      data: {
        alerts: [{ code: 'DELINQUENCY_RATE', level: 'WARNING', message_es: 'Índice de morosidad en 62.22%' }],
      },
    })
    render()

    const alerta = container.querySelector('[data-testid="te-toca-tablero"] p[role="alert"]')
    expect(alerta).not.toBeNull()
    expect(alerta?.textContent).toContain('Índice de morosidad')
  })
})
