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
 *
 * GLOW UP (21-10-2026), el trabajo de la pantalla: «saber qué hicieron mis
 * agentes y si algo espera mi decisión». Antes: catorce tarjetas del mismo
 * peso, casi todas «Sin actividad todavía», y lo que esperaba una decisión
 * escondido como una fila más dentro de una tarjeta. Ahora:
 *   1. arriba, lo que espera tu decisión, con el camino al Piloto;
 *   2. los agentes que SÍ trabajaron, con sus cifras y el enlace a su pantalla
 *      (sólo si el menú se la da a esta persona: mismo gate que el sidebar);
 *   3. al final, en una lista corta, los que todavía no hicieron nada.
 */

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react';
import { Stagger, StaggerItem } from '@leasefy/cadence';
import { PageGuard } from '@/components/auth/PageGuard';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { AlertaAccionable } from '@/components/ui/alerta-accionable';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { pasaGateDeFila } from '@/lib/nav/agency-nav-filter';
import { canSeeBusinessModule } from '@/lib/nav/agency-module-scope';
import { modulosDelPanel } from '@/lib/nav/arquitectura-del-panel';
import { useOptionalI18n } from '@/lib/i18n';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { useAgentOverview } from '@/lib/hooks/ai/use-agent-overview';
import { useAiMetrics } from '@/lib/hooks/useInmobiliaria';
import type { AgentOverviewResponse, KpiFormat } from '@/lib/api/agent-workspace';
import type { AgenteId } from '@/lib/api/work-item';
import { fechaEnFrase } from '@/lib/api/facturacion-por-mes.service';
import { useDesempenoDeLosAgentes, type DesempenoDelAgente } from '@/lib/hooks/ai/use-desempeno-de-los-agentes';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';

/** Los agentes que ya guardan su actividad en el micro, en el orden del menú. */
const AGENTES_CON_SALA: { agente: AgenteId; nombre: string; hace: string; fila: string }[] = [
  { agente: 'cobranza', nombre: 'Cobranza', hace: 'Sigue a los inquilinos atrasados hasta que pagan.', fila: 'cobranza' },
  { agente: 'pagos', nombre: 'Pagos', hace: 'Revisa los pagos que llegan y los deja listos para aplicar.', fila: 'agente-de-pagos' },
  { agente: 'conciliacion', nombre: 'Conciliación', hace: 'Cruza el extracto del banco con los recibos.', fila: 'conciliacion' },
  { agente: 'matching', nombre: 'Afinidad', hace: 'Le busca otro inmueble al candidato que se quedó sin el suyo.', fila: 'matching' },
  { agente: 'cotizador', nombre: 'Asegurabilidad', hace: 'Pide la aprobación de las aseguradoras para cada inquilino.', fila: 'asegurabilidad' },
];

/** Donde se decide lo que proponen los agentes del Piloto (sin gate de módulo: es de todos). */
const RUTA_DEL_PILOTO = '/panel/inmobiliaria/piloto';

