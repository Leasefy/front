'use client';

/**
 * T-0109 contract.md §3.1.C — firma electrónica reforzada del contrato de
 * consignación, panel de agencia. Vive junto a `DocumentsSection` (el mismo
 * lugar donde está C9, la subida del PDF firmado en papel, que sigue viva y
 * sin cambios): esta sección es la vía ADICIONAL, no un reemplazo.
 *
 * Degradación (contract.md §3.2, última fila): un back sin WU-3 responde 404
 * en C2 — la sección entera se oculta, nunca un error en pantalla.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, PaperPlaneTilt, Prohibit, UploadSimple, WarningCircle } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { SignatureForm } from '@/components/contract/SignatureForm';
import type { OtpAdapter } from '@/components/contract/OTPVerification';
import { firmaDeConsignacionApi } from '@/lib/api/consignacion-firma.service';
import type { FirmanteDeConsignacionResponse, ProcesoDeFirmaResponse } from '@/lib/api/consignacion-firma.types';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import {
  describirEstadoDelProceso,
  esFirmaDeConsignacionNoDisponible,
  progresoDePropietarios,
  puedeIniciarOtroProceso,
} from '@/lib/contratos/firma-de-consignacion';

const MAX_PDF_BYTES = 10 * 1024 * 1024;
/** El `@MaxLength(500)` de `IniciarFirmaElectronicaDto.mensaje`. */
const MAX_MENSAJE = 500;
const ERROR_DEL_PDF = 'El documento debe ser un PDF de hasta 10 MB.';

type CampoDeLaFirma = 'archivo' | 'mensaje';

export interface FirmaElectronicaDeConsignacionSectionProps {
  consignacionId: string;
  /** `portafolio:edit` — sin esto la sección es de sólo lectura. */
  puedeEditar: boolean;
}

