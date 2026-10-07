/**
 * PILOTO-ACTIVO (04-10-2026) — «¿Opera sola?» dice DÓNDE se arregla lo que
 * falta: CR-31 (sin días de plazo no hay cobranza) con el enlace a
 * Configuración → Perfil, y el Piloto sin activar con el enlace a su página.
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, string>) => (vars ? `${k}(${Object.values(vars).join(',')})` : k),
    locale: 'es',
  }),
}))
const permisos = vi.hoisted(() => ({ valor: null as null | { isAdmin: boolean; agencyRole: string | null; isLoading: boolean } }))
vi.mock('@/lib/context/PermissionsContext', () => ({ usePermissionsContextSafe: () => permisos.valor }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import { PilotoOperaSolaContenido } from './PilotoOperaSola'
import type { FaltaParaAutomatico, PilotoQueFaltaResponse } from '@/lib/api/piloto'

const PLAZO: FaltaParaAutomatico = {
  id: 'requisito:plazo_de_pago',
  tipo: 'requisito',
  que: 'Tu inmobiliaria todavía no fijó sus días de plazo para pagar: sin plazo no hay mora, así que no hay cobranza.',
  quien: 'administrador',
  como: 'Fíjalos en Configuración → Perfil (el sugerido es 5 días).',
  enlace: { href: '/panel/inmobiliaria/configuracion/perfil#perfil-diasDePlazo', texto: 'Fijar los días de plazo' },
}
const PILOTO: FaltaParaAutomatico = {
  id: 'piloto:inactivo',
  tipo: 'piloto_inactivo',
  que: 'El Piloto automático no está activo en tu inmobiliaria: ningún agente actúa solo.',
  quien: 'administrador',
  como: 'Un administrador lo activa en la página del Piloto, con su segundo factor (empieza la prueba de 30 días).',
  enlace: { href: '/panel/inmobiliaria/piloto#piloto-activacion', texto: 'Ir a la activación del Piloto' },
}

const DATA: PilotoQueFaltaResponse = {
  listo: false,
  frase: 'Todavía no opera sola.',
  conteo: { procesos: 2, operanSolos: 0, siempreHumanos: 0, frenados: 2, apagados: 0 },
  pendientes: { leasefy: 0, administrador: 2, programar: 0 },
  interruptores: [],
  migraciones: [],
  topes: { topeMontoCop: 5_000_000, topeDestinatarios: 10, graciaSegundos: 60, porDefecto: true },
  agentes: [
    {
      agente: 'cobranza',
      nombre: 'cobranza',
      modo: 'autonomo',
      modoElegido: true,
      corre: true,
      delegacion: { necesaria: false, estado: 'no_aplica', quien: null, desde: null },
      estado: 'frenado',
      faltas: [PLAZO, PILOTO],
      procesos: [],
    },
  ],
  tomadoAt: '2026-10-05T15:00:00.000Z',
}

let root: Root | null = null
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  permisos.valor = null
})

function pintar() {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  const lectura = { data: DATA, isLoading: false, error: null, notAvailable: false, refetch: async () => {} }
  act(() =>
    root!.render(
      <PilotoOperaSolaContenido
        queFalta={lectura}
        loQueHizo={{ data: null, isLoading: false, error: null, notAvailable: true, refetch: async () => {} }}
      />,
    ),
  )
}

describe('¿Opera sola?: cada falta que se arregla en el panel trae su enlace', () => {
  it('CR-31 → Configuración → Perfil (#perfil-diasDePlazo); el Piloto sin activar → su página', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    const lectura = { data: DATA, isLoading: false, error: null, notAvailable: false, refetch: async () => {} }
    act(() =>
      root!.render(
        <PilotoOperaSolaContenido
          queFalta={lectura}
          loQueHizo={{ data: null, isLoading: false, error: null, notAvailable: true, refetch: async () => {} }}
        />,
      ),
    )
    const plazo = [...document.querySelectorAll('[data-testid="piloto-opera-sola-enlace-requisito:plazo_de_pago"]')] as HTMLAnchorElement[]
    expect(plazo.length).toBeGreaterThan(0)
    expect(plazo.every((a) => a.getAttribute('href') === '/panel/inmobiliaria/configuracion/perfil#perfil-diasDePlazo')).toBe(true)
    expect(plazo[0]!.textContent).toBe('Fijar los días de plazo')
    const piloto = document.querySelector('[data-testid="piloto-opera-sola-enlace-piloto:inactivo"]') as HTMLAnchorElement
    expect(piloto.getAttribute('href')).toBe('/panel/inmobiliaria/piloto#piloto-activacion')
  })

  it('🔴 a la asesora no le ofrece una pantalla que no puede abrir: dice quién lo hace (Configuración → Perfil es del administrador)', () => {
    permisos.valor = { isAdmin: false, agencyRole: 'AGENTE', isLoading: false }
    pintar()
    expect(document.querySelector('[data-testid="piloto-opera-sola-enlace-requisito:plazo_de_pago"]')).toBeNull()
    const sinAcceso = document.querySelector('[data-testid="piloto-opera-sola-enlace-requisito:plazo_de_pago-sin-acceso"]')!
    expect(sinAcceso.textContent).toBe('Lo hace un administrador de tu inmobiliaria.')
    // La página del Piloto la abre cualquiera: ese enlace sigue.
    expect(document.querySelector('[data-testid="piloto-opera-sola-enlace-piloto:inactivo"]')).not.toBeNull()
  })

  it('al administrador sí se lo ofrece', () => {
    permisos.valor = { isAdmin: false, agencyRole: 'ADMIN', isLoading: false }
    pintar()
    expect(document.querySelector('[data-testid="piloto-opera-sola-enlace-requisito:plazo_de_pago"]')).not.toBeNull()
  })
})
