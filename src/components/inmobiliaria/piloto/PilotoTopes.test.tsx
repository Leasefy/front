/**
 * PilotoTopes — los topes (P-3) y la gracia (P-10) en pantalla (24-09-2026):
 *   · el administrador los cambia y se guarda SÓLO lo que cambió;
 *   · los rangos son los que manda el micro: fuera de rango no se guarda y se
 *     dice entre qué valores;
 *   · otro rol ve los campos apagados CON el porqué y sin botón;
 *   · sin la migración, apagado con el porqué (nunca un botón que falla);
 *   · un error al guardar se dice;
 *   · el horario es la ley: se muestra, no se edita;
 *   · cargando, falló y sin fuente son estados distintos.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, string>) => (vars ? `${k}(${Object.values(vars).join(',')})` : k),
    locale: 'es',
  }),
}))

import { PilotoTopes, type PilotoTopesProps } from './PilotoTopes'
import type { PilotoPreferenciasResponse } from '@/lib/api/piloto'

function datos(cambios: Partial<PilotoPreferenciasResponse> = {}): PilotoPreferenciasResponse {
  return {
    preferencias: { topeMontoCop: 5_000_000, topeDestinatarios: 10, graciaSegundos: 60, porDefecto: true },
    rangos: {
      topeMontoCop: { min: 0, max: 1_000_000_000 },
      topeDestinatarios: { min: 0, max: 10_000 },
      graciaSegundos: { min: 60, max: 600 },
    },
    ventanas: [
      { tipo: 'cobranza', nombre: 'el horario de cobranza (lunes a viernes de 8:00 a. m. a 7:00 p. m.)' },
      { tipo: 'aviso', nombre: 'el horario de contacto (lunes a viernes de 7:00 a. m. a 7:00 p. m.)' },
    ],
    puedeEditar: true,
    guardable: true,
    porQueNo: null,
    cambiadoPor: null,
    cambiadoEn: null,
    ...cambios,
  }
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  toastMock.success.mockReset()
  toastMock.error.mockReset()
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function pintar(props: Partial<PilotoTopesProps> = {}) {
  const onGuardar = props.onGuardar ?? vi.fn(async () => ({ ok: true }))
  act(() =>
    root.render(
      <PilotoTopes
        data={datos()}
        isLoading={false}
        error={null}
        notAvailable={false}
        guardando={false}
        onReintentar={vi.fn()}
        {...props}
        onGuardar={onGuardar}
      />,
    ),
  )
  return onGuardar
}

const q = (sel: string) => container.querySelector(sel)
const input = (campo: string) => q(`#piloto-topes-${campo}`) as HTMLInputElement
const guardar = () => q('[data-testid="piloto-topes-guardar"]') as HTMLButtonElement | null

function escribir(el: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('PilotoTopes', () => {
  it('el administrador cambia un tope y se guarda SÓLO lo que cambió', async () => {
    const onGuardar = pintar()
    expect(input('topeMontoCop').value).toContain('5.000.000')
    expect(guardar()?.disabled).toBe(true) // sin cambios, nada que guardar
    escribir(input('topeDestinatarios'), '25')
    expect(guardar()?.disabled).toBe(false)
    await act(async () => {
      guardar()!.click()
    })
    expect(onGuardar).toHaveBeenCalledWith({ topeDestinatarios: 25 })
    expect(toastMock.success).toHaveBeenCalledWith('inmobiliaria.piloto.topes.guardado')
  })

  it('el tope por acción se escribe con puntos de miles y se guarda como número', async () => {
    const onGuardar = pintar()
    escribir(input('topeMontoCop'), '2.000.000')
    await act(async () => {
      guardar()!.click()
    })
    expect(onGuardar).toHaveBeenCalledWith({ topeMontoCop: 2_000_000 })
  })

  it.each([
    ['graciaSegundos', '30', /60,600/],
    ['graciaSegundos', '601', /60,600/],
    ['topeDestinatarios', '10001', /0,10\.000/],
  ])('fuera de rango (%s = %s): se dice entre qué valores y no se guarda', (campo, valor, rango) => {
    const onGuardar = pintar()
    escribir(input(campo), valor)
    const ayuda = q(`[data-testid="piloto-topes-campo-${campo}"] [role="alert"]`)
    expect(ayuda?.textContent).toMatch(/inmobiliaria\.piloto\.topes\.fueraDeRango/)
    expect(ayuda?.textContent).toMatch(rango)
    expect(guardar()?.disabled).toBe(true)
    expect(onGuardar).not.toHaveBeenCalled()
  })

  it('otro rol: los ve apagados, con el porqué, y sin botón', () => {
    pintar({ data: datos({ puedeEditar: false, porQueNo: 'Sólo un administrador cambia los topes y la gracia del Piloto.' }) })
    expect(input('topeMontoCop').disabled).toBe(true)
    expect(input('graciaSegundos').disabled).toBe(true)
    expect(q('[data-testid="piloto-topes-por-que-no"]')?.textContent).toMatch(/Sólo un administrador/)
    expect(guardar()).toBeNull()
  })

  it('sin la migración: el administrador los ve apagados con el porqué (no un botón que falla)', () => {
    pintar({ data: datos({ guardable: false, porQueNo: 'Falta aplicar la migración 20260924030000_perilla_del_piloto.' }) })
    expect(input('topeDestinatarios').disabled).toBe(true)
    expect(q('[data-testid="piloto-topes-por-que-no"]')?.textContent).toMatch(/20260924030000/)
    expect(guardar()?.disabled).toBe(true)
  })

  it('si el micro no lo guarda, lo dice en la pantalla y en el aviso', async () => {
    const onGuardar = vi.fn(async () => ({ ok: false, error: 'Sólo un administrador…' }))
    pintar({ onGuardar })
    escribir(input('graciaSegundos'), '120')
    await act(async () => {
      guardar()!.click()
    })
    expect(q('[data-testid="piloto-topes-fallo"]')?.textContent).toMatch(/errorAlGuardar\(Sólo un administrador…\)/)
    expect(toastMock.error).toHaveBeenCalled()
  })

  it('el horario de ley se muestra y no se edita; dice quién cambió los topes', () => {
    pintar({
      data: datos({
        preferencias: { topeMontoCop: 2_000_000, topeDestinatarios: 25, graciaSegundos: 90, porDefecto: false },
        cambiadoPor: 'nico@leasefy.co',
        cambiadoEn: '2026-09-24T15:00:00.000Z',
      }),
    })
    const horario = q('[data-testid="piloto-topes-horario"]')!
    expect(horario.textContent).toMatch(/8:00 a\. m\. a 7:00 p\. m\./)
    expect(horario.querySelector('input')).toBeNull()
    expect(q('[data-testid="piloto-topes-rastro"]')?.textContent).toMatch(/cambiadoPor\(nico@leasefy\.co,/)
    expect(input('graciaSegundos').value).toBe('90')
  })

  it('los de Leasefy, dichos como tales', () => {
    pintar()
    expect(q('[data-testid="piloto-topes-rastro"]')?.textContent).toBe('inmobiliaria.piloto.topes.porDefecto')
  })

  it('cargando, falló y sin fuente son tres estados distintos', () => {
    pintar({ data: null, isLoading: true })
    expect(q('[data-testid="piloto-topes-cargando"]')).not.toBeNull()
    pintar({ data: null, error: '503' })
    expect(q('[data-testid="fallo-de-carga"]')).not.toBeNull()
    pintar({ data: null, notAvailable: true })
    expect(q('[data-testid="piloto-topes-sin-fuente"]')).not.toBeNull()
  })
})
