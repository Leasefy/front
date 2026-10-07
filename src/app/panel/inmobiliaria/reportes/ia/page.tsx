'use client';

/**
 * Desempeño IA (QA 04-10, IA-C-05).
 *
 * Antes era la «Analítica» vieja reciclada: «Métricas clave, tendencias y
 * proyecciones de tu portafolio», sólo «evaluaciones» (0) y «Tiempo promedio
 * < 1 min» con CERO evaluaciones — un dato sin base. No decía nada del
 * desempeño de los agentes.
 *
 * Ahora: una tarjeta por agente con 2-3 cifras REALES de su propia actividad,
 * tal como las calcula el micro (`GET …/ai-hub/agentes/:agente/overview`, la
 * misma fuente de la «Sala» de cada agente) o el back (estudio de inquilinos,
 * `GET /inmobiliaria/ai/metrics`). Sin actividad, «Sin actividad todavía» y no
 * una fila de ceros. Nada estimado: fuera las «horas ahorradas» (evaluaciones
 * × media hora) y el tiempo promedio.
 *
 * Lo que la pantalla vieja ya había sacado por mentiroso sigue afuera: exportar
 * sin archivo, selector de período que no cambiaba nada, tendencias y metas
 * inventadas.
 */

import type { ReactNode } from 'react';
import { ChartLineUp } from '@phosphor-icons/react';
import { Stagger, StaggerItem } from '@leasefy/cadence';
import { PageGuard } from '@/components/auth/PageGuard';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { useAgentOverview } from '@/lib/hooks/ai/use-agent-overview';
import { useAiMetrics } from '@/lib/hooks/useInmobiliaria';
import type { AgentOverviewResponse, KpiFormat } from '@/lib/api/agent-workspace';
import type { AgenteId } from '@/lib/api/work-item';
import { fechaEnFrase } from '@/lib/api/facturacion-por-mes.service';
import { useDesempenoDeLosAgentes, type DesempenoDelAgente } from '@/lib/hooks/ai/use-desempeno-de-los-agentes';

/** Los agentes que ya guardan su actividad en el micro, en el orden del menú. */
const AGENTES_CON_SALA: { agente: AgenteId; nombre: string; hace: string }[] = [
  { agente: 'cobranza', nombre: 'Cobranza', hace: 'Sigue a los inquilinos atrasados hasta que pagan.' },
  { agente: 'pagos', nombre: 'Pagos', hace: 'Revisa los pagos que llegan y los deja listos para aplicar.' },
  { agente: 'conciliacion', nombre: 'Conciliación', hace: 'Cruza el extracto del banco con los recibos.' },
  { agente: 'matching', nombre: 'Matching', hace: 'Le busca otro inmueble al candidato que se quedó sin el suyo.' },
  { agente: 'cotizador', nombre: 'Asegurabilidad', hace: 'Pide la aprobación de las aseguradoras para cada inquilino.' },
];

