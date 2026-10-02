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
 *
 * ── Los errores, en su campo (Nico, 02-10-2026) ───────────────────────────
 *
 * Antes cada fallo salía en un toast de la página y el cajón sólo soltaba el
 * botón. Ahora el cajón dice qué está mal DONDE se corrige:
 * - los topes del back (`limites-de-la-renovacion.ts`, las mismas frases) se
 *   dicen bajo el canon y la administración MIENTRAS se escribe, y los botones
 *   no mandan;
 * - un 400 con `campos` va bajo SU campo (canon, IPC, administración, mensaje);
 * - lo que no tiene campo (un 409 de estado, un 5xx con su referencia, la
 *   conexión) va en un aviso del cajón, justo encima de los botones;
 * - la nota, el motivo de no renovar y el contrato firmado son formularios de
 *   un solo campo: lo suyo, sea lo que sea, va bajo ese campo.
 * La página sólo canta el éxito; el error lo dice el cajón, una vez.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banner, Presence, Stepper } from '@leasefy/cadence';
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
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type {
  Renovacion,
  RenovacionHistoryItem,
  RenovacionStatus,
} from '@/lib/types/inmobiliaria';
import { getRenovacionStatusColor, getRenovacionStatusLabel } from '@/lib/types/inmobiliaria';
import { agencyApi, renovacionesApi } from '@/lib/api/inmobiliaria.service';
import { ApiError } from '@/lib/api/client';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente';
import { erroresDeLosValores, mensajeDeLaRenovacion } from '@/lib/renovaciones/limites-de-la-renovacion';
import {
  PASOS_DE_RENOVACION,
  canalDeEnvio,
  mensajeSugerido,
  pasoDelEstado,
  renovacionAceptada,
} from '@/lib/renovaciones/reglas';
import {
  type CampoDelCajon,
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
  /** Debe rechazar si falló: el cajón dice el porqué bajo el archivo. */
  onUploadDocument?: (file: File) => Promise<void>;
  /** Debe rechazar si falló: el cajón dice el porqué bajo el motivo. */
  onTerminate?: (reason: string) => void | Promise<void>;
  /** Debe rechazar si falló: el cajón dice el porqué bajo la nota. */
  onNoteAdd?: (note: string) => void | Promise<void>;
  /** Qué día es hoy; sólo las pruebas lo fijan. Decide si el IPC de la tabla sigue vigente. */
  hoy?: Date;
}

type Ocupado = 'enviar' | 'guardar' | 'aceptar' | 'continuar' | 'firmar' | 'terminar' | 'nota';

/**
 * Los nombres de `UpdateRenovacionStageDto` → el campo de la propuesta. Lo que
 * no está acá (`status`, `historyNote`…) no tiene campo en el paso: va al aviso.
 */
const CAMPOS_DE_LA_PROPUESTA: Readonly<Record<string, CampoDelCajon>> = {
  proposedRent: 'canon',
  negotiatedRent: 'canon',
  negotiatedAdminFee: 'admin',
  ipcRate: 'ipc',
  notificationMessage: 'mensaje',
};

/** Adónde va el error de una acción. */
type Destino =
  /** Los `campos` del back a su campo (por el mapa); lo demás, al aviso con este título. */
  | { titulo: string; mapa: Readonly<Record<string, CampoDelCajon>> }
  /** Un formulario de un solo campo: TODO lo que diga el back va bajo él. */
  | { campo: CampoDelCajon };

interface AvisoDelCajon {
  titulo: string;
  mensaje: string;
}

// ============================================================================
// Cajón
// ============================================================================

