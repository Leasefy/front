/**
 * 02-10-2026 · Las acciones sueltas de la ficha del contrato con la regla de
 * oro: un 5xx dice que falló «de nuestro lado» con la referencia y nunca
 * culpa a la conexión; la conexión se dice SÓLO cuando no hubo respuesta.
 *
 * Invitar al inquilino, vincular el inmueble, enviar la carta del incremento
 * desde la bandeja, la garantía de servicios, el concepto comisionable y los
 * cobros al arrendar. Antes pintaban `err.message` crudo o «Intenta de nuevo».
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/contracts.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/contracts.service')>()
  return {
    ...actual,
    contractsApi: { ...actual.contractsApi, invitarInquilino: vi.fn(), asignarInmueble: vi.fn() },
  }
})
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  consignacionesApi: {
    getAll: vi.fn(async () => [
      {
        id: 'cons-1',
        propertyId: 'p-1',
        propertyTitle: 'Apto 301',
        propertyAddress: 'Cra 13 # 4-5',
        code: 12,
        status: 'active',
        availability: 'available',
      },
    ]),
  },
}))
vi.mock('@/components/ui/combobox', () => ({
  Combobox: ({
    options,
    onChange,
  }: {
    options: Array<{ value: string; label: string }>
    onChange: (v: string | undefined) => void
  }) => (
    <div>
      {options.map((o) => (
        <button key={o.value} type="button" data-testid={`opcion-${o.value}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  ),
}))
vi.mock('@/lib/api/ciclo-de-vida.service', () => ({
  cicloDeVidaApi: {
    enviarCarta: vi.fn(),
    garantiaDeServicios: vi.fn(),
    registrarGarantia: vi.fn(),
    movimientoDeGarantia: vi.fn(),
    anularMovimientoDeGarantia: vi.fn(),
    soporteDeLaGarantia: vi.fn(),
  },
}))
vi.mock('@/lib/api/mandato.service', () => ({
  mandatoApi: { marcarComisionable: vi.fn(), cobrosAlArrendar: vi.fn(), aplicarCobrosAlArrendar: vi.fn() },
}))
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children?: React.ReactNode }) => <a href={href}>{children}</a>,
}))
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { contractsApi } from '@/lib/api/contracts.service'
import { cicloDeVidaApi, type CartaEnLaBandeja } from '@/lib/api/ciclo-de-vida.service'
import { mandatoApi } from '@/lib/api/mandato.service'
import { ApiError } from '@/lib/api/client'
import { toast } from '@/components/ui/toast'
import type { Contract } from '@/lib/types/contract'
import { InvitarInquilino } from './InvitarInquilino'
import { VincularInmueble } from './VincularInmueble'
import { Fila as CartaDeLaBandeja } from './BandejaDeCartasDelIncremento'
import { GarantiaDeServiciosDelContrato } from './GarantiaDeServiciosDelContrato'
import { ComisionableDelConcepto } from '@/components/inmobiliaria/mandato/ComisionableDelConcepto'
import { CobrosAlArrendarDelContrato } from '@/components/inmobiliaria/mandato/CobrosAlArrendarDelContrato'

const contratos = contractsApi as unknown as Record<string, ReturnType<typeof vi.fn>>
const ciclo = cicloDeVidaApi as unknown as Record<string, ReturnType<typeof vi.fn>>
const mandato = mandatoApi as unknown as Record<string, ReturnType<typeof vi.fn>>
const toastError = toast.error as unknown as ReturnType<typeof vi.fn>

const fallo500 = () =>
  new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
    statusCode: 500,
    code: 'ERROR_INTERNO',
    message: 'Error interno del servidor.',
    referencia: 'ab12cd34',
  })
const sinRed = () => new ApiError(0, 'Failed to fetch')

/** Lo que dice el 5xx: de nuestro lado, con la referencia, sin la palabra «conexión». */
function esDeNuestroLado(texto: string) {
  expect(texto).toContain('de nuestro lado')
  expect(texto).toContain('ab12cd34')
  expect(texto).not.toMatch(/conexión/i)
  expect(texto).not.toContain('Error interno del servidor')
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.clearAllMocks()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function montar(el: React.ReactElement) {
  await act(async () => {
    root.render(el)
  })
}

async function clic(el: Element | null) {
  await act(async () => {
    ;(el as HTMLElement).click()
    await Promise.resolve()
  })
  await act(async () => {})
}

const $ = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)
const descripcionDelToast = (i = 0) => (toastError.mock.calls[i][1] as { description: string }).description

