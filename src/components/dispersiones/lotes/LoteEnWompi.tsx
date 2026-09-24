'use client';

/**
 * El lote y Wompi · Pagos a terceros, dentro del detalle del lote.
 *
 * ── Qué cambia (23-09-2026) ────────────────────────────────────────────────
 *
 * Hasta hoy un lote aprobado se bajaba en el archivo del banco, se subía a mano
 * al portal y alguien volvía a marcarlo pagado. Si la inmobiliaria conectó
 * Wompi y el lote sale de una cuenta vinculada allá, la acción principal es
 * «Enviar a Wompi»: el lote queda esperando a que el Aprobador de la
 * inmobiliaria lo apruebe en el panel de Wompi, y se cierra SOLO cuando Wompi
 * confirma cada pago. El archivo sigue disponible como alternativa.
 *
 * ── Lo que esta pieza se niega a hacer ──────────────────────────────────────
 *
 * · Ofrecer «Enviar a Wompi» cuando el back lo rechazaría: el porqué viene del
 *   back (`porQueNo`) y el botón se apaga con esas palabras.
 * · Ofrecerlo a quien no tiene permiso: apagado con el motivo, sin cable muerto.
 * · Fallar cerrado: si la lectura de Wompi falla o falta la migración, el
 *   detalle del lote se ve entero y sigue por archivo.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowSquareOut, ArrowsClockwise, PaperPlaneTilt } from '@phosphor-icons/react';
import { Banner } from '@leasefy/cadence';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { toast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { formatDateTime } from '@/lib/format';
import { wompiPagosApi } from '@/lib/api/wompi-pagos.service';
import type { EnvioAWompi, EstadoDelEnvio, VistaDelLoteEnWompi } from '@/lib/api/wompi-pagos.types';
import type { EstadoDelLote } from '@/lib/api/lotes-de-dispersion.types';
import { useRefrescoAutomatico } from '@/lib/hooks/use-refresco-automatico';
import { RECURSO_DE_LOTES } from '@/lib/api/lotes-de-dispersion.service';
import type { TonoDeBadge } from './estado-del-lote';

export const NOMBRE_DEL_ENVIO: Record<EstadoDelEnvio, string> = {
  ENVIANDO: 'Mandándolo a Wompi',
  ESPERANDO_APROBACION: 'Esperando al Aprobador',
  PAGANDO: 'Wompi está pagando',
  CERRADO: 'Cerrado por Wompi',
  RECHAZADO: 'Wompi lo rechazó',
  FALLO_EL_ENVIO: 'No se pudo mandar',
  SIMULACION_TERMINADA: 'Simulación terminada',
};

const TONO_DEL_ENVIO: Record<EstadoDelEnvio, TonoDeBadge> = {
  ENVIANDO: 'warning',
  ESPERANDO_APROBACION: 'warning',
  PAGANDO: 'default',
  CERRADO: 'success',
  RECHAZADO: 'destructive',
  FALLO_EL_ENVIO: 'destructive',
  SIMULACION_TERMINADA: 'secondary',
};

/** «37 de 120 pagados · 2 rechazados». Una frase, no fichas sueltas. */
export function avanceEnPalabras(e: Pick<EnvioAWompi, 'pagados' | 'totalDeGiros' | 'rechazados'>): string {
  const partes = [`${e.pagados} de ${e.totalDeGiros} ${e.totalDeGiros === 1 ? 'pagado' : 'pagados'}`];
  if (e.rechazados > 0) partes.push(`${e.rechazados} ${e.rechazados === 1 ? 'rechazado' : 'rechazados'}`);
  return partes.join(' · ');
}

/**
 * La lectura de Wompi para un lote. Falla ABIERTO: con error, `vista` queda
 * `null` y el detalle sigue por archivo. Mientras el lote está en Wompi se
 * vuelve a pedir cada 30 s, para que el avance se vea sin recargar.
 */
export function useLoteEnWompi(loteId: string, estado: EstadoDelLote) {
  const [vista, setVista] = useState<VistaDelLoteEnWompi | null>(null);
  const ultima = useRef(0);

  const recargar = useCallback(async () => {
    const n = ++ultima.current;
    try {
      const v = await wompiPagosApi.verLote(loteId);
      if (n === ultima.current) setVista(v);
    } catch {
      if (n === ultima.current) setVista(null);
    }
  }, [loteId]);

  useEffect(() => {
    void recargar();
  }, [recargar, estado]);

  useRefrescoAutomatico([RECURSO_DE_LOTES], recargar);

  const abierto = vista?.envio?.abierto ?? false;
  useEffect(() => {
    if (!abierto) return;
    const t = setInterval(() => void recargar(), 30_000);
    return () => clearInterval(t);
  }, [abierto, recargar]);

  return { vista, recargar, setVista };
}

