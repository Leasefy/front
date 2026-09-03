'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { conRegreso } from '@/lib/nav/ruta-de-regreso';
import { motion } from 'framer-motion';
import {
  User,
  Buildings,
  Bank,
  Phone,
  Envelope,
  MapPin,
  CalendarBlank,
  ArrowRight,
  CurrencyDollar,
  FileText,
  Images,
  UserCircle,
  Briefcase,
  ArrowsClockwise,
  HouseLine,
  Users,
  UploadSimple,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
import { consignacionesApi } from '@/lib/api/inmobiliaria.service';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IconButton } from '@leasefy/cadence';
import type { Consignacion, Copropietario, Propietario, Agente, AgenteRole } from '@/lib/types/inmobiliaria';
import { formatParticipacion } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

// Bank name mapping
const BANK_NAMES: Record<string, string> = {
  bancolombia: 'Bancolombia',
  davivienda: 'Davivienda',
  bbva: 'BBVA Colombia',
  bogota: 'Banco de Bogotá',
  occidente: 'Banco de Occidente',
  popular: 'Banco Popular',
  itau: 'Itaú',
  scotiabank: 'Scotiabank',
  cajasocial: 'Caja Social',
  av_villas: 'AV Villas',
};

// Role labels resolved via i18n
const ROLE_LABEL_KEYS: Record<AgenteRole, string> = {
  agent: 'inmobiliaria.consignaciones.roles.agent',
  coordinator: 'inmobiliaria.consignaciones.roles.coordinator',
  director: 'inmobiliaria.consignaciones.roles.director',
};

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function SectionCard({ title, icon, children, className }: SectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg overflow-hidden',
        className
      )}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border-faint dark:border-border-strong">
        <div className="w-8 h-8 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center text-fg-muted dark:text-fg-subtle">
          {icon}
        </div>
        <h3 className="font-semibold text-fg dark:text-white">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

// ============================================================================
// Property Info Section
// ============================================================================

interface PropertyInfoSectionProps {
  consignacion: Consignacion;
}

