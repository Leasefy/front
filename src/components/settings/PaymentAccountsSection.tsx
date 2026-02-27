'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Bank, Wallet, House, Star, SpinnerGap, Warning, CaretRight, TrashSimple, Plus, X, Check } from '@phosphor-icons/react';
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
import { paymentMethodsApi } from '@/lib/api/payment-methods.service';
import { useMyProperties } from '@/lib/hooks/useProperties';
import { SettingsModal } from './SettingsModal';

export function PaymentAccountsSection({ delay = 0.18 }: { delay?: number }) {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);

  // Payment accounts state - loaded from API
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [accountMethodType, setAccountMethodType] = useState<'bank' | 'wallet'>('bank');
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);

  // Property assignments state (maps accountId -> propertyId[])
  const [propertyAssignments, setPropertyAssignments] = useState<Record<string, string[]>>({});

  // Load payment accounts and assignments from API
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [accounts, assignments] = await Promise.all([
          paymentMethodsApi.getAll(),
          paymentMethodsApi.getAssignments(),
        ]);
        if (cancelled) return;
        setPaymentAccounts(accounts);
        const map: Record<string, string[]> = {};
        assignments.forEach((a) => {
          if (a.accountId) {
            if (!map[a.accountId]) map[a.accountId] = [];
            map[a.accountId].push(a.propertyId);
          }
        });
        setPropertyAssignments(map);
      } catch {
        // API not available yet - start with empty state
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Selected properties for new account
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const propertyDropdownRef = useRef<HTMLDivElement>(null);

  // Per-field validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Bank form
  const [bankForm, setBankForm] = useState<BankAccountFormData>({
    bankCode: '',
    accountType: '',
    accountNumber: '',
    accountHolderName: '',
    accountHolderDocument: '',
    isDefault: false,
  });

  // Wallet form
  const [walletForm, setWalletForm] = useState<DigitalWalletFormData>({
    walletCode: '',
    phoneNumber: '',
    holderName: '',
    isDefault: false,
  });

  // Close property dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (propertyDropdownRef.current && !propertyDropdownRef.current.contains(e.target as Node)) {
        setShowPropertyDropdown(false);
      }
    };
    if (showPropertyDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPropertyDropdown]);

  // Get landlord's properties from API
  const { properties: landlordProperties } = useMyProperties();

  // Get count of properties assigned to a specific account
  const getPropertyCountForAccount = (accountId: string): number => {
    return (propertyAssignments[accountId] || []).length;
  };

  // Get property names assigned to an account
  const getAssignedPropertyNames = (accountId: string): string[] => {
    const assignedIds = propertyAssignments[accountId] || [];
    return assignedIds
      .map(pid => landlordProperties.find(p => p.id === pid)?.title || '')
      .filter(Boolean);
  };

  // Reset forms
  const resetForms = () => {
    setBankForm({ bankCode: '', accountType: '', accountNumber: '', accountHolderName: '', accountHolderDocument: '', isDefault: false });
    setWalletForm({ walletCode: '', phoneNumber: '', holderName: '', isDefault: false });
    setSelectedPropertyIds([]);
    setShowPropertyDropdown(false);
    setFieldErrors({});
    setAccountMethodType('bank');
  };

  // Validate based on current method type — per-field errors
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (accountMethodType === 'bank') {
      if (!bankForm.bankCode) errors.bankCode = t('landlordSettings.paymentAccounts.validation.bankRequired');
      if (!bankForm.accountType) errors.accountType = t('landlordSettings.paymentAccounts.validation.accountTypeRequired');
      if (!bankForm.accountNumber) errors.accountNumber = t('landlordSettings.paymentAccounts.validation.accountNumberRequired');
      else if (bankForm.accountNumber.length < 7 || bankForm.accountNumber.length > 20) errors.accountNumber = t('landlordSettings.paymentAccounts.validation.accountNumberInvalid');
      if (!bankForm.accountHolderName || bankForm.accountHolderName.length < 3) errors.holderName = t('landlordSettings.paymentAccounts.validation.holderNameRequired');
      if (!bankForm.accountHolderDocument) errors.document = t('landlordSettings.paymentAccounts.validation.documentInvalid');
      else if (bankForm.accountHolderDocument.length < 6 || bankForm.accountHolderDocument.length > 12) errors.document = t('landlordSettings.paymentAccounts.validation.documentInvalid');
    } else {
      if (!walletForm.walletCode) errors.walletCode = t('landlordSettings.paymentAccounts.validation.walletRequired');
      if (!walletForm.phoneNumber || walletForm.phoneNumber.length !== 10) errors.phone = t('landlordSettings.paymentAccounts.validation.phoneInvalid');
      if (!walletForm.holderName || walletForm.holderName.length < 3) errors.holderName = t('landlordSettings.paymentAccounts.validation.holderNameRequired');
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Unified add handler
  const handleAddAccount = async () => {
    if (!validateForm()) return;
    setFieldErrors({});
    setIsLoading(true);

    try {
      let accountData: Partial<PaymentAccount>;

      if (accountMethodType === 'bank') {
        const bank = COLOMBIAN_BANKS.find(b => b.code === bankForm.bankCode);
        accountData = {
          type: 'bank',
          bankCode: bankForm.bankCode as BankCode,
          bankName: bank?.name || '',
          accountType: bankForm.accountType as AccountType,
          accountNumber: bankForm.accountNumber,
          accountHolderName: bankForm.accountHolderName,
          accountHolderDocument: bankForm.accountHolderDocument,
          isDefault: bankForm.isDefault || paymentAccounts.length === 0,
        } as Partial<BankAccount>;
      } else {
        const wallet = DIGITAL_WALLETS.find(w => w.code === walletForm.walletCode);
        accountData = {
          type: 'wallet',
          walletCode: walletForm.walletCode as WalletCode,
          walletName: wallet?.name || '',
          phoneNumber: walletForm.phoneNumber,
          holderName: walletForm.holderName,
          isDefault: walletForm.isDefault || paymentAccounts.length === 0,
        } as Partial<DigitalWallet>;
      }

      const newAccount = await paymentMethodsApi.create(accountData);

      if (newAccount.isDefault) {
        setPaymentAccounts(prev => prev.map(a => ({ ...a, isDefault: false })).concat(newAccount));
      } else {
        setPaymentAccounts(prev => [...prev, newAccount]);
      }

      // Update property assignments if any selected
      if (selectedPropertyIds.length > 0) {
        for (const propId of selectedPropertyIds) {
          await paymentMethodsApi.assignProperty(newAccount.id, propId);
        }
        setPropertyAssignments(prev => ({
          ...prev,
          [newAccount.id]: selectedPropertyIds,
        }));
      }

      setShowAddAccountModal(false);
      resetForms();
      toast.success(t('landlordSettings.toasts.accountAdded'));
    } catch {
      toast.error(t('landlordSettings.toasts.errorAddingAccount'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefaultAccount = (accountId: string) => {
    setPaymentAccounts(prev =>
      prev.map(a => ({ ...a, isDefault: a.id === accountId }))
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
    try {
      await paymentMethodsApi.delete(editingAccount.id);
      setPaymentAccounts(prev => prev.filter(a => a.id !== editingAccount.id));
      setPropertyAssignments(prev => {
        const next = { ...prev };
        delete next[editingAccount.id];
        return next;
      });
      setShowDeleteAccountModal(false);
      setEditingAccount(null);
      toast.success(t('landlordSettings.toasts.accountDeleted'));
    } catch {
      toast.error(t('landlordSettings.toasts.errorDeletingAccount'));
    } finally {
      setIsLoading(false);
    }
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
                const assignedNames = getAssignedPropertyNames(account.id);
                return (
                  <div
                    key={account.id}
                    className="flex items-start justify-between p-4 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-[#1f1f21]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-[#2a2a2c] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
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
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {info.holder}
                        </p>
                        {/* Property assignment tags */}
                        {assignedNames.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {assignedNames.map((name) => (
                              <span
                                key={name}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium rounded-md"
                              >
                                <House className="w-3 h-3" />
                                {name.length > 30 ? name.slice(0, 30) + '...' : name}
                              </span>
                            ))}
                          </div>
                        )}
                        {assignedNames.length === 0 && (
                          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
                            {t('landlordSettings.paymentAccounts.noPropertiesAssigned')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
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

          {/* Single Add Account Button */}
          <button
            onClick={() => { resetForms(); setShowAddAccountModal(true); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 rounded-xl hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">{t('landlordSettings.paymentAccounts.addAccount')}</span>
          </button>
        </div>
      </motion.section>

      {/* Unified Add Account Modal */}
      <SettingsModal
        open={showAddAccountModal}
        onClose={() => { setShowAddAccountModal(false); resetForms(); }}
        title={t('landlordSettings.paymentAccounts.modals.addAccount.title')}
      >
        <div className="space-y-5">
          {/* Segmented Control: Banco | Billetera Digital */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t('landlordSettings.paymentAccounts.modals.addAccount.methodType')}
            </label>
            <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-[#2a2a2c] rounded-xl">
              <button
                type="button"
                onClick={() => setAccountMethodType('bank')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all',
                  accountMethodType === 'bank'
                    ? 'bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                )}
              >
                <Bank className="w-4 h-4" />
                {t('landlordSettings.paymentAccounts.modals.addAccount.methodBank')}
              </button>
              <button
                type="button"
                onClick={() => setAccountMethodType('wallet')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all',
                  accountMethodType === 'wallet'
                    ? 'bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                )}
              >
                <Wallet className="w-4 h-4" />
                {t('landlordSettings.paymentAccounts.modals.addAccount.methodWallet')}
              </button>
            </div>
          </div>

          {/* Conditional Fields */}
          {accountMethodType === 'bank' ? (
            <>
              {/* Bank Select */}
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

              {/* Account Type */}
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

              {/* Account Number */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {t('landlordSettings.paymentAccounts.modals.addBankAccount.accountNumber')}
                </label>
                <input
                  type="text"
                  value={bankForm.accountNumber}
                  onChange={(e) => { setBankForm(prev => ({ ...prev, accountNumber: e.target.value.replace(/\D/g, '') })); setFieldErrors(prev => { const n = { ...prev }; delete n.accountNumber; return n; }); }}
                  className={cn(
                    'w-full h-12 px-4 border rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 transition-all',
                    fieldErrors.accountNumber
                      ? 'border-red-400 dark:border-red-500 focus:ring-red-500/20 focus:border-red-400'
                      : 'border-neutral-200 dark:border-neutral-600 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500'
                  )}
                  placeholder={t('landlordSettings.paymentAccounts.modals.addBankAccount.accountNumberPlaceholder')}
                  maxLength={20}
                />
                {fieldErrors.accountNumber && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">{fieldErrors.accountNumber}</p>
                )}
              </div>

              {/* Account Holder Name */}
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

              {/* Document */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {t('landlordSettings.paymentAccounts.modals.addBankAccount.document')}
                </label>
                <input
                  type="text"
                  value={bankForm.accountHolderDocument}
                  onChange={(e) => { setBankForm(prev => ({ ...prev, accountHolderDocument: e.target.value.replace(/\D/g, '') })); setFieldErrors(prev => { const n = { ...prev }; delete n.document; return n; }); }}
                  className={cn(
                    'w-full h-12 px-4 border rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 transition-all',
                    fieldErrors.document
                      ? 'border-red-400 dark:border-red-500 focus:ring-red-500/20 focus:border-red-400'
                      : 'border-neutral-200 dark:border-neutral-600 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500'
                  )}
                  placeholder={t('landlordSettings.paymentAccounts.modals.addBankAccount.documentPlaceholder')}
                  maxLength={12}
                />
                {fieldErrors.document && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">{fieldErrors.document}</p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Wallet Select */}
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

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {t('landlordSettings.paymentAccounts.modals.addWallet.phoneNumber')}
                </label>
                <div className="flex gap-2">
                  <div className={cn(
                    'w-16 h-12 px-3 border rounded-xl bg-neutral-50 dark:bg-[#1f1f21] flex items-center justify-center text-sm text-neutral-500 dark:text-neutral-400',
                    fieldErrors.phone ? 'border-red-400 dark:border-red-500' : 'border-neutral-200 dark:border-neutral-600'
                  )}>
                    +57
                  </div>
                  <input
                    type="text"
                    value={walletForm.phoneNumber}
                    onChange={(e) => { setWalletForm(prev => ({ ...prev, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })); setFieldErrors(prev => { const n = { ...prev }; delete n.phone; return n; }); }}
                    className={cn(
                      'flex-1 h-12 px-4 border rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 transition-all',
                      fieldErrors.phone
                        ? 'border-red-400 dark:border-red-500 focus:ring-red-500/20 focus:border-red-400'
                        : 'border-neutral-200 dark:border-neutral-600 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500'
                    )}
                    placeholder={t('landlordSettings.paymentAccounts.modals.addWallet.phonePlaceholder')}
                    maxLength={10}
                  />
                </div>
                {fieldErrors.phone && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">{fieldErrors.phone}</p>
                )}
              </div>

              {/* Holder Name */}
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
            </>
          )}

          {/* Property Assignment — custom multi-select dropdown with checkboxes */}
          {landlordProperties.length > 0 && (
            <div ref={propertyDropdownRef}>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                {t('landlordSettings.paymentAccounts.modals.addAccount.assignProperties')}
              </label>
              {/* Trigger button */}
              <button
                type="button"
                onClick={() => setShowPropertyDropdown(prev => !prev)}
                className={cn(
                  'w-full h-10 px-3 pr-10 border rounded-xl text-sm text-left relative transition-all appearance-none cursor-pointer',
                  showPropertyDropdown
                    ? 'border-indigo-300 dark:border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-[#1f1f21]'
                    : 'border-neutral-200 dark:border-neutral-600 bg-white dark:bg-[#1f1f21]'
                )}
              >
                <span className={cn(
                  'block truncate',
                  selectedPropertyIds.length > 0
                    ? 'text-neutral-900 dark:text-white'
                    : 'text-neutral-400 dark:text-neutral-500'
                )}>
                  {selectedPropertyIds.length > 0
                    ? `${selectedPropertyIds.length} inmueble${selectedPropertyIds.length > 1 ? 's' : ''} seleccionado${selectedPropertyIds.length > 1 ? 's' : ''}`
                    : t('landlordSettings.paymentAccounts.modals.addAccount.assignPropertiesHint')}
                </span>
                <CaretRight className={cn(
                  'absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 transition-transform',
                  showPropertyDropdown ? '-rotate-90' : 'rotate-90'
                )} />
              </button>
              {/* Selected chips */}
              {selectedPropertyIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedPropertyIds.map((pid) => {
                    const prop = landlordProperties.find(p => p.id === pid);
                    if (!prop) return null;
                    return (
                      <span
                        key={pid}
                        className="inline-flex items-center gap-1 pl-2 pr-1 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-lg"
                      >
                        <House className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[140px]">{prop.title}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPropertyIds(prev => prev.filter(id => id !== pid))}
                          className="w-4 h-4 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 flex items-center justify-center ml-0.5 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              {/* Dropdown panel with checkboxes */}
              {showPropertyDropdown && (
                <div className="mt-1 border border-neutral-200 dark:border-neutral-600 rounded-xl bg-white dark:bg-[#1f1f21] shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                  {landlordProperties.map((property) => {
                    const isSelected = selectedPropertyIds.includes(property.id);
                    return (
                      <button
                        key={property.id}
                        type="button"
                        onClick={() => {
                          setSelectedPropertyIds(prev =>
                            isSelected ? prev.filter(id => id !== property.id) : [...prev, property.id]
                          );
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-[#2a2a2c] transition-colors text-left"
                      >
                        <div className={cn(
                          'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500'
                            : 'border-neutral-300 dark:border-neutral-600'
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-white" weight="bold" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-neutral-900 dark:text-white truncate">{property.title}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Set as Default */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={accountMethodType === 'bank' ? bankForm.isDefault : walletForm.isDefault}
              onChange={(e) => {
                if (accountMethodType === 'bank') {
                  setBankForm(prev => ({ ...prev, isDefault: e.target.checked }));
                } else {
                  setWalletForm(prev => ({ ...prev, isDefault: e.target.checked }));
                }
              }}
              className="w-5 h-5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              {t('landlordSettings.paymentAccounts.modals.addBankAccount.setDefault')}
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setShowAddAccountModal(false); resetForms(); }}
              className="flex-1 py-3 border border-neutral-200 dark:border-neutral-600 text-sm font-medium text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-[#1f1f21] transition-colors"
            >
              {t('landlordSettings.modals.cancel')}
            </button>
            <button
              onClick={handleAddAccount}
              disabled={isLoading}
              className="flex-1 py-3 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? (
                <SpinnerGap className="w-4 h-4 animate-spin" />
              ) : (
                accountMethodType === 'bank' ? <Bank className="w-4 h-4" /> : <Wallet className="w-4 h-4" />
              )}
              {isLoading
                ? t('landlordSettings.paymentAccounts.modals.addAccount.adding')
                : t('landlordSettings.paymentAccounts.modals.addAccount.addButton')}
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
