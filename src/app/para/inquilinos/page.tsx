'use client';

import { Appear, Avatar } from '@leasefy/cadence';
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
    quote: 'Encontré apartamento en Chapinero en solo 2 días. El Arriendo Pass me permitió postularme a 5 inmuebles sin volver a llenar formularios.',
    author: 'Andrés Pereira',
    role: 'Inquilino en Bogotá',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    quote: 'Me mudé de Medellín a Bogotá por trabajo y pude postularme a inmuebles antes de llegar. El proceso fue 100% digital.',
    author: 'Laura Sánchez',
    role: 'Reubicación laboral',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    quote: 'Como estudiante extranjero, pensé que sería imposible arrendar. Con mi perfil verificado, el propietario confió en mí de inmediato.',
    author: 'Nicolás Mendez',
    role: 'Estudiante universitario',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    quote: 'La búsqueda con IA es increíble. Escribe lo que buscaba y me mostró exactamente lo que necesitaba. Firmé contrato en una semana.',
    author: 'María Fernanda López',
    role: 'Inquilina en Medellín',
    image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
];

const problemas = [
  {
    foto: '/hero-interior.jpg',
    alt: 'Interior moderno',
    rotulo: 'ESTAFAS',
    cifra: '8 de 10',
    detalle: 'han visto anuncios falsos',
    texto: 'Fotos robadas, precios irreales, propiedades que no existen',
  },
  {
    foto: '/hero-4.jpg',
    alt: 'Espacio moderno',
    rotulo: 'RECHAZOS',
    cifra: '3 veces',
    detalle: 'rechazado sin explicación',
    texto: 'Criterios subjetivos y sesgos que nadie explica',
  },
  {
    foto: '/hero-6.jpg',
    alt: 'Habitación moderna',
    rotulo: 'TIEMPO',
    cifra: '47 días',
    detalle: 'promedio para encontrar',
    texto: 'Documentos, visitas, negociaciones interminables',
  },
];

const soluciones = [
  {
    titulo: 'Búsqueda con IA',
    texto: 'Describe lo que buscas en lenguaje natural. Nuestra IA encuentra propiedades que realmente te interesan.',
    chips: ['Filtros inteligentes', 'Alertas automáticas', 'Mapa interactivo'],
  },
  {
    titulo: 'Arriendo Pass',
    texto: 'Paga una vez, postulate sin límite por 60 días. Sin repetir documentos.',
    chips: ['Aplicaciones ilimitadas', '60 días', 'Sin repetir docs'],
  },
  {
    titulo: '100% Verificado',
    texto: 'Cada propiedad verificada. Fotos reales, precios reales, cero estafas.',
    chips: ['Fotos verificadas', 'Visitas reales', 'Cero estafas'],
  },
];

function Chips({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 flex flex-wrap gap-2">
      {items.map((c) => (
        <li
          key={c}
          className={cn(
            'inline-flex h-8 items-center gap-2 rounded-[10px] bg-white/[0.06] px-3 font-mono text-caption uppercase tracking-[0.06em] text-[#B9BCD0]',
            ESQUINA,
          )}
        >
          <Punto enNoche className="h-1.5 w-1.5" />
          {c}
        </li>
      ))}
    </ul>
  );
}

