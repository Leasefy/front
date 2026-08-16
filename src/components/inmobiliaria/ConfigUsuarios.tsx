'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  Plus,
  DotsThree,
  PencilSimple,
  ArrowClockwise,
  UserMinus,
  UserCheck,
  Trash,
  EnvelopeSimple,
  Phone,
  Clock,
  Users,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListSeparator,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu';
import { IconButton } from '@leasefy/cadence';
import type {
  AgencyUser,
  AgencyRole,
  UserInvite,
} from '@/lib/types/inmobiliaria';
import {
  getRoleLabel,
  getRoleColor,
  getUserStatusColor,
  getUserStatusLabel,
} from '@/lib/types/inmobiliaria';
import { formatRelativeTime } from '@/lib/format';
import { AgenteFormModal } from './AgenteFormModal';

// ============================================================================
// Types
// ============================================================================

interface ConfigUsuariosProps {
  users: AgencyUser[];
  onInvite?: (invite: UserInvite) => void | Promise<void>;
  onUpdateRole?: (userId: string, role: AgencyRole) => void;
  onToggleStatus?: (userId: string) => void;
  onResendInvite?: (userId: string) => void;
  onDelete?: (userId: string) => void;
  isLoading?: boolean;
}

type FilterRole = AgencyRole | 'all';
type FilterStatus = AgencyUser['status'] | 'all';

// ============================================================================
// Edit Role Modal Component
// ============================================================================

interface EditRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AgencyUser | null;
  onSubmit: (userId: string, role: AgencyRole) => void;
  isLoading?: boolean;
}

