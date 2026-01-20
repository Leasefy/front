"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const testimonials = [
  {
    quote:
      "Arriendo Facil hizo que nuestra busqueda de apartamento fuera increiblemente simple. Su guia, respuesta rapida y conocimiento local nos ayudaron a asegurar el lugar perfecto mucho mas rapido.",
    author: "Maria Rodriguez",
    role: "Inquilina",
    image: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    quote:
      "Nos sentimos apoyados en cada paso. Consejos claros, actualizaciones rapidas y cuidado genuino hicieron que toda la experiencia de arriendo fuera suave y sin estres.",
    author: "Carlos Martinez",
    role: "Propietario",
    image: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    quote:
      "La evaluacion de riesgo AI me dio la confianza para tomar decisiones rapidas sobre inquilinos. Ahorro tiempo y tengo tranquilidad total.",
    author: "Ana Gomez",
    role: "Propietaria",
    image: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    quote:
      "Excelente servicio, encontraron el apartamento ideal para mi familia en tiempo record. El equipo fue muy profesional.",
    author: "Diego Fernandez",
    role: "Inquilino",
    image: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
];

/**
 * TestimonialsSection - Luxterra pixel-perfect clone
 * Light gray background, header/nav on left, two testimonial cards on right
 */
export function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 2) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 2 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="bg-[#f5f5f5] overflow-hidden">
      <div className="mx-auto max-w-[1356px] px-8 py-[80px] pb-[100px]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          {/* Left - Header & Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:sticky lg:top-32"
          >
            {/* Label with purple dot */}
            <div className="flex items-center gap-2 mb-4">
              <span className="w-[6px] h-[6px] rounded-full bg-[#8b5cf6]" />
              <span className="text-[16px] tracking-[-0.32px] leading-[21.6px] text-black/60">
                Testimonios
              </span>
            </div>

            {/* Main heading - 58px, -4.176px letter-spacing */}
            <h2 className="text-[40px] md:text-[58px] font-normal text-[#111112] tracking-[-4.176px] leading-[1.05] mb-10">
              Lo que dicen nuestros clientes
            </h2>

            {/* Navigation arrows - Luxterra style */}
            <div className="flex gap-3">
              <button
                onClick={prevTestimonial}
                className="w-12 h-12 rounded-full border border-black/20 flex items-center justify-center text-[#111112] hover:bg-black/5 transition-colors"
                aria-label="Anterior testimonio"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextTestimonial}
                className="w-12 h-12 rounded-full border border-black/20 flex items-center justify-center text-[#111112] hover:bg-black/5 transition-colors"
                aria-label="Siguiente testimonio"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          {/* Right - Testimonial Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
            <AnimatePresence mode="wait">
              {[0, 1].map((offset) => {
                const index = (currentIndex + offset) % testimonials.length;
                const testimonial = testimonials[index];
                return (
                  <motion.div
                    key={`${index}-${currentIndex}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4, delay: offset * 0.1 }}
                    className="bg-white rounded-sm p-8 flex flex-col"
                  >
                    {/* Quote icon */}
                    <div className="mb-6">
                      <svg
                        className="w-10 h-10 text-black/15"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
                      </svg>
                    </div>

                    {/* Quote text - 24px, -0.96px letter-spacing */}
                    <p className="text-[24px] tracking-[-0.96px] leading-[29.28px] text-[#111112] mb-8 flex-grow">
                      {testimonial.quote}
                    </p>

                    {/* Author info - Luxterra exact styles */}
                    <div className="flex items-center gap-4">
                      <div className="w-[52px] h-[52px] rounded-[2px] overflow-hidden bg-gray-100 flex-shrink-0">
                        <Image
                          src={testimonial.image}
                          alt={testimonial.author}
                          width={52}
                          height={52}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <div>
                        {/* Author name - 16px, -0.32px letter-spacing */}
                        <p className="text-[16px] font-normal text-[#111112] tracking-[-0.32px] leading-[21.6px]">
                          {testimonial.author}
                        </p>
                        {/* Author role - 16px, -0.32px letter-spacing, black/62% */}
                        <p className="text-[16px] text-black/[0.62] tracking-[-0.32px] leading-[21.6px]">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
