'use client';

/**
 * Las piezas que comparten las pantallas de nómina.
 *
 * ── 🔴 Tres formas de «no se puede», y cada una manda a otra persona ────────
 *
 *   · **el módulo no está comprado** (402) → no es un error: es un producto. La
 *     pantalla lo dice así y no ofrece reintentar, porque reintentar no lo
 *     compra. Quien lo prende es Leasefy.
 *   · **falta una migración** (503) → la aplica Víctor.
 *   · **faltan las cifras del año** (422) → las carga la inmobiliaria, y la
 *     pantalla dice CUÁLES y qué documento buscar.
 *
 * Mostrar las tres igual —«algo salió mal, intenta de nuevo»— hace que la
 * persona equivocada pierda una hora buscando el problema equivocado.
 *
 * ── Y una regla de presentación ────────────────────────────────────────────
 *
 * Todo lo que un contador tiene que validar sale MARCADO y con el motivo
 * escrito, arriba y sin esconderse detrás de un «ver más». Una nómina que calla
 * lo que no sabe se paga igual, y el error aparece tres meses después.
 */

import type { ReactNode } from 'react';
import {
  Info,
  Lock,
  Warning,
  WarningOctagon,
} from '@phosphor-icons/react';

import { SIN_MEDIR } from '@/lib/tasas';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { cn } from '@/lib/utils';

// ── El cartel del módulo no habilitado ──────────────────────────────────────

/**
 * 🔴 No es un error y no ofrece reintentar.
 *
 * Con el flag apagado la fila no aparece en el menú, así que llegar acá es haber
 * escrito la URL a mano (o tener el enlace de antes de que se apagara). El
 * cartel dice qué es el módulo y a quién pedirlo, no «no tienes permiso».
 */
