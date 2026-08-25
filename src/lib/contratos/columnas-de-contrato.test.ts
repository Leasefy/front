/**
 * El auto-mapeo se equivoca CON CONFIANZA ALTA, y ese error no da un mensaje:
 * da un dato guardado en el campo equivocado. Ya nos pasó — «Celular
 * arrendatario» se mapeaba a `ownerPhone` con 0.92, o sea el teléfono del
 * inquilino guardado como el del propietario.
 *
 * Estos tests fijan la distinción que causó aquello: `arrendador` es el
 * propietario, `arrendatario` es el inquilino, y se diferencian en dos letras.
 */

import { describe, it, expect } from 'vitest'

import {
  mapearColumnas,
  faltantes,
  OBLIGATORIOS,
  type CampoDeContrato,
} from './columnas-de-contrato'

function campoDe(encabezado: string): CampoDeContrato | null {
  return mapearColumnas([encabezado])[0].campo
}

describe('arrendador vs arrendatario', () => {
  it('«Celular arrendatario» es del INQUILINO, no del propietario', () => {
    expect(campoDe('Celular arrendatario')).toBe('inquilinoTelefono')
  })

  it('«Nombre del arrendatario» es del inquilino', () => {
    expect(campoDe('Nombre del arrendatario')).toBe('inquilinoNombre')
  })

  it('«Correo del arrendatario» no cae en el nombre por ser más largo', () => {
    expect(campoDe('Correo del arrendatario')).toBe('inquilinoCorreo')
  })

  it('«Cédula del arrendatario» va al documento', () => {
    expect(campoDe('Cédula del arrendatario')).toBe('inquilinoDocumento')
  })
})

describe('lo que el importador de inmuebles bloqueaba', () => {
  it('ahora sí reconoce al inquilino — es el punto de importar contratos', () => {
    const m = mapearColumnas(['Inquilino', 'Teléfono inquilino', 'Correo inquilino'])
    expect(m.map((x) => x.campo)).toEqual([
      'inquilinoNombre',
      'inquilinoTelefono',
      'inquilinoCorreo',
    ])
  })
})

describe('los campos del contrato', () => {
  it.each([
    ['Dirección del inmueble', 'direccionInmueble'],
    ['Fecha de inicio', 'fechaInicio'],
    ['Fecha de terminación', 'fechaFin'],
    ['Canon de arrendamiento', 'canon'],
    ['Depósito', 'deposito'],
    ['Día de pago', 'diaDePago'],
    ['Uso del inmueble', 'uso'],
    ['Periodicidad', 'periodicidad'],
    ['Comisión de administración', 'comision'],
  ])('«%s» → %s', (encabezado, esperado) => {
    expect(campoDe(encabezado)).toBe(esperado)
  })

  it('«Depósito» no cae en canon aunque los dos sean plata', () => {
    const m = mapearColumnas(['Canon mensual', 'Depósito de garantía'])
    expect(m.map((x) => x.campo)).toEqual(['canon', 'deposito'])
  })
})

describe('lo que NO se mapea', () => {
  it('deja sin campo lo que no tiene dónde ir, en vez de forzarlo', () => {
    const m = mapearColumnas(['Matrícula inmobiliaria', 'Observaciones', 'Estrato'])
    expect(m.every((x) => x.campo === null)).toBe(true)
  })

  it('un encabezado desconocido queda sin campo, no en el más parecido', () => {
    expect(campoDe('Zutano mengano')).toBeNull()
  })
})

describe('un campo se llena una sola vez', () => {
  it('la segunda columna parecida queda sin mapear en vez de pisar a la primera', () => {
    const m = mapearColumnas(['Nombre del inquilino', 'Inquilino'])
    expect(m[0].campo).toBe('inquilinoNombre')
    // Pisarla en silencio dejaría el archivo importado con el dato de la
    // columna equivocada y sin ninguna señal de que pasó.
    expect(m[1].campo).toBeNull()
  })
})

describe('siempre dice por qué', () => {
  it('cada empate trae el término que lo causó', () => {
    const [m] = mapearColumnas(['Celular arrendatario'])
    expect(m.porque).toBe('celular arrendatario')
  })

  it('lo que no empató no inventa un motivo', () => {
    expect(mapearColumnas(['Zutano'])[0].porque).toBe('')
  })
})

describe('qué falta para poder importar', () => {
  it('el uso del inmueble es obligatorio: sin él no se puede liquidar', () => {
    expect(OBLIGATORIOS).toContain('uso')
  })

  it('lista lo que falta, no sólo dice que falta algo', () => {
    const m = mapearColumnas(['Inquilino', 'Canon'])
    const f = faltantes(m)
    expect(f).toContain('uso')
    expect(f).toContain('fechaInicio')
    expect(f).not.toContain('canon')
  })

  it('no falta nada cuando el archivo trae todo', () => {
    const m = mapearColumnas([
      'Dirección del inmueble',
      'Nombre del inquilino',
      'Correo del inquilino',
      'Fecha de inicio',
      'Fecha de terminación',
      'Canon de arrendamiento',
      'Día de pago',
      'Uso del inmueble',
    ])
    expect(faltantes(m)).toEqual([])
  })
})
