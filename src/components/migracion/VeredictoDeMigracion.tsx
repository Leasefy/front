"use client";

/**
 * El veredicto de la migración — «cómo quedó», con números y con botón.
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 *
 * Hasta acá el muro medía PASOS: subiste el archivo de contratos ⇒ paso
 * listo ⇒ «Tu operación ya está adentro» ⇒ entrás al panel. En la agencia de
 * Nico eso dio: 91 contratos migrados, **89 sin inmueble y sin propietario**,
 * y el muro felicitando. Sin inmueble no hay consignación, sin consignación
 * no hay cobro, y sin cobro la pantalla de Inquilinos queda vacía y le pide
 * que migre — justo después de haber migrado.
 *
 * Esta pantalla cierra el muro con el RESULTADO: cuántos entraron, cuántos
 * quedaron a medias y por qué, cada línea con el botón que lleva a
 * arreglarlo. Mientras haya una línea, el muro no dice que terminó.
 *
 * ── Nada se infiere ───────────────────────────────────────────────────────
 *
 * Todos los números salen de `GET /contracts/migrar/resumen` (vía
 * `useDeudaDeMigracion`) y las filas de `GET /contracts/migrar/filas`. Un
 * motivo que el back no cuenta no se dibuja — nunca en `0`.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ListChecks, Warning } from "@phosphor-icons/react";
import { SegmentedControl } from "@leasefy/cadence";

import { Button } from "@/components/ui/button";
import { EstadoDeDatos } from "@/components/estado/EstadoDeDatos";
import { SinDatos } from "@/components/estado/SinDatos";
import { TablePagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  contractsApi,
  type EstadoMigracion,
  type FilaDeMigracion,
} from "@/lib/api/contracts.service";
import {
  faltasDeLaFila,
  lineasDeVeredicto,
  type DeudaDeMigracion,
  type MotivoDeDeuda,
} from "./muro-reglas";

const RAIZ = "migracion.muro.veredicto";

/** Adónde se resuelve cada cosa. Hoy todo se resuelve en el paso de contratos. */
export interface ComoResolver {
  /** Dentro del muro: saltar al paso, porque no hay ruta a la que navegar. */
  onIr?: () => void;
  /** Fuera del muro: la ruta de la migración. */
  href?: string;
}

// ══════════════════════════════════════════════════════════════════════════
// El veredicto
// ══════════════════════════════════════════════════════════════════════════

