/**
 * «Mi Calificación Leasefy»: la lista de arriendos de la persona (QA del
 * 19-10-2026). Lo que sostiene:
 *   · el singular: «1 mes» y «peor atraso 1 día», nunca «1 meses» ni «1 días»;
 *   · el contrato migrado que la inmobiliaria evaluó y no tiene cuotas en
 *     Leasefy dice «sin cuotas pagadas en Leasefy» y «Terminó; lo evaluó la
 *     inmobiliaria», nunca «0 de 0 a tiempo».
 */
import * as React from 'react'
import { Suspense } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { ContratoDeLaPersona, MiCalificacion } from '@/lib/api/calificacion-leasefy.service'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { mia } = vi.hoisted(() => ({ mia: vi.fn() }))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))
vi.mock('@/lib/api/calificacion-leasefy.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/calificacion-leasefy.service')>(
    '@/lib/api/calificacion-leasefy.service',
  )
  return { ...real, calificacionLeasefyApi: { ...real.calificacionLeasefyApi, mia: () => mia() } }
})

import MiCalificacionPage from './page'

const contrato = (c: Partial<ContratoDeLaPersona> & { contractId: string }): ContratoDeLaPersona => ({
  inmobiliaria: 'Portofino',
  direccion: 'Calle 1',
  inicio: null,
  fin: null,
  meses: 12,
  cuotasContadas: 12,
  cuotasATiempo: 12,
  peorAtrasoDias: 0,
  termino: 'VIGENTE',
  deudaVencidaCop: 0,
  ...c,
})

const DATOS: MiCalificacion = {
  persona: { userId: 'u1', nombre: 'Prueba' },
  autorizacion: { vigente: false, version: null, desde: null, versionActual: 'v1', hayVersionNueva: false },
  historial: {
    mesesObservados: 20,
    cuotasContadas: 4,
    porcentajeATiempo: 75,
    peorAtrasoDias24m: 1,
    contratos: 3,
    inmobiliarias: 1,
    contratosTerminados: 1,
    terminaronSinDeuda: 0,
    porContrato: [
      contrato({ contractId: 'k-un-mes', direccion: 'Calle del mes', meses: 1, cuotasContadas: 1, cuotasATiempo: 1 }),
      contrato({ contractId: 'k-un-dia', direccion: 'Calle del día', meses: 4, cuotasContadas: 3, cuotasATiempo: 2, peorAtrasoDias: 1 }),
      contrato({
        contractId: 'k-evaluado',
        direccion: 'Calle evaluada',
        meses: 15,
        cuotasContadas: 0,
        cuotasATiempo: 0,
        termino: 'EVALUADO',
      }),
    ],
  },
  consultas: { disponible: true, lista: [] },
  evaluaciones: { disponible: true, lista: [] },
  certificados: { disponible: true, precioCop: 25000, lista: [] },
}

let host: HTMLDivElement | null = null
let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  host = null
  root = null
  mia.mockReset()
})

async function montar() {
  mia.mockResolvedValue(DATOS)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  const searchParams = Promise.resolve({})
  await act(async () => {
    root!.render(
      <Suspense fallback={null}>
        <MiCalificacionPage searchParams={searchParams} />
      </Suspense>,
    )
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50))
  })
}

/** El texto de la fila del contrato que tiene esa dirección. */
const fila = (direccion: string) => {
  const p = [...document.querySelectorAll('p')].find((e) => e.textContent === direccion)
  return p?.closest('.py-3')?.textContent ?? ''
}

describe('Mi Calificación Leasefy: los arriendos de la persona', () => {
  it('un contrato de un mes dice «1 mes», no «1 meses»', async () => {
    await montar()
    const t = fila('Calle del mes')
    expect(t).toContain('1 mes')
    expect(t).not.toContain('1 meses')
  })

  it('un atraso de un día dice «peor atraso 1 día»', async () => {
    await montar()
    const t = fila('Calle del día')
    expect(t).toContain('peor atraso 1 día')
    expect(t).not.toContain('1 días')
  })

  it('el contrato evaluado sin cuotas no dice «0 de 0 a tiempo»', async () => {
    await montar()
    const t = fila('Calle evaluada')
    expect(t).toContain('15 meses')
    expect(t).toContain('sin cuotas pagadas en Leasefy')
    expect(t).toContain('Terminó; lo evaluó la inmobiliaria')
    expect(t).not.toContain('0 de 0')
  })
})