/** La pieza del producto sobre la foto del héroe: el Arriendo Pass de quien busca. */
function PiezaDelHeroe() {
  return (
    <div className="space-y-3">
      <Tarjeta className="p-5 shadow-[0_50px_90px_-40px_rgba(18,17,16,.35),0_22px_40px_-22px_rgba(18,17,16,.18)]">
        <div className="flex items-center gap-3">
          <Avatar name="María López" size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-[450] text-[#121110]">María López</p>
            <p className="text-caption text-[#706B64]">Inquilina verificada</p>
          </div>
        </div>
        <div className={cn('mt-4 rounded-[16px] bg-[#0A0F2C] p-4 text-white', ESQUINA)}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-caption uppercase tracking-[0.08em] text-[#B9BCD0]">Arriendo Pass</span>
            <Punto enNoche />
          </div>
          <p className="mt-2 font-mono text-[28px] leading-none tracking-[-0.03em]">60 días</p>
          <p className="mt-1 text-caption text-[#B9BCD0]">Aplicaciones ilimitadas</p>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          {[
            { v: '12', l: 'Aplicaciones' },
            { v: '3', l: 'Favoritos' },
          ].map((s) => (
            <div key={s.l} className="rounded-[12px] bg-[#FBFAF8] px-3 py-2.5 ring-1 ring-[#ECE8E1]">
              <dt className="text-caption text-[#706B64]">{s.l}</dt>
              <dd className="font-mono text-[18px] text-[#121110]">{s.v}</dd>
            </div>
          ))}
        </dl>
      </Tarjeta>
      <Tarjeta className="flex items-center gap-3 px-4 py-3">
        <Punto />
        <div className="min-w-0">
          <p className="text-caption font-medium text-[#121110]">Nueva propiedad</p>
          <p className="font-mono text-caption text-[#706B64]">Chapinero · $1.8M/mes</p>
        </div>
      </Tarjeta>
    </div>
  );
}

export default function InquilinosPage() {
  return (
    <LandingChrome>
      <main className="overflow-hidden bg-[#FBFAF8]">
        <HeroeDePara
          ceja="+2,500 propiedades verificadas"
          titulo={
            <>
              Encuentra tu hogar <span className="block"><Acento>sin estrés</Acento></span>
            </>
          }
          entrada={
            <>
              Inmuebles verificados, postulación simple, contratos claros.
              <span className="text-[#121110]"> Cero estafas, cero sorpresas.</span>
            </>
          }
          principal={{ href: '/propiedades', texto: 'Ver propiedades' }}
          secundaria={{ href: '/auth', texto: 'Crear perfil gratis' }}
          cifras={[
            { valor: '100%', rotulo: 'Verificadas' },
            { valor: '24h', rotulo: 'Respuesta' },
            { valor: '4.8', rotulo: 'Satisfacción' },
          ]}
          foto={{ src: '/images/people/woman-laptop-kitchen.jpg', alt: 'Inquilina feliz' }}
          pieza={<PiezaDelHeroe />}
          semilla={31}
        />

        {/* El problema: una fila por dolor, con su cifra, su foto y el hilo de puntos */}
        <Seccion fondo="papel" className="pt-[clamp(72px,8vw,110px)]">
          <div className={ANCHO}>
            <div className="grid gap-8 md:grid-cols-12 md:items-end">
              <div className="md:col-span-7">
                <Ceja>El problema</Ceja>
                <TituloDeSeccion className="mt-5">
                  Buscar arriendo es <Acento>agotador</Acento>
                </TituloDeSeccion>
              </div>
              <Entrada className="md:col-span-5">
                Estafas, rechazos sin explicación, procesos interminables. El sistema actual no está de tu lado.
              </Entrada>
            </div>

            <ol className="mt-[clamp(40px,5vw,72px)]">
              {problemas.map((p, i) => (
                <li key={p.rotulo}>
                  {i > 0 ? <HiloDePuntos className="my-2" /> : null}
                  <Appear inView distance="md" duration="slow">
                    <div className="grid items-center gap-6 py-8 md:grid-cols-[.9fr_1.1fr_1fr] md:gap-10">
                      <div>
                        <Rotulo tono="neutro">{p.rotulo}</Rotulo>
                        <p className="mt-4 font-mono text-[clamp(44px,5vw,76px)] font-normal leading-none tracking-[-0.045em] text-[#121110]">
                          {p.cifra}
                        </p>
                        <p className="mt-3 flex items-center gap-2 text-caption text-[#706B64]">
                          <Punto className="h-1.5 w-1.5" />
                          {p.detalle}
                        </p>
                      </div>
                      <p className="text-[clamp(19px,1.6vw,24px)] font-[360] leading-[1.35] tracking-[-0.015em] text-[#121110]">
                        {p.texto}
                      </p>
                      <FotoQueSeRevela src={p.foto} alt={p.alt} proporcion={16 / 10} />
                    </div>
                  </Appear>
                </li>
              ))}
            </ol>

            <div className="mt-[clamp(40px,5vw,72px)] grid gap-5 md:grid-cols-2">
              <Appear inView distance="md" duration="slow">
                <Tarjeta className="flex h-full flex-col gap-8 p-7 sm:flex-row sm:items-center sm:p-8">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[24px] font-[420] leading-tight tracking-[-0.02em]">«Precio demasiado bueno»</h3>
                    <p className="mt-2 text-[15px] leading-[1.5] text-[#5B5751]">
                      Anuncios falsos con precios irreales para capturar tu dinero. Sin verificación, estás solo.
                    </p>
                  </div>
                  <div className="w-full flex-none overflow-hidden rounded-[18px] bg-[#FBFAF8] ring-1 ring-[#ECE8E1] sm:w-[220px]">
                    <div className="grid aspect-[16/10] place-items-center bg-[#F3F1ED] text-caption text-[#706B64]">
                      Foto no disponible
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-caption font-medium text-[#121110]">Apto Chapinero</span>
                        <Rotulo tono="aviso">¿Real?</Rotulo>
                      </div>
                      <p className="mt-2 font-mono text-[20px] text-[#B8372A]">$800.000</p>
                      <p className="font-mono text-caption text-[#706B64] line-through">$2.5M valor real</p>
                    </div>
                  </div>
                </Tarjeta>
              </Appear>
              <Appear inView distance="md" duration="slow" delay={0.08}>
                <Tarjeta className="flex h-full flex-col gap-8 p-7 sm:flex-row sm:items-center sm:p-8">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[24px] font-[420] leading-tight tracking-[-0.02em]">«Necesitas un codeudor»</h3>
                    <p className="mt-2 text-[15px] leading-[1.5] text-[#5B5751]">
                      Requisitos infinitos que varían en cada propiedad. Un proceso diseñado para excluir.
                    </p>
                  </div>
                  <div className="w-full flex-none rounded-[18px] bg-[#FBFAF8] p-4 ring-1 ring-[#ECE8E1] sm:w-[220px]">
                    <p className="text-caption font-medium text-[#121110]">Documentos requeridos</p>
                    <ul className="mt-3 space-y-2">
                      {['Carta laboral', 'Extractos bancarios', 'Referencias personales', 'Codeudor con finca raíz', 'Declaración de renta'].map((doc) => (
                        <li key={doc} className="flex items-center gap-2 text-caption text-[#5B5751]">
                          <i aria-hidden="true" className="h-2 w-2 flex-none rounded-[2px] bg-[#D9911C]" />
                          {doc}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 border-t border-[#ECE8E1] pt-3 font-mono text-caption text-[#B8372A]">+15 más</p>
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
            semilla={37}
            fuerza={0.5}
            className="absolute inset-x-0 bottom-0 z-0 h-[40%] w-full opacity-80 [mask-image:linear-gradient(to_top,#000_0%,rgba(0,0,0,.6)_40%,transparent_95%)]"
          />
          <div className={cn(ANCHO, 'relative z-[1]')}>
            <div className="grid gap-8 md:grid-cols-12 md:items-end">
              <div className="md:col-span-7">
                <Ceja enNoche>La plataforma</Ceja>
                <TituloDeSeccion enNoche className="mt-5">
                  Todo pensado para <Acento enNoche>encontrar tu hogar</Acento>
                </TituloDeSeccion>
              </div>
              <Entrada enNoche className="md:col-span-5">
                Búsqueda con IA, inmuebles verificados, postulación simple y contratos claros. Todo desde una app.
              </Entrada>
            </div>

            <div className="mt-[clamp(40px,5vw,72px)] grid gap-4 md:grid-cols-3 lg:gap-5">
              {soluciones.map((s, i) => (
                <Appear key={s.titulo} inView distance="md" duration="slow" delay={i * 0.08}>
                  <Tarjeta enNoche className="flex h-full flex-col p-7">
                    <span className="font-mono text-caption tracking-[0.06em] text-[#8FA2FF]">{String(i + 1).padStart(2, '0')}</span>
                    <h3 className="mt-3 text-[24px] font-[420] leading-tight tracking-[-0.02em] text-[#F3F1ED]">{s.titulo}</h3>
                    <p className="mt-2 text-[15px] leading-[1.5] text-[#B9BCD0]">{s.texto}</p>
                    <div className="mt-auto">
                      <Chips items={s.chips} />
                    </div>
                  </Tarjeta>
                </Appear>
              ))}
            </div>

            <Appear inView distance="md" duration="slow" delay={0.1} className="mt-4 lg:mt-5">
              <Tarjeta enNoche className="grid items-center gap-8 overflow-hidden p-4 md:grid-cols-[1.1fr_.9fr] md:p-5">
                <FotoQueSeRevela
                  src="/hero-7.jpg"
                  alt="Espacio moderno"
                  tono="voltaje-sobre-medianoche"
                  proporcion={16 / 9}
                  rotulo="CONTRATOS DIGITALES"
                  className="bg-[#0A0F2C]"
                />
                <div className="px-3 pb-4 md:px-4 md:pb-0">
                  <span className="font-mono text-caption tracking-[0.06em] text-[#8FA2FF]">04</span>
                  <h3 className="mt-3 text-[clamp(24px,2.4vw,34px)] font-[400] leading-tight tracking-[-0.025em] text-[#F3F1ED]">
                    Contratos Digitales
                  </h3>
                  <p className="mt-2 text-[15px] leading-[1.5] text-[#B9BCD0]">
                    Firma desde tu celular con validez legal. Sabes exactamente qué firmas, sin letra pequeña.
                  </p>
                  <Chips items={['Firma electrónica', 'Ley 820', '100% legal']} />
                </div>
              </Tarjeta>
            </Appear>
          </div>
        </Seccion>

        <TestimoniosDePara
          testimonios={testimonials}
          ceja="Testimonios"
          titulo={
            <>
              Inquilinos que encontraron su <Acento>hogar</Acento>
            </>
          }
        />

        <div className="[&>section]:!bg-[#FBFAF8]">
          <FAQSection />
        </div>
        <CierreDePara semilla={31} />
      </main>
      <LandingFooterV2 />
    </LandingChrome>
  );
}
