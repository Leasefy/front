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
  Code,
  Webhook,
  Lock,
  Zap,
  Database,
  Globe,
  Key,
  Terminal,
  BookOpen,
  Blocks,
  Clock,
  Server,
  Shield,
  GitBranch,
} from 'lucide-react';

// Hero stats
const heroStats = [
  { value: '99.9%', label: 'Uptime', sublabel: 'SLA garantizado' },
  { value: '< 100ms', label: 'Latencia', sublabel: 'promedio' },
  { value: '50+', label: 'Endpoints', sublabel: 'disponibles' },
];

// Endpoints preview
const endpoints = [
  { method: 'GET', path: '/v1/candidates', description: 'Listar candidatos' },
  { method: 'POST', path: '/v1/evaluations', description: 'Crear evaluación' },
  { method: 'GET', path: '/v1/properties', description: 'Listar propiedades' },
  { method: 'POST', path: '/v1/contracts', description: 'Generar contrato' },
  { method: 'GET', path: '/v1/payments', description: 'Historial de pagos' },
  { method: 'POST', path: '/v1/webhooks', description: 'Configurar webhook' },
];

// Features
const features = [
  {
    icon: Code,
    title: 'API REST completa',
    description: 'Endpoints para todo: propiedades, candidatos, evaluaciones, contratos y pagos. JSON estándar, documentación OpenAPI 3.0.',
    gradient: 'from-slate-600 to-slate-800',
  },
  {
    icon: Webhook,
    title: 'Webhooks en tiempo real',
    description: 'Recibe notificaciones instantáneas cuando algo cambia: nuevo candidato, pago recibido, contrato firmado. Configura múltiples URLs.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Lock,
    title: 'OAuth 2.0 + API Keys',
    description: 'Autenticación segura con tokens de acceso. Gestiona múltiples API keys, revoca accesos, controla permisos granulares.',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    icon: Globe,
    title: 'SDKs oficiales',
    description: 'Librerías para JavaScript, Python, PHP y Ruby. Instala con npm/pip/composer y empieza en minutos.',
    gradient: 'from-emerald-500 to-teal-500',
  },
];

// Use cases
const useCases = [
  {
    icon: Database,
    title: 'Sincroniza tu CRM',
    description: 'Importa propiedades y candidatos desde tu sistema actual. Mantén todo sincronizado automáticamente.',
  },
  {
    icon: Blocks,
    title: 'Automatiza workflows',
    description: 'Conecta con Zapier, Make o n8n. Crea flujos automáticos sin programar.',
  },
  {
    icon: Server,
    title: 'White-label',
    description: 'Embebe evaluaciones y contratos en tu propia plataforma. Tu marca, nuestra tecnología.',
  },
  {
    icon: GitBranch,
    title: 'Integraciones custom',
    description: 'Conecta con ERPs, sistemas contables y plataformas de marketing.',
  },
];

// Pricing tiers
const apiPlans = [
  {
    name: 'Developer',
    price: 'Gratis',
    requests: '1,000',
    features: ['Endpoints básicos', 'Documentación completa', 'Sandbox ilimitado', 'Soporte comunidad'],
  },
  {
    name: 'Business',
    price: '299.000',
    requests: '50,000',
    popular: true,
    features: ['Todos los endpoints', 'Webhooks', '99.9% SLA', 'Soporte email prioritario'],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    requests: 'Ilimitadas',
    features: ['Todo en Business', 'IP whitelisting', 'Dedicated support', 'Custom integrations'],
  },
];

