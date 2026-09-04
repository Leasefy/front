'use client';

/**
 * agentes-source — federated search for inmobiliaria agents.
 *
 * Calls GET /inmobiliaria/agentes (no server-side search param — client-filter).
 * agentesApi.getAll() has no search param; we fetch all and filter client-side.
 *
 * Permission: agentes:view
 * href: /panel/inmobiliaria/configuracion/equipo/{id}
 */

import { getAccessToken } from '@/lib/api/client';
import type { Agente } from '@/lib/types/inmobiliaria';
import type { SearchSource, SearchResult } from '@/lib/hooks/useFederatedSearch';
import { Users } from '@phosphor-icons/react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

/** Accent/case-insensitive partial match on multiple fields */
function matchesQuery(item: Agente, q: string): boolean {
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  const n = norm(q);
  return (
    norm(item.name).includes(n) ||
    norm(item.email).includes(n) ||
    (item.zone ? norm(item.zone).includes(n) : false)
  );
}

const ROLE_LABELS: Record<string, string> = {
  agent: 'Agente',
  coordinator: 'Coordinador',
  director: 'Director',
};

const STATUS_COLORS: Record<
  string,
  'green' | 'amber' | 'red' | 'neutral'
> = {
  active: 'green',
  on_leave: 'amber',
  inactive: 'red',
};

export const agentesSource: SearchSource = {
  id: 'agentes',
  labelKey: 'inmobiliaria.commandPalette.sources.agentes',
  icon: Users,
  permission: { module: 'agentes', action: 'view' },

  async run(query, _ctx, signal) {
    if (!BACKEND_URL) return [];
    const token = getAccessToken();
    const res = await globalThis.fetch(`${BACKEND_URL}/inmobiliaria/agentes`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal,
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const json = (await res.json()) as { data: Agente[] } | Agente[];
    const all: Agente[] = Array.isArray(json) ? json : (json.data ?? []);

    return all
      .filter((item) => matchesQuery(item, query))
      .slice(0, 8)
      .map((item): SearchResult => ({
        id: `agentes:${item.id}`,
        sourceId: 'agentes',
        type: 'agente',
        title: item.name,
        subtitle: item.email,
        badges: [
          {
            label: ROLE_LABELS[item.role] ?? item.role,
            color: 'neutral' as const,
          },
          {
            label: item.status === 'active' ? 'Activo' : item.status === 'inactive' ? 'Inactivo' : 'Ausente',
            color: STATUS_COLORS[item.status] ?? 'neutral',
          },
        ],
        href: `/panel/inmobiliaria/configuracion/equipo/${item.id}`,
        preview: {
          type: 'agente',
          id: item.id,
          name: item.name,
          email: item.email,
          phone: item.phone,
          role: item.role,
          status: item.status,
          zone: item.zone ?? null,
          assignedProperties: item.metrics.assignedProperties,
          activeLeases: item.metrics.activeLeases,
          commissionSplit: item.commissionSplit,
        },
      }));
  },
};
