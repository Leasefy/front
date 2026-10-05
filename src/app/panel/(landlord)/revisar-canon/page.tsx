'use client';

/**
 * «Revisar el canon», en el portal del PROPIETARIO (MANOS-2, 04-10-2026).
 *
 * Nico (04-10, noche): «de verdad sí cumpla toda la promesa». Cuando un
 * inmueble lleva más de un mes desocupado, el Piloto de la inmobiliaria le
 * cuenta al propietario —en la campana y por correo— cuánto le ha costado la
 * vacancia y le pregunta si quiere revisar el canon. Aquí ve la cuenta y
 * decide: mantenerlo, escribir otro valor (ve mientras escribe lo que deja de
 * recibir en el año y a cuántos meses vacío equivale) o pedir un avalúo antes.
 *
 * 🔴 D-PV-02 (RealPage): nadie le propone un precio. El número lo pone él; la
 * inmobiliaria lo aplica con un clic (P-4). El back resuelve quién es por la
 * sesión (`GET /portal/revisiones-del-canon`).
 */

import { useCallback, useEffect, useId, useState } from 'react';
import { PageHeader, Presence } from '@leasefy/cadence';
import { CheckCircle, Hourglass, Tag, XCircle, FileMagnifyingGlass } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { MoneyInputNumerico } from '@/components/ui/money-input';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import {
  revisionesDelCanonApi,
  type DecisionDelPropietario,
  type RevisionDelCanonEnElPortal,
} from '@/lib/api/revisiones-del-canon.service';
import { loQueCuestaElCanonPedido, mesesEnPalabras } from '@/lib/precio/vacancia-y-canon';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { ApiError } from '@/lib/api/client';

/** `ResponderRevisionDelCanonDto.comentario`: `@MaxLength(500)` en el back. */
const MAX_LARGO_DEL_COMENTARIO = 500;

