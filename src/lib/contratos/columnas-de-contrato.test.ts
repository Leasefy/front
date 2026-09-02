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
  remapear,
  sinMapear,
  CAMPOS_CLAVE,
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

describe('qué no se mapeó — informativo, ya NO bloquea el import', () => {
  // Cualquier archivo se puede importar («no puedo exigir un archivo
  // estándar porque todos los clientes pueden subir Excel diferentes»,
  // palabras del owner). `sinMapear` ya no es un gate: es la lista que arma
  // el aviso no bloqueante — la persona la completa fila por fila después.
  it('el uso del inmueble sigue siendo un campo clave: sin él no se puede liquidar', () => {
    expect(CAMPOS_CLAVE).toContain('uso')
  })

  it('lista lo que no se mapeó, no sólo dice que falta algo', () => {
    const m = mapearColumnas(['Inquilino', 'Canon'])
    const f = sinMapear(m)
    expect(f).toContain('uso')
    expect(f).toContain('fechaInicio')
    expect(f).not.toContain('canon')
  })

  it('no queda nada sin mapear cuando el archivo trae todos los campos clave', () => {
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
    expect(sinMapear(m)).toEqual([])
  })
})

describe('remapeo manual', () => {
  // Puerto de la interacción de StepColumnMapping.tsx (importador de
  // inmuebles), pero apuntando a `CampoDeContrato`/`MapeoDeColumna` — NO a
  // `ColumnMapping`/`TARGET_FIELDS`, que son un diccionario deliberadamente
  // distinto (bloquea palabras de inquilino que acá son justo lo que se
  // necesita).
  it('una columna que el auto-mapeo dejó "Sin usar" se puede asignar a mano', () => {
    const auto = mapearColumnas(['Propiedad']) // excluida a propósito del auto-mapeo
    expect(auto[0].campo).toBeNull()

    const manual = remapear(auto, 'Propiedad', 'direccionInmueble')
    expect(manual[0].campo).toBe('direccionInmueble')
    expect(manual[0].isManual).toBe(true)
  })

  it('si dos columnas reclaman el mismo campo, la segunda se lo quita a la primera', () => {
    const auto = mapearColumnas(['Nombre del inquilino', 'Otra columna'])
    const manual = remapear(auto, 'Otra columna', 'inquilinoNombre')

    const primera = manual.find((m) => m.columna === 'Nombre del inquilino')
    const segunda = manual.find((m) => m.columna === 'Otra columna')
    expect(segunda?.campo).toBe('inquilinoNombre')
    expect(primera?.campo).toBeNull()
    expect(primera?.isManual).toBe(true)
  })

  it('elegir "Ignorar" limpia el campo de esa columna', () => {
    const auto = mapearColumnas(['Canon de arrendamiento'])
    const manual = remapear(auto, 'Canon de arrendamiento', null)
    expect(manual[0].campo).toBeNull()
    expect(manual[0].isManual).toBe(true)
  })

  it('no toca las demás columnas', () => {
    const auto = mapearColumnas(['Dirección del inmueble', 'Canon de arrendamiento'])
    const manual = remapear(auto, 'Dirección del inmueble', null)
    expect(manual.find((m) => m.columna === 'Canon de arrendamiento')?.campo).toBe('canon')
  })

  it('restablecer vuelve a correr el auto-mapeo desde los encabezados originales', () => {
    const encabezados = ['Propiedad', 'Canon de arrendamiento']
    const manual = remapear(mapearColumnas(encabezados), 'Propiedad', 'direccionInmueble')
    expect(manual[0].campo).toBe('direccionInmueble')

    const restablecido = mapearColumnas(encabezados)
    expect(restablecido[0].campo).toBeNull()
    expect(restablecido[0].isManual).toBeUndefined()
  })
})

// ═══ Batería adversarial P4 — colisiones de encabezados ═══

