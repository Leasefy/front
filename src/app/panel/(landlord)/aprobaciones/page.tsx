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
import { CheckCircle, XCircle, Siren, Hourglass, Wrench } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { aprobacionesDeReparacionApi } from '@/lib/api/aprobaciones-de-reparacion.service';
import type { AprobacionEnElPortal, ReparacionQueHagoYo } from '@/lib/types/deducciones';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { SobrecostosPorAprobar } from '@/components/landlord/portal/SobrecostosPorAprobar';
import { HistorialDeReparaciones } from '@/components/landlord/portal/HistorialDeReparaciones';
import { LasQueHagoYo } from '@/components/landlord/portal/LasQueHagoYo';
import { TerminacionesPorDecidir } from '@/components/landlord/portal/TerminacionesPorDecidir';

/** `RechazarAprobacionDto.motivo`: `@MaxLength(2000)` en el back. */
const MAX_LARGO_DEL_MOTIVO = 2000;

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
  const [enviando, setEnviando] = useState<'aprobar' | 'rechazar' | 'la-hago-yo' | null>(null);
  const [rechazando, setRechazando] = useState(false);
  // Portofino 22-10: «La hago yo» (en vez de aprobar o rechazar).
  const [laHagoYo, setLaHagoYo] = useState(false);
  const [notaDeLaHagoYo, setNotaDeLaHagoYo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [errorDelMotivo, setErrorDelMotivo] = useState<string | null>(null);

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
      // 02-10-2026: el motivo que el back rechaza va bajo el motivo; lo demás,
      // con la regla de oro del traductor (antes, `error.message` crudo).
      const reparto = repartirErroresDelServidor<'motivo'>(error, {
        campos: ['motivo'],
        accion: accion === 'aprobar' ? 'guardar tu aprobación' : 'guardar tu rechazo',
        porDefecto: 'Prueba de nuevo en un momento.',
      });
      setErrorDelMotivo(reparto.porCampo.motivo ?? null);
      if (reparto.sueltos.length > 0) {
        toast.error('No se pudo guardar tu respuesta', { description: reparto.sueltos.join(' · ') });
      }
      setEnviando(null);
    }
  };

  const hacerlaYo = async () => {
    if (enviando) return;
    setEnviando('la-hago-yo');
    try {
      await aprobacionesDeReparacionApi.laHagoYo(aprobacion.id, notaDeLaHagoYo);
      toast.success('Listo: la haces tú', {
        description: 'No se te descuenta nada. Cuando quede, avísale a tu inmobiliaria con «Ya quedó».',
      });
      onDecidida();
    } catch (error) {
      toast.error('No se pudo guardar tu respuesta', {
        description: mensajeParaLaPersona(error, { accion: 'guardar que la haces tú' }),
      });
      setEnviando(null);
    }
  };
  // Alta y Emergencia (o lo que configure la inmobiliaria) no dan espera.
  const soloLaInmobiliaria =
    !aprobacion.puedeHacerlaElPropietario &&
    (aprobacion.prioridad === 'HIGH' || aprobacion.prioridad === 'EMERGENCY');

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
          {aprobacion.cotizacion.diasEstimados
            ? ` · ${aprobacion.cotizacion.diasEstimados} ${aprobacion.cotizacion.diasEstimados === 1 ? 'día' : 'días'}`
            : ''}
          {aprobacion.cotizacion.descripcion ? ` — ${aprobacion.cotizacion.descripcion}` : ''}
        </p>
      )}
      <p className="text-xs text-fg-muted">
        Si la apruebas, el valor se descuenta de tu próxima liquidación sin pagar. Pedida el {fecha(aprobacion.pedidaAt)}.
      </p>
      {rechazando && (
        <div>
          <textarea
            id={`motivo-${aprobacion.id}`}
            className="w-full rounded-md border border-border bg-surface p-2 text-sm text-fg"
            rows={2}
            maxLength={MAX_LARGO_DEL_MOTIVO}
            placeholder="¿Por qué la rechazas? (opcional, lo lee tu inmobiliaria)"
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setErrorDelMotivo(null);
            }}
            aria-invalid={errorDelMotivo ? true : undefined}
            aria-describedby={errorDelMotivo ? `motivo-${aprobacion.id}-error` : undefined}
            data-testid="aprobacion-motivo"
          />
          <ErrorDelCampo id={`motivo-${aprobacion.id}-error`} mensaje={errorDelMotivo} />
        </div>
      )}
      <Presence show={laHagoYo} direction="down" className="space-y-1.5">
        <p className="text-sm text-fg">
          La haces tú, por tu cuenta (con tu plomero o tú mismo): no se te descuenta nada y tu inmobiliaria no manda a nadie.
          Cuando quede, le avisas con «Ya quedó».
        </p>
        <textarea
          id={`la-hago-yo-${aprobacion.id}`}
          className="w-full rounded-md border border-border bg-surface p-2 text-sm text-fg"
          rows={2}
          maxLength={500}
          placeholder="¿Quién la va a hacer? (opcional, lo lee tu inmobiliaria)"
          value={notaDeLaHagoYo}
          onChange={(e) => setNotaDeLaHagoYo(e.target.value)}
          data-testid="la-hago-yo-nota"
        />
      </Presence>
      {soloLaInmobiliaria && (
        <p className="text-xs text-fg-muted" data-testid="la-hace-la-inmobiliaria">
          Es de prioridad {aprobacion.prioridad === 'EMERGENCY' ? 'Emergencia' : 'Alta'}: la hace tu inmobiliaria, no da
          espera.
        </p>
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
        {aprobacion.puedeHacerlaElPropietario &&
          (laHagoYo ? (
            <Button
              variant="outline"
              hideArrow
              onClick={() => void hacerlaYo()}
              disabled={enviando !== null}
              data-testid="la-hago-yo-confirmar"
            >
              <Wrench className="h-4 w-4" />
              {enviando === 'la-hago-yo' ? 'Guardando…' : 'Confirmar: la hago yo'}
            </Button>
          ) : (
            <Button
              variant="outline"
              hideArrow
              onClick={() => {
                setLaHagoYo(true);
                setRechazando(false);
              }}
              data-testid="la-hago-yo"
            >
              <Wrench className="h-4 w-4" />
              La hago yo
            </Button>
          ))}
      </div>
    </Card>
  );
}

