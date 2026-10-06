/**
 * PilotoModoPropio — la perilla PROPIA del alias (ola E, Nico C2-IA Q5:
 * «perilla propia `conciliacion.alias`»):
 *   · el administrador elige Manual / Copiloto / Automático aparte del agente;
 *   · otro rol, o sin la migración, ve el modo y el porqué, sin control;
 *   · sin elección dice que queda en Copiloto (nada sale solo);
 *   · la API: un micro viejo (404) no rompe el panel (lista vacía).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const agentFetchMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api/agent-fetch', () => ({ agentFetch: agentFetchMock }))

import { PilotoModoPropio, type PilotoModoPropioProps } from './PilotoModoPropio'
import { fetchPilotoModosPropios, putPilotoModoPropio, type ModoPropioDelProceso } from '@/lib/api/piloto'

const ALIAS: ModoPropioDelProceso = {
  id: 'conciliacion.alias',
  agente: 'conciliacion',
  nombre: 'Conciliar por un alias confirmado',
  queHace: 'Concilia solo el pago que identifica un alias confirmado.',
  nota: null,
  modo: 'copiloto',
  origen: 'default',
  queHaceEnCadaModo: {
    sombra: 'No lo hace: te lo propone.',
    copiloto: 'Lo prepara y lo deja en tu Bandeja con un clic.',
    autonomo: 'Lo hace solo y queda en la bitácora; por encima de tu tope por acción, pide un clic.',
  },
  cambiadoPor: null,
  cambiadoEn: null,
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  agentFetchMock.mockReset()
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test'
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  delete process.env.NEXT_PUBLIC_AGENT_URL
})

function pintar(cambios: Partial<PilotoModoPropioProps> = {}) {
  const onCambiar = vi.fn()
  act(() => {
    root.render(
      <PilotoModoPropio proceso={ALIAS} puedeEditar guardable porQueNo={null} ocupado={false} onCambiar={onCambiar} {...cambios} />,
    )
  })
  return { onCambiar }
}

describe('PilotoModoPropio', () => {
  it('el administrador ve los tres modos y elegir Automático lo pide', () => {
    const { onCambiar } = pintar()
    expect(container.textContent).toContain('Conciliar por un alias confirmado')
    expect(container.textContent).toContain('Perilla propia')
    expect(container.textContent).toContain('Mientras no lo elijas, queda en Copiloto')
    const automatico = [...container.querySelectorAll('button, [role="radio"]')].find((b) => b.textContent === 'Automático') as HTMLElement
    expect(automatico).toBeTruthy()
    act(() => automatico.click())
    expect(onCambiar).toHaveBeenCalledWith('autonomo')
  })

  it('otro rol ve el modo y el porqué, sin control', () => {
    pintar({ puedeEditar: false, porQueNo: 'Sólo un administrador cambia el modo de un proceso del Piloto.' })
    expect(container.querySelector('[data-testid="piloto-modo-propio-modo-conciliacion.alias"]')?.textContent).toBe('Copiloto')
    expect(container.textContent).toContain('Sólo un administrador')
    expect([...container.querySelectorAll('button')].some((b) => b.textContent === 'Automático')).toBe(false)
  })

  it('sin la migración tampoco se puede cambiar (y se dice)', () => {
    pintar({ guardable: false, porQueNo: 'Todavía no se puede cambiar el modo de este proceso; mientras tanto queda en Copiloto (nada sale solo).' })
    expect(container.textContent).toContain('Todavía no se puede cambiar el modo')
  })

  it('elegido por un administrador, no repite «mientras no lo elijas»', () => {
    pintar({ proceso: { ...ALIAS, modo: 'autonomo', origen: 'piloto' } })
    expect(container.textContent).not.toContain('Mientras no lo elijas')
    expect(container.textContent).toContain('Lo hace solo y queda en la bitácora')
  })
})

describe('la API de la perilla propia', () => {
  it('un micro viejo (404): lista vacía, el panel sigue', async () => {
    agentFetchMock.mockResolvedValue(new Response('{}', { status: 404 }))
    await expect(fetchPilotoModosPropios('ag')).resolves.toEqual({ ok: true, data: { procesos: [], puedeEditar: false, guardable: null, porQueNo: null } })
    expect(agentFetchMock).toHaveBeenCalledWith('http://micro.test/api/agency/ag/piloto/modos-propios', { signal: undefined })
  })

  it('el PUT manda el modo al proceso (con su nombre codificado)', async () => {
    agentFetchMock.mockResolvedValue(new Response(JSON.stringify({ ...ALIAS, modo: 'autonomo', origen: 'piloto' }), { status: 200 }))
    const r = await putPilotoModoPropio('ag', 'conciliacion.alias', 'autonomo')
    expect(r.ok).toBe(true)
    const [url, init] = agentFetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://micro.test/api/agency/ag/piloto/modos-propios/conciliacion.alias')
    expect(init).toMatchObject({ method: 'PUT', body: JSON.stringify({ modo: 'autonomo' }) })
  })

  it('un 503 FALTA_UNA_MIGRACION vuelve como fallo (la pantalla lo traduce)', async () => {
    agentFetchMock.mockResolvedValue(
      new Response(JSON.stringify({ statusCode: 503, code: 'FALTA_UNA_MIGRACION', message: 'El modo propio de este proceso todavía no está disponible…', servicio: 'base', referencia: 'abcd1234' }), { status: 503 }),
    )
    const r = await putPilotoModoPropio('ag', 'conciliacion.alias', 'autonomo')
    expect(r.ok).toBe(false)
    expect(r.fallo).toBeTruthy()
  })
})
