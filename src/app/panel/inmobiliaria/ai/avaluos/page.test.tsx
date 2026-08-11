/**
 * page.test.tsx — el panel de Avalúos no puede ofrecer una acción que no alcanza.
 *
 * Los dos CTA ("Solicitar avalúo" y "Generar link para compartir") terminan en el
 * asistente del MICRO de avalúos, cuyo origen sale de `NEXT_PUBLIC_AVALUO_API_URL`.
 * Sin esa variable no hay URL que componer: `avaluosApi.solicitar()` tira ApiError
 * DESPUÉS de que el back ya firmó un token de agencia. O sea: el clic costaba un
 * viaje al servidor y no abría nada.
 *
 * `wizard-url.ts` deja escrito el contrato — "callers must degrade (hide/disable
 * the CTA)" — y `/avaluo/nuevo` ya lo cumplía. Este panel no.
 *
 * Cobertura:
 *   (1) sin origen configurado → banner visible y los DOS botones deshabilitados
 *   (2) sin origen configurado → un clic NO llega a la API (no se firma un token)
 *   (3) con origen configurado → sin banner y los dos botones habilitados
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// ── El origen del micro, controlable por test ─────────────────────────────
// Getter, no valor: la página lee el binding en cada render, así que alcanza
// con mover `_origen` entre casos.
let _origen = ''
vi.mock('@/lib/avaluo/wizard-url', () => ({
  get AVALUO_WIZARD_ORIGIN() {
    return _origen
  },
  get AVALUO_WIZARD_URL() {
    return _origen ? `${_origen}/avaluo` : ''
  },
}))

// ── El guard de permisos no es lo que se prueba acá ───────────────────────
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => children,
}))

// ── Lista vacía: el foco está en los CTA, no en la tabla ──────────────────
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useAgencyAvaluos: () => ({
    data: null,
    avaluos: [],
    total: 0,
    pageSize: 100,
    isLoading: false,
    error: null,
  }),
}))

const solicitarMock = vi.fn(async () => ({ wizardUrl: 'http://micro.test/avaluo?agency=t' }))
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  avaluosApi: {
    solicitar: (...args: unknown[]) => solicitarMock(...(args as [])),
  },
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

// ── La página, DESPUÉS de los mocks ───────────────────────────────────────
import AvaluosSalaPage from './page'

let container: HTMLDivElement
let root: Root

const BANNER = '[data-testid="avaluos-servicio-no-configurado"]'
const CTA_DIRECTO = '[data-testid="avaluos-solicitar-directo-cta"]'
const CTA_LINK = '[data-testid="avaluos-generar-link-cta"]'

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  _origen = ''
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.clearAllMocks()
})

async function montar() {
  await act(async () => {
    root.render(React.createElement(AvaluosSalaPage))
  })
}

describe('Avalúos — servicio sin configurar', () => {
  it('(1) muestra el aviso y deshabilita los dos CTA', async () => {
    await montar()

    expect(container.querySelector(BANNER)).not.toBeNull()

    const directo = container.querySelector<HTMLButtonElement>(CTA_DIRECTO)
    const link = container.querySelector<HTMLButtonElement>(CTA_LINK)
    expect(directo?.disabled).toBe(true)
    expect(link?.disabled).toBe(true)
  })

  it('(2) un clic no llega a la API: no se firma un token para nada', async () => {
    await montar()

    const directo = container.querySelector<HTMLButtonElement>(CTA_DIRECTO)
    await act(async () => {
      directo?.click()
    })

    expect(solicitarMock).not.toHaveBeenCalled()
  })
})

describe('Avalúos — servicio configurado', () => {
  it('(3) sin aviso y con los dos CTA habilitados', async () => {
    _origen = 'http://localhost:3003'
    await montar()

    expect(container.querySelector(BANNER)).toBeNull()

    const directo = container.querySelector<HTMLButtonElement>(CTA_DIRECTO)
    const link = container.querySelector<HTMLButtonElement>(CTA_LINK)
    expect(directo?.disabled).toBe(false)
    expect(link?.disabled).toBe(false)
  })
})
