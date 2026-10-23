'use client';

import Link from 'next/link';
import { AlertaAccionable } from '@/components/ui/alerta-accionable';
// AVISO-TIPO-DOC (05-10-2026): los propietarios cuyo documento frena la factura por mandato.
import { AvisoTipoDeDocumento } from '@/components/inmobiliaria/AvisoTipoDeDocumento';
import { Kanban, UserCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Avatar, Cifra, CrossFade, FranjaDeCifras, StatusBadge } from '@leasefy/cadence';
import { Button, EmptyState } from '@/components/ui';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { useTr } from '@/lib/i18n/use-tr';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { PageGuard } from '@/components/auth/PageGuard';
import { MonoLabel } from '@/components/brand';
import { useI18n } from '@/lib/i18n';
import { contar } from '@/lib/texto/plural';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  useInmobiliariaDashboard,
  useAgentes,
  usePipelineItems,
  useCobros,
  useMantenimientos,
} from '@/lib/hooks/useInmobiliaria';
import { SIN_MEDIR, tasaMedida, tasaEnPantalla } from '@/lib/tasas';
import { BASE_POR_DEFECTO, claveDelRotulo, fraseDeLasCifras, tasaDelTablero } from '@/lib/tasa-de-recaudo';
import { formatCurrency, getPipelineStageInfo } from '@/lib/types/inmobiliaria';
import { plataPareja } from '@/lib/format';
import type { PipelineItem, Agente } from '@/lib/types/inmobiliaria';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';

/**
 * Pipeline Mini Card
 */
