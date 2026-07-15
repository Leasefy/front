import { MonoLabel } from "@leasefy/cadence";

import { LpButton, Reveal, AmbientField } from "./_kit";

/**
 * NCCtaSplit — NewsCatcher "Secure strategic advantage..." closing CTA.
 *
 * Light-gray rounded panel inside a white section. Two-column layout:
 * LEFT = big left-aligned heading. RIGHT (justified end) = small mono note
 * + primary CTA button. Everything light, NewsCatcher tokens.
 */
export default function NCCtaSplit() {
  return (
    <section className="bg-white py-24 md:py-32">
      <div className="container-platform">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-muted px-8 py-14 md:px-16 md:py-20">
            <AmbientField className="opacity-60" />
            <div className="relative grid items-center gap-10 lg:grid-cols-2">
              {/* LEFT — big heading, left-aligned */}
              <h2 className="max-w-[16ch] font-heading font-medium leading-[1.1] tracking-[-0.01em] text-[clamp(1.9rem,3.4vw,2.6rem)] text-fg">
                Asegura tu operación con agentes que trabajan solos.
              </h2>

              {/* RIGHT — mono note + primary CTA */}
              <div className="lg:justify-self-end">
                <MonoLabel className="block max-w-[28ch] text-[12px] leading-relaxed tracking-[0.08em] text-fg">
                  Lo que no ves te puede costar. Cambiemos eso.
                </MonoLabel>
                <div className="mt-6">
                  <LpButton href="/auth?mode=register" arrow>
                    Agendar demo
                  </LpButton>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
