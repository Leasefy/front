'use client';

/**
 * propietarios-source — federated search for inmobiliaria property owners.
 *
 * Calls GET /inmobiliaria/propietarios?search=<query> (supports search param).
 * Uses same auth pattern as debtors-source (bearer token via getAccessToken).
 *
 * Permission: propietarios:view
 * href: /panel/inmobiliaria/propietarios/{id}
 */

import { getAccessToken } from '@/lib/api/client';
import type { Propietario } from '@/lib/types/inmobiliaria';
import type { SearchSource, SearchResult } from '@/lib/hooks/useFederatedSearch';
import { UserCircle } from '@phosphor-icons/react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

function formatCOP(amount: number): string {
  if (amount === 0) return '$0';
  const millions = amount / 1_000_000;
  if (millions >= 1) return `$${millions.toFixed(1)}M`;
  const thousands = amount / 1_000;
  return `$${Math.round(thousands)}k`;
}

export const propietariosSource: SearchSource = {
  id: 'propietarios',
  labelKey: 'inmobiliaria.commandPalette.sources.propietarios',
  icon: UserCircle,
  permission: { module: 'propietarios', action: 'view' },

  async run(query, _ctx, signal) {
    if (!BACKEND_URL) return [];
    const token = getAccessToken();
    const qs = new URLSearchParams({ search: query, limit: '8' });
    const res = await globalThis.fetch(
      `${BACKEND_URL}/inmobiliaria/propietarios?${qs}`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal,
      },
    );
    if (!res.ok) throw new Error(`${res.status}`);
    const json = (await res.json()) as { data: Propietario[] } | Propietario[];
    const items: Propietario[] = Array.isArray(json) ? json : (json.data ?? []);

    return items.slice(0, 8).map((item): SearchResult => ({
      id: `propietarios:${item.id}`,
      sourceId: 'propietarios',
      type: 'propietario',
      title: item.name,
      subtitle: item.email ?? undefined,
      badges: [
        ...(item.propertyCount > 0
          ? [{ label: `${item.propertyCount} prop`, color: 'neutral' as const }]
          : []),
        ...(item.totalMonthlyRent > 0
          ? [{ label: formatCOP(item.totalMonthlyRent), color: 'green' as const }]
          : []),
      ],
      href: `/panel/inmobiliaria/propietarios/${item.id}`,
      preview: {
        type: 'propietario',
        id: item.id,
        name: item.name,
        email: item.email,
        phone: item.phone,
        city: item.city ?? null,
        propertyCount: item.propertyCount,
        activeLeases: item.activeLeases,
        totalMonthlyRent: item.totalMonthlyRent,
        pendingBalance: item.pendingBalance,
      },
    }));
  },
};
