'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Buildings, House } from '@phosphor-icons/react';
import { CrossFade } from '@leasefy/cadence';

import { AuthForm } from '@/components/auth/AuthForm';
import { InmuebleQueSePublica } from '@/components/auth/ventana/InmuebleQueSePublica';
import { TextoDeLaObra, VentanaDeCuenta } from '@/components/auth/ventana/VentanaDeCuenta';
import { cn } from '@/lib/utils';

/**
 * ══ PUBLICAR SIN CUENTA: LA VENTANA ═════════════════════════════════════════
 *
 * Juan (Portofino) y Nico, 19-10-2026: el que sólo quería publicar terminaba en
 * el registro completo de la inmobiliaria y después en el panel entero, sin
 * saber qué hacer. «Que el registro vaya a otra parte», «que permita
 * seleccionar propietario o inmobiliaria», «fácil de entrar», «algo más
 * sencillo»; y Nico: «dale un glow up al login, algo hermoso por más que sea un
 * modal».
 *
 * Dos pasos, uno por decisión:
 *   1. ¿Quién publica? — dos tarjetas grandes; tocar una ya avanza.
 *   2. La cuenta — Google o correo con UNA contraseña. Arriba, el perfil
 *      elegido con «Cambiar». Con el código de 6 dígitos del correo se confirma
 *      sin salir (cuando la plantilla nueva esté en Supabase).
 * Quien ya tiene cuenta entra directo desde el paso 1.
 */
export type PerfilQuePublica = 'landlord' | 'agency';

const PERFILES: Record<
  PerfilQuePublica,
  { titulo: string; detalle: string; chip: string; registroDetalle: string; Icono: typeof House }
> = {
  landlord: {
    titulo: 'Soy propietario',
    detalle: 'Publico mi inmueble, sin inmobiliaria.',
    chip: 'Propietario',
    registroDetalle: 'Apenas la tengas, publicas tu inmueble.',
    Icono: House,
  },
  agency: {
    titulo: 'Soy inmobiliaria',
    detalle: 'Publico los inmuebles que administro.',
    chip: 'Inmobiliaria',
    registroDetalle: 'Apenas la tengas, publicas tus inmuebles, uno o muchos.',
    Icono: Buildings,
  },
};

type Paso = { que: 'perfil' } | { que: 'cuenta'; perfil: PerfilQuePublica } | { que: 'entrar' };

export function VentanaParaPublicar({
  abierta,
  alCambiar,
  destinos,
  confirmarConCodigo = false,
}: {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  /** A dónde sigue cada perfil después de la cuenta; `entrar` = quien ya tenía cuenta. */
  destinos: { landlord: string; agency: string; entrar?: string };
  confirmarConCodigo?: boolean;
}) {
  const [paso, setPaso] = useState<Paso>({ que: 'perfil' });
  /** El correo que ya escribió: viaja entre «entrar» y «crear cuenta». */
  const [correo, setCorreo] = useState<string | undefined>(undefined);

  // Cada vez que se abre, empieza por el principio.
  useEffect(() => {
    if (abierta) {
      setPaso({ que: 'perfil' });
      setCorreo(undefined);
    }
  }, [abierta]);

  const adelante = paso.que !== 'perfil';
  const clave = paso.que === 'cuenta' ? `cuenta-${paso.perfil}` : paso.que;

  return (
    <VentanaDeCuenta
      abierta={abierta}
      alCambiar={alCambiar}
      titulo="Publica gratis en Leasefy"
      descripcion="Elige si eres propietario o inmobiliaria y crea tu cuenta para publicar tus inmuebles."
      testId="ventana-para-publicar"
      obra={
        <div className="space-y-8">
          <InmuebleQueSePublica />
          <TextoDeLaObra
            titulo="Publica gratis. Que te encuentre toda la ciudad."
            razones={['Gratis, sin tarjeta de crédito', 'Uno o muchos inmuebles a la vez', 'Los interesados te llegan a tu cuenta']}
          />
        </div>
      }
    >
      <CrossFade swapKey={clave} direction={adelante ? 'forward' : 'backward'}>
        {paso.que === 'perfil' && (
          <EleccionDeQuienPublica
            alElegir={(perfil) => setPaso({ que: 'cuenta', perfil })}
            alEntrar={() => setPaso({ que: 'entrar' })}
          />
        )}

        {paso.que === 'cuenta' && (
          <AuthForm
            key={`cuenta-${paso.perfil}`}
            variante="ventana"
            defaultMode="register"
            defaultRole={paso.perfil}
            returnUrl={destinos[paso.perfil]}
            correoInicial={correo}
            confirmarConCodigo={confirmarConCodigo}
            encimaDelRegistro={
              <button
                type="button"
                onClick={() => setPaso({ que: 'perfil' })}
                className="mb-5 inline-flex h-8 items-center gap-2 rounded-full bg-surface-muted pl-2.5 pr-3.5 text-[13px] text-fg-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-fg active:scale-[0.97]"
                data-testid="cambiar-quien-publica"
              >
                <ArrowLeft size={14} weight="bold" aria-hidden="true" />
                <span className="font-medium text-fg">{PERFILES[paso.perfil].chip}</span>
                <span aria-hidden="true">·</span>
                Cambiar
              </button>
            }
            textos={{
              registroTitulo: 'Crea tu cuenta gratis',
              registroDetalle: PERFILES[paso.perfil].registroDetalle,
              registroBoton: 'Crear cuenta y publicar',
              loginTitulo: 'Bienvenido de vuelta',
              loginDetalle: 'Entra y sigue publicando.',
              loginBoton: 'Entrar y publicar',
            }}
          />
        )}

        {paso.que === 'entrar' && (
          <div>
            <button
              type="button"
              onClick={() => setPaso({ que: 'perfil' })}
              className="mb-5 inline-flex h-8 items-center gap-2 rounded-full bg-surface-muted pl-2.5 pr-3.5 text-[13px] text-fg-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-fg active:scale-[0.97]"
              data-testid="volver-a-quien-publica"
            >
              <ArrowLeft size={14} weight="bold" aria-hidden="true" />
              Volver
            </button>
            <AuthForm
              key="entrar"
              variante="ventana"
              defaultMode="login"
              returnUrl={destinos.entrar}
              correoInicial={correo}
              confirmarConCodigo={confirmarConCodigo}
              textos={{
                loginTitulo: 'Bienvenido de vuelta',
                loginDetalle: 'Entra con tu cuenta y sigue publicando.',
                loginBoton: 'Entrar y publicar',
              }}
              alCrearCuenta={(escrito) => {
                setCorreo(escrito);
                setPaso({ que: 'perfil' });
              }}
            />
          </div>
        )}
      </CrossFade>
    </VentanaDeCuenta>
  );
}

