"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

/**
 * CTASection - Luxterra pixel-perfect clone
 * Full-width background image, centered content
 * Exact CSS values from Luxterra:
 * - Heading: 58px, -4.176px letter-spacing, white
 * - Description: 19px, -0.76px letter-spacing, white/85%
 * - Button: 50px height, 2px border-radius
 * - Padding: 80px top, 170px bottom
 */
export function CTASection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background Image */}
      <Image
        src="https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1600"
        alt="Interior moderno de lujo"
        fill
        className="object-cover"
        priority
      />

      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/50 to-black/40" />

      {/* Content - Luxterra exact padding */}
      <div className="relative flex flex-col items-center justify-center text-center px-8 pt-[80px] pb-[170px]">
        {/* Avatar with green online indicator - Luxterra style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative mb-[24px]"
        >
          <div className="w-[80px] h-[80px] rounded-full overflow-hidden border-2 border-white/20">
            <Image
              src="https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200"
              alt="Agente"
              width={80}
              height={80}
              className="object-cover"
            />
          </div>
          {/* Green online indicator */}
          <span className="absolute top-1 right-1 w-[14px] h-[14px] bg-[#22c55e] rounded-full border-2 border-white" />
        </motion.div>

        {/* Main Heading - 58px, -4.176px letter-spacing */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-[40px] md:text-[58px] font-normal text-white tracking-[-4.176px] leading-[1.05] mb-[16px] max-w-[800px]"
        >
          Encontremos tu hogar ideal
        </motion.h2>

        {/* Description - 19px, -0.76px letter-spacing, white/85% */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-[19px] tracking-[-0.76px] leading-[25.27px] text-white/85 mb-[32px]"
        >
          Listo para mudarte? Nuestros asesores estan aqui para ayudar
        </motion.p>

        {/* CTA Button - Luxterra style with arrow icon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Link
            href="/contacto"
            className="inline-flex items-center h-[50px] rounded-[2px] bg-white text-[#111112] text-[15px] tracking-[-0.15px] leading-[20px] hover:bg-white/90 transition-colors group/btn overflow-hidden"
          >
            {/* Arrow icon container - purple background */}
            <span className="flex items-center justify-center w-[50px] h-full bg-[#8b5cf6] rounded-l-[2px]">
              <svg
                className="w-4 h-4 text-white transition-transform duration-300 group-hover/btn:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
            {/* Button text */}
            <span className="px-[20px] relative overflow-hidden h-[20px]">
              <span className="block transition-transform duration-300 group-hover/btn:-translate-y-full">
                Contactanos
              </span>
              <span className="block absolute top-full transition-transform duration-300 group-hover/btn:-translate-y-full">
                Contactanos
              </span>
            </span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
