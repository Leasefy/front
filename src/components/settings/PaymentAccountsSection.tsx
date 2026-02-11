'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Bank, Wallet, House, Star, SpinnerGap, Warning, CaretRight, TrashSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
import {
  type PaymentAccount,
  type BankAccount,
  type DigitalWallet,
  type BankAccountFormData,
  type DigitalWalletFormData,
  type BankCode,
  type WalletCode,
  type AccountType,
  COLOMBIAN_BANKS,
  DIGITAL_WALLETS,
  maskAccountNumber,
  maskPhoneNumber,
  isBankAccount,
} from '@/lib/types/payment-accounts';
import {
  getPaymentAccounts,
  getPropertyCountForAccount,
} from '@/lib/data/mock-payment-accounts';
import { mockProperties } from '@/lib/data/mock-properties';
import { SettingsModal } from './SettingsModal';

export function PaymentAccountsSection({ delay = 0.18 }: { delay?: number }) {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);

  // Payment accounts state
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>(getPaymentAccounts());
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);
  const [bankForm, setBankForm] = useState<BankAccountFormData>({
    bankCode: '',
    accountType: '',
    accountNumber: '',
    accountHolderName: '',
    accountHolderDocument: '',
    isDefault: false,
  });
  const [walletForm, setWalletForm] = useState<DigitalWalletFormData>({
    walletCode: '',
    phoneNumber: '',
    holderName: '',
    isDefault: false,
  });

  // Get landlord's properties (filter by landlord-001 to match mock data)
  const landlordProperties = mockProperties.filter(p => p.landlordId === 'landlord-001');

  // Payment account handlers
  const resetBankForm = () => {
    setBankForm({
      bankCode: '',
      accountType: '',
      accountNumber: '',
      accountHolderName: '',
      accountHolderDocument: '',
      isDefault: false,
    });
  };

  const resetWalletForm = () => {
    setWalletForm({
      walletCode: '',
      phoneNumber: '',
      holderName: '',
      isDefault: false,
    });
  };

  const validateBankForm = (): boolean => {
    if (!bankForm.bankCode) {
      toast.error(t('landlordSettings.paymentAccounts.validation.bankRequired'));
      return false;
    }
    if (!bankForm.accountType) {
      toast.error(t('landlordSettings.paymentAccounts.validation.accountTypeRequired'));
      return false;
    }
    if (!bankForm.accountNumber) {
      toast.error(t('landlordSettings.paymentAccounts.validation.accountNumberRequired'));
      return false;
    }
    if (bankForm.accountNumber.length < 10 || bankForm.accountNumber.length > 20) {
      toast.error(t('landlordSettings.paymentAccounts.validation.accountNumberInvalid'));
      return false;
    }
    if (!bankForm.accountHolderName || bankForm.accountHolderName.length < 3) {
      toast.error(t('landlordSettings.paymentAccounts.validation.holderNameRequired'));
      return false;
    }
    if (!bankForm.accountHolderDocument || bankForm.accountHolderDocument.length < 6 || bankForm.accountHolderDocument.length > 12) {
      toast.error(t('landlordSettings.paymentAccounts.validation.documentInvalid'));
      return false;
    }
    return true;
  };

  const validateWalletForm = (): boolean => {
    if (!walletForm.walletCode) {
      toast.error(t('landlordSettings.paymentAccounts.validation.walletRequired'));
      return false;
    }
    if (!walletForm.phoneNumber || walletForm.phoneNumber.length !== 10) {
      toast.error(t('landlordSettings.paymentAccounts.validation.phoneInvalid'));
      return false;
    }
    if (!walletForm.holderName || walletForm.holderName.length < 3) {
      toast.error(t('landlordSettings.paymentAccounts.validation.holderNameRequired'));
      return false;
    }
    return true;
  };

  const handleAddBankAccount = async () => {
    if (!validateBankForm()) return;
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const bank = COLOMBIAN_BANKS.find(b => b.code === bankForm.bankCode);
    const newAccount: BankAccount = {
      id: `account-${Date.now()}`,
      type: 'bank',
      bankCode: bankForm.bankCode as BankCode,
      bankName: bank?.name || '',
      accountType: bankForm.accountType as AccountType,
      accountNumber: bankForm.accountNumber,
      accountHolderName: bankForm.accountHolderName,
      accountHolderDocument: bankForm.accountHolderDocument,
      isDefault: bankForm.isDefault || paymentAccounts.length === 0,
      createdAt: new Date().toISOString(),
    };

    if (newAccount.isDefault) {
      setPaymentAccounts(prev => prev.map(a => ({ ...a, isDefault: false })).concat(newAccount));
    } else {
      setPaymentAccounts(prev => [...prev, newAccount]);
    }

    setIsLoading(false);
    setShowAddBankModal(false);
    resetBankForm();
    toast.success(t('landlordSettings.toasts.accountAdded'));
  };

  const handleAddWallet = async () => {
    if (!validateWalletForm()) return;
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const wallet = DIGITAL_WALLETS.find(w => w.code === walletForm.walletCode);
    const newWallet: DigitalWallet = {
      id: `wallet-${Date.now()}`,
      type: 'wallet',
      walletCode: walletForm.walletCode as WalletCode,
      walletName: wallet?.name || '',
      phoneNumber: walletForm.phoneNumber,
      holderName: walletForm.holderName,
      isDefault: walletForm.isDefault || paymentAccounts.length === 0,
      createdAt: new Date().toISOString(),
    };

    if (newWallet.isDefault) {
      setPaymentAccounts(prev => prev.map(a => ({ ...a, isDefault: false })).concat(newWallet));
    } else {
      setPaymentAccounts(prev => [...prev, newWallet]);
    }

    setIsLoading(false);
    setShowAddWalletModal(false);
    resetWalletForm();
    toast.success(t('landlordSettings.toasts.accountAdded'));
  };

  const handleSetDefaultAccount = (accountId: string) => {
    setPaymentAccounts(prev =>
      prev.map(a => ({
        ...a,
        isDefault: a.id === accountId,
      }))
    );
    toast.success(t('landlordSettings.toasts.accountSetDefault'));
  };

  const handleDeletePaymentAccount = async () => {
    if (!editingAccount) return;
    const assignedCount = getPropertyCountForAccount(editingAccount.id);
    if (assignedCount > 0) {
      toast.error(t('landlordSettings.toasts.cannotDeleteWithProperties'));
      return;
    }
    if (editingAccount.isDefault && paymentAccounts.length > 1) {
      toast.error(t('landlordSettings.toasts.cannotDeleteDefault'));
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setPaymentAccounts(prev => prev.filter(a => a.id !== editingAccount.id));
    setIsLoading(false);
    setShowDeleteAccountModal(false);
    setEditingAccount(null);
    toast.success(t('landlordSettings.toasts.accountDeleted'));
  };

  const getAccountDisplayInfo = (account: PaymentAccount) => {
    if (isBankAccount(account)) {
      return {
        icon: Bank,
        name: account.bankName,
        detail: `${t(`landlordSettings.paymentAccounts.accountTypes.${account.accountType}`)} ${maskAccountNumber(account.accountNumber)}`,
        holder: account.accountHolderName,
      };
    } else {
      return {
        icon: Wallet,
        name: account.walletName,
        detail: maskPhoneNumber(account.phoneNumber),
        holder: account.holderName,
      };
    }
  };

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="rounded-xl bg-stone-50 dark:bg-[#141416] overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-neutral-200/50 dark:border-[#2a2a2c]/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="font-semibold text-neutral-900 dark:text-white">{t('landlordSettings.paymentAccounts.title')}</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('landlordSettings.paymentAccounts.subtitle')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* My Accounts List */}
        <div className="p-6">
          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-4">
            {t('landlordSettings.paymentAccounts.myAccounts')}
          </h3>

          {paymentAccounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                {t('landlordSettings.paymentAccounts.noAccounts')}
              </p>
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {paymentAccounts.map((account) => {
                const info = getAccountDisplayInfo(account);
                const Icon = info.icon;
                const assignedCount = getPropertyCountForAccount(account.id);
                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-[#1f1f21]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-[#2a2a2c] flex items-center justify-center">
                        <Icon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-neutral-900 dark:text-white">
                            {info.name} {info.detail}
                          </p>
                          {account.isDefault && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-full">
                              <Star className="w-3 h-3" weight="fill" />
                              {t('landlordSettings.paymentAccounts.default')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {info.holder} · {assignedCount > 0
                            ? t('landlordSettings.paymentAccounts.propertiesAssigned', { count: assignedCount })
                            : t('landlordSettings.paymentAccounts.noPropertiesAssigned')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {!account.isDefault && (
                        <button
                          onClick={() => handleSetDefaultAccount(account.id)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {t('landlordSettings.paymentAccounts.setAsDefault')}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingAccount(account);
                          setShowDeleteAccountModal(true);
                        }}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Account Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowAddBankModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 rounded-xl hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition-colors"
            >
              <Bank className="w-5 h-5" />
              <span className="text-sm font-medium">{t('landlordSettings.paymentAccounts.addBankAccount')}</span>
            </button>
            <button
              onClick={() => setShowAddWalletModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 rounded-xl hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition-colors"
            >
              <Wallet className="w-5 h-5" />
              <span className="text-sm font-medium">{t('landlordSettings.paymentAccounts.addDigitalWallet')}</span>
            </button>
          </div>
        </div>

        {/* Property Assignments */}
        {paymentAccounts.length > 0 && landlordProperties.length > 0 && (
          <div className="px-6 pb-6">
            <div className="border-t border-neutral-200/50 dark:border-[#2a2a2c]/50 pt-6">
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-4">
                {t('landlordSettings.paymentAccounts.propertyAssignments')}
              </h3>
              <div className="space-y-2">
                {landlordProperties.slice(0, 4).map((property) => {
                  const assignedAccount = paymentAccounts.find(a => a.isDefault);
                  const accountInfo = assignedAccount ? getAccountDisplayInfo(assignedAccount) : null;
                  return (
                    <div
                      key={property.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-[#1f1f21] rounded-xl border border-neutral-100 dark:border-neutral-800"
                    >
                      <div className="flex items-center gap-3">
                        <House className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">{property.title}</span>
                      </div>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        → {accountInfo ? `${accountInfo.name} ${accountInfo.detail}` : t('landlordSettings.paymentAccounts.usesDefault')}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3 italic">
                {t('landlordSettings.paymentAccounts.assignmentInfo')}
              </p>
            </div>
          </div>
        )}
      </motion.section>

      {/* Add Bank Account Modal */}
      <SettingsModal open={showAddBankModal} onClose={() => { setShowAddBankModal(false); resetBankForm(); }} title={t('landlordSettings.paymentAccounts.modals.addBankAccount.title')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t('landlordSettings.paymentAccounts.modals.addBankAccount.bank')}
            </label>
            <div className="relative">
              <select
                value={bankForm.bankCode}
                onChange={(e) => setBankForm(prev => ({ ...prev, bankCode: e.target.value as BankCode }))}
                className="w-full h-12 px-4 pr-10 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500 transition-all appearance-none cursor-pointer"
              >
                <option value="">{t('landlordSettings.paymentAccounts.modals.addBankAccount.selectBank')}</option>
                {COLOMBIAN_BANKS.map((bank) => (
                  <option key={bank.code} value={bank.code}>{bank.name}</option>
                ))}
              </select>
              <CaretRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 rotate-90 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t('landlordSettings.paymentAccounts.modals.addBankAccount.accountType')}
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setBankForm(prev => ({ ...prev, accountType: 'savings' }))}
                className={cn(
                  'flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-all',
                  bankForm.accountType === 'savings'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                    : 'border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                )}
              >
                {t('landlordSettings.paymentAccounts.accountTypes.savings')}
              </button>
              <button
                type="button"
                onClick={() => setBankForm(prev => ({ ...prev, accountType: 'checking' }))}
                className={cn(
                  'flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-all',
                  bankForm.accountType === 'checking'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                    : 'border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                )}
              >
                {t('landlordSettings.paymentAccounts.accountTypes.checking')}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t('landlordSettings.paymentAccounts.modals.addBankAccount.accountNumber')}
            </label>
            <input
              type="text"
              value={bankForm.accountNumber}
              onChange={(e) => setBankForm(prev => ({ ...prev, accountNumber: e.target.value.replace(/\D/g, '') }))}
              className="w-full h-12 px-4 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500 transition-all"
              placeholder={t('landlordSettings.paymentAccounts.modals.addBankAccount.accountNumberPlaceholder')}
              maxLength={20}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t('landlordSettings.paymentAccounts.modals.addBankAccount.accountHolder')}
            </label>
            <input
              type="text"
              value={bankForm.accountHolderName}
              onChange={(e) => setBankForm(prev => ({ ...prev, accountHolderName: e.target.value }))}
              className="w-full h-12 px-4 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500 transition-all"
              placeholder={t('landlordSettings.paymentAccounts.modals.addBankAccount.accountHolderPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t('landlordSettings.paymentAccounts.modals.addBankAccount.document')}
            </label>
            <input
              type="text"
              value={bankForm.accountHolderDocument}
              onChange={(e) => setBankForm(prev => ({ ...prev, accountHolderDocument: e.target.value.replace(/\D/g, '') }))}
              className="w-full h-12 px-4 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500 transition-all"
              placeholder={t('landlordSettings.paymentAccounts.modals.addBankAccount.documentPlaceholder')}
              maxLength={12}
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={bankForm.isDefault}
              onChange={(e) => setBankForm(prev => ({ ...prev, isDefault: e.target.checked }))}
              className="w-5 h-5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              {t('landlordSettings.paymentAccounts.modals.addBankAccount.setDefault')}
            </span>
          </label>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setShowAddBankModal(false); resetBankForm(); }}
              className="flex-1 py-3 border border-neutral-200 dark:border-neutral-600 text-sm font-medium text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-[#1f1f21] transition-colors"
            >
              {t('landlordSettings.modals.cancel')}
            </button>
            <button
              onClick={handleAddBankAccount}
              disabled={isLoading}
              className="flex-1 py-3 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <Bank className="w-4 h-4" />}
              {isLoading ? t('landlordSettings.paymentAccounts.modals.addBankAccount.adding') : t('landlordSettings.paymentAccounts.modals.addBankAccount.addButton')}
            </button>
          </div>
        </div>
      </SettingsModal>

      {/* Add Digital Wallet Modal */}
      <SettingsModal open={showAddWalletModal} onClose={() => { setShowAddWalletModal(false); resetWalletForm(); }} title={t('landlordSettings.paymentAccounts.modals.addWallet.title')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t('landlordSettings.paymentAccounts.modals.addWallet.wallet')}
            </label>
            <div className="relative">
              <select
                value={walletForm.walletCode}
                onChange={(e) => setWalletForm(prev => ({ ...prev, walletCode: e.target.value as WalletCode }))}
                className="w-full h-12 px-4 pr-10 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500 transition-all appearance-none cursor-pointer"
              >
                <option value="">{t('landlordSettings.paymentAccounts.modals.addWallet.selectWallet')}</option>
                {DIGITAL_WALLETS.map((wallet) => (
                  <option key={wallet.code} value={wallet.code}>{wallet.name}</option>
                ))}
              </select>
              <CaretRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 rotate-90 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t('landlordSettings.paymentAccounts.modals.addWallet.phoneNumber')}
            </label>
            <div className="flex gap-2">
              <div className="w-16 h-12 px-3 border border-neutral-200 dark:border-neutral-600 rounded-xl bg-neutral-50 dark:bg-[#1f1f21] flex items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
                +57
              </div>
              <input
                type="text"
                value={walletForm.phoneNumber}
                onChange={(e) => setWalletForm(prev => ({ ...prev, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                className="flex-1 h-12 px-4 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500 transition-all"
                placeholder={t('landlordSettings.paymentAccounts.modals.addWallet.phonePlaceholder')}
                maxLength={10}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t('landlordSettings.paymentAccounts.modals.addWallet.holderName')}
            </label>
            <input
              type="text"
              value={walletForm.holderName}
              onChange={(e) => setWalletForm(prev => ({ ...prev, holderName: e.target.value }))}
              className="w-full h-12 px-4 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500 transition-all"
              placeholder={t('landlordSettings.paymentAccounts.modals.addWallet.holderPlaceholder')}
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={walletForm.isDefault}
              onChange={(e) => setWalletForm(prev => ({ ...prev, isDefault: e.target.checked }))}
              className="w-5 h-5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              {t('landlordSettings.paymentAccounts.modals.addWallet.setDefault')}
            </span>
          </label>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setShowAddWalletModal(false); resetWalletForm(); }}
              className="flex-1 py-3 border border-neutral-200 dark:border-neutral-600 text-sm font-medium text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-[#1f1f21] transition-colors"
            >
              {t('landlordSettings.modals.cancel')}
            </button>
            <button
              onClick={handleAddWallet}
              disabled={isLoading}
              className="flex-1 py-3 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              {isLoading ? t('landlordSettings.paymentAccounts.modals.addWallet.adding') : t('landlordSettings.paymentAccounts.modals.addWallet.addButton')}
            </button>
          </div>
        </div>
      </SettingsModal>

      {/* Delete Payment Account Modal */}
      <SettingsModal open={showDeleteAccountModal} onClose={() => { setShowDeleteAccountModal(false); setEditingAccount(null); }} title={t('landlordSettings.paymentAccounts.modals.deleteAccount.title')}>
        <div className="space-y-4">
          {editingAccount && (
            <>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                  <Warning className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    {t('landlordSettings.paymentAccounts.modals.deleteAccount.confirmMessage')}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {isBankAccount(editingAccount)
                      ? `${editingAccount.bankName} ${maskAccountNumber(editingAccount.accountNumber)}`
                      : `${editingAccount.walletName} ${maskPhoneNumber(editingAccount.phoneNumber)}`}
                  </p>
                </div>
              </div>
              {getPropertyCountForAccount(editingAccount.id) > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    {t('landlordSettings.paymentAccounts.modals.deleteAccount.warningWithProperties', { count: getPropertyCountForAccount(editingAccount.id) })}
                  </p>
                </div>
              )}
              {editingAccount.isDefault && paymentAccounts.length > 1 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    {t('landlordSettings.paymentAccounts.modals.deleteAccount.warningDefault')}
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowDeleteAccountModal(false); setEditingAccount(null); }}
                  className="flex-1 py-3 border border-neutral-200 dark:border-neutral-600 text-sm font-medium text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-[#1f1f21] transition-colors"
                >
                  {t('landlordSettings.modals.cancel')}
                </button>
                <button
                  onClick={handleDeletePaymentAccount}
                  disabled={isLoading || getPropertyCountForAccount(editingAccount.id) > 0 || (editingAccount.isDefault && paymentAccounts.length > 1)}
                  className="flex-1 py-3 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  {isLoading ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <TrashSimple className="w-4 h-4" />}
                  {isLoading ? t('landlordSettings.paymentAccounts.modals.deleteAccount.deleting') : t('landlordSettings.paymentAccounts.modals.deleteAccount.deleteButton')}
                </button>
              </div>
            </>
          )}
        </div>
      </SettingsModal>
    </>
  );
}
