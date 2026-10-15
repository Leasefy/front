/**
 * PreguntarClient.test.tsx — la pestaña Preguntar de Naira (13-06, Tarea 4).
 *
 * Qué prueba (con el hook real y el cliente simulado): se escribe, se envía y aterriza la respuesta; el hilo es accesible y
 * de a una pregunta; el vacío sugiere sin números ni envíos; las cuatro ramas; tras una respuesta, un 403 de la pregunta no
 * deja nada de lo que se vio ni el compositor (FG13-1 con el disparador real); el 404 tiene su cartel; un fallo de red se
 * reintenta con la MISMA pregunta; nada queda en el navegador ni en la consola; los datos de ejemplo se ven y siguen
 * dejando preguntar; en producción nunca aparece un ejemplo (cliente REAL); Aprobaciones solo con permiso; sin personas.
 *
 * Arnés (molde SeguimientoClient.test.tsx de 13-04): createRoot + act, stub de i18n real, `next/link` → `<a>`, `useAuth` con
 * AGY-1 y un usuario centinela, `preguntarANaira` simulado sobre el módulo real, `agentFetch` simulado y permisos por
 * conjunto. Marcador [N13:*] en el TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { permisos } = vi.hoisted(() => ({ permisos: { conjunto: new Set<string>() } }))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) =>
    React.createElement('a', { href, ...rest }, children),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/panel/inmobiliaria/reportes/naira/preguntar',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    agency: { id: 'AGY-1' },
    user: { id: 'centinela-b5', email: 'centinela-b5@ejemplo.invalid', name: 'Centinela B5 (ejemplo)' },
  }),
}))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/api/naira/cliente')>()
  return { ...real, preguntarANaira: vi.fn(real.preguntarANaira) }
})
vi.mock('@/lib/api/agent-fetch', () => ({ agentFetch: vi.fn() }))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({
    canAccess: (m: string, a: string) => permisos.conjunto.has(m + ':' + a),
    isAdmin: false,
    agencyRole: 'ADMIN',
  }),
  usePermissionsContextSafe: () => null,
}))
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))

import { agentFetch } from '@/lib/api/agent-fetch'
import { preguntarANaira, type EstadoNaira } from '@/lib/api/naira/cliente'
import { RESPUESTA_ESTRICTA_POR_ENDPOINT, type NairaConversationAnswer } from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA, USER_IDS_DE_EJEMPLO } from '@/lib/data/mock-naira'
import type { NairaConversacionNegada, NairaConversacionRespondida } from '@/lib/naira/conversacion'
import { RUTA_DE_APROBACIONES } from '@/lib/nav/rutas-de-naira'

import { PreguntarClient } from './PreguntarClient'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const preguntarMock = vi.mocked(preguntarANaira)
const agentFetchMock = vi.mocked(agentFetch)
const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['conversacion.preguntar']
const ASOF = '2000-01-03T11:00:00.000Z'
const PERMISOS_POR_DEFECTO = ['naira:conversation-ask', 'naira:action-view', 'cobros:view', 'portafolio:view', 'pipeline:view']

function respondidaDelEjemplo(): NairaConversacionRespondida {
  const e = EJEMPLOS_DE_NAIRA['conversacion.preguntar']
  if (e.kind !== 'respondida') throw new Error('el ejemplo de conversacion.preguntar (13-01) dejó de ser una respondida: ' + e.kind)
  return e
}
const EJEMPLO = respondidaDelEjemplo()
const ID = EJEMPLO.preguntaId

const RESPONDIDA: NairaConversacionRespondida = {
  ...EJEMPLO,
  texto: 'TOKEN-R (ejemplo)',
  refsServidas: [],
  refs: [],
  asOfs: [ASOF],
  oraciones: [{ seccion: 'LIVE_DATA', texto: 'TOKEN-R (ejemplo)', claimClass: null, cifras: [{ metricId: 'cartera.morosidad_rate', asOf: ASOF }] }],
}
const NEGADA_ACCION: NairaConversacionNegada = {
  kind: 'negada',
  preguntaId: ID,
  razon: 'accion_en_fase_12',
  puedoResponder: [{ kind: 'metrica', metricId: 'cartera.morosidad_rate', nombre: 'índice de morosidad' }],
  texto: 'TOKEN-N (ejemplo)',
}
const BLOQUEADA: NairaConversationAnswer = { kind: 'bloqueada', preguntaId: ID, motivo: 'numeric_drift', texto: 'TOKEN-B (ejemplo)' }
const FALLIDA: NairaConversationAnswer = { kind: 'fallida', preguntaId: ID, razon: 'lectura_fallida', texto: 'TOKEN-F (ejemplo)' }
const FIXTURES: readonly NairaConversationAnswer[] = [RESPONDIDA, NEGADA_ACCION, BLOQUEADA, FALLIDA]

type Resultado = EstadoNaira<NairaConversationAnswer>
const ok = (data: NairaConversationAnswer, origen: 'agente' | 'ejemplo' = 'agente'): Resultado => ({ kind: 'ok', data, origen })

let contenedor: HTMLDivElement
let root: Root

const asentar = () =>
  act(async () => {
    for (let i = 0; i < 8; i += 1) await Promise.resolve()
  })

async function montar() {
  act(() => {
    root.render(<PreguntarClient />)
  })
  await asentar()
}

const campo = () => contenedor.querySelector('textarea')
const enviarBoton = () => contenedor.querySelector('button[type="submit"]') as HTMLButtonElement | null

function escribir(texto: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  act(() => {
    set.call(campo()!, texto)
    campo()!.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function enviar(pregunta: string, resultado?: Resultado | Promise<Resultado>) {
  if (resultado !== undefined) preguntarMock.mockImplementationOnce(() => Promise.resolve(resultado))
  escribir(pregunta)
  act(() => enviarBoton()!.click())
  await asentar()
}

/** Las burbujas de pregunta cuyo texto es exactamente `pregunta`. */
function burbujas(pregunta: string): Element[] {
  return Array.from(contenedor.querySelectorAll('[data-naira-turno] span.whitespace-pre-wrap')).filter((e) => e.textContent === pregunta)
}

