/**
 * 🔴 02-10-2026 · Lo que se devuelve del depósito nunca es negativo (Nico): lo
 * que los descuentos pasan del depósito va como un cargo aparte. Antes el paso
 * mostraba «Monto a devolver: $-500.000». Y un descuento sin concepto o con
 * ceros de más se dice bajo la lista, con la frase del back.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { StepObservations, type FormData } from './ActaEntregaSteps'
import { MENSAJES_DEL_ACTA } from '@/lib/actas/limites-del-acta'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const T: Record<string, string> = {
  'inmobiliaria.acta.amountToReturn': 'Monto a devolver',
  'inmobiliaria.acta.aCargoDelInquilino':
    'El inquilino debe {{monto}} más de lo que dejó de depósito: no se descuenta del depósito, va como un cargo aparte.',
}
const t = (k: string, p?: Record<string, string | number>) =>
  (T[k] ?? k).replace(/\{\{(\w+)\}\}/g, (_, n: string) => String(p?.[n] ?? ''))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t, locale: 'es', formatCurrency: (n: number) => `$${n}` }),
}))

const BASE: FormData = {
  type: 'devolucion',
  consignacionId: 'c-1',
  deliveryDate: '2026-10-02',
  deliveryTime: '10:00',
  rooms: ['sala'],
  items: [],
  meterReadings: [],
  keysDelivered: [],
  generalCondition: 'bueno',
  generalObservations: '',
  signatures: [],
  depositAmount: 1_000_000,
  deductions: [],
}

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function pintar(formData: FormData) {
  await act(async () => {
    root.render(
      <StepObservations
        formData={formData}
        updateFormData={() => {}}
        consignaciones={[]}
        selectedConsignacion={undefined}
        t={t}
      />,
    )
  })
}

const $ = (sel: string) => container.querySelector(sel)

describe('StepObservations — el depósito', () => {
  it('descuentos por debajo del depósito: se devuelve la diferencia, sin cargo aparte', async () => {
    await pintar({ ...BASE, deductions: [{ concept: 'Aseo', amount: 300_000 }] })
    expect($('[data-testid="acta-a-devolver"]')?.textContent).toContain('700.000')
    expect($('[data-testid="acta-a-cargo-del-inquilino"]')).toBeNull()
  })

  it('🔴 descuentos por encima: se devuelve $0 y lo de más se dice como cargo aparte', async () => {
    await pintar({
      ...BASE,
      deductions: [
        { concept: 'Pintura', amount: 1_200_000 },
        { concept: 'Aseo', amount: 300_000 },
      ],
    })
    const aDevolver = $('[data-testid="acta-a-devolver"]')?.textContent ?? ''
    expect(aDevolver).toContain('$0')
    expect(aDevolver).not.toContain('-')
    expect($('[data-testid="acta-a-cargo-del-inquilino"]')?.textContent).toBe(
      'El inquilino debe $500.000 más de lo que dejó de depósito: no se descuenta del depósito, va como un cargo aparte.',
    )
  })

  it('un descuento sin concepto se dice bajo la lista, con la frase del back', async () => {
    await pintar({ ...BASE, deductions: [{ concept: '', amount: 100_000 }] })
    // La frase literal del back (`DeduccionDelActaDto`), no sólo la constante.
    expect(MENSAJES_DEL_ACTA.conceptoDelDescuento).toBe('Escribe el concepto de cada descuento.')
    expect($('#acta-descuentos-error')?.textContent).toBe('Escribe el concepto de cada descuento.')
  })
})
