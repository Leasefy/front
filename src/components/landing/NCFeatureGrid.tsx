"use client";

import { motion } from "framer-motion";
import { Reveal, lpHeading } from "./_kit";

/* NewsCatcher "Expansive insights" — 3-col blueprint/crosshair grid with
   slowly-rotating wireframe icons + interactive hover. */

/* ── Animated wireframe icons (SVG, slow rotation — NewsCatcher signature) ── */

function Wire({ variant }: { variant: "sphere" | "prism" | "cube" }) {
  const stroke = "#1A40FF";
  return (
    <motion.svg
      viewBox="0 0 48 48"
      className="h-11 w-11"
      fill="none"
      stroke={stroke}
      strokeWidth="1.1"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 26, ease: "linear" }}
    >
      {variant === "sphere" && (
        <>
          <circle cx="24" cy="24" r="15" />
          <ellipse cx="24" cy="24" rx="6" ry="15" />
          <ellipse cx="24" cy="24" rx="15" ry="6" />
          <line x1="9" y1="24" x2="39" y2="24" opacity="0.5" />
        </>
      )}
      {variant === "prism" && (
        <>
          <path d="M24 8 L39 34 L9 34 Z" />
          <path d="M24 8 L24 34" opacity="0.55" />
          <ellipse cx="24" cy="34" rx="15" ry="4.5" opacity="0.7" />
        </>
      )}
      {variant === "cube" && (
        <>
          <path d="M24 7 L40 16 L40 32 L24 41 L8 32 L8 16 Z" />
          <path d="M8 16 L24 25 L40 16" opacity="0.6" />
          <path d="M24 25 L24 41" opacity="0.6" />
        </>
      )}
    </motion.svg>
  );
}

const FEATURES = [
  {
    variant: "sphere" as const,
    title: "Operación de punta a punta",
    body: "Del primer contacto del inquilino al pago al propietario, en un solo lugar.",
  },
  {
    variant: "prism" as const,
    title: "Agentes que ejecutan",
    body: "No solo informan: actúan en cobranza, matching, estudio y conciliación.",
  },
  {
    variant: "cube" as const,
    title: "Todo conectado",
    body: "CRM, ERP y agentes AI en una sola plataforma, sin herramientas sueltas.",
  },
];

export default function NCFeatureGrid() {
  return (
    <section className="bg-white py-24 md:py-32">
      <div className="container-platform">
        <Reveal>
          <h2 className={`${lpHeading} mx-auto max-w-3xl text-center text-neutral-950`}>
            Una plataforma para todo el arriendo
          </h2>
        </Reveal>

        {/* blueprint / crosshair grid */}
        <Reveal delay={0.1} className="mt-16 md:mt-20">
          <div className="relative grid grid-cols-1 divide-y divide-neutral-200 border-y border-neutral-200 md:grid-cols-3 md:divide-y-0 md:border-y-0">
            {/* horizontal rails draw in left→right */}
            {["top-0", "bottom-0"].map((edge) => (
              <motion.span
                key={edge}
                aria-hidden
                className={`pointer-events-none absolute ${edge} left-0 hidden h-px origin-left bg-neutral-200 md:block`}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{ width: "100%" }}
              />
            ))}
            {/* vertical overshoot ticks draw in top→bottom (crosshair look) */}
            {["left-0", "left-1/3", "left-2/3", "right-0"].map((pos, k) => (
              <motion.span
                key={pos}
                aria-hidden
                className={`pointer-events-none absolute -top-2 -bottom-2 ${pos} hidden w-px origin-top bg-neutral-200 md:block`}
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: 0.15 + k * 0.08, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}

            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
                className="group relative flex min-h-[300px] flex-col p-8 transition-colors duration-300 hover:bg-neutral-50/60 md:p-10"
              >
                {/* accent bar that grows on hover */}
                <span className="pointer-events-none absolute left-0 top-0 h-px w-0 bg-primary transition-all duration-500 group-hover:w-full" />

                <div className="transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
                  <Wire variant={f.variant} />
                </div>

                <div className="mt-auto pt-10">
                  <h3 className="font-heading text-[22px] font-medium tracking-tight text-neutral-950 transition-colors group-hover:text-primary md:text-2xl">
                    {f.title}
                  </h3>
                  <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-neutral-500">
                    {f.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
