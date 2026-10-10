"use client";

/**
 * PendientesPorMotivo — por qué quedan filas pendientes en el lote, TODOS los
 * motivos, con su número del servidor (`resumen.porMotivo`), su explicación en
 * español y dónde se arregla (T-0156).
 *
 * Antes sólo `uso` y `propietario` se veían a nivel de lote: 670 filas
 * pendientes se reducían a «les falta algo» y los otros motivos sólo
 * aparecían al abrir fila por fila. Alerta = ícono + texto de color, nunca un
 * chip con forma de botón; el botón es sólo la acción.
 */

import { Warning } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { explicacionDe } from "./FaltantesDeFila";

/** Los que el bloque «Lo que todavía falta resolver en bloque» ya muestra. */
const YA_EN_EL_BLOQUE_DE_ARRIBA = new Set(["uso", "propietario"]);

/** Dónde se arregla lo que no tiene acción en bloque. */
const DONDE_SE_ARREGLA: Record<string, string> = {
  inmueble_ambiguo: "Se elige en cada fila.",
  inmueble_codigo: "Se elige o se crea en cada fila.",
  inmueble_en_venta:
    "Se elige otro inmueble en cada fila, o se cambia su ficha a arriendo y se vuelve a cruzar.",
  inmueble_ocupado: "En cada fila: elige otro inmueble o confirma «seguir igual».",
  inquilino_correo: "Se escribe en cada fila.",
  inquilino_correo_invalido: "Se corrige en cada fila.",
  inquilino_nombre: "Se escribe en cada fila.",
  inquilino_documento_ajeno: "Se corrige en cada fila.",
  fechas: "Se escriben en cada fila.",
  canon: "Se escribe en cada fila.",
  canon_con_centavos: "Se escribe al peso en cada fila.",
  dia_de_pago: "Se escribe en cada fila (o se deja vacío).",
  consecutivo_repetido: "Se descarta la fila que sobra y se vuelve a cruzar.",
  cartera_antes_del_inicio:
    "Sólo se arregla en el archivo: corrige la fecha y vuelve a subirlo.",
  verificacion_difiere: "Se revisa en el detalle del contrato ya creado.",
  otros: "Se revisa en cada fila.",
};

/** Acciones en bloque que ya existen para ese motivo (modo de `ResolucionMasiva`). */
const BLOQUE: Record<string, (n: number) => string> = {
  reparto_del_canon: (n) =>
    `Repartir en partes iguales ${n === 1 ? "la" : "las"} ${n}`,
};

interface Props {
  porMotivo: Record<string, number> | undefined;
  /** Selecciona las filas con ese motivo y abre la acción en bloque. */
  onSeguir: (codigo: string) => void;
  /** El motivo que se está seleccionando ahora, si alguno. */
  seleccionando: string | null;
  /** Lleva al bloque «Crear los inmuebles que faltan». */
  onCrearInmuebles: () => void;
}

export function PendientesPorMotivo({
  porMotivo,
  onSeguir,
  seleccionando,
  onCrearInmuebles,
}: Props) {
  const motivos = Object.entries(porMotivo ?? {})
    .filter(([codigo, n]) => n > 0 && !YA_EN_EL_BLOQUE_DE_ARRIBA.has(codigo))
    .sort((a, b) => b[1] - a[1]);
  if (motivos.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="pendientes-por-motivo">
      <p className="text-sm font-medium text-foreground">
        Por qué quedan filas pendientes
      </p>
      <ul className="space-y-3">
        {motivos.map(([codigo, n]) => {
          const e = explicacionDe({}, codigo);
          const bloque = BLOQUE[codigo];
          return (
            <li key={codigo} data-testid={`pendientes-${codigo}`}>
              <p className="flex items-start gap-1.5 text-sm font-medium text-warning">
                <Warning className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
                <span>
                  {n} {n === 1 ? "contrato" : "contratos"}: {e?.titulo ?? codigo}
                </span>
              </p>
              {e?.porque ? (
                <p className="ml-[22px] text-caption text-muted-foreground">
                  {e.porque}
                </p>
              ) : null}
              <div className="ml-[22px] mt-1 flex flex-wrap items-center gap-2">
                {bloque ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    hideArrow
                    disabled={seleccionando !== null}
                    isLoading={seleccionando === codigo}
                    onClick={() => onSeguir(codigo)}
                    data-testid={`seguir-${codigo}`}
                  >
                    {bloque(n)}
                  </Button>
                ) : null}
                {codigo === "inmueble" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    hideArrow
                    onClick={onCrearInmuebles}
                    data-testid="ir-a-crear-inmuebles"
                  >
                    Ir a «Crear los inmuebles que faltan»
                  </Button>
                ) : null}
                {DONDE_SE_ARREGLA[codigo] && !bloque && codigo !== "inmueble" ? (
                  <span className="text-caption text-muted-foreground">
                    {DONDE_SE_ARREGLA[codigo]}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