/** Paso 1: dos tarjetas grandes. Tocar una ya avanza (una decisión, un toque). */
function EleccionDeQuienPublica({
  alElegir,
  alEntrar,
}: {
  alElegir: (perfil: PerfilQuePublica) => void;
  alEntrar: () => void;
}) {
  return (
    <div data-testid="quien-publica">
      <p className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
        <i className="inline-block size-2 rounded-[2px] bg-primary" aria-hidden="true" />
        Publica gratis
      </p>
      <h2 className="mt-4 text-[26px] font-medium leading-[1.1] tracking-[-0.03em] text-fg sm:text-[28px] md:pr-10">
        ¿Quién va a publicar?
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-fg-subtle">
        Elige una opción y crea tu cuenta. Es gratis.
      </p>

      <div className="mt-7 space-y-3">
        {(Object.keys(PERFILES) as PerfilQuePublica[]).map((perfil) => {
          const { titulo, detalle, Icono } = PERFILES[perfil];
          return (
            <button
              key={perfil}
              type="button"
              onClick={() => alElegir(perfil)}
              className={cn(
                'group flex w-full items-center gap-4 rounded-lg border border-border bg-surface p-4 text-left',
                'transition-[transform,border-color,box-shadow] duration-fast ease-standard',
                'hover:-translate-y-px hover:border-primary/60 hover:shadow-[0_10px_28px_-14px_rgba(26,64,255,0.45)]',
                'active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              )}
              data-testid={`publica-${perfil === 'agency' ? 'inmobiliaria' : 'propietario'}`}
            >
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary transition-colors duration-fast group-hover:bg-primary group-hover:text-primary-fg">
                <Icono size={24} weight="duotone" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-medium text-fg">{titulo}</span>
                <span className="mt-0.5 block text-[13.5px] leading-snug text-fg-subtle">{detalle}</span>
              </span>
              <ArrowRight
                size={18}
                weight="bold"
                className="shrink-0 text-fg-subtle transition-[transform,color] duration-fast group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      <p className="mt-8 border-t border-border/70 pt-5 text-[13px] text-fg-subtle">
        ¿Ya tienes cuenta?{' '}
        <button
          type="button"
          onClick={alEntrar}
          className="font-medium text-primary underline-offset-2 hover:underline"
          data-testid="publicar-ya-tengo-cuenta"
        >
          Inicia sesión
        </button>
      </p>
    </div>
  );
}