function EditRoleModal({ open, onOpenChange, user, onSubmit, isLoading }: EditRoleModalProps) {
  const { t } = useI18n();
  const [selectedRole, setSelectedRole] = useState<AgencyRole>(user?.role || 'agente');

  // Update selected role when user changes
  useState(() => {
    if (user) setSelectedRole(user.role ?? 'agente');
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user && selectedRole !== user.role) {
      onSubmit(user.id, selectedRole);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('inmobiliaria.config.users.editRoleModal.title')}</DialogTitle>
          <DialogDescription>
            {user?.name && t('inmobiliaria.config.users.editRoleModal.description', { name: user.name })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('inmobiliaria.config.users.editRoleModal.currentRole')}</Label>
            <div className="flex items-center gap-2">
              <span className={cn('px-3 py-1.5 rounded-full text-sm font-medium', user && getRoleColor(user.role))}>
                {user && getRoleLabel(user.role)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-role">{t('inmobiliaria.config.users.editRoleModal.newRole')}</Label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AgencyRole)}>
              <SelectTrigger id="new-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t('inmobiliaria.config.users.admin')}</SelectItem>
                <SelectItem value="agente">{t('inmobiliaria.config.users.agent')}</SelectItem>
                <SelectItem value="contador">{t('inmobiliaria.config.users.accountant')}</SelectItem>
                <SelectItem value="viewer">{t('inmobiliaria.config.users.viewer')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('inmobiliaria.common.cancel')}
            </Button>
            <Button type="submit" disabled={!user || selectedRole === user?.role || isLoading}>
              {t('inmobiliaria.config.users.editRoleModal.saveChange')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Delete Confirmation Modal
// ============================================================================

interface DeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AgencyUser | null;
  onConfirm: (userId: string) => void;
  isLoading?: boolean;
}

function DeleteModal({ open, onOpenChange, user, onConfirm, isLoading }: DeleteModalProps) {
  const { t } = useI18n();

  const handleConfirm = () => {
    if (user) {
      onConfirm(user.id);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-danger">{t('inmobiliaria.config.users.deleteUser')}</DialogTitle>
          <DialogDescription>
            {t('inmobiliaria.config.users.deleteModal.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="p-4 rounded-md bg-danger-soft border border-danger/30">
            <p className="text-sm text-danger">
              {t('inmobiliaria.config.users.deleteModal.confirmMessage', { name: user?.name ?? '' })}
            </p>
            {user?.email && (
              <p className="text-sm text-danger mt-1">
                {user.email}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('inmobiliaria.common.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? t('inmobiliaria.config.users.deleteModal.deleting') : t('inmobiliaria.config.users.deleteUser')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ConfigUsuarios({
  users,
  onInvite,
  onUpdateRole,
  onToggleStatus,
  onResendInvite,
  onDelete,
  isLoading = false,
}: ConfigUsuariosProps) {
  const { t } = useI18n();

  // Filter state
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editRoleModalOpen, setEditRoleModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AgencyUser | null>(null);

  // Action menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !(user.name ?? '').toLowerCase().includes(searchLower) &&
          !(user.email ?? '').toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Role filter
      if (filterRole !== 'all' && user.role !== filterRole) {
        return false;
      }

      // Status filter
      if (filterStatus !== 'all' && user.status !== filterStatus) {
        return false;
      }

      return true;
    });
  }, [users, search, filterRole, filterStatus]);

  /**
   * Paginado de presentación: el equipo de una inmobiliaria grande pasa de una
   * pantalla. `resetKey` con los tres filtros — sin eso, filtrar desde la
   * página 3 deja la tabla vacía y se lee como «no hay usuarios».
   */
  const {
    pageItems,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(filteredUsers, {
    resetKey: `${search.trim()}|${filterRole}|${filterStatus}`,
  });

  // Count users by status
  const userCounts = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.status === 'active').length,
      invited: users.filter((u) => u.status === 'invited').length,
      inactive: users.filter((u) => u.status === 'inactive').length,
    };
  }, [users]);

  // Get initials for avatar fallback. Falls back to the email when a member
  // has no name yet (e.g. an invited member who has not completed onboarding).
  const getInitials = (name?: string, email?: string) => {
    const source = (name && name.trim()) || (email && email.trim()) || '';
    if (!source) return '?';
    return source
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  // Handle invite submit
  const handleInvite = async (invite: UserInvite) => {
    await onInvite?.(invite);
    // AgenteFormModal closes itself after successful submit
  };

  // Handle edit role
  const handleEditRole = (userId: string, role: AgencyRole) => {
    onUpdateRole?.(userId, role);
    setEditRoleModalOpen(false);
    setSelectedUser(null);
  };

  // Handle delete
  const handleDelete = (userId: string) => {
    onDelete?.(userId);
    setDeleteModalOpen(false);
    setSelectedUser(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-fg">
            {t('inmobiliaria.config.users.title')}
          </h2>
          <p className="text-sm text-fg-muted">
            {t('inmobiliaria.config.users.userCount', { total: userCounts.total, active: userCounts.active, invited: userCounts.invited })}
          </p>
        </div>
        <Button hideArrow onClick={() => setInviteModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('inmobiliaria.config.users.invite')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
          <Input
            type="search"
            placeholder={t('inmobiliaria.config.users.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Role Filter */}
        <Select value={filterRole} onValueChange={(v) => setFilterRole(v as FilterRole)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('inmobiliaria.config.users.allRoles')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('inmobiliaria.config.users.allRoles')}</SelectItem>
            <SelectItem value="admin">{t('inmobiliaria.config.users.admin')}</SelectItem>
            <SelectItem value="agente">{t('inmobiliaria.config.users.agent')}</SelectItem>
            <SelectItem value="contador">{t('inmobiliaria.config.users.accountant')}</SelectItem>
            <SelectItem value="viewer">{t('inmobiliaria.config.users.viewer')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('inmobiliaria.config.users.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('inmobiliaria.config.users.allStatuses')}</SelectItem>
            <SelectItem value="active">{t('inmobiliaria.config.users.active')}</SelectItem>
            <SelectItem value="invited">{t('inmobiliaria.config.users.invited')}</SelectItem>
            <SelectItem value="inactive">{t('inmobiliaria.config.users.inactive')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table className="w-full min-w-[800px]">
          <TableHeader>
            <TableRow className="border-b border-border-faint dark:border-border-strong">
              <TableHead className="text-left p-4">
                <span className="text-xs font-semibold text-fg-muted dark:text-fg-subtle uppercase tracking-wider">
                  {t('inmobiliaria.config.users.tableUser')}
                </span>
              </TableHead>
              <TableHead className="text-left p-4">
                <span className="text-xs font-semibold text-fg-muted dark:text-fg-subtle uppercase tracking-wider">
                  {t('inmobiliaria.config.users.role')}
                </span>
              </TableHead>
              <TableHead className="text-left p-4">
                <span className="text-xs font-semibold text-fg-muted dark:text-fg-subtle uppercase tracking-wider">
                  {t('inmobiliaria.config.users.status')}
                </span>
              </TableHead>
              <TableHead className="text-left p-4 hidden md:table-cell">
                <span className="text-xs font-semibold text-fg-muted dark:text-fg-subtle uppercase tracking-wider">
                  {t('inmobiliaria.config.users.lastAccess')}
                </span>
              </TableHead>
              <TableHead className="w-12 p-4"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {pageItems.map((user, index) => {
                const initials = getInitials(user.name, user.email);
                const roleColor = getRoleColor(user.role);
                const statusColor = getUserStatusColor(user.status);

                return (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-border hover:bg-muted/40 transition-colors"
                  >
                    {/* User Info */}
                    <TableCell className="p-4">
                      <div className="flex items-center gap-3">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                            roleColor.split(' ')[0] // Just the bg class
                          )}>
                            <span className={cn('text-sm font-semibold', roleColor.split(' ').slice(1).join(' '))}>
                              {initials}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-fg dark:text-white truncate max-w-[200px]">
                            {user.name?.trim() || user.email}
                          </p>
                          <div className="flex items-center gap-1.5 text-sm text-fg-muted dark:text-fg-subtle">
                            <EnvelopeSimple className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[180px]">{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-1.5 text-sm text-fg-muted dark:text-fg-subtle">
                              <Phone className="w-3.5 h-3.5 shrink-0" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Role */}
                    <TableCell className="p-4">
                      <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-medium', roleColor)}>
                        {getRoleLabel(user.role)}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="p-4">
                      <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-medium', statusColor)}>
                        {getUserStatusLabel(user.status)}
                      </span>
                    </TableCell>

                    {/* Last Login */}
                    <TableCell className="p-4 hidden md:table-cell">
                      {user.lastLoginAt ? (
                        <div className="flex items-center gap-1.5 text-sm text-fg-muted dark:text-fg-subtle">
                          <Clock className="w-4 h-4 text-fg-subtle shrink-0" />
                          <span>{formatRelativeTime(user.lastLoginAt)}</span>
                        </div>
                      ) : user.status === 'invited' && user.invitedAt ? (
                        <div className="flex items-center gap-1.5 text-sm text-warning">
                          <EnvelopeSimple className="w-4 h-4 shrink-0" />
                          <span>{t('inmobiliaria.config.users.invitedOn')} {formatRelativeTime(user.invitedAt)}</span>
                        </div>
                      ) : (
                        <span className="text-fg-subtle">-</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="p-4">
                      <DropdownList
                        open={openMenuId === user.id}
                        onOpenChange={(o) => setOpenMenuId(o ? user.id : null)}
                      >
                        <DropdownListTrigger asChild>
                          <IconButton
                            variant="ghost"
                            size="sm"
                            icon={<DotsThree className="w-5 h-5" weight="bold" />}
                            aria-label="Acciones"
                          />
                        </DropdownListTrigger>
                        <DropdownListContent align="end" className="w-48">
                          {/* Edit Role */}
                          <DropdownListItem
                            className="gap-3"
                            onClick={() => {
                              setSelectedUser(user);
                              setEditRoleModalOpen(true);
                            }}
                          >
                            <PencilSimple className="w-4 h-4" />
                            <span className="text-sm">{t('inmobiliaria.config.users.editRole')}</span>
                          </DropdownListItem>

                          {/* Resend Invite (if invited) */}
                          {user.status === 'invited' && (
                            <DropdownListItem
                              className="gap-3"
                              onClick={() => onResendInvite?.(user.id)}
                            >
                              <ArrowClockwise className="w-4 h-4" />
                              <span className="text-sm">{t('inmobiliaria.config.users.resendInvite')}</span>
                            </DropdownListItem>
                          )}

                          {/* Toggle Status */}
                          <DropdownListItem
                            className="gap-3"
                            onClick={() => onToggleStatus?.(user.id)}
                          >
                            {user.status === 'active' ? (
                              <>
                                <UserMinus className="w-4 h-4" />
                                <span className="text-sm">{t('inmobiliaria.config.users.deactivate')}</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-4 h-4" />
                                <span className="text-sm">{t('inmobiliaria.config.users.activate')}</span>
                              </>
                            )}
                          </DropdownListItem>

                          <DropdownListSeparator />

                          {/* Delete */}
                          <DropdownListItem
                            className="gap-3 text-danger focus:text-danger"
                            onClick={() => {
                              setSelectedUser(user);
                              setDeleteModalOpen(true);
                            }}
                          >
                            <Trash className="w-4 h-4" />
                            <span className="text-sm">{t('inmobiliaria.common.delete')}</span>
                          </DropdownListItem>
                        </DropdownListContent>
                      </DropdownList>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </TableBody>
        </Table>

        {/* Pie: sólo si hay más de una página. */}
        {shouldPaginate && (
          <div className="border-t border-border px-4 py-3">
            <TablePagination
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}

        {/* Empty State */}
        {filteredUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface-muted flex items-center justify-center">
              <Users className="w-6 h-6 text-fg-muted" weight="duotone" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-fg">
                {t('inmobiliaria.config.users.noUsersFound')}
              </h3>
              <p className="max-w-sm text-sm text-fg-muted">
                {search || filterRole !== 'all' || filterStatus !== 'all'
                  ? t('inmobiliaria.config.users.adjustFilters')
                  : t('inmobiliaria.config.users.inviteFirst')}
              </p>
            </div>
            {!search && filterRole === 'all' && filterStatus === 'all' && (
              <Button hideArrow className="mt-1" onClick={() => setInviteModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('inmobiliaria.config.users.invite')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AgenteFormModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onSubmit={handleInvite}
        variant="member"
        isLoading={isLoading}
      />

      <EditRoleModal
        open={editRoleModalOpen}
        onOpenChange={setEditRoleModalOpen}
        user={selectedUser}
        onSubmit={handleEditRole}
        isLoading={isLoading}
      />

      <DeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        user={selectedUser}
        onConfirm={handleDelete}
        isLoading={isLoading}
      />
    </div>
  );
}

export default ConfigUsuarios;
