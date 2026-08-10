/**
 * Tests de useAudioPlayer — enganche tardío del elemento <audio>.
 *
 * LA REGRESIÓN QUE FIJAN
 * ──────────────────────
 * El efecto que engancha los listeners dependía sólo de `[audioRef, speed]`.
 * Un ref no dispara re-render y su identidad nunca cambia, así que el efecto
 * corría UNA vez, al montar.
 *
 * Mientras el reproductor sólo se renderizaba con el audio ya resuelto, eso
 * alcanzaba. Cuando se agregó el estado «buscando la grabación», el <audio>
 * pasó a aparecer DESPUÉS del primer render: el efecto ya había corrido con el
 * ref en null y no volvía a correr nunca. Resultado en pantalla: la barra no
 * avanzaba, la duración quedaba en 00:00 y el botón de play nunca cambiaba a
 * pausa — todo esto con el audio cargado y reproduciéndose de verdad.
 *
 * Patrón de montaje: createRoot + act, igual que el resto de los hooks del repo.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act, useRef } from 'react'

import { useAudioPlayer, type UseAudioPlayerResult } from './use-audio-player'

void React // jsx-preserve
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

const result: { current: UseAudioPlayerResult | null } = { current: null }

function Wrapper({ show, token }: { show: boolean; token: string }) {
  const ref = useRef<HTMLAudioElement>(null)
  result.current = useAudioPlayer(ref, token)
  return show ? <audio ref={ref} /> : null
}

function render(show: boolean, token: string) {
  act(() => {
    root.render(<Wrapper show={show} token={token} />)
  })
}

function elemento(): HTMLAudioElement {
  const el = container.querySelector('audio')
  if (!el) throw new Error('no hay <audio> en el DOM')
  return el
}

/** happy-dom deja `duration` de sólo lectura; se sustituye para la prueba. */
function conDuracion(el: HTMLAudioElement, secs: number) {
  Object.defineProperty(el, 'duration', { value: secs, configurable: true })
  Object.defineProperty(el, 'readyState', { value: 1, configurable: true })
}

describe('useAudioPlayer — el <audio> aparece después del primer render', () => {
  it('se engancha cuando el elemento llega tarde y toma la duración', () => {
    render(false, '') // estado «buscando»: todavía no hay <audio>
    expect(result.current?.duration).toBe(0)

    render(true, 'blob:audio-1') // llegaron los bytes

    const el = elemento()
    conDuracion(el, 47.6)
    act(() => {
      el.dispatchEvent(new Event('loadedmetadata'))
    })

    expect(result.current?.duration).toBeCloseTo(47.6)
  })

  it('refleja play y pausa (el botón cambiaba de ícono y no lo hacía)', () => {
    render(false, '')
    render(true, 'blob:audio-1')
    const el = elemento()

    act(() => {
      el.dispatchEvent(new Event('play'))
    })
    expect(result.current?.isPlaying).toBe(true)

    act(() => {
      el.dispatchEvent(new Event('pause'))
    })
    expect(result.current?.isPlaying).toBe(false)
  })

  it('la barra avanza con timeupdate', () => {
    render(false, '')
    render(true, 'blob:audio-1')
    const el = elemento()

    Object.defineProperty(el, 'currentTime', { value: 12.5, configurable: true })
    act(() => {
      el.dispatchEvent(new Event('timeupdate'))
    })

    expect(result.current?.currentTime).toBeCloseTo(12.5)
  })

  it('no se pierde los metadatos que cargaron ANTES de engancharse', () => {
    // `loadedmetadata` no se vuelve a emitir. Si el elemento ya los tenía
    // cuando el efecto corrió, sin la lectura inicial la duración quedaba
    // en 00:00 para siempre.
    render(false, '')
    act(() => {
      root.render(<Wrapper show token="blob:audio-1" />)
    })
    const el = elemento()
    conDuracion(el, 33.2)
    // Se fuerza un re-enganche sin emitir el evento.
    render(true, 'blob:audio-2')

    expect(result.current?.duration).toBeCloseTo(33.2)
  })

  it('sin testigo NO se engancha — es exactamente la regresión', () => {
    // Documenta por qué existe `attachToken`: con el mismo valor, el efecto no
    // vuelve a correr y el elemento tardío queda huérfano.
    render(false, 'fijo')
    render(true, 'fijo')

    const el = elemento()
    conDuracion(el, 47.6)
    act(() => {
      el.dispatchEvent(new Event('loadedmetadata'))
    })

    expect(result.current?.duration).toBe(0)
  })
})
