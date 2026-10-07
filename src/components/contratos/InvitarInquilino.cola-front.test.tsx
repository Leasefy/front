/**
 * 🔴 QA-CONT CR-08 (COLA-FRONT, 04-10-2026; Nico: «Sólo desde el contrato… 7
 * días + Reenviar»): el botón del contrato es el que manda el back
 * (`GET /contracts/:id/invitacion-del-inquilino`), con el estado en palabras, y
 * al reenviar nunca se dice «enviada» si no salió (`reenvio.enviada: false`).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // evita que el transform de JSX tree-shakee el import

vi.mock('@/lib/api/contracts.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/contracts.service')>()
  // CR-08: sin el estado del back (un back anterior), el comportamiento de siempre.
  return {
    ...actual,
    contractsApi: {
      ...actual.contractsApi,
      invitarInquilino: vi.fn(),
      invitacionDelInquilino: vi.fn(() => Promise.reject(new Error('back anterior'))),
    },
  }
})

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }))

import { contractsApi } from '@/lib/api/contracts.service'
import { ApiError } from '@/lib/api/client'
import { toast } from '@/components/ui/toast'
import { InvitarInquilino } from './InvitarInquilino'
import type { Contract } from '@/lib/types/contract'

const invitarInquilino = contractsApi.invitarInquilino as unknown as ReturnType<typeof vi.fn>
const invitacionDelInquilino = contractsApi.invitacionDelInquilino as unknown as ReturnType<typeof vi.fn>

function contratoBase(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'c-1',
    propertyId: null,
    tenantId: null,
    landlordId: 'land-1',
    status: 'active',
    propertyAddress: '',
    propertyCity: '',
    tenantName: '',
    tenantEmail: '',
    tenantPhone: '',
    tenantDocument: '',
    landlordName: 'Propietario X',
    landlordEmail: 'land@x.co',
    landlordDocument: '',
    monthlyRent: 2_000_000,
    adminFee: 0,
    startDate: '2025-01-01',
    endDate: '2030-01-01',
    paymentDueDay: 5,
    landlordSignature: null,
    tenantSignature: null,
    createdAt: '2026-08-27T00:00:00.000Z',
    updatedAt: '2026-08-27T00:00:00.000Z',
    ...overrides,
  }
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

function render(props: {
  contract: Contract
  puedeInvitar: boolean
  onActualizado?: (c: Contract) => void
  onConflicto?: () => void
}) {
  act(() => {
    root.render(
      <InvitarInquilino
        contract={props.contract}
        puedeInvitar={props.puedeInvitar}
        onActualizado={props.onActualizado ?? vi.fn()}
        onConflicto={props.onConflicto ?? vi.fn()}
      />,
    )
  })
}

function boton() {
  return container.querySelector('[data-testid="invitar-inquilino"]') as HTMLButtonElement | null
}


async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

function estado(over: Record<string, unknown>) {
  return {
    estado: 'PENDIENTE',
    accion: 'REENVIAR',
    ultimoEnvio: '2026-10-01T15:00:00.000Z',
    vence: '2026-10-08T15:00:00.000Z',
    diasDeVigencia: 7,
    ...over,
  }
}

describe('<InvitarInquilino> con el estado del back (CR-08)', () => {
  it('🔴 PENDIENTE: dice cuándo salió y hasta cuándo vale, y ofrece «Reenviar invitación»', async () => {
    invitacionDelInquilino.mockResolvedValue(estado({}))
    render({ contract: contratoBase({ tenantId: 'u-1', tenantEmail: 'ana@correo.co' }), puedeInvitar: true })
    await esperar()
    expect(container.textContent).toContain('Invitación al portal enviada el 1 de octubre de 2026')
    expect(container.textContent).toContain('vale hasta el 8 de octubre de 2026')
    expect(boton()!.textContent).toContain('Reenviar invitación')
  })

  it('VENCIDA: lo dice y ofrece reenviar', async () => {
    invitacionDelInquilino.mockResolvedValue(estado({ estado: 'VENCIDA', vence: '2026-09-20T15:00:00.000Z' }))
    render({ contract: contratoBase({ tenantId: 'u-1', tenantEmail: 'ana@correo.co' }), puedeInvitar: true })
    await esperar()
    expect(container.textContent).toContain('La invitación al portal venció el 20 de septiembre de 2026')
    expect(boton()!.textContent).toContain('Reenviar invitación')
  })

  it('YA_ENTRO: sin botón, con el estado en palabras', async () => {
    invitacionDelInquilino.mockResolvedValue(estado({ estado: 'YA_ENTRO', accion: null }))
    render({ contract: contratoBase({ tenantId: 'u-1', tenantEmail: 'ana@correo.co' }), puedeInvitar: true })
    await esperar()
    expect(container.textContent).toContain('Ya entró al portal.')
    expect(boton()).toBeNull()
  })

  it('SIN_CUENTA sin correo: no ofrece invitar', async () => {
    invitacionDelInquilino.mockResolvedValue(
      estado({ estado: 'SIN_CUENTA', accion: null, ultimoEnvio: null, vence: null }),
    )
    render({ contract: contratoBase({ tenantEmail: '' }), puedeInvitar: true })
    await esperar()
    expect(container.textContent).toContain('Sin correo de inquilino')
    expect(boton()).toBeNull()
  })

  it('SIN_CUENTA con correo: «Invitar al portal»', async () => {
    invitacionDelInquilino.mockResolvedValue(
      estado({ estado: 'SIN_CUENTA', accion: 'INVITAR', ultimoEnvio: null, vence: null }),
    )
    render({ contract: contratoBase({ tenantEmail: 'ana@correo.co' }), puedeInvitar: true })
    await esperar()
    expect(boton()!.textContent).toContain('Invitar al portal')
  })

  it('🔴 un reenvío que NO salió nunca dice «enviada»: avisa con la frase del back', async () => {
    invitacionDelInquilino.mockResolvedValue(estado({ estado: 'VENCIDA' }))
    invitarInquilino.mockResolvedValue({
      invitado: false,
      tenantId: 'u-1',
      contrato: { ...backendContratoCrudo(), tenantId: 'u-1' },
      reenvio: {
        enviada: false,
        motivo: 'CORREO_NO_CONFIGURADO',
        mensaje: 'La invitación no salió: el envío de correos no está configurado en este ambiente.',
        invitacion: estado({ estado: 'VENCIDA' }),
      },
    })
    render({ contract: contratoBase({ tenantId: 'u-1', tenantEmail: 'ana@correo.co' }), puedeInvitar: true })
    await esperar()
    await act(async () => {
      boton()!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.warning).toHaveBeenCalledWith(
      'La invitación no salió: el envío de correos no está configurado en este ambiente.',
    )
  })

  it('un reenvío que salió: la frase del back y el estado nuevo', async () => {
    invitacionDelInquilino.mockResolvedValue(estado({ estado: 'VENCIDA' }))
    invitarInquilino.mockResolvedValue({
      invitado: false,
      tenantId: 'u-1',
      contrato: { ...backendContratoCrudo(), tenantId: 'u-1' },
      reenvio: {
        enviada: true,
        motivo: null,
        mensaje: 'Le reenviamos la invitación al portal a ana@correo.co. Vale hasta el 11 de octubre de 2026.',
        invitacion: estado({ ultimoEnvio: '2026-10-04T15:00:00.000Z', vence: '2026-10-11T15:00:00.000Z' }),
      },
    })
    render({ contract: contratoBase({ tenantId: 'u-1', tenantEmail: 'ana@correo.co' }), puedeInvitar: true })
    await esperar()
    await act(async () => {
      boton()!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(toast.success).toHaveBeenCalledWith(
      'Le reenviamos la invitación al portal a ana@correo.co. Vale hasta el 11 de octubre de 2026.',
    )
    expect(container.textContent).toContain('vale hasta el 11 de octubre de 2026')
  })
})

function backendContratoCrudo() {
  return {
    id: 'c-1',
    propertyId: null,
    tenantId: null,
    landlordId: 'land-1',
    status: 'ACTIVE',
    landlordName: 'Propietario X',
    landlordEmail: 'land@x.co',
    landlordDocument: null,
    tenantName: null,
    tenantEmail: 'ana@correo.co',
    tenantPhone: null,
    tenantDocument: null,
    propertyAddress: '',
    propertyCity: null,
    propertyAdminFee: null,
    monthlyRent: 2_000_000,
    startDate: '2025-01-01',
    endDate: '2030-01-01',
    paymentDay: 5,
    createdAt: '2026-08-27T00:00:00.000Z',
    updatedAt: '2026-08-27T00:00:00.000Z',
  }
}
