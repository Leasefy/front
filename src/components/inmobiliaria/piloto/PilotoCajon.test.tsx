/**
 * El cajón del Piloto.
 *
 * Lo que se protege acá son las reglas que ya nos costaron caro en esta
 * pantalla, no el diseño:
 *
 *  1. **Cero botones muertos.** El botón de acción sólo existe si el micro
 *     declaró la acción (`acciones[]`), y nunca para un VIEWER — a quien el
 *     micro le respondería 403.
 *  2. **«No se pudo consultar» NO es «no hay nada».** Un 404 se dice con
 *     palabras; jamás con un cajón vacío que parezca un caso sin información.
 *  3. **Una alerta del tablero no se le pide al micro.** Es una regla sobre
 *     números, no una fila: pedirla daría 404. Se pinta con lo que ya trae.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { estado } = vi.hoisted(() => ({
  estado: {
    detalle: null as unknown,
    isLoading: false,
    error: null as string | null,
    notAvailable: false,
    rol: 'OWNER' as string | null,
    accionesCorridas: [] as unknown[],
  },
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
  useOptionalI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({ agencyRole: estado.rol, isAdmin: true }),
}))

const usePilotoDetalleMock = vi.fn(() => ({
  data: estado.detalle,
  isLoading: estado.isLoading,
  error: estado.error,
  notAvailable: estado.notAvailable,
  refetch: async () => {},
}))
vi.mock('@/lib/hooks/piloto/use-piloto-detalle', () => ({
  usePilotoDetalle: (...a: unknown[]) => usePilotoDetalleMock(...(a as [])),
}))

vi.mock('@/lib/api/piloto', () => ({
  runInboxAccion: async (accion: unknown) => {
    estado.accionesCorridas.push(accion)
    return { ok: true }
  },
}))

vi.mock('sonner', () => ({ toast: { success: () => {}, error: () => {} } }))

vi.mock('@/components/inmobiliaria/ai/ColaHumana', () => ({
  relativeTime: () => 'hace 2 h',
}))

vi.mock('@/lib/format', () => ({ formatCurrency: (n: number) => `$${n}` }))

import { PilotoCajon, type PilotoApertura } from './PilotoCajon'

const DETALLE = {
  id: 'esc:e-1',
  fuente: 'escalacion',
  agente: 'cobranza',
  titulo: 'Escalación de cobranza',
  subtitulo: 'El deudor pidió hablar con una persona',
  prioridad: 'alta' as const,
  desde: '2026-08-30T14:00:00-05:00',
  contexto: [
    { titulo: 'La escalación', filas: [{ label: 'Motivo', valor: 'Pidió una persona' }] },
  ],
  traza: [{ at: '2026-08-30T14:00:00-05:00', titulo: 'Se creó la escalación' }],
  acciones: [
    { label: 'Tomar el caso', method: 'POST' as const, path: '/api/x/claim', body: {} },
  ],
  enlaces: [] as unknown[],
}

let container: HTMLDivElement
let root: Root

function render(
  apertura: PilotoApertura | null,
  onAbrirItem: (id: string) => void = () => {},
) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      <PilotoCajon apertura={apertura} onClose={() => {}} onAbrirItem={onAbrirItem} />,
    )
  })
}

/** El Sheet de Radix se monta en un portal: hay que mirar todo el body. */
const texto = () => document.body.textContent ?? ''
/**
 * Lo clicable del cajón. Se consulta por ROL y no por etiqueta: el `ListRow`
 * del DS es un `div role="button"` (con tabIndex y teclado), así que buscar
 * `<button>` dejaría fuera filas que el usuario sí puede accionar.
 */
const botones = () => [
  ...document.body.querySelectorAll<HTMLElement>('button, [role="button"]'),
]

