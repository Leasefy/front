/**
 * @vitest-environment happy-dom
 *
 * NairaSinPermiso — el 403 de Naira sobre FalloDeCarga (D13-3, UI-SPEC §8.2): sin reintentar, sin datos, con la salida
 * que pone la página. FalloDeCarga lee usePermissionsContextSafe() (FalloDeCarga.tsx:109-113): se mockea.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const permisos = vi.hoisted(() => ({ actual: null as null | { isAdmin: boolean } }))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) =>
    React.createElement('a', { href, ...rest }, children),
}))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => permisos.actual,
}))

import { NairaSinPermiso } from './NairaSinPermiso'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const VOLVER = { label: 'Volver a la lista (prueba)', href: '/panel/inmobiliaria/x' }

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  permisos.actual = null
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function montar(): void {
  act(() => {
    root.render(<NairaSinPermiso volverA={VOLVER} />)
  })
}

function esperarCopyGenerica(): void {
  const texto = container.textContent ?? ''
  expect(texto).toContain('No tienes acceso a esto')
  expect(texto).toContain('Pídele a un administrador')
  expect(texto).not.toContain('no es por tus permisos')
}

describe('<NairaSinPermiso>', () => {
  it('[N13:control-positivo] envuelve un FalloDeCarga clasificado como sinPermiso', () => {
    montar()
    const caja = container.querySelector('[data-testid="naira-sin-permiso"]')
    expect(caja).not.toBeNull()
    expect(caja?.querySelector('[data-testid="fallo-de-carga"][data-tipo="sinPermiso"]')).not.toBeNull()
  })

  it('[N13:sin-permiso-copy] dice que no hay acceso, no ofrece reintentar y lleva la salida de la página', () => {
    montar()
    esperarCopyGenerica()
    expect(container.querySelector('[data-testid="reintentar"]')).toBeNull()
    const volver = container.querySelector('a')
    expect(volver?.getAttribute('href')).toBe(VOLVER.href)
    expect(volver?.textContent).toContain(VOLVER.label)
  })

  it('[N13:sin-permiso-admin] el admin del monolito lee el mismo 403 genérico (la variante del admin es de SIN_PERMISO_DE_MODULO)', () => {
    permisos.actual = { isAdmin: true }
    montar()
    esperarCopyGenerica()
    expect(container.querySelector('[data-testid="fallo-de-carga"][data-tipo="sinPermiso"]')).not.toBeNull()
  })
})
