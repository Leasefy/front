'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PricingTable } from '@/components/pricing';
import { ManagementTierCard } from '@/components/pricing/ManagementTierCard';
import { AddOnCard } from '@/components/pricing/AddOnCard';
import {
  Shield,
  Zap,
  HeadphonesIcon,
  CheckCircle2,
  Home,
  Briefcase,
  Calculator,
  ArrowUpRight,
  Building2,
  Users,
  FileText,
  Sparkles,
  UserCheck,
  BadgeCheck,
  Clock,
  Infinity,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MANAGEMENT_TIERS, ADD_ONS } from '@/lib/data/mock-subscriptions';

type UserType = 'owner-managed' | 'owner-diy' | 'agency';

/**
 * Public pricing page - Hybrid Model
 *
 * Three paths:
 * 1. Property owners who want full management (% fee)
 * 2. Property owners who self-manage (DIY subscription)
 * 3. Real estate agencies (business subscription)
 */
export default function PricingPage() {
  const [userType, setUserType] = useState<UserType>('owner-managed');
  const [exampleRent, setExampleRent] = useState(2000000);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  const toggleAddOn = (addonId: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId]
    );
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-20">
        {/* Hero section */}
        <section className="py-16 px-4 sm:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Arrienda sin complicaciones
          </h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
            Tu decides cuanto control quieres. Nosotros nos adaptamos.
          </p>
        </div>
      </section>

      {/* User Type Selector */}
      <section className="pb-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UserTypeCard
              icon={<Home className="h-5 w-5" />}
              label="Quiero que administren mi propiedad"
              description="Nosotros nos encargamos de todo"
              selected={userType === 'owner-managed'}
              onClick={() => setUserType('owner-managed')}
              accentColor="emerald"
            />
            <UserTypeCard
              icon={<Calculator className="h-5 w-5" />}
              label="Yo administro mi propiedad"
              description="Herramientas para hacerlo tu mismo"
              selected={userType === 'owner-diy'}
              onClick={() => setUserType('owner-diy')}
              accentColor="indigo"
            />
            <UserTypeCard
              icon={<Briefcase className="h-5 w-5" />}
              label="Soy inmobiliaria"
              description="Soluciones para agencias"
              selected={userType === 'agency'}
              onClick={() => setUserType('agency')}
              accentColor="amber"
            />
          </div>
        </div>
      </section>

      {/* Property Management Section */}
      {userType === 'owner-managed' && (
        <section className="pb-16 px-4">
          <div className="max-w-5xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-foreground">
                Administracion de propiedades
              </h2>
              <p className="text-muted-foreground mt-2">
                Cobramos un porcentaje del arriendo. Mucho menos que el mercado
                (10-12%).
              </p>
            </div>

            {/* Rent Calculator */}
            <div className="mb-8 p-4 bg-card rounded-sm border border-border">
              <label className="block text-sm font-medium text-foreground mb-2">
                Calcula con tu arriendo mensual
              </label>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">$</span>
                <input
                  type="number"
                  value={exampleRent}
                  onChange={(e) =>
                    setExampleRent(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  aria-label="Valor del arriendo mensual"
                  className="flex-1 h-10 px-3 border border-border rounded-sm text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  step={100000}
                  min={0}
                />
                <span className="text-muted-foreground">COP/mes</span>
              </div>
            </div>

            {/* Management Tiers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {MANAGEMENT_TIERS.map((tier) => (
                <ManagementTierCard
                  key={tier.id}
                  tier={tier}
                  exampleRent={exampleRent}
                />
              ))}
            </div>

            {/* Add-ons */}
            <div className="mt-12">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Servicios adicionales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ADD_ONS.map((addon) => (
                  <AddOnCard
                    key={addon.id}
                    addon={addon}
                    exampleRent={exampleRent}
                    selected={selectedAddOns.includes(addon.id)}
                    onToggle={toggleAddOn}
                  />
                ))}
              </div>
            </div>

            {/* Comparison Banner */}
            <div className="mt-12 p-6 bg-emerald-50 border border-emerald-200 rounded-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-emerald-900">
                    Ahorra hasta un 50% vs la competencia
                  </h4>
                  <p className="text-sm text-emerald-700 mt-1">
                    Mientras otros cobran 10-12%, nosotros cobramos solo 5-6%.
                    <br />
                    Para un arriendo de $2M, eso son $100,000 - $140,000 de
                    ahorro al mes.
                  </p>
                </div>
                <Link href="/auth">
                  <Button size="lg">Comenzar ahora</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* DIY Subscription Section */}
      {userType === 'owner-diy' && (
        <section className="pb-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-foreground">
                Planes para propietarios
              </h2>
              <p className="text-muted-foreground mt-2">
                Tu administras, nosotros te damos las herramientas
              </p>
            </div>

            <PricingTable showComparison />
          </div>
        </section>
      )}

      {/* Agency Section */}
      {userType === 'agency' && (
        <section className="pb-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-semibold text-foreground">
                Planes para inmobiliarias
              </h2>
              <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
                Precios que escalan con tu negocio. Paga por lo que usas, no más.
              </p>
            </div>

            {/* Pricing Tiers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
              {/* Starter */}
              <AgencyTierCard
                name="Starter"
                price="149.000"
                period="/mes"
                description="Para inmobiliarias pequeñas"
                properties={20}
                users={3}
                features={[
                  'CRM de candidatos',
                  'Publicación en portales',
                  'Contratos digitales',
                  'Scoring de arrendatarios',
                  'Soporte por email',
                ]}
              />

              {/* Growth - Popular */}
              <AgencyTierCard
                name="Growth"
                price="399.000"
                period="/mes"
                description="Para inmobiliarias en crecimiento"
                properties={100}
                users={10}
                popular
                features={[
                  'Todo en Starter',
                  'API REST básica',
                  'Reportes avanzados',
                  'Recordatorios automáticos',
                  'Soporte prioritario',
                ]}
              />

              {/* Business */}
              <AgencyTierCard
                name="Business"
                price="899.000"
                period="/mes"
                description="Para operaciones grandes"
                properties={300}
                users={25}
                features={[
                  'Todo en Growth',
                  'API REST completa',
                  'Webhooks en tiempo real',
                  'Multi-sucursal',
                  'Gerente de cuenta dedicado',
                ]}
              />

              {/* Enterprise */}
              <AgencyTierCard
                name="Enterprise"
                price="Personalizado"
                description="Para grandes inmobiliarias"
                properties={-1}
                users={-1}
                features={[
                  'Todo en Business',
                  'Propiedades ilimitadas',
                  'Usuarios ilimitados',
                  'White-label completo',
                  'SLA garantizado 99.9%',
                  'Onboarding personalizado',
                ]}
                isEnterprise
              />
            </div>

            {/* Add-ons section */}
            <div className="bg-muted/50 rounded-sm border border-border p-6 mb-12">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Servicios adicionales
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <AddOnItem
                  icon={<Users className="w-4 h-4" />}
                  name="Usuario extra"
                  price="$30.000/usuario/mes"
                />
                <AddOnItem
                  icon={<Building2 className="w-4 h-4" />}
                  name="Propiedad extra"
                  price="$3.000/propiedad/mes"
                />
                <AddOnItem
                  icon={<FileText className="w-4 h-4" />}
                  name="Screening de arrendatario"
                  price="$20.000/aplicación"
                />
                <AddOnItem
                  icon={<Sparkles className="w-4 h-4" />}
                  name="White-label"
                  price="Desde $200.000/mes"
                />
              </div>
            </div>

            {/* Volume discount banner */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-sm p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-indigo-900">
                    ¿Más de 500 propiedades?
                  </h4>
                  <p className="text-sm text-indigo-700 mt-1">
                    Obtén descuentos por volumen de hasta 24%. Contacta a nuestro equipo de ventas para una cotización personalizada.
                  </p>
                </div>
                <a href="mailto:ventas@arriendofacil.co">
                  <Button variant="outline" className="border-indigo-300 text-indigo-700 hover:bg-indigo-100">
                    Contactar ventas
                  </Button>
                </a>
              </div>
            </div>

            {/* Benefits */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <BenefitCard
                title="Migración gratuita"
                description="Te ayudamos a migrar tus propiedades y datos desde tu sistema actual sin costo adicional."
              />
              <BenefitCard
                title="Sin contratos largos"
                description="Paga mes a mes. Cancela cuando quieras. Sin penalidades ni letra pequeña."
              />
              <BenefitCard
                title="Soporte en español"
                description="Equipo local que entiende el mercado colombiano y la ley de arrendamiento."
              />
            </div>
          </div>
        </section>
      )}

      {/* Value props */}
      <section className="py-16 px-4 bg-background border-t border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-foreground text-center mb-12">
            Por que elegir Arriendo Facil
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ValueProp
              icon={<Shield className="w-6 h-6" />}
              title="Seguridad garantizada"
              description="Verificacion de identidad y antecedentes de todos los candidatos para tu tranquilidad."
            />
            <ValueProp
              icon={<Zap className="w-6 h-6" />}
              title="Proceso rapido"
              description="Encuentra inquilinos calificados en dias, no semanas. Nuestro AI hace el trabajo pesado."
            />
            <ValueProp
              icon={<HeadphonesIcon className="w-6 h-6" />}
              title="Soporte experto"
              description="Nuestro equipo esta listo para ayudarte en cada paso del proceso de arrendamiento."
            />
          </div>
        </div>
      </section>

      {/* Tenant Screening Section - Arriendo Pass */}
      <section className="py-16 px-4 bg-gradient-to-b from-emerald-50 to-background dark:from-emerald-950/20 dark:to-background border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 rounded-full px-3 py-1 mb-4">
              <UserCheck className="w-3.5 h-3.5" />
              Para inquilinos
            </span>
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3">
              Evaluación de Inquilinos
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Verifica tu perfil una vez y aplica a todas las propiedades que quieras.
              Tu reporte te acompaña durante todo el proceso de búsqueda.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Basic */}
            <div className="bg-card border border-border rounded-lg p-6 flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground">Evaluación Básica</h3>
                <p className="text-sm text-muted-foreground mt-1">Para una sola propiedad</p>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-bold text-foreground">$24.900</span>
                <span className="text-muted-foreground text-sm"> COP</span>
              </div>
              <ul className="space-y-3 flex-1 mb-6">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Verificación de identidad</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Historial crediticio</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Score de riesgo con IA</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Válido para 1 aplicación</span>
                </li>
              </ul>
              <Link href="/propiedades">
                <Button variant="outline" className="w-full">
                  Ver propiedades
                </Button>
              </Link>
            </div>

            {/* Arriendo Pass - Popular */}
            <div className="relative bg-card border-2 border-emerald-500 rounded-lg p-6 flex flex-col ring-1 ring-emerald-500/20">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-emerald-500 text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Más popular
                </span>
              </div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground">Arriendo Pass</h3>
                <p className="text-sm text-muted-foreground mt-1">60 días, aplicaciones ilimitadas</p>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-bold text-foreground">$39.900</span>
                <span className="text-muted-foreground text-sm"> COP</span>
              </div>
              <ul className="space-y-3 flex-1 mb-6">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Todo en Básica</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Verificación de antecedentes</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Referencias laborales</span>
                </li>
                <li className="flex items-start gap-2">
                  <Infinity className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground font-medium">Aplicaciones ilimitadas por 60 días</span>
                </li>
              </ul>
              <Link href="/propiedades">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                  Obtener Arriendo Pass
                </Button>
              </Link>
            </div>

            {/* Premium Pass */}
            <div className="bg-card border border-border rounded-lg p-6 flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground">Pass Premium</h3>
                <p className="text-sm text-muted-foreground mt-1">90 días + beneficios exclusivos</p>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-bold text-foreground">$59.900</span>
                <span className="text-muted-foreground text-sm"> COP</span>
              </div>
              <ul className="space-y-3 flex-1 mb-6">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Todo en Arriendo Pass</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Verificación de ingresos</span>
                </li>
                <li className="flex items-start gap-2">
                  <BadgeCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground font-medium">Badge &ldquo;Inquilino Verificado&rdquo;</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground font-medium">Válido por 90 días</span>
                </li>
              </ul>
              <Link href="/propiedades">
                <Button variant="outline" className="w-full">
                  Obtener Pass Premium
                </Button>
              </Link>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-card border border-border rounded-lg p-6 md:p-8">
            <h3 className="text-lg font-semibold text-foreground mb-6 text-center">
              ¿Cómo funciona?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">1</span>
                </div>
                <h4 className="font-medium text-foreground text-sm mb-1">Elige tu plan</h4>
                <p className="text-xs text-muted-foreground">Básica, Pass o Premium según tu necesidad</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">2</span>
                </div>
                <h4 className="font-medium text-foreground text-sm mb-1">Completa tu perfil</h4>
                <p className="text-xs text-muted-foreground">Sube documentos y autoriza verificaciones</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">3</span>
                </div>
                <h4 className="font-medium text-foreground text-sm mb-1">Recibe tu score</h4>
                <p className="text-xs text-muted-foreground">En minutos tienes tu reporte verificado</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">4</span>
                </div>
                <h4 className="font-medium text-foreground text-sm mb-1">Aplica con confianza</h4>
                <p className="text-xs text-muted-foreground">Propietarios ven tu perfil verificado</p>
              </div>
            </div>
          </div>

          {/* Trust note */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Gratis para propietarios</span> — Los propietarios reciben los reportes sin costo.
              <br />
              <span className="text-xs">Verificaciones powered by DataCrédito y fuentes oficiales colombianas.</span>
            </p>
          </div>
        </div>
      </section>

      {/* FAQ section */}
      <section id="faq" className="py-16 px-4 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-foreground text-center mb-8">
            Preguntas frecuentes
          </h2>

          <div className="space-y-6">
            <FAQItem
              question="Cual es la diferencia entre administracion y suscripcion?"
              answer="La administracion es para propietarios que quieren desentenderse: nosotros cobramos el arriendo, gestionamos la comunicacion y coordinamos mantenimientos. La suscripcion es para quienes quieren herramientas pero prefieren administrar directamente."
            />
            <FAQItem
              question="Como funciona el cobro del porcentaje?"
              answer="Cobramos el arriendo al inquilino (PSE, tarjeta, efectivo) y te transferimos el monto menos nuestro porcentaje. Todo automatico, sin que tengas que hacer nada."
            />
            <FAQItem
              question="Puedo cambiar de plan en cualquier momento?"
              answer="Si, puedes actualizar o cambiar tu plan cuando quieras. Los cambios se aplican inmediatamente y ajustamos la facturacion de forma proporcional."
            />
            <FAQItem
              question="Que incluye la poliza de arriendo?"
              answer="La poliza cubre entre 12 y 24 meses de arriendo en caso de impago, dependiendo del plan que elijas (Basica: 12 meses, Premium: 24 meses). Tambien incluye cobertura por danos a la propiedad, servicios publicos y reparaciones de emergencia. Es opcional y tiene un costo desde 2% del arriendo mensual."
            />
            <FAQItem
              question="¿Como funciona el Arriendo Pass para inquilinos?"
              answer="El Arriendo Pass te permite verificar tu perfil una sola vez y aplicar a todas las propiedades que quieras durante 60 días (o 90 con Premium). Pagas una única vez, completas tu verificación, y los propietarios ven tu score sin costo adicional. Es la forma más económica de buscar arriendo si planeas aplicar a varias propiedades."
            />
            <FAQItem
              question="¿Por que los inquilinos pagan la evaluacion?"
              answer="Este modelo beneficia a todos: los propietarios reciben candidatos pre-verificados sin costo, y los inquilinos serios demuestran compromiso real. Además, con el Arriendo Pass tu reporte es portable — lo pagas una vez y aplicas a muchas propiedades, ahorrando tiempo y dinero vs. pagar evaluación en cada inmobiliaria."
            />
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="relative py-20 px-4 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-300 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          <p className="text-indigo-200 text-sm font-medium tracking-wide uppercase mb-3">
            Sin tarjeta de crédito requerida
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold text-white mb-4">
            ¿Listo para empezar?
          </h2>
          <p className="text-indigo-100/80 text-lg mb-10 max-w-xl mx-auto">
            Crea tu cuenta gratis y comienza a encontrar los mejores inquilinos hoy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth">
              <Button size="lg" className="w-full sm:w-auto bg-white text-indigo-700 hover:bg-indigo-50 font-semibold shadow-lg shadow-indigo-900/30">
                Comenzar gratis
                <ArrowUpRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
            <a href="mailto:ventas@arriendofacil.co">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10 hover:border-white/50"
              >
                Contactar ventas
              </Button>
            </a>
          </div>
        </div>
      </section>
      </main>
      <Footer />
    </>
  );
}

/**
 * User type selector card - visually distinctive
 */
function UserTypeCard({
  icon,
  label,
  description,
  selected,
  onClick,
  accentColor,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  accentColor: 'emerald' | 'indigo' | 'amber';
}) {
  const colorClasses = {
    emerald: {
      iconBg: selected ? 'bg-emerald-500' : 'bg-emerald-100 dark:bg-emerald-900/30',
      iconText: selected ? 'text-white' : 'text-emerald-600 dark:text-emerald-400',
      border: selected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-border hover:border-emerald-300',
      accent: 'bg-emerald-500',
    },
    indigo: {
      iconBg: selected ? 'bg-indigo-500' : 'bg-indigo-100 dark:bg-indigo-900/30',
      iconText: selected ? 'text-white' : 'text-indigo-600 dark:text-indigo-400',
      border: selected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-border hover:border-indigo-300',
      accent: 'bg-indigo-500',
    },
    amber: {
      iconBg: selected ? 'bg-amber-500' : 'bg-amber-100 dark:bg-amber-900/30',
      iconText: selected ? 'text-white' : 'text-amber-600 dark:text-amber-400',
      border: selected ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-border hover:border-amber-300',
      accent: 'bg-amber-500',
    },
  };

  const colors = colorClasses[accentColor];

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-center text-center p-6 rounded-lg border-2 bg-card transition-all duration-200',
        colors.border,
        selected ? 'shadow-lg' : 'hover:shadow-md'
      )}
    >
      {/* Selected indicator bar */}
      {selected && (
        <div className={cn('absolute top-0 left-4 right-4 h-1 rounded-b-full', colors.accent)} />
      )}

      {/* Icon */}
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-200',
          colors.iconBg,
          colors.iconText,
          !selected && 'group-hover:scale-110'
        )}
      >
        {icon}
      </div>

      {/* Label */}
      <h3 className={cn(
        'font-semibold text-sm leading-tight mb-1.5 transition-colors',
        selected ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground'
      )}>
        {label}
      </h3>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        {description}
      </p>

      {/* Checkmark indicator */}
      {selected && (
        <div className={cn(
          'absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center',
          colors.accent
        )}>
          <CheckCircle2 className="w-4 h-4 text-white" />
        </div>
      )}
    </button>
  );
}

