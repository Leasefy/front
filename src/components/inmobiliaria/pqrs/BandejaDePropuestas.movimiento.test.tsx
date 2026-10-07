/**
 * @vitest-environment happy-dom
 *
 * El movimiento de la bandeja de propuestas (movimiento ola 2, 03-10-2026).
 *
 * - Al radicar la ÚLTIMA, la bandeja no se corta de golpe: se pliega con su
 *   altura (`Collapse`) y, mientras se va, sigue diciendo lo que decía (no se
 *   vacía ni salta a «0 posibles PQRS»). Después desaparece.
 * - Al radicar una de varias, la bandeja se QUEDA durante la relectura: sólo
 *   sale la propuesta radicada. Antes se escondía en cada relectura.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { MotionGlobalConfig } from 'framer-motion'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  api: { listar: vi.fn(), confirmar: vi.fn(), descartar: vi.fn() },
}))

vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => true }),
}))
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }))
vi.mock('@/lib/api/propuestas-de-pqrs.service', () => ({ propuestasDePqrsApi: h.api }))

import { BandejaDePropuestas } from './BandejaDePropuestas'

function propuesta(id: string, nombre: string) {
  return {
    id,
    tipo: 'QUEJA',
    solicitanteTipo: 'INQUILINO',
    solicitanteNombre: nombre,
    solicitanteContacto: '3001112233',
    asunto: 'El ascensor lleva tres días dañado',
    descripcion: null,
    consignacionId: null,
    recibidaAt: '2026-09-15T14:02:00.000Z',
    origen: 'WHATSAPP',
    referenciaExterna: null,
    extracto: null,
    propuestaPor: 'agente',
    confirmadaAt: null,
    pqrsId: null,
    descartadaAt: null,
    motivoDelDescarte: null,
    createdAt: '2026-09-15T14:05:00.000Z',
  }
}

let host: HTMLDivElement
let root: Root

const bandeja = () => host.querySelector('[data-testid="bandeja-de-propuestas"]')
const radicar = (n = 0) =>
  act(async () => {
    const botones = Array.from(host.querySelectorAll('button')).filter((b) =>
      b.textContent?.includes('Radicar'),
    )
    botones[n]!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
const esperar = (ms: number) =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })

beforeEach(() => {
  vi.clearAllMocks()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  MotionGlobalConfig.skipAnimations = true
})

describe('Bandeja de propuestas — entra y sale con su altura', () => {
  it('🔴 radicar la última: se pliega diciendo lo que decía, y después se va', async () => {
    MotionGlobalConfig.skipAnimations = false
    const marta = propuesta('pr-1', 'Marta Gómez')
    h.api.listar.mockResolvedValueOnce([marta]).mockResolvedValue([])
    h.api.confirmar.mockResolvedValue({ ...marta, confirmadaAt: 'x', pqrsId: 'q-1' })

    await act(async () => {
      root.render(<BandejaDePropuestas />)
    })
    await esperar(400)
    expect(bandeja()?.textContent).toContain('Marta Gómez')

    await radicar()
    // Se está yendo: sigue montada y con su contenido, no vacía.
    expect(bandeja()).not.toBeNull()
    expect(bandeja()?.textContent).toContain('Marta Gómez')
    expect(bandeja()?.textContent).toContain('una posible PQRS')

    await esperar(600)
    expect(bandeja()).toBeNull()
  })

  it('radicar una de dos: la bandeja se queda y sólo sale la radicada', async () => {
    const marta = propuesta('pr-1', 'Marta Gómez')
    const luis = propuesta('pr-2', 'Luis Pérez')
    h.api.listar.mockResolvedValueOnce([marta, luis]).mockResolvedValue([luis])
    h.api.confirmar.mockResolvedValue({ ...marta, confirmadaAt: 'x', pqrsId: 'q-1' })

    await act(async () => {
      root.render(<BandejaDePropuestas />)
    })
    const laBandeja = bandeja()
    expect(laBandeja).not.toBeNull()

    await radicar(0)
    await esperar(50)
    // La MISMA bandeja (no se desmontó durante la relectura), con una sola.
    expect(bandeja()).toBe(laBandeja)
    expect(bandeja()?.textContent).toContain('Luis Pérez')
    expect(bandeja()?.textContent).not.toContain('Marta Gómez')
  })
})
