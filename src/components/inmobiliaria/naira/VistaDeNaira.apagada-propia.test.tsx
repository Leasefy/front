/**
 * @vitest-environment happy-dom
 *
 * VistaDeNaira — la prop opcional `apagada` que AGREGA 13-06 (Tarea 2, P4).
 *
 * El 404 de la conversación es "Naira O su sub-flag apagados" (9.5-06, E13-7): la copy de NairaApagada sería falsa si solo
 * está apagado el sub-flag, así que una vista puede pasar su propia `apagada`. Sin la prop, lo de 13-02 no cambia; la prop
 * solo se ve en el estado `apagada`. Arnés del VistaDeNaira.test.tsx de 13-02 (que no se toca). Marcador [N13:*] en el
 * TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) =>
    React.createElement('a', { href, ...rest }, children),
}))

import type { LecturaDeNaira } from '@/lib/hooks/naira/use-lectura-de-naira'

import { VistaDeNaira } from './VistaDeNaira'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

interface Datos {
  readonly token: string
}

const VOLVER = { label: 'Volver al panel (prueba)', href: '/sonda/volver' }
const TOKEN = 'TOKEN-DEL-OK'
const SONDA = <p data-testid="apagada-sonda">APAGADA-SONDA</p>

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function montar(estado: LecturaDeNaira<Datos>, conApagada: boolean) {
  act(() => {
    root.render(
      <VistaDeNaira<Datos>
        nombre="preguntar"
        estado={estado}
        queEs="la sonda"
        volverA={VOLVER}
        apagada={conApagada ? SONDA : undefined}
        renderOk={(data) => <p>{data.token}</p>}
      />,
    )
  })
}

const raiz = () => container.querySelector('[data-naira-vista]')

describe('VistaDeNaira · apagada propia', () => {
  it('[N13:control-positivo] con ok se pinta lo de renderOk y no la apagada propia', () => {
    montar({ kind: 'ok', data: { token: TOKEN }, origen: 'agente' }, true)
    expect(container.textContent).toContain(TOKEN)
    expect(container.textContent).not.toContain('APAGADA-SONDA')
    expect(container.querySelector('[data-testid="apagada-sonda"]')).toBeNull()
  })

  it('[N13:apagada-propia] con apagada y la prop se pinta la propia y no la de Naira', () => {
    montar({ kind: 'apagada' }, true)
    expect(container.querySelector('[data-testid="apagada-sonda"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="naira-apagada"]')).toBeNull()
    expect(raiz()?.getAttribute('data-naira-vista')).toBe('preguntar')
    expect(raiz()?.getAttribute('data-naira-estado')).toBe('apagada')
  })

  it('[N13:apagada-por-defecto] sin la prop, apagada sigue siendo la de Naira', () => {
    montar({ kind: 'apagada' }, false)
    expect(container.querySelector('[data-testid="naira-apagada"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="apagada-sonda"]')).toBeNull()
  })

  it('[N13:apagada-solo-en-apagada] con la prop y sin permiso se pinta el cartel de acceso, no la apagada propia', () => {
    montar({ kind: 'sin_permiso' }, true)
    expect(container.querySelector('[data-testid="naira-sin-permiso"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="apagada-sonda"]')).toBeNull()
  })
})
