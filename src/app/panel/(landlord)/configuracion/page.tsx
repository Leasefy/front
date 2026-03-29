'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell, CreditCard, Shield, Envelope, Globe, Moon, CaretRight, Check, Crown, SpinnerGap, Monitor, Warning, TrashSimple, Download, Laptop, Lock, Eye, FileText, ArrowCounterClockwise, Tag, ArrowUpRight } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';
import { getPlanById } from '@/lib/constants/subscription-plans';
import { useMySubscription } from '@/lib/hooks/useSubscription';
import { formatCurrency as formatCurrencyUtil } from '@/lib/format';
import { useLeases } from '@/lib/hooks/useLeases';
import { useVisits } from '@/lib/hooks/useVisits';
import { useNotificationSettings } from '@/lib/hooks/useSettings';
import { settingsApi } from '@/lib/api/settings.service';
import { getSupabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { SettingToggle } from '@/components/settings/SettingToggle';
import { SettingLink } from '@/components/settings/SettingLink';
import { PaymentAccountsSection } from '@/components/settings/PaymentAccountsSection';
import { TeamManagementSection } from '@/components/settings/TeamManagementSection';
import { MfaSetupSection } from '@/components/settings/MfaSetupSection';
import type { NotificationSettings } from '@/lib/api/settings.service';

// ============================================================================
// Main Component
// ============================================================================

export default function ConfiguracionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const { stats: visitStats } = useVisits();
  const { getActive: getActiveLeases } = useLeases();
  const [mounted, setMounted] = useState(false);

  // Real notification settings from backend
  const { settings: notifSettings, updateSetting } = useNotificationSettings();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const { subscription } = useMySubscription();
  const currentPlanId = subscription?.planId ?? 'free';
  const currentPlan = getPlanById(currentPlanId);

  // Map UI toggle keys to backend notification setting keys
  const notifKeyMap: Record<string, keyof NotificationSettings> = {
    emailNewApplication: 'emailApplications',
    emailPaymentReceived: 'emailPayments',
    emailContractReminder: 'emailContracts',
    pushNewMessage: 'emailMessages',
    marketingEmails: 'emailMarketing',
  };

  // Handlers
  const handleNotifToggle = async (uiKey: string) => {
    const backendKey = notifKeyMap[uiKey];
    if (!backendKey) return;
    try {
      await updateSetting(backendKey, !notifSettings[backendKey]);
      toast.success(t('landlordSettings.toasts.settingsUpdated'));
    } catch {
      toast.error('Error al actualizar configuración');
    }
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
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not initialized');
      const { error } = await supabase.auth.updateUser({ password: passwordForm.new });
      if (error) throw error;
      setShowPasswordModal(false);
      setPasswordForm({ current: '', new: '', confirm: '' });
      toast.success(t('landlordSettings.toasts.passwordUpdated'));
    } catch (err) {
      toast.error((err as Error).message || 'Error al cambiar contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseAllSessions = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not initialized');
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      toast.success(t('landlordSettings.toasts.allSessionsClosed'));
      // Global signout logs out the current session too, redirect to auth
      setTimeout(() => router.push('/auth'), 1000);
    } catch (err) {
      toast.error((err as Error).message || 'Error al cerrar sesiones');
    }
  };

  const handleDownloadData = async () => {
    setIsLoading(true);
    try {
      const data = await settingsApi.requestDataExport();
      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leasefy-datos-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowDownloadModal(false);
      toast.success(t('landlordSettings.toasts.dataRequestSent'));
    } catch (err) {
      toast.error((err as Error).message || 'Error al exportar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== t('landlordSettings.modals.deleteAccount.confirmWord')) {
      toast.error(t('landlordSettings.toasts.typeToConfirm'));
      return;
    }
    setIsLoading(true);
    try {
      await settingsApi.deleteAccount();
      // Sign out from Supabase after soft-delete
      const supabase = getSupabase();
      if (supabase) await supabase.auth.signOut();
      toast.success(t('landlordSettings.toasts.accountDeleted'));
      setTimeout(() => router.push('/'), 2000);
    } catch (err) {
      toast.error((err as Error).message || 'Error al eliminar cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetOnboarding = () => {
    localStorage.removeItem('plan_onboarding_landlord');
    window.dispatchEvent(new Event('onboarding-updated'));
    toast.success(t('landlordSettings.toasts.onboardingReset'));
    setTimeout(() => router.push('/panel'), 500);
  };

  // Derive current session info from browser
  const currentSessionDevice = typeof navigator !== 'undefined' ? navigator.userAgent.split('(')[1]?.split(')')[0] || 'Navegador actual' : 'Navegador actual';

  // Account deletion blockers
  const activeLeases = getActiveLeases();
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
            className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 overflow-hidden relative"
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
                      {currentPlanId === 'free'
                        ? t('landlordSettings.subscription.freePlan')
                        : `${formatCurrencyUtil(currentPlan.price.monthly)}/${t('landlordSettings.subscription.month')}`}
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
                {currentPlanId !== 'business' && (
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
            className="rounded-xl bg-stone-50 dark:bg-[#141416] overflow-hidden"
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
                enabled={notifSettings.emailApplications}
                onToggle={() => handleNotifToggle('emailNewApplication')}
              />
              <SettingToggle
                icon={CreditCard}
                title={t('landlordSettings.notifications.paymentReceived')}
                description={t('landlordSettings.notifications.paymentReceivedDesc')}
                enabled={notifSettings.emailPayments}
                onToggle={() => handleNotifToggle('emailPaymentReceived')}
              />
              <SettingToggle
                icon={FileText}
                title={t('landlordSettings.notifications.contractReminders')}
                description={t('landlordSettings.notifications.contractRemindersDesc')}
                enabled={notifSettings.emailContracts}
                onToggle={() => handleNotifToggle('emailContractReminder')}
              />
              <SettingToggle
                icon={Bell}
                title={t('landlordSettings.notifications.newMessages')}
                description={t('landlordSettings.notifications.newMessagesDesc')}
                enabled={notifSettings.emailMessages}
                onToggle={() => handleNotifToggle('pushNewMessage')}
              />
              <SettingToggle
                icon={Tag}
                title={t('landlordSettings.notifications.promotionalEmails')}
                description={t('landlordSettings.notifications.promotionalEmailsDesc')}
                enabled={notifSettings.emailMarketing}
                onToggle={() => handleNotifToggle('marketingEmails')}
              />
            </div>
          </motion.section>

          {/* Team Management - Extracted */}
          <TeamManagementSection delay={0.15} />

          {/* Payment Accounts - Extracted */}
          <PaymentAccountsSection delay={0.18} />

          {/* Security & Preferences - 2 column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Security */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl bg-stone-50 dark:bg-[#141416] overflow-hidden"
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
                <MfaSetupSection />
                <SettingLink
                  icon={Lock}
                  title={t('landlordSettings.security.changePassword')}
                  description={t('landlordSettings.security.updateAccess')}
                  onClick={() => setShowPasswordModal(true)}
                />
                <SettingLink
                  icon={Monitor}
                  title={t('landlordSettings.security.activeSessions')}
                  description={`1 ${t('landlordSettings.security.device')}`}
                  onClick={() => setShowSessionsModal(true)}
                />
              </div>
            </motion.section>

            {/* Preferences */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-xl bg-stone-50 dark:bg-[#141416] overflow-hidden"
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
              className="rounded-xl bg-stone-50 dark:bg-[#141416] overflow-hidden"
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
              className="rounded-xl border-2 border-red-100 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20 overflow-hidden h-fit"
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
      <SettingsModal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} title={t('landlordSettings.modals.changePassword.title')}>
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
      </SettingsModal>

      {/* Sessions Modal */}
      <SettingsModal open={showSessionsModal} onClose={() => setShowSessionsModal(false)} title={t('landlordSettings.modals.sessions.title')}>
        <div className="space-y-3">
          {/* Current session (derived from browser) */}
          <div className="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-[#1f1f21]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-[#2a2a2c] flex items-center justify-center">
                <Laptop className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">{currentSessionDevice}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('landlordSettings.modals.sessions.current')}</p>
              </div>
            </div>
            <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full">{t('landlordSettings.modals.sessions.current')}</span>
          </div>
          {/* Close all sessions (signs out everywhere) */}
          <button
            onClick={handleCloseAllSessions}
            className="w-full py-3 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            {t('landlordSettings.modals.sessions.closeAll')}
          </button>
        </div>
      </SettingsModal>

      {/* Download Data Modal */}
      <SettingsModal open={showDownloadModal} onClose={() => setShowDownloadModal(false)} title={t('landlordSettings.modals.downloadData.title')}>
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            {t('landlordSettings.modals.downloadData.description')}
          </p>
          <div className="p-4 bg-stone-50 dark:bg-[#1f1f21] rounded-xl space-y-2">
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
      </SettingsModal>

      {/* Delete Account Modal */}
      <SettingsModal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title={t('landlordSettings.modals.deleteAccount.title')}>
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex gap-3">
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
      </SettingsModal>
    </div>
  );
}
