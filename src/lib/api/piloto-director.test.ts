/**
 * El cliente del director (fase 1) contra `director-api-front.md`.
 *
 * El micro todavía no tiene estas rutas: se prueba con un doble de
 * `agentFetch`. Lo que se fija:
 *
 *  1. Los caminos y los verbos EXACTOS del contrato (un camino mal escrito es
 *     un 404 que el front leería como «el micro no lo publica»).
 *  2. `encendido: false` llega como un dato, no como un error.
 *  3. Replanear distingue 202 (arrancó) de 409 (ya había uno en curso): en los
 *     dos casos hay que esperar al mismo ciclo.
 *  4. El 422 de «ajustar» trae su `mensaje` legible hasta la pantalla.
 *  5. Lo que no viene en la respuesta se lee vacío, no rompe el render.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { llamadas, respuestas } = vi.hoisted(() => ({
  llamadas: [] as Array<{ url: string; init?: RequestInit }>,
  respuestas: [] as Array<{ status: number; cuerpo?: unknown }>,
}))

vi.mock('@/lib/api/agent-fetch', () => ({
  agentFetch: async (url: string, init?: RequestInit) => {
    llamadas.push({ url, ...(init ? { init } : {}) })
    const r = respuestas.shift() ?? { status: 200, cuerpo: {} }
    return new Response(r.cuerpo === undefined ? null : JSON.stringify(r.cuerpo), {
      status: r.status,
      headers: { 'content-type': 'application/json' },
    })
  },
}))

import {
  accionSobreMeta,
  fetchDirectorExperimento,
  fetchDirectorGasto,
  fetchDirectorHoy,
  fetchDirectorMetas,
  normalizarHoy,
  normalizarMeta,
  postDirectorReplanear,
  putDirectorExperimento,
} from './piloto-director'

const AG = 'ag-1'
const BASE = 'http://micro.test'

beforeEach(() => {
  llamadas.length = 0
  respuestas.length = 0
  process.env.NEXT_PUBLIC_AGENT_URL = BASE
})

describe('lecturas', () => {
  it('GET hoy va a /piloto/director/hoy, con la fecha sólo si se pide', async () => {
    respuestas.push({ status: 200, cuerpo: { encendido: false } }, { status: 200, cuerpo: { encendido: false } })
    await fetchDirectorHoy(AG)
    await fetchDirectorHoy(AG, { fecha: '2026-09-29' })
    expect(llamadas.map((l) => l.url)).toEqual([
      `${BASE}/api/agency/${AG}/piloto/director/hoy`,
      `${BASE}/api/agency/${AG}/piloto/director/hoy?fecha=2026-09-29`,
    ])
  })

  it('con el director apagado devuelve encendido:false y listas vacías, sin error', async () => {
    respuestas.push({ status: 200, cuerpo: { encendido: false } })
    const r = await fetchDirectorHoy(AG)
    expect(r.notAvailable).toBe(false)
    expect(r.data?.encendido).toBe(false)
    expect(r.data?.ordenes).toEqual([])
    expect(r.data?.ciclo).toBeNull()
  })

  it('un 404 es «el micro no publica la ruta», no un error', async () => {
    respuestas.push({ status: 404, cuerpo: { error: 'not_found' } })
    const r = await fetchDirectorHoy(AG)
    expect(r).toEqual({ data: null, notAvailable: true })
  })

  it('un 500 tira el sobre del micro con su status (lo lee `clasificarFallo`)', async () => {
    // Desde ARREGLOS-4 (03-10) las lecturas del Piloto tiran el sobre entero
    // (`falloDelMicro`), no un `Error('500')`: así la pantalla distingue un 403
    // de un 429 o de un 5xx.
    respuestas.push({ status: 500, cuerpo: {} })
    await expect(fetchDirectorHoy(AG)).rejects.toMatchObject({ status: 500 })
  })

  it('metas, gasto y experimento van a sus caminos', async () => {
    respuestas.push(
      { status: 200, cuerpo: { encendido: true, metas: [] } },
      { status: 200, cuerpo: { encendido: true, mes: '2026-09' } },
      { status: 200, cuerpo: { encendido: true, mes: '2026-08' } },
      { status: 200, cuerpo: { encendido: true, activo: false } },
    )
    await fetchDirectorMetas(AG)
    await fetchDirectorGasto(AG)
    await fetchDirectorGasto(AG, { mes: '2026-08' })
    await fetchDirectorExperimento(AG)
    expect(llamadas.map((l) => l.url)).toEqual([
      `${BASE}/api/agency/${AG}/piloto/director/metas`,
      `${BASE}/api/agency/${AG}/piloto/director/gasto`,
      `${BASE}/api/agency/${AG}/piloto/director/gasto?mes=2026-08`,
      `${BASE}/api/agency/${AG}/piloto/director/experimento`,
    ])
  })
})

describe('volver a planear', () => {
  it('202 → arrancó, con su ciclo', async () => {
    respuestas.push({ status: 202, cuerpo: { cicloId: 'c-9' } })
    const r = await postDirectorReplanear(AG)
    expect(r).toEqual({ estado: 'arranco', cicloId: 'c-9' })
    expect(llamadas[0]?.url).toBe(`${BASE}/api/agency/${AG}/piloto/director/replanear`)
    expect(llamadas[0]?.init?.method).toBe('POST')
  })

  it('409 → ya había uno en curso: se espera ese mismo', async () => {
    respuestas.push({ status: 409, cuerpo: { error: 'en_curso', cicloId: 'c-7' } })
    expect(await postDirectorReplanear(AG)).toEqual({ estado: 'en_curso', cicloId: 'c-7' })
  })

  it('🔴 409 «apagado» (el Piloto automático o el director) NO es «en curso»: no hay ciclo que esperar', async () => {
    respuestas.push(
      { status: 409, cuerpo: { error: 'piloto_apagado', mensaje: 'El Piloto automático no está activo…' } },
      { status: 409, cuerpo: { error: 'director_apagado' } },
    )
    expect(await postDirectorReplanear(AG)).toEqual({ estado: 'error', status: 409, error: 'piloto_apagado' })
    expect(await postDirectorReplanear(AG)).toEqual({ estado: 'error', status: 409, error: 'director_apagado' })
  })

  it('403 → sólo un administrador', async () => {
    respuestas.push({ status: 403, cuerpo: { error: 'solo_admin' } })
    expect(await postDirectorReplanear(AG)).toEqual({ estado: 'error', status: 403, error: 'solo_admin' })
  })
})

describe('metas', () => {
  const meta = {
    id: 'm-1',
    metrica: 'recaudo_a_tiempo',
    nombre: 'Recaudo a tiempo',
    estado: 'activa',
    direccion: 'subir',
    unidad: 'porcentaje',
    lineaBase: 0.84,
    objetivo: 0.9,
    actual: 0.86,
    desde: '2026-09-29',
    hasta: '2026-12-28',
    estimada: false,
    porQue: 'x',
    serie: [],
    historial: [],
  }

  it('ajustar manda el objetivo y devuelve la meta actualizada', async () => {
    respuestas.push({ status: 200, cuerpo: meta })
    const r = await accionSobreMeta(AG, 'm-1', 'ajustar', 0.9)
    expect(llamadas[0]?.url).toBe(`${BASE}/api/agency/${AG}/piloto/director/metas/m-1/ajustar`)
    expect(llamadas[0]?.init?.method).toBe('POST')
    expect(JSON.parse(String(llamadas[0]?.init?.body))).toEqual({ objetivo: 0.9 })
    expect(r.ok && r.meta.objetivo).toBe(0.9)
  })

  it('aceptar y pausar no mandan objetivo', async () => {
    respuestas.push({ status: 200, cuerpo: meta }, { status: 200, cuerpo: meta })
    await accionSobreMeta(AG, 'm-1', 'aceptar')
    await accionSobreMeta(AG, 'm-1', 'pausar')
    expect(llamadas.map((l) => l.url.split('/').slice(-1)[0])).toEqual(['aceptar', 'pausar'])
    expect(JSON.parse(String(llamadas[0]?.init?.body))).toEqual({})
  })

  it('el 422 trae su mensaje legible hasta la pantalla', async () => {
    respuestas.push({
      status: 422,
      cuerpo: { error: 'objetivo_invalido', mensaje: 'El recaudo no puede pasar del 100 %.' },
    })
    const r = await accionSobreMeta(AG, 'm-1', 'ajustar', 1.2)
    expect(r).toEqual({
      ok: false,
      status: 422,
      error: 'objetivo_invalido',
      mensaje: 'El recaudo no puede pasar del 100 %.',
    })
  })
})

describe('experimento', () => {
  it('PUT manda { activo } y devuelve el mismo cuerpo que el GET', async () => {
    respuestas.push({
      status: 200,
      cuerpo: { encendido: true, activo: true, porcentajeControl: 10, desde: '2026-09-29T10:00:00.000Z', entidadesEnControl: 37 },
    })
    const r = await putDirectorExperimento(AG, true)
    expect(llamadas[0]?.init?.method).toBe('PUT')
    expect(JSON.parse(String(llamadas[0]?.init?.body))).toEqual({ activo: true })
    expect(r.ok && r.data.entidadesEnControl).toBe(37)
  })
})

describe('normalizar: lo que falta se lee vacío', () => {
  it('un plan a medias no rompe: listas vacías y nulos donde no vino nada', () => {
    const hoy = normalizarHoy({
      encendido: true,
      ciclo: { id: 'c', tipo: 'dia', estado: 'listo', inicio: '2026-09-29T10:02:11.000Z' },
      ordenes: [{ ordenId: 'o-1', agente: 'laura', porQue: 'x' }],
    })
    expect(hoy.prioridades).toEqual([])
    expect(hoy.retenciones).toEqual([])
    expect(hoy.rechazadas).toEqual([])
    expect(hoy.pensamiento).toBeNull()
    expect(hoy.ciclo?.costoCop).toBeNull()
    expect(hoy.ordenes[0]?.evidencia).toEqual([])
    expect(hoy.ordenes[0]?.accionId).toBeNull()
    expect(hoy.grupoDeControl).toEqual({ activo: false, omitidas: 0 })
  })

  it('una meta sin id se descarta; horas ahorradas es estimada SIEMPRE, lo diga o no el micro', () => {
    expect(normalizarMeta({ nombre: 'sin id' })).toBeNull()
    const m = normalizarMeta({ id: 'm', metrica: 'horas_ahorradas', unidad: 'horas', objetivo: 40 })
    expect(m?.estimada).toBe(true)
    expect(m?.serie).toEqual([])
    expect(m?.historial).toEqual([])
    const otra = normalizarMeta({ id: 'r', metrica: 'recaudo_a_tiempo', unidad: 'porcentaje', objetivo: 0.9 })
    expect(otra?.estimada).toBe(false)
  })
})
