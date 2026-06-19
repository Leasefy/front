'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HouseLine,
  User,
  UserCircle,
  Calendar,
  Clock,
  Key,
  Lightning,
  Signature,
  DownloadSimple,
  Printer,
  CheckCircle,
  Warning,
  CaretDown,
  CaretUp,
  Package,
  ClipboardText,
  Receipt,
  Envelope,
  Phone,
  IdentificationCard,
  Image,
  X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import type { ActaEntrega, RoomType, ItemCondition } from '@/lib/types/inmobiliaria';
import {
  getRoomLabel,
  getConditionLabel,
  getConditionColor,
  getActaTypeLabel,
  getActaStatusLabel,
  getActaStatusColor,
} from '@/lib/types/inmobiliaria';

// ============================================================================
// Types
// ============================================================================

interface ActaEntregaViewerProps {
  acta: ActaEntrega;
  onDownloadPDF?: () => void;
  onPrint?: () => void;
  onRequestSignature?: (party: 'tenant' | 'owner' | 'agent') => void;
}

// ============================================================================
// Subcomponents
// ============================================================================

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-surface-muted hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary-soft flex items-center justify-center text-primary">
            {icon}
          </div>
          <span className="font-medium text-foreground">{title}</span>
        </div>
        {isOpen ? (
          <CaretUp className="w-4 h-4 text-neutral-500" />
        ) : (
          <CaretDown className="w-4 h-4 text-neutral-500" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-5 bg-card">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PartyCardProps {
  label: string;
  name: string;
  cedula: string;
  phone?: string;
  email?: string;
  icon: React.ReactNode;
}

function PartyCard({ label, name, cedula, phone, email, icon }: PartyCardProps) {
  return (
    <div className="p-4 rounded-xl bg-surface-muted border border-border">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="font-medium text-foreground">{name}</p>
        </div>
      </div>
      <div className="space-y-1 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <IdentificationCard className="w-4 h-4 text-neutral-400" />
          <span>{cedula}</span>
        </div>
        {phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-neutral-400" />
            <span>{phone}</span>
          </div>
        )}
        {email && (
          <div className="flex items-center gap-2">
            <Envelope className="w-4 h-4 text-neutral-400" />
            <span className="truncate">{email}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ActaEntregaViewer - Read-only view of a completed or in-progress acta
 * Displays all sections: property, parties, inventory, meters, keys, signatures
 */
export function ActaEntregaViewer({
  acta,
  onDownloadPDF,
  onPrint,
  onRequestSignature,
}: ActaEntregaViewerProps) {
  const { t, locale, formatDate: fmtDate } = useI18n();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Format date
  const formatDateFull = (dateString: string) => {
    return fmtDate(dateString);
  };

  const formatDateTime = (dateString: string) => {
    return fmtDate(dateString);
  };

  // Calculate inventory summary
  const inventorySummary = useMemo(() => {
    const summary: Record<ItemCondition, number> = {
      excelente: 0,
      bueno: 0,
      regular: 0,
      malo: 0,
      no_aplica: 0,
    };
    acta.items.forEach((item) => {
      summary[item.condition]++;
    });
    return summary;
  }, [acta.items]);

  // Group items by room
  const itemsByRoom = useMemo(() => {
    const grouped: Record<RoomType, typeof acta.items> = {} as Record<RoomType, typeof acta.items>;
    acta.items.forEach((item) => {
      if (!grouped[item.room]) {
        grouped[item.room] = [];
      }
      grouped[item.room].push(item);
    });
    return grouped;
  }, [acta.items]);

  // Check signature status
  const getSignatureStatus = (party: 'tenant' | 'owner' | 'agent') => {
    const signature = acta.signatures.find((s) => s.party === party);
    if (signature?.signedAt) return 'signed';
    if (signature) return 'pending';
    return 'missing';
  };

  // Total keys
  const totalKeys = acta.keysDelivered.reduce((sum, k) => sum + k.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium',
                  acta.type === 'entrega'
                    ? 'bg-primary-soft text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {getActaTypeLabel(acta.type)}
              </span>
              <span className={cn('px-3 py-1 rounded-full text-xs font-medium', getActaStatusColor(acta.status))}>
                {getActaStatusLabel(acta.status)}
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">
              {acta.propertyTitle}
            </h1>
            <p className="text-sm text-muted-foreground">{acta.propertyAddress}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDateFull(acta.deliveryDate)}
              </span>
              {acta.deliveryTime && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {acta.deliveryTime}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" hideArrow onClick={onPrint} className="gap-1.5">
              <Printer className="w-4 h-4" />
              {t('inmobiliaria.acta.print')}
            </Button>
            <Button hideArrow onClick={onDownloadPDF} className="gap-1.5">
              <DownloadSimple className="w-4 h-4" />
              {t('inmobiliaria.acta.downloadPdf')}
            </Button>
          </div>
        </div>
      </div>

      {/* Parties Section */}
      <Section title={t('inmobiliaria.acta.partiesInvolved')} icon={<User className="w-4 h-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PartyCard
            label={t('inmobiliaria.acta.tenant')}
            name={acta.tenantName}
            cedula={acta.tenantCedula}
            phone={acta.tenantPhone}
            email={acta.tenantEmail}
            icon={<User className="w-5 h-5 text-neutral-500" />}
          />
          <PartyCard
            label={t('inmobiliaria.acta.owner')}
            name={acta.propietarioName}
            cedula=""
            icon={<HouseLine className="w-5 h-5 text-neutral-500" />}
          />
          <PartyCard
            label={t('inmobiliaria.acta.agent')}
            name={acta.agenteName}
            cedula=""
            icon={<UserCircle className="w-5 h-5 text-neutral-500" />}
          />
        </div>
      </Section>

      {/* Inventory Section */}
      <Section title={t('inmobiliaria.acta.inventorySection')} icon={<Package className="w-4 h-4" />}>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
          {(Object.entries(inventorySummary) as [ItemCondition, number][]).map(([condition, count]) => (
            <div
              key={condition}
              className={cn('px-3 py-2 rounded-xl text-center', getConditionColor(condition))}
            >
              <p className="text-lg font-bold">{count}</p>
              <p className="text-xs">{getConditionLabel(condition)}</p>
            </div>
          ))}
        </div>

        {/* Items by Room */}
        <div className="space-y-4">
          {acta.rooms.map((room) => {
            const roomItems = itemsByRoom[room] || [];
            if (roomItems.length === 0) return null;

            return (
              <div
                key={room}
                className="border border-border rounded-xl overflow-hidden"
              >
                <div className="px-4 py-3 bg-surface-muted border-b border-border">
                  <h4 className="font-medium text-foreground">
                    {getRoomLabel(room)}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {roomItems.length} {t('inmobiliaria.acta.itemsLabel')}
                  </p>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-4 text-xs font-medium text-neutral-500 uppercase">
                          {t('inmobiliaria.acta.thItem')}
                        </th>
                        <th className="text-center py-2 px-4 text-xs font-medium text-neutral-500 uppercase">
                          {t('inmobiliaria.acta.thQty')}
                        </th>
                        <th className="text-center py-2 px-4 text-xs font-medium text-neutral-500 uppercase">
                          {t('inmobiliaria.acta.thCondition')}
                        </th>
                        <th className="text-left py-2 px-4 text-xs font-medium text-neutral-500 uppercase">
                          {t('inmobiliaria.acta.thNotes')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {roomItems.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-neutral-50 dark:border-neutral-800/50 last:border-0"
                        >
                          <td className="py-3 px-4">
                            <span className="font-medium text-foreground text-sm">
                              {item.name}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-muted-foreground text-sm">
                              {item.quantity}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-center">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                                  getConditionColor(item.condition)
                                )}
                              >
                                {item.condition === 'malo' || item.condition === 'regular' ? (
                                  <Warning className="w-3 h-3" />
                                ) : (
                                  <CheckCircle className="w-3 h-3" />
                                )}
                                {getConditionLabel(item.condition)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {item.hasDefects && item.defectDescription ? (
                              <span className="text-warning text-sm">
                                {item.defectDescription}
                              </span>
                            ) : (
                              <span className="text-neutral-400 text-sm">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden p-4 space-y-3">
                  {roomItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-md bg-surface-muted"
                    >
                      <div className="flex items-start justify-between">
                        <p className="font-medium text-foreground text-sm">
                          {item.name}
                        </p>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                            getConditionColor(item.condition)
                          )}
                        >
                          {getConditionLabel(item.condition)}
                        </span>
                      </div>
                      {item.hasDefects && item.defectDescription && (
                        <p className="text-xs text-warning mt-1">
                          {item.defectDescription}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Meters Section */}
      <Section title={t('inmobiliaria.acta.metersTitle')} icon={<Lightning className="w-4 h-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {acta.meterReadings.map((meter) => {
            const icons = {
              agua: '💧',
              luz: <Lightning className="w-4 h-4 text-warning" />,
              gas: '🔥',
            };
            const colors = {
              agua: 'bg-primary-soft',
              luz: 'bg-warning-soft',
              gas: 'bg-warning-soft',
            };
            const labels = {
              agua: t('inmobiliaria.acta.water'),
              luz: t('inmobiliaria.acta.electricity'),
              gas: t('inmobiliaria.acta.gas'),
            };

            return (
              <div
                key={meter.type}
                className="p-4 rounded-xl bg-surface-muted border border-border"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn('w-10 h-10 rounded-md flex items-center justify-center', colors[meter.type])}>
                    {typeof icons[meter.type] === 'string' ? (
                      <span>{icons[meter.type]}</span>
                    ) : (
                      icons[meter.type]
                    )}
                  </div>
                  <span className="font-medium text-foreground">
                    {labels[meter.type]}
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground font-mono">
                  {meter.reading}
                </p>
                <p className="text-xs text-muted-foreground">{meter.unit}</p>
              </div>
            );
          })}

          {acta.meterReadings.length === 0 && (
            <div className="col-span-3 p-6 text-center text-muted-foreground">
              {t('inmobiliaria.acta.noReadings')}
            </div>
          )}
        </div>
      </Section>

      {/* Keys Section */}
      <Section title={`${t('inmobiliaria.acta.keysDelivered')} (${totalKeys})`} icon={<Key className="w-4 h-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {acta.keysDelivered.map((key, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border"
            >
              <div className="w-10 h-10 rounded-md bg-surface-muted flex items-center justify-center">
                <Key className="w-5 h-5 text-fg-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  {key.type}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('inmobiliaria.acta.quantity')}: {key.quantity}
                </p>
              </div>
            </div>
          ))}

          {acta.keysDelivered.length === 0 && (
            <div className="col-span-3 p-6 text-center text-muted-foreground">
              {t('inmobiliaria.acta.noKeysRegistered')}
            </div>
          )}
        </div>
      </Section>

      {/* General Observations Section */}
      <Section title={t('inmobiliaria.acta.observationsTitle')} icon={<ClipboardText className="w-4 h-4" />}>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              {t('inmobiliaria.acta.generalCondition')}
            </p>
            <span className={cn('px-4 py-2 rounded-xl text-sm font-medium', getConditionColor(acta.generalCondition))}>
              {getConditionLabel(acta.generalCondition)}
            </span>
          </div>

          {acta.generalObservations && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                {t('inmobiliaria.acta.observations')}
              </p>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {acta.generalObservations}
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* Deposit Section (for devolucion) */}
      {acta.type === 'devolucion' && acta.depositAmount && (
        <Section title={t('inmobiliaria.acta.depositAndDeductions')} icon={<Receipt className="w-4 h-4" />}>
          <div className="space-y-4">
            {/* Deposit Amount */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-muted border border-border">
              <span className="text-muted-foreground">{t('inmobiliaria.acta.originalDeposit')}</span>
              <span className="font-bold text-foreground">
                ${acta.depositAmount.toLocaleString(locale === 'es' ? 'es-CL' : 'en-US')}
              </span>
            </div>

            {/* Deductions */}
            {acta.deductions && acta.deductions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {t('inmobiliaria.acta.deductions')}
                </p>
                {acta.deductions.map((deduction, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-md bg-danger-soft border border-danger/30"
                  >
                    <div>
                      <p className="font-medium text-danger text-sm">
                        {deduction.concept}
                      </p>
                      {deduction.notes && (
                        <p className="text-xs text-danger">{deduction.notes}</p>
                      )}
                    </div>
                    <span className="font-medium text-danger">
                      -${deduction.amount.toLocaleString(locale === 'es' ? 'es-CL' : 'en-US')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Net to Return */}
            {acta.depositToReturn !== undefined && (
              <div className="flex items-center justify-between p-4 rounded-xl bg-success-soft border border-success/30">
                <span className="font-medium text-success">
                  {t('inmobiliaria.acta.amountToReturn')}
                </span>
                <span className="text-xl font-bold text-success">
                  ${acta.depositToReturn.toLocaleString(locale === 'es' ? 'es-CL' : 'en-US')}
                </span>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Signatures Section */}
      <Section title={t('inmobiliaria.acta.signatures')} icon={<Signature className="w-4 h-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['tenant', 'owner', 'agent'] as const).map((party) => {
            const status = getSignatureStatus(party);
            const signature = acta.signatures.find((s) => s.party === party);
            const partyLabels = {
              tenant: t('inmobiliaria.acta.tenant'),
              owner: t('inmobiliaria.acta.owner'),
              agent: t('inmobiliaria.acta.agent'),
            };
            const partyNames = {
              tenant: acta.tenantName,
              owner: acta.propietarioName,
              agent: acta.agenteName,
            };

            return (
              <div
                key={party}
                className={cn(
                  'p-4 rounded-xl border-2 text-center transition-all',
                  status === 'signed'
                    ? 'border-success/30 bg-success-soft'
                    : status === 'pending'
                    ? 'border-warning/30 bg-warning-soft'
                    : 'border-dashed border-border'
                )}
              >
                {status === 'signed' ? (
                  <>
                    <CheckCircle className="w-10 h-10 text-success mx-auto mb-2" weight="fill" />
                    <p className="font-medium text-success">
                      {partyLabels[party]}
                    </p>
                    <p className="text-sm text-success">{partyNames[party]}</p>
                    {signature?.signedAt && (
                      <p className="text-xs text-success/80 mt-2">
                        {t('inmobiliaria.acta.signed')}: {formatDateTime(signature.signedAt)}
                      </p>
                    )}
                  </>
                ) : status === 'pending' ? (
                  <>
                    <Warning className="w-10 h-10 text-warning mx-auto mb-2" />
                    <p className="font-medium text-warning">
                      {partyLabels[party]}
                    </p>
                    <p className="text-sm text-warning">{partyNames[party]}</p>
                    <button
                      onClick={() => onRequestSignature?.(party)}
                      className="mt-3 px-3 py-1.5 rounded-md bg-warning-soft text-warning text-xs font-medium hover:bg-warning-soft transition-colors"
                    >
                      {t('inmobiliaria.acta.requestSignature')}
                    </button>
                  </>
                ) : (
                  <>
                    <Signature className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
                    <p className="font-medium text-muted-foreground">
                      {partyLabels[party]}
                    </p>
                    <p className="text-sm text-muted-foreground">{t('inmobiliaria.acta.pending')}</p>
                    <button
                      onClick={() => onRequestSignature?.(party)}
                      className="mt-3 px-3 py-1.5 rounded-md bg-muted text-muted-foreground text-xs font-medium hover:bg-muted transition-colors"
                    >
                      {t('inmobiliaria.acta.requestSignature')}
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {acta.status === 'completed' && acta.completedAt && (
          <div className="mt-4 p-4 rounded-xl bg-success-soft border border-success/30 text-center">
            <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" weight="fill" />
            <p className="font-medium text-success">{t('inmobiliaria.acta.actaCompleted')}</p>
            <p className="text-sm text-success">
              {t('inmobiliaria.acta.signedByAll')} {formatDateTime(acta.completedAt)}
            </p>
          </div>
        )}
      </Section>

      {/* Metadata */}
      <div className="text-xs text-muted-foreground text-center space-y-1">
        <p>ID: {acta.id}</p>
        <p>
          {t('inmobiliaria.acta.created')}: {formatDateTime(acta.createdAt)} | {t('inmobiliaria.acta.updated')}: {formatDateTime(acta.updatedAt)}
        </p>
      </div>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-3xl max-h-[80vh] rounded-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage}
                alt={t('inmobiliaria.acta.expandedView')}
                className="max-w-full max-h-[80vh] object-contain"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ActaEntregaViewer;
