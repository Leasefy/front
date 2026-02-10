'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Gear,
  Buildings,
  Palette,
  Users,
  ShieldCheck,
  Plugs,
  CreditCard,
  Bell,
  Globe,
  Moon,
  Envelope,
  FileText,
  Tag,
  Lock,
  Monitor,
  Shield,
  CaretRight,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';
import {
  ConfigPerfilAgencia,
  ConfigBranding,
  ConfigUsuarios,
  ConfigPermisos,
  ConfigIntegraciones,
  ConfigFacturacion,
} from '@/components/inmobiliaria';
import {
  MOCK_INMOBILIARIA_CONFIG_EXTENDED,
  MOCK_AGENCY_USERS,
  MOCK_INTEGRATIONS,
  MOCK_BILLING,
  MOCK_INVOICES,
} from '@/lib/data/mock-inmobiliaria';
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/types/inmobiliaria';
import type {
  InmobiliariaConfigExtended,
  AgencyBranding,
  AgencyUser,
  AgencyIntegration,
  RolePermissions,
  AgencyRole,
} from '@/lib/types/inmobiliaria';

// ============================================================================
// Types
// ============================================================================

type ConfigTab = 'perfil' | 'branding' | 'usuarios' | 'permisos' | 'integraciones' | 'facturacion' | 'notificaciones' | 'preferencias' | 'seguridad';

interface TabConfig {
  id: ConfigTab;
  label: string;
  icon: React.ElementType;
  description: string;
}

// ============================================================================
// Constants (tab icon mapping - labels/descriptions use i18n inside component)
// ============================================================================

