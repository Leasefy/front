/**
 * El mapeo automático se equivocaba con confianza alta.
 *
 * Medido con encabezados reales de exportaciones inmobiliarias colombianas,
 * ANTES de tocar nada:
 *
 *   Celular arrendatario  →  ownerPhone    (0.92, en pantalla dice «DETECTADO»)
 *   Arrendatario          →  propertyZone  (0.50)
 *   Estrato               →  status        (0.71)
 *   Tipo de negocio       →  propertyType  (0.92)
 *
 * El primero es el grave: **el teléfono del inquilino entrando como el del
 * propietario**, con la confianza más alta que el sistema sabe dar, así que
 * nadie lo revisa. Un campo vacío se nota; uno lleno con el dato de otra
 * persona, no. Después el cobro le llega a quien no es.
 *
 * La causa es el nivel 2 (Levenshtein, umbral 0.5): con la mitad de las
 * letras distintas ya declara parecido. Para un encabezado que NO tiene campo
 * nuestro, «lo más parecido» siempre está mal.
 *
 * Sumar sistemas al selector no arregla nada de esto — por eso estos tests van
 * junto con esa lista, no después.
 */

import { describe, it, expect } from 'vitest'
import { autoMapColumns } from './columnMapping'

/** El campo al que va un encabezado, mirado solo (sin dedup contra otros). */
function campoDe(encabezado: string): string | null {
  return autoMapColumns([encabezado])[0].targetField
}

describe('encabezados sin campo nuestro: mejor nada que cualquier cosa', () => {
  it.each([
    ['Arrendatario', 'es el inquilino, no el propietario'],
    ['Celular arrendatario', 'iba a ownerPhone con 0.92'],
    ['Teléfono inquilino', 'mismo caso'],
    ['Codeudor', 'no es el propietario'],
    ['Fiador', 'no es el propietario'],
    ['Estrato', 'es un número del 1 al 6, iba a status'],
    ['Matrícula inmobiliaria', 'no hay campo'],
    ['Código inmueble', 'identificador del sistema de origen'],
    ['Correo propietario', 'no hay campo de correo; iba a ownerName'],
  ])('%s queda sin mapear (%s)', (encabezado) => {
    expect(campoDe(encabezado)).toBeNull()
  })
})

describe('arrendador ≠ arrendatario: dos letras, sentido opuesto', () => {
  it('Arrendador es el propietario', () => {
    expect(campoDe('Arrendador')).toBe('ownerName')
  })

  it('Arrendatario no es nadie que guardemos', () => {
    expect(campoDe('Arrendatario')).toBeNull()
  })

  it('Teléfono arrendador sí es el del propietario', () => {
    expect(campoDe('Teléfono arrendador')).toBe('ownerPhone')
  })
})

describe('el teléfono del propietario no cae en su nombre', () => {
  // El nivel 1 gana por LONGITUD de palabra clave: cualquier variante
  // «<algo> propietario» tiene que ser más larga que 'propietario' (11) o el
  // número termina en el campo del nombre. Pasó con «Movil propietario».
  it.each([
    'Tel propietario',
    'Teléfono propietario',
    'Celular propietario',
    'Movil propietario',
    'WhatsApp propietario',
    'Contacto propietario',
    'Número propietario',
    'Teléfono del dueño',
  ])('%s → ownerPhone', (encabezado) => {
    expect(campoDe(encabezado)).toBe('ownerPhone')
  })

  it('«Propietario» a secas sigue siendo el nombre', () => {
    expect(campoDe('Propietario')).toBe('ownerName')
  })
})

describe('vocabulario inmobiliario colombiano', () => {
  it.each([
    ['Canon de arrendamiento', 'monthlyRent'],
    ['Valor canon', 'monthlyRent'],
    ['Valor del arriendo', 'monthlyRent'],
    ['Valor administración', 'adminFee'],
    ['Cuota de administración', 'adminFee'],
    ['Área construida', 'propertyArea'],
    ['Área privada', 'propertyArea'],
    ['Mts2', 'propertyArea'],
    ['Comuna', 'propertyZone'],
    ['Municipio', 'propertyCity'],
    ['Número de habitaciones', 'bedrooms'],
    ['Observación', 'notes'],
  ])('%s → %s', (encabezado, campo) => {
    expect(campoDe(encabezado)).toBe(campo)
  })
})

describe('T-0038 §3.8 — nuevas columnas de venta/departamento/consignación', () => {
  it.each([
    ['Tipo de negocio', 'listingType'],
    ['Tipo negocio', 'listingType'],
  ])('%s → %s (ya no bloqueado — contract.md §3.8)', (encabezado, campo) => {
    expect(campoDe(encabezado)).toBe(campo)
  })

  it.each([
    ['Precio de venta', 'salePrice'],
    ['Precio venta', 'salePrice'],
    ['Valor de venta', 'salePrice'],
    ['Valor venta', 'salePrice'],
  ])('%s → %s', (encabezado, campo) => {
    expect(campoDe(encabezado)).toBe(campo)
  })

  it('un "Precio" ambiguo, sin más contexto, sigue cayendo en monthlyRent (degradación por defecto)', () => {
    expect(campoDe('Precio')).toBe('monthlyRent')
  })

  it.each([
    ['Departamento', 'propertyDepartment'],
    ['Departamento del inmueble', 'propertyDepartment'],
  ])('%s → %s', (encabezado, campo) => {
    expect(campoDe(encabezado)).toBe(campo)
  })

  it.each([
    ['Fecha de consignación', 'consignedAt'],
    ['Fecha consignación', 'consignedAt'],
  ])('%s → %s', (encabezado, campo) => {
    expect(campoDe(encabezado)).toBe(campo)
  })

  it('"Código" sigue bloqueado — el código es asignado por el servidor (contract.md §3.2.5), no se importa', () => {
    expect(campoDe('Código')).toBeNull()
  })
})

describe('una exportación completa, como llega de un sistema real', () => {
  it('mapea lo que puede y deja en blanco lo que no es nuestro', () => {
    const mapeo = autoMapColumns([
      'Código',
      'Dirección del inmueble',
      'Ciudad',
      'Barrio',
      'Tipo de inmueble',
      'Canon de arrendamiento',
      'Valor administración',
      'Área construida',
      'Alcobas',
      'Baños',
      'Nombre del propietario',
      'Celular propietario',
      'Arrendatario',
      'Estrato',
    ])
    const porColumna = Object.fromEntries(mapeo.map((m) => [m.sourceColumn, m.targetField]))

    expect(porColumna['Dirección del inmueble']).toBe('propertyAddress')
    expect(porColumna['Canon de arrendamiento']).toBe('monthlyRent')
    expect(porColumna['Valor administración']).toBe('adminFee')
    expect(porColumna['Nombre del propietario']).toBe('ownerName')
    expect(porColumna['Celular propietario']).toBe('ownerPhone')

    // Los dos que no son nuestros quedan en blanco, no en el campo de al lado.
    expect(porColumna['Arrendatario']).toBeNull()
    expect(porColumna['Estrato']).toBeNull()
  })

  it('ninguna columna se mapea dos veces al mismo campo', () => {
    const mapeo = autoMapColumns([
      'Canon de arrendamiento',
      'Valor canon',
      'Área construida',
      'Área privada',
    ])
    const usados = mapeo.map((m) => m.targetField).filter(Boolean)
    expect(new Set(usados).size).toBe(usados.length)
  })
})
