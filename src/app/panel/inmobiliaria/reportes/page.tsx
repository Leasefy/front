'use client';
import { PageGuard } from '@/components/auth/PageGuard';

/**
 * Centro de reportes — `/panel/inmobiliaria/reportes`.
 *
 * GLOW UP 21-10 · el trabajo de esta pantalla es UNO: «bajar el reporte que necesito, con las
 * fechas que necesito». Antes eran ocho tarjetas grandes con buscador, pestañas por categoría,
 * vista de tarjetas o lista, favoritos y un período escondido en un desplegable que sólo cambiaba
 * DOS de los ocho archivos: quien elegía agosto bajaba la cartera y se enteraba en el aviso del
 * final de que era «la foto de hoy».
 *
 * Ahora es una sola tabla, en el orden en que se usa:
 *   1. Los que salen sin elegir fechas (la cartera, los vencimientos, la ocupación, el flujo de
 *      caja): un toque y bajan. Cada fila dice con qué fechas sale.
 *   2. Los del período: el selector va EN ESE GRUPO, encima de los dos que de verdad lo usan.
 *   3. Los que no se bajan desde aquí, con a dónde ir.
 * Con los ocho a la vista en una tabla ya no hacen falta el buscador, las pestañas, los
 * favoritos ni las dos vistas. La regla de qué fechas lleva cada archivo vive en
 * `lib/reportes/exportables.ts` (`comoSale`, `parametrosDelPeriodo`).
 */

import { useState, useMemo, useCallback, type ElementType } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CrossFade } from '@leasefy/cadence';
import {
  FileText,
  Clock,
  Users,
  ChartPie,
  Calendar,
  ChartBar,
  ChartLineUp,
  CurrencyDollar,
  DownloadSimple,
  Lock,
} from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { useTr, useLocaleDelPanel, useLocaleDeFechas } from '@/lib/i18n/use-tr';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { RangoDeFechas, rangoDelAtajo, hoyEnColombia, type AtajoDePeriodo } from '@/components/contabilidad/RangoDeFechas';
import type { ReportDefinition, ReportId } from '@/lib/types/inmobiliaria';
import { REPORT_DEFINITIONS } from '@/lib/constants/inmobiliaria-data';
import {
  comoSeBaja,
  comoSale,
  relacionConElPeriodo,
  nombreDelArchivo,
  parametrosDelPeriodo,
  rutaDeExport,
  descargarBlob,
  type ComoSale,
  type PeriodoDeReportes,
} from '@/lib/reportes/exportables';
import { ReporteViewer, type ReporteFiltersState } from '@/components/inmobiliaria';
import { apiClient, ApiError } from '@/lib/api/client';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { abrirCentroDeProcesos, procesosApi, type PedidoDeReporte } from '@/lib/api/procesos.service';
import { useAgencyPlan } from '@/lib/hooks/useAgencyPlan';

const ICONOS: Record<string, ElementType> = {
  FileText,
  Clock,
  Users,
  ChartPie,
  Calendar,
  ChartBar,
  ChartLineUp,
  CurrencyDollar,
};

/** Los atajos de los reportes: el trimestre sí sirve aquí (la rentabilidad); «todo» no existe. */
const ATAJOS_DE_REPORTES: readonly AtajoDePeriodo[] = ['mes', 'anterior', 'trimestre', 'anio', 'otro'];

/** El plan Pro lo cambia sólo Leasefy: la página dice «Habla con Leasefy». */
const DONDE_SE_PIDE_EL_PLAN = '/panel/inmobiliaria/upgrade';

type ClaveDelGrupo = 'sin-fechas' | 'del-periodo' | 'aparte';

function grupoDe(id: ReportId): ClaveDelGrupo {
  const como = comoSeBaja(id);
  if (!como.disponible) return 'aparte';
  return relacionConElPeriodo(como.tipo) === 'del-periodo' ? 'del-periodo' : 'sin-fechas';
}

