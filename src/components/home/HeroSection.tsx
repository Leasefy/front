"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Sparkles, ArrowUp, Loader2, Shield, Zap, Eye } from "lucide-react";

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

const HERO_IMAGES = [
  "/hero-1.jpg",
  "/hero-2.jpg",
  "/hero-3.jpg",
  "/hero-4.jpg",
  "/hero-5.jpg",
  "/hero-6.jpg",
  "/hero-7.jpg",
];

const IMAGE_INTERVAL = 6000;

const VALUE_PROPS = [
  {
    icon: Zap,
    label: "Búsqueda con IA",
    description: "Encuentra en segundos lo que antes tomaba horas",
  },
  {
    icon: Shield,
    label: "Arriendos seguros",
    description: "Contratos digitales y verificación de identidad",
  },
  {
    icon: Eye,
    label: "Todo transparente",
    description: "Sin costos ocultos, sin intermediarios innecesarios",
  },
];

export function HeroSection() {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStep, setSearchStep] = useState(0);
  const [activeValue, setActiveValue] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const router = useRouter();
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  // Auto-cycle value props
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveValue((prev) => (prev + 1) % VALUE_PROPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Auto-cycle hero images
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveImage((prev) => (prev + 1) % HERO_IMAGES.length);
    }, IMAGE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  function startSearchSequence(searchQuery: string) {
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

  function handleSearch() {
    startSearchSequence(query);
  }

  function handleSuggestion(suggestion: string) {
    setQuery(suggestion);
    startSearchSequence(suggestion);
  }

  const showNewBadge = !isFocused && !query && !isSearching;

  return (
    <section className="relative h-[500px] overflow-hidden bg-black">
      {/* Background — crossfade image slideshow */}
      {HERO_IMAGES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0"
          style={{
            opacity: i === activeImage ? 1 : 0,
            transition: "opacity 4s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <Image
            src={src}
            alt={`Interior ${i + 1}`}
            fill
            className="object-cover"
            priority={i === 0}
            sizes="100vw"
          />
        </div>
      ))}
      {/* Overlays for legibility */}
      <div className="absolute inset-0 bg-black/25 z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10 z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/50 z-[1]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col md:flex-row h-full">
        {/* Left — search area */}
        <div className="flex-1 flex flex-col justify-end p-5 md:p-8 pb-6 md:pb-10">
          <div className="max-w-xl space-y-4">
            {/* Search input */}
            <div className="relative flex flex-col bg-white/10 backdrop-blur-2xl border border-white/15 rounded-sm px-5 pt-4 pb-3">
              {/* Top: icon + textarea */}
              <div className="flex items-start gap-3">
                <Sparkles
                  className={`h-4 w-4 mt-1 text-white/50 flex-shrink-0 ${
                    isSearching ? "animate-sparkle-spin text-white" : ""
                  }`}
                />
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Cuéntanos qué necesitas para vivir bien…"
                  className="flex-1 bg-transparent text-[15px] text-white placeholder:text-white/40 focus:outline-none resize-none min-h-[60px]"
                  disabled={isSearching}
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                />
              </div>

              {/* Bottom: badge + send */}
              <div className="flex items-center justify-end gap-2 mt-2">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium uppercase tracking-wide text-white bg-blue-500 rounded-full px-2.5 py-1 transition-opacity duration-500 ease-in-out ${
                    showNewBadge ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                >
                  Nuevo
                </span>
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="flex-shrink-0 h-8 w-8 rounded-full bg-white/20 border border-white/10 flex items-center justify-center hover:bg-white/30 transition-colors disabled:opacity-50"
                  aria-label="Buscar"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4 text-white" />
                  )}
                </button>
              </div>
            </div>

            {/* Suggestion chips OR thinking steps */}
            <div className="flex flex-wrap gap-2 pl-1 min-h-[36px]">
              {isSearching ? (
                THINKING_STEPS.map((step, i) => (
                  <span
                    key={step}
                    className={`rounded-full bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-1.5 text-[12px] text-white/90 transition-all duration-300 ${
                      i <= searchStep
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-2 pointer-events-none"
                    }`}
                  >
                    {i < searchStep ? "✓ " : i === searchStep ? "● " : ""}
                    {step}
                  </span>
                ))
              ) : (
                SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="rounded-full bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-1.5 text-[12px] text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                  >
                    {s}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right — value props panel */}
        <div className="hidden md:flex items-end justify-end p-8 pb-10 w-[340px] flex-shrink-0">
          <div className="w-full space-y-3">
            {VALUE_PROPS.map((prop, i) => {
              const Icon = prop.icon;
              const isActive = i === activeValue;
              return (
                <button
                  key={i}
                  onClick={() => setActiveValue(i)}
                  className={`w-full text-left p-4 rounded-[1px] border transition-all duration-500 ${
                    isActive
                      ? "bg-white/15 backdrop-blur-2xl border-white/20"
                      : "bg-transparent border-transparent hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-[1px] flex items-center justify-center transition-all duration-500 ${
                        isActive ? "bg-white/20" : "bg-white/10"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 transition-all duration-500 ${
                          isActive ? "text-white" : "text-white/40"
                        }`}
                      />
                    </div>
                    <div>
                      <p
                        className={`text-[13px] font-semibold transition-all duration-500 ${
                          isActive ? "text-white" : "text-white/50"
                        }`}
                      >
                        {prop.label}
                      </p>
                      <p
                        className={`text-[12px] leading-relaxed mt-0.5 transition-all duration-500 overflow-hidden ${
                          isActive
                            ? "text-white/60 max-h-20 opacity-100"
                            : "text-white/30 max-h-0 opacity-0"
                        }`}
                      >
                        {prop.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Progress indicators */}
            <div className="flex items-center gap-2 pt-1 px-1">
              {VALUE_PROPS.map((_, i) => (
                <div
                  key={i}
                  className="relative h-[2px] flex-1 rounded-full overflow-hidden bg-white/15"
                >
                  {i === activeValue && (
                    <span
                      className="absolute inset-y-0 left-0 bg-white/70 rounded-full"
                      style={{
                        animation: "progress-bar 4s linear forwards",
                      }}
                    />
                  )}
                  {i < activeValue && (
                    <span className="absolute inset-0 bg-white/40 rounded-full" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
