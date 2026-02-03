'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  Clock,
  CreditCard,
  Wallet,
  Calendar,
  Bell,
  TrendingUp,
  Repeat,
  Banknote,
  Building2,
  Smartphone,
  QrCode,
  Receipt,
  Zap,
  Lock,
  BadgeCheck,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Check,
  Sparkles,
  CircleDollarSign,
  Send,
  RefreshCcw,
  BarChart3,
  PieChart,
  Landmark,
  Timer,
  BellRing,
  FileText,
  Download,
} from 'lucide-react';

// Animated counter with input validation
function useCounter(end: number, duration: number = 2000, decimals: number = 0) {
  const [count, setCount] = useState(0);
  const [isInView, setIsInView] = useState(false);

  // Validate inputs
  const safeEnd = Number.isFinite(end) && end >= 0 ? end : 0;
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 2000;
  const safeDecimals = Number.isFinite(decimals) && decimals >= 0 ? decimals : 0;

  useEffect(() => {
    if (!isInView) return;
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / safeDuration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Number((safeEnd * easeOut).toFixed(safeDecimals)));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, safeEnd, safeDuration, safeDecimals]);

  return { count, setIsInView };
}

// Format currency with validation
function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Live transaction feed
function TransactionFeed() {
  const [transactions, setTransactions] = useState([
    { id: 1, name: 'María López', amount: 2500000, time: 'Hace 2 min', status: 'completed' },
    { id: 2, name: 'Carlos Gómez', amount: 1800000, time: 'Hace 5 min', status: 'completed' },
    { id: 3, name: 'Ana Rodríguez', amount: 3200000, time: 'Hace 8 min', status: 'completed' },
  ]);

  return (
    <div className="space-y-3">
      {transactions.map((tx, i) => (
        <motion.div
          key={tx.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 + i * 0.15 }}
          className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-3 border border-white/5"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{tx.name}</p>
            <p className="text-xs text-white/40">{tx.time}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-emerald-400">+{formatCurrency(tx.amount)}</p>
            <p className="text-[10px] text-white/40 uppercase">Recibido</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Hero Dashboard
function PaymentDashboard() {
  const totalAmount = useCounter(34200000, 2000);
  const [activeTab, setActiveTab] = useState<'recibido' | 'pendiente'>('recibido');

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1, delay: 0.3 }}
      className="relative"
      style={{ perspective: '1000px' }}
    >
      {/* Glow */}
      <div className="absolute -inset-4 bg-gradient-to-r from-emerald-600/20 via-teal-600/20 to-cyan-600/20 rounded-3xl blur-2xl" />

      {/* Main dashboard */}
      <div className="relative bg-product-elevated/90 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-white/50">DASHBOARD DE PAGOS</span>
          </div>
          <span className="text-xs text-white/30">Actualizado ahora</span>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Balance card */}
          <div className="relative bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 rounded-xl p-5 mb-5 overflow-hidden">
            {/* Pattern overlay */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }} />
            </div>

            <div className="relative">
              <p className="text-emerald-100/80 text-sm mb-1">Balance disponible</p>
              <motion.p
                className="text-4xl font-bold text-white mb-4 tabular-nums"
                onViewportEnter={() => totalAmount.setIsInView(true)}
              >
                {formatCurrency(totalAmount.count)}
              </motion.p>

              <div className="flex items-center gap-4">
                <button className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium text-white transition-colors">
                  <Send className="w-4 h-4" />
                  Retirar
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium text-white/80 transition-colors">
                  <BarChart3 className="w-4 h-4" />
                  Ver reporte
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            {(['recibido', 'pendiente'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                {tab === 'recibido' ? 'Recibido' : 'Pendiente'}
              </button>
            ))}
          </div>

          {/* Transaction feed */}
          <TransactionFeed />
        </div>
      </div>

      {/* Floating card - next payment */}
      <motion.div
        initial={{ opacity: 0, x: 40, y: -20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.5 }}
        className="absolute -right-4 top-16 bg-product-elevated rounded-xl border border-white/10 p-4 shadow-xl max-w-[200px]"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-xs font-medium text-white">Próximo cobro</span>
        </div>
        <p className="text-lg font-bold text-white">$2.500.000</p>
        <p className="text-xs text-white/40">5 Feb · María López</p>
      </motion.div>

      {/* Floating stat */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.8 }}
        className="absolute -left-4 bottom-20 bg-emerald-500 rounded-xl p-3 shadow-xl"
      >
        <div className="flex items-center gap-2 text-white">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm font-bold">95% a tiempo</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Payment method card