beforeEach(() => {
  preguntarMock.mockReset()
  agentFetchMock.mockReset()
  permisos.conjunto = new Set(PERMISOS_POR_DEFECTO)
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('PreguntarClient', () => {
  it('[N13:fixture-es-contrato] cada fixture pasa el esquema estricto de la respuesta', () => {
    for (const f of FIXTURES) {
      const r = ESTRICTO.safeParse(f)
      expect(r.success, JSON.stringify(r.success ? null : r.error.issues)).toBe(true)
    }
  })

  it('[N13:control-positivo] se escribe, se envía con el botón y la respuesta aterriza en el hilo', async () => {
    await montar()
    expect(contenedor.querySelector('[data-naira-vista="preguntar"][data-naira-estado="ok"]')).not.toBeNull()
    const h1 = contenedor.querySelectorAll('h1')
    expect(h1).toHaveLength(1)
    expect(h1[0]?.textContent).toBe('Pregúntale a Naira')
    expect(contenedor.textContent).toContain('Responde solo con las métricas de su catálogo, con el corte de cada dato. No guarda la conversación.')
    expect(contenedor.querySelector('[data-testid="naira-preguntar-vacio"]')).not.toBeNull()
    await enviar('P1 TOKEN-P1 (ejemplo)', ok(RESPONDIDA))
    expect(preguntarMock).toHaveBeenCalledTimes(1)
    expect(preguntarMock).toHaveBeenCalledWith('AGY-1', 'P1 TOKEN-P1 (ejemplo)')
    expect(burbujas('P1 TOKEN-P1 (ejemplo)')).toHaveLength(1)
    expect(contenedor.querySelector('article[data-naira-respuesta="respondida"]')?.textContent).toContain('TOKEN-R')
    expect(contenedor.querySelector('[data-testid="naira-preguntar-vacio"]')).toBeNull()
    expect(campo()?.value).toBe('')
  })

  it('[N13:hilo-accesible] el hilo es un log que avisa lo nuevo y está ocupado mientras Naira consulta', async () => {
    await montar()
    let resolver: (r: Resultado) => void = () => undefined
    preguntarMock.mockImplementationOnce(() => new Promise<Resultado>((r) => (resolver = r)))
    await enviar('P (ejemplo)')
    const hilo = contenedor.querySelector('section[role="log"][aria-live="polite"][aria-relevant="additions"][data-naira-hilo]')
    expect(hilo).not.toBeNull()
    expect(hilo?.getAttribute('aria-label')).toBe('Conversación con Naira')
    expect(hilo?.getAttribute('aria-busy')).toBe('true')
    expect(contenedor.querySelector('[data-naira-consultando]')?.textContent).toContain('Naira está consultando…')
    expect(enviarBoton()?.disabled).toBe(true)
    expect(campo()?.readOnly).toBe(true)
    escribir('otra (ejemplo)')
    act(() => enviarBoton()!.click())
    await asentar()
    expect(preguntarMock).toHaveBeenCalledTimes(1)
    await act(async () => resolver(ok(RESPONDIDA)))
    await asentar()
    expect(contenedor.querySelector('[data-naira-hilo]')?.getAttribute('aria-busy')).toBe('false')
  })

  it('[N13:vacio-con-ejemplos] el vacío sugiere solo lo que el rol ve, sin números, y precargar no envía', async () => {
    permisos.conjunto = new Set(['naira:conversation-ask', 'cobros:view'])
    await montar()
    const vacio = contenedor.querySelector('[data-testid="naira-preguntar-vacio"]')!
    const botones = Array.from(vacio.querySelectorAll('button'))
    expect(botones.map((b) => b.textContent)).toEqual(['índice de morosidad'])
    expect(vacio.textContent).not.toMatch(/\d/)
    act(() => botones[0]!.click())
    await asentar()
    expect(campo()?.value).toBe('Índice de morosidad: ¿cómo va?')
    expect(document.activeElement).toBe(campo())
    expect(preguntarMock).not.toHaveBeenCalled()
  })

  it('[N13:conversacion-ramas] las cuatro ramas quedan en el hilo en orden y una sugerencia precarga sin enviar', async () => {
    await montar()
    const preguntas = ['Q1 (ejemplo)', 'Q2 (ejemplo)', 'Q3 (ejemplo)', 'Q4 (ejemplo)']
    const respuestas = [RESPONDIDA, NEGADA_ACCION, BLOQUEADA, FALLIDA]
    for (let i = 0; i < 4; i += 1) await enviar(preguntas[i]!, ok(respuestas[i]!))
    const turnos = Array.from(contenedor.querySelectorAll('[data-naira-turno]'))
    expect(turnos.map((t) => t.getAttribute('data-naira-turno'))).toEqual(['con_respuesta', 'con_respuesta', 'con_respuesta', 'con_respuesta'])
    expect(turnos.map((t) => t.querySelector('article[data-naira-respuesta]')?.getAttribute('data-naira-respuesta'))).toEqual([
      'respondida',
      'negada',
      'bloqueada',
      'fallida',
    ])
    for (const p of preguntas) expect(burbujas(p)).toHaveLength(1)
    const sugerencia = Array.from(contenedor.querySelectorAll('[data-naira-sugerencias] button')).find((b) => b.textContent === 'índice de morosidad')
    act(() => (sugerencia as HTMLButtonElement).click())
    await asentar()
    expect(campo()?.value).toBe('Índice de morosidad: ¿cómo va?')
    expect(preguntarMock).toHaveBeenCalledTimes(4)
  })

  it('[N13:403-sin-residuo] tras una respuesta, un 403 de la pregunta deja solo el cartel de acceso', async () => {
    await montar()
    await enviar('P1 TOKEN-P1 (ejemplo)', ok(RESPONDIDA))
    expect(contenedor.innerHTML).toContain('TOKEN-R')
    await enviar('P2 TOKEN-P2 (ejemplo)', { kind: 'sin_permiso' })
    const cartel = contenedor.querySelector('[data-testid="naira-sin-permiso"]')
    expect(cartel).not.toBeNull()
    expect(cartel?.querySelector('a[href="/panel/inmobiliaria"]')?.textContent).toBe('Ir al inicio del panel')
    for (const token of ['TOKEN-R', 'TOKEN-P1', 'TOKEN-P2']) expect(contenedor.innerHTML).not.toContain(token)
    for (const sel of ['[data-naira-respuesta]', '[data-naira-asof]', '[data-naira-turno]', '[data-naira-hilo]', 'textarea']) {
      expect(contenedor.querySelector(sel), sel).toBeNull()
    }
  })

  it('[N13:apagada-propia] el 404 de la conversación dice que no está habilitada, sin compositor ni pregunta', async () => {
    await montar()
    await enviar('P TOKEN-P (ejemplo)', { kind: 'apagada' })
    const apagada = contenedor.querySelector('[data-testid="naira-conversacion-apagada"]')
    expect(apagada?.textContent).toContain('La conversación con Naira no está habilitada para tu inmobiliaria')
    expect(contenedor.querySelector('[data-testid="naira-apagada"]')).toBeNull()
    expect(contenedor.querySelector('textarea')).toBeNull()
    expect(contenedor.innerHTML).not.toContain('TOKEN-P')
  })

  it('[N13:no-enviada-reintenta] un fallo de red se reintenta con la MISMA pregunta en su lugar; ilegible e inválida no', async () => {
    await montar()
    await enviar('P TOKEN-P (ejemplo)', { kind: 'no_disponible' })
    const turno = contenedor.querySelector('[data-naira-turno="no_enviada"]')
    expect(turno?.textContent).toContain('No pudimos enviar tu pregunta. Revisa tu conexión e inténtalo de nuevo.')
    const reintentar = contenedor.querySelector('[data-testid="naira-reintentar-pregunta"]') as HTMLButtonElement
    expect(reintentar.textContent).toBe('Reintentar pregunta')
    preguntarMock.mockImplementationOnce(() => Promise.resolve(ok(RESPONDIDA)))
    act(() => reintentar.click())
    await asentar()
    expect(preguntarMock).toHaveBeenCalledTimes(2)
    expect(preguntarMock).toHaveBeenLastCalledWith('AGY-1', 'P TOKEN-P (ejemplo)')
    expect(contenedor.querySelectorAll('[data-naira-turno]')).toHaveLength(1)
    expect(contenedor.querySelector('[data-naira-turno]')?.getAttribute('data-naira-turno')).toBe('con_respuesta')
    expect(burbujas('P TOKEN-P (ejemplo)')).toHaveLength(1)
    await enviar('Q ilegible (ejemplo)', { kind: 'contrato_roto' })
    await enviar('Q invalida (ejemplo)', { kind: 'rechazado', razon: null })
    expect(contenedor.textContent).toContain('No pudimos leer la respuesta de Naira, así que no mostramos nada de ella. Inténtalo más tarde.')
    expect(contenedor.textContent).toContain('Escribe tu pregunta, con hasta 2000 caracteres.')
    expect(contenedor.querySelector('[data-testid="naira-reintentar-pregunta"]')).toBeNull()
  })

  it('[N13:conversacion-sin-persistencia] ni las preguntas ni las respuestas quedan en el almacenamiento del navegador', async () => {
    localStorage.clear()
    sessionStorage.clear()
    const prototipos = new Set<Storage>([Storage.prototype, Object.getPrototypeOf(localStorage), Object.getPrototypeOf(sessionStorage)])
    const espias = [...prototipos].map((p) => vi.spyOn(p, 'setItem'))
    await montar()
    await enviar('P TOKEN-P (ejemplo)', ok(RESPONDIDA))
    await enviar('otra TOKEN-P (ejemplo)', ok(NEGADA_ACCION))
    const tokens = ['TOKEN-P', 'TOKEN-R', 'TOKEN-N']
    for (const almacen of [localStorage, sessionStorage]) {
      for (let i = 0; i < almacen.length; i += 1) {
        const clave = almacen.key(i) ?? ''
        const valor = almacen.getItem(clave) ?? ''
        for (const token of tokens) {
          expect(clave).not.toContain(token)
          expect(valor).not.toContain(token)
        }
      }
    }
    for (const espia of espias) {
      for (const llamada of espia.mock.calls) for (const arg of llamada) for (const token of tokens) expect(String(arg)).not.toContain(token)
    }
  })

  it('[N13:pregunta-sin-log] la pregunta no se escribe en la consola', async () => {
    const espias = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined))
    await montar()
    await enviar('P TOKEN-P (ejemplo)', ok(RESPONDIDA))
    await enviar('otra TOKEN-P (ejemplo)', { kind: 'no_disponible' })
    for (const espia of espias) {
      for (const llamada of espia.mock.calls) for (const arg of llamada) expect(String(arg)).not.toContain('TOKEN-P')
    }
  })

  it('[N13:simulado-visible] una respuesta de ejemplo se marca: aviso, data-sample y cortes de ejemplo', async () => {
    await montar()
    await enviar('P (ejemplo)', ok(RESPONDIDA, 'ejemplo'))
    expect(contenedor.querySelector('[data-testid="aviso-datos-de-ejemplo"]')).not.toBeNull()
    expect(contenedor.querySelector('[data-naira-vista="preguntar"]')?.getAttribute('data-sample')).toBe('true')
    expect(contenedor.querySelector('[data-naira-etiqueta-respuesta]')?.textContent).toBe('RESPUESTA')
    const marcas = Array.from(contenedor.querySelectorAll('[data-naira-asof]'))
    expect(marcas.length).toBeGreaterThan(0)
    for (const m of marcas) {
      expect(m.getAttribute('data-naira-ejemplo')).toBe('true')
      expect(m.textContent).toBe('DATO DE EJEMPLO')
    }
  })

  it('[N13:ejemplo-envio-habilitado] con datos de ejemplo se sigue pudiendo preguntar', async () => {
    await montar()
    await enviar('P (ejemplo)', ok(RESPONDIDA, 'ejemplo'))
    escribir('otra (ejemplo)')
    expect(enviarBoton()?.disabled).toBe(false)
    preguntarMock.mockImplementationOnce(() => Promise.resolve(ok(RESPONDIDA, 'ejemplo')))
    act(() => enviarBoton()!.click())
    await asentar()
    expect(preguntarMock).toHaveBeenCalledTimes(2)
  })

  it('[N13:simulado-nunca-en-prod] en producción la pregunta va al agente real y nunca aparece un ejemplo', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true')
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'https://agente.invalid')
    const real = await vi.importActual<typeof import('@/lib/api/naira/cliente')>('@/lib/api/naira/cliente')
    preguntarMock.mockImplementation(real.preguntarANaira)
    const cuerpo = { ...RESPONDIDA, texto: 'TOKEN-RED (ejemplo)', oraciones: [{ ...RESPONDIDA.oraciones![0]!, texto: 'TOKEN-RED (ejemplo)' }] }
    agentFetchMock.mockImplementation(async () => new Response(JSON.stringify(cuerpo), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    await montar()
    await enviar('P (ejemplo)')
    await asentar()
    expect(agentFetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = agentFetchMock.mock.calls[0]!
    expect(String(url)).toContain('/api/agency/AGY-1/naira/conversation/questions')
    expect((init as RequestInit | undefined)?.method).toBe('POST')
    expect(contenedor.textContent).toContain('TOKEN-RED')
    expect(contenedor.textContent).not.toContain(EJEMPLO.texto)
    for (const o of EJEMPLO.oraciones ?? []) expect(contenedor.textContent).not.toContain(o.texto)
    expect(contenedor.querySelector('[data-sample]')).toBeNull()
    expect(contenedor.querySelector('[data-testid="aviso-datos-de-ejemplo"]')).toBeNull()
  })

  it('[N13:accion-en-aprobaciones] pedir una acción manda a Aprobaciones con enlace solo con action-view', async () => {
    await montar()
    await enviar('P (ejemplo)', ok(NEGADA_ACCION))
    const enlace = contenedor.querySelector(`a[href="${RUTA_DE_APROBACIONES}"]`)
    expect(enlace?.textContent).toBe('Ir a Aprobaciones')
    act(() => root.unmount())
    root = createRoot(contenedor)
    permisos.conjunto = new Set(['naira:conversation-ask'])
    await montar()
    await enviar('P (ejemplo)', ok(NEGADA_ACCION))
    const articulo = contenedor.querySelector('article[data-naira-respuesta="negada"]')!
    expect(articulo.querySelector('[data-naira-copia-propia="aprobaciones"]')?.textContent).toContain('Aprobaciones')
    expect(articulo.querySelectorAll('a')).toHaveLength(0)
  })

  it('[N13:b5-sin-persona] quien pregunta no aparece en ningún lado', async () => {
    await montar()
    await enviar('P (ejemplo)', ok(RESPONDIDA))
    await enviar('otra (ejemplo)', ok(NEGADA_ACCION))
    const html = contenedor.innerHTML
    for (const s of ['centinela-b5', 'Centinela B5', ...USER_IDS_DE_EJEMPLO]) expect(html).not.toContain(s)
  })
})