describe('<InvitarInquilino>', () => {
  const contrato = { id: 'c-1', tenantId: null, tenantEmail: 'ana@correo.co' } as unknown as Contract
  const invitar = () => (
    <InvitarInquilino contract={contrato} puedeInvitar onActualizado={vi.fn()} onConflicto={vi.fn()} />
  )

  it('un 5xx dice que es nuestro, con la referencia', async () => {
    contratos.invitarInquilino.mockRejectedValue(fallo500())
    await montar(invitar())
    await clic($('invitar-inquilino'))
    esDeNuestroLado($('invitar-inquilino-error')!.textContent!)
  })

  it('sin respuesta habla de la conexión', async () => {
    contratos.invitarInquilino.mockRejectedValue(sinRed())
    await montar(invitar())
    await clic($('invitar-inquilino'))
    expect($('invitar-inquilino-error')!.textContent).toMatch(/conexión/i)
  })
})

describe('<VincularInmueble>', () => {
  const contrato = { id: 'c-1', propertyId: null } as unknown as Contract

  async function vincular() {
    await montar(<VincularInmueble contract={contrato} puedeVincular onActualizado={vi.fn()} />)
    const abrir = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Vincular'))!
    await clic(abrir)
    await clic($('opcion-p-1'))
    const confirmar = [...document.querySelectorAll('[role="dialog"] button')].find(
      (b) => b.textContent?.trim() === 'Vincular',
    )!
    await clic(confirmar)
  }

  it('un 5xx dice que es nuestro, con la referencia, dentro del diálogo', async () => {
    contratos.asignarInmueble.mockRejectedValue(fallo500())
    await vincular()
    esDeNuestroLado($('vincular-inmueble-error')!.textContent!)
  })

  it('sin respuesta habla de la conexión', async () => {
    contratos.asignarInmueble.mockRejectedValue(sinRed())
    await vincular()
    expect($('vincular-inmueble-error')!.textContent).toMatch(/conexión/i)
  })
})

describe('la carta del incremento en la bandeja', () => {
  const carta = {
    contractId: 'c1',
    code: 120,
    externalId: '1850',
    inquilino: 'Ana Díaz',
    correoDelInquilino: 'ana@example.com',
    inmueble: 'Cra 76 # 32-11',
    desde: '2026-10-01',
    diasParaElAniversario: 14,
    estado: 'POR_ENVIAR',
    alertaRoja: false,
    origen: 'IPC',
    porcentaje: 5.1,
    canonAnteriorCop: 2_000_000,
    canonNuevoCop: 2_102_000,
    contenido: 'Señor(a) Ana Díaz…',
    enviadaAt: null,
    medio: null,
    ultimoIntento: null,
  } as unknown as CartaEnLaBandeja
  const fila = () => (
    <ul>
      <CartaDeLaBandeja carta={carta} editable onEnviada={vi.fn(async () => {})} />
    </ul>
  )

  it('un 5xx va al toast con la referencia; sin respuesta, la conexión', async () => {
    ciclo.enviarCarta.mockRejectedValueOnce(fallo500()).mockRejectedValueOnce(sinRed())
    await montar(fila())
    await clic($('enviar-c1'))
    esDeNuestroLado(descripcionDelToast(0))
    await clic($('enviar-c1'))
    expect(descripcionDelToast(1)).toMatch(/conexión/i)
  })

  it('🔴 un 400 del texto corregido se dice debajo del texto y no al toast', async () => {
    const frase = 'El texto de la carta puede tener hasta 10000 caracteres.'
    ciclo.enviarCarta.mockRejectedValue(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [frase],
        campos: [{ campo: 'contenido', regla: 'longitud_maxima', mensaje: frase }],
      }),
    )
    await montar(fila())
    await clic($('enviar-c1'))
    expect(document.querySelector('#carta-c1-2026-10-01-texto-error')?.textContent).toBe(frase)
    expect(toastError).not.toHaveBeenCalled()
  })
})