const ESTADO: Record<RevisionDelCanonEnElPortal['estado'], string> = {
  PENDIENTE: 'Esperando tu respuesta',
  MANTENER: 'Decidiste mantener el canon',
  BAJAR: 'Pediste otro canon: tu inmobiliaria lo aplica',
  AVALUO: 'Pediste un avalúo antes de decidir',
  APLICADA: 'Tu inmobiliaria aplicó el canon que pediste',
  ANULADA: 'Ya no está esperando tu respuesta',
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** «21 de agosto de 2026» de un `AAAA-MM-DD` o un ISO (sin correr el día por la zona). */
function fecha(valor: string | null): string {
  if (!valor) return '';
  const [a, m, d] = valor.slice(0, 10).split('-').map(Number);
  if (!a || !m || !d) return '';
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

function Pendiente({ r, onRespondida }: { r: RevisionDelCanonEnElPortal; onRespondida: () => void }) {
  const idBase = useId();
  const [enviando, setEnviando] = useState(false);
  const [escribiendo, setEscribiendo] = useState(false);
  const [canon, setCanon] = useState<number | undefined>(undefined);
  const [comentario, setComentario] = useState('');
  const [errorDelCanon, setErrorDelCanon] = useState<string | null>(null);
  const cuenta = canon !== undefined ? loQueCuestaElCanonPedido(r.canonActualCop, canon) : null;

  const responder = async (decision: DecisionDelPropietario) => {
    if (enviando) return;
    if (decision === 'BAJAR') {
      if (canon === undefined || !(canon > 0)) {
        setErrorDelCanon('Escribe el canon que quieres (en pesos, al mes).');
        return;
      }
      if (canon >= r.canonActualCop) {
        setErrorDelCanon(`Para dejarlo igual o subirlo escoge «Mantener el canon»: hoy es ${formatCurrency(r.canonActualCop)}.`);
        return;
      }
    }
    setEnviando(true);
    try {
      await revisionesDelCanonApi.responder(r.id, {
        decision,
        ...(decision === 'BAJAR' ? { canonPedidoCop: canon } : {}),
        comentario,
      });
      toast.success(
        decision === 'BAJAR'
          ? `Le pediste a ${r.inmobiliaria} un canon de ${formatCurrency(canon!)}`
          : decision === 'AVALUO'
            ? `Le pediste a ${r.inmobiliaria} un avalúo`
            : 'Mantienes el canon',
        {
          description:
            decision === 'BAJAR'
              ? 'Tu inmobiliaria lo aplica y te avisa cuando quede publicado.'
              : decision === 'AVALUO'
                ? 'Tu inmobiliaria lo pide y te cuenta. El avalúo tiene un costo.'
                : 'Tu inmobiliaria ya lo sabe.',
        },
      );
      onRespondida();
    } catch (error) {
      const reparto = repartirErroresDelServidor<'canonPedidoCop'>(error, {
        campos: ['canonPedidoCop'],
        accion: 'guardar tu respuesta',
        porDefecto: 'Prueba de nuevo en un momento.',
      });
      setErrorDelCanon(reparto.porCampo.canonPedidoCop ?? null);
      if (reparto.sueltos.length > 0) toast.error('No se pudo guardar tu respuesta', { description: reparto.sueltos.join(' · ') });
      setEnviando(false);
    }
  };

  return (
    <Card className="space-y-4 p-5" data-testid="revision-pendiente">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-fg-muted">{r.inmobiliaria}</p>
          <h3 className="text-base font-semibold text-fg">{r.inmueble}</h3>
        </div>
        <p className="shrink-0 font-mono text-sm tabular-nums text-fg">Canon {formatCurrency(r.canonActualCop)}</p>
      </div>
      <div className="rounded-md border border-border bg-surface-muted p-3 text-sm text-fg" data-testid="revision-cuenta">
        <p>
          Tu inmueble lleva <strong>{r.diasVacante} días</strong> desocupado
          {r.vacanteDesde ? ` (desde el ${fecha(r.vacanteDesde)})` : ''}. Cada mes vacío son{' '}
          <strong className="tabular-nums">{formatCurrency(r.canonActualCop)}</strong> que no recibes: van{' '}
          <strong className="tabular-nums">{formatCurrency(r.costoDeLaVacanciaCop)}</strong>.
        </p>
        <ul className="mt-2 grid gap-1 sm:grid-cols-3" aria-label="Si sigue vacío">
          {r.siSigueVacio.map((s) => (
            <li key={s.meses} className="text-xs text-fg-muted">
              Si sigue vacío {mesesEnPalabras(s.meses)} más:{' '}
              <span className="font-mono tabular-nums text-fg">{formatCurrency(s.cuestaCop)}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-fg-muted">
        Tú decides: tu inmobiliaria no te propone un precio. Si escribes otro canon, ves lo que dejarías de recibir en el año.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button hideArrow variant="outline" onClick={() => void responder('MANTENER')} disabled={enviando} data-testid="revision-mantener">
          <CheckCircle className="h-4 w-4" />
          Mantener el canon
        </Button>
        {!escribiendo && (
          <Button hideArrow variant="outline" onClick={() => setEscribiendo(true)} disabled={enviando} data-testid="revision-otro">
            <Tag className="h-4 w-4" />
            Quiero otro canon
          </Button>
        )}
        <Button hideArrow variant="outline" onClick={() => void responder('AVALUO')} disabled={enviando} data-testid="revision-avaluo">
          <FileMagnifyingGlass className="h-4 w-4" />
          Quiero un avalúo antes
        </Button>
      </div>
      <Presence show={escribiendo} initial={false}>
        <div className="space-y-2" data-testid="revision-escribir">
          <label className="block space-y-1" htmlFor={`${idBase}-canon`}>
            <span className="block text-sm font-medium text-fg">El canon que quieres, al mes</span>
            <MoneyInputNumerico
              id={`${idBase}-canon`}
              value={canon}
              onChange={(v) => {
                setCanon(Number.isNaN(v) ? undefined : v);
                setErrorDelCanon(null);
              }}
              className="w-full sm:w-56"
              aria-invalid={errorDelCanon ? true : undefined}
              aria-describedby={errorDelCanon ? `${idBase}-canon-error` : undefined}
              data-testid="revision-canon"
            />
          </label>
          <ErrorDelCampo id={`${idBase}-canon-error`} mensaje={errorDelCanon} />
          {cuenta && (
            <p className="text-sm text-fg" data-testid="revision-lo-que-cuesta">
              Con {formatCurrency(canon!)} dejarías de recibir{' '}
              <strong className="tabular-nums">{formatCurrency(cuenta.dejaDeRecibirCop)}</strong> en un año de contrato: es lo mismo que{' '}
              {mesesEnPalabras(cuenta.equivaleAMesesVacio)} vacío.
            </p>
          )}
          <textarea
            className="w-full rounded-md border border-border bg-surface p-2 text-sm text-fg"
            rows={2}
            maxLength={MAX_LARGO_DEL_COMENTARIO}
            placeholder="Un comentario para tu inmobiliaria (opcional)"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            data-testid="revision-comentario"
          />
          <Button hideArrow onClick={() => void responder('BAJAR')} disabled={enviando} data-testid="revision-enviar-canon">
            <Tag className="h-4 w-4" />
            {enviando ? 'Enviando…' : 'Pedir este canon'}
          </Button>
        </div>
      </Presence>
      <p className="text-xs text-fg-muted">Te lo preguntaron el {fecha(r.preguntadaAt)}.</p>
    </Card>
  );
}

function DelHistorial({ r }: { r: RevisionDelCanonEnElPortal }) {
  return (
    <li className="space-y-0.5 py-3" data-testid={`revision-historial-${r.estado}`}>
      <p className="text-sm font-medium text-fg">{r.inmueble}</p>
      <p className="flex items-center gap-1 text-xs text-fg-muted">
        {r.estado === 'ANULADA' ? (
          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
        ) : r.estado === 'BAJAR' || r.estado === 'AVALUO' ? (
          <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <CheckCircle className="h-3.5 w-3.5 text-success" aria-hidden="true" />
        )}
        {ESTADO[r.estado]}
        {r.canonPedidoCop !== null ? ` · ${formatCurrency(r.canonPedidoCop)}` : ''}
        {r.respondidaAt ? ` · ${fecha(r.respondidaAt)}` : ''}
      </p>
      {r.comentario && <p className="text-xs text-fg-muted">«{r.comentario}»</p>}
    </li>
  );
}

export default function RevisarCanonPage() {
  const [datos, setDatos] = useState<{ pendientes: RevisionDelCanonEnElPortal[]; historial: RevisionDelCanonEnElPortal[] } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [cargando, setCargando] = useState(true);
  // Sin la tabla de las revisiones (migración de MANOS-2 sin aplicar) no hay nada que revisar:
  // se dice con calma, no como una falla (no es algo que el propietario pueda arreglar).
  const [noDisponible, setNoDisponible] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setDatos(await revisionesDelCanonApi.delPortal());
      setError(null);
      setNoDisponible(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 503 && e.code === 'FALTA_UNA_MIGRACION') {
        setDatos({ pendientes: [], historial: [] });
        setError(null);
        setNoDisponible(true);
      } else setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <PageHeader
          title="Revisar el canon"
          subtitle="Cuando tu inmueble lleva más de un mes desocupado, tu inmobiliaria te cuenta lo que te ha costado y te pregunta si quieres revisar el canon. Tú decides."
        />
        <EstadoDeDatos
          cargando={cargando}
          error={error}
          queEs="tus inmuebles desocupados"
          onReintentar={cargar}
          vacio={!datos || (datos.pendientes.length === 0 && datos.historial.length === 0)}
          cuandoVacio={
            <Card className="p-6">
              {noDisponible ? (
                <p className="text-sm text-fg-muted" data-testid="revisiones-no-disponible">
                  Revisar el canon desde aquí todavía no está disponible. Si un inmueble tuyo lleva tiempo desocupado, tu
                  inmobiliaria te puede contar cómo va.
                </p>
              ) : (
                <p className="text-sm text-fg-muted" data-testid="revisiones-vacio">
                  No tienes nada por revisar. Si un inmueble tuyo lleva más de un mes desocupado, tu inmobiliaria te avisa y va a
                  aparecer aquí.
                </p>
              )}
            </Card>
          }
        >
          {datos && datos.pendientes.length > 0 && (
            <section className="space-y-3" aria-label="Por responder">
              <h2 className="text-sm font-semibold text-fg">Por responder</h2>
              {datos.pendientes.map((r) => (
                <Pendiente key={r.id} r={r} onRespondida={() => void cargar()} />
              ))}
            </section>
          )}
          {datos && datos.historial.length > 0 && (
            <section aria-label="Historial">
              <h2 className="text-sm font-semibold text-fg">Historial</h2>
              <ul className="divide-y divide-border">
                {datos.historial.map((r) => (
                  <DelHistorial key={r.id} r={r} />
                ))}
              </ul>
            </section>
          )}
        </EstadoDeDatos>
      </div>
    </div>
  );
}
