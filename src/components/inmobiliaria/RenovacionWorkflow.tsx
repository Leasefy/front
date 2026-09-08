'use client';

/**
 * El cajón de una renovación: cabecera con el inmueble, el estado y el
 * vencimiento; los tres pasos (propuesta, aceptación, firma); a la derecha el
 * contrato actual y la actividad; abajo la acción del paso.
 *
 * Lo que se protege acá:
 * - «enviar» dice por dónde le llega al inquilino (panel, correo del contrato
 *   o nada) y no promete un panel a quien no tiene cuenta;
 * - el historial se lee del detalle (la lista no lo trae), así que ya no sale
 *   vacío;
 * - «Guardar borrador» guarda; antes «Guardar y salir» sólo cerraba.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Stepper } from '@leasefy/cadence';
import {
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  FloppyDisk,
  PaperPlaneTilt,
  PenNib,
} from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import type {
  Renovacion,
  RenovacionHistoryItem,
  RenovacionStatus,
} from '@/lib/types/inmobiliaria';
import { getRenovacionStatusColor, getRenovacionStatusLabel } from '@/lib/types/inmobiliaria';
import { agencyApi, renovacionesApi } from '@/lib/api/inmobiliaria.service';
import {
  PASOS_DE_RENOVACION,
  canalDeEnvio,
  mensajeSugerido,
  pasoDelEstado,
  renovacionAceptada,
} from '@/lib/renovaciones/reglas';
import {
  ChipDeVencimiento,
  DialogoNoRenovar,
  PasoAceptacion,
  PasoCompletada,
  PasoFirma,
  PasoNoRenovada,
  PasoPropuesta,
  RielDeActividad,
} from './RenovacionWorkflowSteps';

// ============================================================================
// Props
// ============================================================================

export interface BorradorDeRenovacion {
  proposedRent: number;
  negotiatedAdminFee: number;
  ipcRate: number | null;
}

export interface RenovacionWorkflowProps {
  renovacion: Renovacion;
  open?: boolean;
  onClose?: () => void;
  /** Manda la propuesta (el back la registra y se la hace llegar al inquilino). Debe rechazar si falló. */
  onSendNotification?: (
    message: string,
    newRent: number,
    newAdminFee: number,
    ipcRate?: number | null,
  ) => Promise<void>;
  /** Guarda precio, IPC y administración sin enviar nada. */
  onSaveDraft?: (borrador: BorradorDeRenovacion) => Promise<void>;
  onStepComplete?: (
    step: RenovacionStatus,
    negotiatedRent?: number,
    negotiatedAdminFee?: number,
    notificationMessage?: string,
    historyNote?: string,
  ) => void | Promise<void>;
  onUploadDocument?: (file: File) => Promise<void>;
  onTerminate?: (reason: string) => void | Promise<void>;
  onNoteAdd?: (note: string) => void | Promise<void>;
  /** Qué día es hoy; sólo las pruebas lo fijan. Decide si el IPC de la tabla sigue vigente. */
  hoy?: Date;
}

type Ocupado = 'enviar' | 'guardar' | 'aceptar' | 'continuar' | 'firmar' | 'terminar' | 'nota';

// ============================================================================
// Cajón
// ============================================================================

