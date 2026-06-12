'use client';

import Link from 'next/link';
import { FileMagnifyingGlass } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/data-display/EmptyState';
import { STATUS_BADGE } from '@/lib/types/avaluo';
import type { AvaluoStatus } from '@/lib/types/avaluo';

// ---------------------------------------------------------------------------
// Local type — AvaluoListItem
// Backend list endpoint not yet available; define the shape here so the page
// is ready to wire once the endpoint exists.
// ---------------------------------------------------------------------------

type AvaluoListItem = {
  id: string;
  address: string;
  status: AvaluoStatus;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Data hook (stub)
// ---------------------------------------------------------------------------

/**
 * Returns the agency's avalúo list.
 *
 * TODO: wire backend list endpoint when available.
 * Expected endpoint: GET /api/avaluo?agencyId=<id>  →  AvaluoListItem[]
 */
function useAgencyAvaluos(): AvaluoListItem[] {
  // TODO: replace with real fetch once backend list endpoint is available
  return [];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * /panel/inmobiliaria/avaluos
 *
 * Lists the agency's submitted avalúos with their current status badges.
 * The parent layout provides AuthProvider + agency sidebar — do NOT add
 * ForceLightMode here (panel is not a public light-only route).
 */
export default function AvaluosListPage() {
  const avaluos = useAgencyAvaluos();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            Avalúos
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Seguimiento de tus solicitudes de avalúo comercial
          </p>
        </div>

        <Link
          href="/panel/inmobiliaria/avaluos/nuevo"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#1A40FF] px-4 h-10 text-sm font-medium text-white hover:bg-[#1636D8] transition-colors active:scale-[0.97]"
        >
          Solicitar avalúo
        </Link>
      </div>

      {/* ── List ──────────────────────────────────────────────────── */}
      {avaluos.length === 0 ? (
        <EmptyState
          icon={FileMagnifyingGlass}
          title="Aún no tenés avalúos"
          description="Solicitá tu primer avalúo comercial para conocer el valor de mercado de un inmueble."
          primaryCta={{
            label: 'Solicitar avalúo',
            href: '/panel/inmobiliaria/avaluos/nuevo',
          }}
        />
      ) : (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-700">
            <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-[0.08em]">
              Dirección
            </span>
            <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-[0.08em]">
              Estado
            </span>
            <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-[0.08em] hidden sm:block">
              Fecha
            </span>
            <span className="sr-only">Ver</span>
          </div>

          {/* Rows */}
          <ul role="list" className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {avaluos.map((item) => {
              const badge = STATUS_BADGE[item.status];
              const formattedDate = new Date(item.createdAt).toLocaleDateString(
                'es-CO',
                { day: '2-digit', month: 'short', year: 'numeric' }
              );

              return (
                <li key={item.id}>
                  <Link
                    href={`/panel/inmobiliaria/avaluos/${item.id}`}
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                  >
                    <span className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                      {item.address}
                    </span>

                    <Badge
                      variant={
                        badge.variant as React.ComponentProps<typeof Badge>['variant']
                      }
                    >
                      {badge.label}
                    </Badge>

                    <span className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:block whitespace-nowrap">
                      {formattedDate}
                    </span>

                    <span className="text-xs font-medium text-[#1A40FF] dark:text-[#5570FF]">
                      Ver
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
