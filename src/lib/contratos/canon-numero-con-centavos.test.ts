/**
 * T-0157 WU-2: a canon that Excel stores as a numeric cell with cents
 * (1227294.12) must reach the wire with its cents, not be dropped.
 */
import { describe, it, expect } from 'vitest'

import { armarFilaAMigrar, traeCentavosSinLlave } from './armar-fila'
import { mapearColumnas } from './columnas-de-contrato'

const armar = (canon: unknown, conCentavos: boolean) =>
  armarFilaAMigrar({ Inquilino: 'Ana', Canon: canon }, mapearColumnas(['Inquilino', 'Canon']), { conCentavos })

describe('canon como número de celda con centavos', () => {
  it.each([1227294.12, 2899159.66, 0.29, 2350000.29])('%s viaja con sus centavos', (canon) => {
    const f = armar(canon, true)
    expect(f.monthlyRent).toBe(canon)
  })

  it('con la llave apagada se frena como centavos, no se redondea', () => {
    expect(traeCentavosSinLlave(1227294.12, false)).toBe(true)
    expect(armar(1227294.12, false).monthlyRent).toBeUndefined()
  })

  it('más de dos decimales reales sigue ausente', () => {
    expect(armar(2500000.123, true).monthlyRent).toBeUndefined()
  })
})
