'use client';

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { VistasDeLaPestana, VISTAS_DE_CONTRATO_Y_DOCUMENTOS } from '@/components/portales/VistasDeLaPestana';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useEntradaTrasCargar } from '@/components/portales/use-entrada-tras-cargar';
import { PenNib } from '@phosphor-icons/react';
import { StatusBadge } from '@leasefy/cadence';

import { useContracts } from '@/lib/hooks/useContracts';
import { useI18n } from '@/lib/i18n';
import { formatCanon, formatDate } from './format';
import { SinArriendoTodavia } from '@/components/tenant/SinArriendoTodavia';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import type { Contract, ContractStatus } from '@/lib/types/contract';

// ============================================================================
// El estado, en la voz del inquilino (las etiquetas de la casa son las del panel: «Pendiente firma del inquilino»).
// ============================================================================

type Tono = 'success' | 'neutral' | 'critical' | 'warning' | 'info';

const ESTADO_PARA_EL_INQUILINO: Record<ContractStatus, { es: string; en: string; tono: Tono }> = {
  draft: { es: 'Borrador', en: 'Draft', tono: 'neutral' },
  pending_landlord: { es: 'Espera la firma del propietario', en: 'Waiting for the owner to sign', tono: 'neutral' },
  pending_tenant: { es: 'Te toca firmar', en: 'Your signature is needed', tono: 'warning' },
  rejected_pending_modifications: { es: 'En ajustes', en: 'Being adjusted', tono: 'neutral' },
  signed: { es: 'Firmado', en: 'Signed', tono: 'info' },
  active: { es: 'Vigente', en: 'Active', tono: 'success' },
  expired: { es: 'Terminado', en: 'Ended', tono: 'neutral' },
  cancelled: { es: 'Cancelado', en: 'Cancelled', tono: 'critical' },
};

// ============================================================================
// Contract Card
// ============================================================================

/*
 * GLOW UP (22-10): el estado con su punto y su palabra (StatusBadge) en vez de una pastilla con ícono; sin el
 * cartel «Requiere tu firma» en caja con borde dentro de la tarjeta ni el anillo azul (eran tres azules para lo
 * mismo: el estado ya dice «Te toca firmar» y el botón es el azul); la plata y las fechas en mono; el botón a la
 * derecha en escritorio (antes ocupaba todo el ancho a 1440).
 */
function ContractCard({ contract }: { contract: Contract }) {
  const { locale } = useI18n();
  const es = locale === 'es';
  const estado = ESTADO_PARA_EL_INQUILINO[contract.status];
  const isPendingTenant = contract.status === 'pending_tenant';

  return (
    <article
      className="rounded-lg border border-border bg-surface p-5 sm:p-6"
      data-testid={`contrato-del-inquilino-${contract.id}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="min-w-0 truncate text-body font-medium text-fg">
              {contract.propertyId === null ? (es ? 'Sin inmueble' : 'No property') : contract.propertyAddress}
            </h2>
            {estado && <StatusBadge tone={estado.tono}>{es ? estado.es : estado.en}</StatusBadge>}
          </div>
          {contract.propertyCity && <p className="text-sm text-fg-muted">{contract.propertyCity}</p>}

          <dl className="mt-4 grid max-w-lg grid-cols-3 gap-4">
            <div>
              <dt className="text-caption text-fg-muted">{es ? 'Canon mensual' : 'Monthly rent'}</dt>
              <dd className="font-mono text-sm tabular-nums text-fg">{formatCanon(contract.monthlyRent) ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-caption text-fg-muted">{es ? 'Inicio' : 'Start'}</dt>
              <dd className="font-mono text-sm tabular-nums text-fg">{formatDate(contract.startDate) ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-caption text-fg-muted">{es ? 'Fin' : 'End'}</dt>
              <dd className="font-mono text-sm tabular-nums text-fg">{formatDate(contract.endDate) ?? '—'}</dd>
            </div>
          </dl>
        </div>

        {/* El Button de Cadence (no un enlace pintado a mano): firmar es la azul; ver, la de borde. */}
        {isPendingTenant ? (
          <Button asChild size="sm" hideArrow className="w-full sm:w-auto">
            <Link href={`/inquilino/contratos/${contract.id}/firmar`}>
              <PenNib className="w-4 h-4" aria-hidden="true" />
              {es ? 'Revisar y firmar' : 'Review and sign'}
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline" hideArrow className="w-full sm:w-auto">
            <Link href={`/inquilino/contratos/${contract.id}/firmar`}>
              {es ? 'Ver contrato' : 'View contract'}
            </Link>
          </Button>
        )}
      </div>
    </article>
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
      <div className="bg-bg">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="list" className="mx-auto max-w-7xl" />
      </div>
    );
  }

  const es = locale === 'es';
  const porFirmar = contracts.filter((c) => c.status === 'pending_tenant').length;
  // C3 (revisora r25): el título es el de la pestaña, y debajo, cómo pasar a los documentos (antes, Documentos
  // quedaba huérfana: nada llevaba a ella).
  const encabezado = (
    <>
    <EncabezadoDePantalla
      className="mb-6"
      seccion={es ? 'Mi arriendo' : 'My rental'}
      titulo={es ? 'Contrato y documentos' : 'Contract and documents'}
      descripcion={
        porFirmar === 1
          ? es ? 'Tienes un contrato por firmar: va primero.' : 'You have one contract to sign: it comes first.'
          : porFirmar > 1
            ? es ? `Tienes ${porFirmar} contratos por firmar: van primero.` : `You have ${porFirmar} contracts to sign: they come first.`
            : es ? 'Revisa y firma tus contratos de arrendamiento.' : 'Review and sign your rental contracts.'
      }
    />
    <VistasDeLaPestana
      className="mb-8"
      etiqueta={es ? 'Contrato o documentos' : 'Contract or documents'}
      actual="/inquilino/contratos"
      vistas={VISTAS_DE_CONTRATO_Y_DOCUMENTOS(es)}
    />
    </>
  );

  // El mensaje crudo del backend —en inglés, con su jerga— no le sirve a un
  // inquilino, y este cartel no ofrecía ninguna salida. `FalloDeCarga` escribe
  // qué pasó y ofrece reintentar sólo si reintentar puede cambiar algo.
  if (error) {
    return (
      <div className="bg-bg">
        <div className="p-6 lg:p-8">
          {encabezado}
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
    <div className="bg-bg">
      <motion.div {...entrada} className="p-6 lg:p-8">
        {encabezado}

        {/* Empty state */}
        {sorted.length === 0 ? (
          <div>
            {/* Revisora r27 (CA): el mismo vacío en las pestañas de «Mi arriendo». */}
            <SinArriendoTodavia
              queVaAqui="Cuando te elijan en una postulación, aquí firmas tu contrato y lo descargas."
              whatGoesHere="When you are chosen in an application, you sign and download your lease here."
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
