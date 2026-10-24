'use client';

/**
 * /avaluo con el diseño nuevo de la landing (ronda 30, Nico 24-10: «¿por qué no
 * le hiciste glow up a avalúos?»): la misma familia que la home, el marketplace,
 * la ficha y las internas de producto —la corriente de voltaje detrás de la
 * llegada, títulos livianos, sobretítulos en mono, los pasos unidos por una
 * línea, UN momento de medianoche y la ilustración 3D—.
 *
 * La tarea de quien llega: saber qué recibe (y qué no) ANTES de pagar, ver cómo
 * funciona y pedirlo. Una sola acción azul por bloque: «Solicitar avalúo».
 *
 * 🔴 Lo que dice es lo que hace el servicio (ver el encabezado de `page.tsx` y
 * `no-promete-lo-que-no-hace.test.tsx`): se paga al enviar, sin plazo de
 * entrega, remoto y sin visita, lo firma un revisor sin inscripción en el RAA y
 * no sirve para crédito, juzgados ni la DIAN. El rediseño no agrega promesas.
 */
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Info } from '@phosphor-icons/react';
import { CampoDeMedianoche, Ilustracion, motionDuration, motionEase, motionStagger } from '@leasefy/cadence';
import { CorrienteDeVoltaje } from '@/components/landing-v2/CorrienteDeVoltaje';
import { Button } from '@/components/ui/button';
import { useTx } from '@/lib/idioma/use-idioma';
import { cn } from '@/lib/utils';

const CORREO = 'avaluos@leasefy.co';

/** Aparece al entrar en pantalla. Siempre el mismo motion.div (con movimiento reducido, quieto y visible). */
function Revela({ children, className }: { children: ReactNode; className?: string }) {
  const quieto = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={quieto ? false : { opacity: 0, y: 22 }}
      animate={quieto ? { opacity: 1, y: 0 } : undefined}
      whileInView={quieto ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
    >
      {children}
    </motion.div>
  );
}

function entrada(paso: number, quieto: boolean | null) {
  if (quieto) return { initial: false as const };
  return {
    initial: { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: motionDuration.slow,
      ease: motionEase.enter,
      delay: Math.min(paso * motionStagger.step, motionStagger.max),
    },
  };
}

/** Sobretítulo de la landing: cuadrito de voltaje + texto corto en mono mayúscula. */
function Sobretitulo({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'inline-flex items-center gap-2.5 font-mono text-[13px] uppercase leading-[1.3] tracking-[0.08em] text-fg-subtle',
        className,
      )}
    >
      <span className="h-2 w-2 shrink-0 rounded-[2px] bg-primary" aria-hidden />
      {children}
    </p>
  );
}

function Correo() {
  return (
    <a href={`mailto:${CORREO}`} className="text-fg underline underline-offset-4 hover:text-primary">
      {CORREO}
    </a>
  );
}

export interface PaginaDelAvaluoProps {
  /** Dirección de la solicitud (el front del micro de avalúos). Vacía: la solicitud está en pausa. */
  solicitud: string;
}

