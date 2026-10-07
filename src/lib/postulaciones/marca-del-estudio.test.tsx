/**
 * 🔴 El estudio es OPCIONAL (Nico, 04-10-2026): la postulación entra sin él y
 * la inmobiliaria la ve marcada; al aprobar una marcada se pide confirmar.
 */
import { describe, expect, it } from 'vitest'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { formatCurrency } from '@/lib/format'
import { avisoAlAprobar, textoDeLaMarca } from './marca-del-estudio'
import { ChipDeLaMarcaDelEstudio } from '@/components/inmobiliaria/MarcaDelEstudio'

describe('textoDeLaMarca', () => {
  it.each([
    [{ codigo: 'SIN_ESTUDIO', respaldoCop: null }, 'Sin estudio'],
    [{ codigo: 'ESTUDIO_EN_CURSO', respaldoCop: null }, 'Estudio en curso'],
    [{ codigo: 'ESTUDIO_VENCIDO', respaldoCop: null }, 'Estudio vencido'],
  ] as const)('%o → %s', (marca, texto) => {
    expect(textoDeLaMarca(marca)).toBe(texto)
  })

  it('canon por encima del respaldo, con el respaldo en plata de la casa', () => {
    expect(textoDeLaMarca({ codigo: 'CANON_SOBRE_RESPALDO', respaldoCop: 3_200_000 })).toBe(
      `Canon por encima de su respaldo (${formatCurrency(3_200_000)})`,
    )
  })

  it('sin marca, nada', () => {
    expect(textoDeLaMarca(null)).toBeNull()
    expect(textoDeLaMarca(undefined)).toBeNull()
  })
})

describe('avisoAlAprobar', () => {
  it('sin estudio: la frase de Nico', () => {
    expect(avisoAlAprobar({ codigo: 'SIN_ESTUDIO', respaldoCop: null })).toBe(
      'Esta persona no tiene estudio de arrendamiento. ¿Aprobarla igual?',
    )
  })

  it('cada marca dice qué falta y pregunta', () => {
    for (const codigo of ['ESTUDIO_EN_CURSO', 'ESTUDIO_VENCIDO', 'CANON_SOBRE_RESPALDO'] as const) {
      const aviso = avisoAlAprobar({ codigo, respaldoCop: codigo === 'CANON_SOBRE_RESPALDO' ? 0 : null })
      expect(aviso).toMatch(/¿Aprobarla igual\?$/)
    }
  })

  it('sin marca se aprueba como siempre', () => {
    expect(avisoAlAprobar(null)).toBeNull()
  })
})

describe('ChipDeLaMarcaDelEstudio', () => {
  const pintar = (el: React.ReactElement) => renderToStaticMarkup(el)

  it('con marca pinta el chip', () => {
    expect(pintar(<ChipDeLaMarcaDelEstudio marca={{ codigo: 'SIN_ESTUDIO', respaldoCop: null }} />)).toContain(
      'Sin estudio',
    )
  })

  it('sin marca (null): nada, o «Con estudio» en la columna', () => {
    expect(pintar(<ChipDeLaMarcaDelEstudio marca={null} />)).toBe('')
    expect(pintar(<ChipDeLaMarcaDelEstudio marca={null} conEstudio />)).toContain('Con estudio')
  })

  it('sin el dato del servidor (undefined) NO afirma «Con estudio»', () => {
    expect(pintar(<ChipDeLaMarcaDelEstudio marca={undefined} conEstudio />)).not.toContain('Con estudio')
  })
})