/** La plata como en la casa («$1.500.000»), el porcentaje con su espacio («66,7 %»). */
function cifra(valor: number, formato: KpiFormat): string {
  if (formato === 'cop') return formatCurrency(valor);
  if (formato === 'percent') return `${(valor * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;
  return valor.toLocaleString('es-CO');
}

const EN_CURSO = new Set(['detectado', 'sugerido', 'en_revision', 'aprobado', 'ejecutando']);

/**
 * 🔴 QA-IA-95 (05-10-2026): en la cobranza, «detectado» es la etapa S0
 * (pre-vencimiento: el deudor ya no debe o todavía no vence). No es un caso en
 * curso: Cobranza › Casos no lo cuenta (IA-B-27), y esta tarjeta decía «Casos
 * en curso 19» con la pantalla de Casos vacía.
 */
const NO_ES_UN_CASO_EN_CURSO: Partial<Record<AgenteId, ReadonlySet<string>>> = {
  cobranza: new Set(['detectado']),
};

/**
 * Hasta tres cifras: primero los casos que tiene en curso (de su cola, si hay),
 * después sus indicadores en el orden en que los manda el micro.
 */
function cifrasDelAgente(data: AgentOverviewResponse): { etiqueta: string; valor: string }[] {
  const fuera = NO_ES_UN_CASO_EN_CURSO[data.agente as AgenteId];
  const enCurso = data.pipeline
    .filter((p) => EN_CURSO.has(p.estado) && !fuera?.has(p.estado))
    .reduce((n, p) => n + p.count, 0);
  const cifras = enCurso > 0 ? [{ etiqueta: 'Casos en curso', valor: enCurso.toLocaleString('es-CO') }] : [];
  for (const k of data.kpis) cifras.push({ etiqueta: k.label, valor: cifra(k.value, k.format) });
  return cifras.slice(0, 3);
}

/** Hubo actividad si alguna cifra o caso es distinto de cero. */
function tieneActividad(data: AgentOverviewResponse | null): boolean {
  if (!data) return false;
  return (
    data.kpis.some((k) => k.value > 0) ||
    data.pipeline.some((p) => p.count > 0) ||
    data.feed.length > 0
  );
}

function Tarjeta({
  nombre,
  hace,
  testId,
  children,
}: {
  nombre: string;
  hace: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={nombre}
      data-testid={testId}
      className="flex h-full flex-col rounded-lg border border-border bg-surface p-4"
    >
      <h2 className="text-base font-semibold text-fg">{nombre}</h2>
      <p className="mt-0.5 text-xs text-fg-muted">{hace}</p>
      <div className="mt-4 flex-1">{children}</div>
    </section>
  );
}

function Cifras({ cifras }: { cifras: { etiqueta: string; valor: string }[] }) {
  return (
    <dl className="space-y-2">
      {cifras.map((c) => (
        <div key={c.etiqueta} className="flex items-baseline justify-between gap-3">
          <dt className="text-sm text-fg-muted">{c.etiqueta}</dt>
          <dd className="font-mono text-sm font-semibold text-fg tabular-nums">{c.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

const SIN_ACTIVIDAD = <p className="text-sm text-fg-subtle">Sin actividad todavía.</p>;

function TarjetaDeAgente({ agente, nombre, hace }: { agente: AgenteId; nombre: string; hace: string }) {
  const { data, isLoading, errorCrudo, notAvailable, refetch } = useAgentOverview(agente);
  let cuerpo: ReactNode;
  if (isLoading && !data) {
    cuerpo = <div className="h-16 rounded bg-surface-muted animate-pulse" aria-label="Cargando" />;
  } else if (errorCrudo) {
    cuerpo = (
      <FalloDeCarga
        error={errorCrudo}
        queEs={`la actividad de ${nombre}`}
        onReintentar={() => void refetch()}
        enmarcado={false}
      />
    );
  } else if (notAvailable || !tieneActividad(data)) {
    cuerpo = SIN_ACTIVIDAD;
  } else {
    const ultima = data!.feed[0]?.occurredAt;
    cuerpo = (
      <>
        <Cifras cifras={cifrasDelAgente(data!)} />
        {ultima ? (
          <p className="mt-3 text-xs text-fg-subtle">Última actividad: {fechaEnFrase(ultima)}</p>
        ) : null}
      </>
    );
  }
  return (
    <Tarjeta nombre={nombre} hace={hace} testId={`desempeno-${agente}`}>
      {cuerpo}
    </Tarjeta>
  );
}

/**
 * 🔴 QA-IA-95 (05-10-2026, IA95-08): los agentes con manos (Fixi, Avali, Vidi, Niti, Imana, precio) no
 * tenían tarjeta. Sus cifras son las acciones del Piloto de los últimos 30 días (`…/ai-hub/desempeno`).
 */
const QUE_HACE: Record<string, string> = {
  mantenimiento: 'Clasifica cada solicitud de mantenimiento, pide cotizaciones y propone la mejor.',
  aprobaciones: 'Le recuerda al propietario lo que tiene por aprobar y le pide escoger su inquilino.',
  inspeccion: 'Agenda las inspecciones de entrada y salida y deja el acta en borrador.',
  calidad: 'Corrige la ficha de los inmuebles publicados y avisa lo que falta.',
  prospectos: 'Le responde al interesado nuevo y le agenda la visita con su asesor.',
  avaluos: 'Le cuenta al propietario cuánto le cuesta la vacancia y lleva su pedido a la Bandeja.',
};

function cifrasDeLasAcciones(d: DesempenoDelAgente, dias: number, recortado: boolean): { etiqueta: string; valor: string }[] {
  const n = (x: number) => (recortado ? `${x.toLocaleString('es-CO')} o más` : x.toLocaleString('es-CO'));
  const filas: { etiqueta: string; valor: string; x: number }[] = [
    { etiqueta: `Hechas en ${dias} días`, valor: n(d.hechas), x: d.hechas },
    { etiqueta: 'Esperan tu decisión', valor: String(d.esperan), x: d.esperan },
    { etiqueta: 'Programadas (con «Deshacer»)', valor: String(d.programadas), x: d.programadas },
    { etiqueta: 'Fallaron', valor: n(d.fallidas), x: d.fallidas },
    { etiqueta: 'Deshechas', valor: n(d.deshechas), x: d.deshechas },
    { etiqueta: 'Descartadas', valor: n(d.descartadas), x: d.descartadas },
  ];
  return filas.filter((f) => f.x > 0).map(({ etiqueta, valor }) => ({ etiqueta, valor }));
}

/** Una tarjeta por agente con manos; un micro sin la ruta deja la pantalla como antes. */
function TarjetasDeLosAgentesConManos() {
  const { data, isLoading, error, sinLaRuta, refetch } = useDesempenoDeLosAgentes();
  if (sinLaRuta) return null;
  if (isLoading && !data) {
    return (
      <StaggerItem key="con-manos-cargando">
        <div className="h-24 rounded-lg bg-surface-muted animate-pulse" aria-label="Cargando" />
      </StaggerItem>
    );
  }
  if (error) {
    return (
      <StaggerItem key="con-manos-fallo">
        <Tarjeta nombre="Agentes del Piloto" hace="Fixi, Avali, Vidi, Niti, Imana y el precio contra la vacancia." testId="desempeno-con-manos-fallo">
          <FalloDeCarga error={error} queEs="lo que hicieron los agentes del Piloto" onReintentar={() => void refetch()} enmarcado={false} />
        </Tarjeta>
      </StaggerItem>
    );
  }
  if (!data) return null;
  if (!data.disponible) {
    return (
      <StaggerItem key="con-manos-sin-back">
        <Tarjeta nombre="Agentes del Piloto" hace="Fixi, Avali, Vidi, Niti, Imana y el precio contra la vacancia." testId="desempeno-con-manos-sin-dato">
          <p className="text-sm text-fg-subtle">No pudimos leer lo que hicieron: por ahora no tenemos cómo contarlo aquí.</p>
        </Tarjeta>
      </StaggerItem>
    );
  }
  const yaTienenTarjeta = new Set<string>(AGENTES_CON_SALA.map((a) => a.agente));
  return (
    <>
      {data.agentes
        .filter((d) => !yaTienenTarjeta.has(d.agente))
        .map((d) => {
          const cifras = cifrasDeLasAcciones(d, data.dias, data.recortado);
          return (
            <StaggerItem key={`con-manos-${d.agente}`}>
              <Tarjeta nombre={d.nombre} hace={QUE_HACE[d.agente] ?? 'Lo que el Piloto hizo con sus procesos.'} testId={`desempeno-${d.agente}`}>
                {cifras.length > 0 ? <Cifras cifras={cifras} /> : SIN_ACTIVIDAD}
              </Tarjeta>
            </StaggerItem>
          );
        })}
    </>
  );
}

/** Estudio de inquilinos: lo cuenta el back (`GET /inmobiliaria/ai/metrics`). */
function TarjetaDeEstudio() {
  const { metrics, isLoading, errorCrudo, refetch } = useAiMetrics();
  const nombre = 'Estudio de inquilinos';
  const hace = 'Evalúa a cada postulante con sus documentos.';
  let cuerpo: ReactNode;
  if (isLoading && !metrics) {
    cuerpo = <div className="h-16 rounded bg-surface-muted animate-pulse" aria-label="Cargando" />;
  } else if (errorCrudo) {
    cuerpo = (
      <FalloDeCarga error={errorCrudo} queEs="las evaluaciones" onReintentar={() => void refetch()} enmarcado={false} />
    );
  } else {
    const evaluaciones = metrics?.scoring.evaluationsThisMonth ?? 0;
    cuerpo =
      evaluaciones > 0 ? (
        <Cifras
          cifras={[
            { etiqueta: 'Evaluaciones este mes', valor: String(evaluaciones) },
            // `accuracyRate` es completadas / total y `escalationRate`, fallidas / total.
            { etiqueta: 'Evaluaciones completadas', valor: metrics?.scoring.accuracyRate ?? '—' },
            { etiqueta: 'Evaluaciones que fallaron', valor: metrics?.scoring.escalationRate ?? '—' },
          ]}
        />
      ) : (
        SIN_ACTIVIDAD
      );
  }
  return (
    <Tarjeta nombre={nombre} hace={hace} testId="desempeno-estudio">
      {cuerpo}
    </Tarjeta>
  );
}

function DesempenoContent() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-h2 text-fg flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted">
            <ChartLineUp className="h-5 w-5 text-fg-muted" weight="duotone" />
          </span>
          Desempeño IA
        </h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          Lo que ha hecho cada agente, con las cifras de su propia actividad. Ninguna es una estimación.
        </p>
      </div>

      <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {AGENTES_CON_SALA.map((a) => (
          <StaggerItem key={a.agente}>
            <TarjetaDeAgente agente={a.agente} nombre={a.nombre} hace={a.hace} />
          </StaggerItem>
        ))}
        <StaggerItem key="estudio">
          <TarjetaDeEstudio />
        </StaggerItem>
        <TarjetasDeLosAgentesConManos />
        <StaggerItem key="chat">
          <Tarjeta nombre="Chat" hace="Responde las preguntas de tu equipo sobre la inmobiliaria." testId="desempeno-chat">
            <p className="text-sm text-fg-subtle">
              Todavía no llevamos la cuenta de las preguntas del chat para mostrarla aquí.
            </p>
          </Tarjeta>
        </StaggerItem>
      </Stagger>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <PageGuard module="analytics">
      <DesempenoContent />
    </PageGuard>
  );
}
