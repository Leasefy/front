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
  ArrowRight,
  ArrowsClockwise,
  Bank,
  BookOpenText,
  ChartBar,
  ChartPieSlice,
  DownloadSimple,
  Certificate,
  FileCsv,
  Info,
  Plugs,
  Receipt,
  Scales,
  TreeStructure,
  Warning,
  WarningCircle,
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
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import {
  contabilidadApi,
  type AsientoContable,
  type AsientosFaltantes,
  type Cierre,
} from '@/lib/api/contabilidad.service';
import { gastosApi } from '@/lib/api/gastos.service';
import { exogenaApi } from '@/lib/api/exogena.service';
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
  diaLegible,
  hoy,
  primerDiaDelMes,
  rangoDelMesAnterior,
  rangoInvertido,
} from '@/lib/contabilidad/fechas';
import { clasificarFallo } from '@/lib/errores/clasificar';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Monto } from './Monto';
import { RangoDeFechas } from './RangoDeFechas';
import { CierreDePeriodo } from './asientos/CierreDePeriodo';

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
  faltantes: async () => ({ faltantes: await contabilidadApi.asientos.faltantes() }),
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
function motivoDelFallo(error: unknown): string {
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
    default:
      return 'falló del lado del servidor';
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

function Cifra({
  etiqueta,
  valor: v,
  pie,
  cargando,
  fallo,
}: {
  etiqueta: string;
  valor: number | null;
  pie?: string;
  cargando: boolean;
  fallo?: FalloDeTarjeta;
}) {
  return (
    <div className="space-y-1">
      <dt className="font-mono text-label uppercase tracking-wide text-fg-muted">{etiqueta}</dt>
      <dd className="text-2xl font-semibold tabular-nums text-fg">
        {cargando ? (
          <span
            className="inline-block h-7 w-16 animate-pulse rounded-sm bg-surface-muted"
            aria-label="cargando"
          />
        ) : v === null ? (
          <span className="text-fg-subtle">—</span>
        ) : (
          v.toLocaleString('es-CO')
        )}
      </dd>
      {!cargando && fallo ? (
        <NoCargo {...fallo} />
      ) : pie && !cargando ? (
        <p className="text-caption text-fg-muted">{pie}</p>
      ) : null}
    </div>
  );
}

const PINTURA: Record<AlertaDescrita['severidad'], { caja: string; icono: string; Icono: Icon }> = {
  danger: { caja: 'border-danger/40 bg-danger-soft', icono: 'text-danger', Icono: WarningCircle },
  warning: { caja: 'border-warning/40 bg-warning-soft', icono: 'text-warning', Icono: Warning },
  info: { caja: 'border-border bg-surface-muted', icono: 'text-fg-muted', Icono: Info },
};

function Alerta({
  alerta,
  onReprocesar,
  onCerrarMes,
  ocupado,
}: {
  alerta: AlertaDescrita;
  onReprocesar: () => void;
  onCerrarMes: () => void;
  ocupado: boolean;
}) {
  const { caja, icono, Icono } = PINTURA[alerta.severidad];
  return (
    <div
      className={cn('flex flex-wrap items-start gap-3 rounded-lg border p-4', caja)}
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
          data-testid="reprocesar-asientos"
        >
          <ArrowsClockwise className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {ocupado ? 'Reprocesando…' : alerta.accion.label}
        </Button>
      ) : (
        <Button variant="outline" size="sm" hideArrow onClick={onCerrarMes}>
          {alerta.accion.label}
        </Button>
      )}
    </div>
  );
}

