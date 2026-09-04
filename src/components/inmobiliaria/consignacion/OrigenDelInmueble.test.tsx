/**
 * La pregunta que abre «Nueva consignación»: nuevo o existente. Y no ofrece
 * «uno que ya tengo» cuando no hay ninguno sin propietario.
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
  }),
}))

import { OrigenDelInmueble, origenInicial } from './OrigenDelInmueble'

let container: HTMLDivElement
let root: Root
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function montar(props: Partial<React.ComponentProps<typeof OrigenDelInmueble>> = {}) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const onNuevo = vi.fn()
  const onExistente = vi.fn()
  act(() => {
    root.render(
      <OrigenDelInmueble disponibles={5} onNuevo={onNuevo} onExistente={onExistente} {...props} />,
    )
  })
  return { onNuevo, onExistente }
}

const nuevo = () => container.querySelector<HTMLButtonElement>('[data-testid="origen-nuevo"]')!
const existente = () => container.querySelector<HTMLButtonElement>('[data-testid="origen-existente"]')!

describe('<OrigenDelInmueble>', () => {
  it('ofrece los dos caminos y avisa cuántos hay sin propietario', () => {
    const { onNuevo, onExistente } = montar()
    expect(existente().textContent).toContain('5')
    expect(existente().disabled).toBe(false)
    act(() => nuevo().click())
    act(() => existente().click())
    expect(onNuevo).toHaveBeenCalledTimes(1)
    expect(onExistente).toHaveBeenCalledTimes(1)
  })

  it('sin inmuebles sin propietario, «uno que ya tengo» no se puede elegir', () => {
    const { onExistente } = montar({ disponibles: 0 })
    expect(existente().disabled).toBe(true)
    expect(existente().textContent).toContain('ninguno')
    act(() => existente().click())
    expect(onExistente).not.toHaveBeenCalled()
  })

  it('mientras cuenta no dice «ninguno» ni bloquea por un dato que no llegó', () => {
    montar({ disponibles: 0, cargando: true })
    expect(existente().disabled).toBe(false)
    expect(existente().textContent).toContain('contando')
  })

  it('«un inmueble nuevo» siempre se puede', () => {
    montar({ disponibles: 0 })
    expect(nuevo().disabled).toBe(false)
  })
})

describe('origenInicial — cuándo se pregunta y cuándo no', () => {
  it('🔴 desde «Nueva consignación» NO se pregunta: va derecho al flujo completo', () => {
    // El botón del portafolio, la barra lateral, el buscador y el panel de
    // inicio entran sin `propietarioId`. Nico (2026-09-03): «desde el nueva
    // consignación de inmuebles siempre es el flujo de nueva consignación».
    expect(origenInicial({ origenEnLaUrl: null, propietarioId: undefined })).toBe('nuevo')
  })

  it('asignando a un propietario concreto SÍ se pregunta', () => {
    // Se llega desde su ficha: ahí ofrecer los del portafolio sin dueño ahorra
    // volver a cargar un inmueble que ya existe.
    expect(origenInicial({ origenEnLaUrl: null, propietarioId: 'p-1' })).toBeNull()
  })

  it('`?origen=` manda sobre todo, con propietario y sin él', () => {
    expect(origenInicial({ origenEnLaUrl: 'existente', propietarioId: undefined })).toBe('existente')
    expect(origenInicial({ origenEnLaUrl: 'nuevo', propietarioId: 'p-1' })).toBe('nuevo')
  })

  it('un `?origen=` que no existe se ignora, no rompe la pantalla', () => {
    expect(origenInicial({ origenEnLaUrl: 'cualquiera', propietarioId: undefined })).toBe('nuevo')
    expect(origenInicial({ origenEnLaUrl: '', propietarioId: 'p-1' })).toBeNull()
  })
})
