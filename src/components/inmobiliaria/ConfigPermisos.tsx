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
  Handshake,
  CreditCard,
  Scales,
  ClockCounterClockwise,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
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
  AccionPuntual,
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
  type RolDeLaMatriz,
  hasPermission,
  updateRolePermission,
  PERMISOS_PUNTUALES,
  ROLES_DEL_SISTEMA,
} from '@/lib/types/inmobiliaria';

// Los siete roles del sistema (22-09 noche); sólo se muestran los que el back devolvió.
type AgencyRole = RolDeLaMatriz;
type Matrices = Partial<Record<RolDeLaMatriz, RolePermissions>>;

// ============================================================================
// Types
// ============================================================================

interface ConfigPermisosProps {
  permissions: Matrices;
  onSave?: (permissions: Matrices) => void;
  /**
   * Reset every role to the system defaults on the server (destructive — also
   * clears per-member overrides). When provided, "Restablecer" delegates here
   * instead of doing a local-only reset. Guarded by a confirmation dialog.
   */
  onReset?: () => void | Promise<void>;
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
  contratos: Handshake,
  subscription: CreditCard,
  avaluos: Scales,
  bitacora: ClockCounterClockwise,
};

// Action icons map
const ACTION_ICONS: Record<PermissionAction, React.ElementType> = {
  view: Eye,
  create: Plus,
  edit: PencilSimple,
  delete: Trash,
  export: Export,
};


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
  const { t } = useI18n();
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
                'relative flex items-center justify-center w-10 h-10 rounded-md transition-all cursor-pointer',
                isEnabled
                  ? isDangerous
                    ? 'bg-warning-soft text-warning'
                    : 'bg-success-soft text-success'
                  : 'bg-surface-muted text-fg-muted',
                isLocked && 'opacity-60 cursor-not-allowed'
              )}
            >
              {/* allowlist: sr-only native checkbox is the accessible control behind a bespoke
                  colored action-tile toggle (icon + state color) — Cadence Checkbox/Switch can't
                  host the tile visual; the input stays hidden purely for a11y/keyboard. */}
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
                <Warning className="absolute -top-1 -right-1 w-3.5 h-3.5 text-warning" weight="fill" />
              )}
            </label>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="text-xs">
            <p className="font-medium">{getActionLabel(action)}</p>
            <p className="text-fg-subtle">{actionDescription}</p>
            {isDangerous && isEnabled && (
              <p className="text-warning mt-1">{t('inmobiliaria.config.permissions.sensitivePermission')}</p>
            )}
            {isLocked && (
              <p className="text-fg-muted mt-1">{t('inmobiliaria.config.permissions.adminAlwaysHas')}</p>
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
      className="border-b border-border hover:bg-muted/40 transition-colors"
    >
      {/* Module Name */}
      <TableCell className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-surface-muted flex items-center justify-center">
            <ModuleIcon className="w-5 h-5 text-fg-muted" />
          </div>
          <span className="font-medium text-fg">
            {getModuleLabel(module)}
          </span>
        </div>
      </TableCell>

      {/* Select All for Row */}
      <TableCell className="p-4">
        <div className="flex items-center justify-center">
          <Checkbox
            checked={allEnabled ? true : someEnabled ? 'indeterminate' : false}
            onCheckedChange={(checked) => onToggleAll(module, checked === true)}
            disabled={isAdmin}
            className={cn(isAdmin && 'opacity-60 cursor-not-allowed')}
          />
        </div>
      </TableCell>

      {/* Action Columns */}
      {ALL_PERMISSION_ACTIONS.map((action) => (
        <TableCell key={action} className="p-4">
          <PermissionCell
            module={module}
            action={action}
            isEnabled={hasPermission(permissions, module, action)}
            isAdmin={isAdmin}
            onChange={(enabled) => onToggle(module, action, enabled)}
          />
        </TableCell>
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
  onReset,
  isLoading = false,
}: ConfigPermisosProps) {
  const { t } = useI18n();

  // Local state for editing
  const [permissions, setPermissions] = useState<Matrices>(initialPermissions);
  // Los roles que hay para editar: los siete, menos los que un back viejo no mandó.
  const ALL_ROLES = useMemo(
    () => ROLES_DEL_SISTEMA.filter((r) => initialPermissions[r] !== undefined),
    [initialPermissions],
  );
  const [activeRole, setActiveRole] = useState<AgencyRole>('admin');
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Current role permissions
  const currentPermissions = permissions[activeRole] ?? { role: activeRole, permissions: [] };
  const isAdmin = activeRole === 'admin';

  // Count permissions per role
  const getPermissionCount = useCallback((role: AgencyRole) => {
    const rolePerms = permissions[role];
    if (!rolePerms) return 0;
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
      [activeRole]: updateRolePermission(prev[activeRole] ?? { role: activeRole, permissions: [] }, module, action, enabled),
    }));
    setHasChanges(true);
  }, [activeRole, isAdmin]);

  /**
   * Un permiso PUNTUAL (22-09) se marca solo, con su nombre: no es una columna
   * de la matriz y «todo el módulo» no lo incluye (la matriz recorre sus cinco
   * acciones). Viaja dentro del módulo del que cuelga.
   */
  const handleTogglePuntual = useCallback(
    (modulo: PermissionModule, accion: AccionPuntual, enabled: boolean) => {
      if (isAdmin) return;
      setPermissions((prev) => ({
        ...prev,
        [activeRole]: updateRolePermission(prev[activeRole] ?? { role: activeRole, permissions: [] }, modulo, accion, enabled),
      }));
      setHasChanges(true);
    },
    [activeRole, isAdmin],
  );

  // Toggle all permissions for a module
  const handleToggleAllModule = useCallback((module: PermissionModule, enabled: boolean) => {
    if (isAdmin) return;

    setPermissions((prev) => {
      let updated = prev[activeRole] ?? { role: activeRole, permissions: [] };
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
      let updated = prev[activeRole] ?? { role: activeRole, permissions: [] };
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

  // Reset to defaults. When the parent wires `onReset`, delegate to it (it
  // resets on the server via DELETE and refetches, remounting this component
  // with the fresh matrix). Without a handler, fall back to a local-only reset.
  const handleReset = async () => {
    setResetDialogOpen(false);
    if (onReset) {
      await onReset();
      return;
    }
    setPermissions(DEFAULT_ROLE_PERMISSIONS);
    setHasChanges(true);
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
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-fg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-fg-muted" />
            {t('inmobiliaria.config.permissions.permissionsTitle')}
          </h2>
          <p className="text-sm text-fg-muted">
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
            hideArrow
            onClick={() => setConfirmDialogOpen(true)}
            disabled={!hasChanges || isLoading}
          >
            {isLoading ? (
              <>
                <Spinner size="sm" variant="current" className="mr-2" />
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
          className="flex items-center gap-2 p-3 rounded-md bg-warning-soft border border-warning/30"
        >
          <Info className="w-5 h-5 text-warning shrink-0" />
          <p className="text-sm text-warning">
            {t('inmobiliaria.config.permissions.unsavedChanges')}
          </p>
        </motion.div>
      )}

      {/* Role Tabs */}
      <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as AgencyRole)}>
        <TabsList variant="segmented" className="h-auto w-full flex-wrap sm:w-auto">
          {ALL_ROLES.map((role) => (
            <TabsTrigger
              key={role}
              value={role}
              className="inline-flex flex-1 items-center justify-center gap-2 sm:flex-initial"
            >
              <span className="hidden sm:inline">{getRoleLabel(role)}</span>
              <span className="sm:hidden">{getRoleLabel(role).slice(0, 3)}</span>
              <span className="inline-flex rounded-full bg-surface-muted px-1.5 py-0.5 text-xs tabular-nums text-fg-muted">
                {getPermissionCount(role)}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {ALL_ROLES.map((role) => (
          <TabsContent key={role} value={role}>
            {/* Admin Note */}
            {role === 'admin' && (
              <div className="mb-4 p-3 rounded-md bg-surface-muted border border-border">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-fg-muted" />
                  <p className="text-sm text-fg-muted">
                    {t('inmobiliaria.config.permissions.adminNote')}
                  </p>
                </div>
              </div>
            )}

            {/* Member override note — saving/reset makes the role template
                authoritative and clears per-member customizations for that role. */}
            {role !== 'admin' && (
              <div className="mb-4 p-3 rounded-md bg-surface-muted border border-border">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-fg-muted shrink-0" />
                  <p className="text-sm text-fg-muted">
                    {t('inmobiliaria.config.permissions.memberOverrideNote')}
                  </p>
                </div>
              </div>
            )}

            {/* Permission Matrix Table */}
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <Table className="w-full min-w-[700px]">
                <TableHeader>
                  <TableRow className="border-b border-border-faint dark:border-border-strong">
                    <TableHead className="text-left p-4 w-[200px]">
                      <span>
                        {t('inmobiliaria.config.permissions.module')}
                      </span>
                    </TableHead>
                    <TableHead className="p-4 w-[60px] text-center">
                      <span>
                        {t('inmobiliaria.config.permissions.all')}
                      </span>
                    </TableHead>
                    {ALL_PERMISSION_ACTIONS.map((action) => {
                      const ActionIcon = ACTION_ICONS[action];
                      const allEnabled = isActionFullyEnabled(action);
                      const someEnabled = isActionPartiallyEnabled(action);

                      return (
                        <TableHead key={action} className="p-4 w-[80px]">
                          <div className="flex flex-col items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  {/* allowlist: table column bulk-toggle trigger (grant/revoke an
                                      action across all modules) — a clickable column header with
                                      icon+label+checkbox, no Cadence primitive models it */}
                                  <button
                                    onClick={() => handleToggleAllAction(action, !allEnabled)}
                                    disabled={isAdmin}
                                    className={cn(
                                      'flex flex-col items-center gap-1 p-1 rounded transition-colors',
                                      !isAdmin && 'hover:bg-surface-muted dark:hover:bg-ink',
                                      isAdmin && 'opacity-60 cursor-not-allowed'
                                    )}
                                  >
                                    <ActionIcon className="w-4 h-4 text-fg-muted dark:text-fg-subtle" />
                                    <span>
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
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ALL_PERMISSION_MODULES.map((module) => (
                    <PermissionRow
                      key={module}
                      module={module}
                      permissions={permissions[role] ?? { role, permissions: [] }}
                      isAdmin={role === 'admin'}
                      onToggle={handleTogglePermission}
                      onToggleAll={handleToggleAllModule}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* 🔴 22-09 · PERMISOS PUNTUALES. «Cambiar la fecha de un egreso»
                (Nico: «que sólo lo pueda hacer alguien con permisos») es UNA
                acción, no un módulo: va aparte de la matriz, con su nombre y
                su consecuencia, porque una columna más de «Reportes» no le
                diría a nadie que eso mueve un asiento. */}
            <section
              className="mt-4 rounded-lg border border-border bg-surface"
              aria-labelledby={`puntuales-${role}`}
              data-testid="permisos-puntuales"
            >
              <div className="space-y-0.5 border-b border-border px-4 py-3">
                <h3 id={`puntuales-${role}`} className="text-sm font-semibold text-fg">
                  {t('inmobiliaria.config.permissions.puntualesTitulo')}
                </h3>
                <p className="text-caption text-fg-muted">
                  {t('inmobiliaria.config.permissions.puntualesDescripcion')}
                </p>
              </div>
              <ul className="divide-y divide-border-faint">
                {PERMISOS_PUNTUALES.map((p) => {
                  const esAdmin = role === 'admin';
                  const marcado = esAdmin || hasPermission(permissions[role] ?? { role, permissions: [] }, p.modulo, p.accion);
                  const id = `puntual-${role}-${p.accion}`;
                  return (
                    <li key={p.accion} className="flex items-start gap-3 px-4 py-3">
                      <Checkbox
                        id={id}
                        checked={marcado}
                        disabled={esAdmin}
                        onCheckedChange={(c) => handleTogglePuntual(p.modulo, p.accion, c === true)}
                        className="mt-0.5"
                        data-testid={`permiso-puntual-${p.accion}`}
                      />
                      <label htmlFor={id} className="min-w-0 flex-1 space-y-0.5">
                        <span className="block text-sm font-medium text-fg">
                          {t(`inmobiliaria.config.permissions.puntuales.${p.accion}.nombre`)}
                        </span>
                        <span className="block text-caption text-fg-muted">
                          {t(`inmobiliaria.config.permissions.puntuales.${p.accion}.descripcion`)}
                        </span>
                        {esAdmin ? (
                          <span className="block text-caption text-fg-subtle">
                            {t('inmobiliaria.config.permissions.puntualAdminSiempre')}
                          </span>
                        ) : null}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-fg-muted">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-sm bg-success-soft flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-success" weight="bold" />
                </div>
                <span>{t('inmobiliaria.config.permissions.legendActive')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-sm bg-warning-soft flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-warning" weight="bold" />
                </div>
                <span>{t('inmobiliaria.config.permissions.legendSensitive')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-sm bg-surface-muted flex items-center justify-center">
                  <Eye className="w-3.5 h-3.5 text-fg-muted" />
                </div>
                <span>{t('inmobiliaria.config.permissions.legendNoPermission')}</span>
              </div>
            </div>

            {/*
              🔴 Lo que un módulo no alcanza a decir (17-09-2026): el portafolio
              es uno solo y lo que parte un inmueble del otro es si tiene un
              contrato vigente. El back lo deriva de estos dos permisos
              (`alcance-del-miembro.ts`); decirlo acá es lo que hace que la
              matriz sea honesta sobre lo que abre cada casilla.
            */}
            <div
              className="mt-4 rounded-md border border-border bg-surface-muted p-4 text-sm text-fg-muted space-y-1"
              data-testid="permisos-alcance-derivado"
            >
              <p className="font-medium text-fg">{t('inmobiliaria.config.permissions.alcanceTitulo')}</p>
              <p>{t('inmobiliaria.config.permissions.alcanceArrendados')}</p>
              <p>{t('inmobiliaria.config.permissions.alcancePlata')}</p>
              <p>{t('inmobiliaria.config.permissions.alcanceContabilidad')}</p>
              {role === 'agente' && (
                <p className="text-fg">{t('inmobiliaria.config.permissions.alcanceAsesor')}</p>
              )}
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
            <DialogTitle className="text-warning">{t('inmobiliaria.config.permissions.resetTitle')}</DialogTitle>
            <DialogDescription>
              {t('inmobiliaria.config.permissions.resetDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-md bg-warning-soft border border-warning/30">
            <p className="text-sm text-warning">
              {t('inmobiliaria.config.permissions.resetWarning')}
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              {t('inmobiliaria.config.permissions.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleReset} disabled={isLoading}>
              {t('inmobiliaria.config.permissions.reset')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ConfigPermisos;
