'use client';

/**
 * debtors-source — federated search source for cobranza debtors.
 *
 * Calls GET /api/agency/:agencyId/cobranza/debtors?search=<query>
 * using the same URL construction + auth headers as use-debtor-list.ts.
 *
 * PII: cedulaMasked / phoneMasked / emailMasked are already masked by the
 * backend (Phase 31 D-31-04). We never unmask here.
 *
 * href: /panel/inmobiliaria/ai/cobranza/deudores/:id — deep-links to
 * the debtor detail page (Phase 31 plan 31-09 route).
 */

import { agentAuthHeaders } from '@/lib/api/agent-auth';
import { STAGE_LABELS_ES, stageColorClasses } from '@/lib/cartera';
import type { SearchSource, SearchResult } from '@/lib/hooks/useFederatedSearch';
import type { DebtorListResponse } from '@/lib/hooks/cobranza/use-debtor-list';
import { Users } from '@phosphor-icons/react';

function stageToColor(
  stage: string,
): 'green' | 'amber' | 'red' | 'violet' | 'neutral' {
  if (stage === 'S0' || stage === 'S1') return 'green';
  if (stage === 'S2' || stage === 'S3') return 'amber';
  if (stage === 'S4' || stage === 'S5') return 'red';
  if (stage === 'SX') return 'violet';
  return 'neutral';
}

export const debtorsSource: SearchSource = {
  id: 'debtors',
  labelKey: 'inmobiliaria.commandPalette.sources.debtors',
  icon: Users,
  permission: { module: 'cobranza', action: 'view' },

  async run(query, ctx, signal) {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
    if (!agentUrl || !ctx.agencyId) return [];

    const qs = new URLSearchParams({ search: query });
    const url = `${agentUrl}/api/agency/${ctx.agencyId}/cobranza/debtors?${qs}`;

    const res = await globalThis.fetch(url, {
      headers: agentAuthHeaders(),
      signal,
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const json = (await res.json()) as DebtorListResponse;

    return json.items.slice(0, 8).map((item): SearchResult => {
      const stageLabel =
        STAGE_LABELS_ES[item.currentStage as keyof typeof STAGE_LABELS_ES] ??
        item.currentStage;

      return {
        id: `debtors:${item.id}`,
        sourceId: 'debtors',
        type: 'debtor',
        title: item.fullName,
        subtitle: item.cedulaMasked,
        badges: [
          {
            label: stageLabel,
            color: stageToColor(item.currentStage),
          },
          ...(item.daysInStage > 0
            ? [
                {
                  label: `${item.daysInStage}d`,
                  color: stageToColor(item.currentStage),
                } as const,
              ]
            : []),
        ],
        href: `/panel/inmobiliaria/ai/cobranza/deudores/${item.id}`,
        preview: {
          type: 'debtor',
          id: item.id,
          fullName: item.fullName,
          cedulaMasked: item.cedulaMasked,
          phoneMasked: item.phoneMasked,
          emailMasked: item.emailMasked ?? null,
          currentStage: item.currentStage,
          stageLabel,
          daysInStage: item.daysInStage,
          channel: item.channel,
          isPaused: item.isPaused,
          lastActivityAt: item.lastActivityAt,
          stageColors: stageColorClasses(
            item.currentStage as keyof typeof STAGE_LABELS_ES,
          ),
        },
      };
    });
  },
};
