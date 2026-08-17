'use client';

/**
 * Landlord payment methods — INTERIM service-layer patch.
 *
 * The `PaymentAccountsSection.tsx` UI was built against a mock and speaks the
 * `PaymentAccount` display union (`type: 'bank' | 'wallet'`, `accountType:
 * 'savings' | 'checking'`, `accountHolderName`, …). The CURRENTLY-DEPLOYED
 * backend returns the flat `LandlordPaymentMethod` Prisma shape instead
 * (`bankName` free text, `accountType: 'AHORROS' | 'CORRIENTE'`, `holderName`,
 * `methodType`, no `isDefault`/assignment/wallet-create support).
 *
 * This module maps wire↔display so the existing component keeps working
 * unchanged against the real, currently-deployed contract. A v2 backend
 * contract (isDefault, property assignment, wallet creation, generated types)
 * has been defined but is NOT deployed yet — once it ships, this mapper is
 * replaced by the generated types and the temporary guards below
 * (wallet-create rejection, assign/unassign no-ops) are removed.
 *
 * See docs/backend-handoff-payment-methods.md for the full contract audit.
 */

import { apiClient, ApiError } from './client';
import type {
  BankAccount,
  PaymentAccount,
  PropertyAccountAssignment,
  WalletCode,
} from '@/lib/types/payment-accounts';
import { COLOMBIAN_BANKS, getWalletByCode } from '@/lib/types/payment-accounts';

const BASE = '/landlords/me/payment-methods';

// ============================================================================
// Wire types — the shape the currently-deployed backend actually returns.
// ============================================================================

type WireAccountType = 'AHORROS' | 'CORRIENTE';
type WireMethodType = 'PSE' | 'BANK_TRANSFER' | 'CASH' | 'NEQUI' | 'DAVIPLATA' | 'CHECK';

export interface LandlordPaymentMethodWire {
  id: string;
  bankName: string;
  accountType: WireAccountType;
  accountNumber: string;
  holderName: string;
  holderDocumentNumber: string | null;
  phoneNumber: string | null;
  methodType: WireMethodType;
  instructions: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  // Not present until the v2 backend deploys — treat as optional.
  isDefault?: boolean;
}

interface CreateLandlordPaymentMethodDto {
  bankName: string;
  accountType: WireAccountType;
  accountNumber: string;
  holderName: string;
  holderDocumentNumber: string;
  methodType: WireMethodType;
  phoneNumber?: string;
  instructions?: string;
}

// ============================================================================
// Mapper
// ============================================================================

function wireToDisplay(wire: LandlordPaymentMethodWire): PaymentAccount {
  const isWallet = wire.methodType === 'NEQUI' || wire.methodType === 'DAVIPLATA';

  if (isWallet) {
    const walletCode: WalletCode = wire.methodType === 'NEQUI' ? 'nequi' : 'daviplata';
    return {
      id: wire.id,
      type: 'wallet',
      walletCode,
      walletName: getWalletByCode(walletCode)?.name ?? wire.bankName,
      phoneNumber: wire.phoneNumber ?? '',
      holderName: wire.holderName,
      isDefault: wire.isDefault ?? false,
      createdAt: wire.createdAt,
    };
  }

  const bankCode = COLOMBIAN_BANKS.find((bank) => bank.name === wire.bankName)?.code;

  return {
    id: wire.id,
    type: 'bank',
    bankCode,
    bankName: wire.bankName,
    accountType: wire.accountType === 'AHORROS' ? 'savings' : 'checking',
    accountNumber: wire.accountNumber,
    accountHolderName: wire.holderName,
    accountHolderDocument: wire.holderDocumentNumber ?? '',
    isDefault: wire.isDefault ?? false,
    createdAt: wire.createdAt,
  };
}

export const paymentMethodsApi = {
  async getAll(): Promise<PaymentAccount[]> {
    try {
      const wire = await apiClient.get<LandlordPaymentMethodWire[]>(BASE);
      return wire.map(wireToDisplay);
    } catch (err) {
      // 404 = landlord has no payment methods yet — legitimate empty state.
      // Other errors (5xx, network) propagate so callers can show an error.
      if (err instanceof ApiError && err.status === 404) return [];
      throw err;
    }
  },

  async getById(id: string): Promise<PaymentAccount> {
    const wire = await apiClient.get<LandlordPaymentMethodWire>(`${BASE}/${id}`);
    return wireToDisplay(wire);
  },

  async create(data: Partial<PaymentAccount>): Promise<PaymentAccount> {
    if (data.type === 'wallet') {
      // The currently-deployed backend's create DTO is bank-centric
      // (accountNumber/accountType/holderDocumentNumber are always required)
      // and cannot represent a wallet-only method yet. This ships with v2.
      throw new ApiError(400, 'Las billeteras estarán disponibles muy pronto.');
    }

    // `Partial<PaymentAccount>` flattens to the common BankAccount/DigitalWallet
    // fields (mapped types over a union intersect keys) — the `type !== 'wallet'`
    // check above guarantees this is bank data at runtime; cast to read the
    // bank-specific fields, mirroring the `as Partial<BankAccount>` the caller
    // already applies in PaymentAccountsSection.tsx.
    const bank = data as Partial<BankAccount>;
    const dto: CreateLandlordPaymentMethodDto = {
      bankName: bank.bankName!,
      accountType: bank.accountType === 'savings' ? 'AHORROS' : 'CORRIENTE',
      accountNumber: bank.accountNumber!,
      holderName: bank.accountHolderName!,
      holderDocumentNumber: bank.accountHolderDocument!,
      methodType: 'BANK_TRANSFER',
    };

    const wire = await apiClient.post<LandlordPaymentMethodWire>(BASE, dto);
    return wireToDisplay(wire);
  },

  async update(id: string, data: Partial<PaymentAccount>): Promise<PaymentAccount> {
    // `isDefault` is harmless to send on the old backend (ignored/dropped) and
    // works once v2 deploys — pass whatever the caller sends through as-is.
    return apiClient.patch<PaymentAccount>(`${BASE}/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/${id}`);
  },

  async getAssignments(): Promise<PropertyAccountAssignment[]> {
    // PENDING FEATURE: the backend does not expose a property-to-account assignments
    // endpoint yet. This returns [] intentionally — it is NOT a fail-open catch;
    // no network call is made, no data is silently swallowed.
    // Follow-up: wire to the real endpoint when it is added to the backend (v2).
    return [];
  },

  async assignProperty(_accountId: string, _propertyId: string): Promise<void> {
    // INTERIM NO-OP: `POST /:id/assign` does not exist on the currently-deployed
    // backend (ships with v2). Resolving without a network call prevents the
    // create flow — which loops over assignProperty — from 404-failing.
  },

  async unassignProperty(_accountId: string, _propertyId: string): Promise<void> {
    // INTERIM NO-OP — see assignProperty above. Ships with v2.
  },
};
