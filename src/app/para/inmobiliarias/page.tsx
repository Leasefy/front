'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { Appear } from '@leasefy/cadence';
import { CheckCircle } from '@phosphor-icons/react';
import { LandingChrome } from '@/components/landing-v2/LandingChrome';
import { LandingFooterV2 } from '@/components/landing-v2/LandingFooterV2';
import { FAQSection } from '@/components/home/FAQSection';
import { CorrienteDeVoltaje } from '@/components/landing-v2/CorrienteDeVoltaje';
import { HeroeDePara } from '@/components/landing-v2/para/HeroeDePara';
import { FotoQueSeRevela } from '@/components/landing-v2/para/FotoQueSeRevela';
import { TestimoniosDePara } from '@/components/landing-v2/para/TestimoniosDePara';
import { CierreDePara } from '@/components/landing-v2/para/CierreDePara';
import {
  Acento,
  ANCHO,
  Ceja,
  Entrada,
  ESQUINA,
  HiloDePuntos,
  Punto,
  Rotulo,
  Seccion,
  Tarjeta,
  TituloDeSeccion,
} from '@/components/landing-v2/para/piezas';
import { cn } from '@/lib/utils';

// Testimonials data
const testimonials = [
  {
    quote: 'Pasamos de gestionar 50 propiedades a 200 sin aumentar el equipo. La automatización del scoring y los contratos digitales son un game-changer.',
    author: 'Inmobiliaria Santafé',
    role: 'Bogotá, 200+ propiedades',
    image: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=400&h=400&fit=crop&q=80',
  },
  {
    quote: 'El API nos permitió integrar con nuestro ERP existente. La migración fue sin fricciones, en solo 2 semanas teníamos todo funcionando.',
    author: 'Grupo Inmobiliario Antioquia',
    role: 'Medellín, 350+ propiedades',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=400&fit=crop&q=80',
  },
  {
    quote: 'El scoring con IA redujo nuestros impagos en un 60%. El ROI fue inmediato desde el primer mes de implementación.',
    author: 'Arriendos del Valle',
    role: 'Cali, 120+ propiedades',
    image: 'https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=400&h=400&fit=crop&q=80',
  },
  {
    quote: 'La plataforma white-label nos permitió ofrecer a nuestros clientes una experiencia completamente personalizada con nuestra marca.',
    author: 'Propiedades Premium',
    role: 'Barranquilla, 85+ propiedades',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=400&fit=crop&q=80',
  },
];

const problemasConFoto = [
  {
    foto: '/hero-interior.jpg',
    alt: 'Sala de un apartamento en arriendo',
    titulo: 'Procesos manuales',
    texto: 'Excel, WhatsApp, papeles. Tu equipo pierde horas en tareas repetitivas.',
  },
  {
    foto: '/hero-2.jpg',
    alt: 'Sala amplia de un apartamento',
    titulo: 'Evaluaciones lentas',
    texto: 'Días para evaluar un candidato. Los buenos inquilinos se van con la competencia.',
  },
  {
    foto: '/hero-3.jpg',
    alt: 'Sala con ventanales de un apartamento',
    titulo: 'Impagos frecuentes',
    texto: 'Sin scoring predictivo, los impagos afectan tu rentabilidad.',
  },
];

