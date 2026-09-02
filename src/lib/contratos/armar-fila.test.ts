/**
 * armarFilaAMigrar es donde se decide qué le llega al back por cada fila.
 *
 * El back valida con `whitelist: true, forbidNonWhitelisted: true` y
 * `@IsOptional()` que NO salta cadenas vacías (`back/src/contracts/dto/
 * migrar-contrato.dto.ts` — sólo salta `null`/`undefined`). Mandar `''` en un
 * campo `@IsDateString()` no lo deja "vacío": lo tira con 400, y ese 400 es
 * de TODO el lote, no de la fila. Por eso un campo sin mapear viaja
 * `undefined`, nunca un default inventado.
 */

import { describe, it, expect } from 'vitest'

import { armarFilaAMigrar } from './armar-fila'
import { mapearColumnas } from './columnas-de-contrato'

describe('un archivo cuyas columnas no mapean nada', () => {
  it('igual arma una fila enviable: direccion e inquilino nunca se omiten', () => {
    const mapeo = mapearColumnas(['Columna A', 'Columna B'])
    const fila = armarFilaAMigrar({ 'Columna A': 'x', 'Columna B': 'y' }, mapeo)

    expect(fila.direccion).toBe('')
    expect(fila.inquilino).toEqual({ nombre: '', correo: '', telefono: undefined, documento: undefined })
  })

  it('no fabrica ningún valor para lo que no se pudo mapear', () => {
    const mapeo = mapearColumnas(['Columna A', 'Columna B'])
    const fila = armarFilaAMigrar({ 'Columna A': 'x', 'Columna B': 'y' }, mapeo)

    expect(fila.startDate).toBeUndefined()
    expect(fila.endDate).toBeUndefined()
    expect(fila.monthlyRent).toBeUndefined()
    expect(fila.paymentDay).toBeUndefined()
    expect(fila.usoInmueble).toBeUndefined()
    expect(fila.periodicidad).toBeUndefined()
    expect(fila.deposit).toBeUndefined()
  })
})

describe('día de pago (X5 — la fila del owner no trae esta columna)', () => {
  it('sin columna mapeada, NO manda el día 1 por default', () => {
    const mapeo = mapearColumnas(['Dirección'])
    const fila = armarFilaAMigrar({ Dirección: 'Cra 1 # 2-3' }, mapeo)
    expect(fila.paymentDay).toBeUndefined()
  })

  it('con la columna mapeada pero la celda vacía, tampoco manda un default', () => {
    const mapeo = mapearColumnas(['Día de pago'])
    const fila = armarFilaAMigrar({ 'Día de pago': '' }, mapeo)
    expect(fila.paymentDay).toBeUndefined()
  })

  it('un día fuera de [1,28] se manda ausente, no truncado ni forzado', () => {
    const mapeo = mapearColumnas(['Día de pago'])
    expect(armarFilaAMigrar({ 'Día de pago': '0' }, mapeo).paymentDay).toBeUndefined()
    expect(armarFilaAMigrar({ 'Día de pago': '29' }, mapeo).paymentDay).toBeUndefined()
  })

  it('un día válido sí viaja', () => {
    const mapeo = mapearColumnas(['Día de pago'])
    expect(armarFilaAMigrar({ 'Día de pago': '15' }, mapeo).paymentDay).toBe(15)
  })
})

