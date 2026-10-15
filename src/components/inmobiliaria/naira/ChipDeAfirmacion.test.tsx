/**
 * @vitest-environment happy-dom
 *
 * ChipDeAfirmacion — la clase sale del CAMPO, nunca del texto de al lado (D13-10, FG13-11, UI-SPEC §6.4). Popover plano
 * con `span`: el chip vive dentro de un `<p>` y un `div` ahí sería anidado inválido.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <span data-testid="popover">{children}</span>,
}))

import type { ClaseDeAfirmacion } from '@/lib/naira/afirmaciones'

import { ChipDeAfirmacion } from './ChipDeAfirmacion'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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

function montar(nodo: React.ReactNode): void {
  act(() => {
    root.render(nodo)
  })
}

const boton = () => container.querySelector('button')
const popover = () => container.querySelector('[data-testid="popover"]')

describe('<ChipDeAfirmacion>', () => {
  it('[N13:control-positivo] asociación: botón con su rótulo, su clase y un nombre que contiene el rótulo', () => {
    montar(<ChipDeAfirmacion claimClass="asociacion" />)
    expect(boton()?.textContent).toBe('ASOCIACIÓN')
    expect(boton()?.getAttribute('data-claim-class')).toBe('asociacion')
    expect(boton()?.getAttribute('aria-label')).toContain('ASOCIACIÓN')
    expect(popover()?.textContent).toContain('Dos datos se mueven juntos')
  })

  it('[N13:claimclass-del-contrato] cada clase pinta SU rótulo y SU explicación, diga lo que diga el texto de al lado', () => {
    const casos: [ClaseDeAfirmacion, string, string][] = [
      ['aritmetica', 'ARITMÉTICA', 'Sale de sumar'],
      ['asociacion', 'ASOCIACIÓN', 'Dos datos se mueven juntos'],
      ['hipotesis', 'HIPÓTESIS', 'Una explicación posible'],
    ]
    for (const [clase, rotulo, explicacion] of casos) {
      montar(<ChipDeAfirmacion claimClass={clase} />)
      expect(boton()?.textContent, clase).toBe(rotulo)
      expect(boton()?.getAttribute('data-claim-class'), clase).toBe(clase)
      expect(popover()?.textContent, clase).toContain(explicacion)
    }

    montar(
      <p>
        probablemente subió porque bajó (ejemplo)
        <ChipDeAfirmacion claimClass="aritmetica" />
      </p>,
    )
    expect(boton()?.textContent).toBe('ARITMÉTICA')
    expect(container.textContent).not.toContain('HIPÓTESIS')
  })

  it('[N13:chip-sin-acento] el rótulo va en mono (text-overline) y el botón no usa el cobalto', () => {
    montar(<ChipDeAfirmacion claimClass="hipotesis" />)
    const rotulo = boton()?.querySelector('span')
    expect((rotulo?.getAttribute('class') ?? '').split(/\s+/)).toContain('text-overline')
    const clases = (boton()?.getAttribute('class') ?? '').split(/\s+/)
    expect(clases).not.toContain('bg-primary')
    expect(clases).not.toContain('text-primary')
    expect(clases).not.toContain('text-xs')
  })
})
