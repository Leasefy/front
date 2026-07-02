'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Handshake, MapPin, Calendar, CurrencyDollar, PenNib, Clock, CheckCircle, XCircle, WarningCircle } from '@phosphor-icons/react';

import { useContracts } from '@/lib/hooks/useContracts';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import type { Contract, ContractStatus } from '@/lib/types/contract';
import { CONTRACT_STATUS_LABELS } from '@/lib/types/contract';

// ============================================================================
// Status config for badges
// ============================================================================

const STATUS_CONFIG: Record<ContractStatus, { color: string; icon: typeof CheckCircle }> = {
  draft: { color: 'bg-surface-muted text-fg-muted', icon: Clock },
  pending_landlord: { color: 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F]', icon: Clock },
  pending_tenant: { color: 'bg-[#EEF1FF] text-[#1A40FF] dark:bg-[#1A40FF]/15 dark:text-[#5570FF]', icon: PenNib },
  rejected_pending_modifications: { color: 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F]', icon: Clock },
  signed: { color: 'bg-[#EEF1FF] text-[#1A40FF] dark:bg-[#1A40FF]/15 dark:text-[#5570FF]', icon: CheckCircle },
  active: { color: 'bg-[#E8F3EC] text-[#2C7A53] dark:bg-[#2C7A53]/15 dark:text-[#3EAE70]', icon: CheckCircle },
  expired: { color: 'bg-surface-muted text-fg-muted', icon: XCircle },
  cancelled: { color: 'bg-[#F8EAE7] text-[#C4503B]', icon: XCircle },
};

// ============================================================================
// Contract Card
// ============================================================================

function ContractCard({ contract, index }: { contract: Contract; index: number }) {
  const { locale } = useI18n();
  const statusCfg = STATUS_CONFIG[contract.status];
  const StatusIcon = statusCfg.icon;
  const isPendingTenant = contract.status === 'pending_tenant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
      className={cn(
        'rounded-xl border bg-surface dark:bg-[#1a1a1c] p-6 transition-all',
        isPendingTenant
          ? 'border-[#1A40FF]/30 dark:border-[#1A40FF]/40 ring-2 ring-[#1A40FF]/10'
          : 'border-border dark:border-border-strong'
      )}
    >
      {/* Action needed banner */}
      {isPendingTenant && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 border border-[#1A40FF]/30 dark:border-[#1A40FF]/40">
          <PenNib className="w-4 h-4 text-[#1A40FF] dark:text-[#5570FF]" />
          <span className="text-sm font-medium text-[#1A40FF] dark:text-[#5570FF]">
            {locale === 'es' ? 'Requiere tu firma' : 'Requires your signature'}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-surface-muted dark:bg-ink flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-fg-muted" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-fg dark:text-white truncate">
              {contract.propertyAddress}
            </h3>
            <p className="text-sm text-fg-muted dark:text-fg-subtle">
              {contract.propertyCity}
            </p>
          </div>
        </div>
        <span className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0',
          statusCfg.color
        )}>
          <StatusIcon className="w-3.5 h-3.5" />
          {CONTRACT_STATUS_LABELS[contract.status]}
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
        <div>
          <p className="text-xs text-fg-muted dark:text-fg-subtle mb-0.5">
            {locale === 'es' ? 'Canon mensual' : 'Monthly rent'}
          </p>
          <p className="text-sm font-semibold text-fg dark:text-white">
            {formatCurrency(contract.monthlyRent)}
          </p>
        </div>
        <div>
          <p className="text-xs text-fg-muted dark:text-fg-subtle mb-0.5">
            {locale === 'es' ? 'Inicio' : 'Start'}
          </p>
          <p className="text-sm font-medium text-fg dark:text-neutral-200">
            {formatDate(contract.startDate)}
          </p>
        </div>
        <div>
          <p className="text-xs text-fg-muted dark:text-fg-subtle mb-0.5">
            {locale === 'es' ? 'Fin' : 'End'}
          </p>
          <p className="text-sm font-medium text-fg dark:text-neutral-200">
            {formatDate(contract.endDate)}
          </p>
        </div>
      </div>

      {/* Actions */}
      {isPendingTenant ? (
        <Link
          href={`/inquilino/contratos/${contract.id}/firmar`}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#1A40FF] hover:opacity-90 text-white text-sm font-semibold transition-colors"
        >
          <PenNib className="w-4 h-4" />
          {locale === 'es' ? 'Firmar contrato' : 'Sign contract'}
        </Link>
      ) : (
        <Link
          href={`/inquilino/contratos/${contract.id}/firmar`}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border dark:border-border-strong text-sm font-medium text-fg dark:text-neutral-200 hover:bg-surface-muted dark:hover:bg-[#2a2a2c] transition-colors"
        >
          {locale === 'es' ? 'Ver contrato' : 'View contract'}
        </Link>
      )}
    </motion.div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function ContratosPage() {
  const { locale } = useI18n();
  const { contracts, isLoading, error } = useContracts();

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10] flex items-center justify-center">
        <Spinner size="lg" variant="muted" />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-xl bg-[#F8EAE7] dark:bg-[#C4503B]/15 flex items-center justify-center mx-auto mb-4">
              <WarningCircle className="w-8 h-8 text-[#C4503B]" />
            </div>
            <h2 className="text-lg font-semibold text-fg dark:text-white mb-2">
              {locale === 'es' ? 'Error cargando contratos' : 'Error loading contracts'}
            </h2>
            <p className="text-fg-muted dark:text-fg-subtle">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Sort: pending_tenant first, then by updatedAt desc
  const sorted = [...contracts].sort((a, b) => {
    if (a.status === 'pending_tenant' && b.status !== 'pending_tenant') return -1;
    if (b.status === 'pending_tenant' && a.status !== 'pending_tenant') return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-medium text-fg dark:text-white tracking-tight">
            {locale === 'es' ? 'Mis Contratos' : 'My Contracts'}
          </h1>
          <p className="mt-1 text-fg-muted dark:text-fg-subtle">
            {locale === 'es'
              ? 'Revisa y firma tus contratos de arrendamiento'
              : 'Review and sign your rental contracts'}
          </p>
        </motion.header>

        {/* Empty state */}
        {sorted.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <EmptyState
              icon={Handshake}
              title={locale === 'es' ? 'Sin contratos aún' : 'No contracts yet'}
              description={locale === 'es'
                ? 'Cuando un propietario apruebe tu aplicación y genere un contrato, aparecerá aquí para que lo firmes.'
                : 'When a landlord approves your application and generates a contract, it will appear here for you to sign.'}
            />
          </motion.div>
        ) : (
          <div className="space-y-4">
            {sorted.map((contract, index) => (
              <ContractCard key={contract.id} contract={contract} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
