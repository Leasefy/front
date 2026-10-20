'use client';

import { User, Buildings } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { enterTransition, usePrefersReducedMotion } from '@leasefy/cadence';
import {
  isDualContextUser,
  nombreDeLaCuentaPersonal,
  NOMBRE_DEL_ROL_EN_LA_INMOBILIARIA,
  type ActiveContext,
} from '@/lib/auth/active-context';
import { cn } from '@/lib/utils';

export interface ContextSwitcherProps {
  user: { role?: string } | null | undefined;
  agencyName?: string | null;
  /** El rol dentro de la inmobiliaria (`ADMIN`, `CONTADOR`…), para decirlo. */
  agencyRole?: string | null;
  activeContext: ActiveContext;
  hasActiveAgencyMembership: boolean;
  locale: string;
  /** Called with the chosen context. The caller persists it + navigates. */
  onSwitch: (context: ActiveContext) => void;
}

/**
 * La plataforma en la que se está: la cuenta personal (inquilino o
 * propietario) o la inmobiliaria que invitó a la persona. Dentro del menú del
 * avatar.
 *
 * 🔴 Nico, 20-10-2026: «esta cuenta la invitaron y era un inquilino pero la
 * invitó una inmobiliaria; el tipo de cuenta debería tener como un switch para
 * ver el tipo de plataforma». Antes eran dos renglones sueltos con un chulito
 * bajo «Cambiar de contexto», y arriba decía «Inquilino» aunque estuviera
 * dentro de la inmobiliaria. Ahora es un interruptor de dos lados y debajo una
 * frase con dónde está y con qué rol.
 *
 * Sólo para quien tiene las dos (`isDualContextUser`, la MISMA regla con la que
 * la sesión resuelve el contexto activo).
 */
export function ContextSwitcher({
  user,
  agencyName,
  agencyRole,
  activeContext,
  hasActiveAgencyMembership,
  locale,
  onSwitch,
}: ContextSwitcherProps) {
  const reducido = usePrefersReducedMotion();
  if (!isDualContextUser(user, hasActiveAgencyMembership)) return null;
  const es = locale === 'es';
  const personal = es ? nombreDeLaCuentaPersonal(user?.role) : user?.role === 'landlord' ? 'Owner' : 'Tenant';
  const rol = agencyRole ? NOMBRE_DEL_ROL_EN_LA_INMOBILIARIA[agencyRole] : null;
  const opciones: Array<{ valor: ActiveContext; testId: string; icono: typeof User; texto: string }> = [
    { valor: 'personal', testId: 'switch-personal', icono: User, texto: es ? 'Mi cuenta' : 'My account' },
    { valor: 'agency', testId: 'switch-agency', icono: Buildings, texto: es ? 'Inmobiliaria' : 'Agency' },
  ];
  const donde =
    activeContext === 'agency'
      ? es
        ? `Estás en ${agencyName ? `la inmobiliaria ${agencyName}` : 'la inmobiliaria'}${rol ? ` como ${rol.toLowerCase()}` : ''}.`
        : `You're in ${agencyName ? `agency ${agencyName}` : 'the agency'}${rol ? ` as ${rol.toLowerCase()}` : ''}.`
      : es
        ? `Estás en tu cuenta de ${personal.toLowerCase()}.${agencyName ? ` También trabajas en ${agencyName}.` : ''}`
        : `You're in your ${personal.toLowerCase()} account.${agencyName ? ` You also work at ${agencyName}.` : ''}`;

  return (
    <div data-testid="context-switcher" className="px-1.5 pb-1">
      <p
        id="plataforma-activa-titulo"
        className="px-1.5 pt-1 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-subtle"
      >
        {es ? 'Plataforma' : 'Platform'}
      </p>
      <div
        role="radiogroup"
        aria-labelledby="plataforma-activa-titulo"
        className="relative grid grid-cols-2 gap-0.5 rounded-lg bg-surface-muted p-0.5"
      >
        {opciones.map(({ valor, testId, icono: Icono, texto }) => {
          const activa = activeContext === valor;
          return (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={activa}
              data-testid={testId}
              title={valor === 'agency' && agencyName ? agencyName : undefined}
              onClick={() => {
                if (!activa) onSwitch(valor);
              }}
              className={cn(
                'relative flex min-w-0 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40',
                activa ? 'text-fg' : 'text-fg-muted hover:text-fg',
              )}
            >
              {activa && (
                <motion.span
                  layoutId="plataforma-activa"
                  className="absolute inset-0 rounded-md bg-surface shadow-sm"
                  transition={enterTransition(reducido)}
                  aria-hidden="true"
                />
              )}
              <Icono className="relative h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="relative truncate">{texto}</span>
            </button>
          );
        })}
      </div>
      <p className="px-1.5 pt-1.5 text-caption text-fg-muted" data-testid="plataforma-donde">
        {donde}
      </p>
      <div className="h-px bg-surface-muted mt-2" />
    </div>
  );
}
