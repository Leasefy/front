/**
 * «Mis solicitudes de avalúo» lee los avalúos de verdad (QA 19-10-2026, Nico).
 *
 * Antes leía la cola de los agentes, que el micro devuelve SIEMPRE vacía para
 * avalúos: en producción decía «0 Activas · Aún no tienes solicitudes» aunque la
 * inmobiliaria tuviera avalúos. Lo que sostiene esta prueba:
 *  - cada avalúo sale con sus pasos, la fecha en que se pidió y la de la firma;
 *  - el firmado trae su certificado; el que va en camino, su página de estado;
 *  - «Activas» se cuenta en el servicio (borrador + en revisión), no en la página;
 *  - sin el servicio (502) dice que no se pueden ver: nunca «0» ni «Aún no tienes».
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { ApiError } from '@/lib/api/client'
import type { AgencyAvaluoItem } from '@/lib/api/inmobiliaria.service'

void React // jsx-preserve
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

// El origen del asistente de avalúos, controlable por prueba.
let _origen = ''
vi.mock('@/lib/avaluo/wizard-url', () => ({
  get AVALUO_WIZARD_ORIGIN() {
    return _origen
  },
}))

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('../DescargarCertificado', () => ({
  ESTADOS_CON_CERTIFICADO: ['firmado', 'entregado'],
  tieneCertificado: (e: string) => e === 'firmado' || e === 'entregado',
  DescargarCertificado: ({ id }: { id: string }) => <button data-testid={`certificado-${id}`}>Descargar certificado</button>,
}))

type Respuesta = { avaluos: AgencyAvaluoItem[]; total: number; isLoading?: boolean; errorCrudo?: unknown }
let respuestas: { todas: Respuesta; borrador: Respuesta; revision: Respuesta }

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useAgencyAvaluos: (p?: { state?: string }) => {
    const r = p?.state === 'borrador' ? respuestas.borrador : p?.state === 'en_revisión' ? respuestas.revision : respuestas.todas
    return { pageSize: 100, isLoading: false, errorCrudo: null, refetch: vi.fn(), ...r }
  },
}))

import AvaluosColaPage from './page'

const avaluo = (x: Partial<AgencyAvaluoItem>): AgencyAvaluoItem => ({
  id: 'a-1',
  slug: 's-1',
  state: 'en_revisión',
  valueCop: 420_000_000,
  method: 'Comparables',
  city: 'Medellín',
  ownerName: 'Paula Propietaria',
  identity: '1017',
  submissionId: 'sub-1',
  createdAt: '2026-10-03T15:00:00.000Z',
  updatedAt: '2026-10-03T15:00:00.000Z',
  signedAt: null,
  ...x,
})

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  _origen = ''
  respuestas = {
    todas: { avaluos: [], total: 0 },
    borrador: { avaluos: [], total: 0 },
    revision: { avaluos: [], total: 0 },
  }
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function montar() {
  await act(async () => {
    root.render(<AvaluosColaPage />)
  })
}

describe('Mis solicitudes de avalúo — los avalúos de verdad', () => {
  it('cada avalúo con sus pasos, cuándo se pidió y cuándo se firmó; el firmado trae su certificado', async () => {
    respuestas.todas = {
      avaluos: [
        avaluo({ id: 'a-1', state: 'en_revisión', submissionId: 'sub-1' }),
        avaluo({ id: 'a-2', state: 'firmado', ownerName: 'Julia Ochoa', signedAt: '2026-10-05T15:00:00.000Z', submissionId: 'sub-2' }),
      ],
      total: 2,
    }
    respuestas.borrador = { avaluos: [], total: 1 }
    respuestas.revision = { avaluos: [], total: 3 }
    await montar()

    const filas = [...container.querySelectorAll('[data-testid="avaluo-solicitud"]')]
    expect(filas).toHaveLength(2)
    expect(filas[0].textContent).toContain('Paula Propietaria')
    expect(filas[0].textContent).toContain('En revisión')
    expect(filas[0].textContent).toMatch(/Pedido el 3 de oct\.? de 2026/)
    // En camino: su página de estado, en otra pestaña.
    const enlace = filas[0].querySelector('a') as HTMLAnchorElement
    expect(enlace.getAttribute('href')).toBe('/avaluo/estado/sub-1')
    expect(enlace.target).toBe('_blank')
    expect(enlace.textContent).toContain('Ver en qué va')
    // Firmado: certificado y la fecha de la firma.
    expect(filas[1].textContent).toMatch(/firmado el 5 de oct\.? de 2026/)
    expect(filas[1].querySelector('[data-testid="certificado-a-2"]')).not.toBeNull()
    // Los pasos dicen en qué va cada uno.
    const pasos = [...container.querySelectorAll('[data-testid="avaluo-pasos"]')].map((p) => p.getAttribute('aria-label'))
    expect(pasos).toEqual(['En qué va: En revisión', 'En qué va: Entregado'])
    // «Activas» = borrador + en revisión, contados en el servicio.
    expect(container.querySelector('[data-testid="avaluos-activas"]')?.textContent).toContain('4')
  })

  it('el rechazado se queda en la revisión, en rojo, y dice «Rechazado»', async () => {
    respuestas.todas = { avaluos: [avaluo({ state: 'rechazado', valueCop: null, submissionId: null })], total: 1 }
    await montar()
    const fila = container.querySelector('[data-testid="avaluo-solicitud"]')!
    expect(fila.querySelector('[data-testid="avaluo-pasos"]')?.getAttribute('aria-label')).toBe('En qué va: Rechazado')
    expect(fila.querySelector('[aria-current="step"]')?.textContent).toBe('Rechazado')
    expect(fila.textContent).toContain('—')
    expect(fila.querySelector('a')).toBeNull()
  })

  it('sin el servicio dice que no se pueden ver: ni «0» ni «Aún no tienes solicitudes»', async () => {
    const caido = new ApiError(502, 'El servicio de avalúos no responde')
    respuestas.todas = { avaluos: [], total: 0, errorCrudo: caido }
    respuestas.borrador = { avaluos: [], total: 0, errorCrudo: caido }
    respuestas.revision = { avaluos: [], total: 0, errorCrudo: caido }
    await montar()
    expect(container.querySelector('[data-testid="avaluos-cola-sin-servicio"]')?.textContent).toContain(
      'No pudimos leer tus solicitudes',
    )
    expect(container.textContent).not.toContain('Aún no tienes solicitudes')
    // Sin el conteo no se inventa uno: junto al título no va nada (antes «— activas»).
    expect(container.querySelector('[data-testid="avaluos-activas"]')).toBeNull()
    expect(container.querySelector('[data-testid="avaluos-cola-reintentar"]')).not.toBeNull()
  })

  it('con el servicio y sin avalúos, sí dice que aún no hay y ofrece pedir el primero', async () => {
    _origen = 'http://localhost:3003'
    await montar()
    expect(container.textContent).toContain('Aún no tienes solicitudes')
    expect(container.querySelector('[data-testid="avaluos-activas"]')?.textContent).toContain('0')
    const crear = [...container.querySelectorAll('a')].find((a) => a.textContent?.includes('Solicitar avalúo'))
    expect(crear?.getAttribute('href')).toBe('/panel/inmobiliaria/inmuebles/avaluos')
  })

  it('sin el asistente conectado, el vacío no ofrece una puerta cerrada y dice por qué', async () => {
    await montar()
    expect([...container.querySelectorAll('a')].some((a) => a.textContent?.includes('Solicitar avalúo'))).toBe(false)
    // Glow up 22-10 (revisora r24, Avalúos #1): la frase compartida dice que falta activarlos, sin «este entorno».
    expect(container.textContent).toContain('hasta activarlos')
  })
})
