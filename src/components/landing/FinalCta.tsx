"use client";

import { EyebrowPill, Reveal, lpDisplay, LpButton } from "./_kit";

export default function FinalCta() {
  return (
    <section className="lp-band py-20 md:py-28 lg:py-32">
      <div className="container-platform">
        <Reveal>
          {/* Light hairline-bordered panel with a very subtle indigo radial wash */}
          <div className="relative overflow-hidden rounded-[28px] border border-border bg-surface px-6 py-16 md:px-12 md:py-24">
            {/* low-opacity indigo wash — stays light/clean, no dark panel */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 90% at 50% 0%, rgba(26,64,255,0.06), transparent 60%)",
              }}
            />

            <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
              <EyebrowPill>Empieza hoy</EyebrowPill>

              {/* Headline — echoes the hero value prop */}
              <h2
                className={`${lpDisplay} mt-7 max-w-[16ch] text-balance text-fg`}
              >
                Tu inmobiliaria, operando en piloto automático.
              </h2>

              {/* Subhead */}
              <p className="mt-7 max-w-[52ch] text-balance text-[17px] leading-relaxed text-fg-muted md:text-lg">
                Centraliza CRM, ERP y agentes AI en una sola plataforma.{" "}
                <span className="text-fg-subtle">Sin migraciones eternas.</span>
              </p>

              {/* CTA */}
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <LpButton
                  href="/auth?mode=register"
                  variant="primary"                >
                  Empezar ahora
                </LpButton>
                <LpButton
                  href="#planes"
                  variant="light"                >
                  Ver planes
                </LpButton>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
