'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowClockwise,
  Check,
  Warning,
  Info,
  ShieldCheck,
  Eye,
  PencilSimple,
  Plus,
  Trash,
  Export,
  House,
  Users,
  ChartLineUp,
  CurrencyDollar,
  Briefcase,
  Gear,
  FileText,
  ChartBar,
  Funnel,
  HandCoins,
  Wrench,
  ClipboardText,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type {
  AgencyRole,
  RolePermissions,
  PermissionModule,
  PermissionAction,
} from '@/lib/types/inmobiliaria';
import {
  getRoleLabel,
  getRoleColor,
  getModuleLabel,
  getActionLabel,
  ALL_PERMISSION_MODULES,
  ALL_PERMISSION_ACTIONS,
  DEFAULT_ROLE_PERMISSIONS,
  hasPermission,
  updateRolePermission,
} from '@/lib/types/inmobiliaria';

// ============================================================================
// Types
// ============================================================================

interface ConfigPermisosProps {
  permissions: Record<AgencyRole, RolePermissions>;
  onSave?: (permissions: Record<AgencyRole, RolePermissions>) => void;
  isLoading?: boolean;
}

// Module icons map
const MODULE_ICONS: Record<PermissionModule, React.ElementType> = {
  dashboard: ChartLineUp,
  propietarios: Users,
  portafolio: House,
  pipeline: Funnel,
  agentes: Briefcase,
  cobros: CurrencyDollar,
  dispersiones: HandCoins,
  operaciones: Wrench,
  reportes: ClipboardText,
  configuracion: Gear,
  documentos: FileText,
  analytics: ChartBar,
};

// Action icons map
const ACTION_ICONS: Record<PermissionAction, React.ElementType> = {
  view: Eye,
  create: Plus,
  edit: PencilSimple,
  delete: Trash,
  export: Export,
};

// All roles in order
const ALL_ROLES: AgencyRole[] = ['admin', 'agente', 'contador', 'viewer'];

// ============================================================================
// Permission Cell Component
// ============================================================================

interface PermissionCellProps {
  module: PermissionModule;
  action: PermissionAction;
  isEnabled: boolean;
  isAdmin: boolean;
  onChange: (enabled: boolean) => void;
}

