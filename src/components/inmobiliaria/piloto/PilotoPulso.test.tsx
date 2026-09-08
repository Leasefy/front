/**
 * T-0076: antes, `error` en el pulso hacía `return null` — la torre de
 * control perdía en silencio la sección «qué pasa ahora», indistinguible de
 * un endpoint que nunca existió (`notAvailable`). Con un 429 del gateway
 * (`agents_limit`), eso era exactamente un panel que se apaga solo, sin
 * ningún indicio de que algo falló ni forma de reintentar. Ahora un error
 * real se pinta como tal, con retry — mismo contrato que `FalloDeCarga`
 * (`EstadoDeDatos.test.tsx` es el precedente de este patrón de prueba).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { PilotoPulso } from './PilotoPulso'
import type { PulsoResponse } from '@/lib/api/piloto'

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, string>) =>
      vars ? `${k}(${Object.values(vars).join(',')})` : k,
    locale: 'es',
  }),
}))

const DATA_OK: PulsoResponse = {
  estado: 'ok',
  titular: 'Todo tranquilo.',
  enCurso: [],
  alertas: [],
  hoy: { llamadas: 0, conversacionesActivas: 0, decisionesResueltas: 0 },
}

describe('PilotoPulso — 429 / error visible (T-0076)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const render = (el: React.ReactElement) => act(() => root.render(el))

  it('con error, muestra un cartel de fallo visible en vez de desaparecer', () => {
    render(
      <PilotoPulso
        data={null}
        isLoading={false}
        error="429"
        notAvailable={false}
        onRefetch={vi.fn()}
      />,
    )
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull()
  })

  it('el botón de reintentar llama a onRefetch', () => {
    const onRefetch = vi.fn()
    render(
      <PilotoPulso
        data={null}
        isLoading={false}
        error="429"
        notAvailable={false}
        onRefetch={onRefetch}
      />,
    )
    const boton = container.querySelector('[data-testid="reintentar"]') as HTMLButtonElement
    expect(boton).not.toBeNull()
    act(() => boton.click())
    expect(onRefetch).toHaveBeenCalledTimes(1)
  })

  it('sin error y con notAvailable, sigue sin pintar nada (el endpoint no existe todavía)', () => {
    render(
      <PilotoPulso
        data={null}
        isLoading={false}
        error={null}
        notAvailable
        onRefetch={vi.fn()}
      />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('con datos buenos, pinta el tablero como siempre — sin cartel de fallo', () => {
    render(
      <PilotoPulso
        data={DATA_OK}
        isLoading={false}
        error={null}
        notAvailable={false}
        onRefetch={vi.fn()}
      />,
    )
    expect(container.textContent).toContain('Todo tranquilo.')
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).toBeNull()
  })
})
