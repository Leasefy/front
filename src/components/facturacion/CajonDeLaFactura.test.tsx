/**
 * El cajón de una prefactura (ARREGLOS-8, 03-10-2026).
 *
 * 🔴 Al cerrar, la tabla le pasa `factura={null}` en el mismo render en que el
 * cajón empieza a salir: el cuerpo leía esa `factura` y se vaciaba, así que el
 * cajón salía deslizándose EN BLANCO. Ahora, mientras sale, sigue mostrando la
 * factura que mostraba (`useUltimoPresente`, como los otros cajones).
 *
 * Y las cifras de «la plata» cuentan (`AnimatedNumber`, MOV-A6): con las
 * animaciones saltadas de las pruebas, la cifra final está de una.
 */
import * as React from 'react'
import { act } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/*
 * El cajón de la casa, reducido a lo que se mira: si está abierto y qué pinta.
 * (Radix lo desmonta al terminar su animación de salida; acá se ve el cuerpo
 * que tendría mientras sale.)
 */
vi.mock('@/components/ui/cajon', () => ({
  Cajon: ({ abierto, children }: { abierto: boolean; children?: React.ReactNode }) => (
    <div data-testid="cajon" data-abierto={abierto ? 'si' : 'no'}>
      {children}
    </div>
  ),
  CajonCabecera: ({ titulo, children }: { titulo: React.ReactNode; children?: React.ReactNode }) => (
    <header>
      <h2>{titulo}</h2>
      {children}
    </header>
  ),
  CajonCuerpo: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CajonPie: ({ children }: { children?: React.ReactNode }) => <footer>{children}</footer>,
}))
vi.mock('@/components/movimientos/BitacoraDelRecurso', () => ({ BitacoraDelRecurso: () => null }))

import { CajonDeLaFactura } from './CajonDeLaFactura'
import type { FacturaDelMes } from '@/lib/api/facturacion-por-mes.service'
import { formatCurrency } from '@/lib/format'

const FACTURA = {
  clave: 'c-1|2026-09|INQUILINO',
  cuotaId: 'cuota-1',
  contractId: 'c-1',
  codigo: 12,
  numeroExterno: null,
  inmueble: 'Calle 10 # 43-21',
  mes: '2026-09',
  destinatario: 'INQUILINO',
  terceroId: 't-1',
  terceroNombre: 'Iván Inquilino',
  terceroDocumento: '1020304050',
  lineas: [{ tipo: 'CANON', nombre: 'Canon de arrendamiento', valorCop: 2_000_000, resta: false }],
  subtotalCop: 2_000_000,
  descuentoCop: 0,
  baseCop: 2_000_000,
  ivaCop: 380_000,
  retencionesCop: 70_000,
  totalCop: 2_380_000,
  netoCop: 2_310_000,
  impuestos: [],
  impuestosSinConfirmar: false,
  notasTributarias: [],
  escenario: null,
  estado: 'POR_EMITIR',
  numero: null,
  numeroDian: null,
  emitible: true,
  motivoNoEmitible: null,
  avisos: [],
  mora: null,
  diasFacturados: 30,
  diasDelMes: 30,
  deduccionAlEgresoCop: 0,
  facturaId: null,
} as unknown as FacturaDelMes

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function pintar(factura: FacturaDelMes | null) {
  act(() =>
    root.render(
      <CajonDeLaFactura
        factura={factura}
        onCerrar={() => {}}
        onGenerarUna={() => {}}
        motivoParaNoEmitir={null}
        ocupado={false}
      />,
    ),
  )
}

describe('el cajón de la factura', () => {
  it('🔴 al cerrarse sigue mostrando la factura mientras sale (no sale en blanco)', () => {
    pintar(FACTURA)
    expect(host.querySelector('[data-testid="cajon"]')?.getAttribute('data-abierto')).toBe('si')
    expect(host.textContent).toContain('Iván Inquilino')

    pintar(null)
    expect(host.querySelector('[data-testid="cajon"]')?.getAttribute('data-abierto')).toBe('no')
    expect(host.textContent).toContain('Iván Inquilino')
    expect(host.querySelector('[data-testid="cajon-total"]')?.textContent).toBe(
      formatCurrency(2_380_000),
    )
  })

  it('la plata se lee igual que antes: base, IVA, retenciones con «−», total y lo que se paga', () => {
    pintar(FACTURA)
    const texto = host.textContent ?? ''
    expect(texto).toContain(formatCurrency(2_000_000))
    expect(texto).toContain(formatCurrency(380_000))
    expect(texto).toContain(`−${formatCurrency(70_000)}`)
    expect(host.querySelector('[data-testid="cajon-total"]')?.textContent).toBe(
      formatCurrency(2_380_000),
    )
    expect(texto).toContain(formatCurrency(2_310_000))
  })

  it('sin IVA dice «—», como antes', () => {
    pintar({ ...FACTURA, ivaCop: 0, totalCop: 2_000_000 } as FacturaDelMes)
    const filas = Array.from(host.querySelectorAll('dt')).map((dt) => [
      dt.textContent,
      dt.nextElementSibling?.textContent,
    ])
    expect(filas).toContainEqual(['IVA', '—'])
  })
})
