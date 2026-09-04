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
 * Cada pedido falla por separado (`allSettled`): si el balance no responde,
 * las cuentas activas siguen apareciendo. Lo que no se pudo preguntar no
 * genera alerta — una portada que no sabe, no grita.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowsClockwise,
  BookOpenText,
  ChartBar,
  DownloadSimple,
  Info,
  Plugs,
  TreeStructure,
  Warning,
  WarningCircle,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import {
  contabilidadApi,
  type AsientoContable,
  type AsientosFaltantes,
  type Cierre,
} from '@/lib/api/contabilidad.service';
import {
  alertasDeContabilidad,
  describirAlerta,
  type AlertaDescrita,
  type MesAnterior,
} from '@/lib/contabilidad/alertas';
import {
  LibroDemasiadoGrande,
  csvDeAsientos,
  nombreDelCsv,
  todosLosAsientos,
} from '@/lib/contabilidad/csv';
import {
  diaLegible,
  hoy,
  primerDiaDelMes,
  rangoDelMesAnterior,
  rangoInvertido,
} from '@/lib/contabilidad/fechas';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Monto } from './Monto';
import { RangoDeFechas } from './RangoDeFechas';
import { CierreDePeriodo } from './asientos/CierreDePeriodo';

const BASE = '/panel/inmobiliaria/contabilidad';

/** Cuántos asientos recientes se listan. Cinco entran sin scroll. */
const ULTIMOS = 5;

// ══ Los datos de la portada ═════════════════════════════════════════════════

interface Portada {
  cuentasActivas: number | null;
  /** El libro entero: `total` y los `ULTIMOS` más recientes. */
  ultimos: AsientoContable[] | null;
  asientosEnElLibro: number | null;
  asientosDelMes: number | null;
  cierre: Cierre | null;
  /** ¿La consulta del cierre falló? `cierre: null` sola no lo distingue. */
  falloDelCierre: boolean;
  faltantes: AsientosFaltantes | null;
  balance: { cuadra: boolean; diferenciaCop: number } | null;
  mesAnterior: MesAnterior | null;
}

const NADA_TODAVIA: Portada = {
  cuentasActivas: null,
  ultimos: null,
  asientosEnElLibro: null,
  asientosDelMes: null,
  cierre: null,
  falloDelCierre: false,
  faltantes: null,
  balance: null,
  mesAnterior: null,
};

function valor<T>(r: PromiseSettledResult<T>): T | null {
  return r.status === 'fulfilled' ? r.value : null;
}

function usePortada() {
  const [datos, setDatos] = useState<Portada>(NADA_TODAVIA);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const mes = rangoDelMesAnterior();
    const [cuentas, libro, delMes, cierre, faltantes, balance, anterior] = await Promise.allSettled([
      contabilidadApi.puc.listar({ soloActivas: true }),
      contabilidadApi.asientos.listar({ limite: ULTIMOS }),
      contabilidadApi.asientos.listar({ desde: primerDiaDelMes(), hasta: hoy(), limite: 1 }),
      contabilidadApi.asientos.cierre(),
      contabilidadApi.asientos.faltantes(),
      contabilidadApi.reportes.balanceDePrueba({}),
      contabilidadApi.asientos.listar({ desde: mes.desde, hasta: mes.hasta, limite: 1 }),
    ]);

    const elLibro = valor(libro);
    const elBalance = valor(balance);
    const elMesAnterior = valor(anterior);

    setDatos({
      cuentasActivas: valor(cuentas)?.length ?? null,
      ultimos: elLibro?.asientos ?? null,
      asientosEnElLibro: elLibro?.total ?? null,
      asientosDelMes: valor(delMes)?.total ?? null,
      cierre: valor(cierre),
      falloDelCierre: cierre.status === 'rejected',
      faltantes: valor(faltantes),
      balance: elBalance ? { cuadra: elBalance.cuadra, diferenciaCop: elBalance.diferenciaCop } : null,
      mesAnterior: elMesAnterior
        ? { mes: mes.mes, hasta: mes.hasta, asientos: elMesAnterior.total }
        : null,
    });
    setCargando(false);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return { datos, cargando, recargar: cargar };
}

