/**
 * QA de notificaciones del 04-10 (NO-01…NO-08), la campana de la inmobiliaria.
 * En HEAD: «Todas 50 · Sin leer 136» (la página contra el total), cada aviso
 * decía «Notificacion enviada via in_app», el círculo era la primera letra del
 * título, los 107 cobros iban uno por fila, «Eliminar» sólo en las leídas y
 * «Ver todas» llevaba al Inicio.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => ({
  listar: vi.fn(),
  marcarLeido: vi.fn(),
  quitar: vi.fn(),
  marcarTodasLeidas: vi.fn(),
  push: vi.fn(),
}))

vi.mock('@/lib/api/avisos-agrupados.service', () => ({
  avisosAgrupadosApi: {
    listar: h.listar,
    marcarLeido: h.marcarLeido,
    quitar: h.quitar,
    marcarTodasLeidas: h.marcarTodasLeidas,
  },
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: h.push }) }))
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => ({ user: { id: 'u-1' } }) }))
vi.mock('@/lib/hooks/use-notifications-realtime', () => ({ useNotificationsRealtime: () => {} }))
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

import { CampanaDeLaInmobiliaria } from './CampanaDeLaInmobiliaria'

const BANDEJA = {
  total: 138,
  unreadCount: 136,
  totalGrupos: 3,
  grupos: [
    {
      clave: 'c1',
      id: 'id-1',
      type: 'COBRO_GENERATED',
      category: 'payment',
      title: '107 cobros generados hoy',
      message: 'Todos sin leer. El último: Cobro de $ 1.500.000 para Apto 101 (2026-10)',
      actionUrl: '/panel/inmobiliaria/cobros',
      metadata: {},
      cantidad: 107,
      sinLeer: 107,
      read: false,
      createdAt: new Date().toISOString(),
    },
    {
      clave: 'c2',
      id: 'id-2',
      type: 'agent_generic',
      category: 'system',
      title: 'Falta fijar los días de plazo para pagar',
      message: 'Hay 62 cuotas vencidas que no entran a la cartera en mora…',
      actionUrl: '/panel/inmobiliaria/configuracion/perfil#perfil-diasDePlazo',
      metadata: { aviso: 'plazo-sin-fijar' },
      cantidad: 1,
      sinLeer: 1,
      read: false,
      createdAt: new Date().toISOString(),
    },
    {
      clave: 'c3',
      id: 'id-3',
      type: 'NEW_CHAT_MESSAGE',
      category: 'message',
      title: 'Nuevo mensaje de Paula',
      message: 'Sobre «Apto 101»: hola',
      actionUrl: '/panel/inmobiliaria/mensajes',
      metadata: {},
      cantidad: 1,
      sinLeer: 0,
      read: true,
      createdAt: new Date().toISOString(),
    },
  ],
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  Object.values(h).forEach((f) => f.mockReset())
  h.listar.mockResolvedValue(BANDEJA)
  h.marcarLeido.mockResolvedValue(undefined)
  h.quitar.mockResolvedValue(undefined)
  h.marcarTodasLeidas.mockResolvedValue(undefined)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function render(onCerrar = vi.fn()) {
  await act(async () => {
    root.render(<CampanaDeLaInmobiliaria onCerrar={onCerrar} />)
  })
  await act(async () => {
    await Promise.resolve()
  })
  return onCerrar
}

const filas = () => [...container.querySelectorAll('[data-testid="fila-del-aviso"]')]

describe('Campana de la inmobiliaria (QA 04-10)', () => {
  it('NO-01: «Todas» es el total real y «Sin leer» el de los no leídos', async () => {
    await render()
    expect(container.querySelector('[data-testid="campana-todas"]')?.textContent).toBe('Todas138')
    expect(container.querySelector('[data-testid="campana-sin-leer"]')?.textContent).toBe('Sin leer136')
  })

  it('NO-02/NO-03/NO-05: cada aviso con su contenido, su ícono y los repetidos agrupados', async () => {
    await render()
    expect(filas()).toHaveLength(3)
    expect(container.textContent).not.toMatch(/via in_app/i)
    expect(container.textContent).toContain('107 cobros generados hoy')
    expect(container.textContent).toContain('Hay 62 cuotas vencidas')
    // El círculo es un ícono (svg), no la primera letra del título.
    expect(filas()[0]!.querySelector('span[aria-hidden="true"] svg')).not.toBeNull()
    // Categorías en español.
    expect(container.textContent).toContain('Pagos')
    expect(container.textContent).toContain('Avisos')
    expect(container.textContent).not.toMatch(/\bgeneral\b/)
  })

  it('NO-06: el aviso del plazo lleva a donde se fija', async () => {
    const onCerrar = await render()
    const boton = filas()[1]!.querySelector('button') as HTMLButtonElement
    await act(async () => boton.click())
    expect(h.push).toHaveBeenCalledWith('/panel/inmobiliaria/configuracion/perfil#perfil-diasDePlazo')
    expect(onCerrar).toHaveBeenCalled()
  })

  it('«Eliminar» está en todas, leídas o no', async () => {
    await render()
    for (const f of filas()) {
      expect(f.querySelector('button[aria-label^="Quitar"]')).not.toBeNull()
    }
    // Un grupo dice cuántos quita.
    expect(filas()[0]!.querySelector('button[aria-label="Quitar los 107 avisos"]')).not.toBeNull()
  })

  it('NO-07/NO-08: «Ver todas» abre la página de notificaciones y hay «Marcar todas como leídas»', async () => {
    await render()
    const ver = container.querySelector('[data-testid="campana-ver-todas"]') as HTMLButtonElement
    await act(async () => ver.click())
    expect(h.push).toHaveBeenCalledWith('/panel/inmobiliaria/notificaciones')

    const marcar = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Marcar todas como leídas'),
    ) as HTMLButtonElement
    await act(async () => marcar.click())
    expect(h.marcarTodasLeidas).toHaveBeenCalledTimes(1)
  })
})
