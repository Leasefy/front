"use client";

/**
 * El momento en que el muro se levanta.
 *
 * Nico: «cuando se termine la migración sería bueno darle un feedback top con
 * animación de bienvenido a Leasefy, con confeti, y ahí sí luego de eso ya
 * puede hacer lo que quiera en la plataforma».
 *
 * Hasta acá el muro simplemente desaparecía: la persona pasaba seis pasos
 * cargando su operación y al terminar el panel aparecía de golpe, sin que
 * nadie le dijera que ya estaba adentro. Esto es la puerta que faltaba.
 *
 * ── Tres decisiones ─────────────────────────────────────────────────────────
 *
 * 1. **Se muestra UNA vez, en la transición.** No se persiste nada: el muro
 *    estaba puesto y dejó de estarlo en esta misma sesión, y eso es el hecho
 *    que se celebra. Quien recarga después ya está en el panel.
 * 2. **Un solo botón, y lo aprieta la persona.** Nada de cuenta regresiva:
 *    «ahí sí luego de eso ya puede hacer lo que quiera» — el control vuelve a
 *    ella cuando ella decide, no cuando vence un timer.
 * 3. **El confeti respeta `prefers-reduced-motion`.** Una animación que la
 *    persona pidió que no le muestren no es una celebración.
 */

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";
import confetti from "canvas-confetti";

import { Button } from "@/components/ui/button";
import { LeasefyMonogram } from "@/components/brand/LeasefyMonogram";
import type { PasoDeMigracion } from "@/lib/api/migracion-estado.service";

/** Los de la marca: cobalto y sus tintes, más un neutro cálido. */
const COLORES = ["#1A40FF", "#8A9CFF", "#C9D1FF", "#14130F", "#E5E2DC"];

export interface BienvenidaALeasefyProps {
  /** El último estado del muro antes de levantarse, para decir qué entró. */
  pasos: readonly PasoDeMigracion[];
  /** `omitida` = «arranco de cero»: se saluda igual, sin resumen. */
  resuelta: "completada" | "omitida";
  onEntrar: () => void;
}

export function BienvenidaALeasefy({
  pasos,
  resuelta,
  onEntrar,
}: BienvenidaALeasefyProps) {
  const sinMovimiento = useReducedMotion();

  useEffect(() => {
    if (sinMovimiento) return;
    // Dos cañones desde abajo, tres segundos, cada vez con menos: el mismo
    // gesto que el final del onboarding (`OnboardingSuccess`), con la paleta
    // de la marca y no la de un cotillón.
    const fin = Date.now() + 3000;
    const disparar = () => {
      const queda = fin - Date.now();
      if (queda <= 0) return;
      const cantidad = Math.round(60 * (queda / 3000));
      for (const x of [0.15, 0.85]) {
        confetti({
          particleCount: cantidad,
          startVelocity: 38,
          spread: 70,
          angle: x < 0.5 ? 60 : 120,
          origin: { x, y: 0.9 },
          colors: COLORES,
          ticks: 220,
          zIndex: 80,
          disableForReducedMotion: true,
        });
      }
    };
    disparar();
    const cada = setInterval(disparar, 320);
    return () => {
      clearInterval(cada);
      confetti.reset();
    };
  }, [sinMovimiento]);

  const cargado = pasos.filter((p) => p.estado === "listo" && p.conteo > 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bienvenida-titulo"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-bg/95 p-6 backdrop-blur-sm"
      data-testid="bienvenida-a-leasefy"
    >
      <motion.div
        initial={sinMovimiento ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg text-center"
      >
        <motion.div
          initial={sinMovimiento ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 18 }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full shadow-lg shadow-primary/20"
        >
          {/* El logo azul, redondo (Nico, 2026-09-01) — la firma del producto
              en el momento del producto, no la ola monocroma del chrome. */}
          <LeasefyMonogram size={80} title="Leasefy" />
        </motion.div>

        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
          {resuelta === "completada" ? "Migración completa" : "Todo listo"}
        </p>
        <h1
          id="bienvenida-titulo"
          className="mt-2 text-3xl font-semibold tracking-tight text-fg [text-wrap:balance]"
        >
          Bienvenido a Leasefy
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-fg-muted">
          {resuelta === "completada"
            ? "Tu operación ya está acá adentro. De ahora en más, todo lo que hagas queda en un solo lugar."
            : "Arrancás de cero, con todo el sistema a tu disposición. Lo primero que cargues va a ser lo primero que aparezca."}
        </p>

        {cargado.length > 0 ? (
          <ul
            className="mx-auto mt-6 flex max-w-md flex-wrap justify-center gap-2"
            data-testid="bienvenida-resumen"
          >
            {cargado.map((p, i) => (
              <motion.li
                key={p.id}
                initial={sinMovimiento ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.07 }}
                className="rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs tabular-nums text-fg-muted"
              >
                {p.detalle ?? `${p.conteo} ${p.id}`}
              </motion.li>
            ))}
          </ul>
        ) : null}

        <motion.div
          initial={sinMovimiento ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8"
        >
          <Button
            size="lg"
            onClick={onEntrar}
            hideArrow
            autoFocus
            data-testid="bienvenida-entrar"
          >
            Entrar a Leasefy
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
