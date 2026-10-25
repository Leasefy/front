'use client';

import { useState } from 'react';
import { Buildings, House } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { AuthInput } from '@/components/auth/AuthInput';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { apiClient } from '@/lib/api/client';
import { errorTelefono, normalizarTelefono } from '@/lib/phone/countries';
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
    else if (errorTelefono(whatsapp)) nuevos.whatsapp = errorTelefono(whatsapp) ?? undefined;
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setEnviando(true);
    const { firstName, lastName } = partirElNombre(nombre);
    const celular = normalizarTelefono(whatsapp) ?? undefined;
    try {
      await apiClient.post('/users/me/onboarding', {
        firstName,
        lastName,
        phone: celular,
        userType: perfil === 'agency' ? 'INMOBILIARIA' : 'LANDLORD',
        ...(perfil === 'agency'
          ? { agency: { name: inmobiliaria.trim(), phone: celular }, registroRapido: true }
          : {}),
      });
      await alTerminar();
    } catch (err) {
      setEnviando(false);
      setErrores({ general: mensajeParaLaPersona(err, { porDefecto: 'No pudimos guardar tus datos. Intenta de nuevo.', accion: 'guardar tus datos' }) });
    }
  };

  return (
    <div className="mx-auto w-full max-w-[460px]" data-testid="registro-rapido">
      {/* Glow up 23-10: igual que «¿Lo publicas para arriendo o para venta?» (sin el cuadrito azul, título liviano). */}
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">Último paso antes de publicar</p>
      <h1 className="mt-4 text-[28px] font-[420] leading-[1.1] tracking-[-0.03em] text-fg sm:text-[32px]">
        {perfil === 'agency' ? 'Tu inmobiliaria' : perfil === 'landlord' ? 'Tus datos' : '¿Quién va a publicar?'}
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
          ]).map(({ p, t, d, I }) => (
            <button
              key={p}
              type="button"
              onClick={() => setPerfil(p)}
              className="group flex w-full items-center gap-4 rounded-lg border border-border bg-surface p-4 text-left transition-[transform,border-color] duration-fast hover:-translate-y-px hover:border-primary/60 active:scale-[0.99]"
              data-testid={`registro-${p === 'agency' ? 'inmobiliaria' : 'propietario'}`}
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
          <AuthInput
            label="WhatsApp"
            type="tel"
            inputMode="tel"
            placeholder="300 123 4567"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            autoComplete="tel"
            error={errores.whatsapp}
            data-testid="registro-whatsapp"
          />
          <p className="-mt-1 text-[12.5px] text-fg-subtle">Ahí te escriben los interesados en tus inmuebles.</p>
          <ErrorDelCampo id="registro-rapido-error" mensaje={errores.general ?? null} />
          <Button type="submit" isLoading={enviando} className="h-12 w-full rounded-full text-[14px]" data-testid="registro-rapido-seguir">
            Seguir a publicar
          </Button>
          {perfilInicial === null && (
            <button
              type="button"
              onClick={() => setPerfil(null)}
              className={cn('w-full text-center text-[13px] text-fg-subtle hover:text-fg')}
            >
              Cambiar: {perfil === 'agency' ? 'soy propietario' : 'soy inmobiliaria'}
            </button>
          )}
        </form>
      )}
    </div>
  );
}
