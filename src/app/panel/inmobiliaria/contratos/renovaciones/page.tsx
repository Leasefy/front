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
import { AvisoIpcQueFalta } from '@/components/inmobiliaria/AvisoIpcQueFalta';
import { BandejaDeCartasDelIncremento } from '@/components/contratos/BandejaDeCartasDelIncremento';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  revisarValoresDeLaRenovacion,
  type ValoresDeLaRenovacion,
} from '@/lib/renovaciones/limites-de-la-renovacion';
import { conCentavosEn, configDePlataAhora } from '@/lib/plata/con-centavos';
import { AREAS_DE_LA_RENOVACION } from '@/lib/renovaciones/reglas';

/**
 * Los valores de la renovación se revisan ANTES de mandar, con el tope y la
 * frase del back (02-10-2026): un canon con ceros de más daba un 500. El
 * cajón ya lo dice bajo el campo y no manda; esto es la segunda guarda, y
 * rechaza (sin toast: el cajón dice el porqué) para que no avance.
 */
function exigirValoresQueCaben(valores: ValoresDeLaRenovacion) {
  // «Centavos en todo» (C4): la misma llave que el cajón (la respuesta
  // compartida de `GET /config/plata`; sin respuesta, sin centavos).
  const problema = revisarValoresDeLaRenovacion(valores, {
    canonConCentavos: conCentavosEn(configDePlataAhora(), AREAS_DE_LA_RENOVACION),
  });
  if (problema) throw new Error(problema);
}

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

  const { canAccess } = usePermissions();
  const puedeEditarContratos = canAccess('contratos', 'edit');
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

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Encabezado — el mismo de Contratos (eyebrow + título + qué es). */}
      <header className="space-y-1">
        <Eyebrow>Portafolio</Eyebrow>
        <h1 className="text-h2 text-fg">
          {t('inmobiliaria.nav.renovaciones')}
        </h1>
        {/*
          🔴 19-09 (visto en el navegador): decía «los contratos que entran en
          sus últimos 90 días» y en la agencia de QA había ocho con MÁS de 90.
          No es un error de datos: los 90 días
          (`DIAS_DE_VENTANA_DE_RENOVACION`) son la ventana con la que el cron
          CREA la renovación; una vez abierta se queda en la lista hasta que se
          firma o se cierra, aunque el vencimiento se aleje. La lista son las
          renovaciones abiertas, y eso es lo que ahora dice.
        */}
        <p className="text-sm text-muted-foreground max-w-2xl">
          Las renovaciones abiertas y cómo va cada una: propuesta, aceptación
          del inquilino y firma. Un contrato entra solo cuando le quedan 90
          días —el preaviso de la Ley 820— y sigue acá hasta que se cierra.
        </p>
      </header>

      {/* N3: sin el IPC del año que rige, las renovaciones salen con el mismo
          canon. Se avisa arriba de la tabla, antes de que pase. */}
      <AvisoIpcQueFalta />

      {/* D6 (17-09): las cartas del incremento por enviar, con la alerta roja. */}
      <BandejaDeCartasDelIncremento puedeEditar={puedeEditarContratos} />

      {/* La carga, el fallo y el vacío viven DENTRO de la tarjeta de la tabla,
          como en Contratos: nada suelto por fuera.

          🔴 UNA sola prop de apertura (19-09). Acá había cinco
          —`onStartRenewal`, `onNotifyTenant`, `onViewDetails`,
          `onCalculateIPC`, `onViewHistory`— y las cinco apuntaban a este
          mismo `openWorkflow`. Del otro lado eso era un menú con cinco items
          que hacían exactamente lo mismo, encima de una fila que ya abría el
          cajón sola. Las acciones no se perdieron: viven en el cajón, que es
          el único que sabe en qué paso va cada renovación. */}
      <RenovacionesTable
        data={renovaciones}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        onAbrir={openWorkflow}
      />

      {/* Renovacion Workflow Sheet */}
      {selectedRenovacion && (
        <RenovacionWorkflow
          renovacion={selectedRenovacion}
          open={isWorkflowOpen}
          onClose={handleClose}
          // 🔴 02-10-2026 (Nico): los errores van en su campo, no en un toast.
          // Cada handler RECHAZA con el error tal cual (C28/C29: sin rechazo
          // el cajón avanzaba o cerraba el diálogo como si hubiera salido) y
          // el cajón lo pinta: bajo el campo que el back nombra, o en su
          // aviso. Acá sólo se canta el éxito.
          onSendNotification={async (message, nr, naf, ipc) => {
            exigirValoresQueCaben({ negotiatedRent: nr, negotiatedAdminFee: naf });
            await renovacionesApi.updateStage(selectedRenovacion.id, {
              status: 'notified',
              notificationMessage: message,
              ...(nr ? { negotiatedRent: nr } : {}),
              ...(naf ? { negotiatedAdminFee: naf } : {}),
              // El IPC que escribió la inmobiliaria queda en la renovación.
              ...(ipc != null ? { ipcRate: ipc } : {}),
            });
            await recargarRenovaciones();
            toast.success('Propuesta enviada');
          }}
          onSaveDraft={async ({ proposedRent, negotiatedAdminFee, ipcRate }) => {
            exigirValoresQueCaben({ proposedRent, negotiatedAdminFee });
            await renovacionesApi.updateStage(selectedRenovacion.id, {
              status: 'pending',
              proposedRent,
              ...(negotiatedAdminFee ? { negotiatedAdminFee } : {}),
              ...(ipcRate != null ? { ipcRate } : {}),
            });
            await recargarRenovaciones();
            toast.success('Borrador guardado');
          }}
          onUploadDocument={async (file) => {
            // C28: rechazar es lo que lo deja quieto en el paso de la firma.
            await renovacionesApi.uploadDocument(selectedRenovacion.id, file);
            await recargarRenovaciones();
            toast.success('Documento de renovación subido');
          }}
          onStepComplete={async (newStatus, negotiatedRent, negotiatedAdminFee, notificationMessage, historyNote) => {
            exigirValoresQueCaben({ negotiatedRent, negotiatedAdminFee });
            await renovacionesApi.updateStage(selectedRenovacion.id, {
              status: newStatus,
              ...(negotiatedRent ? { negotiatedRent } : {}),
              ...(negotiatedAdminFee ? { negotiatedAdminFee } : {}),
              ...(notificationMessage ? { notificationMessage } : {}),
              ...(historyNote ? { historyNote } : {}),
            });
            await recargarRenovaciones();
            toast.success(t('inmobiliaria.operaciones.toasts.statusUpdated', { status: getRenovacionStatusLabel(newStatus) }));
          }}
          onTerminate={async (reason) => {
            // C29: rechazar deja el diálogo abierto con el motivo escrito.
            await renovacionesApi.updateStage(selectedRenovacion.id, {
              status: 'terminated',
              ...(reason ? { historyNote: reason } : {}),
            });
            await recargarRenovaciones();
            handleClose();
            toast.success(t('inmobiliaria.operaciones.toasts.renewalTerminated'));
          }}
          onNoteAdd={async (note) => {
            // Rechazar deja la nota escrita (antes se borraba aunque fallara).
            await renovacionesApi.addNote(selectedRenovacion.id, note);
            // La nota entra en el historial de la renovación: sin releer, el
            // drawer seguía mostrando el historial sin ella.
            await recargarRenovaciones();
            toast.success(t('inmobiliaria.operaciones.toasts.noteAdded'));
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
