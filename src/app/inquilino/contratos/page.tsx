'use client';

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useEntradaTrasCargar } from '@/components/portales/use-entrada-tras-cargar';
import { Handshake, MapPin, PenNib, Clock, CheckCircle, XCircle } from '@phosphor-icons/react';

import { useContracts } from '@/lib/hooks/useContracts';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { formatCanon, formatDate } from './format';
import { EmptyState } from '@/components/ui/empty-state';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
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

function ContractCard({ contract }: { contract: Contract }) {
  const { locale } = useI18n();
  const statusCfg = STATUS_CONFIG[contract.status];
  const StatusIcon = statusCfg.icon;
  const isPendingTenant = contract.status === 'pending_tenant';

  return (
    <div
      className={cn(
        'rounded-lg border bg-surface p-6 transition-[border-color,box-shadow]',
        isPendingTenant
          ? 'border-primary/30 ring-2 ring-primary/10'
          : 'border-border'
      )}
    >
      {/* Action needed banner */}
      {isPendingTenant && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-primary-soft border border-primary/30">
          <PenNib className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            {locale === 'es' ? 'Requiere tu firma' : 'Requires your signature'}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <MapPin className="w-5 h-5 text-fg-muted shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="font-medium text-fg truncate">
              {contract.propertyId === null ? 'Sin inmueble' : contract.propertyAddress}
            </h3>
            {contract.propertyCity && (
              <p className="text-sm text-fg-muted">
                {contract.propertyCity}
              </p>
            )}
          </div>
        </div>
        <span className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-medium flex-shrink-0',
          statusCfg.color
        )}>
          <StatusIcon className="w-3.5 h-3.5" />
          {CONTRACT_STATUS_LABELS[contract.status]}
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
        <div>
          <p className="text-caption text-fg-muted mb-0.5">
            {locale === 'es' ? 'Canon mensual' : 'Monthly rent'}
          </p>
          <p className="text-sm font-medium text-fg">
            {formatCanon(contract.monthlyRent) ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-caption text-fg-muted mb-0.5">
            {locale === 'es' ? 'Inicio' : 'Start'}
          </p>
          <p className="text-sm font-medium text-fg">
            {formatDate(contract.startDate) ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-caption text-fg-muted mb-0.5">
            {locale === 'es' ? 'Fin' : 'End'}
          </p>
          <p className="text-sm font-medium text-fg">
            {formatDate(contract.endDate) ?? '—'}
          </p>
        </div>
      </div>

      {/* Actions */}
      {/* El Button de Cadence (no un enlace pintado a mano): firmar es la azul; ver, la de borde. */}
      {isPendingTenant ? (
        <Button asChild hideArrow className="w-full">
          <Link href={`/inquilino/contratos/${contract.id}/firmar`}>
            <PenNib className="w-4 h-4" />
            {locale === 'es' ? 'Firmar contrato' : 'Sign contract'}
          </Link>
        </Button>
      ) : (
        <Button asChild variant="outline" hideArrow className="w-full">
          <Link href={`/inquilino/contratos/${contract.id}/firmar`}>
            {locale === 'es' ? 'Ver contrato' : 'View contract'}
          </Link>
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function ContratosPage() {
  const { locale } = useI18n();
  const { contracts, isLoading, error, errorCrudo, refetch: recargarContratos } = useContracts();

  // Carga → contenido: entra con 4 px sólo si se vio el esqueleto.
  const entrada = useEntradaTrasCargar(isLoading);

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="list" className="mx-auto max-w-7xl" />
      </div>
    );
  }

  // El mensaje crudo del backend —en inglés, con su jerga— no le sirve a un
  // inquilino, y este cartel no ofrecía ninguna salida. `FalloDeCarga` escribe
  // qué pasó y ofrece reintentar sólo si reintentar puede cambiar algo.
  if (error) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="p-6 lg:p-8">
          <FalloDeCarga
            error={errorCrudo ?? error}
            queEs="tus contratos"
            onReintentar={recargarContratos}
          />
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
      <motion.div {...entrada} className="space-y-6 p-6 lg:p-8">
        {/* Header */}
        <EncabezadoDePantalla
          className="mb-8"
          seccion={locale === 'es' ? 'Mi arriendo' : 'My rental'}
          titulo={locale === 'es' ? 'Mis contratos' : 'My contracts'}
          descripcion={
            locale === 'es' ? 'Revisa y firma tus contratos de arrendamiento.' : 'Review and sign your rental contracts.'
          }
        />

        {/* Empty state */}
        {sorted.length === 0 ? (
          <div>
            <EmptyState
              icon={Handshake}
              title={locale === 'es' ? 'Sin contratos aún' : 'No contracts yet'}
              /* "aplicación" está muerto: docs/VOCABULARIO.md. */
              description={locale === 'es'
                ? 'Cuando te elijan en una postulación y generen el contrato, aparecerá aquí para que lo firmes.'
                : 'When you are selected for an application and the contract is generated, it will appear here for you to sign.'}
              /* Era la única pantalla vacía sin ninguna acción: un callejón.
                 Para llegar a un contrato hay que postularse primero. */
              action={{
                label: locale === 'es' ? 'Ver propiedades para mí' : 'View properties for me',
                href: '/inquilino/para-ti',
              }}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map((contract) => (
              <ContractCard key={contract.id} contract={contract} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
