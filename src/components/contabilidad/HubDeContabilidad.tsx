'use client';

/**
 * La portada de Contabilidad: lo que la inmobiliaria hace todos los días con
 * el libro, no sólo a dónde ir.
 *
 * ── Qué se agregó y por qué (Nico, 2026-09-03) ────────────────────────────
 *
 * Antes eran tres cifras y cuatro enlaces: una portada que no servía para
 * nada más que navegar. Lo que una inmobiliaria hace acá cada mes es cerrar
 * el mes, mirar si algo quedó sin asentar y mandarle el libro al contador —
 * así que eso es lo que está:
 *
 *   · Alertas    — sólo las derivables de un endpoint real, con la forma que
 *                  pidió Nico: qué pasó (con el número) · qué hacer · botón.
 *   · Últimos    — los 5 más recientes: cuando «Asientos este mes» dice 0
 *     asientos     porque recién arrancó el mes, la lista muestra que el
 *                  libro NO está vacío.
 *   · Contador   — el libro del rango en CSV (el back no exporta: se arma
 *                  acá con `GET /asientos`) y los dos informes que pide.
 *   · Cierre     — el mismo `CierreDePeriodo` del libro, sin duplicar lógica.
 *
 * ── Ningún número se dice dos veces ───────────────────────────────────────
 *
 * Por eso «Cerrada hasta» salió de la fila de cifras: lo dice el bloque de
 * cierre, que además es donde se actúa sobre eso. Y «Asientos este mes» lleva
 * la fecha del último asiento SÓLO cuando el mes va en cero — un cero sin
 * contexto se lee como «acá no hay nada».
 *
 * ── Cada consulta falla por separado, y lo DICE (auditoría 13-09, CT1) ─────
 *
 * Siguen siendo siete pedidos independientes (`allSettled`): si el balance no
 * responde, las cuentas activas siguen apareciendo. Lo que cambió es qué pasa
 * con el que falla. Antes quedaba en `null` y sólo un `title` al pasar el
 * mouse lo contaba; peor, una revisión caída (asientos faltantes, balance) no
 * generaba alerta, y una portada sin alertas se lee como «todo en orden».
 * Ahora cada tarjeta que falló muestra «No cargó: <motivo>» con un
 * «Reintentar» que vuelve a pedir SÓLO esa consulta.
 *
 * ── Reprocesar pide confirmación (CT2) ────────────────────────────────────
 *
 * «Reprocesar» escribía asientos en el libro con un clic. Ahora abre un
 * diálogo que dice cuántos movimientos y de qué tipo se van a asentar. Lo que
 * dice está verificado contra `asientos-automaticos.service.ts#reprocesar`:
 * asienta cobros, recibos y lotes que NO tienen asiento; los que ya lo tienen
 * no se tocan.
 *
 * ── Lo que se agregó el 18-09 (la contabilidad completa, §8) ───────────────
 *
 * Cuatro destinos nuevos y cuatro consultas más, cada una con su alerta:
 *
 *   rubros    → `GET /mapeo/rubros`      · mapeo de rubros del P&G incompleto
 *   facturas  → `GET /gastos/facturas`   · facturas de proveedor sin causar
 *   lotes     → `GET /egresos/lotes`     · lotes de egreso por aprobar
 *   exogena   → `GET /exogena?anio=`     · formatos sin visto bueno del contador
 *
 * 🔴 Las cuatro viven en migraciones sin aplicar. Cuando una responde
 * `disponible: false` **no se genera alerta y tampoco se reporta como revisión
 * caída**: no hay nada que revisar todavía, y un renglón rojo por una pieza que
 * no existe entrena a ignorar los renglones rojos. Lo que sí entra a
 * «No pude revisar todo el libro» es el FALLO — un 500, una red caída—, porque
 * ahí «no hay alertas» deja de significar «está todo en orden».
 *
 * El año de la exógena es el ANTERIOR: la de 2026 se presenta en 2027, y en
 * septiembre de 2026 sus formatos están a medio año de estar completos. Gritar
 * por el año en curso sería gritar todos los meses.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowsClockwise,
  Bank,
  BookOpenText,
  Buildings,
  CaretRight,
  ChartBar,
  ChartPieSlice,
  DownloadSimple,
  Certificate,
  FileCsv,
  Info,
  Plugs,
  Receipt,
  Scales,
  Target,
  TreeStructure,
  Warning,
  WarningCircle,
  Notebook,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CrossFade } from '@leasefy/cadence';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import { elLibroEnUnaFrase } from '@/lib/contabilidad/el-libro-en-una-frase';
import {
  contabilidadApi,
  type AsientoContable,
  type AsientosFaltantes,
  type Cierre,
} from '@/lib/api/contabilidad.service';
import { gastosApi } from '@/lib/api/gastos.service';
import { procesosApi } from '@/lib/api/procesos.service';
import { exogenaApi } from '@/lib/api/exogena.service';
import { cuentasDeLasDiferenciasApi } from '@/lib/api/cuentas-de-las-diferencias';
import {
  alertasDeContabilidad,
  describirAlerta,
  type AlertaDescrita,
  type EstadoDeExogena,
  type EstadoDeFacturas,
  type EstadoDeLotes,
  type EstadoDeRubros,
  type MesAnterior,
} from '@/lib/contabilidad/alertas';
import { faltantesSugeridos } from '@/lib/contabilidad/rubros-del-pyg';
import { formatosConFilas, formatosSinVistoBueno } from '@/lib/contabilidad/exogena';
// Sólo el nombre del archivo: armarlo ya no es tarea del navegador (CT3).
import { nombreDelCsv } from '@/lib/contabilidad/csv';
import {
  diaDe,
  diaLegible,
  hoy,
  primerDiaDelMes,
  rangoDelMesAnterior,
  rangoInvertido,
} from '@/lib/contabilidad/fechas';
import { fechaCorta } from '@/lib/fechas/fecha-de-la-casa';
import { clasificarFallo } from '@/lib/errores/clasificar';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Monto } from './Monto';
import { RangoDeFechas } from './RangoDeFechas';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { CierreDePeriodo } from './asientos/CierreDePeriodo';
import { PasosDeLaTarea, type EstadoDelPaso } from '@/components/pantalla/PasosDeLaTarea';
import { EN_CURSO_EN_EL_CENTRO } from '@/components/procesos/estado-del-proceso';
import { DetalleDeAsiento } from './asientos/DetalleDeAsiento';
import { conLaPlataPegada } from '@/lib/plata/plata-pegada';
import { leerFallo } from '@/lib/errores/traductor-de-errores';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras'

const BASE = '/panel/inmobiliaria/contabilidad';

/** Cuántos asientos recientes se listan. Cinco entran sin scroll. */
const ULTIMOS = 5;

// ══ Los datos de la portada ═════════════════════════════════════════════════

/** Las siete consultas de la portada. Cada una se reintenta sola. */
export type ConsultaDeLaPortada =
  | 'cuentas'
  | 'libro'
  | 'delMes'
  | 'cierre'
  | 'faltantes'
  | 'balance'
  | 'anterior'
  // Las cuatro del 18-09. Cada una se reintenta sola, como las de siempre.
  | 'rubros'
  | 'facturas'
  | 'lotes'
  | 'exogena';

