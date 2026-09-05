import { describe, it, expect } from 'vitest'
import {
  alternarClausula,
  aplicarPropuesta,
  bloqueadaPor,
  camposATrabajar,
  camposIncompletos,
  huellaDelBorrador,
  instruccionesValidas,
  mezclarValores,
  valoresDe,
} from './plantilla-legal'
import type {
  CampoDelContrato,
  ClausulaDelCatalogo,
  PropuestaDeLaIa,
} from '@/lib/api/contratos-plantilla.service'

function campo(nombre: string, extra: Partial<CampoDelContrato> = {}): CampoDelContrato {
  return {
    nombre,
    etiqueta: nombre,
    tipo: 'texto',
    requerida: true,
    valor: '',
    ...extra,
  }
}

function clausula(
  codigo: string,
  extra: Partial<ClausulaDelCatalogo> = {},
): ClausulaDelCatalogo {
  return {
    codigo,
    titulo: codigo,
    resumen: '',
    norma: 'Ley 820 de 2003',
    incompatibleCon: [],
    campos: [],
    ...extra,
  }
}

describe('camposIncompletos', () => {
  it('sólo cuenta los requeridos que están vacíos', () => {
    const campos = [
      campo('a'),
      campo('b'),
      campo('c', { requerida: false }),
    ]
    const faltan = camposIncompletos(campos, { a: 'listo', b: '   ' })
    expect(faltan.map((c) => c.nombre)).toEqual(['b'])
  })
})

describe('camposATrabajar', () => {
  it('suma los campos de las cláusulas elegidas y deja fuera los de las que no', () => {
    const catalogo = [
      clausula('PARQUEADERO', { campos: [campo('parqueaderoIdentificacion')] }),
      clausula('MASCOTAS', { campos: [campo('mascotaDescripcion')] }),
    ]
    const campos = camposATrabajar([campo('lugarDePago')], catalogo, ['PARQUEADERO'])
    expect(campos.map((c) => c.nombre)).toEqual(['lugarDePago', 'parqueaderoIdentificacion'])
  })

  it('una cláusula desmarcada no aporta campos aunque el backend todavía los traiga', () => {
    // El backend devuelve los campos de la cláusula que estaba marcada hasta la
    // respuesta anterior. Si se colaran, el «falta completar» pediría datos de
    // algo que ya no va a entrar en el contrato.
    const catalogo = [clausula('PARQUEADERO', { campos: [campo('parqueaderoIdentificacion')] })]
    expect(camposATrabajar([], catalogo, [])).toEqual([])
  })
})

describe('bloqueadaPor', () => {
  const catalogo = [
    clausula('DEPOSITO_GARANTIA', { incompatibleCon: ['CODEUDOR'] }),
    clausula('CODEUDOR', { titulo: 'Codeudor solidario' }),
    clausula('MASCOTAS'),
  ]

  it('detecta el choque aunque la incompatibilidad esté declarada en la OTRA cláusula', () => {
    // El backend la declara en un solo sentido. Leerla en uno solo dejaría
    // pasar el par según cuál se marcara primero.
    expect(bloqueadaPor(catalogo[1], ['DEPOSITO_GARANTIA'], catalogo)?.codigo).toBe(
      'DEPOSITO_GARANTIA',
    )
    expect(bloqueadaPor(catalogo[0], ['CODEUDOR'], catalogo)?.codigo).toBe('CODEUDOR')
  })

  it('no se bloquea a sí misma ni bloquea a las que no chocan', () => {
    expect(bloqueadaPor(catalogo[1], ['CODEUDOR'], catalogo)).toBeNull()
    expect(bloqueadaPor(catalogo[2], ['CODEUDOR'], catalogo)).toBeNull()
  })
})

describe('alternarClausula', () => {
  it('marca al final y desmarca sin tocar el orden del resto', () => {
    expect(alternarClausula(['A'], 'B')).toEqual(['A', 'B'])
    expect(alternarClausula(['A', 'B', 'C'], 'B')).toEqual(['A', 'C'])
  })
})

