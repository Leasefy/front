"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { SectionLabel } from "@/components/ui/section-label";
import { ArrowUpRight } from "lucide-react";

const cities = [
  {
    name: "Bogotá",
    tagline: "Capital cosmopolita",
    description: "Apartamentos modernos, barrios vibrantes y la mejor conectividad del país.",
    // Pexels 7613843 — Aerial shot of Colpatria Tower at sunset, Bogotá
    image: "https://images.pexels.com/photos/7613843/pexels-photo-7613843.jpeg?auto=compress&cs=tinysrgb&w=1600&h=2400&fit=crop",
    href: "/propiedades?city=Bogota",
    properties: "2.4k+",
  },
  {
    name: "Medellín",
    tagline: "Ciudad de la eterna primavera",
    description: "Clima perfecto, innovación y la mejor calidad de vida urbana.",
    image: "/cities/medellin.webp",
    href: "/propiedades?city=Medellin",
    properties: "1.8k+",
  },
  {
    name: "Cali",
    tagline: "Capital de la salsa",
    description: "Comunidades alegres, cultura vibrante y un mercado en crecimiento.",
    image: "/cities/cali.jpeg",
    href: "/propiedades?city=Cali",
    properties: "890+",
  },
  {
    name: "Cartagena",
    tagline: "Joya del Caribe",
    description: "Vida costera, historia colonial y arquitectura única.",
    // Pexels 8264573 — Colorful colonial houses in Cartagena
    image: "https://images.pexels.com/photos/8264573/pexels-photo-8264573.jpeg?auto=compress&cs=tinysrgb&w=1600&h=2400&fit=crop",
    href: "/propiedades?city=Cartagena",
    properties: "1.2k+",
  },
];

export function CitiesSection() {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[1400px] px-6 md:px-12">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-14 md:mb-20">
          <SectionLabel className="mb-4 justify-center">
            Ubicaciones
          </SectionLabel>
          <h2 className="text-[1.75rem] md:text-[2.5rem] font-light text-foreground leading-[1.2] tracking-[-0.02em] italic mb-3">
            Ciudades destacadas
          </h2>
          <p className="text-muted-foreground text-[15px] md:text-base max-w-md leading-relaxed">
            Explora las ciudades colombianas más buscadas por su comodidad, mercado y calidad de vida
          </p>
        </div>

        {/* Cards — asymmetric: first card tall, rest shorter on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cities.map((city, index) => (
            <motion.div
              key={city.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={index === 0 ? "sm:col-span-2 lg:col-span-1" : ""}
            >
              <Link
                href={city.href}
                className="group relative block h-[520px] lg:h-[560px] overflow-hidden"
                style={{ border: "1px solid rgba(0,0,0,0.06)" }}
              >
                {/* Image */}
                <Image
                  src={city.image}
                  alt={`${city.name}, Colombia`}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />

                {/* Gradient overlay — stronger at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10 transition-opacity duration-500" />

                {/* Hover indigo tint */}
                <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors duration-500" />

                {/* Content at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  {/* Property count badge */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/15 backdrop-blur-md rounded-full mb-3 border border-white/10">
                    <span className="text-[11px] font-medium text-white/90 tracking-wide uppercase">
                      {city.properties} propiedades
                    </span>
                  </div>

                  {/* City name */}
                  <h3 className="text-[22px] md:text-[26px] font-medium text-white tracking-[-0.02em] leading-tight mb-0.5 flex items-center gap-2">
                    {city.name}
                    <ArrowUpRight className="w-4 h-4 text-white/60 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-300" />
                  </h3>

                  {/* Tagline */}
                  <p className="text-[13px] text-white/60 tracking-[-0.01em] mb-2">
                    {city.tagline}
                  </p>

                  {/* Description — reveals on hover */}
                  <p className="text-[14px] text-white/80 leading-relaxed max-h-0 overflow-hidden opacity-0 group-hover:max-h-20 group-hover:opacity-100 transition-all duration-500 ease-out">
                    {city.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
