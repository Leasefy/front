'use client';

/**
 * ap-bills-source — federated search for AP (Accounts Payable) bills.
 *
 * Calls GET /api/agency/:agencyId/ap/bills (Phase 40, D-40-02).
 * Response shape: { bills: ApBill[] }
 * No search param — client-filter by invoiceNumber, costCenterCode, status.
 *
 * Bill rows do NOT embed vendor name (only vendorId). Title = invoiceNumber;
 * subtitle = costCenterCode + status.
 *
 * Permission: ap:view
 * href: /panel/inmobiliaria/tesoreria (no individual bill detail route in mvp yet)
 */

import { agentAuthHeaders } from '@/lib/api/agent-auth';
import type { SearchSource, SearchResult } from '@/lib/hooks/useFederatedSearch';
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
        href: `/panel/inmobiliaria/tesoreria/ap/${item.id}`,
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
