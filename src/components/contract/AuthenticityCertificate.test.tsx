/**
 * «Descargar Certificado» no se muestra mientras la descarga no exista.
 *
 * El botón no tenía `onClick`: la persona lo tocaba y no pasaba nada. Nico,
 * 02-10: ocultarlo hasta que la descarga exista. El certificado se sigue
 * viendo y se cierra igual.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { Contract } from '@/lib/types/contract'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { AuthenticityCertificate } from './AuthenticityCertificate'

const CONTRATO = {
  id: 'c0ffee00-0000-4000-8000-000000000001',
  status: 'signed',
  createdAt: '2026-09-01T10:00:00.000Z',
  landlordId: 'll-1',
  tenantId: 'tn-1',
  landlordName: 'Ana Dueña',
  landlordDocument: '1020304050',
  tenantName: 'Camila Restrepo',
  tenantDocument: '1098765432',
  propertyId: 'prop-1',
  propertyAddress: 'Cra 76 #34-12, Medellín',
  landlordSignature: { signedAt: '2026-09-02T10:00:00.000Z', ipAddress: '190.1.2.3' },
  tenantSignature: { signedAt: '2026-09-03T10:00:00.000Z', ipAddress: '190.4.5.6' },
} as unknown as Contract

let contenedor: HTMLDivElement
let raiz: Root

beforeEach(() => {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})

afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

describe('<AuthenticityCertificate variant="full">', () => {
  it('🔴 no ofrece «Descargar Certificado»: la descarga no existe todavía', () => {
    act(() => raiz.render(<AuthenticityCertificate contract={CONTRATO} variant="full" isOpen />))
    const modal = document.querySelector<HTMLElement>('[role="dialog"]')
    expect(modal).not.toBeNull()
    expect(modal!.textContent).toContain('Certificado de Autenticidad Digital')
    expect(modal!.textContent).not.toMatch(/Descargar/i)
  })

  it('se sigue cerrando con «Cerrar»', () => {
    const onClose = vi.fn()
    act(() =>
      raiz.render(<AuthenticityCertificate contract={CONTRATO} variant="full" isOpen onClose={onClose} />),
    )
    const cerrar = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(
      (b) => b.textContent?.trim() === 'Cerrar',
    )
    expect(cerrar).toBeDefined()
    act(() => cerrar!.click())
    expect(onClose).toHaveBeenCalled()
  })
})
