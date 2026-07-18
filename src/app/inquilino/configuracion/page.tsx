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

// Mock active sessions
const mockSessions = [
  { id: '1', device: 'Chrome en Windows', location: 'Bogotá, Colombia', current: true, lastActive: 'Ahora' },
  { id: '2', device: 'Safari en iPhone', location: 'Bogotá, Colombia', current: false, lastActive: 'Hace 2 horas' },
  { id: '3', device: 'Firefox en MacOS', location: 'Medellín, Colombia', current: false, lastActive: 'Hace 1 día' },
];

export default function ConfiguracionPage() {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const [mounted, setMounted] = useState(false);

  // Ensure we only access theme on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Gear state
  const [settings, setGear] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    paymentReminders: true,
    marketingEmails: false,
  });

  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState(mockSessions);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleToggle = (key: keyof typeof settings) => {
    setGear(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success(t('common.success'));
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
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    setShowPasswordModal(false);
    setPasswordForm({ current: '', new: '', confirm: '' });
    toast.success('Contraseña actualizada correctamente');
  };

  const handleCloseSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    toast.success('Sesión cerrada correctamente');
  };

  const handleDownloadData = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    setShowDownloadModal(false);
    toast.success('Se te enviará un correo con tus datos en las próximas 24 horas');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'ELIMINAR') {
      toast.error('Escribe ELIMINAR para confirmar');
      return;
    }
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    toast.success('Cuenta eliminada. Serás redirigido...');
    setTimeout(() => router.push('/'), 2000);
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
              <SettingToggle
                icon={DeviceMobile}
                title={t('settings.notifications.sms')}
                description={locale === 'es' ? 'Mensajes de texto para alertas importantes' : 'Text messages for important alerts'}
                enabled={settings.smsNotifications}
                onToggle={() => handleToggle('smsNotifications')}
              />
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
                  description={locale === 'es' ? `${sessions.length} dispositivos` : `${sessions.length} devices`}
                  onClick={() => setShowSessionsModal(true)}
                  badge={sessions.length > 1 ? `${sessions.length}` : undefined}
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
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-4 border border-border rounded-xl bg-surface">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-fg-muted" />
                </div>
                <div>
                  <p className="text-sm font-medium text-fg">{session.device}</p>
                  <p className="text-xs text-fg-muted">{session.location} · {session.lastActive}</p>
                </div>
              </div>
              {session.current ? (
                <span className="px-3 py-1.5 bg-success-soft text-success text-xs font-medium rounded-full">Actual</span>
              ) : (
                <Button
                  variant="link"
                  size="sm"
                  hideArrow
                  onClick={() => handleCloseSession(session.id)}
                  className="px-0 text-xs text-danger"
                >
                  Cerrar
                </Button>
              )}
            </div>
          ))}
          {sessions.length > 1 && (
            <Button
              variant="outline"
              hideArrow
              onClick={() => {
                setSessions(prev => prev.filter(s => s.current));
                toast.success('Todas las otras sesiones han sido cerradas');
              }}
              className="w-full border-2 border-danger/30 text-danger hover:bg-danger-soft hover:text-danger"
            >
              Cerrar todas las otras sesiones
            </Button>
          )}
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
              'Historial de aplicaciones'
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
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Eliminar cuenta">
        <div className="space-y-4">
          <div className="p-4 bg-danger-soft border border-danger/30 rounded-xl flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-danger-soft flex items-center justify-center flex-shrink-0">
              <Warning className="w-5 h-5 text-danger" />
            </div>
            <div>
              <p className="text-sm font-medium text-danger">Esta acción no se puede deshacer</p>
              <p className="text-xs text-danger mt-1">
                Todos tus datos, historial de pagos, documentos y configuraciones serán eliminados permanentemente.
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-fg mb-2">
              Escribe <span className="font-bold text-danger">ELIMINAR</span> para confirmar
            </label>
            <Input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full h-12 rounded-xl bg-surface focus-visible:border-danger/30 focus-visible:ring-danger/20"
              placeholder="ELIMINAR"
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
              disabled={isLoading || deleteConfirmText !== 'ELIMINAR'}
              className="flex-1"
            >
              {!isLoading && <TrashSimple className="w-4 h-4" />}
              {isLoading ? 'Eliminando...' : 'Eliminar cuenta'}
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
