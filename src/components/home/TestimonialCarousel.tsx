'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  image: string;
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[];
  title: ReactNode;
  cardClassName?: string;
}

export function TestimonialCarousel({
  testimonials,
  title,
  cardClassName = "bg-white",
}: TestimonialCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 2) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 2 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="bg-white overflow-hidden">
      <div className="container-platform py-[80px] pb-[100px]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:sticky lg:top-32"
          >
            {title}

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

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
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
                    className={`${cardClassName} rounded-xl p-8 flex flex-col`}
                  >
                    <div className="mb-6">
                      <svg className="w-10 h-10 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
                      </svg>
                    </div>

                    <p className="text-[24px] tracking-[-0.96px] leading-[29.28px] text-foreground mb-8 flex-grow">
                      {testimonial.quote}
                    </p>

                    <div className="flex items-center gap-4">
                      <div className="w-[52px] h-[52px] rounded-xl overflow-hidden bg-muted flex-shrink-0">
                        <Image
                          src={testimonial.image}
                          alt={testimonial.author}
                          width={52}
                          height={52}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <div>
                        <p className="text-[16px] font-normal text-foreground tracking-[-0.32px] leading-[21.6px]">
                          {testimonial.author}
                        </p>
                        <p className="text-[16px] text-muted-foreground tracking-[-0.32px] leading-[21.6px]">
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
