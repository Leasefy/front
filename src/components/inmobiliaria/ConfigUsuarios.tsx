'use client';

import { ANCHO_DEL_MENU_DE_ACCIONES } from '@/components/ui/ancho-del-menu-de-acciones';
import { useEffect, useMemo, useState } from 'react';
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
  IdentificationCard,
  Phone,
  Clock,
  Users,
  ShieldCheck,
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
  DialogSection,
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
  TableBodyAnimado,
  TableHead,
  TableRow,
  TableRowAnimada,
  TableCell,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { SinDatos } from '@/components/estado/SinDatos';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListSeparator,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu';
import { IconButton, Avatar, StatusBadge, type SemanticTone } from '@leasefy/cadence';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { useTr } from '@/lib/i18n/use-tr';
import type {
  AgencyUser,
  AgencyRole,
  UserInvite,
} from '@/lib/types/inmobiliaria';
import {
  getRoleLabel,
  ROLES_DEL_SISTEMA,
  getUserStatusLabel,
} from '@/lib/types/inmobiliaria';
import { formatRelativeTime } from '@/lib/format';
import { AgenteFormModal } from './AgenteFormModal';

// ============================================================================
// Types
// ============================================================================

interface ConfigUsuariosProps {
  users: AgencyUser[];
  /** Sin este handler no se dibuja el botón de invitar: no hay a dónde mandar la invitación. */
  onInvite?: (invite: UserInvite) => void | Promise<void>;
  onUpdateRole?: (userId: string, role: AgencyRole) => void;
  onToggleStatus?: (userId: string) => void;
  onResendInvite?: (userId: string) => void;
  onDelete?: (userId: string) => void;
  /** Abrir la ficha de la persona. Sin esto, la fila no es clickeable. */
  onVerFicha?: (user: AgencyUser) => void;
  /**
   * 🔴 22-09 noche · «Permisos de esta persona». Siempre se ofrece; si quien
   * mira no puede administrar el equipo, sale APAGADO con `permisosApagadoPorque`.
   */
  onPermisos?: (user: AgencyUser) => void;
  permisosApagadoPorque?: string | null;
  /** `?invitar=1`: abre el formulario apenas se puede. */
  abrirInvitacion?: boolean;
  isLoading?: boolean;
}

type FilterRole = AgencyRole | 'all';
type FilterStatus = AgencyUser['status'] | 'all';

