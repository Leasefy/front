'use client';

/**
 * cotizaciones-source — federated search for recent insurance quotes.
 *
 * Sources from GET /api/agency/:agencyId/cotizador/overview which returns
 * lastQuotes (max 10, most recent). Client-filters by cedulaHashPrefix8 /
 * ciudad / status against the query.
 *
 * No search param on the overview endpoint — fetch-and-filter.
 *
 * Permission: cotizador:view
 * href: /panel/inmobiliaria/ai/cotizador (list; no detail route yet for individual quotes)
 */

import { agentAuthHeaders } from '@/lib/api/agent-auth';
import type { CotizadorOverviewResponse } from '@/lib/hooks/cotizador/use-cotizador-overview';
import type { SearchSource, SearchResult } from '@/lib/hooks/useFederatedSearch';
import { FileText } from '@phosphor-icons/react';

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

type LastQuote = CotizadorOverviewResponse['lastQuotes'][number];

function matchesQuery(item: LastQuote, q: string): boolean {
  const n = norm(q);
  return (
    norm(item.cedulaHashPrefix8).includes(n) ||
    norm(item.ciudad).includes(n) ||
    norm(item.status).includes(n) ||
    norm(item.id.slice(0, 8)).includes(n)
  );
}

function formatCOP(amount: number): string {
  if (amount === 0) return '$0';
  const millions = amount / 1_000_000;
  if (millions >= 1) return `$${millions.toFixed(1)}M`;
  const thousands = amount / 1_000;
  return `$${Math.round(thousands)}k`;
}

const STATUS_COLORS: Record<string, 'green' | 'amber' | 'red' | 'neutral'> = {
  final: 'green',
  partial: 'amber',
  pending: 'amber',
  error: 'red',
};

const STATUS_LABELS_ES: Record<string, string> = {
  final: 'Completada',
  partial: 'Parcial',
  pending: 'Pendiente',
  error: 'Error',
};

export const cotizacionesSource: SearchSource = {
  id: 'cotizaciones',
  labelKey: 'inmobiliaria.commandPalette.sources.cotizaciones',
  icon: FileText,
  permission: { module: 'cotizador', action: 'view' },

  async run(query, ctx, signal) {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
    if (!agentUrl || !ctx.agencyId) return [];

    const res = await globalThis.fetch(
      `${agentUrl}/api/agency/${ctx.agencyId}/cotizador/overview`,
      { headers: agentAuthHeaders(), signal },
    );
    if (!res.ok) throw new Error(`${res.status}`);
    const json = (await res.json()) as CotizadorOverviewResponse;

    return (json.lastQuotes ?? [])
      .filter((item) => matchesQuery(item, query))
      .slice(0, 8)
      .map((item): SearchResult => ({
        id: `cotizaciones:${item.id}`,
        sourceId: 'cotizaciones',
        type: 'cotizacion',
        title: item.ciudad,
        subtitle: `Cédula: ${item.cedulaHashPrefix8}…`,
        badges: [
          {
            label: STATUS_LABELS_ES[item.status] ?? item.status,
            color: STATUS_COLORS[item.status] ?? 'neutral',
          },
          ...(item.canonCop > 0
            ? [{ label: formatCOP(item.canonCop), color: 'neutral' as const }]
            : []),
          ...(item.approvedCount > 0
            ? [{ label: `${item.approvedCount}/${item.totalCarriers} ok`, color: 'green' as const }]
            : []),
        ],
        href: `/panel/inmobiliaria/ai/cotizador`,
        preview: {
          type: 'cotizacion',
          id: item.id,
          ciudad: item.ciudad,
          cedulaHashPrefix8: item.cedulaHashPrefix8,
          canonCop: item.canonCop,
          status: item.status,
          approvedCount: item.approvedCount,
          totalCarriers: item.totalCarriers,
          createdAt: item.createdAt,
        },
      }));
  },
};