function PermissionCell({ module, action, isEnabled, isAdmin, onChange }: PermissionCellProps) {
  const { t } = useTranslation();
  const ActionIcon = ACTION_ICONS[action];

  // Admin always has all permissions (disabled UI)
  const isLocked = isAdmin;

  // Show warning for dangerous permissions (delete, config edit)
  const isDangerous = action === 'delete' || (module === 'configuracion' && action === 'edit');

  const actionDescription = useMemo(() => {
    const descriptions: Record<PermissionAction, string> = {
      view: t('inmobiliaria.config.permissions.actionDescriptions.view'),
      create: t('inmobiliaria.config.permissions.actionDescriptions.create'),
      edit: t('inmobiliaria.config.permissions.actionDescriptions.edit'),
      delete: t('inmobiliaria.config.permissions.actionDescriptions.delete'),
      export: t('inmobiliaria.config.permissions.actionDescriptions.export'),
    };
    return descriptions[action];
  }, [action, t]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center">
            <label
              className={cn(
                'relative flex items-center justify-center w-10 h-10 rounded-lg transition-all cursor-pointer',
                isEnabled
                  ? isDangerous
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400',
                isLocked && 'opacity-60 cursor-not-allowed'
              )}
            >
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => !isLocked && onChange(e.target.checked)}
                disabled={isLocked}
                className="sr-only"
              />
              {isEnabled ? (
                <Check className="w-4 h-4" weight="bold" />
              ) : (
                <ActionIcon className="w-4 h-4" />
              )}
              {isDangerous && isEnabled && (
                <Warning className="absolute -top-1 -right-1 w-3.5 h-3.5 text-amber-500" weight="fill" />
              )}
            </label>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="text-xs">
            <p className="font-medium">{getActionLabel(action)}</p>
            <p className="text-neutral-400">{actionDescription}</p>
            {isDangerous && isEnabled && (
              <p className="text-amber-400 mt-1">{t('inmobiliaria.config.permissions.sensitivePermission')}</p>
            )}
            {isLocked && (
              <p className="text-neutral-500 mt-1">{t('inmobiliaria.config.permissions.adminAlwaysHas')}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Permission Row Component
// ============================================================================

interface PermissionRowProps {
  module: PermissionModule;
  permissions: RolePermissions;
  isAdmin: boolean;
  onToggle: (module: PermissionModule, action: PermissionAction, enabled: boolean) => void;
  onToggleAll: (module: PermissionModule, enabled: boolean) => void;
}

function PermissionRow({ module, permissions, isAdmin, onToggle, onToggleAll }: PermissionRowProps) {
  const ModuleIcon = MODULE_ICONS[module];

  // Check which actions are enabled
  const enabledActions = useMemo(() => {
    return ALL_PERMISSION_ACTIONS.filter((action) => hasPermission(permissions, module, action));
  }, [permissions, module]);

  const allEnabled = enabledActions.length === ALL_PERMISSION_ACTIONS.length;
  const someEnabled = enabledActions.length > 0 && !allEnabled;

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-[#141416] transition-colors"
    >
      {/* Module Name */}
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <ModuleIcon className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
          </div>
          <span className="font-medium text-neutral-900 dark:text-white">
            {getModuleLabel(module)}
          </span>
        </div>
      </td>

      {/* Select All for Row */}
      <td className="p-4">
        <div className="flex items-center justify-center">
          <Checkbox
            checked={allEnabled ? true : someEnabled ? 'indeterminate' : false}
            onCheckedChange={(checked) => onToggleAll(module, checked === true)}
            disabled={isAdmin}
            className={cn(isAdmin && 'opacity-60 cursor-not-allowed')}
          />
        </div>
      </td>

      {/* Action Columns */}
      {ALL_PERMISSION_ACTIONS.map((action) => (
        <td key={action} className="p-4">
          <PermissionCell
            module={module}
            action={action}
            isEnabled={hasPermission(permissions, module, action)}
            isAdmin={isAdmin}
            onChange={(enabled) => onToggle(module, action, enabled)}
          />
        </td>
      ))}
    </motion.tr>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ConfigPermisos({
  permissions: initialPermissions,
  onSave,
  isLoading = false,
}: ConfigPermisosProps) {
  const { t } = useTranslation();

  // Local state for editing
  const [permissions, setPermissions] = useState<Record<AgencyRole, RolePermissions>>(initialPermissions);
  const [activeRole, setActiveRole] = useState<AgencyRole>('admin');
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Current role permissions
  const currentPermissions = permissions[activeRole];
  const isAdmin = activeRole === 'admin';

  // Count permissions per role
  const getPermissionCount = useCallback((role: AgencyRole) => {
    const rolePerms = permissions[role];
    return rolePerms.permissions.reduce((sum, p) => sum + p.actions.length, 0);
  }, [permissions]);

  // Toggle single permission
  const handleTogglePermission = useCallback((
    module: PermissionModule,
    action: PermissionAction,
    enabled: boolean
  ) => {
    if (isAdmin) return; // Admin permissions are locked

    setPermissions((prev) => ({
      ...prev,
      [activeRole]: updateRolePermission(prev[activeRole], module, action, enabled),
    }));
    setHasChanges(true);
  }, [activeRole, isAdmin]);

  // Toggle all permissions for a module
  const handleToggleAllModule = useCallback((module: PermissionModule, enabled: boolean) => {
    if (isAdmin) return;

    setPermissions((prev) => {
      let updated = prev[activeRole];
      ALL_PERMISSION_ACTIONS.forEach((action) => {
        updated = updateRolePermission(updated, module, action, enabled);
      });
      return { ...prev, [activeRole]: updated };
    });
    setHasChanges(true);
  }, [activeRole, isAdmin]);

  // Toggle all permissions for an action (column)
  const handleToggleAllAction = useCallback((action: PermissionAction, enabled: boolean) => {
    if (isAdmin) return;

    setPermissions((prev) => {
      let updated = prev[activeRole];
      ALL_PERMISSION_MODULES.forEach((module) => {
        updated = updateRolePermission(updated, module, action, enabled);
      });
      return { ...prev, [activeRole]: updated };
    });
    setHasChanges(true);
  }, [activeRole, isAdmin]);

  // Check if all modules have a specific action enabled
  const isActionFullyEnabled = useCallback((action: PermissionAction) => {
    return ALL_PERMISSION_MODULES.every((module) =>
      hasPermission(currentPermissions, module, action)
    );
  }, [currentPermissions]);

  const isActionPartiallyEnabled = useCallback((action: PermissionAction) => {
    const enabled = ALL_PERMISSION_MODULES.filter((module) =>
      hasPermission(currentPermissions, module, action)
    );
    return enabled.length > 0 && enabled.length < ALL_PERMISSION_MODULES.length;
  }, [currentPermissions]);

  // Reset to defaults
  const handleReset = () => {
    setPermissions(DEFAULT_ROLE_PERMISSIONS);
    setHasChanges(true);
    setResetDialogOpen(false);
  };

  // Save changes
  const handleSave = () => {
    onSave?.(permissions);
    setHasChanges(false);
    setConfirmDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-500" />
            {t('inmobiliaria.config.permissions.permissionsTitle')}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {t('inmobiliaria.config.permissions.permissionsSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetDialogOpen(true)}
            disabled={isLoading}
          >
            <ArrowClockwise className="w-4 h-4 mr-2" />
            {t('inmobiliaria.config.permissions.reset')}
          </Button>
          <Button
            size="sm"
            onClick={() => setConfirmDialogOpen(true)}
            disabled={!hasChanges || isLoading}
          >
            {isLoading ? (
              <>
                <ArrowClockwise className="w-4 h-4 mr-2 animate-spin" />
                {t('inmobiliaria.config.permissions.saving')}
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {t('inmobiliaria.config.permissions.saveChanges')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Unsaved changes indicator */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
        >
          <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {t('inmobiliaria.config.permissions.unsavedChanges')}
          </p>
        </motion.div>
      )}

      {/* Role Tabs */}
      <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as AgencyRole)}>
        <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:flex">
          {ALL_ROLES.map((role) => (
            <TabsTrigger key={role} value={role} className="gap-2">
              <span className="hidden sm:inline">{getRoleLabel(role)}</span>
              <span className="sm:hidden">{getRoleLabel(role).slice(0, 3)}</span>
              <span className="inline-flex px-1.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-medium">
                {getPermissionCount(role)}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {ALL_ROLES.map((role) => (
          <TabsContent key={role} value={role}>
            {/* Admin Note */}
            {role === 'admin' && (
              <div className="mb-4 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    {t('inmobiliaria.config.permissions.adminNote')}
                  </p>
                </div>
              </div>
            )}

            {/* Permission Matrix Table */}
            <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800">
                    <th className="text-left p-4 w-[200px]">
                      <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        {t('inmobiliaria.config.permissions.module')}
                      </span>
                    </th>
                    <th className="p-4 w-[60px] text-center">
                      <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        {t('inmobiliaria.config.permissions.all')}
                      </span>
                    </th>
                    {ALL_PERMISSION_ACTIONS.map((action) => {
                      const ActionIcon = ACTION_ICONS[action];
                      const allEnabled = isActionFullyEnabled(action);
                      const someEnabled = isActionPartiallyEnabled(action);

                      return (
                        <th key={action} className="p-4 w-[80px]">
                          <div className="flex flex-col items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleToggleAllAction(action, !allEnabled)}
                                    disabled={isAdmin}
                                    className={cn(
                                      'flex flex-col items-center gap-1 p-1 rounded transition-colors',
                                      !isAdmin && 'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                                      isAdmin && 'opacity-60 cursor-not-allowed'
                                    )}
                                  >
                                    <ActionIcon className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                                    <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                      {getActionLabel(action)}
                                    </span>
                                    <Checkbox
                                      checked={allEnabled ? true : someEnabled ? 'indeterminate' : false}
                                      className="pointer-events-none"
                                      tabIndex={-1}
                                    />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">
                                    {allEnabled
                                      ? t('inmobiliaria.config.permissions.revokeAll', { action: getActionLabel(action).toLowerCase() })
                                      : t('inmobiliaria.config.permissions.grantAll', { action: getActionLabel(action).toLowerCase() })}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {ALL_PERMISSION_MODULES.map((module) => (
                    <PermissionRow
                      key={module}
                      module={module}
                      permissions={permissions[role]}
                      isAdmin={role === 'admin'}
                      onToggle={handleTogglePermission}
                      onToggleAll={handleToggleAllModule}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" weight="bold" />
                </div>
                <span>{t('inmobiliaria.config.permissions.legendActive')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" weight="bold" />
                </div>
                <span>{t('inmobiliaria.config.permissions.legendSensitive')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <Eye className="w-3.5 h-3.5 text-neutral-400" />
                </div>
                <span>{t('inmobiliaria.config.permissions.legendNoPermission')}</span>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Confirm Save Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inmobiliaria.config.permissions.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('inmobiliaria.config.permissions.confirmDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              {t('inmobiliaria.config.permissions.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? t('inmobiliaria.config.permissions.saving') : t('inmobiliaria.config.permissions.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset to Defaults Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-600 dark:text-amber-400">{t('inmobiliaria.config.permissions.resetTitle')}</DialogTitle>
            <DialogDescription>
              {t('inmobiliaria.config.permissions.resetDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {t('inmobiliaria.config.permissions.resetWarning')}
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              {t('inmobiliaria.config.permissions.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleReset}>
              {t('inmobiliaria.config.permissions.reset')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ConfigPermisos;
