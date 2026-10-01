"use client";

/**
 * El recordatorio de migración del sidebar (Nico, 2026-09-07).
 *
 * «Si no la ha terminado, que le salga ya no el de "migra tu inmobiliaria"
 * sino el estado de dónde va la migración, incitando a que la termine, con
 * un CTA primary de migrar ahora y una ✕ arriba, ya no el descartar.»
 *
 * ── De dónde sale lo que dice ─────────────────────────────────────────────
 *
 * Del estado del muro (`useMigracion`), que es lo que contestó el back para
 * ESTA cuenta: cuántos pasos exigibles están listos y cuál sigue. Antes la
 * tarjeta sólo sabía «dijo que en otro momento» —un booleano de este
 * navegador— y decía lo mismo a quien no había empezado y a quien iba por
 * la mitad. La ✕ también es de la cuenta: va a `agency_members.preferences`
 * por `POST /inmobiliaria/migracion/recordatorio` y vuelve en el estado como
 * `recordatorioDescartado`; el navegador sólo guarda una copia para que la
 * tarjeta desaparezca al instante y para un back que todavía no lo mande.
 *
 * ── Cuándo NO se muestra ──────────────────────────────────────────────────
 *
 *  - no se sabe el estado (falló la consulta): nada, nunca un recordatorio
 *    inventado;
 *  - el muro está puesto: ya está la migración en la cara;
 *  - la migración terminó («terminé» o todos los pasos listos);
 *  - se descartó con la ✕ o con «no requiero migración».
 */

import { useContext, useEffect, useState } from "react";
import { CursorClick, FileArrowUp, ListChecks, X } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { migracionEstadoApi } from "@/lib/api/migracion-estado.service";
import { AuthContext } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n";
import {
  EVENTO_DECISION_DE_MIGRACION,
  guardarDecisionDeMigracion,
  recordatorioDeMigracionDescartado,
} from "@/lib/migracion/decision-de-migracion";
import { useMigracion } from "./migracion-context";
import { migracionSinTerminar, progresoDeMigracion } from "./muro-reglas";

/**
 * La ilustración de la tarjeta (Nico, 01-10: «hazlo más bonito, haz algo
 * así», con una tarjeta de tour de referencia): una ventana de Leasefy con el
 * paso que sigue resaltado y el cursor encima, y un archivo entrando por la
 * izquierda. El avance de verdad lo dicen la pastilla «Paso N de M» y la
 * barra de abajo; la ventana sólo pinta lo listo (azul) y lo que falta (gris).
 */
function IlustracionDeMigracion({ empezada }: { empezada: boolean }) {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <div className="absolute bottom-4 left-[26%] right-[14%] top-3.5 overflow-hidden rounded-md bg-surface shadow-sm ring-1 ring-border">
        <div className="flex gap-1 border-b border-border-faint px-2 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-border-strong" />
          <span className="h-1.5 w-1.5 rounded-full bg-border-strong" />
          <span className="h-1.5 w-1.5 rounded-full bg-border-strong" />
        </div>
        <div className="flex gap-2 px-2 py-2">
          <div className="flex w-5 shrink-0 flex-col gap-1">
            <span className="h-1 w-full rounded-full bg-primary/60" />
            <span className="h-1 w-4/5 rounded-full bg-border" />
            <span className="h-1 w-3/5 rounded-full bg-border" />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <span className={cn("h-1.5 w-1/2 rounded-full", empezada ? "bg-primary/70" : "bg-border")} />
            <span className="relative h-5 w-[58%] rounded-md bg-surface ring-[1.5px] ring-primary">
              <CursorClick weight="fill" className="absolute -bottom-2 -right-2 h-3.5 w-3.5 text-fg" />
            </span>
          </div>
        </div>
      </div>
      <div className="absolute left-3 top-6 flex h-10 w-9 items-center justify-center rounded-md bg-surface shadow-sm ring-1 ring-border">
        <FileArrowUp className="h-4 w-4 text-primary" weight="duotone" />
      </div>
    </div>
  );
}

