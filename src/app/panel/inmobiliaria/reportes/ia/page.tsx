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
 * Hasta tres cifras: primero los casos que tiene en curso (de su cola, si hay),
 * después sus indicadores en el orden en que los manda el micro.
 */
function cifrasDelAgente(data: AgentOverviewResponse): { etiqueta: string; valor: string }[] {
  const enCurso = data.pipeline.filter((p) => EN_CURSO.has(p.estado)).reduce((n, p) => n + p.count, 0);
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
