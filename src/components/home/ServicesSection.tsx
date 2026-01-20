"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const services = [
  {
    title: "Arriendo",
    description: "Hacemos que encontrar tu propiedad perfecta para arrendar sea facil y rapido.",
    image: "https://images.pexels.com/photos/1732414/pexels-photo-1732414.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/propiedades",
    cta: "Ver propiedades",
  },
  {
    title: "Evaluacion",
    description: "Evaluamos inquilinos con AI para que tomes decisiones informadas en minutos.",
    image: "https://images.pexels.com/photos/6899260/pexels-photo-6899260.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/como-funciona",
    cta: "Como funciona",
  },
  {
    title: "Valoracion",
    description: "Entiende el valor de tu propiedad y las mejores ofertas del mercado.",
    image: "https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg?auto=compress&cs=tinysrgb&w=800",
    href: "/contacto",
    cta: "Solicitar valoracion",
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
 * ServicesSection - Luxterra pixel-perfect clone
 * Dark container with rounded corners inside light gray section
 */
export function ServicesSection() {
  return (
    <section className="bg-[#f5f5f5] overflow-hidden py-[40px]">
      {/* Outer container for centering */}
      <div className="mx-auto max-w-[1356px] px-8">
        {/* Dark inner container with rounded corners - Luxterra style */}
        <div className="bg-[#111112] rounded-[16px] px-[60px] py-[60px] pb-[70px]">
          {/* Header - Centered with gap-[10px] */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center gap-[10px] mb-[60px]"
          >
            {/* Label with horizontal lines - Luxterra style */}
            <div className="flex items-center gap-4 w-full max-w-[600px]">
              <div className="flex-1 h-px bg-white/10" />
              <div className="flex items-center gap-2">
                {/* Purple dot */}
                <span className="w-[6px] h-[6px] rounded-full bg-[#8b5cf6]" />
                {/* Label */}
                <span className="text-[16px] leading-[21.6px] tracking-[-0.32px] text-white/60">
                  Nuestros servicios
                </span>
              </div>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Main heading */}
            <h2 className="text-[40px] md:text-[58px] font-normal text-white tracking-[-4.176px] leading-[1.05]">
              Lo que ofrecemos
            </h2>

            {/* Description */}
            <p className="text-[18px] tracking-[-0.72px] leading-[24px] text-white/85 max-w-[400px]">
              Simplificamos las decisiones de arriendo en Colombia con servicio confiable, rapidez y transparencia
            </p>
          </motion.div>

          {/* Services Grid - 3 cards with 20px gap */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-[20px]"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {services.map((service) => (
              <motion.div
                key={service.title}
                variants={cardVariants}
                className="group relative h-[440px] rounded-[2px] overflow-hidden cursor-pointer"
              >
                {/* Background Image with hover scale */}
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />

                {/* Content */}
                <div className="absolute inset-0 p-[28px] flex flex-col justify-end gap-[2px]">
                  <h3 className="text-[34px] font-normal text-white tracking-[-1.7px] leading-[1.1] mb-[2px]">
                    {service.title}
                  </h3>

                  <p className="text-[16px] tracking-[-0.32px] leading-[21.6px] text-white/85 mb-[20px]">
                    {service.description}
                  </p>

                  <Link
                    href={service.href}
                    className="inline-flex items-center justify-center w-full h-[38px] rounded-[40px] bg-white text-[#111112] text-[15px] tracking-[-0.15px] leading-[20px] font-normal hover:bg-white/90 transition-colors group/btn overflow-hidden"
                  >
                    <span className="relative overflow-hidden h-[20px]">
                      <span className="block transition-transform duration-300 group-hover/btn:-translate-y-full">
                        {service.cta}
                      </span>
                      <span className="block absolute top-full transition-transform duration-300 group-hover/btn:-translate-y-full">
                        {service.cta}
                      </span>
                    </span>
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
