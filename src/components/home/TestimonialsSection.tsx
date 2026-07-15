"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { MonoLabel, IconButton } from "@leasefy/cadence";

// --- Original multi-audience testimonials (commented for agency-only launch) ---
// const _originalTestimonials = [
//   { quote: "En 5 días encontré apartamento...", author: "María Rodríguez", role: "Inquilina · Chapinero", result: "Aprobada en 48h" },
//   { quote: "Soy independiente, siempre me pedían codeudor...", author: "Diego Fernández", role: "Freelancer · Medellín", result: "Sin codeudor" },
// ];
// ---

const testimonials = [
  {
    quote:
      "Administramos 120 propiedades con el mismo equipo de 4 personas. Antes necesitábamos 8. El scoring AI eliminó el 90% del trabajo manual de evaluación.",
    author: "Carolina Vargas",
    role: "Directora · Inmobiliaria Vargas & Asociados",
    result: "120 propiedades",
    image: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    quote:
      "Los cobros automáticos nos cambiaron la vida. Pasamos de perseguir pagos a que todo llegue solo. La morosidad bajó del 12% al 2%.",
    author: "Andrés Restrepo",
    role: "Gerente · AR Inmobiliaria · 85 propiedades",
    result: "2% morosidad",
    image: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    quote:
      "Como inversionista con 8 propiedades, necesitaba escalar sin dolor. El scoring me da todo en minutos, no en días. Ocupación al 100%.",
    author: "Ana Gómez",
    role: "Inversionista · 8 propiedades",
    result: "100% ocupación",
    image: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    quote:
      "Las dispersiones automáticas a propietarios nos ahorraron horas de trabajo cada mes. Los propietarios están felices porque reciben puntual.",
    author: "Felipe Morales",
    role: "COO · Grupo Inmobiliario Morales · 350 propiedades",
    result: "350 propiedades",
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
    <section className="bg-muted overflow-hidden">
      <div className="container-platform py-[80px] pb-[100px]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          {/* Left - Header & Compass */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:sticky lg:top-32"
          >
            {/* Label with purple dot */}
            <div className="flex items-center gap-2 mb-4">
              <span className="w-[6px] h-[6px] rounded-full bg-primary" />
              <span className="text-[16px] tracking-[-0.32px] leading-[21.6px] text-muted-foreground">
                Resultados reales
              </span>
            </div>

            {/* Main heading - 58px, -4.176px letter-spacing */}
            <h2 className="text-[40px] md:text-[58px] font-heading font-normal text-foreground tracking-[-0.072em] leading-[1.05] mb-10">
              Historias de éxito
            </h2>

            {/* Compass arrows - Luxterra style */}
            <div className="flex gap-3">
              <IconButton
                variant="outline"
                onClick={prevTestimonial}
                className="w-12 h-12 rounded-full"
                aria-label="Anterior testimonio"
                icon={<CaretLeft className="w-5 h-5" />}
              />
              <IconButton
                variant="outline"
                onClick={nextTestimonial}
                className="w-12 h-12 rounded-full"
                aria-label="Siguiente testimonio"
                icon={<CaretRight className="w-5 h-5" />}
              />
            </div>
          </motion.div>

          {/* Right - Testimonial Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            <AnimatePresence mode="popLayout">
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
                    className="bg-white rounded-xl p-8 flex flex-col h-[300px]"
                  >
                    {/* Quote icon */}
                    <div className="mb-4">
                      <svg
                        className="w-8 h-8 text-muted-foreground/50"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
                      </svg>
                    </div>

                    {/* Quote text */}
                    <p className="text-[20px] tracking-[-0.5px] leading-[1.35] text-foreground flex-1">
                      {testimonial.quote}
                    </p>

                    {/* Author info */}
                    <div className="flex items-center gap-3 mt-auto pt-4 border-t border-border/50">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                        <Image
                          src={testimonial.image}
                          alt={testimonial.author}
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-foreground leading-tight">
                          {testimonial.author}
                        </p>
                        <p className="text-[12px] text-muted-foreground leading-tight">
                          {testimonial.role}
                        </p>
                      </div>
                      {testimonial.result && (
                        <div className="flex-shrink-0 bg-primary/5 border border-primary/10 px-2.5 py-1 rounded-sm">
                          <MonoLabel className="text-[9px] font-normal text-primary tracking-wide whitespace-nowrap">
                            {testimonial.result}
                          </MonoLabel>
                        </div>
                      )}
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
