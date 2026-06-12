'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Compass,
} from '@phosphor-icons/react';
import { usePanelPrefs } from '@/lib/context/PanelPrefsContext';
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
import { AgencyPricingModal } from '@/components/inmobiliaria/AgencyPricingModal';
import { Lightning } from '@phosphor-icons/react';
import {
  useInmobiliariaConfig,
  useAgencyUsers,
  useAgencyIntegrations,
  useAgencyBilling,
  inmobiliariaConfigApi,
} from '@/lib/hooks/useInmobiliaria';
import { permissionsApi, agencyApi } from '@/lib/api/inmobiliaria.service';
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/types/inmobiliaria';
import { useNotificationSettings } from '@/lib/hooks/useSettings';
import { MfaSetupSection } from '@/components/settings/MfaSetupSection';
import type {
  InmobiliariaConfigExtended,
  AgencyBranding,
  AgencyUser,
  AgencyIntegration,
  RolePermissions,
  AgencyRole,
  UserInvite,
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
function ConfiguracionContent() {
  // API Hooks
  const { config, isLoading: configLoading, refetch: refetchConfig } = useInmobiliariaConfig();
  const { users, isLoading: usersLoading, refetch: refetchUsers } = useAgencyUsers();
  const { integrations, isLoading: integrationsLoading, refetch: refetchIntegrations } = useAgencyIntegrations();
  const { billing, invoices, isLoading: billingLoading } = useAgencyBilling();

  // Initial tab from `?tab=X` query param (e.g. from PlanHeader "Gestionar suscripción")
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as ConfigTab) || 'perfil';

  // State
  const [activeTab, setActiveTab] = useState<ConfigTab>(initialTab);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [permissions, setPermissions] = useState<Record<AgencyRole, RolePermissions>>(
    DEFAULT_ROLE_PERMISSIONS
  );

  // Phase 38 plan 38-06 — AI panel tour preference (hybrid localStorage + DB persistence).
  // tourDismissed === null means the context hasn't hydrated yet; show a spinner-state.
  const { tourDismissed, setTourDismissed, relaunchTour } = usePanelPrefs();
  const [isTogglingTour, setIsTogglingTour] = useState(false);

  // Real notification settings from backend
  const { settings: notifSettings, isLoading: notifLoading, updateSetting } = useNotificationSettings();

  // Map inmobiliaria UI keys to backend NotificationSettings keys
  const notifKeyMap: Record<string, 'emailApplications' | 'emailPayments' | 'emailContracts' | 'pushAll' | 'emailMarketing'> = {
    emailNewLead: 'emailApplications',
    emailPaymentReceived: 'emailPayments',
    emailContractReminder: 'emailContracts',
    pushNewMessage: 'pushAll',
    marketingEmails: 'emailMarketing',
  };

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

  useEffect(() => { setMounted(true); }, []);

  // Hydrate permissions matrix from backend per-member data.
  //
  // Context: the backend stores permissions per MEMBER (not per role). The UI
  // shows a role-level matrix (admin/agente/contador/viewer) as a template.
  // We reconstruct each role's current template by looking at the first active
  // member of that role. If `usingDefaults` is true, we keep the hardcoded
  // default for that role. If false, we use the member's effective permissions.
  useEffect(() => {
    if (!users || users.length === 0) return;

    const nonAdminRoles: AgencyRole[] = ['agente', 'contador', 'viewer'];
    let cancelled = false;

    (async () => {
      try {
        const updates: Partial<Record<AgencyRole, RolePermissions>> = {};
        await Promise.all(
          nonAdminRoles.map(async (role) => {
            const member = users.find((u) => u.role === role && u.status === 'active');
            if (!member) return;
            try {
              const res = await permissionsApi.getMemberPermissions(member.id);
              if (res.usingDefaults || res.effectivePermissions === 'FULL_ACCESS') return;
              // Convert Record<string, string[]> → RolePermissions
              const permissionsArray = Object.entries(res.effectivePermissions).map(
                ([module, actions]) => ({ module, actions }),
              );
              updates[role] = { role, permissions: permissionsArray } as RolePermissions;
            } catch {
              // Skip role on error — keep default
            }
          }),
        );
        if (!cancelled && Object.keys(updates).length > 0) {
          setPermissions((prev) => ({ ...prev, ...updates }));
        }
      } catch {
        // Silent fail — defaults remain
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [users]);

  // -------------------------------------------------------------------------
  // Handlers - Perfil
  // -------------------------------------------------------------------------

  const handleSaveConfig = async (newConfig: InmobiliariaConfigExtended) => {
    try {
      await inmobiliariaConfigApi.update(newConfig);
      await refetchConfig();
      toast.success(t('inmobiliaria.config.toasts.configSaved'), {
        description: t('inmobiliaria.config.toasts.configSavedDesc'),
      });
    } catch (error) {
      toast.error('Error al guardar configuración');
    }
  };

  // -------------------------------------------------------------------------
  // Handlers - Branding
  // -------------------------------------------------------------------------

  const handleSaveBranding = async (branding: AgencyBranding) => {
    try {
      await inmobiliariaConfigApi.updateBranding(branding);
      await refetchConfig();
      toast.success(t('inmobiliaria.config.toasts.brandingSaved'), {
        description: t('inmobiliaria.config.toasts.brandingSavedDesc'),
      });
    } catch (error) {
      toast.error('Error al guardar branding');
    }
  };

  // -------------------------------------------------------------------------
  // Handlers - Usuarios
  // -------------------------------------------------------------------------

  const handleInviteUser = async (invite: UserInvite) => {
    try {
      await inmobiliariaConfigApi.inviteUser(invite);
      await refetchUsers();
      toast.success(t('inmobiliaria.config.toasts.inviteSent'), {
        description: t('inmobiliaria.config.toasts.inviteSentDesc'),
      });
    } catch (error) {
      toast.error('Error al invitar usuario', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleUpdateRole = async (userId: string, role: AgencyRole) => {
    try {
      await inmobiliariaConfigApi.updateUser(userId, { role });
      await refetchUsers();
      toast.success(t('inmobiliaria.config.toasts.roleUpdated'));
    } catch (error) {
      toast.error('Error al actualizar rol');
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      const user = users.find((u) => u.id === userId);
      if (!user) return;
      const newStatus: AgencyUser['status'] = user.status === 'active' ? 'inactive' : 'active';
      await inmobiliariaConfigApi.updateUser(userId, { status: newStatus });
      await refetchUsers();
      toast.success(t('inmobiliaria.config.toasts.userStatusUpdated'));
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleResendInvite = async (userId: string) => {
    try {
      const user = users.find((u) => u.id === userId);
      await agencyApi.resendInvitation(userId);
      toast.success(t('inmobiliaria.config.toasts.inviteResent'), {
        description: user ? t('inmobiliaria.config.toasts.inviteResentDesc', { email: user.email }) : t('inmobiliaria.config.toasts.inviteSent'),
      });
    } catch (error) {
      toast.error('Error al reenviar invitación', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await inmobiliariaConfigApi.deleteUser(userId);
      await refetchUsers();
      toast.success(t('inmobiliaria.config.toasts.userDeleted'));
    } catch (error) {
      toast.error('Error al eliminar usuario');
    }
  };

  // -------------------------------------------------------------------------
  // Handlers - Permisos
  // -------------------------------------------------------------------------

  const handleSavePermissions = async (newPermissions: Record<AgencyRole, RolePermissions>) => {
    try {
      // Update each non-admin member's custom permissions based on their role
      const memberList = users ?? [];
      const updatePromises = memberList
        .filter((u) => u.role !== 'admin' && u.status === 'active')
        .map((member) => {
          const roleKey = member.role.toLowerCase() as AgencyRole;
          const rolePerms = newPermissions[roleKey];
          if (!rolePerms) return Promise.resolve();
          // Convert RolePermissions to the flat Record<string, string[]> the API expects
          const permMap: Record<string, string[]> = {};
          for (const mp of rolePerms.permissions) {
            permMap[mp.module] = mp.actions;
          }
          return permissionsApi.updateMemberPermissions(member.id, permMap);
        });

      await Promise.all(updatePromises);
      setPermissions(newPermissions);
      toast.success(t('inmobiliaria.config.toasts.permissionsSaved'), {
        description: t('inmobiliaria.config.toasts.permissionsSavedDesc'),
      });
    } catch {
      toast.error(t('inmobiliaria.config.toasts.error') || 'Error al guardar permisos');
    }
  };

  // -------------------------------------------------------------------------
  // Handlers - Integraciones
  // -------------------------------------------------------------------------

  const handleToggleIntegration = async (integrationId: string, enabled: boolean) => {
    try {
      await inmobiliariaConfigApi.toggleIntegration(integrationId, enabled);
      await refetchIntegrations();
      toast.success(enabled ? t('inmobiliaria.config.toasts.integrationEnabled') : t('inmobiliaria.config.toasts.integrationDisabled'));
    } catch (error) {
      toast.error('Error al actualizar integración');
    }
  };

  /**
   * Handler to save integration-specific config (API keys, webhooks, etc.).
   *
   * ⚠️ INACTIVE — las integraciones están deshabilitadas en la UI (ver
   * INTEGRATIONS_DISABLED en `ConfigIntegraciones.tsx`). Este handler queda
   * acá como scaffolding: cuando el backend implemente
   * `PATCH /inmobiliaria/agency/integrations/:id/config` con el body de
   * credenciales, descomentar la llamada y poner `INTEGRATIONS_DISABLED = false`
   * en el componente.
   *
   * Contexto: en MVP v1.3 las integraciones (Metrocuadrado, FincaRaiz, Siigo,
   * etc.) son placeholders — existen como catálogo visual pero no hay cliente
   * real detrás. El toggle on/off YA usa `PATCH /inmobiliaria/agency/integrations/:id`
   * pero esto es cosmético hasta que haya integraciones de verdad.
   */
  const handleConfigureIntegration = async (integrationId: string, config: Record<string, string>) => {
    try {
      const integration = integrations.find((i) => i.id === integrationId);
      // TODO(v1.4+): await inmobiliariaConfigApi.configureIntegration(integrationId, config);
      await refetchIntegrations();
      toast.info(t('inmobiliaria.config.toasts.configureIntegration'), {
        description: t('inmobiliaria.config.toasts.configureIntegrationDesc', { name: integration?.name || integrationId }),
      });
    } catch (error) {
      toast.error('Error al configurar integración');
    }
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

  // Show loading state for main data
  const isLoading = configLoading || usersLoading || integrationsLoading || billingLoading;

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
          configLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : config ? (
            <ConfigPerfilAgencia config={config} onSave={handleSaveConfig} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">No hay configuración disponible</div>
          )
        )}

        {/* Branding Tab */}
        {activeTab === 'branding' && (
          configLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : config?.branding ? (
            <ConfigBranding branding={config.branding} onSave={handleSaveBranding} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">No hay información de branding</div>
          )
        )}

        {/* Usuarios Tab */}
        {activeTab === 'usuarios' && (
          usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : (
            <ConfigUsuarios
              users={users}
              onInvite={handleInviteUser}
              onUpdateRole={handleUpdateRole}
              onToggleStatus={handleToggleStatus}
              onResendInvite={handleResendInvite}
              onDelete={handleDeleteUser}
            />
          )
        )}

        {/* Permisos Tab */}
        {activeTab === 'permisos' && (
          <ConfigPermisos permissions={permissions} onSave={handleSavePermissions} />
        )}

        {/* Integraciones Tab */}
        {activeTab === 'integraciones' && (
          integrationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : (
            <ConfigIntegraciones
              integrations={integrations}
              onToggle={handleToggleIntegration}
              onConfigure={handleConfigureIntegration}
            />
          )
        )}

        {/* Facturacion Tab */}
        {activeTab === 'facturacion' && (
          billingLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : billing ? (
            <ConfigFacturacion
              billing={billing}
              invoices={invoices}
              onUpdatePaymentMethod={handleUpdatePaymentMethod}
            />
          ) : (
            // Empty state — agency has no active billing/subscription yet.
            // Show a clear CTA to view available plans instead of a dead-end message.
            <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#141416] p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Lightning className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                Todavía no tenés un plan activo
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 max-w-md mx-auto">
                Elegí el plan que mejor se adapte a tu agencia y desbloqueá todas las funcionalidades de Leasify.
              </p>
              <button
                onClick={() => setIsPricingModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
              >
                <Lightning className="w-4 h-4" />
                Ver planes disponibles
              </button>
            </div>
          )
        )}

        {/* Pricing modal — shown from upgrade CTAs */}
        <AgencyPricingModal
          open={isPricingModalOpen}
          onClose={() => setIsPricingModalOpen(false)}
        />

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
                    onClick={async () => {
                      const backendKey = notifKeyMap[item.key];
                      if (!backendKey) return;
                      try {
                        await updateSetting(backendKey, !notifSettings[backendKey]);
                        toast.success(!notifSettings[backendKey] ? t('inmobiliaria.config.notifications.enabled') : t('inmobiliaria.config.notifications.disabled'));
                      } catch {
                        toast.error(locale === 'es' ? 'Error al actualizar configuración' : 'Error updating settings');
                      }
                    }}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors',
                      notifSettings[notifKeyMap[item.key]] ? 'bg-indigo-600' : 'bg-neutral-300 dark:bg-neutral-600'
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                      notifSettings[notifKeyMap[item.key]] && 'translate-x-5'
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
              {/* AI panel tour toggle — Phase 38 plan 38-06 */}
              <div className="flex items-center justify-between px-6 py-4 hover:bg-white/50 dark:hover:bg-[#1f1f21]/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                    <Compass className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{t('inmobiliaria.config.preferences.panelTour')}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.config.preferences.panelTourDesc')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={tourDismissed === false}
                  aria-busy={isTogglingTour || tourDismissed === null}
                  aria-label={t('inmobiliaria.config.preferences.panelTour')}
                  disabled={isTogglingTour || tourDismissed === null}
                  onClick={async () => {
                    if (tourDismissed === null) return;
                    setIsTogglingTour(true);
                    try {
                      // Switch is "ON" when tour is enabled (dismissed=false).
                      // Toggling flips dismissed; toast reflects the NEW state.
                      const nextDismissed = !tourDismissed;
                      await setTourDismissed(nextDismissed);
                      toast.success(
                        nextDismissed
                          ? t('inmobiliaria.config.preferences.panelTourDismissed')
                          : t('inmobiliaria.config.preferences.panelTourEnabled')
                      );
                    } finally {
                      setIsTogglingTour(false);
                    }
                  }}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                    tourDismissed === false ? 'bg-indigo-600' : 'bg-neutral-300 dark:bg-neutral-600'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                      tourDismissed === false && 'translate-x-5'
                    )}
                  />
                </button>
              </div>
              {/* Relaunch tour button — session-only, does not persist */}
              <div className="flex items-center justify-between px-6 py-4 hover:bg-white/50 dark:hover:bg-[#1f1f21]/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center shadow-sm">
                    <Compass className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{t('inmobiliaria.config.preferences.relaunchTour')}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.config.preferences.relaunchTourDesc')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    relaunchTour();
                    toast.success(t('inmobiliaria.config.preferences.relaunchTourStarted'));
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-white dark:bg-[#1f1f21] border border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  {t('inmobiliaria.config.preferences.relaunchTour')}
                </button>
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
              <MfaSetupSection />
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

export default function ConfiguracionPage() {
  return (
    <PageGuard adminOnly>
      <ConfiguracionContent />
    </PageGuard>
  );
}