export function RecordatorioDeMigracion() {
  const { t } = useI18n();
  const migracion = useMigracion();
  // Contexto crudo y no `useAuth()`: ese lanza sin AuthProvider, y una
  // tarjeta del sidebar no puede ser lo que tumba el panel.
  const agencyId = useContext(AuthContext)?.agency?.id ?? null;
  // Arranca «descartado» hasta leer el navegador: así no parpadea en la
  // hidratación una tarjeta que la persona ya cerró.
  const [descartado, setDescartado] = useState(true);
  useEffect(() => {
    const leer = () => setDescartado(recordatorioDeMigracionDescartado(agencyId));
    leer();
    window.addEventListener(EVENTO_DECISION_DE_MIGRACION, leer);
    window.addEventListener("storage", leer);
    return () => {
      window.removeEventListener(EVENTO_DECISION_DE_MIGRACION, leer);
      window.removeEventListener("storage", leer);
    };
  }, [agencyId]);

  const estado = migracion?.estado ?? null;
  if (!migracion || !estado || estado.bloquea) return null;
  // La cuenta manda; el navegador sólo adelanta la ✕ recién apretada.
  if (estado.recordatorioDescartado === true || descartado) return null;
  if (!migracionSinTerminar(estado)) return null;

  const cerrar = () => {
    guardarDecisionDeMigracion(agencyId, "nunca");
    void migracionEstadoApi
      .recordatorio(true)
      .then(() => migracion.recargar())
      .catch(() => undefined);
  };

  const { hechos, total, siguiente } = progresoDeMigracion(estado.pasos);
  const empezada = hechos > 0;
  const porcentaje = total > 0 ? Math.round((hechos / total) * 100) : 0;

  const n = Math.min(hechos + 1, total);

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-surface"
      data-testid="sidebar-migracion"
      data-hechos={hechos}
      data-total={total}
    >
      {/* La lámina de arriba: la ilustración, el paso y cuánto va. */}
      <div className="p-1.5">
        <div className="relative h-[112px] overflow-hidden rounded-lg bg-primary-soft ring-1 ring-primary/10">
          <IlustracionDeMigracion empezada={empezada} />
          <span
            className="absolute bottom-2 right-2 rounded-full bg-primary px-2 py-0.5 text-caption font-semibold text-primary-fg shadow-sm"
            data-testid="sidebar-migracion-paso"
          >
            {t("migracion.recordatorio.paso", { n, total })}
          </span>
          <div className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-surface px-2 py-0.5 text-caption font-semibold text-fg shadow-sm ring-1 ring-border">
            {empezada ? (
              <>
                <span
                  className="h-1 w-8 overflow-hidden rounded-full bg-surface-muted"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-valuenow={hechos}
                  aria-label={t("migracion.muro.progreso")}
                >
                  <span
                    className="block h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${porcentaje}%` }}
                  />
                </span>
                {t("migracion.recordatorio.listos", { hechos, total })}
              </>
            ) : (
              <>
                <ListChecks className="h-3.5 w-3.5 text-primary" weight="bold" aria-hidden="true" />
                {t("migracion.recordatorio.pasos", { total })}
              </>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={cerrar}
        aria-label={t("migracion.recordatorio.cerrar")}
        data-testid="sidebar-migracion-cerrar"
        className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-surface text-fg-muted shadow-sm ring-1 ring-border transition-colors hover:text-fg"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="px-3.5 pb-3 pt-2">
        <p className="text-body font-semibold leading-snug text-fg">
          {empezada
            ? t("migracion.recordatorio.tituloEnCurso")
            : t("migracion.recordatorio.titulo")}
        </p>
        <p className="mt-1 text-body-sm leading-snug text-fg-muted" data-testid="sidebar-migracion-detalle">
          {empezada && siguiente
            ? t("migracion.recordatorio.sigue", {
                paso: t(`migracion.pasos.${siguiente.id}.corto`),
              })
            : t("migracion.recordatorio.detalle")}
        </p>
      </div>

      <div className="border-t border-border-faint p-2.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          hideArrow
          className="w-full"
          onClick={migracion.abrir}
          data-testid="sidebar-migracion-migrar"
        >
          {t("migracion.recordatorio.migrar")}
        </Button>
      </div>
    </div>
  );
}
