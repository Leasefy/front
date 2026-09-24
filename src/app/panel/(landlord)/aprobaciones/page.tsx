'use client';

/**
 * 🔴 D12 — «Aprobar reparaciones», en el portal del PROPIETARIO.
 *
 * Nico y Juan Camilo (17-09-2026): las reparaciones a cargo del propietario
 * SIEMPRE las aprueba el propietario. Acá las ve con la cotización y las
 * acepta o las rechaza con UN clic. El descuento en su liquidación nace cuando
 * aprueba; si rechaza, no se le descuenta nada y la inmobiliaria decide qué
 * sigue.
 *
 * Las de EMERGENCIA no esperan su clic: se hicieron, se descontaron y se le
 * generó el aviso ese mismo día. Salen en el historial con el aviso y el
 * soporte.
 *
 * El back resuelve quién es por la sesión (`GET /portal/aprobaciones-de-reparacion`).
 */

import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@leasefy/cadence';
import { CheckCircle, XCircle, Siren, Hourglass } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { aprobacionesDeReparacionApi } from '@/lib/api/aprobaciones-de-reparacion.service';
import type { AprobacionEnElPortal } from '@/lib/types/deducciones';

const ESTADO: Record<AprobacionEnElPortal['estado'], string> = {
  PENDIENTE: 'Esperando tu respuesta',
  APROBADA: 'La aprobaste: se descuenta de tu liquidación',
  RECHAZADA: 'La rechazaste: no se te descuenta',
  EMERGENCIA: 'Reparación de emergencia: se descontó y se te avisó',
  ANULADA: 'La inmobiliaria la retiró',
};

