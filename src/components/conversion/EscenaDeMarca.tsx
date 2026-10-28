'use client';

/**
 * La escena de marca de los momentos de Leasefy (Nico, 28-10-2026): «el modal que recuerda los días que faltan no usa
 * los 3D nuestros… crea algo mucho más hermoso»; «sumar en los que invitan el logo de ellos… que se vea súper top»;
 * «el modal de bienvenido… está ingresando a nuestra plataforma, celebrémosle eso».
 *
 * Una pieza para los tres (el plan, el regalo del aliado y la bienvenida) y para la invitación del aliado:
 *   · `EscenaDeMarca` (rehecha el 28-10, Nico: «esas pantallas con 3D donde muestras Fenalco… horrible; más como
 *     nosotros»): una foto real del banco de imágenes de Leasefy con un velo suave y, al centro, una placa blanca con lo
 *     que va (la cuenta de días, el sello del aliado o un 3D). `acompanantes` ya no se dibujan. `celebrar` suelta el
 *     confeti de la marca (techitos del símbolo y cuadritos) una vez.
 *   · `SelloDelAliado`: «Fianly | leasefy», un solo sello de co-marca.
 *   · `BeneficiosEn3D`: lo que trae Leasefy completo, cada cosa con su 3D.
 * Con movimiento reducido todo queda quieto y sin chispa.
 */

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CheckCircle } from '@phosphor-icons/react';
import { Ilustracion, Stagger, StaggerItem, motionSpring, usePrefersReducedMotion, type NombreIlustracion } from '@leasefy/cadence';

import { LeasefyLogotype } from '@/components/brand/LeasefySymbol';
import { LEASEFY_SYMBOL_PATH } from '@/components/brand/leasefy-logo-paths';
import { logoDelAliado } from '@/lib/conversion/logo-del-aliado';
import { cn } from '@/lib/utils';

/** El confeti de la marca: voltaje, noche, arena y blanco (Nico, 28-10: «el confeti que sea algo mejor»). */
const COLORES_DE_LA_CHISPA = ['#1a40ff', '#1a40ff', '#1b2340', '#e8e1d3', '#ffffff', '#7b93ff'];

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
  /** La foto de fondo (del banco de imágenes de Leasefy). Sin ella, la sala de Laureles al atardecer. */
  foto?: string;
  className?: string;
}

/** Fotos del banco de imágenes de Leasefy (interiores colombianos reales) para las escenas. */
export const FOTOS_DE_LA_ESCENA = [
  '/imagenes/banco/sala-laureles-atardecer.webp',
  '/imagenes/banco/sala-poblado-montanas.webp',
  '/imagenes/banco/sala-colonial-patio.webp',
  '/imagenes/banco/sala-nordica-luz.webp',
] as const;

