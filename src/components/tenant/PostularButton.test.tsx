/**
 * El botón «Postularme» y la oferta del estudio.
 *
 * 🔴 El estudio es OPCIONAL (Nico, 04-10-2026: «el estudio es opcional, no es
 * obligatorio»). Reglas que se protegen acá:
 *  · el botón NUNCA frena: sin estudio, vencido, en curso o sin respaldo lleva
 *    igual al asistente (antes abría «Antes de postularte»);
 *  · con una postulación activa lleva a ella;
 *  · `ofertaDelEstudio` decide qué se le OFRECE en /aplicar, nunca un freno.
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
  // La variante viaja como `data-variant`, igual que en el Content de Cadence.
  DialogContent: ({
    children,
    variant,
    'data-testid': testId,
  }: {
    children: React.ReactNode
    variant?: string
    'data-testid'?: string
  }) => (
    <div data-testid={testId} data-variant={variant}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@phosphor-icons/react', () => ({ Info: () => null }))

import { PostularButton, ofertaDelEstudio } from './PostularButton'
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

describe('ofertaDelEstudio', () => {
  it('aprobado y vigente: nada que ofrecer', () => {
    expect(ofertaDelEstudio({ aprobacion: APROBADA, vigente: true })).toBeNull()
  })

  it('vencida: se le ofrece renovar', () => {
    expect(ofertaDelEstudio({ aprobacion: APROBADA, vigente: false })).toBe('vencido')
  })

  it.each([
    ['sin_estudio', 'sin_estudio'],
    ['en_proceso', 'en_curso'],
    ['rechazado', 'sin_respaldo'],
  ])('estado %s → oferta %s', (estado, esperado) => {
    expect(ofertaDelEstudio({ aprobacion: { ...APROBADA, estado }, vigente: false })).toBe(esperado)
  })

  it('mientras no se sabe nada (null) no se ofrece nada', () => {
    expect(ofertaDelEstudio({ aprobacion: null, vigente: false })).toBeNull()
  })

  it('sin sesión y sin estudio: ofrece entrar (puede tener cuenta), no lo da por «sin estudio»', () => {
    const SIN_ESTUDIO: Aprobacion = { ...APROBADA, estado: 'sin_estudio', topeAprobadoCop: null }
    expect(ofertaDelEstudio({ aprobacion: SIN_ESTUDIO, vigente: false, haySesion: false })).toBe('sin_sesion')
    expect(ofertaDelEstudio({ aprobacion: SIN_ESTUDIO, vigente: false, haySesion: true })).toBe('sin_estudio')
  })

  it('un respaldo local aprobado no recibe oferta aunque no haya sesión', () => {
    expect(ofertaDelEstudio({ aprobacion: APROBADA, vigente: true, haySesion: false })).toBeNull()
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

  it.each([
    ['vencida', { aprobacion: APROBADA, cargando: false, vigente: false }],
    ['en curso', { aprobacion: { ...APROBADA, estado: 'en_proceso' }, cargando: false, vigente: false }],
    ['sin estudio', { aprobacion: { ...APROBADA, estado: 'sin_estudio' }, cargando: false, vigente: false }],
    ['sin respaldo', { aprobacion: { ...APROBADA, estado: 'rechazado' }, cargando: false, vigente: false }],
  ])('🔴 %s: NO frena, lleva al asistente (el estudio es opcional)', (_caso, aprobacion) => {
    aprobacionMock.mockReturnValue(aprobacion)
    render({ propertyId: 'prop-X', canonCop: 1_000_000 })
    expect(link()?.getAttribute('href')).toBe('/aplicar/prop-X')
    expect(container.querySelector('[data-testid="antes-de-postularte"]')).toBeNull()
  })

  it('la postulación activa tiene prioridad aunque la aprobación esté vencida', () => {
    aprobacionMock.mockReturnValue({ aprobacion: APROBADA, cargando: false, vigente: false })
    aplicacionMock.mockReturnValue({ activa: { id: 'app-9', status: 'APPROVED' }, cargando: false })
    render({ propertyId: 'prop-X', canonCop: 1_000_000 })

    expect(link()?.getAttribute('href')).toBe('/inquilino/aplicaciones/app-9')
    expect(container.textContent).toContain('Ir a mi postulación')
  })
})
