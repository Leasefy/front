/**
 * La explicación de la primera vez de cada flujo de «Nuevo» — A «Héroe», la
 * que eligió Nico (05-10-2026). Montada de verdad (el Dialog del DS):
 *   · se anuncia con el título del flujo y pinta TODOS los pasos de su
 *     asistente, con su ícono, y lo de «Antes de empezar»;
 *   · el medallón lleva el ícono del flujo, con su tamaño;
 *   · «Antes de empezar» se puede marcar y NO frena «Empezar»;
 *   · «Esto se muestra una sola vez»;
 *   · «Empezar», «Ahora no» y Esc hacen lo de siempre;
 *   · el avalúo avisa que se abre en otra pestaña;
 *   · el foco arranca en «Empezar» y vuelve a quien la abrió.
 * Y los textos: nada de lo que el texto viejo prometía y el código no hace.
 */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import es from '@/lib/i18n/locales/es.json'
import { FLUJOS, flujoIntro, type FlujoKey, type FlujoNuevo } from '@/lib/inmobiliaria/flujos'

import { INTROS, IntroHeroe } from './index'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  document.body.innerHTML = ''
})

const flujo = (k: FlujoKey) => FLUJOS.find((f) => f.key === k) as FlujoNuevo
const texto = (clave: string) =>
  clave.split('.').reduce<unknown>((a, p) => (a as Record<string, unknown> | undefined)?.[p], es) as string

function montar(k: FlujoKey, onCancelar = vi.fn(), onEmpezar = vi.fn()) {
  act(() => root.render(<IntroHeroe flujo={flujo(k)} onCancelar={onCancelar} onEmpezar={onEmpezar} />))
  return { onCancelar, onEmpezar }
}

const dialogo = () => document.querySelector<HTMLElement>('[role="dialog"]')
const boton = (re: RegExp) =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find((b) => re.test(b.textContent ?? ''))

describe('A «Héroe»', () => {
  it.each(['consignacion', 'avaluo', 'asegurabilidad', 'contrato'] as const)(
    '%s: se anuncia con su título, con el ícono en el medallón, todos sus pasos y lo de antes',
    (k) => {
      montar(k)
      const d = dialogo()!
      const claves = flujoIntro(k)
      expect(document.getElementById(d.getAttribute('aria-labelledby') ?? '')?.textContent).toBe(texto(claves.titulo))
      expect(d.getAttribute('data-testid')).toBe('intro-heroe')
      const icono = d.querySelector('[data-medallon-del-flujo] svg')
      expect(Number(icono?.getAttribute('width'))).toBeGreaterThan(16)
      expect(d.querySelectorAll('[data-paso]').length).toBe(INTROS[k].pasos.length)
      INTROS[k].pasos.forEach((_, i) => expect(d.textContent).toContain(texto(claves.paso(i + 1).titulo)))
      expect(d.querySelectorAll('[data-testid="intro-chequeo"]').length).toBe(INTROS[k].antes)
      expect(d.querySelector('[data-testid="intro-una-sola-vez"]')?.textContent).toBe('Esto se muestra una sola vez.')
      expect(d.textContent).not.toMatch(/inmobiliaria\.nuevo/)
    },
  )

  it('la lista de chequeo se marca y no frena «Empezar»', () => {
    const { onEmpezar } = montar('consignacion')
    const casillas = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-testid="intro-chequeo"]'))
    expect(casillas[0].getAttribute('aria-checked')).toBe('false')
    act(() => casillas[0].click())
    expect(casillas[0].getAttribute('aria-checked')).toBe('true')
    act(() => document.querySelector<HTMLButtonElement>('[data-testid="intro-empezar"]')!.click())
    expect(onEmpezar).toHaveBeenCalledTimes(1)
  })

  it('«Ahora no» y Esc cancelan', () => {
    const { onCancelar } = montar('consignacion')
    act(() => boton(/^Ahora no$/)!.click())
    expect(onCancelar).toHaveBeenCalledTimes(1)
    act(() => {
      dialogo()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onCancelar).toHaveBeenCalledTimes(2)
  })

  it('el avalúo avisa que se abre en otra pestaña', () => {
    montar('avaluo')
    expect(document.querySelector('[data-testid="intro-empezar"] [aria-label="Se abre en otra pestaña"]')).not.toBeNull()
  })

  it('el foco arranca en «Empezar» y al cerrar vuelve a quien la abrió', async () => {
    function Banco() {
      const [abierto, setAbierto] = React.useState(false)
      return (
        <>
          <button type="button" data-testid="abridor" onClick={() => setAbierto(true)}>
            Nuevo
          </button>
          <IntroHeroe flujo={abierto ? flujo('consignacion') : null} onCancelar={() => setAbierto(false)} onEmpezar={() => setAbierto(false)} />
        </>
      )
    }
    act(() => root.render(<Banco />))
    const abridor = document.querySelector<HTMLButtonElement>('[data-testid="abridor"]')!
    abridor.focus()
    act(() => abridor.click())
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })
    expect(document.activeElement?.getAttribute('data-testid')).toBe('intro-empezar')
    act(() => {
      dialogo()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80))
    })
    expect(document.activeElement).toBe(abridor)
  })
})

