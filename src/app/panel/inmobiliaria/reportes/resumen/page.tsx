'use client';

import Link from 'next/link';
import { AlertaAccionable } from '@/components/ui/alerta-accionable';
// AVISO-TIPO-DOC (05-10-2026): los propietarios cuyo documento frena la factura por mandato.
import { AvisoTipoDeDocumento } from '@/components/inmobiliaria/AvisoTipoDeDocumento';
import { Buildings, CurrencyDollar, ArrowRight, Kanban, UserCircle, House, FileText } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Cifra, CrossFade, FranjaDeCifras } from '@leasefy/cadence';
import { Button, EmptyState } from '@/components/ui';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { useTr } from '@/lib/i18n/use-tr';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { PageGuard } from '@/components/auth/PageGuard';
import { MonoLabel, BrandDot } from '@/components/brand';
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
import { claveDelRotulo, fraseDeLasCifras, tasaDelTablero } from '@/lib/tasa-de-recaudo';
import { formatCurrency, getPipelineStageInfo } from '@/lib/types/inmobiliaria';
import type { PipelineItem, Agente } from '@/lib/types/inmobiliaria';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';

/**
 * Pipeline Mini Card
 */
function PipelineMiniCard({ item }: { item: PipelineItem }) {
  const stageInfo = getPipelineStageInfo(item.stage);

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface-muted p-3">
      {/* QA 20-10: sin foto, la caja era del mismo color que la fila y quedaba un
          hueco vacío a la izquierda: sin foto va el ícono del inmueble. */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface">
        {item.propertyThumbnail ? (
          <img
            src={item.propertyThumbnail}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <House weight="duotone" className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg truncate">
          {item.candidateName}
        </p>
        <p className="text-caption text-fg-muted truncate">
          {item.propertyTitle}
        </p>
      </div>
      <span className={cn('px-2 py-1 rounded-full text-caption font-medium', stageInfo?.color)}>
        {stageInfo?.labelEs}
      </span>
    </div>
  );
}

/**
 * Agent Mini Card
 */
function AgentMiniCard({
  agent,
  t,
}: {
  agent: Agente;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-full bg-surface-muted text-fg-muted flex items-center justify-center font-mono text-caption font-medium">
        {agent.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg truncate">
          {agent.name}
        </p>
        <p className="text-caption text-fg-muted">
          {t(agent.metrics.closedThisMonth === 1 ? 'inmobiliaria.dashboard.team.closedThisMonthUno' : 'inmobiliaria.dashboard.team.closedThisMonth', { count: agent.metrics.closedThisMonth })}
        </p>
      </div>
      {/* 🔴 17-09: acá iba la comisión del asesor. Se paga por fuera de
          Leasefy y ningún inmueble tenía asesor asignado, así que era un «$0»
          que se leía como un mal mes. Ahora: los inmuebles que tiene a cargo. */}
      <span
        className="font-heading text-sm font-medium text-fg tabular-nums"
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
      <EncabezadoDePantalla
        seccion={t('inmobiliaria.reportes.title')}
        titulo={t('inmobiliaria.nav.resumenDelNegocio')}
        descripcion={tr('Cómo va el mes y qué atender primero.')}
        acciones={
          <>
            <Button size="sm" variant="outline" hideArrow asChild>
              <Link href="/panel/inmobiliaria/propietarios?nuevo=true" data-testid="resumen-nuevo-propietario">
                <UserCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('inmobiliaria.dashboard.quickActions.newOwner')}
              </Link>
            </Button>
            <Button size="sm" variant="outline" hideArrow asChild>
              <Link href="/panel/inmobiliaria/inmuebles/nuevo" data-testid="resumen-nueva-consignacion">
                <Buildings className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('inmobiliaria.dashboard.quickActions.newConsignment')}
              </Link>
            </Button>
            <Button size="sm" variant="outline" hideArrow asChild>
              <Link href="/panel/inmobiliaria/pagos/cartera/cobros?status=pending" data-testid="resumen-hacer-recibo">
                <CurrencyDollar className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('recibos.hacer')}
              </Link>
            </Button>
          </>
        }
      />

      {/* Lo que hay que atender, PRIMERO: antes estaba debajo de los atajos,
          después de captación y equipo — lo urgente era lo último que se veía.
          Juntas y cerca (una lista), y sin hueco cuando no hay nada. */}
      <section aria-label={tr('Para atender')} className="space-y-3 empty:hidden" data-testid="resumen-para-atender">
        {/* Alertas: una por asunto, cada una con el número, qué hacer y el botón.

            🔴 La cartera sale de las CUOTAS del contrato, no de los cobros. Visto
            en vivo el 16-09 en la agencia de QA: la alerta decía «5 cobros en mora
            por $11.705.223» con 97 cuotas del mes en cartera por $321.945.650 —el
            número estaba en `kpis.deuda` y nadie lo leía—. Los cobros quedan sólo
            para un back que todavía no manda `deuda`. */}
        {carteraDelMes ? (
          carteraDelMes.cuotasEnCartera > 0 && (
            <AlertaAccionable
              severidad="warning"
              titulo={t(carteraDelMes.cuotasEnCartera === 1 ? 'inmobiliaria.dashboard.alerts.carteraDelMesUna' : 'inmobiliaria.dashboard.alerts.carteraDelMes', {
                count: carteraDelMes.cuotasEnCartera,
                amount: formatCurrency(carteraDelMes.carteraCop),
              })}
              accion={{ label: t('inmobiliaria.dashboard.alerts.verCartera'), href: '/panel/inmobiliaria/pagos/cartera' }}
              data-testid="alerta-cartera-del-mes"
            >
              {t('inmobiliaria.dashboard.alerts.carteraDelMesDetalle')}
            </AlertaAccionable>
          )
        ) : cobrosEnMora.length > 0 && (
          <AlertaAccionable
            severidad="warning"
            titulo={t('inmobiliaria.dashboard.alerts.latePayments', {
              count: cobrosEnMora.length,
              amount: formatCurrency(cobrosEnMora.reduce((sum, c) => sum + c.pendingAmount, 0)),
            })}
            accion={{ label: t('inmobiliaria.dashboard.alerts.viewPayments'), href: '/panel/inmobiliaria/pagos/cartera/cobros?status=late' }}
            data-testid="alerta-cobros-en-mora"
          >
            {t('inmobiliaria.dashboard.alerts.latePaymentsDetalle')}
          </AlertaAccionable>
        )}
        {/* Lo que el back vio raro en la plata y ya viene dicho en palabras. El
            caso que lo pidió: «Recaudo del mes $0» con $8.200.000 en recibos de
            caja que no bajaron ninguna cuota; sin el aviso el cero era
            inexplicable. */}
        {avisosDeLaDeuda.map((aviso) => (
          <AlertaAccionable
            key={aviso}
            severidad="info"
            titulo={aviso}
            accion={{ label: t('inmobiliaria.dashboard.alerts.verRecaudo'), href: '/panel/inmobiliaria/pagos/recaudo' }}
            data-testid="aviso-de-la-deuda"
          />
        ))}
        {/* AVISO-TIPO-DOC: sólo para quien puede completarlo (administrador, o
            contador que edita propietarios); se va solo con la última ficha. */}
        <AvisoTipoDeDocumento />
        {pendingMaintenance.length > 0 && (
          <AlertaAccionable
            severidad="info"
            titulo={t(pendingMaintenance.length === 1 ? 'inmobiliaria.dashboard.alerts.pendingMaintenanceUno' : 'inmobiliaria.dashboard.alerts.pendingMaintenance', { count: pendingMaintenance.length })}
            accion={{ label: t('inmobiliaria.dashboard.alerts.viewRequests'), href: '/panel/inmobiliaria/mantenimientos' }}
            data-testid="alerta-mantenimientos"
          >
            {t('inmobiliaria.dashboard.alerts.pendingMaintenanceDetalle')}
          </AlertaAccionable>
        )}
      </section>

      {/* GLOW UP 22-10 (UX, al nivel de Deuda del mes): LA RESPUESTA del mes en una cifra —lo recaudado
          de lo esperado, con su barra (recaudado · por cobrar) y la mora en la leyenda—, con la tasa y su
          fórmula debajo. Antes eran trece cifras: cuatro tarjetas grandes, cuatro chicas y un resumen
          financiero de cinco. Debajo, UNA franja de cuatro (inmuebles, comisiones, cuotas pendientes,
          contratos en curso); lo de captación vive en su tarjeta. */}
      <div className="rounded-lg border border-border bg-card p-5" data-testid="resumen-recaudo-del-mes">
        <CifraHeroe
          rotulo={t('inmobiliaria.dashboard.kpi.monthlyCollection')}
          cifra={formatCurrency(kpis.collectedRevenue)}
          contexto={
            <>
              {tr('de {esperado} esperados', { esperado: formatCurrency(kpis.expectedRevenue) })} · {currentMonthLabel}
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
            { clave: 'recaudado', etiqueta: t('inmobiliaria.dashboard.financial.collected'), monto: kpis.collectedRevenue, tono: 'exito', cifra: formatCurrency(kpis.collectedRevenue), siempre: true },
            { clave: 'pendiente', etiqueta: t('inmobiliaria.dashboard.financial.pendingLabel'), monto: Math.max(0, kpis.expectedRevenue - kpis.collectedRevenue), tono: 'neutro', cifra: formatCurrency(kpis.pendingCollections), siempre: true },
            { clave: 'mora', etiqueta: t('inmobiliaria.dashboard.financial.late'), monto: 0, tono: 'critico', cifra: <span className="text-danger">{formatCurrency(kpis.lateCollections)}</span>, siempre: kpis.lateCollections > 0 },
            { clave: 'giros', etiqueta: t('inmobiliaria.dashboard.financial.pendingDispersions'), monto: 0, tono: 'neutro', cifra: kpis.pendingDispersions, siempre: true },
          ]}
          pie={
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border-faint pt-3">
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
                <span className="tabular-nums" data-testid="resumen-cifras-de-la-tasa">
                  {fraseDeLasCifras(tasa, t, formatCurrency)}
                </span>
              </p>
              <Link
                href="/panel/inmobiliaria/reportes"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {t('inmobiliaria.dashboard.financial.viewFullReports')}
              </Link>
            </div>
          }
          data-testid="resumen-cifra-del-mes"
        />
      </div>

      <FranjaDeCifras aria-label={tr('El negocio')} data-testid="resumen-el-negocio">
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
              <h2 className="flex items-center gap-2 text-base font-medium text-fg tracking-tight"><BrandDot />{t('inmobiliaria.dashboard.pipeline.title')}</h2>
              <p className="text-sm text-fg-muted mt-0.5">{t('inmobiliaria.dashboard.pipeline.subtitle')}</p>
              {/* Lo de captación, aquí y no arriba: arriba van las cifras del dinero y del portafolio. */}
              <p className="mt-1 font-mono text-caption tabular-nums text-fg-muted" data-testid="resumen-captacion">
                {miles(kpis.activeLeads)} {t('inmobiliaria.dashboard.kpi.activeLeads').toLowerCase()} ·{' '}
                {miles(kpis.scheduledVisits)} {t('inmobiliaria.dashboard.kpi.scheduledVisits').toLowerCase()} ·{' '}
                {miles(kpis.contractsInProgress)} {t('inmobiliaria.dashboard.kpi.contractsInProgress').toLowerCase()}
              </p>
            </div>
            <Link
              href="/panel/inmobiliaria/pipeline"
              className="flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('inmobiliaria.common.viewAll')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {activePipeline.length > 0 ? (
            <div className="space-y-3">
              {activePipeline.map((item) => (
                <PipelineMiniCard key={item.id} item={item} />
              ))}
            </div>
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
              <h2 className="flex items-center gap-2 text-base font-medium text-fg tracking-tight"><BrandDot />{t('inmobiliaria.dashboard.team.title')}</h2>
              <p className="text-sm text-fg-muted mt-0.5">{t(activeAgents.length === 1 ? 'inmobiliaria.dashboard.team.activeAgentsUno' : 'inmobiliaria.dashboard.team.activeAgents', { count: activeAgents.length })}</p>
            </div>
            <Link
              href="/panel/inmobiliaria/configuracion/equipo"
              className="flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('inmobiliaria.common.viewAllM')}
              <ArrowRight className="h-4 w-4" />
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

          <div className="mt-5 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-muted">{t('inmobiliaria.dashboard.team.closedThisMonthLabel')}</span>
              <span className="font-medium text-fg">{kpis.closedThisMonth}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-fg-muted">{t('inmobiliaria.dashboard.team.avgDaysToClose')}</span>
              {/* Sin un solo cierre el promedio es 0 y se leía «0 días»: una
                  inmobiliaria que cierra en el acto. Mismo criterio que
                  AgenteMetrics, que ya escondía el dato sin cierres. */}
              <span className="font-medium text-fg" data-testid="resumen-dias-al-cierre">
                {kpis.avgDaysToClose > 0
                  ? t('inmobiliaria.dashboard.team.days', { count: kpis.avgDaysToClose })
                  : SIN_MEDIR}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
    </CrossFade>
  );
}
