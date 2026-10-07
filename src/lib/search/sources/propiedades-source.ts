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
import { formatoPesos } from '@/lib/plata/formato';
import { numeroDeLaConsulta } from '@/lib/search/consulta-del-buscador';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** BU-01 (04-10-2026): «#24», «# 24», «24» e «inmueble 24» son el código 24. */
const PALABRAS_DEL_INMUEBLE = ['inmueble', 'propiedad', 'codigo', 'cod'] as const;

export function codigoQueBusca(q: string): number | null {
  const n = numeroDeLaConsulta(q, PALABRAS_DEL_INMUEBLE);
  return n === null ? null : Number(n);
}

export function matchesQuery(item: AgencyProperty, q: string): boolean {
  const codigo = codigoQueBusca(q);
  if (codigo !== null && item.code === codigo) return true;
  // Con «#» o la palabra, lo escrito ES un código: no se busca en la dirección.
  if (codigo !== null && !/^\s*\d+\s*$/.test(q)) return false;
  const n = norm(q);
  return (
    norm(item.title).includes(n) ||
    norm(item.address).includes(n) ||
    norm(item.neighborhood ?? '').includes(n) ||
    norm(item.city).includes(n)
  );
}

/** BU-03 (04-10-2026): la plata completa, como la escribe la casa («$ 1.100.000»), no «$1.1M». */
function formatCOP(amount: number): string {
  return formatoPesos(amount);
}

const STATUS_COLORS: Record<string, 'green' | 'amber' | 'neutral'> = {
  available: 'green',
  published: 'green',
  rented: 'neutral',
  pending: 'amber',
  reserved: 'amber',
  draft: 'amber',
};

// 🟠 BU-03/BU-08 (04-10-2026): el back manda el estado en MAYÚSCULAS
// («RENTED», «AVAILABLE») y el mapa sólo tenía minúsculas: en pantalla salía
// el código en inglés. Se busca sin importar mayúsculas, y lo que no se
// reconozca no sale (nunca un código crudo).
const STATUS_LABELS_ES: Record<string, string> = {
  available: 'Disponible',
  published: 'Publicado',
  rented: 'Arrendado',
  pending: 'Pendiente',
  reserved: 'Reservado',
  draft: 'Borrador',
  inactive: 'Inactivo',
  sold: 'Vendido',
};

export function estadoEnPalabras(status: string | null | undefined): string | null {
  return STATUS_LABELS_ES[String(status ?? '').toLowerCase()] ?? null;
}

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

    const codigo = codigoQueBusca(query);
    return all
      .filter((item) => matchesQuery(item, query))
      // El que tiene ESE código va primero.
      .sort((a, b) => Number(b.code === codigo) - Number(a.code === codigo))
      .slice(0, 8)
      .map((item): SearchResult => ({
        id: `propiedades:${item.id}`,
        sourceId: 'propiedades',
        type: 'propiedad',
        title: item.title,
        subtitle: `${item.address}, ${item.city}`,
        badges: [
          ...(item.code != null ? [{ label: `#${item.code}`, color: 'neutral' as const }] : []),
          ...(estadoEnPalabras(item.status)
            ? [
                {
                  label: estadoEnPalabras(item.status) as string,
                  color: STATUS_COLORS[String(item.status).toLowerCase()] ?? ('neutral' as const),
                },
              ]
            : []),
          // T-0038 §3.2.4 — a SALE listing's `monthlyRent` is `null`; show
          // `salePrice` instead rather than crash `formatCOP` or coalesce to
          // a fabricated "$0" badge (C6).
          item.listingType === 'sale'
            ? { label: item.salePrice != null ? formatCOP(item.salePrice) : 'Precio por confirmar', color: 'neutral' as const }
            : { label: item.monthlyRent != null ? formatCOP(item.monthlyRent) : 'Canon por confirmar', color: 'neutral' as const },
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
