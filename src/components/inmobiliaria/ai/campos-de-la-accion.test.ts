/**
 * Los campos que una acción declara (02-10-2026): validar con los topes del
 * micro y armar el cuerpo con sus claves. «Resolver» mandaba `{ reason }` y el
 * micro pide `{ category, resolution_text }`: 400 siempre.
 */
import { describe, expect, it } from 'vitest'
import type { CampoDeLaAccion } from '@/lib/api/work-item'
import {
  CONFIRMADO,
  FALTA_CONFIRMAR,
  cambiarValor,
  camposDeLaAccion,
  camposVisibles,
  cuerpoDeLaAccion,
  errorDelCampo,
  erroresDelCliente,
  esVisible,
  pistaDelCampo,
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
  minimo: 80,
  maximo: 2000,
}
const CAMPOS = [CATEGORIA, TEXTO]

/** La casilla de «Pasa a jurídico», como la declara el micro (02-10-2026). */
const CONFIRMACION: CampoDeLaAccion = {
  nombre: 'confirmacion_de_juridico',
  etiqueta: 'Entiendo que el deudor pasa a cobro prejurídico.',
  tipo: 'confirmacion',
  obligatorio: true,
  visibleSi: { campo: 'category', valor: 'escalated-to-legal' },
  aviso: 'Al cerrar como «Pasa a jurídico», el deudor avanza automáticamente a la etapa prejurídica.',
}
const CAMPOS_CON_JURIDICO = [CATEGORIA, CONFIRMACION, TEXTO]

/** Un detalle de más de 80 caracteres (el mínimo del micro). */
const DETALLE = 'Pagará el 15 de octubre el saldo completo por transferencia; queda pendiente que mande el comprobante.'

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
    expect(cuerpoDeLaAccion([TEXTO, nota], { resolution_text: DETALLE, note: '  ' })).toEqual({
      resolution_text: DETALLE,
    })
  })

  it('🔴 el cuerpo lleva las claves del micro (no `reason`), con el texto limpio', () => {
    const cuerpo = cuerpoDeLaAccion(CAMPOS, { category: 'compromise', resolution_text: `  ${DETALLE}  ` })
    expect(cuerpo).toEqual({ category: 'compromise', resolution_text: DETALLE })
    expect('reason' in cuerpo).toBe(false)
  })
})

// 02-10-2026 (decisión de Nico): el detalle pide al menos 80 caracteres en
// todos los caminos; el mínimo lo declara el micro y la cola lo muestra como
// pista, igual que el modal de escalaciones.
describe('campos de la acción — el mínimo de 80 en el detalle', () => {
  it('79 caracteres (sin los espacios a los lados) no pasan; 80 sí', () => {
    expect(errorDelCampo(TEXTO, `  ${'a'.repeat(79)}  `)).toBe('«Cómo se resolvió» debe tener al menos 80 caracteres.')
    expect(errorDelCampo(TEXTO, 'a'.repeat(80))).toBeUndefined()
  })

  it('la pista dice el mínimo («Mínimo 80 caracteres»); un mínimo de 1 no es pista', () => {
    expect(pistaDelCampo(TEXTO)).toBe('Mínimo 80 caracteres')
    expect(pistaDelCampo({ ...TEXTO, minimo: 1 })).toBeUndefined()
    expect(pistaDelCampo({ ...TEXTO, minimo: undefined })).toBeUndefined()
    expect(pistaDelCampo(CATEGORIA)).toBeUndefined()
  })
})