export function FirmaElectronicaDeConsignacionSection({
  consignacionId,
  puedeEditar,
}: FirmaElectronicaDeConsignacionSectionProps) {
  const [cargando, setCargando] = useState(true);
  const [noDisponible, setNoDisponible] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [proceso, setProceso] = useState<ProcesoDeFirmaResponse | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await firmaDeConsignacionApi.obtener(consignacionId);
      setProceso(res.proceso);
      setNoDisponible(false);
    } catch (e) {
      if (esFirmaDeConsignacionNoDisponible(e)) {
        setNoDisponible(true);
      } else {
        setError(e);
      }
    } finally {
      setCargando(false);
    }
  }, [consignacionId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (noDisponible) return null;

  return (
    <div className="rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg overflow-hidden" data-testid="firma-electronica-consignacion">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border-faint dark:border-border-strong">
        <div className="w-8 h-8 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center text-fg-muted dark:text-fg-subtle">
          <FileText className="w-4 h-4" />
        </div>
        <h3 className="font-semibold text-fg">Firma electrónica del contrato de consignación</h3>
      </div>
      <div className="p-5">
        {cargando ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" variant="muted" />
          </div>
        ) : error ? (
          <FalloDeCarga error={error} queEs="la firma electrónica" onReintentar={cargar} enmarcado={false} />
        ) : (
          <Contenido
            consignacionId={consignacionId}
            proceso={proceso}
            puedeEditar={puedeEditar}
            onCambio={cargar}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Contenido
// ============================================================================

function Contenido({
  consignacionId,
  proceso,
  puedeEditar,
  onCambio,
}: {
  consignacionId: string;
  proceso: ProcesoDeFirmaResponse | null;
  puedeEditar: boolean;
  onCambio: () => void;
}) {
  if (proceso === null || puedeIniciarOtroProceso(proceso)) {
    return (
      <div className="space-y-4">
        {proceso && <ProcesoCerrado proceso={proceso} />}
        {puedeEditar ? (
          <IniciarProceso consignacionId={consignacionId} onIniciado={onCambio} />
        ) : (
          <p className="text-sm text-fg-muted">No tienes permiso para iniciar una firma electrónica.</p>
        )}
      </div>
    );
  }

  // PENDIENTE
  return (
    <ProcesoPendiente
      consignacionId={consignacionId}
      proceso={proceso}
      puedeEditar={puedeEditar}
      onCambio={onCambio}
    />
  );
}

function ProcesoCerrado({ proceso }: { proceso: ProcesoDeFirmaResponse }) {
  const estado = describirEstadoDelProceso(proceso.estado);
  return (
    <div className="rounded-lg bg-surface-muted dark:bg-ink px-4 py-3 flex items-center justify-between gap-3">
      <div>
        <Badge variant={estado.tono === 'success' ? 'success' : estado.tono === 'danger' ? 'destructive' : 'secondary'}>
          {estado.etiqueta}
        </Badge>
        {proceso.motivoDeCancelacion && (
          <p className="mt-1 text-xs text-fg-muted">{proceso.motivoDeCancelacion}</p>
        )}
      </div>
      {proceso.estado === 'FIRMADO' && <DocumentoDelProceso consignacionId={proceso.consignacionId} />}
    </div>
  );
}

// ── Iniciar un proceso (C1) ───────────────────────────────────────────────

function IniciarProceso({ consignacionId, onIniciado }: { consignacionId: string; onIniciado: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const elegirRef = useRef<HTMLButtonElement>(null);
  const mensajeRef = useRef<HTMLTextAreaElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<Partial<Record<CampoDeLaFirma, string>>>({});

  const elegir = () => inputRef.current?.click();

  /** El error en su campo, con el foco en el primero. */
  const marcar = (nuevos: Partial<Record<CampoDeLaFirma, string>>) => {
    setErrores(nuevos);
    if (nuevos.archivo) elegirRef.current?.focus();
    else if (nuevos.mensaje) mensajeRef.current?.focus();
  };

  const alElegir = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' || file.size > MAX_PDF_BYTES) {
      // Es un error del campo del PDF, no un toast que se va: queda debajo
      // del botón hasta que se elija otro.
      marcar({ archivo: ERROR_DEL_PDF });
      return;
    }
    setErrores((prev) => ({ ...prev, archivo: undefined }));
    setArchivo(file);
  };

  const iniciar = async () => {
    if (!archivo || enviando) return;
    if (mensaje.trim().length > MAX_MENSAJE) {
      marcar({ mensaje: 'El mensaje puede tener hasta 500 caracteres.' });
      return;
    }
    setErrores({});
    setEnviando(true);
    try {
      await firmaDeConsignacionApi.iniciar(consignacionId, { file: archivo, mensaje: mensaje.trim() || undefined });
      toast.success('Firma electrónica iniciada. Se invitó a los propietarios.');
      setArchivo(null);
      setMensaje('');
      onIniciado();
    } catch (err) {
      // Un 400 en `mensaje` va debajo del mensaje; uno del archivo, debajo del
      // PDF. Lo demás (un 409 del mandato, un 5xx, la red) al toast, por el
      // traductor.
      const r = repartirErroresDelServidor<CampoDeLaFirma>(err, {
        mapa: { mensaje: 'mensaje', file: 'archivo', archivo: 'archivo' },
        campos: ['archivo', 'mensaje'],
        porDefecto: '',
        accion: 'iniciar la firma electrónica',
      });
      if (r.orden.length > 0) marcar(r.porCampo);
      if (r.delServidor.length === 0) {
        toast.error('No se pudo iniciar la firma electrónica.', { description: mensajeDelFallo(err, '') });
      } else if (r.sueltos.length > 0) {
        toast.error('No se pudo iniciar la firma electrónica.', { description: r.sueltos.join(' · ') });
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-3" data-testid="iniciar-firma-electronica">
      <p className="text-sm text-fg-muted">
        Sube el PDF del contrato de consignación para que los propietarios y el representante de la
        agencia lo firmen electrónicamente. Sigue disponible adjuntar el contrato firmado en papel,
        arriba en Documentos.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={alElegir}
        data-testid="iniciar-firma-electronica-input"
      />
      {archivo ? (
        <div className="rounded-lg border border-border bg-surface px-3 py-2 flex items-center justify-between gap-2 text-sm">
          <span className="truncate text-fg">{archivo.name}</span>
          <Button variant="link" size="sm" hideArrow onClick={() => setArchivo(null)} className="h-auto px-0 text-fg-muted">
            Quitar
          </Button>
        </div>
      ) : (
        <Button
          ref={elegirRef}
          variant="outline"
          hideArrow
          onClick={elegir}
          className="gap-2"
          aria-invalid={errores.archivo ? true : undefined}
          aria-describedby="firma-electronica-pdf-error"
          data-testid="elegir-pdf"
        >
          <UploadSimple className="w-4 h-4" />
          Elegir el PDF
        </Button>
      )}
      <ErrorDelCampo id="firma-electronica-pdf-error" mensaje={errores.archivo} />
      <Textarea
        ref={mensajeRef}
        value={mensaje}
        onChange={(e) => {
          setMensaje(e.target.value);
          setErrores((prev) => ({ ...prev, mensaje: undefined }));
        }}
        placeholder="Mensaje opcional para el correo de invitación"
        aria-label="Mensaje para el correo de invitación"
        maxLength={MAX_MENSAJE}
        rows={2}
        aria-invalid={errores.mensaje ? true : undefined}
        aria-describedby="firma-electronica-mensaje-error"
        data-testid="firma-electronica-mensaje"
      />
      <ErrorDelCampo id="firma-electronica-mensaje-error" mensaje={errores.mensaje} />
      <Button onClick={() => void iniciar()} disabled={!archivo || enviando} isLoading={enviando} hideArrow data-testid="iniciar-firma-electronica-boton">
        Iniciar firma electrónica
      </Button>
    </div>
  );
}

// ── Proceso PENDIENTE ────────────────────────────────────────────────────

function ProcesoPendiente({
  consignacionId,
  proceso,
  puedeEditar,
  onCambio,
}: {
  consignacionId: string;
  proceso: ProcesoDeFirmaResponse;
  puedeEditar: boolean;
  onCambio: () => void;
}) {
  const { firmados, total } = progresoDePropietarios(proceso);
  const [cancelando, setCancelando] = useState(false);

  const cancelar = async () => {
    if (cancelando) return;
    setCancelando(true);
    try {
      await firmaDeConsignacionApi.cancelar(consignacionId);
      toast.success('Firma electrónica cancelada.');
      onCambio();
    } catch (err) {
      toast.error('No se pudo cancelar.', { description: mensajeDelFallo(err, '') });
    } finally {
      setCancelando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-fg" data-testid="progreso-propietarios">
          {firmados} de {total} propietarios firmaron
        </p>
        {puedeEditar && (
          <Button
            variant="ghost"
            size="sm"
            hideArrow
            onClick={() => void cancelar()}
            isLoading={cancelando}
            className="gap-1.5 text-danger hover:text-danger"
            data-testid="cancelar-firma-electronica"
          >
            <Prohibit className="w-3.5 h-3.5" />
            Cancelar
          </Button>
        )}
      </div>

      <ul className="space-y-2" data-testid="firmantes-lista">
        {proceso.firmantes.map((f) => (
          <FirmanteRow key={f.id} consignacionId={consignacionId} firmante={f} puedeEditar={puedeEditar} onCambio={onCambio} />
        ))}
      </ul>

      {proceso.puedeFirmarElUsuarioActual && (
        <div className="pt-2 border-t border-border-faint dark:border-border-strong">
          <FirmaDelRepresentante consignacionId={consignacionId} onFirmado={onCambio} />
        </div>
      )}

      <DocumentoDelProceso consignacionId={consignacionId} />
    </div>
  );
}

function FirmanteRow({
  consignacionId,
  firmante,
  puedeEditar,
  onCambio,
}: {
  consignacionId: string;
  firmante: FirmanteDeConsignacionResponse;
  puedeEditar: boolean;
  onCambio: () => void;
}) {
  const [reenviando, setReenviando] = useState(false);
  const puedeReenviar = puedeEditar && firmante.tipo === 'PROPIETARIO' && !firmante.firmado;

  const reenviar = async () => {
    if (reenviando) return;
    setReenviando(true);
    try {
      await firmaDeConsignacionApi.reenviar(consignacionId, firmante.id);
      toast.success(`Invitación reenviada a ${firmante.nombre}.`);
      onCambio();
    } catch (err) {
      toast.error('No se pudo reenviar la invitación.', { description: mensajeDelFallo(err, '') });
    } finally {
      setReenviando(false);
    }
  };

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted dark:bg-ink px-3 py-2" data-testid="firmante-item">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg truncate">
          {firmante.nombre}
          {firmante.tipo === 'REPRESENTANTE_DE_LA_AGENCIA' && (
            <span className="ml-1.5 text-xs font-normal text-fg-muted">(representante)</span>
          )}
        </p>
        {firmante.invitacion === 'SIN_CORREO' && (
          <p className="flex items-center gap-1 text-xs text-warning">
            <WarningCircle className="w-3.5 h-3.5" /> Sin correo registrado
          </p>
        )}
        {firmante.invitacion === 'FALLO' && (
          <p className="flex items-center gap-1 text-xs text-danger">
            <WarningCircle className="w-3.5 h-3.5" /> No se pudo enviar la invitación
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={firmante.firmado ? 'success' : 'secondary'}>
          {firmante.firmado ? 'Firmó' : 'Pendiente'}
        </Badge>
        {puedeReenviar && (
          <Button
            variant="ghost"
            size="sm"
            hideArrow
            onClick={() => void reenviar()}
            isLoading={reenviando}
            className="gap-1.5"
            data-testid="reenviar-invitacion"
          >
            <PaperPlaneTilt className="w-3.5 h-3.5" />
            Reenviar
          </Button>
        )}
      </div>
    </li>
  );
}

function FirmaDelRepresentante({ consignacionId, onFirmado }: { consignacionId: string; onFirmado: () => void }) {
  const adapter: OtpAdapter = {
    send: async () => {
      const r = await firmaDeConsignacionApi.otpSend(consignacionId);
      return { sentTo: r.sentTo, cooldownSeconds: r.cooldownSeconds ?? 60, channels: r.channels };
    },
    verify: async (code: string) => {
      const r = await firmaDeConsignacionApi.otpVerify(consignacionId, code);
      return { verificationToken: r.verificationToken };
    },
  };

  const firmar = async ({ signatureData, otpVerificationToken }: { signatureData: string; otpVerificationToken?: string }) => {
    if (!otpVerificationToken) return;
    try {
      await firmaDeConsignacionApi.firmar(consignacionId, {
        acceptedTerms: true,
        consentText: 'Firmo el contrato de consignación como representante de la inmobiliaria.',
        signatureData,
        otpVerificationToken,
      });
      toast.success('Firmaste el contrato de consignación.');
      onFirmado();
    } catch (err) {
      toast.error('No se pudo firmar.', { description: mensajeDelFallo(err, '') });
      throw err;
    }
  };

  return (
    <SignatureForm
      onSign={firmar}
      adapter={adapter}
      isLandlord={false}
      rolLabel="Representante de la agencia"
      textos={{
        firmado: 'Contrato de consignación firmado',
        aceptacion: 'Acepto los términos del contrato de consignación.',
        boton: 'Firmar como representante',
      }}
    />
  );
}

function DocumentoDelProceso({ consignacionId }: { consignacionId: string }) {
  const [cargando, setCargando] = useState(false);

  const abrir = async () => {
    if (cargando) return;
    setCargando(true);
    try {
      const doc = await firmaDeConsignacionApi.documento(consignacionId);
      window.open(doc.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error('No se pudo abrir el documento.', { description: mensajeDelFallo(err, '') });
    } finally {
      setCargando(false);
    }
  };

  return (
    <Button variant="link" size="sm" hideArrow onClick={() => void abrir()} isLoading={cargando} className="h-auto gap-1.5 px-0" data-testid="ver-documento-firma-electronica">
      <FileText className="w-3.5 h-3.5" />
      Ver documento
    </Button>
  );
}
