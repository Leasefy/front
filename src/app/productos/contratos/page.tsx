'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  Clock,
  FileText,
  PenTool,
  Scale,
  Lock,
  Download,
  Send,
  History,
  Eye,
  Smartphone,
  Cloud,
  Zap,
  BadgeCheck,
  FileCheck,
  Users,
} from 'lucide-react';

// Hero stats
const heroStats = [
  { value: '100%', label: 'Legal', sublabel: 'Ley 820/2003' },
  { value: '< 5 min', label: 'Para firmar', sublabel: 'desde cualquier lugar' },
  { value: '10 años', label: 'Almacenamiento', sublabel: 'seguro en la nube' },
];

// Features
const features = [
  {
    icon: Scale,
    title: 'Plantillas legales verificadas',
    description: 'Contratos redactados por abogados especializados en arrendamiento. 100% conformes a la Ley 820/2003 y actualizados con la legislación vigente.',
    gradient: 'from-indigo-500 to-violet-500',
  },
  {
    icon: PenTool,
    title: 'Firma electrónica avanzada',
    description: 'Firma desde cualquier dispositivo. Válida legalmente con certificado de autenticidad, timestamps y verificación de identidad.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Cloud,
    title: 'Almacenamiento seguro',
    description: 'Tus contratos guardados por 10 años en la nube. Acceso inmediato, descargas ilimitadas, nunca pierdas un documento.',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: History,
    title: 'Historial y versiones',
    description: 'Registro de todas las modificaciones, firmas y accesos. Trazabilidad completa para cualquier disputa legal.',
    gradient: 'from-amber-500 to-orange-500',
  },
];

// Contract types
const contractTypes = [
  {
    name: 'Contrato de arrendamiento vivienda',
    description: 'Para apartamentos y casas residenciales',
    icon: '🏠',
    popular: true,
  },
  {
    name: 'Contrato de arrendamiento comercial',
    description: 'Para locales y oficinas',
    icon: '🏢',
  },
  {
    name: 'Contrato de arrendamiento habitación',
    description: 'Para habitaciones en vivienda compartida',
    icon: '🛏️',
  },
  {
    name: 'Contrato de subarrendamiento',
    description: 'Cuando el inquilino arrienda a terceros',
    icon: '📝',
  },
  {
    name: 'Adenda de modificación',
    description: 'Para modificar términos existentes',
    icon: '📄',
  },
  {
    name: 'Acta de entrega',
    description: 'Documento de entrega/recepción del inmueble',
    icon: '🔑',
  },
];

// Process steps
const steps = [
  {
    number: '01',
    title: 'Selecciona plantilla',
    description: 'Elige el tipo de contrato que necesitas. Todas nuestras plantillas están verificadas legalmente.',
  },
  {
    number: '02',
    title: 'Personaliza datos',
    description: 'Completa la información del inmueble, propietario e inquilino. El sistema valida automáticamente.',
  },
  {
    number: '03',
    title: 'Envía a firmar',
    description: 'El inquilino recibe el contrato por email y WhatsApp. Puede firmar desde su celular.',
  },
  {
    number: '04',
    title: 'Descarga y almacena',
    description: 'Contrato firmado con validez legal. Guardado en la nube y disponible para descargar.',
  },
];

// Visual component
function ContractVisual() {
  return (
    <motion.div
      className="bg-white dark:bg-card rounded-3xl shadow-2xl border border-border overflow-hidden max-w-sm mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-xs">Contrato de Arrendamiento</p>
            <p className="text-white font-semibold">#2026-0847</p>
          </div>
          <span className="px-3 py-1 bg-white/20 rounded-full text-white text-xs font-medium">
            Firmado
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Property */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Inmueble</p>
          <p className="text-sm font-medium text-foreground">Apto 301, Ed. Torre Norte</p>
          <p className="text-xs text-muted-foreground">Cra 7 #72-34, Chapinero, Bogotá</p>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Propietario</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <span className="text-xs font-medium text-indigo-600">JR</span>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Juan Rodríguez</p>
                <div className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="text-[10px]">Firmado</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Inquilino</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <span className="text-xs font-medium text-violet-600">ML</span>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">María López</p>
                <div className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="text-[10px]">Firmado</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="pt-4 border-t border-border space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Canon mensual</span>
            <span className="font-medium text-foreground">$2.500.000</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Vigencia</span>
            <span className="font-medium text-foreground">12 meses</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Inicio</span>
            <span className="font-medium text-foreground">1 Feb 2026</span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 gap-1">
            <Download className="w-3.5 h-3.5" />
            PDF
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1">
            <Eye className="w-3.5 h-3.5" />
            Ver
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1">
            <Send className="w-3.5 h-3.5" />
            Enviar
          </Button>
        </div>
      </div>

      {/* Legal badge */}
      <div className="bg-muted/50 px-6 py-3 flex items-center justify-center gap-2 border-t border-border">
        <Scale className="w-4 h-4 text-emerald-600" />
        <span className="text-xs text-muted-foreground">Conforme a Ley 820/2003</span>
      </div>
    </motion.div>
  );
}

