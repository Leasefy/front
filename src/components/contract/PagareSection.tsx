'use client';

/**
 * T-0109 contract.md §3.1.E5–E8 — el pagaré y su carta de instrucciones,
 * panel de agencia. Vive en la ficha del contrato, junto a `CodeudoresSection`
 * (los codeudores son los firmantes de este pagaré). Se oculta sola contra un
 * back sin WU-4 (404 en E5); `disponible:false` (flag apagado o sin
 * proveedor resoluble) la deja de sólo lectura con el motivo.
 */

import { useCallback, useEffect, useState } from 'react';
import { FileText, Prohibit, Receipt, WarningCircle } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { pagareApi } from '@/lib/api/pagare.service';
import type { FirmanteDelPagareResponse, PagareResponse } from '@/lib/api/pagare.types';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import {
  describirEstadoDelFirmante,
  describirEstadoDelPagare,
  esPagareNoDisponible,
  puedeEmitirNuevoPagare,
} from '@/lib/contratos/pagare';

export interface PagareSectionProps {
  contractId: string;
  /** `contratos:edit` — sin esto sólo se puede mirar. */
  puedeEditar: boolean;
}

export function PagareSection({ contractId, puedeEditar }: PagareSectionProps) {
  const [cargando, setCargando] = useState(true);
  const [noDisponible, setNoDisponible] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [pagare, setPagare] = useState<PagareResponse | null>(null);
  const [disponible, setDisponible] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await pagareApi.obtener(contractId);
      setPagare(res.pagare);
      setDisponible(res.disponible);
      setNoDisponible(false);
    } catch (e) {
      if (esPagareNoDisponible(e)) setNoDisponible(true);
      else setError(e);
    } finally {
      setCargando(false);
    }
  }, [contractId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (noDisponible) return null;

  return (
    <div className="rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg overflow-hidden" data-testid="pagare-section">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border-faint dark:border-border-strong">
        <div className="w-8 h-8 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center text-fg-muted dark:text-fg-subtle">
          <Receipt className="w-4 h-4" />
        </div>
        <h3 className="font-semibold text-fg">Pagaré y carta de instrucciones</h3>
      </div>
      <div className="p-5">
        {cargando ? (
          <div className="flex items-center justify-center py-6">
            <Spinner size="sm" variant="muted" />
          </div>
        ) : error ? (
          <FalloDeCarga error={error} queEs="el pagaré" onReintentar={cargar} enmarcado={false} />
        ) : !disponible ? (
          <p className="text-sm text-fg-muted" data-testid="pagare-no-disponible">
            El pagaré no está disponible todavía en esta cuenta.
          </p>
        ) : (
          <Contenido contractId={contractId} pagare={pagare} puedeEditar={puedeEditar} onCambio={cargar} />
        )}
      </div>
    </div>
  );
}

