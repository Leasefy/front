"use client";

import { AnimatedCounter } from "@/components/ui/animated-counter";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const stats = [
  { value: 320, suffix: "+", label: "Arriendos exitosos" },
  { value: 3, suffix: "k", label: "Clientes atendidos" },
  { value: 78, suffix: "+", label: "Propiedades evaluadas" },
  { value: 95, suffix: "%", label: "Satisfacción del cliente" },
];

/* ── Animated lines that flow from the bento above into the stats ── */
function FlowLines() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });

  // 4 lines — one per stat column, flowing down and converging slightly
  const lines = [
    { x1: "12.5%", x2: "12.5%", delay: 0 },
    { x1: "37.5%", x2: "37.5%", delay: 0.12 },
    { x1: "62.5%", x2: "62.5%", delay: 0.24 },
    { x1: "87.5%", x2: "87.5%", delay: 0.36 },
  ];

  return (
    <div ref={ref} className="relative w-full h-24 md:h-32 overflow-hidden">
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
        viewBox="0 0 1400 128"
        fill="none"
      >
        {/* Faint grid dots at intersections */}
        {lines.map((line, i) => {
          const cx = parseFloat(line.x1) / 100 * 1400;
          return (
            <motion.circle
              key={`dot-top-${i}`}
              cx={cx}
              cy={4}
              r={2}
              fill="currentColor"
              className="text-foreground/10"
              initial={{ opacity: 0, scale: 0 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: line.delay + 0.1, duration: 0.3 }}
            />
          );
        })}

        {/* Vertical flowing lines */}
        {lines.map((line, i) => {
          const x = parseFloat(line.x1) / 100 * 1400;
          return (
            <motion.line
              key={`line-${i}`}
              x1={x}
              y1={0}
              x2={x}
              y2={128}
              stroke="currentColor"
              className="text-foreground/[0.06]"
              strokeWidth={1}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
              transition={{ delay: line.delay, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          );
        })}

        {/* Accent glow lines — thinner, colored, faster */}
        {lines.map((line, i) => {
          const x = parseFloat(line.x1) / 100 * 1400;
          return (
            <motion.line
              key={`glow-${i}`}
              x1={x}
              y1={0}
              x2={x}
              y2={128}
              stroke="url(#lineGradient)"
              strokeWidth={1.5}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
              transition={{ delay: line.delay + 0.15, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          );
        })}

        {/* Robottom dots */}
        {lines.map((line, i) => {
          const cx = parseFloat(line.x1) / 100 * 1400;
          return (
            <motion.circle
              key={`dot-bottom-${i}`}
              cx={cx}
              cy={124}
              r={2.5}
              fill="url(#dotGradient)"
              initial={{ opacity: 0, scale: 0 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: line.delay + 0.5, duration: 0.3, type: "spring", stiffness: 300 }}
            />
          );
        })}

        {/* Horizontal connecting line at bottom — base */}
        <motion.line
          x1={parseFloat(lines[0].x1) / 100 * 1400}
          y1={124}
          x2={parseFloat(lines[3].x1) / 100 * 1400}
          y2={124}
          stroke="currentColor"
          className="text-foreground/[0.06]"
          strokeWidth={1}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
          transition={{ delay: 0.6, duration: 0.5 }}
        />

        {/* Horizontal accent glow — matching vertical accents */}
        <motion.line
          x1={parseFloat(lines[0].x1) / 100 * 1400}
          y1={124}
          x2={parseFloat(lines[3].x1) / 100 * 1400}
          y2={124}
          stroke="url(#hLineGradient)"
          strokeWidth={1.5}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
          transition={{ delay: 0.7, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        />

        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1A40FF" stopOpacity="0" />
            <stop offset="40%" stopColor="#1A40FF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1A40FF" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="hLineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1A40FF" stopOpacity="0.06" />
            <stop offset="50%" stopColor="#1A40FF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1A40FF" stopOpacity="0.06" />
          </linearGradient>
          <radialGradient id="dotGradient">
            <stop offset="0%" stopColor="#1A40FF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1A40FF" stopOpacity="0.1" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

export function StatsSection() {
  return (
    <section className="bg-white pt-0 pb-16 md:pb-24">
      {/* Flow lines connecting from bento above — same container as AboutSection bento */}
      <div className="container-platform">
        <FlowLines />
      </div>

      <div className="container-platform">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-14 gap-x-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              {/* Number */}
              <div className="text-[3.5rem] md:text-[5.5rem] font-mono tabular-nums font-extralight text-foreground leading-none tracking-[-0.04em]">
                <AnimatedCounter
                  end={stat.value}
                  suffix={stat.suffix}
                  duration={2000}
                />
              </div>

              {/* Thin accent line */}
              <div className="mx-auto mt-4 mb-3 w-8 h-[1px] bg-foreground/15" />

              {/* Label */}
              <p className="text-muted-foreground text-[13px] md:text-sm tracking-[-0.01em]">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
