'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Shield, DeviceMobile, Envelope, Globe, Moon, Eye, CreditCard, Download, TrashSimple, CaretRight, Check, X, SpinnerGap, Monitor, Warning, Lock, FileText, Tag } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { MfaSetupSection } from '@/components/settings/MfaSetupSection';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import { useAuth } from '@/lib/auth/use-auth';
import { useNotificationSettings } from '@/lib/hooks/useSettings';
import { settingsApi } from '@/lib/api/settings.service';
import { getSupabase } from '@/lib/supabase/client';
import type { NotificationSettings } from '@/lib/api/settings.service';

// Modal Component
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

// Map UI keys to backend NotificationSettings keys
const notifKeyMap: Record<string, keyof NotificationSettings> = {
  emailNotifications: 'emailApplications',
  pushNotifications: 'pushAll',
  paymentReminders: 'emailPayments',
  marketingEmails: 'emailMarketing',
};

export default function ConfiguracionPage() {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Real notification settings from backend
  const { settings: notifSettings, isLoading: notifLoading, updateSetting } = useNotificationSettings();

  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Current session derived from browser
  const currentSession = {
    device: typeof navigator !== 'undefined'
      ? navigator.userAgent.includes('Mobile') ? 'Dispositivo móvil' : 'Navegador actual'
      : 'Navegador actual',
    current: true,
  };

  const handleNotifToggle = async (uiKey: string) => {
    const backendKey = notifKeyMap[uiKey];
    if (!backendKey) return;
    try {
      await updateSetting(backendKey, !notifSettings[backendKey]);
      toast.success(locale === 'es' ? 'Configuración actualizada' : 'Settings updated');
    } catch {
      toast.error(locale === 'es' ? 'Error al actualizar configuración' : 'Error updating settings');
    }
  };

  const handleDarkModeToggle = () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    toast.success(newTheme === 'dark' ? t('settings.appearance.dark') : t('settings.appearance.light'));
  };

  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale);
    toast.success(newLocale === 'es' ? 'Idioma cambiado a Español' : 'Language changed to English');
  };

  const handleCloseOtherSessions = async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut({ scope: 'others' });
      toast.success(locale === 'es' ? 'Otras sesiones cerradas' : 'Other sessions closed');
      setShowSessionsModal(false);
    } catch {
      toast.error(locale === 'es' ? 'Error al cerrar sesiones' : 'Error closing sessions');
    }
  };

  const handleDownloadData = async () => {
    setIsLoading(true);
    try {
      await settingsApi.requestDataExport();
      setShowDownloadModal(false);
      toast.success(locale === 'es'
        ? 'Se te enviará un correo con tus datos en las próximas 24 horas'
        : 'You will receive an email with your data within 24 hours');
    } catch {
      toast.error(locale === 'es' ? 'Error al solicitar exportación' : 'Error requesting export');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'ELIMINAR') {
      toast.error(locale === 'es' ? 'Escribe ELIMINAR para confirmar' : 'Type ELIMINAR to confirm');
      return;
    }
    setIsLoading(true);
    try {
      await settingsApi.deleteAccount();
      const supabase = getSupabase();
      await supabase.auth.signOut();
      toast.success(locale === 'es' ? 'Cuenta eliminada' : 'Account deleted');
      router.push('/');
    } catch {
      toast.error(locale === 'es' ? 'Error al eliminar la cuenta' : 'Error deleting account');
    } finally {
      setIsLoading(false);
    }
  };

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
            {t('settings.title')}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {t('settings.subtitle')}
          </p>
        </motion.header>

        <div className="space-y-6">
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
                  <h2 className="font-semibold text-neutral-900 dark:text-white">{t('settings.notifications.title')}</h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{locale === 'es' ? 'Controla cómo te contactamos' : 'Control how we contact you'}</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-neutral-200/50 dark:divide-neutral-700/50">
              <SettingToggle
                icon={Envelope}
                title={t('settings.notifications.email')}
                description={locale === 'es' ? 'Recibe actualizaciones sobre tu arriendo' : 'Receive updates about your rental'}
                enabled={notifLoading ? true : notifSettings.emailApplications}
                onToggle={() => handleNotifToggle('emailNotifications')}
              />
              <SettingToggle
                icon={DeviceMobile}
                title={t('settings.notifications.push')}
                description={locale === 'es' ? 'Recibe notificaciones en tu dispositivo' : 'Receive notifications on your device'}
                enabled={notifLoading ? true : notifSettings.pushAll}
                onToggle={() => handleNotifToggle('pushNotifications')}
              />
              <SettingToggle
                icon={CreditCard}
                title={t('settings.notifications.payments')}
                description={locale === 'es' ? 'Recordatorios antes del vencimiento' : 'Reminders before due date'}
                enabled={notifLoading ? true : notifSettings.emailPayments}
                onToggle={() => handleNotifToggle('paymentReminders')}
              />
              <SettingToggle
                icon={Tag}
                title={t('settings.notifications.marketing')}
                description={locale === 'es' ? 'Ofertas y novedades de la plataforma' : 'Offers and platform news'}
                enabled={notifLoading ? false : notifSettings.emailMarketing}
                onToggle={() => handleNotifToggle('marketingEmails')}
              />
            </div>
          </motion.section>

          {/* Security & Preferences */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Security */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-3xl bg-stone-50 dark:bg-[#141416] overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-neutral-200/50 dark:border-[#2a2a2c]/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                    <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-neutral-900 dark:text-white">{locale === 'es' ? 'Seguridad' : 'Security'}</h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{locale === 'es' ? 'Protege tu cuenta' : 'Protect your account'}</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-neutral-200/50 dark:divide-neutral-700/50">
                <MfaSetupSection />
                <SettingLink
                  icon={Lock}
                  title={locale === 'es' ? 'Contraseña' : 'Password'}
                  description={locale === 'es' ? 'Establece o cambia tu contraseña' : 'Set or change your password'}
                  onClick={() => setShowPasswordModal(true)}
                />
                <SettingLink
                  icon={Monitor}
                  title={t('settings.account.sessions')}
                  description={locale === 'es' ? 'Gestiona tus sesiones activas' : 'Manage your active sessions'}
                  onClick={() => setShowSessionsModal(true)}
                />
              </div>
            </motion.section>

            {/* Preferences */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-3xl bg-stone-50 dark:bg-[#141416] overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-neutral-200/50 dark:border-[#2a2a2c]/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                    <Globe className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-neutral-900 dark:text-white">{locale === 'es' ? 'Preferencias' : 'Preferences'}</h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{locale === 'es' ? 'Personaliza tu experiencia' : 'Customize your experience'}</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-neutral-200/50 dark:divide-neutral-700/50">
                <SettingToggle
                  icon={Moon}
                  title={locale === 'es' ? 'Modo oscuro' : 'Dark mode'}
                  description={t('settings.appearance.theme')}
                  enabled={mounted && resolvedTheme === 'dark'}
                  onToggle={handleDarkModeToggle}
                />
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                      <Globe className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">{t('settings.appearance.language')}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{locale === 'es' ? 'Idioma de la interfaz' : 'Interface language'}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <select
                      value={locale}
                      onChange={(e) => handleLanguageChange(e.target.value as Locale)}
                      aria-label={locale === 'es' ? 'Idioma de la interfaz' : 'Interface language'}
                      className="appearance-none pl-4 pr-10 py-2.5 text-sm border border-neutral-200 dark:border-neutral-600 rounded-xl bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      <option value="es">{t('settings.appearance.spanish')}</option>
                      <option value="en">{t('settings.appearance.english')}</option>
                    </select>
                    <CaretRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 rotate-90 pointer-events-none" />
                  </div>
                </div>
              </div>
            </motion.section>
          </div>

          {/* Data & Privacy + Danger Zone */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Data & Privacy */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-3xl bg-stone-50 dark:bg-[#141416] overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-neutral-200/50 dark:border-[#2a2a2c]/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                    <Eye className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-neutral-900 dark:text-white">{t('settings.privacy.title')}</h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{locale === 'es' ? 'Tu información personal' : 'Your personal information'}</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-neutral-200/50 dark:divide-neutral-700/50">
                <SettingLink
                  icon={Download}
                  title={t('settings.privacy.downloadData')}
                  description={locale === 'es' ? 'Copia de tu información' : 'Copy of your information'}
                  onClick={() => setShowDownloadModal(true)}
                />
                <SettingLink
                  icon={FileText}
                  title={t('settings.help.privacy')}
                  description={locale === 'es' ? 'Lee nuestra política' : 'Read our policy'}
                  onClick={() => window.open('/privacidad', '_blank')}
                  external
                />
                <SettingLink
                  icon={FileText}
                  title={t('settings.help.terms')}
                  description={locale === 'es' ? 'Términos y condiciones' : 'Terms and conditions'}
                  onClick={() => window.open('/terminos', '_blank')}
                  external
                />
              </div>
            </motion.section>

            {/* Danger Zone */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-3xl border-2 border-red-100 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20 overflow-hidden h-fit"
            >
              <div className="px-6 py-5 border-b border-red-100 dark:border-red-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <Warning className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-red-900 dark:text-red-300">{locale === 'es' ? 'Zona de Peligro' : 'Danger Zone'}</h2>
                    <p className="text-xs text-red-600 dark:text-red-400">{locale === 'es' ? 'Acciones irreversibles' : 'Irreversible actions'}</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                  {locale === 'es'
                    ? 'Eliminar tu cuenta es permanente. Todos tus datos serán eliminados.'
                    : 'Deleting your account is permanent. All your data will be deleted.'}
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-5 py-2.5 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-700 transition-all"
                >
                  {t('settings.account.deleteAccount')}
                </button>
              </div>
            </motion.section>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      <ChangePasswordModal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} />

      {/* Sessions Modal */}
      <Modal
        open={showSessionsModal}
        onClose={() => setShowSessionsModal(false)}
        title={locale === 'es' ? 'Sesiones activas' : 'Active sessions'}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-700 rounded-2xl bg-white dark:bg-[#1f1f21]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-[#2a2a2c] flex items-center justify-center">
                <Monitor className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">{currentSession.device}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {user?.email} · {locale === 'es' ? 'Ahora' : 'Now'}
                </p>
              </div>
            </div>
            <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full">
              {locale === 'es' ? 'Actual' : 'Current'}
            </span>
          </div>
          <button
            onClick={handleCloseOtherSessions}
            className="w-full py-3 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            {locale === 'es' ? 'Cerrar todas las otras sesiones' : 'Close all other sessions'}
          </button>
        </div>
      </Modal>

      {/* Download Data Modal */}
      <Modal
        open={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        title={locale === 'es' ? 'Descargar mis datos' : 'Download my data'}
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            {locale === 'es'
              ? 'Prepararemos un archivo con toda tu información personal, incluyendo:'
              : 'We will prepare a file with all your personal information, including:'}
          </p>
          <div className="p-4 bg-stone-50 dark:bg-[#1f1f21] rounded-2xl space-y-2">
            {(locale === 'es'
              ? ['Información de perfil', 'Historial de pagos', 'Documentos subidos', 'Historial de aplicaciones']
              : ['Profile information', 'Payment history', 'Uploaded documents', 'Application history']
            ).map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                </div>
                {item}
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {locale === 'es'
              ? `El archivo se enviará a ${user?.email} en las próximas 24 horas.`
              : `The file will be sent to ${user?.email} within 24 hours.`}
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowDownloadModal(false)}
              className="flex-1 py-3 border border-neutral-200 dark:border-neutral-600 text-sm font-medium text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-[#1f1f21] transition-colors"
            >
              {locale === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              onClick={handleDownloadData}
              disabled={isLoading}
              className="flex-1 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isLoading
                ? (locale === 'es' ? 'Procesando...' : 'Processing...')
                : (locale === 'es' ? 'Solicitar datos' : 'Request data')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={locale === 'es' ? 'Eliminar cuenta' : 'Delete account'}
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
              <Warning className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                {locale === 'es' ? 'Esta acción no se puede deshacer' : 'This action cannot be undone'}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {locale === 'es'
                  ? 'Todos tus datos, historial de pagos, documentos y configuraciones serán eliminados permanentemente.'
                  : 'All your data, payment history, documents and settings will be permanently deleted.'}
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {locale === 'es' ? 'Escribe ' : 'Type '}
              <span className="font-bold text-red-600 dark:text-red-400">ELIMINAR</span>
              {locale === 'es' ? ' para confirmar' : ' to confirm'}
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full h-12 px-4 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 dark:focus:border-red-500 transition-all"
              placeholder="ELIMINAR"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
              className="flex-1 py-3 border border-neutral-200 dark:border-neutral-600 text-sm font-medium text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-[#1f1f21] transition-colors"
            >
              {locale === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={isLoading || deleteConfirmText !== 'ELIMINAR'}
              className="flex-1 py-3 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <TrashSimple className="w-4 h-4" />}
              {isLoading
                ? (locale === 'es' ? 'Eliminando...' : 'Deleting...')
                : (locale === 'es' ? 'Eliminar cuenta' : 'Delete account')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Setting Toggle Component
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

// Setting Link Component
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