export function ModuloNoHabilitado({
  testId = 'nomina-no-habilitada',
}: {
  testId?: string;
}) {
  return (
    <div
      className="mx-auto max-w-2xl space-y-4 rounded-lg border border-border bg-surface p-8 text-sm text-fg"
      data-testid={testId}
      role="status"
    >
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-6 w-6 shrink-0 text-fg-muted" aria-hidden="true" />
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-fg">
            Nómina no está habilitada para tu inmobiliaria
          </h2>
          <p className="text-fg-muted">
            Es un módulo aparte, que se contrata. Liquida empleados con contrato
            laboral, asesores por comisiones, contratistas de prestación de
            servicios y aprendices; hace la nómina quincenal o mensual, provisiona
            las prestaciones sociales mes a mes, calcula los aportes de seguridad
            social y manda la nómina electrónica a la DIAN.
          </p>
          <p className="text-fg-muted">
            Lo activa Leasefy cuando lo contratas. Escríbenos y te lo prendemos.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── El cartel de la migración que falta ─────────────────────────────────────

export function SinLaMigracion({
  motivo,
  queSeEspera,
  testId = 'nomina-sin-migracion',
}: {
  motivo: string | null;
  /** Qué va a poder hacerse cuando esté: «liquidar la nómina». */
  queSeEspera: string;
  testId?: string;
}) {
  return (
    <div
      className="flex gap-3 rounded-lg border border-border bg-surface p-5 text-sm text-fg"
      data-testid={testId}
      role="status"
    >
      <WarningOctagon
        className="mt-0.5 h-5 w-5 shrink-0 text-warning"
        aria-hidden="true"
      />
      <div className="space-y-1.5">
        <p className="font-medium">Todavía no se puede {queSeEspera}.</p>
        <p className="text-fg-muted">
          {motivo ?? 'Falta la migración de esta pieza en la base de datos.'}
        </p>
        <p className="text-fg-muted">
          La aplica Víctor. Hasta entonces esta pantalla te muestra lo que ya se
          puede leer y no guarda nada — no se pierde trabajo, simplemente todavía
          no hay dónde escribirlo.
        </p>
      </div>
    </div>
  );
}

// ── El cartel de las cifras del año que faltan ──────────────────────────────

/**
 * 🔴 El que más importa: sin el salario mínimo, el auxilio de transporte y la
 * UVT del año NO se puede liquidar, y Leasefy no los inventa.
 */
export function FaltanLasCifrasDelAnio({
  anio,
  queFalta,
  referencia,
  href = '/panel/inmobiliaria/nomina/configuracion',
  testId = 'nomina-faltan-cifras',
}: {
  anio: number;
  queFalta: readonly string[];
  referencia?: {
    anio: number;
    salarioMinimoCop: number | null;
    auxilioTransporteCop: number | null;
    uvtCop: number | null;
  } | null;
  href?: string;
  testId?: string;
}) {
  return (
    <div
      className="space-y-3 rounded-lg border border-warning/40 bg-warning-soft p-5 text-sm text-fg"
      data-testid={testId}
      role="status"
    >
      <div className="flex items-start gap-3">
        <Warning className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <div className="space-y-2">
          <p className="font-medium">
            No se puede liquidar {anio}: faltan las cifras del año.
          </p>
          <ul className="list-inside list-disc space-y-0.5 text-fg-muted">
            {queFalta.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <p className="text-fg-muted">
            El salario mínimo y el auxilio de transporte los decreta el Gobierno
            cada diciembre; la UVT la fija la DIAN por resolución. Leasefy no los
            inventa: cárgalos con el documento a la vista.
          </p>
          {referencia ? (
            <p className="text-xs text-fg-muted">
              Para referencia, en {referencia.anio} fueron{' '}
              {referencia.salarioMinimoCop != null
                ? formatCurrency(referencia.salarioMinimoCop)
                : SIN_MEDIR}{' '}
              de salario mínimo,{' '}
              {referencia.auxilioTransporteCop != null
                ? formatCurrency(referencia.auxilioTransporteCop)
                : SIN_MEDIR}{' '}
              de auxilio de transporte y{' '}
              {referencia.uvtCop != null ? formatCurrency(referencia.uvtCop) : SIN_MEDIR}{' '}
              la UVT. No se usan solos: hay que confirmarlos.
            </p>
          ) : null}
          <a
            className="inline-block font-medium text-brand underline"
            href={href}
            data-testid="ir-a-parametros"
          >
            Cargar los parámetros de {anio}
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Avisos ──────────────────────────────────────────────────────────────────

/**
 * Lo que la pantalla NO esconde: lo que falta, lo que un contador tiene que
 * mirar, lo que Leasefy calculó pero no puede afirmar.
 *
 * Va arriba y sin «ver más»: un número que calla lo que no cuenta miente por
 * omisión.
 */
export function Avisos({
  avisos,
  titulo,
  tono = 'warning',
  testId = 'avisos',
}: {
  avisos: readonly string[];
  titulo?: string;
  tono?: 'warning' | 'info';
  testId?: string;
}) {
  if (avisos.length === 0) return null;
  const Icono = tono === 'info' ? Info : Warning;
  return (
    <div
      className={cn(
        'flex gap-2 rounded-lg border p-3 text-sm text-fg',
        tono === 'info'
          ? 'border-border bg-surface'
          : 'border-warning/40 bg-warning-soft',
      )}
      data-testid={testId}
      role="status"
    >
      <Icono
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0',
          tono === 'info' ? 'text-fg-muted' : 'text-warning',
        )}
        aria-hidden="true"
      />
      <div className="space-y-1">
        {titulo ? <p className="font-medium">{titulo}</p> : null}
        <ul className="space-y-1">
          {avisos.map((aviso) => (
            <li key={aviso}>{aviso}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * La marca de «esto lo tiene que validar un contador», con su motivo.
 *
 * 🔴 NO es un icono suelto: el motivo viaja al lado. Un asterisco sin
 * explicación se ignora la segunda vez que se ve.
 */
export function ParaValidar({
  motivo,
  testId = 'para-validar',
}: {
  motivo: string;
  testId?: string;
}) {
  return (
    <span
      className="inline-flex items-start gap-1.5 text-xs leading-relaxed text-warning"
      data-testid={testId}
      title={motivo}
    >
      <Warning className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{motivo}</span>
    </span>
  );
}

// ── Cifras ──────────────────────────────────────────────────────────────────

/**
 * Una cifra en pesos con su definición debajo. `null` se pinta `—`, nunca `0`:
 * un cero afirma algo que nadie midió.
 */
export function Cifra({
  id,
  etiqueta,
  valor,
  definicion,
  sinMedir,
  tono,
}: {
  id: string;
  etiqueta: string;
  valor: number | null;
  definicion: string;
  sinMedir?: string;
  tono?: 'warning' | 'danger' | 'success';
}) {
  const medido = valor !== null && Number.isFinite(valor);
  const TONO: Record<string, string> = {
    warning: 'text-warning',
    danger: 'text-danger',
    success: 'text-success',
  };
  return (
    <section
      className="space-y-2 rounded-lg border border-border bg-surface p-5"
      data-testid={`cifra-${id}`}
    >
      <p className="text-label text-fg-muted">{etiqueta}</p>
      <p
        className={cn(
          'font-mono text-2xl font-medium tabular-nums text-fg',
          medido && tono && TONO[tono],
        )}
        data-testid={`valor-${id}`}
      >
        {medido ? formatCurrency(valor as number) : SIN_MEDIR}
      </p>
      <p className="text-xs leading-relaxed text-fg-muted">
        {medido ? definicion : (sinMedir ?? definicion)}
      </p>
    </section>
  );
}

/** El título de un bloque, con su explicación y su acción. */
export function TituloDeBloque({
  titulo,
  explicacion,
  accion,
}: {
  titulo: string;
  explicacion: string;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-fg">{titulo}</h2>
        <p className="max-w-2xl text-xs leading-relaxed text-fg-muted">
          {explicacion}
        </p>
      </div>
      {accion ? <div className="shrink-0">{accion}</div> : null}
    </div>
  );
}

// ── El estado del período ───────────────────────────────────────────────────

const TONO_DEL_ESTADO: Record<string, string> = {
  BORRADOR: 'border-border bg-surface text-fg-muted',
  APROBADO: 'border-brand/40 bg-brand/10 text-brand',
  PAGADO: 'border-success/40 bg-success-soft text-success',
  ANULADO: 'border-danger/40 bg-danger-soft text-danger',
};

const QUE_SIGNIFICA: Record<string, string> = {
  BORRADOR: 'Se puede recalcular tantas veces como quieras. Nada está en firme.',
  APROBADO:
    'Las líneas quedaron congeladas y las provisiones del mes están escritas.',
  PAGADO: 'Ya se giró.',
  ANULADO: 'Se anuló con motivo. Las novedades volvieron a estar libres.',
};

export function EstadoDelPeriodo({ estado }: { estado: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        TONO_DEL_ESTADO[estado] ?? TONO_DEL_ESTADO.BORRADOR,
      )}
      data-testid={`estado-${estado}`}
      title={QUE_SIGNIFICA[estado]}
    >
      {estado.charAt(0) + estado.slice(1).toLowerCase()}
    </span>
  );
}

/** Qué significa cada estado, escrito. Va debajo de la lista, no en un tooltip. */
export function LeyendaDeEstados() {
  return (
    <dl
      className="grid gap-2 rounded-lg border border-border bg-surface p-4 text-xs text-fg-muted sm:grid-cols-2"
      data-testid="leyenda-de-estados"
    >
      {Object.entries(QUE_SIGNIFICA).map(([estado, texto]) => (
        <div key={estado} className="flex gap-2">
          <dt className="shrink-0">
            <EstadoDelPeriodo estado={estado} />
          </dt>
          <dd className="leading-relaxed">{texto}</dd>
        </div>
      ))}
    </dl>
  );
}

/** `YYYY-MM` + quincena, en palabras. */
export function etiquetaDelPeriodo(mes: string, quincena: number | null): string {
  return quincena == null ? mes : `${mes} · quincena ${quincena}`;
}

/** Centésimas a texto: 750 → «7,5». */
export function deCentesimas(centesimas: number | null): string {
  if (centesimas == null) return '';
  return (centesimas / 100).toLocaleString('es-CO', {
    maximumFractionDigits: 2,
  });
}
