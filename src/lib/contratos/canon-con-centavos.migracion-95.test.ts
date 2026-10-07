/**
 * EN-38 (QA-MIGRACION-95, 06-10-2026; misma regla que NI-07 en inmuebles).
 * Con la llave de los contratos APAGADA, «2.500.000,29» quedaba guardado como
 * 2.500.000 sin decir nada: el lector del front lo redondeaba antes de mandar
 * y el freno del back nunca lo veía. Ahora el canon no viaja, viaja la celda
 * tal cual, y el back frena la fila con su motivo.
 */
import { describe, it, expect } from 'vitest'

import { armarFilaAMigrar, traeCentavosSinLlave } from './armar-fila'
import { mapearColumnas } from './columnas-de-contrato'

const armar = (fila: Record<string, unknown>, conCentavos = false) =>
  armarFilaAMigrar(fila, mapearColumnas(['Inquilino', 'Canon']), { conCentavos })

describe('EN-38 · canon con centavos y la llave apagada', () => {
  it('«2.500.000,29» no se redondea: no viaja canon, viaja la celda', () => {
    const f = armar({ Inquilino: 'Ana', Canon: '2.500.000,29' })
    expect(f.monthlyRent).toBeUndefined()
    expect(f.canonConCentavosDelArchivo).toBe('2.500.000,29')
  })

  it('con la llave prendida viaja con sus centavos, sin marca', () => {
    const f = armar({ Inquilino: 'Ana', Canon: '2.500.000,29' }, true)
    expect(f.monthlyRent).toBe(2500000.29)
    expect(f.canonConCentavosDelArchivo).toBeUndefined()
  })

  it.each(['$2.500.000', '2,500,000.00', '2500000', '$2.500.000,00'])('«%s» (sin centavos de verdad) se lee como siempre', (canon) => {
    expect(traeCentavosSinLlave(canon, false)).toBe(false)
    const f = armar({ Inquilino: 'Ana', Canon: canon })
    expect(f.monthlyRent).toBe(2_500_000)
    expect(f.canonConCentavosDelArchivo).toBeUndefined()
  })
})

describe('C14 · la fila de la hoja viaja aparte', () => {
  it('encabezado en la fila 3: la primera persona es la fila 4 del Excel', () => {
    // SheetJS (base 0): encabezado en A3 → primera fila de datos `_rowIndex` 3.
    const f = armarFilaAMigrar({ Inquilino: 'Valentina', Canon: '2500000', _rowIndex: 3 }, mapearColumnas(['Inquilino', 'Canon']))
    expect(f.filaDelArchivo).toBe(4)
  })
  it('sin `_rowIndex` no se inventa', () => {
    expect(armar({ Inquilino: 'Ana', Canon: '1' }).filaDelArchivo).toBeUndefined()
  })
})