describe('el foco, abierta desde un menú', () => {
  it('al cerrar vuelve al botón que abre el menú (el ítem ya no existe)', async () => {
    function Banco() {
      const [abierto, setAbierto] = React.useState(false)
      const [menu, setMenu] = React.useState(true)
      return (
        <>
          <button type="button" data-testid="caret" aria-controls="menu-de-nuevo">
            Más
          </button>
          {menu && (
            <div role="menu" id="menu-de-nuevo">
              <button
                type="button"
                role="menuitem"
                data-testid="item"
                onClick={() => {
                  setAbierto(true)
                  // El menú de Radix se va después (anima su salida): el ítem todavía está al abrir.
                  setTimeout(() => setMenu(false), 10)
                }}
              >
                Nuevo avalúo
              </button>
            </div>
          )}
          <IntroHeroe flujo={abierto ? flujo('avaluo') : null} onCancelar={() => setAbierto(false)} onEmpezar={() => setAbierto(false)} />
        </>
      )
    }
    act(() => root.render(<Banco />))
    const item = document.querySelector<HTMLButtonElement>('[data-testid="item"]')!
    item.focus()
    act(() => item.click())
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })
    act(() => {
      dialogo()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80))
    })
    expect(document.activeElement?.getAttribute('data-testid')).toBe('caret')
  })
})

describe('los textos dicen la verdad', () => {
  const todo = (k: FlujoKey) => {
    const c = flujoIntro(k)
    return [
      c.titulo,
      c.resumen,
      ...INTROS[k].pasos.flatMap((_, i) => [c.paso(i + 1).titulo, c.paso(i + 1).texto]),
      ...Array.from({ length: INTROS[k].antes }, (_, i) => c.antes(i + 1)),
    ]
      .map(texto)
      .join(' ')
  }

  it('el avalúo no pide la matrícula como obligatoria ni un «para qué» que el asistente no tiene', () => {
    expect(todo('avaluo')).not.toMatch(/para qué lo necesitas/i)
    expect(todo('avaluo')).toMatch(/matrícula y las fotos ayudan, pero son opcionales/)
  })

  it('la asegurabilidad no promete elegir aseguradoras ni el máximo afianzable', () => {
    expect(todo('asegurabilidad')).not.toMatch(/eliges a qué aseguradoras|te quedas con la mejor|máximo afianzable/i)
  })

  it('el contrato se puede armar a mano y no habla de una «garantía» que no existe', () => {
    expect(todo('contrato')).toMatch(/a mano/)
    expect(todo('contrato')).not.toMatch(/garantía/i)
  })
})
