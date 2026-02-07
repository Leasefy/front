/**
 * Mock payment accounts data for landlord configuration
 */

import type {
  PaymentAccount,
  PropertyAccountAssignment,
  LandlordPaymentSettings,
  BankAccount,
  DigitalWallet,
} from '@/lib/types/payment-accounts';

// ============================================================================
// Mock Payment Accounts
// ============================================================================

export const MOCK_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'account-001',
    type: 'bank',
    bankCode: 'bancolombia',
    bankName: 'Bancolombia',
    accountType: 'savings',
    accountNumber: '12345674532',
    accountHolderName: 'Maria Gonzalez Perez',
    accountHolderDocument: '1020304050',
    isDefault: true,
    createdAt: '2025-06-15T10:00:00Z',
  },
  {
    id: 'account-002',
    type: 'bank',
    bankCode: 'davivienda',
    bankName: 'Davivienda',
    accountType: 'checking',
    accountNumber: '98765432101',
    accountHolderName: 'Maria Gonzalez Perez',
    accountHolderDocument: '1020304050',
    isDefault: false,
    createdAt: '2025-08-20T14:30:00Z',
  },
];

export const MOCK_DIGITAL_WALLETS: DigitalWallet[] = [
  {
    id: 'wallet-001',
    type: 'wallet',
    walletCode: 'nequi',
    walletName: 'Nequi',
    phoneNumber: '3115678789',
    holderName: 'Maria Gonzalez Perez',
    isDefault: false,
    createdAt: '2025-09-10T09:00:00Z',
  },
];

export const MOCK_PAYMENT_ACCOUNTS: PaymentAccount[] = [
  ...MOCK_BANK_ACCOUNTS,
  ...MOCK_DIGITAL_WALLETS,
];

// ============================================================================
// Mock Property Assignments
// ============================================================================

export const MOCK_PROPERTY_ASSIGNMENTS: PropertyAccountAssignment[] = [
  { propertyId: 'prop-001', accountId: 'account-001' },
  { propertyId: 'prop-004', accountId: 'account-001' },
  { propertyId: 'prop-006', accountId: 'wallet-001' },
  { propertyId: 'prop-007', accountId: null }, // Uses default
];

// ============================================================================
// Mock Landlord Payment Settings
// ============================================================================

export const MOCK_LANDLORD_PAYMENT_SETTINGS: LandlordPaymentSettings = {
  accounts: MOCK_PAYMENT_ACCOUNTS,
  assignments: MOCK_PROPERTY_ASSIGNMENTS,
  defaultAccountId: 'account-001',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all payment accounts for the current landlord
 */
export function getPaymentAccounts(): PaymentAccount[] {
  return MOCK_PAYMENT_ACCOUNTS;
}

/**
 * Get a specific payment account by ID
 */
export function getPaymentAccountById(accountId: string): PaymentAccount | undefined {
  return MOCK_PAYMENT_ACCOUNTS.find((account) => account.id === accountId);
}

/**
 * Get all property to account assignments
 */
export function getPropertyAssignments(): PropertyAccountAssignment[] {
  return MOCK_PROPERTY_ASSIGNMENTS;
}

/**
 * Get the account assigned to a specific property
 */
export function getAccountForProperty(propertyId: string): PaymentAccount | undefined {
  const assignment = MOCK_PROPERTY_ASSIGNMENTS.find((a) => a.propertyId === propertyId);
  if (!assignment || !assignment.accountId) {
    // Return default account
    return MOCK_PAYMENT_ACCOUNTS.find((a) => a.isDefault);
  }
  return MOCK_PAYMENT_ACCOUNTS.find((a) => a.id === assignment.accountId);
}

/**
 * Get the default payment account
 */
export function getDefaultAccount(): PaymentAccount | undefined {
  return MOCK_PAYMENT_ACCOUNTS.find((account) => account.isDefault);
}

/**
 * Get count of properties assigned to a specific account
 */
export function getPropertyCountForAccount(accountId: string): number {
  return MOCK_PROPERTY_ASSIGNMENTS.filter((a) => a.accountId === accountId).length;
}

/**
 * Get all properties assigned to a specific account (includes default assignments)
 */
export function getPropertiesForAccount(accountId: string, allPropertyIds: string[]): string[] {
  const account = MOCK_PAYMENT_ACCOUNTS.find((a) => a.id === accountId);
  if (!account) return [];

  if (account.isDefault) {
    // Include explicitly assigned + unassigned properties
    const explicitlyAssigned = MOCK_PROPERTY_ASSIGNMENTS
      .filter((a) => a.accountId === accountId)
      .map((a) => a.propertyId);
    const unassigned = allPropertyIds.filter(
      (propId) => !MOCK_PROPERTY_ASSIGNMENTS.find((a) => a.propertyId === propId)
    );
    return [...explicitlyAssigned, ...unassigned];
  }

  // Non-default: only explicitly assigned
  return MOCK_PROPERTY_ASSIGNMENTS
    .filter((a) => a.accountId === accountId)
    .map((a) => a.propertyId);
}

/**
 * Get full landlord payment settings
 */
export function getLandlordPaymentSettings(): LandlordPaymentSettings {
  return MOCK_LANDLORD_PAYMENT_SETTINGS;
}

/**
 * Check if an account can be deleted (no assigned properties)
 */
export function canDeleteAccount(accountId: string): { canDelete: boolean; reason?: string } {
  const assignedCount = getPropertyCountForAccount(accountId);
  if (assignedCount > 0) {
    return {
      canDelete: false,
      reason: `Esta cuenta tiene ${assignedCount} propiedad(es) asignada(s). Reasigna las propiedades antes de eliminar.`,
    };
  }

  const account = MOCK_PAYMENT_ACCOUNTS.find((a) => a.id === accountId);
  if (account?.isDefault && MOCK_PAYMENT_ACCOUNTS.length > 1) {
    return {
      canDelete: false,
      reason: 'No puedes eliminar la cuenta por defecto. Establece otra cuenta como predeterminada primero.',
    };
  }

  return { canDelete: true };
}
