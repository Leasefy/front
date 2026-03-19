'use client';

import Link from 'next/link';
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
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { Consignacion, Propietario, Agente, AgenteRole } from '@/lib/types/inmobiliaria';
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
        'rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] overflow-hidden',
        className
      )}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
        <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-400">
          {icon}
        </div>
        <h3 className="font-semibold text-neutral-900 dark:text-white">{title}</h3>
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
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('inmobiliaria.consignaciones.detail.fullAddress')}</p>
            <p className="text-sm font-medium text-neutral-900 dark:text-white flex items-start gap-1.5">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-neutral-400" />
              {consignacion.propertyAddress}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('inmobiliaria.consignaciones.detail.zoneCity')}</p>
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              {consignacion.propertyZone}, {consignacion.propertyCity}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('inmobiliaria.consignaciones.detail.contractStartDate')}</p>
            <p className="text-sm font-medium text-neutral-900 dark:text-white flex items-center gap-1.5">
              <CalendarBlank className="w-4 h-4 text-neutral-400" />
              {formatDate(consignacion.contractDate)}
            </p>
          </div>
          {consignacion.contractEndDate && (
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('inmobiliaria.consignaciones.detail.contractEndDate')}</p>
              <p className="text-sm font-medium text-neutral-900 dark:text-white flex items-center gap-1.5">
                <CalendarBlank className="w-4 h-4 text-neutral-400" />
                {formatDate(consignacion.contractEndDate)}
              </p>
            </div>
          )}
          {consignacion.minimumTerm && (
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('inmobiliaria.consignaciones.detail.minimumTerm')}</p>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">
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
}

export function PropietarioSection({ propietario }: PropietarioSectionProps) {
  const { t } = useI18n();

  if (!propietario) {
    return (
      <SectionCard title={t('inmobiliaria.consignaciones.detail.ownerTitle')} icon={<User className="w-4 h-4" />}>
        <div className="text-center py-4 text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.consignaciones.detail.ownerNotFound')}
        </div>
      </SectionCard>
    );
  }

  const isCompany = propietario.documentType === 'NIT';
  const maskedAccount = `****${propietario.bankAccount.accountNumber.slice(-4)}`;

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
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
              )}
            >
              {isCompany ? <Buildings className="w-6 h-6" /> : <User className="w-6 h-6" />}
            </div>
            <div>
              <h4 className="font-semibold text-neutral-900 dark:text-white">{propietario.name}</h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {propietario.documentType}: {propietario.documentNumber}
              </p>
            </div>
          </div>
          <Link
            href={`/panel/inmobiliaria/propietarios/${propietario.id}`}
            className="text-sm text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
          >
            {t('inmobiliaria.consignaciones.detail.viewProfile')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Bank Account */}
        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#141416]">
          <div className="flex items-center gap-2 mb-2">
            <Bank className="w-4 h-4 text-neutral-400" />
            <span className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.consignaciones.detail.paymentAccount')}</span>
          </div>
          <p className="text-sm font-medium text-neutral-900 dark:text-white">
            {BANK_NAMES[propietario.bankAccount.bank] || propietario.bankAccount.bank} - {propietario.bankAccount.accountType === 'savings' ? t('inmobiliaria.consignaciones.detail.accountTypeSavings') : t('inmobiliaria.consignaciones.detail.accountTypeChecking')}
          </p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{maskedAccount}</p>
        </div>

        {/* Contact Buttons */}
        <div className="flex items-center gap-2">
          <a
            href={`mailto:${propietario.email}`}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-sm font-medium"
          >
            <Envelope className="w-4 h-4" />
            {t('inmobiliaria.consignaciones.detail.email')}
          </a>
          <a
            href={`tel:${propietario.phone}`}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-sm font-medium"
          >
            <Phone className="w-4 h-4" />
            {t('inmobiliaria.consignaciones.detail.call')}
          </a>
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
  onReassign?: () => void;
}

