'use client';

/**
 * cotizaciones-source — federated search for insurance quotes.
 *
 * PRIMARY path: GET /api/agency/:agencyId/search?q=<query>&types=quote&limit=8
 *   Trigram/unaccent fuzzy search via the unified agent search endpoint.
 *   Falls back automatically when the endpoint is unavailable (migration pending)
 *   or returns any error — see agent-search-client for cooldown semantics.
 *
 * FALLBACK path: GET /api/agency/:agencyId/cotizador/overview (client-filter)
 *   Fetches the overview (lastQuotes max 10) and client-filters by
 *   cedulaHashPrefix8 / ciudad / status / id prefix. Original implementation
 *   kept verbatim as the fallback path.
 *
 * Permission: cotizador:view
 * href: /panel/inmobiliaria/ai/cotizador/:id
 */

import { agentAuthHeaders } from '@/lib/api/agent-auth';
import type { CotizadorOverviewResponse } from '@/lib/hooks/cotizador/use-cotizador-overview';
import type { SearchSource, SearchResult } from '@/lib/hooks/useFederatedSearch';
import { agentSearch } from '@/lib/search/agent-search-client';
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

    // ── Primary: unified fuzzy search endpoint ──────────────────────────────
    const serverResults = await agentSearch(query, 'quote', ctx.agencyId, signal);

    if (serverResults !== null) {
      // Map endpoint shape → palette SearchResult.
      // `ref` is the masked cédula hash prefix; href is constructed from `id`.
      // badges[0] = status label, badges[1] = amount chip, badges[2] = carrier chip.
      return serverResults.map((item): SearchResult => {
        const statusLabel = item.badges[0] ?? '';
        const amountLabel = item.badges[1];
        const carrierLabel = item.badges[2];
        const statusColor: 'green' | 'amber' | 'red' | 'neutral' =
          STATUS_COLORS[statusLabel.toLowerCase()] ?? 'neutral';
        const badges: NonNullable<SearchResult['badges']> = [];
        if (statusLabel) badges.push({ label: statusLabel, color: statusColor });
        if (amountLabel) badges.push({ label: amountLabel, color: 'neutral' });
        if (carrierLabel) badges.push({ label: carrierLabel, color: 'green' });

        return {
          id: `cotizaciones:${item.id}`,
          sourceId: 'cotizaciones',
          type: 'cotizacion',
          title: item.title,
          subtitle: item.ref ? `Cédula: ${item.ref}…` : (item.subtitle ?? undefined),
          badges,
          href: `/panel/inmobiliaria/ai/cotizador/${item.id}`,
          // Preview degrades gracefully — panel already null-guards all fields.
          preview: {
            type: 'cotizacion',
            id: item.id,
            ciudad: item.title,
            cedulaHashPrefix8: item.ref ?? '',
            canonCop: 0,
            status: statusLabel,
            approvedCount: 0,
            totalCarriers: 0,
            createdAt: null,
          },
        };
      });
    }

    // ── Fallback: overview endpoint with client-side filter ─────────────────
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
        href: `/panel/inmobiliaria/ai/cotizador/${item.id}`,
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
