"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { MonoLabel } from "@leasefy/cadence";

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
    <section className="relative overflow-hidden bg-bg">
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
            <MonoLabel className="tracking-[0.08em] text-primary">
              Arriendo inteligente · Colombia
            </MonoLabel>
          </span>

          {/* Headline */}
          <h1 className="font-heading text-[40px] md:text-[58px] font-semibold leading-[1.04] tracking-[-0.03em] text-fg">
            De buscar a vivir.
          </h1>
          <p className="mt-5 text-[16px] md:text-[18px] leading-relaxed text-fg-muted">
            Encuentra, evalúa y arrienda con IA. Sin papeleo, sin incertidumbre, sin esperas.
          </p>

          {/* Search — clean Manus surface (hairline, not glass) */}
          <div className="mt-9 rounded-xl border border-border-faint bg-white p-2.5 text-left transition-colors focus-within:border-border-strong">
            <div className="flex items-start gap-3 px-2 pt-1.5">
              <Sparkle
                weight={isSearching ? "fill" : "regular"}
                className={`mt-0.5 h-5 w-5 flex-shrink-0 ${isSearching ? "text-primary animate-pulse" : "text-fg-subtle"}`}
              />
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe tu próximo arriendo: 2 hab en Chapinero, estudio amoblado cerca al centro…"
                className="flex-1 resize-none bg-transparent py-0.5 text-base text-fg placeholder:text-fg-subtle focus:outline-none min-h-[48px]"
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
              <MonoLabel className="text-[10.5px] tracking-[0.06em] text-fg-subtle pl-1">
                Búsqueda con IA
              </MonoLabel>
              <Button
                size="icon"
                hideArrow
                isLoading={isSearching}
                onClick={() => startSearch(query)}
                disabled={isSearching}
                aria-label="Buscar"
                className="h-9 w-9 flex-shrink-0"
              >
                <ArrowUp className="h-4 w-4" weight="bold" />
              </Button>
            </div>
          </div>

          {/* Suggestion chips / thinking steps */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 min-h-[34px]">
            {isSearching
              ? THINKING_STEPS.map((step, i) => (
                  <MonoLabel
                    key={step}
                    className={`rounded-full border border-border-faint bg-surface px-3 py-1.5 text-[10.5px] tracking-[0.06em] text-fg-muted transition-all duration-300 ${
                      i <= searchStep ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                  >
                    {i < searchStep ? "✓ " : i === searchStep ? "● " : ""}
                    {step}
                  </MonoLabel>
                ))
              : SUGGESTIONS.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    hideArrow
                    onClick={() => {
                      setQuery(s);
                      startSearch(s);
                    }}
                    className="text-[12.5px] text-fg-muted"
                  >
                    {s}
                  </Button>
                ))}
          </div>

          {/* Trust stats — mono labels, Satoshi numbers */}
          <div className="mt-12 flex items-center justify-center divide-x divide-border-faint">
            {STATS.map((s) => (
              <div key={s.label} className="px-6 first:pl-0 last:pr-0">
                <p className="font-mono text-[24px] font-semibold tabular-nums leading-none text-fg">
                  {s.value}
                </p>
                <MonoLabel className="mt-1.5 block text-[10.5px] tracking-[0.06em] text-fg-subtle">
                  {s.label}
                </MonoLabel>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hairline base — whitespace separates, this just anchors the section */}
      <div className="border-b border-border-faint" />
    </section>
  );
}
