/**
 * Payment account types for Colombian landlords
 * Supports bank accounts and digital wallets
 */

// ============================================================================
// Bank Codes
// ============================================================================

export type BankCode =
  | 'bancolombia'
  | 'davivienda'
  | 'bbva'
  | 'bogota'
  | 'popular'
  | 'occidente'
  | 'colpatria'
  | 'cajasocial'
  | 'falabella'
  | 'itau';

export type WalletCode = 'nequi' | 'daviplata' | 'dale' | 'movii' | 'rappipay';

export type AccountType = 'savings' | 'checking';

// ============================================================================
// Account Interfaces
// ============================================================================

export interface BankAccount {
  id: string;
  type: 'bank';
  bankCode: BankCode;
  bankName: string;
  accountType: AccountType;
  accountNumber: string;
  accountHolderName: string;
  accountHolderDocument: string;
  isDefault: boolean;
  createdAt: string;
}

export interface DigitalWallet {
  id: string;
  type: 'wallet';
  walletCode: WalletCode;
  walletName: string;
  phoneNumber: string;
  holderName: string;
  isDefault: boolean;
  createdAt: string;
}

export type PaymentAccount = BankAccount | DigitalWallet;

// ============================================================================
// Property Assignment
// ============================================================================

export interface PropertyAccountAssignment {
  propertyId: string;
  accountId: string | null; // null = use default account
}

export interface LandlordPaymentSettings {
  accounts: PaymentAccount[];
  assignments: PropertyAccountAssignment[];
  defaultAccountId: string | null;
}

// ============================================================================
// Form Types
// ============================================================================

export interface BankAccountFormData {
  bankCode: BankCode | '';
  accountType: AccountType | '';
  accountNumber: string;
  accountHolderName: string;
  accountHolderDocument: string;
  isDefault: boolean;
}

export interface DigitalWalletFormData {
  walletCode: WalletCode | '';
  phoneNumber: string;
  holderName: string;
  isDefault: boolean;
}

// ============================================================================
// Constants - Colombian Banks
// ============================================================================

export interface BankInfo {
  code: BankCode;
  name: string;
  shortName: string;
  color: string;
}

export const COLOMBIAN_BANKS: BankInfo[] = [
  { code: 'bancolombia', name: 'Bancolombia', shortName: 'Bancolombia', color: '#FFCC00' },
  { code: 'davivienda', name: 'Davivienda', shortName: 'Davivienda', color: '#E31E24' },
  { code: 'bbva', name: 'BBVA Colombia', shortName: 'BBVA', color: '#004481' },
  { code: 'bogota', name: 'Banco de Bogotá', shortName: 'Bogotá', color: '#00529B' },
  { code: 'popular', name: 'Banco Popular', shortName: 'Popular', color: '#E31E24' },
  { code: 'occidente', name: 'Banco de Occidente', shortName: 'Occidente', color: '#00A650' },
  { code: 'colpatria', name: 'Scotiabank Colpatria', shortName: 'Colpatria', color: '#EC111A' },
  { code: 'cajasocial', name: 'Banco Caja Social', shortName: 'Caja Social', color: '#00703C' },
  { code: 'falabella', name: 'Banco Falabella', shortName: 'Falabella', color: '#AAC937' },
  { code: 'itau', name: 'Banco Itaú', shortName: 'Itaú', color: '#FF6600' },
];

// ============================================================================
// Constants - Digital Wallets
// ============================================================================

export interface WalletInfo {
  code: WalletCode;
  name: string;
  color: string;
  icon: string;
}

export const DIGITAL_WALLETS: WalletInfo[] = [
  { code: 'nequi', name: 'Nequi', color: '#E91E63', icon: '📱' },
  { code: 'daviplata', name: 'Daviplata', color: '#E31E24', icon: '📱' },
  { code: 'dale', name: 'Dale!', color: '#8E44AD', icon: '📱' },
  { code: 'movii', name: 'Movii', color: '#00BCD4', icon: '📱' },
  { code: 'rappipay', name: 'Rappipay', color: '#FF5722', icon: '📱' },
];

// ============================================================================
// Helper Functions
// ============================================================================

export function getBankByCode(code: BankCode): BankInfo | undefined {
  return COLOMBIAN_BANKS.find((bank) => bank.code === code);
}

export function getWalletByCode(code: WalletCode): WalletInfo | undefined {
  return DIGITAL_WALLETS.find((wallet) => wallet.code === code);
}

export function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  return '****' + accountNumber.slice(-4);
}

export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone || phone.length <= 6) return phone || '';
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}

export function isBankAccount(account: PaymentAccount): account is BankAccount {
  return account.type === 'bank';
}

export function isDigitalWallet(account: PaymentAccount): account is DigitalWallet {
  return account.type === 'wallet';
}
