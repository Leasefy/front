import { describe, expect, it } from 'vitest'

import type { PaymentAccount } from '@/lib/types/payment-accounts'
import { pasosQueLeFaltan } from './PasosDelPropietario'

const banco = { id: 'c1', type: 'bank' } as PaymentAccount
const nequi = { id: 'c2', type: 'wallet' } as PaymentAccount

describe('los tres pasos del propietario al pagar', () => {
  it('recién pagado le faltan los tres', () => {
    expect(pasosQueLeFaltan({ firstName: 'Ana', lastName: '' }, [])).toEqual(['datos', 'cuenta', 'factura'])
  })
  it('con nombre, cédula, celular, una cuenta de banco y dirección no falta nada', () => {
    expect(pasosQueLeFaltan({ firstName: 'Ana', lastName: 'Ruiz', rut: '1020304050', phone: '3001234567', address: 'Cra 1 # 2-3, Medellín' }, [banco])).toEqual([])
  })
  it('Nequi no cuenta como la cuenta donde recibe el arriendo', () => {
    expect(pasosQueLeFaltan({ firstName: 'Ana', lastName: 'Ruiz', rut: '1', phone: '3', address: 'x' }, [nequi])).toEqual(['cuenta'])
  })
})
