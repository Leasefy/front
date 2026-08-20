/**
 * ReportTopbar.test.tsx — la barra superior del panel del informe.
 *
 * Foco de esta suite (T-0007): las capacidades de entrega gatean «Imprimir»
 * (`canExport`) y el chip del sello que ancla a `#sello-verificacion`
 * (`canVerify`). «Descargar el PDF» ya se gatea aparte con `downloadHref`
 * (`null` ⇒ deshabilitado) — eso no cambia acá.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

void React // jsx-preserve

import { ReportTopbar, type ReportTopbarProps } from './ReportTopbar'
import type { DocStatus } from '@/lib/avaluo/reporte/landing-layout'

const STATUS: DocStatus = { label: 'VIGENTE · 362 d', tone: 'success', chain: 'VIGENTE', daysLeft: 362 }

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

function render(overrides: Partial<ReportTopbarProps> = {}) {
  const props: ReportTopbarProps = {
    issuerLabel: 'Portofino',
    status: STATUS,
    hashShort: 'abc123def456',
    downloadHref: 'https://micro.test/pdf?token=x',
    sample: false,
    canExport: true,
    canVerify: true,
    ...overrides,
  }
  act(() => {
    root.render(<ReportTopbar {...props} />)
  })
}

/** Radix porta el contenido del menú a `document.body`, fuera de `container`. */
function menuTexts(): string[] {
  return Array.from(document.body.querySelectorAll('[role="menuitem"]')).map(
    (el) => el.textContent ?? '',
  )
}

async function openExportMenu() {
  const trigger = Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('Exportar'),
  )
  if (!trigger) throw new Error('sin trigger «Exportar»')
  await act(async () => {
    trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }))
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('ReportTopbar — canExport (T-0007)', () => {
  it('canExport:true muestra «Imprimir» en el menú Exportar', async () => {
    render({ canExport: true })
    await openExportMenu()
    expect(menuTexts().some((t) => t.includes('Imprimir'))).toBe(true)
  })

  it('canExport:false no ofrece «Imprimir» en el menú Exportar', async () => {
    render({ canExport: false })
    await openExportMenu()
    expect(menuTexts().some((t) => t.includes('Imprimir'))).toBe(false)
  })
})

describe('ReportTopbar — canVerify (T-0007)', () => {
  it('canVerify:true y hashShort presente ⇒ el chip del sello se ofrece', () => {
    render({ canVerify: true, hashShort: 'abc123def456' })
    expect(container.querySelector('a[href="#sello-verificacion"]')).toBeTruthy()
  })

  it('canVerify:false ⇒ el chip del sello NO se ofrece aunque haya hashShort', () => {
    render({ canVerify: false, hashShort: 'abc123def456' })
    expect(container.querySelector('a[href="#sello-verificacion"]')).toBeNull()
    expect(container.querySelector('[data-seal-chip]')).toBeNull()
  })
})

describe('ReportTopbar — canDownloadPdf ya gateado por downloadHref (sin cambios)', () => {
  it('downloadHref:null ⇒ «Descargar el PDF» queda deshabilitado', () => {
    render({ downloadHref: null })
    const btn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Descargar el PDF'),
    )
    expect(btn?.hasAttribute('disabled')).toBe(true)
  })
})