const TAB_ICONS: Record<ConfigTab, React.ElementType> = {
  perfil: Buildings,
  branding: Palette,
  usuarios: Users,
  permisos: ShieldCheck,
  integraciones: Plugs,
  facturacion: CreditCard,
  notificaciones: Bell,
  preferencias: Globe,
  seguridad: Shield,
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * ConfiguracionPage - Agency configuration hub
 * Route: /panel/inmobiliaria/configuracion
 */
export default function ConfiguracionPage() {
  // State
  const [activeTab, setActiveTab] = useState<ConfigTab>('perfil');
  const [config, setConfig] = useState<InmobiliariaConfigExtended>(MOCK_INMOBILIARIA_CONFIG_EXTENDED);
  const [users, setUsers] = useState<AgencyUser[]>(MOCK_AGENCY_USERS);
  const [integrations, setIntegrations] = useState<AgencyIntegration[]>(MOCK_INTEGRATIONS);
  const [permissions, setPermissions] = useState<Record<AgencyRole, RolePermissions>>(
    DEFAULT_ROLE_PERMISSIONS
  );

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNewLead: true,
    emailPaymentReceived: true,
    emailContractReminder: true,
    pushNewMessage: true,
    marketingEmails: false,
  });

  // Theme & i18n
  const { resolvedTheme, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();

  // Tabs with i18n labels
  const tabs: TabConfig[] = useMemo(() => [
    { id: 'perfil', label: t('inmobiliaria.config.tabs.perfil'), icon: TAB_ICONS.perfil, description: t('inmobiliaria.config.tabs.perfilDesc') },
    { id: 'branding', label: t('inmobiliaria.config.tabs.branding'), icon: TAB_ICONS.branding, description: t('inmobiliaria.config.tabs.brandingDesc') },
    { id: 'usuarios', label: t('inmobiliaria.config.tabs.usuarios'), icon: TAB_ICONS.usuarios, description: t('inmobiliaria.config.tabs.usuariosDesc') },
    { id: 'permisos', label: t('inmobiliaria.config.tabs.permisos'), icon: TAB_ICONS.permisos, description: t('inmobiliaria.config.tabs.permisosDesc') },
    { id: 'integraciones', label: t('inmobiliaria.config.tabs.integraciones'), icon: TAB_ICONS.integraciones, description: t('inmobiliaria.config.tabs.integracionesDesc') },
    { id: 'facturacion', label: t('inmobiliaria.config.tabs.facturacion'), icon: TAB_ICONS.facturacion, description: t('inmobiliaria.config.tabs.facturacionDesc') },
    { id: 'notificaciones', label: t('inmobiliaria.config.tabs.notificaciones'), icon: TAB_ICONS.notificaciones, description: t('inmobiliaria.config.tabs.notificacionesDesc') },
    { id: 'preferencias', label: t('inmobiliaria.config.tabs.preferencias'), icon: TAB_ICONS.preferencias, description: t('inmobiliaria.config.tabs.preferenciasDesc') },
    { id: 'seguridad', label: t('inmobiliaria.config.tabs.seguridad'), icon: TAB_ICONS.seguridad, description: t('inmobiliaria.config.tabs.seguridadDesc') },
  ], [t]);

  const [mounted, setMounted] = useState(false);

  // Security
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // -------------------------------------------------------------------------
  // Handlers - Perfil
  // -------------------------------------------------------------------------

  const handleSaveConfig = (newConfig: InmobiliariaConfigExtended) => {
    setConfig(newConfig);
    toast.success(t('inmobiliaria.config.toasts.configSaved'), {
      description: t('inmobiliaria.config.toasts.configSavedDesc'),
    });
  };

  // -------------------------------------------------------------------------
  // Handlers - Branding
  // -------------------------------------------------------------------------

  const handleSaveBranding = (branding: AgencyBranding) => {
    setConfig((prev) => ({ ...prev, branding }));
    toast.success(t('inmobiliaria.config.toasts.brandingSaved'), {
      description: t('inmobiliaria.config.toasts.brandingSavedDesc'),
    });
  };

  // -------------------------------------------------------------------------
  // Handlers - Usuarios
  // -------------------------------------------------------------------------

  const handleInviteUser = () => {
    toast.info(t('inmobiliaria.config.toasts.inviteSent'), {
      description: t('inmobiliaria.config.toasts.inviteSentDesc'),
    });
  };

  const handleUpdateRole = (userId: string, role: AgencyRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role } : u))
    );
    toast.success(t('inmobiliaria.config.toasts.roleUpdated'));
  };

  const handleToggleStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const newStatus: AgencyUser['status'] = u.status === 'active' ? 'inactive' : 'active';
        return { ...u, status: newStatus };
      })
    );
    toast.success(t('inmobiliaria.config.toasts.userStatusUpdated'));
  };

  const handleResendInvite = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    toast.success(t('inmobiliaria.config.toasts.inviteResent'), {
      description: user ? t('inmobiliaria.config.toasts.inviteResentDesc', { email: user.email }) : t('inmobiliaria.config.toasts.inviteSent'),
    });
  };

  const handleDeleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    toast.success(t('inmobiliaria.config.toasts.userDeleted'));
  };

  // -------------------------------------------------------------------------
  // Handlers - Permisos
  // -------------------------------------------------------------------------

  const handleSavePermissions = (newPermissions: Record<AgencyRole, RolePermissions>) => {
    setPermissions(newPermissions);
    toast.success(t('inmobiliaria.config.toasts.permissionsSaved'), {
      description: t('inmobiliaria.config.toasts.permissionsSavedDesc'),
    });
  };

  // -------------------------------------------------------------------------
  // Handlers - Integraciones
  // -------------------------------------------------------------------------

  const handleToggleIntegration = (integrationId: string, enabled: boolean) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === integrationId ? { ...i, isEnabled: enabled } : i))
    );
    toast.success(enabled ? t('inmobiliaria.config.toasts.integrationEnabled') : t('inmobiliaria.config.toasts.integrationDisabled'));
  };

  const handleConfigureIntegration = (integrationId: string, config: Record<string, string>) => {
    const integration = integrations.find((i) => i.id === integrationId);
    toast.info(t('inmobiliaria.config.toasts.configureIntegration'), {
      description: t('inmobiliaria.config.toasts.configureIntegrationDesc', { name: integration?.name || integrationId }),
    });
  };

  // -------------------------------------------------------------------------
  // Handlers - Facturacion
  // -------------------------------------------------------------------------

  const handleUpdatePaymentMethod = () => {
    toast.info(t('inmobiliaria.config.toasts.updatePaymentMethod'), {
      description: t('inmobiliaria.config.toasts.updatePaymentMethodDesc'),
    });
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <Gear className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          {t('inmobiliaria.config.title')}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t('inmobiliaria.config.subtitle')}
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive && 'text-indigo-600 dark:text-indigo-400')} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content with Animation */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="min-h-[400px]"
      >
        {/* Perfil Tab */}
        {activeTab === 'perfil' && (
          <ConfigPerfilAgencia config={config} onSave={handleSaveConfig} />
        )}

        {/* Branding Tab */}
        {activeTab === 'branding' && (
          <ConfigBranding branding={config.branding} onSave={handleSaveBranding} />
        )}

        {/* Usuarios Tab */}
        {activeTab === 'usuarios' && (
          <ConfigUsuarios
            users={users}
            onInvite={handleInviteUser}
            onUpdateRole={handleUpdateRole}
            onToggleStatus={handleToggleStatus}
            onResendInvite={handleResendInvite}
            onDelete={handleDeleteUser}
          />
        )}

        {/* Permisos Tab */}
        {activeTab === 'permisos' && (
          <ConfigPermisos permissions={permissions} onSave={handleSavePermissions} />
        )}

        {/* Integraciones Tab */}
        {activeTab === 'integraciones' && (
          <ConfigIntegraciones
            integrations={integrations}
            onToggle={handleToggleIntegration}
            onConfigure={handleConfigureIntegration}
          />
        )}

        {/* Facturacion Tab */}
        {activeTab === 'facturacion' && (
          <ConfigFacturacion
            billing={MOCK_BILLING}
            invoices={MOCK_INVOICES}
            onUpdatePaymentMethod={handleUpdatePaymentMethod}
          />
        )}

        {/* Notificaciones Tab */}
        {activeTab === 'notificaciones' && (
          <div className="rounded-xl bg-stone-50 dark:bg-[#141416] overflow-hidden">
            <div className="px-6 py-5 border-b border-neutral-200/50 dark:border-[#2a2a2c]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                  <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-neutral-900 dark:text-white">{t('inmobiliaria.config.notifications.title')}</h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.config.notifications.subtitle')}</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-neutral-200/50 dark:divide-neutral-700/50">
              {([
                { key: 'emailNewLead' as const, icon: Envelope, title: t('inmobiliaria.config.notifications.newLeads'), desc: t('inmobiliaria.config.notifications.newLeadsDesc') },
                { key: 'emailPaymentReceived' as const, icon: CreditCard, title: t('inmobiliaria.config.notifications.paymentsReceived'), desc: t('inmobiliaria.config.notifications.paymentsReceivedDesc') },
                { key: 'emailContractReminder' as const, icon: FileText, title: t('inmobiliaria.config.notifications.contractExpiry'), desc: t('inmobiliaria.config.notifications.contractExpiryDesc') },
                { key: 'pushNewMessage' as const, icon: Bell, title: t('inmobiliaria.config.notifications.newMessages'), desc: t('inmobiliaria.config.notifications.newMessagesDesc') },
                { key: 'marketingEmails' as const, icon: Tag, title: t('inmobiliaria.config.notifications.promotionalEmails'), desc: t('inmobiliaria.config.notifications.promotionalEmailsDesc') },
              ]).map((item) => (
                <div key={item.key} className="flex items-center justify-between px-6 py-4 hover:bg-white/50 dark:hover:bg-[#1f1f21]/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                      <item.icon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">{item.title}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key] }));
                      toast.success(!notifications[item.key] ? t('inmobiliaria.config.notifications.enabled') : t('inmobiliaria.config.notifications.disabled'));
                    }}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors',
                      notifications[item.key] ? 'bg-indigo-600' : 'bg-neutral-300 dark:bg-neutral-600'
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                      notifications[item.key] && 'translate-x-5'
                    )} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preferencias Tab */}
        {activeTab === 'preferencias' && (
          <div className="rounded-xl bg-stone-50 dark:bg-[#141416] overflow-hidden">
            <div className="px-6 py-5 border-b border-neutral-200/50 dark:border-[#2a2a2c]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                  <Globe className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-neutral-900 dark:text-white">{t('inmobiliaria.config.preferences.title')}</h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.config.preferences.subtitle')}</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-neutral-200/50 dark:divide-neutral-700/50">
              {/* Dark mode toggle */}
              <div className="flex items-center justify-between px-6 py-4 hover:bg-white/50 dark:hover:bg-[#1f1f21]/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                    <Moon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{t('inmobiliaria.config.preferences.darkMode')}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.config.preferences.darkModeDesc')}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
                    toast.success(resolvedTheme === 'dark' ? t('inmobiliaria.config.preferences.lightThemeEnabled') : t('inmobiliaria.config.preferences.darkThemeEnabled'));
                  }}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors',
                    mounted && resolvedTheme === 'dark' ? 'bg-indigo-600' : 'bg-neutral-300 dark:bg-neutral-600'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                    mounted && resolvedTheme === 'dark' && 'translate-x-5'
                  )} />
                </button>
              </div>
              {/* Language selector */}
              <div className="flex items-center justify-between px-6 py-4 hover:bg-white/50 dark:hover:bg-[#1f1f21]/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                    <Globe className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{t('inmobiliaria.config.preferences.language')}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.config.preferences.languageDesc')}</p>
                  </div>
                </div>
                <div className="relative">
                  <select
                    value={locale}
                    onChange={(e) => {
                      setLocale(e.target.value as Locale);
                      toast.success(e.target.value === 'en' ? t('inmobiliaria.config.preferences.langChangedEn') : t('inmobiliaria.config.preferences.langChangedEs'));
                    }}
                    className="appearance-none pl-4 pr-10 py-2.5 text-sm border border-neutral-200 dark:border-neutral-600 rounded-xl bg-white dark:bg-[#1f1f21] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                  <CaretRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 rotate-90 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Seguridad Tab */}
        {activeTab === 'seguridad' && (
          <div className="rounded-xl bg-stone-50 dark:bg-[#141416] overflow-hidden">
            <div className="px-6 py-5 border-b border-neutral-200/50 dark:border-[#2a2a2c]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                  <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-neutral-900 dark:text-white">{t('inmobiliaria.config.security.title')}</h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.config.security.subtitle')}</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-neutral-200/50 dark:divide-neutral-700/50">
              {/* 2FA toggle */}
              <div className="flex items-center justify-between px-6 py-4 hover:bg-white/50 dark:hover:bg-[#1f1f21]/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                    <ShieldCheck className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{t('inmobiliaria.config.security.twoFactor')}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {twoFactorAuth ? t('inmobiliaria.config.security.twoFactorProtected') : t('inmobiliaria.config.security.twoFactorAdd')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setTwoFactorAuth(!twoFactorAuth);
                    toast.success(!twoFactorAuth ? t('inmobiliaria.config.security.twoFactorEnabled') : t('inmobiliaria.config.security.twoFactorDisabled'));
                  }}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors',
                    twoFactorAuth ? 'bg-emerald-600' : 'bg-neutral-300 dark:bg-neutral-600'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                    twoFactorAuth && 'translate-x-5'
                  )} />
                </button>
              </div>
              {/* Change password */}
              <button
                onClick={() => toast.info(t('inmobiliaria.config.security.changePassword'), { description: t('inmobiliaria.config.security.changePasswordToast') })}
                className="flex items-center justify-between w-full px-6 py-4 hover:bg-white/50 dark:hover:bg-[#1f1f21]/50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                    <Lock className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{t('inmobiliaria.config.security.changePassword')}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.config.security.changePasswordDesc')}</p>
                  </div>
                </div>
                <CaretRight className="w-4 h-4 text-neutral-400" />
              </button>
              {/* Active sessions */}
              <button
                onClick={() => toast.info(t('inmobiliaria.config.security.activeSessions'), { description: t('inmobiliaria.config.security.activeSessionsDesc') })}
                className="flex items-center justify-between w-full px-6 py-4 hover:bg-white/50 dark:hover:bg-[#1f1f21]/50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                    <Monitor className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{t('inmobiliaria.config.security.activeSessions')}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.config.security.activeSessionsDesc')}</p>
                  </div>
                </div>
                <CaretRight className="w-4 h-4 text-neutral-400" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
