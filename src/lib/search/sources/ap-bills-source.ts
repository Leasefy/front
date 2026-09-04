'use client';

/**
 * ap-bills-source — federated search for AP (Accounts Payable) bills.
 *
 * PRIMARY path: GET /api/agency/:agencyId/search?q=<query>&types=bill&limit=8
 *   Trigram/unaccent fuzzy search via the unified agent search endpoint.
 *   Falls back automatically when the endpoint is unavailable (migration pending)
 *   or returns any error — see agent-search-client for cooldown semantics.
 *
 * FALLBACK path: GET /api/agency/:agencyId/ap/bills (client-filter)
 *   Fetches all bills and filters client-side by invoiceNumber / costCenterCode /
 *   status. Original implementation kept verbatim as the fallback path.
 *
 * Bill rows do NOT embed vendor name (only vendorId). Title = invoiceNumber;
 * subtitle = costCenterCode.
 *
 * Permission: ap:view
 * href: /panel/inmobiliaria/pagos/cxp/:id
 */

import { agentAuthHeaders } from '@/lib/api/agent-auth';
import type { SearchSource, SearchResult } from '@/lib/hooks/useFederatedSearch';
import { agentSearch } from '@/lib/search/agent-search-client';
import { Receipt } from '@phosphor-icons/react';

interface ApBill {
  id: string;
  vendorId: string;
  invoiceNumber: string;
  amountCop: string; // BigInt serialized as string by the agent
  costCenterCode: string;
  issuedAt: string;
  dueDate: string;
  status: string;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
}

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function matchesQuery(item: ApBill, q: string): boolean {
  const n = norm(q);
  return (
    norm(item.invoiceNumber).includes(n) ||
    norm(item.costCenterCode).includes(n) ||
    norm(item.status).includes(n)
  );
}

function formatCOP(amountStr: string): string {
  const amount = Number(amountStr);
  if (isNaN(amount) || amount === 0) return '$0';
  const millions = amount / 1_000_000;
  if (millions >= 1) return `$${millions.toFixed(1)}M`;
  const thousands = amount / 1_000;
  return `$${Math.round(thousands)}k`;
}

const STATUS_COLORS: Record<string, 'green' | 'amber' | 'red' | 'neutral'> = {
  paid: 'green',
  approved: 'green',
  pending_approval: 'amber',
  rejected: 'red',
  void: 'neutral',
};

const STATUS_LABELS_ES: Record<string, string> = {
  paid: 'Pagada',
  approved: 'Aprobada',
  pending_approval: 'Pdte. aprobación',
  rejected: 'Rechazada',
  void: 'Anulada',
};

export const apBillsSource: SearchSource = {
  id: 'ap-bills',
  labelKey: 'inmobiliaria.commandPalette.sources.apBills',
  icon: Receipt,
  permission: { module: 'ap', action: 'view' },

  async run(query, ctx, signal) {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
    if (!agentUrl || !ctx.agencyId) return [];

    // ── Primary: unified fuzzy search endpoint ──────────────────────────────
    const serverResults = await agentSearch(query, 'bill', ctx.agencyId, signal);

    if (serverResults !== null) {
      // Map endpoint shape → palette SearchResult.
      // `ref` is the masked invoice number / NIT; href is constructed from `id`.
      // badges[0] = status label, badges[1] (if present) = amount chip.
      return serverResults.map((item): SearchResult => {
        const statusLabel = item.badges[0] ?? '';
        const amountLabel = item.badges[1];
        const statusColor: 'green' | 'amber' | 'red' | 'neutral' =
          STATUS_COLORS[statusLabel.toLowerCase().replace(/\s+/g, '_')] ??
          'neutral';
        const badges: NonNullable<SearchResult['badges']> = [];
        if (statusLabel) badges.push({ label: statusLabel, color: statusColor });
        if (amountLabel) badges.push({ label: amountLabel, color: 'neutral' });

        return {
          id: `ap-bills:${item.id}`,
          sourceId: 'ap-bills',
          type: 'ap-bill',
          title: item.title,
          subtitle: item.subtitle ?? item.ref ?? undefined,
          badges,
          href: `/panel/inmobiliaria/pagos/cxp/${item.id}`,
          // Preview degrades gracefully — panel already null-guards all fields.
          preview: {
            type: 'ap-bill',
            id: item.id,
            invoiceNumber: item.title,
            amountCop: amountLabel ?? '0',
            costCenterCode: item.subtitle ?? '',
            status: statusLabel,
            dueDate: null,
            approvedBy: null,
          },
        };
      });
    }

    // ── Fallback: original AP bills endpoint with client-side filter ─────────
    const res = await globalThis.fetch(
      `${agentUrl}/api/agency/${ctx.agencyId}/ap/bills`,
      { headers: agentAuthHeaders(), signal },
    );
    if (!res.ok) throw new Error(`${res.status}`);
    const json = (await res.json()) as { bills: ApBill[] };
    const all: ApBill[] = json.bills ?? [];

    return all
      .filter((item) => matchesQuery(item, query))
      .slice(0, 8)
      .map((item): SearchResult => ({
        id: `ap-bills:${item.id}`,
        sourceId: 'ap-bills',
        type: 'ap-bill',
        title: item.invoiceNumber,
        subtitle: item.costCenterCode,
        badges: [
          {
            label: STATUS_LABELS_ES[item.status] ?? item.status,
            color: STATUS_COLORS[item.status] ?? 'neutral',
          },
          { label: formatCOP(item.amountCop), color: 'neutral' as const },
        ],
        href: `/panel/inmobiliaria/pagos/cxp/${item.id}`,
        preview: {
          type: 'ap-bill',
          id: item.id,
          invoiceNumber: item.invoiceNumber,
          amountCop: item.amountCop,
          costCenterCode: item.costCenterCode,
          status: item.status,
          dueDate: item.dueDate,
          approvedBy: item.approvedBy,
        },
      }));
  },
};