// 02-10-2026 (decisión de Nico): «Pasa a jurídico» pide en la cola la misma
// casilla que el modal de escalaciones. Es una compuerta del cliente: el
// cuerpo de resolve es `.strict()` y no la recibe.
describe('campos de la acción — la casilla de «Pasa a jurídico»', () => {
  it('sólo se ve con «Pasa a jurídico» elegida', () => {
    expect(esVisible(CONFIRMACION, { category: '' })).toBe(false)
    expect(esVisible(CONFIRMACION, { category: 'compromise' })).toBe(false)
    expect(esVisible(CONFIRMACION, { category: 'escalated-to-legal' })).toBe(true)
    expect(camposVisibles(CAMPOS_CON_JURIDICO, { category: 'other' }).map((c) => c.nombre)).toEqual([
      'category',
      'resolution_text',
    ])
    expect(camposVisibles(CAMPOS_CON_JURIDICO, { category: 'escalated-to-legal' }).map((c) => c.nombre)).toEqual([
      'category',
      'confirmacion_de_juridico',
      'resolution_text',
    ])
  })

  it('🔴 con jurídico y sin marcar, no se puede enviar: «Confirma…» bajo la casilla, en su orden', () => {
    const valores = { category: 'escalated-to-legal', confirmacion_de_juridico: '', resolution_text: DETALLE }
    const { porCampo, orden } = erroresDelCliente(CAMPOS_CON_JURIDICO, valores)
    expect(orden).toEqual(['confirmacion_de_juridico'])
    expect(porCampo.confirmacion_de_juridico).toBe(FALTA_CONFIRMAR)
    expect(FALTA_CONFIRMAR).toMatch(/^Confirma /)
    // Marcada, pasa.
    expect(
      erroresDelCliente(CAMPOS_CON_JURIDICO, { ...valores, confirmacion_de_juridico: CONFIRMADO }).orden,
    ).toEqual([])
  })

  it('oculta no se valida: con otra categoría, la casilla sin marcar no estorba', () => {
    const { orden } = erroresDelCliente(CAMPOS_CON_JURIDICO, {
      category: 'compromise',
      confirmacion_de_juridico: '',
      resolution_text: DETALLE,
    })
    expect(orden).toEqual([])
  })

  it('🔴 nunca viaja en el cuerpo (marcada o no), ni un campo oculto', () => {
    const marcada = cuerpoDeLaAccion(CAMPOS_CON_JURIDICO, {
      category: 'escalated-to-legal',
      confirmacion_de_juridico: CONFIRMADO,
      resolution_text: DETALLE,
    })
    expect(marcada).toEqual({ category: 'escalated-to-legal', resolution_text: DETALLE })
    const oculto: CampoDeLaAccion = { ...TEXTO, nombre: 'nota_legal', visibleSi: { campo: 'category', valor: 'escalated-to-legal' } }
    expect(
      cuerpoDeLaAccion([CATEGORIA, oculto], { category: 'compromise', nota_legal: 'no debe viajar' }),
    ).toEqual({ category: 'compromise' })
  })

  it('al cambiar la categoría, la casilla se desmarca (y no si la categoría no cambió)', () => {
    const marcada = { category: 'escalated-to-legal', confirmacion_de_juridico: CONFIRMADO, resolution_text: DETALLE }
    expect(cambiarValor(CAMPOS_CON_JURIDICO, marcada, 'category', 'compromise').confirmacion_de_juridico).toBe('')
    expect(
      cambiarValor(CAMPOS_CON_JURIDICO, marcada, 'category', 'escalated-to-legal').confirmacion_de_juridico,
    ).toBe(CONFIRMADO)
    // Escribir el detalle no la toca.
    expect(cambiarValor(CAMPOS_CON_JURIDICO, marcada, 'resolution_text', 'otro').confirmacion_de_juridico).toBe(
      CONFIRMADO,
    )
  })
})

describe('campos de la acción — un `tipo` que esta versión no conoce', () => {
  const RARO = { nombre: 'firma', etiqueta: 'Firma', tipo: 'dibujo', obligatorio: true } as unknown as CampoDeLaAccion

  it('no se pinta (no queda entre los campos de la acción) ni viaja ni bloquea', () => {
    expect(camposDeLaAccion({ campos: [CATEGORIA, RARO, TEXTO] }).map((c) => c.nombre)).toEqual([
      'category',
      'resolution_text',
    ])
    expect(tieneCampos({ campos: [RARO] })).toBe(false)
    expect(errorDelCampo(RARO, '')).toBeUndefined()
    expect(cuerpoDeLaAccion([CATEGORIA, RARO], { category: 'other', firma: 'x' })).toEqual({ category: 'other' })
  })
})
