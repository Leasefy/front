/**
 * AvaluoEstadoCard.test.tsx
 *
 * GET /:id/status returns `paid: boolean` in every 200. It is
 * observation-only (does NOT gate valuation) but it DOES gate the CTA in the
 * 'firmado' state: with the dead POST /:certId/pay route (410), there is no
 * "Pagar certificado" button anymore — either the deliverable is ready (paid)
 * or we show an honest pending note (not paid).
 *
 * La ENTREGA es el informe web (`/avaluo/reporte/[slug]?token=`): con pago,
 * «Ver el informe» es el CTA principal y «Descargar el PDF» el secundario.
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

function findLinkByText(text: string): HTMLAnchorElement | undefined {
  return Array.from(container.querySelectorAll('a')).find((a) => a.textContent?.includes(text))
}

describe('<AvaluoEstadoCard> — firmado state, payment-at-intake', () => {
  it('con pago: «Ver el informe» (la landing, con el token del dueño) + «Descargar el PDF»; sin «Pagar certificado»', () => {
    render({ status: 'firmado', certId: 'cert-1', slug: 'slug-1', paid: true })

    expect(findButtonByText('Pagar certificado')).toBeUndefined()
    const informe = findLinkByText('Ver el informe')
    expect(informe).toBeDefined()
    expect(informe?.getAttribute('href')).toBe('/avaluo/reporte/slug-1?token=cap-token')
    expect(informe?.getAttribute('target')).toBe('_blank')
    expect(findButtonByText('Descargar el PDF')).toBeDefined()
  })

  it('con pago pero sin slug todavía: sólo el PDF (no hay URL de informe que armar)', () => {
    render({ status: 'firmado', certId: 'cert-1', paid: true })

    expect(findLinkByText('Ver el informe')).toBeUndefined()
    expect(findButtonByText('Descargar el PDF')).toBeDefined()
  })

  it('shows an honest pending note (no button) when paid is false, con enlace al avance del informe', () => {
    render({ status: 'firmado', certId: 'cert-1', slug: 'slug-1', paid: false })

    expect(findButtonByText('Pagar certificado')).toBeUndefined()
    expect(findButtonByText('Descargar el PDF')).toBeUndefined()
    expect(container.textContent).toContain('Estamos confirmando tu pago')
    expect(findLinkByText('Ver el avance del informe')?.getAttribute('href')).toBe(
      '/avaluo/reporte/slug-1?token=cap-token',
    )
  })

  it('entregado: «Ver el informe» + «Descargar el PDF» + «Verificar certificado»', () => {
    render({ status: 'entregado', certId: 'cert-1', slug: 'slug-1', paid: true })

    expect(findLinkByText('Ver el informe')?.getAttribute('href')).toBe('/avaluo/reporte/slug-1?token=cap-token')
    expect(findButtonByText('Descargar el PDF')).toBeDefined()
    expect(findLinkByText('Verificar certificado')?.getAttribute('href')).toBe('/avaluo/verificar/slug-1')
  })
})
