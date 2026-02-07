"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Shield, Clock, Sparkle, CheckCircle, TrendUp, Users, Star, Lightning } from '@phosphor-icons/react';

/**
 * CTASection - Premium final conversion section
 * Editorial design with floating metrics and elegant visual hierarchy
 */
export function CTASection() {
  return (
    <section className="relative overflow-hidden min-h-[85vh] flex items-center">
      {/* Background Image */}
      <Image
        src="/cta-house.jpg"
        alt="Casa moderna con arquitectura contemporánea"
        fill
        className="object-cover"
        priority
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black/75" />


      {/* Floating Stats Cards - Left Side */}
      <motion.div
        initial={{ opacity: 0, x: -40, y: 20 }}
        whileInView={{ opacity: 1, x: 0, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4, duration: 0.7, ease: "easeOut" }}
        className="absolute left-8 top-[15%] z-10 hidden 2xl:block"
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-5 w-[220px]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <TrendUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Este mes</p>
              <p className="text-lg font-bold text-foreground">+340 arriendos</p>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-3" />
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {["774909", "2379004", "1239291"].map((id, i) => (
                <div key={i} className="w-6 h-6 rounded-full overflow-hidden border-2 border-white ring-1 ring-black/5">
                  <Image
                    src={`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=100`}
                    alt=""
                    width={24}
                    height={24}
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Usuarios activos hoy</p>
          </div>
        </div>
      </motion.div>

      {/* Floating Card - Right Side Top */}
      <motion.div
        initial={{ opacity: 0, x: 40, y: -20 }}
        whileInView={{ opacity: 1, x: 0, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.7, ease: "easeOut" }}
        className="absolute right-8 top-[15%] z-10 hidden 2xl:block"
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-4 w-[200px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/25">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[20px] font-bold text-foreground">98%</p>
              <p className="text-[11px] text-muted-foreground">Satisfacción</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating Card - Right Side Robottom */}
      <motion.div
        initial={{ opacity: 0, x: 40, y: 20 }}
        whileInView={{ opacity: 1, x: 0, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.6, duration: 0.7, ease: "easeOut" }}
        className="absolute right-8 bottom-[20%] z-10 hidden 2xl:block"
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Lightning className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Tiempo promedio</p>
              <p className="text-lg font-bold text-foreground">48 horas</p>
              <p className="text-[11px] text-muted-foreground">De aplicación a aprobación</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating Mini Badge - Left Robottom */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="absolute left-8 bottom-[20%] z-10 hidden 2xl:block"
      >
        <div className="bg-white/90 backdrop-blur-xl rounded-full shadow-xl border border-white/50 px-4 py-2.5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[12px] font-medium text-foreground">2,847 propiedades activas</span>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="relative w-full py-20">
        <div className="max-w-3xl mx-auto text-center px-6">
          {/* Premium Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 mb-8"
          >
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2.5">
              <Sparkle className="w-4 h-4 text-amber-400" />
              <span className="text-[13px] font-medium text-white">+2,400 arriendos exitosos este año</span>
            </div>
          </motion.div>

          {/* Main Heading - Editorial Style */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6"
          >
            <h2 className="text-[42px] sm:text-[56px] lg:text-[72px] font-heading font-semibold text-white tracking-[-0.03em] leading-[1.05] text-center">
              Tu próximo arriendo
              <br />
              <span className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                empieza aquí
              </span>
            </h2>
          </motion.div>

          {/* Elegant Divider */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-20 h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent mx-auto mb-6"
          />

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-[18px] sm:text-[20px] text-white/70 mb-10 max-w-xl mx-auto leading-relaxed"
          >
            Únete a miles de inquilinos y propietarios que ya arriendan sin estrés, sin comisiones ocultas.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <Button variant="white" size="lg" asChild className="min-w-[220px] h-14 text-[15px] shadow-xl shadow-black/20">
              <Link href="/propiedades">
                Buscar propiedades
              </Link>
            </Button>
            <Button
              variant="glass"
              size="lg"
              asChild
              hideArrow
              className="min-w-[220px] h-14 text-[15px] border-white/30 hover:border-white/50 hover:bg-white/20"
            >
              <Link href="/publicar">
                Publicar gratis
              </Link>
            </Button>
          </motion.div>

          {/* Trust Indicators Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-12"
          >
            {[
              { icon: Shield, text: "Sin compromisos" },
              { icon: Clock, text: "Registro en 2 min" },
              { icon: Users, text: "Gratis para inquilinos" },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                    <Icon className="w-3 h-3 text-emerald-400" strokeWidth={2} />
                  </div>
                  <span className="text-[14px] text-white/80">{item.text}</span>
                </div>
              );
            })}
          </motion.div>

          {/* Social Proof - Refined */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="inline-flex items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-6 py-3"
          >
            <div className="flex -space-x-2">
              {[
                "774909",
                "2379004",
                "1239291",
                "220453",
              ].map((id, i) => (
                <div key={i} className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/20 ring-2 ring-black/10">
                  <Image
                    src={`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=100`}
                    alt="Usuario"
                    width={36}
                    height={36}
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <span className="text-[14px] font-medium text-white ml-1">4.9</span>
              <span className="text-[13px] text-white/50">(850+ reseñas)</span>
            </div>
          </motion.div>
        </div>
      </div>

    </section>
  );
}
