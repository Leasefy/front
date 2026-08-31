"use client";

/**
 * PilotoPreparacion — «¿esta inmobiliaria ya opera sola?», con evidencia.
 *
 * ── Por qué existe (2026-08-31) ────────────────────────────────────────────
 * Para saber si el Piloto podía operar solo había que leer código y variables
 * de entorno. Nadie desde la pantalla —ni el dueño de la inmobiliaria, ni
 * quien la acompaña— podía responder «¿está funcionando?». Y como cada
 * requisito que falta se arregla en un lugar distinto (un despliegue, una
 * bandera, un dato del back), «no funciona» sin el porqué es inútil.
 *
 * Cada fila dice QUÉ se midió, QUÉ salió (con números) y, cuando la solución
 * no es código, DÓNDE se arregla. Los requisitos bloqueantes son los que
 * impiden que el piloto opere; los demás son información.
 *
 * Regla que también manda acá: un requisito que NO se pudo medir jamás se
 * pinta en verde. El micro lo reporta con su motivo y acá se ve como falta.
 */

import {
  CheckCircle,
  Circle,
  Gauge,
  MinusCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import { Badge } from "@leasefy/cadence";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n";
import { usePilotoPreparacion } from "@/lib/hooks/piloto/use-piloto-preparacion";
import type { EstadoRequisito } from "@/lib/api/piloto";

const ICONO: Record<
  EstadoRequisito,
  { icono: typeof CheckCircle; clase: string }
> = {
  ok: { icono: CheckCircle, clase: "text-success" },
  falta: { icono: WarningCircle, clase: "text-warning" },
  no_aplica: { icono: MinusCircle, clase: "text-fg-subtle" },
};

/** Singular o plural: «Quedan 1 cosas» delata una pantalla sin cuidar. */
function clave(base: string, n: number): string {
  return `inmobiliaria.piloto.preparacion.${base}${n === 1 ? '' : 'Plural'}`
}

export function PilotoPreparacion() {
  const { t } = useI18n();
  const { data, isLoading, error, notAvailable, refetch } =
    usePilotoPreparacion();

  const bloqueantesQueFaltan =
    data?.requisitos.filter((r) => r.bloqueante && r.estado === "falta")
      .length ?? 0;
  // Lo que falta SIN bloquear también se dice: «todo listo» encima de un
  // requisito en falta es la clase de contradicción que hace que nadie vuelva
  // a creerle a la pantalla.
  const sueltosQueFaltan =
    data?.requisitos.filter((r) => !r.bloqueante && r.estado === "falta")
      .length ?? 0;
  // Sin dato NO se pinta verde ni rojo: el punto queda neutro.
  const puntoClase = !data
    ? "bg-fg-subtle"
    : data.listo
      ? "bg-success"
      : bloqueantesQueFaltan > 0
        ? "bg-warning"
        : "bg-fg-subtle";

  return (
    <Sheet onOpenChange={(abierto) => abierto && void refetch()}>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          hideArrow
          data-testid="piloto-preparacion-abrir"
        >
          <span
            className={`mr-2 inline-block h-2 w-2 rounded-full ${puntoClase}`}
            aria-hidden="true"
          />
          {t("inmobiliaria.piloto.preparacion.boton")}
          {bloqueantesQueFaltan > 0 && (
            <span className="ml-1.5 font-mono text-caption tabular-nums">
              {bloqueantesQueFaltan}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Gauge
              weight="duotone"
              className="h-5 w-5 text-fg-muted"
              aria-hidden="true"
            />
            {t("inmobiliaria.piloto.preparacion.titulo")}
          </SheetTitle>
          <SheetDescription>
            {data
              ? data.listo
                ? sueltosQueFaltan > 0
                  ? t("inmobiliaria.piloto.preparacion.listoConPeros", {
                      n: String(sueltosQueFaltan),
                    })
                  : t("inmobiliaria.piloto.preparacion.listo")
                : t("inmobiliaria.piloto.preparacion.noListo", {
                    n: String(bloqueantesQueFaltan),
                  })
              : t("inmobiliaria.piloto.preparacion.descripcion")}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-3">
          {/* El esqueleto sale SIEMPRE que se está midiendo, no sólo la
              primera vez: al reabrir el panel tras cambiar la autonomía, la
              medición anterior seguía en pantalla y se leía como la nueva
              (medido el 2026-08-31). Vale más medio segundo de esqueleto que
              una respuesta vieja que parece fresca. */}
          {isLoading && (
            <div
              className="space-y-2"
              data-testid="piloto-preparacion-cargando"
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-lg bg-surface-muted"
                />
              ))}
            </div>
          )}

          {!isLoading && (error || notAvailable) && (
            <div className="rounded-lg border border-border bg-surface-muted px-3 py-3">
              <p className="text-body-sm font-medium text-fg">
                {t("inmobiliaria.piloto.preparacion.sinFuente")}
              </p>
              <p className="mt-1 text-caption text-fg-muted">
                {/* No se afirma «no está listo»: no se pudo medir. */}
                {t("inmobiliaria.piloto.preparacion.sinFuenteHint")}
              </p>
              {error && (
                <Button
                  className="mt-2"
                  size="sm"
                  variant="secondary"
                  hideArrow
                  onClick={() => void refetch()}
                >
                  {t("inmobiliaria.piloto.cajon.reintentar")}
                </Button>
              )}
            </div>
          )}

          {!isLoading &&
            data?.requisitos.map((r) => {
              const meta = ICONO[r.estado] ?? {
                icono: Circle,
                clase: "text-fg-subtle",
              };
              const Icono = meta.icono;
              return (
                <article
                  key={r.id}
                  className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5"
                  data-testid={`piloto-preparacion-${r.id}`}
                >
                  <Icono
                    weight="duotone"
                    className={`mt-0.5 h-4 w-4 shrink-0 ${meta.clase}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-body-sm font-medium text-fg">
                        {r.titulo}
                      </h3>
                      {/* El Badge del DS en vez de una píldora a mano: mismos
                          tokens de warning, pero la altura, el tracking y el
                          radio los fija el sistema. */}
                      {r.bloqueante && r.estado === "falta" && (
                        <Badge variant="warning" className="ml-auto shrink-0">
                          {t("inmobiliaria.piloto.preparacion.bloquea")}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-caption leading-relaxed text-fg-muted">
                      {r.detalle}
                    </p>
                    {r.comoSeArregla && (
                      <p className="mt-1 rounded-md bg-surface-muted px-2 py-1.5 text-caption text-fg">
                        {r.comoSeArregla}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
