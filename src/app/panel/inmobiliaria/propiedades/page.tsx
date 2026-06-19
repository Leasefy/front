'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Buildings,
  House,
  MagnifyingGlass,
  X,
  Spinner,
  Eye,
  ArrowsClockwise,
  Users,
  Plus,
  Sparkle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { propertiesApi } from '@/lib/api/properties.service';
import { PageGuard } from '@/components/auth/PageGuard';
import { IconTooltip } from '@/components/ui/icon-tooltip';
import type { AgencyProperty } from '@/lib/types/property';
import { formatCurrency } from '@/lib/types/inmobiliaria';

// ─── Status display ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  available: {
    label: 'Disponible',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  rented: {
    label: 'Arrendada',
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-400',
  },
  pending: {
    label: 'Borrador',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
  },
} as const;

type FilterStatus = 'all' | 'available' | 'rented' | 'pending';

// ─── Change Agent Modal ────────────────────────────────────────────────────────

interface ChangeAgentModalProps {
  property: AgencyProperty;
  onClose: () => void;
  onSuccess: () => void;
}

function ChangeAgentModal({ property, onClose, onSuccess }: ChangeAgentModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentAgent = property.agents[0] ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      // Remove existing agent first if there is one
      if (currentAgent) {
        await propertiesApi.removeAgent(property.id, currentAgent.agentId);
      }
      await propertiesApi.assignAgent(property.id, email.trim());
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar agente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAgent = async () => {
    if (!currentAgent) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await propertiesApi.removeAgent(property.id, currentAgent.agentId);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al remover agente');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground">Cambiar agente</h2>
            <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-[280px]">
              {property.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Current agent */}
          {currentAgent && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    {currentAgent.firstName.charAt(0)}{currentAgent.lastName.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {currentAgent.firstName} {currentAgent.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{currentAgent.email}</p>
                </div>
              </div>
              <button
                onClick={handleRemoveAgent}
                disabled={isSubmitting}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-50"
              >
                Quitar
              </button>
            </div>
          )}

          {/* New agent email */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {currentAgent ? 'Asignar nuevo agente' : 'Asignar agente'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agente@inmobiliaria.com"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                El usuario debe tener rol de Agente en el sistema.
              </p>
            </div>

            {error && (
              <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!email.trim() || isSubmitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Spinner className="w-4 h-4 animate-spin" />
                ) : (
                  currentAgent ? 'Cambiar agente' : 'Asignar agente'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main content ──────────────────────────────────────────────────────────────

function PropiedadesContent() {
  const { isAdmin, isLoading: permissionsLoading } = usePermissions();
  const router = useRouter();

  // Regular (non-admin) agency members only see their assigned properties.
  // Admins see all properties via getMine().
  // NOTE: backendRole is always 'AGENT' for all agency members, so we rely on isAdmin instead.
  const isAgent = !isAdmin;

  const [properties, setProperties] = useState<AgencyProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [changingAgent, setChangingAgent] = useState<AgencyProperty | null>(null);

  const fetchProperties = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = isAgent
        ? await propertiesApi.getAssigned()
        : await propertiesApi.getMine();
      setProperties(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar propiedades');
    } finally {
      setIsLoading(false);
    }
  }, [isAgent]);

  useEffect(() => {
    // Wait until permissions are resolved so isAgent is accurate
    if (permissionsLoading) return;
    fetchProperties();
  }, [fetchProperties, permissionsLoading]);

  const filtered = useMemo(() => {
    let result = [...properties];
    if (filterStatus !== 'all') {
      result = result.filter((p) => p.status === filterStatus);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.neighborhood.toLowerCase().includes(q)
      );
    }
    return result;
  }, [properties, filterStatus, search]);

  // Stats
  const stats = useMemo(() => ({
    total: properties.length,
    available: properties.filter((p) => p.status === 'available').length,
    rented: properties.filter((p) => p.status === 'rented').length,
    unassigned: properties.filter((p) => p.agents.length === 0).length,
  }), [properties]);

  const handleAgentChanged = () => {
    setChangingAgent(null);
    fetchProperties();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-4 text-rose-700 dark:text-rose-400 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {isAgent ? 'Mis propiedades' : 'Propiedades'}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 text-sm">
            {isAgent
              ? 'Propiedades asignadas a tu cuenta'
              : 'Todas las propiedades de la inmobiliaria'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProperties}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors text-sm"
          >
            <ArrowsClockwise className="w-4 h-4" />
            Actualizar
          </button>
          <button
            onClick={() => router.push('/panel/inmobiliaria/propiedades/captura')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors text-sm font-medium"
          >
            <Sparkle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" weight="fill" />
            Capturar con IA
          </button>
          <button
            onClick={() => router.push('/publicar')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Nueva propiedad
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total</p>
        </div>
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.available}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">Disponibles</p>
        </div>
        <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
          <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{stats.rented}</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-500 mt-0.5">Arrendadas</p>
        </div>
        {!isAgent && (
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.unassigned}</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">Sin agente</p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, dirección..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted">
            {(['all', 'available', 'rented', 'pending'] as FilterStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                  filterStatus === s
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {s === 'all' ? 'Todas' : STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Buildings className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">Sin propiedades</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search || filterStatus !== 'all'
                ? 'Ninguna propiedad coincide con los filtros'
                : isAgent
                ? 'No tenés propiedades asignadas'
                : 'Aún no hay propiedades publicadas'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Propiedad
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Canon
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Agente
                  </th>
                  <th className="w-20 p-4" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((property) => {
                  const statusCfg = STATUS_CONFIG[property.status] ?? STATUS_CONFIG.pending;
                  const agent = property.agents[0] ?? null;

                  return (
                    <tr
                      key={property.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      {/* Property */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {property.thumbnailUrl ? (
                            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                              <img
                                src={property.thumbnailUrl}
                                alt={property.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <House className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate max-w-[220px]">
                              {property.title}
                            </p>
                            <p className="text-sm text-muted-foreground truncate max-w-[220px]">
                              {property.neighborhood}, {property.city}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Canon */}
                      <td className="p-4">
                        <p className="font-semibold text-foreground tabular-nums">
                          {formatCurrency(property.monthlyRent)}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-medium', statusCfg.bg, statusCfg.text)}>
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Agent */}
                      <td className="p-4">
                        {agent ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                {agent.firstName.charAt(0)}{agent.lastName.charAt(0)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-foreground truncate max-w-[120px]">
                                {agent.firstName} {agent.lastName}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sin asignar</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        <div className="flex items-center gap-1 justify-end">
                          <IconTooltip label="Ver propiedad">
                            <button
                              onClick={() => router.push(`/propiedades/${property.id}`)}
                              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                              aria-label="Ver propiedad"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </IconTooltip>
                          {isAdmin && (
                            <>
                              <IconTooltip label="Ver candidatos">
                                <button
                                  onClick={() => router.push(`/panel/inmobiliaria/propiedades/${property.id}/candidatos`)}
                                  className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                  aria-label="Ver candidatos"
                                >
                                  <Users className="w-4 h-4" />
                                </button>
                              </IconTooltip>
                              <IconTooltip label="Cambiar agente">
                                <button
                                  onClick={() => setChangingAgent(property)}
                                  className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                  aria-label="Cambiar agente"
                                >
                                  <ArrowsClockwise className="w-4 h-4" />
                                </button>
                              </IconTooltip>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Change agent modal */}
      {changingAgent && (
        <ChangeAgentModal
          property={changingAgent}
          onClose={() => setChangingAgent(null)}
          onSuccess={handleAgentChanged}
        />
      )}
    </div>
  );
}

export default function PropiedadesPage() {
  return (
    <PageGuard module="portafolio">
      <PropiedadesContent />
    </PageGuard>
  );
}