export default function ContratosPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <>
      <Navbar />
      <main className="pt-16 overflow-hidden">
        {/* Hero Section */}
        <section ref={heroRef} className="relative min-h-[90vh] flex items-center overflow-hidden">
          {/* Background with real image */}
          <motion.div className="absolute inset-0 z-0" style={{ y: heroY }}>
            <Image
              src="/hero-3.jpg"
              alt="Modern home interior"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            {/* Dark overlays for legibility - like home page */}
            <div className="absolute inset-0 bg-black/45" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/40" />
          </motion.div>

          <motion.div
            className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-20"
            style={{ opacity: heroOpacity }}
          >
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Left Content */}
              <div className="space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-white/90 bg-white/10 backdrop-blur-2xl rounded-full px-4 py-2 border border-white/15">
                    <FileText className="w-3.5 h-3.5" />
                    Contratos digitales
                  </span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight"
                >
                  Contratos legales,
                  <span className="block mt-2 text-white/90">
                    firma digital
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-lg md:text-xl text-white/70 max-w-lg leading-relaxed"
                >
                  Plantillas verificadas por abogados, firma electrónica válida y almacenamiento seguro.
                  <span className="text-white font-medium"> De borrador a firmado en minutos.</span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <Link href="/auth">
                    <Button size="lg" className="w-full sm:w-auto bg-white text-foreground hover:bg-white/90 font-semibold text-base h-14 px-8 rounded-sm shadow-lg">
                      Crear contrato
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link href="#plantillas">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto bg-transparent border-white/20 text-white hover:bg-white/10 font-medium text-base h-14 px-8 rounded-sm backdrop-blur-2xl"
                    >
                      Ver plantillas
                    </Button>
                  </Link>
                </motion.div>

                {/* Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="flex items-center gap-8 pt-8 border-t border-white/10"
                >
                  {heroStats.map((stat) => (
                    <div key={stat.label} className="text-center sm:text-left">
                      <p className="text-3xl md:text-4xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-white/60 mt-1">{stat.label}</p>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Right - Contract Visual */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="hidden lg:block"
              >
                <ContractVisual />
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Contract Types */}
        <section id="plantillas" className="py-24 bg-gradient-to-b from-background to-muted/30">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 rounded-full px-3 py-1 mb-4">
                Plantillas verificadas
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Elige tu tipo de contrato
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Todas nuestras plantillas están redactadas por abogados especializados
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contractTypes.map((type, i) => (
                <motion.div
                  key={type.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative bg-card rounded-2xl border p-6 hover:shadow-lg transition-all cursor-pointer ${
                    type.popular ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-border'
                  }`}
                >
                  {type.popular && (
                    <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-medium px-3 py-0.5 rounded-full">
                      Más usado
                    </span>
                  )}
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{type.icon}</span>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{type.name}</h3>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Process */}
        <section className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                De borrador a firmado en minutos
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Proceso simple y 100% digital
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, i) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="relative"
                >
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-indigo-300 via-violet-200 to-transparent dark:from-indigo-800 dark:via-violet-900" />
                  )}

                  <div className="relative bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow">
                    <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                      {i + 1}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2 mt-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Todo lo que necesitas
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Contratos profesionales con todas las garantías legales
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group relative bg-card rounded-2xl border border-border p-8 hover:shadow-xl transition-all duration-300"
                  >
                    <div className={`absolute top-0 left-8 right-8 h-1 bg-gradient-to-r ${feature.gradient} rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity`} />

                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Legal Compliance */}
        <section className="py-24 bg-indigo-900 dark:bg-indigo-950">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                  Respaldados por la ley colombiana
                </h2>
                <p className="text-indigo-200/80 mb-8">
                  Todos nuestros contratos cumplen con la Ley 820 de 2003 y demás normativas de arrendamiento vigentes en Colombia.
                </p>
                <ul className="space-y-4">
                  {[
                    'Cláusulas conformes a Ley 820/2003',
                    'Firma electrónica con validez legal',
                    'Certificado de autenticidad',
                    'Timestamps para trazabilidad',
                    'Verificación de identidad de firmantes',
                    'Almacenamiento seguro por 10 años',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-white">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-white/5 rounded-3xl p-8 backdrop-blur-sm border border-white/10"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center">
                    <Scale className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Ley 820 de 2003</h3>
                    <p className="text-indigo-200">Régimen de arrendamiento</p>
                  </div>
                </div>
                <p className="text-indigo-100/80 text-sm leading-relaxed">
                  &ldquo;Por la cual se expide el régimen de arrendamiento de vivienda urbana y se dictan otras disposiciones.&rdquo;
                </p>
                <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-4">
                  <BadgeCheck className="w-6 h-6 text-emerald-400" />
                  <span className="text-sm text-indigo-200">Contratos verificados por abogados especializados</span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                Contratos profesionales,
                <span className="block">sin abogado</span>
              </h2>
              <p className="text-xl text-white/80 max-w-2xl mx-auto">
                Crea tu primer contrato gratis y descubre lo fácil que es arrendar con documentos legales.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth">
                  <Button size="lg" className="w-full sm:w-auto bg-white text-indigo-700 hover:bg-indigo-50 font-semibold text-lg h-14 px-10 rounded-sm shadow-lg">
                    Crear mi primer contrato
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-white/60">
                Primer contrato gratis · Plantillas ilimitadas desde $29.900/mes · Sin permanencia
              </p>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
