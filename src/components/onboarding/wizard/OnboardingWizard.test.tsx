/**
 * El marco compartido de los asistentes de registro: los pasos se leen como
 * progreso (y los visitables son botones), el título del paso no va en
 * negrita y recibe el foco al cambiar de paso.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { OnboardingStepList, type PasoDeLaLista } from './OnboardingStepList'
import { OnboardingStepTitle } from './OnboardingStepTitle'
import { OnboardingWizardLayout } from './OnboardingWizardLayout'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function render(ui: React.ReactNode) {
  await act(async () => {
    root.render(ui)
  })
}

describe('<OnboardingStepList>', () => {
  it('lo hecho con destino es un botón; el paso actual y lo pendiente, no', async () => {
    const irAUno = vi.fn()
    const pasos: PasoDeLaLista[] = [
      { key: 'uno', label: 'Uno', estado: 'hecho', onSelect: irAUno, testId: 'p-uno', testIdDelBoton: 'b-uno' },
      { key: 'dos', label: 'Dos', estado: 'actual', testId: 'p-dos' },
      { key: 'tres', label: 'Tres', estado: 'pendiente', testId: 'p-tres' },
    ]
    await render(<OnboardingStepList pasos={pasos} etiqueta="Pasos" nota="Se guarda solo" />)

    expect(container.querySelector('ol')?.getAttribute('aria-label')).toBe('Pasos')
    expect(container.querySelectorAll('button')).toHaveLength(1)
    const boton = container.querySelector('[data-testid="b-uno"]') as HTMLButtonElement
    expect(boton.getAttribute('aria-label')).toBe('Ir a Uno')
    expect(container.querySelector('[data-testid="p-dos"]')?.getAttribute('aria-current')).toBe('step')
    expect(container.querySelector('[data-testid="p-tres"]')?.getAttribute('aria-current')).toBeNull()
    // Los nombres existen siempre (en teléfono, para el lector de pantalla).
    expect(container.textContent).toContain('Tres')
    expect(container.textContent).toContain('Se guarda solo')

    await act(async () => boton.click())
    expect(irAUno).toHaveBeenCalledTimes(1)
  })
})

describe('<OnboardingStepTitle>', () => {
  it('el título no va en negrita y recibe el foco sólo al cambiar de paso', async () => {
    await render(<OnboardingStepTitle pasoId="1" rotulo="Paso 1 de 2" titulo="Cuéntanos sobre ti" />)
    const h1 = container.querySelector('h1') as HTMLHeadingElement
    expect(h1.className).toContain('font-medium')
    expect(h1.className).not.toMatch(/font-(semibold|bold)/)
    expect(document.activeElement).not.toBe(h1)

    await render(<OnboardingStepTitle pasoId="2" rotulo="Paso 2 de 2" titulo="Tu hogar ideal" />)
    expect(document.activeElement).toBe(container.querySelector('h1'))
    expect(container.textContent).toContain('Paso 2 de 2')
  })
})

describe('<OnboardingWizardLayout>', () => {
  it('pinta los pasos, el contenido en su tarjeta y la columna informativa, en ese orden', async () => {
    await render(
      <OnboardingWizardLayout
        pasos={<div data-testid="pasos" />}
        informacion={<div data-testid="info" />}
        accionesDeCabecera={<button type="button">Salir</button>}
      >
        <div data-testid="contenido" />
      </OnboardingWizardLayout>,
    )
    const grilla = container.querySelector('[data-testid="asistente-de-registro"]') as HTMLElement
    const orden = Array.from(grilla.querySelectorAll('[data-testid]')).map((el) => el.getAttribute('data-testid'))
    expect(orden).toEqual(['pasos', 'contenido', 'info'])
    expect(container.querySelector('aside')?.getAttribute('aria-label')).toBe('Información del paso')
    expect(container.textContent).toContain('Salir')
  })
})
