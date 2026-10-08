/**
 * El tablero de Vinci SIN datos de ejemplo (26-09-2026):
 *   · 🔴 ya no hay aviso de «datos de ejemplo» ni «las rutas no están
 *     montadas»: lee las rutas reales, y si fallan lo dice;
 *   · 29-09 (glow-up): el resumen ya no son dos frases sino la franja de
 *     números del DS (en riesgo, en cobranza, en gestión, retenidos) con un
 *     pie que dice el modo, la llave de envío y cuándo midió;
 *   · lo que espera tu clic lleva a «Por aprobar» sólo si hay algo;
 *   · el umbral lo edita SÓLO el administrador;
 *   · el cliente no cae a un mock: un error del agente es un error.
 */
import * as React from 'react'
import { readFileSync } from 'node:fs'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

const { riesgo, metricas, umbral, decisiones, esAdmin } = vi.hoisted(() => ({
  riesgo: vi.fn(),
  metricas: vi.fn(),
  umbral: vi.fn(),
  decisiones: vi.fn(),
  esAdmin: { valor: false },
}))
vi.mock('@/lib/hooks/retencion/use-vinci', () => ({
  useRiesgoDeVinci: riesgo,
  useMetricasDeVinci: metricas,
  useUmbralDeVinci: umbral,
  useDecisionesDeVinci: decisiones,
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/lib/context/PermissionsContext', () => ({ usePermissionsContext: () => ({ isAdmin: esAdmin.valor }) }))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'a1' } }) }))
vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) => React.createElement('a', { href }, children),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import RetencionDashboardPage from './page'
import { ErrorDeVinci, fetchRiesgo } from '@/lib/api/retencion'

const RIESGO = {
  disponible: true,
  faltan: [],
  notas: [],
  leidoEn: '2026-09-28T12:00:00.000Z',
  deLoGuardado: true,
  umbral: 60,
  modo: 'copiloto',
  envioHabilitado: false,
  contratosLeidos: 105,
  propietariosLeidos: 50,
  enRiesgo: { inquilinos: 1, propietarios: 0 },
  enCobranza: 3,
  casos: [
    {
      caseId: 'inquilino:c1',
      poblacion: 'inquilino',
      nombre: 'Marta Gómez',
      puntaje: 60,
      suma: 60,
      umbral: 60,
      enRiesgo: true,
      senales: [{ clave: 'mora', texto: '70 días de mora', puntos: 40 }],
      contratos: [],
      canonEnJuegoCop: 1_500_000,
      tieneTelefono: true,
      tieneCorreo: true,
      ofertasSugeridas: [],
      ofertas: [],
      plan: null,
    },
  ],
}

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  esAdmin.valor = false
  decisiones.mockReturnValue({ data: { decisiones: [], envioHabilitado: false }, isLoading: false, error: null, refetch: vi.fn() })
  riesgo.mockReturnValue({ data: RIESGO, isLoading: false, error: null, refetch: vi.fn() })
  metricas.mockReturnValue({
    data: {
      enGestion: { inquilinos: 1, propietarios: 0 },
      contratosRetenidos: 0,
      propietariosQueSeQuedaron: 0,
      inmueblesRetenidos: 0,
      canonConservadoCop: 0,
      perdidos: { inquilinos: 0, propietarios: 0, canonPerdidoCop: 0 },
      tasaDeRetencion: null,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })
  umbral.mockReturnValue({
    data: {
      umbral: 60,
      umbralPorDefecto: 60,
      topeDescuentoComisionPct: 20,
      diasEntreMensajesInquilino: 7,
      diasEntreMensajesPropietario: 15,
      guardable: true,
      actualizadaEn: null,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

describe('tablero de Vinci', () => {
  it('🔴 sin aviso de datos de ejemplo: la franja de números, cuándo midió, lo más urgente', () => {
    act(() => root.render(<RetencionDashboardPage />))
    const t = container.textContent ?? ''
    expect(t).not.toMatch(/ejemplo|no está desplegado|no están montadas/i)
    // La franja: cada cifra con su etiqueta, en el orden en que se lee.
    const franja = container.querySelector('[data-testid="vinci-resumen"]')?.textContent ?? ''
    expect(franja).toMatch(/En riesgo\s*1\s*1 inquilino · 0 propietarios/)
    expect(franja).toMatch(/En cobranza\s*3/)
    expect(franja).toMatch(/En gestión\s*1/)
    expect(franja).toMatch(/Retenidos\s*0\s*Ningún caso cerrado todavía/)
    expect(container.querySelector('[data-testid="vinci-medido"]')?.textContent).toMatch(
      /^Medido .*\(el último barrido\) entre 105 contratos vigentes y 50 propietarios\. En riesgo desde 60\/100\.$/,
    )
    expect(t).toContain('Marta Gómez')
    // La llave de envío apagada se dice, no se finge que Automático escribe.
    expect(container.querySelector('[data-testid="vinci-envio-apagado"]')).not.toBeNull()
    // El modo va en el chip y la frase no lo repite («Copiloto. Copiloto: …»).
    expect(t).not.toMatch(/Copiloto\W+Copiloto/)
  })

  it('lo que espera tu clic lleva a «Por aprobar», y sólo si hay algo', () => {
    act(() => root.render(<RetencionDashboardPage />))
    expect(container.querySelector('[data-testid="vinci-por-aprobar-aviso"]')).toBeNull()
    act(() => root.unmount())
    root = createRoot(container)
    decisiones.mockReturnValue({
      data: { decisiones: [{ id: 'd1' }, { id: 'd2' }], envioHabilitado: false },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
    act(() => root.render(<RetencionDashboardPage />))
    const aviso = container.querySelector('[data-testid="vinci-por-aprobar-aviso"]')
    expect(aviso?.textContent).toContain('2 decisiones de Vinci esperan tu clic.')
    expect(aviso?.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/retencion/aprobar')
  })

  it('el umbral lo edita sólo el administrador', () => {
    act(() => root.render(<RetencionDashboardPage />))
    expect(container.querySelector('[data-testid="vinci-umbral"]')).toBeNull()
    act(() => root.unmount())
    root = createRoot(container)
    esAdmin.valor = true
    act(() => root.render(<RetencionDashboardPage />))
    expect((container.querySelector('[data-testid="vinci-umbral"]') as HTMLInputElement | null)?.value).toBe('60')
    // Nico (26-09): la frecuencia —7 días al inquilino, 15 al propietario— también la configura el administrador.
    expect((container.querySelector('[data-testid="vinci-dias-inquilino"]') as HTMLInputElement | null)?.value).toBe('7')
    expect((container.querySelector('[data-testid="vinci-dias-propietario"]') as HTMLInputElement | null)?.value).toBe('15')
  })

  it('🔴 el cliente no cae a un mock: un error del agente es un error', async () => {
    const original = process.env.NEXT_PUBLIC_AGENT_URL
    process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Vinci (retención) no está habilitado' }), { status: 404 }),
    )
    await expect(fetchRiesgo('a1')).rejects.toBeInstanceOf(ErrorDeVinci)
    process.env.NEXT_PUBLIC_AGENT_URL = original
    const fuente = readFileSync('src/lib/api/retencion.ts', 'utf8')
    expect(fuente).not.toMatch(/from ['"][^'"]*mock-retencion/)
    expect(fuente).not.toContain('usingMock')
  })
})
