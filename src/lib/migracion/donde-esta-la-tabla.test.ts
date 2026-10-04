import { describe, it, expect } from 'vitest'

import {
  elegirDondeEstaLaTabla,
  elegirFilaDeEncabezado,
  fraseDeDondeSeLeyo,
} from './donde-esta-la-tabla'
import { fechasConMesPrimero, fraseDeFechasConMesPrimero } from './fechas-con-mes-primero'

const CONOCIDAS = new Set(['documento', 'nombre', 'correo', 'celular', 'cedula', 'canon', 'codigo'])
const puntuar = (celdas: string[]) => celdas.filter((c) => CONOCIDAS.has(c.toLowerCase())).length

describe('QA-MIG-A MG-01/02/15: dónde empieza la tabla', () => {
  it('se queda en A1 de la primera hoja cuando ahí están los encabezados', () => {
    const r = elegirDondeEstaLaTabla(
      [{ hoja: 'Hoja1', filas: [['Documento', 'Nombre', 'Correo'], ['1', 'Ana', 'a@x.co']] }],
      puntuar,
    )
    expect(r).toEqual({ hoja: undefined, fila: 0, hojas: ['Hoja1'] })
  })

  it('encuentra el encabezado en la fila 4 debajo del título de la inmobiliaria', () => {
    const r = elegirDondeEstaLaTabla(
      [
        {
          hoja: 'Hoja1',
          filas: [
            ['INMOBILIARIA LOS ALPES S.A.S.', '', ''],
            ['Listado de arrendatarios', '', ''],
            ['', '', ''],
            ['Nombre', 'Cédula', 'Celular', 'Correo'],
            ['Ana', '1', '300', 'a@x.co'],
          ],
        },
      ],
      puntuar,
    )
    expect(r.fila).toBe(3)
    expect(r.hoja).toBeUndefined()
  })

  it('elige la segunda hoja cuando la primera son instrucciones', () => {
    const r = elegirDondeEstaLaTabla(
      [
        { hoja: 'Instrucciones', filas: [['Este archivo trae los propietarios en otra hoja.'], ['No modificar.']] },
        { hoja: 'Propietarios', filas: [['Documento', 'Nombre', 'Correo', 'Celular'], ['1', 'Ana', 'a@x.co', '300']] },
      ],
      puntuar,
    )
    expect(r).toEqual({ hoja: 'Propietarios', fila: 0, hojas: ['Instrucciones', 'Propietarios'] })
  })

  it('no mueve la tabla por un empate flojo (menos de 3 columnas reconocidas)', () => {
    const r = elegirDondeEstaLaTabla(
      [{ hoja: 'H', filas: [['A', 'B'], ['Nombre', 'Correo']] }],
      puntuar,
    )
    expect(r.fila).toBe(0)
  })

  it('dentro de una hoja elegida por la persona, sólo busca la fila', () => {
    expect(
      elegirFilaDeEncabezado([['REPORTE'], ['Codigo', 'Nombre', 'Canon'], ['1', 'x', '2']], puntuar),
    ).toBe(1)
  })

  it('lo dice con palabras sólo cuando no fue A1 de la primera hoja', () => {
    expect(fraseDeDondeSeLeyo({ hoja: undefined, fila: 0 })).toBeNull()
    expect(fraseDeDondeSeLeyo({ hoja: 'Propietarios', fila: 3 })).toContain('la hoja «Propietarios»')
    expect(fraseDeDondeSeLeyo({ hoja: undefined, fila: 3 })).toContain('fila 4')
  })
})

describe('QA-MIG-A MG-08: fechas mes/día/año por columna', () => {
  it('una columna con una fecha que sólo existe mes/día se lee entera así', () => {
    const r = fechasConMesPrimero([
      { _rowIndex: 1, Inicio: '02/01/2026' },
      { _rowIndex: 2, Inicio: '11/15/2025' },
    ])
    expect(r.filas.map((f) => f.Inicio)).toEqual(['2026-02-01', '2025-11-15'])
    expect(r.reescritas).toEqual([{ columna: 'Inicio', ejemplo: '11/15/2025' }])
    expect(fraseDeFechasConMesPrimero(r)).toContain('mes primero')
  })

  it('un archivo colombiano (día primero) no se toca nunca', () => {
    const filas = [
      { _rowIndex: 1, Inicio: '15/11/2025' },
      { _rowIndex: 2, Inicio: '03/04/2026' },
    ]
    const r = fechasConMesPrimero(filas)
    expect(r.filas).toBe(filas)
    expect(r.reescritas).toEqual([])
    expect(fraseDeFechasConMesPrimero(r)).toBeNull()
  })

  it('una columna con las dos formas mezcladas no se adivina: se deja y se avisa', () => {
    const r = fechasConMesPrimero([
      { _rowIndex: 1, Fin: '03/31/2027' },
      { _rowIndex: 2, Fin: '31/08/2027' },
    ])
    expect(r.filas[0].Fin).toBe('03/31/2027')
    expect(r.mezcladas).toEqual([{ columna: 'Fin', ejemplo: '03/31/2027' }])
    expect(fraseDeFechasConMesPrimero(r)).toContain('Revisa esa columna')
  })

  it('las columnas que no son fechas no cambian', () => {
    const r = fechasConMesPrimero([
      { _rowIndex: 1, Canon: '1.500.000', Inicio: '12/25/2025' },
    ])
    expect(r.filas[0].Canon).toBe('1.500.000')
    expect(r.filas[0].Inicio).toBe('2025-12-25')
  })
})
