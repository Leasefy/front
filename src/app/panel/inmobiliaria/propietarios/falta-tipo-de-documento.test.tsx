/**
 * AVISO-TIPO-DOC (05-10-2026): el enlace del aviso lleva a Propietarios
 * filtrada por lo que falta (`?falta=tipo-de-documento`).
 *  · entra filtrada: sólo los que tienen mandato y el documento que frena;
 *  · la barra dice qué se está viendo y «Quitar filtro» devuelve la lista
 *    entera (y saca el parámetro de la barra de direcciones);
 *  · sin el parámetro, la lista de siempre y sin barra.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { params, listaMock } = vi.hoisted(() => ({
  params: { falta: null as string | null },
  listaMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (k: string) => (k === 'falta' ? params.falta : null) }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k, formatCurrency: (n: number) => String(n) }),
}))
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}))
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => true, isLoading: false }),
}))
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePropietarios: () => ({ propietarios: listaMock(), isLoading: false, errorCrudo: null, refetch: vi.fn() }),
}))
vi.mock('@/lib/hooks/use-migracion-con-deuda', () => ({ useMigracionConDeuda: () => null }))
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  propietariosApi: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}))
// La tabla pinta los nombres que recibe: acá se prueba QUÉ le llega.
vi.mock('@/components/inmobiliaria', () => ({
  PropietarioCard: () => null,
  PropietarioTable: ({ propietarios }: { propietarios: { id: string; name: string }[] }) => (
    <ul data-testid="tabla">
      {propietarios.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  ),
  PropietarioForm: () => null,
}))
vi.mock('@/components/inmobiliaria/TerceroIACapture', () => ({ TerceroIACapture: () => null }))
// El aviso tiene su propia prueba; acá no hay proveedor de permisos y no se pinta.
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

import PropietariosPage from './page'
import type { Propietario } from '@/lib/types/inmobiliaria'

const p = (id: string, over: Partial<Propietario> = {}): Propietario =>
  ({
    id,
    name: id,
    email: null,
    phone: null,
    documentType: 'CC',
    documentNumber: '43123456',
    propertyCount: 1,
    copropiedadesCount: 0,
    totalMonthlyRent: 0,
    pendingBalance: 0,
    datosPendientes: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...over,
  }) as Propietario

const LISTA = [
  p('Inversiones Laboratorio S.A.S.', { documentNumber: '901222333', datosPendientes: ['tipoDocumentoPorRevisar'] }),
  p('QA-FACT E2 Propietario', { documentType: null, datosPendientes: ['tipoDocumento'] }),
  p('AVISO-TIPO-DOC Sin documento', { documentType: null, documentNumber: null, datosPendientes: ['documento', 'tipoDocumento'] }),
  p('Paula Completa'),
  p('Sin mandato', { propertyCount: 0, documentType: null, datosPendientes: ['tipoDocumento'] }),
]

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  params.falta = null
  listaMock.mockReset().mockReturnValue(LISTA)
  window.history.replaceState(null, '', '/panel/inmobiliaria/propietarios?falta=tipo-de-documento&page=2')
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const nombres = () => [...host.querySelectorAll('[data-testid="tabla"] li')].map((li) => li.textContent)
const barra = () => host.querySelector('[data-testid="filtro-falta-documento"]')

describe('Propietarios · ?falta=tipo-de-documento (AVISO-TIPO-DOC)', () => {
  it('🔴 entra filtrada: sólo los que tienen mandato y el documento que frena, y lo dice', async () => {
    params.falta = 'tipo-de-documento'
    await act(async () => {
      root.render(<PropietariosPage />)
    })
    expect(nombres().sort()).toEqual(['AVISO-TIPO-DOC Sin documento', 'Inversiones Laboratorio S.A.S.', 'QA-FACT E2 Propietario'])
    expect(barra()?.textContent).toContain('Se muestran 3 propietarios con mandato y el documento por completar')
  })

  it('🔴 «Quitar filtro» vuelve a la lista entera y saca el parámetro de la barra', async () => {
    params.falta = 'tipo-de-documento'
    await act(async () => {
      root.render(<PropietariosPage />)
    })
    const quitar = host.querySelector('[data-testid="quitar-filtro-falta-documento"]') as HTMLButtonElement
    await act(async () => {
      quitar.click()
    })
    expect(nombres()).toHaveLength(5)
    expect(window.location.search).toBe('?page=2')
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400))
    })
    expect(barra()).toBeNull()
  })

  it('sin el parámetro, la lista de siempre y sin barra', async () => {
    await act(async () => {
      root.render(<PropietariosPage />)
    })
    expect(nombres()).toHaveLength(5)
    expect(barra()).toBeNull()
  })
})