describe('canon, fechas y uso ausentes no inventan un valor', () => {
  it('canon sin mapear no manda 0 (0 se ve como un contrato que no cobra nada)', () => {
    const mapeo = mapearColumnas(['Dirección'])
    const fila = armarFilaAMigrar({ Dirección: 'x' }, mapeo)
    expect(fila.monthlyRent).toBeUndefined()
  })

  // El defecto real (1365 filas del owner): la columna SÍ está mapeada y SÍ
  // trae algo, pero en formato anglosajón («$570,000.00»), y el parser viejo
  // lo leía como NaN y lo guardaba como canon 0 — un contrato que cobra $0 es
  // indistinguible de uno que nunca tuvo canon, y nadie lo nota. Ahora debe
  // viajar AUSENTE, igual que si la columna nunca hubiera mapeado, para que
  // el back lo marque `faltante` en vez de darlo por bueno.
  it('canon mapeado pero ilegible (formato anglosajón mal leído) manda ausente, no 0', () => {
    const mapeo = mapearColumnas(['Canon de arrendamiento'])
    const fila = armarFilaAMigrar({ 'Canon de arrendamiento': '$570,000.00' }, mapeo)
    expect(fila.monthlyRent).toBe(570_000)
  })

  it('canon mapeado con un valor verdaderamente ilegible manda ausente, no 0', () => {
    const mapeo = mapearColumnas(['Canon de arrendamiento'])
    const fila = armarFilaAMigrar({ 'Canon de arrendamiento': 'pendiente confirmar' }, mapeo)
    expect(fila.monthlyRent).toBeUndefined()
  })

  it('fechas sin mapear no mandan cadena vacía (400ea el lote entero contra @IsDateString)', () => {
    const mapeo = mapearColumnas(['Dirección'])
    const fila = armarFilaAMigrar({ Dirección: 'x' }, mapeo)
    expect(fila.startDate).toBeUndefined()
    expect(fila.endDate).toBeUndefined()
  })

  it('uso sin mapear no cae en "VIVIENDA" por default — el back debe poder marcarlo faltante', () => {
    const mapeo = mapearColumnas(['Dirección'])
    const fila = armarFilaAMigrar({ Dirección: 'x' }, mapeo)
    expect(fila.usoInmueble).toBeUndefined()
  })

  it('uso mapeado y con valor sí se resuelve', () => {
    const mapeo = mapearColumnas(['Uso del inmueble'])
    expect(armarFilaAMigrar({ 'Uso del inmueble': 'Local comercial' }, mapeo).usoInmueble).toBe(
      'COMERCIAL',
    )
  })
})

describe('cada campo mapeado llega al payload', () => {
  it('un archivo completo manda los doce campos, incluida periodicidad', () => {
    const encabezados = [
      'Dirección del inmueble',
      'Nombre del inquilino',
      'Correo del inquilino',
      'Teléfono del inquilino',
      'Cédula del inquilino',
      'Fecha de inicio',
      'Fecha de terminación',
      'Canon de arrendamiento',
      'Depósito',
      'Día de pago',
      'Uso del inmueble',
      'Periodicidad',
      'Comisión de administración',
    ]
    const mapeo = mapearColumnas(encabezados)
    const fila = {
      'Dirección del inmueble': 'Carrera 13 # 55-20',
      'Nombre del inquilino': 'María Restrepo',
      'Correo del inquilino': 'maria@correo.co',
      'Teléfono del inquilino': '3105551234',
      'Cédula del inquilino': '1020304050',
      'Fecha de inicio': '01/03/2025',
      'Fecha de terminación': '28/02/2026',
      'Canon de arrendamiento': '$ 2.400.000',
      Depósito: '2400000',
      'Día de pago': '5',
      'Uso del inmueble': 'Vivienda',
      Periodicidad: 'Mensual',
      'Comisión de administración': '10',
    }

    const resultado = armarFilaAMigrar(fila, mapeo)

    expect(resultado).toEqual({
      direccion: 'Carrera 13 # 55-20',
      inquilino: {
        nombre: 'María Restrepo',
        correo: 'maria@correo.co',
        telefono: '3105551234',
        documento: '1020304050',
      },
      startDate: '2025-03-01',
      endDate: '2026-02-28',
      monthlyRent: 2_400_000,
      deposit: 2_400_000,
      paymentDay: 5,
      usoInmueble: 'VIVIENDA',
      periodicidad: 'MENSUAL',
      comisionPorcentaje: 10,
    })
  })
})

describe('depósito (ya funcionaba, no romperlo)', () => {
  it('sin mapear no manda nada — un depósito real en 0 sigue siendo válido cuando SÍ está mapeado', () => {
    const mapeo = mapearColumnas(['Dirección'])
    expect(armarFilaAMigrar({ Dirección: 'x' }, mapeo).deposit).toBeUndefined()
  })
})

// ═══ Batería adversarial P4 — la plata imposible no viaja ═══

const ENCABEZADOS_P4 = [
  'Dirección del inmueble',
  'Nombre del arrendatario',
  'Cédula del arrendatario',
  'Correo del arrendatario',
  'Fecha de inicio',
  'Fecha de terminación',
  'Canon',
  'Depósito',
  'Día de pago',
  'Uso',
  'Comisión',
]

