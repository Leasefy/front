/**
 * «Registrar gestión» (COBRANZA-MANUAL, 04-10-2026): tipo, resultado,
 * comentario y promesa opcional; registrar sólo anota (se dice en el diálogo).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const h = vi.hoisted(() => ({ registrar: vi.fn() }))
vi.mock('@/lib/api/cobranza-manual.service', () => ({
  cobranzaManualApi: { registrar: h.registrar },
}))
vi.mock('@/components/ui/campo-de-plata', () => ({
  CampoDePlata: ({ onChange, ...p }: { onChange: (v: number) => void } & Record<string, unknown>) => (
    <input data-testid={p['data-testid'] as string} onChange={(e) => onChange(Number(e.target.value))} />
  ),
}))

import { RegistrarGestion, validarLaGestion } from './RegistrarGestion'

describe('validarLaGestion', () => {
  const base = { tipo: 'LLAMADA' as const, resultado: '' as const, comentario: '', conPromesa: false, fecha: '', monto: undefined, hoy: '2026-10-04' }
  it('un contacto pide qué pasó; una nota, su texto', () => {
    expect(validarLaGestion(base)).toEqual({ resultado: 'Di qué pasó con la llamada.' })
    expect(validarLaGestion({ ...base, tipo: 'NOTA' })).toEqual({ comentario: 'Escribe la nota.' })
  })
  it('la promesa pide día (no pasado) y monto', () => {
    expect(
      validarLaGestion({ ...base, resultado: 'PROMETIO_PAGAR', conPromesa: true, fecha: '2026-10-03' }),
    ).toEqual({
      fecha: 'La fecha de la promesa no puede ser anterior a hoy.',
      monto: 'Escribe cuánto prometió pagar.',
    })
    expect(
      validarLaGestion({ ...base, resultado: 'PROMETIO_PAGAR', conPromesa: true, fecha: '2026-10-04', monto: 10 }),
    ).toEqual({})
  })
})

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  h.registrar.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const $ = (id: string) => document.body.querySelector(`[data-testid="${id}"]`) as HTMLElement | null

describe('<RegistrarGestion>', () => {
  it('dice que sólo anota, y una nota se registra con su texto', async () => {
    const onRegistrada = vi.fn()
    const onCerrar = vi.fn()
    h.registrar.mockResolvedValue({ gestion: { id: 'g1' } })
    act(() => {
      root.render(
        <RegistrarGestion abierto onCerrar={onCerrar} quien={{ contractId: 'c1' }} nombre="Iván Pérez" onRegistrada={onRegistrada} />,
      )
    })
    expect(document.body.textContent).toContain('no se le envía nada al inquilino')
    act(() => $('gestion-tipo-NOTA')!.click())
    const area = $('gestion-comentario') as HTMLTextAreaElement
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
      setter.call(area, 'Lo vi en la portería')
      area.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      $('gestion-registrar')!.click()
    })
    expect(h.registrar).toHaveBeenCalledWith(
      { contractId: 'c1' },
      { tipo: 'NOTA', comentario: 'Lo vi en la portería' },
    )
    expect(onRegistrada).toHaveBeenCalled()
    expect(onCerrar).toHaveBeenCalled()
  })

  it('sin resultado no manda nada y dice qué falta', async () => {
    act(() => {
      root.render(<RegistrarGestion abierto onCerrar={vi.fn()} quien={{ deudorId: 'd1' }} />)
    })
    await act(async () => {
      $('gestion-registrar')!.click()
    })
    expect(h.registrar).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Di qué pasó con la llamada.')
  })
})
