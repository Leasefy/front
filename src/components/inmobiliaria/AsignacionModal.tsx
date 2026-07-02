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
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui';
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
        <SheetHeader className="pb-4 border-b border-border dark:border-strong">
          <SheetTitle className="flex items-center gap-2 text-fg dark:text-white">
            <User className="w-5 h-5 text-primary" />
            {t('inmobiliaria.agente.reassignProperty')}
          </SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Property Info */}
          <div className="p-4 rounded-xl border border-border dark:border-strong bg-surface-muted dark:bg-ink/50">
            <div className="flex gap-4">
              {/* Thumbnail */}
              {consignacion.propertyThumbnail ? (
                <img
                  src={consignacion.propertyThumbnail}
                  alt={consignacion.propertyTitle}
                  className="w-20 h-20 rounded-md object-cover shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center shrink-0">
                  <Buildings className="w-8 h-8 text-fg-subtle" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-fg dark:text-white text-sm truncate">
                  {consignacion.propertyTitle}
                </h3>
                <div className="flex items-center gap-1.5 text-fg-muted dark:text-fg-subtle text-xs mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{consignacion.propertyAddress}</span>
                </div>
                <p className="text-sm font-medium text-primary mt-2">
                  {formatCurrency(consignacion.monthlyRent)}{t('inmobiliaria.agente.perMonth')}
                </p>
              </div>
            </div>
          </div>

          {/* Current Agent */}
          <div>
            <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-2">
              {t('inmobiliaria.agente.currentAgent')}
            </label>
            {currentAgente ? (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border dark:border-strong bg-surface dark:bg-[#14130F]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-fg-muted flex items-center justify-center text-white text-sm font-semibold shrink-0">
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
                  <p className="font-medium text-fg dark:text-white text-sm truncate">
                    {currentAgente.name}
                  </p>
                  <p className="text-xs text-fg-muted dark:text-fg-subtle">
                    {currentAgente.zone || t('inmobiliaria.agente.noZone')} · {currentAgente.assignedPropertyIds.length} {t('inmobiliaria.agente.propertiesLabel')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-border dark:border-strong bg-surface-muted dark:bg-ink/50 text-sm text-fg-muted dark:text-fg-subtle">
                {t('inmobiliaria.agente.noAgentAssigned')}
              </div>
            )}
          </div>

          {/* Arrow Divider */}
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-surface-brand flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-primary" />
            </div>
          </div>

          {/* New Agent Selection */}
          <div>
            <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-2">
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
            <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-2">
              {t('inmobiliaria.agente.changeReason')}{' '}
              <span className="text-fg-subtle font-normal">({t('inmobiliaria.agente.optional')})</span>
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('inmobiliaria.agente.changeReasonPlaceholder')}
              rows={3}
              className="w-full resize-none"
            />
          </div>

          {/* Preview Summary */}
          {selectedAgente && currentAgente && (
            <div className="p-4 rounded-xl border border-primary/30 bg-primary-soft">
              <h4 className="font-medium text-primary text-sm mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" weight="fill" />
                {t('inmobiliaria.agente.reassignmentSummary')}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-primary">{t('inmobiliaria.agente.summaryProperty')}:</span>
                  <span className="font-medium text-primary truncate ml-2 max-w-[200px]">
                    {consignacion.propertyTitle}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-primary">{t('inmobiliaria.agente.summaryFrom')}:</span>
                  <span className="font-medium text-primary">
                    {currentAgente.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-primary">{t('inmobiliaria.agente.summaryTo')}:</span>
                  <span className="font-medium text-primary">
                    {selectedAgente.name}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Warning for same agent */}
          {selectedAgenteId === consignacion.agenteId && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-warning/30 bg-warning-soft">
              <Warning className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-warning">
                {t('inmobiliaria.agente.sameAgentWarning')}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 -mx-6 px-6 py-4 border-t border-border dark:border-strong bg-surface dark:bg-[#14130F] flex items-center gap-3">
          <Button
            variant="secondary"
            hideArrow
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            {t('inmobiliaria.agente.cancel')}
          </Button>
          <Button
            hideArrow
            onClick={handleConfirm}
            disabled={!canConfirm || isSubmitting}
            isLoading={isSubmitting}
            className="flex-1"
          >
            {isSubmitting
              ? t('inmobiliaria.agente.reassigning')
              : t('inmobiliaria.agente.confirmReassignment')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default AsignacionModal;