// Code example visual
function CodeVisual() {
  const codeLines = [
    { text: 'const arriendoFacil = require(', highlight: false },
    { text: "'arriendofacil-sdk'", highlight: true },
    { text: ');', highlight: false },
    { text: '', highlight: false },
    { text: 'const client = new arriendoFacil({', highlight: false },
    { text: "  apiKey: 'sk_live_...'", highlight: true },
    { text: '});', highlight: false },
    { text: '', highlight: false },
    { text: '// Crear evaluación', highlight: false, comment: true },
    { text: 'const evaluation = await client.evaluations.create({', highlight: false },
    { text: "  email: 'candidato@email.com',", highlight: false },
    { text: "  type: 'complete'", highlight: false },
    { text: '});', highlight: false },
    { text: '', highlight: false },
    { text: 'console.log(evaluation.score);', highlight: false },
    { text: '// => 85', highlight: true, comment: true },
  ];

  return (
    <motion.div
      className="bg-slate-900 rounded-2xl shadow-2xl overflow-hidden font-mono text-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* Window header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border-b border-slate-700">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-amber-500" />
        <div className="w-3 h-3 rounded-full bg-emerald-500" />
        <span className="ml-3 text-slate-400 text-xs">app.js</span>
      </div>

      {/* Code content */}
      <div className="p-4 space-y-0.5">
        {codeLines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.03 }}
            className="flex"
          >
            <span className="w-6 text-slate-600 text-right mr-4 select-none">{i + 1}</span>
            <span className={line.comment ? 'text-slate-500' : line.highlight ? 'text-emerald-400' : 'text-slate-300'}>
              {line.text}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default function APIPage() {
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
          {/* Background */}
          <motion.div className="absolute inset-0 z-0" style={{ y: heroY }}>
            <Image
              src="/hero-3.jpg"
              alt="Modern apartment interior"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black/50" />
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
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-white/80 bg-white/10 backdrop-blur-2xl rounded-full px-4 py-2 border border-white/15 font-mono">
                    <Terminal className="w-3.5 h-3.5" />
                    API para desarrolladores
                  </span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight"
                >
                  Construye sobre
                  <span className="block mt-2 text-white/90">
                    nuestra infraestructura
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-lg md:text-xl text-white/70 max-w-lg leading-relaxed"
                >
                  API REST, webhooks en tiempo real y SDKs para JavaScript, Python, PHP y Ruby.
                  <span className="text-white font-medium"> Integra evaluaciones, contratos y pagos en tu plataforma.</span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <Link href="https://docs.arriendofacil.co">
                    <Button size="lg" className="w-full sm:w-auto bg-white text-foreground hover:bg-white/90 font-semibold text-base h-14 px-8 rounded-sm">
                      <BookOpen className="w-5 h-5 mr-2" />
                      Ver documentación
                    </Button>
                  </Link>
                  <Link href="/auth">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto bg-transparent border-white/20 text-white hover:bg-white/10 font-medium text-base h-14 px-8 rounded-sm backdrop-blur-2xl"
                    >
                      <Key className="w-5 h-5 mr-2" />
                      Obtener API key
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
                      <p className="text-3xl md:text-4xl font-bold text-white font-mono">{stat.value}</p>
                      <p className="text-xs text-white/60 mt-1">{stat.label}</p>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Right - Code Visual */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="hidden lg:block"
              >
                <CodeVisual />
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Endpoints Preview */}
        <section className="py-16 bg-slate-900 border-y border-slate-800">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="flex flex-wrap items-center justify-center gap-4">
              {endpoints.map((endpoint, i) => (
                <motion.div
                  key={endpoint.path}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2 bg-slate-800 rounded-lg px-4 py-2 border border-slate-700 font-mono text-sm"
                >
                  <span className={`text-xs font-bold ${endpoint.method === 'GET' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {endpoint.method}
                  </span>
                  <span className="text-slate-300">{endpoint.path}</span>
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
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50 rounded-full px-3 py-1 mb-4 font-mono">
                {'<Features />'}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Todo lo que necesitas para integrar
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Una API diseñada para desarrolladores, con la mejor experiencia de desarrollo
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

        {/* Use Cases */}
        <section className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Casos de uso
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Cómo nuestros clientes usan la API
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {useCases.map((useCase, i) => {
                const Icon = useCase.icon;
                return (
                  <motion.div
                    key={useCase.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{useCase.title}</h3>
                    <p className="text-sm text-muted-foreground">{useCase.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-24 bg-background">
          <div className="max-w-5xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Planes de API
              </h2>
              <p className="text-muted-foreground">
                Empieza gratis, escala cuando lo necesites
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {apiPlans.map((plan, i) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative bg-card border rounded-2xl p-8 ${
                    plan.popular ? 'border-slate-500 ring-2 ring-slate-500/20' : 'border-border'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-medium px-4 py-1 rounded-full">
                      Más popular
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  <div className="mt-4 mb-2">
                    <span className="text-3xl font-bold text-foreground font-mono">
                      {plan.price === 'Gratis' || plan.price === 'Custom' ? plan.price : `$${plan.price}`}
                    </span>
                    {plan.price !== 'Gratis' && plan.price !== 'Custom' && (
                      <span className="text-muted-foreground text-sm">/mes</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">
                    {plan.requests} requests/mes
                  </p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${plan.popular ? 'bg-slate-800 hover:bg-slate-700 text-white' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    {plan.price === 'Custom' ? 'Contactar ventas' : 'Comenzar'}
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--slate-700))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--slate-700))_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-50" />

          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                Empieza a construir
                <span className="block">hoy mismo</span>
              </h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto font-mono">
                {`npm install arriendofacil-sdk`}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="https://docs.arriendofacil.co">
                  <Button size="lg" className="w-full sm:w-auto bg-white text-slate-900 hover:bg-slate-100 font-semibold text-lg h-14 px-10 rounded-sm">
                    <BookOpen className="w-5 h-5 mr-2" />
                    Leer documentación
                  </Button>
                </Link>
                <Link href="/auth">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto border-slate-600 text-white hover:bg-slate-800 font-medium text-lg h-14 px-10 rounded-sm"
                  >
                    Obtener API key gratis
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
