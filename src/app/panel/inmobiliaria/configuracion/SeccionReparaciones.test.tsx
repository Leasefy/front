/**
 * Configuración → Reparaciones: el TOPE DEL MES de una reparación diferida (Nico, 28-10-2026: «que le dé la sugerencia
 * a cuántos meses… tener en cuenta el valor del canon»; el tope, «configurable»). Lo que fija:
 *   - se ve el que rige (el de la inmobiliaria o el sugerido) y se guarda sólo si cambió, con coma o punto;
 *   - vacío vuelve al sugerido (`null`), y un valor que no sirve no se manda;
 *   - sin la actualización de la base lo dice y no deja cambiarlo;
 *   - un back anterior (sin el tope) no pinta la parte.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { ConfiguracionDeReparaciones } from '@/lib/types/deducciones'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => ({
  canAccess: vi.fn((_m: string, _a: string) => true),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  api: { configuracion: vi.fn(), guardarConfiguracion: vi.fn() },
}))
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => ({ canAccess: h.canAccess }) }))
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }))
vi.mock('@/lib/api/aprobaciones-de-reparacion.service', () => ({ aprobacionesDeReparacionApi: h.api }))

import { SeccionReparaciones, topeEscrito } from './SeccionReparaciones'

const SLA = { EMERGENCY: 4, HIGH: 24, MEDIUM: 72, LOW: 168 }
const config = (o: Partial<ConfiguracionDeReparaciones> = {}): ConfiguracionDeReparaciones => ({
  prioridadesSoloDeLaInmobiliaria: ['EMERGENCY', 'HIGH'],
  prioridadesSugeridas: ['EMERGENCY', 'HIGH'],
  slaHoras: SLA,
  slaSugerido: SLA,
  topeDelMes: { pct: 30, sugeridoPct: 30, configurado: false },
  disponible: { prioridades: true, sla: true, laHaceElPropietario: true, topeDelMes: true },
  ...o,
})

let contenedor: HTMLDivElement | undefined
let raiz: Root | undefined
async function montar() {
  const caja = document.createElement('div')
  document.body.appendChild(caja)
  contenedor = caja
  const r = createRoot(caja)
  raiz = r
  await act(async () => r.render(<SeccionReparaciones />))
  for (let i = 0; i < 3; i++) await act(async () => {})
}
const campo = () => contenedor!.querySelector<HTMLInputElement>('[data-testid="tope-del-mes"]')
const guardar = () => Array.from(contenedor!.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Guardar')!
async function escribir(valor: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(campo(), valor)
    campo()!.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  h.api.configuracion.mockResolvedValue(config())
  h.api.guardarConfiguracion.mockImplementation(async (c: { topeDelMesPct?: number | null }) =>
    config({
      topeDelMes:
        c.topeDelMesPct == null
          ? { pct: 30, sugeridoPct: 30, configurado: false }
          : { pct: c.topeDelMesPct, sugeridoPct: 30, configurado: true },
    }),
  )
})
afterEach(() => {
  const r = raiz
  if (r) act(() => r.unmount())
  contenedor?.remove()
  vi.clearAllMocks()
})

describe('Configuración → Reparaciones: el tope del mes', () => {
  it('lee lo escrito: con coma o punto, de 1 a 100 y hasta dos decimales', () => {
    expect(topeEscrito('25')).toBe(25)
    expect(topeEscrito('12,5')).toBe(12.5)
    expect(topeEscrito(' 7.25 ')).toBe(7.25)
    expect(topeEscrito('')).toBe('vacio')
    expect(topeEscrito('0')).toBeNull()
    expect(topeEscrito('120')).toBeNull()
    expect(topeEscrito('12,345')).toBeNull()
    expect(topeEscrito('treinta')).toBeNull()
  })

  it('muestra el que rige y guarda sólo el tope cuando cambia', async () => {
    await montar()
    expect(campo()!.value).toBe('30')
    expect(contenedor!.textContent).toContain('Sugerido: 30 %')
    expect(guardar().disabled).toBe(true)
    await escribir('12,5')
    expect(guardar().disabled).toBe(false)
    await act(async () => guardar().click())
    expect(h.api.guardarConfiguracion).toHaveBeenCalledWith({ topeDelMesPct: 12.5 })
    expect(campo()!.value).toBe('12,5')
  })

  it('vacío vuelve al sugerido; un valor que no sirve no se manda', async () => {
    h.api.configuracion.mockResolvedValue(config({ topeDelMes: { pct: 20, sugeridoPct: 30, configurado: true } }))
    await montar()
    await escribir('150')
    expect(contenedor!.textContent).toContain('Escribe un porcentaje entre 1 y 100')
    await act(async () => guardar().click())
    expect(h.api.guardarConfiguracion).not.toHaveBeenCalled()
    expect(h.toast.error).toHaveBeenCalled()
    await escribir('')
    await act(async () => guardar().click())
    expect(h.api.guardarConfiguracion).toHaveBeenCalledWith({ topeDelMesPct: null })
  })

  it('sin la actualización de la base lo dice y no deja cambiarlo; un back anterior no pinta la parte', async () => {
    h.api.configuracion.mockResolvedValue(
      config({ disponible: { prioridades: true, sla: true, laHaceElPropietario: true, topeDelMes: false } }),
    )
    await montar()
    expect(contenedor!.textContent).toContain('Mientras tanto se sugiere con el 30 % del canon')
    expect(campo()!.disabled).toBe(true)
    act(() => raiz!.unmount())
    contenedor!.remove()
    h.api.configuracion.mockResolvedValue(config({ topeDelMes: undefined }))
    await montar()
    expect(campo()).toBeNull()
  })
})
