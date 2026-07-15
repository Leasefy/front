'use client';

import Link from 'next/link';
import { FileMagnifyingGlass } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/data-display/EmptyState';
import { STATUS_BADGE } from '@/lib/types/avaluo';
import type { AvaluoStatus } from '@/lib/types/avaluo';
import { AVALUO_WIZARD_URL } from '@/lib/avaluo/wizard-url';

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
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Avalúos
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Seguimiento de tus solicitudes de avalúo comercial
          </p>
        </div>

        <Button asChild hideArrow className="shrink-0">
          <a href={AVALUO_WIZARD_URL} target="_blank" rel="noopener noreferrer">Solicitar avalúo</a>
        </Button>
      </div>

      {/* ── List ──────────────────────────────────────────────────── */}
      {avaluos.length === 0 ? (
        <EmptyState
          icon={FileMagnifyingGlass}
          title="Aún no tenés avalúos"
          description="Solicitá tu primer avalúo comercial para conocer el valor de mercado de un inmueble."
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 bg-muted/40 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground">
              Dirección
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              Estado
            </span>
            <span className="text-xs font-medium text-muted-foreground hidden sm:block">
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
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-sm font-medium text-foreground truncate">
                      {item.address}
                    </span>

                    <Badge
                      variant={
                        badge.variant as React.ComponentProps<typeof Badge>['variant']
                      }
                    >
                      {badge.label}
                    </Badge>

                    <span className="text-xs text-muted-foreground hidden sm:block whitespace-nowrap">
                      {formattedDate}
                    </span>

                    <span className="text-xs font-medium text-primary">
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
