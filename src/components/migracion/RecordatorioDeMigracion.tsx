"use client";

/**
 * La tarjeta de migración del menú (Nico, 2026-09-07; rediseñada el 01-10).
 *
 * Dice dónde va la migración e invita a terminarla. La ✕ de antes se fue: la
 * tarjeta es fija mientras la migración esté en curso (ver abajo).
 *
 * ── De dónde sale lo que dice ─────────────────────────────────────────────
 *
 * Del estado del muro (`useMigracion`), que es lo que contestó el back para
 * ESTA cuenta: cuántos pasos exigibles están listos y cuál sigue.
 *
 * ── Cuándo se muestra (Nico, 01-10) ───────────────────────────────────────
 *
 * «Pon estático ese modal de migración mientras esté la migración en proceso,
 * cuando ya se complete se quita, y si no le da migrar pues no aparece.»
 *
 *  - SÓLO a quien le dio «Migrar» (`eligioMigrar`) o ya tiene un paso listo;
 *    quien eligió «en otro momento» o «no requiero migración» no la ve;
 *  - FIJA: sin ✕, mientras la migración esté sin terminar;
 *  - se va sola cuando termina («terminé» o todos los pasos listos);
 *  - nunca con el muro puesto (ya está la migración en la cara) ni cuando no
 *    se sabe el estado (nunca un recordatorio inventado).
 */

import { useContext, useEffect, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";

import { LeasefySymbol } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthContext } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n";
import { EVENTO_DECISION_DE_MIGRACION, eligioMigrar } from "@/lib/migracion/decision-de-migracion";
import { useMigracion } from "./migracion-context";
import { migracionSinTerminar, progresoDeMigracion } from "./muro-reglas";

/**
 * La ilustración: MIGRAR (Nico, 01-10: «la ilustración debería ser otra, algo
 * más asociado al tema de migrar»). A la izquierda, el sistema actual —una
 * hoja de cálculo—; en el medio, sus filas viajando; a la derecha, Leasefy
 * recibiéndolas. Es dibujo, no dato: el avance lo dice UNA pastilla abajo
 * («¿por qué muestra dos cosas?», Nico, 01-10).
 */
function IlustracionDeMigracion() {
  return (
    <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[84px]">
      {/* El sistema de hoy: una hoja de cálculo. */}
      <div className="absolute left-3 top-3.5 h-[66px] w-[66px] overflow-hidden rounded-md bg-surface shadow-sm ring-1 ring-border">
        <div className="h-2.5 border-b border-border bg-success-soft" />
        {[0, 1, 2, 3].map((fila) => (
          <div key={fila} className="flex h-[13px] border-b border-border-faint last:border-b-0">
            <span className="w-3 shrink-0 border-r border-border-faint bg-surface-muted" />
            <span className="flex flex-1 items-center px-1">
              <span className={cn("h-1 rounded-full bg-border", fila % 2 ? "w-3/5" : "w-4/5")} />
            </span>
            <span className="flex w-4 items-center border-l border-border-faint px-0.5">
              <span className="h-1 w-full rounded-full bg-border" />
            </span>
          </div>
        ))}
      </div>

      {/* Las filas viajando a Leasefy. */}
      <div className="absolute left-[86px] right-[86px] top-[42px] flex items-center">
        <span className="h-px flex-1 border-t-[1.5px] border-dashed border-primary/40" />
        <ArrowRight weight="bold" className="-ml-0.5 h-3 w-3 shrink-0 text-primary/70" />
      </div>
      <span className="absolute left-[90px] top-[30px] h-1.5 w-5 rounded-full bg-primary/40" />
      <span className="absolute left-[104px] top-[47px] h-1.5 w-4 rounded-full bg-primary/70" />
      <span className="absolute left-[118px] top-[34px] h-1.5 w-3 rounded-full bg-primary" />

      {/* Leasefy, recibiendo: una barra por paso. */}
      <div className="absolute right-3 top-3.5 h-[66px] w-[66px] overflow-hidden rounded-md bg-surface px-2 py-1.5 shadow-sm ring-1 ring-border">
        <LeasefySymbol size={9} className="text-primary" />
        <div className="mt-1 flex flex-col gap-[3px]">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1 rounded-full",
                i < 2 ? "bg-primary/70" : "bg-surface-muted",
                i % 3 === 2 ? "w-3/4" : "w-full",
              )}
            />
          ))}
        </div>
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
  // Arranca en «no» hasta leer el navegador: mejor que aparezca un instante
  // después que mostrársela a quien no le dio «Migrar».
  const [leDioMigrar, setLeDioMigrar] = useState(false);
  useEffect(() => {
    const leer = () => setLeDioMigrar(eligioMigrar(agencyId));
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
  if (!migracionSinTerminar(estado)) return null;

  const { hechos, total, siguiente } = progresoDeMigracion(estado.pasos);
  const empezada = hechos > 0;
  // Un paso listo también es haberle dado «Migrar» (otro navegador, o un
  // importador abierto suelto desde Configuración).
  if (!leDioMigrar && !empezada) return null;

  const n = Math.min(hechos + 1, total);

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-surface"
      data-testid="sidebar-migracion"
      data-hechos={hechos}
      data-total={total}
    >
      {/* La lámina de arriba: la ilustración, cuánto va y en qué paso. */}
      <div className="p-1.5">
        <div className="relative h-[112px] overflow-hidden rounded-lg bg-primary-soft ring-1 ring-primary/10">
          <IlustracionDeMigracion />
          {/* 🔴 UNA sola pastilla (Nico, 01-10: «¿por qué muestra dos cosas?
              …dónde está y qué le falta para llegar allá»). Un tramo por paso:
              lleno lo hecho, marcado en el que va, gris lo que falta; y el
              texto dice en cuál va. */}
          <div
            className="absolute bottom-2 left-2 right-2 flex items-center gap-2.5 rounded-full bg-surface py-1 pl-2.5 pr-3 shadow-sm ring-1 ring-border"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={hechos}
            aria-label={t("migracion.muro.progreso")}
            data-testid="sidebar-migracion-avance"
          >
            <span className="flex flex-1 gap-[3px]" aria-hidden="true">
              {Array.from({ length: total }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full",
                    i < hechos
                      ? "bg-primary"
                      : i === hechos
                        ? "bg-primary/25 ring-1 ring-inset ring-primary"
                        : "bg-surface-muted",
                  )}
                />
              ))}
            </span>
            <span
              className="shrink-0 text-caption font-semibold tabular-nums text-fg"
              data-testid="sidebar-migracion-paso"
            >
              {t("migracion.recordatorio.paso", { n, total })}
            </span>
          </div>
        </div>
      </div>

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
          {empezada ? t("migracion.recordatorio.continuar") : t("migracion.recordatorio.migrar")}
        </Button>
      </div>
    </div>
  );
}
