/**
 * La barra del chat en el celular es el `Sheet` flotante, como todo cajón
 * (DESIGN.md §4). Era el último cajón armado a mano (02-10-2026).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

import { MobileSidebarDrawer } from './MobileSidebarDrawer'

let contenedor: HTMLDivElement
let raiz: Root

beforeEach(() => {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})

afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

function pintar(open: boolean, onClose = vi.fn()) {
  act(() =>
    raiz.render(
      <MobileSidebarDrawer open={open} onClose={onClose}>
        <nav data-testid="barra-del-chat">Conversaciones</nav>
      </MobileSidebarDrawer>,
    ),
  )
  return onClose
}

const cajon = () => document.querySelector<HTMLElement>('[data-testid="cajon-del-chat"]')

describe('<MobileSidebarDrawer>', () => {
  it('cerrado no pinta nada', () => {
    pintar(false)
    expect(cajon()).toBeNull()
  })

  it('🔴 abierto es el Sheet flotante: diálogo con nombre, a la izquierda y lateral en el celular', () => {
    pintar(true)
    const el = cajon()!
    expect(el.getAttribute('role')).toBe('dialog')
    expect(el.getAttribute('data-sheet-side')).toBe('left')
    expect(el.getAttribute('data-sheet-placement')).toBe('left-side')
    expect(el.className).toContain('z-[300]')
    const titulo = document.getElementById(el.getAttribute('aria-labelledby') ?? '')
    expect(titulo?.textContent).toBe('beta.a11y.sidebarNav')
    expect(el.querySelector('[data-testid="barra-del-chat"]')).not.toBeNull()
  })

  it('la ✕ es la del producto, una sola, y cierra', () => {
    const onClose = pintar(true)
    const aspas = cajon()!.querySelectorAll<HTMLButtonElement>('[aria-label="beta.mobile.closeMenu"]')
    expect(aspas).toHaveLength(1)
    expect(aspas[0].className).toContain('rounded-full')
    act(() => aspas[0].click())
    expect(onClose).toHaveBeenCalled()
  })

  it('Esc cierra', () => {
    const onClose = pintar(true)
    act(() => {
      cajon()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('ya no arma el cajón a mano (velo + panel fijo, Esc y bloqueo del scroll propios)', () => {
    const fuente = readFileSync(join(process.cwd(), 'src/components/beta/MobileSidebarDrawer.tsx'), 'utf8')
    expect(fuente).not.toMatch(/fixed inset-y-0|addEventListener\('keydown'|body\.style\.overflow/)
    expect(fuente).toContain('<SheetContent')
  })
})
