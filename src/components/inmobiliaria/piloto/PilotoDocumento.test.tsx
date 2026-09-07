/**
 * El documento se lee DENTRO del cajón, y se lee de verdad.
 *
 * Lo que fija este archivo es la lección de por qué existe: el enlace viejo
 * apuntaba a `pdfUrl`, que es una ubicación de almacenamiento y no un enlace
 * navegable —había filas con `stub://…`, con rutas sueltas y con un
 * `https://demo.leasefy.co/…` de semilla que abría una pestaña vacía—. Acá el
 * PDF se pide al endpoint autenticado del micro y se pinta como object URL.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

const agentFetchMock = vi.fn()
vi.mock('@/lib/api/agent-fetch', () => ({ agentFetch: (...a: unknown[]) => agentFetchMock(...a) }))
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => ({ agency: { id: 'ag-1' } }) }))

import { PilotoDocumento } from './PilotoDocumento'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test'
  agentFetchMock.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:pdf')
  globalThis.URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function montar(artifactId: string | null) {
  act(() => {
    root.render(<PilotoDocumento artifactId={artifactId} onClose={vi.fn()} />)
  })
}

/** El Sheet se porta en un portal: lo que importa vive en el <body>. */
const panel = () => document.body.querySelector('[data-testid="piloto-documento"]')

describe('<PilotoDocumento>', () => {
  it('pide el PDF al endpoint autenticado del micro, no a pdfUrl', async () => {
    agentFetchMock.mockResolvedValue({ ok: true, blob: async () => new Blob(['%PDF']) })
    montar('art-77')
    await act(async () => { await Promise.resolve() })
    expect(agentFetchMock).toHaveBeenCalledWith(
      'http://micro.test/api/agency/ag-1/cartera/legal-artifacts/art-77/pdf',
    )
  })

  it('cerrado no pide nada', () => {
    montar(null)
    expect(agentFetchMock).not.toHaveBeenCalled()
    expect(panel()).toBeNull()
  })

  it('si el PDF no llega lo dice — no deja un visor en blanco', async () => {
    agentFetchMock.mockResolvedValue({ ok: false, status: 404 })
    montar('art-77')
    await act(async () => { await Promise.resolve() })
    expect(document.body.textContent).toContain('No se pudo cargar el PDF')
    expect(document.body.querySelector('[data-testid="piloto-documento-pdf"]')).toBeNull()
  })

  it('sale del borde izquierdo del cajón padre, y sin velo que lo apague', async () => {
    // 🔴 La corrección de Nico: no es un cajón nuevo encima, es una capa del
    // que ya está abierto. `right` = el ancho del padre (36rem), velo
    // transparente para que el caso siga legible al lado.
    agentFetchMock.mockResolvedValue({ ok: true, blob: async () => new Blob(['%PDF']) })
    montar('art-77')
    await act(async () => { await Promise.resolve() })
    // En teléfono no hay ancho para dos paneles, así que ahí conserva el
    // `right-0` de la base y ocupa todo; el corrimiento entra desde `sm`.
    expect(panel()?.className).toContain('sm:!right-[36rem]')
    const velo = document.body.querySelector('[data-state="open"][class*="bg-transparent"]')
    expect(velo).toBeTruthy()
    // La costura va a ras: sin esto quedan dos ventanas sueltas con una
    // muesca en el medio.
    expect(panel()?.className).toContain('sm:!rounded-r-none')
  })
})
