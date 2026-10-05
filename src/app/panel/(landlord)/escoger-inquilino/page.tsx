'use client';

/**
 * 🔴 #14 «El propietario escoge» — «Escoger inquilino», en el portal del
 * PROPIETARIO (MANOS-1, 04-10-2026).
 *
 * QA-PILOTO (04-10): el propietario escogía «por fuera», por teléfono con el
 * asesor. Ahora Avali (el agente de aprobaciones del Piloto) le pide escoger
 * cuando su inmueble tiene candidatos, con aviso en la campana y por correo, y
 * se lo recuerda. Aquí ve a cada candidato —de qué vive, cuánto gana según lo
 * que declaró, cuántas personas tiene a cargo y si tiene estudio de
 * arrendamiento (es opcional)— y escoge uno, o dice que ninguno le sirve. Nunca
 * ve un puntaje ni datos de contacto (F-07).
 *
 * Escoger no adjudica: la inmobiliaria lo hace con un clic (le avisa a los
 * demás candidatos y arranca el contrato). El back resuelve quién es por la
 * sesión (`GET /portal/elecciones-de-inquilino`).
 */

import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Presence } from '@leasefy/cadence';
import { CheckCircle, UserCircle, XCircle, Hourglass } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import {
  eleccionesDeInquilinoApi,
  type EleccionEnElPortal,
  type CandidatoParaElPropietario,
} from '@/lib/api/elecciones-de-inquilino.service';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';

/** `NingunCandidatoDto.motivo`: `@MinLength(5) @MaxLength(1000)` en el back. */
const MAX_LARGO_DEL_MOTIVO = 1000;

const ESTADO: Record<EleccionEnElPortal['estado'], string> = {
  PENDIENTE: 'Esperando que escojas',
  ESCOGIDA: 'Ya escogiste: tu inmobiliaria lo adjudica',
  NINGUNO: 'Nos dijiste que ninguno te sirve',
  ADJUDICADA: 'Adjudicado: tu inmobiliaria arranca el contrato',
  ANULADA: 'Ya no está esperando tu respuesta',
};

function fecha(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

function Candidato({
  c,
  onEscoger,
  enviando,
}: {
  c: CandidatoParaElPropietario;
  onEscoger: () => void;
  enviando: boolean;
}) {
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between" data-testid="candidato">
      <div className="min-w-0 space-y-0.5">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
          <UserCircle className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
          {c.nombre}
        </p>
        {c.deQueVive && <p className="text-sm text-fg">{c.deQueVive}</p>}
        <p className="text-xs text-fg-muted">
          {c.ingresosCop !== null ? `Declara ganar ${formatCurrency(c.ingresosCop)} al mes` : 'No declaró sus ingresos'}
          {c.personasACargo === null
            ? ''
            : c.personasACargo === 0
              ? ' · Sin personas a cargo'
              : ` · ${c.personasACargo === 1 ? '1 persona a cargo' : `${c.personasACargo} personas a cargo`}`}
        </p>
        <p className="text-xs text-fg-muted">{c.estudio}</p>
      </div>
      <Button
        size="sm"
        hideArrow
        onClick={onEscoger}
        disabled={enviando}
        className="shrink-0 self-start"
        data-testid={`escoger-${c.applicationId}`}
      >
        <CheckCircle className="h-4 w-4" />
        Escoger
      </Button>
    </li>
  );
}

