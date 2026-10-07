/**
 * QA-IA-95 (05-10-2026, IA-B-03): el detalle de un acuerdo YA vigente (Iván, 1 de 3 cuotas pagadas)
 * ofrecía «Revisar y aprobar». «Aprobar» es sólo para el plan que espera la aprobación de la
 * inmobiliaria; el vigente, cumplido o incumplido se ve («Ver el plan»).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
void React
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }))
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import { AcuerdoDetalleSheet } from './AcuerdoDetalleSheet'
import type { AcuerdoRow } from '@/lib/cobranza/acuerdo-vocab'

const plan = (estado: AcuerdoRow['estado']): AcuerdoRow => ({
  key: 'p1', debtorId: 'd1', deudor: 'Iván Inquilino Pérez Gómez', tipo: 'plan' as AcuerdoRow['tipo'], montoCop: 6_050_000,
  venceEl: '2026-12-03', registradoEn: '2026-10-03T12:00:00Z', estado, callId: null, planId: 'dfa80dbc-0000-4000-8000-000000000000',
  canal: null, condiciones: '3 cuotas, 1 pagada', resueltoEn: null, cedulaMasked: '10•••222', telefonoMasked: null,
})

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

// El cajón puede pintarse en un portal: se lee el documento entero.
const texto = () => document.body.textContent ?? ''

describe('AcuerdoDetalleSheet (QA-IA-95, IA-B-03)', () => {
  it('un plan vigente no ofrece «Revisar y aprobar»: «Ver el plan»', () => {
    act(() => root.render(<AcuerdoDetalleSheet acuerdo={plan('vigente')} onClose={() => {}} />))
    expect(texto()).not.toContain('Revisar y aprobar')
    expect(texto()).toContain('Ver el plan')
  })
  it('el que espera la aprobación sí dice «Revisar y aprobar»', () => {
    act(() => root.render(<AcuerdoDetalleSheet acuerdo={plan('por_aprobar')} onClose={() => {}} />))
    expect(texto()).toContain('Revisar y aprobar')
  })
})
