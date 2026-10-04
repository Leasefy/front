/**
 * Los hooks del director (fase 1). Lo que se fija:
 *
 *  1. «Volver a planear» con 202 o con 409 espera AL MISMO ciclo: pregunta
 *     `GET …/hoy` cada 5 s hasta que deja de estar `en_curso`.
 *  2. La espera tiene tope: a los 3 minutos deja de preguntar y lo dice (no
 *     se queda consultando para siempre ni lo pinta como error).
 *  3. Un plan que ya viene `en_curso` (el de la mañana) también se espera.
 *  4. Una meta aceptada/ajustada/pausada se reemplaza en la lista con la que
 *     devuelve el micro; un 422 no toca la lista.
 */
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: { id: 'AGY' }, user: null, isAuthenticated: true, isLoading: false }),
}))

const api = vi.hoisted(() => ({
  fetchDirectorHoy: vi.fn(),
  postDirectorReplanear: vi.fn(),
  fetchDirectorMetas: vi.fn(),
  accionSobreMeta: vi.fn(),
  fetchDirectorGasto: vi.fn(),
  fetchDirectorExperimento: vi.fn(),
  putDirectorExperimento: vi.fn(),
}))
vi.mock('@/lib/api/piloto-director', () => api)

import { useDirectorHoy, useDirectorMetas, CADA_CUANTO_PREGUNTA_MS, CUANTO_ESPERA_MS } from './use-piloto-director'

const hoyCon = (estado: string) => ({
  data: {
    encendido: true,
    fecha: '2026-09-29',
    ciclo: { id: 'c-1', tipo: 'replan', estado, inicio: null, fin: null, modelo: null, esfuerzo: null, costoCop: null, sinModeloPorque: null },
    resumen: null,
    pensamiento: null,
    prioridades: [],
    ordenes: [],
    retenciones: [],
    sugerencias: [],
    propuestasDeAutonomia: [],
    alertas: [],
    rechazadas: [],
    grupoDeControl: { activo: false, omitidas: 0 },
  },
  notAvailable: false,
})

