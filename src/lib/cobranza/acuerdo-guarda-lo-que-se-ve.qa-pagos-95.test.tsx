/**
 * 🔴 CB-05 (QA-PAGOS-95 r2, 06-10-2026): el acuerdo guarda lo que escribió la
 * persona. Antes `useAgreementOffer` sólo mandaba el total y los intereses: el
 * micro guardaba «pago único» por el total mientras la vista previa mostraba
 * 6 cuotas. Ahora viajan la inicial, el número de cuotas y la fecha de la
 * primera, y la vista previa reparte las cuotas como el micro (iguales hacia
 * abajo, la última se lleva el resto; un mes entre cuotas).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { agentFetchMock } = vi.hoisted(() => ({ agentFetchMock: vi.fn() }))
vi.mock('@/lib/api/agent-fetch', () => ({
  agentFetch: (...a: unknown[]) => agentFetchMock(...a),
}))
vi.mock('@/lib/api/agent-auth', () => ({
  agentAuthHeaders: (h?: HeadersInit) => new Headers(h),
}))
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: { id: 'agencia-1' }, user: null, isAuthenticated: true, isLoading: false }),
}))

import { useAgreementOffer } from '@/lib/hooks/cobranza/use-agreement-offer'
import { cuotasDelAcuerdo } from './cuotas-del-acuerdo'

let contenedor: HTMLDivElement
let root: Root
beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test'
  agentFetchMock.mockReset().mockResolvedValue(
    new Response(JSON.stringify({ planId: 'p-1', installments: [] }), { status: 201, headers: { 'content-type': 'application/json' } }),
  )
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})
afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

async function montar<T>(usar: () => T): Promise<{ actual: () => T }> {
  const ref: { valor: T | null } = { valor: null }
  function Sonda() {
    ref.valor = usar()
    return null
  }
  await act(async () => {
    root.render(<Sonda />)
  })
  return { actual: () => ref.valor as T }
}

describe('🔴 CB-05: lo que se ve es lo que se guarda', () => {
  it('el hook manda la inicial, el número de cuotas y la fecha de la primera', async () => {
    const h = await montar(() => useAgreementOffer())
    await act(async () => {
      await h.actual().offer({
        debtorId: 'd-1',
        stage: 'S3' as never,
        totalDueCop: 2_400_000,
        interestsCop: 180_000,
        initialAmountCop: 600_000,
        installmentCount: 3,
        firstDueDate: '2026-11-05',
      })
    })
    const cuerpo = JSON.parse(String(agentFetchMock.mock.calls[0][1].body))
    expect(cuerpo).toMatchObject({ initialAmountCop: 600_000, installmentCount: 3, firstDueDate: '2026-11-05' })
  })

  it('sin lo pedido (otros llamadores) el cuerpo es el de siempre', async () => {
    const h = await montar(() => useAgreementOffer())
    await act(async () => {
      await h.actual().offer({ debtorId: 'd-1', stage: 'S1' as never, totalDueCop: 1000, interestsCop: 0 })
    })
    const cuerpo = JSON.parse(String(agentFetchMock.mock.calls[0][1].body))
    expect('initialAmountCop' in cuerpo).toBe(false)
    expect('installmentCount' in cuerpo).toBe(false)
  })

  it('la vista previa reparte como el micro: iguales hacia abajo y la última se lleva el resto', () => {
    expect(cuotasDelAcuerdo(1_000_000, 3, '2026-11-05').map((c) => c.valor)).toEqual([333_333, 333_333, 333_334])
  })

  it('un mes entre cuotas, conservando el día (31 de enero → 28 de febrero)', () => {
    expect(cuotasDelAcuerdo(300, 3, '2027-01-31').map((c) => c.vence)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31'])
  })

  it('sin cuotas no hay filas', () => {
    expect(cuotasDelAcuerdo(1_000_000, 0, '2026-11-05')).toEqual([])
  })
})