const MESES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-10` → «oct 2026». */
function mesCorto(ym: string, en: boolean): string {
  const [anio, mes] = ym.split('-').map(Number);
  return `${(en ? MESES_EN : MESES_ES)[mes - 1]} ${anio}`;
}

/** «oct 2026», «jul – sep 2026» o «nov 2025 – oct 2026». */
function mesesCortos(desde: string, hasta: string, en: boolean): string {
  if (desde === hasta) return mesCorto(desde, en);
  const nombres = en ? MESES_EN : MESES_ES;
  if (desde.slice(0, 4) === hasta.slice(0, 4)) {
    return `${nombres[Number(desde.slice(5, 7)) - 1]} – ${mesCorto(hasta, en)}`;
  }
  return `${mesCorto(desde, en)} – ${mesCorto(hasta, en)}`;
}

function ReportesContent() {
  const { t } = useI18n();
  const tr = useTr();
  const en = useLocaleDelPanel() === 'en';
  const localeDeFechas = useLocaleDeFechas();
  const router = useRouter();
  const { hasAdvancedReports } = useAgencyPlan();

  const [periodo, setPeriodo] = useState<PeriodoDeReportes>(() => {
    const r = rangoDelAtajo('mes');
    return { start: r.desde, end: r.hasta };
  });
  /** Cuándo se bajó cada uno en esta visita (sólo si el archivo llegó de verdad). */
  const [bajadoA, setBajadoA] = useState<Partial<Record<ReportId, string>>>({});
  const [bajando, setBajando] = useState<Set<ReportId>>(new Set());
  /** «Bajar todos» mandándose al centro de procesos. */
  const [enviandoTodos, setEnviandoTodos] = useState(false);
  const [elegido, setElegido] = useState<ReportDefinition | null>(null);
  const [cajonAbierto, setCajonAbierto] = useState(false);

  const bloqueado = useCallback(
    (r: ReportDefinition) => Boolean(r.premium) && !hasAdvancedReports,
    [hasAdvancedReports],
  );

  const grupos = useMemo(() => {
    const de = (clave: ClaveDelGrupo) => REPORT_DEFINITIONS.filter((r) => grupoDe(r.id) === clave);
    return { sinFechas: de('sin-fechas'), delPeriodo: de('del-periodo'), aparte: de('aparte') };
  }, []);

  /** Los que entran en «Bajar todos»: se pueden bajar y el plan los incluye. */
  const bajables = useMemo(
    () => REPORT_DEFINITIONS.filter((r) => comoSeBaja(r.id).disponible && !bloqueado(r)),
    [bloqueado],
  );

  /** Lo que el ReporteViewer espera (sólo usa el período). */
  const filtrosDelCajon: ReporteFiltersState = useMemo(
    () => ({ period: periodo, zone: null, category: 'all', search: '', favoritesOnly: false }),
    [periodo],
  );

  /**
   * Bajar el reporte. De verdad: el back arma el CSV a pedido y la fila sólo dice «lo bajaste»
   * si el archivo llegó (ver la historia en `lib/reportes/exportables.ts`).
   */
  const bajarReporte = useCallback(
    async (report: ReportDefinition): Promise<boolean> => {
      const como = comoSeBaja(report.id);
      if (!como.disponible) {
        toast.info(`${report.title}: todavía no se puede descargar`, {
          description: como.motivo,
          action: como.dondeSiHay
            ? { label: como.dondeSiHay.label, onClick: () => router.push(como.dondeSiHay!.href) }
            : undefined,
        });
        return false;
      }

      setBajando((prev) => new Set([...prev, report.id]));
      try {
        // RP1: el período elegido viaja en la forma que cada tipo acepta, y el aviso dice qué hizo con él.
        const { params, nota } = parametrosDelPeriodo(como.tipo, periodo);
        const blob = await apiClient.getBlob(rutaDeExport(como.tipo, params));
        descargarBlob(blob, nombreDelArchivo(como.tipo, new Date().toISOString().slice(0, 10)));
        setBajadoA((prev) => ({ ...prev, [report.id]: new Date().toISOString() }));
        toast.success('Descargado', { description: `${report.title} · CSV · ${nota}` });
        return true;
      } catch (error) {
        // El 403 con su texto propio; lo demás con la regla de oro (02-10-2026).
        toast.error('No pudimos generar el reporte', {
          description:
            error instanceof ApiError && error.status === 403
              ? 'Tu rol no incluye descargar reportes.'
              : mensajeParaLaPersona(error, {
                  porDefecto: 'Prueba de nuevo en un momento.',
                  accion: 'generar el reporte',
                }),
        });
        return false;
      } finally {
        setBajando((prev) => {
          const next = new Set(prev);
          next.delete(report.id);
          return next;
        });
      }
    },
    [router, periodo],
  );

  const verReporte = useCallback((report: ReportDefinition) => {
    setElegido(report);
    setCajonAbierto(true);
  }, []);

  const cerrarCajon = useCallback(() => {
    setCajonAbierto(false);
    setTimeout(() => setElegido(null), 300);
  }, []);

  /**
   * Bajar todos: UN archivo, armado en el CENTRO DE PROCESOS (Nico, 01-10: «esas cargas ¿por qué
   * no las metes al centro de procesos?»). Cada reporte va con los parámetros del período que
   * acepta, igual que su botón; los que el plan no incluye no entran.
   */
  const bajarTodos = useCallback(async () => {
    const pedidos: PedidoDeReporte[] = [];
    for (const r of bajables) {
      const como = comoSeBaja(r.id);
      if (!como.disponible) continue;
      pedidos.push({ tipo: como.tipo, ...parametrosDelPeriodo(como.tipo, periodo).params });
    }
    if (pedidos.length === 0) return;

    setEnviandoTodos(true);
    try {
      const { procesoId } = await procesosApi.exportarReportes(pedidos);
      abrirCentroDeProcesos({ procesoId });
    } catch (error) {
      toast.error('No pudimos armar el archivo', {
        description:
          error instanceof ApiError && error.status === 403
            ? 'Tu rol no incluye descargar reportes.'
            : mensajeParaLaPersona(error, {
                porDefecto: 'Prueba de nuevo en un momento.',
                accion: 'armar el archivo de los reportes',
              }),
      });
    } finally {
      setEnviandoTodos(false);
    }
  }, [bajables, periodo]);

  /** «Con qué fechas sale», en una etiqueta corta (va en mono, en mayúsculas). */
  const etiquetaDeFechas = useCallback(
    (como: ComoSale): { etiqueta: string; aviso?: string } => {
      switch (como.modo) {
        case 'meses':
          return { etiqueta: mesesCortos(como.desde, como.hasta, en) };
        case 'un-mes':
          return {
            etiqueta: mesCorto(como.mes, en),
            aviso: como.abarcaMas ? tr('Sale de a un mes: el primero del período.') : undefined,
          };
        case 'ultimos-meses':
          return { etiqueta: tr('Últimos {n} meses', { n: como.meses }) };
        case 'mes-en-curso':
          return { etiqueta: tr('El mes en curso') };
        case 'hoy': {
          const [, mm, dd] = hoyEnColombia().split('-');
          return { etiqueta: tr('Hoy, {dia}', { dia: `${Number(dd)} ${(en ? MESES_EN : MESES_ES)[Number(mm) - 1]}` }) };
        }
      }
    },
    [en, tr],
  );

  const horaDe = (iso: string) =>
    new Date(iso).toLocaleTimeString(localeDeFechas, { hour: 'numeric', minute: '2-digit' });

  function FilaDelReporte({ report }: { report: ReportDefinition }) {
    const Icono = ICONOS[report.icon] ?? FileText;
    const como = comoSeBaja(report.id);
    const cerrado = bloqueado(report);
    const fechas = como.disponible ? etiquetaDeFechas(comoSale(como.tipo, periodo)) : null;
    const enCurso = bajando.has(report.id);
    const bajado = bajadoA[report.id];

    let saleCon: React.ReactNode;
    if (cerrado) saleCon = tr('Viene con el plan Pro');
    else if (fechas) saleCon = fechas.etiqueta;
    else if (como.disponible === false && como.dondeSiHay) saleCon = tr('Uno por propietario');
    else saleCon = tr('Sólo para ver');

    return (
      <li
        className="grid gap-3 px-4 py-3.5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(150px,210px)_236px] lg:items-center lg:gap-6"
        data-testid="fila-del-reporte"
        data-reporte={report.id}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface-muted text-fg-muted dark:bg-ink dark:text-fg-subtle"
            aria-hidden="true"
          >
            {cerrado ? <Lock className="h-[18px] w-[18px]" /> : <Icono className="h-[18px] w-[18px]" />}
          </span>
          <div className="min-w-0">
            <h3 className="flex flex-wrap items-center gap-2 text-body-sm font-medium text-fg">
              {tr(report.title)}
              {cerrado && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  Pro
                </Badge>
              )}
            </h3>
            <p className="text-caption text-fg-muted line-clamp-2 lg:line-clamp-1">{tr(report.description)}</p>
            {bajado && (
              <p className="mt-0.5 text-caption text-fg-subtle" data-testid="bajado-a-las">
                {tr('Lo bajaste a las {hora}', { hora: horaDe(bajado) })}
              </p>
            )}
          </div>
        </div>

        {/* Con qué fechas sale: cambia al tocar otro período, y se nota. */}
        <div className="min-w-0 pl-12 lg:pl-0">
          <CrossFade swapKey={String(saleCon)} direction="none">
            <p
              className={cn(
                'font-mono text-[12px] font-medium uppercase tracking-[0.05em]',
                cerrado || !como.disponible ? 'text-fg-subtle' : 'text-fg',
              )}
              data-testid="sale-con"
            >
              {saleCon}
            </p>
            {fechas?.aviso && !cerrado && (
              <p className="mt-0.5 text-caption text-warning" data-testid="aviso-de-fechas">
                {fechas.aviso}
              </p>
            )}
          </CrossFade>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pl-12 lg:justify-end lg:pl-0">
          {cerrado ? (
            <Button asChild variant="secondary" size="sm" hideArrow>
              <Link href={DONDE_SE_PIDE_EL_PLAN}>{tr('Hablar con Leasefy')}</Link>
            </Button>
          ) : como.disponible ? (
            <>
              <Button variant="ghost" size="sm" hideArrow onClick={() => verReporte(report)}>
                {tr('Ver')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                hideArrow
                isLoading={enCurso}
                disabled={enCurso}
                onClick={() => void bajarReporte(report)}
                aria-label={tr('Bajar {reporte} en CSV', { reporte: tr(report.title) })}
              >
                {!enCurso && <DownloadSimple className="mr-1.5 h-4 w-4" aria-hidden="true" />}
                {tr('Bajar CSV')}
              </Button>
            </>
          ) : como.dondeSiHay ? (
            <Button asChild variant="secondary" size="sm" hideArrow>
              <Link href={como.dondeSiHay.href}>{tr(como.dondeSiHay.label)}</Link>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" hideArrow onClick={() => verReporte(report)}>
              {tr('Ver')}
            </Button>
          )}
        </div>
      </li>
    );
  }

  const cabeceraDelGrupo = 'flex flex-col gap-3 border-y border-border bg-surface-muted/50 px-4 py-3 sm:px-5 dark:bg-ink/40';
  const tituloDelGrupo = 'font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-fg-muted';

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <EncabezadoDePantalla
        titulo={t('inmobiliaria.reportes.title')}
        descripcion={tr('Baja el reporte que necesitas. Cada uno dice con qué fechas sale.')}
        acciones={
          bajables.length > 1 ? (
            <Button
              variant="secondary"
              size="sm"
              hideArrow
              onClick={() => void bajarTodos()}
              disabled={enviandoTodos || bajando.size > 0}
              isLoading={enviandoTodos}
              data-testid="bajar-todos"
            >
              {!enviandoTodos && <DownloadSimple className="mr-2 h-4 w-4" aria-hidden="true" />}
              {tr('Bajar los {n} en un archivo', { n: bajables.length })}
            </Button>
          ) : undefined
        }
      />

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Las columnas, una vez arriba (en el celular cada fila dice lo suyo). */}
        <div
          className="hidden px-5 py-2.5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(150px,210px)_236px] lg:gap-6"
          aria-hidden="true"
        >
          <span className={tituloDelGrupo}>{tr('Reporte')}</span>
          <span className={tituloDelGrupo}>{tr('Sale con')}</span>
          <span />
        </div>

        <section aria-labelledby="grupo-sin-fechas" data-testid="grupo-sin-fechas">
          <div className={cn(cabeceraDelGrupo, 'border-t-0 lg:border-t')}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 id="grupo-sin-fechas" className={tituloDelGrupo}>
                {tr('Sin elegir fechas')}
              </h2>
              <p className="text-caption text-fg-subtle">{tr('Salen igual cualquier día: un toque y bajan.')}</p>
            </div>
          </div>
          <ul className="divide-y divide-border">
            {grupos.sinFechas.map((r) => (
              <FilaDelReporte key={r.id} report={r} />
            ))}
          </ul>
        </section>

        <section aria-labelledby="grupo-del-periodo" data-testid="grupo-del-periodo">
          <div className={cabeceraDelGrupo}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 id="grupo-del-periodo" className={tituloDelGrupo}>
                {tr('Del período que elijas')}
              </h2>
              <p className="text-caption text-fg-subtle">{tr('Estos dos salen con las fechas que marques aquí.')}</p>
            </div>
            <RangoDeFechas
              atajos
              opciones={ATAJOS_DE_REPORTES}
              desde={periodo.start}
              hasta={periodo.end}
              onChange={({ desde, hasta }) => setPeriodo({ start: desde, end: hasta })}
            />
          </div>
          <ul className="divide-y divide-border">
            {grupos.delPeriodo.map((r) => (
              <FilaDelReporte key={r.id} report={r} />
            ))}
          </ul>
        </section>

        {grupos.aparte.length > 0 && (
          <section aria-labelledby="grupo-aparte" data-testid="grupo-aparte">
            <div className={cabeceraDelGrupo}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 id="grupo-aparte" className={tituloDelGrupo}>
                  {tr('No se bajan desde aquí')}
                </h2>
                <p className="text-caption text-fg-subtle">{tr('Se ven aquí o se arman en otra pantalla.')}</p>
              </div>
            </div>
            <ul className="divide-y divide-border">
              {grupos.aparte.map((r) => (
                <FilaDelReporte key={r.id} report={r} />
              ))}
            </ul>
          </section>
        )}
      </div>

      <ReporteViewer
        isOpen={cajonAbierto}
        onClose={cerrarCajon}
        report={elegido}
        filters={filtrosDelCajon}
        onExport={async () => {
          if (elegido) await bajarReporte(elegido);
        }}
      />
    </div>
  );
}

export default function ReportesPage() {
  return (
    <PageGuard module="reportes">
      <ReportesContent />
    </PageGuard>
  );
}