export function PropertyInfoSection({ consignacion }: PropertyInfoSectionProps) {
  const { t, formatDate } = useI18n();

  return (
    <SectionCard title={t('inmobiliaria.consignaciones.detail.propertyInfo')} icon={<Buildings className="w-4 h-4" />}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-fg-muted dark:text-fg-subtle mb-1">{t('inmobiliaria.consignaciones.detail.fullAddress')}</p>
            <p className="text-sm font-medium text-fg dark:text-white flex items-start gap-1.5">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-fg-subtle" />
              {consignacion.propertyAddress}
            </p>
          </div>
          <div>
            <p className="text-xs text-fg-muted dark:text-fg-subtle mb-1">{t('inmobiliaria.consignaciones.detail.zoneCity')}</p>
            <p className="text-sm font-medium text-fg dark:text-white">
              {consignacion.propertyZone}, {consignacion.propertyCity}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pt-3 border-t border-border-faint dark:border-border-strong">
          <div>
            <p className="text-xs text-fg-muted dark:text-fg-subtle mb-1">{t('inmobiliaria.consignaciones.detail.contractStartDate')}</p>
            <p className="text-sm font-medium text-fg dark:text-white flex items-center gap-1.5">
              <CalendarBlank className="w-4 h-4 text-fg-subtle" />
              {formatDate(consignacion.contractDate)}
            </p>
          </div>
          {consignacion.contractEndDate && (
            <div>
              <p className="text-xs text-fg-muted dark:text-fg-subtle mb-1">{t('inmobiliaria.consignaciones.detail.contractEndDate')}</p>
              <p className="text-sm font-medium text-fg dark:text-white flex items-center gap-1.5">
                <CalendarBlank className="w-4 h-4 text-fg-subtle" />
                {formatDate(consignacion.contractEndDate)}
              </p>
            </div>
          )}
          {consignacion.minimumTerm && (
            <div>
              <p className="text-xs text-fg-muted dark:text-fg-subtle mb-1">{t('inmobiliaria.consignaciones.detail.minimumTerm')}</p>
              <p className="text-sm font-medium text-fg dark:text-white">
                {consignacion.minimumTerm} {t('inmobiliaria.consignaciones.detail.months')}
              </p>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

// ============================================================================
// Propietario Section
// ============================================================================

interface PropietarioSectionProps {
  propietario: Propietario | undefined;
  /**
   * Todos los dueños con su participación (2026-09-03). Con uno solo, o vacío
   * contra un back viejo, la sección se ve igual que siempre; con más de uno se
   * lista quién es quién y cuánto le toca.
   */
  copropietarios?: Copropietario[];
  /** Cambiar de propietario (se vendió, heredó). Sin esto no se muestra el botón. */
  onCambiar?: () => void;
  /** La ruta de esta ficha, para que «Volver» en la del propietario regrese acá. */
  rutaDeOrigen?: string;
}

export function PropietarioSection({
  propietario,
  copropietarios,
  onCambiar,
  rutaDeOrigen,
}: PropietarioSectionProps) {
  const { t } = useI18n();
  // Sólo cuando hay más de uno. Con un dueño al 100 % mostrar «100 %» al lado
  // del nombre es ruido: no informa nada que no se supiera.
  const variosDuenos = (copropietarios?.length ?? 0) > 1;

  if (!propietario) {
    return (
      <SectionCard title={t('inmobiliaria.consignaciones.detail.ownerTitle')} icon={<User className="w-4 h-4" />}>
        <div className="text-center py-4 text-fg-muted dark:text-fg-subtle">
          {t('inmobiliaria.consignaciones.detail.ownerNotFound')}
        </div>
      </SectionCard>
    );
  }

  const isCompany = propietario.documentType === 'NIT';
  // bankAccount may be missing for owners without payout data loaded yet.
  const maskedAccount = propietario.bankAccount?.accountNumber
    ? `****${propietario.bankAccount.accountNumber.slice(-4)}`
    : null;

  return (
    <SectionCard title={t('inmobiliaria.consignaciones.detail.ownerTitle')} icon={<User className="w-4 h-4" />}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                isCompany
                  ? 'bg-surface-muted dark:bg-ink text-fg-muted dark:text-fg-subtle'
                  : 'bg-primary-soft text-primary'
              )}
            >
              {isCompany ? <Buildings className="w-6 h-6" /> : <User className="w-6 h-6" />}
            </div>
            <div>
              <h4 className="font-semibold text-fg dark:text-white">{propietario.name}</h4>
              <p className="text-sm text-fg-muted dark:text-fg-subtle">
                {propietario.documentType}: {propietario.documentNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {onCambiar && (
              <button
                type="button"
                onClick={onCambiar}
                className="text-sm text-fg-muted hover:text-fg"
                data-testid="cambiar-propietario"
              >
                Cambiar
              </button>
            )}
            <Link
              href={
                rutaDeOrigen
                  ? conRegreso(`/panel/inmobiliaria/propietarios/${propietario.id}`, rutaDeOrigen)
                  : `/panel/inmobiliaria/propietarios/${propietario.id}`
              }
              className="text-sm text-primary hover:text-primary dark:hover:text-primary flex items-center gap-1"
            >
              {t('inmobiliaria.consignaciones.detail.viewProfile')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Los dueños y su tajada. Sólo con más de uno — ver `variosDuenos`.
            El principal (el de mayor participación) va marcado: es el que hoy
            recibe el giro completo mientras el reparto por porcentaje no esté
            hecho en la liquidación. */}
        {variosDuenos && (
          <div
            className="p-3 rounded-lg bg-surface-muted dark:bg-bg space-y-2"
            data-testid="copropietarios-lista"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-fg-subtle" />
              <span className="text-xs text-fg-muted dark:text-fg-subtle">
                Propietarios ({copropietarios!.length})
              </span>
            </div>
            {copropietarios!.map((c, i) => (
              <div
                key={c.propietarioId}
                className="flex items-center justify-between gap-3"
                data-testid="copropietario-item"
              >
                <span className="min-w-0 truncate text-sm text-fg dark:text-white">
                  {c.propietario?.name ?? c.propietarioId}
                  {i === 0 && (
                    <span className="ml-1.5 text-xs text-fg-muted dark:text-fg-subtle">
                      · principal
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-mono text-sm tabular-nums text-fg dark:text-white">
                  {formatParticipacion(c.participacionBps)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Bank Account — only when payout data exists */}
        {propietario.bankAccount ? (
          <div className="p-3 rounded-lg bg-surface-muted dark:bg-bg">
            <div className="flex items-center gap-2 mb-2">
              <Bank className="w-4 h-4 text-fg-subtle" />
              <span className="text-xs text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.consignaciones.detail.paymentAccount')}</span>
            </div>
            <p className="text-sm font-medium text-fg dark:text-white">
              {BANK_NAMES[propietario.bankAccount.bank] || propietario.bankAccount.bank} - {propietario.bankAccount.accountType === 'savings' ? t('inmobiliaria.consignaciones.detail.accountTypeSavings') : t('inmobiliaria.consignaciones.detail.accountTypeChecking')}
            </p>
            {maskedAccount && <p className="text-sm text-fg-muted dark:text-fg-subtle">{maskedAccount}</p>}
          </div>
        ) : null}

        {/* Contact Buttons */}
        <div className="flex items-center gap-2">
          {propietario.email && (
            <a
              href={`mailto:${propietario.email}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface-muted dark:bg-ink text-fg dark:text-fg-subtle hover:bg-surface-muted dark:hover:bg-ink transition-colors text-sm font-medium"
            >
              <Envelope className="w-4 h-4" />
              {t('inmobiliaria.consignaciones.detail.email')}
            </a>
          )}
          {propietario.phone && (
            <a
              href={`tel:${propietario.phone}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface-muted dark:bg-ink text-fg dark:text-fg-subtle hover:bg-surface-muted dark:hover:bg-ink transition-colors text-sm font-medium"
            >
              <Phone className="w-4 h-4" />
              {t('inmobiliaria.consignaciones.detail.call')}
            </a>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

// ============================================================================
// Agente Section
// ============================================================================

interface AgenteSectionProps {
  agente: Agente | undefined;
  commissionPercent: number;
  /**
   * contract-addendum-2.md §8.6 — no sale-commission money movement is
   * computed anywhere in T-0038. `commissionPercent` is always `0` on a
   * sale mandate (§A.3), so an agent/agency split derived from it would
   * misleadingly render "0%" as if there were no commission at all.
   */
  isSaleListing?: boolean;
  onReassign?: () => void;
}

export function AgenteSection({ agente, commissionPercent, isSaleListing, onReassign }: AgenteSectionProps) {
  const { t } = useI18n();

  if (!agente) {
    return (
      <SectionCard title={t('inmobiliaria.consignaciones.detail.agentTitle')} icon={<Briefcase className="w-4 h-4" />}>
        {/* El vacío tiene salida. Antes era sólo la frase: quedaba claro que no
            había agente y no había forma de poner uno. */}
        <div className="py-6 text-center">
          <p className="text-sm text-fg-muted dark:text-fg-subtle">
            {t('inmobiliaria.consignaciones.detail.noAgentAssigned')}
          </p>
          {onReassign && (
            <>
              <p className="mx-auto mt-1 max-w-xs text-xs text-fg-subtle">
                Quien quede a cargo atiende las visitas y responde a los candidatos.
              </p>
              <Button hideArrow className="mt-4" onClick={onReassign}>
                Asignar agente
              </Button>
            </>
          )}
        </div>
      </SectionCard>
    );
  }

  // Calculate agent's commission from property commission
  const agentCommissionPercent = (commissionPercent * agente.commissionSplit) / 100;
  const agencyCommissionPercent = commissionPercent - agentCommissionPercent;

  return (
    <SectionCard title={t('inmobiliaria.consignaciones.detail.agentTitle')} icon={<Briefcase className="w-4 h-4" />}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          {agente.avatar ? (
            <img
              src={agente.avatar}
              alt={agente.name}
              className="w-12 h-12 rounded-xl object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center">
              <span className="text-lg font-semibold text-primary">
                {agente.name.charAt(0)}
              </span>
            </div>
          )}
          <div className="flex-1">
            <h4 className="font-semibold text-fg dark:text-white">{agente.name}</h4>
            <p className="text-sm text-fg-muted dark:text-fg-subtle">
              {t(ROLE_LABEL_KEYS[agente.role])} {agente.zone && `· ${agente.zone}`}
            </p>
          </div>
          <Badge
            variant={agente.status === 'active' ? 'success' : agente.status === 'on_leave' ? 'warning' : 'secondary'}
          >
            {agente.status === 'active' ? t('inmobiliaria.consignaciones.agentStatus.active') : agente.status === 'on_leave' ? t('inmobiliaria.consignaciones.agentStatus.onLeave') : t('inmobiliaria.consignaciones.agentStatus.inactive')}
          </Badge>
        </div>

        {/* Commission Split — not computed for a sale mandate (§8.6: no
            sale-commission money movement anywhere in T-0038). */}
        {isSaleListing ? (
          <div className="p-3 rounded-lg bg-surface-muted dark:bg-bg">
            <p className="text-xs text-fg-muted dark:text-fg-subtle">
              {t('inmobiliaria.consignaciones.detail.commissionSplitNotAvailableForSale')}
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-surface-muted dark:bg-bg">
            <div className="flex items-center gap-2 mb-2">
              <CurrencyDollar className="w-4 h-4 text-fg-subtle" />
              <span className="text-xs text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.consignaciones.detail.commissionDistribution')}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium text-fg dark:text-white">{agentCommissionPercent.toFixed(1)}%</span>
                <span className="text-fg-muted dark:text-fg-subtle ml-1">{t('inmobiliaria.consignaciones.detail.agentShare')}</span>
              </div>
              <div>
                <span className="font-medium text-fg dark:text-white">{agencyCommissionPercent.toFixed(1)}%</span>
                <span className="text-fg-muted dark:text-fg-subtle ml-1">{t('inmobiliaria.consignaciones.detail.agencyShare')}</span>
              </div>
            </div>
            <div className="mt-2 h-2 rounded-full bg-surface-muted dark:bg-ink overflow-hidden flex">
              <div
                className="bg-primary dark:bg-primary"
                style={{ width: `${agente.commissionSplit}%` }}
              />
              <div
                className="bg-muted dark:bg-muted"
                style={{ width: `${100 - agente.commissionSplit}%` }}
              />
            </div>
          </div>
        )}

        {/* Contact and Actions */}
        <div className="flex items-center gap-2">
          <a
            href={`mailto:${agente.email}`}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface-muted dark:bg-ink text-fg dark:text-fg-subtle hover:bg-surface-muted dark:hover:bg-ink transition-colors text-sm font-medium"
          >
            <Envelope className="w-4 h-4" />
            {t('inmobiliaria.consignaciones.detail.email')}
          </a>
          <a
            href={`tel:${agente.phone}`}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface-muted dark:bg-ink text-fg dark:text-fg-subtle hover:bg-surface-muted dark:hover:bg-ink transition-colors text-sm font-medium"
          >
            <Phone className="w-4 h-4" />
            {t('inmobiliaria.consignaciones.detail.call')}
          </a>
          <IconButton
            variant="outline"
            onClick={onReassign}
            aria-label={t('inmobiliaria.consignaciones.detail.reassignAgent')}
            title={t('inmobiliaria.consignaciones.detail.reassignAgent')}
            icon={<ArrowsClockwise className="w-4 h-4" />}
          />
        </div>
      </div>
    </SectionCard>
  );
}

// ============================================================================
// Current Lease Section
// ============================================================================

interface CurrentLeaseSectionProps {
  consignacion: Consignacion;
}

export function CurrentLeaseSection({ consignacion }: CurrentLeaseSectionProps) {
  const { t, formatDate } = useI18n();
  const hasLease = consignacion.availability === 'rented' && consignacion.currentTenantName;

  return (
    <SectionCard title={t('inmobiliaria.consignaciones.detail.currentLease')} icon={<HouseLine className="w-4 h-4" />}>
      {hasLease ? (
        <div className="space-y-4">
          {/* Tenant Info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-success-soft flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-success" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-fg dark:text-white">{consignacion.currentTenantName}</h4>
              <p className="text-sm text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.consignaciones.detail.currentTenant')}</p>
            </div>
          </div>

          {/* Lease Details */}
          <div className="grid grid-cols-2 gap-3">
            {consignacion.leaseEndDate && (
              <div className="p-3 rounded-lg bg-surface-muted dark:bg-bg">
                <p className="text-xs text-fg-muted dark:text-fg-subtle mb-1">{t('inmobiliaria.consignaciones.detail.leaseEnd')}</p>
                <p className="text-sm font-medium text-fg dark:text-white">
                  {formatDate(consignacion.leaseEndDate)}
                </p>
              </div>
            )}
            <div className="p-3 rounded-lg bg-surface-muted dark:bg-bg">
              <p className="text-xs text-fg-muted dark:text-fg-subtle mb-1">{t('inmobiliaria.consignaciones.detail.monthlyRentLabel')}</p>
              <p className="text-sm font-medium text-fg dark:text-white">
                {/* A SALE mandate can never have `availability: 'RENTED'`
                    (contract-addendum-2.md §A.7 rule R4), so `monthlyRent`
                    is unreachable-null here — narrow the type, never coalesce. */}
                {consignacion.monthlyRent != null ? formatCurrency(consignacion.monthlyRent) : '—'}
              </p>
            </div>
          </div>

          {/* View Lease Link */}
          <Button
            variant="secondary"
            hideArrow
            disabled
            title={t('inmobiliaria.consignaciones.header.comingSoon')}
            className="w-full"
          >
            <FileText className="w-4 h-4" />
            {t('inmobiliaria.consignaciones.detail.viewLeaseContract')}
          </Button>
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-muted dark:bg-ink flex items-center justify-center">
            <HouseLine className="w-6 h-6 text-fg-subtle" />
          </div>
          <p className="text-fg-muted dark:text-fg-subtle font-medium mb-1">{t('inmobiliaria.consignaciones.detail.noTenant')}</p>
          <p className="text-sm text-fg-muted dark:text-fg-subtle">
            {t('inmobiliaria.consignaciones.detail.propertyAvailable')}
          </p>
        </div>
      )}
    </SectionCard>
  );
}

// ============================================================================
// Documents Section
// ============================================================================

interface DocumentsSectionProps {
  consignacion: Consignacion;
  /** Después de adjuntar o reemplazar el contrato: la ficha se recarga. */
  onActualizado?: () => void;
}

const MAX_PDF_BYTES = 10 * 1024 * 1024;

/**
 * Documentos del inmueble — filas que hacen algo, o dicen por qué no.
 *
 * Antes (Nico, 2026-09-03: «uno le da clic a acta de entrega y no pasa nada,
 * y ese otro documento ¿qué es? ¿eso está mockeado?»): el contrato era un
 * botón deshabilitado «Próximamente» y el acta hacía scroll a una tarjeta que
 * ya estaba a la vista. Ahora:
 *   · Contrato de consignación: es el PDF que la inmobiliaria firmó con el
 *     propietario. Se ADJUNTA (PDF, hasta 10 MB) y de ahí en más la fila lo
 *     abre; «Reemplazar» sube otro. No se genera desde una plantilla: el
 *     producto no tiene plantilla de contrato y un contrato no se inventa.
 *   · Acta de entrega: abre la hoja imprimible (`/inmuebles/[id]/acta`), que
 *     también se baja como PDF.
 */
export function DocumentsSection({ consignacion, onActualizado }: DocumentsSectionProps) {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.consignaciones.detail.${s}`;
  const hasPhotos = consignacion.photosUrls && consignacion.photosUrls.length > 0;
  const filaClase =
    'w-full flex items-center gap-3 p-3 rounded-lg bg-surface-muted dark:bg-bg hover:bg-surface-hover dark:hover:bg-ink transition-colors text-left';
  const itemsDeInventario = consignacion.inventoryItems?.length || 0;

  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);

  const elegirPdf = () => inputRef.current?.click();

  const alElegir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Que el mismo archivo se pueda volver a elegir después de un fallo.
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' || file.size > MAX_PDF_BYTES) {
      toast.error(t(k('consignmentContractOnlyPdf')));
      return;
    }
    setSubiendo(true);
    try {
      await consignacionesApi.subirContrato(consignacion.id, file);
      toast.success(t(k('consignmentContractUploaded')));
      onActualizado?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      toast.error(t(k('consignmentContractUploadError')), {
        description: err instanceof ApiError && err.message.length < 160 ? err.message : undefined,
      });
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <SectionCard title={t(k('documents'))} icon={<FileText className="w-4 h-4" />}>
      <div className="space-y-3">
        {consignacion.consignmentContractUrl ? (
          <div className="flex items-center gap-2">
            <a
              href={consignacion.consignmentContractUrl}
              target="_blank"
              rel="noreferrer"
              className={filaClase}
              data-testid="documento-contrato"
            >
              <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
                <FileText className="w-5 h-5 text-fg-muted" weight="duotone" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-fg text-sm">{t(k('consignmentContract'))}</p>
                <p className="text-xs text-fg-muted">{t(k('consignmentContractView'))}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-fg-subtle" />
            </a>
            <button
              type="button"
              onClick={elegirPdf}
              disabled={subiendo}
              className="shrink-0 px-2 text-xs text-fg-muted underline-offset-2 hover:text-fg hover:underline disabled:opacity-50"
              data-testid="documento-contrato-reemplazar"
            >
              {subiendo ? t(k('consignmentContractUploading')) : t(k('consignmentContractReplace'))}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={elegirPdf}
            disabled={subiendo}
            className={cn(filaClase, 'disabled:opacity-60')}
            data-testid="documento-contrato-adjuntar"
          >
            <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
              <FileText className="w-5 h-5 text-fg-muted" weight="duotone" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-fg text-sm">{t(k('consignmentContract'))}</p>
              <p className="text-xs text-fg-muted">
                {t(k('consignmentContractMissing'))} ·{' '}
                <span className="text-primary">
                  {subiendo ? t(k('consignmentContractUploading')) : t(k('consignmentContractAttach'))}
                </span>
              </p>
            </div>
            <UploadSimple className="w-4 h-4 text-fg-subtle" />
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => void alElegir(e)}
          data-testid="documento-contrato-input"
        />

        <Link
          href={`/panel/inmobiliaria/inmuebles/${consignacion.id}/acta`}
          className={filaClase}
          data-testid="documento-acta"
        >
          <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
            <FileText className="w-5 h-5 text-fg-muted" weight="duotone" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-fg text-sm">{t(k('handoverReport'))}</p>
            <p className="text-xs text-fg-muted">
              {t(k('inventoryItemsCount'), { count: itemsDeInventario })} ·{' '}
              <span className="text-primary">{t(k('handoverReportOpen'))}</span>
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-fg-subtle" />
        </Link>

        {/* Photos Gallery */}
        {hasPhotos && (
          <div className="pt-3 border-t border-border-faint dark:border-border-strong">
            <div className="flex items-center gap-2 mb-3">
              <Images className="w-4 h-4 text-fg-subtle" />
              <span className="text-sm text-fg-muted dark:text-fg-subtle">
                {t('inmobiliaria.consignaciones.detail.gallery', { count: consignacion.photosUrls!.length })}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {consignacion.photosUrls!.slice(0, 4).map((url, i) => (
                <div key={i} className="aspect-square rounded-md overflow-hidden bg-surface-muted dark:bg-ink">
                  <img src={url} alt={t('inmobiliaria.consignaciones.detail.photoAlt', { number: i + 1 })} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            {consignacion.photosUrls!.length > 4 && (
              <Button variant="link" hideArrow className="w-full mt-2">
                {t('inmobiliaria.consignaciones.detail.viewMorePhotos', { count: consignacion.photosUrls!.length - 4 })}
              </Button>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
