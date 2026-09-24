/**
 * 🔴 El onboarding sale UNA sola vez por inmobiliaria (Nico, 23-09): «si le da
 * omitir no vuelve a aparecer y si lo ve completo no vuelve a aparecer».
 *
 * ── El defecto que esto habría atrapado ───────────────────────────────────
 *
 * La versión anterior ESCRIBÍA el «ya lo vi» en el micro
 * (`PATCH /api/agency/:id/members/me/preferences`) y lo LEÍA de `/users/me`
 * del back, que nunca lo trae. Cada lado, probado solo, pasaba: la prueba del
 * PATCH espiaba al cliente HTTP y verificaba QUÉ se pedía, no si alguien lo
 * guardaba donde después se iba a leer.
 *
 * Por eso esta prueba NO espía a `apiClient`: usa el cliente de verdad sobre
 * un back falso que sólo atiende las rutas que el back REAL declara
 * (`rutas-del-back.json`, sacado de sus controladores) y que, para
 * `/inmobiliaria/onboarding-visto`, cumple el contrato que el back prueba
 * contra Postgres (`onboarding-visto.spec.ts` del back: lo que se marca con
 * PUT es lo que se lee con GET, por agencia, y la primera gana). Cualquier
 * otra cosa —el micro, una ruta inventada— es un 404. Si la marca se escribe
 * en un lado y se lee de otro, la segunda «visita» vuelve a ver el recorrido y
 * la prueba se pone roja.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import instantanea from '@/lib/api/rutas-del-back.json'
import { setAccessToken } from '@/lib/api/client'
import { resetSessionTerminal } from '@/lib/auth/session-terminal'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { sesion } = vi.hoisted(() => ({
  sesion: { agency: { id: 'agencia-a', name: 'Portofino' } as { id: string; name: string } | null },
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: sesion.agency }),
}))

import {
  PanelPrefsProvider,
  usePanelPrefs,
  PREFIJO_DE_LA_CACHE,
  CLAVE_DE_LA_VERSION_ANTERIOR,
  ESPERAS_PARA_VOLVER_A_LEER_MS,
  type PanelPrefsContextValue,
} from './PanelPrefsContext'

const BACK = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'
const RECORRIDO = 'recorrido-del-panel'

// ── Las rutas que el back declara, como expresiones ────────────────────────

const RUTAS_DEL_BACK = (instantanea.rutas as string[]).map((linea) => {
  const i = linea.indexOf(' ')
  const verbo = linea.slice(0, i)
  const patron = linea
    .slice(i + 1)
    .split('/')
    .map((s) => (s.startsWith(':') ? '[^/]+' : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/')
  return { verbo, re: new RegExp(`^${patron}/?$`) }
})

function elBackLaDeclara(verbo: string, camino: string): boolean {
  return RUTAS_DEL_BACK.some((r) => r.verbo === verbo && r.re.test(camino))
}

// ── El back falso ─────────────────────────────────────────────────────────

interface Vista {
  clave: string
  estado: 'completo' | 'omitido'
  fecha: string
  usuarioId: string | null
  quien: string | null
}

interface Pedido {
  metodo: string
  url: string
  cuerpo: unknown
}

function crearBackFalso() {
  /** Lo guardado, por agencia: la agencia sale de la SESIÓN, como en el guard real. */
  const porAgencia = new Map<string, Map<string, Vista>>()
  const pedidos: Pedido[] = []
  let disponible = true
  let lecturaQueFalla = false
  /** Las primeras N lecturas contestan como el back con el token de antes del segundo factor. */
  let lecturasConTokenViejo = 0
  let lecturaRetenida: Promise<void> | null = null

  const responder = (status: number, cuerpo: unknown) =>
    ({
      status,
      ok: status >= 200 && status < 300,
      json: async () => cuerpo,
      text: async () => JSON.stringify(cuerpo),
    }) as unknown as Response

  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    const metodo = (init?.method ?? 'GET').toUpperCase()
    const cuerpo = init?.body ? JSON.parse(String(init.body)) : undefined
    pedidos.push({ metodo, url, cuerpo })

    const u = new URL(url)
    // Otro servicio (el micro, por ejemplo) no es el back.
    if (!url.startsWith(BACK)) return responder(404, { message: 'no es el back' })
    // 🔴 Sólo existe lo que el back REAL declara.
    if (!elBackLaDeclara(metodo, u.pathname)) {
      return responder(404, { message: `Cannot ${metodo} ${u.pathname}` })
    }

    const agencia = sesion.agency?.id
    if (!agencia) return responder(403, { code: 'SIN_MEMBRESIA_ACTIVA' })
    const vistas = porAgencia.get(agencia) ?? new Map<string, Vista>()
    porAgencia.set(agencia, vistas)

    if (metodo === 'GET' && u.pathname === '/inmobiliaria/onboarding-visto') {
      if (lecturaRetenida) await lecturaRetenida
      if (lecturaQueFalla) return responder(500, { message: 'se cayó' })
      if (lecturasConTokenViejo > 0) {
        lecturasConTokenViejo -= 1
        return responder(403, { code: 'SEGUNDO_FACTOR_REQUERIDO', message: 'Tu rol exige segundo factor.' })
      }
      if (!disponible) return responder(200, { disponible: false, motivo: 'falta la migración', vistas: [] })
      return responder(200, { disponible: true, motivo: null, vistas: [...vistas.values()] })
    }
    const marcar = u.pathname.match(/^\/inmobiliaria\/onboarding-visto\/([^/]+)$/)
    if (metodo === 'PUT' && marcar) {
      if (!disponible) return responder(503, { code: 'ONBOARDING_VISTO_NO_DISPONIBLE' })
      const clave = decodeURIComponent(marcar[1]!)
      const { estado } = cuerpo as { estado: 'completo' | 'omitido' }
      const ya = vistas.get(clave)
      if (ya) return responder(200, { ...ya, yaEstaba: true })
      const nueva: Vista = {
        clave,
        estado,
        fecha: new Date('2026-09-23T22:00:00Z').toISOString(),
        usuarioId: 'yo',
        quien: 'Ana Ruiz',
      }
      vistas.set(clave, nueva)
      return responder(200, { ...nueva, yaEstaba: false })
    }
    // `/users/me` y cualquier otra ruta que el back sí tiene: nada de la marca.
    return responder(200, {})
  })

  return {
    fetch,
    pedidos,
    vistasDe: (agencia: string) => [...(porAgencia.get(agencia)?.values() ?? [])],
    sembrar: (agencia: string, v: Vista) => {
      const m = porAgencia.get(agencia) ?? new Map<string, Vista>()
      m.set(v.clave, v)
      porAgencia.set(agencia, m)
    },
    sinMigracion: () => {
      disponible = false
    },
    lecturaQueFalla: () => {
      lecturaQueFalla = true
    },
    primeraLecturaConTokenViejo: () => {
      lecturasConTokenViejo = 1
    },
    retenerLectura: () => {
      let soltar!: () => void
      lecturaRetenida = new Promise<void>((r) => {
        soltar = r
      })
      return () => {
        lecturaRetenida = null
        soltar()
      }
    },
  }
}

