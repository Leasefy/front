'use client';

/**
 * /panel/inmobiliaria/avaluos/[id] — agency avalúo detail page.
 *
 * Reuses useAvaluoStatus (polling hook) and AvaluoEstadoCard (status card
 * with WompiPayButton + download link) from plans 34-03/34-04.
 *
 * The parent layout provides AuthProvider + agency sidebar — do NOT add
 * ForceLightMode here (panel is not a public light-only route).
 */

import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';
import { useParams } from 'next/navigation';
import { useAvaluoStatus } from '@/lib/hooks/use-avaluo-status';
import { AvaluoEstadoCard } from '@/components/avaluo/AvaluoEstadoCard';

export default function PanelAvaluoDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { statusData, isLoading } = useAvaluoStatus(id ?? null);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* ── Back nav ──────────────────────────────────────────────── */}
      <Link
        href="/panel/inmobiliaria/avaluos"
        className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Todos los avalúos
      </Link>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
          Avalúo comercial
        </p>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
          Detalle del avalúo
        </h1>
        {id && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-mono">
            Referencia: {id}
          </p>
        )}
      </div>

      {/* ── Status card — reuses AvaluoEstadoCard from 34-04 ─────── */}
      <div className="max-w-xl">
        <AvaluoEstadoCard
          submissionId={id ?? ''}
          statusData={statusData}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
