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
  pending_landlord: { color: 'bg-warning-soft text-warning', icon: Clock },
  pending_tenant: { color: 'bg-primary-soft text-primary', icon: PenNib },
  rejected_pending_modifications: { color: 'bg-warning-soft text-warning', icon: Clock },
  signed: { color: 'bg-primary-soft text-primary', icon: CheckCircle },
  active: { color: 'bg-success-soft text-success', icon: CheckCircle },
  expired: { color: 'bg-surface-muted text-fg-muted', icon: XCircle },
  cancelled: { color: 'bg-danger-soft text-danger', icon: XCircle },
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
        'rounded-xl border bg-surface p-6 transition-all',
        isPendingTenant
          ? 'border-primary/30 ring-2 ring-primary/10'
          : 'border-border'
      )}
    >
      {/* Action needed banner */}
      {isPendingTenant && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-primary-soft border border-primary/30">
          <PenNib className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            {locale === 'es' ? 'Requiere tu firma' : 'Requires your signature'}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-fg-muted" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-fg truncate">
              {contract.propertyAddress}
            </h3>
            <p className="text-sm text-fg-muted">
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
          <p className="text-xs text-fg-muted mb-0.5">
            {locale === 'es' ? 'Canon mensual' : 'Monthly rent'}
          </p>
          <p className="text-sm font-semibold text-fg">
            {formatCurrency(contract.monthlyRent)}
          </p>
        </div>
        <div>
          <p className="text-xs text-fg-muted mb-0.5">
            {locale === 'es' ? 'Inicio' : 'Start'}
          </p>
          <p className="text-sm font-medium text-fg">
            {formatDate(contract.startDate)}
          </p>
        </div>
        <div>
          <p className="text-xs text-fg-muted mb-0.5">
            {locale === 'es' ? 'Fin' : 'End'}
          </p>
          <p className="text-sm font-medium text-fg">
            {formatDate(contract.endDate)}
          </p>
        </div>
      </div>

      {/* Actions */}
      {isPendingTenant ? (
        <Link
          href={`/inquilino/contratos/${contract.id}/firmar`}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary hover:opacity-90 text-white text-sm font-semibold transition-colors"
        >
          <PenNib className="w-4 h-4" />
          {locale === 'es' ? 'Firmar contrato' : 'Sign contract'}
        </Link>
      ) : (
        <Link
          href={`/inquilino/contratos/${contract.id}/firmar`}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border text-sm font-medium text-fg hover:bg-surface-muted transition-colors"
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
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" variant="muted" />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-xl bg-danger-soft flex items-center justify-center mx-auto mb-4">
              <WarningCircle className="w-8 h-8 text-danger" />
            </div>
            <h2 className="text-lg font-semibold text-fg mb-2">
              {locale === 'es' ? 'Error cargando contratos' : 'Error loading contracts'}
            </h2>
            <p className="text-fg-muted">{error}</p>
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
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-medium text-fg tracking-tight">
            {locale === 'es' ? 'Mis Contratos' : 'My Contracts'}
          </h1>
          <p className="mt-1 text-fg-muted">
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
              /* "aplicación" está muerto: docs/VOCABULARIO.md. */
              description={locale === 'es'
                ? 'Cuando te elijan en una postulación y generen el contrato, aparecerá aquí para que lo firmes.'
                : 'When you are selected for an application and the contract is generated, it will appear here for you to sign.'}
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
