'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Bank, Wallet, House, Star, Warning, CaretRight, TrashSimple, Plus, X, Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
import { IconButton } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
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

  // Releer cuentas y asignaciones del servidor.
  //
  // Está extraído del efecto justamente para que las mutaciones puedan
  // llamarlo: antes cada handler parcheaba `paymentAccounts` a mano y la lista
  // quedaba mostrando una versión que sólo existía en el navegador.
  const recargarCuentas = useCallback(async () => {
    try {
      const [accounts, assignments] = await Promise.all([
        paymentMethodsApi.getAll(),
        paymentMethodsApi.getAssignments(),
      ]);
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
  }, []);

  useEffect(() => { void recargarCuentas(); }, [recargarCuentas]);

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

      // Update property assignments if any selected
      for (const propId of selectedPropertyIds) {
        await paymentMethodsApi.assignProperty(newAccount.id, propId);
      }

      await recargarCuentas();

      setShowAddAccountModal(false);
      resetForms();
      toast.success(t('landlordSettings.toasts.accountAdded'));
    } catch {
      toast.error(t('landlordSettings.toasts.errorAddingAccount'));
    } finally {
      setIsLoading(false);
    }
  };

  // Marcar la cuenta principal se guardaba SÓLO en el navegador: cambiaba el
  // `isDefault` del estado local y decía «listo». Al recargar volvía la de
  // antes, y las dispersiones seguían saliendo a la cuenta vieja.
  const handleSetDefaultAccount = async (accountId: string) => {
    setIsLoading(true);
    try {
      await paymentMethodsApi.update(accountId, { isDefault: true });
      await recargarCuentas();
      toast.success(t('landlordSettings.toasts.accountSetDefault'));
    } catch {
      toast.error(t('landlordSettings.toasts.errorUpdatingAccount'));
    } finally {
      setIsLoading(false);
    }
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
      await recargarCuentas();
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
        className="rounded-lg bg-surface-muted overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-border-faint">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-success" />
              </div>
              <div>
                <h2 className="font-semibold text-fg">{t('landlordSettings.paymentAccounts.title')}</h2>
                <p className="text-xs text-fg-subtle">{t('landlordSettings.paymentAccounts.subtitle')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* My Accounts List */}
        <div className="p-6">
          <h3 className="text-sm font-medium text-fg-muted mb-4">
            {t('landlordSettings.paymentAccounts.myAccounts')}
          </h3>

          {paymentAccounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-fg-subtle mb-4">
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
                    className="flex items-start justify-between p-4 border border-border rounded-lg bg-surface"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="w-5 h-5 text-fg-muted" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-fg">
                            {info.name} {info.detail}
                          </p>
                          {account.isDefault && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-warning-soft text-warning text-xs font-medium rounded-full">
                              <Star className="w-3 h-3" weight="fill" />
                              {t('landlordSettings.paymentAccounts.default')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-fg-subtle mt-0.5">
                          {info.holder}
                        </p>
                        {/* Property assignment tags */}
                        {assignedNames.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {assignedNames.map((name) => (
                              <span
                                key={name}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EEF1FF] dark:bg-[#1A40FF]/15 text-[#1A40FF] dark:text-[#5570FF] text-[11px] font-medium rounded-sm"
                              >
                                <House className="w-3 h-3" />
                                {name.length > 30 ? name.slice(0, 30) + '...' : name}
                              </span>
                            ))}
                          </div>
                        )}
                        {assignedNames.length === 0 && (
                          <p className="text-[11px] text-fg-subtle mt-1">
                            {t('landlordSettings.paymentAccounts.noPropertiesAssigned')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      {!account.isDefault && (
                        <button
                          onClick={() => handleSetDefaultAccount(account.id)}
                          className="text-xs text-[#1A40FF] dark:text-[#5570FF] hover:underline"
                        >
                          {t('landlordSettings.paymentAccounts.setAsDefault')}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingAccount(account);
                          setShowDeleteAccountModal(true);
                        }}
                        className="text-xs text-danger hover:underline"
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
          <Button
            variant="outline"
            hideArrow
            onClick={() => { resetForms(); setShowAddAccountModal(true); }}
            className="w-full border-2 border-dashed border-border-strong text-fg-muted rounded-lg hover:border-[#1A40FF]/30 hover:text-[#1A40FF]"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">{t('landlordSettings.paymentAccounts.addAccount')}</span>
          </Button>
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
            <label className="block text-sm font-medium text-fg-muted mb-2">
              {t('landlordSettings.paymentAccounts.modals.addAccount.methodType')}
            </label>
            <div className="flex gap-1 p-1 bg-surface-muted rounded-lg">
              <button
                type="button"
                onClick={() => setAccountMethodType('bank')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all',
                  accountMethodType === 'bank'
                    ? 'bg-surface text-fg'
                    : 'text-fg-subtle hover:text-fg-muted'
                )}
              >
                <Bank className="w-4 h-4" />
                {t('landlordSettings.paymentAccounts.modals.addAccount.methodBank')}
              </button>
              <button
                type="button"
                onClick={() => setAccountMethodType('wallet')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all',
                  accountMethodType === 'wallet'
                    ? 'bg-surface text-fg'
                    : 'text-fg-subtle hover:text-fg-muted'
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
                <label className="block text-sm font-medium text-fg-muted mb-2">
                  {t('landlordSettings.paymentAccounts.modals.addBankAccount.bank')}
                </label>
                <Select
                  value={bankForm.bankCode}
                  onValueChange={(v) => setBankForm(prev => ({ ...prev, bankCode: v as BankCode }))}
                >
                  <SelectTrigger className="h-12 rounded-lg">
                    <SelectValue placeholder={t('landlordSettings.paymentAccounts.modals.addBankAccount.selectBank')} />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOMBIAN_BANKS.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>{bank.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-sm font-medium text-fg-muted mb-2">
                  {t('landlordSettings.paymentAccounts.modals.addBankAccount.accountType')}
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setBankForm(prev => ({ ...prev, accountType: 'savings' }))}
                    className={cn(
                      'flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-all',
                      bankForm.accountType === 'savings'
                        ? 'border-[#1A40FF]/30 bg-[#1A40FF]/10 text-[#1A40FF]'
                        : 'border-border text-fg-muted hover:border-border-strong'
                    )}
                  >
                    {t('landlordSettings.paymentAccounts.accountTypes.savings')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBankForm(prev => ({ ...prev, accountType: 'checking' }))}
                    className={cn(
                      'flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-all',
                      bankForm.accountType === 'checking'
                        ? 'border-[#1A40FF]/30 bg-[#1A40FF]/10 text-[#1A40FF]'
                        : 'border-border text-fg-muted hover:border-border-strong'
                    )}
                  >
                    {t('landlordSettings.paymentAccounts.accountTypes.checking')}
                  </button>
                </div>
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-medium text-fg-muted mb-2">
                  {t('landlordSettings.paymentAccounts.modals.addBankAccount.accountNumber')}
                </label>
                <Input
                  type="text"
                  value={bankForm.accountNumber}
                  onChange={(e) => { setBankForm(prev => ({ ...prev, accountNumber: e.target.value.replace(/\D/g, '') })); setFieldErrors(prev => { const n = { ...prev }; delete n.accountNumber; return n; }); }}
                  className={cn('h-12 rounded-lg', fieldErrors.accountNumber && 'border-danger/40 focus-visible:ring-danger/20 focus-visible:border-danger/40')}
                  placeholder={t('landlordSettings.paymentAccounts.modals.addBankAccount.accountNumberPlaceholder')}
                  maxLength={20}
                />
                {fieldErrors.accountNumber && (
                  <p className="text-xs text-danger mt-1">{fieldErrors.accountNumber}</p>
                )}
              </div>

              {/* Account Holder Name */}
              <div>
                <label className="block text-sm font-medium text-fg-muted mb-2">
                  {t('landlordSettings.paymentAccounts.modals.addBankAccount.accountHolder')}
                </label>
                <Input
                  type="text"
                  value={bankForm.accountHolderName}
                  onChange={(e) => setBankForm(prev => ({ ...prev, accountHolderName: e.target.value }))}
                  className="h-12 rounded-lg"
                  placeholder={t('landlordSettings.paymentAccounts.modals.addBankAccount.accountHolderPlaceholder')}
                />
              </div>

              {/* Document */}
              <div>
                <label className="block text-sm font-medium text-fg-muted mb-2">
                  {t('landlordSettings.paymentAccounts.modals.addBankAccount.document')}
                </label>
                <Input
                  type="text"
                  value={bankForm.accountHolderDocument}
                  onChange={(e) => { setBankForm(prev => ({ ...prev, accountHolderDocument: e.target.value.replace(/\D/g, '') })); setFieldErrors(prev => { const n = { ...prev }; delete n.document; return n; }); }}
                  className={cn('h-12 rounded-lg', fieldErrors.document && 'border-danger/40 focus-visible:ring-danger/20 focus-visible:border-danger/40')}
                  placeholder={t('landlordSettings.paymentAccounts.modals.addBankAccount.documentPlaceholder')}
                  maxLength={12}
                />
                {fieldErrors.document && (
                  <p className="text-xs text-danger mt-1">{fieldErrors.document}</p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Wallet Select */}
              <div>
                <label className="block text-sm font-medium text-fg-muted mb-2">
                  {t('landlordSettings.paymentAccounts.modals.addWallet.wallet')}
                </label>
                <Select
                  value={walletForm.walletCode}
                  onValueChange={(v) => setWalletForm(prev => ({ ...prev, walletCode: v as WalletCode }))}
                >
                  <SelectTrigger className="h-12 rounded-lg">
                    <SelectValue placeholder={t('landlordSettings.paymentAccounts.modals.addWallet.selectWallet')} />
                  </SelectTrigger>
                  <SelectContent>
                    {DIGITAL_WALLETS.map((wallet) => (
                      <SelectItem key={wallet.code} value={wallet.code}>{wallet.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-fg-muted mb-2">
                  {t('landlordSettings.paymentAccounts.modals.addWallet.phoneNumber')}
                </label>
                <div className="flex gap-2">
                  <div className={cn(
                    'w-16 h-12 px-3 border rounded-lg bg-surface-muted flex items-center justify-center text-sm text-fg-subtle',
                    fieldErrors.phone ? 'border-danger/30' : 'border-border'
                  )}>
                    +57
                  </div>
                  <Input
                    type="text"
                    value={walletForm.phoneNumber}
                    onChange={(e) => { setWalletForm(prev => ({ ...prev, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })); setFieldErrors(prev => { const n = { ...prev }; delete n.phone; return n; }); }}
                    className={cn('flex-1 h-12 rounded-lg', fieldErrors.phone && 'border-danger/40 focus-visible:ring-danger/20 focus-visible:border-danger/40')}
                    placeholder={t('landlordSettings.paymentAccounts.modals.addWallet.phonePlaceholder')}
                    maxLength={10}
                  />
                </div>
                {fieldErrors.phone && (
                  <p className="text-xs text-danger mt-1">{fieldErrors.phone}</p>
                )}
              </div>

              {/* Holder Name */}
              <div>
                <label className="block text-sm font-medium text-fg-muted mb-2">
                  {t('landlordSettings.paymentAccounts.modals.addWallet.holderName')}
                </label>
                <Input
                  type="text"
                  value={walletForm.holderName}
                  onChange={(e) => setWalletForm(prev => ({ ...prev, holderName: e.target.value }))}
                  className="h-12 rounded-lg"
                  placeholder={t('landlordSettings.paymentAccounts.modals.addWallet.holderPlaceholder')}
                />
              </div>
            </>
          )}

          {/* Property Assignment — custom multi-select dropdown with checkboxes */}
          {landlordProperties.length > 0 && (
            <div ref={propertyDropdownRef}>
              <label className="block text-sm font-medium text-fg-muted mb-2">
                {t('landlordSettings.paymentAccounts.modals.addAccount.assignProperties')}
              </label>
              {/* Trigger button */}
              <button
                type="button"
                onClick={() => setShowPropertyDropdown(prev => !prev)}
                className={cn(
                  'w-full h-10 px-3 pr-10 border rounded-lg text-sm text-left relative transition-all appearance-none cursor-pointer',
                  showPropertyDropdown
                    ? 'border-[#1A40FF]/30 ring-2 ring-[#1A40FF]/20 bg-surface'
                    : 'border-border bg-surface'
                )}
              >
                <span className={cn(
                  'block truncate',
                  selectedPropertyIds.length > 0
                    ? 'text-fg'
                    : 'text-fg-subtle'
                )}>
                  {selectedPropertyIds.length > 0
                    ? `${selectedPropertyIds.length} inmueble${selectedPropertyIds.length > 1 ? 's' : ''} seleccionado${selectedPropertyIds.length > 1 ? 's' : ''}`
                    : t('landlordSettings.paymentAccounts.modals.addAccount.assignPropertiesHint')}
                </span>
                <CaretRight className={cn(
                  'absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle transition-transform',
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
                        className="inline-flex items-center gap-1 pl-2 pr-1 py-1 bg-[#EEF1FF] dark:bg-[#1A40FF]/15 text-[#1A40FF] dark:text-[#5570FF] text-xs font-medium rounded-md"
                      >
                        <House className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[140px]">{prop.title}</span>
                        <IconButton
                          type="button"
                          variant="ghost"
                          aria-label="Quitar"
                          onClick={() => setSelectedPropertyIds(prev => prev.filter(id => id !== pid))}
                          icon={<X className="w-3 h-3" />}
                          className="w-4 h-4 min-h-0 rounded-full ml-0.5 hover:bg-[#EEF1FF] dark:hover:bg-[#1A40FF]"
                        />
                      </span>
                    );
                  })}
                </div>
              )}
              {/* Dropdown panel with checkboxes */}
              {showPropertyDropdown && (
                <div className="mt-1 border border-border rounded-lg bg-surface overflow-hidden max-h-48 overflow-y-auto">
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
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-muted transition-colors text-left"
                      >
                        <div className={cn(
                          'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                          isSelected
                            ? 'border-[#1A40FF]/30 bg-[#1A40FF]'
                            : 'border-border-strong'
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-white" weight="bold" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-fg truncate">{property.title}</p>
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
            <Checkbox
              checked={accountMethodType === 'bank' ? bankForm.isDefault : walletForm.isDefault}
              onCheckedChange={(c) => {
                if (accountMethodType === 'bank') {
                  setBankForm(prev => ({ ...prev, isDefault: c === true }));
                } else {
                  setWalletForm(prev => ({ ...prev, isDefault: c === true }));
                }
              }}
            />
            <span className="text-sm text-fg-muted">
              {t('landlordSettings.paymentAccounts.modals.addBankAccount.setDefault')}
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              hideArrow
              onClick={() => { setShowAddAccountModal(false); resetForms(); }}
              className="flex-1 rounded-lg"
            >
              {t('landlordSettings.modals.cancel')}
            </Button>
            <Button
              hideArrow
              onClick={handleAddAccount}
              disabled={isLoading}
              className="flex-1 rounded-lg"
            >
              {isLoading ? (
                <Spinner size="xs" variant="current" />
              ) : (
                accountMethodType === 'bank' ? <Bank className="w-4 h-4" /> : <Wallet className="w-4 h-4" />
              )}
              {isLoading
                ? t('landlordSettings.paymentAccounts.modals.addAccount.adding')
                : t('landlordSettings.paymentAccounts.modals.addAccount.addButton')}
            </Button>
          </div>
        </div>
      </SettingsModal>

      {/* Delete Payment Account Modal */}
      <SettingsModal open={showDeleteAccountModal} onClose={() => { setShowDeleteAccountModal(false); setEditingAccount(null); }} title={t('landlordSettings.paymentAccounts.modals.deleteAccount.title')}>
        <div className="space-y-4">
          {editingAccount && (
            <>
              <div className="p-4 bg-danger-soft border border-danger/30 rounded-lg flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-danger-soft flex items-center justify-center flex-shrink-0">
                  <Warning className="w-5 h-5 text-danger" />
                </div>
                <div>
                  <p className="text-sm font-medium text-danger">
                    {t('landlordSettings.paymentAccounts.modals.deleteAccount.confirmMessage')}
                  </p>
                  <p className="text-xs text-danger mt-1">
                    {isBankAccount(editingAccount)
                      ? `${editingAccount.bankName} ${maskAccountNumber(editingAccount.accountNumber)}`
                      : `${editingAccount.walletName} ${maskPhoneNumber(editingAccount.phoneNumber)}`}
                  </p>
                </div>
              </div>
              {getPropertyCountForAccount(editingAccount.id) > 0 && (
                <div className="p-3 bg-warning-soft border border-warning/30 rounded-lg">
                  <p className="text-xs text-warning">
                    {t('landlordSettings.paymentAccounts.modals.deleteAccount.warningWithProperties', { count: getPropertyCountForAccount(editingAccount.id) })}
                  </p>
                </div>
              )}
              {editingAccount.isDefault && paymentAccounts.length > 1 && (
                <div className="p-3 bg-warning-soft border border-warning/30 rounded-lg">
                  <p className="text-xs text-warning">
                    {t('landlordSettings.paymentAccounts.modals.deleteAccount.warningDefault')}
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  hideArrow
                  onClick={() => { setShowDeleteAccountModal(false); setEditingAccount(null); }}
                  className="flex-1 rounded-lg"
                >
                  {t('landlordSettings.modals.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  hideArrow
                  onClick={handleDeletePaymentAccount}
                  disabled={isLoading || getPropertyCountForAccount(editingAccount.id) > 0 || (editingAccount.isDefault && paymentAccounts.length > 1)}
                  className="flex-1 rounded-lg"
                >
                  {isLoading ? <Spinner size="xs" variant="current" /> : <TrashSimple className="w-4 h-4" />}
                  {isLoading ? t('landlordSettings.paymentAccounts.modals.deleteAccount.deleting') : t('landlordSettings.paymentAccounts.modals.deleteAccount.deleteButton')}
                </Button>
              </div>
            </>
          )}
        </div>
      </SettingsModal>
    </>
  );
}