function Pendiente({ eleccion, onDecidida }: { eleccion: EleccionEnElPortal; onDecidida: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const [diciendoNinguno, setDiciendoNinguno] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [errorDelMotivo, setErrorDelMotivo] = useState<string | null>(null);

  const escoger = async (c: CandidatoParaElPropietario) => {
    if (enviando) return;
    setEnviando(true);
    try {
      await eleccionesDeInquilinoApi.escoger(eleccion.id, c.applicationId);
      toast.success(`Escogiste a ${c.nombre}`, {
        description: `${eleccion.inmobiliaria} ya lo sabe y le adjudica tu inmueble. A los demás candidatos les avisan.`,
      });
      onDecidida();
    } catch (error) {
      const reparto = repartirErroresDelServidor<'applicationId'>(error, {
        campos: ['applicationId'],
        accion: 'guardar a quién escogiste',
        porDefecto: 'Prueba de nuevo en un momento.',
      });
      toast.error('No se pudo guardar tu elección', {
        description: [...Object.values(reparto.porCampo), ...reparto.sueltos].filter(Boolean).join(' · '),
      });
      setEnviando(false);
    }
  };

  const ninguno = async () => {
    if (enviando) return;
    if (motivo.trim().length < 5) {
      setErrorDelMotivo('Cuéntanos en una frase por qué no te sirve ninguno.');
      return;
    }
    setEnviando(true);
    try {
      await eleccionesDeInquilinoApi.ninguno(eleccion.id, motivo);
      toast.success('Le dijimos a tu inmobiliaria que ninguno te sirve', {
        description: 'Ella sigue buscando y te avisa cuando haya candidatos nuevos.',
      });
      onDecidida();
    } catch (error) {
      const reparto = repartirErroresDelServidor<'motivo'>(error, {
        campos: ['motivo'],
        accion: 'guardar tu respuesta',
        porDefecto: 'Prueba de nuevo en un momento.',
      });
      setErrorDelMotivo(reparto.porCampo.motivo ?? null);
      if (reparto.sueltos.length > 0) {
        toast.error('No se pudo guardar tu respuesta', { description: reparto.sueltos.join(' · ') });
      }
      setEnviando(false);
    }
  };

  return (
    <Card className="space-y-3 p-5" data-testid="eleccion-pendiente">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-fg-muted">{eleccion.inmobiliaria}</p>
          <h3 className="text-base font-semibold text-fg">{eleccion.inmueble}</h3>
        </div>
        {eleccion.canonCop !== null && (
          <p className="shrink-0 font-mono text-sm tabular-nums text-fg">Canon {formatCurrency(eleccion.canonCop)}</p>
        )}
      </div>
      {eleccion.candidatos.length === 0 ? (
        <p className="text-sm text-fg-muted">Ya no quedan candidatos para escoger: tu inmobiliaria te avisa cuando lleguen otros.</p>
      ) : (
        <ul className="divide-y divide-border" aria-label="Candidatos">
          {eleccion.candidatos.map((c) => (
            <Candidato key={c.applicationId} c={c} enviando={enviando} onEscoger={() => void escoger(c)} />
          ))}
        </ul>
      )}
      <p className="text-xs text-fg-muted">
        Al escoger, tu inmobiliaria adjudica el inmueble y les avisa a los demás. Te lo pidió el {fecha(eleccion.pedidaAt)}.
      </p>
      {!diciendoNinguno && (
        <Button variant="outline" hideArrow onClick={() => setDiciendoNinguno(true)} data-testid="eleccion-ninguno">
          <XCircle className="h-4 w-4" />
          Ninguno me sirve
        </Button>
      )}
      <Presence show={diciendoNinguno} initial={false}>
        <div className="space-y-2">
          <textarea
            id={`motivo-${eleccion.id}`}
            className="w-full rounded-md border border-border bg-surface p-2 text-sm text-fg"
            rows={2}
            maxLength={MAX_LARGO_DEL_MOTIVO}
            placeholder="¿Por qué no te sirve ninguno? (lo lee tu inmobiliaria)"
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setErrorDelMotivo(null);
            }}
            aria-invalid={errorDelMotivo ? true : undefined}
            aria-describedby={errorDelMotivo ? `motivo-${eleccion.id}-error` : undefined}
            data-testid="eleccion-motivo"
          />
          <ErrorDelCampo id={`motivo-${eleccion.id}-error`} mensaje={errorDelMotivo} />
          <Button variant="outline" hideArrow onClick={() => void ninguno()} disabled={enviando} data-testid="eleccion-confirmar-ninguno">
            <XCircle className="h-4 w-4" />
            {enviando ? 'Enviando…' : 'Confirmar: ninguno me sirve'}
          </Button>
        </div>
      </Presence>
    </Card>
  );
}

function DelHistorial({ eleccion }: { eleccion: EleccionEnElPortal }) {
  return (
    <li className="space-y-0.5 py-3" data-testid={`eleccion-historial-${eleccion.estado}`}>
      <p className="text-sm font-medium text-fg">{eleccion.inmueble}</p>
      <p className="flex items-center gap-1 text-xs text-fg-muted">
        {eleccion.estado === 'NINGUNO' || eleccion.estado === 'ANULADA' ? (
          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
        ) : eleccion.estado === 'PENDIENTE' ? (
          <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <CheckCircle className="h-3.5 w-3.5 text-success" aria-hidden="true" />
        )}
        {ESTADO[eleccion.estado]}
        {eleccion.escogido ? ` · ${eleccion.escogido}` : ''}
        {eleccion.decididaAt ? ` · ${fecha(eleccion.decididaAt)}` : ''}
      </p>
      {eleccion.motivo && <p className="text-xs text-fg-muted">«{eleccion.motivo}»</p>}
    </li>
  );
}

export default function EscogerInquilinoPage() {
  const [datos, setDatos] = useState<{ pendientes: EleccionEnElPortal[]; historial: EleccionEnElPortal[] } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setDatos(await eleccionesDeInquilinoApi.delPortal());
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
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <PageHeader
          title="Escoger inquilino"
          subtitle="Cuando tu inmueble tiene candidatos, tú escoges quién lo arrienda. Tu inmobiliaria lo adjudica y les avisa a los demás."
        />
        <EstadoDeDatos
          cargando={cargando}
          error={error}
          queEs="tus candidatos"
          onReintentar={cargar}
          vacio={!datos || (datos.pendientes.length === 0 && datos.historial.length === 0)}
          cuandoVacio={
            <Card className="p-6">
              <p className="text-sm text-fg-muted" data-testid="elecciones-vacio">
                No tienes candidatos por escoger. Cuando tu inmueble tenga candidatos, tu inmobiliaria te avisa y van a
                aparecer aquí.
              </p>
            </Card>
          }
        >
          {datos && datos.pendientes.length > 0 && (
            <section className="space-y-3" aria-label="Por escoger">
              <h2 className="text-sm font-semibold text-fg">Por escoger</h2>
              {datos.pendientes.map((e) => (
                <Pendiente key={e.id} eleccion={e} onDecidida={() => void cargar()} />
              ))}
            </section>
          )}
          {datos && datos.historial.length > 0 && (
            <section aria-label="Historial">
              <h2 className="text-sm font-semibold text-fg">Historial</h2>
              <ul className="divide-y divide-border">
                {datos.historial.map((e) => (
                  <DelHistorial key={e.id} eleccion={e} />
                ))}
              </ul>
            </section>
          )}
        </EstadoDeDatos>
      </div>
    </div>
  );
}
