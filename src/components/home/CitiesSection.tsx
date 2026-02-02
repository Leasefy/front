"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const cities = [
  {
    name: "Bogota",
    description: "Encuentra apartamentos modernos, barrios vibrantes y oportunidades",
    // Bogota aerial view - Pexels ID 19675608
    image: "https://images.pexels.com/photos/19675608/pexels-photo-19675608.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/propiedades?city=Bogota",
  },
  {
    name: "Medellin",
    description: "Explora el clima perfecto, innovacion y calidad de vida",
    // Medellin colorful urban landscape - Pexels ID 32427254
    image: "https://images.pexels.com/photos/32427254/pexels-photo-32427254.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/propiedades?city=Medellin",
  },
  {
    name: "Cali",
    description: "Descubre comunidades alegres, cultura y lifestyle",
    // Cali Tower - Pexels ID 13808901
    image: "https://images.pexels.com/photos/13808901/pexels-photo-13808901.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/propiedades?city=Cali",
  },
  {
    name: "Cartagena",
    description: "Disfruta de vida costera, historia y arquitectura unica",
    // Cartagena colorful houses - Pexels ID 8264573
    image: "https://images.pexels.com/photos/8264573/pexels-photo-8264573.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/propiedades?city=Cartagena",
  },
];

// Animation variants for staggered fade-in
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 40,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
};

/**
 * CitiesSection - Luxterra pixel-perfect clone
 * Light gray background, centered header, 4 city cards with hover animations
 */
export function CitiesSection() {
  return (
    <section className="bg-gray-100 overflow-hidden">
      {/* Container with Luxterra padding: 90px top, 120px bottom */}
      <div className="mx-auto max-w-[1420px] px-8 py-[90px] pb-[120px]">
        {/* Header - Centered like Luxterra */}
        <div className="flex flex-col items-center text-center mb-[60px]">
          {/* Label with purple dot */}
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[16px] tracking-[-0.02em] text-black/60">
              Ubicaciones
            </span>
          </div>

          {/* Main heading - 58px, letter-spacing -4.176px */}
          <h2 className="text-[2.5rem] md:text-[3.625rem] font-normal text-primary tracking-[-0.072em] leading-[1.05] mb-4">
            Ciudades destacadas
          </h2>

          {/* Description - 18px, centered, max-width 400px */}
          <p className="text-[18px] tracking-[-0.04em] leading-[1.35] text-black/70 max-w-[400px]">
            Explora las ciudades colombianas mas buscadas por su comodidad, mercado y calidad de vida
          </p>
        </div>

        {/* Cities Grid - Flex with 20px gap, centered */}
        <motion.div
          className="flex flex-col sm:flex-row flex-wrap justify-center gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {cities.map((city) => (
            <motion.div
              key={city.name}
              variants={cardVariants}
            >
              <Link
                href={city.href}
                className="group relative block w-full sm:w-[324px] h-[480px] rounded-sm overflow-hidden"
              >
                {/* Background Image with hover scale */}
                <Image
                  src={city.image}
                  alt={city.name}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, 324px"
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Content - Bottom positioned */}
                <div className="absolute bottom-0 left-0 right-0 p-7 flex flex-col gap-1">
                  {/* City name - 24px, letter-spacing -0.96px */}
                  <h3 className="text-[24px] font-normal text-white tracking-[-0.04em] leading-[1.22]">
                    {city.name}
                  </h3>
                  {/* Description - 16px, letter-spacing -0.32px, white/85% */}
                  <p className="text-[16px] tracking-[-0.02em] leading-[1.35] text-white/85">
                    {city.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
