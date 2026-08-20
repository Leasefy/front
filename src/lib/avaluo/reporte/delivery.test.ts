/**
 * delivery.test.ts — el único lugar donde se resuelven las capacidades de
 * entrega (T-0007). `resolveDelivery` es el gate: todo lo que la landing
 * muestra u oculta pasa por acá, nunca por una lectura suelta de `delivery`.
 */

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { servedFixtureJson } from './report-serve.fixture'
import { parseReportServeResponse } from './report-serve.schema'
import { FALLBACK_ESTIMATE_NOTICE } from './delivery-copy'
import { DENIED, resolveDelivery } from './delivery'

const SAMPLE_JSON_PATH = resolve(dirname(fileURLToPath(import.meta.url)), 'report-serve.sample.json')

function parsedFor(deliveryOverride: unknown) {
  const json = servedFixtureJson()
  const withDelivery = { ...(json as Record<string, unknown>), delivery: deliveryOverride }
  const result = parseReportServeResponse(withDelivery)
  if (!result.ok) throw new Error(`fixture inválida: ${result.issues.join('\n')}`)
  return result.view
}

describe('DENIED', () => {
  it('niega todo y usa el fallback pinneado', () => {
    expect(DENIED).toEqual({
      signoffState: null,
      released: false,
      canDownloadPdf: false,
      canVerify: false,
      canExport: false,
      estimateNotice: FALLBACK_ESTIMATE_NOTICE,
    })
  })
})

describe('resolveDelivery — delivery ausente', () => {
  it('sin delivery en absoluto ⇒ DENIED', () => {
    const json = servedFixtureJson() as Record<string, unknown>
    delete json.delivery
    const result = parseReportServeResponse(json)
    if (!result.ok) throw new Error('fixture inválida')
    expect(resolveDelivery(result.view)).toEqual(DENIED)
  })

  it('report-serve.sample.json (sin tocar, D-5) ⇒ DENIED — la regresión fail-closed', () => {
    if (!existsSync(SAMPLE_JSON_PATH)) return
    const json: unknown = JSON.parse(readFileSync(SAMPLE_JSON_PATH, 'utf8'))
    const result = parseReportServeResponse(json)
    if (!result.ok) throw new Error(`sample inválida: ${result.issues.join('\n')}`)
    expect(resolveDelivery(result.view)).toEqual(DENIED)
  })
})

describe('resolveDelivery — released:false', () => {
  it('re-clampa todas las capacidades a false y usa el aviso del propio delivery', () => {
    const view = parsedFor({
      signoffState: 'en_revisión',
      released: false,
      // Un productor manirroto que dejara alguna en true: el consumidor las
      // vuelve a negar igual (belt-and-braces, T-0007 §3.2.3).
      canDownloadPdf: true,
      canVerify: true,
      canExport: true,
      estimateNotice: 'Aviso real del productor.',
    })
    expect(resolveDelivery(view)).toEqual({
      signoffState: 'en_revisión',
      released: false,
      canDownloadPdf: false,
      canVerify: false,
      canExport: false,
      estimateNotice: 'Aviso real del productor.',
    })
  })

  it('estimateNotice null pese a released:false ⇒ usa el fallback, nunca deja el aviso vacío', () => {
    const view = parsedFor({
      signoffState: 'borrador',
      released: false,
      canDownloadPdf: false,
      canVerify: false,
      canExport: false,
      estimateNotice: null,
    })
    expect(resolveDelivery(view).estimateNotice).toBe(FALLBACK_ESTIMATE_NOTICE)
  })
})

describe('resolveDelivery — released:true', () => {
  it('deja pasar las capacidades del productor', () => {
    const view = parsedFor({
      signoffState: 'entregado',
      released: true,
      canDownloadPdf: true,
      canVerify: true,
      canExport: true,
      estimateNotice: null,
    })
    expect(resolveDelivery(view)).toEqual({
      signoffState: 'entregado',
      released: true,
      canDownloadPdf: true,
      canVerify: true,
      canExport: true,
      estimateNotice: null,
    })
  })

  it('canVerify es el AND con meta.verifyUrlEnabled (defensa en profundidad)', () => {
    const json = servedFixtureJson() as Record<string, unknown>
    ;(json.meta as Record<string, unknown>).verifyUrlEnabled = false
    json.delivery = {
      signoffState: 'firmado',
      released: true,
      canDownloadPdf: true,
      canVerify: true,
      canExport: true,
      estimateNotice: null,
    }
    const result = parseReportServeResponse(json)
    if (!result.ok) throw new Error('fixture inválida')
    expect(resolveDelivery(result.view).canVerify).toBe(false)
  })

  it('canDownloadPdf false (no pagado) se respeta tal cual', () => {
    const view = parsedFor({
      signoffState: 'firmado',
      released: true,
      canDownloadPdf: false,
      canVerify: true,
      canExport: true,
      estimateNotice: null,
    })
    expect(resolveDelivery(view).canDownloadPdf).toBe(false)
  })
})
