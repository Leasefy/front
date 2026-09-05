/**
 * Permisos por rol: si la matriz no se pudo LEER, no se puede EDITAR.
 *
 * El fallo de la lectura se tragaba con un `catch {}` («quedan los valores por
 * defecto») y la pantalla dibujaba la matriz de fábrica como si fuera la de la
 * agencia. No era sólo una mentira visual: el admin tocaba una casilla,
 * guardaba, y el `PUT` mandaba los valores POR DEFECTO — borrando lo que la
 * agencia hubiera personalizado, sin que nadie lo hubiera pedido.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k.split('.').pop() as string, locale: 'es' }),
}))

vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ refetch: vi.fn() }),
}))

const getRolePermissions = vi.fn()
const updateRolePermissions = vi.fn()
const resetRolePermissions = vi.fn()
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  rolePermissionsApi: {
    getRolePermissions: (...a: unknown[]) => getRolePermissions(...a),
    updateRolePermissions: (...a: unknown[]) => updateRolePermissions(...a),
    resetRolePermissions: (...a: unknown[]) => resetRolePermissions(...a),
  },
}))

/** La matriz editable, reducida a una marca que el test puede buscar. */
vi.mock('@/components/inmobiliaria', () => ({
  ConfigPermisos: () => <div data-testid="matriz-editable" />,
}))

import { SeccionPermisos } from './SeccionPermisos'

const MATRIZ_DEL_SERVIDOR = {
  roles: {
    ADMIN: { portafolio: ['view'] },
    AGENTE: { portafolio: ['view'] },
    CONTADOR: { cobros: ['view'] },
    VIEWER: {},
  },
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  getRolePermissions.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function render() {
  await act(async () => {
    root.render(<SeccionPermisos />)
  })
}

const matriz = () => container.querySelector('[data-testid="matriz-editable"]')

describe('sección Permisos', () => {
  it('con la matriz leída, la dibuja para editar', async () => {
    getRolePermissions.mockResolvedValue(MATRIZ_DEL_SERVIDOR)
    await render()
    expect(matriz()).not.toBeNull()
  })

  it('🔴 si la lectura falla, NO dibuja la matriz: editar sobre los valores por defecto los guardaría', async () => {
    getRolePermissions.mockRejectedValue(new Error('red caída'))
    await render()
    expect(matriz()).toBeNull()
  })

  it('cuando la lectura falla, lo dice y ofrece reintentar', async () => {
    getRolePermissions.mockRejectedValue(new Error('red caída'))
    await render()
    const texto = container.textContent ?? ''
    expect(texto.length).toBeGreaterThan(0)
    const botones = [...container.querySelectorAll('button')]
    expect(botones.length).toBeGreaterThan(0)
  })

  it('reintentar vuelve a pedirla, y con la respuesta buena aparece la matriz', async () => {
    getRolePermissions.mockRejectedValueOnce(new Error('red caída'))
    await render()
    expect(matriz()).toBeNull()

    getRolePermissions.mockResolvedValueOnce(MATRIZ_DEL_SERVIDOR)
    const reintentar = [...container.querySelectorAll('button')][0]
    await act(async () => {
      reintentar?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(getRolePermissions).toHaveBeenCalledTimes(2)
    expect(matriz()).not.toBeNull()
  })
})
