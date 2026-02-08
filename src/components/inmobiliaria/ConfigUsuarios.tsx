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
  UserInvite,
} from '@/lib/types/inmobiliaria';
import {
  getRoleLabel,
  getRoleColor,
  getUserStatusColor,
  getUserStatusLabel,
} from '@/lib/types/inmobiliaria';
import { formatRelativeTime } from '@/lib/format';

// ============================================================================
// Types
// ============================================================================

interface ConfigUsuariosProps {
  users: AgencyUser[];
  onInvite?: (invite: UserInvite) => void;
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
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<AgencyRole>('agente');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && name && role) {
      onSubmit({ email, name, role, message: message || undefined });
      // Reset form
      setEmail('');
      setName('');
      setRole('agente');
      setMessage('');
    }
  };

  const isValid = email.includes('@') && name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar Usuario</DialogTitle>
          <DialogDescription>
            Enviar una invitacion por correo para unirse al equipo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Correo electronico *</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo *</Label>
            <Input
              id="name"
              placeholder="Juan Perez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Rol *</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AgencyRole)}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="agente">Agente</SelectItem>
                <SelectItem value="contador">Contador</SelectItem>
                <SelectItem value="viewer">Solo Lectura</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Message (optional) */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensaje personalizado (opcional)</Label>
            <Textarea
              id="message"
              placeholder="Hola, te invitamos a unirte a nuestro equipo..."
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
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isLoading}>
              {isLoading ? (
                <>
                  <ArrowClockwise className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <PaperPlaneTilt className="w-4 h-4 mr-2" />
                  Enviar invitacion
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
          <DialogTitle>Cambiar Rol</DialogTitle>
          <DialogDescription>
            {user?.name && `Cambiar el rol de ${user.name}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Rol actual</Label>
            <div className="flex items-center gap-2">
              <span className={cn('px-3 py-1.5 rounded-full text-sm font-medium', user && getRoleColor(user.role))}>
                {user && getRoleLabel(user.role)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-role">Nuevo rol</Label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AgencyRole)}>
              <SelectTrigger id="new-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="agente">Agente</SelectItem>
                <SelectItem value="contador">Contador</SelectItem>
                <SelectItem value="viewer">Solo Lectura</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!user || selectedRole === user?.role || isLoading}>
              Guardar cambio
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
          <DialogTitle className="text-red-600 dark:text-red-400">Eliminar Usuario</DialogTitle>
          <DialogDescription>
            Esta accion no se puede deshacer. El usuario perdera acceso permanentemente.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">
              Estas seguro que deseas eliminar a <strong>{user?.name}</strong>?
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
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Eliminando...' : 'Eliminar usuario'}
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
  const handleInvite = (invite: UserInvite) => {
    onInvite?.(invite);
    setInviteModalOpen(false);
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
            Equipo
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {userCounts.total} usuarios ({userCounts.active} activos, {userCounts.invited} invitados)
          </p>
        </div>
        <Button onClick={() => setInviteModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Invitar Usuario
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            type="search"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Role Filter */}
        <Select value={filterRole} onValueChange={(v) => setFilterRole(v as FilterRole)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos los roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="agente">Agente</SelectItem>
            <SelectItem value="contador">Contador</SelectItem>
            <SelectItem value="viewer">Solo Lectura</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="invited">Invitados</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
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
                  Usuario
                </span>
              </th>
              <th className="text-left p-4">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Rol
                </span>
              </th>
              <th className="text-left p-4">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Estado
                </span>
              </th>
              <th className="text-left p-4 hidden md:table-cell">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Ultimo acceso
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
                          <span>Invitado {formatRelativeTime(user.invitedAt)}</span>
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
                                <span className="text-sm">Editar rol</span>
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
                                  <span className="text-sm">Reenviar invitacion</span>
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
                                    <span className="text-sm">Desactivar</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-4 h-4" />
                                    <span className="text-sm">Reactivar</span>
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
                                <span className="text-sm">Eliminar</span>
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
              No se encontraron usuarios
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 mb-4">
              {search || filterRole !== 'all' || filterStatus !== 'all'
                ? 'Ajusta los filtros de busqueda'
                : 'Invita al primer miembro del equipo'}
            </p>
            {!search && filterRole === 'all' && filterStatus === 'all' && (
              <Button onClick={() => setInviteModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Invitar Usuario
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <InviteModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        onSubmit={handleInvite}
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
