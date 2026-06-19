'use client';

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  X,
  ArrowRight,
  Buildings,
  MapPin,
  User,
  Warning,
  CheckCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AgenteSelector } from './AgenteSelector';
import type { Consignacion, Agente } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

interface AsignacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  consignacion: Consignacion | null;
  agentes: Agente[];
  onConfirm?: (consignacionId: string, newAgenteId: string, reason?: string) => void;
}

/**
 * AsignacionModal - Sheet drawer to reassign a property to a different agent
 * Used from AgentePropertyList to redistribute workload
 */
export function AsignacionModal({
  isOpen,
  onClose,
  consignacion,
  agentes,
  onConfirm,
}: AsignacionModalProps) {
  const { t } = useI18n();
  const [selectedAgenteId, setSelectedAgenteId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current agente
  const currentAgente = useMemo(() => {
    if (!consignacion) return null;
    return agentes.find((a) => a.id === consignacion.agenteId) || null;
  }, [consignacion, agentes]);

  // Get selected agente
  const selectedAgente = useMemo(() => {
    if (!selectedAgenteId) return null;
    return agentes.find((a) => a.id === selectedAgenteId) || null;
  }, [selectedAgenteId, agentes]);

  // Filter out current agente from selection
  const availableAgentes = useMemo(() => {
    if (!consignacion) return agentes;
    return agentes.filter((a) => a.id !== consignacion.agenteId);
  }, [agentes, consignacion]);

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  // Can confirm
  const canConfirm = selectedAgenteId && selectedAgenteId !== consignacion?.agenteId;

  // Handle confirm
  const handleConfirm = useCallback(async () => {
    if (!canConfirm || !consignacion || !selectedAgenteId) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (onConfirm) {
      onConfirm(consignacion.id, selectedAgenteId, reason || undefined);
    }

    toast.success(t('inmobiliaria.agente.propertyReassigned'), {
      description: t('inmobiliaria.agente.propertyReassignedDesc', { property: consignacion.propertyTitle, agent: selectedAgente?.name || '' }),
    });

    // Reset and close
    setSelectedAgenteId(null);
    setReason('');
    setIsSubmitting(false);
    onClose();
  }, [canConfirm, consignacion, selectedAgenteId, selectedAgente, reason, onConfirm, onClose]);

  // Handle close
  const handleClose = useCallback(() => {
    setSelectedAgenteId(null);
    setReason('');
    onClose();
  }, [onClose]);

  if (!consignacion) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-neutral-200 dark:border-neutral-700">
          <SheetTitle className="flex items-center gap-2 text-neutral-900 dark:text-white">
            <User className="w-5 h-5 text-[#1A40FF]" />
            {t('inmobiliaria.agente.reassignProperty')}
          </SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Property Info */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
            <div className="flex gap-4">
              {/* Thumbnail */}
              {consignacion.propertyThumbnail ? (
                <img
                  src={consignacion.propertyThumbnail}
                  alt={consignacion.propertyTitle}
                  className="w-20 h-20 rounded-md object-cover shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-md bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                  <Buildings className="w-8 h-8 text-neutral-400" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-neutral-900 dark:text-white text-sm truncate">
                  {consignacion.propertyTitle}
                </h3>
                <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 text-xs mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{consignacion.propertyAddress}</span>
                </div>
                <p className="text-sm font-medium text-[#1A40FF] dark:text-[#5570FF] mt-2">
                  {formatCurrency(consignacion.monthlyRent)}{t('inmobiliaria.agente.perMonth')}
                </p>
              </div>
            </div>
          </div>

          {/* Current Agent */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t('inmobiliaria.agente.currentAgent')}
            </label>
            {currentAgente ? (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1A40FF] to-[#6B6B6B] flex items-center justify-center text-white text-sm font-semibold shrink-0">
                  {currentAgente.avatar ? (
                    <img
                      src={currentAgente.avatar}
                      alt={currentAgente.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials(currentAgente.name)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 dark:text-white text-sm truncate">
                    {currentAgente.name}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {currentAgente.zone || t('inmobiliaria.agente.noZone')} · {currentAgente.assignedPropertyIds.length} {t('inmobiliaria.agente.propertiesLabel')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-sm text-neutral-500 dark:text-neutral-400">
                {t('inmobiliaria.agente.noAgentAssigned')}
              </div>
            )}
          </div>

          {/* Arrow Divider */}
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />
            </div>
          </div>

          {/* New Agent Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t('inmobiliaria.agente.newAgent')}
            </label>
            <AgenteSelector
              agentes={availableAgentes}
              value={selectedAgenteId}
              onChange={setSelectedAgenteId}
            />
          </div>

          {/* Reason (Optional) */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t('inmobiliaria.agente.changeReason')}{' '}
              <span className="text-neutral-400 font-normal">({t('inmobiliaria.agente.optional')})</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('inmobiliaria.agente.changeReasonPlaceholder')}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1A40FF] focus:border-transparent resize-none text-sm"
            />
          </div>

          {/* Preview Summary */}
          {selectedAgente && currentAgente && (
            <div className="p-4 rounded-xl border border-[#1A40FF]/30 dark:border-[#1A40FF]/40 bg-[#EEF1FF] dark:bg-[#1A40FF]/15">
              <h4 className="font-medium text-[#1A40FF] dark:text-[#5570FF] text-sm mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" weight="fill" />
                {t('inmobiliaria.agente.reassignmentSummary')}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#1A40FF] dark:text-[#5570FF]">{t('inmobiliaria.agente.summaryProperty')}:</span>
                  <span className="font-medium text-[#1A40FF] dark:text-[#5570FF] truncate ml-2 max-w-[200px]">
                    {consignacion.propertyTitle}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#1A40FF] dark:text-[#5570FF]">{t('inmobiliaria.agente.summaryFrom')}:</span>
                  <span className="font-medium text-[#1A40FF] dark:text-[#5570FF]">
                    {currentAgente.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#1A40FF] dark:text-[#5570FF]">{t('inmobiliaria.agente.summaryTo')}:</span>
                  <span className="font-medium text-[#1A40FF] dark:text-[#5570FF]">
                    {selectedAgente.name}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Warning for same agent */}
          {selectedAgenteId === consignacion.agenteId && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-[#B7791F]/30 dark:border-[#B7791F]/40 bg-[#F8F0E0] dark:bg-[#B7791F]/15">
              <Warning className="w-5 h-5 text-[#B7791F] dark:text-[#D2992F] shrink-0 mt-0.5" />
              <p className="text-sm text-[#B7791F] dark:text-[#D2992F]">
                {t('inmobiliaria.agente.sameAgentWarning')}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 -mx-6 px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] flex items-center gap-3">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {t('inmobiliaria.agente.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || isSubmitting}
            className={cn(
              'flex-1 px-4 py-2.5 rounded-xl font-medium transition-all',
              canConfirm
                ? 'bg-[#1A40FF] hover:opacity-90 text-white'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t('inmobiliaria.agente.reassigning')}
              </span>
            ) : (
              t('inmobiliaria.agente.confirmReassignment')
            )}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default AsignacionModal;
