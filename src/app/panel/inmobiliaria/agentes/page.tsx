'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Users,
  SquaresFour,
  List,
  Plus,
  CheckCircle,
  ChartLineUp,
  CurrencyDollar,
  Trophy,
  ChartBar,
  UsersThree,
} from '@phosphor-icons/react';
import { Button, Pagination } from '@/components/ui';
import { EmptyState as DSEmptyState } from '@/components/ui/empty-state';
import { SegmentedControl } from '@leasefy/cadence';
import { useEquipo } from '@/lib/hooks/useInmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { AgenteCard } from '@/components/inmobiliaria/AgenteCard';
import { AgenteTable } from '@/components/inmobiliaria/AgenteTable';
import { AgenteFilters, AgenteFiltersState } from '@/components/inmobiliaria/AgenteFilters';
import { AgenteLeaderboard } from '@/components/inmobiliaria/AgenteLeaderboard';
import { AgenteWorkloadChart } from '@/components/inmobiliaria/AgenteWorkloadChart';
import { AgenteFormModal } from '@/components/inmobiliaria/AgenteFormModal';
import { agencyApi, inmobiliariaConfigApi } from '@/lib/api/inmobiliaria.service';
import type { AgencyInviteResult, UserInvite } from '@/lib/types/inmobiliaria';

type ViewMode = 'grid' | 'table';
type TabType = 'equipo' | 'ranking' | 'workload';

const ITEMS_PER_PAGE = 6;

/**
 * Agentes Page - Main view for managing all real estate agents
 * Route: /panel/inmobiliaria/agentes
 */
