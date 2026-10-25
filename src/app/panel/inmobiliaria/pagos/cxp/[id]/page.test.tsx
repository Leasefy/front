/**
 * GLOW UP 21-10: la ficha de una factura de proveedor dice lo que se viene a
 * mirar arriba (valor, concepto, vencimiento) y pliega los identificadores
 * internos; el aviso habla en palabras de la persona, sin «AP» ni «M1».
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}))
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'b-1' }) }))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'ag-1' } }) }))

const FACTURA = {
  id: 'b-1',
  vendorId: '7f0c2a9e-0000-4000-8000-000000000001',
  invoiceNumber: 'FV-2031',
  amountCop: '1850000',
  costCenterCode: 'ADM',
  issuedAt: '2026-10-01T12:00:00Z',
  dueDate: '2026-10-31T12:00:00Z',
  status: 'pending_approval',
  createdBy: '1d2e3f40-0000-4000-8000-000000000002',
  approvedBy: null,
  concepto: 'Mantenimiento del ascensor',
}

vi.mock('@/lib/api/agent-fetch', () => ({
  agentFetch: async () => ({ ok: true, status: 200, json: async () => ({ bills: [FACTURA] }) }),
}))

import ApBillDetailPage from './page'

let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(async () => {
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://agente')
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root!.render(<ApBillDetailPage />)
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
})

afterEach(async () => {
  await act(async () => root?.unmount())
  host?.remove()
  vi.unstubAllEnvs()
})

describe('Factura de proveedor — la ficha', () => {
  it('el título es el número de la factura y el aviso no habla en jerga interna', () => {
    expect(document.querySelector('h1')?.textContent).toBe('FV-2031')
    const texto = document.body.textContent ?? ''
    expect(texto).not.toContain('M1')
    expect(texto).not.toContain('fase posterior')
    expect(texto).toContain('Mantenimiento del ascensor')
  })

  it('el valor va antes que los identificadores internos, y esos quedan plegados en «Ver detalles»', () => {
    const texto = document.body.textContent ?? ''
    expect(texto.indexOf('1.850.000')).toBeLessThan(texto.indexOf(FACTURA.vendorId))
    const plegado = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Ver detalles'))
    expect(plegado).toBeTruthy()
  })
})
