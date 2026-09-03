/**
 * Documentos del inmueble — las filas hacen algo o dicen por qué no.
 * Nico (2026-09-03): «le di a acta de entrega y no pasa nada, y ese otro
 * documento ¿qué es? ¿está mockeado?».
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

import { DocumentsSection } from './ConsignacionDetailSections'

const base = {
  id: 'c-1',
  inventoryItems: [{ id: 'i1', name: 'Nevera', quantity: 1, condition: 'good' }],
  photosUrls: [],
} as unknown as Consignacion

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

  it('sin contrato cargado lo dice y manda a generarlo desde una plantilla', () => {
    act(() => root.render(<DocumentsSection consignacion={base} />))
    expect(container.querySelector('[data-testid="documento-contrato"]')).toBeNull()
    const generar = container.querySelector<HTMLAnchorElement>('[data-testid="documento-contrato-generar"]')
    expect(generar?.getAttribute('href')).toBe('/panel/inmobiliaria/documentos?tab=plantillas')
    expect(generar?.textContent).toContain('consignmentContractMissing')
    expect(container.querySelector('button[disabled]')).toBeNull()
  })

  it('con contrato cargado, la fila abre el PDF en otra pestaña', () => {
    act(() =>
      root.render(<DocumentsSection consignacion={{ ...base, consignmentContractUrl: 'https://cdn/x.pdf' } as Consignacion} />),
    )
    const contrato = container.querySelector<HTMLAnchorElement>('[data-testid="documento-contrato"]')
    expect(contrato?.getAttribute('href')).toBe('https://cdn/x.pdf')
    expect(contrato?.getAttribute('target')).toBe('_blank')
    expect(container.querySelector('[data-testid="documento-contrato-generar"]')).toBeNull()
  })
})
