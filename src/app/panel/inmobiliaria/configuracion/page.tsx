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
import { resetAgentIntros } from '@/components/tour/AgentIntroModal';
import { cn } from '@/lib/utils';
import { Button, Switch, Spinner } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  useInmobiliariaConfig,
  useAgencyUsers,
  useAgencyIntegrations,
  useAgencyBilling,
  inmobiliariaConfigApi,
} from '@/lib/hooks/useInmobiliaria';
import { permissionsApi, agencyApi, rolePermissionsApi } from '@/lib/api/inmobiliaria.service';
import type { PermMap, RoleMatrices, UpdateRolePermissionsBody } from '@/lib/api/inmobiliaria.service';
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/types/inmobiliaria';
import { useNotificationSettings } from '@/lib/hooks/useSettings';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { MfaSetupSection } from '@/components/settings/MfaSetupSection';
import type {
  UpdateAgencyPayload,
  AgencyIntegration,
  RolePermissions,
  AgencyRole,
  PermissionModule,
  PermissionAction,
  UserInvite,
} from '@/lib/types/inmobiliaria';

// ============================================================================
// Role-permission matrix mapping (backend RoleMatrices ↔ UI matrix)
// ============================================================================

/**
 * UI role key ('admin'/'agente'/'contador'/'viewer') maps to the backend
 * RoleMatrices key ('ADMIN'/'AGENTE'/'CONTADOR'/'VIEWER') — the matrix helpers
 * below encode this pairing directly.
 */

/** Backend PermMap (module → actions) → UI RolePermissions (drops empty modules). */
function permMapToRolePermissions(role: AgencyRole, map: PermMap): RolePermissions {
  return {
    role,
    permissions: Object.entries(map)
      .filter(([, actions]) => actions.length > 0)
      .map(([module, actions]) => ({
        module: module as PermissionModule,
        actions: [...actions] as PermissionAction[],
      })),
  };
}

/** Backend RoleMatrices → the UI matrix ConfigPermisos consumes. */
function matricesToUiMatrix(matrices: RoleMatrices): Record<AgencyRole, RolePermissions> {
  return {
    admin: permMapToRolePermissions('admin', matrices.roles.ADMIN),
    agente: permMapToRolePermissions('agente', matrices.roles.AGENTE),
    contador: permMapToRolePermissions('contador', matrices.roles.CONTADOR),
    viewer: permMapToRolePermissions('viewer', matrices.roles.VIEWER),
  };
}

