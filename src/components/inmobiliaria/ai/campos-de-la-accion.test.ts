/**
 * Los campos que una acción declara (02-10-2026): validar con los topes del
 * micro y armar el cuerpo con sus claves. «Resolver» mandaba `{ reason }` y el
 * micro pide `{ category, resolution_text }`: 400 siempre.
 */
import { describe, expect, it } from 'vitest'
import type { CampoDeLaAccion } from '@/lib/api/work-item'
import {
  camposDeLaAccion,
  cuerpoDeLaAccion,
  errorDelCampo,
  erroresDelCliente,
  tieneCampos,
  valoresIniciales,
} from './campos-de-la-accion'

const CATEGORIA: CampoDeLaAccion = {
  nombre: 'category',
  etiqueta: 'Categoría',
  tipo: 'opcion',
  obligatorio: true,
  opciones: [
    { valor: 'compromise', etiqueta: 'Acuerdo de pago' },
    { valor: 'customer-rejected', etiqueta: 'El cliente lo rechazó' },
    { valor: 'escalated-to-legal', etiqueta: 'Pasa a jurídico' },
    { valor: 'false-positive', etiqueta: 'Falso positivo' },
    { valor: 'other', etiqueta: 'Otro' },
  ],
}
const TEXTO: CampoDeLaAccion = {
  nombre: 'resolution_text',
  etiqueta: 'Cómo se resolvió',
  tipo: 'texto',
  obligatorio: true,
  minimo: 1,
  maximo: 2000,
}
const CAMPOS = [CATEGORIA, TEXTO]

describe('campos de la acción', () => {
  it('reconoce una acción que declara campos (y una que no)', () => {
    expect(tieneCampos({ campos: CAMPOS })).toBe(true)
    expect(tieneCampos({})).toBe(false)
    expect(tieneCampos({ campos: [] })).toBe(false)
    expect(camposDeLaAccion({ campos: [{ ...TEXTO, nombre: '' }] })).toEqual([])
  })

  it('arranca vacío: no elige la categoría por la persona', () => {
    expect(valoresIniciales(CAMPOS)).toEqual({ category: '', resolution_text: '' })
  })

  it('obligatorio: cada campo vacío dice qué falta, en el orden declarado', () => {
    const { porCampo, orden } = erroresDelCliente(CAMPOS, valoresIniciales(CAMPOS))
    expect(orden).toEqual(['category', 'resolution_text'])
    expect(porCampo.category).toBe('Elige una opción en «Categoría».')
    expect(porCampo.resolution_text).toBe('Completa «Cómo se resolvió».')
  })

  it('el texto cuenta sin espacios a los lados, como el micro (`trim`)', () => {
    expect(errorDelCampo(TEXTO, '   ')).toBe('Completa «Cómo se resolvió».')
    expect(errorDelCampo(TEXTO, `  ${'a'.repeat(2000)}  `)).toBeUndefined()
  })

  it('máximo: 2.000 caracteres, con la cifra en español', () => {
    expect(errorDelCampo(TEXTO, 'a'.repeat(2001))).toBe('«Cómo se resolvió» puede tener hasta 2.000 caracteres.')
  })

  it('mínimo: el que declare el micro', () => {
    expect(errorDelCampo({ ...TEXTO, minimo: 10 }, 'corto')).toBe(
      '«Cómo se resolvió» debe tener al menos 10 caracteres.',
    )
  })

  it('una opción que no está entre las declaradas no pasa', () => {
    expect(errorDelCampo(CATEGORIA, 'inventada')).toBe('Elige una de las opciones de «Categoría».')
    expect(errorDelCampo(CATEGORIA, 'other')).toBeUndefined()
  })

  it('un campo opcional vacío no es un error ni viaja en el cuerpo', () => {
    const nota: CampoDeLaAccion = { nombre: 'note', etiqueta: 'Nota', tipo: 'texto', obligatorio: false, maximo: 500 }
    expect(errorDelCampo(nota, '')).toBeUndefined()
    expect(cuerpoDeLaAccion([TEXTO, nota], { resolution_text: 'Listo', note: '  ' })).toEqual({
      resolution_text: 'Listo',
    })
  })

  it('🔴 el cuerpo lleva las claves del micro (no `reason`), con el texto limpio', () => {
    const cuerpo = cuerpoDeLaAccion(CAMPOS, { category: 'compromise', resolution_text: '  Pagará el 15.  ' })
    expect(cuerpo).toEqual({ category: 'compromise', resolution_text: 'Pagará el 15.' })
    expect('reason' in cuerpo).toBe(false)
  })
})