interface Portada {
  cuentasActivas: number | null;
  /** El libro entero: `total` y los `ULTIMOS` más recientes. */
  ultimos: AsientoContable[] | null;
  asientosEnElLibro: number | null;
  asientosDelMes: number | null;
  cierre: Cierre | null;
  faltantes: AsientosFaltantes | null;
  balance: { cuadra: boolean; diferenciaCop: number } | null;
  mesAnterior: MesAnterior | null;
  /**
   * Las cuatro del 18-09. `null` = no se pudo preguntar, o la pieza todavía no
   * existe (`disponible: false`): en los dos casos no hay alerta.
   */
  rubros: EstadoDeRubros | null;
  facturas: EstadoDeFacturas | null;
  lotes: EstadoDeLotes | null;
  exogena: EstadoDeExogena | null;
  /** Gastos del banco conciliados sin asiento (CONC/CONTA-1); `null` = no se pudo saber. */
  diferencias: { total: number; valorCop: number } | null;
  /** Lo que tiró cada consulta que falló, entero. Ausente = no falló. */
  fallos: Partial<Record<ConsultaDeLaPortada, unknown>>;
}

type Parche = Partial<Omit<Portada, 'fallos'>>;

const nadaTodavia = (): Portada => ({
  cuentasActivas: null,
  ultimos: null,
  asientosEnElLibro: null,
  asientosDelMes: null,
  cierre: null,
  faltantes: null,
  balance: null,
  mesAnterior: null,
  rubros: null,
  facturas: null,
  lotes: null,
  exogena: null,
  diferencias: null,
  fallos: {},
});

/** Qué pide cada consulta y qué parte de la portada llena. */
const PEDIDOS: Record<ConsultaDeLaPortada, () => Promise<Parche>> = {
  cuentas: async () => ({
    cuentasActivas: (await contabilidadApi.puc.listar({ soloActivas: true })).length,
  }),
  libro: async () => {
    const libro = await contabilidadApi.asientos.listar({ limite: ULTIMOS });
    return { ultimos: libro.asientos, asientosEnElLibro: libro.total };
  },
  delMes: async () => ({
    asientosDelMes: (
      await contabilidadApi.asientos.listar({ desde: primerDiaDelMes(), hasta: hoy(), limite: 1 })
    ).total,
  }),
  cierre: async () => ({ cierre: await contabilidadApi.asientos.cierre() }),
  faltantes: async () => {
    // CONTA-1: lo que la conciliación aprobó y no tiene asiento viaja con los
    // faltantes; si su ruta falla (back viejo), la alerta de siempre sigue.
    const [faltantes, diferencias] = await Promise.all([
      contabilidadApi.asientos.faltantes(),
      Promise.resolve()
        .then(() => cuentasDeLasDiferenciasApi.porAsentar())
        .then(
          (d) => (d && typeof d.total === 'number' ? { total: d.total, valorCop: d.valorCop } : null),
          () => null,
        ),
    ]);
    return { faltantes, diferencias };
  },
  balance: async () => {
    const b = await contabilidadApi.reportes.balanceDePrueba({});
    return { balance: { cuadra: b.cuadra, diferenciaCop: b.diferenciaCop } };
  },
  anterior: async () => {
    const mes = rangoDelMesAnterior();
    const r = await contabilidadApi.asientos.listar({ desde: mes.desde, hasta: mes.hasta, limite: 1 });
    return { mesAnterior: { mes: mes.mes, hasta: mes.hasta, asientos: r.total } };
  },

  /*
   * 🔴 Las cuatro del 18-09 devuelven `null` cuando su pieza NO ESTÁ DISPONIBLE
   * (falta la migración). No es lo mismo que fallar: no hay nada que revisar, y
   * una alerta por algo que todavía no existe es ruido que entrena a ignorar las
   * alertas. Un fallo real sí llega a `fallos` por el `allSettled`.
   */
  rubros: async () => {
    const mapeo = await contabilidadApi.mapeo.rubros();
    if (!mapeo.disponible) return { rubros: null };
    return {
      rubros: {
        completo: mapeo.completo,
        // Los NOMBRES, no las claves: la alerta los va a leer una persona.
        faltantes: faltantesSugeridos(mapeo).map((r) => r.nombre),
      },
    };
  },

  facturas: async () => {
    const pagina = await gastosApi.facturas.listar({ estado: 'BORRADOR', limite: 1 });
    if (!pagina.disponible) return { facturas: null };
    return {
      facturas: { sinCausar: pagina.total, totalCop: pagina.totales?.totalCop ?? 0 },
    };
  },

  lotes: async () => {
    const lista = await gastosApi.lotes.listar();
    if (!lista.disponible) return { lotes: null };
    const porAprobar = lista.lotes.filter(
      (l) => l.estado === 'BORRADOR' || l.estado === 'ESPERANDO_APROBACION',
    );
    return {
      lotes: {
        porAprobar: porAprobar.length,
        totalCop: porAprobar.reduce((suma, l) => suma + l.totalCop, 0),
      },
    };
  },

  exogena: async () => {
    /*
     * El año ANTERIOR: la exógena de 2026 se presenta en 2027, y en septiembre
     * de 2026 sus formatos están a medio año de estar completos. Gritar por el
     * año en curso sería gritar todos los meses del año.
     */
    const anio = new Date().getFullYear() - 1;
    const resumen = await exogenaApi.resumen(anio);
    const conFilas = formatosConFilas(resumen);
    const sinVisto = formatosSinVistoBueno({ ...resumen, formatos: conFilas });
    return {
      exogena: {
        anio,
        sinVistoBueno: sinVisto.length,
        conBloqueos: sinVisto.filter((f) => f.bloqueos.length > 0).length,
      },
    };
  },
};

const CONSULTAS = Object.keys(PEDIDOS) as ConsultaDeLaPortada[];

/**
 * CONTA-2 (19-10-2026): «Viene cargado el mes pasado» seguía diciéndose después
 * de quitar las fechas. Se dice sólo si el rango es el que vino cargado.
 */
export function pistaDelRango(
  rango: { desde: string; hasta: string },
  inicial: { desde: string; hasta: string },
): string {
  if (rango.desde === inicial.desde && rango.hasta === inicial.hasta) {
    return 'Viene cargado el mes pasado, que es el que se le manda al contador. '
  }
  if (!rango.desde && !rango.hasta) return 'Sin fechas sale el libro entero. '
  return ''
}

