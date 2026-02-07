'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bell, CreditCard, Shield, Users, Envelope, Phone, Globe, Moon, CaretRight, Check, Crown, Lightning, X, SpinnerGap, Monitor, Warning, TrashSimple, Camera, Copy, Download, DeviceMobile, DeviceTablet, Laptop, Lock, ShieldCheck, Eye, FileText, ArrowCounterClockwise, Tag, UserPlus, ArrowUpRight, PencilSimple, Bank, Wallet, Plus, House, Star } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';
import { getPlanById, MOCK_SUBSCRIPTION } from '@/lib/data/mock-subscriptions';
import { getTeamMembers } from '@/lib/data/mock-team';
import type { TeamRole } from '@/lib/types/team';
import { formatCurrency } from '@/lib/data/mock-dashboard';
import { MOCK_LEASES } from '@/lib/data/mock-leases';
import { getPendingVisitCount } from '@/lib/data/mock-visits';
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
  isDigitalWallet,
} from '@/lib/types/payment-accounts';
import {
  getPaymentAccounts,
  getPropertyCountForAccount,
} from '@/lib/data/mock-payment-accounts';
import { mockProperties } from '@/lib/data/mock-properties';

// ============================================================================
// Modal Component with modern style
// ============================================================================

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-[#141416] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-[#2a2a2c]">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-[#1f1f21] flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Setting Toggle Component
// ============================================================================

function SettingToggle({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  accent?: 'emerald' | 'indigo';
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 hover:bg-white/50 dark:hover:bg-[#1f1f21]/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
          <Icon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-900 dark:text-white">{title}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={enabled}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0a0a0b]',
          enabled
            ? accent === 'emerald' ? 'bg-emerald-500' : 'bg-indigo-500'
            : 'bg-neutral-200 dark:bg-[#2a2a2c]'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
            enabled ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}

// ============================================================================
// Setting Link Component
// ============================================================================

function SettingLink({
  icon: Icon,
  title,
  description,
  onClick,
  badge,
  external,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
  badge?: string;
  external?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/50 dark:hover:bg-[#1f1f21]/50 transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
          <Icon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-neutral-900 dark:text-white">{title}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-full">
            {badge}
          </span>
        )}
        <CaretRight className="w-5 h-5 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
      </div>
    </button>
  );
}

// ============================================================================
// Mock Data
// ============================================================================

const mockSessions = [
  { id: '1', device: 'Chrome en MacOS', location: 'Bogotá, Colombia', current: true, lastActive: 'Ahora', deviceType: 'desktop' as const },
  { id: '2', device: 'App iOS', location: 'Bogotá, Colombia', current: false, lastActive: 'Hace 2 horas', deviceType: 'mobile' as const },
  { id: '3', device: 'Safari en iPad', location: 'Medellín, Colombia', current: false, lastActive: 'Hace 1 día', deviceType: 'tablet' as const },
];

// ============================================================================
// Main Component
// ============================================================================

export default function ConfiguracionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Gear state
  const [settings, setGear] = useState({
    emailNewApplication: true,
    emailPaymentReceived: true,
    emailContractReminder: true,
    pushNewMessage: true,
    pushApplicationStatus: true,
    smsUrgent: false,
    marketingEmails: false,
    twoFactorAuth: false,
  });

  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Form states
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState(mockSessions);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [inviteForm, setInviteForm] = useState<{ email: string; role: TeamRole }>({ email: '', role: 'viewer' });
  const [teamMembersList, setTeamMembersList] = useState(getTeamMembers());
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<{ id: string; name?: string; email: string; role: TeamRole } | null>(null);
  const [editMemberForm, setEditMemberForm] = useState<{ name: string; role: TeamRole }>({ name: '', role: 'viewer' });

  // Payment accounts state
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>(getPaymentAccounts());
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showAssignPropertiesModal, setShowAssignPropertiesModal] = useState(false);
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
  const [propertyAssignments, setPropertyAssignments] = useState<Record<string, string | null>>({});

  // Get landlord's properties (filter by landlord-001 to match mock data)
  const landlordProperties = mockProperties.filter(p => p.landlordId === 'landlord-001');

  const currentPlan = getPlanById(MOCK_SUBSCRIPTION.planId);

  // Handlers
  const handleToggle = (key: keyof typeof settings) => {
    if (key === 'twoFactorAuth') {
      setShow2FAModal(true);
      return;
    }
    setGear(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success(t('landlordSettings.toasts.settingsUpdated'));
  };

  const handleDarkModeToggle = () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    toast.success(newTheme === 'dark' ? t('landlordSettings.toasts.darkModeEnabled') : t('landlordSettings.toasts.lightModeEnabled'));
  };

  const handlePasswordChange = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error(t('landlordSettings.toasts.passwordsDontMatch'));
      return;
    }
    if (passwordForm.new.length < 8) {
      toast.error(t('landlordSettings.toasts.passwordTooShort'));
      return;
    }
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    setShowPasswordModal(false);
    setPasswordForm({ current: '', new: '', confirm: '' });
    toast.success(t('landlordSettings.toasts.passwordUpdated'));
  };

  const handleCloseSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    toast.success(t('landlordSettings.toasts.sessionClosed'));
  };

  const handleDownloadData = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    setShowDownloadModal(false);
    toast.success(t('landlordSettings.toasts.dataRequestSent'));
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== t('landlordSettings.modals.deleteAccount.confirmWord')) {
      toast.error(t('landlordSettings.toasts.typeToConfirm'));
      return;
    }
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    toast.success(t('landlordSettings.toasts.accountDeleted'));
    setTimeout(() => router.push('/'), 2000);
  };

  const handleEnable2FA = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    setGear(prev => ({ ...prev, twoFactorAuth: true }));
    setShow2FAModal(false);
    toast.success(t('landlordSettings.toasts.twoFactorEnabled'));
  };

  const handleResetOnboarding = () => {
    localStorage.removeItem('plan_onboarding_landlord');
    window.dispatchEvent(new Event('onboarding-updated'));
    toast.success(t('landlordSettings.toasts.onboardingReset'));
    setTimeout(() => router.push('/panel'), 500);
  };

  const handleInviteMember = async () => {
    if (!inviteForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email)) {
      toast.error(t('landlordSettings.toasts.invalidEmail'));
      return;
    }
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    setShowInviteModal(false);
    setInviteForm({ email: '', role: 'viewer' });
    toast.success(t('landlordSettings.toasts.invitationSent', { email: inviteForm.email }));
  };

  const handleRemoveMember = (memberId: string) => {
    setTeamMembersList(prev => prev.filter(m => m.id !== memberId));
    toast.success(t('landlordSettings.toasts.memberRemoved'));
  };

  const handleEditMember = async () => {
    if (!editingMember) return;
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setTeamMembersList(prev => prev.map(m =>
      m.id === editingMember.id
        ? { ...m, name: editMemberForm.name || m.name, role: editMemberForm.role }
        : m
    ));
    setIsLoading(false);
    setShowEditMemberModal(false);
    setEditingMember(null);
    setEditMemberForm({ name: '', role: 'viewer' });
    toast.success(t('landlordSettings.toasts.memberUpdated'));
  };

  const getDeviceIcon = (type: 'desktop' | 'mobile' | 'tablet') => {
    switch (type) {
      case 'mobile': return DeviceMobile;
      case 'tablet': return DeviceTablet;
      default: return Laptop;
    }
  };

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

  // Account deletion blockers
  const activeLeases = MOCK_LEASES.filter(l => l.status === 'active' || l.status === 'ending_soon');
  const pendingVisits = getPendingVisitCount();
  const hasCriticalBlockers = activeLeases.length > 0;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0b] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-medium text-neutral-900 dark:text-white tracking-tight">
            {t('landlordSettings.title')}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {t('landlordSettings.subtitle')}
          </p>
        </motion.header>

        <div className="space-y-6">
          {/* Subscription Card - Landlord specific */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 overflow-hidden relative"
          >
            <div className="relative px-6 py-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-800/50 flex items-center justify-center">
                    <Crown className="w-7 h-7 text-amber-500 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-indigo-600/70 dark:text-indigo-300/70 text-sm">{t('landlordSettings.subscription.currentPlan')}</p>
                    <p className="text-xl font-semibold text-indigo-900 dark:text-indigo-100">{currentPlan.name}</p>
                    <p className="text-indigo-600/60 dark:text-indigo-300/60 text-sm">
                      {MOCK_SUBSCRIPTION.planId === 'free'
                        ? t('landlordSettings.subscription.freePlan')
                        : `${formatCurrency(currentPlan.price.monthly)}/${t('landlordSettings.subscription.month')}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                      {currentPlan.features.find(f => f.id === 'property_listing')?.limit === 'unlimited' ? '∞' : currentPlan.features.find(f => f.id === 'property_listing')?.limit || 1}
                    </p>
                    <p className="text-xs text-indigo-600/60 dark:text-indigo-300/60">{t('landlordSettings.subscription.properties')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                      {currentPlan.features.find(f => f.id === 'unlimited_contracts')?.limit === 'unlimited' ? '∞' : currentPlan.features.find(f => f.id === 'unlimited_contracts')?.limit || 1}
                    </p>
                    <p className="text-xs text-indigo-600/60 dark:text-indigo-300/60">{t('landlordSettings.subscription.contracts')}</p>
                  </div>
                </div>
                {MOCK_SUBSCRIPTION.planId !== 'business' && (
                  <Link
                    href="/panel/upgrade"
                    className="px-5 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors flex items-center gap-2"
                  >
                    {t('landlordSettings.subscription.upgradePlan')}
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          </motion.section>

          {/* Notifications */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl bg-stone-50 dark:bg-[#141416] overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-neutral-200/50 dark:border-[#2a2a2c]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                  <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-neutral-900 dark:text-white">{t('landlordSettings.notifications.title')}</h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('landlordSettings.notifications.subtitle')}</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-neutral-200/50 dark:divide-neutral-700/50">
              <SettingToggle
                icon={Envelope}
                title={t('landlordSettings.notifications.newApplication')}
                description={t('landlordSettings.notifications.newApplicationDesc')}
                enabled={settings.emailNewApplication}
                onToggle={() => handleToggle('emailNewApplication')}
              />
              <SettingToggle
                icon={CreditCard}
                title={t('landlordSettings.notifications.paymentReceived')}
                description={t('landlordSettings.notifications.paymentReceivedDesc')}
                enabled={settings.emailPaymentReceived}
                onToggle={() => handleToggle('emailPaymentReceived')}
              />
              <SettingToggle
                icon={FileText}
                title={t('landlordSettings.notifications.contractReminders')}
                description={t('landlordSettings.notifications.contractRemindersDesc')}
                enabled={settings.emailContractReminder}
                onToggle={() => handleToggle('emailContractReminder')}
              />
              <SettingToggle
                icon={Bell}
                title={t('landlordSettings.notifications.newMessages')}
                description={t('landlordSettings.notifications.newMessagesDesc')}
                enabled={settings.pushNewMessage}
                onToggle={() => handleToggle('pushNewMessage')}
              />
              <SettingToggle
                icon={Tag}
                title={t('landlordSettings.notifications.promotionalEmails')}
                description={t('landlordSettings.notifications.promotionalEmailsDesc')}
                enabled={settings.marketingEmails}
                onToggle={() => handleToggle('marketingEmails')}
              />
            </div>
          </motion.section>

          {/* Team Management - Landlord specific */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-3xl bg-stone-50 dark:bg-[#141416] overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-neutral-200/50 dark:border-[#2a2a2c]/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                    <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-neutral-900 dark:text-white">{t('landlordSettings.team.title')}</h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{teamMembersList.length} {teamMembersList.length !== 1 ? t('landlordSettings.team.members') : t('landlordSettings.team.member')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  {t('landlordSettings.team.invite')}
                </button>
              </div>
            </div>
            <div className="divide-y divide-neutral-200/50 dark:divide-neutral-700/50">
              {teamMembersList.map((member) => (
                <div key={member.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                      <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                        {(member.name || member.email || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">{member.name || t('landlordSettings.team.pendingInvitation')}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium',
                      member.role === 'admin' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' :
                      member.role === 'manager' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' :
                      'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                    )}>
                      {member.role === 'admin' ? t('landlordSettings.team.roles.admin') : member.role === 'manager' ? t('landlordSettings.team.roles.manager') : member.role === 'accountant' ? t('landlordSettings.team.roles.accountant') : t('landlordSettings.team.roles.viewer')}
                    </span>
                    {member.role !== 'admin' && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setEditingMember(member);
                            setEditMemberForm({ name: member.name || '', role: member.role });
                            setShowEditMemberModal(true);
                          }}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {t('landlordSettings.team.edit')}
                        </button>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline"
                        >
                          {t('landlordSettings.team.remove')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Payment Accounts - New Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="rounded-3xl bg-stone-50 dark:bg-[#141416] overflow-hidden"
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
                        className="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-700 rounded-2xl bg-white dark:bg-[#1f1f21]"
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

          {/* Security & Preferences - 2 column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Security */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-3xl bg-stone-50 dark:bg-[#141416] overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-neutral-200/50 dark:border-[#2a2a2c]/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                    <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-neutral-900 dark:text-white">{t('landlordSettings.security.title')}</h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('landlordSettings.security.subtitle')}</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-neutral-200/50 dark:divide-neutral-700/50">
                <SettingToggle
                  icon={ShieldCheck}
                  title={t('landlordSettings.security.twoFactorAuth')}
                  description={settings.twoFactorAuth ? t('landlordSettings.security.enabled') : t('landlordSettings.security.extraSecurity')}
                  enabled={settings.twoFactorAuth}
                  onToggle={() => handleToggle('twoFactorAuth')}
                  accent={settings.twoFactorAuth ? 'emerald' : undefined}
                />
                <SettingLink
                  icon={Lock}
                  title={t('landlordSettings.security.changePassword')}
                  description={t('landlordSettings.security.updateAccess')}
                  onClick={() => setShowPasswordModal(true)}
                />
                <SettingLink
                  icon={Monitor}
                  title={t('landlordSettings.security.activeSessions')}
                  description={`${sessions.length} ${sessions.length !== 1 ? t('landlordSettings.security.devices') : t('landlordSettings.security.device')}`}
                  onClick={() => setShowSessionsModal(true)}
                  badge={sessions.length > 1 ? `${sessions.length}` : undefined}
                />
              </div>
            </motion.section>

            {/* Preferences */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-3xl bg-stone-50 dark:bg-[#141416] overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-neutral-200/50 dark:border-[#2a2a2c]/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                    <Globe className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-neutral-900 dark:text-white">{t('landlordSettings.preferences.title')}</h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('landlordSettings.preferences.subtitle')}</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-neutral-200/50 dark:divide-neutral-700/50">
                <SettingToggle
                  icon={Moon}
                  title={t('landlordSettings.preferences.darkMode')}
                  description={t('landlordSettings.preferences.darkModeDesc')}
                  enabled={mounted && resolvedTheme === 'dark'}
                  onToggle={handleDarkModeToggle}
                />
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                      <Globe className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">{t('landlordSettings.preferences.language')}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('landlordSettings.preferences.languageDesc')}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <select
                      value={locale}
                      onChange={(e) => {
                        setLocale(e.target.value as Locale);
                        toast.success(e.target.value === 'en' ? 'Language changed to English' : 'Idioma cambiado a Español');
                      }}
                      aria-label={t('landlordSettings.preferences.languageDesc')}
                      className="appearance-none pl-4 pr-10 py-2.5 text-sm border border-neutral-200 dark:border-neutral-600 rounded-xl bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      <option value="es">Español</option>
                      <option value="en">English</option>
                    </select>
                    <CaretRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 rotate-90 pointer-events-none" />
                  </div>
                </div>
              </div>
            </motion.section>
          </div>

          {/* Data & Privacy + Danger Zone - 2 column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Data & Privacy */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-3xl bg-stone-50 dark:bg-[#141416] overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-neutral-200/50 dark:border-[#2a2a2c]/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                    <Eye className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-neutral-900 dark:text-white">{t('landlordSettings.dataPrivacy.title')}</h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('landlordSettings.dataPrivacy.subtitle')}</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-neutral-200/50 dark:divide-neutral-700/50">
                <SettingLink
                  icon={Download}
                  title={t('landlordSettings.dataPrivacy.downloadData')}
                  description={t('landlordSettings.dataPrivacy.downloadDataDesc')}
                  onClick={() => setShowDownloadModal(true)}
                />
                <SettingLink
                  icon={ArrowCounterClockwise}
                  title={t('landlordSettings.dataPrivacy.resetOnboarding')}
                  description={t('landlordSettings.dataPrivacy.resetOnboardingDesc')}
                  onClick={handleResetOnboarding}
                />
                <SettingLink
                  icon={FileText}
                  title={t('landlordSettings.dataPrivacy.privacyPolicy')}
                  description={t('landlordSettings.dataPrivacy.privacyPolicyDesc')}
                  onClick={() => window.open('/privacidad', '_blank')}
                  external
                />
                <SettingLink
                  icon={FileText}
                  title={t('landlordSettings.dataPrivacy.termsConditions')}
                  description={t('landlordSettings.dataPrivacy.termsConditionsDesc')}
                  onClick={() => window.open('/terminos', '_blank')}
                  external
                />
              </div>
            </motion.section>

            {/* Danger Zone */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="rounded-3xl border-2 border-red-100 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20 overflow-hidden h-fit"
            >
              <div className="px-6 py-5 border-b border-red-100 dark:border-red-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <Warning className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-red-900 dark:text-red-300">{t('landlordSettings.dangerZone.title')}</h2>
                    <p className="text-xs text-red-600 dark:text-red-400">{t('landlordSettings.dangerZone.subtitle')}</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                  {t('landlordSettings.dangerZone.deleteDescription')}
                </p>
                {hasCriticalBlockers && (
                  <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      {t('landlordSettings.dangerZone.activeLeasesWarning', { count: activeLeases.length })}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={hasCriticalBlockers}
                  className="px-5 py-2.5 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('landlordSettings.dangerZone.deleteAccount')}
                </button>
              </div>
            </motion.section>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      <Modal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} title={t('landlordSettings.modals.changePassword.title')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t('landlordSettings.modals.changePassword.currentPassword')}</label>
            <input
              type="password"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
              className="w-full h-12 px-4 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500 transition-all"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t('landlordSettings.modals.changePassword.newPassword')}</label>
            <input
              type="password"
              value={passwordForm.new}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
              className="w-full h-12 px-4 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500 transition-all"
              placeholder={t('landlordSettings.modals.changePassword.minChars')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t('landlordSettings.modals.changePassword.confirmPassword')}</label>
            <input
              type="password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
              className="w-full h-12 px-4 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500 transition-all"
              placeholder={t('landlordSettings.modals.changePassword.repeatPassword')}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="flex-1 py-3 border border-neutral-200 dark:border-neutral-600 text-sm font-medium text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-[#1f1f21] transition-colors"
            >
              {t('landlordSettings.modals.cancel')}
            </button>
            <button
              onClick={handlePasswordChange}
              disabled={isLoading || !passwordForm.current || !passwordForm.new || !passwordForm.confirm}
              className="flex-1 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? <SpinnerGap className="w-4 h-4 animate-spin" /> : null}
              {isLoading ? t('landlordSettings.modals.changePassword.updating') : t('landlordSettings.modals.changePassword.changeButton')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Sessions Modal */}
      <Modal open={showSessionsModal} onClose={() => setShowSessionsModal(false)} title={t('landlordSettings.modals.sessions.title')}>
        <div className="space-y-3">
          {sessions.map((session) => {
            const DeviceIcon = getDeviceIcon(session.deviceType);
            return (
              <div key={session.id} className="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-700 rounded-2xl bg-white dark:bg-[#1f1f21]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-[#2a2a2c] flex items-center justify-center">
                    <DeviceIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{session.device}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{session.location} · {session.lastActive}</p>
                  </div>
                </div>
                {session.current ? (
                  <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full">{t('landlordSettings.modals.sessions.current')}</span>
                ) : (
                  <button
                    onClick={() => handleCloseSession(session.id)}
                    className="text-xs text-red-600 dark:text-red-400 font-medium hover:underline"
                  >
                    {t('landlordSettings.modals.sessions.close')}
                  </button>
                )}
              </div>
            );
          })}
          {sessions.length > 1 && (
            <button
              onClick={() => {
                setSessions(prev => prev.filter(s => s.current));
                toast.success(t('landlordSettings.toasts.allSessionsClosed'));
              }}
              className="w-full py-3 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              {t('landlordSettings.modals.sessions.closeAll')}
            </button>
          )}
        </div>
      </Modal>

      {/* Download Data Modal */}
      <Modal open={showDownloadModal} onClose={() => setShowDownloadModal(false)} title={t('landlordSettings.modals.downloadData.title')}>
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            {t('landlordSettings.modals.downloadData.description')}
          </p>
          <div className="p-4 bg-stone-50 dark:bg-[#1f1f21] rounded-2xl space-y-2">
            {[
              t('landlordSettings.modals.downloadData.profileInfo'),
              t('landlordSettings.modals.downloadData.paymentHistory'),
              t('landlordSettings.modals.downloadData.publishedProperties'),
              t('landlordSettings.modals.downloadData.signedContracts')
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                </div>
                {item}
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {t('landlordSettings.modals.downloadData.emailNote')}
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowDownloadModal(false)}
              className="flex-1 py-3 border border-neutral-200 dark:border-neutral-600 text-sm font-medium text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-[#1f1f21] transition-colors"
            >
              {t('landlordSettings.modals.cancel')}
            </button>
            <button
              onClick={handleDownloadData}
              disabled={isLoading}
              className="flex-1 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isLoading ? t('landlordSettings.modals.downloadData.processing') : t('landlordSettings.modals.downloadData.requestData')}
            </button>
          </div>
        </div>
      </Modal>

      {/* 2FA Modal */}
      <Modal open={show2FAModal} onClose={() => setShow2FAModal(false)} title={t('landlordSettings.modals.twoFactor.title')}>
        <div className="space-y-4">
          {!settings.twoFactorAuth ? (
            <>
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-emerald-900/50 flex items-center justify-center shadow-sm flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm text-emerald-800 dark:text-emerald-200">
                    {t('landlordSettings.modals.twoFactor.description')}
                  </p>
                </div>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                {t('landlordSettings.modals.twoFactor.smsNote')}
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShow2FAModal(false)}
                  className="flex-1 py-3 border border-neutral-200 dark:border-neutral-600 text-sm font-medium text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-[#1f1f21] transition-colors"
                >
                  {t('landlordSettings.modals.cancel')}
                </button>
                <button
                  onClick={handleEnable2FA}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {isLoading ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  {isLoading ? t('landlordSettings.modals.twoFactor.enabling') : t('landlordSettings.modals.twoFactor.enable')}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium">
                  {t('landlordSettings.modals.twoFactor.enabled')}
                </p>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                {t('landlordSettings.modals.twoFactor.protected')}
              </p>
              <button
                onClick={() => {
                  setGear(prev => ({ ...prev, twoFactorAuth: false }));
                  setShow2FAModal(false);
                  toast.success(t('landlordSettings.toasts.twoFactorDisabled'));
                }}
                className="w-full py-3 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                {t('landlordSettings.modals.twoFactor.disable')}
              </button>
            </>
          )}
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title={t('landlordSettings.modals.deleteAccount.title')}>
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
              <Warning className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">{t('landlordSettings.modals.deleteAccount.warning')}</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {t('landlordSettings.modals.deleteAccount.warningDesc')}
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t('landlordSettings.modals.deleteAccount.typeToConfirm')} <span className="font-bold text-red-600 dark:text-red-400">{t('landlordSettings.modals.deleteAccount.confirmWord')}</span> {t('landlordSettings.modals.deleteAccount.toConfirm')}
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full h-12 px-4 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 dark:focus:border-red-500 transition-all"
              placeholder={t('landlordSettings.modals.deleteAccount.confirmWord')}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmText('');
              }}
              className="flex-1 py-3 border border-neutral-200 dark:border-neutral-600 text-sm font-medium text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-[#1f1f21] transition-colors"
            >
              {t('landlordSettings.modals.cancel')}
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={isLoading || deleteConfirmText !== t('landlordSettings.modals.deleteAccount.confirmWord')}
              className="flex-1 py-3 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <TrashSimple className="w-4 h-4" />}
              {isLoading ? t('landlordSettings.modals.deleteAccount.deleting') : t('landlordSettings.modals.deleteAccount.deleteButton')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Invite Team Member Modal */}
      <Modal open={showInviteModal} onClose={() => setShowInviteModal(false)} title={t('landlordSettings.modals.inviteMember.title')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t('landlordSettings.modals.inviteMember.email')}</label>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
              className="w-full h-12 px-4 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500 transition-all"
              placeholder="email@ejemplo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t('landlordSettings.modals.inviteMember.role')}</label>
            <div className="space-y-2">
              {([
                { value: 'admin' as TeamRole, label: t('landlordSettings.team.roles.admin'), desc: t('landlordSettings.modals.inviteMember.adminDesc') },
                { value: 'manager' as TeamRole, label: t('landlordSettings.team.roles.manager'), desc: t('landlordSettings.modals.inviteMember.managerDesc') },
                { value: 'accountant' as TeamRole, label: t('landlordSettings.team.roles.accountant'), desc: t('landlordSettings.modals.inviteMember.accountantDesc') },
                { value: 'viewer' as TeamRole, label: t('landlordSettings.team.roles.viewer'), desc: t('landlordSettings.modals.inviteMember.viewerDesc') },
              ]).map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setInviteForm(prev => ({ ...prev, role: role.value }))}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left',
                    inviteForm.role === role.value
                      ? 'border-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-[#1f1f21]'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                    inviteForm.role === role.value
                      ? 'border-indigo-500'
                      : 'border-neutral-300 dark:border-neutral-600'
                  )}>
                    {inviteForm.role === role.value && (
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{role.label}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{role.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowInviteModal(false)}
              className="flex-1 py-3 border border-neutral-200 dark:border-neutral-600 text-sm font-medium text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-[#1f1f21] transition-colors"
            >
              {t('landlordSettings.modals.cancel')}
            </button>
            <button
              onClick={handleInviteMember}
              disabled={isLoading || !inviteForm.email}
              className="flex-1 py-3 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {isLoading ? t('landlordSettings.modals.inviteMember.sending') : t('landlordSettings.modals.inviteMember.sendInvite')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Team Member Modal */}
      <Modal open={showEditMemberModal} onClose={() => setShowEditMemberModal(false)} title={t('landlordSettings.modals.editMember.title')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t('landlordSettings.modals.editMember.name')}</label>
            <input
              type="text"
              value={editMemberForm.name}
              onChange={(e) => setEditMemberForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full h-12 px-4 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500 transition-all"
              placeholder={t('landlordSettings.modals.editMember.namePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t('landlordSettings.modals.editMember.role')}</label>
            <div className="space-y-2">
              {([
                { value: 'admin' as TeamRole, label: t('landlordSettings.team.roles.admin'), desc: t('landlordSettings.modals.inviteMember.adminDesc') },
                { value: 'manager' as TeamRole, label: t('landlordSettings.team.roles.manager'), desc: t('landlordSettings.modals.inviteMember.managerDesc') },
                { value: 'accountant' as TeamRole, label: t('landlordSettings.team.roles.accountant'), desc: t('landlordSettings.modals.inviteMember.accountantDesc') },
                { value: 'viewer' as TeamRole, label: t('landlordSettings.team.roles.viewer'), desc: t('landlordSettings.modals.inviteMember.viewerDesc') },
              ]).map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setEditMemberForm(prev => ({ ...prev, role: role.value }))}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left',
                    editMemberForm.role === role.value
                      ? 'border-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-[#1f1f21]'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                    editMemberForm.role === role.value
                      ? 'border-indigo-500'
                      : 'border-neutral-300 dark:border-neutral-600'
                  )}>
                    {editMemberForm.role === role.value && (
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{role.label}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{role.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowEditMemberModal(false);
                setEditingMember(null);
              }}
              className="flex-1 py-3 border border-neutral-200 dark:border-neutral-600 text-sm font-medium text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-[#1f1f21] transition-colors"
            >
              {t('landlordSettings.modals.cancel')}
            </button>
            <button
              onClick={handleEditMember}
              disabled={isLoading}
              className="flex-1 py-3 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <PencilSimple className="w-4 h-4" />}
              {isLoading ? t('landlordSettings.modals.editMember.saving') : t('landlordSettings.modals.editMember.saveChanges')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Bank Account Modal */}
      <Modal open={showAddBankModal} onClose={() => { setShowAddBankModal(false); resetBankForm(); }} title={t('landlordSettings.paymentAccounts.modals.addBankAccount.title')}>
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
      </Modal>

      {/* Add Digital Wallet Modal */}
      <Modal open={showAddWalletModal} onClose={() => { setShowAddWalletModal(false); resetWalletForm(); }} title={t('landlordSettings.paymentAccounts.modals.addWallet.title')}>
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
      </Modal>

      {/* Delete Payment Account Modal */}
      <Modal open={showDeleteAccountModal} onClose={() => { setShowDeleteAccountModal(false); setEditingAccount(null); }} title={t('landlordSettings.paymentAccounts.modals.deleteAccount.title')}>
        <div className="space-y-4">
          {editingAccount && (
            <>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex gap-3">
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
      </Modal>
    </div>
  );
}
