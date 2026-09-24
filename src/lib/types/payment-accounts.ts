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
  | 'itau'
  | 'avvillas'
  | 'bancoomeva'
  | 'pichincha'
  | 'nu'
  // 23-09: los del giro de la inmobiliaria que el propietario no podía escoger.
  | 'agrario'
  | 'finandina'
  | 'bancamia'
  | 'gnbsudameris'
  | 'santander'
  | 'serfinanza'
  | 'coopcentral'
  | 'mundomujer'
  | 'ban100'
  | 'btgpactual'
  | 'jpmorgan'
  | 'citibank'
  | 'lulo';

export type WalletCode = 'nequi' | 'daviplata' | 'dale' | 'movii' | 'rappipay';

export type AccountType = 'savings' | 'checking';

// ============================================================================
// Account Interfaces
// ============================================================================

export interface BankAccount {
  id: string;
  type: 'bank';
  // Optional: the real backend stores `bankName` as free text, not an enum —
  // this is set only when reverse-lookup against COLOMBIAN_BANKS matches.
  bankCode?: BankCode;
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
  // Optional to mirror BankAccount.bankCode — see comment there. In practice
  // wallets always resolve a walletCode (methodType maps 1:1), but keeping
  // this optional avoids the two branches of PaymentAccount drifting apart.
  walletCode?: WalletCode;
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
  // T-0014: back's ColombianBank enum (back/src/common/enums/colombian-banks.enum.ts)
  // has these three the owner form never offered. NEQUI/DAVIPLATA are also in
  // that back enum, but they are wallets in this front's model (see WalletCode
  // below) — a bank-account form (accountType + accountNumber) is the wrong
  // shape for them, so they are deliberately NOT added here.
  { code: 'avvillas', name: 'Banco AV Villas', shortName: 'AV Villas', color: '#C10230' },
  { code: 'bancoomeva', name: 'Bancoomeva', shortName: 'Bancoomeva', color: '#00A94F' },
  { code: 'pichincha', name: 'Banco Pichincha', shortName: 'Pichincha', color: '#FFD100' },
  // 22-09 (el reparto de Nico: «otro 20 % en Nubank»). Ojo: Nu Colombia NO está
  // en la tabla CENIT del Banco de la República, así que el archivo de pagos
  // masivos no le gira; el back lo excluye del lote con ese motivo.
  { code: 'nu', name: 'Nu Colombia (Nubank)', shortName: 'Nu', color: '#820AD1' },
  /*
   * 🔴 23-09 (QA del cambio de cuenta): «Marcar como girada» ofrecía 25 bancos
   * y el propietario escogía entre 14. Un propietario recibe en CUALQUIER
   * banco: estos son los del giro que faltaban, con los nombres del back
   * (`BANK_DISPLAY_NAMES`, que es lo que se guarda en la ficha). Sólo se
   * agregan: ningún valor guardado cambia.
   */
  { code: 'agrario', name: 'Banco Agrario', shortName: 'Agrario', color: '#00843D' },
  { code: 'finandina', name: 'Banco Finandina', shortName: 'Finandina', color: '#0033A0' },
  { code: 'bancamia', name: 'Bancamía', shortName: 'Bancamía', color: '#E4002B' },
  { code: 'gnbsudameris', name: 'Banco GNB Sudameris', shortName: 'GNB Sudameris', color: '#004B87' },
  { code: 'santander', name: 'Banco Santander', shortName: 'Santander', color: '#EC0000' },
  { code: 'serfinanza', name: 'Banco Serfinanza', shortName: 'Serfinanza', color: '#00A3E0' },
  { code: 'coopcentral', name: 'Banco Coopcentral', shortName: 'Coopcentral', color: '#007A33' },
  { code: 'mundomujer', name: 'Banco Mundo Mujer', shortName: 'Mundo Mujer', color: '#E5007E' },
  { code: 'ban100', name: 'Ban100', shortName: 'Ban100', color: '#FF6A13' },
  { code: 'btgpactual', name: 'Banco BTG Pactual', shortName: 'BTG Pactual', color: '#001E62' },
  { code: 'jpmorgan', name: 'Banco J.P. Morgan', shortName: 'J.P. Morgan', color: '#5F4B3A' },
  { code: 'citibank', name: 'Citibank', shortName: 'Citibank', color: '#003B70' },
  { code: 'lulo', name: 'Lulo Bank', shortName: 'Lulo', color: '#C4D600' },
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