// ══ Piezas ══════════════════════════════════════════════════════════════════

function Cifra({
  etiqueta,
  valor: v,
  pie,
  cargando,
}: {
  etiqueta: string;
  valor: number | null;
  pie?: string;
  cargando: boolean;
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
          <span className="text-fg-subtle" title="No se pudo consultar">
            —
          </span>
        ) : (
          v.toLocaleString('es-CO')
        )}
      </dd>
      {pie && !cargando ? <p className="text-caption text-fg-muted">{pie}</p> : null}
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
        <Button variant="outline" size="sm" hideArrow onClick={onReprocesar} disabled={ocupado}>
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

function UltimosAsientos({ asientos, cargando }: { asientos: AsientoContable[] | null; cargando: boolean }) {
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
      const asientos = await todosLosAsientos(
        (f) => contabilidadApi.asientos.listar(f),
        { desde: rango.desde || undefined, hasta: rango.hasta || undefined },
      );
      if (asientos.length === 0) {
        toast.warning('No hay asientos en ese rango: el archivo saldría vacío.');
        return;
      }
      const blob = new Blob([csvDeAsientos(asientos)], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = nombreDelCsv(rango.desde, rango.hasta, hoy());
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
      toast.success(
        asientos.length === 1
          ? '1 asiento en el archivo.'
          : `${asientos.length.toLocaleString('es-CO')} asientos en el archivo.`,
      );
    } catch (e) {
      toast.error(
        e instanceof LibroDemasiadoGrande
          ? e.message
          : mensajeDeContabilidad(e, 'No se pudo armar el archivo.'),
      );
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
];

// ══ La portada ══════════════════════════════════════════════════════════════

export function HubDeContabilidad() {
  const { formatCurrency } = useI18n();
  const { datos, cargando, recargar } = usePortada();
  const [reprocesando, setReprocesando] = useState(false);
  const cierreRef = useRef<HTMLDivElement>(null);

  const alertas = useMemo(
    () =>
      alertasDeContabilidad({
        faltantes: datos.faltantes,
        balance: datos.balance,
        cierre: datos.cierre,
        mesAnterior: datos.mesAnterior,
      }).map((a) => describirAlerta(a, formatCurrency)),
    [datos, formatCurrency],
  );

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
      await recargar();
    } catch (e) {
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

  return (
    <div className="space-y-6">
      <dl
        className="grid gap-6 rounded-lg border border-border bg-surface p-6 sm:grid-cols-3"
        aria-label="Resumen del libro"
      >
        <Cifra etiqueta="Cuentas activas" valor={datos.cuentasActivas} cargando={cargando} />
        <Cifra
          etiqueta="Asientos este mes"
          valor={datos.asientosDelMes}
          pie={pieDelMes}
          cargando={cargando}
        />
        <Cifra etiqueta="Asientos en el libro" valor={datos.asientosEnElLibro} cargando={cargando} />
      </dl>

      {alertas.length > 0 ? (
        <section className="space-y-3" aria-label="Alertas de contabilidad">
          {alertas.map((a) => (
            <Alerta
              key={a.clave}
              alerta={a}
              onReprocesar={() => void reprocesar()}
              onCerrarMes={irAlCierre}
              ocupado={reprocesando}
            />
          ))}
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <UltimosAsientos asientos={datos.ultimos} cargando={cargando} />
        <ParaElContador />
      </div>

      {/* `tabIndex={-1}`: la alerta «Cerrar el mes» trae el foco acá, y sin
          esto un div no lo recibe. */}
      <div ref={cierreRef} tabIndex={-1} className="outline-none">
        <CierreDePeriodo
          cierre={datos.cierre}
          cargando={cargando}
          fallo={datos.falloDelCierre}
          onCerrado={() => void recargar()}
        />
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
    </div>
  );
}
