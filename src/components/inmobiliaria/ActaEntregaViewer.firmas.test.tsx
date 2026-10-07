/**
 * 🔴 Las firmas del acta en el detalle (PRUEBAS-PAGOS, 03-10-2026, hallado en
 * el navegador del laboratorio).
 *
 *  · El back guarda la firma con `signerRole` y el panel buscaba `party`: el
 *    acta firmada por el asesor decía «pendiente» en las tres casillas.
 *  · «Solicitar firma» no hacía nada: la pantalla de documentos no pasa
 *    `onRequestSignature` (y no hay ruta del panel para firmar un acta).
 *
 * Convención del repo: createRoot + act, sin RTL.
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { actaDelBack } from '@/lib/actas/acta-del-back'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es', formatDate: (d: string) => d }),
}))

import { ActaEntregaViewer } from './ActaEntregaViewer'

let contenedor: HTMLDivElement | null = null
let raiz: Root | null = null

afterEach(() => {
  act(() => raiz?.unmount())
  contenedor?.remove()
  contenedor = null
  raiz = null
})

const DEL_BACK = {
  id: 'a-1',
  type: 'DEVOLUCION',
  status: 'PENDING_SIGNATURES',
  propertyTitle: 'Apto 909',
  propertyAddress: 'Calle 99',
  propietarioName: 'Paula',
  rooms: ['sala'],
  items: [],
  meterReadings: [],
  keysDelivered: [],
  generalCondition: 'GOOD',
  signatures: [
    { signerName: 'Luis Asesor', signerEmail: 'l@x.test', signerRole: 'asesor', signedAt: '2026-10-03T11:52:31.214Z' },
  ],
  createdAt: '2026-10-03T11:50:00.000Z',
}

async function montar(onRequestSignature?: (p: 'tenant' | 'owner' | 'agent') => void) {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
  await act(async () => {
    raiz!.render(<ActaEntregaViewer acta={actaDelBack(DEL_BACK)} onRequestSignature={onRequestSignature} />)
  })
  return contenedor
}

describe('<ActaEntregaViewer> — las firmas', () => {
  it('🔴 la firma del asesor que guardó el back se ve firmada (sólo esa)', async () => {
    const c = await montar()
    const firmadas = (c.textContent ?? '').split('inmobiliaria.acta.signed:').length - 1
    expect(firmadas).toBe(1)
    expect(c.textContent).toContain('inmobiliaria.acta.signed: 2026-10-03T11:52:31.214Z')
  })

  it('🔴 sin quien la pida, no hay «Solicitar firma» (era un botón muerto)', async () => {
    const c = await montar()
    expect(c.textContent).not.toContain('inmobiliaria.acta.requestSignature')
  })

  it('con quien la pida, sí, y dice de quién', async () => {
    const pedir = vi.fn()
    const c = await montar(pedir)
    const boton = Array.from(c.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('inmobiliaria.acta.requestSignature'),
    )
    expect(boton).toBeDefined()
    await act(async () => boton!.click())
    expect(pedir).toHaveBeenCalledWith('tenant')
  })
})
