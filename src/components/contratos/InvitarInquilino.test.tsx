/**
 * T-0036 contract.md §3.2.B6 — la salida de un contrato migrado sin
 * inquilino: invitarlo (o vincularlo, si el correo ya tenía cuenta) desde
 * el detalle del contrato. Cubre el gate de visibilidad
 * (`tenantId === null && !!tenantEmail`), el permiso `contratos:create`
 * (NO `contratos:edit` — Y2), las dos copias de éxito que NUNCA comparten
 * frase (§3.2.B3), y el 409 que fuerza un refetch (§3.3-E2).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // evita que el transform de JSX tree-shakee el import

vi.mock('@/lib/api/contracts.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/contracts.service')>()
  return { ...actual, contractsApi: { ...actual.contractsApi, invitarInquilino: vi.fn() } }
})

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { contractsApi } from '@/lib/api/contracts.service'
import { ApiError } from '@/lib/api/client'
import { toast } from '@/components/ui/toast'
import { InvitarInquilino } from './InvitarInquilino'
import type { Contract } from '@/lib/types/contract'

const invitarInquilino = contractsApi.invitarInquilino as unknown as ReturnType<typeof vi.fn>

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

describe('<InvitarInquilino>', () => {
  it('no renderiza nada cuando el contrato ya tiene inquilino', () => {
    render({ contract: contratoBase({ tenantId: 'ya-tiene' }), puedeInvitar: true })
    expect(container.textContent).toBe('')
  })

  it('sin correo: dice "Sin correo de inquilino" y NO ofrece botón', () => {
    render({ contract: contratoBase({ tenantEmail: '' }), puedeInvitar: true })
    expect(container.textContent).toContain('Sin correo de inquilino')
    expect(boton()).toBeNull()
  })

  it('con correo y sin permiso: muestra el correo pero NO el botón', () => {
    render({
      contract: contratoBase({ tenantEmail: 'ana@correo.co' }),
      puedeInvitar: false,
    })
    expect(container.textContent).toContain('ana@correo.co')
    expect(boton()).toBeNull()
  })

  it('con correo y permiso: muestra el correo Y el botón', () => {
    render({
      contract: contratoBase({ tenantEmail: 'ana@correo.co' }),
      puedeInvitar: true,
    })
    expect(container.textContent).toContain('ana@correo.co')
    expect(boton()).not.toBeNull()
  })

  it('invitado:true — llama a onActualizado con el contrato mapeado y muestra el mensaje de invitación enviada', async () => {
    invitarInquilino.mockResolvedValue({
      invitado: true,
      tenantId: 'usuario-1',
      contrato: { ...backendContratoCrudo(), tenantId: 'usuario-1' },
    })
    const onActualizado = vi.fn()
    render({
      contract: contratoBase({ tenantEmail: 'ana@correo.co' }),
      puedeInvitar: true,
      onActualizado,
    })

    await act(async () => {
      boton()!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(invitarInquilino).toHaveBeenCalledWith('c-1')
    expect(onActualizado).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'usuario-1' }),
    )
    expect(toast.success).toHaveBeenCalledTimes(1)
    const mensajeInvitado = (toast.success as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string

    // invitado:false debe usar una frase DISTINTA — nunca la misma para los dos 200.
    invitarInquilino.mockResolvedValue({
      invitado: false,
      tenantId: 'usuario-2',
      contrato: { ...backendContratoCrudo(), tenantId: 'usuario-2' },
    })
    render({
      contract: contratoBase({ tenantEmail: 'ana@correo.co' }),
      puedeInvitar: true,
      onActualizado,
    })
    await act(async () => {
      boton()!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((r) => setTimeout(r, 0))
    })
    const mensajeVinculado = (toast.success as unknown as ReturnType<typeof vi.fn>).mock
      .calls[1][0] as string

    expect(mensajeInvitado).not.toBe(mensajeVinculado)
  })

  it('409 CONTRATO_YA_TIENE_INQUILINO: muestra el mensaje y llama a onConflicto para releer', async () => {
    invitarInquilino.mockRejectedValue(
      new ApiError(409, 'Ese contrato ya tiene un inquilino vinculado.', 'CONTRATO_YA_TIENE_INQUILINO'),
    )
    const onConflicto = vi.fn()
    render({
      contract: contratoBase({ tenantEmail: 'ana@correo.co' }),
      puedeInvitar: true,
      onConflicto,
    })

    await act(async () => {
      boton()!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(container.textContent).toContain('Ese contrato ya tiene un inquilino vinculado.')
    expect(onConflicto).toHaveBeenCalledTimes(1)
  })

  it('502 INVITACION_FALLIDA: muestra el mensaje y deja el botón — reintentar es seguro', async () => {
    invitarInquilino.mockRejectedValue(
      new ApiError(502, 'No pudimos enviar la invitación. Probá de nuevo en un momento.', 'INVITACION_FALLIDA'),
    )
    render({
      contract: contratoBase({ tenantEmail: 'ana@correo.co' }),
      puedeInvitar: true,
    })

    await act(async () => {
      boton()!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(container.textContent).toContain('No pudimos enviar la invitación')
    expect(boton()).not.toBeNull()
    expect(boton()!.disabled).toBe(false)
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
