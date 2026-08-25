'use client';

/**
 * propiedades-source — federated search for agency properties.
 *
 * Calls GET /properties/mine (agency admin) — no server-side search param;
 * results are client-filtered by title/address/neighborhood (accent-insensitive).
 *
 * Permission: portafolio:view
 * href: /panel/inmobiliaria/inmuebles/{id}
 */

import { getAccessToken } from '@/lib/api/client';
import type { AgencyProperty } from '@/lib/types/property';
import type { SearchSource, SearchResult } from '@/lib/hooks/useFederatedSearch';
import { House } from '@phosphor-icons/react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function matchesQuery(item: AgencyProperty, q: string): boolean {
  const n = norm(q);
  return (
    norm(item.title).includes(n) ||
    norm(item.address).includes(n) ||
    norm(item.neighborhood).includes(n) ||
    norm(item.city).includes(n)
  );
}

function formatCOP(amount: number): string {
  if (amount === 0) return '$0';
  const millions = amount / 1_000_000;
  if (millions >= 1) return `$${millions.toFixed(1)}M`;
  const thousands = amount / 1_000;
  return `$${Math.round(thousands)}k`;
}

const STATUS_COLORS: Record<string, 'green' | 'amber' | 'neutral'> = {
  available: 'green',
  published: 'green',
  rented: 'neutral',
  pending: 'amber',
  draft: 'amber',
};

const STATUS_LABELS_ES: Record<string, string> = {
  available: 'Disponible',
  published: 'Publicada',
  rented: 'Arrendada',
  pending: 'Pendiente',
  draft: 'Borrador',
};

export const propiedadesSource: SearchSource = {
  id: 'propiedades',
  labelKey: 'inmobiliaria.commandPalette.sources.propiedades',
  icon: House,
  permission: { module: 'portafolio', action: 'view' },

  async run(query, _ctx, signal) {
    if (!BACKEND_URL) return [];
    const token = getAccessToken();
    const res = await globalThis.fetch(`${BACKEND_URL}/properties/mine`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal,
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const all = (await res.json()) as AgencyProperty[];

    return all
      .filter((item) => matchesQuery(item, query))
      .slice(0, 8)
      .map((item): SearchResult => ({
        id: `propiedades:${item.id}`,
        sourceId: 'propiedades',
        type: 'propiedad',
        title: item.title,
        subtitle: `${item.address}, ${item.city}`,
        badges: [
          {
            label: STATUS_LABELS_ES[item.status] ?? item.status,
            color: STATUS_COLORS[item.status] ?? 'neutral',
          },
          { label: formatCOP(item.monthlyRent), color: 'neutral' as const },
        ],
        href: `/panel/inmobiliaria/inmuebles/${item.id}`,
        preview: {
          type: 'propiedad',
          id: item.id,
          title: item.title,
          address: item.address,
          city: item.city,
          neighborhood: item.neighborhood,
          monthlyRent: item.monthlyRent,
          status: item.status,
          bedrooms: item.bedrooms,
          bathrooms: item.bathrooms,
          area: item.area,
          thumbnailUrl: item.thumbnailUrl,
        },
      }));
  },
};
