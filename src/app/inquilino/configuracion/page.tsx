'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Shield, DeviceMobile, Envelope, Globe, Moon, Eye, CreditCard, Download, TrashSimple, CaretRight, Check, X, Monitor, Warning, Lock, FileText, Tag, ArrowCounterClockwise } from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { settingsApi } from '@/lib/api/settings.service';
import { getSupabase } from '@/lib/supabase/client';
import { accountDeletionCopy } from '@/lib/account-deletion/copy';
import { useI18n } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { MfaSetupSection } from '@/components/settings/MfaSetupSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Modal Component with Leasefy style
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
            className="relative bg-surface w-full max-w-md rounded-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-border-faint">
              <h3 className="text-lg font-semibold text-fg">{title}</h3>
              <IconButton
                variant="ghost"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-surface-muted text-fg-muted hover:text-fg hover:bg-surface-muted"
                aria-label="Cerrar"
                icon={<X className="w-4 h-4" />}
              />
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Acá vivía `mockSessions`: tres dispositivos inventados ("Firefox en MacOS ·
 * Medellín") que se mostraban como las sesiones reales de la persona, y un
 * botón "Cerrar todas las otras sesiones" que solo filtraba estado de React y
 * respondía "han sido cerradas".
 *
 * Es la peor forma del problema: alguien que ve un dispositivo que no reconoce
 * y cree que le entraron a la cuenta, cierra sesiones que nunca existieron y se
 * queda tranquilo sin que pase nada.
 *
 * No podemos **listar** sesiones desde el cliente —Supabase no lo expone— pero
 * sí podemos **cerrarlas de verdad**: `signOut({ scope: 'others' })` revoca los
 * refresh tokens de los demás dispositivos. Así que se muestra solo lo que
 * sabemos (este dispositivo) y se ofrece la acción que sí ocurre.
 */
function esteDispositivo(): string {
  if (typeof navigator === 'undefined') return 'Este dispositivo';
  const ua = navigator.userAgent;
  const so = /Windows/i.test(ua)
    ? 'Windows'
    : /iPhone|iPad/i.test(ua)
      ? 'iOS'
      : /Android/i.test(ua)
        ? 'Android'
        : /Mac/i.test(ua)
          ? 'macOS'
          : /Linux/i.test(ua)
            ? 'Linux'
            : null;
  const nav = /Edg\//i.test(ua)
    ? 'Edge'
    : /Chrome\//i.test(ua)
      ? 'Chrome'
      : /Safari\//i.test(ua)
        ? 'Safari'
        : /Firefox\//i.test(ua)
          ? 'Firefox'
          : null;
  if (nav && so) return `${nav} en ${so}`;
  return nav ?? so ?? 'Este dispositivo';
}

export default function ConfiguracionPage() {
  const router = useRouter();
  const { signOut, changePassword } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const [mounted, setMounted] = useState(false);

  // Ensure we only access theme on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  /*
   * Preferencias de notificación. Antes eran estado local puro: el interruptor
   * se movía, salía "Listo" y al recargar volvía al valor por defecto. Ahora se
   * cargan y se guardan contra `/users/me/notification-settings`, que ya existía
   * en `settingsApi` y nunca se había cableado.
   *
   * El contrato del back tiene más banderas que interruptores hay en pantalla,
   * así que el mapeo es explícito. `emailNotifications` agrupa los correos
   * transaccionales; los otros tres van uno a uno.
   */
  const [settings, setGear] = useState({
    emailNotifications: true,
    pushNotifications: true,
    paymentReminders: true,
    marketingEmails: false,
  });
  const [gearListo, setGearListo] = useState(false);

  useEffect(() => {
    let cancelado = false;
    settingsApi
      .getNotificationSettings()
      .then((n) => {
        if (cancelado) return;
        setGear({
          emailNotifications:
            n.emailApplications || n.emailVisits || n.emailContracts || n.emailMessages,
          pushNotifications: n.pushAll,
          paymentReminders: n.emailPayments,
          marketingEmails: n.emailMarketing,
        });
        setGearListo(true);
      })
      // Sin backend se dejan los valores por defecto, pero NO se marca listo:
      // así un interruptor no promete guardar algo que no se va a guardar.
      .catch(() => {
        if (!cancelado) setGearListo(false);
      });
    return () => {
      cancelado = true;
    };
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

  const handleToggle = async (key: keyof typeof settings) => {
    const anterior = settings[key];
    const nuevo = !anterior;
    setGear((prev) => ({ ...prev, [key]: nuevo }));

    // Sin backend disponible no se afirma que quedó guardado.
    if (!gearListo) {
      toast.error('No pudimos guardar tu preferencia. Intenta de nuevo.');
      setGear((prev) => ({ ...prev, [key]: anterior }));
      return;
    }

    const parche =
      key === 'emailNotifications'
        ? {
            emailApplications: nuevo,
            emailVisits: nuevo,
            emailContracts: nuevo,
            emailMessages: nuevo,
          }
        : key === 'pushNotifications'
          ? { pushAll: nuevo }
          : key === 'paymentReminders'
            ? { emailPayments: nuevo }
            : { emailMarketing: nuevo };

    try {
      await settingsApi.updateNotificationSettings(parche);
      toast.success(t('common.success'));
    } catch {
      // Se revierte: el interruptor debe reflejar lo que de verdad quedó.
      setGear((prev) => ({ ...prev, [key]: anterior }));
      toast.error('No pudimos guardar tu preferencia. Intenta de nuevo.');
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

  const handlePasswordChange = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (passwordForm.new.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    /*
     * Esto esperaba 1,5 s y decía "Contraseña actualizada correctamente" sin
     * tocar nada. La contraseña seguía siendo la vieja, y quien la cambiaba
     * porque creía tener la cuenta comprometida se quedaba igual de expuesto.
     *
     * `changePassword` ya existía en el contexto de auth, con esta misma firma:
     * verifica la actual contra el backend y recién ahí actualiza.
     */
    setIsLoading(true);
    try {
      await changePassword(passwordForm.current, passwordForm.new);
      setShowPasswordModal(false);
      setPasswordForm({ current: '', new: '', confirm: '' });
      toast.success('Contraseña actualizada correctamente');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No pudimos cambiar tu contraseña. Intenta de nuevo.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cierra de verdad las sesiones de los demás dispositivos (revoca sus refresh
   * tokens). Antes esto filtraba un arreglo en memoria y avisaba que estaban
   * cerradas.
   */
  const handleCerrarOtrasSesiones = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('sin cliente');
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) throw error;
      setShowSessionsModal(false);
      toast.success('Cerramos tu sesión en los demás dispositivos');
    } catch {
      toast.error('No pudimos cerrar las otras sesiones. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Derecho de acceso (Ley 1581). Esperaba 2 s y prometía un correo con los
   * datos "en las próximas 24 horas" sin pedirle nada a nadie: una promesa
   * legal que no tenía quién la cumpliera. `requestDataExport` ya existía.
   */
  const handleDownloadData = async () => {
    setIsLoading(true);
    try {
      await settingsApi.requestDataExport();
      setShowDownloadModal(false);
      toast.success('Recibimos tu solicitud. Te enviaremos tus datos por correo.');
    } catch {
      toast.error('No pudimos registrar tu solicitud. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Canonical deletion strings (single source of truth for all five flows).
  const deletionCopy = accountDeletionCopy(locale);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== deletionCopy.confirmWord) {
      toast.error(deletionCopy.confirmInstruction);
      return;
    }
    setIsLoading(true);
    try {
      // Real soft-delete (same flow as /inquilino/perfil). The backend keeps a
      // 30-day recovery window: signing in again reactivates the account.
      await settingsApi.deleteAccount();
      setIsLoading(false);
      setShowDeleteModal(false);
      toast.success(deletionCopy.successToast);
      // Let the user read the message, then clear the session and leave.
      setTimeout(() => {
        void signOut();
        router.push('/');
      }, 2000);
    } catch (err) {
      setIsLoading(false);
      const message = err instanceof Error && err.message
        ? err.message
        : deletionCopy.errorFallback;
      toast.error(message);
    }
  };

  const handleResetOnboarding = () => {
    // Only the local wizard draft/cache is cleared — the backend profile stays
    // intact (it is the source of truth for onboarding completeness), so the
    // dashboard keeps rendering fully and no logout/registration is involved.
    localStorage.removeItem('plan_onboarding_tenant');
    // Dispatch custom event to notify sidebar
    window.dispatchEvent(new Event('onboarding-updated'));
    toast.success(locale === 'es' ? 'Onboarding reiniciado' : 'Onboarding reset');
    // Take the user to the wizard to redo their info.
    setTimeout(() => router.push('/onboarding/inquilino'), 500);
  };

  return (
    <div className="min-h-screen bg-bg transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-medium text-fg tracking-tight">
            {t('settings.title')}
          </h1>
          <p className="mt-1 text-fg-muted">
            {t('settings.subtitle')}
          </p>
        </motion.header>

        <div className="space-y-6">
          {/* Notifications */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl bg-surface-muted overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-fg">{t('settings.notifications.title')}</h2>
                  <p className="text-xs text-fg-muted">{locale === 'es' ? 'Controla cómo te contactamos' : 'Control how we contact you'}</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-border/50">
              <SettingToggle
                icon={Envelope}
                title={t('settings.notifications.email')}
                description={locale === 'es' ? 'Recibe actualizaciones sobre tu arriendo' : 'Receive updates about your rental'}
                enabled={settings.emailNotifications}
                onToggle={() => handleToggle('emailNotifications')}
              />
              <SettingToggle
                icon={DeviceMobile}
                title={t('settings.notifications.push')}
                description={locale === 'es' ? 'Recibe notificaciones en tu dispositivo' : 'Receive notifications on your device'}
                enabled={settings.pushNotifications}
                onToggle={() => handleToggle('pushNotifications')}
              />
              {/* El interruptor de SMS salió: no tenemos canal de SMS ni bandera
                  que lo respalde en `/users/me/notification-settings`, así que
                  prometía avisos que nunca iban a llegar. Vuelve cuando exista. */}
              <SettingToggle
                icon={CreditCard}
                title={t('settings.notifications.payments')}
                description={locale === 'es' ? 'Recordatorios antes del vencimiento' : 'Reminders before due date'}
                enabled={settings.paymentReminders}
                onToggle={() => handleToggle('paymentReminders')}
              />
              <SettingToggle
                icon={Tag}
                title={t('settings.notifications.marketing')}
                description={locale === 'es' ? 'Ofertas y novedades de la plataforma' : 'Offers and platform news'}
                enabled={settings.marketingEmails}
                onToggle={() => handleToggle('marketingEmails')}
              />
            </div>
          </motion.section>

          {/* Security & Preferences - 2 column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Security */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-xl bg-surface-muted overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center">
                    <Shield className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-fg">{locale === 'es' ? 'Seguridad' : 'Security'}</h2>
                    <p className="text-xs text-fg-muted">{locale === 'es' ? 'Protege tu cuenta' : 'Protect your account'}</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-border/50">
                <MfaSetupSection />
                <SettingLink
                  icon={Lock}
                  title={t('settings.account.changePassword')}
                  description={locale === 'es' ? 'Actualiza tu acceso' : 'Update your access'}
                  onClick={() => setShowPasswordModal(true)}
                />
                <SettingLink
                  icon={Monitor}
                  title={t('settings.account.sessions')}
                  description={
                    locale === 'es'
                      ? 'Cierra tu sesión en otros dispositivos'
                      : 'Sign out on your other devices'
                  }
                  onClick={() => setShowSessionsModal(true)}
                />
              </div>
            </motion.section>

            {/* Preferences */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl bg-surface-muted overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center">
                    <Globe className="w-5 h-5 text-fg-muted" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-fg">{locale === 'es' ? 'Preferencias' : 'Preferences'}</h2>
                    <p className="text-xs text-fg-muted">{locale === 'es' ? 'Personaliza tu experiencia' : 'Customize your experience'}</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-border/50">
                <SettingToggle
                  icon={Moon}
                  title={locale === 'es' ? 'Modo oscuro' : 'Dark mode'}
                  description={t('settings.appearance.theme')}
                  enabled={mounted && resolvedTheme === 'dark'}
                  onToggle={handleDarkModeToggle}
                />
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center">
                      <Globe className="w-5 h-5 text-fg-muted" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-fg">{t('settings.appearance.language')}</p>
                      <p className="text-xs text-fg-muted">{locale === 'es' ? 'Idioma de la interfaz' : 'Interface language'}</p>
                    </div>
                  </div>
                  <Select value={locale} onValueChange={(v) => handleLanguageChange(v as Locale)}>
                    <SelectTrigger
                      className="w-auto gap-2 rounded-xl bg-surface"
                      aria-label={locale === 'es' ? 'Idioma de la interfaz' : 'Interface language'}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">{t('settings.appearance.spanish')}</SelectItem>
                      <SelectItem value="en">{t('settings.appearance.english')}</SelectItem>
                    </SelectContent>
                  </Select>
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
              transition={{ delay: 0.25 }}
              className="rounded-xl bg-surface-muted overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center">
                    <Eye className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-fg">{t('settings.privacy.title')}</h2>
                    <p className="text-xs text-fg-muted">{locale === 'es' ? 'Tu información personal' : 'Your personal information'}</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-border/50">
                <SettingLink
                  icon={Download}
                  title={t('settings.privacy.downloadData')}
                  description={locale === 'es' ? 'Copia de tu información' : 'Copy of your information'}
                  onClick={() => setShowDownloadModal(true)}
                />
                <SettingLink
                  icon={ArrowCounterClockwise}
                  title={locale === 'es' ? 'Reiniciar onboarding' : 'Reset onboarding'}
                  description={locale === 'es' ? 'Volver al estado inicial' : 'Return to initial state'}
                  onClick={handleResetOnboarding}
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
              className="rounded-xl border-2 border-danger/30 bg-danger-soft/30 overflow-hidden h-fit"
            >
              <div className="px-6 py-5 border-b border-danger/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-danger-soft flex items-center justify-center">
                    <Warning className="w-5 h-5 text-danger" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-danger">{locale === 'es' ? 'Zona de Peligro' : 'Danger Zone'}</h2>
                    <p className="text-xs text-danger">{locale === 'es' ? 'Acciones irreversibles' : 'Irreversible actions'}</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-sm text-fg-muted mb-4">
                  {locale === 'es'
                    ? 'Eliminar tu cuenta es permanente. Todos tus datos serán eliminados.'
                    : 'Deleting your account is permanent. All your data will be deleted.'}
                </p>
                <Button
                  variant="outline"
                  hideArrow
                  onClick={() => setShowDeleteModal(true)}
                  className="border-2 border-danger/30 text-danger hover:bg-danger-soft hover:text-danger"
                >
                  {t('settings.account.deleteAccount')}
                </Button>
              </div>
            </motion.section>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      <Modal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Cambiar contraseña">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg mb-2">Contraseña actual</label>
            <Input
              type="password"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
              className="w-full h-12 rounded-xl bg-surface"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg mb-2">Nueva contraseña</label>
            <Input
              type="password"
              value={passwordForm.new}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
              className="w-full h-12 rounded-xl bg-surface"
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg mb-2">Confirmar contraseña</label>
            <Input
              type="password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
              className="w-full h-12 rounded-xl bg-surface"
              placeholder="Repetir contraseña"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              hideArrow
              onClick={() => setShowPasswordModal(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="secondary"
              hideArrow
              isLoading={isLoading}
              onClick={handlePasswordChange}
              disabled={isLoading || !passwordForm.current || !passwordForm.new || !passwordForm.confirm}
              className="flex-1 bg-primary text-primary-fg hover:bg-primary-hover"
            >
              {isLoading ? 'Actualizando...' : 'Cambiar contraseña'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sessions Modal */}
      <Modal open={showSessionsModal} onClose={() => setShowSessionsModal(false)} title="Sesiones activas">
        <div className="space-y-3">
          {/* Lo único que sabemos con certeza: el dispositivo desde el que está
              entrando ahora. No inventamos una lista de los demás. */}
          <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-surface">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center">
                <Monitor className="w-5 h-5 text-fg-muted" />
              </div>
              <div>
                <p className="text-sm font-medium text-fg">{esteDispositivo()}</p>
                <p className="text-xs text-fg-muted">Estás usando este dispositivo ahora</p>
              </div>
            </div>
            <span className="px-3 py-1.5 bg-success-soft text-success text-xs font-medium rounded-full">
              Actual
            </span>
          </div>

          <p className="text-xs text-fg-muted">
            Todavía no podemos mostrarte la lista de los otros dispositivos donde tienes la sesión
            abierta. Si no reconoces alguno o perdiste un equipo, ciérralos todos y vuelve a entrar.
          </p>

          <Button
            variant="outline"
            hideArrow
            disabled={isLoading}
            onClick={handleCerrarOtrasSesiones}
            className="w-full border-2 border-danger/30 text-danger hover:bg-danger-soft hover:text-danger"
          >
            {isLoading ? 'Cerrando…' : 'Cerrar sesión en los demás dispositivos'}
          </Button>
        </div>
      </Modal>

      {/* Download Data Modal */}
      <Modal open={showDownloadModal} onClose={() => setShowDownloadModal(false)} title="Descargar mis datos">
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">
            Prepararemos un archivo con toda tu información personal, incluyendo:
          </p>
          <div className="p-4 bg-surface-muted rounded-xl space-y-2">
            {[
              'Información de perfil',
              'Historial de pagos',
              'Documentos subidos',
              'Historial de postulaciones'
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-fg">
                <div className="w-5 h-5 rounded-full bg-success-soft flex items-center justify-center">
                  <Check className="w-3 h-3 text-success" />
                </div>
                {item}
              </div>
            ))}
          </div>
          <p className="text-xs text-fg-muted">
            El archivo se enviará a tu correo electrónico registrado en las próximas 24 horas.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              hideArrow
              onClick={() => setShowDownloadModal(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="secondary"
              hideArrow
              isLoading={isLoading}
              onClick={handleDownloadData}
              disabled={isLoading}
              className="flex-1 bg-primary text-primary-fg hover:bg-primary-hover"
            >
              {!isLoading && <Download className="w-4 h-4" />}
              {isLoading ? 'Procesando...' : 'Solicitar datos'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title={deletionCopy.modalTitle}>
        <div className="space-y-4">
          <div className="p-4 bg-danger-soft border border-danger/30 rounded-xl flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-danger-soft flex items-center justify-center flex-shrink-0">
              <Warning className="w-5 h-5 text-danger" />
            </div>
            <div>
              <p className="text-sm font-medium text-danger">{deletionCopy.warningTitle}</p>
              <p className="text-xs text-danger mt-1">
                {deletionCopy.warningBody}
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-fg mb-2">
              {deletionCopy.confirmShortPrefix} <span className="font-bold text-danger">{deletionCopy.confirmWord}</span> {deletionCopy.confirmShortSuffix}
            </label>
            <Input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full h-12 rounded-xl bg-surface focus-visible:border-danger/30 focus-visible:ring-danger/20"
              placeholder={deletionCopy.inputPlaceholder}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              hideArrow
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmText('');
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              hideArrow
              isLoading={isLoading}
              onClick={handleDeleteAccount}
              disabled={isLoading || deleteConfirmText !== deletionCopy.confirmWord}
              className="flex-1"
            >
              {!isLoading && <TrashSimple className="w-4 h-4" />}
              {isLoading ? deletionCopy.deleting : deletionCopy.deleteButton}
            </Button>
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
    <div className="flex items-center justify-between px-6 py-4 hover:bg-surface/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center">
          <Icon className="w-5 h-5 text-fg-muted" />
        </div>
        <div>
          <p className="text-sm font-medium text-fg">{title}</p>
          <p className="text-xs text-fg-muted">{description}</p>
        </div>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        aria-label={title}
        className={accent === 'emerald' ? 'data-[state=checked]:bg-success' : undefined}
      />
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
      className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface/50 transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center">
          <Icon className="w-5 h-5 text-fg-muted" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-fg">{title}</p>
          <p className="text-xs text-fg-muted">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="px-2 py-1 bg-primary-soft text-primary text-xs font-medium rounded-full">
            {badge}
          </span>
        )}
        <CaretRight className="w-5 h-5 text-fg-subtle group-hover:text-fg-muted transition-colors" />
      </div>
    </button>
  );
}