function Contenido({
  contractId,
  pagare,
  puedeEditar,
  onCambio,
}: {
  contractId: string;
  pagare: PagareResponse | null;
  puedeEditar: boolean;
  onCambio: () => void;
}) {
  const [emitiendo, setEmitiendo] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const emitir = async () => {
    if (emitiendo) return;
    setEmitiendo(true);
    try {
      await pagareApi.emitir(contractId);
      toast.success('Pagaré emitido. Se invitó a los firmantes.');
      onCambio();
    } catch (err) {
      toast.error('No se pudo emitir el pagaré.', { description: mensajeDelFallo(err, '') });
    } finally {
      setEmitiendo(false);
    }
  };

  const cancelar = async () => {
    if (cancelando) return;
    setCancelando(true);
    try {
      await pagareApi.cancelar(contractId);
      toast.success('Pagaré cancelado.');
      onCambio();
    } catch (err) {
      toast.error('No se pudo cancelar.', { description: mensajeDelFallo(err, '') });
    } finally {
      setCancelando(false);
    }
  };

  if (!pagare || puedeEmitirNuevoPagare(pagare.estado)) {
    return (
      <div className="space-y-3">
        {pagare && <EstadoDelPagareResumen pagare={pagare} />}
        {puedeEditar ? (
          <Button onClick={() => void emitir()} isLoading={emitiendo} hideArrow data-testid="emitir-pagare">
            Emitir pagaré
          </Button>
        ) : (
          <p className="text-sm text-fg-muted">No tienes permiso para emitir el pagaré.</p>
        )}
      </div>
    );
  }

  const estado = describirEstadoDelPagare(pagare.estado);

  return (
    <div className="space-y-4">
      {pagare.esSandbox && (
        <div className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-2.5 flex items-start gap-2" data-testid="pagare-sandbox-banner">
          <WarningCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-warning">Sandbox — sin validez jurídica</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Badge variant={estado.tono === 'success' ? 'success' : estado.tono === 'danger' ? 'destructive' : estado.tono === 'warning' ? 'warning' : 'secondary'}>
          {estado.etiqueta}
        </Badge>
        {puedeEditar && pagare.estado === 'PENDIENTE_DE_FIRMA' && (
          <Button
            variant="ghost"
            size="sm"
            hideArrow
            onClick={() => void cancelar()}
            isLoading={cancelando}
            className="gap-1.5 text-danger hover:text-danger"
            data-testid="cancelar-pagare"
          >
            <Prohibit className="w-3.5 h-3.5" />
            Cancelar
          </Button>
        )}
      </div>

      {pagare.ultimoError && (
        <p className="text-xs text-danger" data-testid="pagare-ultimo-error">{pagare.ultimoError}</p>
      )}

      <ul className="space-y-2" data-testid="firmantes-del-pagare">
        {pagare.firmantes.map((f) => (
          <FirmanteDelPagareRow
            key={f.id}
            pagareId={pagare.id}
            firmante={f}
            /* E11 — sólo en sandbox y sólo con permiso de edición; el endpoint
               ni siquiera existe fuera del gate del back (contract.md §3.1.E11). */
            puedeSimular={pagare.esSandbox && puedeEditar}
            onCambio={onCambio}
          />
        ))}
      </ul>

      <div className="flex items-center gap-4">
        <DocumentoDelPagareLink contractId={contractId} tipo="pagare" firmado={pagare.documentos.pagare.firmado} etiqueta="Pagaré" />
        <DocumentoDelPagareLink contractId={contractId} tipo="carta-de-instrucciones" firmado={pagare.documentos.cartaDeInstrucciones.firmado} etiqueta="Carta de instrucciones" />
      </div>
    </div>
  );
}

function FirmanteDelPagareRow({
  pagareId,
  firmante,
  puedeSimular,
  onCambio,
}: {
  pagareId: string;
  firmante: FirmanteDelPagareResponse;
  puedeSimular: boolean;
  onCambio: () => void;
}) {
  const [simulando, setSimulando] = useState(false);
  const e = describirEstadoDelFirmante(firmante.estado);
  const ofrecerSimular = puedeSimular && firmante.estado === 'PENDIENTE';

  const simular = async () => {
    if (simulando) return;
    setSimulando(true);
    try {
      await pagareApi.simular(pagareId, firmante.id, 'FIRMAR');
      toast.success(`${firmante.nombre}: firma simulada.`);
      onCambio();
    } catch (err) {
      toast.error('No se pudo simular la firma.', { description: mensajeDelFallo(err, '') });
    } finally {
      setSimulando(false);
    }
  };

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted dark:bg-ink px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg truncate">{firmante.nombre}</p>
        <p className="text-xs text-fg-muted">{firmante.tipo === 'INQUILINO' ? 'Inquilino' : 'Codeudor'}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={e.tono === 'success' ? 'success' : e.tono === 'danger' ? 'destructive' : 'warning'}>
          {e.etiqueta}
        </Badge>
        {ofrecerSimular && (
          <Button
            variant="ghost"
            size="sm"
            hideArrow
            onClick={() => void simular()}
            isLoading={simulando}
            className="h-auto px-2 text-xs"
            data-testid="simular-firma-pagare"
          >
            Simular firma
          </Button>
        )}
      </div>
    </li>
  );
}

function EstadoDelPagareResumen({ pagare }: { pagare: PagareResponse }) {
  const estado = describirEstadoDelPagare(pagare.estado);
  return (
    <div className="rounded-lg bg-surface-muted dark:bg-ink px-4 py-3">
      <Badge variant={estado.tono === 'success' ? 'success' : estado.tono === 'danger' ? 'destructive' : 'secondary'}>
        {estado.etiqueta}
      </Badge>
      {pagare.motivoDeCancelacion && <p className="mt-1 text-xs text-fg-muted">{pagare.motivoDeCancelacion}</p>}
    </div>
  );
}

function DocumentoDelPagareLink({
  contractId,
  tipo,
  firmado,
  etiqueta,
}: {
  contractId: string;
  tipo: 'pagare' | 'carta-de-instrucciones';
  firmado: boolean;
  etiqueta: string;
}) {
  const [cargando, setCargando] = useState(false);

  const abrir = async () => {
    if (cargando) return;
    setCargando(true);
    try {
      const doc = await pagareApi.documento(contractId, tipo);
      window.open(doc.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error('No se pudo abrir el documento.', { description: mensajeDelFallo(err, '') });
    } finally {
      setCargando(false);
    }
  };

  return (
    <Button variant="link" size="sm" hideArrow onClick={() => void abrir()} isLoading={cargando} className="h-auto gap-1.5 px-0" data-testid={`documento-pagare-${tipo}`}>
      <FileText className="w-3.5 h-3.5" />
      {etiqueta}{firmado ? '' : ' (sin firmar)'}
    </Button>
  );
}
