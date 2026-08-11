import { describe, expect, it } from 'vitest'

import { construirVistaPrevia, primerNombre } from './wa-preview'

// Cuerpo REAL de `reminder_soft_co` (agent/src/whatsapp/templates.ts), recortado.
const REMINDER_SOFT = 'Hola {{1}}, te saludamos de {{2}}.\n\nTu canon de {{3}} venció el {{4}} por COP {{5}}. Pagá acá: {{6}}'
const REMINDER_VARS = [
  'debtor_first_name',
  'agency_name',
  'overdue_month',
  'due_date',
  'amount_cop',
  'payment_link',
]

// Cuerpo con la OTRA sintaxis, la de las plantillas de cartera.
const CARTERA_S2 = 'Hola {deudor}, soy María de {nombre_inmobiliaria}. Tu apartamento en {inmueble} lleva {dias_mora} días.'
const CARTERA_VARS = ['deudor', 'nombre_inmobiliaria', 'inmueble', 'dias_mora']

describe('construirVistaPrevia — sintaxis numerada ({{1}})', () => {
  it('reemplaza por POSICIÓN, no por nombre', () => {
    const { texto, huecos } = construirVistaPrevia(
      REMINDER_SOFT,
      REMINDER_VARS,
      {
        debtor_first_name: 'Nicolás',
        agency_name: 'Leasefy',
        overdue_month: 'julio',
        due_date: '5 de julio',
        amount_cop: '1.950.000',
        payment_link: 'https://pago.co/x',
      },
    )
    expect(texto).toBe(
      'Hola Nicolás, te saludamos de Leasefy.\n\nTu canon de julio venció el 5 de julio por COP 1.950.000. Pagá acá: https://pago.co/x',
    )
    expect(huecos).toEqual([])
  })

  it('marca lo que falta con su etiqueta legible y lo reporta', () => {
    const { texto, huecos } = construirVistaPrevia(
      REMINDER_SOFT,
      REMINDER_VARS,
      { debtor_first_name: 'Nicolás', agency_name: 'Leasefy' },
      { overdue_month: 'Mes vencido', due_date: 'Fecha de vencimiento' },
    )
    expect(texto).toContain('Hola Nicolás, te saludamos de Leasefy.')
    expect(texto).toContain('⟨Mes vencido⟩')
    expect(texto).toContain('⟨Fecha de vencimiento⟩')
    // Sin etiqueta cae al nombre crudo: feo, pero sigue siendo cierto.
    expect(texto).toContain('⟨amount_cop⟩')
    expect(huecos.map((h) => h.clave)).toEqual([
      'overdue_month',
      'due_date',
      'amount_cop',
      'payment_link',
    ])
  })

  it('un valor en blanco cuenta como faltante, no como vacío legítimo', () => {
    const { huecos } = construirVistaPrevia(REMINDER_SOFT, REMINDER_VARS, {
      debtor_first_name: '   ',
    })
    expect(huecos.map((h) => h.clave)).toContain('debtor_first_name')
  })

  it('el mismo hueco repetido se reporta UNA vez', () => {
    const { huecos } = construirVistaPrevia('{{1}} y otra vez {{1}}', ['x'], {})
    expect(huecos).toHaveLength(1)
  })

  it('un {{7}} en una plantilla de 6 no se inventa: se deja crudo', () => {
    const { texto, huecos } = construirVistaPrevia('Hola {{1}} {{7}}', ['a'], { a: 'X' })
    expect(texto).toBe('Hola X {{7}}')
    expect(huecos).toEqual([])
  })
})

describe('construirVistaPrevia — sintaxis nombrada ({deudor})', () => {
  it('reemplaza por nombre', () => {
    const { texto, huecos } = construirVistaPrevia(CARTERA_S2, CARTERA_VARS, {
      deudor: 'Laura',
      nombre_inmobiliaria: 'Leasefy',
      inmueble: 'Cra 15 #93-45',
      dias_mora: '27',
    })
    expect(texto).toBe(
      'Hola Laura, soy María de Leasefy. Tu apartamento en Cra 15 #93-45 lleva 27 días.',
    )
    expect(huecos).toEqual([])
  })

  it('NO toca las llaves que no son variables declaradas', () => {
    const { texto } = construirVistaPrevia(
      'Saldo {monto} y una llave suelta {ojo}',
      ['monto'],
      { monto: '$100' },
    )
    expect(texto).toBe('Saldo $100 y una llave suelta {ojo}')
  })
})

describe('primerNombre', () => {
  it('se queda con la primera palabra', () => {
    expect(primerNombre('Nicolás García Pérez')).toBe('Nicolás')
    expect(primerNombre('  Laura  ')).toBe('Laura')
  })
})
