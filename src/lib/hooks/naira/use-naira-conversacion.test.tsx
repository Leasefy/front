/**
 * use-naira-conversacion.test.tsx — el hook de la conversación con Naira (13-06, Tarea 2).
 *
 * Qué prueba: nada se envía sin un gesto (ni al montar, ni al re-renderizar, ni al volver al foco); una pregunta a la vez;
 * un 403 o un 404 de la pregunta se llevan el hilo ENTERO (FG13-1 a nivel hook); el reintento reenvía la MISMA pregunta en
 * su lugar; una respuesta de otra agencia no aterriza; nada toca el almacenamiento del navegador ni la consola (FG13-16);
 * los datos de ejemplo se marcan y siguen dejando preguntar (FG13-10).
 *
 * Arnés (molde use-lectura-de-naira.test.tsx de 13-01): createRoot + act, `useAuth` falso con un usuario centinela que el
 * hook no debe leer (B-5), `preguntarANaira` simulado sobre el módulo real y promesas diferidas controladas por el test.
 * Marcador [N13:*] en el TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ agencia: 'AGY-1' as string | null }))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    agency: auth.agencia === null ? null : { id: auth.agencia },
    user: { id: 'centinela-b5', email: 'centinela-b5@ejemplo.invalid' },
    isAuthenticated: true,
    isLoading: false,
  }),
}))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/api/naira/cliente')>()
  return { ...real, preguntarANaira: vi.fn(real.preguntarANaira) }
})

import { preguntarANaira, type EstadoNaira } from '@/lib/api/naira/cliente'
import { RESPUESTA_ESTRICTA_POR_ENDPOINT, type NairaConversationAnswer } from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA } from '@/lib/data/mock-naira'
import type { NairaConversacionRespondida } from '@/lib/naira/conversacion'

import { useNairaConversacion, type ConversacionConNaira } from './use-naira-conversacion'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const preguntarMock = vi.mocked(preguntarANaira)
const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['conversacion.preguntar']

function respondidaDelEjemplo(): NairaConversacionRespondida {
  const e = EJEMPLOS_DE_NAIRA['conversacion.preguntar']
  if (e.kind !== 'respondida') throw new Error('el ejemplo de conversacion.preguntar (13-01) dejó de ser una respondida: ' + e.kind)
  return e
}
const BASE = respondidaDelEjemplo()

function respondidaCon(textoDeLaRespuesta: string): NairaConversacionRespondida {
  return {
    ...BASE,
    texto: textoDeLaRespuesta,
    refsServidas: [],
    refs: [],
    oraciones: [{ seccion: 'declaracion', texto: textoDeLaRespuesta, claimClass: null, cifras: [] }],
  }
}
const RESPONDIDA = respondidaCon('TOKEN-R (ejemplo)')
const VIEJA = respondidaCon('TOKEN-VIEJO (ejemplo)')
const NEGADA: NairaConversationAnswer = {
  kind: 'negada',
  preguntaId: BASE.preguntaId,
  razon: 'fuera_de_catalogo',
  puedoResponder: [],
  texto: 'TOKEN-N (ejemplo)',
}
const FIXTURES: readonly NairaConversationAnswer[] = [RESPONDIDA, VIEJA, NEGADA]

type Resultado = EstadoNaira<NairaConversationAnswer>
const ok = (data: NairaConversationAnswer, origen: 'agente' | 'ejemplo' = 'agente'): Resultado => ({ kind: 'ok', data, origen })

function diferida<T>() {
  let resolver: (v: T) => void = () => undefined
  const promesa = new Promise<T>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

const caja: { valor: ConversacionConNaira | null } = { valor: null }

function Sonda() {
  caja.valor = useNairaConversacion()
  return null
}

function hook(): ConversacionConNaira {
  if (caja.valor === null) throw new Error('el hook no se montó')
  return caja.valor
}

/** El valor del hook sin las funciones. */
function datosDelHook(): string {
  const { vista, enCurso } = hook()
  return JSON.stringify({ vista, enCurso })
}

