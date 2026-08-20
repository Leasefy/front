/**
 * SealBlock.test.tsx — la tarjeta del sello, renderizada de verdad.
 *
 * Tres estados reales más la muestra; la cadena; el QR dibujado desde la
 * matriz (`size×size` con zona de silencio y los rects exactos para una matriz
 * chica conocida); el enlace al verificador real en pestaña nueva; y que
 * «Copiar» copia el hash COMPLETO, no el corto.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

void React // jsx-preserve

import { FIXTURE_SLUG, FIXTURE_VIEW } from '@/lib/avaluo/reporte/fixture-muestra'
import type { ReportRender, SealBlock } from '@/lib/avaluo/reporte/report-model'
import {
  SERVED_HASH,
  SERVED_VERIFY_BASE,
  SERVED_VERIFY_URL,
  buildServedFixture,
  servedRender,
  servedSeal,
} from '@/lib/avaluo/reporte/report-serve.fixture'
import { QrMatrix, QR_QUIET_ZONE } from './QrMatrix'
import { SealBlockView } from './SealBlock'

function sealBlockOf(view: { sections: typeof FIXTURE_VIEW.sections }): SealBlock {
  const block = view.sections['sello-verificacion'].blocks.find((b) => b.kind === 'seal')
  if (block?.kind !== 'seal') throw new Error('sin bloque seal')
  return block
}

const SAMPLE_BLOCK = sealBlockOf(FIXTURE_VIEW)
const SERVED_BLOCK = sealBlockOf(buildServedFixture())

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
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function renderSeal(
  block: SealBlock,
  render: ReportRender | null,
  slug = FIXTURE_SLUG,
  canVerify = true,
) {
  act(() => {
    root.render(<SealBlockView block={block} seal={{ slug, render, canVerify }} />)
  })
}

describe('SealBlockView — veredicto valid', () => {
  beforeEach(() => renderSeal(SERVED_BLOCK, servedRender()))

  it('lo dice en positivo, con icono + texto, y marca el estado', () => {
    const card = container.querySelector('[data-seal-state]')
    expect(card?.getAttribute('data-seal-state')).toBe('valid')
    expect(container.textContent).toContain('Verificado: el documento servido coincide con el sello')
    expect(container.querySelector('[data-seal-verdict] svg')).toBeTruthy()
    expect(container.querySelector('[data-seal-verdict]')?.className).toContain('bg-success-soft')
  })

  it('pinta la cadena VIGENTE', () => {
    expect(container.querySelector('[data-seal-chain]')?.getAttribute('data-seal-chain')).toBe('VIGENTE')
  })

  it('emisor, firmado el (con hora y zona), firmado por (PII), vigente hasta, método', () => {
    const texto = container.textContent ?? ''
    expect(texto).toContain('Portofino')
    expect(texto).toContain('Firmado el')
    expect(texto).toContain('10:22')
    expect(texto).toContain('Firmado por')
    expect(texto).toContain('Revisor de Muestra (demo)')
    expect(texto).toContain('Vigente hasta')
    expect(texto).toContain('comparación de mercado')
    // El firmante es dato personal: no sale al imprimir.
    const pii = Array.from(container.querySelectorAll('[data-pii-field]'))
    expect(pii.some((el) => el.textContent?.includes('Revisor de Muestra'))).toBe(true)
  })

  it('valor y banda sellados', () => {
    const texto = container.textContent ?? ''
    expect(texto).toContain('519.853.230')
    expect(texto).toContain('467.867.907')
    expect(texto).toContain('571.838.553')
  })

  it('hash corto visible, completo en el details, y «Copiar» copia el COMPLETO', async () => {
    expect(container.querySelector('[data-seal-hash-short]')?.textContent).toBe(SERVED_HASH.slice(0, 12))
    expect(container.querySelector('[data-seal-hash-full]')?.textContent).toBe(SERVED_HASH)

    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })

    const button = container.querySelector('button[aria-label="Copiar la huella completa"]')
    expect(button).toBeTruthy()
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(writeText).toHaveBeenCalledWith(SERVED_HASH)
    expect(button?.textContent).toContain('Copiado')
  })

  it('el enlace al verificador es el REAL, en pestaña nueva y sin opener', () => {
    const link = container.querySelector('a[data-seal-verify-link]')
    expect(link?.getAttribute('href')).toBe(SERVED_VERIFY_URL)
    expect(link?.getAttribute('target')).toBe('_blank')
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer')
    expect(link?.textContent).toContain('Abrir el verificador')
  })

  it('dibuja el QR desde la matriz con role="img" y su etiqueta', () => {
    const svg = container.querySelector('svg[role="img"][aria-label="Código QR del verificador público"]')
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute('data-qr-size')).toBe('21')
    expect(svg?.querySelectorAll('rect').length).toBeGreaterThan(0)
  })

  it('muestra cuándo se comprobó (reloj del servidor)', () => {
    expect(container.textContent).toContain('Comprobado el')
  })
})

describe('SealBlockView — veredicto altered', () => {
  it('lo dice en negativo y no lo esconde', () => {
    renderSeal(SERVED_BLOCK, servedRender({ seal: servedSeal({ state: 'altered', tamperVerdict: 'alterado' }) }))
    expect(container.querySelector('[data-seal-state]')?.getAttribute('data-seal-state')).toBe('altered')
    expect(container.textContent).toContain('Alterado: los bytes servidos NO coinciden con el sello')
    expect(container.querySelector('[data-seal-verdict]')?.className).toContain('bg-danger-soft')
    // El enlace al verificador sigue: es la forma de comprobarlo por fuera.
    expect(container.querySelector('a[data-seal-verify-link]')?.getAttribute('href')).toBe(SERVED_VERIFY_URL)
  })
})

describe('SealBlockView — veredicto no disponible', () => {
  it.each(['not_found', 'unavailable'] as const)('%s ⇒ neutral, sin decir cuál falló', (state) => {
    renderSeal(
      SERVED_BLOCK,
      servedRender({ seal: servedSeal({ state, tamperVerdict: 'desconocido', chainStatus: null }) }),
    )
    const texto = container.textContent ?? ''
    expect(texto).toContain('Verificación no disponible en este momento')
    expect(texto).not.toContain('not_found')
    expect(texto).not.toContain('unavailable')
    expect(container.querySelector('[data-seal-verdict]')?.className).toContain('bg-surface-muted')
    expect(container.querySelector('[data-seal-chain]')).toBeNull()
  })
})

describe('SealBlockView — cadena', () => {
  it('VENCIDO en tono de advertencia', () => {
    renderSeal(SERVED_BLOCK, servedRender({ seal: servedSeal({ chainStatus: 'VENCIDO' }) }))
    const chip = container.querySelector('[data-seal-chain="VENCIDO"]')
    expect(chip).toBeTruthy()
    expect(chip?.className).toContain('text-warning')
  })

  it('REEMPLAZADO con enlace al verificador del reemplazo', () => {
    renderSeal(
      SERVED_BLOCK,
      servedRender({ seal: servedSeal({ chainStatus: 'REEMPLAZADO', supersededBy: 'nuevo-slug' }) }),
    )
    expect(container.querySelector('[data-seal-chain="REEMPLAZADO"]')).toBeTruthy()
    const link = Array.from(container.querySelectorAll('a')).find((a) =>
      a.textContent?.includes('reemplaza'),
    )
    expect(link?.getAttribute('href')).toBe(`${SERVED_VERIFY_BASE}/nuevo-slug`)
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('REEMPLAZADO sin enlace derivable ⇒ texto con el slug', () => {
    renderSeal(
      SERVED_BLOCK,
      servedRender({
        seal: servedSeal({
          chainStatus: 'REEMPLAZADO',
          supersededBy: 'nuevo-slug',
          verifyUrl: 'https://v.test/?doc=x',
        }),
      }),
    )
    expect(container.textContent).toContain('Reemplazado por')
    expect(container.textContent).toContain('nuevo-slug')
  })
})

describe('SealBlockView — la muestra (sin render)', () => {
  beforeEach(() => renderSeal(SAMPLE_BLOCK, null))

  it('se declara de muestra y no finge una verificación', () => {
    expect(container.querySelector('[data-seal-state]')?.getAttribute('data-seal-state')).toBe('sample')
    const texto = container.textContent ?? ''
    expect(texto).toContain('Sin verificación real')
    expect(texto).toContain('3f9a41c7d20b')
    expect(texto).toContain('inactivo en esta muestra')
    expect(texto).not.toContain('Verificado:')
    expect(container.querySelector('a[data-seal-verify-link]')).toBeNull()
    expect(container.querySelector('svg[role="img"]')).toBeNull()
    expect(container.querySelector('button')).toBeNull()
  })
})

describe('SealBlockView — canVerify:false (T-0007, delivery denegado)', () => {
  beforeEach(() => renderSeal(SERVED_BLOCK, servedRender(), FIXTURE_SLUG, false))

  it('no ofrece el enlace al verificador aunque el wire lo traiga habilitado', () => {
    expect(container.querySelector('a[data-seal-verify-link]')).toBeNull()
  })

  it('no dibuja el QR', () => {
    expect(container.querySelector('svg[role="img"]')).toBeNull()
  })

  it('no ofrece «Copiar» ni el hash completo en el details', () => {
    expect(container.querySelector('button[aria-label="Copiar la huella completa"]')).toBeNull()
    expect(container.querySelector('[data-seal-hash-full]')).toBeNull()
    expect(container.querySelector('details')).toBeNull()
  })

  it('el veredicto y el hash corto SIGUEN visibles: leer los datos no se gatea', () => {
    expect(container.textContent).toContain('Verificado: el documento servido coincide con el sello')
    expect(container.querySelector('[data-seal-hash-short]')?.textContent).toBe(SERVED_HASH.slice(0, 12))
  })
})

describe('QrMatrix', () => {
  it('dibuja size×size más zona de silencio, y un rect por módulo oscuro', () => {
    const qr = { size: 3, rows: ['101', '010', '100'] }
    act(() => {
      root.render(<QrMatrix qr={qr} label="qr de prueba" />)
    })
    const svg = container.querySelector('svg')
    const side = 3 + QR_QUIET_ZONE * 2
    expect(svg?.getAttribute('viewBox')).toBe(`${-QR_QUIET_ZONE} ${-QR_QUIET_ZONE} ${side} ${side}`)
    expect(svg?.getAttribute('role')).toBe('img')
    expect(svg?.getAttribute('aria-label')).toBe('qr de prueba')

    const rects = Array.from(container.querySelectorAll('rect')).map((r) => ({
      x: r.getAttribute('x'),
      y: r.getAttribute('y'),
      w: r.getAttribute('width'),
      h: r.getAttribute('height'),
      fill: r.getAttribute('fill'),
    }))
    expect(rects).toEqual([
      { x: '0', y: '0', w: '1', h: '1', fill: 'currentColor' },
      { x: '2', y: '0', w: '1', h: '1', fill: 'currentColor' },
      { x: '1', y: '1', w: '1', h: '1', fill: 'currentColor' },
      { x: '0', y: '2', w: '1', h: '1', fill: 'currentColor' },
    ])
    // Sin hex hardcoded: color por token, módulos en currentColor.
    expect(svg?.className.baseVal ?? svg?.getAttribute('class')).toContain('text-ink')
    expect(svg?.getAttribute('class')).toContain('bg-ink-fg')
  })
})
