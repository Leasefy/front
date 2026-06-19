'use client';

/**
 * Contratos — list/index page for the agency's rental contracts.
 *
 * This is the destination for the "Contratos" sidebar item, the InsightsPanel
 * cards (contratos_por_vencer / firma_pendiente) and the contract-detail back
 * action — all of which router.push('/panel/inmobiliaria/contratos'). Until now
 * the index page did not exist, so every one of those navigations 404'd.
 *
 * Data: useContracts() → GET {NEXT_PUBLIC_BACKEND_URL}/contracts (getMine).
 * Fully theme-aware via semantic tokens (bg-card / border-border / text-* /
 * CONTRACT_STATUS_COLORS already ship dark variants).
 */

import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  ArrowsClockwise,
  Warning,
  CaretRight,
  House,
  User,
} from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { EmptyState } from '@/components/ui/empty-state';
import { useContracts } from '@/lib/hooks/useContracts';
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_COLORS,
  type Contract,
} from '@/lib/types/contract';

// ── Format helpers ───────────────────────────────────────────────────────────

function fmtCop(val: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

function fmtDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, dot }: { label: string; value: number | string; dot: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', dot)} />
        <span className="text-caption text-muted-foreground truncate">{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-medium tabular-nums text-foreground">{value}</p>
    </div>
  );
}

// ── Skeleton row ─────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border last:border-0 animate-pulse">
          {Array.from({ length: 5 }).map((__, j) => (
            <td key={j} className="px-5 py-4">
              <div className="h-4 rounded bg-muted w-20" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Content ──────────────────────────────────────────────────────────────────

function ContratosContent() {
  const { locale } = useI18n();
  const router = useRouter();
  const tx = (es: string, en: string) => (locale === 'en' ? en : es);

  const { contracts, stats, isLoading, error, refetch } = useContracts();

  const COLUMNS = [
    tx('Inquilino', 'Tenant'),
    tx('Propiedad', 'Property'),
    tx('Canon', 'Rent'),
    tx('Vigencia', 'Term'),
    tx('Estado', 'Status'),
    '',
  ];

  const openContract = (c: Contract) => router.push(`/panel/inmobiliaria/contratos/${c.id}`);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <SectionLabel>{tx('Portafolio', 'Portfolio')}</SectionLabel>
          <h1 className="text-h2 text-foreground">{tx('Contratos', 'Contracts')}</h1>
          <p className="text-body text-muted-foreground max-w-2xl">
            {tx(
              'Gestiona los contratos de arrendamiento de tu inmobiliaria: firma, vigencia y estado.',
              'Manage your agency rental contracts: signing, term and status.',
            )}
          </p>
        </div>
        <button
          onClick={() => router.push('/panel/inmobiliaria/contratos/nuevo')}
          className="inline-flex items-center gap-2 h-11 px-4 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-[#1636D8] transition-all active:scale-[0.97] flex-shrink-0"
        >
          <Plus className="w-4 h-4" weight="bold" />
          {tx('Nuevo contrato', 'New contract')}
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={tx('Total', 'Total')} value={isLoading ? '—' : stats.total} dot="bg-neutral-400" />
        <StatCard label={tx('Activos', 'Active')} value={isLoading ? '—' : stats.active} dot="bg-[#2C7A53]" />
        <StatCard
          label={tx('Pendientes de firma', 'Pending signature')}
          value={isLoading ? '—' : stats.pendingLandlord + stats.pendingTenant}
          dot="bg-[#B7791F]"
        />
        <StatCard label={tx('Borradores', 'Drafts')} value={isLoading ? '—' : stats.draft} dot="bg-neutral-400" />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-[#C4503B]/30 dark:border-[#C4503B]/40 bg-[#F8EAE7] dark:bg-[#C4503B]/15 p-4 flex items-start gap-2.5">
          <Warning className="w-5 h-5 text-[#C4503B] dark:text-[#E0664D] flex-shrink-0 mt-0.5" weight="fill" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#C4503B] dark:text-[#E0664D]">
              {tx('Error cargando contratos', 'Error loading contracts')}
            </p>
            <p className="text-xs text-[#C4503B] dark:text-[#E0664D]/90 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => void refetch()}
            className="h-7 px-2.5 rounded-md bg-white dark:bg-neutral-900 border border-[#C4503B]/30 text-[#C4503B] dark:text-[#E0664D] text-xs font-medium hover:bg-[#F8EAE7] dark:hover:bg-[#C4503B]/20 transition-colors flex-shrink-0"
          >
            {tx('Reintentar', 'Retry')}
          </button>
        </div>
      )}

      {/* Table */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
              <FileText className="w-[18px] h-[18px] text-neutral-600 dark:text-neutral-300" weight="duotone" />
            </div>
            <div>
              <h2 className="text-h4 text-foreground">{tx('Contratos', 'Contracts')}</h2>
              <p className="text-caption text-muted-foreground mt-0.5">
                {tx('Toca un contrato para ver el detalle y la firma.', 'Tap a contract to see detail and signing.')}
              </p>
            </div>
          </div>
          {!isLoading && !error && (
            <button
              onClick={() => void refetch()}
              title={tx('Actualizar', 'Refresh')}
              aria-label={tx('Actualizar', 'Refresh')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <ArrowsClockwise className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {COLUMNS.map((col, i) => (
                  <th
                    key={i}
                    className="text-left px-5 py-2.5 text-label text-muted-foreground font-normal whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && <TableSkeleton />}

              {!isLoading && !error && contracts.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="p-0">
                    <EmptyState
                      icon={FileText}
                      title={tx('Sin contratos aún', 'No contracts yet')}
                      description={tx(
                        'Crea tu primer contrato de arrendamiento para empezar.',
                        'Create your first rental contract to get started.',
                      )}
                    />
                  </td>
                </tr>
              )}

              {!isLoading &&
                contracts.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openContract(c)}
                    className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="grid place-items-center w-8 h-8 rounded-full bg-muted flex-shrink-0">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{c.tenantName || '—'}</p>
                          <p className="text-caption text-muted-foreground truncate">{c.tenantEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 max-w-[220px]">
                      <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                        <House className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate" title={`${c.propertyAddress}, ${c.propertyCity}`}>
                          {c.propertyAddress}
                          {c.propertyCity ? `, ${c.propertyCity}` : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 tabular-nums font-mono whitespace-nowrap text-foreground">
                      {fmtCop(c.monthlyRent)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-muted-foreground tabular-nums">
                      {fmtDate(c.startDate, locale)} <span className="opacity-50">→</span> {fmtDate(c.endDate, locale)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
                          CONTRACT_STATUS_COLORS[c.status] ?? 'bg-muted text-muted-foreground',
                        )}
                      >
                        {CONTRACT_STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <CaretRight className="w-4 h-4 text-muted-foreground inline-block" />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function ContratosPage() {
  return (
    <PageGuard module="portafolio">
      <ContratosContent />
    </PageGuard>
  );
}
