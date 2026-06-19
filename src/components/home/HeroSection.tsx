"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, SpinnerGap, Sparkle } from "@phosphor-icons/react";

const SUGGESTIONS = [
  "2 hab. en Chapinero con parqueadero",
  "Casa con jardín en Envigado",
  "Estudio amoblado cerca al centro",
  "Pet-friendly en Laureles",
];

const THINKING_STEPS = [
  "Analizando tu búsqueda…",
  "Buscando entre 200+ propiedades…",
  "Encontré propiedades para ti",
];

const STATS = [
  { value: "200+", label: "Propiedades" },
  { value: "48h", label: "Para arrendar" },
  { value: "4.9", label: "Calificación" },
];

/**
 * HeroSection — Manus language: light canvas, hairline surfaces, generous air,
 * Satoshi display + mono eyebrow, single electric-blue accent. No stock-photo hero.
 */
export function HeroSection() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchStep, setSearchStep] = useState(0);
  const router = useRouter();
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  function startSearch(searchQuery: string) {
    if (!searchQuery.trim() || isSearching) return;
    setIsSearching(true);
    setSearchStep(0);
    const t1 = setTimeout(() => setSearchStep(1), 800);
    const t2 = setTimeout(() => setSearchStep(2), 1800);
    const t3 = setTimeout(() => {
      router.push(`/propiedades?q=${encodeURIComponent(searchQuery.trim())}`);
    }, 2400);
    timersRef.current = [t1, t2, t3];
  }

  return (
    <section className="relative overflow-hidden bg-[#f8f8f8]">
      {/* Ambient blue glow — atmosphere, not a clickable element (allowed by brand) */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[420px] w-[820px] rounded-full opacity-[0.06]"
        style={{ background: "radial-gradient(closest-side, #1A40FF, transparent)" }}
      />

      <div className="relative container-platform pt-[88px] pb-[72px] md:pt-[120px] md:pb-[96px]">
        <div className="mx-auto max-w-[680px] text-center">
          {/* Eyebrow — brand signature */}
          <span className="inline-flex items-center gap-2 mb-6">
            <span className="inline-block h-1.5 w-1.5 rounded-[2px] bg-primary" />
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-primary">
              Arriendo inteligente · Colombia
            </span>
          </span>

          {/* Headline */}
          <h1 className="font-heading text-[40px] md:text-[58px] font-semibold leading-[1.04] tracking-[-0.03em] text-neutral-900">
            De buscar a vivir.
          </h1>
          <p className="mt-5 text-[16px] md:text-[18px] leading-relaxed text-neutral-500">
            Encuentra, evalúa y arrienda con IA. Sin papeleo, sin incertidumbre, sin esperas.
          </p>

          {/* Search — clean Manus surface (hairline, not glass) */}
          <div className="mt-9 rounded-xl border border-neutral-200 bg-white p-2.5 text-left transition-colors focus-within:border-neutral-300">
            <div className="flex items-start gap-3 px-2 pt-1.5">
              <Sparkle
                weight={isSearching ? "fill" : "regular"}
                className={`mt-0.5 h-5 w-5 flex-shrink-0 ${isSearching ? "text-primary animate-pulse" : "text-neutral-400"}`}
              />
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe tu próximo arriendo: 2 hab en Chapinero, estudio amoblado cerca al centro…"
                className="flex-1 resize-none bg-transparent py-0.5 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none min-h-[48px]"
                disabled={isSearching}
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    startSearch(query);
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-2 px-1 pt-1">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-neutral-400 pl-1">
                Búsqueda con IA
              </span>
              <button
                onClick={() => startSearch(query)}
                disabled={isSearching}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-primary text-white transition-opacity hover:opacity-90 disabled:opacity-50 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
                aria-label="Buscar"
              >
                {isSearching ? (
                  <SpinnerGap className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" weight="bold" />
                )}
              </button>
            </div>
          </div>

          {/* Suggestion chips / thinking steps */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 min-h-[34px]">
            {isSearching
              ? THINKING_STEPS.map((step, i) => (
                  <span
                    key={step}
                    className={`rounded-full border border-neutral-200 bg-white px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-neutral-600 transition-all duration-300 ${
                      i <= searchStep ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                  >
                    {i < searchStep ? "✓ " : i === searchStep ? "● " : ""}
                    {step}
                  </span>
                ))
              : SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setQuery(s);
                      startSearch(s);
                    }}
                    className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[12.5px] text-neutral-600 transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                  >
                    {s}
                  </button>
                ))}
          </div>

          {/* Trust stats — mono labels, Satoshi numbers */}
          <div className="mt-12 flex items-center justify-center divide-x divide-neutral-200">
            {STATS.map((s) => (
              <div key={s.label} className="px-6 first:pl-0 last:pr-0">
                <p className="font-heading text-[24px] font-semibold tabular-nums leading-none text-neutral-900">
                  {s.value}
                </p>
                <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-neutral-400">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hairline base — whitespace separates, this just anchors the section */}
      <div className="border-b border-neutral-200" />
    </section>
  );
}