beforeEach(() => {
  estado.detalle = null
  estado.isLoading = false
  estado.error = null
  estado.notAvailable = false
  estado.rol = 'OWNER'
  estado.accionesCorridas = []
  usePilotoDetalleMock.mockClear()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('PilotoCajon — modo ítem', () => {
  it('pinta el contexto, la traza y la acción declarada por el micro', () => {
    estado.detalle = DETALLE
    render({ tipo: 'item', id: 'esc:e-1' })
    expect(texto()).toContain('Escalación de cobranza')
    expect(texto()).toContain('La escalación')
    expect(texto()).toContain('Se creó la escalación')
    expect(document.querySelector('[data-testid="piloto-cajon-accion-0"]')).not.toBeNull()
  })

  it('sin acciones declaradas NO dibuja ningún botón de acción', () => {
    // Cero botones muertos: un plan de pago no se aprueba de un clic porque
    // el endpoint exige el token de concurrencia. Si el micro no la declara,
    // acá no se inventa.
    estado.detalle = { ...DETALLE, acciones: [] }
    render({ tipo: 'item', id: 'plan:p-1' })
    expect(document.querySelector('[data-testid="piloto-cajon-accion-0"]')).toBeNull()
  })

  it('a un VIEWER no se le dibuja la acción (el micro le daría 403)', () => {
    estado.detalle = DETALLE
    estado.rol = 'VIEWER'
    render({ tipo: 'item', id: 'esc:e-1' })
    expect(document.querySelector('[data-testid="piloto-cajon-accion-0"]')).toBeNull()
  })

  it('ejecuta la acción VERBATIM: método, path y cuerpo salen del micro', async () => {
    estado.detalle = DETALLE
    render({ tipo: 'item', id: 'esc:e-1' })
    const boton = document.querySelector(
      '[data-testid="piloto-cajon-accion-0"]',
    ) as HTMLButtonElement
    // `act` asíncrono: el clic dispara un estado que se resuelve en una
    // microtarea (el `finally` que apaga el spinner).
    await act(async () => {
      boton.click()
    })
    expect(estado.accionesCorridas).toEqual([
      { label: 'Tomar el caso', method: 'POST', path: '/api/x/claim', body: {} },
    ])
  })

  it('un 404 dice que el caso ya no está — no un cajón vacío', () => {
    estado.notAvailable = true
    render({ tipo: 'item', id: 'esc:e-1' })
    expect(texto()).toContain('sinFuenteTitulo')
  })

  it('un error ofrece reintentar', () => {
    estado.error = 'boom'
    render({ tipo: 'item', id: 'esc:e-1' })
    expect(texto()).toContain('errorTitulo')
    expect(texto()).toContain('reintentar')
  })
})

describe('PilotoCajon — modo alerta', () => {
  const ALERTA = {
    id: 'promesas-incumplidas',
    severidad: 'alta' as const,
    titulo: '3 promesas de pago vencidas',
    detalle: 'El deudor se comprometió y la fecha pasó.',
    href: '/panel/inmobiliaria/ai/cobranza/pagos',
    items: [
      { id: 'prom:p-1', titulo: '$250.000 — Ana R.', desde: '2026-08-25T10:00:00-05:00' },
      { id: 'prom:p-2', titulo: '$800.000 — Luis M.' },
    ],
  }

  it('NO le pide el detalle al micro: una alerta es una regla, no una fila', () => {
    render({ tipo: 'alerta', alerta: ALERTA })
    // El hook se llama igual (es un hook), pero con `null`: no hay petición.
    expect(usePilotoDetalleMock).toHaveBeenCalledWith(null)
  })

  it('lista los casos que sostienen el número y cada uno abre su cajón', () => {
    const abiertos: string[] = []
    render({ tipo: 'alerta', alerta: ALERTA }, (id) => {
      abiertos.push(id)
    })
    expect(texto()).toContain('$250.000 — Ana R.')
    const caso = botones().find((b) => b.textContent?.includes('$800.000'))
    expect(caso).toBeDefined()
    act(() => {
      caso?.click()
    })
    expect(abiertos).toEqual(['prom:p-2'])
  })

  it('sin lista NO afirma que no hay casos', () => {
    // El número del título se midió aparte; decir «no hay» sería falso.
    render({ tipo: 'alerta', alerta: { ...ALERTA, items: undefined } })
    expect(texto()).toContain('3 promesas de pago vencidas')
    expect(texto()).toContain('sinCasos')
  })
})
