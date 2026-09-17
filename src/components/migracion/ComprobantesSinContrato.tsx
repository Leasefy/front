"use client";

/**
 * Lo que YA está guardado: cuántos comprobantes quedaron sin contrato —o sea,
 * sin inquilino ni propietario—, por tipo, y por qué.
 *
 * ── Por qué existe (Nico, 2026-09-16) ──────────────────────────────────────
 *
 * En la inmobiliaria migrada, las 56.492 facturas quedaron sin inquilino y
 * nada en la pantalla decía por qué. No era un error de la migración: el
 * export «Accounting Documents.csv» trae la factura como «Factura 57521», sin
 * el cliente, y eso no se arregla con código ni volviendo a subir el archivo.
 * Lo único que lo arregla es pedirle al sistema anterior otro reporte, y la
 * pantalla tiene que decir cuál.
 *
 * Los números y el porqué vienen del back
 * (`GET …/migracion/documentos/sin-contrato`), decididos con las mismas reglas
 * que asocian: esta pantalla no re-deriva nada.
 */

import { useCallback, useEffect, useState } from "react";
import { Info, Warning } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  contabilidadApi,
  type ClaseDeComprobante,
  type MotivoSinContrato,
  type ResumenSinContrato,
} from "@/lib/api/contabilidad.service";

import { mensajeDeContabilidad } from "./contabilidad-errores";

const CLASES: { clase: ClaseDeComprobante; titulo: string }[] = [
  { clase: "factura", titulo: "Facturas" },
  { clase: "ingreso", titulo: "Comprobantes de ingreso" },
  { clase: "egreso", titulo: "Comprobantes de egreso" },
  { clase: "otro", titulo: "Otros (notas, gastos, nómina…)" },
];

/** Qué quiere decir cada motivo, dicho para quien migra. */
export const MOTIVO_SIN_CONTRATO: Record<MotivoSinContrato, string> = {
  EXPORT_SIN_TERCERO:
    "el export no trae a quién: el concepto es sólo el tipo y el número («Factura 57521») o viene vacío",
  REFERENCIA_SIN_RESOLVER:
    "dice «CONTRATO N» o «COD. N», pero ese número no existe, o el inmueble tenía varios contratos vigentes —o ninguno— ese día, y no se adivina",
  TERCERO_SIN_CONTRATO:
    "nombra a alguien que no es inquilino ni propietario de ningún contrato tuyo",
  CONCEPTO_SIN_TERCERO:
    "el concepto no nombra a nadie (gastos de la oficina, nómina, notas bancarias…)",
};

const ORDEN_DE_MOTIVOS: MotivoSinContrato[] = [
  "EXPORT_SIN_TERCERO",
  "REFERENCIA_SIN_RESOLVER",
  "TERCERO_SIN_CONTRATO",
  "CONCEPTO_SIN_TERCERO",
];

const n = (valor: number) => valor.toLocaleString("es-CO");

export function ComprobantesSinContrato({
  version = 0,
}: {
  /** Cambia cuando se termina de migrar: los números de abajo ya no son esos. */
  version?: number;
}) {
  const [resumen, setResumen] = useState<ResumenSinContrato | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setResumen(await contabilidadApi.migracion.documentos.sinContrato());
    } catch (e) {
      setError(
        mensajeDeContabilidad(e, "No pudimos contar los comprobantes sin contrato."),
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar, version]);

  if (cargando && !resumen) {
    return (
      <p className="text-sm text-fg-muted" data-testid="sin-contrato-cargando">
        Contando los comprobantes que ya están guardados…
      </p>
    );
  }

  if (error) {
    return (
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-danger-soft p-3"
        role="alert"
        data-testid="sin-contrato-error"
      >
        <p className="text-sm text-fg">{error}</p>
        <Button size="sm" variant="outline" hideArrow onClick={() => void cargar()}>
          Intentar de nuevo
        </Button>
      </div>
    );
  }

  // Sin nada guardado todavía, no hay qué explicar.
  if (!resumen || resumen.total === 0) return null;

  const facturasSinCliente = resumen.porClase.factura.motivos.EXPORT_SIN_TERCERO;
  const clases = CLASES.filter(({ clase }) => resumen.porClase[clase].total > 0);

  return (
    <section
      className="rounded-lg border border-border bg-surface p-5"
      data-testid="sin-contrato"
      aria-live="polite"
    >
      <h3 className="font-medium text-fg">
        Lo que ya está guardado: cuántos quedaron sin inquilino
      </h3>
      <p className="mt-0.5 text-sm text-fg-muted">
        <span className="font-mono tabular-nums text-fg">{n(resumen.sinContrato)}</span> de{" "}
        <span className="font-mono tabular-nums text-fg">{n(resumen.total)}</span> comprobantes
        no están colgados de ningún contrato, o sea, de ningún inquilino ni propietario. Se
        guardan igual; lo que no se hace es inventarles un contrato.
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Guardados</TableHead>
              <TableHead className="text-right">Con contrato</TableHead>
              <TableHead className="text-right">Sin contrato</TableHead>
              <TableHead>Por qué quedaron sin contrato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clases.map(({ clase, titulo }) => {
              const fila = resumen.porClase[clase];
              const motivos = ORDEN_DE_MOTIVOS.filter((m) => fila.motivos[m] > 0);
              return (
                <TableRow key={clase} data-testid={`sin-contrato-${clase}`}>
                  <TableCell className="whitespace-nowrap font-medium">{titulo}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {n(fila.total)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-success">
                    {n(fila.conContrato)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {n(fila.sinContrato)}
                  </TableCell>
                  <TableCell className="min-w-[18rem] text-sm text-fg-muted">
                    {motivos.length === 0 ? (
                      "—"
                    ) : (
                      <ul className="space-y-1">
                        {motivos.map((m) => (
                          <li key={m} data-testid={`sin-contrato-${clase}-${m}`}>
                            <span className="font-mono tabular-nums text-fg">
                              {n(fila.motivos[m])}
                            </span>{" "}
                            {MOTIVO_SIN_CONTRATO[m]}
                          </li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {facturasSinCliente > 0 ? (
        <div
          className="mt-4 flex items-start gap-2 rounded-md border border-border bg-warning-soft p-3"
          data-testid="sin-contrato-que-pedir"
        >
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="text-sm text-fg">
            <p className="font-medium">
              {n(facturasSinCliente)} {facturasSinCliente === 1 ? "factura no tiene" : "facturas no tienen"}{" "}
              cliente porque el export no lo trae
            </p>
            <p className="mt-0.5 text-fg-muted">
              El archivo de comprobantes trae cada factura como «Factura 57521»: el número y
              nada más. No es un error de la migración y volver a subir el mismo archivo no lo
              arregla. Pídele al sistema anterior uno de estos dos reportes:
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-fg-muted">
              <li>
                <strong className="text-fg">El reporte de facturas emitidas</strong>, con el
                prefijo y el número de cada factura, la fecha, el total, el NIT o la cédula y
                el nombre del cliente, y el consecutivo del contrato.
              </li>
              <li>
                <strong className="text-fg">El libro auxiliar por tercero</strong>, que dice
                a nombre de quién quedó cada factura.
              </li>
            </ol>
          </div>
        </div>
      ) : null}

      <p className="mt-3 flex items-start gap-1.5 text-xs text-fg-subtle">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Un comprobante se cuelga de un contrato por el documento o el nombre del tercero, o
        porque el concepto dice «CONTRATO N» o el código del inmueble. Colgarlo del contrato
        equivocado sería peor que dejarlo suelto: la ficha del inquilino mentiría.
      </p>
    </section>
  );
}