/** La pieza del producto que flota sobre la foto del héroe: clara, sin vidrio. */
function PiezaDelHeroe() {
  return (
    <div className="space-y-3">
      <Tarjeta className="p-5 shadow-[0_50px_90px_-40px_rgba(18,17,16,.35),0_22px_40px_-22px_rgba(18,17,16,.18)]">
        <div className="flex items-center gap-3">
          <span className={cn('grid h-10 w-10 place-items-center rounded-[12px] bg-[#0A0F2C] font-mono text-caption text-white', ESQUINA)}>
            IB
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-[450] text-[#121110]">Inmobiliaria Bogotá</p>
            <p className="text-caption text-[#706B64]">Plan Flex</p>
          </div>
          <CheckCircle className="h-5 w-5 text-[#2B7549]" aria-hidden="true" />
        </div>
        <div className="mt-4 rounded-[16px] bg-[#F3F1ED] p-4">
          <div className="flex items-center justify-between text-caption">
            <span className="text-[#5B5751]">Candidatos este mes</span>
            <span className="font-mono text-[#2B7549]">+28%</span>
          </div>
          <p className="mt-1 font-mono text-[30px] font-normal leading-none tracking-[-0.03em] text-[#121110]">347</p>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            { v: '45', l: 'Propiedades' },
            { v: '12', l: 'Agentes' },
            { v: '89%', l: 'Ocupación' },
          ].map((s) => (
            <div key={s.l} className="rounded-[12px] bg-[#FBFAF8] px-1 py-2.5 ring-1 ring-[#ECE8E1]">
              <dd className="font-mono text-[18px] text-[#121110]">{s.v}</dd>
              <dt className="text-caption text-[#706B64]">{s.l}</dt>
            </div>
          ))}
        </dl>
      </Tarjeta>
      <Tarjeta className="flex items-center gap-3 px-4 py-3">
        <Punto />
        <div className="min-w-0">
          <p className="text-caption font-medium text-[#121110]">Scoring completado</p>
          <p className="font-mono text-caption text-[#706B64]">Score: 87/100 · Bajo riesgo</p>
        </div>
      </Tarjeta>
    </div>
  );
}