export function RenovacionWorkflow({ open = false, onClose, ...resto }: RenovacionWorkflowProps) {
  return (
    <Sheet open={open} onOpenChange={(abierto) => !abierto && onClose?.()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 !p-0 sm:max-w-4xl"
        aria-describedby={undefined}
        data-testid="renovacion-cajon"
      >
        {/* El título accesible lo exige Radix; en pantalla lo pinta la cabecera del cuerpo. */}
        <SheetTitle className="sr-only">Renovación · {resto.renovacion.propertyTitle}</SheetTitle>
        <CuerpoDeRenovacion {...resto} onClose={onClose} />
      </SheetContent>
    </Sheet>
  );
}

/**
 * Separado del `Sheet` a propósito: el test lo monta sin portal ni Radix y
 * prueba lo que se ve. Radix desmonta esto al cerrar, así que cada apertura
 * arranca limpia y vuelve a leer el detalle.
 */
export function CuerpoDeRenovacion({
  renovacion,
  onClose,
  onSendNotification,
  onSaveDraft,
  onStepComplete,
  onUploadDocument,
  onTerminate,
  onNoteAdd,
  hoy,
}: Omit<RenovacionWorkflowProps, 'open'>) {
  const { locale, formatCurrency } = useI18n();
  const elHoy = useMemo(() => hoy ?? new Date(), [hoy]);

  const terminada = renovacion.status === 'terminated';
  const completada = renovacion.status === 'completed';
  const [paso, setPaso] = useState(() => Math.max(0, pasoDelEstado(renovacion.status)));

  // La inmobiliaria pone los números. Arrancan en lo negociado o propuesto,
  // y si no hay nada, en el canon actual: nunca en un IPC inventado.
  const [newRent, setNewRent] = useState<number>(
    renovacion.negotiatedRent || renovacion.proposedRent || renovacion.currentRent,
  );
  const [newAdminFee, setNewAdminFee] = useState<number>(
    renovacion.negotiatedAdminFee ?? renovacion.currentAdminFee ?? 0,
  );
  const [ipcRate, setIpcRate] = useState<number | null>(renovacion.ipcRate ?? null);

  // Con qué se firma el mensaje y si el inquilino sin cuenta puede contestar
  // el correo: el nombre y el correo reales de la inmobiliaria.
  const [agencia, setAgencia] = useState<{ nombre: string; correo: string | null }>({
    nombre: '',
    correo: null,
  });
  useEffect(() => {
    let vigente = true;
    agencyApi
      .getMyAgency()
      .then((a) => {
        if (!vigente) return;
        const datos = a as { razonSocial?: string | null; name?: string | null; email?: string | null };
        setAgencia({ nombre: datos.razonSocial || datos.name || '', correo: datos.email || null });
      })
      .catch(() => {
        // Sin nombre, el mensaje sale sin firma: se ve, no se inventa.
      });
    return () => {
      vigente = false;
    };
  }, []);

  // El mensaje sigue a los datos mientras nadie lo haya tocado.
  const sugerido = useMemo(
    () =>
      mensajeSugerido({
        tenantName: renovacion.tenantName,
        propertyAddress: renovacion.propertyAddress,
        leaseEndDate: renovacion.leaseEndDate,
        newRent,
        agencyName: agencia.nombre,
        locale,
        formatCurrency,
      }),
    [
      renovacion.tenantName,
      renovacion.propertyAddress,
      renovacion.leaseEndDate,
      newRent,
      agencia.nombre,
      locale,
      formatCurrency,
    ],
  );
  const [mensajeEditado, setMensajeEditado] = useState<string | null>(null);
  const message = mensajeEditado ?? sugerido;

  // El historial no viene en la lista: se lee del detalle, y se vuelve a leer
  // cada vez que la página relee la fila (cambia `updatedAt`).
  const [historial, setHistorial] = useState<RenovacionHistoryItem[] | null>(
    renovacion.history?.length ? renovacion.history : null,
  );
  useEffect(() => {
    let vivo = true;
    renovacionesApi
      .getById(renovacion.id)
      .then((detalle) => {
        if (vivo) setHistorial(detalle.history ?? []);
      })
      .catch(() => {
        if (vivo) setHistorial((h) => h ?? []);
      });
    return () => {
      vivo = false;
    };
  }, [renovacion.id, renovacion.updatedAt]);

  const [archivo, setArchivo] = useState<File | null>(null);
  const [ocupado, setOcupado] = useState<Ocupado | null>(null);
  const [terminarAbierto, setTerminarAbierto] = useState(false);

  const canal = canalDeEnvio(renovacion);
  const acepto = renovacionAceptada(renovacion);

  const correr = useCallback(async (que: Ocupado, accion: () => Promise<void>) => {
    setOcupado(que);
    try {
      await accion();
    } catch {
      // La página ya avisó con su toast; acá sólo se suelta el botón.
    } finally {
      setOcupado(null);
    }
  }, []);

  const enviar = () =>
    correr('enviar', async () => {
      await onSendNotification?.(message, newRent, newAdminFee, ipcRate);
      setPaso(1);
    });

  const guardarBorrador = () =>
    correr('guardar', async () => {
      await onSaveDraft?.({ proposedRent: newRent, negotiatedAdminFee: newAdminFee, ipcRate });
    });

  const registrarAceptacion = () =>
    correr('aceptar', async () => {
      await onStepComplete?.(
        'approved',
        newRent,
        newAdminFee,
        undefined,
        'El inquilino aceptó por fuera del panel; lo registró la inmobiliaria.',
      );
    });

  const continuarALaFirma = () =>
    correr('continuar', async () => {
      await onStepComplete?.('signed', newRent, newAdminFee);
      setPaso(2);
    });

  const registrarFirma = () =>
    correr('firmar', async () => {
      if (!archivo) return;
      await onUploadDocument?.(archivo);
      await onStepComplete?.('completed', newRent, newAdminFee);
      setPaso(3);
    });

  const noRenovar = (motivo: string) =>
    correr('terminar', async () => {
      await onTerminate?.(motivo);
      setTerminarAbierto(false);
    });

  const agregarNota = (nota: string) =>
    correr('nota', async () => {
      await onNoteAdd?.(nota);
    });

  const abrirDocumento = () => {
    void renovacionesApi
      .getDocumentUrl(renovacion.id)
      .then(({ url }) => window.open(url, '_blank', 'noopener'))
      .catch(() => {
        // Sin URL firmada no hay nada que abrir; el botón sólo existe con documento.
      });
  };

  const motivoDeCierre = useMemo(() => {
    if (!terminada) return null;
    const fila = [...(historial ?? [])]
      .reverse()
      .find((h) => h.action === 'RENOV_TERMINATED' && h.description);
    return fila?.description ?? null;
  }, [terminada, historial]);

  const puedeNoRenovar = !terminada && !completada && paso <= 1;
  const etiquetaDeEnviar =
    canal === 'ninguno'
      ? 'Marcar como enviada'
      : renovacion.status === 'pending'
        ? 'Enviar propuesta'
        : 'Enviar otra vez';

  return (
    <>
      {/* Cabecera: qué contrato es, en qué va y cuánto falta. */}
      <div className="flex-none border-b border-border px-6 py-5">
        <div className="flex items-start gap-3 pr-14">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"
          >
            <ArrowsClockwise className="h-5 w-5" weight="bold" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-fg">{renovacion.propertyTitle}</h2>
              <Badge
                className={getRenovacionStatusColor(renovacion.status)}
                data-testid="renovacion-estado"
              >
                {getRenovacionStatusLabel(renovacion.status)}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-sm text-fg-muted">
              {renovacion.propertyAddress} · {renovacion.tenantName}
            </p>
          </div>
        </div>
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <ChipDeVencimiento renovacion={renovacion} />
        </div>
        {!terminada ? (
          <Stepper
            className="mt-5"
            steps={PASOS_DE_RENOVACION.map((p) => ({ id: p.id, label: p.label }))}
            activeIndex={paso}
            data-testid="renovacion-pasos"
          />
        ) : null}
      </div>

      {/* Cuerpo: el paso a la izquierda, el contrato y la actividad a la derecha. */}
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5"
        data-lenis-prevent
      >
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:gap-8">
          <div className="min-w-0">
            {terminada ? (
              <PasoNoRenovada renovacion={renovacion} motivo={motivoDeCierre} />
            ) : paso === 0 ? (
              <PasoPropuesta
                renovacion={renovacion}
                newRent={newRent}
                newAdminFee={newAdminFee}
                ipcRate={ipcRate}
                message={message}
                editado={mensajeEditado !== null}
                respondible={Boolean(agencia.correo)}
                hoy={elHoy}
                onNewRentChange={setNewRent}
                onNewAdminFeeChange={setNewAdminFee}
                onIpcRateChange={setIpcRate}
                onMessageChange={setMensajeEditado}
                onRestaurarMensaje={() => setMensajeEditado(null)}
              />
            ) : paso === 1 ? (
              <PasoAceptacion
                renovacion={renovacion}
                newRent={newRent}
                newAdminFee={newAdminFee}
                registrando={ocupado === 'aceptar'}
                onRegistrarAceptacion={registrarAceptacion}
                onNoRenueva={() => setTerminarAbierto(true)}
              />
            ) : paso === 2 ? (
              <PasoFirma
                renovacion={renovacion}
                newRent={newRent}
                newAdminFee={newAdminFee}
                archivo={archivo}
                onArchivo={setArchivo}
                onAbrirDocumento={abrirDocumento}
              />
            ) : (
              <PasoCompletada renovacion={renovacion} onAbrirDocumento={abrirDocumento} />
            )}
          </div>
          <div className="mt-8 lg:mt-0">
            <RielDeActividad
              renovacion={renovacion}
              historial={historial}
              agregandoNota={ocupado === 'nota'}
              onAddNote={agregarNota}
            />
          </div>
        </div>
      </div>

      {/* Pie: lo que sigue, a la derecha; volver y no renovar, a la izquierda. */}
      <div className="flex flex-none flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
        <div className="flex items-center gap-1">
          {!terminada && paso > 0 && paso < 3 ? (
            <Button
              type="button"
              variant="ghost"
              hideArrow
              disabled={ocupado !== null}
              onClick={() => setPaso(paso - 1)}
              data-testid="renovacion-anterior"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Anterior
            </Button>
          ) : null}
          {puedeNoRenovar ? (
            <Button
              type="button"
              variant="ghost"
              hideArrow
              className="text-danger hover:text-danger"
              disabled={ocupado !== null}
              onClick={() => setTerminarAbierto(true)}
              data-testid="renovacion-no-renovar"
            >
              No renovar
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {!terminada && paso === 0 ? (
            <>
              {renovacion.status === 'pending' ? (
                <Button
                  type="button"
                  variant="outline"
                  hideArrow
                  isLoading={ocupado === 'guardar'}
                  disabled={ocupado !== null || newRent <= 0}
                  onClick={guardarBorrador}
                  data-testid="renovacion-guardar"
                >
                  <FloppyDisk className="h-4 w-4" aria-hidden="true" />
                  Guardar borrador
                </Button>
              ) : null}
              <Button
                type="button"
                hideArrow
                isLoading={ocupado === 'enviar'}
                disabled={ocupado !== null || newRent <= 0 || !message.trim()}
                onClick={enviar}
                data-testid="renovacion-enviar"
              >
                <PaperPlaneTilt className="h-4 w-4" aria-hidden="true" />
                {etiquetaDeEnviar}
              </Button>
            </>
          ) : null}
          {!terminada && paso === 1 ? (
            <Button
              type="button"
              hideArrow
              isLoading={ocupado === 'continuar'}
              disabled={!acepto || ocupado !== null}
              onClick={continuarALaFirma}
              data-testid="renovacion-continuar"
            >
              Continuar a la firma
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
          {!terminada && paso === 2 ? (
            <Button
              type="button"
              hideArrow
              isLoading={ocupado === 'firmar'}
              disabled={!archivo || ocupado !== null}
              onClick={registrarFirma}
              data-testid="renovacion-registrar-firma"
            >
              <PenNib className="h-4 w-4" aria-hidden="true" />
              Registrar firma
            </Button>
          ) : null}
          {terminada || paso === 3 ? (
            <Button
              type="button"
              variant="outline"
              hideArrow
              onClick={onClose}
              data-testid="renovacion-cerrar"
            >
              Cerrar
            </Button>
          ) : null}
        </div>
      </div>

      <DialogoNoRenovar
        abierto={terminarAbierto}
        confirmando={ocupado === 'terminar'}
        onCerrar={() => setTerminarAbierto(false)}
        onConfirmar={noRenovar}
      />
    </>
  );
}