export default function AprobarReparacionesPage() {
  const [datos, setDatos] = useState<{ pendientes: AprobacionEnElPortal[]; historial: AprobacionEnElPortal[] } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [cargando, setCargando] = useState(true);
  const [recarga, setRecarga] = useState(0);
  // Portofino 22-10: las que hace él por su cuenta. Un back sin la ruta: ninguna.
  const [queHagoYo, setQueHagoYo] = useState<ReparacionQueHagoYo[]>([]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [delPortal, mias] = await Promise.all([
        aprobacionesDeReparacionApi.delPortal(),
        aprobacionesDeReparacionApi.lasQueHagoYo().catch(() => [] as ReparacionQueHagoYo[]),
      ]);
      setQueHagoYo(Array.isArray(mias) ? mias : []);
      setDatos(delPortal);
      setRecarga((n) => n + 1);
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
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1">
          <h1 className="text-h2 text-fg">Aprobar reparaciones</h1>
          <p className="max-w-2xl text-sm text-fg-muted">Las reparaciones a tu cargo las apruebas tú, o las haces tú mismo si no son urgentes. Nada se te descuenta sin tu aprobación, salvo una emergencia, que se te avisa el mismo día.</p>
        </header>
        <EstadoDeDatos
          cargando={cargando}
          error={error}
          queEs="tus reparaciones por aprobar"
          onReintentar={cargar}
          vacio={
            !datos || (datos.pendientes.length === 0 && datos.historial.length === 0 && queHagoYo.length === 0)
          }
          cuandoVacio={
            <Card className="p-6">
              <p className="text-sm text-fg-muted" data-testid="aprobaciones-vacio">
                No tienes reparaciones por aprobar. Cuando tu inmobiliaria necesite tu aprobación para descontarte una
                reparación, va a aparecer acá.
              </p>
            </Card>
          }
        >
          {/* Nico, 11-10: el costo final que pasa lo aprobado vuelve a pedirte aprobación. */}
          <SobrecostosPorAprobar alCambiar={() => void cargar()} />
          {datos && datos.pendientes.length > 0 && (
            <section className="space-y-3" aria-label="Por aprobar">
              <h2 className="text-sm font-semibold text-fg">Por aprobar</h2>
              {datos.pendientes.map((a) => (
                <Pendiente key={a.id} aprobacion={a} onDecidida={() => void cargar()} />
              ))}
            </section>
          )}
          {/* Portofino 22-10: las terminaciones que la inmobiliaria le pide decidir. */}
          <TerminacionesPorDecidir />
          {/* Portofino 22-10: las que hace él por su cuenta, con «Ya quedó». */}
          <LasQueHagoYo reparaciones={queHagoYo} onCambio={() => void cargar()} />
          {/* Nico, 12-10: el historial en una tabla con paginación y el detalle completo en un cajón. */}
          {datos && datos.historial.length > 0 && <HistorialDeReparaciones recarga={recarga} />}
        </EstadoDeDatos>
      </div>
    </div>
  );
}
