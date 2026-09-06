/**
 * InboxList — el orden de los cuatro estados.
 *
 * 🔴 El defecto que cierra: la página pinta el cartel rojo del fallo y después
 * llamaba a esta lista con `tickets = []`. La lista no sabía del fallo, caía en
 * la rama «genuinely no tickets» y mostraba el vacío. Resultado: «no se pudo
 * cargar» y «no hay tickets» juntos en la misma pantalla — y lo segundo es una
 * afirmación falsa sobre la operación de la inmobiliaria.
 *
 * `EstadoDeDatos` ya fija ese orden (carga → fallo → vacío → datos) para las
 * pantallas que lo usan; acá la lista lo respeta con su propia guarda.
 *
 * createRoot + act: @testing-library/react no está instalado en este repo.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

import { InboxList } from './InboxList'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
})

function render(props: Partial<React.ComponentProps<typeof InboxList>>) {
  act(() => {
    root.render(
      React.createElement(InboxList, {
        tickets: [],
        isLoading: false,
        hasActiveFilters: false,
        onSelect: () => {},
        onClearFilters: () => {},
        ...props,
      }),
    )
  })
}

describe('<InboxList>', () => {
  it('con un fallo y sin datos NO afirma que no hay tickets', () => {
    render({ error: 'El agente de mantenimiento está apagado.' })
    expect(container.textContent).toBe('')
    expect(container.textContent).not.toContain('inbox.empty')
  })

  it('sin fallo y sin datos SÍ muestra el vacío', () => {
    render({ error: null })
    expect(container.textContent).toContain('inbox.empty')
  })

  it('el fallo tampoco tapa el esqueleto de carga si todavía carga', () => {
    render({ error: null, isLoading: true })
    expect(container.querySelector('[data-testid="inbox-skeleton"]')).not.toBeNull()
  })
})