function usePortada() {
  const [datos, setDatos] = useState<Portada>(nadaTodavia);
  const [cargando, setCargando] = useState(true);
  const [reintentando, setReintentando] = useState<ReadonlySet<ConsultaDeLaPortada>>(new Set());

  const cargar = useCallback(async () => {
    setCargando(true);
    const resultados = await Promise.allSettled(CONSULTAS.map((c) => PEDIDOS[c]()));
    const siguiente = nadaTodavia();
    resultados.forEach((r, i) => {
      if (r.status === 'fulfilled') Object.assign(siguiente, r.value);
      else siguiente.fallos[CONSULTAS[i]] = r.reason;
    });
    setDatos(siguiente);
    setCargando(false);
  }, []);

  /** Vuelve a pedir UNA consulta; las demás no se tocan ni parpadean. */
  const reintentar = useCallback(async (consulta: ConsultaDeLaPortada) => {
    setReintentando((previo) => new Set(previo).add(consulta));
    try {
      const parche = await PEDIDOS[consulta]();
      setDatos((d) => {
        const fallos = { ...d.fallos };
        delete fallos[consulta];
        return { ...d, ...parche, fallos };
      });
    } catch (e) {
      setDatos((d) => ({ ...d, fallos: { ...d.fallos, [consulta]: e } }));
    } finally {
      setReintentando((previo) => {
        const siguiente = new Set(previo);
        siguiente.delete(consulta);
        return siguiente;
      });
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return { datos, cargando, recargar: cargar, reintentar, reintentando };
}

// ══ Piezas ══════════════════════════════════════════════════════════════════

/** Por qué no cargó, en palabras cortas: va detrás de «No cargó:». */
export function motivoDelFallo(error: unknown): string {
  switch (clasificarFallo(error).tipo) {
    case 'sinPermiso':
      return 'tu rol no tiene acceso a esta consulta';
    case 'sinSesion':
      return 'tu sesión se venció';
    case 'red':
      return 'no hubo conexión con el servidor';
    case 'limitado':
      return 'hubo demasiadas consultas seguidas, espera un momento';
    case 'noExiste':
      return 'el servidor no encontró esta consulta';
    default: {
      // QA-FACT-CONTA-95 (CB-J-08): un 5xx dice su referencia, para que soporte lo encuentre.
      const referencia = leerFallo(error).referencia;
      return referencia
        ? `falló del lado del servidor (referencia ${referencia})`
        : 'falló del lado del servidor';
    }
  }
}

/** La línea de una tarjeta que no cargó, con su reintento si tiene sentido. */
function NoCargo({
  error,
  consulta,
  onReintentar,
  reintentando,
}: {
  error: unknown;
  consulta: ConsultaDeLaPortada;
  onReintentar: (c: ConsultaDeLaPortada) => void;
  reintentando: boolean;
}) {
  // Sobre un 403 o un 404 reintentar da lo mismo: no se ofrece.
  const sePuede = clasificarFallo(error).sePuedeReintentar;
  return (
    <p
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-fg-muted"
      role="alert"
      data-testid={`no-cargo-${consulta}`}
    >
      <WarningCircle className="h-3.5 w-3.5 shrink-0 text-danger" aria-hidden="true" />
      <span>No cargó: {motivoDelFallo(error)}.</span>
      {sePuede ? (
        <Button
          variant="link"
          size="sm"
          hideArrow
          className="h-auto p-0 text-caption"
          onClick={() => onReintentar(consulta)}
          disabled={reintentando}
          data-testid={`reintentar-${consulta}`}
        >
          {reintentando ? 'Reintentando…' : 'Reintentar'}
        </Button>
      ) : null}
    </p>
  );
}

interface FalloDeTarjeta {
  consulta: ConsultaDeLaPortada;
  error: unknown;
  onReintentar: (c: ConsultaDeLaPortada) => void;
  reintentando: boolean;
}

const PINTURA: Record<AlertaDescrita['severidad'], { caja: string; icono: string; Icono: Icon }> = {
  danger: { caja: 'border-danger/40 bg-danger-soft', icono: 'text-danger', Icono: WarningCircle },
  warning: { caja: 'border-warning/40 bg-warning-soft', icono: 'text-warning', Icono: Warning },
  info: { caja: 'border-border bg-surface-muted', icono: 'text-fg-muted', Icono: Info },
};

function Alerta({
  alerta,
  onReprocesar,
  ocupado,
}: {
  alerta: AlertaDescrita;
  onReprocesar: () => void;
  ocupado: boolean;
}) {
  const { icono, Icono } = PINTURA[alerta.severidad];
  return (
    <div
      // GLOW UP (21-10): una FILA dentro de la tarjeta «Necesita tu atención», no un recuadro de color suelto;
      // la gravedad la dice el ícono.
      className="flex flex-wrap items-start gap-3 px-4 py-3.5"
      data-testid={`alerta-${alerta.clave}`}
    >
      <Icono className={cn('mt-0.5 h-5 w-5 shrink-0', icono)} aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-medium text-fg">{alerta.titulo}</p>
        <p className="text-sm text-fg-muted">{alerta.detalle}</p>
      </div>
      {alerta.accion.tipo === 'ir' ? (
        <Button variant="outline" size="sm" hideArrow asChild>
          <Link href={alerta.accion.href}>{alerta.accion.label}</Link>
        </Button>
      ) : alerta.accion.tipo === 'reprocesar' ? (
        <Button
          variant="outline"
          size="sm"
          hideArrow
          onClick={onReprocesar}
          disabled={ocupado}
          // Sin «Reprocesando…» (23-09): el avance es del centro de procesos.
          title={ocupado ? EN_CURSO_EN_EL_CENTRO : undefined}
          data-testid="reprocesar-asientos"
        >
          <ArrowsClockwise className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {alerta.accion.label}
        </Button>
      ) : null}
      {/* 🔴 CB-04 (QA de Contabilidad, 03-10-2026): «Cerrar el mes» de esta
          alerta y «Cerrar período…» de la tarjeta del período, en la misma
          pantalla, eran dos botones para lo mismo — y el de la alerta sólo
          llevaba a la tarjeta. Queda uno: el de la tarjeta, que es donde se
          elige el día y se confirma. La alerta dice qué mes falta cerrar. */}
    </div>
  );
}

/**
 * 🔴 22-09 · «Ese diseño de carga es horrible» (Nico, con la captura de la
 * portada cargando): una tarjeta grande vacía con un spinner solitario. El
 * esqueleto ahora tiene la FORMA de lo que va a llegar —cinco renglones con su
 * fecha, su glosa y su monto—, así que la tarjeta no cambia de alto ni de
 * dibujo cuando llegan los datos.
 *
 * Y cada renglón abre el asiento (regla 4 del molde: la fila abre un cajón).
 * El cajón es el mismo del libro y no le pide nada al back: el asiento ya vino
 * entero, con sus movimientos, en la misma consulta.
 */
function UltimosAsientos({
  asientos,
  cargando,
  fallo,
  onAbrir,
  className,
}: {
  asientos: AsientoContable[] | null;
  cargando: boolean;
  fallo?: FalloDeTarjeta;
  onAbrir: (a: AsientoContable) => void;
  className?: string;
}) {
  return (
    <section
      className={cn('overflow-x-clip rounded-lg border border-border bg-surface', className)}
      aria-labelledby="ultimos-asientos-titulo"
      aria-busy={cargando || undefined}
      data-testid="ultimos-asientos"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0 space-y-0.5">
          <h2 id="ultimos-asientos-titulo" className="text-sm font-semibold text-fg">
            Últimos asientos
          </h2>
          <p className="text-caption text-fg-muted">Lo último que entró al libro.</p>
        </div>
        {/* Cadence 2: sin flecha decorativa; un secundario chico, como las acciones de tarjeta. */}
        <Button asChild size="sm" variant="secondary" hideArrow>
          <Link href={`${BASE}/asientos`}>Ver el libro</Link>
        </Button>
      </header>

      {/* Esqueleto → lo último que entró (o el vacío, o el fallo) con fundido. */}
      <CrossFade
        swapKey={cargando ? 'cargando' : fallo ? 'fallo' : asientos === null ? 'sin-leer' : asientos.length === 0 ? 'vacio' : 'asientos'}
      >
      {cargando ? (
        <ul className="divide-y divide-border-faint" data-testid="ultimos-asientos-cargando">
          {Array.from({ length: ULTIMOS }, (_, i) => (
            <li key={i} className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3">
              <Skeleton className="h-3.5 w-20 rounded-sm bg-surface-muted" />
              <Skeleton
                className="h-4 rounded-sm bg-surface-muted"
                // Glosas de largo distinto: una columna de barras iguales se lee
                // como una tabla vacía, no como texto por llegar.
                style={{ width: `${[78, 55, 66, 48, 72][i % 5]}%` }}
              />
              <Skeleton className="h-4 w-20 rounded-sm bg-surface-muted" />
            </li>
          ))}
        </ul>
      ) : fallo ? (
        <div className="px-5 py-6">
          <NoCargo {...fallo} />
        </div>
      ) : asientos === null ? (
        <p className="px-5 py-6 text-sm text-fg-muted">No se pudo leer el libro.</p>
      ) : asientos.length === 0 ? (
        <p className="px-5 py-6 text-sm text-fg-muted">
          Todavía no hay asientos. El primero puede ser manual, o entrar por la migración.
        </p>
      ) : (
        <ul className="divide-y divide-border-faint">
          {asientos.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onAbrir(a)}
                className="grid w-full grid-cols-[6.5rem_minmax(0,1fr)_auto] items-baseline gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover"
                data-testid={`ultimo-asiento-${a.id}`}
              >
                {/* 🔴 CB-04: «4 de oct de …» se cortaba en la columna; la fecha
                    corta de la casa («4 oct 2026») cabe entera. */}
                <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">
                  {fechaCorta(diaDe(a.fecha))}
                </span>
                <span className="truncate text-sm text-fg" title={conLaPlataPegada(a.descripcion)}>
                  {conLaPlataPegada(a.descripcion)}
                </span>
                <Monto
                  valor={a.movimientos.reduce((s, m) => s + (m.debitoCop ?? 0), 0)}
                  className="text-sm text-fg"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
      </CrossFade>
    </section>
  );
}

/**
 * 🔴 EL RANGO DE FECHAS SE PIDE DESPUÉS, NO ANTES (Nico, 22-09).
 *
 * «Tiene cosas por un lado y por el otro que se podrían hacer de otra manera o
 * hasta con un CTA que luego pida el resto de información.»
 *
 * En la portada había dos campos de fecha puestos encima de un botón. Bajar el
 * libro para el contador se hace una vez al mes; dos campos de fecha
 * permanentes en la portada del módulo ocupan lugar todos los días y —como
 * pasó con la resolución— **se leen como un filtro de la pantalla**, no como
 * los parámetros de una descarga.
 *
 * Ahora la portada tiene el botón, y el botón abre el cajón que pide el rango.
 */
function ParaElContador({ incrustado = false }: { incrustado?: boolean } = {}) {
  const inicial = useMemo(() => rangoDelMesAnterior(), []);
  const [rango, setRango] = useState({ desde: inicial.desde, hasta: inicial.hasta });
  const [bajando, setBajando] = useState(false);
  const [pidiendoRango, setPidiendoRango] = useState(false);

  const invertido = rangoInvertido(rango.desde, rango.hasta);

  /*
   * El centro de procesos (22-09): el mismo libro, armado en segundo plano.
   * Con un año entero no hay por qué quedarse mirando el cajón: se lanza, se
   * sigue trabajando y el archivo aparece en el botón de procesos de arriba.
   */
  const [lanzando, setLanzando] = useState(false);
  const enSegundoPlano = async () => {
    setLanzando(true);
    try {
      await procesosApi.exportarLibro({
        desde: rango.desde || undefined,
        hasta: rango.hasta || undefined,
      });
      toast.success('Estamos armando el libro.', {
        description: 'Cuando esté, lo bajas desde el centro de procesos, arriba a la derecha.',
      });
      setPidiendoRango(false);
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo lanzar la exportación.'));
    } finally {
      setLanzando(false);
    }
  };

  const descargar = async () => {
    setBajando(true);
    try {
      /*
       * 🔴 CT3 (auditoría 13-09): el libro lo arma el SERVIDOR y baja por
       * partes. Acá se pedían todas las páginas de `GET /asientos`, se
       * juntaban en memoria del navegador y se concatenaba un string; con un
       * año de una inmobiliaria mediana son decenas de miles de movimientos, y
       * había un tope que dejaba el libro INCOMPLETO justo cuando el rango es
       * largo — que es cuando el contador lo pide.
       *
       * Lo que se pierde a cambio, y es a propósito: ya no se puede decir
       * «1.240 asientos en el archivo» antes de bajarlo, porque contarlos
       * obligaría a traerlos. Prometer un número que no se midió es peor que
       * no darlo, así que el aviso dice lo que sí se sabe.
       */
      const blob = await contabilidadApi.reportes.libroCsv({
        desde: rango.desde || undefined,
        hasta: rango.hasta || undefined,
      });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = nombreDelCsv(rango.desde, rango.hasta, hoy());
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
      toast.success('El libro del rango quedó descargado.');
      setPidiendoRango(false);
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo armar el archivo.'));
    } finally {
      setBajando(false);
    }
  };

  return (
    <section
      // Incrustado en el paso 4 del cierre: sin marco propio (una tarjeta con borde dentro de
      // otra con borde no va en Cadence 2), sobre una bandeja de arena.
      className={cn(
        'overflow-x-clip',
        incrustado ? 'rounded-[14px] bg-surface-muted/50' : 'rounded-lg border border-border bg-surface',
      )}
      aria-labelledby="para-el-contador-titulo"
    >
      {/* 🔴 22-09 · La acción de la tarjeta va en su cabecera, a la derecha,
          como en el resto del panel; antes era un botón del ancho entero
          metido entre el texto y los enlaces, y los enlaces quedaban colgando
          debajo. */}
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-border px-5 py-4">
        {/* Incrustado en el paso «Entregarle al contador», el título ya lo dice el paso. */}
        <div className={cn('min-w-0 space-y-0.5', incrustado && 'sr-only')}>
          <h2 id="para-el-contador-titulo" className="text-sm font-semibold text-fg">
            Para el contador
          </h2>
          <p className="text-caption text-fg-muted">
            El libro del rango en CSV y los informes que va a pedir.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          hideArrow
          onClick={() => setPidiendoRango(true)}
          disabled={bajando}
          data-testid="descargar-csv"
        >
          <DownloadSimple className="h-4 w-4" aria-hidden="true" />
          {bajando ? 'Armando el archivo…' : 'Descargar el libro en CSV'}
        </Button>
      </header>

      <Cajon
        abierto={pidiendoRango}
        onOpenChange={(v) => {
          // Mientras el archivo se arma no se cierra: cerrar a mitad dejaría
          // sin saber si la descarga salió.
          if (!v && bajando) return;
          setPidiendoRango(v);
        }}
        ancho="sm:max-w-lg"
        data-testid="cajon-del-libro"
      >
        <CajonCabecera
          titulo="Descargar el libro en CSV"
          descripcion="Una línea por movimiento, con su cuenta y su lado. Es lo que el contador carga en su software."
        />
        <CajonCuerpo className="space-y-4">
          <RangoDeFechas
              atajos
            desde={rango.desde}
            hasta={rango.hasta}
            onChange={setRango}
            disabled={bajando}
          />
          <p className="text-caption text-fg-muted" data-testid="libro-pista-del-rango">
            {pistaDelRango(rango, inicial)}El archivo lo arma el servidor: con un rango largo puede tardar.
          </p>
        </CajonCuerpo>
        <CajonPie
          ayuda={
            invertido
              ? 'La fecha de «hasta» es anterior a la de «desde».'
              : 'El libro sale completo: no hay tope de filas.'
          }
        >
          <Button
            variant="outline"
            hideArrow
            disabled={bajando}
            onClick={() => setPidiendoRango(false)}
            data-testid="cajon-del-libro-cancelar"
          >
            Cancelar
          </Button>
          <Button
            variant="outline"
            hideArrow
            onClick={() => void enSegundoPlano()}
            disabled={bajando || lanzando || invertido}
            isLoading={lanzando}
            data-testid="cajon-del-libro-segundo-plano"
          >
            En segundo plano
          </Button>
          <Button
            hideArrow
            onClick={() => void descargar()}
            disabled={bajando || lanzando || invertido}
            data-testid="cajon-del-libro-descargar"
          >
            <DownloadSimple className="h-4 w-4" aria-hidden="true" />
            {bajando ? 'Armando el archivo…' : 'Descargar'}
          </Button>
        </CajonPie>
      </Cajon>

      {/* 🔴 20-09 · Eran ONCE enlaces azules en una fila envuelta, todos con
          el mismo peso y sin decir qué es qué: «Balance de prueba · Libro
          auxiliar por cuenta · Estado de cuenta · Deterioro de cartera ·
          Certificados de retención · Presupuesto · Estado de resultados ·
          Balance general · Libro mayor · Auxiliar por tercero · Exógena».
          Nico: «la sección de contabilidad necesita un glow up».

          Dos cosas estaban mal. Una, que once acentos compitiendo entre sí no
          son un acento (DESIGN §1): el azul se reserva para la acción de la
          tarjeta —bajar el libro— y los informes se leen en el color del
          texto. La otra, que un contador no busca «un informe»: busca EL
          libro, o LOS estados.

          🔴 20-09, segunda pasada (con la portada ABIERTA en el navegador):
          agrupar no alcanzaba, porque la portada tenía DOS navegaciones que se
          pisaban. «Deterioro de cartera», «Certificados de retención» y
          «Exógena» estaban aquí Y como tarjeta abajo, con el mismo nombre y el
          mismo destino; «Presupuesto» estaba sólo aquí y no tenía tarjeta. Dos
          listas con solape parcial es peor que una lista larga: no hay forma
          de saber cuál manda, y quien no encuentra algo en una no sabe si
          buscarlo en la otra.

          La regla que las separa, y que el guardián de abajo sostiene:
          **acá van INFORMES —pestañas de una pantalla—, y en la grilla van
          PANTALLAS.** Por eso cada grupo de aquí es exactamente una pantalla
          con sus pestañas: «El libro» son las cinco de `/reportes`, «Lo que se
          firma» son las dos de `/estados-financieros`. Nada de aquí vuelve a
          aparecer abajo. */}
      {/* 🔴 22-09 · Una LISTA navegable, no una fila de enlaces sueltos: cada
          informe es un renglón entero que se puede tocar, con qué es en una
          línea. Un contador que no recuerda si lo que busca es el mayor o el
          auxiliar lo resuelve leyendo, no abriendo los dos. */}
      <div
        data-testid="informes-del-contador"
        className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0"
      >
        {INFORMES_DEL_CONTADOR.map((grupo) => (
          <div key={grupo.titulo} className="min-w-0 px-3 py-4">
            <h3 className="px-2 text-overline text-fg-subtle">{grupo.titulo}</h3>
            <ul className="mt-2 space-y-0.5">
              {grupo.informes.map((informe) => (
                <li key={informe.href}>
                  <Link
                    href={informe.href}
                    className="group flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-surface-hover"
                    data-testid={informe.testid}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-fg group-hover:text-primary">
                        {informe.nombre}
                      </span>
                      <span className="block text-caption text-fg-muted">{informe.que}</span>
                    </span>
                    <CaretRight
                      className="mt-1 h-4 w-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Los informes que el contador pide por nombre, agrupados por la PANTALLA que
 * los sirve: cada grupo es una pantalla y cada renglón una de sus pestañas.
 *
 * 🔴 Invariante: ningún `href` de acá puede ser el de un `DESTINOS`. Un mismo
 * destino en las dos listas de la portada es lo que hacía ilegible la página;
 * la prueba «ningún destino aparece dos veces en la portada» lo sostiene.
 */
const INFORMES_DEL_CONTADOR: ReadonlyArray<{
  titulo: string;
  informes: ReadonlyArray<{ href: string; nombre: string; que: string; testid?: string }>;
}> = [
  {
    titulo: 'El libro',
    informes: [
      {
        href: `${BASE}/reportes?informe=balance`,
        nombre: 'Balance de prueba',
        que: 'Cada cuenta con sus débitos, créditos y saldo, y si el libro cuadra.',
      },
      {
        href: `${BASE}/reportes?informe=mayor`,
        nombre: 'Libro mayor',
        que: 'Cada cuenta con sus movimientos partidos por mes.',
        testid: 'ir-al-mayor',
      },
      {
        href: `${BASE}/reportes?informe=auxiliar`,
        nombre: 'Libro auxiliar por cuenta',
        que: 'Todo lo que pasó en una cuenta, con el saldo corrido.',
      },
      {
        href: `${BASE}/reportes?informe=terceros`,
        nombre: 'Auxiliar por tercero',
        que: 'Los terceros con su saldo, para encontrar a quien buscas.',
        testid: 'ir-a-terceros',
      },
      {
        href: `${BASE}/reportes?informe=tercero`,
        nombre: 'Estado de cuenta de un tercero',
        que: 'Todo lo que se movió a nombre de alguien, en todas las cuentas.',
        testid: 'ir-al-estado-de-cuenta',
      },
    ],
  },
  {
    titulo: 'Lo que se firma',
    informes: [
      {
        href: `${BASE}/estados-financieros?informe=pyg`,
        nombre: 'Estado de resultados',
        que: 'Ingresos, gastos y utilidad del período.',
        testid: 'ir-al-pyg',
      },
      {
        href: `${BASE}/estados-financieros?informe=balance`,
        nombre: 'Balance general',
        que: 'Activos, pasivos y patrimonio a una fecha.',
        testid: 'ir-al-balance-general',
      },
    ],
  },
];

interface Destino {
  href: string;
  icono: Icon;
  titulo: string;
  texto: string;
}

const DESTINOS: Destino[] = [
  {
    href: `${BASE}/puc`,
    icono: TreeStructure,
    titulo: 'Plan de cuentas',
    texto: 'Ver, crear y editar las cuentas del PUC.',
  },
  {
    href: `${BASE}/asientos`,
    icono: BookOpenText,
    titulo: 'Asientos',
    texto: 'El libro, el asiento manual y la reversa.',
  },
  {
    href: `${BASE}/reportes`,
    icono: ChartBar,
    titulo: 'Reportes',
    texto: 'Balance, auxiliar por cuenta y por tercero.',
  },
  {
    href: `${BASE}/mapeo`,
    icono: Plugs,
    titulo: 'Mapeo contable',
    texto: 'A qué cuenta va cada asiento automático.',
  },
  // 17-09: las dos piezas que el contador cierra a mano. El deterioro se
  // aprueba CADA MES antes de asentarlo; el certificado de retenciones se
  // emite una vez al año y fija número y fecha.
  {
    href: `${BASE}/deterioro`,
    icono: Scales,
    titulo: 'Deterioro de cartera',
    texto: 'La provisión por edades: sugerida, editable y aprobada cada mes.',
  },
  {
    href: `${BASE}/certificados`,
    icono: Certificate,
    titulo: 'Certificados de retención',
    texto: 'Lo que le retuvieron a cada propietario en el año, para declarar.',
  },
  /*
   * Las cuatro del 18-09. «Estados financieros» va primero de las cuatro porque
   * es la que cierra el círculo: las otras tres existen para que ésa tenga
   * números — gastos propios, la plata que sale, y lo que se le declara a la
   * DIAN sobre los dos.
   */
  {
    href: `${BASE}/estados-financieros`,
    icono: ChartPieSlice,
    titulo: 'Estados financieros',
    texto: 'El P&G y el balance general, contra el presupuesto y el año pasado.',
  },
  {
    href: `${BASE}/gastos`,
    icono: Receipt,
    titulo: 'Gastos',
    texto: 'Las facturas de los proveedores: registrar, causar y anular.',
  },
  {
    href: `${BASE}/egresos`,
    icono: Bank,
    titulo: 'Egresos',
    texto: 'Lo que se le paga a proveedores y técnicos, en lotes que aprueba otra persona.',
  },
  {
    href: `${BASE}/exogena`,
    icono: FileCsv,
    titulo: 'Exógena',
    texto: 'Los seis formatos de la DIAN, armados contra el libro.',
  },
  // 🔴 20-09: la copropiedad como TERCERO del libro. Nació de ver que la
  // cuenta 2815 no tenía un solo movimiento a nombre de su dueño, y que la
  // cuota de administración no tenía a quién apuntar.
  {
    href: `${BASE}/copropiedades`,
    icono: Buildings,
    titulo: 'Copropiedades',
    texto: 'Los conjuntos y edificios, con su NIT: el dueño de la administración.',
  },
  // 🔴 20-09: «Presupuesto» era la única pantalla de contabilidad sin tarjeta.
  // Vivía sólo como renglón de «Para el contador», que es donde van los
  // informes: quien buscaba la pantalla en el mapa de abajo no la encontraba.
  {
    href: `${BASE}/presupuesto`,
    icono: Target,
    titulo: 'Presupuesto',
    texto: 'Lo que se planeó para el mes, contra lo que pasó y contra el año pasado.',
  },
];

/**
 * Las revisiones que alimentan las alertas. Si una no carga, «no hay alertas»
 * deja de significar «está todo bien», y eso se dice.
 */
/** Los avisos que NO son del paso 1 (asentar): el descuadre, el mes por cerrar y lo del año. */
const FUERA_DEL_PASO_1 = new Set(['no-cuadra', 'mes-sin-cerrar', 'exogena-sin-visto-bueno']);

/** «septiembre» de `2026-09` (el mes de la casa, sin correrse por la zona horaria). */
function nombreDelMes(aaaaMm: string): string {
  return new Date(`${aaaaMm}-15T12:00:00Z`).toLocaleDateString(localeDeLasCifras(), {
    month: 'long',
    timeZone: 'UTC',
  });
}

/** Las pantallas, por CUÁNDO se usan. Una que no esté en la lista cae en «Configurar». */
const GRUPOS_DE_DESTINOS: { titulo: string; rutas: string[] }[] = [
  { titulo: 'Día a día', rutas: ['asientos', 'gastos', 'egresos'] },
  { titulo: 'Cada mes', rutas: ['deterioro', 'reportes', 'estados-financieros', 'presupuesto'] },
  { titulo: 'Cada año', rutas: ['exogena', 'certificados'] },
  { titulo: 'Configurar', rutas: ['puc', 'mapeo', 'copropiedades'] },
];

const gruposDeDestinos = (() => {
  const ruta = (href: string) => href.slice(href.lastIndexOf('/') + 1);
  const usados = new Set<string>();
  const grupos = GRUPOS_DE_DESTINOS.map((g) => ({
    titulo: g.titulo,
    destinos: g.rutas
      .map((r) => DESTINOS.find((d) => ruta(d.href) === r))
      .filter((d): d is (typeof DESTINOS)[number] => {
        if (!d) return false;
        usados.add(d.href);
        return true;
      }),
  }));
  const sueltos = DESTINOS.filter((d) => !usados.has(d.href));
  if (sueltos.length) grupos[grupos.length - 1].destinos.push(...sueltos);
  return grupos.filter((g) => g.destinos.length > 0);
})();

const REVISIONES: { consulta: ConsultaDeLaPortada; que: string }[] = [
  { consulta: 'faltantes', que: 'Si hay movimientos sin asiento' },
  { consulta: 'balance', que: 'Si el libro cuadra' },
  { consulta: 'anterior', que: 'Si el mes anterior quedó por cerrar' },
  { consulta: 'rubros', que: 'Si los rubros del P&G tienen su cuenta' },
  { consulta: 'facturas', que: 'Si hay facturas de proveedor sin causar' },
  { consulta: 'lotes', que: 'Si hay lotes de egreso esperando aprobación' },
  { consulta: 'exogena', que: 'Si la exógena del año pasado tiene visto bueno' },
];

function plural(n: number, singular: string, varios: string): string {
  return `${n.toLocaleString(localeDeLasCifras())} ${n === 1 ? singular : varios}`;
}

/** «2 cobros, 1 recibo de caja y 3 lotes de giros». */
function queSeVaAAsentar(f: AsientosFaltantes): string {
  const partes = [
    f.cobros > 0 ? plural(f.cobros, 'cobro', 'cobros') : null,
    f.recibos > 0 ? plural(f.recibos, 'recibo de caja', 'recibos de caja') : null,
    f.lotes > 0 ? plural(f.lotes, 'lote de giros', 'lotes de giros') : null,
  ].filter((p): p is string => p !== null);
  if (partes.length <= 1) return partes[0] ?? '';
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

// ══ La portada ══════════════════════════════════════════════════════════════

export function HubDeContabilidad() {
  const { formatCurrency } = useI18n();
  const { datos, cargando, recargar, reintentar, reintentando } = usePortada();
  const [reprocesando, setReprocesando] = useState(false);
  const [confirmandoReproceso, setConfirmandoReproceso] = useState(false);
  const cierreRef = useRef<HTMLDivElement>(null);
  const [asientoAbierto, setAsientoAbierto] = useState<AsientoContable | null>(null);

  const alertas = useMemo(
    () =>
      alertasDeContabilidad({
        faltantes: datos.faltantes,
        balance: datos.balance,
        cierre: datos.cierre,
        mesAnterior: datos.mesAnterior,
        rubros: datos.rubros,
        facturas: datos.facturas,
        lotes: datos.lotes,
        exogena: datos.exogena,
        diferencias: datos.diferencias,
        // QA-FACT-CONTA-95 r2 (CB-A-07): sin plan de cuentas, lo primero es eso.
        cuentasActivas: datos.cuentasActivas,
      }).map((a) => describirAlerta(a, formatCurrency)),
    [datos, formatCurrency],
  );

  /** La línea de fallo de una consulta, o nada si no falló. */
  const falloDe = (consulta: ConsultaDeLaPortada): FalloDeTarjeta | undefined =>
    consulta in datos.fallos
      ? {
          consulta,
          error: datos.fallos[consulta],
          onReintentar: (c) => void reintentar(c),
          reintentando: reintentando.has(consulta),
        }
      : undefined;

  /*
   * 🔴 23-09 (Nico: «todas las cargas déjalas que sucedan allí y deja la
   * pantalla quieta»): el diálogo se cierra APENAS se confirma, no cuando el
   * back termina. Antes se quedaba en «Asentando…» todo el reproceso —la
   * misma espera que el centro de procesos ya muestra con su avance y su
   * «Detener»—. El resultado llega en un aviso y la pantalla relee al final.
   */
  const reprocesar = async () => {
    setReprocesando(true);
    setConfirmandoReproceso(false);
    // Que el diálogo alcance a cerrarse: con uno abierto, el centro no se abre
    // solo (avisa con un toast), y aquí lo que se quiere es verlo.
    await new Promise((r) => setTimeout(r, 0));
    try {
      const r = await contabilidadApi.asientos.reprocesar();
      if (r.asentados > 0) {
        toast.success(
          r.asentados === 1 ? '1 asiento generado.' : `${r.asentados} asientos generados.`,
        );
      }
      if (r.sinResolver > 0) {
        toast.warning(
          `${r.sinResolver} sigue${r.sinResolver === 1 ? '' : 'n'} sin asiento${r.motivos[0] ? `: ${r.motivos[0]}` : '.'}`,
        );
      }
      if (r.asentados === 0 && r.sinResolver === 0) toast.success('No había nada pendiente de asentar.');
      await recargar();
    } catch (e) {
      // La fila del centro queda en «Falló» con su «Reintentar».
      toast.error(mensajeDeContabilidad(e, 'No se pudo reprocesar.'));
    } finally {
      setReprocesando(false);
    }
  };

  // Un cero de este mes no significa un libro vacío: si el último asiento es
  // de agosto y estamos en septiembre, el 0 es correcto y engañoso a la vez.
  // `elLibroEnUnaFrase` es la que decide cómo se dice eso.
  const ultimo = datos.ultimos?.[0];

  const revisionesCaidas = cargando ? [] : REVISIONES.filter((r) => r.consulta in datos.fallos);
  const faltantes = datos.faltantes;

  // ── El cierre del mes, paso por paso (glow up 21-10) ──────────────────────
  // Cada aviso va al paso que resuelve; lo del año (exógena) va aparte.
  const porAsentar = alertas.filter((a) => !FUERA_DEL_PASO_1.has(a.clave));
  const alertaNoCuadra = alertas.find((a) => a.clave === 'no-cuadra');
  const alertaMes = alertas.find((a) => a.clave === 'mes-sin-cerrar');
  const delAnio = alertas.filter((a) => a.clave === 'exogena-sin-visto-bueno');
  const fallo = (cs: ConsultaDeLaPortada[]) => cs.some((c) => c in datos.fallos);
  // Lo que no se pudo revisar no se da por hecho: «no hay avisos» sólo vale si se preguntó.
  const falla1 = fallo(['cuentas', 'faltantes', 'rubros', 'facturas', 'lotes']);
  const falla2 = fallo(['balance']);
  const [forzarCierre, setForzarCierre] = useState(false);
  /** El último día que se puede cerrar (el mes que se cierra ahora). */
  const hastaPorCerrar = datos.cierre?.sePuedeCerrarHasta ?? datos.mesAnterior?.hasta ?? null;
  const mesPorCerrar = hastaPorCerrar ? hastaPorCerrar.slice(0, 7) : null;
  const cerradoAlDia =
    !!hastaPorCerrar && !!datos.cierre?.cerradaHasta && datos.cierre.cerradaHasta >= hastaPorCerrar;
  const paso1: EstadoDelPaso = cargando ? 'pendiente' : porAsentar.length > 0 || falla1 ? 'actual' : 'hecho';
  const paso2: EstadoDelPaso = cargando
    ? 'pendiente'
    : alertaNoCuadra || falla2 || datos.balance?.cuadra !== true
      ? 'actual'
      : 'hecho';
  const paso3: EstadoDelPaso = cargando
    ? 'pendiente'
    : cerradoAlDia
      ? 'hecho'
      : (paso1 === 'hecho' && paso2 === 'hecho') || forzarCierre
        ? 'actual'
        : 'pendiente';
  const paso4: EstadoDelPaso = cargando ? 'pendiente' : paso3 === 'hecho' ? 'actual' : 'pendiente';
  const tituloDelCierre =
    mesPorCerrar && !cerradoAlDia
      ? `El cierre de ${nombreDelMes(mesPorCerrar)}`
      : 'El cierre del mes';

  return (
    <div className="space-y-6">
      {/* 🔴 EL RESUMEN ES UNA FRASE (regla 1 del molde, Nico 22-09: «esto
          también parece un vómito y tiene cosas por un lado y por el otro»).
          Eran tres fichas del mismo tamaño y el mismo peso —CUENTAS ACTIVAS
          2.790 · ASIENTOS ESTE MES 0 · ASIENTOS EN EL LIBRO 0— y las tres
          juntas no decían nada: un 0 al lado de un 2.790 se lee como un error,
          no como «el plan está cargado y el libro todavía no arrancó».
          La frase la arma `elLibroEnUnaFrase`, que está probada aparte: los
          casos raros son varios (libro vacío, mes en cero con libro lleno, y
          cualquiera de los tres números sin poder leerse). */}
      {/* Revisión de Dinero (22-10): la frase del libro como un renglón, sin tarjeta: informa,
          no decide nada, y no compite con el cierre del mes. */}
      <section className="px-1 text-body-sm" aria-label="Resumen del libro">
        {/* Esqueleto → la frase del libro con fundido cruzado. */}
        <CrossFade swapKey={cargando ? 'cargando' : 'frase'}>
        {cargando ? (
          // La forma de la frase que va a llegar —un renglón largo y uno más
          // corto—, no una barra suelta (Nico, 22-09: «ese diseño de carga es
          // horrible»).
          <div className="space-y-2 py-0.5" aria-label="cargando" data-testid="resumen-cargando">
            <Skeleton className="h-5 w-full max-w-2xl rounded-sm bg-surface-muted" />
            <Skeleton className="h-5 w-3/5 max-w-md rounded-sm bg-surface-muted" />
          </div>
        ) : (
          <p className="text-body text-fg" data-testid="el-libro-en-una-frase">
            {elLibroEnUnaFrase({
              cuentasActivas: datos.cuentasActivas,
              asientosEnElLibro: datos.asientosEnElLibro,
              asientosDelMes: datos.asientosDelMes,
              ultimoDia: ultimo ? diaLegible(ultimo.fecha) : null,
            }).map((trozo, i) =>
              trozo.tipo === 'texto' ? (
                <span key={i}>{trozo.texto}</span>
              ) : (
                <strong
                  key={i}
                  className="font-mono font-semibold tabular-nums text-fg"
                  title={trozo.rotulo}
                >
                  {trozo.valor === null ? '—' : trozo.valor.toLocaleString(localeDeLasCifras())}
                </strong>
              ),
            )}
          </p>
        )}
        </CrossFade>
        {/* Cada consulta falla por separado y lo DICE: sin esto, un número que
            no se pudo leer saldría como un guion mudo. */}
        {!cargando &&
          (['cuentas', 'delMes', 'libro'] as const)
            .map((c) => falloDe(c))
            .filter((f): f is NonNullable<typeof f> => Boolean(f))
            .map((f, i) => <NoCargo key={i} {...f} />)}
      </section>

      {/* CT1: que no aparezca ninguna alerta sólo vale si se pudo revisar. */}
      {revisionesCaidas.length > 0 ? (
        <section
          className="space-y-2 rounded-lg border border-border bg-surface p-4"
          aria-label="Revisiones que no cargaron"
          data-testid="revisiones-caidas"
        >
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-fg">No pude revisar todo el libro</p>
            <p className="text-caption text-fg-muted">
              Sin estas consultas no sé si hay alertas: que no aparezca ninguna no quiere decir que
              esté todo en orden.
            </p>
          </div>
          <ul className="space-y-1.5">
            {revisionesCaidas.map((r) => (
              <li key={r.consulta} className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="text-sm text-fg">{r.que}</span>
                <NoCargo {...falloDe(r.consulta)!} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ═══ GLOW UP 21-10 · EL TRABAJO DE ESTA PANTALLA ES CERRAR EL MES ═══
          Nico: «el flujo realmente quede optimizado para lo que un usuario haría para su job to be
          done, no solo colocarle la UI nueva». Antes la portada era un resumen, una tarjeta de
          avisos, los últimos asientos al lado del cierre (que proponía una fecha sin decir si el
          mes estaba listo), «Para el contador» y doce tarjetas iguales: todo del mismo peso, sin
          decir qué va primero. Ahora es el recorrido del contador, en orden:
            1. que todo quede asentado (cada aviso que lo impide, con su botón),
            2. que el libro cuadre,
            3. cerrar el mes (sin bloquear: «Cerrar de todos modos»),
            4. entregarle al contador lo que firma.
          Lo del año (exógena), el libro para consultar y las pantallas, debajo. */}
      <PasosDeLaTarea
        titulo={tituloDelCierre}
        data-testid="cierre-del-mes"
        pasos={[
          {
            id: 'asentado',
            titulo: 'Que todo quede asentado',
            descripcion: 'Cada cobro, recibo, giro, gasto y factura del mes con su asiento.',
            estado: paso1,
            resumen: 'Todo lo que pasó tiene su asiento.',
            extra:
              paso1 === 'actual' && porAsentar.length > 0 ? (
                <span className="font-mono text-caption tabular-nums text-fg-muted">
                  {porAsentar.length === 1 ? '1 por resolver' : `${porAsentar.length} por resolver`}
                </span>
              ) : null,
            contenido:
              porAsentar.length > 0 ? (
                <div
                  className="-mx-4 divide-y divide-border-faint"
                  aria-label="Alertas de contabilidad"
                  data-testid="necesita-tu-atencion"
                >
                  {porAsentar.map((a) => (
                    <Alerta
                      key={a.clave}
                      alerta={a}
                      onReprocesar={() => setConfirmandoReproceso(true)}
                      ocupado={reprocesando}
                    />
                  ))}
                </div>
              ) : falla1 ? (
                <p className="text-sm text-fg-muted">
                  No pude revisar todo (arriba dice qué no cargó): hasta que cargue, no sé si falta algo.
                </p>
              ) : null,
          },
          {
            id: 'cuadra',
            titulo: 'Que el libro cuadre',
            descripcion: 'Débitos y créditos iguales, y un resultado del mes que tenga sentido.',
            estado: paso2,
            resumen: 'Débitos y créditos iguales.',
            contenido: (
              <div className="space-y-3">
                {alertaNoCuadra ? (
                  <div className="-mx-4">
                    <Alerta alerta={alertaNoCuadra} onReprocesar={() => setConfirmandoReproceso(true)} ocupado={reprocesando} />
                  </div>
                ) : falla2 ? (
                  <p className="text-sm text-fg-muted">No pude leer el balance: no sé todavía si cuadra.</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="secondary" hideArrow>
                    <Link href={`${BASE}/reportes?informe=balance`} data-testid="revisar-balance-de-prueba">
                      Revisar el balance de prueba
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost" hideArrow>
                    <Link href={`${BASE}/estados-financieros`}>Ver el resultado del mes</Link>
                  </Button>
                </div>
              </div>
            ),
          },
          {
            id: 'cerrar',
            titulo: mesPorCerrar && !cerradoAlDia ? `Cerrar ${nombreDelMes(mesPorCerrar)}` : 'Cerrar el mes',
            descripcion:
              'Al cerrarlo nadie asienta con fecha de ese mes; si hace falta, el administrador lo reabre con motivo.',
            estado: paso3,
            resumen: datos.cierre?.cerradaHasta
              ? `Cerrado hasta el ${fechaCorta(datos.cierre.cerradaHasta)}.`
              : 'Al día.',
            bloqueadoPorque: (
              <span className="inline-flex flex-wrap items-center gap-x-2">
                Primero, que todo quede asentado y el libro cuadre.
                <button
                  type="button"
                  onClick={() => setForzarCierre(true)}
                  className="font-medium text-fg underline decoration-border-strong underline-offset-2 hover:decoration-fg"
                  data-testid="cerrar-de-todos-modos"
                >
                  Cerrar de todos modos
                </button>
              </span>
            ),
            contenido: (
              // `tabIndex={-1}`: el bloque del cierre puede recibir el foco.
              <div ref={cierreRef} tabIndex={-1} className="space-y-3 outline-none">
                {alertaMes ? (
                  <div className="-mx-4">
                    <Alerta alerta={alertaMes} onReprocesar={() => setConfirmandoReproceso(true)} ocupado={reprocesando} />
                  </div>
                ) : null}
                <CierreDePeriodo
                  cierre={datos.cierre}
                  cargando={cargando}
                  fallo={'cierre' in datos.fallos}
                  onCerrado={() => void recargar()}
                  onReabierto={() => void recargar()}
                />
                {!cargando && falloDe('cierre') ? <NoCargo {...falloDe('cierre')!} /> : null}
              </div>
            ),
          },
          {
            id: 'contador',
            titulo: 'Entregarle al contador',
            // Siempre a la mano (el contador puede pedir el libro cualquier día); lo que se recomienda
            // es entregarlo con el mes cerrado, y eso se dice, sin bloquear.
            descripcion:
              paso3 === 'hecho'
                ? 'El libro del mes en CSV y los informes que firma.'
                : 'El libro del mes en CSV y los informes que firma. Mejor con el mes cerrado: así no cambia después.',
            estado: paso4,
            fijo: <ParaElContador incrustado />,
          },
        ]}
      />

      {/* Lo del año: no es del cierre del mes, pero no se puede perder. */}
      {delAnio.length > 0 ? (
        <section
          className="divide-y divide-border-faint overflow-hidden rounded-lg border border-border bg-surface"
          aria-label="Lo del año"
        >
          <p className="px-4 pb-2 pt-3 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-fg-subtle">
            Este año
          </p>
          {delAnio.map((a) => (
            <Alerta key={a.clave} alerta={a} onReprocesar={() => setConfirmandoReproceso(true)} ocupado={reprocesando} />
          ))}
        </section>
      ) : null}

      {/* Para consultar: lo último que entró al libro (la fila abre el asiento). */}
      <UltimosAsientos
        asientos={datos.ultimos}
        cargando={cargando}
        fallo={falloDe('libro')}
        onAbrir={setAsientoAbierto}
      />

      {/* Las pantallas, agrupadas por CUÁNDO se usan (antes, doce tarjetas iguales con ícono en un
          círculo de color y flecha). */}
      <section className="space-y-3" aria-labelledby="pantallas-de-contabilidad">
        <h2 id="pantallas-de-contabilidad" className="text-sm font-semibold text-fg">
          Todas las pantallas de contabilidad
        </h2>
        <nav aria-label="Secciones de contabilidad" className="grid gap-x-5 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
          {gruposDeDestinos.map((g) => (
            <div key={g.titulo} className="min-w-0 space-y-2">
              <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-fg-subtle">
                {g.titulo}
              </h3>
              <ul className="divide-y divide-border-faint overflow-hidden rounded-lg border border-border bg-surface">
                {g.destinos.map((d) => (
                  <li key={d.href}>
                    <Link
                      href={d.href}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                    >
                      <d.icono className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
                      <span className="min-w-0 space-y-0.5">
                        <span className="block text-sm font-medium text-fg">{d.titulo}</span>
                        <span className="block text-caption text-fg-muted">{d.texto}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </section>

      {/* El asiento de «Últimos asientos», en el mismo cajón del libro. Si se
          reversa desde aquí, la portada se vuelve a leer: cambió el libro. */}
      <DetalleDeAsiento
        asiento={asientoAbierto}
        abierto={asientoAbierto !== null}
        onCerrar={() => setAsientoAbierto(null)}
        onReversado={() => void recargar()}
      />

      {/* CT2: reprocesar escribe en el libro. Se dice cuánto y qué antes. */}
      <AlertDialog
        open={confirmandoReproceso}
        onOpenChange={(abierto) => {
          if (!abierto && !reprocesando) setConfirmandoReproceso(false);
        }}
      >
        <AlertDialogContent
          variant="confirm"
          icon={<Notebook weight="bold" />}
          data-testid="confirmar-reproceso-dialogo"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {faltantes
                ? `¿Asentar ${plural(faltantes.total, 'movimiento', 'movimientos')} sin asiento?`
                : '¿Reprocesar los movimientos sin asiento?'}
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="confirmar-reproceso-detalle">
              {faltantes && faltantes.total > 0
                ? `Vas a generar los asientos de ${queSeVaAAsentar(faltantes)}. `
                : 'Vas a generar los asientos de los movimientos que todavía no tienen. '}
              Cada uno queda con la fecha de su documento y los asientos que ya existen no se tocan.
              Los que no se puedan asentar quedan como están y te digo por qué.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reprocesando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void reprocesar();
              }}
              loading={reprocesando}
              data-testid="confirmar-reproceso"
            >
              Asentar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
