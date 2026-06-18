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
  CheckCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { propertiesApi } from '@/lib/api/properties.service';
import { PageGuard } from '@/components/auth/PageGuard';
import { IconTooltip } from '@/components/ui/icon-tooltip';
import { Button, Input, EmptyState } from '@/components/ui';
import { ErrorState } from '@/components/ui/error-state';
import { SegmentedControl } from '@leasefy/ui';
import type { AgencyProperty } from '@/lib/types/property';
import { formatCurrency } from '@/lib/types/inmobiliaria';

// ─── Status display ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  available: {
    label: 'Disponible',
    bg: 'bg-success-soft',
    text: 'text-success',
  },
  rented: {
    label: 'Arrendada',
    bg: 'bg-primary-soft',
    text: 'text-primary',
  },
  pending: {
    label: 'Borrador',
    bg: 'bg-warning-soft',
    text: 'text-warning',
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
      <div className="w-full max-w-md bg-card rounded-xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-fg">Cambiar agente</h2>
            <p className="text-sm text-fg-muted mt-0.5 truncate max-w-[280px]">
              {property.title}
            </p>
          </div>
          <Button variant="ghost" size="icon" hideArrow onClick={onClose} aria-label="Cerrar">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-5">
          {/* Current agent */}
          {currentAgent && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-muted border border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-primary">
                    {currentAgent.firstName.charAt(0)}{currentAgent.lastName.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-fg">
                    {currentAgent.firstName} {currentAgent.lastName}
                  </p>
                  <p className="text-xs text-fg-muted">{currentAgent.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                hideArrow
                onClick={handleRemoveAgent}
                disabled={isSubmitting}
                className="text-danger hover:text-danger hover:bg-danger-soft"
              >
                Quitar
              </Button>
            </div>
          )}

          {/* New agent email */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">
                {currentAgent ? 'Asignar nuevo agente' : 'Asignar agente'}
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agente@inmobiliaria.com"
                autoFocus
              />
              <p className="text-xs text-fg-muted">
                El usuario debe tener rol de Agente en el sistema.
              </p>
            </div>

            {error && (
              <p className="text-sm text-danger">{error}</p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <Button
                type="button"
                variant="secondary"
                hideArrow
                onClick={onClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                hideArrow
                isLoading={isSubmitting}
                disabled={!email.trim() || isSubmitting}
                className="flex-1"
              >
                {currentAgent ? 'Cambiar agente' : 'Asignar agente'}
              </Button>
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
        <Spinner className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <ErrorState description={error} onRetry={fetchProperties} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {isAgent ? 'Mis propiedades' : 'Propiedades'}
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl">
            {isAgent
              ? 'Propiedades asignadas a tu cuenta'
              : 'Todas las propiedades de la inmobiliaria'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" hideArrow onClick={fetchProperties} aria-label="Actualizar">
            <ArrowsClockwise className="w-4 h-4" />
            Actualizar
          </Button>
          <Button
            variant="secondary"
            hideArrow
            onClick={() => router.push('/panel/inmobiliaria/propiedades/captura')}
          >
            <Sparkle className="w-4 h-4 text-primary" weight="fill" />
            Capturar con IA
          </Button>
          <Button hideArrow onClick={() => router.push('/panel/inmobiliaria/propiedades/nueva')}>
            <Plus className="w-4 h-4" />
            Nueva propiedad
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile value={stats.total} label="Total" tone="neutral" />
        <StatTile value={stats.available} label="Disponibles" tone="ok" />
        <StatTile value={stats.rented} label="Arrendadas" tone="info" />
        {!isAgent && <StatTile value={stats.unassigned} label="Sin agente" tone="warn" />}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted z-10 pointer-events-none" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, dirección..."
              className="pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg transition-colors z-10"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status filter (selector excluyente) */}
          <SegmentedControl<FilterStatus>
            aria-label="Filtrar por estado"
            value={filterStatus}
            onChange={setFilterStatus}
            options={(['all', 'available', 'rented', 'pending'] as FilterStatus[]).map((s) => ({
              value: s,
              label: s === 'all' ? 'Todas' : STATUS_CONFIG[s].label,
            }))}
          />
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={Buildings}
            title="Sin propiedades"
            description={
              search || filterStatus !== 'all'
                ? 'Ninguna propiedad coincide con los filtros'
                : isAgent
                ? 'No tenés propiedades asignadas'
                : 'Aún no hay propiedades publicadas'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-surface-muted">
                  <th className="text-left p-4 text-xs font-medium uppercase tracking-wide text-fg-muted">
                    Propiedad
                  </th>
                  <th className="text-left p-4 text-xs font-medium uppercase tracking-wide text-fg-muted">
                    Canon
                  </th>
                  <th className="text-left p-4 text-xs font-medium uppercase tracking-wide text-fg-muted">
                    Estado
                  </th>
                  <th className="text-left p-4 text-xs font-medium uppercase tracking-wide text-fg-muted">
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
                            <div className="w-12 h-12 rounded-md overflow-hidden shrink-0">
                              <img
                                src={property.thumbnailUrl}
                                alt={property.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-md bg-surface-muted flex items-center justify-center shrink-0">
                              <House className="w-5 h-5 text-fg-muted" weight="duotone" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-fg truncate max-w-[220px]">
                              {property.title}
                            </p>
                            <p className="text-sm text-fg-muted truncate max-w-[220px]">
                              {property.neighborhood}, {property.city}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Canon */}
                      <td className="p-4">
                        <p className="text-sm font-semibold text-fg tabular-nums">
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
                            <div className="w-7 h-7 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                              <span className="text-xs font-medium text-primary">
                                {agent.firstName.charAt(0)}{agent.lastName.charAt(0)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-fg truncate max-w-[120px]">
                                {agent.firstName} {agent.lastName}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-fg-muted">Sin asignar</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        <div className="flex items-center gap-1 justify-end">
                          <IconTooltip label="Ver propiedad">
                            <Button
                              variant="ghost"
                              size="icon"
                              hideArrow
                              onClick={() => router.push(`/propiedades/${property.id}`)}
                              aria-label="Ver propiedad"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </IconTooltip>
                          {isAdmin && (
                            <>
                              <IconTooltip label="Ver candidatos">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  hideArrow
                                  onClick={() => router.push(`/panel/inmobiliaria/propiedades/${property.id}/candidatos`)}
                                  aria-label="Ver candidatos"
                                >
                                  <Users className="w-4 h-4" />
                                </Button>
                              </IconTooltip>
                              <IconTooltip label="Cambiar agente">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  hideArrow
                                  onClick={() => setChangingAgent(property)}
                                  aria-label="Cambiar agente"
                                >
                                  <ArrowsClockwise className="w-4 h-4" />
                                </Button>
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

// KPI tile — número, label e ícono parejos; tint semántico por token.
const TILE_TONES = {
  neutral: 'bg-surface-muted text-fg-muted',
  ok: 'bg-success-soft text-success',
  info: 'bg-primary-soft text-primary',
  warn: 'bg-warning-soft text-warning',
  bad: 'bg-danger-soft text-danger',
} as const;

const TILE_ICONS: Record<keyof typeof TILE_TONES, typeof Buildings> = {
  neutral: Buildings,
  ok: CheckCircle,
  info: House,
  warn: Users,
  bad: Buildings,
};

function StatTile({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: keyof typeof TILE_TONES;
}) {
  const Icon = TILE_ICONS[tone];
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', TILE_TONES[tone])}>
        <Icon className="w-5 h-5" weight="duotone" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold text-fg tabular-nums leading-none">{value}</p>
        <p className="text-xs text-fg-muted mt-1 truncate">{label}</p>
      </div>
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
