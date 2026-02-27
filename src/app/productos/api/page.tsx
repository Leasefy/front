'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Terminal, ArrowLeft, Bell, Sparkle } from '@phosphor-icons/react';

export default function APIPage() {
  return (
    <>
      <Navbar />
      <main className="overflow-hidden bg-white min-h-screen">
        {/* Coming Soon Section */}
        <section className="relative min-h-[calc(100vh-72px)] flex items-center justify-center py-24">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[length:24px_24px]" />

          <div className="container-platform relative z-10">
            <div className="max-w-2xl mx-auto text-center">
              {/* Icon */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
              >
                <div className="w-20 h-20 rounded-2xl bg-foreground mx-auto flex items-center justify-center">
                  <Terminal className="w-10 h-10 text-white" />
                </div>
              </motion.div>

              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6"
              >
                <span className="inline-flex items-center gap-2 text-xs font-mono uppercase font-normal text-foreground/70 bg-sand-100 rounded-full px-4 py-2">
                  <Sparkle className="w-3.5 h-3.5" />
                  Próximamente
                </span>
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-4xl md:text-5xl lg:text-6xl font-heading font-medium text-foreground tracking-[-0.03em] leading-[1.1] mb-6"
              >
                API para
                <span className="block text-foreground/50">desarrolladores</span>
              </motion.h1>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-lg text-muted-foreground max-w-lg mx-auto mb-10"
              >
                Estamos construyendo una API REST completa para que puedas integrar todas las funcionalidades de Arriendo en tu plataforma.
              </motion.p>

              {/* Features Preview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10"
              >
                {['Evaluaciones', 'Contratos', 'Pagos', 'Webhooks'].map((feature, i) => (
                  <div
                    key={feature}
                    className="bg-sand-50 rounded-xl p-4 text-center"
                  >
                    <p className="text-[13px] font-medium text-foreground">{feature}</p>
                  </div>
                ))}
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-12 px-6 rounded-xl bg-foreground text-white hover:bg-foreground/90"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Notificarme del lanzamiento
                </Button>
                <Link href="/">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-12 px-6 rounded-xl"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al inicio
                  </Button>
                </Link>
              </motion.div>

              {/* Timeline hint */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-10 text-[13px] text-muted-foreground"
              >
                Lanzamiento estimado: Q2 2026
              </motion.p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
