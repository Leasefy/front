/**
 * Avalúos — «Descargar certificado» en las filas firmadas (PROMESAS-Y-DIRECTOR, 05-10-2026).
 *
 * El back ya expone el PDF firmado de la inmobiliaria
 * (`GET /inmobiliaria/avaluos/:id/certificate`, `avaluos.controller.ts:82`,
 * acotado a la agencia por su correo: anti-IDOR) y la lista no lo ofrecía: el
 * único camino era buscar el correo. Ahora cada fila con el certificado ya
 * firmado (`firmado` y `entregado`, que es un firmado ya enviado) tiene su botón,
 * con su «Descargando…» y su error.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/avaluo/wizard-url', () => ({
  AVALUO_WIZARD_ORIGIN: 'http://localhost:3003',
  AVALUO_WIZARD_URL: 'http://localhost:3003/avaluo',
}))

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

const FILAS = [
  { id: 'av-firmado', state: 'firmado', ownerName: 'Laura Gómez', method: 'comparacion', valueCop: 450_000_000, createdAt: '2026-10-01T10:00:00Z' },
  { id: 'av-entregado', state: 'entregado', ownerName: 'Pedro Ruiz', method: 'comparacion', valueCop: 320_000_000, createdAt: '2026-09-28T10:00:00Z' },
  { id: 'av-revision', state: 'en_revisión', ownerName: 'Ana Toro', method: 'comparacion', valueCop: null, createdAt: '2026-10-03T10:00:00Z' },
  { id: 'av-borrador', state: 'borrador', ownerName: 'Luis Mora', method: null, valueCop: null, createdAt: '2026-10-04T10:00:00Z' },
  { id: 'av-rechazado', state: 'rechazado', ownerName: 'Eva Paz', method: null, valueCop: null, createdAt: '2026-10-02T10:00:00Z' },
]

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useAgencyAvaluos: () => ({
    data: { items: FILAS, total: FILAS.length, pageSize: 100 },
    avaluos: FILAS,
    total: FILAS.length,
    pageSize: 100,
    isLoading: false,
    error: null,
    errorCrudo: null,
    refetch: vi.fn(async () => null),
  }),
}))

const { certificadoMock, descargarBlobMock, toastError } = vi.hoisted(() => ({
  certificadoMock: vi.fn(),
  descargarBlobMock: vi.fn(),
  toastError: vi.fn(),
}))
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  avaluosApi: {
    solicitar: vi.fn(),
    certificado: (id: string) => certificadoMock(id),
  },
}))
vi.mock('@/lib/reportes/exportables', () => ({
  descargarBlob: (blob: Blob, nombre: string) => descargarBlobMock(blob, nombre),
}))
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() } }))

import AvaluosSalaPage from './page'
import { ApiError } from '@/lib/api/client'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

async function montar() {
  await act(async () => {
    root.render(React.createElement(AvaluosSalaPage))
  })
}

const boton = (id: string) => container.querySelector<HTMLButtonElement>(`[data-testid="avaluo-descargar-${id}"]`)

describe('Avalúos — Descargar certificado', () => {
  it('sale en las filas firmadas y entregadas, y en ninguna otra', async () => {
    await montar()
    expect(boton('av-firmado')).not.toBeNull()
    expect(boton('av-entregado')).not.toBeNull()
    expect(boton('av-revision')).toBeNull()
    expect(boton('av-borrador')).toBeNull()
    expect(boton('av-rechazado')).toBeNull()
    expect(boton('av-firmado')!.getAttribute('aria-label')).toContain('Descargar el certificado')
    expect(boton('av-firmado')!.getAttribute('aria-label')).toContain('Laura Gómez')
  })

  it('pide el PDF de ESA fila, dice «Descargando…» mientras tanto y lo guarda con su nombre', async () => {
    let soltar: (b: Blob) => void = () => {}
    certificadoMock.mockReturnValue(new Promise<Blob>((r) => (soltar = r)))
    await montar()

    await act(async () => {
      boton('av-firmado')!.click()
    })
    expect(certificadoMock).toHaveBeenCalledWith('av-firmado')
    expect(boton('av-firmado')!.disabled).toBe(true)
    expect(boton('av-firmado')!.getAttribute('aria-busy')).toBe('true')
    expect(boton('av-firmado')!.textContent).toContain('Descargando')
    // Las demás filas no se apagan por esta descarga.
    expect(boton('av-entregado')!.disabled).toBe(false)

    const pdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    await act(async () => {
      soltar(pdf)
    })
    expect(descargarBlobMock).toHaveBeenCalledWith(pdf, 'certificado-avaluo-av-firmado.pdf')
    expect(boton('av-firmado')!.disabled).toBe(false)
    expect(toastError).not.toHaveBeenCalled()
  })

  it('si el back no lo entrega, lo dice y el botón vuelve a quedar listo para reintentar', async () => {
    certificadoMock.mockRejectedValue(
      new ApiError(502, 'Avaluo service unreachable', 'SERVICIO_NO_DISPONIBLE', { servicio: 'avaluos' }),
    )
    await montar()

    await act(async () => {
      boton('av-entregado')!.click()
    })
    expect(descargarBlobMock).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledTimes(1)
    const mensaje = String(toastError.mock.calls[0][0])
    expect(mensaje).not.toContain('Avaluo service unreachable')
    expect(mensaje.length).toBeGreaterThan(10)
    expect(boton('av-entregado')!.disabled).toBe(false)
    expect(boton('av-entregado')!.textContent).not.toContain('Descargando')
  })
})
