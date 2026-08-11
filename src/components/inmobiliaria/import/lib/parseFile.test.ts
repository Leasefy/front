/**
 * El importador tiene que aceptar el archivo como la persona lo tiene.
 *
 * Dos defectos que estos tests fijan:
 *
 * 1. **Los acentos se rompían en silencio.** El CSV se leía con `file.text()`
 *    —UTF-8 a ciegas— y el comentario decía «para preservar los acentos».
 *    Excel en español exporta CSV en Windows-1252: «Bogotá» llegaba como
 *    `Bogot?` y entraba así al inmueble. Sin error, sin aviso.
 *
 * 2. **Se rechazaban formatos que el parser sabe leer.** `.ods`, `.txt` y
 *    `.tsv` estaban prohibidos, y el mensaje mandaba a convertir el archivo a
 *    mano. SheetJS ya los leía.
 */

import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseSpreadsheetFile } from './parseFile'

/** Un File de verdad a partir de bytes, como el que entrega el dropzone. */
function archivo(nombre: string, contenido: Uint8Array | string): File {
  const bytes =
    typeof contenido === 'string' ? new TextEncoder().encode(contenido) : contenido
  // Uint8Array → ArrayBuffer propio, para no arrastrar el buffer compartido.
  return new File([bytes.slice().buffer as ArrayBuffer], nombre)
}

/** Los mismos bytes que produce Excel en español al «Guardar como CSV». */
function enWindows1252(texto: string): Uint8Array {
  const mapa: Record<string, number> = {
    á: 0xe1, é: 0xe9, í: 0xed, ó: 0xf3, ú: 0xfa, ñ: 0xf1, Á: 0xc1, Ñ: 0xd1,
  }
  const salida: number[] = []
  for (const c of texto) salida.push(mapa[c] ?? c.charCodeAt(0))
  return new Uint8Array(salida)
}

describe('codificación: el archivo dice cómo está escrito, no lo suponemos', () => {
  it('UTF-8 conserva los acentos', async () => {
    const { rows } = await parseSpreadsheetFile(
      archivo('p.csv', 'Direccion,Ciudad\nCalle 1,Bogotá\n'),
    )
    expect(rows[0].Ciudad).toBe('Bogotá')
  })

  it('Windows-1252 (lo que exporta Excel en español) también', async () => {
    const { rows } = await parseSpreadsheetFile(
      archivo('p.csv', enWindows1252('Direccion,Ciudad\nCalle 1,Bogotá\n')),
    )
    // Antes de la corrección esto daba «Bogot�».
    expect(rows[0].Ciudad).toBe('Bogotá')
    expect(String(rows[0].Ciudad)).not.toContain('�')
  })

  it('el BOM no se cuela en el nombre de la primera columna', async () => {
    const conBom = new Uint8Array([
      0xef, 0xbb, 0xbf,
      ...new TextEncoder().encode('Direccion,Ciudad\nCalle 1,Bogotá\n'),
    ])
    const { headers } = await parseSpreadsheetFile(archivo('p.csv', conBom))
    // Un BOM pegado al encabezado rompe el mapeo de columnas sin que se vea.
    expect(headers[0]).toBe('Direccion')
  })
})

describe('separadores: no le pedimos a nadie que arregle su archivo', () => {
  it('punto y coma, que es el default de Excel en español', async () => {
    const { rows, headers } = await parseSpreadsheetFile(
      archivo('p.csv', 'Direccion;Ciudad;Canon\nCalle 1;Bogotá;2500000\n'),
    )
    expect(headers).toEqual(['Direccion', 'Ciudad', 'Canon'])
    expect(rows[0].Canon).toBe('2500000')
  })

  it('tabulaciones en un .tsv', async () => {
    const { headers } = await parseSpreadsheetFile(
      archivo('p.tsv', 'Direccion\tCiudad\nCalle 1\tBogotá\n'),
    )
    expect(headers).toEqual(['Direccion', 'Ciudad'])
  })

  it('un .txt separado por comas entra sin renombrarlo', async () => {
    const { rows } = await parseSpreadsheetFile(
      archivo('export.txt', 'Direccion,Ciudad\nCalle 1,Bogotá\n'),
    )
    expect(rows[0].Ciudad).toBe('Bogotá')
  })
})

describe('formatos binarios', () => {
  function planilla(bookType: 'xlsx' | 'ods'): Uint8Array {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['Direccion', 'Ciudad'],
        ['Calle 1', 'Bogotá'],
      ]),
      'H1',
    )
    return new Uint8Array(XLSX.write(wb, { bookType, type: 'array' }) as ArrayBuffer)
  }

  it('xlsx', async () => {
    const { rows } = await parseSpreadsheetFile(archivo('p.xlsx', planilla('xlsx')))
    expect(rows[0].Ciudad).toBe('Bogotá')
  })

  it('ods, que estaba prohibido aunque se lee perfecto', async () => {
    const { rows } = await parseSpreadsheetFile(archivo('p.ods', planilla('ods')))
    expect(rows[0].Ciudad).toBe('Bogotá')
  })
})

describe('filas', () => {
  it('las vacías no cuentan como inmuebles', async () => {
    const { rows } = await parseSpreadsheetFile(
      archivo('p.csv', 'Direccion,Ciudad\nCalle 1,Bogotá\n,\nCalle 2,Medellín\n'),
    )
    expect(rows).toHaveLength(2)
  })
})
