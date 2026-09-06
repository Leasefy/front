/**
 * Documentos del inmueble — las filas hacen algo o dicen por qué no.
 * Nico (2026-09-03): «le di a acta de entrega y no pasa nada, y ese otro
 * documento ¿qué es? ¿está mockeado?».
 * Nico (2026-09-04): «cuando le den clic en contrato que se abra […] dentro de
 * saleads, quizás en un modal […] y le demos opciones, descargar etc…».
 *
 * `disableIframePageLoading`: el modal del contrato embebe el PDF en un
 * `<iframe>` y happy-dom intenta BAJARLO de verdad. La descarga muere sola —no
 * hay red— pero deja cientos de líneas de NetworkError/AbortError en la salida
 * del test, ruido que tapa un fallo real.
 *
 * @vitest-environment-options { "settings": { "disableIframePageLoading": true } }
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { Consignacion } from '@/lib/types/inmobiliaria'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k.split('.').pop() as string, locale: 'es' }),
}))
vi.mock('next/link', () => ({
  default: ({ children, href, ...resto }: { children: React.ReactNode; href: string } & Record<string, unknown>) =>
    React.createElement('a', { href, ...resto }, children),
}))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))
const subirContrato = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api/inmobiliaria.service', () => ({ consignacionesApi: { subirContrato } }))

import { DocumentsSection } from './ConsignacionDetailSections'

const base = {
  id: 'c-1',
  inventoryItems: [{ id: 'i1', name: 'Nevera', quantity: 1, condition: 'good' }],
  photosUrls: [],
} as unknown as Consignacion

const URL_CONTRATO = 'https://cdn/x.pdf'
const conContrato = { ...base, consignmentContractUrl: URL_CONTRATO } as Consignacion

/**
 * Radix portalea el modal a `document.body`, no al contenedor del test: lo que
 * viva dentro del diálogo se busca en TODO el documento a propósito.
 */
const enElDocumento = <T extends HTMLElement>(testid: string) =>
  document.querySelector<T>(`[data-testid="${testid}"]`)

const abrirModal = () => {
  const fila = container.querySelector<HTMLElement>('[data-testid="documento-contrato"]')!
  act(() => { fila.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
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

describe('DocumentsSection', () => {
  it('el acta abre la hoja imprimible del inmueble', () => {
    act(() => root.render(<DocumentsSection consignacion={base} />))
    const acta = container.querySelector<HTMLAnchorElement>('[data-testid="documento-acta"]')
    expect(acta?.getAttribute('href')).toBe('/panel/inmobiliaria/inmuebles/c-1/acta')
    expect(acta?.textContent).toContain('handoverReportOpen')
  })

  it('sin contrato cargado lo dice y deja adjuntar el PDF firmado', () => {
    act(() => root.render(<DocumentsSection consignacion={base} />))
    expect(container.querySelector('[data-testid="documento-contrato"]')).toBeNull()
    const adjuntar = container.querySelector<HTMLButtonElement>('[data-testid="documento-contrato-adjuntar"]')
    expect(adjuntar?.tagName).toBe('BUTTON')
    expect(adjuntar?.textContent).toContain('consignmentContractMissing')
    expect(adjuntar?.textContent).toContain('consignmentContractAttach')
    const input = container.querySelector<HTMLInputElement>('[data-testid="documento-contrato-input"]')
    expect(input?.getAttribute('accept')).toBe('application/pdf')
    expect(container.querySelector('button[disabled]')).toBeNull()
  })

  it('elegir un PDF lo sube y recarga la ficha; algo que no es PDF no sale de acá', async () => {
    subirContrato.mockReset().mockResolvedValue({ consignmentContractUrl: 'https://s/firmada' })
    const onActualizado = vi.fn()
    act(() => root.render(<DocumentsSection consignacion={base} onActualizado={onActualizado} />))
    const input = container.querySelector<HTMLInputElement>('[data-testid="documento-contrato-input"]')!

    const png = new File(['x'], 'foto.png', { type: 'image/png' })
    Object.defineProperty(input, 'files', { value: [png], configurable: true })
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(subirContrato).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalled()

    const pdf = new File(['%PDF'], 'contrato.pdf', { type: 'application/pdf' })
    Object.defineProperty(input, 'files', { value: [pdf], configurable: true })
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(subirContrato).toHaveBeenCalledWith('c-1', pdf)
    expect(onActualizado).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalled()
  })

  it('con contrato cargado, la fila abre el modal DENTRO del panel (no una pestaña)', () => {
    act(() =>
      root.render(<DocumentsSection consignacion={conContrato} />),
    )
    const contrato = container.querySelector<HTMLElement>('[data-testid="documento-contrato"]')
    // Antes era un `<a target="_blank">` que sacaba al usuario del panel.
    expect(contrato?.tagName).toBe('BUTTON')
    expect(contrato?.getAttribute('href')).toBeNull()
    expect(container.querySelector('[data-testid="documento-contrato-adjuntar"]')).toBeNull()
    expect(container.querySelector('[data-testid="documento-contrato-reemplazar"]')).not.toBeNull()

    // Cerrado no hay modal montado; el clic lo abre.
    expect(enElDocumento('contrato-pdf-modal')).toBeNull()
    act(() => { contrato!.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(enElDocumento('contrato-pdf-modal')).not.toBeNull()
  })

  it('el modal embebe el PDF y ofrece descargar, abrir en pestaña y reemplazar', () => {
    act(() => root.render(<DocumentsSection consignacion={conContrato} />))
    abrirModal()

    const iframe = enElDocumento<HTMLIFrameElement>('contrato-pdf-iframe')
    expect(iframe?.getAttribute('src')).toBe(URL_CONTRATO)

    const descargar = enElDocumento<HTMLAnchorElement>('contrato-pdf-descargar')
    expect(descargar?.getAttribute('href')).toBe(URL_CONTRATO)
    expect(descargar?.hasAttribute('download')).toBe(true)

    const pestana = enElDocumento<HTMLAnchorElement>('contrato-pdf-pestana')
    expect(pestana?.getAttribute('href')).toBe(URL_CONTRATO)
    expect(pestana?.getAttribute('target')).toBe('_blank')

    expect(enElDocumento('contrato-pdf-reemplazar')).not.toBeNull()
  })

  it('un iframe que no pinta nada no deja una pantalla en blanco: el respaldo con el enlace queda a la vista', () => {
    act(() => root.render(<DocumentsSection consignacion={conContrato} />))
    abrirModal()

    const respaldo = enElDocumento('contrato-pdf-respaldo')
    expect(respaldo).not.toBeNull()
    expect(respaldo?.querySelector('a')?.getAttribute('href')).toBe(URL_CONTRATO)
  })

  it('«Reemplazar» desde el modal dispara el mismo selector de PDF de la sección', () => {
    act(() => root.render(<DocumentsSection consignacion={conContrato} />))
    abrirModal()

    const input = container.querySelector<HTMLInputElement>('[data-testid="documento-contrato-input"]')!
    const clics = vi.spyOn(input, 'click').mockImplementation(() => {})
    act(() => {
      enElDocumento('contrato-pdf-reemplazar')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(clics).toHaveBeenCalledTimes(1)
  })
})
