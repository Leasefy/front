import { Metadata } from 'next';
import Link from 'next/link';
import { PricingTable } from '@/components/pricing';
import { Button } from '@/components/ui/button';
import { Shield, Zap, HeadphonesIcon, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Precios | Arriendo Facil',
  description:
    'Planes y precios de Arriendo Facil. Elige el plan que mejor se adapte a tus necesidades.',
};

/**
 * Public pricing page
 * Accessible to all users, authenticated or not
 */
export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#FBFBFB]">
      {/* Hero section */}
      <section className="py-16 px-4 sm:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Planes simples, precios transparentes
          </h1>
          <p className="text-lg text-slate-600 mt-4 max-w-2xl mx-auto">
            Elige el plan que mejor se adapte a tus necesidades. Sin sorpresas,
            sin comisiones ocultas.
          </p>
        </div>
      </section>

      {/* Pricing table */}
      <section className="pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <PricingTable showComparison />
        </div>
      </section>

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
              question="Puedo cambiar de plan en cualquier momento?"
              answer="Si, puedes actualizar o cambiar tu plan cuando quieras. Los cambios se aplican inmediatamente y ajustamos la facturacion de forma proporcional."
            />
            <FAQItem
              question="Que pasa si cancelo mi suscripcion?"
              answer="Puedes cancelar en cualquier momento. Tu acceso continuara hasta el final del periodo de facturacion actual."
            />
            <FAQItem
              question="Ofrecen prueba gratuita?"
              answer="El plan Gratis te permite probar la plataforma sin costo. Cuando estes listo, puedes actualizar a Pro o Business."
            />
            <FAQItem
              question="Que metodos de pago aceptan?"
              answer="Aceptamos tarjetas de credito y debito (Visa, Mastercard, American Express) y PSE para transferencias bancarias."
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