/** La plata como en la casa («$1.500.000»), el porcentaje con su espacio («66,7 %»). */
function cifra(valor: number, formato: KpiFormat): string {
  if (formato === 'cop') return formatCurrency(valor);
  if (formato === 'percent') return `${(valor * 100).toLocaleString(localeDeLasCifras(), { maximumFractionDigits: 1 })} %`;
  return valor.toLocaleString(localeDeLasCifras());
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
  const cifras = enCurso > 0 ? [{ etiqueta: 'Casos en curso', valor: enCurso.toLocaleString(localeDeLasCifras()) }] : [];
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
  const n = (x: number) => (recortado ? `${x.toLocaleString(localeDeLasCifras())} o más` : x.toLocaleString(localeDeLasCifras()));
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

/** Cómo quedó cada agente después de leer su actividad. */
type Lectura =
  | { estado: 'cargando' }
  | { estado: 'fallo'; error: unknown; queEs: string; reintentar: () => void }
  | { estado: 'con'; cifras: { etiqueta: string; valor: string }[]; pie?: string }
  | { estado: 'sin'; frase?: string };

interface Agente {
  id: string;
  nombre: string;
  hace: string;
  lectura: Lectura;
  /** La pantalla del agente, sólo si el menú se la da a esta persona. */
  enlace?: string | null;
}

function Tarjeta({
  nombre,
  hace,
  testId,
  enlace,
  children,
}: {
  nombre: string;
  hace: string;
  testId: string;
  enlace?: string | null;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={nombre}
      data-testid={testId}
      className="flex h-full flex-col rounded-lg border border-border bg-surface p-4"
    >
      <h2 className="text-base font-medium text-fg">{nombre}</h2>
      <p className="mt-0.5 text-caption text-fg-muted">{hace}</p>
      <div className="mt-4 flex-1">{children}</div>
      {enlace ? (
        <Link
          href={enlace}
          className="mt-4 inline-flex items-center gap-1 self-start text-sm font-medium text-primary underline-offset-4 hover:underline"
          data-testid={`${testId}-ir`}
        >
          Ir a {nombre}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  );
}

function Cifras({ cifras }: { cifras: { etiqueta: string; valor: string }[] }) {
  return (
    <dl className="space-y-2">
      {cifras.map((c) => (
        <div key={c.etiqueta} className="flex items-baseline justify-between gap-3">
          <dt className="text-sm text-fg-muted">{c.etiqueta}</dt>
          <dd className="font-mono text-sm text-fg tabular-nums">{c.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

function CuerpoDeLaTarjeta({ lectura }: { lectura: Lectura }) {
  if (lectura.estado === 'cargando') {
    return <div className="h-16 rounded bg-surface-muted animate-pulse" aria-label="Cargando" />;
  }
  if (lectura.estado === 'fallo') {
    return (
      <FalloDeCarga error={lectura.error} queEs={lectura.queEs} onReintentar={lectura.reintentar} enmarcado={false} />
    );
  }
  if (lectura.estado === 'con') {
    return (
      <>
        <Cifras cifras={lectura.cifras} />
        {lectura.pie ? <p className="mt-3 text-caption text-fg-subtle">{lectura.pie}</p> : null}
      </>
    );
  }
  return <p className="text-sm text-fg-subtle">{lectura.frase ?? 'Sin actividad todavía.'}</p>;
}

/** Los cinco agentes con Sala, en el orden del menú (un hook por agente, siempre los mismos). */
function useLosAgentesConSala(): Omit<Agente, 'enlace'>[] {
  const lecturas = [
    useAgentOverview('cobranza'),
    useAgentOverview('pagos'),
    useAgentOverview('conciliacion'),
    useAgentOverview('matching'),
    useAgentOverview('cotizador'),
  ];
  return AGENTES_CON_SALA.map((a, i) => {
    const { data, isLoading, errorCrudo, notAvailable, refetch } = lecturas[i];
    let lectura: Lectura;
    if (isLoading && !data) lectura = { estado: 'cargando' };
    else if (errorCrudo) lectura = { estado: 'fallo', error: errorCrudo, queEs: `la actividad de ${a.nombre}`, reintentar: () => refetch() };
    else if (notAvailable || !tieneActividad(data)) lectura = { estado: 'sin' };
    else {
      const ultima = data!.feed[0]?.occurredAt;
      lectura = { estado: 'con', cifras: cifrasDelAgente(data!), pie: ultima ? `Última actividad: ${fechaEnFrase(ultima)}` : undefined };
    }
    return { id: a.agente, nombre: a.nombre, hace: a.hace, lectura };
  });
}

/** Estudio de inquilinos: lo cuenta el back (`GET /inmobiliaria/ai/metrics`). */
function useElEstudio(): Agente {
  const { metrics, isLoading, errorCrudo, refetch } = useAiMetrics();
  const base = { id: 'estudio', nombre: 'Estudio de inquilinos', hace: 'Evalúa a cada postulante con sus documentos.' };
  if (isLoading && !metrics) return { ...base, lectura: { estado: 'cargando' } };
  if (errorCrudo) return { ...base, lectura: { estado: 'fallo', error: errorCrudo, queEs: 'las evaluaciones', reintentar: () => refetch() } };
  const evaluaciones = metrics?.scoring.evaluationsThisMonth ?? 0;
  if (evaluaciones <= 0) return { ...base, lectura: { estado: 'sin' } };
  return {
    ...base,
    lectura: {
      estado: 'con',
      cifras: [
        { etiqueta: 'Evaluaciones este mes', valor: String(evaluaciones) },
        // `accuracyRate` es completadas / total y `escalationRate`, fallidas / total.
        { etiqueta: 'Evaluaciones completadas', valor: metrics?.scoring.accuracyRate ?? '—' },
        { etiqueta: 'Evaluaciones que fallaron', valor: metrics?.scoring.escalationRate ?? '—' },
      ],
    },
  };
}

const PILOTO = { nombre: 'Agentes del Piloto', hace: 'Fixi, Avali, Vidi, Niti, Imana y el precio contra la vacancia.' };

function DesempenoContent() {
  const i18n = useOptionalI18n();
  const permisos = usePermissionsContextSafe();
  const conSala = useLosAgentesConSala();
  const estudio = useElEstudio();
  const piloto = useDesempenoDeLosAgentes();

  /** La pantalla del agente, con el MISMO gate con que el sidebar muestra su fila. */
  const enlaceDe = (clave: string): string | null => {
    if (!permisos) return null;
    const fila = modulosDelPanel().find((m) => m.key === clave);
    if (!fila) return null;
    const { canAccess, isAdmin, agencyRole, agentAccessStatus } = permisos;
    const ctx = { canAccess, isAdmin, agencyRole, agentUnverified: agentAccessStatus === 'sin-verificar' };
    return pasaGateDeFila(fila, ctx) && canSeeBusinessModule(fila.scope, { isAdmin, agencyRole }) ? fila.href : null;
  };

  const agentes: Agente[] = [
    ...conSala.map((a) => ({ ...a, enlace: enlaceDe(AGENTES_CON_SALA.find((x) => x.agente === a.id)!.fila) })),
    estudio,
  ];

  // Los agentes con manos (acciones del Piloto); un micro sin la ruta deja la pantalla como antes.
  const avisoDelPiloto: Agente | null = piloto.sinLaRuta
    ? null
    : piloto.isLoading && !piloto.data
      ? { id: 'con-manos-cargando', ...PILOTO, lectura: { estado: 'cargando' } }
      : piloto.error
        ? { id: 'con-manos-fallo', ...PILOTO, lectura: { estado: 'fallo', error: piloto.error, queEs: 'lo que hicieron los agentes del Piloto', reintentar: () => piloto.refetch() } }
        : piloto.data && !piloto.data.disponible
          ? { id: 'con-manos-sin-dato', ...PILOTO, lectura: { estado: 'sin', frase: 'No pudimos leer lo que hicieron: por ahora no tenemos cómo contarlo aquí.' } }
          : null;
  if (avisoDelPiloto) agentes.push(avisoDelPiloto);

  const yaTienenTarjeta = new Set<string>(AGENTES_CON_SALA.map((a) => a.agente));
  const conManos = piloto.data?.disponible ? piloto.data.agentes.filter((d) => !yaTienenTarjeta.has(d.agente)) : [];
  for (const d of conManos) {
    const cifras = cifrasDeLasAcciones(d, piloto.data!.dias, piloto.data!.recortado);
    agentes.push({
      id: d.agente,
      nombre: d.nombre,
      hace: QUE_HACE[d.agente] ?? 'Lo que el Piloto hizo con sus procesos.',
      lectura: cifras.length > 0 ? { estado: 'con', cifras } : { estado: 'sin' },
    });
  }
  agentes.push({
    id: 'chat',
    nombre: 'Chat',
    hace: 'Responde las preguntas de tu equipo sobre la inmobiliaria.',
    lectura: { estado: 'sin', frase: 'Todavía no llevamos la cuenta de las preguntas del chat para mostrarla aquí.' },
  });

  // 1. Lo que espera una decisión: el único «para hacer» de la pantalla.
  const esperan = conManos.filter((d) => d.esperan > 0);
  const totalQueEspera = esperan.reduce((n, d) => n + d.esperan, 0);

  // 2 y 3. Arriba lo que tiene algo que mostrar (o se está leyendo, o falló);
  // abajo, en una lista corta, los que todavía no hicieron nada.
  const arriba = agentes.filter((a) => a.lectura.estado !== 'sin' || a.id === 'con-manos-sin-dato');
  const abajo = agentes.filter((a) => a.lectura.estado === 'sin' && a.id !== 'con-manos-sin-dato');

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EncabezadoDePantalla
        seccion={i18n?.t('inmobiliaria.nav.secAgentes') ?? 'Agentes IA'}
        titulo="Desempeño IA"
        descripcion="Lo que ha hecho cada agente, con las cifras de su propia actividad. Ninguna es una estimación."
      />

      {totalQueEspera > 0 ? (
        <AlertaAccionable
          severidad="info"
          titulo={
            totalQueEspera === 1
              ? '1 acción de un agente espera tu decisión'
              : `${totalQueEspera.toLocaleString(localeDeLasCifras())} acciones de los agentes esperan tu decisión`
          }
          accion={{ label: 'Decidir en el Piloto', href: RUTA_DEL_PILOTO }}
          data-testid="desempeno-esperan"
        >
          {esperan.length === 1 ? `La propuso ${esperan[0].nombre}.` : `Las propusieron ${esperan.map((d) => d.nombre).join(', ')}.`}
        </AlertaAccionable>
      ) : null}

      {arriba.length > 0 ? (
        <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {arriba.map((a) => (
            <StaggerItem key={a.id}>
              <Tarjeta
                nombre={a.nombre}
                hace={a.hace}
                testId={`desempeno-${a.id}`}
                enlace={a.lectura.estado === 'con' ? a.enlace : null}
              >
                <CuerpoDeLaTarjeta lectura={a.lectura} />
              </Tarjeta>
            </StaggerItem>
          ))}
        </Stagger>
      ) : null}

      {abajo.length > 0 ? (
        <section aria-labelledby="desempeno-sin-actividad-titulo" className="space-y-2" data-testid="desempeno-sin-actividad">
          <div>
            <h2 id="desempeno-sin-actividad-titulo" className="text-sm font-medium text-fg">
              Sin actividad todavía
            </h2>
            <p className="text-caption text-fg-muted">Suben con sus cifras apenas hagan algo.</p>
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {abajo.map((a) => (
              <li
                key={a.id}
                data-testid={`desempeno-${a.id}`}
                className="flex flex-col gap-0.5 px-4 py-3 md:flex-row md:items-baseline md:gap-4"
              >
                <span className="shrink-0 text-sm font-medium text-fg md:w-48">{a.nombre}</span>
                <span className="min-w-0 text-caption text-fg-muted">
                  {a.lectura.estado === 'sin' && a.lectura.frase ? a.lectura.frase : a.hace}
                </span>
                {a.lectura.estado === 'sin' && a.lectura.frase ? null : <span className="sr-only"> Sin actividad todavía.</span>}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
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
