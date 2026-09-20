import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import type { Contract } from '@/lib/types/contract'
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta'

void React // jsx-preserve
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { inquilinoMock, propietarioMock, agenciaMock } = vi.hoisted(() => ({
  inquilinoMock: vi.fn(),
  propietarioMock: vi.fn(),
  agenciaMock: vi.fn(),
}))

vi.mock('@/lib/api/estado-de-cuenta.service', () => ({
  estadoDeCuentaApi: { inquilino: inquilinoMock, propietario: propietarioMock },
  rutaDelEstadoDeCuenta: (lado: string, id: string) => `/panel/inmobiliaria/estado-de-cuenta/${lado}/${id}`,
}))
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  agencyApi: { getMyAgency: agenciaMock },
}))

import { useCuentaDelContrato, type UsoDeLaCuenta } from './use-cuenta-del-contrato'

type ParaLaCuenta = Parameters<typeof useCuentaDelContrato>[0]

function contrato(p: Partial<Contract> = {}): ParaLaCuenta {
  return {
    id: 'c-1',
    status: 'active',
    tenantId: 'u-1',
    tenantDocument: '71234567',
    paymentDueDay: 21,
    diasDePlazo: 2,
    ...p,
  } as ParaLaCuenta
}

function doc(ids: string[]): EstadoDeCuenta {
  return {
    cliente: { nombre: 'Ana Díaz', documento: '71234567', tipo: 'INQUILINO' },
    inmobiliaria: { razonSocial: 'X', nit: null, matricula: null, telefono: null, ciudad: null, logoUrl: null },
    fecha: '2026-09-16',
    contratos: ids.map((id, i) => ({
      id,
      numero: String(100 + i),
      rol: 'INQUILINO',
      inmueble: { direccion: `Dirección ${i}` },
      vigente: true,
      secciones: { arriendos: [], otrosConceptos: [] },
      totales: { cancelado: 0, pendiente: 0, restaPorPagar: (i + 1) * 1_000_000 },
      cortes: [],
    })),
    totales: { cancelado: 0, pendiente: 0, restaPorPagar: 0 },
  }
}

let root: Root
let container: HTMLDivElement
const resultado: { actual: UsoDeLaCuenta | null } = { actual: null }

function Sonda({ c }: { c: ParaLaCuenta }) {
  resultado.actual = useCuentaDelContrato(c)
  return null
}

