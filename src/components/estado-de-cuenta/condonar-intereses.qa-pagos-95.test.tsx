/**
 * B-13 (QA-PAGOS-95 ronda 2; Nico, 05-10-2026): «Condonar intereses» en la fila
 * de interés del estado de cuenta — sólo el administrador, por concepto, con
 * motivo, la regla de «Total» dicha en palabras, y la anulación con motivo.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const h = vi.hoisted(() => ({ deLaCuota: vi.fn(), condonar: vi.fn(), anular: vi.fn() }))
vi.mock('@/lib/api/condonaciones.service', () => ({
  condonacionesApi: { deLaCuota: h.deLaCuota, condonar: h.condonar, anular: h.anular },
}))
vi.mock('@/components/ui/campo-de-plata', () => ({
  CampoDePlata: ({ onChange, ...p }: { onChange: (v: number) => void } & Record<string, unknown>) => (
    <input data-testid={p['data-testid'] as string} onChange={(e) => onChange(Number(e.target.value))} />
  ),
}))

import { BotonCondonarIntereses, ProveedorDeCondonarIntereses } from './CondonarInteresesDeLaFila'
import type { FilaDeInteres } from '@/lib/types/estado-de-cuenta'

const FILA: FilaDeInteres = {
  cuotaId: 'cuota-junio',
  mes: '2026-06',
  concepto: 'Intereses de mora sobre Canon de junio',
  fechaVencimiento: '2026-06-01',
  diasDeMora: 124,
  liquidado: 548_124,
  abonado: 0,
  pendiente: 548_124,
  origen: 'CUOTA',
  pagadaEnMora: false,
}

const DATOS = {
  disponible: true,
  motivoNoDisponible: null,
  cuotaId: 'cuota-junio',
  mes: '2026-06',
  periodo: 'junio de 2026',
  interes: { liquidadoCop: 548_124, abonadoCop: 0, pendienteCop: 548_124, condonadoCop: 0 },
  pendientePorConcepto: { interesDeMoraCop: 248_124, gastoDeCobranzaCop: 300_000 },
  alcanceDelTotal: 'LO_DE_HOY' as const,
  alcanceEnPalabras:
    'En esta inmobiliaria, condonar el total perdona lo que la cuota debe de intereses hoy. Si sigue sin pagarse, desde mañana vuelve a correr el interés sobre el capital vencido.',
  sinInteresDesde: null,
  puedeCondonar: true,
  porQueNo: null,
  condonaciones: [],
}

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  h.deLaCuota.mockReset()
  h.condonar.mockReset()
  h.anular.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})
const $ = (id: string) => document.body.querySelector(`[data-testid="${id}"]`) as HTMLElement | null
const escribir = (el: HTMLElement, valor: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  setter.call(el, valor)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

function montar(habilitado: boolean, onCambio = vi.fn()) {
  act(() => {
    root.render(
      <ProveedorDeCondonarIntereses habilitado={habilitado} onCambio={onCambio}>
        <BotonCondonarIntereses fila={FILA} />
      </ProveedorDeCondonarIntereses>,
    )
  })
  return onCambio
}

describe('B-13 · Condonar intereses (estado de cuenta del panel)', () => {
  it('🔴 sin ser administrador (o en el portal) no hay botón', () => {
    montar(false)
    expect($('condonar-intereses-de-la-fila')).toBeNull()
  })

  it('🔴 «Total» condona lo que se debe hoy de los dos conceptos, con motivo, y dice qué hace «Total» en esta inmobiliaria', async () => {
    h.deLaCuota.mockResolvedValue(DATOS)
    h.condonar.mockResolvedValue({ ...DATOS, interes: { ...DATOS.interes, pendienteCop: 0, condonadoCop: 548_124 } })
    const onCambio = montar(true)
    await act(async () => $('condonar-intereses-de-la-fila')!.click())
    expect(h.deLaCuota).toHaveBeenCalledWith('cuota-junio')
    expect($('condonar-pendiente-interes')!.textContent).toContain('248.124')
    expect($('condonar-pendiente-gasto')!.textContent).toContain('300.000')
    expect($('condonar-alcance')!.textContent).toContain('vuelve a correr el interés')
    // Sin motivo no se aprieta.
    expect(($('condonar-confirmar') as HTMLButtonElement).disabled).toBe(true)
    act(() => escribir($('condonar-motivo')!, 'Acuerdo con el inquilino'))
    expect(($('condonar-confirmar') as HTMLButtonElement).disabled).toBe(false)
    await act(async () => $('condonar-confirmar')!.click())
    expect(h.condonar).toHaveBeenCalledWith('cuota-junio', {
      total: true,
      interesDeMoraCop: null,
      gastoDeCobranzaCop: null,
      motivo: 'Acuerdo con el inquilino',
    })
    expect(onCambio).toHaveBeenCalled()
  })

  it('una parte: por concepto y nunca más de lo que se debe', async () => {
    h.deLaCuota.mockResolvedValue(DATOS)
    h.condonar.mockResolvedValue(DATOS)
    montar(true)
    await act(async () => $('condonar-intereses-de-la-fila')!.click())
    act(() => $('condonar-una-parte')!.click())
    const gasto = $('condonar-monto-gasto') as HTMLInputElement
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(gasto, '400000')
      gasto.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => escribir($('condonar-motivo')!, 'Error en el cálculo'))
    expect(($('condonar-confirmar') as HTMLButtonElement).disabled).toBe(true)
    // El error entra con el cruce de Cadence (la pista sale primero): se espera.
    for (let i = 0; i < 40 && !document.body.textContent?.includes('No puede pasar de'); i++) {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50))
      })
    }
    expect(document.body.textContent).toContain('No puede pasar de')
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(gasto, '300000')
      gasto.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => $('condonar-confirmar')!.click())
    expect(h.condonar).toHaveBeenCalledWith('cuota-junio', {
      total: false,
      interesDeMoraCop: 0,
      gastoDeCobranzaCop: 300_000,
      motivo: 'Error en el cálculo',
    })
  })

  it('la historia trae «Anular» con motivo obligatorio', async () => {
    h.deLaCuota.mockResolvedValue({
      ...DATOS,
      condonaciones: [
        {
          id: 'c1',
          interesDeMoraCop: 248_124,
          gastoDeCobranzaCop: 0,
          totalCop: 248_124,
          alcance: 'LO_DE_HOY',
          liquidadoAl: '2026-10-05',
          motivo: 'Acuerdo con el inquilino',
          condonadaPor: 'Ana Admin',
          // 9:30 p. m. del 5 en Bogotá (ya es el 6 en UTC): se dice el 5.
          fecha: '2026-10-06T02:30:00.000Z',
          anulada: null,
        },
      ],
    })
    h.anular.mockResolvedValue(DATOS)
    montar(true)
    await act(async () => $('condonar-intereses-de-la-fila')!.click())
    expect($('condonaciones-de-la-cuota')!.textContent).toContain('Acuerdo con el inquilino')
    expect($('condonaciones-de-la-cuota')!.textContent).toContain('5 de octubre de 2026')
    expect($('condonaciones-de-la-cuota')!.textContent).not.toContain('6 de octubre')
    act(() => $('anular-condonacion')!.click())
    expect(($('anular-condonacion-confirmar') as HTMLButtonElement).disabled).toBe(true)
    act(() => escribir($('anular-condonacion-motivo')!, 'Se condonó por error'))
    await act(async () => $('anular-condonacion-confirmar')!.click())
    expect(h.anular).toHaveBeenCalledWith('c1', 'Se condonó por error')
  })
})
