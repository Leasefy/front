import { describe, expect, it } from 'vitest'
import {
  buscarEnLasFilas,
  compararValores,
  contarSegmentos,
  cortarPagina,
  diaEnBogota,
  escribirOrden,
  fraseDelConteo,
  hojaDeLaTabla,
  leerOrden,
  leerTamano,
  nombreDelArchivo,
  ordenarFilas,
  siguienteOrden,
  type ColumnaDeDatos,
} from '../tabla-del-admin'

interface Fila { nombre: string; ciudad: string | null; contratos: number | null; activa: boolean }
const filas: Fila[] = [
  { nombre: 'Portofino Propiedad Raíz', ciudad: 'Medellín', contratos: 740, activa: true },
  { nombre: 'Casa Laureles', ciudad: 'Bogotá', contratos: null, activa: false },
  { nombre: 'Arriendos del Norte', ciudad: null, contratos: 12, activa: true },
]
const columnas: ColumnaDeDatos<Fila>[] = [
  { header: 'Inmobiliaria', texto: (f) => f.nombre, orden: (f) => f.nombre },
  { header: 'Ciudad', texto: (f) => f.ciudad, orden: (f) => f.ciudad },
  { header: 'Contratos', texto: (f) => f.contratos, orden: (f) => f.contratos },
  { header: '' },
]

describe('la tabla del admin', () => {
  it('busca sin tildes ni mayúsculas y con todas las palabras', () => {
    expect(buscarEnLasFilas(filas, 'bogota', columnas).map((f) => f.nombre)).toEqual(['Casa Laureles'])
    expect(buscarEnLasFilas(filas, 'RAIZ medellin', columnas)).toHaveLength(1)
    expect(buscarEnLasFilas(filas, 'raiz bogota', columnas)).toHaveLength(0)
    expect(buscarEnLasFilas(filas, '   ', columnas)).toHaveLength(3)
    expect(buscarEnLasFilas(filas, 'xyz-1', columnas, (f) => (f.nombre === 'Casa Laureles' ? 'xyz-1' : null))).toHaveLength(1)
  })

  it('ordena cifras y textos, con lo vacío siempre al final', () => {
    expect(ordenarFilas(filas, (f) => f.contratos, 'desc').map((f) => f.contratos)).toEqual([740, 12, null])
    expect(ordenarFilas(filas, (f) => f.contratos, 'asc').map((f) => f.contratos)).toEqual([12, 740, null])
    expect(ordenarFilas(filas, (f) => f.ciudad, 'asc').map((f) => f.ciudad)).toEqual(['Bogotá', 'Medellín', null])
    expect(compararValores('árbol', 'Zeta', 'asc')).toBeLessThan(0)
    expect(compararValores('Casa 2', 'Casa 10', 'asc')).toBeLessThan(0)
  })

  it('apretar la misma cabecera cambia el sentido; otra arranca en el suyo', () => {
    expect(siguienteOrden(null, 2, 'desc')).toEqual({ columna: 2, sentido: 'desc' })
    expect(siguienteOrden({ columna: 2, sentido: 'desc' }, 2)).toEqual({ columna: 2, sentido: 'asc' })
    expect(siguienteOrden({ columna: 2, sentido: 'desc' }, 0)).toEqual({ columna: 0, sentido: 'asc' })
    expect(leerOrden(escribirOrden({ columna: 3, sentido: 'desc' }))).toEqual({ columna: 3, sentido: 'desc' })
    expect(leerOrden('0')).toEqual({ columna: 0, sentido: 'asc' })
    expect(leerOrden('nada')).toBeNull()
  })

  it('cuenta cada pestaña sobre lo buscado', () => {
    const segmentos = [
      { valor: 'todas', nombre: 'Todas', cumple: () => true },
      { valor: 'activas', nombre: 'Activas', cumple: (f: Fila) => f.activa },
    ]
    expect(contarSegmentos(filas, segmentos)).toEqual({ todas: 3, activas: 2 })
  })

  it('corta la página y nunca deja una página vacía si hay filas', () => {
    const muchas = Array.from({ length: 23 }, (_, i) => i)
    expect(cortarPagina(muchas, 2, 10)).toEqual({ filas: [20, 21, 22], pagina: 2, ultima: 2 })
    expect(cortarPagina(muchas, 9, 10).pagina).toBe(2)
    expect(cortarPagina(muchas, -1, 10).filas[0]).toBe(0)
    expect(leerTamano('50')).toBe(50)
    expect(leerTamano('7')).toBe(25)
  })

  it('el Excel lleva las columnas con texto, cifras como número y vacío como celda vacía', () => {
    expect(hojaDeLaTabla(filas.slice(1), columnas)).toEqual([
      ['Inmobiliaria', 'Ciudad', 'Contratos'],
      ['Casa Laureles', 'Bogotá', ''],
      ['Arriendos del Norte', '', 12],
    ])
  })

  it('el archivo se nombra con el día de Bogotá', () => {
    // 20-oct 02:00 UTC = 19-oct 21:00 en Bogotá
    const noche = new Date('2026-10-20T02:00:00Z')
    expect(diaEnBogota(noche)).toBe('2026-10-19')
    expect(nombreDelArchivo('Inmobiliarias de Leasefy', noche)).toBe('inmobiliarias-de-leasefy-2026-10-19.xlsx')
  })

  it('dice cuántas se ven de cuántas', () => {
    expect(fraseDelConteo(40, 40, ['inmobiliaria', 'inmobiliarias'])).toBe('40 inmobiliarias')
    expect(fraseDelConteo(1, 1, ['inmobiliaria', 'inmobiliarias'])).toBe('1 inmobiliaria')
    expect(fraseDelConteo(12, 1234, ['pago', 'pagos'])).toBe('12 de 1.234 pagos')
  })
})
