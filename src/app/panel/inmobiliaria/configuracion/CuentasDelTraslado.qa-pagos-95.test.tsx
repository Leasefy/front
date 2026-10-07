/**
 * E-03 (QA-PAGOS-95 r2): el traslado de la comisión pedía «decir cuál cuenta del
 * PUC es la de recaudo y cuál la propia, en la configuración de tesorería» y no
 * había pantalla. Ésta la lee y la guarda.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => ({ configuracion: vi.fn(), guardarConfiguracion: vi.fn(), toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/api/tesoreria.service', () => ({ tesoreriaApi: { configuracion: h.configuracion, guardarConfiguracion: h.guardarConfiguracion } }))
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }))
vi.mock('@/components/contabilidad/use-cuentas', () => ({
  useCuentas: () => ({ cuentas: [], cargando: false, error: null, recargar: vi.fn() }),
}))
vi.mock('@/components/contabilidad/use-puede-escribir', () => ({ usePuedeEscribir: () => ({ puede: true, motivo: null }) }))
vi.mock('@/components/contabilidad/SelectorDeCuenta', () => ({
  SelectorDeCuenta: ({ value, onChange, disabled }: { value: string; onChange: (id: string) => void; disabled?: boolean }) => (
    <select data-testid="selector" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      <option value="cta-1110">111005 Bancos recaudo</option>
      <option value="cta-1120">112005 Bancos propia</option>
    </select>
  ),
}))

import { CuentasDelTraslado } from './CuentasDelTraslado'

const CONFIG = {
  disponible: true,
  motivo: null,
  cuentaPucRecaudoId: null,
  cuentaPucPropiaId: null,
  cuentaDeRecaudo: null,
  cuentaPropia: null,
  trasladarIvaDeLaComision: true,
  trasladarIntereses: false,
  trasladarGastosDeCobranza: false,
}

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  h.configuracion.mockReset().mockResolvedValue(CONFIG)
  h.guardarConfiguracion.mockReset().mockImplementation(async (c: object) => ({ ...CONFIG, ...c }))
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function montar() {
  await act(async () => {
    root.render(<CuentasDelTraslado />)
  })
  await act(async () => {})
}

describe('E-03 · las cuentas del traslado de la comisión', () => {
  it('🔴 se pueden elegir la cuenta de recaudo y la propia (antes no había pantalla)', async () => {
    await montar()
    expect(h.configuracion).toHaveBeenCalled()
    const [recaudo, propia] = Array.from(container.querySelectorAll('[data-testid="selector"]')) as HTMLSelectElement[]
    await act(async () => {
      recaudo.value = 'cta-1110'
      recaudo.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(h.guardarConfiguracion).toHaveBeenCalledWith({ cuentaPucRecaudoId: 'cta-1110' })
    await act(async () => {
      propia.value = 'cta-1120'
      propia.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(h.guardarConfiguracion).toHaveBeenCalledWith({ cuentaPucPropiaId: 'cta-1120' })
  })

  it('sin la migración del traslado lo dice y no deja guardar', async () => {
    h.configuracion.mockResolvedValue({ ...CONFIG, disponible: false, motivo: 'Falta la migración del traslado.' })
    await montar()
    expect(container.querySelector('[data-testid="traslado-sin-migracion"]')?.textContent).toContain('Falta la migración')
    for (const s of Array.from(container.querySelectorAll('[data-testid="selector"]')) as HTMLSelectElement[]) expect(s.disabled).toBe(true)
  })
})
