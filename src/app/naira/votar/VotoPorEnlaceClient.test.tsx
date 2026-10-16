/**
 * @vitest-environment happy-dom
 *
 * VotoPorEnlaceClient — P12: el voto de Naira desde el correo. Lo que se fija:
 *   · con `#t=…&v=…` vota UNA vez al cargar (aunque el efecto corra dos veces), con el sobre y el valor, y saca el sobre
 *     de la barra de direcciones;
 *   · «registrado» solo con el 201; después se puede cambiar la respuesta;
 *   · cada razón del servidor se dice por su nombre, y un enlace vencido o inválido apaga los botones;
 *   · sin sobre no llama a la red y lo dice;
 *   · con el sobre y sin valor, espera a que la persona elija.
 */

import * as React from 'react'
import { StrictMode, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import es from '@/lib/i18n/locales/es.json'

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import { VotoPorEnlaceClient, leerElEnlace } from './VotoPorEnlaceClient'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const N = es.inmobiliaria.ai.naira
const SOBRE = 'AbC_123-xyz'

let container: HTMLDivElement
let root: Root
const fetchMock = vi.fn()

function responder(status: number, cuerpo: unknown) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } }))
}

async function montar(hash: string) {
  window.history.replaceState(null, '', '/naira/votar' + hash)
  await act(async () => {
    root.render(
      <StrictMode>
        <VotoPorEnlaceClient />
      </StrictMode>,
    )
  })
  await act(async () => {
    await Promise.resolve()
  })
}

function boton(etiqueta: string): HTMLButtonElement {
  const b = [...container.querySelectorAll('button')].find((x) => x.textContent?.includes(etiqueta))
  if (!b) throw new Error('sin botón ' + etiqueta)
  return b as HTMLButtonElement
}

function estado(): string {
  return [...container.querySelectorAll('[role="status"]')].map((n) => n.textContent ?? '').join(' ')
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'https://micro.test')
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('P12 — la página del voto desde el correo', () => {
  it('[VPE-F:leer] lee el sobre base64url y el valor; lo raro no pasa', () => {
    expect(leerElEnlace('#t=' + SOBRE + '&v=no_util')).toEqual({ t: SOBRE, v: 'no_util' })
    expect(leerElEnlace('#t=' + SOBRE + '&v=excelente')).toEqual({ t: SOBRE, v: null })
    expect(leerElEnlace('#t=<script>&v=util')).toEqual({ t: null, v: 'util' })
    expect(leerElEnlace('')).toEqual({ t: null, v: null })
  })

  it('[VPE-F:vota-al-cargar] vota UNA vez con el sobre y el valor, saca el sobre de la URL y dice «registrado» con el 201', async () => {
    responder(201, { kind: 'registrado', valor: 'util', diaDelVoto: '2026-10-16' })
    await montar('#t=' + SOBRE + '&v=util')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://micro.test/api/naira/votos/por-enlace')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ t: SOBRE, valor: 'util' })
    expect(window.location.hash).toBe('')
    expect(window.location.pathname).toBe('/naira/votar')
    expect(estado()).toContain('Registrado como "útil"')
    expect(boton(N.utilidad.util).getAttribute('aria-pressed')).toBe('true')
  })

  it('[VPE-F:cambiar] después de votar, otro botón cambia la respuesta con el MISMO sobre', async () => {
    responder(201, { kind: 'registrado', valor: 'util', diaDelVoto: '2026-10-16' })
    await montar('#t=' + SOBRE + '&v=util')
    responder(201, { kind: 'registrado', valor: 'ya_lo_sabia', diaDelVoto: '2026-10-16' })
    await act(async () => {
      boton(N.utilidad.ya_lo_sabia).click()
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ t: SOBRE, valor: 'ya_lo_sabia' })
    expect(estado()).toContain('Registrado como "ya lo sabía"')
  })

  it.each([
    ['ventana_vencida', 409, N.utilidad.ventanaVencida, true],
    ['sin_autorizacion', 409, N.utilidad.sinAutorizacion, true],
    ['no_entregado', 404, N.utilidad.soloQuienLaRecibio, true],
    ['enlace_invalido', 400, N.votoPorEnlace.enlaceInvalido, true],
    ['sin_miembro', 403, N.votoPorEnlace.sinMiembro, true],
    ['demasiados_votos', 429, N.votoPorEnlace.demasiados, false],
    ['algo_nuevo', 500, N.utilidad.noRegistrado, false],
  ] as const)('[VPE-F:razon] %s → su frase; apaga los botones: %s', async (reason, status, frase, apaga) => {
    responder(status, { statusCode: status, code: 'X', message: 'x', reason })
    await montar('#t=' + SOBRE + '&v=no_util')
    expect(estado()).toContain(frase)
    expect(estado()).not.toContain('Registrado')
    expect(boton(N.utilidad.util).disabled).toBe(apaga)
  })

  it('[VPE-F:red] sin red: «no pudimos registrar», sin «registrado»', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await montar('#t=' + SOBRE + '&v=util')
    expect(estado()).toContain(N.utilidad.noRegistrado)
  })

  it('[VPE-F:sin-sobre] sin sobre no llama a la red, lo dice y lleva al panel', async () => {
    await montar('')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(estado()).toContain(N.votoPorEnlace.sinEnlace)
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/reportes/naira')
  })

  it('[VPE-F:sin-valor] con el sobre y sin valor, espera a que la persona elija', async () => {
    await montar('#t=' + SOBRE)
    expect(fetchMock).not.toHaveBeenCalled()
    responder(201, { kind: 'registrado', valor: 'no_util', diaDelVoto: '2026-10-16' })
    await act(async () => {
      boton(N.utilidad.no_util).click()
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ t: SOBRE, valor: 'no_util' })
  })
})
