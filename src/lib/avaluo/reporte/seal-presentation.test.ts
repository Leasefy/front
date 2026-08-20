/**
 * seal-presentation.test.ts — qué dice el sello para cada veredicto del servidor.
 */

import { describe, it, expect } from 'vitest'
import { FIXTURE_SLUG, FIXTURE_VIEW } from './fixture-muestra'
import type { SealBlock } from './report-model'
import { formatSealTimestamp } from './report-format'
import {
  SERVED_HASH,
  SERVED_VERIFY_BASE,
  SERVED_VERIFY_URL,
  buildServedFixture,
  servedRender,
  servedSeal,
} from './report-serve.fixture'
import { SEAL_HEADLINE, deriveVerifyUrlFor, resolveSealPresentation } from './seal-presentation'

function sealBlockOf(view: { sections: typeof FIXTURE_VIEW.sections }): SealBlock {
  const block = view.sections['sello-verificacion'].blocks.find((b) => b.kind === 'seal')
  if (block?.kind !== 'seal') throw new Error('la fixture no tiene bloque seal')
  return block
}

const SAMPLE_BLOCK = sealBlockOf(FIXTURE_VIEW)
const SERVED_BLOCK = sealBlockOf(buildServedFixture())

describe('resolveSealPresentation — la muestra (sin render)', () => {
  const p = resolveSealPresentation(SAMPLE_BLOCK, null, FIXTURE_SLUG)

  it('se declara de muestra: sin veredicto, enlace inerte, con la nota', () => {
    expect(p.sample).toBe(true)
    expect(p.tone).toBe('neutral')
    expect(p.headline).toBe(SEAL_HEADLINE.sample)
    expect(p.verifyUrlEnabled).toBe(false)
    expect(p.checkedAtIso).toBeNull()
    expect(p.chain).toBeNull()
    expect(p.hashFull).toBeNull()
    expect(p.hashShort).toBe('3f9a41c7d20b')
    expect(p.note).toContain('Sin verificación real')
    expect(p.signedBy).toBeNull()
  })
})

