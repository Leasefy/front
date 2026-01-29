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
      <main className="min-h-screen bg-[#FBFBFB] pt-20">
        {/* Hero section */}
        <section className="py-16 px-4 sm:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Arrienda sin complicaciones
          </h1>
          <p className="text-lg text-slate-600 mt-4 max-w-2xl mx-auto">
            Tu decides cuanto control quieres. Nosotros nos adaptamos.
          </p>
        </div>
      </section>

      {/* User Type Selector */}
      <section className="pb-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3 p-1.5 bg-slate-100 rounded-sm">
            <UserTypeButton
              icon={<Home className="h-4 w-4" />}
              label="Quiero que administren mi propiedad"
              description="Nosotros nos encargamos de todo"
              selected={userType === 'owner-managed'}
              onClick={() => setUserType('owner-managed')}
            />
            <UserTypeButton
              icon={<Calculator className="h-4 w-4" />}
              label="Yo administro mi propiedad"
              description="Herramientas para hacerlo tu mismo"
              selected={userType === 'owner-diy'}
              onClick={() => setUserType('owner-diy')}
            />
            <UserTypeButton
              icon={<Briefcase className="h-4 w-4" />}
              label="Soy inmobiliaria"
              description="Soluciones para agencias"
              selected={userType === 'agency'}
              onClick={() => setUserType('agency')}
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
              <h2 className="text-2xl font-semibold text-slate-900">
                Administracion de propiedades
              </h2>
              <p className="text-slate-600 mt-2">
                Cobramos un porcentaje del arriendo. Mucho menos que el mercado
                (10-12%).
              </p>
            </div>

            {/* Rent Calculator */}
            <div className="mb-8 p-4 bg-white rounded-sm border border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Calcula con tu arriendo mensual
              </label>
              <div className="flex items-center gap-4">
                <span className="text-slate-500">$</span>
                <input
                  type="number"
                  value={exampleRent}
                  onChange={(e) =>
                    setExampleRent(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  className="flex-1 h-10 px-3 border border-slate-200 rounded-sm text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  step={100000}
                  min={0}
                />
                <span className="text-slate-500">COP/mes</span>
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
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
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
              <h2 className="text-2xl font-semibold text-slate-900">
                Planes para propietarios
              </h2>
              <p className="text-slate-600 mt-2">
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
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-slate-900">
                Soluciones para inmobiliarias
              </h2>
              <p className="text-slate-600 mt-2">
                Herramientas profesionales para agencias y administradores
              </p>
            </div>

            {/* Agency Benefits */}
            <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <BenefitCard
                title="API & Integraciones"
                description="Conecta con tu software existente. Sincroniza propiedades, candidatos y contratos."
              />
              <BenefitCard
                title="Multi-propiedad"
                description="Gestiona cientos de propiedades desde un solo panel. Sin limites."
              />
              <BenefitCard
                title="Marca blanca"
                description="Tu marca en la plataforma. Tus clientes ven tu identidad, no la nuestra."
              />
            </div>

            {/* Agency Pricing Card */}
            <div className="max-w-lg mx-auto">
              <div className="rounded-sm border border-slate-200 bg-white p-8 text-center">
                <h3 className="text-xl font-semibold text-slate-900">
                  Plan Inmobiliaria
                </h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-slate-900">
                    $499.900
                  </span>
                  <span className="text-slate-500">/mes</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  o $4.799.000/año (ahorra 20%)
                </p>

                <ul className="mt-6 space-y-3 text-left">
                  {[
                    'Propiedades ilimitadas',
                    'Usuarios ilimitados',
                    'API REST completa',
                    'Webhooks en tiempo real',
                    'Soporte prioritario 24/7',
                    'Onboarding personalizado',
                    'White-label opcional',
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 space-y-3">
                  <Link href="/auth" className="block">
                    <Button className="w-full" size="lg">
                      Comenzar prueba gratis
                    </Button>
                  </Link>
                  <Link href="/contacto" className="block">
                    <Button variant="outline" className="w-full">
                      Contactar ventas
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Value props */}
      <section className="py-16 px-4 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-slate-900 text-center mb-12">
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

      {/* FAQ section */}
      <section className="py-16 px-4 border-t border-slate-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-slate-900 text-center mb-8">
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
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-16 px-4 bg-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Listo para empezar?
          </h2>
          <p className="text-slate-400 mb-8">
            Crea tu cuenta gratis y comienza a encontrar los mejores inquilinos
            hoy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth">
              <Button size="lg" className="w-full sm:w-auto">
                Comenzar gratis
              </Button>
            </Link>
            <Link href="/contacto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-slate-700 text-white hover:bg-slate-800"
              >
                Contactar ventas
              </Button>
            </Link>
          </div>
        </div>
      </section>
      </main>
      <Footer />
    </>
  );
}

/**
 * User type selector button
 */
function UserTypeButton({
  icon,
  label,
  description,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex flex-col items-center gap-1 px-4 py-3 rounded-sm transition-all text-center',
        selected
          ? 'bg-white shadow-sm text-slate-900'
          : 'text-slate-600 hover:text-slate-900'
      )}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium text-sm">{label}</span>
      </div>
      <span className="text-xs text-slate-500">{description}</span>
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
    <div className="rounded-sm border border-slate-200 bg-white p-6">
      <h4 className="font-semibold text-slate-900">{title}</h4>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
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
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm">{description}</p>
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
    <div className="bg-white rounded-sm border border-slate-100 p-6">
      <div className="flex gap-3">
        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-slate-900 mb-2">{question}</h3>
          <p className="text-sm text-slate-600">{answer}</p>
        </div>
      </div>
    </div>
  );
}
