import Image from "next/image";

const features = [
  {
    icon: (
      <svg className="w-10 h-10 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.75">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
    title: "Busqueda Inteligente",
    description:
      "Analizamos tus preferencias, estudiamos el mercado y filtramos propiedades. Cada recomendacion esta pensada para guiar tu decision.",
  },
  {
    icon: (
      <svg className="w-10 h-10 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.75">
        <path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "Evaluacion de Riesgo",
    description:
      "Evaluamos la capacidad de pago, verificamos referencias y analizamos historial. Cada detalle es revisado para asegurar confianza.",
  },
];

/**
 * AboutSection - Luxterra PIXEL PERFECT
 * - Image aligned with label line
 * - More square/vertical image ratio
 * - Larger, finer icons
 */
export function AboutSection() {
  return (
    <section className="bg-white py-24 lg:py-32">
      <div className="container-wide">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-stretch">
          {/* Left Column - Text + Feature Cards */}
          <div>
            {/* Label with extended line - this sets the alignment point */}
            <div className="flex items-center gap-4 mb-8">
              <span className="flex items-center gap-2 text-xs text-muted-foreground tracking-tight whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Nosotros
              </span>
              <div className="flex-1 h-px bg-muted" />
            </div>

            {/* Heading */}
            <h2 className="text-[40px] lg:text-[48px] font-normal text-foreground leading-[1.1] tracking-[-0.02em] mb-6">
              Nuestra mision te lleva a un mejor hogar
            </h2>

            {/* Description */}
            <p className="text-base text-muted-foreground leading-relaxed mb-12 max-w-md">
              Apoyamos a propietarios e inquilinos en Colombia con herramientas que simplifican decisiones, mejoran resultados y brindan claridad.
            </p>

            {/* Feature Cards - larger icons */}
            <div className="space-y-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-muted p-6 lg:p-7"
                >
                  <div className="flex gap-5">
                    {/* Icon - LARGER */}
                    <div className="flex-shrink-0">
                      {feature.icon}
                    </div>
                    {/* Text */}
                    <div>
                      <h3 className="text-sm font-medium text-foreground mb-2 tracking-tight">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Image stretches to match left column height */}
          <div className="relative min-h-[400px]">
            <Image
              src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=1200"
              alt="Interior de apartamento moderno"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