/** Tarjeta de la medianoche (soluciones): superficie de noche, sin cajas de color. */
function TarjetaDeNoche({
  titulo,
  texto,
  chips,
  children,
  className,
  delay = 0,
}: {
  titulo: string;
  texto: string;
  chips?: string[];
  children?: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <Appear inView distance="md" duration="slow" delay={delay} className={className}>
      <Tarjeta enNoche className="flex h-full flex-col gap-6 p-6 sm:flex-row sm:p-7">
        <div className="min-w-0 flex-1">
          <h3 className="text-[22px] font-[420] leading-tight tracking-[-0.02em] text-[#F3F1ED]">{titulo}</h3>
          <p className="mt-2 text-[15px] leading-[1.5] text-[#B9BCD0]">{texto}</p>
          {chips ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {chips.map((c) => (
                <li
                  key={c}
                  className={cn('inline-flex h-8 items-center gap-2 rounded-[10px] bg-white/[0.06] px-3 font-mono text-caption uppercase tracking-[0.06em] text-[#B9BCD0]', ESQUINA)}
                >
                  <Punto enNoche className="h-1.5 w-1.5" />
                  {c}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {children ? <div className="flex-none sm:w-[220px]">{children}</div> : null}
      </Tarjeta>
    </Appear>
  );
}

export default function InmobiliariasPage() {
  return (
    <LandingChrome>
      <main className="overflow-hidden bg-[#FBFAF8]">
        <HeroeDePara
          ceja="Solución empresarial para inmobiliarias"
          titulo={
            <>
              Escala tu operación <span className="block">con <Acento>tecnología</Acento></span>
            </>
          }
          entrada={
            <>
              CRM de candidatos, scoring con IA, contratos digitales y API completa.
              <span className="text-[#121110]"> Todo integrado.</span>
            </>
          }
          principal={{ href: '/auth', texto: 'Empezar prueba gratis' }}
          secundaria={{ href: '/pricing', texto: 'Ver planes' }}
          cifras={[
            { valor: '92%', rotulo: 'Precisión IA' },
            { valor: '500+', rotulo: 'Inmobiliarias' },
            { valor: '10x', rotulo: 'Más rápido' },
          ]}
          foto={{ src: '/hero-7.jpg', alt: 'Sala de un apartamento moderno' }}
          pieza={<PiezaDelHeroe />}
          semilla={7}
        />

        {/* El problema */}
        <Seccion fondo="papel" className="pt-[clamp(72px,8vw,110px)]">
          <div className={ANCHO}>
            <div className="grid gap-8 md:grid-cols-12 md:items-end">
              <div className="md:col-span-7">
                <Ceja>El problema</Ceja>
                <TituloDeSeccion className="mt-5">
                  Escalar una inmobiliaria no debería ser tan <Acento>complicado</Acento>
                </TituloDeSeccion>
              </div>
              <Entrada className="md:col-span-5">
                Procesos manuales, evaluaciones lentas y errores humanos limitan tu crecimiento. Es hora de automatizar.
              </Entrada>
            </div>

            <div className="mt-[clamp(40px,5vw,72px)] grid gap-x-5 gap-y-10 md:grid-cols-3">
              {problemasConFoto.map((p, i) => (
                <Appear key={p.titulo} inView distance="md" duration="slow" delay={i * 0.08}>
                  <FotoQueSeRevela src={p.foto} alt={p.alt} proporcion={4 / 3} rotulo={`PROBLEMA ${String(i + 1).padStart(2, '0')}`} />
                  <h3 className="mt-5 text-[24px] font-[420] leading-tight tracking-[-0.02em] text-[#121110]">{p.titulo}</h3>
                  <p className="mt-2 text-[15px] leading-[1.5] text-[#5B5751]">{p.texto}</p>
                </Appear>
              ))}
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Appear inView distance="md" duration="slow" delay={0.1}>
                <Tarjeta className="flex h-full flex-col justify-between gap-8 p-7 sm:p-8">
                  <div>
                    <Rotulo tono="neutro">PROBLEMA 04</Rotulo>
                    <h3 className="mt-4 text-[24px] font-[420] leading-tight tracking-[-0.02em]">Sin integración</h3>
                    <p className="mt-2 text-[15px] leading-[1.5] text-[#5B5751]">
                      Tu ERP, CRM y sistemas de contabilidad no se hablan entre sí. Doble digitación y errores constantes.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5" aria-hidden="true">
                      {['ERP', 'CRM', 'CONT'].map((s) => (
                        <span key={s} className={cn('grid h-9 w-12 place-items-center rounded-[10px] bg-[#F3F1ED] font-mono text-caption text-[#5B5751]', ESQUINA)}>
                          {s}
                        </span>
                      ))}
                    </div>
                    <span className="text-caption text-[#5B5751]">3 sistemas desconectados</span>
                  </div>
                </Tarjeta>
              </Appear>
              <Appear inView distance="md" duration="slow" delay={0.16}>
                <Tarjeta className="flex h-full flex-col justify-between gap-8 p-7 sm:p-8">
                  <div>
                    <Rotulo tono="neutro">PROBLEMA 05</Rotulo>
                    <h3 className="mt-4 text-[24px] font-[420] leading-tight tracking-[-0.02em]">Escalabilidad limitada</h3>
                    <p className="mt-2 text-[15px] leading-[1.5] text-[#5B5751]">
                      Cada 50 propiedades nuevas, necesitas contratar más personal. Tu operación no escala eficientemente.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-none">
                      <p className="font-mono text-[30px] leading-none text-[#121110]">50</p>
                      <p className="mt-1 text-caption text-[#706B64]">propiedades por persona</p>
                    </div>
                    <HiloDePuntos className="min-w-[40px] flex-1" />
                    <div className="flex-none text-right">
                      <p className="font-mono text-[30px] leading-none text-[#1A40FF]">200+</p>
                      <p className="mt-1 text-caption text-[#706B64]">con automatización</p>
                    </div>
                  </div>
                </Tarjeta>
              </Appear>
            </div>
          </div>
        </Seccion>

        {/* La solución: el momento de medianoche */}
        <Seccion fondo="noche">
          <CorrienteDeVoltaje
            fondo="noche"
            forma="horizonte"
            semilla={19}
            fuerza={0.5}
            className="absolute inset-x-0 bottom-0 z-0 h-[45%] w-full opacity-80 [mask-image:linear-gradient(to_top,#000_0%,rgba(0,0,0,.6)_40%,transparent_95%)]"
          />
          <div className={cn(ANCHO, 'relative z-[1]')}>
            <div className="grid gap-8 md:grid-cols-12 md:items-end">
              <div className="md:col-span-7">
                <Ceja enNoche>La plataforma</Ceja>
                <TituloDeSeccion enNoche className="mt-5">
                  Todo lo que necesitas para <Acento enNoche>escalar</Acento>
                </TituloDeSeccion>
              </div>
              <Entrada enNoche className="md:col-span-5">
                Plataforma completa para gestionar candidatos, automatizar evaluaciones e integrar con tu operación.
              </Entrada>
            </div>

            <div className="mt-[clamp(40px,5vw,72px)] grid gap-4 md:grid-cols-12 lg:gap-5">
              <TarjetaDeNoche
                className="md:col-span-7"
                titulo="CRM de Candidatos"
                texto="Gestiona todos tus candidatos desde un solo panel con historial completo."
                chips={['Pipeline', 'Historial', 'Chat', 'Reportes']}
              >
                <div className="rounded-[16px] bg-white/[0.04] p-4 ring-1 ring-white/[0.08]">
                  <div className="flex items-center justify-between text-caption">
                    <span className="text-[#8E93B0]">Candidatos</span>
                    <span className="font-mono text-[#7FD3A0]">+12%</span>
                  </div>
                  <p className="mt-1 font-mono text-[28px] leading-none text-[#F3F1ED]">247</p>
                  <ul className="mt-3 space-y-2 border-t border-white/[0.08] pt-3">
                    {[
                      { name: 'María L.', status: 'Aprobado', color: 'bg-[#2B7549]' },
                      { name: 'Nicolás R.', status: 'En revisión', color: 'bg-[#D9911C]' },
                      { name: 'Ana M.', status: 'Nuevo', color: 'bg-[#4D6BFF]' },
                    ].map((item) => (
                      <li key={item.name} className="flex items-center gap-2 text-caption">
                        <i aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-[2px]', item.color)} />
                        <span className="flex-1 text-[#F3F1ED]">{item.name}</span>
                        <span className="text-[#8E93B0]">{item.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </TarjetaDeNoche>

              <TarjetaDeNoche
                className="md:col-span-5"
                delay={0.08}
                titulo="Scoring con IA"
                texto="Evalúa candidatos en segundos con 92% de precisión."
              >
                <div className="flex flex-col items-center justify-center py-2">
                  <svg viewBox="0 0 100 60" className="h-[60px] w-[100px]" aria-hidden="true">
                    <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="8" strokeLinecap="round" />
                    <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="#4D6BFF" strokeWidth="8" strokeLinecap="round" strokeDasharray="126" strokeDashoffset="16" />
                  </svg>
                  <span className="-mt-3 font-mono text-[26px] leading-none text-[#F3F1ED]">87</span>
                  <span className="mt-2 text-caption text-[#7FD3A0]">Bajo riesgo</span>
                </div>
              </TarjetaDeNoche>

              <TarjetaDeNoche
                className="md:col-span-5"
                delay={0.12}
                titulo="Multi-Propiedad"
                texto="Gestiona cientos de propiedades por sucursal."
              >
                <div aria-hidden="true" className="mx-auto grid w-[132px] grid-cols-3 gap-1.5">
                  {[92, 88, 96, 75, 90, 85, 78, 94, 82].map((occ, i) => (
                    <div key={i} className="flex aspect-square flex-col justify-end rounded-[6px] bg-white/[0.06] p-1">
                      <div className={cn('w-full rounded-[3px]', occ > 85 ? 'bg-[#4D6BFF]' : 'bg-[#4D6BFF]/50')} style={{ height: `${occ * 0.6}%` }} />
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-center text-caption text-[#8E93B0]">
                  <span className="font-mono text-[#F3F1ED]">91%</span> ocupación
                </p>
              </TarjetaDeNoche>

              <TarjetaDeNoche
                className="md:col-span-7"
                delay={0.16}
                titulo="API REST Completa"
                texto="Integra con tu ERP existente. Webhooks en tiempo real."
                chips={['REST API', 'Webhooks', 'SDK', 'Sandbox']}
              >
                <div className="overflow-hidden rounded-[14px] bg-[#0B0C12] ring-1 ring-white/[0.08]">
                  <div className="flex items-center gap-1.5 border-b border-white/[0.08] px-3 py-2">
                    <Punto enNoche className="h-1.5 w-1.5" />
                    <span className="font-mono text-caption text-[#8E93B0]">terminal</span>
                  </div>
                  <pre className="m-0 whitespace-pre p-3 font-mono text-caption leading-relaxed text-[#B9BCD0]">
                    <span className="text-[#7FD3A0]">GET</span>
                    {' /candidates\n{\n  "id": '}
                    <span className="text-[#8FA2FF]">1247</span>
                    {',\n  "score": '}
                    <span className="text-[#8FA2FF]">87</span>
                    {',\n  "risk": '}
                    <span className="text-[#7FD3A0]">&quot;low&quot;</span>
                    {'\n}'}
                  </pre>
                </div>
              </TarjetaDeNoche>

              <TarjetaDeNoche
                className="md:col-span-6"
                delay={0.2}
                titulo="Contratos Digitales"
                texto="Firma electrónica con validez legal. Genera contratos desde plantillas."
              >
                <div className="flex flex-col items-center">
                  <div aria-hidden="true" className="relative h-[84px] w-[66px] rounded-[8px] bg-white/[0.06] p-2.5 ring-1 ring-white/[0.08]">
                    <div className="space-y-1.5">
                      <div className="h-1 w-full rounded bg-white/20" />
                      <div className="h-1 w-3/4 rounded bg-white/20" />
                      <div className="h-1 w-full rounded bg-white/20" />
                      <div className="h-1 w-1/2 rounded bg-white/20" />
                    </div>
                    <CheckCircle className="absolute bottom-2 right-2 h-4 w-4 text-[#8FA2FF]" />
                  </div>
                  <span className="mt-2 text-caption text-[#8E93B0]">Firmado</span>
                </div>
              </TarjetaDeNoche>

              <TarjetaDeNoche
                className="md:col-span-6"
                delay={0.24}
                titulo="Seguro de Arriendo"
                texto="Protección completa contra impagos. Cobertura desde el primer día."
              >
                <div className="flex flex-col items-center">
                  <p className="font-mono text-[34px] leading-none text-[#F3F1ED]">100%</p>
                  <span className="mt-2 text-caption text-[#8E93B0]">cubierto</span>
                </div>
              </TarjetaDeNoche>
            </div>
          </div>
        </Seccion>

        <TestimoniosDePara
          testimonios={testimonials}
          ceja="Testimonios"
          titulo={
            <>
              Inmobiliarias que <Acento>confían</Acento> en nosotros
            </>
          }
          avatar={(testimonial) => (
            <span className={cn('h-11 w-11 flex-none overflow-hidden rounded-[12px] bg-[#E7E3DC]', ESQUINA)}>
              <Image src={testimonial.image} alt="" width={44} height={44} className="h-full w-full object-cover" />
            </span>
          )}
        />

        <div className="[&>section]:!bg-[#FBFAF8]">
          <FAQSection />
        </div>
        <CierreDePara semilla={7} />
      </main>
      <LandingFooterV2 />
    </LandingChrome>
  );
}
