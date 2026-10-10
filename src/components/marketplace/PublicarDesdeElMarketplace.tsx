'use client';

import Link from 'next/link';
import { ArrowRight, Browser, Buildings, FileArrowUp, House, Info, Plus } from '@phosphor-icons/react';

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
 *  · Sin sesión: publicar (crear cuenta o entrar, y vuelve a `/publicar`) y,
 *    para la inmobiliaria, crear su página o entrar a la suya.
 *  · Propietario: su asistente de 10 pasos (`/publicar`).
 *  · Inmobiliaria (quien puede publicar): uno por uno con el asistente del
 *    panel, muchos desde un archivo, y su página.
 *  · Inquilino: `/publicar` lo devolvería a su portal sin decir nada (sólo
 *    propietarios e inmobiliarias publican). Se le dice eso, con la salida.
 */

const SIN_PERMISO_PARA_PUBLICAR: AgencyMemberRole[] = ['CONTADOR', 'VIEWER'];

const boton =
  'inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors duration-fast active:scale-[0.97]';
const principal = `${boton} bg-primary text-primary-fg hover:bg-primary-600`;
const secundario = `${boton} border border-border bg-surface text-fg hover:border-border-strong`;

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
    return { uno: '/panel/inmobiliaria/inmuebles/nuevo', muchos: '/panel/inmobiliaria/inmuebles/importar' };
  }
  if (conSesion && user?.role === 'tenant') return null;
  return { uno: '/publicar', muchos: null };
}

/** «Publicar inmueble», siempre a la vista (barra de arriba y lado del marketplace). */
export function BotonPublicar({ className, compacto = false }: { className?: string; compacto?: boolean }) {
  const donde = useDondePublicar();
  const { alTocar, ventana } = useCuentaParaPublicar(donde?.uno ?? '/publicar');
  if (!donde) return null;
  return (
    <>
      <Link
        href={donde.uno}
        onClick={alTocar}
        className={cn(
          // Secundario (Nico, 09-10-2026: «no debería ser primary»): lo principal de la página es buscar.
          'inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-[14px] font-medium text-fg transition-colors duration-fast hover:border-border-strong hover:bg-surface-muted active:scale-[0.97]',
          className,
        )}
        aria-label="Publicar inmueble"
        data-testid="boton-publicar"
      >
        <Plus className="h-4 w-4" weight="bold" aria-hidden />
        <span className={compacto ? 'hidden sm:inline' : undefined}>Publicar inmueble</span>
      </Link>
      {ventana}
    </>
  );
}

export function PublicarDesdeElMarketplace() {
  const { user, isAuthenticated, isLoading, hasActiveAgencyMembership, agencyRole } = useAuth();
  const conSesion = isAuthenticated && Boolean(user) && !isLoading;
  const esDeLaInmobiliaria = conSesion && (user?.role === 'agency' || hasActiveAgencyMembership);
  const inmobiliariaQuePublica = esDeLaInmobiliaria && !(agencyRole && SIN_PERMISO_PARA_PUBLICAR.includes(agencyRole));
  const esInquilino = conSesion && user?.role === 'tenant' && !hasActiveAgencyMembership;
  const { alTocar, ventana } = useCuentaParaPublicar('/publicar');

  return (
    <section
      className={`mt-14 grid grid-cols-1 gap-4 px-4 md:px-8 ${esDeLaInmobiliaria ? '' : 'md:grid-cols-2'}`}
      aria-label="Publicar"
      data-testid="publicar-desde-el-marketplace"
    >
      {ventana}
      {/* La inmobiliaria publica desde su panel: el asistente del propietario no es para ella. */}
      {!esDeLaInmobiliaria && (
        <div className="rounded-lg border border-border bg-surface p-6">
          <House className="h-5 w-5 text-primary" aria-hidden />
          <p className="mt-3 font-heading text-[19px] font-semibold text-fg">
            ¿Tienes un inmueble para arrendar o vender?
          </p>
          {esInquilino ? (
            <>
              <p className="mt-1 text-[14px] text-fg-muted">
                Publícalo gratis. Te sugerimos el canon con el avalúo de Leasefy y el contrato se firma en línea.
              </p>
              <p
                className="mt-3 flex items-start gap-2 rounded-md bg-surface-muted px-3 py-2.5 text-[13.5px] text-fg"
                data-testid="publicar-cuenta-de-inquilino"
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
                Tu cuenta es de inquilino. Publican las cuentas de propietario y de inmobiliaria: entra con una de ellas
                para publicar.
              </p>
            </>
          ) : (
            <p className="mt-1 text-[14px] text-fg-muted">
              Publícalo gratis, paso a paso: fotos, video, canon y requisitos. Te sugerimos el canon con el avalúo de
              Leasefy y el contrato se firma en línea.
              {!conSesion && ' Se publica con tu cuenta: si no tienes, la creas en el camino.'}
            </p>
          )}
          {!esInquilino && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/publicar" onClick={alTocar} className={principal} data-testid="publicar-mi-inmueble">
                Publicar mi inmueble
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface p-6">
        <Buildings className="h-5 w-5 text-primary" aria-hidden />
        <p className="mt-3 font-heading text-[19px] font-semibold text-fg">
          {esDeLaInmobiliaria ? 'Publica en tu inmobiliaria' : '¿Eres inmobiliaria?'}
        </p>
        <p className="mt-1 text-[14px] text-fg-muted">
          {esDeLaInmobiliaria
            ? 'Uno por uno con el asistente, o muchos a la vez desde tu Excel. Todo lo que publicas sale en tu página y en el buscador de Leasefy.'
            : 'Tu página web es tu perfil en Leasefy: tu propio chat que conoce tus inmuebles, tus videos y lo que dicen de ti. Lo que publicas sale ahí y en el buscador de Leasefy.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {inmobiliariaQuePublica ? (
            <>
              <Link href="/panel/inmobiliaria/inmuebles/nuevo" className={principal} data-testid="publicar-uno">
                Publicar un inmueble
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/panel/inmobiliaria/inmuebles/importar" className={secundario} data-testid="cargar-muchos">
                <FileArrowUp className="h-4 w-4" aria-hidden />
                Cargar muchos desde un archivo
              </Link>
              <Link href="/panel/inmobiliaria/configuracion/tu-pagina" className={secundario} data-testid="mi-pagina">
                <Browser className="h-4 w-4" aria-hidden />
                Mi página
              </Link>
            </>
          ) : esDeLaInmobiliaria ? (
            <p className="text-[13.5px] text-fg-muted" data-testid="publicar-sin-permiso">
              Tu rol en la inmobiliaria no publica inmuebles. Pídeselo a quien administra tu cuenta.
            </p>
          ) : (
            <>
              <Link href="/auth?mode=register&role=agency" className={secundario} data-testid="crear-mi-pagina">
                Crear mi página gratis
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              {!conSesion && (
                <Link
                  href={`/auth?returnUrl=${encodeURIComponent('/panel/inmobiliaria/inmuebles/nuevo')}`}
                  className={`${boton} text-primary hover:underline`}
                  data-testid="ya-tengo-cuenta"
                >
                  Ya tengo cuenta: publicar
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
