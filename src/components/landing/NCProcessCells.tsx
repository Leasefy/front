"use client";

import { motion } from "framer-motion";
import { EyebrowPill, Reveal, lpHeading } from "./_kit";

/**
 * NCProcessCells — NewsCatcher "Precision search powered by automated article
 * clustering" section, recreated with Leasefy content.
 *
 * Centered big heading → centered EyebrowPill → a 2-cell crosshair / blueprint
 * grid. Hairlines OVERSHOOT the cells forming "+" ticks and DRAW IN on scroll.
 * Each cell reveals with a stagger and lifts on hover.
 */

const CELLS = [
  {
    n: "01",
    title: "Entra una solicitud",
    body: "Leasefy registra al interesado y el agente toma el caso al instante, sin que nadie copie y pegue.",
  },
  {
    n: "02",
    title: "El agente ejecuta",
    body: "Hace matching, valida al inquilino, cotiza asegurabilidad y prepara el contrato —de punta a punta.",
  },
] as const;

export default function NCProcessCells() {
  return (
    <section className="bg-white py-24 md:py-32">
      <div className="container-platform">
        <Reveal>
          <h2 className={`${lpHeading} mx-auto max-w-[18ch] text-center text-fg`}>
            Tus agentes operan de
            <br className="hidden sm:block" /> punta a punta
          </h2>
          <div className="mt-7 flex justify-center">
            <EyebrowPill>Agentes en acción</EyebrowPill>
          </div>
        </Reveal>

        {/* Crosshair / blueprint grid */}
        <div className="relative mt-14">
          {/* horizontal rails draw left→right */}
          {["top-0", "bottom-0"].map((edge) => (
            <motion.span
              key={edge}
              aria-hidden
              className={`pointer-events-none absolute ${edge} left-0 h-px w-full origin-left bg-border-faint`}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
          {/* vertical overshoot ticks draw top→bottom */}
          {[
            "left-0",
            "left-1/2 -translate-x-1/2 hidden md:block",
            "right-0",
          ].map((pos, k) => (
            <motion.span
              key={pos}
              aria-hidden
              className={`pointer-events-none absolute -top-2 -bottom-2 w-px bg-border-faint ${pos}`}
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: 0.15 + k * 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: "top" }}
            />
          ))}

          <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
            {CELLS.map((cell, i) => (
              <motion.div
                key={cell.n}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: 0.1 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="group flex min-h-[200px] flex-col items-center justify-center p-10 text-center transition-colors duration-300 hover:bg-surface-muted/70 md:p-14"
              >
                <div className="flex items-baseline justify-center gap-3">
                  <span className="font-mono text-[13px] text-fg-subtle transition-colors group-hover:text-primary">
                    {cell.n}
                  </span>
                  <span className="font-heading text-xl font-medium text-fg transition-colors group-hover:text-primary">
                    {cell.title}
                  </span>
                </div>
                <p className="mt-4 max-w-[32ch] text-[15px] leading-relaxed text-fg-muted">
                  {cell.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
