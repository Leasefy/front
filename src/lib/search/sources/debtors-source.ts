'use client';

/**
 * debtors-source — federated search source for cobranza debtors.
 *
 * PRIMARY path: GET /api/agency/:agencyId/search?q=<query>&types=debtor&limit=8
 *   Trigram/unaccent fuzzy search via the unified agent search endpoint.
 *   Falls back automatically when the endpoint is unavailable (migration pending)
 *   or returns any error — see agent-search-client for cooldown semantics.
 *
 * FALLBACK path: GET /api/agency/:agencyId/cobranza/debtors?search=<query>
 *   Original per-entity endpoint with server-side search param. Kept verbatim
 *   so the palette keeps working even when the new endpoint is down.
 *
 * PII: cedulaMasked / phoneMasked / emailMasked are already masked by the
 * backend (Phase 31 D-31-04). We never unmask here.
 *
 * href: /panel/inmobiliaria/pagos/cobranza/deudores/:id
 */

import { agentFetch } from '@/lib/api/agent-fetch';
import { STAGE_LABELS_ES, stageColorClasses } from '@/lib/cartera';
import type { SearchSource, SearchResult } from '@/lib/hooks/useFederatedSearch';
import type { DebtorListResponse } from '@/lib/hooks/cobranza/use-debtor-list';
import { agentSearch } from '@/lib/search/agent-search-client';
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

/** «S0» → «Al día»; «S1» → «Mora temprana»… `null` si no es un código de etapa. */
export function etiquetaDeLaEtapa(codigo: string): string | null {
  if (codigo === 'S0') return 'Al día';
  const larga = STAGE_LABELS_ES[codigo as keyof typeof STAGE_LABELS_ES];
  return larga ? larga.split(' · ')[0] : null;
}

const CANALES: Record<string, string> = {
  whatsapp: 'WhatsApp',
  voice: 'Llamada',
  voz: 'Llamada',
  call: 'Llamada',
  email: 'Correo',
  sms: 'SMS',
};

/** El canal preferido en palabras; `null` para «mixed» o algo que no se reconoce. */
export function etiquetaDelCanal(canal: string | undefined): string | null {
  return canal ? (CANALES[canal.toLowerCase()] ?? null) : null;
}

export const debtorsSource: SearchSource = {
  id: 'debtors',
  labelKey: 'inmobiliaria.commandPalette.sources.debtors',
  icon: Users,
  permission: { module: 'cobranza', action: 'view' },

  async run(query, ctx, signal) {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
    if (!agentUrl || !ctx.agencyId) return [];

    // ── Primary: unified fuzzy search endpoint ──────────────────────────────
    const serverResults = await agentSearch(query, 'debtor', ctx.agencyId, signal);

    if (serverResults !== null) {
      // Map endpoint shape → palette SearchResult.
      // `ref` is the masked cédula; href is constructed from `id` (not from ref).
      // badges[] are plain label strings from the server; first = stage label,
      // second (if present) = days-in-stage chip.
      return serverResults.map((item): SearchResult => {
        // 🟠 BU-08 (04-10-2026): el micro manda el CÓDIGO de la etapa y el
        // canal («S0», «mixed»): en pantalla salía «S0 mixed». Se dicen en
        // palabras («Al día», «Mora temprana», «WhatsApp»); el canal «mixto»
        // no le dice nada a nadie y no se muestra.
        const crudo = item.badges[0] ?? '';
        const stageCode = crudo.split(/[\s–-]/)[0] ?? '';
        const stageLabel = etiquetaDeLaEtapa(stageCode) ?? crudo;
        const canal = etiquetaDelCanal(item.badges[1]);
        const stageColor = stageToColor(stageCode);
        const badges: NonNullable<SearchResult['badges']> = [];
        if (stageLabel) badges.push({ label: stageLabel, color: stageColor });
        if (canal) badges.push({ label: canal, color: 'neutral' });

        return {
          id: `debtors:${item.id}`,
          sourceId: 'debtors',
          type: 'debtor',
          title: item.title,
          subtitle: item.ref ?? undefined,
          badges,
          href: `/panel/inmobiliaria/pagos/cobranza/deudores/${item.id}`,
          // Preview degrades gracefully — panel already null-guards all fields.
          preview: {
            type: 'debtor',
            id: item.id,
            fullName: item.title,
            cedulaMasked: item.ref ?? null,
            phoneMasked: null,
            emailMasked: null,
            currentStage: stageCode,
            stageLabel,
            daysInStage: 0,
            channel: null,
            isPaused: false,
            lastActivityAt: null,
            stageColors: stageColorClasses(
              stageCode as keyof typeof STAGE_LABELS_ES,
            ),
          },
        };
      });
    }

    // ── Fallback: original per-entity endpoint ──────────────────────────────
    const qs = new URLSearchParams({ search: query });
    const url = `${agentUrl}/api/agency/${ctx.agencyId}/cobranza/debtors?${qs}`;

    const res = await agentFetch(url, {
      signal,
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const json = (await res.json()) as DebtorListResponse;

    return json.items.slice(0, 8).map((item): SearchResult => {
      const stageLabel = etiquetaDeLaEtapa(item.currentStage) ?? item.currentStage;

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
                  label: `${item.daysInStage} ${item.daysInStage === 1 ? 'día' : 'días'}`,
                  color: stageToColor(item.currentStage),
                } as const,
              ]
            : []),
        ],
        href: `/panel/inmobiliaria/pagos/cobranza/deudores/${item.id}`,
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
