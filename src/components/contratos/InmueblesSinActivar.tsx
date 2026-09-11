"use client";

/**
 * «Tienes N inmuebles preparados y sin activar».
 *
 * ── El día que costó esto (2026-09-10) ──────────────────────────────────────
 *
 * Nico volvió cuatro veces con la misma pantalla: cientos de contratos con «El
 * código del inmueble no existe», y él abriendo su Excel y mostrándome que el
 * inmueble SÍ estaba, con el mismo código y la misma dirección.
 *
 * Tenía razón, y el mensaje le mentía. Su inmueble de código 3 —`CR 50 127 SUR
 * 61 OF 502 ED. PUNTO CENTRO`— estaba en la fila 2862 de su importación, en
 * estado LISTO y con `faltantes: []`: perfecto, sin nada que corregir. Sólo
 * que nunca se activó, porque el bucle de activación moría en la fila 1532
 * (cada llamada duraba 11,6 minutos). Así que el `Property` no existía, y el
 * contrato decía la verdad sobre la base mientras le echaba la culpa al
 * archivo: «suele ser el archivo corrido».
 *
 * Un mensaje que describe el síntoma y acusa a la causa equivocada hace que la
 * persona busque donde no es. Este aviso dice la causa real y lleva al botón
 * que la arregla.
 *
 * Se muestra sólo cuando hay algo que hacer: filas LISTO esperando activación.
 * `pendientes` (las que un muro frenó) NO cuentan acá — ésas sí necesitan que
 * alguien corrija algo, y el importador ya las explica una por una.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Buildings } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { inmueblesImportacionApi } from "@/lib/api/inmuebles-importacion.service";

export interface InmueblesSinActivarProps {
  /** Cuántos contratos del lote se quedaron sin inmueble, si se sabe. */
  contratosSinInmueble?: number;
}

export function InmueblesSinActivar({
  contratosSinInmueble,
}: InmueblesSinActivarProps) {
  const [listas, setListas] = useState(0);

  useEffect(() => {
    let vigente = true;
    inmueblesImportacionApi
      .lotesAbiertos()
      .then((lotes) => {
        if (!vigente) return;
        setListas(lotes.reduce((n, l) => n + (l.listos ?? 0), 0));
      })
      .catch(() => {
        /*
         * En silencio a propósito: esto es un aviso de ayuda, no un dato del
         * paso. Un error rojo acá competiría con lo que la persona vino a
         * hacer, y el importador cuenta la misma historia completa.
         */
      });
    return () => {
      vigente = false;
    };
  }, []);

  if (listas === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/30 bg-warning-soft p-4"
      data-testid="inmuebles-sin-activar"
    >
      <Buildings className="h-5 w-5 shrink-0 text-warning" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">
          Tienes {listas.toLocaleString("es-CO")}{" "}
          {listas === 1 ? "inmueble preparado" : "inmuebles preparados"} y sin
          activar
        </p>
        <p className="mt-0.5 text-sm text-fg-muted">
          {contratosSinInmueble
            ? `Están listos, sin nada que corregir — sólo falta crearlos. Por eso hay contratos que dicen «el código no existe»: el inmueble está en tu archivo pero todavía no en Leasefy. Actívalos y los contratos se pegan solos por su código.`
            : `Están listos, sin nada que corregir — sólo falta crearlos. Mientras no existan, los contratos que los nombren no van a encontrarlos.`}
        </p>
      </div>
      <Button asChild size="sm" hideArrow className="shrink-0">
        <Link href="/panel/inmobiliaria/inmuebles/importar">
          Activarlos ahora
        </Link>
      </Button>
    </div>
  );
}
