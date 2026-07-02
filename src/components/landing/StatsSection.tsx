"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { EyebrowPill, Reveal } from "./_kit";

// Cifras defensables (capacidad de la plataforma), no métricas de performance inventadas.
const STATS = [
  { target: 7, suffix: "", k: "Agentes AI especializados, listos para trabajar" },
  { target: 24, suffix: "/7", k: "Operación sin pausas, en todos los canales" },
  { target: 1, suffix: "", k: "Una sola plataforma: CRM, ERP y agentes" },
  { target: 100, suffix: "%", k: "Trazabilidad y auditoría de cada acción" },
];

/** Count-up that animates the leading numeric part and keeps the suffix static (never NaN). */
function StatNumber({ target, suffix, start }: { target: number; suffix: string; start: boolean }) {
  const [n, setN] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    if (!start || done.current) return;
    done.current = true;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setN(target);
      return;
    }

    const dur = 1200;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setN(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target]);

  return (
    <span className="tabular-nums">
      {n}
      {suffix}
    </span>
  );
}

export default function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });

  return (
    <section className="lp-band py-20 md:py-28 lg:py-32">
      <div className="container-platform">
        {/* header — eyebrow + heading only (Handle's "THE IMPACT" treatment) */}
        <Reveal className="text-center">
          <div className="flex justify-center">
            <EyebrowPill>El impacto</EyebrowPill>
          </div>
          <h2 className="mx-auto mt-7 max-w-4xl font-heading text-[clamp(2.2rem,5vw,4rem)] font-medium leading-[1.04] tracking-[-0.04em] text-neutral-950">
            Qué cambia cuando los agentes trabajan
          </h2>
        </Reveal>

        {/* open numbers — no cards, no borders, big bold sans, caption below */}
        <Reveal delay={0.1}>
          <div
            ref={ref}
            className="mt-16 grid grid-cols-2 gap-x-8 gap-y-14 md:mt-20 md:grid-cols-4"
          >
            {STATS.map((s) => (
              <div key={s.k}>
                <p className="font-heading text-[clamp(3.25rem,7vw,5.5rem)] font-medium leading-none tracking-[-0.04em] text-neutral-950">
                  <StatNumber target={s.target} suffix={s.suffix} start={inView} />
                </p>
                <p className="mt-5 max-w-[24ch] text-[14px] leading-relaxed text-neutral-500">
                  {s.k}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
