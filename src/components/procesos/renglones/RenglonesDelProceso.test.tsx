/**
 * «Ver detalle» del centro de procesos (Nico, 20-10-2026): lo que hizo el
 * proceso, cosa por cosa, y cada cosa abre SU cajón.
 *
 * Lo que se protege:
 *  1. El resumen dice cuántas salieron y cuántas no.
 *  2. Una fila de un contrato (o propietario, cobro…) se abre en su ficha, con
 *     los datos de ESE contrato y el enlace a su pantalla.
 *  3. Una fila sin cajón (un lote de importación) se lee, no se abre.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { PaginaDeRenglones, RenglonDelProceso } from '@/lib/api/procesos.types'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}))
vi.mock('@/lib/api/procesos.service', () => ({ procesosApi: { renglones: vi.fn() } }))
vi.mock('@/lib/api/contracts.service', () => ({ contractsApi: { getById: vi.fn() } }))

import { procesosApi } from '@/lib/api/procesos.service'
import { contractsApi } from '@/lib/api/contracts.service'
import { RenglonesDelProceso } from './RenglonesDelProceso'

const renglon = (extra: Partial<RenglonDelProceso>): RenglonDelProceso => ({
  n: '1',
  estado: 'OK',
  titulo: '#1203 · Mateo Giraldo',
  detalle: null,
  motivo: null,
  montoCop: null,
  recurso: null,
  createdAt: '2026-10-20T15:00:00.000Z',
  ...extra,
})

const pagina = (renglones: RenglonDelProceso[]): PaginaDeRenglones => ({
  disponible: true,
  renglones,
  siguiente: null,
  resumen: {
    OK: renglones.filter((r) => r.estado === 'OK').length,
    FALLO: renglones.filter((r) => r.estado === 'FALLO').length,
    OMITIDO: renglones.filter((r) => r.estado === 'OMITIDO').length,
    total: renglones.length,
  },
})

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
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

const esperar = () => new Promise((r) => setTimeout(r, 0))
async function montar(el: React.ReactElement) {
  await act(async () => {
    root.render(el)
    await esperar()
  })
}

describe('RenglonesDelProceso', () => {
  it('el resumen dice cuántas salieron y cuántas no', async () => {
    vi.mocked(procesosApi.renglones).mockResolvedValue(
      pagina([
        renglon({ n: '1' }),
        renglon({ n: '2', estado: 'FALLO', titulo: 'Luis Gómez', motivo: 'Sin cuenta' }),
      ]),
    )
    await montar(<RenglonesDelProceso procesoId="p-1" activo={false} />)
    expect(container.querySelector('[data-testid="resumen-de-renglones"]')?.textContent).toBe(
      '1 salieron · 1 no salieron',
    )
    expect(container.textContent).toContain('Sin cuenta')
  })

  it('una fila de contrato abre la ficha de ESE contrato, con el enlace a su pantalla', async () => {
    vi.mocked(procesosApi.renglones).mockResolvedValue(
      pagina([renglon({ recurso: { tipo: 'CONTRATO', id: 'ct-9' } })]),
    )
    vi.mocked(contractsApi.getById).mockResolvedValue({
      id: 'ct-9',
      code: 1203,
      externalId: null,
      status: 'active',
      tenantName: 'Mateo Giraldo',
      tenantEmail: 'mateo@example.test',
      propertyAddress: 'Cra 76 #12-40',
      propertyCity: 'Medellín',
      monthlyRent: 2_350_000,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    } as never)
    await montar(<RenglonesDelProceso procesoId="p-1" activo={false} />)

    const fila = container.querySelector('[data-testid="renglon-del-proceso"] button') as HTMLButtonElement
    expect(fila).not.toBeNull()
    await act(async () => {
      fila.click()
      await esperar()
      await esperar()
    })

    expect(contractsApi.getById).toHaveBeenCalledWith('ct-9')
    const ficha = document.body.textContent ?? ''
    expect(ficha).toContain('Contrato #1203')
    expect(ficha).toContain('Cra 76 #12-40 · Medellín')
    expect(ficha).toContain('Activo')
    const enlace = document.body.querySelector('[data-testid="ficha-del-recurso-enlace"]') as HTMLAnchorElement
    expect(enlace.getAttribute('href')).toBe('/panel/inmobiliaria/contratos/ct-9')
  })

  it('una fila sin cajón (un lote de importación) se lee, no se abre', async () => {
    vi.mocked(procesosApi.renglones).mockResolvedValue(
      pagina([renglon({ titulo: 'Carga de inmuebles', recurso: { tipo: 'LOTE_DE_IMPORTACION', id: 'li-1' } })]),
    )
    await montar(<RenglonesDelProceso procesoId="p-1" activo={false} />)
    expect(container.querySelector('[data-testid="renglon-del-proceso"] button')).toBeNull()
    expect(container.textContent).toContain('Carga de inmuebles')
  })
})
