/**
 * La vista previa tiene que ser HONESTA: si muestra un canon, el back recibe
 * ese canon; si muestra «sin dato», el back recibe un campo ausente. Por eso
 * pasa por `armarFilaAMigrar` y no por una lectura propia — dos lecturas del
 * mismo archivo es exactamente cómo una pantalla termina mostrando algo
 * distinto de lo que se guarda.
 */

import { describe, it, expect } from 'vitest'

import { mapearColumnas } from './columnas-de-contrato'
import {
  comisionQueNoParecePorcentaje,
  huecosEsenciales,
  vistaPreviaDeFilas,
} from './vista-previa-de-migracion'

const ENCABEZADOS = [
  'Dirección del inmueble',
  'Nombre del arrendatario',
  'Correo del arrendatario',
  'Fecha de inicio',
  'Fecha de terminación',
  'Canon',
  'Día de pago',
]

function fila(over: Record<string, unknown> = {}) {
  return {
    'Dirección del inmueble': 'Calle 75 # 57-31',
    'Nombre del arrendatario': 'Ana Pérez',
    'Correo del arrendatario': 'ana@correo.co',
    'Fecha de inicio': '2026-01-01',
    'Fecha de terminación': '2027-01-01',
    Canon: '1.800.000',
    'Día de pago': '5',
    ...over,
  }
}

describe('las tres filas de muestra', () => {
  const mapeo = mapearColumnas(ENCABEZADOS)

  it('muestra el dato ya interpretado, no la celda cruda', () => {
    const renglones = vistaPreviaDeFilas([fila()], mapeo)
    const porCampo = new Map(renglones.map((r) => [r.campo, r.valores[0]]))
    expect(porCampo.get('canon')).toBe('$ 1.800.000')
    expect(porCampo.get('diaDePago')).toBe('el 5 de cada mes')
    expect(porCampo.get('fechaInicio')).toBe('2026-01-01')
    expect(porCampo.get('inquilinoNombre')).toBe('Ana Pérez')
  })

  it('son tres filas, aunque el archivo traiga 110', () => {
    const filas = Array.from({ length: 110 }, (_, i) =>
      fila({ 'Dirección del inmueble': `Calle ${i}` }),
    )
    const [direccion] = vistaPreviaDeFilas(filas, mapeo)
    expect(direccion.valores).toEqual(['Calle 0', 'Calle 1', 'Calle 2'])
  })

  it('un dato que no se pudo leer se ve como ausente, no como cero', () => {
    // El día 30 no existe en todos los meses: `armarFilaAMigrar` sólo deja
    // pasar [1,28] y descarta el resto en vez de inventar «el 1». La vista
    // previa tiene que decir lo mismo, no un «1» tranquilizador.
    const renglones = vistaPreviaDeFilas([fila({ 'Día de pago': '30' })], mapeo)
    expect(renglones.find((r) => r.campo === 'diaDePago')?.valores[0]).toBeNull()

    // Un canon que no se puede leer tampoco se muestra como «$ 0»: un
    // arriendo gratis existe y sería indistinguible de un dato perdido.
    const sinCanon = vistaPreviaDeFilas([fila({ Canon: 'por definir' })], mapeo)
    expect(sinCanon.find((r) => r.campo === 'canon')?.valores[0]).toBeNull()
  })

  it('sólo muestra los campos que alguien mapeó', () => {
    const renglones = vistaPreviaDeFilas([fila()], mapeo)
    expect(renglones.map((r) => r.campo)).toEqual([
      'direccionInmueble',
      'inquilinoNombre',
      'inquilinoCorreo',
      'fechaInicio',
      'fechaFin',
      'canon',
      'diaDePago',
    ])
  })

  it('sin columnas mapeadas no hay nada honesto que mostrar', () => {
    expect(vistaPreviaDeFilas([fila()], mapearColumnas(['Columna A']))).toEqual([])
  })
})