export function VeredictoDeMigracion({
  deuda,
  resolver,
  className,
}: {
  deuda: DeudaDeMigracion;
  resolver: ComoResolver;
  className?: string;
}) {
  const { t } = useI18n();
  const lineas = lineasDeVeredicto(deuda);

  return (
    <section
      className={cn(
        "rounded-lg border border-warning/40 bg-warning-soft p-5 sm:p-6",
        className,
      )}
      data-testid="muro-veredicto"
      aria-labelledby="muro-veredicto-titulo"
    >
      <div className="flex items-start gap-4 sm:gap-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-warning">
          <Warning className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            {t(`${RAIZ}.eyebrow`)}
          </p>
          <h2
            id="muro-veredicto-titulo"
            className="mt-1 text-lg font-semibold tracking-tight text-fg"
          >
            {t(`${RAIZ}.titulo`)}
          </h2>
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-fg-muted">
            {t(`${RAIZ}.detalle`)}
          </p>

          {/* El total primero: es el denominador de todo lo de abajo. */}
          <p
            className="mt-4 font-mono text-sm tabular-nums text-fg"
            data-testid="veredicto-contratos"
          >
            {t(`${RAIZ}.contratos`, { n: deuda.contratos })}
          </p>

          <ul className="mt-3 space-y-2">
            {lineas.map((linea) => (
              <LineaDelVeredicto
                key={linea.motivo}
                motivo={linea.motivo}
                cantidad={linea.cantidad}
                resolver={resolver}
              />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function LineaDelVeredicto({
  motivo,
  cantidad,
  resolver,
}: {
  motivo: MotivoDeDeuda;
  cantidad: number;
  resolver: ComoResolver;
}) {
  const { t } = useI18n();
  const etiqueta = t(`${RAIZ}.${motivo}.accion`);

  return (
    <li
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      data-testid="veredicto-linea"
      data-motivo={motivo}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium tabular-nums text-fg">
          {t(`${RAIZ}.${motivo}.linea`, { n: cantidad })}
        </p>
        <p className="mt-0.5 text-caption text-fg-muted">
          {t(`${RAIZ}.${motivo}.detalle`)}
        </p>
      </div>
      {/* Ningún control sin comportamiento: si no hay adónde ir, no hay botón. */}
      {resolver.href ? (
        <Button asChild size="sm" variant="outline" hideArrow className="shrink-0">
          <Link href={resolver.href} className="gap-1.5">
            {etiqueta}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      ) : resolver.onIr ? (
        <Button
          size="sm"
          variant="outline"
          hideArrow
          className="shrink-0 gap-1.5"
          onClick={resolver.onIr}
          data-testid="veredicto-resolver"
        >
          {etiqueta}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </li>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Fila por fila
// ══════════════════════════════════════════════════════════════════════════

const POR_PAGINA = [10, 20, 50];

/**
 * La tabla de las filas frenadas: fila del archivo · dirección · inquilino ·
 * qué le falta · acción.
 *
 * 🔴 Dos lentes, no una. Una fila PENDIENTE no llegó a ser contrato; una
 * ACTIVADA sí, y su deuda no está en `faltantes` sino en sus columnas. Medir
 * por un solo camino es cómo 89 contratos sin inmueble se veían como cero.
 * El selector arranca en la lente que TIENE algo, y sólo se ofrece la que el
 * resumen dice que tiene filas.
 */
export function FilasFrenadas({
  deuda,
  resolver,
  className,
}: {
  deuda: DeudaDeMigracion;
  resolver: ComoResolver;
  className?: string;
}) {
  const { t } = useI18n();

  const activadas = deuda.sinInmueble + deuda.sinPropietario;
  const lentes: EstadoMigracion[] = [];
  if (deuda.pendientes > 0) lentes.push("PENDIENTE");
  if (activadas > 0) lentes.push("ACTIVADO");

  const [lente, setLente] = useState<EstadoMigracion>(lentes[0] ?? "ACTIVADO");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [filas, setFilas] = useState<FilaDeMigracion[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  /*
   * El `return null` de más abajo llega DESPUÉS de los hooks: sin esta
   * guarda, una agencia sin deuda igual pedía la página de filas. No es una
   * lectura barata —cuenta contratos y consignaciones— y no se iba a ver.
   */
  const hayQueMirar = lentes.length > 0;
  const hayAccion = Boolean(resolver.href || resolver.onIr);

  const cargar = useCallback(async () => {
    if (!hayQueMirar) return;
    setCargando(true);
    setError(null);
    try {
      // Sin `lote`: la agencia entera. Quien mira este veredicto no sabe —ni
      // tiene por qué saber— en cuántos archivos entró su cartera.
      const pagina1 = await contractsApi.migracion.filas(undefined, {
        pagina,
        porPagina,
        estado: lente,
      });
      setFilas(pagina1.filas);
      // El total sale del back, nunca del largo de lo recibido.
      setTotal(pagina1.total);
    } catch (e) {
      setError(e);
      setFilas([]);
      setTotal(0);
    } finally {
      setCargando(false);
    }
  }, [pagina, porPagina, lente, hayQueMirar]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!hayQueMirar) return null;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-surface",
        className,
      )}
      data-testid="veredicto-filas"
    >
      {/* El selector va ADENTRO de la tarjeta, como el resto de las tablas
          del panel: una barra sobre la tabla, no un título encima de ella. */}
      {lentes.length > 1 ? (
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <SegmentedControl<EstadoMigracion>
            value={lente}
            onChange={(v) => {
              setLente(v);
              setPagina(1);
            }}
            aria-label={t(`${RAIZ}.tabla.queMirar`)}
            options={[
              {
                value: "PENDIENTE",
                label: t(`${RAIZ}.tabla.verPendientes`, { n: deuda.pendientes }),
              },
              {
                value: "ACTIVADO",
                label: t(`${RAIZ}.tabla.verActivadas`, { n: activadas }),
              },
            ]}
          />
        </div>
      ) : null}

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        queEs={t(`${RAIZ}.tabla.queEs`)}
        onReintentar={() => void cargar()}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">
                {t(`${RAIZ}.tabla.fila`)}
              </TableHead>
              <TableHead>{t(`${RAIZ}.tabla.direccion`)}</TableHead>
              <TableHead>{t(`${RAIZ}.tabla.inquilino`)}</TableHead>
              <TableHead>{t(`${RAIZ}.tabla.falta`)}</TableHead>
              {/* La columna de acción sólo existe si hay una acción. En la
                  pantalla de migración ya estás donde se resuelve. */}
              {hayAccion ? <TableHead /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={hayAccion ? 5 : 4} className="p-0">
                  <SinDatos
                    queSon={t(`${RAIZ}.tabla.queSon`)}
                    icono={ListChecks}
                    descripcion={t(`${RAIZ}.tabla.vacio`)}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filas.map((fila) => (
                <FilaFrenada
                  key={fila.id}
                  fila={fila}
                  resolver={resolver}
                  hayAccion={hayAccion}
                />
              ))
            )}
          </TableBody>
        </Table>

        {total > 0 ? (
          <div className="border-t border-border px-4 py-3">
            <TablePagination
              total={total}
              page={pagina}
              pageSize={porPagina}
              pageSizeOptions={POR_PAGINA}
              onPageChange={setPagina}
              onPageSizeChange={(n) => {
                setPorPagina(n);
                setPagina(1);
              }}
            />
          </div>
        ) : null}
      </EstadoDeDatos>
    </section>
  );
}

function FilaFrenada({
  fila,
  resolver,
  hayAccion,
}: {
  fila: FilaDeMigracion;
  resolver: ComoResolver;
  hayAccion: boolean;
}) {
  const { t } = useI18n();
  const faltas = faltasDeLaFila(fila);
  const direccion = fila.datos.direccion?.trim();
  const inquilino = fila.datos.inquilino?.nombre?.trim();

  return (
    <TableRow data-testid="veredicto-fila" data-faltas={faltas.join(",")}>
      <TableCell className="whitespace-nowrap font-mono tabular-nums text-fg-muted">
        {fila.fila}
      </TableCell>
      <TableCell className="max-w-[260px]">
        <span className="block truncate text-fg">
          {direccion || t(`${RAIZ}.tabla.sinDato`)}
        </span>
      </TableCell>
      <TableCell className="max-w-[220px]">
        <span className="block truncate text-fg-muted">
          {inquilino || t(`${RAIZ}.tabla.sinDato`)}
        </span>
      </TableCell>
      <TableCell>
        {faltas.length === 0 ? (
          <span className="text-fg-subtle">{t(`${RAIZ}.tabla.nada`)}</span>
        ) : (
          <span className="flex flex-wrap gap-1">
            {faltas.map((falta) => (
              <span
                key={falta}
                className="rounded-full bg-warning-soft px-2 py-0.5 text-caption font-medium text-warning"
              >
                {t(`${RAIZ}.tabla.faltas.${falta}`)}
              </span>
            ))}
          </span>
        )}
      </TableCell>
      {!hayAccion ? null : (
      <TableCell className="whitespace-nowrap text-right">
        {faltas.length === 0 ? null : resolver.href ? (
          <Button asChild size="sm" variant="ghost" hideArrow>
            <Link href={resolver.href}>{t(`${RAIZ}.tabla.resolver`)}</Link>
          </Button>
        ) : resolver.onIr ? (
          <Button size="sm" variant="ghost" hideArrow onClick={resolver.onIr}>
            {t(`${RAIZ}.tabla.resolver`)}
          </Button>
        ) : null}
      </TableCell>
      )}
    </TableRow>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// La misma verdad, dicha en una lista vacía
// ══════════════════════════════════════════════════════════════════════════

/**
 * «89 sin inmueble · 84 sin propietario» — la deuda en una frase.
 *
 * Se arma con las MISMAS líneas del veredicto para que Inquilinos,
 * Propietarios y Cobros no puedan contradecir al muro: un solo texto, una
 * sola fuente.
 */
export function useFraseDeDeuda(): (deuda: DeudaDeMigracion) => string {
  const { t } = useI18n();
  return useCallback(
    (deuda: DeudaDeMigracion) =>
      lineasDeVeredicto(deuda)
        .map((linea) => t(`${RAIZ}.${linea.motivo}.linea`, { n: linea.cantidad }))
        .join(" · "),
    [t],
  );
}

/** El título y la descripción de una lista que está vacía POR la migración. */
export function useCopyDeMigracionEnLista(): (deuda: DeudaDeMigracion) => {
  titulo: string;
  detalle: string;
  accion: string;
} {
  const { t } = useI18n();
  const frase = useFraseDeDeuda();
  return useCallback(
    (deuda: DeudaDeMigracion) => ({
      titulo: t("migracion.enLaLista.titulo", { n: deuda.contratos }),
      detalle: t("migracion.enLaLista.detalle", { deuda: frase(deuda) }),
      accion: t("migracion.enLaLista.accion"),
    }),
    [t, frase],
  );
}

/** La ruta que resuelve la deuda cuando el muro ya no está puesto. */
export const RUTA_DE_LA_MIGRACION = "/panel/inmobiliaria/contratos/migrar";
