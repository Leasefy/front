/**
 * P1 — Las dos páginas del Piloto no tenían `PageGuard`.
 *
 * Todas las demás páginas del panel esperan a que los permisos resuelvan antes
 * de montar su contenido; el Piloto disparaba sus consultas (bandeja, feed,
 * briefing, autonomía, pulso) con los permisos todavía en vuelo. El guard va
 * SIN módulo: la fila del menú declara `module: null` (el Piloto es el inicio
 * de todo miembro y cada widget se defiende solo).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => {
  const vacio = () => ({
    data: null,
    items: [],
    isLoading: false,
    error: null,
    notAvailable: false,
    refetch: vi.fn(async () => undefined),
  })
  return {
    permisos: { isLoading: true, isAdmin: false, agencyRole: 'AGENTE' as string | null },
    replace: vi.fn(),
    usePilotoInbox: vi.fn(vacio),
    usePilotoActivity: vi.fn(vacio),
    usePilotoBriefing: vi.fn(vacio),
    usePilotoAutonomia: vi.fn(vacio),
    usePilotoPulso: vi.fn(vacio),
    usePilotoProcesos: vi.fn(vacio),
    usePilotoCatalogo: vi.fn(vacio),
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: h.replace }),
  usePathname: () => '/panel/inmobiliaria/piloto',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ ...h.permisos, canAccess: () => false }),
}))
vi.mock('@/lib/hooks/use-sin-senal', () => ({
  estaSinSenal: () => false,
  useSinSenal: () => false,
}))

vi.mock('@/lib/hooks/piloto/use-piloto-inbox', () => ({ usePilotoInbox: h.usePilotoInbox }))
vi.mock('@/lib/hooks/piloto/use-piloto-activity', () => ({ usePilotoActivity: h.usePilotoActivity }))
vi.mock('@/lib/hooks/piloto/use-piloto-briefing', () => ({ usePilotoBriefing: h.usePilotoBriefing }))
vi.mock('@/lib/hooks/piloto/use-piloto-autonomia', () => ({ usePilotoAutonomia: h.usePilotoAutonomia }))
vi.mock('@/lib/hooks/piloto/use-piloto-pulso', () => ({ usePilotoPulso: h.usePilotoPulso }))
vi.mock('@/lib/hooks/piloto/use-piloto-procesos', () => ({ usePilotoProcesos: h.usePilotoProcesos }))
vi.mock('@/lib/hooks/piloto/use-piloto-catalogo', () => ({ usePilotoCatalogo: h.usePilotoCatalogo }))

vi.mock('@/components/inmobiliaria/piloto/PilotoPulso', () => ({ PilotoPulso: () => null }))
vi.mock('@/components/inmobiliaria/piloto/PilotoBandeja', () => ({ PilotoBandeja: () => null }))
vi.mock('@/components/inmobiliaria/piloto/PilotoAutonomia', () => ({ PilotoAutonomia: () => null }))
vi.mock('@/components/inmobiliaria/piloto/PilotoFeed', () => ({ PilotoFeed: () => null }))
vi.mock('@/components/inmobiliaria/piloto/PilotoCajon', () => ({ PilotoCajon: () => null }))
vi.mock('@/components/inmobiliaria/piloto/PilotoProcesos', () => ({ PilotoProcesos: () => null }))
vi.mock('@/components/inmobiliaria/piloto/PilotoCatalogo', () => ({ PilotoCatalogo: () => null }))

import PilotoPage from './page'
import PilotoProcesosPage from './procesos/page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  h.permisos = { isLoading: true, isAdmin: false, agencyRole: 'AGENTE' }
  vi.clearAllMocks()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function render(el: React.ReactElement) {
  await act(async () => {
    root.render(el)
  })
}

describe('/piloto — detrás de PageGuard', () => {
  it('mientras los permisos no llegan, no monta la torre ni dispara sus consultas', async () => {
    await render(<PilotoPage />)

    expect(container.querySelector('[data-testid="piloto-page"]')).toBeNull()
    expect(h.usePilotoInbox).not.toHaveBeenCalled()
    expect(h.usePilotoPulso).not.toHaveBeenCalled()
  })

  it('con los permisos resueltos entra CUALQUIER miembro (sin módulo), no sólo el admin', async () => {
    h.permisos = { isLoading: false, isAdmin: false, agencyRole: 'AGENTE' }
    await render(<PilotoPage />)

    expect(container.querySelector('[data-testid="piloto-page"]')).not.toBeNull()
    expect(h.usePilotoInbox).toHaveBeenCalled()
    expect(h.replace).not.toHaveBeenCalled()
  })
})

describe('/piloto/procesos — detrás de PageGuard', () => {
  it('mientras los permisos no llegan, no monta el catálogo ni dispara sus consultas', async () => {
    await render(<PilotoProcesosPage />)

    expect(container.querySelector('[data-testid="piloto-procesos-page"]')).toBeNull()
    expect(h.usePilotoProcesos).not.toHaveBeenCalled()
    expect(h.usePilotoCatalogo).not.toHaveBeenCalled()
  })

  it('con los permisos resueltos, monta para cualquier miembro', async () => {
    h.permisos = { isLoading: false, isAdmin: false, agencyRole: 'VIEWER' }
    await render(<PilotoProcesosPage />)

    expect(container.querySelector('[data-testid="piloto-procesos-page"]')).not.toBeNull()
    expect(h.usePilotoCatalogo).toHaveBeenCalled()
    expect(h.replace).not.toHaveBeenCalled()
  })
})