function UltimosAsientos({
  asientos,
  cargando,
  fallo,
}: {
  asientos: AsientoContable[] | null;
  cargando: boolean;
  fallo?: FalloDeTarjeta;
}) {
  return (
    <section className="flex flex-col rounded-lg border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-fg">Últimos asientos</h2>
        <Link href={`${BASE}/asientos`} className="text-caption text-primary hover:underline">
          Ver el libro
        </Link>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : fallo ? (
        <div className="py-6">
          <NoCargo {...fallo} />
        </div>
      ) : asientos === null ? (
        <p className="py-6 text-sm text-fg-muted">No se pudo leer el libro.</p>
      ) : asientos.length === 0 ? (
        <p className="py-6 text-sm text-fg-muted">
          Todavía no hay asientos. El primero puede ser manual, o entrar por la migración.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border-faint">
          {asientos.map((a) => (
            <li key={a.id} className="flex items-baseline gap-3 py-2">
              <span className="w-[7.5rem] shrink-0 truncate text-caption tabular-nums text-fg-muted">
                {diaLegible(a.fecha)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-fg" title={a.descripcion}>
                {a.descripcion}
              </span>
              <Monto
                valor={a.movimientos.reduce((s, m) => s + (m.debitoCop ?? 0), 0)}
                className="shrink-0 text-caption"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ParaElContador() {
  const inicial = useMemo(() => rangoDelMesAnterior(), []);
  const [rango, setRango] = useState({ desde: inicial.desde, hasta: inicial.hasta });
  const [bajando, setBajando] = useState(false);

  const invertido = rangoInvertido(rango.desde, rango.hasta);

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
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo armar el archivo.'));
    } finally {
      setBajando(false);
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="space-y-0.5">
        <h2 className="text-sm font-semibold text-fg">Para el contador</h2>
        <p className="text-caption text-fg-muted">
          El libro del rango en CSV —una línea por movimiento, con su cuenta y su lado—, más los
          informes que va a pedir.
        </p>
      </div>

      <RangoDeFechas desde={rango.desde} hasta={rango.hasta} onChange={setRango} disabled={bajando} />

      <Button
        variant="outline"
        hideArrow
        onClick={() => void descargar()}
        disabled={bajando || invertido}
        data-testid="descargar-csv"
      >
        <DownloadSimple className="mr-1.5 h-4 w-4" aria-hidden="true" />
        {bajando ? 'Armando el archivo…' : 'Descargar el libro en CSV'}
      </Button>

      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3">
        <Link
          href={`${BASE}/reportes?informe=balance`}
          className="text-caption text-primary hover:underline"
        >
          Balance de prueba
        </Link>
        <Link
          href={`${BASE}/reportes?informe=auxiliar`}
          className="text-caption text-primary hover:underline"
        >
          Libro auxiliar por cuenta
        </Link>
        <Link
          href={`${BASE}/reportes?informe=tercero`}
          className="text-caption text-primary hover:underline"
        >
          Estado de cuenta
        </Link>
        {/* Las tres pantallas de la lógica financiera del 17-09. Van acá como
            enlaces y no como cards: el hub es el LIBRO, y estas tres son
            trabajo del contador que cuelga de él, no otro libro. */}
        <Link
          href={`${BASE}/deterioro`}
          className="text-caption text-primary hover:underline"
          data-testid="ir-al-deterioro"
        >
          Deterioro de cartera
        </Link>
        <Link
          href={`${BASE}/certificados`}
          className="text-caption text-primary hover:underline"
          data-testid="ir-a-certificados"
        >
          Certificados de retención
        </Link>
        <Link
          href={`${BASE}/presupuesto`}
          className="text-caption text-primary hover:underline"
          data-testid="ir-al-presupuesto"
        >
          Presupuesto
        </Link>
        {/* Los tres informes del 18-09 que el contador pide por nombre. */}
        <Link
          href={`${BASE}/estados-financieros?informe=pyg`}
          className="text-caption text-primary hover:underline"
          data-testid="ir-al-pyg"
        >
          Estado de resultados
        </Link>
        <Link
          href={`${BASE}/estados-financieros?informe=balance`}
          className="text-caption text-primary hover:underline"
          data-testid="ir-al-balance-general"
        >
          Balance general
        </Link>
        <Link
          href={`${BASE}/reportes?informe=mayor`}
          className="text-caption text-primary hover:underline"
          data-testid="ir-al-mayor"
        >
          Libro mayor
        </Link>
        <Link
          href={`${BASE}/reportes?informe=terceros`}
          className="text-caption text-primary hover:underline"
          data-testid="ir-a-terceros"
        >
          Auxiliar por tercero
        </Link>
        <Link
          href={`${BASE}/exogena`}
          className="text-caption text-primary hover:underline"
          data-testid="ir-a-la-exogena"
        >
          Exógena
        </Link>
      </div>
    </section>
  );
}

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
];

/**
 * Las revisiones que alimentan las alertas. Si una no carga, «no hay alertas»
 * deja de significar «está todo bien», y eso se dice.
 */
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
  return `${n.toLocaleString('es-CO')} ${n === 1 ? singular : varios}`;
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

  const reprocesar = async () => {
    setReprocesando(true);
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
      setConfirmandoReproceso(false);
      await recargar();
    } catch (e) {
      // El diálogo queda abierto: reintentar no obliga a volver a abrirlo.
      toast.error(mensajeDeContabilidad(e, 'No se pudo reprocesar.'));
    } finally {
      setReprocesando(false);
    }
  };

  // El botón de la alerta no cierra nada solo: lleva al bloque de cierre, que
  // es donde se escribe la fecha para confirmar. Cerrar un mes con un clic
  // desde una alerta sería irreversible sin haberlo leído.
  const irAlCierre = () => {
    const nodo = cierreRef.current;
    if (!nodo) return;
    nodo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    nodo.focus({ preventScroll: true });
  };

  // Un cero de este mes no significa un libro vacío: si el último asiento es
  // de agosto y estamos en septiembre, el 0 es correcto y engañoso a la vez.
  const ultimo = datos.ultimos?.[0];
  const pieDelMes =
    datos.asientosDelMes === 0 && ultimo ? `el último, el ${diaLegible(ultimo.fecha)}` : undefined;

  const revisionesCaidas = cargando ? [] : REVISIONES.filter((r) => r.consulta in datos.fallos);
  const faltantes = datos.faltantes;

  return (
    <div className="space-y-6">
      <dl
        className="grid gap-6 rounded-lg border border-border bg-surface p-6 sm:grid-cols-3"
        aria-label="Resumen del libro"
      >
        <Cifra
          etiqueta="Cuentas activas"
          valor={datos.cuentasActivas}
          cargando={cargando}
          fallo={falloDe('cuentas')}
        />
        <Cifra
          etiqueta="Asientos este mes"
          valor={datos.asientosDelMes}
          pie={pieDelMes}
          cargando={cargando}
          fallo={falloDe('delMes')}
        />
        <Cifra
          etiqueta="Asientos en el libro"
          valor={datos.asientosEnElLibro}
          cargando={cargando}
          fallo={falloDe('libro')}
        />
      </dl>

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

      {alertas.length > 0 ? (
        <section className="space-y-3" aria-label="Alertas de contabilidad">
          {alertas.map((a) => (
            <Alerta
              key={a.clave}
              alerta={a}
              onReprocesar={() => setConfirmandoReproceso(true)}
              onCerrarMes={irAlCierre}
              ocupado={reprocesando}
            />
          ))}
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <UltimosAsientos asientos={datos.ultimos} cargando={cargando} fallo={falloDe('libro')} />
        <ParaElContador />
      </div>

      {/* `tabIndex={-1}`: la alerta «Cerrar el mes» trae el foco acá, y sin
          esto un div no lo recibe. */}
      <div ref={cierreRef} tabIndex={-1} className="space-y-2 outline-none">
        <CierreDePeriodo
          cierre={datos.cierre}
          cargando={cargando}
          fallo={'cierre' in datos.fallos}
          onCerrado={() => void recargar()}
        />
        {!cargando && falloDe('cierre') ? <NoCargo {...falloDe('cierre')!} /> : null}
      </div>

      <nav aria-label="Secciones de contabilidad" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {DESTINOS.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className="group flex items-start gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-surface-muted"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft">
              <d.icono className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-semibold text-fg">{d.titulo}</p>
              <p className="text-caption text-fg-muted">{d.texto}</p>
            </div>
            <ArrowRight
              className="mt-1 h-4 w-4 shrink-0 text-fg-subtle transition group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        ))}
      </nav>

      {/* CT2: reprocesar escribe en el libro. Se dice cuánto y qué antes. */}
      <AlertDialog
        open={confirmandoReproceso}
        onOpenChange={(abierto) => {
          if (!abierto && !reprocesando) setConfirmandoReproceso(false);
        }}
      >
        <AlertDialogContent data-testid="confirmar-reproceso-dialogo">
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
                // Se cierra sólo cuando el back contestó.
                e.preventDefault();
                void reprocesar();
              }}
              disabled={reprocesando}
              data-testid="confirmar-reproceso"
            >
              {reprocesando ? 'Asentando…' : 'Asentar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
