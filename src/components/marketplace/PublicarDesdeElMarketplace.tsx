'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Ilustracion } from '@leasefy/cadence';
import { ArrowRight, Browser, FileArrowUp, Info, Plus } from '@phosphor-icons/react';

import { CurvasDeNivel } from '@/components/landing-v2/CamposDeLaMarca';

import { useAuth } from '@/lib/auth/use-auth';
import { useCuentaParaPublicar } from './CuentaParaPublicar';
import { cn } from '@/lib/utils';
import type { AgencyMemberRole } from '@/lib/auth/types';

/**
 * «Publicar» al pie del marketplace (Nico, 09-10-2026: «debe existir algún
 * lugar para publicar los inmuebles con sus pasos, masivo o individual, y
 * claramente quedan atados a su cuenta porque sólo puede publicar con cuenta»).
 *
 * Lo que se ofrece depende de quién mira, y nunca un botón que termine en un
 * rebote sin explicación:
 *  · Sin sesión: publicar (crear cuenta o entrar, y sigue en `/publica`) y,
 *    para la inmobiliaria, su página o entrar a la suya.
 *  · Propietario e inmobiliaria: el publicador rápido (`/publica`), uno o
 *    muchos. Desde el marketplace TODOS publican con el rápido, también la
 *    inmobiliaria que ya usa Leasefy (Nico, 20-10-2026: «el rápido es para
 *    cuando publican desde el marketplace»); dentro del panel sigue el
 *    formulario de siempre.
 *  · Inquilino: se le dice que publican las cuentas de propietario y de
 *    inmobiliaria, con la salida.
 */

const SIN_PERMISO_PARA_PUBLICAR: AgencyMemberRole[] = ['CONTADOR', 'VIEWER'];

// Ronda 30 (diseño nuevo): los botones sobre la medianoche. El principal es papel blanco con letra de
// medianoche (la única acción azul de la página es buscar); el otro, contorno claro.
const boton =
  'inline-flex h-[46px] items-center justify-center gap-[9px] whitespace-nowrap rounded-[16px] px-[22px] text-[15.5px] font-medium tracking-[-0.005em] transition-colors duration-fast active:scale-[0.97]';
const blanco = `${boton} bg-white text-[#0A0F2C] hover:bg-[#E9EDFF]`;
const contorno = `${boton} border border-white/[0.22] bg-transparent text-[#F3F1ED] hover:border-white/50`;
const oferta = 'flex flex-col items-start p-[clamp(28px,4vw,52px)]';
const tituloDeOferta =
  'mt-3.5 max-w-[440px] text-[clamp(25px,2.4vw,34px)] font-[360] leading-[1.1] tracking-[-0.03em] [text-wrap:balance]';
const textoDeOferta = 'mt-3 max-w-[470px] text-[15.5px] leading-[1.55] text-[#B9BCD0]';

/**
 * A dónde lleva «Publicar inmueble» según quién mira (el botón de la barra y
 * del lado, Nico 09-10-2026: «no veo la posibilidad de publicar inmueble»).
 * `null` = esta cuenta no publica (inquilino, contador, solo lectura).
 */
export function useDondePublicar(): { uno: string; muchos: string | null } | null {
  const { user, isAuthenticated, isLoading, hasActiveAgencyMembership, agencyRole } = useAuth();
  const conSesion = isAuthenticated && Boolean(user) && !isLoading;
  const esDeLaInmobiliaria = conSesion && (user?.role === 'agency' || hasActiveAgencyMembership);
  if (esDeLaInmobiliaria) {
    if (agencyRole && SIN_PERMISO_PARA_PUBLICAR.includes(agencyRole)) return null;
    return { uno: '/publica', muchos: '/publica?traer=excel' };
  }
  if (conSesion && user?.role === 'tenant' && user.onboardingCompleted) return null;
  return { uno: '/publica', muchos: null };
}