export interface LoteEnWompiProps {
  loteId: string;
  estado: EstadoDelLote;
  vista: VistaDelLoteEnWompi | null;
  /** `dispersiones:edit`: mandar y consultar lo pide el back. */
  puedeEditar: boolean;
  onCambio: (vista: VistaDelLoteEnWompi) => void;
}

/** El bloque de Wompi del detalle del lote. `null` si no hay nada que decir. */
export function LoteEnWompi({ loteId, estado, vista, puedeEditar, onCambio }: LoteEnWompiProps) {
  const [confirmando, setConfirmando] = useState(false);
  const [consultando, setConsultando] = useState(false);

  if (!vista || !vista.disponible) return null;
  const { envio } = vista;

  // Sin conexión y sin envío: una línea, sólo cuando el lote está listo para salir.
  if (!vista.conexion && !envio) {
    if (estado !== 'APROBADO') return null;
    return (
      <p className="text-sm text-fg-muted" data-testid="wompi-sin-conectar">
        Con Wompi · Pagos a terceros este lote saldría sin subir el archivo al banco. Un administrador lo
        conecta en{' '}
        <Link href="/panel/inmobiliaria/configuracion/integraciones" className="underline underline-offset-2">
          Configuración → Integraciones
        </Link>
        .
      </p>
    );
  }

  const consultar = async () => {
    setConsultando(true);
    try {
      onCambio(await wompiPagosApi.consultar(loteId));
    } catch (e) {
      toast.error('No se pudo consultar a Wompi', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setConsultando(false);
    }
  };

  const mostrarEnvio = envio && (envio.abierto || estado !== 'APROBADO' || envio.estado === 'CERRADO');
  const ofrecerEnvio = estado === 'APROBADO';
  const sinPermiso = 'Mandar el lote a Wompi pide permiso de edición sobre dispersiones.';
  const motivoApagado = !puedeEditar ? sinPermiso : vista.sePuedeEnviar ? null : vista.porQueNo;

  return (
    <section
      className="space-y-4 rounded-lg border border-border bg-surface p-4 shadow-sm"
      data-testid="lote-en-wompi"
      data-estado-del-envio={envio?.estado ?? 'ninguno'}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-fg">Wompi · Pagos a terceros</h2>
          {vista.conexion?.ambiente === 'SANDBOX' && (
            <Badge variant="secondary">Sandbox: no mueve plata</Badge>
          )}
          {mostrarEnvio && envio && (
            <Badge variant={TONO_DEL_ENVIO[envio.estado]} data-testid="estado-del-envio">
              {NOMBRE_DEL_ENVIO[envio.estado]}
            </Badge>
          )}
        </div>
        <ParaEntenderMas etiqueta="Cómo sale un lote por Wompi" titulo="Un lote por Wompi · Pagos a terceros">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-fg">
            <li>
              Al mandarlo, el lote pasa a <strong>En Wompi</strong>: desde ese momento no sale su archivo del
              banco ni se anula aquí, porque sería girar dos veces.
            </li>
            <li>
              Wompi lo recibe en <strong>pendiente de aprobación</strong>. El Aprobador de tu inmobiliaria lo
              aprueba en el panel de Wompi: es el segundo control, además del de Leasefy.
            </li>
            <li>
              Wompi paga cada giro (a Bancolombia en minutos; a otros bancos, en los ciclos ACH, hasta 24
              horas) y nos avisa. Cada giro que Wompi confirma queda girado aquí: se cancelan sus cuotas, se
              aplican sus deducciones y, cuando Wompi termina el lote, sale el asiento, la factura si la
              pediste y el correo «Te giramos» a cada propietario.
            </li>
            <li>
              Lo que el banco rechaza vuelve a la lista de «a quién pagarle» con la causal en español (por
              ejemplo, «el número de cuenta no existe»), para corregirlo y mandarlo en otro lote.
            </li>
            <li>
              Si el Aprobador lo rechaza en Wompi, no se paga nada y el lote vuelve a Aprobado: lo puedes
              mandar otra vez o bajar su archivo.
            </li>
            <li>
              Mandarlo dos veces nunca crea dos lotes en Wompi: cada envío lleva una llave de idempotencia y,
              si la respuesta se pierde, primero se busca el lote por su referencia.
            </li>
          </ol>
        </ParaEntenderMas>
      </div>

      {mostrarEnvio && envio && (
        <div className="space-y-3" data-testid="envio-a-wompi">
          <p className="text-sm text-fg">
            <span className="font-mono tabular-nums" data-testid="avance-en-wompi">
              {avanceEnPalabras(envio)}
            </span>{' '}
            <span className="text-fg-muted">
              de <span className="font-mono tabular-nums">{formatCurrency(envio.totalCop)}</span> desde{' '}
              {envio.cuentaOrigen}.
            </span>
          </p>
          {/* 🔴 Sin barra propia (Nico, 23-09: «todas las cargas déjalas que
              sucedan allí»): el avance del envío lo pinta el centro de
              procesos. Acá queda el dato del lote, en una frase. */}
          {envio.mensaje && (
            <Banner
              variant={
                envio.estado === 'RECHAZADO' || envio.estado === 'FALLO_EL_ENVIO'
                  ? 'danger'
                  : envio.estado === 'CERRADO'
                    ? 'success'
                    : 'info'
              }
            >
              <span data-testid="mensaje-del-envio">{envio.mensaje}</span>
            </Banner>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {envio.estado === 'ESPERANDO_APROBACION' && (
              <Button asChild hideArrow>
                <a href={vista.enlaceAlPanel} target="_blank" rel="noopener noreferrer">
                  <ArrowSquareOut className="h-4 w-4" />
                  Abrir el panel de Wompi
                </a>
              </Button>
            )}
            {envio.abierto && (
              <Button
                variant="secondary"
                hideArrow
                onClick={() => void consultar()}
                isLoading={consultando}
                disabled={!puedeEditar}
                title={
                  puedeEditar ? undefined : 'Consultar a Wompi pide permiso de edición sobre dispersiones.'
                }
              >
                <ArrowsClockwise className="h-4 w-4" />
                Consultar ahora
              </Button>
            )}
            {envio.estado === 'ENVIANDO' && (
              <Button
                variant="secondary"
                hideArrow
                onClick={() => setConfirmando(true)}
                disabled={!puedeEditar}
                title={puedeEditar ? undefined : sinPermiso}
              >
                <PaperPlaneTilt className="h-4 w-4" />
                Volver a mandar
              </Button>
            )}
            <p className="text-caption text-fg-muted">
              Mandado {formatDateTime(envio.enviadoAt)}
              {envio.ultimaConsultaAt ? ` · última consulta ${formatDateTime(envio.ultimaConsultaAt)}` : ''}
              {envio.intento > 1 ? ` · intento ${envio.intento}` : ''}
            </p>
          </div>
          <GirosQueNoSalieron envio={envio} />
        </div>
      )}

      {ofrecerEnvio && (
        <div className="space-y-2" data-testid="enviar-a-wompi">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              hideArrow
              onClick={() => setConfirmando(true)}
              disabled={motivoApagado !== null}
              title={motivoApagado ?? undefined}
              data-testid="boton-enviar-a-wompi"
            >
              <PaperPlaneTilt className="h-4 w-4" />
              Enviar a Wompi
            </Button>
            {vista.cuentaOrigen && motivoApagado === null && (
              <p className="text-sm text-fg-muted">
                Sale desde <span className="font-mono">{vista.cuentaOrigen}</span>.
              </p>
            )}
          </div>
          {motivoApagado && (
            <p className="text-sm text-fg-muted" data-testid="por-que-no-wompi">
              {motivoApagado}
            </p>
          )}
        </div>
      )}

      <EnviarAWompiDialog
        abierto={confirmando}
        loteId={loteId}
        vista={vista}
        onCerrar={() => setConfirmando(false)}
        onListo={onCambio}
      />
    </section>
  );
}

/** Los giros que Wompi no pagó (o que ni se mandaron), con su porqué. */
function GirosQueNoSalieron({ envio }: { envio: EnvioAWompi }) {
  const fuera = envio.transacciones.filter(
    (t) => t.estado === 'RECHAZADA' || t.estado === 'CANCELADA' || t.estado === 'NO_ENVIADA',
  );
  if (fuera.length === 0) return null;
  return (
    <div className="space-y-2" data-testid="giros-que-no-salieron">
      <p className="text-sm font-medium text-fg">
        {fuera.length === 1 ? 'Un giro no salió' : `${fuera.length} giros no salieron`}
      </p>
      <ul className="divide-y divide-border rounded-md border border-border">
        {fuera.map((t) => (
          <li
            key={`${t.dispersionId}-${t.cuentaFinal}-${t.estado}`}
            className="space-y-0.5 px-3 py-2 text-sm"
          >
            <p className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium text-fg">{t.nombre}</span>
              <span className="font-mono tabular-nums text-fg">{formatCurrency(t.valorCop)}</span>
            </p>
            <p className="text-caption text-fg-muted">
              {t.cuentaFinal ? <span className="font-mono">••{t.cuentaFinal} · </span> : null}
              {t.motivo ?? 'Wompi no lo pagó.'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EnviarAWompiDialog({
  abierto,
  loteId,
  vista,
  onCerrar,
  onListo,
}: {
  abierto: boolean;
  loteId: string;
  vista: VistaDelLoteEnWompi;
  onCerrar: () => void;
  onListo: (v: VistaDelLoteEnWompi) => void;
}) {
  /**
   * «Factura ahora o después», como en «Marcar pagado». Arranca apagado: emitir
   * consume números de la resolución de la DIAN y no se deshace. Se aplica
   * cuando Wompi confirma y el lote se cierra.
   */
  const [facturarAhora, setFacturarAhora] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reenvio = vista.envio?.estado === 'ENVIANDO';

  useEffect(() => {
    if (!abierto) {
      setFacturarAhora(false);
      setError(null);
    }
  }, [abierto]);

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const v = await wompiPagosApi.enviar(loteId, reenvio ? undefined : facturarAhora);
      onListo(v);
      toast.success(v.envio?.estado === 'ENVIANDO' ? 'Wompi no respondió todavía' : 'El lote está en Wompi', {
        description:
          v.envio?.estado === 'ENVIANDO'
            ? 'No sabemos si lo recibió: se consulta por su referencia.'
            : 'Apruébalo en el panel de Wompi con tu rol de Aprobador.',
      });
      onCerrar();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'No se pudo mandar el lote a Wompi.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-md" data-testid="dialogo-enviar-a-wompi">
        <DialogHeader>
          <DialogTitle>{reenvio ? 'Volver a mandar a Wompi' : 'Enviar el lote a Wompi'}</DialogTitle>
          <DialogDescription>
            {reenvio
              ? 'Primero se busca el lote en Wompi por su referencia; sólo si no está se manda otra vez, con la misma llave. No se duplica.'
              : `Sale desde ${vista.cuentaOrigen ?? 'la cuenta vinculada en Wompi'}. Queda esperando a que el Aprobador de tu inmobiliaria lo apruebe en el panel de Wompi.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 px-6 py-4 text-sm">
          {!reenvio && (
            <label className="flex items-start gap-2" htmlFor="wompi-facturar-ahora">
              <Checkbox
                id="wompi-facturar-ahora"
                data-testid="wompi-facturar-ahora"
                checked={facturarAhora}
                onCheckedChange={(v) => setFacturarAhora(v === true)}
              />
              <span className="text-sm text-fg-muted">
                Facturarle a los propietarios cuando Wompi cierre el lote: se emite la comisión de la
                inmobiliaria con su IVA y sus retenciones.{' '}
                <strong className="font-medium">
                  Consume números de la resolución de la DIAN y no se deshace.
                </strong>{' '}
                Sin tildar se emite después, desde Facturación.
              </span>
            </label>
          )}
          {vista.conexion?.ambiente === 'SANDBOX' && (
            <Banner variant="info">
              Estás conectado al sandbox: Wompi simula los pagos y aquí no se marca nada como pagado.
            </Banner>
          )}
          {error && <Banner variant="danger">{error}</Banner>}
        </div>
        <DialogFooter>
          <Button variant="outline" hideArrow onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            onClick={() => void enviar()}
            isLoading={enviando}
            hideArrow
            data-testid="confirmar-enviar-a-wompi"
          >
            <PaperPlaneTilt className="h-4 w-4" />
            {reenvio ? 'Volver a mandar' : 'Enviar a Wompi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
