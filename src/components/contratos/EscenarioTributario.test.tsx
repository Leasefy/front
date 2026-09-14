/**
 * La tarjeta del escenario tributario.
 *
 * Lo que se congela:
 *  1. Un contrato entre personas naturales dice, con todas las letras, que no
 *     genera impuestos — el ejemplo textual de Nico.
 *  2. Deducido y confirmado NO se ven igual: si el escenario salió del tipo de
 *     persona, la tarjeta avisa que el cobro no lo practica. Sin ese aviso, un
 *     supuesto se lee como un hecho y la diferencia es plata.
 *  3. Cuando falta un dato NO se muestra medio escenario: se dice cuál falta y
 *     dónde se completa.
 *  4. La tarjeta no calcula nada. Si el back no mandó el escenario, lo dice en
 *     vez de pintar un cero.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// Sin esto React avisa en cada render que el entorno no soporta `act(...)`.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { EscenarioTributario } from './EscenarioTributario'
import type { EscenarioTributarioDelContrato } from '@/lib/types/contract'

const EJE_OK = { valor: false, origen: 'AFIRMADO' as const, porque: 'nadie retiene' }

function escenario(
  o: Partial<EscenarioTributarioDelContrato> = {},
): EscenarioTributarioDelContrato {
  return {
    codigo: 'E1',
    nombre: 'Vivienda o local entre personas naturales',
    nombreEnNuby: 'Escenario 1 VIVIENDA O LOCAL ENTRE PERSONAS NATURALES',
    resumen:
      'Contrato entre personas que no son responsables de IVA ni agentes de retención: no genera IVA ni retenciones.',
    impuestos: [],
    sinImpuestos: true,
    certeza: 'CONFIRMADO',
    deducidos: [],
    faltan: [],
    ejes: {
      ivaSobreElCanon: EJE_OK,
      retencionSobreElCanon: EJE_OK,
      reteIvaSobreElCanon: EJE_OK,
      retencionSobreLaComision: EJE_OK,
    },
    fueraDelCatalogo: [],
    ...o,
  }
}

describe('EscenarioTributario', () => {
  let contenedor: HTMLDivElement
  let root: Root

  beforeEach(() => {
    contenedor = document.createElement('div')
    document.body.appendChild(contenedor)
    root = createRoot(contenedor)
  })

  afterEach(() => {
    act(() => root.unmount())
    contenedor.remove()
  })

  function pintar(e: EscenarioTributarioDelContrato | null | undefined) {
    act(() => {
      root.render(<EscenarioTributario contract={{ escenarioTributario: e }} />)
    })
    return contenedor
  }

  it('un contrato entre personas naturales dice que no genera impuestos — el ejemplo de Nico', () => {
    const c = pintar(escenario())
    expect(c.querySelector('[data-testid="escenario-nombre"]')?.textContent).toContain(
      'Escenario 1',
    )
    expect(c.querySelector('[data-testid="escenario-resumen"]')?.textContent).toContain(
      'no genera IVA ni retenciones',
    )
    expect(c.querySelector('[data-testid="escenario-sin-impuestos"]')).not.toBeNull()
    expect(c.querySelector('[data-testid="escenario-impuestos"]')).toBeNull()
  })

  it('lista cada impuesto con su tarifa y a quién le pega', () => {
    const c = pintar(
      escenario({
        codigo: 'E8',
        nombre: 'El propietario cobra IVA; el inquilino retiene en la fuente',
        sinImpuestos: false,
        impuestos: [
          {
            tipo: 'IVA',
            base: 'CANON',
            nombre: 'IVA sobre el canon',
            porcentaje: 19,
            loPractica: 'PROPIETARIO',
            aCargoDe: 'INQUILINO',
            explicacion: 'El canon se factura con IVA.',
          },
          {
            tipo: 'RETEFUENTE',
            base: 'CANON',
            nombre: 'Retención en la fuente sobre el canon',
            porcentaje: 3.5,
            loPractica: 'INQUILINO',
            aCargoDe: 'PROPIETARIO',
            explicacion: 'El inquilino es agente retenedor.',
          },
        ],
      }),
    )
    const texto = c.querySelector('[data-testid="escenario-impuestos"]')!.textContent!
    expect(texto).toContain('19 %')
    expect(texto).toContain('3,5 %')
    expect(texto).toContain('lo paga el inquilino')
    expect(texto).toContain('se le descuenta al propietario')
    expect(c.querySelector('[data-testid="escenario-sin-impuestos"]')).toBeNull()
  })

  it('la retención de la comisión se muestra a cargo de la INMOBILIARIA, no del inquilino', () => {
    const c = pintar(
      escenario({
        codigo: 'E7',
        sinImpuestos: false,
        impuestos: [
          {
            tipo: 'RETEFUENTE',
            base: 'COMISION',
            nombre: 'Retención en la fuente sobre la comisión',
            porcentaje: 11,
            loPractica: 'PROPIETARIO',
            aCargoDe: 'INMOBILIARIA',
            explicacion: 'El propietario retiene sobre la comisión.',
          },
        ],
      }),
    )
    const texto = c.querySelector('[data-testid="escenario-impuestos"]')!.textContent!
    expect(texto).toContain('sobre la comisión')
    expect(texto).toContain('se le descuenta a la inmobiliaria')
    expect(texto).toContain('11 %')
  })

  it('un escenario DEDUCIDO avisa que el cobro no lo practica hasta declararlo', () => {
    const c = pintar(
      escenario({
        codigo: 'E6',
        certeza: 'DEDUCIDO',
        sinImpuestos: false,
        deducidos: ['Se deduce de que el inquilino es persona jurídica.'],
        impuestos: [
          {
            tipo: 'RETEFUENTE',
            base: 'CANON',
            nombre: 'Retención en la fuente sobre el canon',
            porcentaje: 3.5,
            loPractica: 'INQUILINO',
            aCargoDe: 'PROPIETARIO',
            explicacion: 'El inquilino es agente retenedor.',
          },
        ],
      }),
    )
    const aviso = c.querySelector('[data-testid="escenario-deducido"]')
    expect(aviso).not.toBeNull()
    expect(aviso!.textContent).toContain('el cobro NO aplica')
    expect(aviso!.textContent).toContain('persona jurídica')
  })

  it('un escenario deducido que no genera nada no amenaza con impuestos que no hay', () => {
    const c = pintar(
      escenario({
        certeza: 'DEDUCIDO',
        deducidos: ['Se deduce de que el propietario es persona natural.'],
      }),
    )
    const aviso = c.querySelector('[data-testid="escenario-deducido"]')!
    expect(aviso.textContent).toContain('No cambia el cobro')
    expect(aviso.textContent).not.toContain('el cobro NO aplica')
  })

  it('cuando falta un dato no muestra medio escenario: dice cuál falta y dónde se completa', () => {
    const c = pintar(
      escenario({
        codigo: 'SIN_DEFINIR',
        nombre: 'Escenario sin definir',
        nombreEnNuby: null,
        resumen: 'Falta un dato tributario de las partes.',
        certeza: 'SIN_DEFINIR',
        sinImpuestos: false,
        faltan: ['Falta el uso del inmueble.'],
      }),
    )
    expect(c.querySelector('[data-testid="escenario-nombre"]')?.textContent).toBe(
      'Escenario sin definir',
    )
    const falta = c.querySelector('[data-testid="escenario-faltan"]')!
    expect(falta.textContent).toContain('Falta el uso del inmueble.')
    expect(falta.textContent).toContain('Administración del contrato')
    // Ni «no genera impuestos» ni una lista vacía disfrazada de completa.
    expect(c.querySelector('[data-testid="escenario-sin-impuestos"]')).toBeNull()
    expect(c.querySelector('[data-testid="escenario-nuby"]')).toBeNull()
  })

  it('el reteICA, que ningún escenario contempla, sale aparte en vez de callarse', () => {
    const c = pintar(
      escenario({
        fueraDelCatalogo: [
          'Además, el inquilino practica reteICA sobre el canon.',
        ],
      }),
    )
    expect(c.textContent).toContain('reteICA')
  })

  it('sin escenario en la respuesta lo dice, en vez de pintar un cero', () => {
    const c = pintar(null)
    expect(c.querySelector('[data-testid="escenario-sin-dato"]')).not.toBeNull()
    expect(c.querySelector('[data-testid="escenario-nombre"]')).toBeNull()
  })

  it('muestra el nombre del catálogo anterior para poder cruzarlo con Nuby', () => {
    const c = pintar(escenario())
    expect(c.querySelector('[data-testid="escenario-nuby"]')?.textContent).toContain(
      'VIVIENDA O LOCAL ENTRE PERSONAS NATURALES',
    )
  })
})
