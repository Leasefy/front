/**
 * Integraciones: nada de lo que dice la pantalla puede ser mentira.
 *
 * Tenía tres afirmaciones falsas, las tres con un `setTimeout` haciendo de
 * servidor:
 *
 *   · «Probar conexión» esperaba 1,5 s y SIEMPRE decía «Conexión con X
 *     exitosa». No contactaba nada; no podía fallar.
 *   · «Guardar» esperaba 0,8 s, tiraba la API Key escrita y decía
 *     «Configuración de X guardada». La llave nunca salía del navegador.
 *   · El interruptor avisaba «X activado» ANTES de que el back contestara —el
 *     pedido ni se esperaba— y el aviso salía DOS veces, porque quien hace el
 *     pedido ya avisa.
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

/** Cualquier aviso que el componente quisiera dar queda registrado acá. */
const avisos: Array<{ tipo: string; texto: unknown }> = []
vi.mock('@/components/ui/toast', () => ({
  toast: {
    success: (texto: unknown) => avisos.push({ tipo: 'success', texto }),
    error: (texto: unknown) => avisos.push({ tipo: 'error', texto }),
    info: (texto: unknown) => avisos.push({ tipo: 'info', texto }),
    warning: (texto: unknown) => avisos.push({ tipo: 'warning', texto }),
  },
}))

import { ConfigIntegraciones } from './ConfigIntegraciones'
import type { AgencyIntegration } from '@/lib/types/inmobiliaria'

const INTEGRACION: AgencyIntegration = {
  id: 'i1',
  name: 'Bancolombia',
  description: 'Conciliación del extracto',
  category: 'payments',
  status: 'active',
  isEnabled: true,
  icon: 'Bank',
  apiKeyConfigured: false,
  lastSyncAt: null,
  errorMessage: null,
} as unknown as AgencyIntegration

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  avisos.length = 0
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function render(props: Partial<React.ComponentProps<typeof ConfigIntegraciones>> = {}) {
  await act(async () => {
    root.render(<ConfigIntegraciones integrations={[INTEGRACION]} {...props} />)
  })
}

const porTexto = (t: string) =>
  [...container.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes(t))

describe('ConfigIntegraciones', () => {
  it('🔴 el interruptor NO avisa por su cuenta: el aviso lo da quien hizo el pedido', async () => {
    const onToggle = vi.fn().mockResolvedValue(undefined)
    await render({ onToggle })

    const interruptor = container.querySelector('button[role="switch"]')
    await act(async () => {
      interruptor?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onToggle).toHaveBeenCalledWith('i1', false)
    expect(avisos).toHaveLength(0)
  })

  it('🔴 el interruptor ESPERA al back: no se resuelve antes que el pedido', async () => {
    let resolver: (() => void) | null = null
    const onToggle = vi.fn(() => new Promise<void>((r) => { resolver = r }))
    await render({ onToggle })

    const interruptor = container.querySelector('button[role="switch"]')
    await act(async () => {
      interruptor?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    // Con el pedido en vuelo el interruptor sigue deshabilitado.
    expect(container.querySelector('button[role="switch"]')?.hasAttribute('disabled')).toBe(true)

    await act(async () => {
      resolver?.()
    })
    expect(container.querySelector('button[role="switch"]')?.hasAttribute('disabled')).toBe(false)
  })

  it('🔴 el detalle NO pide una API Key: no hay dónde guardarla', async () => {
    await render()
    await act(async () => {
      porTexto('viewDetail')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.querySelector('input[type="password"]')).toBeNull()
    const textoDelDialogo = document.body.textContent ?? ''
    expect(textoDelDialogo).not.toContain('testConnection')
    expect(textoDelDialogo).toContain('keysNotHere')
  })

  it('🔴 abrir el detalle no afirma nada: cero avisos', async () => {
    await render()
    await act(async () => {
      porTexto('viewDetail')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(avisos).toHaveLength(0)
  })

  it('no repite el título de la sección: el marco de Configuración ya lo pone', async () => {
    await render()
    expect(container.querySelectorAll('h2')).toHaveLength(0)
  })
})
