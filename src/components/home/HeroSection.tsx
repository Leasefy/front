"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowUp, SpinnerGap, Shield, Lightning, Eye } from '@phosphor-icons/react';

/** Sparkle icon with 3 four-pointed stars - gray or gradient */
function SparkleIcon({ active = false, className }: { active?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="hero-sparkles-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      {/* Large star */}
      <path
        d="M10 16c0-3.5 2.5-6 6-6c-3.5 0-6-2.5-6-6c0 3.5-2.5 6-6 6c3.5 0 6 2.5 6 6z"
        fill={active ? "url(#hero-sparkles-gradient)" : "currentColor"}
      />
      {/* Small star top-right */}
      <path
        d="M18 9c0-1.5 1-2.5 2.5-2.5c-1.5 0-2.5-1-2.5-2.5c0 1.5-1 2.5-2.5 2.5c1.5 0 2.5 1 2.5 2.5z"
        fill={active ? "url(#hero-sparkles-gradient)" : "currentColor"}
      />
      {/* Medium star bottom-right */}
      <path
        d="M19 20c0-2 1.5-3.5 3.5-3.5c-2 0-3.5-1.5-3.5-3.5c0 2-1.5 3.5-3.5 3.5c2 0 3.5 1.5 3.5 3.5z"
        fill={active ? "url(#hero-sparkles-gradient)" : "currentColor"}
      />
    </svg>
  );
}

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
  "/hero-8.jpg",  // Family in living room
  "/hero-9.jpg",  // Couple playing chess
  "/hero-10.jpg", // Family with baby
  "/hero-11.jpg", // Woman relaxing on couch
];

const IMAGE_INTERVAL = 6000;

const VALUE_PROPS = [
  {
    icon: Shield,
    label: "Evaluación GRATIS",
    description: "Verifica inquilinos sin costo. El solicitante paga la evaluación.",
  },
  {
    icon: Lightning,
    label: "Cobro automatizado",
    description: "Recibimos el pago y te transferimos. Solo $3.900/transacción.",
  },
  {
    icon: Eye,
    label: "Publica gratis",
    description: "Un clic para FincaRaíz, Metrocuadrado y más portales.",
  },
];

export function HeroSection() {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isMagnifyingGlassing, setIsMagnifyingGlassing] = useState(false);
  const [searchStep, setMagnifyingGlassStep] = useState(0);
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

  function startMagnifyingGlassSequence(searchQuery: string) {
    if (!searchQuery.trim() || isMagnifyingGlassing) return;
    setIsMagnifyingGlassing(true);
    setMagnifyingGlassStep(0);
    const t1 = setTimeout(() => setMagnifyingGlassStep(1), 800);
    const t2 = setTimeout(() => setMagnifyingGlassStep(2), 1800);
    const t3 = setTimeout(() => {
      router.push(`/propiedades?q=${encodeURIComponent(searchQuery.trim())}`);
    }, 2400);
    timersRef.current = [t1, t2, t3];
  }

  function handleMagnifyingGlass() {
    startMagnifyingGlassSequence(query);
  }

  function handleSuggestion(suggestion: string) {
    setQuery(suggestion);
    startMagnifyingGlassSequence(suggestion);
  }

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
      <div className="relative z-10 flex flex-col md:flex-row h-full container-platform">
        {/* Left — search area */}
        <div className="flex-1 flex flex-col justify-end pb-6 md:pb-10">
          <div className="max-w-xl space-y-4">
            {/* Headline */}
            <div className="space-y-2 mb-2">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-medium text-white tracking-[-0.03em]">
                De buscar a vivir.
              </h1>
              <p className="text-base md:text-lg text-white/60 whitespace-nowrap">
                Sin papeleo, sin incertidumbre, sin esperas.
              </p>
            </div>

            {/* MagnifyingGlass input */}
            <div className="relative flex flex-col bg-white/10 backdrop-blur-2xl border border-white/15 rounded-2xl px-5 pt-4 pb-3">
              {/* Top: icon + textarea */}
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 mt-0.5 ${isMagnifyingGlassing ? "animate-spin" : ""}`} style={{ animationDuration: "2s" }}>
                  <SparkleIcon
                    active={isMagnifyingGlassing}
                    className={`w-7 h-7 ${isMagnifyingGlassing ? "" : "text-white/50"}`}
                  />
                </div>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Busca tu próximo arriendo: 2 hab en Chapinero, estudio amoblado…"
                  className="flex-1 bg-transparent text-[15px] text-white placeholder:text-white/40 focus:outline-none resize-none min-h-[60px]"
                  disabled={isMagnifyingGlassing}
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleMagnifyingGlass();
                    }
                  }}
                />
              </div>

              {/* Robottom: send button */}
              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  onClick={handleMagnifyingGlass}
                  disabled={isMagnifyingGlassing}
                  className="flex-shrink-0 h-8 w-8 rounded-full bg-white/20 border border-white/10 flex items-center justify-center hover:bg-white/30 transition-colors disabled:opacity-50"
                  aria-label="Buscar"
                >
                  {isMagnifyingGlassing ? (
                    <SpinnerGap className="h-4 w-4 text-white animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4 text-white" />
                  )}
                </button>
              </div>
            </div>

            {/* Suggestion chips OR thinking steps */}
            <div className="flex flex-wrap gap-2 pl-1 min-h-[36px]">
              {isMagnifyingGlassing ? (
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
        <div className="hidden md:flex items-end justify-end pb-10 w-[340px] flex-shrink-0">
          <div className="w-full space-y-3">
            {VALUE_PROPS.map((prop, i) => {
              const Icon = prop.icon;
              const isActive = i === activeValue;
              return (
                <button
                  key={i}
                  onClick={() => setActiveValue(i)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-500 ${
                    isActive
                      ? "bg-white/15 backdrop-blur-2xl border-white/20"
                      : "bg-transparent border-transparent hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500 ${
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
                        className={`font-mono uppercase text-[13px] font-normal transition-all duration-500 ${
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
