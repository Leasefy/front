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
  PaperPlaneTilt,
  X,
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  AgencyUser,
  AgencyRole,
  AgenteRole,
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
// Invite Modal Component
// ============================================================================

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (invite: UserInvite) => void;
  isLoading?: boolean;
}

function InviteModal({ open, onOpenChange, onSubmit, isLoading }: InviteModalProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<AgencyRole>('agente');
  const [position, setPosition] = useState('');
  const [message, setMessage] = useState('');
  // Agent-specific fields (shown when role === 'agente')
  const [phone, setPhone] = useState('');
  const [zone, setZone] = useState('');
  const [specialization, setSpecialization] = useState<'residential' | 'commercial' | 'both'>('residential');
  const [commissionSplit, setCommissionSplit] = useState(50);
  const [agentRole, setAgentRole] = useState<AgenteRole>('agent');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && name && role) {
      const invite: UserInvite = {
        email,
        name,
        role,
        position: position.trim() || undefined,
        message: message || undefined,
      };
      // Attach agent-specific fields when role is agente (backend expects UPPERCASE enums)
      if (role === 'agente') {
        invite.phone = phone || undefined;
        invite.zone = zone || undefined;
        invite.specialization = specialization.toUpperCase() as UserInvite['specialization'];
        invite.commissionSplit = commissionSplit;
        invite.agentRole = agentRole.toUpperCase() as UserInvite['agentRole'];
      }
      onSubmit(invite);
      // Reset form
      setEmail('');
      setName('');
      setRole('agente');
      setPosition('');
      setMessage('');
      setPhone('');
      setZone('');
      setSpecialization('residential');
      setCommissionSplit(50);
      setAgentRole('agent');
    }
  };

  const isValid = email.includes('@') && name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('inmobiliaria.config.users.inviteModal.title')}</DialogTitle>
          <DialogDescription>
            {t('inmobiliaria.config.users.inviteModal.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto overscroll-contain pr-1">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">{t('inmobiliaria.config.users.inviteModal.emailLabel')} *</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('inmobiliaria.config.users.inviteModal.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{t('inmobiliaria.config.users.inviteModal.nameLabel')} *</Label>
            <Input
              id="name"
              placeholder={t('inmobiliaria.config.users.inviteModal.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">{t('inmobiliaria.config.users.inviteModal.roleLabel')} *</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AgencyRole)}>
              <SelectTrigger id="role">
                <SelectValue placeholder={t('inmobiliaria.config.users.inviteModal.selectRole')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t('inmobiliaria.config.users.admin')}</SelectItem>
                <SelectItem value="agente">{t('inmobiliaria.config.users.agent')}</SelectItem>
                <SelectItem value="contador">{t('inmobiliaria.config.users.accountant')}</SelectItem>
                <SelectItem value="viewer">{t('inmobiliaria.config.users.viewer')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Position / Cargo (optional) */}
          <div className="space-y-2">
            <Label htmlFor="position">Cargo</Label>
            <Input
              id="position"
              placeholder="Ej: Agente Senior, Administrador General"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Agent-specific fields — conditionally shown */}
          {role === 'agente' && (
            <div className="space-y-4 pt-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Datos del agente</p>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="invite-phone">Teléfono</Label>
                <Input
                  id="invite-phone"
                  type="tel"
                  placeholder="+57 300 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* Agent business role */}
              <div className="space-y-2">
                <Label>Rol operativo</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'agent' as AgenteRole, label: 'Agente', desc: 'Ventas/arriendos' },
                    { value: 'coordinator' as AgenteRole, label: 'Coordinador', desc: 'Supervisa equipo' },
                    { value: 'director' as AgenteRole, label: 'Director', desc: 'Director agencia' },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAgentRole(opt.value)}
                      className={cn(
                        'p-2.5 rounded-xl border text-center transition-all text-xs',
                        agentRole === opt.value
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-border hover:bg-muted'
                      )}
                    >
                      <p className={cn('font-medium', agentRole === opt.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-foreground')}>{opt.label}</p>
                      <p className="text-muted-foreground mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Zone + Specialization */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="invite-zone">Zona</Label>
                  <Select value={zone} onValueChange={setZone}>
                    <SelectTrigger id="invite-zone">
                      <SelectValue placeholder="Seleccionar zona" />
                    </SelectTrigger>
                    <SelectContent>
                      {['Norte', 'Sur', 'Este', 'Oeste', 'Centro', 'Chapinero', 'Usaquen', 'Suba', 'Kennedy', 'Fontibon'].map((z) => (
                        <SelectItem key={z} value={z}>{z}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-spec">Especialización</Label>
                  <Select value={specialization} onValueChange={(v) => setSpecialization(v as 'residential' | 'commercial' | 'both')}>
                    <SelectTrigger id="invite-spec">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residencial</SelectItem>
                      <SelectItem value="commercial">Comercial</SelectItem>
                      <SelectItem value="both">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Commission */}
              <div className="space-y-2">
                <Label>Comisión ({commissionSplit}%)</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={commissionSplit}
                    onChange={(e) => setCommissionSplit(Number(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-full appearance-none cursor-pointer accent-indigo-500"
                  />
                  <span className="text-sm font-medium text-foreground w-10 text-right">{commissionSplit}%</span>
                </div>
                <p className="text-xs text-muted-foreground">Porcentaje de la comisión de la agencia</p>
              </div>
            </div>
          )}

          {/* Custom Message (optional) */}
          <div className="space-y-2">
            <Label htmlFor="message">{t('inmobiliaria.config.users.inviteModal.customMessage')}</Label>
            <Textarea
              id="message"
              placeholder={t('inmobiliaria.config.users.inviteModal.messagePlaceholder')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('inmobiliaria.common.cancel')}
            </Button>
            <Button type="submit" disabled={!isValid || isLoading}>
              {isLoading ? (
                <>
                  <ArrowClockwise className="w-4 h-4 mr-2 animate-spin" />
                  {t('inmobiliaria.config.users.inviteModal.sending')}
                </>
              ) : (
                <>
                  <PaperPlaneTilt className="w-4 h-4 mr-2" />
                  {t('inmobiliaria.config.users.inviteModal.send')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
    if (user) setSelectedRole(user.role);
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
          <DialogTitle className="text-red-600 dark:text-red-400">{t('inmobiliaria.config.users.deleteUser')}</DialogTitle>
          <DialogDescription>
            {t('inmobiliaria.config.users.deleteModal.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">
              {t('inmobiliaria.config.users.deleteModal.confirmMessage', { name: user?.name ?? '' })}
            </p>
            {user?.email && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
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
          !user.name.toLowerCase().includes(searchLower) &&
          !user.email.toLowerCase().includes(searchLower)
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

  // Count users by status
  const userCounts = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.status === 'active').length,
      invited: users.filter((u) => u.status === 'invited').length,
      inactive: users.filter((u) => u.status === 'inactive').length,
    };
  }, [users]);

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
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
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            {t('inmobiliaria.config.users.title')}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {t('inmobiliaria.config.users.userCount', { total: userCounts.total, active: userCounts.active, invited: userCounts.invited })}
          </p>
        </div>
        <Button onClick={() => setInviteModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('inmobiliaria.config.users.invite')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
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
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-neutral-100 dark:border-neutral-800">
              <th className="text-left p-4">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  {t('inmobiliaria.config.users.tableUser')}
                </span>
              </th>
              <th className="text-left p-4">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  {t('inmobiliaria.config.users.role')}
                </span>
              </th>
              <th className="text-left p-4">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  {t('inmobiliaria.config.users.status')}
                </span>
              </th>
              <th className="text-left p-4 hidden md:table-cell">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  {t('inmobiliaria.config.users.lastAccess')}
                </span>
              </th>
              <th className="w-12 p-4"></th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {filteredUsers.map((user, index) => {
                const initials = getInitials(user.name);
                const roleColor = getRoleColor(user.role);
                const statusColor = getUserStatusColor(user.status);

                return (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-neutral-50 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-[#141416] transition-colors"
                  >
                    {/* User Info */}
                    <td className="p-4">
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
                          <p className="font-medium text-neutral-900 dark:text-white truncate max-w-[200px]">
                            {user.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                            <EnvelopeSimple className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[180px]">{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                              <Phone className="w-3.5 h-3.5 shrink-0" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="p-4">
                      <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-medium', roleColor)}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-medium', statusColor)}>
                        {getUserStatusLabel(user.status)}
                      </span>
                    </td>

                    {/* Last Login */}
                    <td className="p-4 hidden md:table-cell">
                      {user.lastLoginAt ? (
                        <div className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
                          <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
                          <span>{formatRelativeTime(user.lastLoginAt)}</span>
                        </div>
                      ) : user.status === 'invited' && user.invitedAt ? (
                        <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                          <EnvelopeSimple className="w-4 h-4 shrink-0" />
                          <span>{t('inmobiliaria.config.users.invitedOn')} {formatRelativeTime(user.invitedAt)}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                        >
                          <DotsThree className="w-5 h-5 text-neutral-500" weight="bold" />
                        </button>

                        <AnimatePresence>
                          {openMenuId === user.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-0 top-full mt-1 w-48 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-10"
                            >
                              {/* Edit Role */}
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditRoleModalOpen(true);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                              >
                                <PencilSimple className="w-4 h-4" />
                                <span className="text-sm">{t('inmobiliaria.config.users.editRole')}</span>
                              </button>

                              {/* Resend Invite (if invited) */}
                              {user.status === 'invited' && (
                                <button
                                  onClick={() => {
                                    onResendInvite?.(user.id);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                                >
                                  <ArrowClockwise className="w-4 h-4" />
                                  <span className="text-sm">{t('inmobiliaria.config.users.resendInvite')}</span>
                                </button>
                              )}

                              {/* Toggle Status */}
                              <button
                                onClick={() => {
                                  onToggleStatus?.(user.id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
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
                              </button>

                              {/* Divider */}
                              <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

                              {/* Delete */}
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setDeleteModalOpen(true);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <Trash className="w-4 h-4" />
                                <span className="text-sm">{t('inmobiliaria.common.delete')}</span>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>

        {/* Empty State */}
        {filteredUsers.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <Users className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
              {t('inmobiliaria.config.users.noUsersFound')}
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 mb-4">
              {search || filterRole !== 'all' || filterStatus !== 'all'
                ? t('inmobiliaria.config.users.adjustFilters')
                : t('inmobiliaria.config.users.inviteFirst')}
            </p>
            {!search && filterRole === 'all' && filterStatus === 'all' && (
              <Button onClick={() => setInviteModalOpen(true)}>
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

      {/* Click outside to close menu */}
      {openMenuId && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setOpenMenuId(null)}
        />
      )}
    </div>
  );
}

export default ConfigUsuarios;
