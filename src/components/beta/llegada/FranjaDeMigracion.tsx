"use client";

import { motion } from "framer-motion";
import { motionDistance, motionDuration, motionEase } from "@leasefy/cadence";
import { ArrowsClockwise, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

/**
 * La franja de aviso arriba de la caja de la llegada del chat: «Termina tu
 * migración · Continuar», con ✕ (Nico, 02-10-2026).
 *
 * Lenguaje de la referencia (SaleAds, «Conecta · Autoriza tu cuenta… ·
 * Conectar»): icono, pastilla, texto, acción subrayada y ✕ en círculo, en una
 * fila con filete abajo, dentro de la caja. Entra desplegándose desde arriba
 * (`sa-reveal`: opacidad + 10 px + recorte) y se va igual al revés.
 *
 * «Continuar» abre la migración a pantalla completa (`useMigracion().abrir`),
 * no navega. Es la única salida del chat permitida acá, y la autorizó Nico.
 * Quién la muestra y qué hace la ✕ lo decide `BetaWelcome`.
 */

interface FranjaDeMigracionProps {
  /** El paso en que va (desde 1) y cuántos son. */
  paso: number;
  total: number;
  /** El nombre corto del paso que sigue («Propiedades»), si se sabe. */
  siguiente: string | null;
  onContinuar: () => void;
  onCerrar: () => void;
}


export function FranjaDeMigracion({
  paso,
  total,
  siguiente,
  onContinuar,
  onCerrar,
}: FranjaDeMigracionProps) {
  const { t } = useI18n();
  return (
    <motion.div
      data-testid="franja-de-migracion"
      role="region"
      aria-label={t("beta.welcome.aviso.region")}
      // El alto va en este contenedor (sin padding) para que al cerrarla la
      // caja se recoja suave en vez de saltar.
      // Movimiento (Cadence): el alto es la excepción del colapsable (como
      // `Collapse`: 300 ms con la curva de énfasis al abrir, 200 ms acelerando
      // al cerrar); lo demás, opacidad y 8 px. Sin `clipPath` animado: repinta
      // la franja en cada cuadro.
      initial={{ opacity: 0, height: 0, y: -motionDistance.sm }}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      exit={{
        opacity: 0,
        height: 0,
        y: -motionDistance.sm,
        transition: { duration: motionDuration.base, ease: motionEase.exit },
      }}
      transition={{ duration: motionDuration.slow, ease: motionEase.emphasis }}
      className="relative overflow-hidden"
    >
      <div className="flex items-center gap-2.5 border-b border-border-faint py-2.5 pl-4 pr-2.5 sm:gap-3 sm:pl-5">
        <ArrowsClockwise
          size={17}
          aria-hidden
          className="hidden shrink-0 text-fg-subtle sm:block"
        />
        <span className="hidden shrink-0 rounded-full bg-primary-soft px-2.5 py-[3px] text-[12.5px] font-semibold text-primary sm:inline-flex">
          {t("beta.welcome.aviso.pastilla", { n: paso, total })}
        </span>
        <p className="min-w-0 flex-1 text-[13.5px] leading-snug text-fg-muted sm:truncate">
          {t("beta.welcome.aviso.termina")}
          {siguiente && (
            <>
              {": "}
              {t("beta.welcome.aviso.sigueCon")}{" "}
              <strong className="font-medium text-fg">{siguiente}</strong>
            </>
          )}
          <span className="sm:hidden">
            {" "}
            · {t("beta.welcome.aviso.pastilla", { n: paso, total })}
          </span>
        </p>
        <button
          type="button"
          onClick={onContinuar}
          data-testid="franja-de-migracion-continuar"
          className={cn(
            "shrink-0 rounded-sm px-1 text-[13.5px] font-medium text-primary",
            "underline decoration-primary/40 underline-offset-4 transition-colors duration-150 hover:decoration-primary",
          )}
        >
          {t("beta.welcome.aviso.continuar")}
        </button>
        <button
          type="button"
          onClick={onCerrar}
          aria-label={t("beta.welcome.aviso.cerrar")}
          title={t("beta.welcome.aviso.cerrar")}
          data-testid="franja-de-migracion-cerrar"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-fg-muted",
            "transition-colors duration-150 hover:border-border-strong hover:text-fg active:scale-[0.96]",
          )}
        >
          <X size={13} aria-hidden />
        </button>
      </div>
    </motion.div>
  );
}
