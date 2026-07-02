'use client';

import { Suspense } from 'react';
import { LeasefyLogo, LeasefyWordmark } from '@/components/brand';
import Link from 'next/link';
import { AuthForm } from '@/components/auth/AuthForm';
import { motion } from 'framer-motion';
import { ArrowRight } from '@phosphor-icons/react';
import { ForceLightMode } from '@/components/providers/ForceLightMode';

// Métricas inferiores
const STATS = [
  { value: '2,500+', label: 'Propiedades gestionadas' },
  { value: '98%', label: 'Procesos automatizados' },
  { value: '< 48h', label: 'Tiempo de respuesta' },
];

// Tres beneficios — etiqueta mono (Ubuntu Mono) + descripción Satoshi.
const FEATURES = [
  { label: 'Evaluación inteligente', description: 'Riesgo, asegurabilidad y validación con IA' },
  { label: 'Operación automatizada', description: 'Contratos, cobros y conciliación en un solo flujo' },
  { label: 'Decisiones más precisas', description: 'Avalúos, reportes y seguimiento accionable' },
];

// Loading fallback for auth form — mirrors the left-aligned layout
function AuthFormFallback() {
  return (
    <div className="w-full animate-pulse">
      <div className="h-3 bg-muted rounded w-16 mb-4" />
      <div className="h-7 bg-muted rounded w-56 mb-2" />
      <div className="h-4 bg-muted rounded w-64 mb-8" />
      <div className="space-y-4">
        <div className="h-11 bg-muted rounded-md" />
        <div className="h-11 bg-muted rounded-md" />
        <div className="h-11 bg-muted rounded-md" />
      </div>
    </div>
  );
}

/**
 * Premium Auth page with split layout
 * Left: Beautiful door images slideshow with glass widgets
 * Right: Clean auth form
 */
export default function AuthPage() {
  return (
    <ForceLightMode>
    <div className="min-h-screen flex flex-col lg:flex-row bg-background" data-lenis-prevent>
      {/* Left Panel — brand hero: Cadence grainy gradient (Aurora — cobalt·cyan·lime)
          as a full-bleed field. Copy sits small and bottom-anchored; labels in
          JetBrains Mono. Replaces the legacy navy photo. */}
      <div className="hidden lg:flex lg:w-[55%] lg:fixed lg:inset-y-0 lg:left-0 relative overflow-hidden bg-[#0C1F80]">
        {/* Cadence signature: layered radial blobs + linear base */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(120% 130% at 10% 14%, rgba(26,64,255,0.95) 0%, rgba(26,64,255,0) 56%), radial-gradient(110% 120% at 90% 24%, rgba(43,181,232,0.55) 0%, rgba(43,181,232,0) 52%), radial-gradient(120% 120% at 74% 96%, rgba(125,224,138,0.40) 0%, rgba(125,224,138,0) 56%), linear-gradient(140deg, #1A40FF 0%, #0C1F80 58%, #081555 100%)',
          }}
        />
        {/* Cadence signature: grain overlay (feTurbulence fractal noise) */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none mix-blend-overlay opacity-[0.45]"
          style={{
            backgroundImage:
              `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
        {/* Bottom grounding veil for copy legibility */}
        <div
          className="absolute inset-0 z-[2]"
          style={{
            background:
              'linear-gradient(to top, rgba(8,21,85,0.60) 0%, rgba(8,21,85,0) 42%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-10 lg:p-12 w-full">
          {/* Top — wordmark only (the symbol already lives in the photo) */}
          <div>
            <Link href="/" className="inline-flex items-center group">
              <LeasefyWordmark className="text-white" style={{ fontSize: 21 }} />
            </Link>
          </div>

          {/* Bottom — title, subtitle, benefits, metrics */}
          <div className="max-w-[440px]">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="font-heading font-medium tracking-[-0.02em] leading-[1.16] text-white text-[28px] lg:text-[31px]">
                Toda tu operación inmobiliaria,
                <br />
                en una sola plataforma.
              </h1>
            </motion.div>

            {/* Tres beneficios — etiqueta mono + descripción, compactos */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-7 space-y-3.5"
            >
              {FEATURES.map((feature, i) => (
                <div key={i} className="flex items-baseline gap-3">
                  <span className="w-1 h-1 rounded-[1px] bg-[#7DE08A] flex-shrink-0 translate-y-[-2px]" />
                  <div>
                    <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-white/90 leading-none">
                      {feature.label}
                    </p>
                    <p className="mt-1 text-[12px] text-white/50 leading-snug">{feature.description}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Métricas inferiores */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 pt-5 border-t border-white/10 flex items-start gap-10"
            >
              {STATS.map((stat, i) => (
                <div key={i}>
                  <div className="text-[17px] font-heading font-medium text-white tabular-nums leading-none">{stat.value}</div>
                  <div className="mt-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.08em] text-white/45 leading-snug">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Right Panel — auth form, vertically centered, left-aligned content */}
      <div className="w-full lg:w-[45%] lg:ml-[55%] bg-background">
        <div className="min-h-screen flex flex-col py-6 sm:py-8 px-6 sm:px-8 lg:px-12">
          {/* Top bar with back link */}
          <div className="w-full max-w-[400px] mx-auto flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[13px] text-neutral-500 hover:text-[#14130f] transition-colors group"
            >
              <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
              Inicio
            </Link>

            {/* Mobile logo */}
            <div className="lg:hidden">
              <Link href="/" className="inline-flex items-center justify-center">
                <LeasefyLogo size={24} tone="brand" />
              </Link>
            </div>
          </div>

          {/* Centered form */}
          <div className="flex-1 flex flex-col justify-center w-full max-w-[400px] mx-auto py-10">
            <Suspense fallback={<AuthFormFallback />}>
              <AuthForm />
            </Suspense>

            {/* Footer */}
            <p className="mt-10 text-[11.5px] text-neutral-400 leading-relaxed">
              Al continuar, aceptas nuestros{' '}
              <Link href="/terminos" className="text-neutral-600 hover:text-[#14130f] underline-offset-2 hover:underline">
                Términos
              </Link>{' '}
              y{' '}
              <Link href="/privacidad" className="text-neutral-600 hover:text-[#14130f] underline-offset-2 hover:underline">
                Política de Privacidad
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
    </ForceLightMode>
  );
}
