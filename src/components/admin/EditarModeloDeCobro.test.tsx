/**
 * 🔴 El modelo de cobro del SaaS lo cambia SÓLO Leasefy, desde /admin (Nico,
 * 04-10-2026). El editor manda sólo lo que cambió, con los porcentajes como
 * FRACCIÓN (como los guarda la política), pide confirmar diciendo a qué queda,
 * y dice lo que respondió el back.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { adminApi } = vi.hoisted(() => ({ adminApi: vi.fn() }))
vi.mock('@/lib/admin/api', () => ({ adminApi, ApiError: class extends Error {} }))

import { EditarModeloDeCobro, type ModeloActual } from './EditarModeloDeCobro'

const ACTUAL: ModeloActual = {
  tenant_id: '54d558b4-0ab9-445b-aa87-bfd7f53e1f34',
  legal_name: 'Inmobiliaria del Lab',
  billing_model: 'performance',
  success_fee_pct: '0.0800',
  hybrid_pct: '0.0500',
  monthly_min: '200000',
  per_deudor: '6000',
  base_fee: '0',
}

let host: HTMLDivElement
let root: Root
const onGuardado = vi.fn()
const onCerrar = vi.fn()

beforeEach(() => {
  adminApi.mockReset()
  onGuardado.mockReset()
  onCerrar.mockReset()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root.render(<EditarModeloDeCobro actual={ACTUAL} onCerrar={onCerrar} onGuardado={onGuardado} />)
  })
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function escribir(id: string, valor: string) {
  const input = host.querySelector<HTMLInputElement>(`#${id}`)!
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

const boton = (texto: string) =>
  Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes(texto)) as HTMLButtonElement

describe('EditarModeloDeCobro', () => {
  it('muestra la comisión de éxito en % (8 %, no 0,08)', () => {
    expect(host.querySelector<HTMLInputElement>('#modelo-exito')!.value).toBe('8')
  })

  it('sin cambios no deja revisar', () => {
    expect(boton('Revisar el cambio').disabled).toBe(true)
  })

  it('cambia la comisión: confirma diciendo a qué queda y manda SÓLO eso, como fracción', async () => {
    adminApi.mockResolvedValue({ ...ACTUAL, success_fee_pct: '0.0600' })
    escribir('modelo-exito', '6')
    act(() => boton('Revisar el cambio').click())

    expect(host.querySelector('[data-testid="resumen-del-cambio"]')?.textContent).toContain(
      '6 % de comisión de éxito',
    )
    expect(adminApi).not.toHaveBeenCalled()

    await act(async () => {
      boton('Confirmar el cambio').click()
      await Promise.resolve()
    })

    expect(adminApi).toHaveBeenCalledWith(`/pricing-config/${ACTUAL.tenant_id}`, {
      method: 'PATCH',
      body: { successFeePct: 0.06 },
    })
    expect(onGuardado).toHaveBeenCalled()
  })

  it('un porcentaje fuera de 0–50 no se manda', () => {
    escribir('modelo-exito', '80')
    expect(host.textContent).toContain('Los porcentajes van de 0 % a 50 %.')
    expect(boton('Revisar el cambio').disabled).toBe(true)
  })

  it('si el back no lo guarda, lo dice y no cierra', async () => {
    adminApi.mockRejectedValue(new Error('no'))
    escribir('modelo-minimo', '250000')
    act(() => boton('Revisar el cambio').click())
    await act(async () => {
      boton('Confirmar el cambio').click()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(host.querySelector('[role="alert"]')?.textContent).toBeTruthy()
    expect(onGuardado).not.toHaveBeenCalled()
  })
})
