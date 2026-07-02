"use client";

import { motion } from "framer-motion";
import { LpButton, lpDisplay, EyebrowPill, HeroGrid, AmbientField } from "./_kit";

/* NewsCatcher hero — centered text on a diagonal grid over slow ambient blobs. */

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white pt-20 pb-24 md:pt-28 md:pb-32 lg:pb-40">
      <AmbientField />
      <HeroGrid />
      <div className="relative container-platform">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center"
        >
          <EyebrowPill>Plataforma para inmobiliarias</EyebrowPill>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.06 }}
          className={`${lpDisplay} mx-auto mt-8 max-w-[15ch] text-balance text-center text-neutral-950`}
        >
          Tu inmobiliaria, operando en piloto automático.
        </motion.h1>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.14 }}
          className="mx-auto mt-7 max-w-[54ch] text-balance text-center text-[17px] leading-relaxed text-neutral-500 md:text-lg"
        >
          La plataforma de agentes AI hecha para inmobiliarias. Automatiza matching, evaluación de
          inquilinos, asegurabilidad, cobros y conciliación —de punta a punta, en todos los canales.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.2 }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <LpButton href="/auth?mode=register" variant="primary">
            Empezar ahora
          </LpButton>
          <LpButton href="#planes" variant="light">
            Ver planes
          </LpButton>
        </motion.div>
      </div>
    </section>
  );
}