describe('mezclarValores', () => {
  it('el prellenado nuevo pisa lo viejo, salvo en lo que la persona escribió', () => {
    const mezcla = mezclarValores(
      { canonValor: '2.800.000', lugarDePago: 'Oficina' },
      { canonValor: '2.500.000', lugarDePago: 'Cuenta de ahorros' },
      new Set(['lugarDePago']),
    )
    // El canon lo manda el formulario: tiene que poder cambiar solo, o el PDF
    // saldría con un número que ya nadie acordó.
    expect(mezcla.canonValor).toBe('2.800.000')
    expect(mezcla.lugarDePago).toBe('Cuenta de ahorros')
  })
})

describe('valoresDe', () => {
  it('arma el diccionario de prellenados', () => {
    expect(valoresDe([campo('a', { valor: 'uno' }), campo('b', { valor: '' })])).toEqual({
      a: 'uno',
      b: '',
    })
  })
})

describe('aplicarPropuesta', () => {
  const propuesta: PropuestaDeLaIa = {
    clausulas: ['MASCOTAS', 'PARQUEADERO'],
    variables: { mascotaDescripcion: 'un perro pequeño', vacia: '  ' },
    estipulacionesEspeciales: 'Las partes acuerdan revisar el jardín cada seis meses.',
    motivos: [],
    pendientes: [],
    aplicable: true,
  }

  it('suma sus cláusulas a las que ya estaban, sin repetir', () => {
    const r = aplicarPropuesta(propuesta, { valores: {}, clausulas: ['MASCOTAS', 'CODEUDOR'] })
    expect(r.clausulas).toEqual(['MASCOTAS', 'CODEUDOR', 'PARQUEADERO'])
  })

  it('ignora las variables vacías y avisa cuáles dedujo', () => {
    const r = aplicarPropuesta(propuesta, { valores: { otra: 'ya estaba' }, clausulas: [] })
    expect(r.valores).toEqual({ otra: 'ya estaba', mascotaDescripcion: 'un perro pequeño' })
    expect(r.deducidas).toEqual(['mascotaDescripcion'])
  })
})

describe('huellaDelBorrador', () => {
  const base = { valores: { lugarDePago: 'Oficina' }, clausulas: ['A', 'B'], estipulaciones: '' }

  it('el mismo contrato da la misma huella, sin importar en qué orden se marcaron las cláusulas', () => {
    expect(huellaDelBorrador({ canonMensual: 100 }, base)).toBe(
      huellaDelBorrador({ canonMensual: 100 }, { ...base, clausulas: ['B', 'A'] }),
    )
  })

  it('cambiar el canon cambia la huella', () => {
    // 🔴 Es lo que invalida un PDF ya armado: sin esto se crea el contrato con
    // un canon en la base y otro en el documento que firman las partes.
    expect(huellaDelBorrador({ canonMensual: 2_500_000 }, base)).not.toBe(
      huellaDelBorrador({ canonMensual: 2_800_000 }, base),
    )
  })

  it('un valor vacío no cuenta como cambio', () => {
    expect(huellaDelBorrador({}, base)).toBe(
      huellaDelBorrador({}, { ...base, valores: { lugarDePago: 'Oficina', otro: '' } }),
    )
  })

  it('quitar una cláusula cambia la huella', () => {
    expect(huellaDelBorrador({}, base)).not.toBe(
      huellaDelBorrador({}, { ...base, clausulas: ['A'] }),
    )
  })
})

describe('instruccionesValidas', () => {
  it('exige lo mismo que el backend: al menos 10 caracteres útiles', () => {
    expect(instruccionesValidas('corto')).toBe(false)
    expect(instruccionesValidas('         a         ')).toBe(false)
    expect(instruccionesValidas('Tiene un perro pequeño')).toBe(true)
  })

  it('rechaza lo que se pasa del tope de 6000', () => {
    expect(instruccionesValidas('x'.repeat(6001))).toBe(false)
  })
})
