import Image from "next/image";
import { SectionLabel } from "@/components/ui/section-label";

const stats = [
  {
    value: "84%",
    label: "Cierran mas rapido",
    description: "Clientes trabajando con nosotros completan arriendos mas rapido.",
  },
  {
    value: "3 de 5",
    label: "Consiguen arriendo",
    description: "Mas de la mitad de nuestros clientes aseguran su propiedad ideal.",
  },
  {
    value: "$500M+",
    label: "Ahorrados anualmente",
    description: "Ayudamos a inquilinos a evitar sobrepagar en el mercado.",
  },
  {
    value: "95%",
    label: "Refieren amigos",
    description: "La mayoria de clientes recomiendan nuestro equipo.",
  },
];

/**
 * WhyUsSection - Luxterra style
 * Minimal design, square corners, small text
 */
export function WhyUsSection() {
  return (
    <section className="light-section bg-muted section-padding">
      <div className="container-wide">
        {/* Header */}
        <div className="mb-16">
          <SectionLabel className="text-muted-foreground mb-4">Por que nosotros</SectionLabel>
          <h2 className="heading-display text-foreground">
            Expertos en arriendos en Colombia
          </h2>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left - Image Card - NO rounded corners */}
          <div className="relative overflow-hidden bg-foreground min-h-[500px]">
            <Image
              src="https://images.unsplash.com/photo-1600573472550-8090b5e0745e?q=80&w=1200"
              alt="Asesor inmobiliario"
              fill
              className="object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
                <span className="text-xs text-white/70 tracking-tight">La mejor agencia de Colombia</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-normal text-white mb-4 tracking-tight">
                2k clientes eligen nuestra agencia de confianza
              </h3>
              <p className="text-sm text-white/70 leading-relaxed tracking-tight">
                Elegirnos importa — experiencia y guia clara moldean cada decision inmobiliaria.
              </p>
            </div>
          </div>

          {/* Right - Stats Grid - rounded-sm (2px) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-sm p-6 flex flex-col"
              >
                <div className="mb-auto">
                  <p className="text-3xl md:text-4xl font-normal text-foreground tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-xs text-foreground tracking-tight mt-1">{stat.label}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-6 leading-relaxed tracking-tight">
                  {stat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
