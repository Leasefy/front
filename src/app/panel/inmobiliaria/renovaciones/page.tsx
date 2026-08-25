'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ArrowsClockwise } from '@phosphor-icons/react';
import { PageGuard } from '@/components/auth/PageGuard';
import { useI18n } from '@/lib/i18n';
import { MonoLabel, BrandDot } from '@/components/brand';
import { Spinner } from '@/components/ui';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { useRenovaciones, renovacionesApi } from '@/lib/hooks/useInmobiliaria';
import { getRenovacionStatusLabel } from '@/lib/types/inmobiliaria';
import type { Renovacion } from '@/lib/types/inmobiliaria';
import { RenovacionesTable, RenovacionWorkflow } from '@/components/inmobiliaria';

/**
 * Renovaciones — dedicated route so lease renewals are a first-class,
 * discoverable destination instead of a tab buried under "Mantenimientos".
 * Reuses the same table + workflow used inside the operaciones page.
 */
function RenovacionesContent() {
  const { t } = useI18n();
  const {
    renovaciones,
    isLoading,
    errorCrudo: error,
    refetch,
  } = useRenovaciones();

  const [selectedRenovacion, setSelectedRenovacion] = useState<Renovacion | null>(null);
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);

  const openWorkflow = useCallback((renovacion: Renovacion) => {
    setSelectedRenovacion(renovacion);
    setIsWorkflowOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsWorkflowOpen(false);
    setTimeout(() => setSelectedRenovacion(null), 300);
  }, []);

  /*
   * Después de tocar una renovación se vuelve a leer del servidor.
   *
   * Antes cada handler parcheaba la fila a mano con lo que suponía que había
   * quedado (`notifiedAt: new Date()`, `updatedAt: new Date()`), y esas fechas
   * son inventadas: las pone el backend, que además puede rechazar una
   * transición o mover otros campos. La pantalla mostraba una versión que no
   * existía en ningún lado.
   *
   * El drawer muestra UNA renovación tomada de la lista, así que también hay
   * que apuntarlo a la fila fresca; si no, queda mostrando lo viejo encima de
   * una lista ya actualizada.
   */
  const recargarRenovaciones = useCallback(async () => {
    const frescas = await refetch();
    if (!frescas) return;
    setSelectedRenovacion((actual) =>
      actual ? frescas.find((r) => r.id === actual.id) ?? actual : actual,
    );
  }, [refetch]);

  const handleNotifyTenant = useCallback(async (renovacion: Renovacion) => {
    try {
      await renovacionesApi.updateStage(renovacion.id, { status: 'notified' });
      await recargarRenovaciones();
      toast.success(t('inmobiliaria.operaciones.toasts.notificationSent'), {
        description: t('inmobiliaria.operaciones.toasts.notificationSentDesc', { name: renovacion.tenantName ?? '' }),
      });
    } catch {
      toast.error('Error al notificar inquilino');
    }
  }, [t, recargarRenovaciones]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-2 mb-1">
          <BrandDot />
          <MonoLabel className="text-[11px] font-medium text-primary">
            {t('inmobiliaria.nav.renovaciones')}
          </MonoLabel>
        </span>
        <h1 className="font-heading text-2xl font-semibold text-fg tracking-tight">
          {t('inmobiliaria.nav.renovaciones')}
        </h1>
        <p className="text-sm text-fg-muted">
          Contratos próximos a vencer y su proceso de renovación.
        </p>
      </div>

      {Boolean(error) && (
        <FalloDeCarga
          error={error}
          queEs="las renovaciones"
          onReintentar={refetch}
        />
      )}

      {!error && isLoading && renovaciones.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      ) : !error ? (
        <RenovacionesTable
          data={renovaciones}
          onStartRenewal={openWorkflow}
          onNotifyTenant={handleNotifyTenant}
          onViewDetails={openWorkflow}
          onCalculateIPC={openWorkflow}
          onViewHistory={openWorkflow}
        />
      ) : null}

      {/* Renovacion Workflow Sheet */}
      {selectedRenovacion && (
        <RenovacionWorkflow
          renovacion={selectedRenovacion}
          open={isWorkflowOpen}
          onClose={handleClose}
          onSendNotification={async (message, nr, naf) => {
            await renovacionesApi.updateStage(selectedRenovacion.id, {
              status: 'notified',
              notificationMessage: message,
              ...(nr ? { negotiatedRent: nr } : {}),
              ...(naf ? { negotiatedAdminFee: naf } : {}),
            });
            await recargarRenovaciones();
            toast.success('Propuesta enviada al inquilino');
          }}
          onUploadDocument={async (file) => {
            await renovacionesApi.uploadDocument(selectedRenovacion.id, file);
            await recargarRenovaciones();
            toast.success('Documento de renovación subido');
          }}
          onStepComplete={async (newStatus, negotiatedRent, negotiatedAdminFee, notificationMessage) => {
            try {
              await renovacionesApi.updateStage(selectedRenovacion.id, {
                status: newStatus,
                ...(negotiatedRent ? { negotiatedRent } : {}),
                ...(negotiatedAdminFee ? { negotiatedAdminFee } : {}),
                ...(notificationMessage ? { notificationMessage } : {}),
              });
              await recargarRenovaciones();
              toast.success(t('inmobiliaria.operaciones.toasts.statusUpdated', { status: getRenovacionStatusLabel(newStatus) }));
            } catch {
              toast.error('Error al actualizar renovación');
            }
          }}
          onTerminate={async (reason) => {
            try {
              await renovacionesApi.updateStage(selectedRenovacion.id, {
                status: 'terminated',
                ...(reason ? { historyNote: reason } : {}),
              });
              await recargarRenovaciones();
              handleClose();
              toast.success(t('inmobiliaria.operaciones.toasts.renewalTerminated'));
            } catch {
              toast.error('Error al terminar renovación');
            }
          }}
          onNoteAdd={async (note) => {
            try {
              await renovacionesApi.addNote(selectedRenovacion.id, note);
              // La nota entra en el historial de la renovación: sin releer, el
              // drawer seguía mostrando el historial sin ella.
              await recargarRenovaciones();
              toast.success(t('inmobiliaria.operaciones.toasts.noteAdded'));
            } catch {
              toast.error('Error al agregar nota');
            }
          }}
        />
      )}
    </div>
  );
}

export default function RenovacionesPage() {
  return (
    <PageGuard module="operaciones">
      <RenovacionesContent />
    </PageGuard>
  );
}
