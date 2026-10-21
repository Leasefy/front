/**
 * Las fichas nuevas del centro de procesos (Nico, 21-10-2026: «sí, después de
 * los roles»): la postulación, la renovación, la PQRS, el recibo y el lote de
 * giros abren su cajón con lo justo para saber de qué se trata, y su enlace.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/applications.service', () => ({ landlordApplicationsApi: { getDetail: vi.fn() } }))
vi.mock('@/lib/api/pqrs-agencia.service', () => ({ pqrsApi: { detalle: vi.fn() } }))
vi.mock('@/lib/api/recibos-de-caja.service', () => ({ recibosDeCajaApi: { ver: vi.fn() } }))
vi.mock('@/lib/api/lotes-de-dispersion.service', () => ({ lotesDeDispersionApi: { ver: vi.fn() } }))

import { landlordApplicationsApi } from '@/lib/api/applications.service'
import { pqrsApi } from '@/lib/api/pqrs-agencia.service'
import { recibosDeCajaApi } from '@/lib/api/recibos-de-caja.service'
import { lotesDeDispersionApi } from '@/lib/api/lotes-de-dispersion.service'
import { renovacionesApi } from '@/lib/api/inmobiliaria.service'
import { FichaDelRecurso, TIPOS_CON_FICHA } from './FichaDelRecurso'

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
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

async function abrir(tipo: string, id = 'r-1') {
  await act(async () => {
    root.render(<FichaDelRecurso recurso={{ tipo, id }} onCerrar={() => {}} />)
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
  return document.body.textContent ?? ''
}

const enlace = () => document.querySelector('[data-testid="ficha-del-recurso-enlace"]')?.getAttribute('href')

describe('las fichas nuevas del centro de procesos', () => {
  it('se abren los cinco tipos nuevos', () => {
    for (const t of ['POSTULACION', 'RENOVACION', 'PQRS', 'RECIBO', 'LOTE_DE_DISPERSION']) {
      expect(TIPOS_CON_FICHA.has(t)).toBe(true)
    }
  })

  it('la postulación: el nombre del candidato, su estado y el canon', async () => {
    vi.mocked(landlordApplicationsApi.getDetail).mockResolvedValue({
      id: 'r-1',
      status: 'REJECTED',
      submittedAt: '2026-10-10T15:00:00Z',
      tenant: { id: 't', firstName: 'Camila', lastName: 'Ríos', email: 'camila@example.test', phone: '3001112233' },
      property: { id: 'p', title: 'Apartamento en Laureles', monthlyRent: 2_500_000 },
    } as never)
    const texto = await abrir('POSTULACION')
    expect(texto).toContain('Camila Ríos')
    expect(texto).toContain('Rechazado')
    expect(texto).toContain('Apartamento en Laureles')
    expect(enlace()).toBe('/panel/inmobiliaria/postulaciones')
  })

  it('la renovación: el canon de hoy y el propuesto', async () => {
    vi.spyOn(renovacionesApi, 'getById').mockResolvedValue({
      id: 'r-1',
      tenantName: 'Mateo Giraldo',
      propertyAddress: 'Calle 10 # 43-50',
      propertyTitle: '',
      status: 'negotiating',
      leaseEndDate: '2026-12-31',
      currentRent: 2_000_000,
      proposedRent: 2_100_000,
      propietarioName: 'Ana Restrepo',
    } as never)
    const texto = await abrir('RENOVACION')
    expect(texto).toContain('Renovación de Mateo Giraldo')
    expect(texto).toContain('Ana Restrepo')
    expect(texto).toMatch(/2\.100\.000/)
    expect(enlace()).toBe('/panel/inmobiliaria/contratos/renovaciones')
  })

  it('la PQRS: radicado, tipo, estado y responsable', async () => {
    vi.mocked(pqrsApi.detalle).mockResolvedValue({
      id: 'r-1',
      radicado: 'PQRS-0042',
      tipo: 'QUEJA',
      asunto: 'No funciona el calentador',
      estado: 'EN_PROCESO',
      slaVenceAt: '2026-10-25T00:00:00Z',
      solicitanteNombre: 'Laura Gómez',
      asignadoANombre: null,
      inmuebleLabel: 'Carrera 76 # 34-21',
      descripcion: null,
    } as never)
    const texto = await abrir('PQRS')
    expect(texto).toContain('PQRS-0042')
    expect(texto).toContain('No funciona el calentador')
    expect(texto).toContain('Sin asignar')
    expect(enlace()).toBe('/panel/inmobiliaria/solicitudes')
  })

  it('el recibo: número, valor, el mes de su cobro y si está anulado', async () => {
    vi.mocked(recibosDeCajaApi.ver).mockResolvedValue({
      id: 'r-1',
      numero: 51,
      valorCop: 1_500_000,
      fecha: '2026-10-05',
      medio: 'TRANSFERENCIA',
      referencia: null,
      notas: null,
      registradoPorUserId: 'u',
      anuladoAt: null,
      cobro: { id: 'c', month: '2026-10', propertyTitle: 'Apto 301', tenantName: 'Mateo Giraldo', totalWithFees: 1_500_000, paidAmount: 1_500_000, pendingAmount: 0, status: 'paid' },
    } as never)
    const texto = await abrir('RECIBO')
    expect(texto).toContain('Recibo de caja N.º 51')
    expect(texto).toContain('Mateo Giraldo')
    expect(texto).toContain('Vigente')
    expect(texto).toMatch(/octubre/i)
    expect(texto).toContain('Transferencia')
    expect(enlace()).toBe('/panel/inmobiliaria/pagos/recibos')
  })

  it('el recibo sin cobro lo dice, y el medio en minúscula se lee bien', async () => {
    vi.mocked(recibosDeCajaApi.ver).mockResolvedValue({
      id: 'r-1',
      numero: 8,
      valorCop: 850_000,
      fecha: '2026-10-14',
      medio: 'transferencia',
      referencia: null,
      notas: null,
      registradoPorUserId: 'u',
      anuladoAt: null,
      cobro: null,
    } as never)
    const texto = await abrir('RECIBO')
    expect(texto).toContain('Sin cobro asociado')
    expect(texto).not.toContain('Sin inquilino')
    expect(texto).toContain('Transferencia')
    expect(texto).not.toContain('transferencia')
  })

  it('el lote de giros: mes, cuántos giros, total y su enlace', async () => {
    vi.mocked(lotesDeDispersionApi.ver).mockResolvedValue({
      lote: { id: 'r-1', month: '2026-10', estado: 'PAGADO', totalCop: 9_000_000, cantidad: 3, aprobadoAt: '2026-10-06', pagadoAt: '2026-10-07' },
    } as never)
    const texto = await abrir('LOTE_DE_DISPERSION', 'lote-9')
    expect(texto).toMatch(/Lote de giros de octubre/i)
    expect(texto).toContain('3 giros')
    expect(enlace()).toBe('/panel/inmobiliaria/pagos/dispersiones/lotes/lote-9')
  })
})
