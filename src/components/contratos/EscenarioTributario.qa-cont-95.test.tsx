/**
 * QA-CONT-95 B-32 (ronda 3): el escenario del archivo choca con la ficha del
 * propietario (Constructora Ñandú: «Escenario 1 · entre personas naturales»
 * siendo una empresa que retiene). La tarjeta lo dice y deja confirmar cuál
 * rige; antes decía «Confirmado por el sistema anterior».
 */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const confirmarEscenario = vi.fn()
vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: { confirmarEscenario: (...a: unknown[]) => confirmarEscenario(...a) },
}))
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { EscenarioTributario } from './EscenarioTributario'
import type { EscenarioTributarioDelContrato } from '@/lib/types/contract'

const E1 = 'Escenario 1 VIVIENDA O LOCAL ENTRE PERSONAS NATURALES'
const EJE = { valor: false, origen: 'AFIRMADO' as const, porque: 'x' }
const MOTIVO =
  'El archivo dice escenario 1 (el propietario no retiene sobre la comisión), pero la ficha del propietario dice que sí es agente de retención: con su ficha sería el escenario 7. Confirma cuál rige: mientras tanto la factura del canon no se emite y la liquidación no practica la retención.'

function escenario(o: Partial<EscenarioTributarioDelContrato> = {}): EscenarioTributarioDelContrato {
  return {
    codigo: 'E1',
    nombre: 'Vivienda o local entre personas naturales',
    nombreEnNuby: E1,
    resumen: 'no genera IVA ni retenciones.',
    impuestos: [],
    sinImpuestos: true,
    certeza: 'DEDUCIDO',
    deducidos: [MOTIVO],
    faltan: [],
    ejes: {
      ivaSobreElCanon: EJE,
      retencionSobreElCanon: EJE,
      reteIvaSobreElCanon: EJE,
      retencionSobreLaComision: EJE,
    },
    fueraDelCatalogo: [],
    delArchivo: {
      texto: E1,
      codigo: 'E1',
      aplicado: true,
      motivo: null,
      conflicto: { codigoDeLaFicha: 'E7', propietarioRetiene: true, motivo: MOTIVO },
    },
    ...o,
  }
}

describe('B-32: el choque del archivo con la ficha del propietario', () => {
  let contenedor: HTMLDivElement
  let root: Root
  beforeEach(() => {
    confirmarEscenario.mockReset()
    contenedor = document.createElement('div')
    document.body.appendChild(contenedor)
    root = createRoot(contenedor)
  })
  afterEach(() => {
    act(() => root.unmount())
    contenedor.remove()
  })

  function pintar(e: EscenarioTributarioDelContrato, puedeEditar = true, onConfirmado = vi.fn()) {
    act(() => {
      root.render(
        <EscenarioTributario
          contract={{ id: 'c-24', escenarioTributario: e }}
          puedeEditar={puedeEditar}
          onConfirmado={onConfirmado}
        />,
      )
    })
    return onConfirmado
  }

  it('🔴 dice que no coinciden, NO dice «Confirmado por el sistema anterior», y ofrece las dos salidas (la ficha primero)', () => {
    pintar(escenario())
    const choque = contenedor.querySelector('[data-testid="escenario-choque-con-la-ficha"]')
    expect(choque?.textContent).toContain('El archivo y la ficha del propietario no coinciden.')
    expect(choque?.textContent).toContain('sería el escenario 7')
    expect(contenedor.textContent).not.toContain('Confirmado por el sistema anterior')
    // El aviso de «deducido» no se repite ni dice que «no cambia el cobro».
    expect(contenedor.querySelector('[data-testid="escenario-deducido"]')).toBeNull()
    const botones = [...contenedor.querySelectorAll('[data-testid^="confirmar-escenario-"]')].map((b) => b.textContent)
    expect(botones).toEqual(['Rige el escenario 7 (la ficha del propietario)', 'Rige el escenario 1 (el archivo)'])
  })

  it('confirmar el 7 llama al back y vuelve a leer el contrato', async () => {
    confirmarEscenario.mockResolvedValue({ codigo: 'E7' })
    const onConfirmado = pintar(escenario())
    const boton = contenedor.querySelector('[data-testid="confirmar-escenario-E7"]') as HTMLButtonElement
    await act(async () => {
      boton.click()
    })
    expect(confirmarEscenario).toHaveBeenCalledWith('c-24', 'E7')
    expect(onConfirmado).toHaveBeenCalled()
  })

  it('si el back se niega, lo dice junto a los botones y no recarga', async () => {
    confirmarEscenario.mockRejectedValue(Object.assign(new Error('x'), { status: 400, message: 'El escenario 4 cobra IVA sobre el canon y el inmueble es de vivienda.' }))
    const onConfirmado = pintar(escenario())
    await act(async () => {
      ;(contenedor.querySelector('[data-testid="confirmar-escenario-E1"]') as HTMLButtonElement).click()
    })
    expect(contenedor.querySelector('[data-testid="escenario-choque-error"]')?.textContent).toBeTruthy()
    expect(onConfirmado).not.toHaveBeenCalled()
  })

  it('sin permiso de editar no hay botones: dice quién lo confirma', () => {
    pintar(escenario(), false)
    expect(contenedor.querySelector('[data-testid^="confirmar-escenario-"]')).toBeNull()
    expect(contenedor.querySelector('[data-testid="escenario-choque-sin-permiso"]')?.textContent).toContain('quien puede editar contratos')
  })

  it('ya confirmado: dice quién y cuándo, y lo que decía el archivo', () => {
    pintar(
      escenario({
        codigo: 'E7',
        certeza: 'CONFIRMADO',
        deducidos: [],
        delArchivo: {
          texto: 'Escenario 7 …',
          codigo: 'E7',
          aplicado: true,
          motivo: null,
          confirmado: { el: '2026-10-05T02:00:00.000Z', por: 'Ana Administradora', textoDelArchivo: E1 },
        },
      }),
    )
    expect(contenedor.querySelector('[data-testid="escenario-choque-con-la-ficha"]')).toBeNull()
    expect(contenedor.querySelector('[data-testid="escenario-confirmado-por"]')?.textContent).toContain(
      'Confirmado por Ana Administradora el 4 de octubre de 2026 (Escenario 7).',
    )
    expect(contenedor.querySelector('[data-testid="escenario-del-archivo"]')?.textContent).toContain(E1)
  })
})
