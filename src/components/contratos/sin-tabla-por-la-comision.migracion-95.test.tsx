/**
 * CO-28 (QA-MIGRACION-95, 06-10-2026). Un contrato migrado cuyo inmueble vino
 * SIN comisión en el archivo de inmuebles (el mandato queda con
 * `comisionDesconocida`) y cuyo archivo de contratos tampoco la trae se activa
 * SIN tabla de cuotas. Visto en el navegador (agencia B, contrato de Mateo
 * Ríos Cano, mes 6 de 12):
 *
 *  - activar decía «2 contratos activados» y nada más;
 *  - la ficha decía «Comisión: Sin consignación: este inmueble no genera
 *    cobros» (SÍ hay consignación) y «Resta por pagar $ 0 · Al día · Nada
 *    vencido» sobre un contrato sin una sola cuota.
 *
 * Ahora las tres pantallas dicen lo que pasa y qué hacer.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { Contract } from '@/lib/types/contract'
import type { ResumenActivacion } from '@/lib/api/contracts.service'
import type { UsoDeLaCuenta } from '@/lib/hooks/use-cuenta-del-contrato'
import { vigenciaDelContrato } from '@/lib/contratos/vigencia'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { uso } = vi.hoisted(() => ({
  uso: { valor: null as unknown as UsoDeLaCuenta },
}))

vi.mock('@/lib/hooks/use-cuenta-del-contrato', () => ({
  useCuentaDelContrato: () => uso.valor,
}))

import { ArriendoDelContrato } from './ArriendoDelContrato'
import { AdministracionDelContrato } from './AdministracionDelContrato'
import { activarContratosCompleto } from './activarContratosCompleto'
import { mapBackendContract } from '@/lib/api/contracts.service'

const MOTIVO =
  'No sabemos la comisión de este inmueble: ni el archivo de inmuebles ni el contrato la traían. Escríbela en la ficha del contrato («Cómo se cobra» → Corregir) y la tabla de cuotas se arma.'

function contrato(p: Partial<Contract> = {}): Contract {
  return {
    id: '67ca3528',
    propertyId: 'prop-1',
    tenantId: null,
    tenantDocument: '1036654321',
    status: 'active',
    monthlyRent: 2_300_000,
    startDate: '2026-04-15T00:00:00.000Z',
    endDate: '2027-04-14T00:00:00.000Z',
    paymentDueDay: null,
    diasDePlazo: null,
    comisionPorcentaje: null,
    comisionDeConsignacion: null,
    landlordName: '',
    tenantName: '',
    ...p,
  } as unknown as Contract
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  uso.valor = {
    cuenta: { estado: 'sin-cuotas', tenantRef: '1036654321' },
    agencia: null,
    esperandoAgencia: false,
    reintentar: vi.fn(),
  } as unknown as UsoDeLaCuenta
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

const $ = (testid: string) => container.querySelector(`[data-testid="${testid}"]`)
const plano = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim()

describe('CO-28 · la ficha del contrato', () => {
  it('«Cómo va con la plata» dice que no hay tabla de cuotas y por qué, no «$ 0 · Al día»', async () => {
    const c = contrato({ comisionSinDefinir: true, sinTablaDeCuotas: MOTIVO })
    const hoy = '2026-10-06'
    const vigencia = vigenciaDelContrato(
      { status: c.status, endDate: c.endDate, terminadoEn: null },
      new Date(`${hoy}T12:00:00.000Z`),
    )
    await act(async () => {
      root.render(<ArriendoDelContrato contract={c} vigencia={vigencia} hoy={hoy} />)
    })

    const aviso = $('sin-tabla-de-cuotas')
    expect(aviso).not.toBeNull()
    expect(plano(aviso?.textContent)).toContain('Este contrato no tiene tabla de cuotas')
    expect(plano(aviso?.textContent)).toContain('No sabemos la comisión de este inmueble')
    expect($('resta-por-pagar')).toBeNull()
    // Sin el enlace a un estado de cuenta que saldría vacío.
    expect($('ver-estado-de-cuenta')).toBeNull()
  })

  it('«Comisión» no dice «Sin consignación» cuando el mandato existe y no la traía', () => {
    act(() => {
      root.render(
        <AdministracionDelContrato
          contract={contrato({ comisionSinDefinir: true, sinTablaDeCuotas: MOTIVO })}
          puedeEditar
          onActualizado={vi.fn()}
        />,
      )
    })
    const texto = plano($('administracion')?.textContent)
    expect(texto).toContain('No venía en el archivo: escríbela con «Corregir»')
    expect(texto).not.toContain('Sin consignación: este inmueble no genera cobros')
  })

  it('si el contrato trae su propia comisión, se muestra ésa y se dice de dónde sale', () => {
    act(() => {
      root.render(
        <AdministracionDelContrato
          contract={contrato({ comisionSinDefinir: true, comisionPorcentaje: 10 })}
          puedeEditar
          onActualizado={vi.fn()}
        />,
      )
    })
    expect(plano($('administracion')?.textContent)).toContain(
      '10% (la del contrato: el mandato no la traía)',
    )
  })
})

describe('CO-28 · el mapeo del contrato no los pierde', () => {
  it('`GET /contracts/:id` trae la marca y el motivo, y llegan a la ficha', () => {
    const c = mapBackendContract({
      id: '67ca3528',
      status: 'ACTIVE',
      comisionSinDefinir: true,
      sinTablaDeCuotas: MOTIVO,
    } as unknown as Parameters<typeof mapBackendContract>[0])
    expect(c.comisionSinDefinir).toBe(true)
    expect(c.sinTablaDeCuotas).toBe(MOTIVO)
  })
})

describe('CO-28 · activar', () => {
  function resumen(over: Partial<ResumenActivacion> = {}): ResumenActivacion {
    return { intentadas: 0, restantes: 0, activadas: 0, fallidas: 0, invitados: 0, resultados: [], ...over }
  }

  it('los contratos sin tabla por la comisión se suman de TODAS las tandas', async () => {
    const activar = vi
      .fn()
      .mockResolvedValueOnce(
        resumen({ intentadas: 10, activadas: 10, restantes: 2, sinComision: { cuantos: 1, motivo: MOTIVO, contratos: ['c-1'] } }),
      )
      .mockResolvedValueOnce(resumen({ intentadas: 2, activadas: 2, restantes: 0 }))

    const r = await activarContratosCompleto(activar)

    // `ultimo` es la última tanda (que no trae ninguno): igual lo dice.
    expect(r.ultimo.sinComision).toEqual({ cuantos: 1, motivo: MOTIVO, contratos: ['c-1'] })
  })

  it('sin ninguno, no viaja nada', async () => {
    const r = await activarContratosCompleto(vi.fn().mockResolvedValueOnce(resumen({ intentadas: 2, activadas: 2 })))
    expect(r.ultimo.sinComision).toBeUndefined()
  })
})

/**
 * NI-05 (QA-MIGRACION-95, 06-10; Nico (a)): la base guarda depósito 0 y
 * periodicidad MENSUAL cuando el archivo no los traía. La ficha lo distingue
 * con lo que el lote guardó del archivo (`loQueTraiaElArchivo`).
 */
