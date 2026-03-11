'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Handshake, MapPin, Calendar, CurrencyDollar, PenNib, Clock, CheckCircle, XCircle, WarningCircle, SpinnerGap } from '@phosphor-icons/react';

import { useContracts } from '@/lib/hooks/useContracts';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import { EmptyState } from '@/components/ui/empty-state';
import type { Contract, ContractStatus } from '@/lib/types/contract';
import { CONTRACT_STATUS_LABELS } from '@/lib/types/contract';

// ============================================================================
// Status config for badges
// ============================================================================

const STATUS_CONFIG: Record<ContractStatus, { color: string; icon: typeof CheckCircle }> = {
  draft: { color: 'bg-neutral-100 text-neutral-600', icon: Clock },
  pending_landlord: { color: 'bg-amber-100 text-amber-700', icon: Clock },
  pending_tenant: { color: 'bg-indigo-100 text-indigo-700', icon: PenNib },
  active: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  expired: { color: 'bg-neutral-100 text-neutral-500', icon: XCircle },
  cancelled: { color: 'bg-red-100 text-red-600', icon: XCircle },
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
        'rounded-3xl border bg-white dark:bg-[#1a1a1c] p-6 transition-all',
        isPendingTenant
          ? 'border-indigo-200 dark:border-indigo-800/60 ring-2 ring-indigo-500/10'
          : 'border-neutral-200 dark:border-neutral-800'
      )}
    >
      {/* Action needed banner */}
      {isPendingTenant && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/50">
          <PenNib className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            {locale === 'es' ? 'Requiere tu firma' : 'Requires your signature'}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-neutral-500" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-neutral-900 dark:text-white truncate">
              {contract.propertyAddress}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">
            {locale === 'es' ? 'Canon mensual' : 'Monthly rent'}
          </p>
          <p className="text-sm font-semibold text-neutral-900 dark:text-white">
            {formatCurrency(contract.monthlyRent)}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">
            {locale === 'es' ? 'Inicio' : 'Start'}
          </p>
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            {formatDate(contract.startDate)}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">
            {locale === 'es' ? 'Fin' : 'End'}
          </p>
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            {formatDate(contract.endDate)}
          </p>
        </div>
      </div>

      {/* Actions */}
      {isPendingTenant ? (
        <Link
          href={`/inquilino/contratos/${contract.id}/firmar`}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/25"
        >
          <PenNib className="w-4 h-4" />
          {locale === 'es' ? 'Firmar contrato' : 'Sign contract'}
        </Link>
      ) : (
        <Link
          href={`/inquilino/contratos/${contract.id}/firmar`}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-[#2a2a2c] transition-colors"
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
      <div className="min-h-screen bg-white dark:bg-[#0f0f10] flex items-center justify-center">
        <SpinnerGap className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f10]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <WarningCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              {locale === 'es' ? 'Error cargando contratos' : 'Error loading contracts'}
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400">{error}</p>
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
    <div className="min-h-screen bg-white dark:bg-[#0f0f10]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Handshake className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
              {locale === 'es' ? 'Mis Contratos' : 'My Contracts'}
            </h1>
          </div>
          <p className="text-neutral-500 dark:text-neutral-400 ml-[52px]">
            {locale === 'es'
              ? 'Revisa y firma tus contratos de arrendamiento'
              : 'Review and sign your rental contracts'}
          </p>
        </motion.div>

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