/**
 * Benefit card for agency section
 */
function BenefitCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-sm border border-border bg-card p-6">
      <h4 className="font-semibold text-foreground">{title}</h4>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

/**
 * Value proposition card
 */
function ValueProp({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-sm bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}

/**
 * FAQ item with question and answer
 */
function FAQItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <div className="bg-card rounded-sm border border-border p-6">
      <div className="flex gap-3">
        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-foreground mb-2">{question}</h3>
          <p className="text-sm text-muted-foreground">{answer}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Agency tier pricing card
 */
function AgencyTierCard({
  name,
  price,
  period,
  description,
  properties,
  users,
  features,
  popular,
  isEnterprise,
}: {
  name: string;
  price: string;
  period?: string;
  description: string;
  properties: number;
  users: number;
  features: string[];
  popular?: boolean;
  isEnterprise?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative rounded-sm border bg-card p-6 flex flex-col',
        popular ? 'border-primary ring-1 ring-primary' : 'border-border'
      )}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
            Más popular
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">{name}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>

      <div className="mb-4">
        {isEnterprise ? (
          <span className="text-2xl font-bold text-foreground">{price}</span>
        ) : (
          <>
            <span className="text-3xl font-bold text-foreground">${price}</span>
            <span className="text-muted-foreground text-sm">{period}</span>
          </>
        )}
      </div>

      {/* Limits */}
      {!isEnterprise && (
        <div className="flex gap-4 mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground font-medium">{properties}</span>
            <span className="text-xs text-muted-foreground">propiedades</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground font-medium">{users}</span>
            <span className="text-xs text-muted-foreground">usuarios</span>
          </div>
        </div>
      )}

      {/* Features */}
      <ul className="space-y-2.5 flex-1 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span className="text-sm text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isEnterprise ? (
        <a href="mailto:ventas@arriendofacil.co">
          <Button variant="outline" className="w-full">
            Contactar ventas
          </Button>
        </a>
      ) : (
        <Link href="/auth">
          <Button variant={popular ? 'default' : 'outline'} className="w-full">
            Comenzar gratis
          </Button>
        </Link>
      )}
    </div>
  );
}

/**
 * Add-on item for agency section
 */
function AddOnItem({
  icon,
  name,
  price,
}: {
  icon: React.ReactNode;
  name: string;
  price: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-card rounded-sm border border-border p-3">
      <div className="w-8 h-8 rounded-sm bg-muted flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{price}</p>
      </div>
    </div>
  );
}