/** Una fila de la prospección: lista con divisores (antes, tarjeta arena dentro de la tarjeta, con caja de ícono). */
function PipelineMiniCard({ item }: { item: PipelineItem }) {
  const stageInfo = getPipelineStageInfo(item.stage);

  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      {item.propertyThumbnail ? (
        <img src={item.propertyThumbnail} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-medium text-fg">{item.candidateName}</p>
        <p className="truncate text-caption text-fg-muted">{item.propertyTitle}</p>
      </div>
      {stageInfo?.labelEs ? <StatusBadge tone="neutral">{stageInfo.labelEs}</StatusBadge> : null}
    </li>
  );
}

/** Una línea de «Para atender»: el asunto con su número y el enlace a donde se arregla. */
function FilaParaAtender({
  titulo,
  href,
  etiqueta,
  tono,
  testid,
}: {
  titulo: string;
  href: string;
  etiqueta: string;
  tono: 'aviso' | 'info';
  testid: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5" data-testid={testid}>
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', tono === 'aviso' ? 'bg-warning-500' : 'bg-sand-400 dark:bg-neutral-500')}
          aria-hidden="true"
        />
        <span className="text-body-sm text-fg">{titulo}</span>
      </span>
      <Link href={href} className="shrink-0 text-body-sm font-medium text-fg-muted underline-offset-4 hover:text-fg hover:underline">
        {etiqueta}
      </Link>
    </li>
  );
}

function AgentMiniCard({
  agent,
  t,
}: {
  agent: Agente;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  // Revisora r25: un asesor sin nombre salía como su correo con el avatar «HO» (de «hola+…»).
  const sinNombre = !agent.name || agent.name.includes('@');
  return (
    <div className="flex items-center gap-3">
      <Avatar name={sinNombre ? '?' : agent.name} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg truncate">
          {sinNombre ? 'Sin nombre' : agent.name}
        </p>
        {sinNombre && agent.name ? <p className="truncate text-caption text-fg-subtle">{agent.name}</p> : null}
        <p className="text-caption text-fg-muted">
          {t(agent.metrics.closedThisMonth === 1 ? 'inmobiliaria.dashboard.team.closedThisMonthUno' : 'inmobiliaria.dashboard.team.closedThisMonth', { count: agent.metrics.closedThisMonth })}
        </p>
      </div>
      {/* 🔴 17-09: acá iba la comisión del asesor. Se paga por fuera de
          Leasefy y ningún inmueble tenía asesor asignado, así que era un «$0»
          que se leía como un mal mes. Ahora: los inmuebles que tiene a cargo. */}
      <span
        className="font-mono text-body-sm text-fg tabular-nums"
        data-testid="agente-inmuebles"
        title="Inmuebles a cargo"
      >
        {agent.metrics.assignedProperties}
      </span>
    </div>
  );
}

/**
 * Inmobiliaria Dashboard Page
 * Main overview for real estate agency operations
 */
/**
 * `/reportes/resumen` — el resumen del negocio.
 *
 * 🔴 Sin `PageGuard`, esta era la ÚNICA de las cuatro pantallas de Reportes que
 * no comprobaba el módulo que su fila del sidebar declara (`dashboard`, en
 * `arquitectura-del-panel.ts`). Entrando por URL se montaba igual y cada hook
 * decidía por su cuenta: quien no tenía permiso veía la pantalla completa con
 * todo en cero. El guard alinea pantalla y sidebar (`gates-del-panel.test.ts`
 * §2); los ceros silenciosos por FALTA DE PERMISO los resuelve `SinAcceso`,
 * abajo.
 */
export default function InmobiliariaDashboardPage() {
  return (
    <PageGuard module="dashboard">
      <ResumenDelNegocio />
    </PageGuard>
  );
}

/**
 * Un bloque que no se puede mostrar porque el rol no lo alcanza. Dice eso,
 * en vez de dibujar un cero: «0 agentes activos» y «no tienes acceso a
 * agentes» se ven igual y significan cosas opuestas.
 */
function SinAcceso({ que }: { que: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-6 text-center">
      <p className="text-sm text-fg-muted">
        Tu rol no incluye {que}. Pídele a un administrador de la inmobiliaria que te lo habilite.
      </p>
    </div>
  );
}

function ResumenDelNegocio() {
  const { t, locale } = useI18n();
  const tr = useTr();
  const { canAccess, isLoading: permLoading } = usePermissions();

  const {
    kpis: kpisData,
    isLoading: kpisLoading,
    errorCrudo: kpisError,
    refetch: refetchKpis,
  } = useInmobiliariaDashboard({
    skip: permLoading || !canAccess('analytics', 'view'),
    pollMs: 30000, // refresco en vivo cada 30s
  });
  const kpis = kpisData ?? {
    totalProperties: 0, propertiesAvailable: 0, propertiesRented: 0, propertiesInProcess: 0,
    occupancyRate: 0, expectedRevenue: 0, collectedRevenue: 0, pendingCollections: 0,
    lateCollections: 0, collectionRate: 0, totalCommissions: 0,
    collectionTrend: 0, commissionsTrend: 0, activeLeads: 0,
    scheduledVisits: 0, pendingApplications: 0, contractsInProgress: 0,
    totalAgents: 0, closedThisMonth: 0, avgDaysToClose: 0, totalPropietarios: 0, pendingDispersions: 0,
  };

  /*
   * 🔴 La tasa de recaudo la mide el BACK, como la eligió la inmobiliaria
   * (sobre lo causado por defecto, o sobre lo emitido), y viaja con su
   * fórmula y `pct: null` cuando no hubo contra qué medir. Acá se rehacía
   * `collectedRevenue / expectedRevenue` y Cobros emitidos dividía otra cosa:
   * 2,2 % y 43,6 % para la misma agencia, con el mismo nombre. Ahora el número
   * se pinta con su rótulo, y la pantalla no divide nada.
   */
  const tasa = tasaDelTablero(kpis);
  // Revisora r25 (T5): la misma cifra y su leyenda con y sin centavos; plata pareja en todo el bloque.
  const tasaDeRecaudo = tasa.pct;
  const rotuloDeLaTasa = t(claveDelRotulo(tasa.base));
  /*
   * 🔴 La ocupación se mide contra el CATÁLOGO, no contra todo el portafolio
   * (Nico, 2026-09-12: «esa tasa de ocupación se debe medir contra el inmueble
   * disponible, no contra el no disponible, porque ya está fuera del
   * catálogo»). `propertiesInCatalog` es el denominador que manda el back; una
   * respuesta vieja en caché no lo trae y ahí cae a `totalProperties`, que es
   * lo que se venía usando.
   */
  const enCatalogo = kpis.propertiesInCatalog ?? kpis.totalProperties;
  const fueraDelCatalogo = kpis.propertiesOutOfCatalog ?? 0;
  const tasaDeOcupacion = tasaMedida(kpis.propertiesRented, enCatalogo);
  // Con 1.944 inmuebles afuera, «1944» sin separador se lee mal en una
  // subtítulo de tarjeta. El resto del panel ya formatea así.
  const miles = (n: number) => n.toLocaleString(localeDeLasCifras());

  /*
   * 🔴 «1 disponibles» (21-09-2026). El subtítulo salía de una clave de i18n
   * con el plural clavado, así que con un solo inmueble disponible la tarjeta
   * decía «5 arrendadas · 1 disponibles». La frase se arma acá con `contar`,
   * que es el mismo primitivo que el back ya tenía (`contar(n, 'cuota')`).
   * La clave de i18n se queda para el inglés, que no tiene este problema.
   */
  const arrendadasYDisponibles =
    locale === 'es'
      ? `${contar(kpis.propertiesRented, 'arrendada')} · ${contar(kpis.propertiesAvailable, 'disponible')}`
      : t('inmobiliaria.dashboard.kpi.rentedAndAvailable', {
          rented: miles(kpis.propertiesRented),
          available: miles(kpis.propertiesAvailable),
        });

  /*
   * 🔴 SIN MES ANTERIOR NO HAY FLECHA (21-09-2026).
   *
   * Desde hoy el back manda `null` cuando el mes anterior fue cero, que es lo
   * que de verdad pasa: pasar de nada a algo no tiene porcentaje. Antes mandaba
   * `100`, y esta pantalla decía «$8.200.000 · +100% vs mes anterior» en una
   * inmobiliaria que el mes pasado no recaudó nada — se leía como que el
   * recaudo se duplicó.
   *
   * La heurística vieja (valor 0 y variación 0) se queda como RESPALDO: una
   * respuesta vieja en caché todavía trae un número, y un `0` contra `0` sigue
   * significando «no hay con qué comparar».
   */
  const hayConQueComparar = (valor: number, variacion: number | null) =>
    variacion !== null && !(valor === 0 && variacion === 0);

  /** La variación, sólo cuando de verdad la hay. */
  const laVariacion = (valor: number, variacion: number | null) =>
    hayConQueComparar(valor, variacion)
      ? { value: Math.abs(variacion!), isPositive: variacion! >= 0 }
      : undefined;

  // Etiqueta del mes en curso (es-CO) para el resumen financiero.
  // Sólo la inicial en mayúscula: con `capitalize` de CSS salía «Septiembre De 2026».
  const mesCrudo = new Intl.DateTimeFormat('es-CO', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  const currentMonthLabel = mesCrudo.charAt(0).toUpperCase() + mesCrudo.slice(1);
  // Cada bloque sabe si el rol lo alcanza: sin esto, «sin permiso» y «no hay
  // nada» se dibujan igual (un cero) y significan cosas opuestas.
  const veAgentes = !permLoading && canAccess('agentes', 'view');
  const vePipeline = !permLoading && canAccess('pipeline', 'view');
  const { agentes } = useAgentes({ skip: permLoading || !canAccess('agentes', 'view') });
  const { pipelineItems } = usePipelineItems({ skip: permLoading || !canAccess('pipeline', 'view') });
  const { cobros } = useCobros(undefined, { skip: permLoading || !canAccess('cobros', 'view') });
  const { mantenimientos } = useMantenimientos(undefined, { skip: permLoading || !canAccess('operaciones', 'view') });

  const activeAgents = agentes.filter((a) => a.status === 'active');

  // Get pipeline items that need attention (not completed/lost)
  const activePipeline = pipelineItems.filter(
    (p) => p.stage !== 'completed' && p.stage !== 'lost'
  ).slice(0, 5);

  // Get pending cobros
  const pendingCobros = cobros.filter(
    (c) => c.status === 'pending' || c.status === 'late'
  );

  // Get pending maintenance
  const pendingMaintenance = mantenimientos.filter(
    (m) => m.status !== 'completed' && m.status !== 'cancelled'
  );
  const cobrosEnMora = pendingCobros.filter((c) => c.status === 'late');
  // La deuda del contrato, cuando el back la manda (ver la alerta de cartera).
  const carteraDelMes = kpisData?.deuda?.delMes;
  // Toda la deuda viva: el número de cuotas de la pantalla de Cartera.
  const deudaTotal = kpisData?.deuda?.total;
  const avisosDeLaDeuda = kpisData?.deuda?.avisos ?? [];
  const enMoraDelMes = Math.min(kpis.lateCollections, Math.max(0, kpis.expectedRevenue - kpis.collectedRevenue));
  const porVencer = Math.max(0, kpis.expectedRevenue - kpis.collectedRevenue - enMoraDelMes);
  const plata = plataPareja([kpis.collectedRevenue, kpis.expectedRevenue, porVencer, enMoraDelMes]);
  const hayParaAtender =
    (carteraDelMes ? carteraDelMes.cuotasEnCartera > 0 : cobrosEnMora.length > 0) ||
    avisosDeLaDeuda.length > 0 ||
    kpis.pendingDispersions > 0 ||
    pendingMaintenance.length > 0;

  // First load: distinguish "loading" from "empty agency" so the panel never
  // renders silent zeros while the KPIs are still in flight.
  //
  // Esqueleto → resumen (o → fallo): cada salida va en un `CrossFade` con su
  // clave, así lo que llega después de cargar entra con su fundido. Lo que ya
  // estaba al montarse (en caché) no se anima: la página entra con su template.
  if ((permLoading || kpisLoading) && !kpisData) {
    return (
      // Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»).
      <CrossFade swapKey="esqueleto">
        <EsqueletoDePagina variante="dashboard" />
      </CrossFade>
    );
  }

  // Real failure (backend unreachable / server error) with no data to show.
  if (kpisError && !kpisData) {
    return (
      <CrossFade swapKey="fallo">
      <div className="p-6 lg:p-8">
        {/* `ErrorState` no distingue un 404 de un corte de red: ofrecía
            reintentar siempre y describía todo igual. `FalloDeCarga` lo decide
            por el status. */}
        <FalloDeCarga
          error={kpisError}
          queEs="los indicadores de la agencia"
          onReintentar={refetchKpis}
        />
      </div>
      </CrossFade>
    );
  }

  return (
    <CrossFade swapKey="resumen">
    <div className="p-6 lg:p-8 space-y-8">
      {/* GLOW UP 21-10: el trabajo de esta pantalla es «ver cómo va el mes y
          atender lo que se cae». Arriba lo que hay que atender; después las
          cifras que deciden; al final lo que se consulta (captación y equipo).
          Tres de los cuatro atajos que vivían en tarjetas al fondo suben al
          encabezado; «Ver reportes» ya está en el resumen financiero. */}
      {/* GLOW UP 22-10 (revisora r24 #4): la pantalla es para leer —fuera los tres atajos a otras pantallas
          («Nuevo mandato» ya está en el menú)—; la única salida, «Ver reportes». */}
      <EncabezadoDePantalla
        seccion={tr('Reportes')}
        titulo={t('inmobiliaria.nav.resumenDelNegocio')}
        descripcion={tr('Cómo va el mes y qué atender primero.')}
        acciones={
          <Button size="sm" variant="outline" hideArrow asChild>
            <Link href="/panel/inmobiliaria/reportes" data-testid="resumen-ver-reportes">
              {t('inmobiliaria.dashboard.financial.viewFullReports')}
            </Link>
          </Button>
        }
      />

      {/* GLOW UP 22-10 (UX, al nivel de Deuda del mes): LA RESPUESTA del mes en una cifra —lo recaudado
          de lo esperado, con su barra (recaudado · por cobrar) y la mora en la leyenda—, con la tasa y su
          fórmula debajo. Antes eran trece cifras: cuatro tarjetas grandes, cuatro chicas y un resumen
          financiero de cinco. Debajo, UNA franja de cuatro (inmuebles, comisiones, cuotas pendientes,
          contratos en curso); lo de captación vive en su tarjeta. */}
      <div className="rounded-lg border border-border bg-card p-5" data-testid="resumen-recaudo-del-mes">
        <CifraHeroe
          rotulo={t('inmobiliaria.dashboard.kpi.monthlyCollection')}
          cifra={plata(kpis.collectedRevenue)}
          contexto={
            <>
              {tr('de {esperado} esperados', { esperado: plata(kpis.expectedRevenue) })} · {currentMonthLabel}
              {(() => {
                const v = laVariacion(kpis.collectedRevenue, kpis.collectionTrend);
                return v ? (
                  <span className={v.isPositive ? 'text-fg-muted' : 'text-danger'} data-testid="resumen-variacion">
                    {' · '}
                    {v.isPositive ? '+' : ''}
                    {tasaEnPantalla(v.value, Number.isInteger(v.value) ? 0 : 1)} {t('inmobiliaria.common.vsLastMonth')}
                  </span>
                ) : null;
              })()}
            </>
          }
          total={kpis.expectedRevenue}
          tramos={[
            { clave: 'recaudado', etiqueta: t('inmobiliaria.dashboard.financial.collected'), monto: kpis.collectedRevenue, tono: 'exito', cifra: plata(kpis.collectedRevenue), siempre: true },
            /* Revisora r24 #2: la barra ES la leyenda —cada tramo con su monto (lo que falta = por vencer + en
               mora)— y los giros, que son un conteo, se fueron a «Para atender». */
            { clave: 'pendiente', etiqueta: tr('Por vencer'), monto: porVencer, tono: 'neutro', cifra: plata(porVencer), siempre: true },
            { clave: 'mora', etiqueta: t('inmobiliaria.dashboard.financial.late'), monto: enMoraDelMes, tono: 'critico', cifra: plata(enMoraDelMes), siempre: enMoraDelMes > 0 },
          ]}
          pie={
            /* El pie: la tasa, con qué fórmula y sobre qué cifras se midió (la base puede ser lo emitido,
               que no es lo esperado de arriba). El enlace a reportes subió al encabezado. */
            <div className="border-t border-border-faint pt-3">
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                {/* Con qué fórmula se midió: «Recaudo sobre lo causado» y «Pagado de lo emitido» son
                    dos números distintos. */}
                <span>
                  <span className="font-mono tabular-nums text-fg" data-testid="resumen-tasa-de-recaudo">
                    {tasaEnPantalla(tasaDeRecaudo)}
                  </span>
                  {' · '}
                  <MonoLabel data-testid="resumen-rotulo-de-la-tasa">{rotuloDeLaTasa}</MonoLabel>
                </span>
                {/* Revisora r25: sobre lo causado, las cifras repetían las de arriba («$ X abonados de
                    $ Y causados» bajo «$ X de $ Y esperados»); sólo se dicen si la base es otra. */}
                {tasa.base !== BASE_POR_DEFECTO ? (
                  <span className="tabular-nums" data-testid="resumen-cifras-de-la-tasa">
                    {fraseDeLasCifras(tasa, t, plata)}
                  </span>
                ) : null}
              </p>
            </div>
          }
          data-testid="resumen-cifra-del-mes"
        />
      </div>

      {/* GLOW UP 22-10 (revisora r24 #1): lo que hay que atender, debajo de LA RESPUESTA y en UNA lista
          compacta —una línea por asunto con su «Ver»—; antes eran cuatro avisos de ancho completo (≈520 px)
          encima de la cifra. Los giros por hacer salen de la leyenda de plata y vienen aquí. */}
      {hayParaAtender ? (
      <section aria-label={tr('Para atender')} className="rounded-lg border border-border bg-card" data-testid="resumen-para-atender">
        <h2 className="border-b border-border-faint px-4 py-2.5 font-mono text-caption uppercase tracking-[0.06em] text-fg-subtle">
          {tr('Para atender')}
        </h2>
        <ul className="divide-y divide-border-faint">
          {/* 🔴 La cartera sale de las CUOTAS del contrato, no de los cobros (16-09, agencia de QA: «5 cobros
              en mora» con 97 cuotas en cartera). Los cobros quedan sólo para un back que no manda `deuda`. */}
          {carteraDelMes ? (
            carteraDelMes.cuotasEnCartera > 0 && (
              <FilaParaAtender
                tono="aviso"
                titulo={t(carteraDelMes.cuotasEnCartera === 1 ? 'inmobiliaria.dashboard.alerts.carteraDelMesUna' : 'inmobiliaria.dashboard.alerts.carteraDelMes', {
                  count: carteraDelMes.cuotasEnCartera,
                  amount: formatCurrency(carteraDelMes.carteraCop),
                })}
                etiqueta={t('inmobiliaria.dashboard.alerts.verCartera')}
                href="/panel/inmobiliaria/pagos/cartera"
                testid="alerta-cartera-del-mes"
              />
            )
          ) : cobrosEnMora.length > 0 && (
            <FilaParaAtender
              tono="aviso"
              titulo={t('inmobiliaria.dashboard.alerts.latePayments', {
                count: cobrosEnMora.length,
                amount: formatCurrency(cobrosEnMora.reduce((sum, c) => sum + c.pendingAmount, 0)),
              })}
              etiqueta={t('inmobiliaria.dashboard.alerts.viewPayments')}
              href="/panel/inmobiliaria/pagos/cartera/cobros?status=late"
              testid="alerta-cobros-en-mora"
            />
          )}
          {/* Lo que el back vio raro en la plata, ya dicho en palabras (p. ej. recibos que no bajaron cuotas). */}
          {avisosDeLaDeuda.map((aviso) => (
            <FilaParaAtender
              key={aviso}
              tono="info"
              titulo={aviso}
              etiqueta={t('inmobiliaria.dashboard.alerts.verRecaudo')}
              href="/panel/inmobiliaria/pagos/recaudo"
              testid="aviso-de-la-deuda"
            />
          ))}
          {kpis.pendingDispersions > 0 ? (
            <FilaParaAtender
              tono="info"
              titulo={kpis.pendingDispersions === 1 ? tr('1 giro por hacer a propietarios') : tr('{n} giros por hacer a propietarios', { n: miles(kpis.pendingDispersions) })}
              etiqueta={tr('Ver')}
              href="/panel/inmobiliaria/pagos/dispersiones"
              testid="resumen-giros-por-hacer"
            />
          ) : null}
          {pendingMaintenance.length > 0 && (
            <FilaParaAtender
              tono="info"
              titulo={t(pendingMaintenance.length === 1 ? 'inmobiliaria.dashboard.alerts.pendingMaintenanceUno' : 'inmobiliaria.dashboard.alerts.pendingMaintenance', { count: pendingMaintenance.length })}
              etiqueta={t('inmobiliaria.dashboard.alerts.viewRequests')}
              href="/panel/inmobiliaria/mantenimientos"
              testid="alerta-mantenimientos"
            />
          )}
        </ul>
        {/* AVISO-TIPO-DOC: sólo para quien puede completarlo; se va solo con la última ficha. */}
        <div className="empty:hidden [&>*]:rounded-none [&>*]:border-0 [&>*]:border-t [&>*]:border-border-faint">
          <AvisoTipoDeDocumento />
        </div>
      </section>

      ) : (
        <div className="empty:hidden"><AvisoTipoDeDocumento /></div>
      )}

      {/* Revisora r25: los detalles se cortaban («744 arrendadas · 84 disponibles · 2 fu…»): de a
          dos hasta 1280 px, para que la explicación que hace cuadrar las cifras se lea entera. */}
      <FranjaDeCifras aria-label={tr('El negocio')} data-testid="resumen-el-negocio" fila="xl">
        <Cifra
          etiqueta={t('inmobiliaria.dashboard.kpi.totalProperties')}
          valor={miles(kpis.totalProperties)}
          detalle={
            /*
             * `propertiesRented` y `propertiesAvailable` son del CATÁLOGO, y el total es el portafolio
             * entero: sin decir cuántos quedaron fuera, «2.655 · 725 arrendadas · 74 disponibles» no cierra
             * y parece un error de cuentas.
             */
            fueraDelCatalogo > 0
              ? `${arrendadasYDisponibles} · ${t('inmobiliaria.dashboard.kpi.outOfCatalog', { count: miles(fueraDelCatalogo) })}`
              : arrendadasYDisponibles
          }
        />
        <Cifra
          etiqueta={t('inmobiliaria.dashboard.kpi.occupancy')}
          valor={tasaEnPantalla(tasaDeOcupacion)}
          detalle={
            // El número dice QUÉ cuenta: nunca un porcentaje suelto.
            // El número dice QUÉ cuenta: nunca un porcentaje suelto (regla fijada en tasas-sin-medir).
            fueraDelCatalogo > 0
              ? `${t('inmobiliaria.dashboard.kpi.occupancyOf', { rented: miles(kpis.propertiesRented), total: miles(enCatalogo) })} · ${t('inmobiliaria.dashboard.kpi.outOfCatalog', { count: miles(fueraDelCatalogo) })}`
              : t('inmobiliaria.dashboard.kpi.occupancyOf', { rented: miles(kpis.propertiesRented), total: miles(enCatalogo) })
          }
        />
        <Cifra
          etiqueta={t('inmobiliaria.dashboard.kpi.commissions')}
          valor={formatCurrency(kpis.totalCommissions)}
          detalle={t('inmobiliaria.dashboard.kpi.commissionsGenerated')}
        />
        {/*
          🔴 Lo pendiente sale de las CUOTAS del contrato, y el número es el de Cartera —todas las cuotas
          con saldo, venzan cuando venzan (`deuda.total.cuotas`)—, con cuántas ya son cartera. Un back que no
          manda `deuda` no tiene ese número: se dice, en vez de contar cobros con el rótulo de cuotas.
        */}
        <Cifra
          etiqueta={t('inmobiliaria.dashboard.kpi.cuotasPendientes')}
          valor={deudaTotal ? miles(deudaTotal.cuotas) : SIN_MEDIR}
          detalle={
            deudaTotal
              ? t('inmobiliaria.dashboard.kpi.cuotasPendientesDetalle', { enCartera: miles(deudaTotal.cuotasEnCartera) })
              : t('inmobiliaria.dashboard.kpi.cuotasPendientesSinDato')
          }
          data-testid="resumen-cuotas-pendientes"
        />
      </FranjaDeCifras>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Activity */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-medium text-fg tracking-tight">{t('inmobiliaria.dashboard.pipeline.title')}</h2>
              <p className="text-sm text-fg-muted mt-0.5">{t('inmobiliaria.dashboard.pipeline.subtitle')}</p>
              {/* Revisora r24 #3: fuera la línea «N interesados · 0 visitas · 0 contratos», que contradecía los
                  estados de la lista de abajo: la lista ya los muestra. */}
            </div>
            <Link
              href="/panel/inmobiliaria/pipeline"
              className="flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('inmobiliaria.common.viewAll')}
            </Link>
          </div>

          {activePipeline.length > 0 ? (
            <ul className="divide-y divide-border-faint">
              {activePipeline.map((item) => (
                <PipelineMiniCard key={item.id} item={item} />
              ))}
            </ul>
          ) : vePipeline ? (
            <EmptyState
              icon={Kanban}
              title={t('inmobiliaria.dashboard.pipeline.empty')}
              description="Los candidatos en proceso aparecerán aquí a medida que avancen en Prospección."
            />
          ) : (
            <SinAcceso que="la prospección" />
          )}
        </div>

        {/* Team Performance */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-medium text-fg tracking-tight">{t('inmobiliaria.dashboard.team.title')}</h2>
              <p className="text-sm text-fg-muted mt-0.5">{t(activeAgents.length === 1 ? 'inmobiliaria.dashboard.team.activeAgentsUno' : 'inmobiliaria.dashboard.team.activeAgents', { count: activeAgents.length })}</p>
            </div>
            <Link
              href="/panel/inmobiliaria/configuracion/equipo"
              className="flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('inmobiliaria.common.viewAllM')}
            </Link>
          </div>

          {/* El bloque no tenía vacío: con 0 agentes quedaba un hueco mudo
              entre el encabezado y el separador. Y sin permiso decía «0
              agentes activos», que no es lo mismo que no poder verlos. */}
          {!veAgentes ? (
            <SinAcceso que="el equipo" />
          ) : activeAgents.length === 0 ? (
            <EmptyState
              icon={UserCircle}
              title="Todavía no hay agentes activos"
              description="Invita a alguien del equipo desde Configuración › Equipo y aquí vas a ver su carga y sus cierres."
            />
          ) : (
            <div className="space-y-4">
              {activeAgents.slice(0, 4).map((agent) => (
                <AgentMiniCard key={agent.id} agent={agent} t={t} />
              ))}
            </div>
          )}

          {/* Revisora r24 #6: los cierres en UNA línea (antes un bloque casi todo en ceros). Sin un solo
              cierre el promedio es 0 y se leería «0 días»: va «—» (mismo criterio que AgenteMetrics). */}
          <p className="mt-5 border-t border-border pt-4 text-body-sm text-fg-muted">
            {kpis.closedThisMonth === 0
              ? tr('Ningún cierre este mes')
              : t('inmobiliaria.dashboard.team.closedThisMonthLabel') + ' ' + miles(kpis.closedThisMonth)}
            {' · '}
            {tr('días al cierre')}{' '}
            <span className="font-mono tabular-nums text-fg" data-testid="resumen-dias-al-cierre">
              {kpis.avgDaysToClose > 0
                ? t('inmobiliaria.dashboard.team.days', { count: kpis.avgDaysToClose })
                : SIN_MEDIR}
            </span>
          </p>
        </div>
      </div>

    </div>
    </CrossFade>
  );
}
