'use client';

import type { ReactNode } from 'react';
import { Appear, Avatar } from '@leasefy/cadence';
import { CheckCircle } from '@phosphor-icons/react';
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
  HiloDePuntos,
  Punto,
  Rotulo,
  Seccion,
  Tarjeta,
  TituloDeSeccion,
} from '@/components/landing-v2/para/piezas';
import { cn } from '@/lib/utils';

/** El medidor de la calificación: un arco de voltaje, sin degradado. */
function Medidor({ valor, rotulo }: { valor: number; rotulo: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[64px] w-[64px]">
        <svg viewBox="0 0 60 60" className="h-full w-full" aria-hidden="true">
          <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="5" />
          <circle
            cx="30"
            cy="30"
            r={r}
            fill="none"
            stroke="#4D6BFF"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${(c * valor) / 100} ${c}`}
            transform="rotate(-90 30 30)"
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-mono text-[18px] text-[#F3F1ED]">{valor}</span>
      </div>
      <span className="mt-2 text-caption text-[#7FD3A0]">{rotulo}</span>
    </div>
  );
}

/** Tarjeta de la medianoche: título liviano, su línea, etiquetas con punto y su pieza. */
function TarjetaDeNoche({
  titulo,
  texto,
  chips,
  insignia,
  children,
  className,
  delay = 0,
}: {
  titulo: string;
  texto: string;
  chips?: string[];
  insignia?: { valor: string; rotulo: string };
  children?: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <Appear inView distance="md" duration="slow" delay={delay} className={className}>
      <Tarjeta enNoche className="flex h-full flex-col gap-6 p-6 sm:flex-row sm:p-7">
        <div className="min-w-0 flex-1">
          {insignia ? (
            <p className="mb-4 flex items-baseline gap-2">
              <span className="font-mono text-[20px] text-[#F3F1ED]">{insignia.valor}</span>
              <span className="text-caption text-[#8E93B0]">{insignia.rotulo}</span>
            </p>
          ) : null}
          <h3 className="text-[22px] font-[420] leading-tight tracking-[-0.02em] text-[#F3F1ED]">{titulo}</h3>
          <p className="mt-2 text-[15px] leading-[1.5] text-[#B9BCD0]">{texto}</p>
          {chips ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {chips.map((c) => (
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
          ) : null}
        </div>
        {children ? <div className="flex-none sm:w-[220px]">{children}</div> : null}
      </Tarjeta>
    </Appear>
  );
}

/** La pieza del producto sobre la foto del héroe: las comisiones del agente. */
function PiezaDelHeroe() {
  return (
    <div className="space-y-3">
      <Tarjeta className="p-5 shadow-[0_50px_90px_-40px_rgba(18,17,16,.35),0_22px_40px_-22px_rgba(18,17,16,.18)]">
        <div className="flex items-center gap-3">
          <Avatar
            name="Juliana Rodríguez"
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face&q=80"
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-[450] text-[#121110]">Juliana Rodríguez</p>
            <p className="text-caption text-[#706B64]">Agente verificada</p>
          </div>
          <CheckCircle className="h-5 w-5 text-[#2B7549]" aria-hidden="true" />
        </div>
        <div className="mt-4 rounded-[16px] bg-[#F3F1ED] p-4">
          <div className="flex items-center justify-between text-caption">
            <span className="text-[#5B5751]">Comisiones este mes</span>
            <span className="font-mono text-[#2B7549]">+45%</span>
          </div>
          <p className="mt-1 font-mono text-[28px] font-normal leading-none tracking-[-0.03em] text-[#121110]">$8.900.000</p>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            { v: '12', l: 'Cierres' },
            { v: '28', l: 'Candidatos' },
            { v: '43%', l: 'Conversión' },
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
          <p className="text-caption font-medium text-[#121110]">Evaluación lista</p>
          <p className="font-mono text-caption text-[#706B64]">Score: 87/100 · Aprobado</p>
        </div>
      </Tarjeta>
    </div>
  );
}

export default function AgentesPage() {
  return (
    <LandingChrome>
      <main className="overflow-hidden bg-[#FBFAF8]">
        <HeroeDePara
          ceja="100% gratis para agentes"
          titulo={
            <>
              Cierra más arriendos <span className="block"><Acento>más rápido</Acento></span>
            </>
          }
          entrada={
            <>
              Genera tu enlace, compártelo por WhatsApp y recibe evaluaciones profesionales.
              <span className="text-[#121110]"> Sin costo para ti.</span>
            </>
          }
          principal={{ href: '/auth?role=agent', texto: 'Crear cuenta gratis' }}
          secundaria={{ href: '/pricing', texto: 'Ver cómo funciona' }}
          cifras={[
            // Ronda 30: sólo cifras que se pueden sostener (antes porcentajes, «x» y satisfacción inventados).
            { valor: '$0', rotulo: 'Costo para ti' },
            { valor: '1 enlace', rotulo: 'Por cada inmueble' },
          ]}
          foto={{ src: '/hero-6.jpg', alt: 'Sala de un inmueble listo para mostrar' }}
          pieza={<PiezaDelHeroe />}
          semilla={41}
        />

        {/* El problema */}
        <Seccion fondo="papel" className="pt-[clamp(72px,8vw,110px)]">
          <div className={ANCHO}>
            <div className="grid gap-8 md:grid-cols-12 md:items-end">
              <div className="md:col-span-7">
                <Ceja>El problema</Ceja>
                <TituloDeSeccion className="mt-5">
                  Los agentes pierden tiempo en <Acento>procesos manuales</Acento>
                </TituloDeSeccion>
              </div>
              <Entrada className="md:col-span-5">
                Llamadas, WhatsApps, verificaciones manuales. Cada candidato consume horas que podrías usar cerrando más arriendos.
              </Entrada>
            </div>

            <div className="mt-[clamp(40px,5vw,72px)] grid gap-5 md:grid-cols-12">
              <Appear inView distance="md" duration="slow" className="md:col-span-7">
                <FotoQueSeRevela
                  src="https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg"
                  alt="Agente inmobiliario revisando documentos"
                  proporcion={16 / 9}
                  rotulo="PROBLEMA 01"
                />
                <h3 className="mt-5 text-[24px] font-[420] leading-tight tracking-[-0.02em] text-[#121110]">Horas en verificaciones manuales</h3>
                <p className="mt-2 max-w-[560px] text-[15px] leading-[1.5] text-[#5B5751]">
                  Llamar referencias, verificar empleo, revisar historial crediticio... Por cada candidato.
                </p>
              </Appear>

              <Appear inView distance="md" duration="slow" delay={0.08} className="md:col-span-5">
                <Tarjeta className="flex h-full flex-col p-7">
                  <Rotulo tono="neutro">PROBLEMA 02</Rotulo>
                  <h3 className="mt-4 text-[24px] font-[420] leading-tight tracking-[-0.02em]">Sin datos para decidir</h3>
                  <p className="mt-2 text-[15px] leading-[1.5] text-[#5B5751]">
                    Presentas candidatos al propietario sin saber realmente si pueden pagar.
                  </p>
                  <dl className="mt-auto space-y-3 pt-8">
                    {['Ingresos', 'Crédito', 'Referencias'].map((l) => (
                      <div key={l} className="flex items-center gap-3 text-caption">
                        <dt className="w-[92px] flex-none text-[#5B5751]">{l}</dt>
                        <dd className="flex flex-1 items-center gap-3">
                          <span aria-hidden="true" className="h-1.5 flex-1 rounded-full bg-[#ECE8E1]" />
                          <span className="font-mono text-[#A8A29A]">Sin datos</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Tarjeta>
              </Appear>

              <Appear inView distance="md" duration="slow" delay={0.12} className="md:col-span-5">
                <Tarjeta className="flex h-full flex-col p-7">
                  <Rotulo tono="neutro">PROBLEMA 03</Rotulo>
                  <h3 className="mt-4 text-[24px] font-[420] leading-tight tracking-[-0.02em]">Candidatos que se pierden</h3>
                  <p className="mt-2 text-[15px] leading-[1.5] text-[#5B5751]">
                    Mientras verificas uno, otros 3 ya encontraron otro apartamento.
                  </p>
                  <ul className="relative mt-auto space-y-3 pt-8">
                    <HiloDePuntos vertical className="absolute bottom-3 left-[17px] top-11" />
                    {[
                      { name: 'María González', status: 'Cerrado', tono: 'exito' as const },
                      { name: 'Nicolás Ruiz', status: 'Esperando', tono: 'aviso' as const },
                      { name: 'Ana Pérez', status: 'Perdido', tono: 'neutro' as const },
                    ].map((c) => (
                      <li key={c.name} className="relative flex items-center gap-3">
                        <Avatar name={c.name} size="md" />
                        <span className="flex-1 text-[15px] text-[#121110]">{c.name}</span>
                        <Rotulo tono={c.tono}>{c.status}</Rotulo>
                      </li>
                    ))}
                  </ul>
                </Tarjeta>
              </Appear>

              <Appear inView distance="md" duration="slow" delay={0.16} className="md:col-span-7">
                <FotoQueSeRevela
                  src="https://images.pexels.com/photos/8293778/pexels-photo-8293778.jpeg"
                  alt="Agente presentando un inmueble a sus clientes"
                  proporcion={16 / 9}
                  rotulo="PROBLEMA 04"
                />
                <h3 className="mt-5 text-[24px] font-[420] leading-tight tracking-[-0.02em] text-[#121110]">Te ves poco profesional</h3>
                <p className="mt-2 max-w-[560px] text-[15px] leading-[1.5] text-[#5B5751]">
                  Los propietarios esperan reportes formales, no &quot;yo creo que este candidato está bien&quot;.
                </p>
              </Appear>
            </div>
          </div>
        </Seccion>

        {/* Las herramientas: el momento de medianoche */}
        <Seccion fondo="noche">
          <CorrienteDeVoltaje
            fondo="noche"
            forma="horizonte"
            semilla={43}
            fuerza={0.5}
            className="absolute inset-x-0 bottom-0 z-0 h-[40%] w-full opacity-80 [mask-image:linear-gradient(to_top,#000_0%,rgba(0,0,0,.6)_40%,transparent_95%)]"
          />
          <div className={cn(ANCHO, 'relative z-[1]')}>
            <div className="grid gap-8 md:grid-cols-12 md:items-end">
              <div className="md:col-span-7">
                <Ceja enNoche>Las herramientas</Ceja>
                <TituloDeSeccion enNoche className="mt-5">
                  Herramientas para <Acento enNoche>cerrar más</Acento>
                </TituloDeSeccion>
              </div>
              <Entrada enNoche className="md:col-span-5">
                Todo lo que necesitas para impresionar a tus clientes propietarios y cerrar arriendos más rápido. 100% gratis para ti.
              </Entrada>
            </div>

            <div className="mt-[clamp(40px,5vw,72px)] grid gap-4 md:grid-cols-12 lg:gap-5">
              <TarjetaDeNoche
                className="md:col-span-7"
                insignia={{ valor: 'GRATIS', rotulo: 'para ti' }}
                titulo="Enlace de evaluación"
                texto="Genera un enlace único para cada inmueble. Compártelo por WhatsApp y recibe el reporte."
                chips={['WhatsApp', 'Email', 'SMS', 'QR']}
              >
                <div className="rounded-[16px] bg-white/[0.04] p-4 ring-1 ring-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-[#F3F1ED]">Apto 302</span>
                    <span className="inline-flex items-center gap-1.5 text-caption text-[#7FD3A0]">
                      <i aria-hidden="true" className="h-1.5 w-1.5 rounded-[2px] bg-[#2B7549]" />
                      Activo
                    </span>
                  </div>
                  <p className="mt-2 truncate rounded-[10px] font-mono text-caption text-[#8FA2FF] ring-1 ring-white/[0.08] px-2.5 py-1.5">
                    arriendo.co/ch302
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      { l: 'Visitas', v: '24' },
                      { l: 'Aplicaciones', v: '8' },
                    ].map((s) => (
                      <div key={s.l}>
                        <dt className="text-caption text-[#8E93B0]">{s.l}</dt>
                        <dd className="font-mono text-[20px] text-[#F3F1ED]">{s.v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </TarjetaDeNoche>

              <TarjetaDeNoche
                className="md:col-span-5"
                delay={0.08}
                insignia={{ valor: '$24.900', rotulo: 'paga el candidato' }}
                titulo="Evaluación completa"
                texto="Verificación de identidad, historial crediticio y score de riesgo con IA."
              >
                <div className="flex h-full items-center justify-center py-2">
                  <Medidor valor={91} rotulo="Bajo riesgo" />
                </div>
              </TarjetaDeNoche>

              <TarjetaDeNoche
                className="md:col-span-5"
                delay={0.12}
                titulo="App móvil"
                texto="Notificaciones en tiempo real cuando alguien se postula. iOS y Android."
              >
                <ul className="space-y-2">
                  {[
                    { text: 'Nueva postulación', time: 'Ahora', on: true },
                    { text: 'Contrato firmado', time: '1h', on: false },
                    { text: 'Reporte listo', time: '2h', on: false },
                  ].map((n) => (
                    <li key={n.text} className="flex items-center gap-2.5 rounded-[12px] bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/[0.08]">
                      <i aria-hidden="true" className={cn('h-2 w-2 flex-none rounded-[2px]', n.on ? 'bg-[#4D6BFF]' : 'bg-white/20')} />
                      <span className="flex-1 text-caption text-[#F3F1ED]">{n.text}</span>
                      <span className="font-mono text-caption text-[#8E93B0]">{n.time}</span>
                    </li>
                  ))}
                </ul>
              </TarjetaDeNoche>

              <TarjetaDeNoche
                className="md:col-span-7"
                delay={0.16}
                insignia={{ valor: 'Incluido', rotulo: 'sin costo extra' }}
                titulo="Dashboard de comisiones"
                texto="Rastrea tus cierres, mide tu rendimiento y alcanza tus metas mensuales."
                chips={['Métricas', 'Metas', 'Histórico', 'Exportar']}
              >
                <div className="rounded-[16px] bg-white/[0.04] p-4 ring-1 ring-white/[0.08]">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[26px] leading-none text-[#F3F1ED]">$8.9M</span>
                    <span className="font-mono text-caption text-[#7FD3A0]">+23%</span>
                  </div>
                  <p className="mt-1 text-caption text-[#8E93B0]">Comisiones este mes</p>
                  <div className="mt-4 flex items-center justify-between text-caption">
                    <span className="text-[#8E93B0]">Meta</span>
                    <span className="font-mono text-[#F3F1ED]">89%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[89%] rounded-full bg-[#4D6BFF]" />
                  </div>
                </div>
              </TarjetaDeNoche>

              <TarjetaDeNoche
                className="md:col-span-6"
                delay={0.2}
                titulo="Contratos digitales"
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
                titulo="Reportes profesionales"
                texto="PDFs con tu marca para impresionar a propietarios."
              >
                <div className="flex h-full items-center justify-center">
                  <Medidor valor={87} rotulo="Aprobado" />
                </div>
              </TarjetaDeNoche>
            </div>
          </div>
        </Seccion>

        {/* Ronda 30: fuera los testimonios: eran inventados (nombres, cifras y fotos de banco). Vuelven cuando haya reales. */}

        <div className="[&>section]:!bg-[#FBFAF8]">
          <FAQSection />
        </div>
        <CierreDePara semilla={41} />
      </main>
      <LandingFooterV2 />
    </LandingChrome>
  );
}