async function montar(c: ParaLaCuenta) {
  await act(async () => {
    root.render(<Sonda c={c} />)
  })
  // Deja resolver las promesas de las dos llamadas.
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  inquilinoMock.mockReset()
  propietarioMock.mockReset()
  agenciaMock.mockReset()
  resultado.actual = null
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('useCuentaDelContrato — de dónde sale la plata de la ficha', () => {
  it('toma ESTE contrato del estado de cuenta del inquilino, por su id', async () => {
    inquilinoMock.mockResolvedValue(doc(['otro', 'c-1']))

    await montar(contrato())

    expect(inquilinoMock).toHaveBeenCalledWith('u-1')
    const cuenta = resultado.actual!.cuenta
    expect(cuenta.estado).toBe('listo')
    if (cuenta.estado !== 'listo') return
    expect(cuenta.contrato.id).toBe('c-1')
    // El segundo del documento, no el total del cliente ni el primero.
    expect(cuenta.contrato.totales.restaPorPagar).toBe(2_000_000)
  })

  it('🔴 un migrado sin cuenta se pide por el DOCUMENTO del inquilino, nunca del lado del propietario', async () => {
    inquilinoMock.mockResolvedValue(doc(['c-1']))

    await montar(contrato({ tenantId: null }))

    expect(inquilinoMock).toHaveBeenCalledWith('71234567')
    expect(propietarioMock).not.toHaveBeenCalled()
    expect(resultado.actual!.cuenta.estado).toBe('listo')
  })

  it('sin cuenta ni documento no pide nada y lo dice', async () => {
    await montar(contrato({ tenantId: null, tenantDocument: '  ' }))

    expect(inquilinoMock).not.toHaveBeenCalled()
    expect(resultado.actual!.cuenta.estado).toBe('sin-inquilino')
  })

  it('un contrato sin activar no tiene cuotas: no pide el estado de cuenta', async () => {
    for (const status of ['draft', 'pending_tenant', 'signed', 'cancelled'] as const) {
      await montar(contrato({ status }))
      expect(resultado.actual!.cuenta.estado).toBe('no-aplica')
    }
    expect(inquilinoMock).not.toHaveBeenCalled()
  })

  it('si el documento no trae este contrato, no se inventa uno: «sin cuotas»', async () => {
    inquilinoMock.mockResolvedValue(doc(['otro']))

    await montar(contrato())

    expect(resultado.actual!.cuenta).toEqual({ estado: 'sin-cuotas', tenantRef: 'u-1' })
  })

  it('el 404 SIN_CONTRATOS no es un fallo', async () => {
    inquilinoMock.mockRejectedValue({ status: 404, code: 'SIN_CONTRATOS' })

    await montar(contrato())

    expect(resultado.actual!.cuenta.estado).toBe('sin-cuotas')
  })

  it('un 403 es de permisos y no se reintenta; un 500 sí', async () => {
    inquilinoMock.mockRejectedValue({ status: 403 })
    await montar(contrato())
    expect(resultado.actual!.cuenta).toEqual({ estado: 'fallo', sinPermiso: true })

    inquilinoMock.mockReset()
    inquilinoMock.mockRejectedValueOnce({ status: 500 }).mockResolvedValueOnce(doc(['c-1']))
    await montar(contrato({ id: 'c-1', tenantId: 'u-2' }))
    expect(resultado.actual!.cuenta).toEqual({ estado: 'fallo', sinPermiso: false })

    await act(async () => {
      resultado.actual!.reintentar()
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(inquilinoMock).toHaveBeenCalledTimes(2)
    expect(resultado.actual!.cuenta.estado).toBe('listo')
  })
})

describe('useCuentaDelContrato — los términos de la inmobiliaria', () => {
  it('no se piden cuando el contrato define su día y su plazo', async () => {
    inquilinoMock.mockResolvedValue(doc(['c-1']))

    await montar(contrato({ diasDePlazo: 0, paymentDueDay: 5 }))

    expect(agenciaMock).not.toHaveBeenCalled()
    expect(resultado.actual!.agencia).toBeNull()
    expect(resultado.actual!.esperandoAgencia).toBe(false)
  })

  it('se piden cuando hereda el plazo, y llegan como términos', async () => {
    inquilinoMock.mockResolvedValue(doc(['c-1']))
    agenciaMock.mockResolvedValue({ diasDePlazo: 3, paymentDueDay: 5 })

    await montar(contrato({ diasDePlazo: null }))

    expect(agenciaMock).toHaveBeenCalledTimes(1)
    expect(resultado.actual!.agencia).toEqual({ diasDePlazo: 3, diaDePago: 5 })
    expect(resultado.actual!.esperandoAgencia).toBe(false)
  })

  it('si fallan, el plazo queda desconocido (null), no en cero', async () => {
    inquilinoMock.mockResolvedValue(doc(['c-1']))
    agenciaMock.mockRejectedValue(new Error('caído'))

    await montar(contrato({ diasDePlazo: null }))

    expect(resultado.actual!.agencia).toBeNull()
    expect(resultado.actual!.esperandoAgencia).toBe(false)
  })
})

/**
 * 🔴 La deuda nace con el CONTRATO (Nico, 2026-09-15). La ficha tuvo un
 * «Saldo del inquilino» que sumaba COBROS justo encima del «Resta por pagar»
 * del estado de cuenta, y las dos cifras se contradecían. Esto fija que ni el
 * hook ni el bloque vuelvan a importar nada de cobros.
 */
describe('ningún número del arriendo sale de los cobros', () => {
  // Las sentencias `import … from '…'` enteras, aunque ocupen varias líneas.
  const importsDe = (ruta: string) =>
    (readFileSync(resolve(__dirname, ruta), 'utf8').match(/^import[\s\S]*?from\s+['"][^'"]+['"]/gm) ?? []).join(
      '\n',
    )

  it('la guarda sí ve un import de cobros de varias líneas (la ficha los importa para su tarjeta)', () => {
    expect(importsDe('../../app/panel/inmobiliaria/contratos/[id]/page.tsx')).toMatch(/cobro/i)
  })

  it.each([
    './use-cuenta-del-contrato.ts',
    '../../components/contratos/ArriendoDelContrato.tsx',
    '../contratos/deuda-del-contrato.ts',
  ])('%s no importa cobros', (ruta) => {
    expect(importsDe(ruta)).not.toMatch(/cobro/i)
  })
})