let contenedor: HTMLDivElement
let root: Root

function montar() {
  act(() => {
    root.render(<Sonda />)
  })
}

const asentar = () =>
  act(async () => {
    for (let i = 0; i < 6; i += 1) await Promise.resolve()
  })

async function preguntarY(pregunta: string, resultado: Resultado) {
  preguntarMock.mockResolvedValueOnce(resultado)
  act(() => hook().preguntar(pregunta))
  await asentar()
}

function turnos() {
  const v = hook().vista
  if (v.kind !== 'ok') throw new Error('la vista no está abierta: ' + v.kind)
  return v.data.turnos
}

beforeEach(() => {
  auth.agencia = 'AGY-1'
  caja.valor = null
  preguntarMock.mockReset()
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
  vi.restoreAllMocks()
})

describe('useNairaConversacion', () => {
  it('[N13:fixture-es-contrato] cada fixture pasa el esquema estricto de la respuesta', () => {
    for (const f of FIXTURES) {
      const r = ESTRICTO.safeParse(f)
      expect(r.success, JSON.stringify(r.success ? null : r.error.issues)).toBe(true)
    }
  })

  it('[N13:control-positivo] una pregunta se envía recortada, consulta y aterriza como respuesta', async () => {
    montar()
    expect(hook().vista).toEqual({ kind: 'ok', data: { turnos: [] }, origen: 'agente' })
    expect(hook().enCurso).toBe(false)
    const d = diferida<Resultado>()
    preguntarMock.mockReturnValueOnce(d.promesa)
    act(() => hook().preguntar('  ¿Cómo va la vacancia? TOKEN-P (ejemplo)  '))
    await asentar()
    expect(preguntarMock).toHaveBeenCalledTimes(1)
    expect(preguntarMock).toHaveBeenCalledWith('AGY-1', '¿Cómo va la vacancia? TOKEN-P (ejemplo)')
    expect(hook().enCurso).toBe(true)
    expect(turnos()).toHaveLength(1)
    expect(turnos()[0]?.pregunta).toBe('¿Cómo va la vacancia? TOKEN-P (ejemplo)')
    expect(turnos()[0]?.estado.kind).toBe('consultando')
    d.resolver(ok(RESPONDIDA))
    await asentar()
    const estado = turnos()[0]?.estado
    expect(estado?.kind).toBe('con_respuesta')
    expect(estado?.kind === 'con_respuesta' ? estado.respuesta.texto : null).toBe('TOKEN-R (ejemplo)')
    expect(hook().enCurso).toBe(false)
  })

  it('[N13:sin-envio-sin-accion] ni montar, ni re-renderizar, ni volver al foco, ni una pregunta vacía o larga envían', async () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    try {
      montar()
      await asentar()
      montar()
      await asentar()
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
        window.dispatchEvent(new Event('focus'))
      })
      await asentar()
      act(() => hook().preguntar(''))
      act(() => hook().preguntar('   '))
      act(() => hook().preguntar('x'.repeat(2001)))
      await asentar()
      expect(turnos()).toHaveLength(0)
      act(() => root.unmount())
      root = createRoot(contenedor)
      auth.agencia = null
      montar()
      await asentar()
      expect(hook().vista).toEqual({ kind: 'cargando' })
      act(() => hook().preguntar('hola (ejemplo)'))
      await asentar()
      expect(hook().vista).toEqual({ kind: 'cargando' })
      expect(preguntarMock).toHaveBeenCalledTimes(0)
    } finally {
      delete (document as { visibilityState?: unknown }).visibilityState
    }
  })

  it('[N13:una-a-la-vez] dos preguntas antes de la respuesta son UNA llamada y UN turno', async () => {
    montar()
    const d = diferida<Resultado>()
    preguntarMock.mockReturnValueOnce(d.promesa)
    act(() => {
      hook().preguntar('primera (ejemplo)')
      hook().preguntar('segunda (ejemplo)')
    })
    await asentar()
    act(() => hook().preguntar('tercera (ejemplo)'))
    await asentar()
    expect(preguntarMock).toHaveBeenCalledTimes(1)
    expect(turnos()).toHaveLength(1)
    d.resolver(ok(RESPONDIDA))
    await asentar()
    await preguntarY('otra (ejemplo)', ok(RESPONDIDA))
    expect(preguntarMock).toHaveBeenCalledTimes(2)
    expect(turnos()).toHaveLength(2)
  })

  it('[N13:403-sin-residuo] tras una respuesta, un 403 deja la vista sin permiso y sin nada del hilo', async () => {
    montar()
    await preguntarY('P1 TOKEN-P1 (ejemplo)', ok(RESPONDIDA))
    expect(datosDelHook()).toContain('TOKEN-R')
    await preguntarY('P2 TOKEN-P2 (ejemplo)', { kind: 'sin_permiso' })
    expect(JSON.stringify(hook().vista)).toBe('{"kind":"sin_permiso"}')
    expect(hook().enCurso).toBe(false)
    const datos = datosDelHook()
    for (const token of ['TOKEN-R', 'TOKEN-P1', 'TOKEN-P2']) expect(datos).not.toContain(token)
    act(() => hook().preguntar('otra (ejemplo)'))
    await asentar()
    expect(preguntarMock).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(hook().vista)).toBe('{"kind":"sin_permiso"}')
  })

  it('[N13:apagada] el 404 de Naira o de su sub-flag (y un no_encontrado) dejan la vista apagada, sin el hilo', async () => {
    for (const kind of ['apagada', 'no_encontrado'] as const) {
      act(() => root.unmount())
      root = createRoot(contenedor)
      montar()
      await preguntarY('P1 TOKEN-P1 (ejemplo)', ok(RESPONDIDA))
      await preguntarY('P2 TOKEN-P2 (ejemplo)', { kind })
      expect(hook().vista, kind).toEqual({ kind: 'apagada' })
      const datos = datosDelHook()
      for (const token of ['TOKEN-R', 'TOKEN-P1', 'TOKEN-P2']) expect(datos, kind).not.toContain(token)
    }
  })

  it('[N13:reintentar-la-misma] un turno sin enviar se reintenta con la MISMA pregunta en su lugar; los demás no', async () => {
    montar()
    await preguntarY('P TOKEN-P (ejemplo)', { kind: 'no_disponible' })
    expect(turnos()).toHaveLength(1)
    const turno = turnos()[0]!
    expect(turno.estado.kind).toBe('no_enviada')
    const d = diferida<Resultado>()
    preguntarMock.mockReturnValueOnce(d.promesa)
    act(() => hook().reintentar(turno.id))
    await asentar()
    expect(preguntarMock).toHaveBeenCalledTimes(2)
    expect(preguntarMock).toHaveBeenLastCalledWith('AGY-1', 'P TOKEN-P (ejemplo)')
    expect(turnos()).toHaveLength(1)
    expect(turnos()[0]?.id).toBe(turno.id)
    expect(turnos()[0]?.estado.kind).toBe('consultando')
    d.resolver(ok(RESPONDIDA))
    await asentar()
    expect(turnos()[0]?.estado.kind).toBe('con_respuesta')
    act(() => hook().reintentar(turno.id))
    act(() => hook().reintentar(987654))
    await asentar()
    expect(preguntarMock).toHaveBeenCalledTimes(2)

    await preguntarY('Q (ejemplo)', { kind: 'rechazado', razon: 'pedido_invalido' })
    await preguntarY('R (ejemplo)', { kind: 'contrato_roto' })
    const [, invalida, ilegible] = turnos()
    expect(invalida?.estado.kind).toBe('invalida')
    expect(ilegible?.estado.kind).toBe('ilegible')
    act(() => hook().reintentar(invalida!.id))
    act(() => hook().reintentar(ilegible!.id))
    await asentar()
    expect(preguntarMock).toHaveBeenCalledTimes(4)
  })

  it('[N13:respuesta-vieja-descartada] lo que llega de la agencia anterior no aterriza en la nueva', async () => {
    montar()
    const q1 = diferida<Resultado>()
    preguntarMock.mockReturnValueOnce(q1.promesa)
    act(() => hook().preguntar('Q1 (ejemplo)'))
    await asentar()
    expect(preguntarMock).toHaveBeenLastCalledWith('AGY-1', 'Q1 (ejemplo)')
    auth.agencia = 'AGY-2'
    montar()
    await asentar()
    expect(hook().vista).toEqual({ kind: 'ok', data: { turnos: [] }, origen: 'agente' })
    expect(hook().enCurso).toBe(false)
    const q2 = diferida<Resultado>()
    preguntarMock.mockReturnValueOnce(q2.promesa)
    act(() => hook().preguntar('Q2 (ejemplo)'))
    await asentar()
    expect(preguntarMock).toHaveBeenLastCalledWith('AGY-2', 'Q2 (ejemplo)')
    expect(hook().enCurso).toBe(true)
    q1.resolver(ok(VIEJA))
    await asentar()
    expect(hook().enCurso).toBe(true)
    expect(turnos()).toHaveLength(1)
    expect(turnos()[0]?.pregunta).toBe('Q2 (ejemplo)')
    expect(turnos()[0]?.estado.kind).toBe('consultando')
    expect(datosDelHook()).not.toContain('TOKEN-VIEJO')
    q2.resolver(ok(RESPONDIDA))
    await asentar()
    expect(turnos()[0]?.estado.kind).toBe('con_respuesta')
    expect(hook().enCurso).toBe(false)
  })

  it('[N13:conversacion-sin-persistencia] ni la pregunta ni la respuesta quedan en el almacenamiento del navegador', async () => {
    localStorage.clear()
    sessionStorage.clear()
    const prototipos = new Set<Storage>([Storage.prototype, Object.getPrototypeOf(localStorage), Object.getPrototypeOf(sessionStorage)])
    const espias = [...prototipos].map((p) => vi.spyOn(p, 'setItem'))
    montar()
    await preguntarY('P TOKEN-P (ejemplo)', ok(RESPONDIDA))
    await preguntarY('otra TOKEN-P (ejemplo)', ok(NEGADA))
    expect(datosDelHook()).toContain('TOKEN-N')
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
    for (const token of tokens) expect(document.cookie).not.toContain(token)
  })

  it('[N13:pregunta-sin-log] la pregunta no se escribe en la consola', async () => {
    const metodos = ['log', 'info', 'warn', 'error', 'debug'] as const
    const espias = metodos.map((m) => vi.spyOn(console, m).mockImplementation(() => undefined))
    montar()
    await preguntarY('P TOKEN-P (ejemplo)', ok(RESPONDIDA))
    await preguntarY('otra TOKEN-P (ejemplo)', ok(NEGADA))
    await preguntarY('tercera TOKEN-P (ejemplo)', { kind: 'no_disponible' })
    expect(turnos()).toHaveLength(3)
    for (const espia of espias) {
      for (const llamada of espia.mock.calls) for (const arg of llamada) expect(String(arg)).not.toContain('TOKEN-P')
    }
  })

  it('[N13:origen-de-ejemplo] una respuesta de ejemplo marca la vista y el turno, y se puede seguir preguntando', async () => {
    montar()
    await preguntarY('P (ejemplo)', ok(RESPONDIDA, 'ejemplo'))
    const v = hook().vista
    expect(v.kind === 'ok' ? v.origen : null).toBe('ejemplo')
    const estado = turnos()[0]?.estado
    expect(estado?.kind === 'con_respuesta' ? estado.origen : null).toBe('ejemplo')
    await preguntarY('otra (ejemplo)', ok(RESPONDIDA, 'ejemplo'))
    expect(preguntarMock).toHaveBeenCalledTimes(2)
    expect(turnos()).toHaveLength(2)
  })
})