describe('cuántas filas quedan sin el dato', () => {
  const mapeo = mapearColumnas(ENCABEZADOS)

  it('cuenta las filas vacías de un campo bien mapeado, con el número exacto', () => {
    const filas = [
      ...Array.from({ length: 38 }, () => fila({ Canon: '' })),
      ...Array.from({ length: 72 }, () => fila()),
    ]
    const huecos = huecosEsenciales(filas, mapeo)
    expect(huecos).toEqual([
      { clave: 'canon', nombreCorto: 'canon', sinDato: 38, total: 110 },
    ])
  })

  it('no avisa por unas pocas filas incompletas — eso se completa en la lista', () => {
    const filas = [
      ...Array.from({ length: 10 }, () => fila({ Canon: '' })),
      ...Array.from({ length: 90 }, () => fila()),
    ]
    expect(huecosEsenciales(filas, mapeo)).toEqual([])
  })

  it('un canon imposible cuenta como sin dato: es lo que el back va a recibir', () => {
    // Negativo → viaja ausente (contra el @Min(0) tumbaría el lote entero).
    const filas = Array.from({ length: 100 }, () => fila({ Canon: '-1.800.000' }))
    expect(huecosEsenciales(filas, mapeo)[0]).toMatchObject({
      clave: 'canon',
      sinDato: 100,
    })
  })

  it('no repite lo que la compuerta ya frenó: sólo habla de lo mapeado', () => {
    const sinCanon = mapearColumnas(ENCABEZADOS.filter((h) => h !== 'Canon'))
    const huecos = huecosEsenciales([fila()], sinCanon)
    expect(huecos.map((h) => h.clave)).not.toContain('canon')
  })

  it('el correo o el documento: con uno de los dos la fila no cuenta como hueco', () => {
    const conDocumento = mapearColumnas([...ENCABEZADOS, 'Cédula del arrendatario'])
    const filas = Array.from({ length: 100 }, () =>
      fila({ 'Correo del arrendatario': '', 'Cédula del arrendatario': '1020304050' }),
    )
    expect(huecosEsenciales(filas, conDocumento).map((h) => h.clave)).not.toContain(
      'contactoInquilino',
    )
  })
})

/**
 * La comisión es un PORCENTAJE. Si la columna trae pesos, `comoPorcentaje` la
 * descarta por estar fuera de [0,100] y todas esas filas quedan sin comisión
 * —en silencio, con la columna mapeada y verde en pantalla—. Éste es el aviso
 * que lo hace visible.
 */
describe('una comisión que no parece un porcentaje', () => {
  const CON_CUOTA = [...ENCABEZADOS, 'Cuota de administración']
  const mapeo = mapearColumnas(CON_CUOTA)

  function filaConCuota(cuota: string) {
    return { ...fila(), 'Cuota de administración': cuota }
  }

  it('un separador de miles alcanza para dudar, con el número exacto', () => {
    const filas = Array.from({ length: 110 }, () => filaConCuota('350.000'))
    expect(comisionQueNoParecePorcentaje(filas, mapeo)).toEqual({
      columna: 'Cuota de administración',
      cuantas: 110,
      total: 110,
      ejemplos: ['350.000'],
    })
  })

  it('sin separadores lo agarra igual: un promedio de 350000 no es un %', () => {
    const filas = Array.from({ length: 10 }, () => filaConCuota('350000'))
    expect(comisionQueNoParecePorcentaje(filas, mapeo)?.cuantas).toBe(10)
  })

  it('un porcentaje de verdad no dispara nada', () => {
    const filas = Array.from({ length: 10 }, () => filaConCuota('10'))
    expect(comisionQueNoParecePorcentaje(filas, mapeo)).toBeNull()

    const conDecimales = Array.from({ length: 10 }, () => filaConCuota('10,5 %'))
    expect(comisionQueNoParecePorcentaje(conDecimales, mapeo)).toBeNull()
  })

  it('el 0 % es una comisión real y no se confunde con pesos', () => {
    const filas = Array.from({ length: 10 }, () => filaConCuota('0'))
    expect(comisionQueNoParecePorcentaje(filas, mapeo)).toBeNull()
  })

  it('sin columna de comisión mapeada no hay nada que avisar', () => {
    expect(comisionQueNoParecePorcentaje([fila()], mapearColumnas(ENCABEZADOS))).toBeNull()
  })

  it('una columna mapeada pero vacía tampoco inventa un aviso', () => {
    const filas = Array.from({ length: 10 }, () => filaConCuota(''))
    expect(comisionQueNoParecePorcentaje(filas, mapeo)).toBeNull()
  })

  it('con unas pocas filas en pesos, dice cuántas son', () => {
    const filas = [
      ...Array.from({ length: 3 }, () => filaConCuota('350.000')),
      ...Array.from({ length: 97 }, () => filaConCuota('10')),
    ]
    const aviso = comisionQueNoParecePorcentaje(filas, mapeo)
    expect(aviso).toMatchObject({ cuantas: 3, total: 100, ejemplos: ['350.000'] })
  })
})