// ── Montaje ────────────────────────────────────────────────────────────────

let back: ReturnType<typeof crearBackFalso>
let contenedor: HTMLDivElement
let root: Root | null = null
let actual: PanelPrefsContextValue | null = null
/** Todo valor que tomó `tourDismissed`, en orden: para ver que nunca fue `false` de más. */
let historia: Array<boolean | null> = []

function Sonda() {
  const v = usePanelPrefs()
  actual = v
  historia.push(v.tourDismissed)
  return null
}

async function esperar() {
  for (let i = 0; i < 6; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
  }
}

async function abrirElPanel() {
  historia = []
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
  await act(async () => {
    root!.render(
      <PanelPrefsProvider>
        <Sonda />
      </PanelPrefsProvider>,
    )
  })
  await esperar()
}

async function cerrarElPanel() {
  await act(async () => root?.unmount())
  root = null
  contenedor.remove()
}

/** Otro navegador: mismo back, otro localStorage. */
function otroNavegador() {
  window.localStorage.clear()
}

beforeEach(() => {
  resetSessionTerminal()
  setAccessToken('token-de-prueba')
  window.localStorage.clear()
  sesion.agency = { id: 'agencia-a', name: 'Portofino' }
  back = crearBackFalso()
  vi.stubGlobal('fetch', back.fetch)
  actual = null
})

