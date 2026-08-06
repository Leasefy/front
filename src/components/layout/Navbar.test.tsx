import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

let authState: {
  user: { role?: string; backendRole?: string; name?: string; email?: string } | null
  isAuthenticated: boolean
  isLoading: boolean
  logout: () => Promise<void>
  agencyRole: string | null
}

vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => authState }))
vi.mock('next/navigation', () => ({
  usePathname: () => '/propiedades',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

import { Navbar } from './Navbar'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  authState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    logout: vi.fn().mockResolvedValue(undefined),
    agencyRole: null,
  }
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

function render() {
  act(() => {
    root.render(<Navbar />)
  })
}

const text = () => container.textContent ?? ''

describe('<Navbar> — marketing nav for anonymous visitors', () => {
  it('shows the full marketing nav (Precios / Para quién / Productos) when logged out', () => {
    render()

    expect(text()).toContain('Publicar Inmueble')
    expect(text()).toContain('Buscar Inmueble')
    expect(text()).toContain('Precios')
    expect(text()).toContain('Para quién')
    expect(text()).toContain('Productos')
  })
})

describe('<Navbar> — slimmed nav for authenticated users', () => {
  it('shows only "Publicar Inmueble" for an inmobiliaria/agent (no marketing nav, no "Buscar")', () => {
    authState = {
      user: { role: 'agency', backendRole: 'AGENT', name: 'Test Agency', email: 'a@test.co' },
      isAuthenticated: true,
      isLoading: false,
      logout: vi.fn().mockResolvedValue(undefined),
      agencyRole: 'ADMIN',
    }
    render()

    expect(text()).toContain('Publicar Inmueble')
    expect(text()).toContain('Test Agency')
    expect(text()).not.toContain('Buscar Inmueble')
    expect(text()).not.toContain('Precios')
    expect(text()).not.toContain('Para quién')
    expect(text()).not.toContain('Productos')
  })

  it('shows only "Buscar Inmueble" for a tenant (no "Publicar", no marketing nav)', () => {
    authState = {
      user: { role: 'tenant', name: 'Test Tenant', email: 't@test.co' },
      isAuthenticated: true,
      isLoading: false,
      logout: vi.fn().mockResolvedValue(undefined),
      agencyRole: null,
    }
    render()

    expect(text()).toContain('Buscar Inmueble')
    expect(text()).toContain('Test Tenant')
    expect(text()).not.toContain('Publicar Inmueble')
    expect(text()).not.toContain('Precios')
    expect(text()).not.toContain('Para quién')
    expect(text()).not.toContain('Productos')
  })

  it('shows "Buscar Inmueble" for a read-only agency member (CONTADOR) who cannot publish', () => {
    authState = {
      user: { role: 'agency', name: 'Read Only', email: 'ro@test.co' },
      isAuthenticated: true,
      isLoading: false,
      logout: vi.fn().mockResolvedValue(undefined),
      agencyRole: 'CONTADOR',
    }
    render()

    expect(text()).toContain('Buscar Inmueble')
    expect(text()).not.toContain('Publicar Inmueble')
  })
})