function PaymentMethodCard({
  icon: Icon,
  name,
  description,
  popular = false,
  delay = 0,
}: {
  icon: React.ElementType;
  name: string;
  description: string;
  popular?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative bg-product-elevated/80 backdrop-blur-sm rounded-xl border border-white/[0.08] p-5 group hover:border-white/20 transition-colors"
    >
      {popular && (
        <span className="absolute -top-2.5 left-4 px-2 py-0.5 text-[10px] font-medium bg-emerald-500 text-white rounded-full">
          Popular
        </span>
      )}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center group-hover:bg-white/[0.08] transition-colors">
          <Icon className="w-6 h-6 text-white/60" />
        </div>
        <div>
          <p className="text-base font-medium text-white">{name}</p>
          <p className="text-sm text-white/40">{description}</p>
        </div>
      </div>
    </motion.div>
  );
}

// Feature bento item
function FeatureBento({
  icon: Icon,
  title,
  description,
  children,
  className = '',
  gradient,
  delay = 0,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children?: React.ReactNode;
  className?: string;
  gradient: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ delay }}
      className={`relative bg-product-elevated/80 backdrop-blur-sm rounded-2xl border border-white/[0.08] overflow-hidden group hover:border-white/15 transition-colors ${className}`}
    >
      {/* Gradient line at top */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${gradient} opacity-50`} />

      <div className="relative h-full p-6 flex flex-col">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-white/40 mt-1">{description}</p>
          </div>
        </div>

        {children && <div className="mt-auto">{children}</div>}
      </div>
    </motion.div>
  );
}

export default function PagosPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  return (
    <>
      <Navbar />
      <main className="overflow-hidden">
        {/* Hero Section */}
        <section ref={heroRef} className="relative min-h-screen flex items-center pt-20">
          {/* Background with real image */}
          <motion.div className="absolute inset-0 z-0" style={{ y: heroY }}>
            <Image
              src="/hero-4.jpg"
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
            className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-12"
            style={{ opacity: heroOpacity, scale: heroScale }}
          >
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
              {/* Left */}
              <div className="space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2"
                >
                  <span className="relative flex items-center gap-2 text-xs font-medium text-white/90 bg-white/10 backdrop-blur-2xl rounded-full pl-2 pr-4 py-1.5 border border-white/15">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                    Cobro automático de arriendos
                  </span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.05] tracking-tight"
                >
                  Recibe tu arriendo
                  <br />
                  <span className="text-white/90">
                    sin perseguir
                  </span>
                  <br />
                  a nadie
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg md:text-xl text-white/70 max-w-lg leading-relaxed"
                >
                  Cobro automático, recordatorios inteligentes y múltiples métodos de pago.{' '}
                  <span className="text-white font-medium">
                    Tu dinero en tu cuenta en 24 horas, sin comisiones.
                  </span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <Link href="/auth">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-white text-foreground hover:bg-white/90 font-semibold text-base h-14 px-8 rounded-sm shadow-lg group"
                    >
                      <span>Activar cobro automático</span>
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link href="#como-funciona">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto bg-transparent border-white/20 text-white hover:bg-white/10 font-medium text-base h-14 px-8 rounded-sm backdrop-blur-2xl"
                    >
                      Ver cómo funciona
                    </Button>
                  </Link>
                </motion.div>

                {/* Trust badges */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-6 pt-4"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-white/80" />
                    <span className="text-sm text-white/50">PCI-DSS</span>
                  </div>
                  <div className="h-4 w-px bg-white/10" />
                  <div className="flex items-center gap-2">
                    <CircleDollarSign className="w-5 h-5 text-white/80" />
                    <span className="text-sm text-white/50">0% comisión</span>
                  </div>
                  <div className="h-4 w-px bg-white/10" />
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-white/80" />
                    <span className="text-sm text-white/50">24h máx</span>
                  </div>
                </motion.div>
              </div>

              {/* Right - Dashboard */}
              <div className="hidden lg:block">
                <PaymentDashboard />
              </div>
            </div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex flex-col items-center gap-2"
            >
              <span className="text-xs text-white/30 uppercase tracking-widest">Descubre más</span>
              <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1.5">
                <motion.div
                  animate={{ y: [0, 8, 0], opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-1 h-1 rounded-full bg-white/60"
                />
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Stats Bar */}
        <section className="relative py-8 border-y border-white/[0.05] bg-white/[0.01]">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: '$120M+', label: 'Recaudado mensualmente' },
                { value: '0%', label: 'Comisión para propietarios' },
                { value: '95%', label: 'Pagos puntuales' },
                { value: '<24h', label: 'A tu cuenta bancaria' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center"
                >
                  <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                  <p className="text-sm text-white/40 mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Payment Methods */}
        <section id="metodos" className="py-20 relative">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-400 bg-teal-500/10 rounded-full px-3 py-1 mb-4 border border-teal-500/20">
                <CreditCard className="w-3 h-3" />
                Múltiples opciones
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Tu inquilino elige cómo pagar
              </h2>
              <p className="text-white/40 max-w-xl mx-auto">
                Aceptamos todos los métodos de pago populares en Colombia
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <PaymentMethodCard
                icon={CreditCard}
                name="Tarjeta débito/crédito"
                description="Visa, Mastercard, Amex"
                popular
                delay={0}
              />
              <PaymentMethodCard
                icon={Landmark}
                name="PSE"
                description="Todos los bancos"
                delay={0.1}
              />
              <PaymentMethodCard
                icon={Smartphone}
                name="Nequi / Daviplata"
                description="Billeteras digitales"
                delay={0.2}
              />
              <PaymentMethodCard
                icon={Banknote}
                name="Efectivo"
                description="Efecty, Baloto, SuRed"
                delay={0.3}
              />
            </div>
          </div>
        </section>

        {/* Features Bento */}
        <section id="como-funciona" className="py-24 relative">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 rounded-full px-3 py-1 mb-4 border border-emerald-500/20">
                <Sparkles className="w-3 h-3" />
                Todo automatizado
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                Cobra sin esfuerzo
              </h2>
              <p className="text-white/40 max-w-xl mx-auto text-lg">
                Configura una vez, recibe cada mes
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
              {/* Cobro automático - Large */}
              <FeatureBento
                icon={RefreshCcw}
                title="Cobro automático"
                description="Configura la fecha y nosotros cobramos"
                gradient="from-emerald-500 to-teal-500"
                className="lg:col-span-2 lg:row-span-2"
                delay={0}
              >
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <Repeat className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Débito automático</p>
                        <p className="text-xs text-white/40">Activo</p>
                      </div>
                    </div>
                    <div className="w-12 h-6 bg-emerald-500 rounded-full relative">
                      <motion.div
                        className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow"
                        layoutId="toggle"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Día de cobro', value: 'Día 5' },
                      { label: 'Próximo cobro', value: '5 Feb' },
                      { label: 'Monto', value: '$2.5M' },
                    ].map((item) => (
                      <div key={item.label} className="bg-white/[0.03] rounded-lg p-3">
                        <p className="text-[10px] text-white/40 uppercase">{item.label}</p>
                        <p className="text-sm font-semibold text-white">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </FeatureBento>

              {/* Recordatorios */}
              <FeatureBento
                icon={BellRing}
                title="Recordatorios"
                description="WhatsApp, email y SMS"
                gradient="from-blue-500 to-cyan-500"
                delay={0.1}
              >
                <div className="space-y-2">
                  {[
                    { icon: '📱', channel: 'WhatsApp', time: '3 días antes', done: true },
                    { icon: '📧', channel: 'Email', time: '1 día antes', done: true },
                    { icon: '💬', channel: 'SMS', time: 'Día de pago', done: false },
                  ].map((r, i) => (
                    <motion.div
                      key={r.channel}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="text-base">{r.icon}</span>
                      <span className="text-white/60 flex-1">{r.channel}</span>
                      {r.done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-400" />
                      )}
                    </motion.div>
                  ))}
                </div>
              </FeatureBento>

              {/* Recibos */}
              <FeatureBento
                icon={Receipt}
                title="Recibos digitales"
                description="Comprobante automático"
                gradient="from-violet-500 to-purple-500"
                delay={0.2}
              >
                <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/40">#2026-0142</span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">Pagado</span>
                  </div>
                  <p className="text-lg font-bold text-white">$2.850.000</p>
                  <div className="flex gap-2 mt-3">
                    <button className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs text-white/60 transition-colors">
                      <Download className="w-3 h-3" />
                      PDF
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs text-white/60 transition-colors">
                      <Send className="w-3 h-3" />
                      Enviar
                    </button>
                  </div>
                </div>
              </FeatureBento>

              {/* Dashboard */}
              <FeatureBento
                icon={PieChart}
                title="Dashboard de ingresos"
                description="Visualiza y exporta reportes"
                gradient="from-amber-500 to-orange-500"
                className="md:col-span-2"
                delay={0.3}
              >
                <div className="flex items-end gap-1 h-16">
                  {[40, 65, 55, 80, 70, 90, 85, 95, 75, 88, 92, 100].map((h, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-amber-500/80 to-amber-400/60 rounded-t"
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + i * 0.03 }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div>
                    <p className="text-2xl font-bold text-white">$34.2M</p>
                    <p className="text-xs text-white/40">Este año</p>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium">
                    <TrendingUp className="w-4 h-4" />
                    +12%
                  </div>
                </div>
              </FeatureBento>

              {/* Transferencia */}
              <FeatureBento
                icon={Landmark}
                title="Transferencia rápida"
                description="Dinero en tu cuenta en 24h"
                gradient="from-cyan-500 to-blue-500"
                delay={0.4}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: '100%' }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.6, duration: 1 }}
                    />
                  </div>
                  <span className="text-sm font-bold text-white">24h</span>
                </div>
                <p className="text-xs text-white/40 mt-2">Pago → Tu cuenta bancaria</p>
              </FeatureBento>
            </div>
          </div>
        </section>

        {/* Benefits Stats */}
        <section className="py-24 relative bg-gradient-to-b from-transparent via-emerald-950/30 to-transparent">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                Resultados reales
              </h2>
              <p className="text-white/40 max-w-xl mx-auto text-lg">
                Lo que experimentan nuestros propietarios
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Timer, value: '95%', label: 'Pagos a tiempo', description: 'Con recordatorios automáticos' },
                { icon: Shield, value: '100%', label: 'Seguro', description: 'Certificación PCI-DSS' },
                { icon: Zap, value: '24h', label: 'Transferencia', description: 'Máximo a tu cuenta' },
                { icon: CircleDollarSign, value: '0%', label: 'Comisión', description: 'Para propietarios' },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="relative bg-product-elevated/60 backdrop-blur-sm rounded-2xl border border-white/[0.08] p-6 text-center group hover:border-emerald-500/30 transition-colors"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-7 h-7 text-emerald-400" />
                    </div>
                    <p className="text-4xl font-bold text-white mb-1">{item.value}</p>
                    <p className="text-sm font-medium text-white/80">{item.label}</p>
                    <p className="text-xs text-white/40 mt-1">{item.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative py-24 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-950/30 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.12),transparent_70%)]" />

          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                Deja de perseguir,
                <span className="block bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                  empieza a recibir
                </span>
              </h2>
              <p className="text-xl text-white/50 max-w-2xl mx-auto">
                Activa el cobro automático hoy. Sin costo de activación, sin comisiones ocultas.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-white text-product-elevated hover:bg-white/90 font-semibold text-lg h-14 px-10 rounded-sm shadow-lg shadow-white/10 group"
                  >
                    Activar cobro automático
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>

              <div className="flex items-center justify-center gap-6 pt-4 text-sm text-white/30">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  PCI-DSS
                </span>
                <span className="flex items-center gap-1.5">
                  <CircleDollarSign className="w-4 h-4" />
                  0% comisión
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  24h transferencia
                </span>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
