'use client';

import { useState, useCallback } from 'react';
import { toast } from '@/components/ui/toast';
import { Eyebrow } from '@leasefy/cadence';
import { PageGuard } from '@/components/auth/PageGuard';
import { useI18n } from '@/lib/i18n';
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
      {/* Encabezado — el mismo de Contratos (eyebrow + título + qué es). */}
      <header className="space-y-1">
        <Eyebrow>Portafolio</Eyebrow>
        <h1 className="text-h2 text-fg">
          {t('inmobiliaria.nav.renovaciones')}
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl line-clamp-2">
          Los contratos que entran en sus últimos 90 días y cómo va cada
          renovación: propuesta, aceptación del inquilino y firma.
        </p>
      </header>

      {/* La carga, el fallo y el vacío viven DENTRO de la tarjeta de la tabla,
          como en Contratos: nada suelto por fuera. */}
      <RenovacionesTable
        data={renovaciones}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        onStartRenewal={openWorkflow}
        onNotifyTenant={handleNotifyTenant}
        onViewDetails={openWorkflow}
        onCalculateIPC={openWorkflow}
        onViewHistory={openWorkflow}
      />

      {/* Renovacion Workflow Sheet */}
      {selectedRenovacion && (
        <RenovacionWorkflow
          renovacion={selectedRenovacion}
          open={isWorkflowOpen}
          onClose={handleClose}
          onSendNotification={async (message, nr, naf, ipc) => {
            await renovacionesApi.updateStage(selectedRenovacion.id, {
              status: 'notified',
              notificationMessage: message,
              ...(nr ? { negotiatedRent: nr } : {}),
              ...(naf ? { negotiatedAdminFee: naf } : {}),
              // El IPC que escribió la inmobiliaria queda en la renovación.
              ...(ipc != null ? { ipcRate: ipc } : {}),
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
