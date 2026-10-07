/**
 * SEGUIMIENTO-FRONT (03-10-2026; back ff282197): lo nuevo del back en el
 * bloque del arriendo — C-01 la terminación PROGRAMADA no es «Terminó»;
 * C-07 «Cuándo paga» es la regla del back; CR-11 el depósito sólo en
 * comercial (Nico, TAL CUAL). Preparación copiada de
 * `ArriendoDelContrato.test.tsx`; su cabecera original:
 *
 * El bloque del arriendo (Nico, 2026-09-16: «esto debe verse más unificado…
 * no uses ese tono verde… que se entienda mejor cuando uno lo vaya a leer»).
 *
 * Se prueba con los datos de la ficha que Nico estaba mirando: canon
 * $1.650.000, del 21-ago-2025 al 20-ago-2027, paga el 21 con 2 días de plazo,
 * $19.214.516 por pagar. Y con el MISMO contrato en los tres estados de la
 * deuda, moviendo sólo el día de hoy.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { Contract } from '@/lib/types/contract'
import type { ContratoDelEstadoDeCuenta, FilaDelEstadoDeCuenta } from '@/lib/types/estado-de-cuenta'
import type { UsoDeLaCuenta } from '@/lib/hooks/use-cuenta-del-contrato'
import { vigenciaDelContrato } from '@/lib/contratos/vigencia'

void React // jsx-preserve
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { uso } = vi.hoisted(() => ({
  uso: { valor: null as unknown as UsoDeLaCuenta },
}))

vi.mock('@/lib/hooks/use-cuenta-del-contrato', () => ({
  useCuentaDelContrato: () => uso.valor,
}))

import { ArriendoDelContrato, AvisoDelContrato } from './ArriendoDelContrato'

// ── Datos ────────────────────────────────────────────────────────────────────

function contrato(p: Partial<Contract> = {}): Contract {
  return {
    id: 'c-1686',
    propertyId: 'prop-1',
    tenantId: null,
    tenantDocument: '71234567',
    status: 'active',
    monthlyRent: 1_650_000,
    startDate: '2025-08-21T00:00:00.000Z',
    endDate: '2027-08-20T00:00:00.000Z',
    paymentDueDay: 21,
    diasDePlazo: 2,
    ...p,
  } as Contract
}

/** 24 cuotas del 21 de cada mes; pagadas las anteriores a `pagadasHasta`. */
function estadoDeCuenta(pagadasHasta = '2026-09-01'): ContratoDelEstadoDeCuenta {
  const arriendos: FilaDelEstadoDeCuenta[] = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(Date.UTC(2025, 7 + i, 21))
    const fecha = d.toISOString().slice(0, 10)
    const pagada = fecha < pagadasHasta
    return {
      concepto: `Arriendo ${fecha}`,
      estado: pagada ? 'CANCELADA' : 'PENDIENTE',
      fechaDePago: pagada ? fecha : null,
      valorBruto: 1_650_000,
      iva: 0,
      retencion: 0,
      reteIva: 0,
      reteIca: 0,
      valorNeto: 1_650_000,
      fechaVencimiento: fecha,
      documentoDePago: null,
      parcial: false,
      cuotaId: `q-${i}`,
    }
  })
  return {
    id: 'c-1686',
    numero: '1686',
    rol: 'INQUILINO',
    inmueble: { direccion: 'Cra 76 # 32-11' },
    vigente: true,
    secciones: { arriendos, otrosConceptos: [] },
    // El número del back (canon + administración + impuestos), tal cual.
    totales: { cancelado: 21_450_000, pendiente: 0, restaPorPagar: 19_214_516 },
    cortes: [],
  }
}

function listo(extra: Partial<UsoDeLaCuenta> = {}): UsoDeLaCuenta {
  return {
    cuenta: { estado: 'listo', contrato: estadoDeCuenta(), tenantRef: '71234567' },
    agencia: null,
    esperandoAgencia: false,
    reintentar: vi.fn(),
    ...extra,
  }
}

// ── Montaje ──────────────────────────────────────────────────────────────────

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  uso.valor = listo()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

async function pintar(c: Contract, hoy: string, props: Partial<React.ComponentProps<typeof ArriendoDelContrato>> = {}) {
  const vigencia = vigenciaDelContrato(
    { status: c.status, endDate: c.endDate, terminadoEn: c.terminadoEn ?? null },
    new Date(`${hoy}T12:00:00.000Z`),
  )
  await act(async () => {
    root.render(<ArriendoDelContrato contract={c} vigencia={vigencia} hoy={hoy} {...props} />)
  })
  await act(async () => {
    await new Promise((r) => requestAnimationFrame(() => r(null)))
  })
}

const $ = (testid: string) => container.querySelector(`[data-testid="${testid}"]`)
const texto = (testid: string) => $(testid)?.textContent?.replace(/\s+/g, ' ').trim()

// ── Pruebas ──────────────────────────────────────────────────────────────────

describe('ArriendoDelContrato — lo del back de Contratos (SEGUIMIENTO-FRONT)', () => {
  it('🔴 C-01: con la terminación PROGRAMADA (futura) va en curso y dice cuándo termina, no «Terminó»', async () => {
    await pintar(
      contrato({
        status: 'active',
        startDate: '2026-01-01',
        terminadoEn: '2026-12-15',
        endDate: '2026-12-15T00:00:00.000Z',
        finPactadoOriginal: '2026-12-31',
      }),
      '2026-10-03',
    )
    expect(texto('avance-titular')).toBe('Mes 10 de 12')
    expect(texto('avance-a-la-derecha')).toBe('Termina el 15 dic 2026')
    expect(container.textContent).not.toContain('Terminó')
    expect(container.textContent).toContain('Fin pactado')
  })

  it('🔴 C-07: «Cuándo paga» es la frase del back (`reglaDeCobro`)', async () => {
    const frase = 'Se genera y vence el 1 de cada mes, con 3 días de plazo (el del vencimiento cuenta como el primero): la mora corre desde el día 4.'
    await pintar(
      contrato({
        reglaDeCobro: {
          modo: 'PRORRATEADO',
          venceElDia: 1,
          primeraCuotaVenceEl: null,
          diasDePlazo: 3,
          origenDelPlazo: 'INMOBILIARIA',
          moraDesdeElDia: 4,
          diaDePagoLegado: 21,
          diaDePagoAplica: false,
          frase,
        },
      }),
      '2026-09-16',
    )
    expect(texto('ritmo-de-pago')).toBe(frase)
  })

  it('🔴 CR-11: en vivienda (lo dice el back) no hay depósito, aunque haya uno viejo guardado', async () => {
    await pintar(
      contrato({ usoInmueble: 'COMERCIAL', deposit: 5_000_000, depositoDelContrato: { aplica: false, valorCop: 5_000_000 } }),
      '2026-09-16',
    )
    expect($('deposito-del-arriendo')).toBeNull()
  })

  it('🔴 CR-11: en comercial se muestra, y sin valor dice «Sin depósito pactado»', async () => {
    await pintar(contrato({ usoInmueble: 'COMERCIAL', depositoDelContrato: { aplica: true, valorCop: null } }), '2026-09-16')
    expect(texto('deposito-del-arriendo')).toBe('Sin depósito pactado')
  })
})