function fecha(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

function Pendiente({
  aprobacion,
  onDecidida,
}: {
  aprobacion: AprobacionEnElPortal;
  onDecidida: () => void;
}) {
  const [enviando, setEnviando] = useState<'aprobar' | 'rechazar' | null>(null);
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState('');

  const decidir = async (accion: 'aprobar' | 'rechazar') => {
    if (enviando) return;
    setEnviando(accion);
    try {
      if (accion === 'aprobar') {
        await aprobacionesDeReparacionApi.aprobar(aprobacion.id);
        toast.success('Aprobaste la reparación', {
          description: `Se descuenta ${formatCurrency(aprobacion.valorCop)} de tu próxima liquidación sin pagar.`,
        });
      } else {
        await aprobacionesDeReparacionApi.rechazar(aprobacion.id, motivo);
        toast.success('Rechazaste la reparación', {
          description: 'No se te descuenta nada. Tu inmobiliaria decide qué sigue.',
        });
      }
      onDecidida();
    } catch (error) {
      toast.error('No se pudo guardar tu respuesta', {
        description: error instanceof Error ? error.message : undefined,
      });
      setEnviando(null);
    }
  };

  return (
    <Card className="p-5 space-y-3" data-testid="aprobacion-pendiente">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-fg-muted">
            {aprobacion.inmobiliaria} · {aprobacion.inmueble}
          </p>
          <h3 className="text-base font-semibold text-fg">{aprobacion.reparacion.titulo}</h3>
          {aprobacion.reparacion.descripcion && (
            <p className="text-sm text-fg-muted">{aprobacion.reparacion.descripcion}</p>
          )}
        </div>
        <p className="shrink-0 font-mono tabular-nums text-lg font-semibold text-fg">
          {formatCurrency(aprobacion.valorCop)}
        </p>
      </div>
      {aprobacion.cotizacion && (
        <p className="text-sm text-fg">
          Cotización de <strong>{aprobacion.cotizacion.proveedor}</strong>
          {aprobacion.cotizacion.diasEstimados ? ` · ${aprobacion.cotizacion.diasEstimados} día(s)` : ''}
          {aprobacion.cotizacion.descripcion ? ` — ${aprobacion.cotizacion.descripcion}` : ''}
        </p>
      )}
      <p className="text-xs text-fg-muted">
        Si la apruebas, el valor se descuenta de tu próxima liquidación sin pagar. Pedida el {fecha(aprobacion.pedidaAt)}.
      </p>
      {rechazando && (
        <textarea
          className="w-full rounded-md border border-border bg-surface p-2 text-sm text-fg"
          rows={2}
          placeholder="¿Por qué la rechazas? (opcional, lo lee tu inmobiliaria)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          data-testid="aprobacion-motivo"
        />
      )}
      <div className="flex flex-wrap gap-2">
        <Button hideArrow onClick={() => void decidir('aprobar')} disabled={enviando !== null} data-testid="aprobacion-aprobar">
          <CheckCircle className="h-4 w-4" />
          {enviando === 'aprobar' ? 'Aprobando…' : 'Aprobar'}
        </Button>
        {rechazando ? (
          <Button
            variant="outline"
            hideArrow
            onClick={() => void decidir('rechazar')}
            disabled={enviando !== null}
            data-testid="aprobacion-confirmar-rechazo"
          >
            <XCircle className="h-4 w-4" />
            {enviando === 'rechazar' ? 'Rechazando…' : 'Confirmar rechazo'}
          </Button>
        ) : (
          <Button variant="outline" hideArrow onClick={() => setRechazando(true)} data-testid="aprobacion-rechazar">
            <XCircle className="h-4 w-4" />
            Rechazar
          </Button>
        )}
      </div>
    </Card>
  );
}

function DelHistorial({ aprobacion }: { aprobacion: AprobacionEnElPortal }) {
  const abrirSoporte = async () => {
    try {
      const { url } = await aprobacionesDeReparacionApi.soporte(aprobacion.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error('No se pudo abrir el soporte', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };
  return (
    <li className="py-3 space-y-1" data-testid={`aprobacion-historial-${aprobacion.estado}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg">
            {aprobacion.reparacion.titulo} · {aprobacion.inmueble}
          </p>
          <p className="flex items-center gap-1 text-xs text-fg-muted">
            {aprobacion.estado === 'EMERGENCIA' ? (
              <Siren className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
            ) : aprobacion.estado === 'APROBADA' ? (
              <CheckCircle className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            ) : aprobacion.estado === 'RECHAZADA' ? (
              <XCircle className="h-3.5 w-3.5 text-danger" aria-hidden="true" />
            ) : (
              <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {ESTADO[aprobacion.estado]} {aprobacion.decididaAt ? `· ${fecha(aprobacion.decididaAt)}` : ''}
          </p>
        </div>
        <p className="shrink-0 font-mono tabular-nums text-sm text-fg">{formatCurrency(aprobacion.valorCop)}</p>
      </div>
      {aprobacion.estado === 'EMERGENCIA' && aprobacion.aviso && (
        <details className="text-xs text-fg-muted">
          <summary className="cursor-pointer text-fg">{aprobacion.aviso.asunto}</summary>
          <pre className="mt-2 whitespace-pre-wrap font-sans">{aprobacion.aviso.cuerpo}</pre>
          {aprobacion.soporteNombre && (
            <Button size="sm" variant="outline" hideArrow className="mt-2" onClick={() => void abrirSoporte()}>
              Ver el soporte ({aprobacion.soporteNombre})
            </Button>
          )}
        </details>
      )}
    </li>
  );
}

export default function AprobarReparacionesPage() {
  const [datos, setDatos] = useState<{ pendientes: AprobacionEnElPortal[]; historial: AprobacionEnElPortal[] } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setDatos(await aprobacionesDeReparacionApi.delPortal());
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <PageHeader
          title="Aprobar reparaciones"
          subtitle="Las reparaciones a tu cargo las apruebas tú. Nada se te descuenta sin tu aprobación, salvo una emergencia, que se te avisa el mismo día."
        />
        <EstadoDeDatos
          cargando={cargando}
          error={error}
          queEs="tus reparaciones por aprobar"
          onReintentar={cargar}
          vacio={!datos || (datos.pendientes.length === 0 && datos.historial.length === 0)}
          cuandoVacio={
            <Card className="p-6">
              <p className="text-sm text-fg-muted" data-testid="aprobaciones-vacio">
                No tienes reparaciones por aprobar. Cuando tu inmobiliaria necesite tu aprobación para descontarte una
                reparación, va a aparecer acá.
              </p>
            </Card>
          }
        >
          {datos && datos.pendientes.length > 0 && (
            <section className="space-y-3" aria-label="Por aprobar">
              <h2 className="text-sm font-semibold text-fg">Por aprobar</h2>
              {datos.pendientes.map((a) => (
                <Pendiente key={a.id} aprobacion={a} onDecidida={() => void cargar()} />
              ))}
            </section>
          )}
          {datos && datos.historial.length > 0 && (
            <section aria-label="Historial">
              <h2 className="text-sm font-semibold text-fg">Historial</h2>
              <ul className="divide-y divide-border">
                {datos.historial.map((a) => (
                  <DelHistorial key={a.id} aprobacion={a} />
                ))}
              </ul>
            </section>
          )}
        </EstadoDeDatos>
      </div>
    </div>
  );
}
