import Link from "next/link";
import Image from "next/image";

/**
 * HeroSection - Luxterra style EXACT
 * ALL content at the BOTTOM:
 * - Left side: description text + button + large brand name (cut off)
 * - Right side: agent card aligned with the brand text
 */
export function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2400"
          alt="Hero background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
      </div>

      {/* ALL Content at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="container-wide">
          {/* Two column layout */}
          <div className="flex items-end justify-between gap-8">
            {/* Left Column - Text, Button, and Brand Name */}
            <div className="flex-1">
              {/* Description and CTA */}
              <div className="max-w-lg mb-8">
                <p className="text-white/90 text-base md:text-lg tracking-[-0.02em] leading-relaxed mb-6">
                  Ayudamos a propietarios e inquilinos a encontrar el arriendo perfecto en Colombia—con claridad y soporte continuo.
                </p>
                <Link
                  href="/propiedades"
                  className="inline-flex items-center gap-3 bg-white text-foreground rounded-full pl-7 pr-3 py-2.5 text-sm tracking-tight hover:bg-white/95 transition-all duration-300 group"
                >
                  <span>Ver propiedades</span>
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-muted group-hover:bg-muted transition-colors">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </Link>
              </div>

              {/* Large Brand Name - MASSIVE like Luxterra, with padding so it's not cut off */}
              <h1 className="text-[28vw] md:text-[22vw] lg:text-[18vw] font-normal tracking-[-0.04em] text-white leading-[0.85] pb-4">
                Arriendo
              </h1>
            </div>

            {/* Right Column - Agent Card - Luxterra EXACT style */}
            <div className="hidden md:block pb-8">
              <a
                href="mailto:info@arriendofacil.co"
                className="flex items-stretch bg-white hover:bg-white/95 transition-all duration-300"
              >
                {/* Photo - square */}
                <div className="w-[72px] h-[72px] flex-shrink-0">
                  <Image
                    src="https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200"
                    alt="Agente"
                    width={72}
                    height={72}
                    className="object-cover w-full h-full"
                  />
                </div>
                {/* Text - middle section */}
                <div className="flex flex-col justify-center px-5">
                  <p className="text-muted-foreground text-xs tracking-tight">Te ayudamos</p>
                  <p className="text-foreground text-sm tracking-tight font-normal whitespace-nowrap">
                    Habla con un asesor
                  </p>
                </div>
                {/* Arrow button - black square, same height as photo */}
                <div className="w-[48px] h-[72px] bg-foreground flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