export function RenovacionWorkflow({ open = false, onClose, ...resto }: RenovacionWorkflowProps) {
  return (
    <Sheet open={open} onOpenChange={(abierto) => !abierto && onClose?.()}>
      <SheetContent
        side="right"
        size="xl"
        // Cabecera, cuerpo y pie viven en `CuerpoDeRenovacion`.
        layout="manual"
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

  // Lo que el back rechazó, bajo su campo; y lo que no tiene campo, en el
  // aviso de encima de los botones (02-10-2026: antes, un toast de la página).
  const [errores, setErrores] = useState<Partial<Record<CampoDelCajon, string>>>({});
  const [aviso, setAviso] = useState<AvisoDelCajon | null>(null);
  // Mientras el aviso sale, sigue diciendo lo que decía (no sale vacío).
  const avisoQueSeVe = useUltimoPresente(aviso);
  const borrarError = useCallback((campo: CampoDelCajon) => {
    setErrores((e) => {
      if (!e[campo]) return e;
      const { [campo]: _quitado, ...resto } = e;
      return resto;
    });
  }, []);

  // Los topes del back, mientras se escribe: el canon con ceros de más se dice
  // bajo el canon ANTES de mandar, con la frase del back, y no se manda.
  const topes = useMemo(
    () => erroresDeLosValores({ proposedRent: newRent, negotiatedAdminFee: newAdminFee }),
    [newRent, newAdminFee],
  );
  const topeDelCanon = topes.proposedRent;
  const topeDeLaAdministracion = topes.negotiatedAdminFee;
  const valoresQueNoCaben = Boolean(topeDelCanon || topeDeLaAdministracion);

  const canal = canalDeEnvio(renovacion);
  const acepto = renovacionAceptada(renovacion);

  /**
   * Lo que dijo el back, en su lugar. Un 401 no dice nada: el cliente ya está
   * cerrando la sesión. «Conexión» sólo sin respuesta; un 5xx, «de nuestro
   * lado» con la referencia (el traductor).
   */
  const ponerElFallo = useCallback((error: unknown, destino: Destino, accion: string) => {
    if (error instanceof ApiError && error.status === 401) return;
    const porDefecto = 'Prueba de nuevo en un momento.';
    if ('campo' in destino) {
      const { sueltos } = repartirErroresDelServidor<CampoDelCajon>(error, {
        campos: [],
        porDefecto,
        accion,
      });
      setErrores((e) => ({ ...e, [destino.campo]: sueltos.join(' · ') }));
      return;
    }
    const { porCampo, sueltos } = repartirErroresDelServidor<CampoDelCajon>(error, {
      mapa: destino.mapa,
      campos: [],
      porDefecto,
      accion,
    });
    setErrores((e) => ({ ...e, ...porCampo }));
    if (sueltos.length > 0) setAviso({ titulo: destino.titulo, mensaje: sueltos.join(' · ') });
  }, []);

  /** Corre la acción; si falla, dice el porqué en su lugar. Devuelve si salió. */
  const correr = useCallback(
    async (que: Ocupado, accion: () => Promise<void>, destino: Destino, queSeHacia: string) => {
      setOcupado(que);
      setAviso(null);
      if ('campo' in destino) borrarError(destino.campo);
      else setErrores((e) => {
        const quedan = { ...e };
        for (const c of Object.values(destino.mapa)) delete quedan[c];
        return quedan;
      });
      try {
        await accion();
        return true;
      } catch (error) {
        ponerElFallo(error, destino, queSeHacia);
        return false;
      } finally {
        setOcupado(null);
      }
    },
    [borrarError, ponerElFallo],
  );

  /** Antes de mandar los números: si no caben, se dice y no se manda. */
  const losNumerosCaben = (titulo: string) => {
    const problema = topeDelCanon ?? topeDeLaAdministracion;
    if (!problema) return true;
    // En la propuesta ya está bajo su campo; en los otros pasos el campo no
    // se ve, así que va al aviso.
    if (paso !== 0) setAviso({ titulo, mensaje: problema });
    return false;
  };

  const propuesta = (titulo: string): Destino => ({ titulo, mapa: CAMPOS_DE_LA_PROPUESTA });
  const sinCampo = (titulo: string): Destino => ({ titulo, mapa: {} });

  const enviar = () => {
    if (!losNumerosCaben('No se pudo enviar la propuesta')) return;
    void correr(
      'enviar',
      async () => {
        await onSendNotification?.(message, newRent, newAdminFee, ipcRate);
        setPaso(1);
      },
      propuesta('No se pudo enviar la propuesta'),
      'enviar la propuesta',
    );
  };

  const guardarBorrador = () => {
    if (!losNumerosCaben('No se pudo guardar el borrador')) return;
    void correr(
      'guardar',
      async () => {
        await onSaveDraft?.({ proposedRent: newRent, negotiatedAdminFee: newAdminFee, ipcRate });
      },
      propuesta('No se pudo guardar el borrador'),
      'guardar el borrador',
    );
  };

  const registrarAceptacion = () => {
    if (!losNumerosCaben('No se pudo registrar la aceptación')) return;
    void correr(
      'aceptar',
      async () => {
        await onStepComplete?.(
          'approved',
          newRent,
          newAdminFee,
          undefined,
          'El inquilino aceptó por fuera del panel; lo registró la inmobiliaria.',
        );
      },
      sinCampo('No se pudo registrar la aceptación'),
      'registrar la aceptación',
    );
  };

  const continuarALaFirma = () => {
    if (!losNumerosCaben('No se pudo pasar a la firma')) return;
    void correr(
      'continuar',
      async () => {
        await onStepComplete?.('signed', newRent, newAdminFee);
        setPaso(2);
      },
      sinCampo('No se pudo pasar a la firma'),
      'pasar a la firma',
    );
  };

  /**
   * Dos pasos y dos lugares: si el archivo no sube, el porqué va bajo el
   * archivo; si sube y no se puede completar, al aviso de encima del botón.
   */
  const registrarFirma = async () => {
    if (!archivo || !losNumerosCaben('No se pudo completar la renovación')) return;
    const subio = await correr(
      'firmar',
      async () => {
        await onUploadDocument?.(archivo);
      },
      { campo: 'archivo' },
      'subir el contrato firmado',
    );
    if (!subio) return;
    await correr(
      'firmar',
      async () => {
        await onStepComplete?.('completed', newRent, newAdminFee);
        setPaso(3);
      },
      sinCampo('No se pudo completar la renovación'),
      'completar la renovación',
    );
  };

  const noRenovar = (motivo: string) =>
    void correr(
      'terminar',
      async () => {
        await onTerminate?.(motivo);
        setTerminarAbierto(false);
      },
      { campo: 'motivo' },
      'cerrar la renovación',
    );

  /** Devuelve si se guardó: con `false` la nota escrita se queda. */
  const agregarNota = (nota: string) =>
    correr(
      'nota',
      async () => {
        await onNoteAdd?.(nota);
      },
      { campo: 'nota' },
      'agregar la nota',
    );

  /**
   * C30: el botón sólo existe con documento, así que si no abre es que algo
   * falló (la URL firmada, el almacenamiento): se dice en el aviso del cajón
   * (02-10-2026: era un toast que se iba solo), no se calla.
   */
  const abrirDocumento = () => {
    setAviso(null);
    void renovacionesApi
      .getDocumentUrl(renovacion.id)
      .then(({ url }) => window.open(url, '_blank', 'noopener'))
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) return;
        setAviso({
          titulo: 'No se pudo abrir el documento',
          mensaje: mensajeDeLaRenovacion(error, 'abrir el documento'),
        });
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
      <SheetHeader>
        <div className="flex items-start gap-3">
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
      </SheetHeader>

      {/* Cuerpo: el paso a la izquierda, el contrato y la actividad a la derecha. */}
      <SheetBody>
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
                errores={{
                  // El tope del cliente gana: es lo que está escrito AHORA.
                  canon: topeDelCanon ?? errores.canon,
                  admin: topeDeLaAdministracion ?? errores.admin,
                  ipc: errores.ipc,
                  mensaje: errores.mensaje,
                }}
                onNewRentChange={(v) => {
                  setNewRent(v);
                  borrarError('canon');
                }}
                onNewAdminFeeChange={(v) => {
                  setNewAdminFee(v);
                  borrarError('admin');
                }}
                onIpcRateChange={(v) => {
                  setIpcRate(v);
                  borrarError('ipc');
                }}
                onMessageChange={(texto) => {
                  setMensajeEditado(texto);
                  borrarError('mensaje');
                }}
                onRestaurarMensaje={() => {
                  setMensajeEditado(null);
                  borrarError('mensaje');
                }}
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
                errorDelArchivo={errores.archivo}
                onArchivo={(a) => {
                  setArchivo(a);
                  borrarError('archivo');
                }}
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
              errorDeLaNota={errores.nota}
              onNotaCambia={() => borrarError('nota')}
              onAddNote={agregarNota}
            />
          </div>
        </div>
      </SheetBody>

      {/* Lo que falló y no tiene campo (un 409 de estado, un 5xx con su
          referencia, la conexión): justo encima de los botones, fuera del
          scroll, para que se lea al lado de la acción. Entra y sale con
          `Presence` de Cadence (transform/opacity, movimiento reducido). */}
      <Presence show={aviso !== null} className="flex-none px-6 pb-3 pt-1">
        <Banner variant="danger" role="alert" title={(aviso ?? avisoQueSeVe)?.titulo} data-testid="renovacion-aviso">
          {(aviso ?? avisoQueSeVe)?.mensaje}
        </Banner>
      </Presence>

      {/* Pie: lo que sigue, a la derecha; volver y no renovar, a la izquierda. */}
      <SheetFooter
        start={
        <>
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
        </>
        }
      >
          {!terminada && paso === 0 ? (
            <>
              {renovacion.status === 'pending' ? (
                <Button
                  type="button"
                  variant="outline"
                  hideArrow
                  isLoading={ocupado === 'guardar'}
                  disabled={ocupado !== null || newRent <= 0 || valoresQueNoCaben}
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
                disabled={ocupado !== null || newRent <= 0 || !message.trim() || valoresQueNoCaben}
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
              onClick={() => void registrarFirma()}
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
      </SheetFooter>

      <DialogoNoRenovar
        abierto={terminarAbierto}
        confirmando={ocupado === 'terminar'}
        error={errores.motivo}
        onMotivoCambia={() => borrarError('motivo')}
        onCerrar={() => {
          setTerminarAbierto(false);
          borrarError('motivo');
        }}
        onConfirmar={noRenovar}
      />
    </>
  );
}
