'use client';

/**
 * Landlord payment methods — service-layer mapper (payment-methods v2).
 *
 * The `PaymentAccountsSection.tsx` UI speaks the `PaymentAccount` display union
 * (`type: 'bank' | 'wallet'`, `accountType: 'savings' | 'checking'`,
 * `accountHolderName`, …). The backend returns the flat `LandlordPaymentMethod`
 * Prisma shape (`bankName` free text, `accountType: 'AHORROS' | 'CORRIENTE' | null`,
 * `holderName`, `methodType`, `isDefault`, + property-assignment endpoints).
 *
 * This module maps wire↔display so the component keeps working unchanged against
 * the real v2 contract: bank + wallet (NEQUI/DAVIPLATA) create, property
 * assignment (`GET /assignments`, `POST /:id/assign`, `DELETE /:id/assign/:propertyId`),
 * and `isDefault` (via `PATCH isDefault:true`, which the backend honours).
 *
 * Follow-up (optional): once the back's `@ApiResponse` DTOs are regenerated into
 * `generated/back.ts`, replace `LandlordPaymentMethodWire` with the generated type.
 * See docs/backend-handoff-payment-methods.md.
 */

import { apiClient, ApiError } from './client';
import type {
  BankAccount,
  DigitalWallet,
  PaymentAccount,
  PropertyAccountAssignment,
  WalletCode,
} from '@/lib/types/payment-accounts';
import { COLOMBIAN_BANKS, getWalletByCode } from '@/lib/types/payment-accounts';

const BASE = '/landlords/me/payment-methods';

// ============================================================================
// Wire types — the shape the backend (payment-methods v2) actually returns.
// ============================================================================

type WireAccountType = 'AHORROS' | 'CORRIENTE';
type WireMethodType = 'PSE' | 'BANK_TRANSFER' | 'CASH' | 'NEQUI' | 'DAVIPLATA' | 'CHECK';

export interface LandlordPaymentMethodWire {
  id: string;
  bankName: string;
  // Nullable for wallet methods (NEQUI/DAVIPLATA) since v2 relaxed the columns.
  accountType: WireAccountType | null;
  accountNumber: string | null;
  holderName: string;
  holderDocumentNumber: string | null;
  phoneNumber: string | null;
  methodType: WireMethodType;
  instructions: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  isDefault?: boolean;
}

interface CreateLandlordPaymentMethodDto {
  bankName: string;
  holderName: string;
  methodType: WireMethodType;
  // Required for bank methods, optional for wallets (NEQUI/DAVIPLATA) per the v2
  // conditional DTO. phoneNumber is required for wallets instead.
  accountType?: WireAccountType;
  accountNumber?: string;
  holderDocumentNumber?: string;
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
    accountType: wire.accountType === 'CORRIENTE' ? 'checking' : 'savings',
    accountNumber: wire.accountNumber ?? '',
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
    // `Partial<PaymentAccount>` flattens to the fields common to both
    // BankAccount/DigitalWallet (a mapped type over a union intersects keys), so
    // after narrowing on `type` we cast to read the branch-specific fields,
    // mirroring the `as Partial<BankAccount>` the caller applies in
    // PaymentAccountsSection.tsx.
    let dto: CreateLandlordPaymentMethodDto;

    if (data.type === 'wallet') {
      const wallet = data as Partial<DigitalWallet>;
      // v2 only supports NEQUI/DAVIPLATA as wallet methods.
      const methodType: WireMethodType | null =
        wallet.walletCode === 'nequi'
          ? 'NEQUI'
          : wallet.walletCode === 'daviplata'
            ? 'DAVIPLATA'
            : null;
      if (!methodType) {
        throw new ApiError(400, 'Por ahora solo se admiten billeteras Nequi y Daviplata.');
      }
      dto = {
        bankName: wallet.walletName ?? (methodType === 'NEQUI' ? 'Nequi' : 'Daviplata'),
        holderName: wallet.holderName!,
        methodType,
        phoneNumber: wallet.phoneNumber!,
      };
    } else {
      const bank = data as Partial<BankAccount>;
      dto = {
        bankName: bank.bankName!,
        accountType: bank.accountType === 'savings' ? 'AHORROS' : 'CORRIENTE',
        accountNumber: bank.accountNumber!,
        holderName: bank.accountHolderName!,
        holderDocumentNumber: bank.accountHolderDocument!,
        methodType: 'BANK_TRANSFER',
      };
    }

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
    // GET /assignments → [{ propertyId, accountId }] (v2). 404 = none yet.
    try {
      return await apiClient.get<PropertyAccountAssignment[]>(`${BASE}/assignments`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return [];
      throw err;
    }
  },

  async assignProperty(accountId: string, propertyId: string): Promise<void> {
    await apiClient.post(`${BASE}/${accountId}/assign`, { propertyId });
  },

  async unassignProperty(accountId: string, propertyId: string): Promise<void> {
    await apiClient.delete(`${BASE}/${accountId}/assign/${propertyId}`);
  },
};
