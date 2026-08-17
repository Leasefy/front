/**
 * payment-methods.service — interim wire↔display mapper.
 *
 * Contract under test: the currently-deployed backend returns the flat
 * `LandlordPaymentMethod` Prisma shape (bankName, accountType: AHORROS|CORRIENTE,
 * holderName, methodType, etc.) — NOT the front's `PaymentAccount` display union
 * (type: 'bank'|'wallet', accountType: 'savings'|'checking', accountHolderName…).
 * `wireToDisplay` bridges that gap so `PaymentAccountsSection.tsx` keeps working
 * unchanged. See docs/backend-handoff-payment-methods.md for the full contract.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getMock, postMock, patchMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
  deleteMock: vi.fn(),
}))

vi.mock('../client', () => {
  class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message)
      this.name = 'ApiError'
    }
  }
  return {
    apiClient: {
      get: (...args: unknown[]) => getMock(...args),
      post: (...args: unknown[]) => postMock(...args),
      patch: (...args: unknown[]) => patchMock(...args),
      delete: (...args: unknown[]) => deleteMock(...args),
    },
    ApiError,
  }
})

import { ApiError } from '../client'
import { paymentMethodsApi } from '../payment-methods.service'

beforeEach(() => {
  getMock.mockReset()
  postMock.mockReset()
  patchMock.mockReset()
  deleteMock.mockReset()
})

const BANK_WIRE_ROW = {
  id: 'pm-1',
  bankName: 'Bancolombia',
  accountType: 'AHORROS' as const,
  accountNumber: '1234567890',
  holderName: 'Juan Pérez',
  holderDocumentNumber: '1000123456',
  phoneNumber: null,
  methodType: 'BANK_TRANSFER' as const,
  instructions: null,
  isActive: true,
  createdAt: '2026-08-01T00:00:00.000Z',
}

const NEQUI_WIRE_ROW = {
  id: 'pm-2',
  bankName: 'Nequi',
  accountType: 'AHORROS' as const,
  accountNumber: '3001234567',
  holderName: 'María López',
  holderDocumentNumber: null,
  phoneNumber: '3001234567',
  methodType: 'NEQUI' as const,
  instructions: null,
  isActive: true,
  createdAt: '2026-08-02T00:00:00.000Z',
}

describe('paymentMethodsApi.getAll — wire→display mapping', () => {
  it('maps a bank wire row into a display bank account', async () => {
    getMock.mockResolvedValue([BANK_WIRE_ROW])

    const [account] = await paymentMethodsApi.getAll()

    expect(account).toMatchObject({
      type: 'bank',
      bankName: 'Bancolombia',
      accountType: 'savings',
      accountHolderName: 'Juan Pérez',
    })
  })

  it('maps a NEQUI wire row into a display digital wallet', async () => {
    getMock.mockResolvedValue([NEQUI_WIRE_ROW])

    const [account] = await paymentMethodsApi.getAll()

    expect(account).toMatchObject({
      type: 'wallet',
      walletCode: 'nequi',
      phoneNumber: '3001234567',
    })
  })

  it('returns [] on a 404 (no payment methods yet)', async () => {
    getMock.mockRejectedValue(new ApiError(404, 'Not found'))

    expect(await paymentMethodsApi.getAll()).toEqual([])
  })
})

describe('paymentMethodsApi.create — display→DTO mapping', () => {
  it('POSTs the real backend DTO for a bank account', async () => {
    postMock.mockResolvedValue(BANK_WIRE_ROW)

    await paymentMethodsApi.create({
      type: 'bank',
      bankName: 'Bancolombia',
      accountType: 'savings',
      accountNumber: '1234567890',
      accountHolderName: 'Juan Pérez',
      accountHolderDocument: '1000123456',
    })

    expect(postMock).toHaveBeenCalledTimes(1)
    const [, body] = postMock.mock.calls[0]
    expect(body).toMatchObject({
      bankName: 'Bancolombia',
      accountType: 'AHORROS',
      accountNumber: '1234567890',
      holderName: 'Juan Pérez',
      holderDocumentNumber: '1000123456',
      methodType: 'BANK_TRANSFER',
    })
    expect(body).not.toHaveProperty('bankCode')
    expect(body).not.toHaveProperty('type')
    expect(body).not.toHaveProperty('isDefault')
  })

  it('rejects wallet creation — not supported by the currently-deployed backend', async () => {
    await expect(
      paymentMethodsApi.create({
        type: 'wallet',
        walletCode: 'nequi',
        phoneNumber: '3001234567',
        holderName: 'María López',
      }),
    ).rejects.toThrow(ApiError)
    expect(postMock).not.toHaveBeenCalled()
  })
})

describe('paymentMethodsApi.assignProperty — interim no-op', () => {
  it('resolves without calling the network', async () => {
    await expect(paymentMethodsApi.assignProperty('pm-1', 'prop-1')).resolves.toBeUndefined()
    expect(postMock).not.toHaveBeenCalled()
  })
})
