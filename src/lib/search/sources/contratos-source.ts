'use client';

/**
 * contratos-source — federated search for rental contracts.
 *
 * Calls GET /contracts (returns the user's contracts as agency admin).
 * No server-side search param — client-filter by tenantName, propertyAddress,
 * tenantDocument (accent+case insensitive).
 *
 * Permission: contratos:view (module name used by inmobiliaria nav).
 * href: /panel/inmobiliaria/contratos/{id}
 */

import { getAccessToken } from '@/lib/api/client';
import type { BackendContract } from '@/lib/api/contracts.types';
import type { SearchSource, SearchResult } from '@/lib/hooks/useFederatedSearch';
import { FileText } from '@phosphor-icons/react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function matchesQuery(item: BackendContract, q: string): boolean {
  const n = norm(q);
  return (
    norm(item.tenantName ?? '').includes(n) ||
    norm(item.propertyAddress ?? '').includes(n) ||
    norm(item.tenantDocument ?? '').includes(n) ||
    norm(item.tenantEmail ?? '').includes(n) ||
    // T-0040 — buscar por el consecutivo es el punto de darle un número al
    // contrato: escribir «14» encuentra el contrato #14. Es filtrado en
    // cliente sobre la respuesta que `GET /contracts` ya devuelve — sin
    // parámetro de query nuevo y sin costo en el back.
    norm(String(item.code ?? '')).includes(n)
  );
}

function formatCOP(amount: number): string {
  if (amount === 0) return '$0';
  const millions = amount / 1_000_000;
  if (millions >= 1) return `$${millions.toFixed(1)}M`;
  const thousands = amount / 1_000;
  return `$${Math.round(thousands)}k`;
}

const STATUS_COLORS: Record<string, 'green' | 'amber' | 'red' | 'violet' | 'neutral'> = {
  ACTIVE: 'green',
  SIGNED: 'violet',
  PENDING_TENANT: 'amber',
  PENDING_TENANT_SIGNATURE: 'amber',
  PENDING_LANDLORD: 'amber',
  PENDING_LANDLORD_SIGNATURE: 'amber',
  DRAFT: 'neutral',
  EXPIRED: 'red',
  CANCELLED: 'red',
  REJECTED_PENDING_MODIFICATIONS: 'red',
};

const STATUS_LABELS_ES: Record<string, string> = {
  ACTIVE: 'Activo',
  SIGNED: 'Firmado',
  PENDING_TENANT: 'Pdte. inquilino',
  PENDING_TENANT_SIGNATURE: 'Pdte. inquilino',
  PENDING_LANDLORD: 'Pdte. propietario',
  PENDING_LANDLORD_SIGNATURE: 'Pdte. propietario',
  DRAFT: 'Borrador',
  EXPIRED: 'Expirado',
  CANCELLED: 'Cancelado',
  REJECTED_PENDING_MODIFICATIONS: 'En revisión',
};

export const contratosSource: SearchSource = {
  id: 'contratos',
  labelKey: 'inmobiliaria.commandPalette.sources.contratos',
  icon: FileText,
  // NOTE: The inmobiliaria nav uses no specific permission module for contratos
  // (the nav item doesn't list a module guard). We use 'contratos' to align
  // with any future permission gate; if absent the source still renders.
  // No permission gate set here — contracts are visible to all agency members.

  async run(query, _ctx, signal) {
    if (!BACKEND_URL) return [];
    const token = getAccessToken();
    const res = await globalThis.fetch(`${BACKEND_URL}/contracts`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal,
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const all = (await res.json()) as BackendContract[];

    return all
      .filter((item) => matchesQuery(item, query))
      .slice(0, 8)
      .map((item): SearchResult => ({
        id: `contratos:${item.id}`,
        sourceId: 'contratos',
        type: 'contrato',
        /*
         * T-0040 — el consecutivo entra como segundo escalón, delante del
         * UUID. Este fallback existe justo para los contratos sin otra
         * etiqueta, que es lo que es una fila MIGRADA. El corte de UUID se
         * queda como tercer escalón: es lo que se renderiza si el `back` es
         * anterior a T-0040.
         */
        title:
          item.tenantName ??
          (item.code != null
            ? `Contrato #${item.code}`
            : `Contrato ${item.id.slice(0, 8)}`),
        subtitle: item.propertyAddress ?? item.propertyCity ?? '',
        badges: [
          {
            label: STATUS_LABELS_ES[item.status] ?? item.status,
            color: STATUS_COLORS[item.status] ?? 'neutral',
          },
          // Un contrato MIGRADO sparse (T-0031) puede tener `monthlyRent` en
          // `null` — el badge simplemente se omite (igual que hoy se omite
          // para un canon en 0), nunca se muestra "$ 0".
          ...(item.monthlyRent != null && item.monthlyRent > 0
            ? [{ label: formatCOP(item.monthlyRent), color: 'neutral' as const }]
            : []),
        ],
        href: `/panel/inmobiliaria/contratos/${item.id}`,
        preview: {
          type: 'contrato',
          id: item.id,
          tenantName: item.tenantName ?? null,
          tenantEmail: item.tenantEmail ?? null,
          propertyAddress: item.propertyAddress ?? null,
          propertyCity: item.propertyCity ?? null,
          monthlyRent: item.monthlyRent,
          status: item.status,
          startDate: item.startDate,
          endDate: item.endDate,
        },
      }));
  },
};