/** UI RolePermissions → backend PermMap (module → actions). */
function rolePermissionsToPermMap(rp: RolePermissions): PermMap {
  const map: PermMap = {};
  for (const p of rp.permissions) {
    map[p.module] = [...p.actions];
  }
  return map;
}

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
  const [activeTab, setTab] = useState<ConfigTab>(initialTab);
  const [permissions, setPermissions] = useState<Record<AgencyRole, RolePermissions>>(
    DEFAULT_ROLE_PERMISSIONS
  );
  // Bumped after every successful server sync (load/save/reset) — used as the
  // ConfigPermisos `key` so it remounts with the fresh matrix (and its per-role
  // counts + unsaved-changes state reset to the loaded values).
  const [permissionsVersion, setPermissionsVersion] = useState(0);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  // Current user's effective permissions (refetched after a role-template change
  // clears per-member overrides, so the caller's own access reflects the update).
  const { refetch: refetchMyPermissions } = usePermissions();

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

  // Load the agency's per-role permission matrices in ONE request.
  //
  // The backend resolves the agency from the JWT and returns a COMPLETE matrix
  // for every role (admin/agente/contador/viewer), each keyed module→actions.
  // This replaces the old per-member fan-out that reconstructed each role's
  // template from its first active member. Non-admins get 403 → defaults remain.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const matrices = await rolePermissionsApi.getRolePermissions();
        if (cancelled) return;
        setPermissions(matricesToUiMatrix(matrices));
        setPermissionsVersion((v) => v + 1);
      } catch {
        // 403 (non-admin) or network error — defaults remain.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Only agency ADMINs may write agency settings (backend enforces via 403).
  const isAgencyAdmin = config?.agency?.memberRole === 'ADMIN';

  // -------------------------------------------------------------------------
  // Handlers - Perfil
  // -------------------------------------------------------------------------

  /**
   * Saves the agency profile via PUT /inmobiliaria/agency (real backend route).
   * `payload` contains only the changed fields (backend UpdateAgencyDto).
   * Rethrows on failure so the form stays in edit mode.
   */
  const handleSaveAgency = async (payload: UpdateAgencyPayload) => {
    try {
      await agencyApi.updateAgency(payload);
      await refetchConfig();
      toast.success(t('inmobiliaria.config.toasts.configSaved'), {
        description: t('inmobiliaria.config.toasts.configSavedDesc'),
      });
    } catch (error) {
      // Surface the backend message (e.g. 403 for non-admin members).
      toast.error('Error al guardar configuración', {
        description: error instanceof Error ? error.message : undefined,
      });
      throw error;
    }
  };

  // -------------------------------------------------------------------------
  // Handlers - Branding
  // -------------------------------------------------------------------------

  /**
   * The logo upload happens inside ConfigBranding — here we refresh the
   * config so other tabs see the new logoUrl. `refetch` swallows errors into
   * hook state and resolves null on failure, so we check the result: if the
   * refetch failed, a tab switch would remount ConfigBranding from the stale
   * agency.logoUrl — warn instead of silently reverting the preview. The
   * upload itself already succeeded, so this is a warning, not an error.
   */
  const handleLogoUpdated = async () => {
    const refreshed = await refetchConfig();
    if (refreshed === null) {
      toast.warning('El logo se guardó, pero no pudimos actualizar la vista. Recarga la página.');
    }
  };

  /**
   * Brand colors are saved inside ConfigBranding (PUT /inmobiliaria/agency,
   * branding key) — here we just refresh the config so all tabs see them.
   */
  const handleBrandingUpdated = async () => {
    const refreshed = await refetchConfig();
    if (refreshed === null) {
      toast.warning('Los colores se guardaron, pero no pudimos actualizar la vista. Recarga la página.');
    }
  };

  // -------------------------------------------------------------------------
  // Handlers - Usuarios
  // -------------------------------------------------------------------------

  const handleInviteUser = async (invite: UserInvite) => {
    try {
      const result = await inmobiliariaConfigApi.inviteUser(invite);
      await refetchUsers();
      if (result.emailDelivered === false) {
        // Member row was created, but the email failed to send — partial success.
        toast.warning(t('inmobiliaria.config.toasts.inviteEmailNotDelivered'), {
          description: t('inmobiliaria.config.toasts.inviteEmailNotDeliveredDesc'),
        });
      } else {
        toast.success(t('inmobiliaria.config.toasts.inviteSent'), {
          description: t('inmobiliaria.config.toasts.inviteSentDesc'),
        });
      }
    } catch (error) {
      toast.error('Error al invitar usuario', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleUpdateRole = async (userId: string, role: AgencyRole) => {
    try {
      // Backend: PUT /inmobiliaria/agency/members/:id/role with the uppercase enum.
      await permissionsApi.updateMemberRole(userId, role.toUpperCase());
      await refetchUsers();
      toast.success(t('inmobiliaria.config.toasts.roleUpdated'));
    } catch (error) {
      toast.error('Error al actualizar rol', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      const user = users.find((u) => u.id === userId);
      if (!user) return;
      // Backend: PUT /inmobiliaria/agency/members/:id/status { active }. getMembers
      // returns lowercase statuses, so "currently active" ⟹ deactivate (active:false).
      const active = user.status !== 'active';
      await permissionsApi.updateMemberStatus(userId, active);
      await refetchUsers();
      toast.success(t('inmobiliaria.config.toasts.userStatusUpdated'));
    } catch (error) {
      toast.error('Error al actualizar estado', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleResendInvite = async (userId: string) => {
    try {
      const user = users.find((u) => u.id === userId);
      const result = await agencyApi.resendInvitation(userId);
      if (result.emailDelivered === false) {
        // Member still active, but the resend email failed to send.
        toast.warning(t('inmobiliaria.config.toasts.resendEmailNotDelivered'), {
          description: t('inmobiliaria.config.toasts.resendEmailNotDeliveredDesc'),
        });
      } else {
        toast.success(t('inmobiliaria.config.toasts.inviteResent'), {
          description: user ? t('inmobiliaria.config.toasts.inviteResentDesc', { email: user.email }) : t('inmobiliaria.config.toasts.inviteSent'),
        });
      }
    } catch (error) {
      toast.error('Error al reenviar invitación', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // Backend: DELETE /inmobiliaria/agency/members/:id (uses the member id).
      await inmobiliariaConfigApi.deleteUser(userId);
      await refetchUsers();
      toast.success(t('inmobiliaria.config.toasts.userDeleted'));
    } catch (error) {
      toast.error('Error al eliminar usuario', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  // -------------------------------------------------------------------------
  // Handlers - Permisos
  // -------------------------------------------------------------------------

  /**
   * Persist the edited role templates in ONE request via
   * PUT /inmobiliaria/agency/role-permissions. ADMIN is never sent (it is
   * full-access and read-only on the backend). The write also clears per-member
   * permission overrides for ACTIVE members of the edited roles, so we refresh
   * the caller's own effective permissions afterward.
   */
  const handleSavePermissions = async (newPermissions: Record<AgencyRole, RolePermissions>) => {
    setIsSavingPermissions(true);
    try {
      const body: UpdateRolePermissionsBody = {
        AGENTE: rolePermissionsToPermMap(newPermissions.agente),
        CONTADOR: rolePermissionsToPermMap(newPermissions.contador),
        VIEWER: rolePermissionsToPermMap(newPermissions.viewer),
      };
      const matrices = await rolePermissionsApi.updateRolePermissions(body);
      setPermissions(matricesToUiMatrix(matrices));
      setPermissionsVersion((v) => v + 1);
      await refetchMyPermissions();
      toast.success(t('inmobiliaria.config.toasts.permissionsSaved'), {
        description: t('inmobiliaria.config.toasts.permissionsSavedDesc'),
      });
    } catch (error) {
      toast.error(t('inmobiliaria.config.toasts.error') || 'Error al guardar permisos', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSavingPermissions(false);
    }
  };

  /**
   * Reset every role to the system defaults via
   * DELETE /inmobiliaria/agency/role-permissions. Also clears per-member
   * overrides for AGENTE/CONTADOR/VIEWER on the backend — destructive, so
   * ConfigPermisos guards this behind a confirmation dialog.
   */
  const handleResetPermissions = async () => {
    setIsSavingPermissions(true);
    try {
      const matrices = await rolePermissionsApi.resetRolePermissions();
      setPermissions(matricesToUiMatrix(matrices));
      setPermissionsVersion((v) => v + 1);
      await refetchMyPermissions();
      toast.success(t('inmobiliaria.config.toasts.permissionsReset'), {
        description: t('inmobiliaria.config.toasts.permissionsResetDesc'),
      });
    } catch (error) {
      toast.error(t('inmobiliaria.config.toasts.error') || 'Error al restablecer permisos', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSavingPermissions(false);
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
      toast.error('Error al actualizar integración', {
        description: error instanceof Error ? error.message : undefined,
      });
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
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-fg flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
            <Gear className="w-5 h-5 text-fg-muted" />
          </div>
          {t('inmobiliaria.config.title')}
        </h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          {t('inmobiliaria.config.subtitle')}
        </p>
      </div>

      {/* Tabs Navigation — selected = soft fill, never solid brand block */}
      <Tabs value={activeTab} onValueChange={(v) => setTab(v as ConfigTab)}>
      <TabsList variant="underline" className="flex-wrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger key={tab.id} value={tab.id} className="inline-flex items-center gap-2 whitespace-nowrap">
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/* Tab Content with Animation */}
      <TabsContent value={activeTab} className="mt-4">
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
              <Spinner size="lg" />
            </div>
          ) : config?.agency ? (
            <ConfigPerfilAgencia
              agency={config.agency}
              onSave={handleSaveAgency}
              canEdit={isAgencyAdmin}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">No hay configuración disponible</div>
          )
        )}

        {/* Branding Tab */}
        {activeTab === 'branding' && (
          configLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : config?.agency ? (
            <ConfigBranding
              agency={config.agency}
              onLogoUpdated={handleLogoUpdated}
              onBrandingUpdated={handleBrandingUpdated}
              canEdit={isAgencyAdmin}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">No hay información de branding</div>
          )
        )}

        {/* Usuarios Tab */}
        {activeTab === 'usuarios' && (
          usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
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
          <ConfigPermisos
            key={`permisos-${permissionsVersion}`}
            permissions={permissions}
            onSave={handleSavePermissions}
            onReset={handleResetPermissions}
            isLoading={isSavingPermissions}
          />
        )}

        {/* Integraciones Tab */}
        {activeTab === 'integraciones' && (
          integrationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <ConfigIntegraciones
              integrations={integrations}
              onToggle={handleToggleIntegration}
              onConfigure={handleConfigureIntegration}
            />
          )
        )}

        {/* Facturacion Tab — plan/precio/límites vienen de la suscripción REAL
            de agencia (useAgencySubscription + useAgencyPlans, dentro del
            componente); useAgencyBilling solo aporta usage/invoices/paymentMethod. */}
        {activeTab === 'facturacion' && (
          <ConfigFacturacion
            billing={billing}
            invoices={invoices}
            isLoading={billingLoading}
            onUpdatePaymentMethod={handleUpdatePaymentMethod}
          />
        )}

        {/* Notificaciones Tab */}
        {activeTab === 'notificaciones' && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
                  <Bell className="w-5 h-5 text-fg-muted" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-fg">{t('inmobiliaria.config.notifications.title')}</h2>
                  <p className="text-xs text-fg-muted">{t('inmobiliaria.config.notifications.subtitle')}</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-border">
              {([
                { key: 'emailNewLead' as const, icon: Envelope, title: t('inmobiliaria.config.notifications.newLeads'), desc: t('inmobiliaria.config.notifications.newLeadsDesc') },
                { key: 'emailPaymentReceived' as const, icon: CreditCard, title: t('inmobiliaria.config.notifications.paymentsReceived'), desc: t('inmobiliaria.config.notifications.paymentsReceivedDesc') },
                { key: 'emailContractReminder' as const, icon: FileText, title: t('inmobiliaria.config.notifications.contractExpiry'), desc: t('inmobiliaria.config.notifications.contractExpiryDesc') },
                { key: 'pushNewMessage' as const, icon: Bell, title: t('inmobiliaria.config.notifications.newMessages'), desc: t('inmobiliaria.config.notifications.newMessagesDesc') },
                { key: 'marketingEmails' as const, icon: Tag, title: t('inmobiliaria.config.notifications.promotionalEmails'), desc: t('inmobiliaria.config.notifications.promotionalEmailsDesc') },
              ]).map((item) => (
                <div key={item.key} className="flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-fg-muted" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-fg">{item.title}</p>
                      <p className="text-xs text-fg-muted">{item.desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={!!notifSettings[notifKeyMap[item.key]]}
                    aria-label={item.title}
                    onCheckedChange={async () => {
                      const backendKey = notifKeyMap[item.key];
                      if (!backendKey) return;
                      try {
                        await updateSetting(backendKey, !notifSettings[backendKey]);
                        toast.success(!notifSettings[backendKey] ? t('inmobiliaria.config.notifications.enabled') : t('inmobiliaria.config.notifications.disabled'));
                      } catch {
                        toast.error(locale === 'es' ? 'Error al actualizar configuración' : 'Error updating settings');
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preferencias Tab */}
        {activeTab === 'preferencias' && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
                  <Globe className="w-5 h-5 text-fg-muted" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-fg">{t('inmobiliaria.config.preferences.title')}</h2>
                  <p className="text-xs text-fg-muted">{t('inmobiliaria.config.preferences.subtitle')}</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-border">
              {/* Dark mode toggle */}
              <div className="flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
                    <Moon className="w-5 h-5 text-fg-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-fg">{t('inmobiliaria.config.preferences.darkMode')}</p>
                    <p className="text-xs text-fg-muted">{t('inmobiliaria.config.preferences.darkModeDesc')}</p>
                  </div>
                </div>
                <Switch
                  checked={mounted && resolvedTheme === 'dark'}
                  aria-label={t('inmobiliaria.config.preferences.darkMode')}
                  onCheckedChange={() => {
                    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
                    toast.success(resolvedTheme === 'dark' ? t('inmobiliaria.config.preferences.lightThemeEnabled') : t('inmobiliaria.config.preferences.darkThemeEnabled'));
                  }}
                />
              </div>
              {/* Language selector */}
              <div className="flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
                    <Globe className="w-5 h-5 text-fg-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-fg">{t('inmobiliaria.config.preferences.language')}</p>
                    <p className="text-xs text-fg-muted">{t('inmobiliaria.config.preferences.languageDesc')}</p>
                  </div>
                </div>
                <Select
                  value={locale}
                  onValueChange={(v) => {
                    setLocale(v as Locale);
                    toast.success(v === 'en' ? t('inmobiliaria.config.preferences.langChangedEn') : t('inmobiliaria.config.preferences.langChangedEs'));
                  }}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* AI panel tour toggle — Phase 38 plan 38-06 */}
              <div className="flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
                    <Compass className="w-5 h-5 text-fg-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-fg">{t('inmobiliaria.config.preferences.panelTour')}</p>
                    <p className="text-xs text-fg-muted">{t('inmobiliaria.config.preferences.panelTourDesc')}</p>
                  </div>
                </div>
                <Switch
                  checked={tourDismissed === false}
                  aria-label={t('inmobiliaria.config.preferences.panelTour')}
                  aria-busy={isTogglingTour || tourDismissed === null}
                  disabled={isTogglingTour || tourDismissed === null}
                  onCheckedChange={async () => {
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
                />
              </div>
              {/* Relaunch tour button — session-only, does not persist */}
              <div className="flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
                    <Compass className="w-5 h-5 text-fg-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-fg">{t('inmobiliaria.config.preferences.relaunchTour')}</p>
                    <p className="text-xs text-fg-muted">{t('inmobiliaria.config.preferences.relaunchTourDesc')}</p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  hideArrow
                  onClick={() => {
                    // Reponer la preferencia global NO alcanza: cada novedad
                    // guarda su propio "ya la vi" en localStorage, así que sin
                    // este reset el botón no mostraría nada.
                    resetAgentIntros();
                    relaunchTour();
                    toast.success(t('inmobiliaria.config.preferences.relaunchTourStarted'));
                  }}
                >
                  {t('inmobiliaria.config.preferences.relaunchTour')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Seguridad Tab */}
        {activeTab === 'seguridad' && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
                  <Shield className="w-5 h-5 text-fg-muted" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-fg">{t('inmobiliaria.config.security.title')}</h2>
                  <p className="text-xs text-fg-muted">{t('inmobiliaria.config.security.subtitle')}</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-border">
              <MfaSetupSection />
              {/* Change password */}
              <Button
                variant="ghost"
                hideArrow
                onClick={() => toast.info(t('inmobiliaria.config.security.changePassword'), { description: t('inmobiliaria.config.security.changePasswordToast') })}
                className="flex items-center justify-between w-full px-6 py-4 h-auto rounded-none text-left hover:bg-muted/40"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
                    <Lock className="w-5 h-5 text-fg-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-fg">{t('inmobiliaria.config.security.changePassword')}</p>
                    <p className="text-xs text-fg-muted">{t('inmobiliaria.config.security.changePasswordDesc')}</p>
                  </div>
                </div>
                <CaretRight className="w-4 h-4 text-fg-muted" />
              </Button>
              {/* Active sessions */}
              <Button
                variant="ghost"
                hideArrow
                onClick={() => toast.info(t('inmobiliaria.config.security.activeSessions'), { description: t('inmobiliaria.config.security.activeSessionsDesc') })}
                className="flex items-center justify-between w-full px-6 py-4 h-auto rounded-none text-left hover:bg-muted/40"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-fg-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-fg">{t('inmobiliaria.config.security.activeSessions')}</p>
                    <p className="text-xs text-fg-muted">{t('inmobiliaria.config.security.activeSessionsDesc')}</p>
                  </div>
                </div>
                <CaretRight className="w-4 h-4 text-fg-muted" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>
      </TabsContent>
      </Tabs>
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