let hoy: ReturnType<typeof useDirectorHoy> | undefined
let metas: ReturnType<typeof useDirectorMetas> | undefined
function PruebaHoy() {
  hoy = useDirectorHoy()
  return null
}
function PruebaMetas() {
  metas = useDirectorMetas()
  return null
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://micro')
  for (const f of Object.values(api)) f.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

const avanzar = (ms: number) => act(async () => {
  await vi.advanceTimersByTimeAsync(ms)
})

describe('useDirectorHoy — volver a planear', () => {
  it('202: pregunta cada 5 s hasta que el ciclo deja de estar en curso', async () => {
    api.fetchDirectorHoy
      .mockResolvedValueOnce(hoyCon('listo')) // el plan de la mañana
      .mockResolvedValueOnce(hoyCon('en_curso'))
      .mockResolvedValueOnce(hoyCon('en_curso'))
      .mockResolvedValueOnce(hoyCon('listo'))
    api.postDirectorReplanear.mockResolvedValue({ estado: 'arranco', cicloId: 'c-1' })

    await act(async () => root.render(React.createElement(PruebaHoy)))
    expect(api.fetchDirectorHoy).toHaveBeenCalledTimes(1)

    let r: unknown
    await act(async () => {
      r = await hoy!.replanear()
    })
    expect(r).toEqual({ estado: 'arranco', cicloId: 'c-1' })
    expect(hoy!.esperando).toBe(true)

    await avanzar(CADA_CUANTO_PREGUNTA_MS)
    expect(api.fetchDirectorHoy).toHaveBeenCalledTimes(2)
    expect(hoy!.data?.ciclo?.estado).toBe('en_curso')
    await avanzar(CADA_CUANTO_PREGUNTA_MS)
    await avanzar(CADA_CUANTO_PREGUNTA_MS)
    expect(api.fetchDirectorHoy).toHaveBeenCalledTimes(4)
    expect(hoy!.data?.ciclo?.estado).toBe('listo')
    expect(hoy!.esperando).toBe(false)

    // Ya no pregunta más.
    await avanzar(CADA_CUANTO_PREGUNTA_MS * 3)
    expect(api.fetchDirectorHoy).toHaveBeenCalledTimes(4)
  })

  it('🔴 no se da por terminado con el plan VIEJO: espera a que aparezca el ciclo que arrancó', async () => {
    const conId = (id: string, estado: string) => {
      const r = hoyCon(estado)
      return { ...r, data: { ...r.data, ciclo: { ...r.data.ciclo, id } } }
    }
    api.fetchDirectorHoy
      .mockResolvedValueOnce(conId('c-1', 'listo')) // el de la mañana
      .mockResolvedValueOnce(conId('c-1', 'listo')) // el micro todavía muestra el viejo
      .mockResolvedValueOnce(conId('c-2', 'listo')) // el nuevo, ya listo
    api.postDirectorReplanear.mockResolvedValue({ estado: 'arranco', cicloId: 'c-2' })
    await act(async () => root.render(React.createElement(PruebaHoy)))
    await act(async () => {
      await hoy!.replanear()
    })
    await avanzar(CADA_CUANTO_PREGUNTA_MS)
    expect(hoy!.esperando).toBe(true)
    await avanzar(CADA_CUANTO_PREGUNTA_MS)
    expect(hoy!.esperando).toBe(false)
    expect(hoy!.data?.ciclo?.id).toBe('c-2')
  })

  it('409: ya había uno en curso — se espera ese mismo, igual que con 202', async () => {
    api.fetchDirectorHoy.mockResolvedValueOnce(hoyCon('listo')).mockResolvedValue(hoyCon('listo'))
    api.postDirectorReplanear.mockResolvedValue({ estado: 'en_curso', cicloId: 'c-1' })
    await act(async () => root.render(React.createElement(PruebaHoy)))
    await act(async () => {
      await hoy!.replanear()
    })
    expect(hoy!.esperando).toBe(true)
    await avanzar(CADA_CUANTO_PREGUNTA_MS)
    expect(api.fetchDirectorHoy).toHaveBeenCalledTimes(2)
    expect(hoy!.esperando).toBe(false)
  })

  it('a los 3 minutos deja de preguntar y lo dice, sin volverlo un error', async () => {
    api.fetchDirectorHoy.mockResolvedValue(hoyCon('en_curso'))
    api.postDirectorReplanear.mockResolvedValue({ estado: 'arranco', cicloId: 'c-1' })
    await act(async () => root.render(React.createElement(PruebaHoy)))
    // El plan ya venía en curso: empieza a esperar solo.
    expect(hoy!.esperando).toBe(true)

    await avanzar(CUANTO_ESPERA_MS + CADA_CUANTO_PREGUNTA_MS)
    expect(hoy!.esperando).toBe(false)
    expect(hoy!.seCansoDeEsperar).toBe(true)
    expect(hoy!.error).toBeNull()
    const llamadas = api.fetchDirectorHoy.mock.calls.length
    // 1 al montar + una cada 5 s durante 3 min (≈36), no más.
    expect(llamadas).toBeGreaterThanOrEqual(36)
    expect(llamadas).toBeLessThanOrEqual(38)

    await avanzar(CADA_CUANTO_PREGUNTA_MS * 4)
    expect(api.fetchDirectorHoy.mock.calls.length).toBe(llamadas)
  })

  it('un error al replanear no arranca la espera', async () => {
    api.fetchDirectorHoy.mockResolvedValue(hoyCon('listo'))
    api.postDirectorReplanear.mockResolvedValue({ estado: 'error', status: 403, error: 'solo_admin' })
    await act(async () => root.render(React.createElement(PruebaHoy)))
    await act(async () => {
      await hoy!.replanear()
    })
    expect(hoy!.esperando).toBe(false)
    await avanzar(CADA_CUANTO_PREGUNTA_MS * 2)
    expect(api.fetchDirectorHoy).toHaveBeenCalledTimes(1)
  })

  it('un fallo al leer guarda el error ENTERO (para que la tarjeta diga qué pasó)', async () => {
    const fallo = new Error('503')
    api.fetchDirectorHoy.mockRejectedValue(fallo)
    await act(async () => root.render(React.createElement(PruebaHoy)))
    expect(hoy!.error).toBe(fallo)
    expect(hoy!.isLoading).toBe(false)
  })
})

describe('useDirectorMetas — actuar', () => {
  const meta = (objetivo: number, estado = 'propuesta') => ({
    id: 'm-1', metrica: 'recaudo_a_tiempo', nombre: 'Recaudo a tiempo', estado, direccion: 'subir',
    unidad: 'porcentaje', lineaBase: 0.84, objetivo, actual: 0.86, desde: null, hasta: null,
    estimada: false, porQue: null, serie: [], historial: [],
  })

  it('reemplaza la meta con la que devuelve el micro', async () => {
    api.fetchDirectorMetas.mockResolvedValue({ data: { encendido: true, metas: [meta(0.88)] }, notAvailable: false })
    api.accionSobreMeta.mockResolvedValue({ ok: true, meta: meta(0.9, 'activa') })
    await act(async () => root.render(React.createElement(PruebaMetas)))
    await act(async () => {
      await metas!.actuar('m-1', 'ajustar', 0.9)
    })
    expect(api.accionSobreMeta).toHaveBeenCalledWith('AGY', 'm-1', 'ajustar', 0.9)
    expect(metas!.data?.metas[0]?.objetivo).toBe(0.9)
    expect(metas!.data?.metas[0]?.estado).toBe('activa')
  })

  it('un 422 devuelve el mensaje y no toca la lista', async () => {
    api.fetchDirectorMetas.mockResolvedValue({ data: { encendido: true, metas: [meta(0.88)] }, notAvailable: false })
    api.accionSobreMeta.mockResolvedValue({ ok: false, status: 422, error: 'objetivo_invalido', mensaje: 'No más de 100 %.' })
    await act(async () => root.render(React.createElement(PruebaMetas)))
    let r: unknown
    await act(async () => {
      r = await metas!.actuar('m-1', 'ajustar', 1.2)
    })
    expect(r).toMatchObject({ ok: false, status: 422, mensaje: 'No más de 100 %.' })
    expect(metas!.data?.metas[0]?.objetivo).toBe(0.88)
  })
})