export function AgenteSection({ agente, commissionPercent, onReassign }: AgenteSectionProps) {
  const { t } = useI18n();

  if (!agente) {
    return (
      <SectionCard title={t('inmobiliaria.consignaciones.detail.agentTitle')} icon={<Briefcase className="w-4 h-4" />}>
        <div className="text-center py-4 text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.consignaciones.detail.noAgentAssigned')}
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
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                {agente.name.charAt(0)}
              </span>
            </div>
          )}
          <div className="flex-1">
            <h4 className="font-semibold text-neutral-900 dark:text-white">{agente.name}</h4>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t(ROLE_LABEL_KEYS[agente.role])} {agente.zone && `· ${agente.zone}`}
            </p>
          </div>
          <div
            className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              agente.status === 'active'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : agente.status === 'on_leave'
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
            )}
          >
            {agente.status === 'active' ? t('inmobiliaria.consignaciones.agentStatus.active') : agente.status === 'on_leave' ? t('inmobiliaria.consignaciones.agentStatus.onLeave') : t('inmobiliaria.consignaciones.agentStatus.inactive')}
          </div>
        </div>

        {/* Commission Split */}
        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#141416]">
          <div className="flex items-center gap-2 mb-2">
            <CurrencyDollar className="w-4 h-4 text-neutral-400" />
            <span className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.consignaciones.detail.commissionDistribution')}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="font-medium text-neutral-900 dark:text-white">{agentCommissionPercent.toFixed(1)}%</span>
              <span className="text-neutral-500 dark:text-neutral-400 ml-1">{t('inmobiliaria.consignaciones.detail.agentShare')}</span>
            </div>
            <div>
              <span className="font-medium text-neutral-900 dark:text-white">{agencyCommissionPercent.toFixed(1)}%</span>
              <span className="text-neutral-500 dark:text-neutral-400 ml-1">{t('inmobiliaria.consignaciones.detail.agencyShare')}</span>
            </div>
          </div>
          <div className="mt-2 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden flex">
            <div
              className="bg-indigo-500 dark:bg-indigo-400"
              style={{ width: `${agente.commissionSplit}%` }}
            />
            <div
              className="bg-neutral-400 dark:bg-neutral-500"
              style={{ width: `${100 - agente.commissionSplit}%` }}
            />
          </div>
        </div>

        {/* Contact and Actions */}
        <div className="flex items-center gap-2">
          <a
            href={`mailto:${agente.email}`}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-sm font-medium"
          >
            <Envelope className="w-4 h-4" />
            {t('inmobiliaria.consignaciones.detail.email')}
          </a>
          <a
            href={`tel:${agente.phone}`}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-sm font-medium"
          >
            <Phone className="w-4 h-4" />
            {t('inmobiliaria.consignaciones.detail.call')}
          </a>
          <button
            onClick={onReassign}
            className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title={t('inmobiliaria.consignaciones.detail.reassignAgent')}
          >
            <ArrowsClockwise className="w-4 h-4" />
          </button>
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
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-neutral-900 dark:text-white">{consignacion.currentTenantName}</h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.consignaciones.detail.currentTenant')}</p>
            </div>
          </div>

          {/* Lease Details */}
          <div className="grid grid-cols-2 gap-3">
            {consignacion.leaseEndDate && (
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#141416]">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('inmobiliaria.consignaciones.detail.leaseEnd')}</p>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  {formatDate(consignacion.leaseEndDate)}
                </p>
              </div>
            )}
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#141416]">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('inmobiliaria.consignaciones.detail.monthlyRentLabel')}</p>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                {formatCurrency(consignacion.monthlyRent)}
              </p>
            </div>
          </div>

          {/* View Lease Link */}
          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-sm opacity-50 cursor-not-allowed"
            disabled
            title={t('inmobiliaria.consignaciones.header.comingSoon')}
          >
            <FileText className="w-4 h-4" />
            {t('inmobiliaria.consignaciones.detail.viewLeaseContract')}
          </button>
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <HouseLine className="w-6 h-6 text-neutral-400" />
          </div>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium mb-1">{t('inmobiliaria.consignaciones.detail.noTenant')}</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
  onViewInventory?: () => void;
}

export function DocumentsSection({ consignacion, onViewInventory }: DocumentsSectionProps) {
  const { t } = useI18n();
  const hasPhotos = consignacion.photosUrls && consignacion.photosUrls.length > 0;

  return (
    <SectionCard title={t('inmobiliaria.consignaciones.detail.documents')} icon={<FileText className="w-4 h-4" />}>
      <div className="space-y-3">
        {/* Consignment Contract */}
        <button
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-[#141416] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left opacity-50 cursor-not-allowed"
          disabled
          title={t('inmobiliaria.consignaciones.header.comingSoon')}
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-neutral-900 dark:text-white text-sm">{t('inmobiliaria.consignaciones.detail.consignmentContract')}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.consignaciones.detail.consignmentContractDesc')}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-400" />
        </button>

        {/* Acta de Entrega */}
        <button
          onClick={onViewInventory}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-[#141416] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-neutral-900 dark:text-white text-sm">{t('inmobiliaria.consignaciones.detail.handoverReport')}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('inmobiliaria.consignaciones.detail.inventoryItemsCount', { count: consignacion.inventoryItems?.length || 0 })}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-400" />
        </button>

        {/* Photos Gallery */}
        {hasPhotos && (
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2 mb-3">
              <Images className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {t('inmobiliaria.consignaciones.detail.gallery', { count: consignacion.photosUrls!.length })}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {consignacion.photosUrls!.slice(0, 4).map((url, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                  <img src={url} alt={t('inmobiliaria.consignaciones.detail.photoAlt', { number: i + 1 })} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            {consignacion.photosUrls!.length > 4 && (
              <button className="w-full mt-2 text-sm text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400">
                {t('inmobiliaria.consignaciones.detail.viewMorePhotos', { count: consignacion.photosUrls!.length - 4 })}
              </button>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