describe('resolveSealPresentation — veredictos reales', () => {
  it('valid ⇒ positivo, «Verificado…», con reloj, hash completo y firmante', () => {
    const p = resolveSealPresentation(SERVED_BLOCK, servedRender(), FIXTURE_SLUG)
    expect(p.sample).toBe(false)
    expect(p.tone).toBe('positive')
    expect(p.headline).toBe('Verificado: el documento servido coincide con el sello')
    expect(p.checkedAtIso).toBe(servedRender().nowIso)
    expect(p.hashFull).toBe(SERVED_HASH)
    expect(p.hashShort).toBe(SERVED_HASH.slice(0, 12))
    expect(p.signedBy).toBe('Revisor de Muestra (demo)')
    expect(p.verifyUrl).toBe(SERVED_VERIFY_URL)
    expect(p.verifyUrlEnabled).toBe(true)
    expect(p.chain).toEqual({
      status: 'VIGENTE',
      tone: 'positive',
      supersededBy: null,
      supersededVerifyUrl: null,
    })
  })

  it('altered ⇒ negativo y explícito, nunca suavizado', () => {
    const p = resolveSealPresentation(
      SERVED_BLOCK,
      servedRender({ seal: servedSeal({ state: 'altered', tamperVerdict: 'alterado' }) }),
      FIXTURE_SLUG,
    )
    expect(p.tone).toBe('negative')
    expect(p.headline).toBe('Alterado: los bytes servidos NO coinciden con el sello')
    expect(p.detail).toContain('no es el que se firmó')
  })

  it('not_found y unavailable comparten el MISMO mensaje neutral', () => {
    const notFound = resolveSealPresentation(
      SERVED_BLOCK,
      servedRender({ seal: servedSeal({ state: 'not_found', tamperVerdict: 'desconocido', chainStatus: null }) }),
      FIXTURE_SLUG,
    )
    const unavailable = resolveSealPresentation(
      SERVED_BLOCK,
      servedRender({ seal: servedSeal({ state: 'unavailable', tamperVerdict: 'desconocido', chainStatus: null }) }),
      FIXTURE_SLUG,
    )
    expect(notFound.headline).toBe('Verificación no disponible en este momento')
    expect(unavailable.headline).toBe(notFound.headline)
    expect(unavailable.detail).toBe(notFound.detail)
    expect(unavailable.tone).toBe('neutral')
    expect(notFound.tone).toBe('neutral')
    expect(notFound.chain).toBeNull()
  })

  it('VENCIDO ⇒ advertencia', () => {
    const vencido = resolveSealPresentation(
      SERVED_BLOCK,
      servedRender({ seal: servedSeal({ chainStatus: 'VENCIDO' }) }),
      FIXTURE_SLUG,
    )
    expect(vencido.chain?.tone).toBe('warning')
  })

  it('con el documento alterado la cadena VIGENTE se informa en neutro (no compite con el veredicto)', () => {
    const alterado = resolveSealPresentation(
      SERVED_BLOCK,
      servedRender({ seal: servedSeal({ state: 'altered', tamperVerdict: 'alterado', chainStatus: 'VIGENTE' }) }),
      FIXTURE_SLUG,
    )
    expect(alterado.tone).toBe('negative')
    expect(alterado.chain?.status).toBe('VIGENTE')
    expect(alterado.chain?.tone).toBe('neutral')
    // Vencido sigue siendo advertencia: es información propia, no color de adorno.
    const alteradoVencido = resolveSealPresentation(
      SERVED_BLOCK,
      servedRender({ seal: servedSeal({ state: 'altered', tamperVerdict: 'alterado', chainStatus: 'VENCIDO' }) }),
      FIXTURE_SLUG,
    )
    expect(alteradoVencido.chain?.tone).toBe('warning')
  })

  it('REEMPLAZADO ⇒ neutral con enlace derivado al reemplazo', () => {
    const reemplazado = resolveSealPresentation(
      SERVED_BLOCK,
      servedRender({ seal: servedSeal({ chainStatus: 'REEMPLAZADO', supersededBy: 'nuevo-slug' }) }),
      FIXTURE_SLUG,
    )
    expect(reemplazado.chain).toEqual({
      status: 'REEMPLAZADO',
      tone: 'neutral',
      supersededBy: 'nuevo-slug',
      supersededVerifyUrl: `${SERVED_VERIFY_BASE}/nuevo-slug`,
    })
  })

  it('si la verifyUrl no termina en el slug actual, el reemplazo queda como texto', () => {
    const p = resolveSealPresentation(
      SERVED_BLOCK,
      servedRender({
        seal: servedSeal({
          chainStatus: 'REEMPLAZADO',
          supersededBy: 'nuevo-slug',
          verifyUrl: 'https://verify.test/?doc=abc',
        }),
      }),
      FIXTURE_SLUG,
    )
    expect(p.chain?.supersededBy).toBe('nuevo-slug')
    expect(p.chain?.supersededVerifyUrl).toBeNull()
  })

  it('sin hash corto en el bloque, lo deriva del completo', () => {
    const p = resolveSealPresentation(
      { ...SERVED_BLOCK, certContentHashCorto: null },
      servedRender(),
      FIXTURE_SLUG,
    )
    expect(p.hashShort).toBe(SERVED_HASH.slice(0, 12))
  })
})

describe('deriveVerifyUrlFor', () => {
  it('reemplaza el último segmento cuando coincide con el slug actual', () => {
    expect(deriveVerifyUrlFor('https://v.test/verify/a', 'a', 'b c')).toBe('https://v.test/verify/b%20c')
  })
  it('devuelve null si no puede asegurar la forma', () => {
    expect(deriveVerifyUrlFor('https://v.test/verify/a', 'x', 'b')).toBeNull()
    expect(deriveVerifyUrlFor('https://v.test/verify/a', '', 'b')).toBeNull()
    expect(deriveVerifyUrlFor('https://v.test/verify/a', 'a', '')).toBeNull()
  })
})

describe('formatSealTimestamp', () => {
  it('imprime fecha, hora y zona de Bogotá, no la del servidor', () => {
    const text = formatSealTimestamp('2026-08-14T15:22:00.000Z')
    expect(text).not.toBeNull()
    expect(text).toContain('2026')
    expect(text).toContain('10:22')
    // La zona va escrita (COT o GMT-5 según la ICU del runtime).
    expect(/COT|GMT-5|-05/.test(text ?? '')).toBe(true)
  })
  it('devuelve null con un ISO ilegible', () => {
    expect(formatSealTimestamp('ayer')).toBeNull()
  })
})