function AgentesContent() {
  const { t } = useI18n();
  const router = useRouter();
  // `useEquipo` = agentes activos + invitaciones pendientes. `useAgentes` solo
  // no alcanza: `GET /agentes` filtra ACTIVE y con usuario vinculado, así que
  // el agente que acabás de invitar no sale ahí ni recargando (ver el hook).
  const {
    agentes: allAgentes,
    invitacionesCaidas,
    refetch: recargarEquipo,
  } = useEquipo();
  const { canAccess } = usePermissions();

  const TABS: { id: TabType; label: string; icon: React.ElementType }[] = useMemo(() => [
    { id: 'equipo', label: t('inmobiliaria.agentes.tabs.team'), icon: UsersThree },
    { id: 'ranking', label: t('inmobiliaria.agentes.leaderboard'), icon: Trophy },
    { id: 'workload', label: t('inmobiliaria.agentes.tabs.workload'), icon: ChartBar },
  ], [t]);
  const [activeTab, setTab] = useState<TabType>('equipo');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<AgenteFiltersState>({
    search: '',
    role: 'all',
    status: 'all',
    sortBy: 'name',
  });
  const [showAddModal, setShowAddModal] = useState(false);

  // Filter agentes
  const filteredAgentes = useMemo(() => {
    let result = [...allAgentes];

    // Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.email.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (filters.role !== 'all') {
      result = result.filter((a) => a.role === filters.role);
    }

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter((a) => a.status === filters.status);
    }

    // Sort
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'closedThisMonth':
          return b.metrics.closedThisMonth - a.metrics.closedThisMonth;
        case 'commissionsThisMonth':
          return b.metrics.commissionsThisMonth - a.metrics.commissionsThisMonth;
        default:
          return 0;
      }
    });

    return result;
  }, [filters, allAgentes]);

  // Calculate stats from all agentes (not filtered)
  const stats = useMemo(() => {
    const total = allAgentes.length;
    const active = allAgentes.filter((a) => a.status === 'active').length;
    const invitados = allAgentes.filter((a) => a.status === 'invited').length;
    const closedThisMonth = allAgentes.reduce((sum, a) => sum + a.metrics.closedThisMonth, 0);
    const commissionsThisMonth = allAgentes.reduce((sum, a) => sum + a.metrics.commissionsThisMonth, 0);

    return { total, active, invitados, closedThisMonth, commissionsThisMonth };
  }, [allAgentes]);

  // Pagination
  const totalPages = Math.ceil(filteredAgentes.length / ITEMS_PER_PAGE);
  const paginatedAgentes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredAgentes.slice(start, end);
  }, [filteredAgentes, currentPage]);

  // Reset page when filters change
  const handleFiltersChange = useCallback((newFilters: AgenteFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  // Handlers
  // Una invitación pendiente no tiene ficha: `GET /agentes/:id` sólo encuentra
  // miembros ACTIVE, así que abrirla daría un 404. En vez de mandar a una
  // pantalla rota, se dice qué falta.
  const handleView = useCallback((agente: typeof allAgentes[0]) => {
    if (agente.status === 'invited') {
      toast.info('Todavía no aceptó la invitación', {
        description: `${agente.email} va a tener ficha cuando cree su cuenta y entre.`,
      });
      return;
    }
    router.push(`/panel/inmobiliaria/agentes/${agente.id}`);
  }, [router]);

  const handleEdit = useCallback((agente: typeof allAgentes[0]) => {
    toast.info(t('inmobiliaria.agentes.toasts.editTitle', { name: agente.name }), {
      description: t('inmobiliaria.agentes.toasts.editDesc'),
    });
  }, [t]);

  const handleNuevoAgente = useCallback(() => {
    setShowAddModal(true);
  }, []);

  /*
   * Cuando el correo no sale, la invitación igual quedó creada — lo que falta
   * es que la persona reciba el enlace. Sin una salida, el admin queda mirando
   * un aviso que no puede resolver: reintentar manda el mismo correo por el
   * mismo camino roto.
   *
   * El enlace es el mismo que manda el correo. `/invitacion/:token` sirve para
   * los dos casos (si no tiene cuenta, esa pantalla lo lleva a /registro).
   */
  const copiarEnlaceDeInvitacion = useCallback(async (token: string, email: string) => {
    const enlace = `${window.location.origin}/invitacion/${token}`;
    try {
      await navigator.clipboard.writeText(enlace);
      toast.success('Enlace copiado', {
        description: `Pasáselo a ${email} por donde puedas. Vence en 7 días.`,
      });
    } catch {
      // Sin permiso de portapapeles el enlace se muestra para copiarlo a mano:
      // dejarlo en un toast que no se puede copiar sería no dar salida.
      toast.info('Copialo a mano', { description: enlace, duration: 30000 });
    }
  }, []);

  const avisoDeCorreoNoEnviado = useCallback(
    (result: AgencyInviteResult, email: string) =>
      result.invitationToken
        ? {
            label: 'Copiar enlace',
            onClick: () => void copiarEnlaceDeInvitacion(result.invitationToken!, email),
          }
        : undefined,
    [copiarEnlaceDeInvitacion],
  );

  const handleCreateAgente = useCallback(async (data: UserInvite) => {
    try {
      const result = await inmobiliariaConfigApi.inviteUser(data);
      // La tabla se recarga SIEMPRE que el backend haya guardado la invitación
      // —aunque el correo no haya salido—, porque la fila ya existe y la
      // pantalla tiene que mostrarla. Antes no se recargaba nada: quedaba
      // diciendo «0 agentes» encima de un agente recién creado.
      await recargarEquipo();
      if (result.emailDelivered === false) {
        // La fila quedó creada; lo que faltó fue el correo. El motivo cambia el
        // consejo: si el servidor no tiene SMTP, «reenviar» manda por el mismo
        // camino roto y no puede funcionar nunca.
        const clave =
          result.emailStatus === 'not_configured'
            ? 'inmobiliaria.agentes.toasts.createdEmailNotConfiguredDesc'
            : 'inmobiliaria.agentes.toasts.createdEmailNotDeliveredDesc';
        toast.warning(t('inmobiliaria.agentes.toasts.created'), {
          description: t(clave, { name: data.name }),
          action: avisoDeCorreoNoEnviado(result, data.email),
          duration: 12000,
        });
      } else {
        toast.success(t('inmobiliaria.agentes.toasts.created'), {
          description: t('inmobiliaria.agentes.toasts.createdDesc', { name: data.name }),
        });
      }
    } catch (error) {
      toast.error('Error al invitar al agente', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }, [t, recargarEquipo, avisoDeCorreoNoEnviado]);

  const handleReenviarInvitacion = useCallback(async (agente: typeof allAgentes[0]) => {
    try {
      const result = await agencyApi.resendInvitation(agente.id);
      if (result.emailDelivered === false) {
        toast.warning('Invitación regenerada, el correo no salió', {
          description:
            result.emailStatus === 'not_configured'
              ? `El servidor todavía no tiene correo configurado. El enlace de ${agente.email} es nuevo y sirve: pasáselo vos.`
              : `El enlace de ${agente.email} es nuevo y sirve. Pasáselo vos.`,
          action: avisoDeCorreoNoEnviado(result, agente.email),
          duration: 12000,
        });
      } else {
        toast.success('Invitación reenviada', {
          description: `Le mandamos un enlace nuevo a ${agente.email}.`,
        });
      }
      await recargarEquipo();
    } catch (error) {
      toast.error('No pudimos reenviar la invitación', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }, [recargarEquipo, avisoDeCorreoNoEnviado]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {t('inmobiliaria.agentes.teamTitle')}
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl">
            {t('inmobiliaria.agentes.subtitle')}
          </p>
        </div>
        {canAccess('agentes', 'create') && (
          <Button onClick={handleNuevoAgente} hideArrow className="shrink-0">
            <Plus className="w-4 h-4" />
            {t('inmobiliaria.agentes.addAgent')}
          </Button>
        )}
      </div>

      {/* Stats Row — neutral icon tiles (blue = actionable only, DS golden rule) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Agents */}
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
              <Users className="w-5 h-5 text-fg-muted" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-semibold tabular-nums text-fg">
                {stats.total}
              </p>
              <p className="text-xs text-fg-muted">
                {t('inmobiliaria.common.total')}
              </p>
            </div>
          </div>
        </div>

        {/* Active Agents */}
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-fg-muted" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-semibold tabular-nums text-fg">
                {stats.active}
              </p>
              {/* «Activo» cuenta sólo a los que ya aceptaron. Si hay
                  invitaciones sin aceptar hay que decirlo acá, o el número de
                  arriba (Total) parece un error de suma. */}
              <p className="text-xs text-fg-muted">
                {stats.invitados > 0
                  ? `${t('inmobiliaria.agentes.active')} · ${stats.invitados} sin aceptar`
                  : t('inmobiliaria.agentes.active')}
              </p>
            </div>
          </div>
        </div>

        {/* Closings This Month */}
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
              <ChartLineUp className="w-5 h-5 text-fg-muted" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-semibold tabular-nums text-fg">
                {stats.closedThisMonth}
              </p>
              <p className="text-xs text-fg-muted">
                {t('inmobiliaria.agentes.closingsMonth')}
              </p>
            </div>
          </div>
        </div>

        {/* Commissions This Month */}
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
              <CurrencyDollar className="w-5 h-5 text-fg-muted" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold tabular-nums text-fg truncate">
                {formatCurrency(stats.commissionsThisMonth)}
              </p>
              <p className="text-xs text-fg-muted">
                {t('inmobiliaria.agentes.commissionsMonth')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content - Tabs integrated into card */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Tab Navigation - Inside the card (exclusive selector → SegmentedControl) */}
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <SegmentedControl<TabType>
            value={activeTab}
            onChange={setTab}
            aria-label={t('inmobiliaria.agentes.tabs.team')}
            options={TABS.map((tab) => {
              const Icon = tab.icon;
              return {
                value: tab.id,
                ariaLabel: tab.label,
                label: (
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4" weight={activeTab === tab.id ? 'fill' : 'regular'} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </span>
                ),
              };
            })}
          />
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'equipo' && (
            <motion.div
              key="equipo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* View Toggle Header (exclusive selector → SegmentedControl) */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <SegmentedControl<ViewMode>
                  value={viewMode}
                  onChange={setViewMode}
                  aria-label={t('inmobiliaria.agentes.viewTable')}
                  options={[
                    {
                      value: 'table',
                      ariaLabel: t('inmobiliaria.agentes.viewTable'),
                      label: (
                        <span className="flex items-center gap-2">
                          <List className="w-4 h-4" />
                          {t('inmobiliaria.agentes.viewTable')}
                        </span>
                      ),
                    },
                    {
                      value: 'grid',
                      ariaLabel: t('inmobiliaria.agentes.viewCards'),
                      label: (
                        <span className="flex items-center gap-2">
                          <SquaresFour className="w-4 h-4" />
                          {t('inmobiliaria.agentes.viewCards')}
                        </span>
                      ),
                    },
                  ]}
                />
                <span className="text-sm text-fg-muted tabular-nums">
                  {filteredAgentes.length} {t('inmobiliaria.agentes.title').toLowerCase()}
                </span>
              </div>

              {/* Filters - Second */}
              <AgenteFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                agentes={allAgentes}
              />

              {/* Las invitaciones son una llamada aparte. Si esa llamada falla
                  (y no por falta de permiso, que es respuesta válida) el equipo
                  se ve incompleto: decirlo es mejor que mostrar una lista corta
                  como si estuviera entera. */}
              {invitacionesCaidas && (
                <div className="px-4 py-3 border-b border-border bg-warning-soft/40">
                  <p className="text-sm text-fg-muted">
                    No pudimos traer las invitaciones pendientes, así que acá faltan las
                    personas que todavía no aceptaron.{' '}
                    <button
                      onClick={() => void recargarEquipo()}
                      className="underline underline-offset-2 hover:text-fg"
                    >
                      Reintentar
                    </button>
                  </p>
                </div>
              )}

              {/* Content */}
              <div>
                <AnimatePresence mode="wait">
                  {viewMode === 'grid' ? (
                    <motion.div
                      key="grid"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {paginatedAgentes.length > 0 ? (
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {paginatedAgentes.map((agente) => (
                            <AgenteCard
                              key={agente.id}
                              agente={agente}
                              onClick={() => handleView(agente)}
                              onView={() => handleView(agente)}
                              onEdit={() => handleEdit(agente)}
                            />
                          ))}
                        </div>
                      ) : (
                        <EmptyState />
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="table"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {paginatedAgentes.length > 0 ? (
                        <AgenteTable
                          agentes={paginatedAgentes}
                          onView={handleView}
                          onEdit={handleEdit}
                          onReenviarInvitacion={
                            canAccess('configuracion', 'edit') ? handleReenviarInvitacion : undefined
                          }
                        />
                      ) : (
                        <EmptyState />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Pagination Footer */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-border flex items-center justify-center bg-muted/10">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'ranking' && (
            <motion.div
              key="ranking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4"
            >
              <AgenteLeaderboard agentes={allAgentes} />
            </motion.div>
          )}

          {activeTab === 'workload' && (
            <motion.div
              key="workload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4"
            >
              <AgenteWorkloadChart agentes={allAgentes} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Agent Modal */}
      <AgenteFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleCreateAgente}
      />
    </div>
  );
}

// Empty State Component — DS EmptyState, no action (header owns the CTA)
function EmptyState() {
  const { t } = useI18n();
  return (
    <DSEmptyState
      icon={Users}
      title={t('inmobiliaria.agentes.noAgents')}
      description={t('inmobiliaria.agentes.noAgentsDesc')}
    />
  );
}

export default function AgentesPage() {
  return (
    <PageGuard module="agentes">
      <AgentesContent />
    </PageGuard>
  );
}
