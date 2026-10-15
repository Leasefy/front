/**
 * @vitest-environment happy-dom
 *
 * PreguntaSemanal — el recall del lunes (13-03, Tarea 2; NOT-05, D13-13, UI-SPEC §7.1, §8.2 y §8.6).
 *
 * Qué prueba: la respuesta viaja con la semana y el texto, una vez; cada rechazo se dice por su razón y sin eco del
 * texto; mientras viaja no se manda dos veces; con datos de ejemplo no se escribe; nada queda en el navegador; y el ancla
 * del correo desplaza la sección sin mover el foco.
 *
 * Arnés: createRoot + act, i18n contra el es.json real (stub), agencia AGY-1, el cliente mockeado solo en
 * `responderRecall` (promesas que resuelve el test; el resto del módulo real sigue, incluida RAZON_PEDIDO_INVALIDO).
 * El texto se escribe con el setter nativo del textarea + un evento `input`. Marcador [N13:*] en el TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const red = vi.hoisted(() => {
  const pendientes: ((r: unknown) => void)[] = []
  const responderRecall = vi.fn(
    (_agencyId: string, _cuerpo: { semana: string; texto: string }) =>
      new Promise<unknown>((resolve) => {
        pendientes.push(resolve)
      }),
  )
  return { pendientes, responderRecall }
})

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/naira/cliente')>()),
  responderRecall: red.responderRecall,
}))

import { RAZON_PEDIDO_INVALIDO } from '@/lib/api/naira/cliente'
import { LARGO_MAXIMO_DE_RECALL } from '@/lib/naira/briefing-y-senal'

import { ProveedorDeOrigen } from './OrigenDeNaira'
import { PreguntaSemanal } from './PreguntaSemanal'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const TEXTO = 'Faltó avisar lo del contrato (ejemplo)'
const GRACIAS = 'Gracias. Lo usamos para descubrir lo que Naira no está viendo.'
const PII = 'Tu respuesta tiene una cédula, un teléfono o un correo. Quítalos y vuelve a enviarla.'
const CERRADA = 'Esta pregunta ya no está abierta.'
const SIN_PERMISO = 'No tienes permiso para esta acción.'
const NO_ENVIADA = 'No pudimos enviar tu respuesta. Intenta de nuevo.'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  red.pendientes.length = 0
  red.responderRecall.mockClear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  window.history.replaceState(null, '', window.location.pathname)
  vi.restoreAllMocks()
})

function montar(origen: 'agente' | 'ejemplo' = 'agente'): void {
  act(() => {
    root.render(
      <ProveedorDeOrigen origen={origen}>
        <PreguntaSemanal semana="2000-01-03" ancla="recall" />
      </ProveedorDeOrigen>,
    )
  })
}

const campo = () => container.querySelector('textarea') as HTMLTextAreaElement | null
const boton = () => [...container.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes('Enviar respuesta')) as HTMLButtonElement | undefined
const region = () => container.querySelector('[aria-live="polite"]')
const texto = () => (container.textContent ?? '').replace(/\s+/g, ' ')

function escribir(valor: string): void {
  const ta = campo()
  if (ta === null) throw new Error('sin textarea')
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  act(() => {
    setter?.call(ta, valor)
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function enviar(): Promise<void> {
  const form = container.querySelector('form')
  if (form === null) throw new Error('sin formulario')
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

async function resolver(r: unknown): Promise<void> {
  await act(async () => {
    red.pendientes.shift()?.(r)
  })
  await act(async () => {
    for (let i = 0; i < 3; i += 1) await Promise.resolve()
  })
}

describe('PreguntaSemanal', () => {
  it('[N13:control-positivo] la sección del ancla con su pregunta, su campo con el largo del contrato y su botón', () => {
    montar()
    const seccion = container.querySelector('section#recall[data-naira-recall]')
    expect(seccion).not.toBeNull()
    expect(texto()).toContain('¿Hubo algo importante esta semana que Naira no te dijo?')
    const label = container.querySelector('label')
    expect(label?.textContent).toBe('Tu respuesta para Naira')
    expect(label?.className).toContain('sr-only')
    expect(label?.getAttribute('for')).toBe(campo()?.id)
    expect(campo()?.maxLength).toBe(LARGO_MAXIMO_DE_RECALL)
    expect(boton()).toBeDefined()
  })

  it('[N13:recall-envia] manda la semana y el texto una vez y agradece', async () => {
    montar()
    escribir(TEXTO)
    await enviar()
    expect(red.responderRecall).toHaveBeenCalledTimes(1)
    expect(red.responderRecall).toHaveBeenCalledWith('AGY-1', { semana: '2000-01-03', texto: TEXTO })
    await resolver({ kind: 'ok', data: { respuestaId: 'r-1' }, origen: 'agente' })
    const gracias = [...container.querySelectorAll('[role="status"]')].find((n) => n.textContent === GRACIAS)
    expect(gracias).toBeDefined()
    expect(campo()).toBeNull()
  })

  it('[N13:recall-razones] cada rechazo por su razón y sin eco del texto', async () => {
    const casos: { respuesta: unknown; mensaje: string; bloquea: boolean }[] = [
      ...['pii:email', 'pii:cedula', 'pii:telefono', 'rechazada_por_pii'].map((razon) => ({
        respuesta: { kind: 'rechazado', razon },
        mensaje: PII,
        bloquea: false,
      })),
      {
        respuesta: { kind: 'rechazado', razon: 'pending_counsel:naira_desempeno_empleados' },
        mensaje: 'Tu respuesta habla de alguien del equipo y eso todavía no se puede guardar. Quítalo y vuelve a enviarla.',
        bloquea: false,
      },
      { respuesta: { kind: 'rechazado', razon: 'semana_no_es_lunes' }, mensaje: CERRADA, bloquea: true },
      { respuesta: { kind: 'rechazado', razon: 'semana_futura' }, mensaje: CERRADA, bloquea: true },
      {
        respuesta: { kind: 'rechazado', razon: RAZON_PEDIDO_INVALIDO },
        mensaje: 'Escribe tu respuesta, con hasta 2000 caracteres.',
        bloquea: false,
      },
      { respuesta: { kind: 'sin_permiso' }, mensaje: SIN_PERMISO, bloquea: true },
      { respuesta: { kind: 'no_disponible' }, mensaje: NO_ENVIADA, bloquea: false },
    ]
    for (const [i, caso] of casos.entries()) {
      act(() => root.unmount())
      root = createRoot(container)
      montar()
      const escrito = 'TEXTO-ESCRITO-' + i + ' (ejemplo)'
      escribir(escrito)
      await enviar()
      await resolver(caso.respuesta)
      const vivo = region()
      expect(vivo?.textContent, JSON.stringify(caso.respuesta)).toBe(caso.mensaje)
      expect(vivo?.textContent ?? '').not.toContain(escrito)
      expect(campo()?.disabled, JSON.stringify(caso.respuesta)).toBe(caso.bloquea)
      if (caso.bloquea) expect(boton()?.disabled).toBe(true)
    }
  })

  it('[N13:recall-en-vuelo] mientras viaja el botón está deshabilitado y un segundo envío no vuelve a llamar', async () => {
    montar()
    escribir(TEXTO)
    await enviar()
    expect(boton()?.disabled).toBe(true)
    await enviar()
    expect(red.responderRecall).toHaveBeenCalledTimes(1)
  })

  it('[N13:simulado-visible] con datos de ejemplo no se puede responder y no se llama al servicio', async () => {
    montar('ejemplo')
    expect(campo()?.disabled).toBe(true)
    expect(region()?.textContent).toBe('Datos de ejemplo: no se puede responder.')
    escribir(TEXTO)
    expect(boton()?.disabled).toBe(true)
    await enviar()
    expect(red.responderRecall).not.toHaveBeenCalled()
  })

  it('[N13:recall-sin-persistencia] nada del texto queda en el navegador', async () => {
    const antesLocal = localStorage.length
    const antesSesion = sessionStorage.length
    montar()
    escribir(TEXTO)
    await enviar()
    await resolver({ kind: 'ok', data: { respuestaId: 'r-1' }, origen: 'agente' })
    expect(localStorage.length).toBe(antesLocal)
    expect(sessionStorage.length).toBe(antesSesion)
    for (const almacen of [localStorage, sessionStorage]) {
      for (let i = 0; i < almacen.length; i += 1) {
        const clave = almacen.key(i)
        expect(clave === null ? '' : almacen.getItem(clave) ?? '').not.toContain(TEXTO)
      }
    }
  })

  it('[N13:recall-ancla] con el hash del correo la sección se desplaza a la vista sin mover el foco', () => {
    const llamadas: Element[] = []
    vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (this: Element) {
      llamadas.push(this)
    })
    montar()
    expect(llamadas.length).toBe(0)
    act(() => root.unmount())
    root = createRoot(container)

    window.history.replaceState(null, '', '#recall')
    montar()
    expect(llamadas.length).toBe(1)
    expect(llamadas[0]).toBe(container.querySelector('section#recall'))
    expect(document.activeElement).toBe(document.body)
  })
})
