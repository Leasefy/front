"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const agents = [
  {
    name: "Sofía Martínez",
    role: "Consultora de Propiedades",
    locations: "Bogotá, Medellín",
    image: "https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg?auto=compress&cs=tinysrgb&w=600",
    linkedin: "#",
    twitter: "#",
    href: "/agentes/sofia-martinez",
  },
  {
    name: "Nicolás Ramírez",
    role: "Asesor Inmobiliario",
    locations: "Medellín, Cali",
    image: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=600",
    linkedin: "#",
    twitter: "#",
    href: "/agentes/carlos-ramirez",
  },
  {
    name: "Valentina López",
    role: "Especialista en Inversiones",
    locations: "Cartagena, Bogotá",
    image: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=600",
    linkedin: "#",
    twitter: "#",
    href: "/agentes/valentina-lopez",
  },
];

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
  hidden: { opacity: 0, y: 40 },
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
 * TopAgentsSection - Luxterra pixel-perfect clone
 * Exact CSS values extracted from Luxterra
 */
export function TopAgentsSection() {
  return (
    <section className="bg-white overflow-hidden">
      {/* Container - matches Luxterra */}
      <div className="container-platform py-[90px] pb-[100px]">
        {/* Header - Centered */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center gap-[10px] mb-[42px]"
        >
          {/* Label with horizontal lines - Luxterra style */}
          <div className="flex items-center gap-4 w-full max-w-[600px]">
            <div className="flex-1 h-px bg-black/10" />
            <div className="flex items-center gap-2">
              <span className="w-[6px] h-[6px] rounded-full bg-primary" />
              <span className="text-[16px] leading-[21.6px] tracking-[-0.32px] text-muted-foreground">
                Agentes
              </span>
            </div>
            <div className="flex-1 h-px bg-black/10" />
          </div>

          {/* Main heading - 58px, letter-spacing -4.176px */}
          <h2 className="text-[40px] md:text-[58px] font-heading font-normal text-foreground tracking-[-4.176px] leading-[1.05]">
            Nuestros mejores agentes
          </h2>
        </motion.div>

        {/* Agents Grid - flex with gap */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-[20px]"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {agents.map((agent) => (
            <motion.div
              key={agent.name}
              variants={cardVariants}
              className="group"
            >
              {/* Agent Photo - aspect ratio close to Luxterra */}
              <div className="relative aspect-[1/1.04] mb-[20px] overflow-hidden rounded-sm bg-muted">
                <Image
                  src={agent.image}
                  alt={agent.name}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>

              {/* Agent Info */}
              <div className="flex flex-col">
                {/* Name and Social Links */}
                <div className="flex items-center justify-between mb-[2px]">
                  {/* Name - 19px, -0.76px letter-spacing */}
                  <h3 className="text-[19px] font-heading font-normal text-foreground tracking-[-0.76px] leading-[25.27px]">
                    {agent.name}
                  </h3>
                  <div className="flex gap-[12px]">
                    <a
                      href={agent.linkedin}
                      className="text-muted-foreground hover:text-foreground/70 transition-colors"
                      aria-label="LinkedIn"
                    >
                      <svg className="w-[16px] h-[16px]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                    <a
                      href={agent.twitter}
                      className="text-muted-foreground hover:text-foreground/70 transition-colors"
                      aria-label="X (Twitter)"
                    >
                      <svg className="w-[16px] h-[16px]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </a>
                  </div>
                </div>

                {/* Role - 15px, -0.15px letter-spacing, black/70% */}
                <p className="text-[15px] tracking-[-0.15px] leading-[20px] text-foreground/70 mb-[2px]">
                  {agent.role}
                </p>

                {/* Locations - 15px, lighter color */}
                <p className="text-[15px] tracking-[-0.15px] leading-[20px] text-muted-foreground mb-[16px]">
                  {agent.locations}
                </p>

                {/* More Info Button - Luxterra style with border */}
                <Link
                  href={agent.href}
                  className="inline-flex items-center justify-center h-[35px] px-[22px] rounded-sm border border-border text-[15px] text-foreground tracking-[-0.15px] leading-[20px] hover:bg-black/5 transition-colors w-fit group/btn overflow-hidden"
                >
                  <span className="relative overflow-hidden h-[20px]">
                    <span className="block transition-transform duration-300 group-hover/btn:-translate-y-full">
                      Más info
                    </span>
                    <span className="block absolute top-full transition-transform duration-300 group-hover/btn:-translate-y-full">
                      Más info
                    </span>
                  </span>
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