describe('<GarantiaDeServiciosDelContrato> — abrir el soporte', () => {
  it('un 5xx dice que es nuestro con la referencia; sin respuesta, la conexión', async () => {
    ciclo.garantiaDeServicios.mockResolvedValue({
      contractId: 'c1',
      disponible: true,
      momento: 'ENTREGA',
      topeCop: null,
      topePeriodos: 2,
      mesesDelPromedio: 6,
      valorSugeridoCop: null,
      topeEfectivoCop: null,
      avisoDelTope: null,
      garantia: {
        momento: 'ENTREGA',
        valorCop: 300_000,
        facturas: null,
        soporteNombre: 'facturas.pdf',
        nota: null,
        createdAt: '2026-09-01T00:00:00.000Z',
      },
      cuenta: {
        valorCop: 300_000,
        recaudadoCop: 300_000,
        pagadoCop: 0,
        devueltoCop: 0,
        cobradoCop: 0,
        saldoCop: 300_000,
        faltaPorRecaudarCop: 0,
        diferenciaPorCobrarCop: 0,
        estado: 'RECAUDADA',
      },
      movimientos: [],
      pendiente: null,
    })
    ciclo.soporteDeLaGarantia.mockRejectedValueOnce(fallo500()).mockRejectedValueOnce(sinRed())
    await montar(<GarantiaDeServiciosDelContrato contractId="c1" puedeEditar />)
    const verSoporte = () => [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Ver soporte'))!
    await clic(verSoporte())
    esDeNuestroLado(descripcionDelToast(0))
    await clic(verSoporte())
    expect(descripcionDelToast(1)).toMatch(/conexión/i)
  })
})

describe('<ComisionableDelConcepto>', () => {
  it('un 5xx dice que es nuestro con la referencia, y el interruptor vuelve a como estaba', async () => {
    mandato.marcarComisionable.mockRejectedValueOnce(fallo500()).mockRejectedValueOnce(sinRed())
    await montar(
      <ComisionableDelConcepto
        contractId="c1"
        concepto={{ id: 'cc-1', nombre: 'Parqueadero', base: 'ARRENDAMIENTO', paga: 'INQUILINO', recibe: 'PROPIETARIO', comisionable: false }}
        puedeEditar
      />,
    )
    const casilla = () => document.querySelector<HTMLButtonElement>('button[aria-label="Comisionar Parqueadero"]')!
    await clic(casilla())
    esDeNuestroLado(descripcionDelToast(0))
    expect(casilla().getAttribute('aria-checked')).toBe('false')
    await clic(casilla())
    expect(descripcionDelToast(1)).toMatch(/conexión/i)
  })
})

describe('<CobrosAlArrendarDelContrato>', () => {
  it('un 5xx dice que es nuestro con la referencia; sin respuesta, la conexión', async () => {
    mandato.cobrosAlArrendar.mockResolvedValue({
      disponible: true,
      motivo: null,
      primerCanonCop: 2_000_000,
      propietarioName: 'Ana',
      cobros: [
        {
          id: 'k-1',
          nombre: 'Estudio del inquilino',
          tipo: 'VALOR_FIJO',
          valor: 80_000,
          valorCop: 80_000,
          opcional: true,
          aplicado: false,
        },
      ],
    })
    mandato.aplicarCobrosAlArrendar.mockRejectedValueOnce(fallo500()).mockRejectedValueOnce(sinRed())
    await montar(<CobrosAlArrendarDelContrato contractId="c1" puedeAplicar />)
    await clic(document.querySelector('button[aria-label="Aplicar Estudio del inquilino"]'))
    const aplicar = () => [...document.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Aplicar el'))!
    await clic(aplicar())
    esDeNuestroLado(descripcionDelToast(0))
    await clic(aplicar())
    expect(descripcionDelToast(1)).toMatch(/conexión/i)
  })
})
