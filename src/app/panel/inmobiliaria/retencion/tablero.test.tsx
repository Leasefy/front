/**
 * El tablero de Vinci SIN datos de ejemplo (26-09-2026):
 *   · 🔴 ya no hay aviso de «datos de ejemplo» ni «las rutas no están
 *     montadas»: lee las rutas reales, y si fallan lo dice;
 *   · el resumen es una frase con el umbral; lo retenido, otra;
 *   · el umbral lo edita SÓLO el administrador;
 *   · el cliente no cae a un mock: un error del agente es un error.
 */
import * as React from 'react'
import { readFileSync } from 'node:fs'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

const { riesgo, metricas, umbral, esAdmin } = vi.hoisted(() => ({
  riesgo: vi.fn(),
  metricas: vi.fn(),
  umbral: vi.fn(),
  esAdmin: { valor: false },
}))
vi.mock('@/lib/hooks/retencion/use-vinci', () => ({
  useRiesgoDeVinci: riesgo,
  useMetricasDeVinci: metricas,
  useUmbralDeVinci: umbral,
}))
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
    data: { umbral: 60, umbralPorDefecto: 60, topeDescuentoComisionPct: 20, guardable: true, actualizadaEn: null },
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
  it('🔴 sin aviso de datos de ejemplo: la frase con el umbral, lo más urgente y lo retenido', () => {
    act(() => root.render(<RetencionDashboardPage />))
    const t = container.textContent ?? ''
    expect(t).not.toMatch(/ejemplo|no está desplegado|no están montadas/i)
    expect(container.querySelector('[data-testid="vinci-frase"]')?.textContent).toMatch(
      /^Vinci ve 1 inquilino y 0 propietarios en riesgo \(umbral 60\/100\) entre 105 contratos vigentes/,
    )
    expect(t).toContain('Marta Gómez')
    expect(container.querySelector('[data-testid="vinci-metricas"]')?.textContent).toContain('hay 1 plan de retención en gestión')
    // La llave de envío apagada se dice, no se finge que Automático escribe.
    expect(container.querySelector('[data-testid="vinci-envio-apagado"]')).not.toBeNull()
  })

  it('el umbral lo edita sólo el administrador', () => {
    act(() => root.render(<RetencionDashboardPage />))
    expect(container.querySelector('[data-testid="vinci-umbral"]')).toBeNull()
    act(() => root.unmount())
    root = createRoot(container)
    esAdmin.valor = true
    act(() => root.render(<RetencionDashboardPage />))
    expect((container.querySelector('[data-testid="vinci-umbral"]') as HTMLInputElement | null)?.value).toBe('60')
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