const FILA_COMPLETA: Record<string, unknown> = {
  'Dirección del inmueble': 'Calle 10 # 20-30',
  'Nombre del arrendatario': 'Ana Pérez',
  'Cédula del arrendatario': '1020304050',
  'Correo del arrendatario': 'ana@example.com',
  'Fecha de inicio': '2026-01-01',
  'Fecha de terminación': '2027-01-01',
  Canon: '1.800.000',
  ['Depósito']: '1.800.000',
  'Día de pago': '5',
  Uso: 'VIVIENDA',
  ['Comisión']: '10',
}

describe('plata imposible → faltante visible, nunca un 400 de todo el lote', () => {
  const mapeo = mapearColumnas(ENCABEZADOS_P4)

  it('un canon negativo (incluye el − tipográfico) viaja ausente: contra @Min(0) tumbaría el lote', () => {
    const fila = armarFilaAMigrar({ ...FILA_COMPLETA, Canon: '−1.800.000' }, mapeo)
    expect(fila.monthlyRent).toBeUndefined()
    const fila2 = armarFilaAMigrar({ ...FILA_COMPLETA, Canon: '-1.800.000' }, mapeo)
    expect(fila2.monthlyRent).toBeUndefined()
  })

  it('un canon que supera el INT4 de Postgres viaja ausente', () => {
    const fila = armarFilaAMigrar({ ...FILA_COMPLETA, Canon: '3.000.000.000' }, mapeo)
    expect(fila.monthlyRent).toBeUndefined()
  })

  it('un depósito negativo también', () => {
    const fila = armarFilaAMigrar({ ...FILA_COMPLETA, ['Depósito']: '-500.000' }, mapeo)
    expect(fila.deposit).toBeUndefined()
  })

  it('una comisión del 0% VIAJA como 0 — antes desaparecía en silencio', () => {
    const fila = armarFilaAMigrar({ ...FILA_COMPLETA, ['Comisión']: '0' }, mapeo)
    expect(fila.comisionPorcentaje).toBe(0)
  })

  it('«10%» se lee; «110» viaja ausente (contra @Max(100) tumbaría el lote)', () => {
    expect(armarFilaAMigrar({ ...FILA_COMPLETA, ['Comisión']: '10%' }, mapeo).comisionPorcentaje).toBe(10)
    expect(armarFilaAMigrar({ ...FILA_COMPLETA, ['Comisión']: '110' }, mapeo).comisionPorcentaje).toBeUndefined()
  })

  it('un documento «N/A» viaja ausente, no como texto', () => {
    const fila = armarFilaAMigrar({ ...FILA_COMPLETA, ['Cédula del arrendatario']: 'N/A' }, mapeo)
    expect(fila.inquilino.documento).toBeUndefined()
  })

  it('una fecha imposible viaja ausente → el back marca «fechas», no 400', () => {
    const fila = armarFilaAMigrar({ ...FILA_COMPLETA, ['Fecha de inicio']: '31/02/2026' }, mapeo)
    expect(fila.startDate).toBeUndefined()
  })
})

/**
 * Nico, 2026-09-02: el propietario del archivo viaja en la fila para que el
 * back consigne solo al resolver el inmueble — antes se quedaba en la memoria
 * del navegador y una recarga lo perdía.
 */
describe('el propietario del archivo viaja en la fila', () => {
  const mapeo = [
    { columna: 'Dirección', campo: 'direccionInmueble' },
    { columna: 'Inquilino', campo: 'inquilinoNombre' },
    { columna: 'Correo', campo: 'inquilinoCorreo' },
    { columna: 'Propietario', campo: 'propietarioNombre' },
    { columna: 'Cédula propietario', campo: 'propietarioDocumento' },
  ] as never

  it('con documento, viaja con nombre y documento', () => {
    const fila = armarFilaAMigrar(
      { Dirección: 'Cra 1', Inquilino: 'Ana', Correo: 'a@b.co', Propietario: 'Jorge Restrepo', 'Cédula propietario': '71.234.567' },
      mapeo,
    )
    expect(fila.propietario).toEqual({
      documento: '71.234.567',
      nombre: 'Jorge Restrepo',
      correo: undefined,
      telefono: undefined,
    })
  })

  it('sin documento no viaja nada del propietario', () => {
    const fila = armarFilaAMigrar(
      { Dirección: 'Cra 1', Inquilino: 'Ana', Correo: 'a@b.co', Propietario: 'Jorge Restrepo', 'Cédula propietario': '' },
      mapeo,
    )
    expect(fila).not.toHaveProperty('propietario')
  })
})