/** «Publicar inmueble», siempre a la vista (barra de arriba y lado del marketplace). */
export function BotonPublicar({ className, compacto = false }: { className?: string; compacto?: boolean }) {
  const donde = useDondePublicar();
  const { alTocar, ventana } = useCuentaParaPublicar(donde?.uno ?? '/publica');
  if (!donde) return null;
  return (
    <>
      <Link
        href={donde.uno}
        onClick={alTocar}
        className={cn(
          // Secundario (Nico, 09-10-2026: «no debería ser primary»): lo principal de la página es buscar.
          // Ronda 30 (diseño nuevo): botón con borde de piedra y esquina de 13 px; en el celular, sólo el «+».
          'inline-flex h-[38px] items-center justify-center gap-[7px] rounded-[13px] border border-border bg-surface px-[15px] text-[14px] font-medium text-fg transition-colors duration-fast hover:border-fg-subtle active:scale-[0.97]',
          compacto && 'max-md:w-[38px] max-md:px-0',
          className,
        )}
        aria-label="Publicar inmueble"
        data-testid="boton-publicar"
      >
        <Plus className="h-[15px] w-[15px]" weight="bold" aria-hidden />
        <span className={compacto ? 'hidden md:inline' : undefined}>Publicar inmueble</span>
      </Link>
      {ventana}
    </>
  );
}

/**
 * La casa y el edificio en 3D flotan despacio (como en la landing 2); con movimiento reducido, quietos.
 */
function ObjetoQueFlota({ nombre, desfase = 0 }: { nombre: 'casa' | 'edificio'; desfase?: number }) {
  const quieto = useReducedMotion();
  return (
    <motion.span
      aria-hidden
      className="-ml-2 -mt-1.5 mb-1.5 block [filter:drop-shadow(0_18px_22px_rgba(0,0,0,0.45))]"
      animate={quieto ? undefined : { y: [0, -10, 0], rotate: [0, 2, 0] }}
      transition={quieto ? undefined : { duration: 7, ease: 'easeInOut', repeat: Infinity, delay: desfase }}
    >
      <Ilustracion nombre={nombre} tamano={108} />
    </motion.span>
  );
}

