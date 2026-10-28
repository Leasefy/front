'use client';

/**
 * La escena de marca de los momentos de Leasefy (Nico, 28-10-2026): «el modal que recuerda los días que faltan no usa
 * los 3D nuestros… crea algo mucho más hermoso»; «sumar en los que invitan el logo de ellos… que se vea súper top»;
 * «el modal de bienvenido… está ingresando a nuestra plataforma, celebrémosle eso».
 *
 * Una pieza para los tres (el plan, el regalo del aliado y la bienvenida) y para la invitación del aliado:
 *   · `EscenaDeMarca`: la aurora de la marca (el degradado con grano de los correos) con los 3D de Cadence flotando.
 *     Uno principal al centro y hasta cuatro acompañantes en las esquinas, cada uno con su vaivén. Lo que va al centro
 *     (la cuenta de días, el sello del aliado) entra por `children` y reemplaza al principal. `celebrar` suelta la
 *     chispa una vez, desde el centro.
 *   · `SelloDelAliado`: «Fianly × Leasefy», los dos logos en sus fichas blancas.
 *   · `BeneficiosEn3D`: lo que trae Leasefy completo, cada cosa con su 3D.
 * Con movimiento reducido todo queda quieto y sin chispa.
 */

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Ilustracion, Stagger, StaggerItem, motionSpring, usePrefersReducedMotion, type NombreIlustracion } from '@leasefy/cadence';

import { AuroraDeMarca } from '@/components/brand/AuroraDeMarca';
import { LeasefyLogotype } from '@/components/brand/LeasefySymbol';
import { logoDelAliado } from '@/lib/conversion/logo-del-aliado';
import { cn } from '@/lib/utils';

/** Dónde flota cada acompañante (en el orden en que llegan) y su vaivén. */
const LUGARES = [
  { clase: 'left-[7%] top-[16%]', giro: -10, segundos: 4.6 },
  { clase: 'right-[8%] top-[12%]', giro: 8, segundos: 5.2 },
  { clase: 'left-[14%] bottom-[10%]', giro: 6, segundos: 5.6 },
  { clase: 'right-[13%] bottom-[8%]', giro: -7, segundos: 4.9 },
] as const;

/** La chispa sobre la aurora: blanco, crema, cielo y el lila de la marca. */
const COLORES_DE_LA_CHISPA = ['#ffffff', '#ffffff', '#f4d9a6', '#a9d4f5', '#c9d1ff', '#ff7a3d'];

export interface EscenaDeMarcaProps {
  /** El 3D del centro (si no hay `children`). */
  principal?: NombreIlustracion;
  /** Hasta cuatro, en las esquinas. */
  acompanantes?: readonly NombreIlustracion[];
  /** Lo que va al centro en lugar del principal: la cuenta de días, el sello del aliado. */
  children?: ReactNode;
  /** Suelta la chispa una vez al abrir. */
  celebrar?: boolean;
  /** Algo chico abajo a la izquierda (el «Regalo de Fianly»). */
  marca?: ReactNode;
  className?: string;
}

