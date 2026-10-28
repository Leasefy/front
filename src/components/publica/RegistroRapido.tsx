'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Buildings, House, IdentificationBadge } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { AuthInput } from '@/components/auth/AuthInput';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { apiClient } from '@/lib/api/client';
import { motionSpring, usePrefersReducedMotion } from '@leasefy/cadence';
import { CampoDeCelularDelMundo } from '@/components/ui/campo-de-celular-del-mundo';
import { celularEnE164, errorDelCelular } from '@/lib/phone/paises-del-mundo';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { partirElNombre } from '@/app/onboarding/propietario/datos-del-propietario';
import type { PerfilQuePublica } from '@/components/marketplace/VentanaParaPublicar';
import { cn } from '@/lib/utils';

/**
 * El registro rápido (Juan, 19-10-2026: «no que llene los mismos datos de cuando
 * yo estaba registrándome», «esos datos los tomamos después»; Nico eligió
 * «nombre + WhatsApp»). Una sola pantalla. El nombre de la persona sólo se pide
 * si no lo sabemos ya (Google lo trae): el sistema lo necesita para la cuenta.
 * El NIT, la razón social, el equipo y la política se piden al «Activar».
 *
 * El agente inmobiliario (Nico, 27-10-2026) usa la plataforma de la inmobiliaria con SU nombre: no se le pide
 * el de una inmobiliaria; su cuenta queda en modo comercial y publica los inmuebles de sus clientes.
 */