/** El sobretítulo en mono de cada oferta, con su cuadrito de voltaje. */
function Ceja({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2.5 font-mono text-[12px] uppercase leading-[1.3] tracking-[0.08em] text-[#8E93B0]">
      <i className="inline-block h-2 w-2 flex-none rounded-[2px] bg-[#4D6BFF]" aria-hidden />
      {children}
    </p>
  );
}

export function PublicarDesdeElMarketplace() {
  const { user, isAuthenticated, isLoading, hasActiveAgencyMembership, agencyRole } = useAuth();
  const conSesion = isAuthenticated && Boolean(user) && !isLoading;
  const esDeLaInmobiliaria = conSesion && (user?.role === 'agency' || hasActiveAgencyMembership);
  const inmobiliariaQuePublica = esDeLaInmobiliaria && !(agencyRole && SIN_PERMISO_PARA_PUBLICAR.includes(agencyRole));
  const esInquilino = conSesion && user?.role === 'tenant' && !hasActiveAgencyMembership;
  const { alTocar, ventana } = useCuentaParaPublicar('/publica');

  // Ronda 30 (diseño nuevo del marketplace): el momento de medianoche. Un bloque oscuro con las curvas de nivel
  // del home arriba (Nico 30-10: sin los puntos de antes), la casa y el edificio en 3D, y una oferta por quien mira
  // (propietario · inmobiliaria).
  // Antes, dos tarjetas blancas con borde. Mismas rutas, mismos casos y mismos data-testid.
  return (
    <section
      className="relative mx-[clamp(16px,2.6vw,32px)] mt-[72px] overflow-hidden rounded-[32px] bg-[#07080C] text-[#F3F1ED] ring-1 ring-white/[0.09]"
      aria-label="Publicar"
      data-testid="publicar-desde-el-marketplace"
    >
      {ventana}
      <CurvasDeNivel className="absolute inset-x-0 top-0 h-[170px] w-full [mask-image:linear-gradient(180deg,#000_0%,rgba(0,0,0,.55)_50%,transparent_100%)] min-[901px]:h-[190px]" />
      <div className={cn('relative z-[1] grid grid-cols-1', !esDeLaInmobiliaria && 'min-[901px]:grid-cols-2')}>
        {/* La inmobiliaria publica desde su panel: el asistente del propietario no es para ella. */}
        {!esDeLaInmobiliaria && (
          <div className={oferta}>
            <ObjetoQueFlota nombre="casa" />
            <Ceja>Propietarios</Ceja>
            <h3 className={tituloDeOferta}>¿Tienes un inmueble para arrendar o vender?</h3>
            {esInquilino ? (
              <>
                <p className={textoDeOferta}>
                  Publícalo gratis. Te sugerimos el canon con el avalúo de Leasefy y el contrato se firma en línea.
                </p>
                <p
                  className="mt-4 flex max-w-[470px] items-start gap-2 rounded-[14px] bg-white/[0.06] px-3.5 py-3 text-[13.5px] text-[#D9DBE7]"
                  data-testid="publicar-cuenta-de-inquilino"
                >
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#8E93B0]" aria-hidden />
                  Tu cuenta es de inquilino. Publican las cuentas de propietario y de inmobiliaria: entra con una de ellas
                  para publicar.
                </p>
              </>
            ) : (
              <p className={textoDeOferta}>
                Publícalo gratis, para arriendo o para venta: fotos, video y precio. Si es arriendo, te sugerimos el canon
                con el avalúo de Leasefy y el contrato se firma en línea.
                {!conSesion && ' Se publica con tu cuenta: si no tienes, la creas en el camino.'}
              </p>
            )}
            {!esInquilino && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href="/publica" onClick={alTocar} className={blanco} data-testid="publicar-mi-inmueble">
                  Publicar mi inmueble
                  <ArrowRight className="h-[17px] w-[17px]" aria-hidden />
                </Link>
              </div>
            )}
          </div>
        )}

        <div className={cn(oferta, !esDeLaInmobiliaria && 'border-t border-white/[0.09] min-[901px]:border-l min-[901px]:border-t-0')}>
          <ObjetoQueFlota nombre="edificio" desfase={-3} />
          <Ceja>Inmobiliarias</Ceja>
          <h3 className={tituloDeOferta}>{esDeLaInmobiliaria ? 'Publica en tu inmobiliaria' : '¿Eres inmobiliaria?'}</h3>
          <p className={textoDeOferta}>
            {esDeLaInmobiliaria
              ? 'Uno o muchos a la vez: desde tu Excel, los enlaces de tus avisos o tus carpetas de fotos. Todo lo que publicas sale en tu página y en el buscador de Leasefy.'
              : 'Tu página web es tu perfil en Leasefy: tu propio chat que conoce tus inmuebles, tus videos y lo que dicen de ti. Lo que publicas sale ahí y en el buscador de Leasefy.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {inmobiliariaQuePublica ? (
              <>
                <Link href="/publica" className={blanco} data-testid="publicar-uno">
                  Publicar un inmueble
                  <ArrowRight className="h-[17px] w-[17px]" aria-hidden />
                </Link>
                <Link href="/publica?traer=excel" className={contorno} data-testid="cargar-muchos">
                  <FileArrowUp className="h-[17px] w-[17px]" aria-hidden />
                  Cargar muchos desde un archivo
                </Link>
                <Link href="/panel/inmobiliaria/configuracion/tu-pagina" className={contorno} data-testid="mi-pagina">
                  <Browser className="h-[17px] w-[17px]" aria-hidden />
                  Mi página
                </Link>
              </>
            ) : esDeLaInmobiliaria ? (
              <p className="text-[13.5px] text-[#B9BCD0]" data-testid="publicar-sin-permiso">
                Tu rol en la inmobiliaria no publica inmuebles. Pídeselo a quien administra tu cuenta.
              </p>
            ) : (
              <>
                <Link href="/publica?perfil=agency" onClick={alTocar} className={contorno} data-testid="crear-mi-pagina">
                  Crear mi página gratis
                  <ArrowRight className="h-[17px] w-[17px]" aria-hidden />
                </Link>
                {!conSesion && (
                  <Link
                    href={`/auth?returnUrl=${encodeURIComponent('/publica')}`}
                    className="inline-flex items-center gap-[7px] text-[15.5px] font-medium text-[#AFC0FF] underline-offset-4 hover:underline"
                    data-testid="ya-tengo-cuenta"
                  >
                    Ya tengo cuenta: publicar
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