export function PaginaDelAvaluo({ solicitud }: PaginaDelAvaluoProps) {
  const tx = useTx();
  const quieto = useReducedMotion();

  const pedir = tx('Solicitar avalúo', 'Request an appraisal');

  const garantias = [
    tx('100 % en línea', '100% online'),
    tx('Sin visita al inmueble', 'No site visit'),
    tx('Si no se emite, te devolvemos el pago', 'If it can’t be issued, we refund you'),
  ];

  const ficha = [
    {
      etiqueta: tx('Qué es', 'What it is'),
      valor: tx(
        'Una estimación de referencia del valor de tu inmueble, para vender o arrendar.',
        'A reference estimate of your property’s value, to sell or to rent.',
      ),
    },
    {
      etiqueta: tx('Cómo se hace', 'How it’s done'),
      valor: tx(
        'En línea, con los datos y las fotos que nos mandas. Nadie va al inmueble.',
        'Online, from the details and photos you send us. No one visits the property.',
      ),
    },
    {
      etiqueta: tx('Sirve para', 'Use it to'),
      valor: tx(
        'Negociar una compraventa o fijar un canon de arriendo.',
        'Negotiate a sale or set a monthly rent.',
      ),
    },
  ];

  const pasos = [
    {
      titulo: tx('Solicitar', 'Request'),
      bajada: tx('Datos y fotos del inmueble', 'Property details and photos'),
      texto: tx(
        'Ingresa los datos del inmueble, sube unas fotos y acepta las autorizaciones de datos. Sin papeleo físico y sin visita al inmueble.',
        'Enter the property’s details, upload a few photos and accept the data authorizations. No paperwork and no site visit.',
      ),
    },
    {
      titulo: tx('Pagar', 'Pay'),
      bajada: tx('Ves el precio antes de pagar', 'You see the price before paying'),
      texto: tx(
        'Pagas en línea al enviar la solicitud, y la estimación se prepara cuando el pago queda confirmado. Si al final no se puede emitir el avalúo, te devolvemos el pago.',
        'You pay online when you submit the request, and the estimate is prepared once the payment is confirmed. If the appraisal can’t be issued in the end, we refund you.',
      ),
    },
    {
      titulo: tx('Recibir el certificado', 'Get the certificate'),
      bajada: tx('Revisado y firmado por una persona', 'Reviewed and signed by a person'),
      texto: tx(
        'Un revisor revisa la estimación y firma el certificado. Te llega por correo el enlace al informe, con su PDF y un código para verificarlo.',
        'A reviewer checks the estimate and signs the certificate. You get an email with the link to the report, its PDF and a code to verify it.',
      ),
    },
  ];

  return (
    <main className="min-h-screen overflow-x-clip bg-bg">
      {/* ── La llegada: la corriente de voltaje alrededor y el texto sobre papel limpio (modo «marco»). ── */}
      <section
        className="relative px-4 pb-[clamp(56px,7vw,96px)] pt-[clamp(128px,13vw,176px)] text-center"
        aria-labelledby="titulo-del-avaluo"
      >
        {/* Se apaga arriba y abajo (la capa de afuera) y deja un claro del tamaño del texto (la de adentro). */}
        <div
          className="absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent_0%,#000_22%,#000_70%,transparent_100%)] dark:hidden"
          aria-hidden
        >
          <CorrienteDeVoltaje
            className="h-full w-full [mask-image:radial-gradient(ellipse_85%_42%_at_50%_58%,transparent_62%,#000_100%)] sm:[mask-image:radial-gradient(ellipse_40%_42%_at_50%_57%,transparent_62%,#000_100%)]"
            forma="corrientes"
            marco
            celda={3}
            fuerza={0.95}
            semilla={23}
          />
        </div>
        <div className="relative z-[1] mx-auto flex max-w-[880px] flex-col items-center">
          <motion.div {...entrada(0, quieto)}>
            <Ilustracion nombre="casa" tamano={112} alt="" aria-hidden className="block" />
          </motion.div>
          <motion.div {...entrada(1, quieto)} className="mt-4">
            <Sobretitulo>{tx('Avalúo en línea', 'Online appraisal')}</Sobretitulo>
          </motion.div>
          <motion.h1
            {...entrada(2, quieto)}
            id="titulo-del-avaluo"
            className="mt-5 font-heading text-[clamp(40px,5.6vw,76px)] font-[360] leading-[1.02] tracking-[-0.04em] text-fg [text-wrap:balance]"
          >
            {tx('Avalúo comercial en línea', 'Online property appraisal')}
          </motion.h1>
          <motion.p
            {...entrada(3, quieto)}
            className="mt-5 max-w-[600px] text-[clamp(16.5px,1.25vw,18.5px)] leading-[1.55] text-fg-muted [text-wrap:balance]"
          >
            {tx(
              'Una estimación de referencia del valor de tu inmueble, para vender o arrendar, sin que nadie vaya a verlo. Un revisor la firma antes de entregártela.',
              'A reference estimate of your property’s value, to sell or to rent, without anyone visiting it. A reviewer signs it before it’s delivered to you.',
            )}
          </motion.p>

          <motion.div {...entrada(4, quieto)} className="mt-8 flex w-full max-w-[340px] flex-col items-stretch gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center">
            {solicitud ? (
              <Button asChild size="lg" className="h-12 w-full px-6 text-[16px] sm:w-auto">
                <a href={solicitud} target="_blank" rel="noopener noreferrer" data-testid="solicitar-avaluo">
                  {pedir}
                </a>
              </Button>
            ) : (
              // Sin la dirección de la solicitud el botón no lleva a ningún lado: se apaga y dice qué hacer.
              <div className="flex flex-col items-center gap-2" data-testid="avaluo-en-pausa">
                <Button size="lg" disabled className="h-12 w-full px-6 text-[16px] sm:w-auto">
                  {pedir}
                </Button>
                <p className="text-[14px] text-fg-muted">
                  {tx('La solicitud está en pausa', 'Requests are paused')} · {tx('escríbenos a', 'write to us at')}{' '}
                  <Correo />
                </p>
              </div>
            )}
            <Button asChild size="lg" variant="secondary" className="h-12 w-full px-6 text-[16px] sm:w-auto">
              <a href="#como-funciona">{tx('Cómo funciona', 'How it works')}</a>
            </Button>
          </motion.div>

          <motion.ul
            {...entrada(5, quieto)}
            aria-label={tx('Lo que incluye', 'What’s included')}
            className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[14px] text-fg-muted"
          >
            {garantias.map((g) => (
              <li key={g} className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-[1px] bg-fg-subtle" aria-hidden />
                {g}
              </li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* ── Antes de pagar: qué es y para qué NO sirve (la ficha, sin adornos). ── */}
      <section className="border-t border-border-faint px-4 py-[clamp(64px,8vw,120px)]" aria-labelledby="para-que-sirve">
        <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <Revela>
            <Sobretitulo>{tx('Antes de pagar', 'Before you pay')}</Sobretitulo>
            <h2
              id="para-que-sirve"
              className="mt-4 font-heading text-[clamp(32px,3.6vw,48px)] font-[360] leading-[1.06] tracking-[-0.035em] text-fg [text-wrap:balance]"
            >
              {tx('Qué recibes y para qué sirve', 'What you get and what it’s for')}
            </h2>
          </Revela>

          <Revela>
            <dl className="divide-y divide-border-faint border-y border-border-faint">
              {ficha.map((f) => (
                <div key={f.etiqueta} className="grid gap-1.5 py-5 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6">
                  <dt className="font-mono text-[13px] uppercase leading-[1.5] tracking-[0.08em] text-fg-subtle">{f.etiqueta}</dt>
                  <dd className="text-[16.5px] leading-[1.5] text-fg">{f.valor}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex items-start gap-3 rounded-[18px] bg-surface-muted px-5 py-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-fg-muted" aria-hidden />
              <p className="text-[15px] leading-[1.55] text-fg-muted">
                {tx(
                  'No es un avalúo de un avaluador inscrito en el RAA: no sirve para crédito hipotecario, procesos judiciales ni trámites ante la DIAN.',
                  'It isn’t an appraisal by an appraiser registered with the RAA: it can’t be used for a mortgage, court proceedings or DIAN filings.',
                )}
              </p>
            </div>
          </Revela>
        </div>
      </section>

      {/* ── Cómo funciona: tres pasos unidos por una línea; el primero en voltaje. ── */}
      <section
        id="como-funciona"
        className="scroll-mt-28 border-t border-border-faint px-4 py-[clamp(64px,8vw,120px)]"
        aria-labelledby="titulo-como-funciona"
      >
        <div className="mx-auto max-w-[1180px]">
          <Revela className="text-center">
            <Sobretitulo className="justify-center">{tx('El proceso', 'The process')}</Sobretitulo>
            <h2
              id="titulo-como-funciona"
              className="mt-4 font-heading text-[clamp(32px,3.6vw,48px)] font-[360] leading-[1.06] tracking-[-0.035em] text-fg"
            >
              {tx('Cómo funciona', 'How it works')}
            </h2>
          </Revela>

          <ol className="mt-12 grid gap-0 md:mt-16 md:grid-cols-3 md:gap-8">
            {pasos.map((p, i) => (
              <li key={p.titulo} className="relative flex gap-5 pb-10 last:pb-0 md:block md:pb-0">
                {/* La línea que une los pasos: vertical en el celular, horizontal en pantallas anchas. */}
                {i < pasos.length - 1 && (
                  <>
                    <span className="absolute left-[15px] top-[34px] bottom-1 w-px bg-border md:hidden" aria-hidden />
                    <span className="absolute left-[46px] right-[-18px] top-[15px] hidden h-px bg-border md:block" aria-hidden />
                  </>
                )}
                <span
                  className={cn(
                    'relative z-[1] flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full font-mono text-[13px] tabular-nums',
                    i === 0 ? 'bg-primary text-white' : 'border border-border bg-bg text-fg-muted',
                  )}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <Revela className="min-w-0 md:mt-6">
                  <h3 className="font-heading text-[22px] font-[420] leading-tight tracking-[-0.02em] text-fg">{p.titulo}</h3>
                  <p className="mt-1 text-[14px] text-fg-subtle">{p.bajada}</p>
                  <p className="mt-3 max-w-[360px] text-[15.5px] leading-[1.6] text-fg-muted">{p.texto}</p>
                </Revela>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── El momento de medianoche: el certificado, firmado por una persona y verificable. ── */}
      <section className="px-4 pb-[clamp(64px,8vw,120px)]" aria-labelledby="titulo-del-certificado">
        <Revela className="mx-auto max-w-[1180px]">
          <CampoDeMedianoche
            cruces={false}
            data-testid="avaluo-certificado"
            className="dark grid items-center gap-8 rounded-[28px] border border-white/[0.09] p-[clamp(28px,4.5vw,64px)] text-fg md:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div>
              <Sobretitulo>{tx('El certificado', 'The certificate')}</Sobretitulo>
              <h2
                id="titulo-del-certificado"
                className="mt-4 max-w-[620px] font-heading text-[clamp(30px,3.4vw,46px)] font-[360] leading-[1.08] tracking-[-0.035em] text-fg [text-wrap:balance]"
              >
                {tx('Lo firma una persona y se puede verificar', 'Signed by a person, and verifiable')}
              </h2>
              <p className="mt-4 max-w-[560px] text-[16.5px] leading-[1.6] text-fg-muted">
                {tx(
                  'Te llega por correo con su PDF y un código. Con ese código, quien lo reciba comprueba en línea que el certificado es auténtico.',
                  'It reaches you by email with its PDF and a code. With that code, whoever receives it can check online that the certificate is genuine.',
                )}
              </p>
            </div>
            <Ilustracion
              nombre="sello"
              tamano={200}
              alt=""
              aria-hidden
              className="mx-auto block h-[clamp(140px,16vw,200px)] w-auto md:mx-0"
            />
          </CampoDeMedianoche>
        </Revela>
      </section>

      {/* ── El cierre: la pregunta de quien llegó y la misma acción. ── */}
      <section className="border-t border-border-faint px-4 py-[clamp(72px,9vw,136px)] text-center" aria-labelledby="titulo-del-cierre">
        <Revela className="mx-auto flex max-w-[860px] flex-col items-center">
          <h2
            id="titulo-del-cierre"
            className="font-heading text-[clamp(36px,4.6vw,64px)] font-[360] leading-[1.04] tracking-[-0.04em] text-fg [text-wrap:balance]"
          >
            {tx('¿Cuánto vale ', 'What is ')}
            <span className="text-primary">{tx('tu inmueble', 'your property')}</span>
            {tx('?', ' worth?')}
          </h2>
          <p className="mt-5 max-w-[520px] text-[17px] leading-[1.55] text-fg-muted">
            {tx(
              'Pide la estimación en línea. Un revisor la firma antes de entregártela.',
              'Request the estimate online. A reviewer signs it before it’s delivered to you.',
            )}
          </p>
          {solicitud && (
            <Button asChild size="lg" className="mt-8 h-12 px-6 text-[16px]">
              <a href={solicitud} target="_blank" rel="noopener noreferrer">
                {pedir}
              </a>
            </Button>
          )}
          <p className="mt-6 text-[14px] text-fg-muted">
            {tx('También puedes escribirnos a', 'You can also write to us at')} <Correo />
          </p>
        </Revela>
      </section>
    </main>
  );
}
