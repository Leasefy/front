'use client';

import { Appear, Avatar } from '@leasefy/cadence';
import { LandingChrome } from '@/components/landing-v2/LandingChrome';
import { LandingFooterV2 } from '@/components/landing-v2/LandingFooterV2';
import { FAQSection } from '@/components/home/FAQSection';
import { CorrienteDeVoltaje } from '@/components/landing-v2/CorrienteDeVoltaje';
import { HeroeDePara } from '@/components/landing-v2/para/HeroeDePara';
import { FotoQueSeRevela } from '@/components/landing-v2/para/FotoQueSeRevela';
import { CierreDePara } from '@/components/landing-v2/para/CierreDePara';
import {
  Acento,
  ANCHO,
  Ceja,
  Entrada,
  ESQUINA,
  ListaNumerada,
  Punto,
  Rotulo,
  Seccion,
  Tarjeta,
  TituloDeSeccion,
} from '@/components/landing-v2/para/piezas';
import { cn } from '@/lib/utils';

const problemas = [
  {
    foto: '/hero-interior.jpg',
    alt: 'Interior moderno',
    rotulo: 'IMPAGO',
    cifra: '$18M',
    detalle: 'pérdida promedio por impago',
    texto: 'Sin verificación real, el riesgo lo asume completo el propietario',
  },
  {
    foto: '/hero-2.jpg',
    alt: 'Espacio moderno',
    rotulo: 'VACANCIA',
    cifra: '47 días',
    detalle: 'promedio para arrendar',
    texto: 'Documentos, visitas, negociaciones... un proceso del siglo pasado',
  },
  {
    foto: '/hero-3.jpg',
    alt: 'Habitación moderna',
    rotulo: 'DESALOJO',
    cifra: '14 meses',
    detalle: 'proceso legal promedio',
    texto: 'Sin contrato sólido, recuperar tu inmueble es una pesadilla',
  },
];

const soluciones = [
  {
    titulo: 'Evaluación de Inquilinos',
    texto: 'Verificamos capacidad de pago, historial crediticio y referencias. Tú eliges con datos, no con corazonadas.',
    chips: ['Score de riesgo IA', 'Verificación de identidad', 'Historial crediticio'],
  },
  {
    titulo: 'Cobro Automático',
    texto: 'Recibe el pago puntual cada mes. Sin perseguir a nadie, sin excusas.',
    chips: ['PSE y tarjeta', 'Recordatorios', 'Reporte mensual'],
  },
  {
    titulo: 'Contratos Digitales',
    texto: 'Firma electrónica con validez legal. Todo conforme a la Ley 820 de Colombia.',
    chips: ['Firma electrónica', 'Plantillas legales', 'Descarga PDF'],
  },
  {
    titulo: 'Publicación Multi-Portal',
    texto: 'Un clic y tu inmueble aparece en FincaRaíz, Metrocuadrado y más. Candidatos pre-filtrados, sin comisión.',
    chips: ['4 portales', 'Fotos optimizadas', 'Sin comisión'],
  },
];

/** Las etiquetas de cada solución, con su punto (DM Mono). */
function Chips({ items, enNoche = false }: { items: string[]; enNoche?: boolean }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {items.map((c) => (
        <li
          key={c}
          className={cn(
            'inline-flex h-8 items-center gap-2 rounded-[10px] px-3 font-mono text-caption uppercase tracking-[0.06em]',
            enNoche ? 'bg-white/[0.06] text-noche-fg-muted' : 'bg-surface-muted text-fg-muted',
            ESQUINA,
          )}
        >
          <Punto enNoche={enNoche} className="h-1.5 w-1.5" />
          {c}
        </li>
      ))}
    </ul>
  );
}

/** La pieza del producto sobre la foto del héroe: lo que el propietario ve. */
function PiezaDelHeroe() {
  return (
    <div className="space-y-3">
      <Tarjeta className="p-5 shadow-[0_50px_90px_-40px_rgba(18,17,16,.35),0_22px_40px_-22px_rgba(18,17,16,.18)]">
        <div className="flex items-center gap-3">
          <Avatar name="Juan Nicolás M." size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-[450] text-fg">Juan Nicolás M.</p>
            <p className="text-caption text-fg-subtle">Propietario verificado</p>
          </div>
        </div>
        <div className="mt-4 rounded-[16px] bg-surface-muted p-4">
          <div className="flex items-center justify-between text-caption">
            <span className="text-fg-muted">Ingresos este mes</span>
            <span className="font-mono text-success">+12%</span>
          </div>
          <p className="mt-1 font-mono text-[28px] font-normal leading-none tracking-[-0.03em] text-fg">$4.800.000</p>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          {[
            { v: '2', l: 'Propiedades' },
            { v: '100%', l: 'Ocupación' },
          ].map((s) => (
            <div key={s.l} className="rounded-[12px] bg-bg px-3 py-2.5 ring-1 ring-border">
              <dt className="text-caption text-fg-subtle">{s.l}</dt>
              <dd className="font-mono text-[18px] text-fg">{s.v}</dd>
            </div>
          ))}
        </dl>
      </Tarjeta>
      <Tarjeta className="flex items-center gap-3 px-4 py-3">
        <Punto />
        <div className="min-w-0">
          <p className="text-caption font-medium text-fg">Pago recibido</p>
          <p className="font-mono text-caption text-fg-subtle">$2.400.000 · Hace 2min</p>
        </div>
      </Tarjeta>
    </div>
  );
}

