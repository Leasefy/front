'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Buildings, House, IdentificationBadge } from '@phosphor-icons/react';
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
 *
 * El agente inmobiliario (Nico, 27-10-2026: «ya debemos de pensar no solo en propietarios e inmobiliarias, si
 * no en agentes inmobiliarios»; eligió «su propia cuenta»): tercera opción. Su cuenta es la de la plataforma de
 * la inmobiliaria (el rol `AGENT` del back), con SU nombre y en modo comercial; publica los inmuebles de sus
 * clientes, uno o muchos.
 */
export type PerfilQuePublica = 'landlord' | 'agency' | 'agente';

/** El perfil de la cuenta en el back: el agente usa la plataforma de la inmobiliaria. */
export function rolDeLaCuenta(perfil: PerfilQuePublica): 'landlord' | 'agency' {
  return perfil === 'landlord' ? 'landlord' : 'agency';
}

export function esPerfilQuePublica(valor: unknown): valor is PerfilQuePublica {
  return valor === 'landlord' || valor === 'agency' || valor === 'agente';
}

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
  agente: {
    titulo: 'Soy agente inmobiliario',
    detalle: 'Publico los inmuebles de mis clientes.',
    chip: 'Agente inmobiliario',
    registroDetalle: 'Apenas la tengas, publicas los inmuebles de tus clientes, uno o muchos.',
    Icono: IdentificationBadge,
  },
};

type Paso = { que: 'perfil' } | { que: 'cuenta'; perfil: PerfilQuePublica } | { que: 'entrar' };

export function VentanaParaPublicar({
  abierta,
  alCambiar,
  destinos,
  confirmarConCodigo = false,
  perfilInicial = null,
}: {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  /** A dónde sigue cada perfil después de la cuenta; `entrar` = quien ya tenía cuenta. */
  destinos: Record<PerfilQuePublica, string> & { entrar?: string };
  confirmarConCodigo?: boolean;
  /** Si ya se sabe quién publica (`/publica?perfil=agente`), abre directo en su cuenta. */
  perfilInicial?: PerfilQuePublica | null;
}) {
  const inicio = (): Paso => (perfilInicial ? { que: 'cuenta', perfil: perfilInicial } : { que: 'perfil' });
  const [paso, setPaso] = useState<Paso>(inicio);
  /** El correo que ya escribió: viaja entre «entrar» y «crear cuenta». */
  const [correo, setCorreo] = useState<string | undefined>(undefined);

  // Cada vez que se abre, empieza por el principio.
  useEffect(() => {
    if (abierta) {
      setPaso(inicio());
      setCorreo(undefined);
    }
    // Sólo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta]);

  const adelante = paso.que !== 'perfil';
  const clave = paso.que === 'cuenta' ? `cuenta-${paso.perfil}` : paso.que;

  return (
    <VentanaDeCuenta
      abierta={abierta}
      alCambiar={alCambiar}
      titulo="Publica gratis en Leasefy"
      descripcion="Elige si eres propietario, inmobiliaria o agente inmobiliario y crea tu cuenta para publicar tus inmuebles."
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
            defaultRole={rolDeLaCuenta(paso.perfil)}
            returnUrl={destinos[paso.perfil]}
            correoInicial={correo}
            confirmarConCodigo={confirmarConCodigo}
            encimaDelRegistro={
              <button
                type="button"
                onClick={() => setPaso({ que: 'perfil' })}
                className="mb-5 inline-flex h-8 items-center gap-2 rounded-[11px] bg-surface-muted pl-2.5 pr-[13px] text-[13px] text-fg-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-fg active:scale-[0.97]"
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
              className="mb-5 inline-flex h-8 items-center gap-2 rounded-[11px] bg-surface-muted pl-2.5 pr-[13px] text-[13px] text-fg-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-fg active:scale-[0.97]"
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

/** Paso 1: una tarjeta grande por perfil. Tocar una ya avanza (una decisión, un toque). */
function EleccionDeQuienPublica({
  alElegir,
  alEntrar,
}: {
  alElegir: (perfil: PerfilQuePublica) => void;
  alEntrar: () => void;
}) {
  return (
    <div data-testid="quien-publica">
      <p className="flex items-center gap-2.5 font-mono text-[12px] uppercase leading-[1.3] tracking-[0.08em] text-fg-subtle">
        <i className="inline-block size-2 rounded-[2px] bg-primary" aria-hidden="true" />
        Publica gratis
      </p>
      <h2 className="mt-3.5 text-[clamp(24px,2.6vw,29px)] font-[420] leading-[1.12] tracking-[-0.03em] text-fg md:pr-7">
        ¿Quién va a publicar?
      </h2>
      <p className="mt-2 text-[14.5px] leading-relaxed text-fg-muted">
        Elige una opción y crea tu cuenta. Es gratis.
      </p>

      <div className="mt-6 space-y-3">
        {(Object.keys(PERFILES) as PerfilQuePublica[]).map((perfil) => {
          const { titulo, detalle, Icono } = PERFILES[perfil];
          return (
            <button
              key={perfil}
              type="button"
              onClick={() => alElegir(perfil)}
              className={cn(
                // Ronda 30 (diseño nuevo): esquina de 20 px, borde de piedra que se pinta de voltaje; sin sombra.
                'group flex w-full items-center gap-4 rounded-[20px] border border-border bg-surface p-4 text-left',
                'transition-[transform,border-color] duration-fast ease-standard',
                'hover:-translate-y-px hover:border-primary',
                'active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              )}
              data-testid={`publica-${perfil === 'agency' ? 'inmobiliaria' : perfil === 'agente' ? 'agente' : 'propietario'}`}
            >
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary transition-colors duration-fast group-hover:bg-primary group-hover:text-primary-fg">
                <Icono size={24} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-medium text-fg">{titulo}</span>
                <span className="mt-0.5 block text-[13.5px] leading-snug text-fg-muted">{detalle}</span>
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

      <p className="mt-7 border-t border-border-faint pt-[18px] text-[13.5px] text-fg-muted">
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