export function EscenaDeMarca({ principal, children, celebrar = false, marca, foto, className }: EscenaDeMarcaProps) {
  const reducido = usePrefersReducedMotion();
  const centro = useRef<HTMLDivElement>(null);
  const imagen = foto ?? FOTOS_DE_LA_ESCENA[0];

  useChispa(celebrar, centro);

  return (
    <div className={cn('relative isolate h-56 overflow-hidden bg-[#1b2340] sm:h-64', className)} data-testid="escena-de-marca">
      {/* La foto entra con un acercamiento lento (Ken Burns), sin aurora ni 3D flotando (Nico, 28-10: «más como nosotros»). */}
      <motion.img
        src={imagen}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-10 h-full w-full object-cover"
        initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 1.08 }}
        animate={reducido ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        transition={{ opacity: { duration: 0.5 }, scale: { duration: 6, ease: [0.16, 1, 0.3, 1] } }}
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-[#0d1330]/55 via-[#0d1330]/10 to-transparent" />

      <div ref={centro} className="absolute inset-0 flex items-center justify-center px-6">
        <motion.div
          initial={reducido ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={reducido ? { duration: 0.2 } : { ...motionSpring.soft, delay: 0.15 }}
        >
          {children ?? (principal ? (
            <span className="flex size-32 items-center justify-center rounded-[28px] bg-[#f7f6f2] shadow-[0_24px_48px_-16px_rgba(4,16,48,0.55)]">
              <Ilustracion nombre={principal} tamano={104} tono="auto" alt="" />
            </span>
          ) : null)}
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

/**
 * El confeti de Leasefy: techitos del símbolo y cuadritos en la paleta de la marca, lanzados desde los dos costados de
 * `ref` (o de la pantalla) y cayendo despacio, como serpentina. Una vez. Sin movimiento, nada.
 */
export function useChispa(activa: boolean, ref?: RefObject<HTMLElement | null>, retraso = 450) {
  const reducido = usePrefersReducedMotion();
  useEffect(() => {
    if (!activa || reducido) return;
    const reloj = window.setTimeout(() => {
      const caja = ref?.current?.getBoundingClientRect();
      const W = window.innerWidth || 1;
      const H = window.innerHeight || 1;
      const y = caja ? (caja.top + caja.height * 0.6) / H : 0.45;
      const izq = caja ? Math.max(0.02, caja.left / W) : 0.15;
      const der = caja ? Math.min(0.98, caja.right / W) : 0.85;
      let techo: confetti.Shape | 'square' = 'square';
      try {
        techo = confetti.shapeFromPath({ path: LEASEFY_SYMBOL_PATH });
      } catch {
        techo = 'square';
      }
      const comun = {
        colors: COLORES_DE_LA_CHISPA,
        zIndex: 400,
        disableForReducedMotion: true,
        ticks: 320,
        gravity: 0.55,
        decay: 0.93,
        drift: 0,
        flat: false,
      };
      void confetti({ ...comun, origin: { x: izq, y }, angle: 60, spread: 55, startVelocity: 42, particleCount: 26, shapes: [techo], scalar: 1.5 });
      void confetti({ ...comun, origin: { x: der, y }, angle: 120, spread: 55, startVelocity: 42, particleCount: 26, shapes: [techo], scalar: 1.5 });
      void confetti({ ...comun, origin: { x: izq, y }, angle: 65, spread: 70, startVelocity: 36, particleCount: 34, shapes: ['square'], scalar: 0.7 });
      void confetti({ ...comun, origin: { x: der, y }, angle: 115, spread: 70, startVelocity: 36, particleCount: 34, shapes: ['square'], scalar: 0.7 });
    }, retraso);
    return () => {
      window.clearTimeout(reloj);
      confetti.reset();
    };
  }, [activa, reducido, ref, retraso]);
}

/**
 * El sello de co-marca «Fianly | leasefy» (como en el manual, capítulo «Sellos y co-marca»): UNA placa blanca, el logo
 * del aliado y el de Leasefy separados por una línea fina. Antes: dos fichas con un «×» en medio. Sin logo, el nombre.
 */
export function SelloDelAliado({ aliado, tamano = 'grande' }: { aliado: string; tamano?: 'grande' | 'chico' }) {
  const logo = logoDelAliado(aliado);
  const grande = tamano === 'grande';
  return (
    <div
      className={cn(
        'flex items-center bg-[#f7f6f2] shadow-[0_24px_48px_-16px_rgba(4,16,48,0.55)] ring-1 ring-black/5',
        grande ? 'gap-5 rounded-[22px] px-6 py-4 sm:gap-6 sm:px-7 sm:py-5' : 'gap-2.5 rounded-xl px-3 py-1.5',
      )}
      data-testid="sello-del-aliado"
    >
      <span className={cn('flex items-center justify-center', grande ? 'h-12 w-28 sm:h-14 sm:w-32' : 'h-6 w-14')}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo estático de public/aliados
          <img src={logo.src} alt={aliado} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className={cn('text-center font-medium leading-tight text-[#0a0f2c]', grande ? 'text-lg' : 'text-[11px]')}>{aliado}</span>
        )}
      </span>
      <span aria-hidden="true" className={cn('w-px self-stretch bg-[#1b2340]/15', grande ? 'my-1' : '')} />
      <LeasefyLogotype size={grande ? 24 : 12} className="text-[#1a40ff]" title="Leasefy" />
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
  // 28-10 (Nico): sin las tarjetas con 3D; una lista limpia, con el chulo de la marca, en dos columnas.
  return (
    <Stagger className={cn('grid gap-x-6 gap-y-2.5 sm:grid-cols-2', className)}>
      {items.map((b) => (
        <StaggerItem key={b.texto} className="flex items-start gap-2.5">
          <CheckCircle size={20} weight="fill" className="mt-px shrink-0 text-primary" aria-hidden="true" />
          <span className="text-body-sm leading-snug text-fg">{b.texto}</span>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

/**
 * La tarjeta del regalo del aliado arriba del registro y del publicador (`/publica?aliado=`). 28-10 (Nico: «más como
 * nosotros»): blanco cálido con borde fino, una foto real chica, el sello del aliado y el texto en tinta. Sin aurora.
 */
export function RegaloDelAliado({ aliado, className }: { aliado: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-4 rounded-2xl border border-border bg-surface p-2.5 pr-4 shadow-[0_1px_2px_rgba(20,19,15,0.05)]', className)} data-testid="regalo-del-aliado">
      {/* eslint-disable-next-line @next/next/no-img-element -- foto estática del banco */}
      <img src={FOTOS_DE_LA_ESCENA[0]} alt="" aria-hidden="true" className="hidden h-16 w-24 shrink-0 rounded-xl object-cover sm:block" />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary">Un regalo de {aliado}</p>
        <p className="mt-1 text-body-sm leading-snug text-fg">
          <span className="font-medium">Un mes de Leasefy completo.</span>{' '}
          <span className="text-fg-muted">Empieza al crear tu cuenta, sin tarjeta.</span>
        </p>
      </div>
      <SelloDelAliado aliado={aliado} tamano="chico" />
    </div>
  );
}