describe('direcciones que NO son la del inmueble', () => {
  it('«Dirección del propietario» no es el NOMBRE del propietario ni la dirección del inmueble', () => {
    const [m] = mapearColumnas(['Dirección del propietario'])
    expect(m.campo).toBeNull()
  })
  it('«Dirección de notificación» no se roba la dirección del inmueble', () => {
    const m = mapearColumnas(['Dirección de notificación', 'Dirección del inmueble'])
    expect(m[0].campo).toBeNull()
    expect(m[1].campo).toBe('direccionInmueble')
  })
  it('«Dirección del arrendador» tampoco cae en ningún campo', () => {
    expect(mapearColumnas(['Dirección del arrendador'])[0].campo).toBeNull()
  })
  it('la dirección del inmueble sigue mapeando aunque venga con tilde y mayúsculas', () => {
    expect(mapearColumnas(['DIRECCIÓN DEL INMUEBLE'])[0].campo).toBe('direccionInmueble')
  })
})

describe('encabezados que se parecen y no son', () => {
  it('«Fecha de nacimiento» no cae en ninguna fecha del contrato', () => {
    expect(mapearColumnas(['Fecha de nacimiento'])[0].campo).toBeNull()
  })
  it('«Depósito de garantía» es depósito, no canon', () => {
    expect(mapearColumnas(['Depósito de garantía'])[0].campo).toBe('deposito')
  })
  it('«Teléfono» y «Cédula» a secas quedan para mapear a mano', () => {
    expect(mapearColumnas(['Teléfono'])[0].campo).toBeNull()
    expect(mapearColumnas(['Cédula'])[0].campo).toBeNull()
  })
  it('«NIT del propietario» va al documento del propietario, no al nombre', () => {
    expect(mapearColumnas(['NIT del propietario'])[0].campo).toBe('propietarioDocumento')
  })
  it('«Fecha de vencimiento» es fin, no inicio', () => {
    expect(mapearColumnas(['Fecha de vencimiento'])[0].campo).toBe('fechaFin')
  })
  it('encabezado con espacios dobles y de sobra igual empata', () => {
    expect(mapearColumnas(['  Canon   de   arrendamiento  '])[0].campo).toBe('canon')
  })
})

/**
 * El código del inmueble (el «#144» de Inmuebles) y la ciudad. Nico
 * (2026-09-02): 90 contratos sin inmueble porque ninguna dirección coincidía;
 * un código es exacto. Lo que no puede pasar es que «Código» a secas (el del
 * contrato) o «Código postal» caigan acá, ni que «Ciudad del propietario» sea
 * la ciudad del inmueble.
 */
describe('código y ciudad del inmueble', () => {
  it('«Código del inmueble», «ID inmueble» y «# inmueble» van al código', () => {
    expect(campoDe('Código del inmueble')).toBe('codigoInmueble')
    expect(campoDe('ID inmueble')).toBe('codigoInmueble')
    expect(campoDe('# inmueble')).toBe('codigoInmueble')
    expect(campoDe('Código propiedad')).toBe('codigoInmueble')
  })

  it('«Código» a secas y «Código postal» NO son el código del inmueble', () => {
    expect(campoDe('Código')).toBeNull()
    expect(campoDe('Código postal')).toBeNull()
    expect(campoDe('Código del contrato')).toBeNull()
  })

  it('«Ciudad» y «Municipio» son la ciudad del inmueble', () => {
    expect(campoDe('Ciudad')).toBe('ciudadInmueble')
    expect(campoDe('Municipio del inmueble')).toBe('ciudadInmueble')
  })

  it('la ciudad del propietario o del inquilino no es la del inmueble', () => {
    expect(campoDe('Ciudad del propietario')).toBeNull()
    expect(campoDe('Ciudad del inquilino')).toBeNull()
  })

  it('«Uso del inmueble» sigue siendo el uso, no el código ni la dirección', () => {
    expect(campoDe('Uso del inmueble')).toBe('uso')
  })
})