export function EscenaDeMarca({ principal, acompanantes = [], children, celebrar = false, marca, className }: EscenaDeMarcaProps) {
  const reducido = usePrefersReducedMotion();
  const centro = useRef<HTMLDivElement>(null);

  useChispa(celebrar, centro);

  return (
    <div className={cn('relative isolate h-56 overflow-hidden sm:h-64', className)} data-testid="escena-de-marca">
      <AuroraDeMarca animada={!reducido} velo={false} className="absolute inset-0 -z-10" />
      {/* Un piso de luz bajo lo del centro: que se sienta parado, no pegado. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[14%] left-1/2 -z-10 h-8 w-48 -translate-x-1/2 rounded-[50%] bg-black/25 blur-xl"
      />

      {acompanantes.slice(0, LUGARES.length).map((nombre, i) => {
        const lugar = LUGARES[i];
        return (
          <motion.span
            key={`${nombre}-${i}`}
            aria-hidden="true"
            className={cn('absolute hidden drop-shadow-[0_12px_18px_rgba(4,16,48,0.35)] sm:block', lugar.clase)}
            initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: lugar.giro * 2 }}
            animate={
              reducido ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: lugar.giro, y: [0, -7, 0] }
            }
            transition={
              reducido
                ? { duration: 0.2 }
                : {
                    opacity: { duration: 0.4, delay: 0.25 + i * 0.09 },
                    scale: { ...motionSpring.bouncy, delay: 0.25 + i * 0.09 },
                    rotate: { ...motionSpring.bouncy, delay: 0.25 + i * 0.09 },
                    y: { duration: lugar.segundos, repeat: Infinity, ease: 'easeInOut', delay: 1 + i * 0.3 },
                  }
            }
          >
            <Ilustracion nombre={nombre} tamano={i < 2 ? 64 : 56} tono="auto" alt="" />
          </motion.span>
        );
      })}

      <div ref={centro} className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.7, y: 12 }}
          animate={reducido ? { opacity: 1 } : { opacity: 1, scale: 1, y: [0, -6, 0] }}
          transition={
            reducido
              ? { duration: 0.2 }
              : {
                  opacity: { duration: 0.35 },
                  scale: motionSpring.bouncy,
                  y: { duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 0.9 },
                }
          }
          className="drop-shadow-[0_18px_28px_rgba(4,16,48,0.45)]"
        >
          {children ?? (principal ? <Ilustracion nombre={principal} tamano={136} tono="auto" alt="" /> : null)}
        </motion.div>
      </div>

      {marca ? <div className="absolute bottom-3 left-3">{marca}</div> : null}
    </div>
  );
}

/** Un 3D que flota suelto (llega con su resorte y después se mece). Para escenas a la medida, como la del aliado. */
export function TresDeQueFlota({
  nombre,
  tamano = 64,
  giro = 0,
  segundos = 5,
  retraso = 0,
  className,
}: {
  nombre: NombreIlustracion;
  tamano?: number;
  giro?: number;
  segundos?: number;
  retraso?: number;
  className?: string;
}) {
  const reducido = usePrefersReducedMotion();
  return (
    <motion.span
      aria-hidden="true"
      className={cn('absolute drop-shadow-[0_14px_22px_rgba(4,16,48,0.4)]', className)}
      initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: giro * 2 }}
      animate={reducido ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: giro, y: [0, -9, 0] }}
      transition={
        reducido
          ? { duration: 0.2 }
          : {
              opacity: { duration: 0.4, delay: retraso },
              scale: { ...motionSpring.bouncy, delay: retraso },
              rotate: { ...motionSpring.bouncy, delay: retraso },
              y: { duration: segundos, repeat: Infinity, ease: 'easeInOut', delay: retraso + 0.8 },
            }
      }
    >
      <Ilustracion nombre={nombre} tamano={tamano} tono="auto" alt="" />
    </motion.span>
  );
}

/** Suelta la chispa una vez desde el centro de `ref` (o de la pantalla). Sin movimiento, nada. */
export function useChispa(activa: boolean, ref?: RefObject<HTMLElement | null>, retraso = 450) {
  const reducido = usePrefersReducedMotion();
  useEffect(() => {
    if (!activa || reducido) return;
    const reloj = window.setTimeout(() => {
      const caja = ref?.current?.getBoundingClientRect();
      const origen =
        caja && window.innerWidth > 0 && window.innerHeight > 0
          ? { x: (caja.left + caja.width / 2) / window.innerWidth, y: (caja.top + caja.height / 2) / window.innerHeight }
          : { x: 0.5, y: 0.3 };
      const comun = { origin: origen, colors: COLORES_DE_LA_CHISPA, zIndex: 400, disableForReducedMotion: true };
      void confetti({ ...comun, particleCount: 110, spread: 120, startVelocity: 40, gravity: 0.85, scalar: 0.9, ticks: 220 });
      void confetti({ ...comun, particleCount: 50, spread: 360, startVelocity: 20, gravity: 0.5, scalar: 0.6, shapes: ['circle'], ticks: 160 });
    }, retraso);
    return () => {
      window.clearTimeout(reloj);
      confetti.reset();
    };
  }, [activa, reducido, ref, retraso]);
}