export function RegistroRapido({
  perfilInicial,
  nombreConocido,
  alTerminar,
}: {
  perfilInicial: PerfilQuePublica | null;
  /** El nombre que ya trae la cuenta (Google). Vacío = se pide. */
  nombreConocido: string;
  alTerminar: () => Promise<void> | void;
}) {
  const [perfil, setPerfil] = useState<PerfilQuePublica | null>(perfilInicial);
  const [inmobiliaria, setInmobiliaria] = useState('');
  const [nombre, setNombre] = useState(nombreConocido);
  const [whatsapp, setWhatsapp] = useState('');
  /** 28-10: el país del WhatsApp (todos los del mundo); Colombia de entrada. */
  const [pais, setPais] = useState('CO');
  const [errores, setErrores] = useState<Partial<Record<'inmobiliaria' | 'nombre' | 'whatsapp' | 'general', string>>>({});
  const [enviando, setEnviando] = useState(false);
  const pideNombre = !nombreConocido.trim();

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perfil) return;
    const nuevos: typeof errores = {};
    if (perfil === 'agency' && !inmobiliaria.trim()) nuevos.inmobiliaria = 'Escribe el nombre de tu inmobiliaria.';
    if (!nombre.trim()) nuevos.nombre = 'Escribe tu nombre.';
    if (!whatsapp.replace(/\D/g, '')) nuevos.whatsapp = 'Escribe tu WhatsApp: ahí te llegan los interesados.';
    else if (errorDelCelular(whatsapp, pais)) nuevos.whatsapp = errorDelCelular(whatsapp, pais) ?? undefined;
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setEnviando(true);
    const { firstName, lastName } = partirElNombre(nombre);
    const celular = celularEnE164(whatsapp, pais) ?? undefined;
    try {
      await apiClient.post('/users/me/onboarding', {
        firstName,
        lastName,
        phone: celular,
        userType: perfil === 'landlord' ? 'LANDLORD' : 'INMOBILIARIA',
        ...(perfil === 'agency'
          ? { agency: { name: inmobiliaria.trim(), phone: celular }, registroRapido: true }
          : perfil === 'agente'
            ? { agency: { name: nombre.trim(), phone: celular }, registroRapido: true, cuentaDeAgente: true }
            : {}),
      });
      await alTerminar();
    } catch (err) {
      setEnviando(false);
      setErrores({ general: mensajeParaLaPersona(err, { porDefecto: 'No pudimos guardar tus datos. Intenta de nuevo.', accion: 'guardar tus datos' }) });
    }
  };

  return (
    // 28-10 (Nico: «esto necesita ser más hermoso… acompáñalo con una imagen»): en pantalla ancha, el formulario a la
    // izquierda y una foto real del banco a la derecha, con cómo le llegan los interesados por WhatsApp.
    <div className="mx-auto grid w-full max-w-[1040px] items-center gap-10 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:gap-16" data-testid="registro-rapido">
    <div className="mx-auto w-full max-w-[460px] lg:mx-0">
      {/* Glow up 23-10: igual que «¿Lo publicas para arriendo o para venta?» (sin el cuadrito azul, título liviano). */}
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">Último paso antes de publicar</p>
      <h1 className="mt-4 text-[28px] font-[420] leading-[1.1] tracking-[-0.03em] text-fg sm:text-[32px]">
        {perfil === 'agency' ? 'Tu inmobiliaria' : perfil === 'agente' ? 'Tu cuenta de agente' : perfil === 'landlord' ? 'Tus datos' : '¿Quién va a publicar?'}
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-fg-subtle">
        {perfil
          ? 'Sólo esto. Lo demás te lo pedimos después, si lo necesitas.'
          : 'Elige una opción para seguir.'}
      </p>

      {!perfil && (
        <div className="mt-7 space-y-3">
          {([
            { p: 'landlord' as const, t: 'Soy propietario', d: 'Publico mi inmueble, sin inmobiliaria.', I: House },
            { p: 'agency' as const, t: 'Soy inmobiliaria', d: 'Publico los inmuebles que administro.', I: Buildings },
            { p: 'agente' as const, t: 'Soy agente inmobiliario', d: 'Publico los inmuebles de mis clientes.', I: IdentificationBadge },
          ]).map(({ p, t, d, I }) => (
            <button
              key={p}
              type="button"
              onClick={() => setPerfil(p)}
              className="group flex w-full items-center gap-4 rounded-lg border border-border bg-surface p-4 text-left transition-[transform,border-color] duration-fast hover:-translate-y-px hover:border-primary/60 active:scale-[0.99]"
              data-testid={`registro-${p === 'agency' ? 'inmobiliaria' : p === 'agente' ? 'agente' : 'propietario'}`}
            >
              <I size={26} weight="duotone" className="shrink-0 text-fg-muted transition-colors duration-fast group-hover:text-primary" aria-hidden="true" />
              <span>
                <span className="block text-[15px] font-medium text-fg">{t}</span>
                <span className="block text-[13px] text-fg-subtle">{d}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {perfil && (
        <form method="post" onSubmit={enviar} className="mt-7 space-y-4" noValidate>
          {perfil === 'agency' && (
            <div>
              <AuthInput
                label="Nombre de la inmobiliaria"
                placeholder="Ej.: Arriendos del Valle"
                value={inmobiliaria}
                onChange={(e) => setInmobiliaria(e.target.value)}
                maxLength={200}
                autoComplete="organization"
                error={errores.inmobiliaria}
                data-testid="registro-nombre-inmobiliaria"
              />
            </div>
          )}
          {pideNombre && (
            <AuthInput
              label={perfil === 'agency' ? 'Tu nombre' : 'Tu nombre completo'}
              placeholder="Nombre y apellido"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={200}
              icon="user"
              error={errores.nombre}
              data-testid="registro-nombre"
            />
          )}
          {/* El indicativo va aparte del número, como en el resto de Leasefy (Nico, 27-10-2026). */}
          <div className="space-y-1.5">
            <label htmlFor="registro-whatsapp" className="block text-[13px] font-medium text-fg-muted">
              WhatsApp
            </label>
            <CampoDeCelularDelMundo
              id="registro-whatsapp"
              pais={pais}
              alCambiarPais={setPais}
              autoComplete="tel"
              inputMode="numeric"
              value={whatsapp}
              onChange={(v) => setWhatsapp(v.replace(/\D/g, ''))}
              invalid={Boolean(errores.whatsapp)}
              aria-describedby={errores.whatsapp ? 'registro-whatsapp-error' : undefined}
              data-testid="registro-whatsapp"
            />
            <ErrorDelCampo id="registro-whatsapp-error" mensaje={errores.whatsapp ?? null} className="mt-0" />
          </div>
          <p className="-mt-1 text-[12.5px] text-fg-subtle">Ahí te escriben los interesados en tus inmuebles.</p>
          <ErrorDelCampo id="registro-rapido-error" mensaje={errores.general ?? null} />
          <Button type="submit" isLoading={enviando} className="h-12 w-full rounded-full text-[16px] font-medium" data-testid="registro-rapido-seguir">
            Seguir a publicar
          </Button>
          {perfilInicial === null && (
            <button
              type="button"
              onClick={() => setPerfil(null)}
              className={cn('w-full text-center text-[13px] text-fg-subtle hover:text-fg')}
            >
              Cambiar quién publica
            </button>
          )}
        </form>
      )}
    </div>
    <FotoDeTusDatos />
    </div>
  );
}

/** La foto de «Tus datos»: un apartamento real y el mensaje que le llega al dueño por WhatsApp. Sólo en pantalla ancha. */
function FotoDeTusDatos() {
  const reducido = usePrefersReducedMotion();
  return (
    <figure className="relative hidden aspect-[4/5] max-h-[620px] overflow-hidden rounded-[28px] bg-[#1b2340] lg:block" aria-hidden="true" data-testid="foto-de-tus-datos">
      <motion.img
        src="/imagenes/banco/sala-poblado-montanas.webp"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ opacity: { duration: 0.5 }, scale: { duration: 5, ease: [0.16, 1, 0.3, 1] } }}
      />
      <span className="absolute inset-0 bg-gradient-to-t from-[#0d1330]/45 via-transparent to-transparent" />
      <motion.figcaption
        className="absolute inset-x-6 bottom-6 rounded-2xl bg-[#f7f6f2] p-4 shadow-[0_24px_48px_-16px_rgba(4,16,48,0.55)]"
        initial={reducido ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducido ? { duration: 0.2 } : { ...motionSpring.soft, delay: 0.5 }}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5c5a55]">Te escriben por WhatsApp</p>
        <p className="mt-2 w-fit max-w-[90%] rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-[14px] leading-snug text-[#1b2340] shadow-[0_1px_2px_rgba(20,19,15,0.08)]">
          Hola, vi tu apartamento en Leasefy. ¿Sigue disponible para visitarlo el sábado?
        </p>
      </motion.figcaption>
    </figure>
  );
}
