/**
 * T-0153 §3.3/§9: la regla del back (autoritativa) copiada para MOSTRAR en la
 * vista previa. Misma tabla que su prueba del back. El front nunca la manda.
 */
import { describe, expect, it } from 'vitest'
import { diaDePagoDelArchivo } from './dia-de-pago-del-archivo'

describe('diaDePagoDelArchivo', () => {
  it.each([
    // [paymentDay, fechaDeCartera, startDate, prorratear, esperado]
    [undefined, '2025-01-01', undefined, true, 1],
    [undefined, '2025-01-15', undefined, true, 1],
    [undefined, '2025-01-15', undefined, false, 15],
    [undefined, '2025-01-31', undefined, false, 28],
    [undefined, '2025-01-29', undefined, false, 28],
    [undefined, undefined, '2025-03-10', false, 10],
    [undefined, undefined, '2025-03-10', true, 1],
    [undefined, '2025-01-15T00:00:00.000Z', undefined, false, 15],
    [5, '2025-01-15', undefined, false, 5],
    [5, '2025-01-15', undefined, true, 5],
    [31, '2025-01-15', undefined, false, 28],
    [undefined, undefined, undefined, false, null],
    [undefined, 'no-es-fecha', 'tampoco', true, null],
    [0, '2025-01-15', undefined, false, 15],
    [32, '2025-01-15', undefined, false, 15],
  ])('paymentDay=%s cartera=%s inicio=%s prorratear=%s -> %s', (paymentDay, fechaDeCartera, startDate, prorratear, esperado) => {
    expect(
      diaDePagoDelArchivo({ paymentDay, fechaDeCartera, startDate, prorratear: prorratear as boolean }),
    ).toBe(esperado)
  })

  it('cartera inválida cae a la fecha de inicio', () => {
    expect(
      diaDePagoDelArchivo({ fechaDeCartera: 'basura', startDate: '2025-06-20', prorratear: false }),
    ).toBe(20)
  })
})