describe('NI-05 · lo que el archivo no traía no se muestra como dato', () => {
  it('el mapeo no pierde `loQueTraiaElArchivo`', () => {
    const c = mapBackendContract({
      id: 'c-1',
      status: 'ACTIVE',
      loQueTraiaElArchivo: { traiaDeposito: false, traiaPeriodicidad: false },
    } as unknown as Parameters<typeof mapBackendContract>[0])
    expect(c.loQueTraiaElArchivo).toEqual({ traiaDeposito: false, traiaPeriodicidad: false })
  })

  it('periodicidad que no venía: «Sin definir», no «Mensual»', () => {
    act(() => {
      root.render(
        <AdministracionDelContrato
          contract={contrato({
            periodicidad: 'MENSUAL',
            loQueTraiaElArchivo: { traiaDeposito: false, traiaPeriodicidad: false },
          } as Partial<Contract>)}
          puedeEditar
          onActualizado={vi.fn()}
        />,
      )
    })
    const texto = plano($('administracion')?.textContent)
    expect(texto).toContain('Sin definir: el archivo no la traía')
    expect(texto).not.toMatch(/Periodicidad\s*Mensual/)
  })

  it('depósito comercial que venía en 0: «$ 0»; que no venía: «Sin depósito pactado»', async () => {
    const hoy = '2026-10-06'
    const pintar = async (traia: boolean) => {
      const c = contrato({
        deposit: 0,
        depositoDelContrato: { aplica: true, valorCop: null },
        loQueTraiaElArchivo: { traiaDeposito: traia, traiaPeriodicidad: true },
      } as Partial<Contract>)
      const vigencia = vigenciaDelContrato(
        { status: c.status, endDate: c.endDate, terminadoEn: null },
        new Date(`${hoy}T12:00:00.000Z`),
      )
      await act(async () => {
        root.render(<ArriendoDelContrato contract={c} vigencia={vigencia} hoy={hoy} />)
      })
      return plano($('deposito-del-arriendo')?.textContent)
    }
    expect(await pintar(false)).toBe('Sin depósito pactado')
    expect(await pintar(true)).toMatch(/^\$\s?0$/)
  })
})

describe('CO-20 · re-subir el mismo archivo dice cuántos ya estaban', () => {
  function resumen(over: Partial<ResumenActivacion> = {}): ResumenActivacion {
    return { intentadas: 0, restantes: 0, activadas: 0, fallidas: 0, invitados: 0, resultados: [], ...over }
  }
  it('suma `yaMigradas` de todas las tandas en `ultimo`', async () => {
    const activar = vi
      .fn()
      .mockResolvedValueOnce(resumen({ intentadas: 5, yaMigradas: 5, restantes: 3 }))
      .mockResolvedValueOnce(resumen({ intentadas: 3, yaMigradas: 3, restantes: 0 }))
    const r = await activarContratosCompleto(activar)
    expect(r.ultimo.yaMigradas).toBe(8)
  })
})