/** El estado de una persona con su punto: activo en verde, la invitación abierta en ámbar. */
const TONO_DEL_ESTADO: Record<AgencyUser['status'], SemanticTone> = {
  active: 'success',
  invited: 'warning',
  inactive: 'neutral',
};

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
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t('inmobiliaria.config.users.editRoleModal.title')}</DialogTitle>
          <DialogDescription>
            {user?.name && t('inmobiliaria.config.users.editRoleModal.description', { name: user.name })}
          </DialogDescription>
        </DialogHeader>

        {/* El pie va FUERA del <form> (hijo directo del Content, para que quede
            fijo abajo); el botón de guardar lo envía con `form=`. */}
        <form id="form-editar-rol" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('inmobiliaria.config.users.editRoleModal.currentRole')}</Label>
            <p className="text-body text-fg">{user && getRoleLabel(user.role)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-role">{t('inmobiliaria.config.users.editRoleModal.newRole')}</Label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AgencyRole)}>
              <SelectTrigger id="new-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* Los SIETE roles del back, con el nombre de la tabla (QA 22-09:
                    ofrecía cuatro, con otros nombres). */}
                {ROLES_DEL_SISTEMA.map((rol) => (
                  <SelectItem key={rol} value={rol}>
                    {getRoleLabel(rol)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('inmobiliaria.common.cancel')}
          </Button>
          <Button
            type="submit"
            form="form-editar-rol"
            disabled={!user || selectedRole === user?.role || isLoading}
          >
            {t('inmobiliaria.config.users.editRoleModal.saveChange')}
          </Button>
        </DialogFooter>
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
      {/* Destructiva: el back NO borra a la persona (`removeMember` la marca
          REMOVED): pierde el acceso a esta inmobiliaria y sale de la lista; su
          cuenta y lo que hizo quedan, y se la puede volver a invitar. */}
      <DialogContent size="sm" variant="destructive" icon={<UserMinus weight="bold" />}>
        <DialogHeader>
          <DialogTitle>{t('inmobiliaria.config.users.deleteUser')}</DialogTitle>
          <DialogDescription>
            {t('inmobiliaria.config.users.deleteModal.confirmMessage', { name: user?.name ?? '' })}{' '}
            {t('inmobiliaria.config.users.deleteModal.description')}
          </DialogDescription>
        </DialogHeader>

        {user && (
          <DialogSection>
            <p className="text-sm font-medium text-fg">{user.name}</p>
            {user.email && <p className="text-sm text-fg-muted">{user.email}</p>}
          </DialogSection>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('inmobiliaria.common.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            {t('inmobiliaria.config.users.deleteUser')}
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
  onVerFicha,
  onPermisos,
  permisosApagadoPorque = null,
  abrirInvitacion = false,
  isLoading = false,
}: ConfigUsuariosProps) {
  const { t } = useI18n();
  const tr = useTr();

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

  // `?invitar=1` llega después del primer render (el padre lo lee de la URL).
  useEffect(() => {
    if (abrirInvitacion) setInviteModalOpen(true);
  }, [abrirInvitacion]);

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

  /** El vacío no dice lo mismo con un filtro puesto que sin ninguno. */
  const hayFiltros = search.trim() !== '' || filterRole !== 'all' || filterStatus !== 'all';

  // Count users by status
  const userCounts = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.status === 'active').length,
      invited: users.filter((u) => u.status === 'invited').length,
      inactive: users.filter((u) => u.status === 'inactive').length,
    };
  }, [users]);
  const todosActivos = userCounts.total > 1 && userCounts.active === userCounts.total;


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
      {/* Glow up 22-10: cuántos hay de cada estado lo dicen las pestañas de la
          tarjeta (antes, además, una frase arriba y un selector de estado: lo
          mismo tres veces). Arriba queda la búsqueda, el rol y la ÚNICA puerta
          para sumar a alguien. El título lo pone el marco de Configuración. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
          <Input
            type="search"
            placeholder={t('inmobiliaria.config.users.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterRole} onValueChange={(v) => setFilterRole(v as FilterRole)}>
          <SelectTrigger className="sm:w-[180px]" aria-label={t('inmobiliaria.config.users.role')}>
            <SelectValue placeholder={t('inmobiliaria.config.users.allRoles')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('inmobiliaria.config.users.allRoles')}</SelectItem>
            {ROLES_DEL_SISTEMA.map((rol) => (
              <SelectItem key={rol} value={rol}>
                {getRoleLabel(rol)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {onInvite && (
          <Button hideArrow size="sm" className="sm:ml-auto" onClick={() => setInviteModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('inmobiliaria.config.users.invite')}
          </Button>
        )}
      </div>

      {/* La tabla sola dentro de la tarjeta, sin título encima (estándar del
          panel). El vacío vive dentro del <TableBody> para que se sigan viendo
          los encabezados. */}
      <section className="rounded-lg border border-border bg-surface overflow-hidden">
        {/* Las pestañas de estado con su conteo, DENTRO de la tarjeta (como Deuda del mes). */}
        <div className="border-b border-border px-4 py-2.5">
          <PestanasDeEstado<FilterStatus>
            etiqueta={tr('Estado de las personas')}
            valor={filterStatus}
            onCambio={setFilterStatus}
            data-testid="equipo-estados"
            pestanas={[
              { valor: 'all', etiqueta: tr('Todos'), cuantos: userCounts.total, fija: true },
              // Revisora r25: con nadie inactivo ni invitado, «Activos» repetía «Todos».
              ...(todosActivos && filterStatus !== 'active'
                ? []
                : [{ valor: 'active' as FilterStatus, etiqueta: tr('Activos'), cuantos: userCounts.active, fija: true }]),
              { valor: 'invited', etiqueta: tr('Invitaciones abiertas'), cuantos: userCounts.invited, tono: 'aviso' },
              { valor: 'inactive', etiqueta: tr('Inactivos'), cuantos: userCounts.inactive },
            ]}
          />
        </div>
        <div className="md:overflow-x-auto">
        {/* En el celular cada persona es una tarjeta (patrón de Deuda del mes). */}
        <Table className="w-full md:min-w-[800px] max-md:block">
          <TableHeader className="max-md:hidden">
            <TableRow className="border-b border-border-faint dark:border-border-strong">
              <TableHead className="text-left p-4">
                <span>
                  {t('inmobiliaria.config.users.tableUser')}
                </span>
              </TableHead>
              <TableHead className="text-left p-4">
                <span>
                  {t('inmobiliaria.config.users.role')}
                </span>
              </TableHead>
              {todosActivos ? null : (
                <TableHead className="text-left p-4">
                  <span>
                    {t('inmobiliaria.config.users.status')}
                  </span>
                </TableHead>
              )}
              <TableHead className="text-left p-4 hidden md:table-cell">
                <span>
                  {t('inmobiliaria.config.users.lastAccess')}
                </span>
              </TableHead>
              <TableHead className="w-12 p-4"></TableHead>
            </TableRow>
          </TableHeader>
          {/* Las filas entran escalonadas (techo del sistema) y salen al
              filtrar, buscar o cambiar de página; el vacío entra solo (su
              `SinDatos` ya trae la entrada). */}
          <TableBodyAnimado className="max-md:block">
            {pageItems.length === 0 && (
              <TableRow key="sin-miembros" className="max-md:block">
                <TableCell colSpan={todosActivos ? 4 : 5} className="p-0 max-md:block">
                  <SinDatos
                    hayFiltros={hayFiltros}
                    queSon="miembros"
                    icono={Users}
                    titulo={t('inmobiliaria.config.users.noUsersFound')}
                    descripcion={t('inmobiliaria.config.users.inviteFirst')}
                    crear={
                      onInvite
                        ? { label: t('inmobiliaria.config.users.invite'), onClick: () => setInviteModalOpen(true) }
                        : undefined
                    }
                    onLimpiarFiltros={() => {
                      setSearch('');
                      setFilterRole('all');
                      setFilterStatus('all');
                    }}
                  />
                </TableCell>
              </TableRow>
            )}
              {pageItems.map((user) => {
                return (
                  <TableRowAnimada
                    key={user.id}
                    className={cn(
                      'border-b border-border hover:bg-muted/40 transition-colors last:border-b',
                      'max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-2 max-md:px-4 max-md:py-4 max-md:last:border-0',
                      onVerFicha && 'cursor-pointer',
                    )}
                    tabIndex={onVerFicha ? 0 : undefined}
                    onClick={onVerFicha ? () => onVerFicha(user) : undefined}
                    onKeyDown={
                      onVerFicha
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onVerFicha(user);
                            }
                          }
                        : undefined
                    }
                  >
                    {/* User Info */}
                    <TableCell className="p-4 max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name || user.email || '?'} src={user.avatar || undefined} size="md" />
                        <div className="min-w-0">
                          <p className="font-medium text-fg truncate max-w-[200px] max-md:max-w-none">
                            {user.name?.trim() || user.email}
                          </p>
                          <div className="flex items-center gap-1.5 text-sm text-fg-muted dark:text-fg-subtle">
                            <EnvelopeSimple className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[180px] max-md:max-w-none">{user.email}</span>
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

                    {/* Rol: es un dato, no un estado (sin pastilla de color). */}
                    <TableCell className="p-4 text-body-sm text-fg max-md:col-start-1 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-fg-muted">
                      {getRoleLabel(user.role)}
                    </TableCell>

                    {/* Estado: con su punto (StatusBadge). Con todos activos, «● Activo» en
                        cada fila no informa (revisora r25): la columna no sale. */}
                    {todosActivos ? null : (
                      <TableCell className="p-4 max-md:col-start-2 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-right">
                        <StatusBadge tone={(user.status && TONO_DEL_ESTADO[user.status]) || 'neutral'}>
                          {getUserStatusLabel(user.status)}
                        </StatusBadge>
                      </TableCell>
                    )}

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

                    {/* Actions — el menú no debe abrir además la ficha. */}
                    <TableCell
                      className="p-4 max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0 max-md:text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
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
                        <DropdownListContent align="end" className={ANCHO_DEL_MENU_DE_ACCIONES}>
                          {/* Ver ficha */}
                          {onVerFicha && (
                            <DropdownListItem className="gap-3" onClick={() => onVerFicha(user)}>
                              <IdentificationCard className="w-4 h-4" />
                              <span className="text-sm">Ver ficha</span>
                            </DropdownListItem>
                          )}

                          {/* Cada acción aparece sólo si alguien la atiende: sin permiso
                              para administrar el equipo, el padre no las pasa y ofrecerlas
                              era mandar a la persona a un 403. */}
                          {onUpdateRole && (
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
                          )}

                          {/* Permisos de esta persona: apagado con el porqué, nunca un 403. */}
                          {onPermisos && (() => {
                            const porque =
                              user.role === 'admin'
                                ? 'Un administrador tiene todos los permisos.'
                                : permisosApagadoPorque;
                            return (
                              <DropdownListItem
                                className="gap-3"
                                disabled={!!porque}
                                onClick={() => !porque && onPermisos(user)}
                                data-testid={`permisos-de-${user.id}`}
                              >
                                <ShieldCheck className="w-4 h-4 shrink-0" />
                                <span className="flex flex-col">
                                  <span className="text-sm">Permisos de esta persona</span>
                                  {porque ? (
                                    <span className="text-caption text-fg-muted">{porque}</span>
                                  ) : null}
                                </span>
                              </DropdownListItem>
                            );
                          })()}

                          {/* Resend Invite (if invited) */}
                          {user.status === 'invited' && onResendInvite && (
                            <DropdownListItem
                              className="gap-3"
                              onClick={() => onResendInvite(user.id)}
                            >
                              <ArrowClockwise className="w-4 h-4" />
                              <span className="text-sm">{t('inmobiliaria.config.users.resendInvite')}</span>
                            </DropdownListItem>
                          )}

                          {/* Toggle Status */}
                          {onToggleStatus && (
                            <DropdownListItem
                              className="gap-3"
                              onClick={() => onToggleStatus(user.id)}
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
                          )}

                          {/* Delete */}
                          {onDelete && (
                            <>
                              <DropdownListSeparator />
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
                            </>
                          )}
                        </DropdownListContent>
                      </DropdownList>
                    </TableCell>
                  </TableRowAnimada>
                );
              })}
          </TableBodyAnimado>
        </Table>
        </div>

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
      </section>

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
