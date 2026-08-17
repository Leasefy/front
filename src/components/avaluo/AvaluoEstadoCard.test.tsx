/**
 * AvaluoEstadoCard.test.tsx
 *
 * GET /:id/status returns `paid: boolean` in every 200. It is
 * observation-only (does NOT gate valuation) but it DOES gate the CTA in the
 * 'firmado' state: with the dead POST /:certId/pay route (410), there is no
 * "Pagar certificado" button anymore — either the download is ready (paid)
 * or we show an honest pending note (not paid).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/api/avaluo.service', () => ({
  certificateUrl: (certId: string, token: string) => `https://mock/${certId}?token=${token}`,
  readCapToken: () => 'cap-token',
}))

import { AvaluoEstadoCard } from './AvaluoEstadoCard'
import type { AvaluoStatusResponse } from '@/lib/types/avaluo'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

function render(statusData: AvaluoStatusResponse) {
  act(() => {
    root.render(
      <AvaluoEstadoCard
        submissionId="sub-1"
        statusData={statusData}
        isLoading={false}
      />
    )
  })
}

function findButtonByText(text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(text)
  )
}

describe('<AvaluoEstadoCard> — firmado state, payment-at-intake', () => {
  it('shows the download button (no "Pagar certificado") when paid is true', () => {
    render({ status: 'firmado', certId: 'cert-1', paid: true })

    expect(findButtonByText('Pagar certificado')).toBeUndefined()
    expect(findButtonByText('Descargar certificado')).toBeDefined()
  })

  it('shows an honest pending note (no button) when paid is false', () => {
    render({ status: 'firmado', certId: 'cert-1', paid: false })

    expect(findButtonByText('Pagar certificado')).toBeUndefined()
    expect(findButtonByText('Descargar certificado')).toBeUndefined()
    expect(container.textContent).toContain('Estamos confirmando tu pago')
  })
})