/** «Fianly × Leasefy»: los dos logos, cada uno en su ficha blanca. Sin logo conocido, el nombre escrito. */
export function SelloDelAliado({ aliado, tamano = 'grande' }: { aliado: string; tamano?: 'grande' | 'chico' }) {
  const logo = logoDelAliado(aliado);
  const grande = tamano === 'grande';
  // Las dos fichas del mismo tamaño: el logo de cada uno adentro, sin estirarse.
  const ficha = cn(
    'flex shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_10px_30px_rgba(4,16,48,0.28)] ring-1 ring-black/5',
    grande ? 'h-24 w-36 px-4 py-3 sm:h-28 sm:w-44' : 'h-10 w-20 rounded-xl px-2 py-1.5',
  );
  return (
    <div className="flex items-center gap-3 sm:gap-4" data-testid="sello-del-aliado">
      <span className={ficha}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo estático de public/aliados
          <img src={logo.src} alt={aliado} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className={cn('text-center font-medium leading-tight text-[#0a0f2c]', grande ? 'text-lg' : 'text-[11px]')}>{aliado}</span>
        )}
      </span>
      <span aria-hidden="true" className={cn('font-light text-white/85', grande ? 'text-3xl' : 'text-base')}>
        ×
      </span>
      <span className={ficha}>
        <LeasefyLogotype size={grande ? 26 : 12} className="text-[#0a0f2c]" title="Leasefy" />
      </span>
    </div>
  );
}

/** «Regalo de Fianly»: el logo chico y el nombre en una pastilla blanca, para una esquina de la escena. */
export function ChipDelAliado({ aliado, texto }: { aliado: string; texto?: string }) {
  const logo = logoDelAliado(aliado);
  return (
    <span
      className="inline-flex h-9 items-center gap-2 rounded-full bg-white/95 pl-1.5 pr-3.5 text-caption font-medium text-[#0a0f2c] shadow-[0_6px_18px_rgba(4,16,48,0.25)]"
      data-testid="chip-del-aliado"
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- logo estático de public/aliados
        <img src={logo.src} alt="" className={cn('h-6 object-contain', logo.forma === 'horizontal' ? 'w-16' : 'w-6')} />
      ) : null}
      {texto ?? `Regalo de ${aliado}`}
    </span>
  );
}

export interface BeneficioEn3D {
  ilustracion: NombreIlustracion;
  texto: string;
}

/** Lo que trae Leasefy completo, en una cuadrícula de dos, cada cosa con su 3D. */
export const BENEFICIOS_DE_LEASEFY_COMPLETO: readonly BeneficioEn3D[] = [
  { ilustracion: 'firma', texto: 'Contratos con firma electrónica' },
  { ilustracion: 'banco', texto: 'Recaudo en línea y giros a propietarios' },
  { ilustracion: 'sobre_cobro', texto: 'Mori cobra por ti a quien se atrasa' },
  { ilustracion: 'factura', texto: 'Facturación electrónica y contabilidad' },
];

export function BeneficiosEn3D({ items = BENEFICIOS_DE_LEASEFY_COMPLETO, className }: { items?: readonly BeneficioEn3D[]; className?: string }) {
  return (
    <Stagger className={cn('grid gap-2 sm:grid-cols-2', className)}>
      {items.map((b) => (
        <StaggerItem key={b.texto} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
          <Ilustracion nombre={b.ilustracion} tamano={36} tono="auto" alt="" />
          <span className="text-body-sm leading-snug text-fg">{b.texto}</span>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

/**
 * La tarjeta del regalo del aliado arriba del registro y del publicador (`/publica?aliado=`). Nico, 28-10: «ese message
 * de arriba en azulito, qué cosa tan fea, para todos, haz algo mejor». Una tarjeta chica con la misma aurora del modal,
 * el logo del aliado y el 3D del regalo.
 */
export function RegaloDelAliado({ aliado, className }: { aliado: string; className?: string }) {
  return (
    <div
      className={cn('relative isolate overflow-hidden rounded-2xl px-4 py-3.5 text-white shadow-[0_14px_40px_rgba(4,16,48,0.22)] sm:px-5', className)}
      data-testid="regalo-del-aliado"
    >
      <AuroraDeMarca className="absolute inset-0 -z-10" />
      <div className="flex items-center gap-3 sm:gap-4">
        <ChipDelAliado aliado={aliado} texto={aliado} />
        <p className="min-w-0 flex-1 text-body-sm leading-snug">
          <span className="font-medium">Te regala un mes de Leasefy completo.</span>{' '}
          <span className="text-white/75">Empieza al crear tu cuenta, sin tarjeta.</span>
        </p>
        <span aria-hidden="true" className="hidden shrink-0 drop-shadow-[0_8px_14px_rgba(4,16,48,0.4)] sm:block">
          <Ilustracion nombre="novedad_regalo" tamano={48} tono="auto" alt="" />
        </span>
      </div>
    </div>
  );
}