export default function PropietariosPage() {
  return (
    <LandingChrome>
      <main className="overflow-hidden bg-bg">
        <HeroeDePara
          ceja="Plataforma #1 para propietarios en Colombia"
          titulo={
            <>
              Arrienda tu propiedad <span className="block"><Acento>sin comisiones</Acento></span>
            </>
          }
          entrada={
            <>
              Evaluación de inquilinos gratis, publicación en portales gratis, cobro automatizado.
              <span className="text-fg"> Tú mantienes el control.</span>
            </>
          }
          principal={{ href: '/auth', texto: 'Comenzar gratis' }}
          secundaria={{ href: '/pricing', texto: 'Ver precios' }}
          cifras={[
            // Ronda 30: sólo cifras que se pueden sostener (antes porcentajes, «x» y satisfacción inventados).
            { valor: '$0', rotulo: 'Costo de evaluación' },
            { valor: 'Ley 820', rotulo: 'Contratos digitales' },
          ]}
          foto={{ src: '/images/people/woman-desk-coffee.jpg', alt: 'Propietaria feliz' }}
          pieza={<PiezaDelHeroe />}
          semilla={23}
        />

        {/* El problema: las tres cifras que cuestan, cada una con su foto */}
        <Seccion fondo="papel" className="pt-[clamp(72px,8vw,110px)]">
          <div className={ANCHO}>
            <div className="grid gap-8 md:grid-cols-12 md:items-end">
              <div className="md:col-span-7">
                <Ceja>El problema</Ceja>
                <TituloDeSeccion className="mt-5">
                  Arrendar no debería ser tan <Acento>difícil</Acento>
                </TituloDeSeccion>
              </div>
              <Entrada className="md:col-span-5">
                Impagos, vacancia, desalojos interminables. El proceso tradicional está roto. Pero no tiene que ser así.
              </Entrada>
            </div>

            <div className="mt-[clamp(40px,5vw,72px)] grid gap-x-5 gap-y-12 md:grid-cols-3">
              {problemas.map((p, i) => (
                <Appear key={p.rotulo} inView distance="md" duration="slow" delay={i * 0.08}>
                  <FotoQueSeRevela src={p.foto} alt={p.alt} proporcion={4 / 3} rotulo={p.rotulo} />
                  <p className="mt-6 font-mono text-[clamp(36px,3.6vw,52px)] font-normal leading-none tracking-[-0.04em] text-fg">
                    {p.cifra}
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-caption text-fg-subtle">
                    <Punto className="h-1.5 w-1.5" />
                    {p.detalle}
                  </p>
                  <p className="mt-4 text-[15px] leading-[1.5] text-fg-muted">{p.texto}</p>
                </Appear>
              ))}
            </div>

            <div className="mt-[clamp(48px,6vw,80px)] grid gap-5 md:grid-cols-2">
              <Appear inView distance="md" duration="slow">
                <Tarjeta className="flex h-full flex-col gap-8 p-7 sm:flex-row sm:items-center sm:p-8">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[24px] font-[420] leading-tight tracking-[-0.02em]">«Elegir a ciegas»</h3>
                    <p className="mt-2 text-[15px] leading-[1.5] text-fg-muted">
                      Sin datos reales, seleccionar inquilinos es apostar. Un mal candidato puede costarte millones.
                    </p>
                  </div>
                  <div className="w-full flex-none rounded-[18px] bg-bg p-4 ring-1 ring-border sm:w-[220px]">
                    <div className="flex items-center gap-3 border-b border-border pb-3">
                      <Avatar name="Candidato" size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="text-caption font-medium text-fg">Candidato #1</p>
                        <p className="text-caption text-fg-subtle">Sin verificar</p>
                      </div>
                      <Rotulo tono="aviso">?</Rotulo>
                    </div>
                    <dl className="mt-3 space-y-2">
                      {['Ingresos', 'Historial', 'Score'].map((l) => (
                        <div key={l} className="flex items-center justify-between text-caption">
                          <dt className="text-fg-muted">{l}</dt>
                          <dd className="font-mono text-fg-subtle">— — —</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </Tarjeta>
              </Appear>
              <Appear inView distance="md" duration="slow" delay={0.08}>
                <Tarjeta className="flex h-full flex-col gap-8 p-7 sm:flex-row sm:items-center sm:p-8">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[24px] font-[420] leading-tight tracking-[-0.02em]">«4 meses sin cobrar arriendo»</h3>
                    <p className="mt-2 text-[15px] leading-[1.5] text-fg-muted">
                      Sin verificación real, el propietario asume todo el riesgo de impago. Y recuperarlo puede tomar más de un año.
                    </p>
                  </div>
                  <div className="w-full flex-none rounded-[18px] bg-bg p-4 ring-1 ring-border sm:w-[220px]">
                    <div className="flex items-center justify-between">
                      <span className="text-caption font-medium text-fg">Cuenta de arriendo</span>
                      <span className="font-mono text-caption text-fg-subtle">2024</span>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {[
                        { month: 'Ene', paid: true, amount: '$2.5M' },
                        { month: 'Feb', paid: true, amount: '$2.5M' },
                        { month: 'Mar', paid: false, amount: '$2.5M' },
                        { month: 'Abr', paid: false, amount: '$2.5M' },
                      ].map((item) => (
                        <li key={item.month} className="flex items-center justify-between text-caption">
                          <span className="flex items-center gap-2 text-fg-muted">
                            <i aria-hidden="true" className={cn('h-2 w-2 rounded-[2px]', item.paid ? 'bg-success' : 'bg-danger')} />
                            {item.month}
                            <span className="sr-only">{item.paid ? 'pagado' : 'sin pagar'}</span>
                          </span>
                          <span className={cn('font-mono', item.paid ? 'text-fg' : 'text-danger')}>{item.amount}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-caption">
                      <span className="text-fg-muted">Deuda acumulada:</span>
                      <span className="font-mono text-danger">$5.0M</span>
                    </div>
                    <p className="mt-1 text-right font-mono text-caption text-fg-subtle">4 meses</p>
                  </div>
                </Tarjeta>
              </Appear>
            </div>
          </div>
        </Seccion>

        {/* La solución: el momento de medianoche, con la foto en estrías encendidas */}
        <Seccion fondo="noche">
          <CorrienteDeVoltaje
            fondo="noche"
            forma="horizonte"
            semilla={29}
            fuerza={0.5}
            className="absolute inset-x-0 bottom-0 z-0 h-[40%] w-full opacity-80 [mask-image:linear-gradient(to_top,#000_0%,rgba(0,0,0,.6)_40%,transparent_95%)]"
          />
          <div className={cn(ANCHO, 'relative z-[1]')}>
            <div className="grid gap-[clamp(40px,6vw,96px)] lg:grid-cols-[.9fr_1.1fr]">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <Ceja enNoche>La plataforma</Ceja>
                <TituloDeSeccion enNoche className="mt-5">
                  Todo lo que necesitas para <Acento enNoche>arrendar con confianza</Acento>
                </TituloDeSeccion>
                <Entrada enNoche className="mt-6">
                  Evaluación, cobro automático, contratos digitales y publicación en múltiples portales. Todo desde una sola plataforma.
                </Entrada>
                <FotoQueSeRevela
                  src="/hero-5.jpg"
                  alt="Propiedad moderna"
                  tono="voltaje-sobre-medianoche"
                  proporcion={16 / 10}
                  rotulo="PUBLICACIÓN MULTI-PORTAL"
                  className="mt-10 bg-ink"
                />
              </div>
              <Appear inView distance="md" duration="slow">
                <ListaNumerada
                  enNoche
                  columnas={1}
                  items={soluciones.map((s) => ({
                    titulo: <span className="text-[clamp(22px,2vw,28px)] font-[400] tracking-[-0.02em]">{s.titulo}</span>,
                    texto: s.texto,
                    extra: <Chips items={s.chips} enNoche />,
                  }))}
                  className="[&>li]:py-8"
                />
              </Appear>
            </div>
          </div>
        </Seccion>

        {/* Ronda 30: fuera los testimonios: eran inventados (nombres, cifras y fotos de banco). Vuelven cuando haya reales. */}

        <div className="[&>section]:!bg-bg">
          <FAQSection />
        </div>
        <CierreDePara semilla={23} />
      </main>
      <LandingFooterV2 />
    </LandingChrome>
  );
}
