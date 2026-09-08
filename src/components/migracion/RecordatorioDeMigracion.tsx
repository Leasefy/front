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
import { X } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
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

  return (
    <div
      className="relative rounded-lg border border-border bg-surface p-3"
      data-testid="sidebar-migracion"
      data-hechos={hechos}
      data-total={total}
    >
      <button
        type="button"
        onClick={cerrar}
        aria-label={t("migracion.recordatorio.cerrar")}
        data-testid="sidebar-migracion-cerrar"
        className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
      >
        <X className="h-3 w-3" />
      </button>
      <p className="pr-5 text-[13px] font-medium text-fg">
        {empezada
          ? t("migracion.recordatorio.tituloEnCurso")
          : t("migracion.recordatorio.titulo")}
      </p>
      <p className="mt-1 text-[12px] leading-snug text-fg-muted" data-testid="sidebar-migracion-detalle">
        {empezada && siguiente
          ? t("migracion.recordatorio.avance", {
              hechos,
              total,
              paso: t(`migracion.pasos.${siguiente.id}.corto`),
            })
          : t("migracion.recordatorio.detalle")}
      </p>
      {empezada ? (
        <div
          className="mt-2 h-1 overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={hechos}
          aria-label={t("migracion.muro.progreso")}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      ) : null}
      <Button
        type="button"
        size="sm"
        hideArrow
        className="mt-2.5 w-full"
        onClick={migracion.abrir}
        data-testid="sidebar-migracion-migrar"
      >
        {t("migracion.recordatorio.migrar")}
      </Button>
    </div>
  );
}
