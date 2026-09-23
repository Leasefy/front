import { describe, it, expect } from 'vitest'

import { columnasDelArchivo, filaDeLaLista } from './columnas-del-archivo'

describe('columnasDelArchivo', () => {
  it('lee la SDN de la OFAC, que trae «SDN_Name» y también «Program»', () => {
    const c = columnasDelArchivo(['ent_num', 'SDN_Name', 'SDN_Type', 'Program', 'Remarks'])
    expect(c.nombre).toBe('SDN_Name')
    expect(c.detalle).toBe('Program')
  })

  it('lee la consolidada de la UE, con «NameAlias_WholeName»', () => {
    const c = columnasDelArchivo(['Entity_LogicalId', 'NameAlias_WholeName', 'Identification_Number'])
    expect(c.nombre).toBe('NameAlias_WholeName')
    expect(c.documento).toBe('Identification_Number')
  })

  it('lee un archivo en español con tildes y espacios', () => {
    const c = columnasDelArchivo(['Nombre completo', 'Número de documento', 'Observaciones'])
    expect(c.nombre).toBe('Nombre completo')
    expect(c.documento).toBe('Número de documento')
    expect(c.detalle).toBe('Observaciones')
  })

  it('🔴 sin columna de nombre lo dice: ese archivo no sirve', () => {
    const c = columnasDelArchivo(['columna 1', 'columna 2'])
    expect(c.nombre).toBeNull()
  })
})

describe('filaDeLaLista', () => {
  const columnas = { nombre: 'Nombre', documento: 'Documento', detalle: 'Programa' }

  it('arma la fila del contrato del back', () => {
    expect(
      filaDeLaLista(
        { Nombre: ' Juan Pérez ', Documento: '71234567', Programa: 'SDNT' },
        columnas,
      ),
    ).toEqual({ nombre: 'Juan Pérez', documento: '71234567', detalle: 'SDNT' })
  })

  it('los campos vacíos no viajan', () => {
    expect(filaDeLaLista({ Nombre: 'Ana', Documento: '', Programa: '' }, columnas)).toEqual({
      nombre: 'Ana',
    })
  })

  it('🔴 una fila SIN nombre se descarta: cargada vacía, todo coincidiría con ella', () => {
    expect(filaDeLaLista({ Nombre: '   ', Documento: '900123' }, columnas)).toBeNull()
  })
})