afterEach(async () => {
  if (root) await cerrarElPanel()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe('🔴 el «ya lo vio» se escribe y se lee en el MISMO lugar del back', () => {
  it('omite en un navegador → en otro navegador (localStorage vacío) ya no sale', async () => {
    await abrirElPanel()
    expect(actual!.tourDismissed).toBe(false) // primera vez de la agencia: sale

    await act(async () => {
      await actual!.cerrarRecorrido('omitido')
    })
    expect(actual!.tourDismissed).toBe(true)
    await cerrarElPanel()

    otroNavegador()
    await abrirElPanel()
    expect(actual!.tourDismissed).toBe(true)
    // Y nunca dijo «mostrar»: primero «no se sabe», después «visto».
    expect(historia).not.toContain(false)

    // Todo lo que se pidió existe en el back: nada se fue al micro.
    for (const p of back.pedidos) expect(p.url.startsWith(BACK)).toBe(true)
  })

  it('otra persona de la MISMA inmobiliaria (otro navegador) tampoco lo ve', async () => {
    await abrirElPanel()
    await act(async () => {
      await actual!.cerrarRecorrido('completo')
    })
    await cerrarElPanel()

    otroNavegador() // la sesión sigue siendo de la agencia A: otra persona de la A
    await abrirElPanel()
    expect(actual!.tourDismissed).toBe(true)
    expect(actual!.vistaDelRecorrido).toMatchObject({ estado: 'completo', quien: 'Ana Ruiz' })
  })

  it('la agencia la pone el back con la sesión: el front no la manda ni en el camino ni en el cuerpo', async () => {
    await abrirElPanel()
    await act(async () => {
      await actual!.cerrarRecorrido('omitido')
    })
    const put = back.pedidos.find((p) => p.metodo === 'PUT')!
    expect(new URL(put.url).pathname).toBe(`/inmobiliaria/onboarding-visto/${RECORRIDO}`)
    expect(put.url).not.toContain('agencia-a')
    expect(put.cuerpo).toEqual({ estado: 'omitido' })
  })
})

describe('no se muestra mientras no se sabe', () => {
  it('🔴 mientras el servidor no contesta, `null` — nunca `false` primero', async () => {
    const soltar = back.retenerLectura()
    await abrirElPanel()
    expect(actual!.tourDismissed).toBeNull()
    expect(historia.every((v) => v === null)).toBe(true)

    soltar()
    await esperar()
    expect(actual!.tourDismissed).toBe(false)
  })

  it('🔴 si la agencia ya lo vio, no sale aunque el localStorage esté vacío (y no parpadea)', async () => {
    back.sembrar('agencia-a', {
      clave: RECORRIDO,
      estado: 'omitido',
      fecha: '2026-09-20T15:00:00.000Z',
      usuarioId: 'otra-persona',
      quien: 'Beto Gil',
    })
    await abrirElPanel()
    expect(actual!.tourDismissed).toBe(true)
    expect(historia).not.toContain(false)
    // Leer no escribe nada.
    expect(back.pedidos.filter((p) => p.metodo === 'PUT')).toHaveLength(0)
  })

  it('sin la migración en el back (`disponible: false`) no se sabe: no sale', async () => {
    back.sinMigracion()
    await abrirElPanel()
    expect(actual!.tourDismissed).toBeNull()
  })

  it('si la lectura falla, tampoco: nada de adivinar «no visto»', async () => {
    back.lecturaQueFalla()
    await abrirElPanel()
    expect(actual!.tourDismissed).toBeNull()
  })

  it('si la primera lectura falla (p. ej. un 403 con el token de antes del segundo factor), se vuelve a preguntar y el recorrido sale', async () => {
    back.primeraLecturaConTokenViejo()
    await abrirElPanel()
    expect(actual!.tourDismissed).toBeNull()
    await act(async () => {
      await new Promise((r) => setTimeout(r, ESPERAS_PARA_VOLVER_A_LEER_MS[0]! + 300))
    })
    await esperar()
    expect(actual!.tourDismissed).toBe(false)
    expect(back.pedidos.filter((p) => p.metodo === 'GET' && p.url.includes('onboarding-visto'))).toHaveLength(2)
  })

  it('sin agencia en la sesión, no se sabe', async () => {
    sesion.agency = null
    await abrirElPanel()
    expect(actual!.tourDismissed).toBeNull()
  })
})

describe('omitir y terminar guardan lo que fue', () => {
  it.each([
    ['omitido' as const],
    ['completo' as const],
  ])('%s', async (estado) => {
    await abrirElPanel()
    await act(async () => {
      await actual!.cerrarRecorrido(estado)
    })
    expect(back.vistasDe('agencia-a')).toEqual([expect.objectContaining({ clave: RECORRIDO, estado })])
  })
})

describe('la caché del navegador', () => {
  it('un «visto» en caché no espera al servidor', async () => {
    window.localStorage.setItem(`${PREFIJO_DE_LA_CACHE}agencia-a:${RECORRIDO}`, 'omitido')
    const soltar = back.retenerLectura()
    await abrirElPanel()
    expect(actual!.tourDismissed).toBe(true)
    soltar()
    await esperar()
  })

  it('lo que este navegador cerró y el servidor no tiene (el PUT se cayó) se le vuelve a mandar', async () => {
    window.localStorage.setItem(`${PREFIJO_DE_LA_CACHE}agencia-a:${RECORRIDO}`, 'completo')
    await abrirElPanel()
    expect(actual!.tourDismissed).toBe(true)
    expect(back.vistasDe('agencia-a')).toEqual([expect.objectContaining({ clave: RECORRIDO, estado: 'completo' })])
  })

  it('la caché es POR AGENCIA: lo visto en la A no calla el de la B', async () => {
    window.localStorage.setItem(`${PREFIJO_DE_LA_CACHE}agencia-a:${RECORRIDO}`, 'omitido')
    sesion.agency = { id: 'agencia-b', name: 'Otra' }
    await abrirElPanel()
    expect(actual!.tourDismissed).toBe(false)
  })

  it('quien ya lo había cerrado con la versión anterior no lo vuelve a ver, y queda en el servidor', async () => {
    window.localStorage.setItem(CLAVE_DE_LA_VERSION_ANTERIOR, 'true')
    await abrirElPanel()
    expect(actual!.tourDismissed).toBe(true)
    expect(back.vistasDe('agencia-a')).toEqual([expect.objectContaining({ clave: RECORRIDO, estado: 'omitido' })])
    expect(window.localStorage.getItem(CLAVE_DE_LA_VERSION_ANTERIOR)).toBeNull()
  })
})

describe('«Ver el recorrido ahora» (Configuración → Preferencias)', () => {
  it('sale en esta sesión y al cerrarlo NO reescribe el «visto» de la agencia', async () => {
    back.sembrar('agencia-a', {
      clave: RECORRIDO,
      estado: 'omitido',
      fecha: '2026-09-20T15:00:00.000Z',
      usuarioId: 'otra-persona',
      quien: 'Beto Gil',
    })
    await abrirElPanel()
    expect(actual!.tourDismissed).toBe(true)

    await act(async () => {
      actual!.relaunchTour()
    })
    expect(actual!.tourDismissed).toBe(false)

    await act(async () => {
      await actual!.cerrarRecorrido('completo')
    })
    expect(actual!.tourDismissed).toBe(true)
    expect(back.pedidos.filter((p) => p.metodo === 'PUT')).toHaveLength(0)
    expect(back.vistasDe('agencia-a')).toEqual([
      expect.objectContaining({ estado: 'omitido', quien: 'Beto Gil' }),
    ])

    // Recargar: sigue visto, nada quedó «prendido».
    await cerrarElPanel()
    await abrirElPanel()
    expect(actual!.tourDismissed).toBe(true)
  })

  it('también vuelve a presentar a los agentes UNA vez en la sesión, sin tocar el servidor', async () => {
    back.sembrar('agencia-a', {
      clave: 'agente:cobranza',
      estado: 'completo',
      fecha: '2026-09-20T15:00:00.000Z',
      usuarioId: 'otra-persona',
      quien: 'Beto Gil',
    })
    await abrirElPanel()
    expect(actual!.estaVista('agente:cobranza')).toBe(true)
    await act(async () => {
      actual!.relaunchTour()
    })
    expect(actual!.estaVista('agente:cobranza')).toBe(false)
    await act(async () => {
      await actual!.marcarVista('agente:cobranza', 'omitido')
    })
    expect(actual!.estaVista('agente:cobranza')).toBe(true)
    expect(back.pedidos.filter((p) => p.metodo === 'PUT')).toHaveLength(0)
  })
})

describe('las presentaciones de los agentes usan el mismo mecanismo', () => {
  it('una presentación es su propia clave, por agencia', async () => {
    await abrirElPanel()
    expect(actual!.estaVista('agente:cobranza')).toBe(false)
    await act(async () => {
      await actual!.marcarVista('agente:cobranza', 'completo')
    })
    const put = back.pedidos.find((p) => p.metodo === 'PUT')!
    expect(new URL(put.url).pathname).toBe('/inmobiliaria/onboarding-visto/agente%3Acobranza')
    await cerrarElPanel()

    otroNavegador()
    await abrirElPanel()
    expect(actual!.estaVista('agente:cobranza')).toBe(true)
    // Y no se confunde con el recorrido.
    expect(actual!.tourDismissed).toBe(false)
  })
})
