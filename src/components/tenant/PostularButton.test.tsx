/**
 * La decisión del gate de postulación.
 *
 * Reglas que se protegen acá:
 *  · aprobado y dentro del tope → NO se estorba (motivo null)
 *  · sin tope conocido → tampoco se estorba: no se le niega algo a alguien
 *    por un dato que todavía no tenemos
 *  · cada bloqueo tiene su motivo propio, porque cada uno se explica distinto
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const { aprobacionMock, aplicacionMock } = vi.hoisted(() => ({
  aprobacionMock: vi.fn(),
  aplicacionMock: vi.fn(),
}))

vi.mock('@/lib/hooks/use-aprobacion', () => ({
  useAprobacion: () => aprobacionMock(),
}))

vi.mock('@/lib/hooks/use-aplicacion-propiedad', () => ({
  useAplicacionParaPropiedad: () => aplicacionMock(),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild: _asChild, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => {
    void _asChild
    const onClick = rest.onClick as (() => void) | undefined
    return <span onClick={onClick}>{children}</span>
  },
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ stop: vi.fn(), start: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@phosphor-icons/react', () => ({ Info: () => null }))

import { PostularButton, motivoDeBloqueo } from './PostularButton'
import { cabeEnTope, estaVigente, type Aprobacion } from '@/lib/api/aprobacion.service'

const APROBADA: Aprobacion = {
  estado: 'aprobado',
  topeAprobadoCop: 2_000_000,
  aseguradoras: [],
  vigenteHasta: '2099-01-01T00:00:00.000Z',
  resueltoEn: null,
  condicionada: false,
  canonConsultadoCop: null,
}

describe('motivoDeBloqueo', () => {
  it('aprobado y dentro del tope no estorba', () => {
    expect(motivoDeBloqueo({ aprobacion: APROBADA, vigente: true, canonCop: 1_500_000 })).toBeNull()
  })

  it('el canon exactamente igual al tope entra', () => {
    expect(motivoDeBloqueo({ aprobacion: APROBADA, vigente: true, canonCop: 2_000_000 })).toBeNull()
  })

  it('por encima del tope bloquea con su motivo', () => {
    expect(motivoDeBloqueo({ aprobacion: APROBADA, vigente: true, canonCop: 2_000_001 })).toBe(
      'sobre_tope',
    )
  })

  it('sin tope conocido NO bloquea — no se niega por un dato que falta', () => {
    const sinTope = { ...APROBADA, topeAprobadoCop: null }
    expect(motivoDeBloqueo({ aprobacion: sinTope, vigente: true, canonCop: 99_000_000 })).toBeNull()
  })

  it('sin canon (no sabemos el precio) no bloquea', () => {
    expect(motivoDeBloqueo({ aprobacion: APROBADA, vigente: true })).toBeNull()
  })

  it('vencida bloquea aunque el canon entre', () => {
    expect(motivoDeBloqueo({ aprobacion: APROBADA, vigente: false, canonCop: 100_000 })).toBe(
      'vencida',
    )
  })

  it.each([
    ['sin_estudio', 'sin_aprobacion'],
    ['en_proceso', 'en_proceso'],
    ['rechazado', 'rechazado'],
  ])('estado %s → motivo %s', (estado, esperado) => {
    expect(
      motivoDeBloqueo({ aprobacion: { ...APROBADA, estado }, vigente: false, canonCop: 100_000 }),
    ).toBe(esperado)
  })

  it('mientras no se sabe nada (null) se deja pasar, no se castiga la duda', () => {
    expect(motivoDeBloqueo({ aprobacion: null, vigente: false, canonCop: 100_000 })).toBeNull()
  })
})

describe('cabeEnTope', () => {
  it('null cuando no hay tope: es "no sabemos", ni sí ni no', () => {
    expect(cabeEnTope(1_000_000, null)).toBeNull()
  })

  it('compara contra el tope', () => {
    expect(cabeEnTope(1_000_000, 2_000_000)).toBe(true)
    expect(cabeEnTope(3_000_000, 2_000_000)).toBe(false)
  })

  it('un canon no numérico no se cuela como válido', () => {
    expect(cabeEnTope(Number.NaN, 2_000_000)).toBeNull()
  })
})

describe('estaVigente', () => {
  const ahora = new Date('2026-08-10T00:00:00.000Z')

  it('aprobada y con fecha futura, vigente', () => {
    expect(estaVigente({ ...APROBADA, vigenteHasta: '2026-08-20T00:00:00.000Z' }, ahora)).toBe(true)
  })

  it('aprobada pero con fecha pasada, no', () => {
    expect(estaVigente({ ...APROBADA, vigenteHasta: '2026-08-01T00:00:00.000Z' }, ahora)).toBe(false)
  })

  it('sin fecha se asume vigente: la caducidad es del backend', () => {
    expect(estaVigente({ ...APROBADA, vigenteHasta: null }, ahora)).toBe(true)
  })

  it('un rechazo nunca está vigente', () => {
    expect(estaVigente({ ...APROBADA, estado: 'rechazado' }, ahora)).toBe(false)
  })

  it('null no revienta', () => {
    expect(estaVigente(null, ahora)).toBe(false)
  })
})

describe('PostularButton — ya postulado', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    aprobacionMock.mockReset()
    aplicacionMock.mockReset()
    // Aprobado y vigente por defecto: el CTA normal llevaría al wizard.
    aprobacionMock.mockReturnValue({ aprobacion: APROBADA, cargando: false, vigente: true })
    aplicacionMock.mockReturnValue({ activa: null, cargando: false })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  function render(props: { propertyId: string; canonCop?: number }) {
    act(() => {
      root.render(<PostularButton {...props} />)
    })
  }

  function link(): HTMLAnchorElement | null {
    return container.querySelector('a')
  }

  it('sin postulación activa: el CTA lleva al wizard', () => {
    render({ propertyId: 'prop-X', canonCop: 1_000_000 })
    expect(link()?.getAttribute('href')).toBe('/aplicar/prop-X')
    expect(container.textContent).toContain('Postularme')
  })

  it('con postulación activa: el CTA lleva a la postulación existente', () => {
    aplicacionMock.mockReturnValue({ activa: { id: 'app-1', status: 'UNDER_REVIEW' }, cargando: false })
    render({ propertyId: 'prop-X', canonCop: 1_000_000 })

    expect(link()?.getAttribute('href')).toBe('/inquilino/aplicaciones/app-1')
    expect(container.textContent).toContain('Ir a mi postulación')
    expect(container.textContent).not.toContain('Postularme')
  })

  it('la postulación activa tiene prioridad aunque la aprobación esté vencida', () => {
    aprobacionMock.mockReturnValue({ aprobacion: APROBADA, cargando: false, vigente: false })
    aplicacionMock.mockReturnValue({ activa: { id: 'app-9', status: 'APPROVED' }, cargando: false })
    render({ propertyId: 'prop-X', canonCop: 1_000_000 })

    expect(link()?.getAttribute('href')).toBe('/inquilino/aplicaciones/app-9')
    expect(container.textContent).toContain('Ir a mi postulación')
  })
})
