import { inicioDeLaPersona } from '@/lib/auth/role-routes';
import { rutaDeOnboardingConRegreso } from '@/lib/auth/perfil-de-onboarding';

/**
 * «Ir al panel» desde la landing estática (Nico 24-10-2026: «la página con el
 * publicar gratis, entrar, crear cuenta deben quedar conectados con todo lo que
 * hay en producción, que pasaba con la landing pasada»).
 *
 * La landing de `/es` y `/en` es HTML sin React: sabe QUE hay sesión (la cookie
 * de Supabase) pero no QUIÉN es. Su botón lleva a `/ir-al-panel`, que decide
 * con esta función —la MISMA regla con la que `/auth` (AuthForm) manda a cada
 * persona a su sitio después de entrar, sin destino propio—:
 *   - cuenta sin registro en el back → su onboarding;
 *   - onboarding sin terminar → retomarlo (la asesora invitada no lo hace: va a su panel);
 *   - si no, la última cuenta que usó o el inicio de su rol.
 * La de la inmobiliaria espera a saber su rol en la agencia (con tope de 4 s).
 */
type Persona = Parameters<typeof inicioDeLaPersona>[0] & {
  onboardingCompleted?: boolean;
  backendRole?: string;
};

export interface EstadoDeLaSesion {
  cargando: boolean;
  /** `sin-confirmar`: había una sesión guardada que no se pudo confirmar (ver LOGIN-BUCLE). */
  confirmacion?: string;
  autenticado: boolean;
  user: Persona | null | undefined;
  needsOnboarding: boolean;
  perfilElegido: Parameters<typeof rutaDeOnboardingConRegreso>[0];
  agencyRole: Parameters<typeof inicioDeLaPersona>[1];
  agencyMembershipChecked: boolean;
  hasActiveAgencyMembership: boolean;
  ultimaCuenta: Parameters<typeof inicioDeLaPersona>[2];
  /** Pasaron los 4 s de espera por la membresía de la inmobiliaria. */
  esperaVencida: boolean;
}

export type DestinoConSesion = { tipo: 'esperar' } | { tipo: 'ir'; ruta: string };

const ESPERAR: DestinoConSesion = { tipo: 'esperar' };
const ir = (ruta: string): DestinoConSesion => ({ tipo: 'ir', ruta });

export function destinoConSesion(e: EstadoDeLaSesion): DestinoConSesion {
  if (e.cargando) return e.confirmacion === 'sin-confirmar' ? ir('/auth') : ESPERAR;
  if (e.needsOnboarding) return ir(rutaDeOnboardingConRegreso(e.perfilElegido, '/'));
  if (!e.autenticado || !e.user) return ir('/auth');
  const user = e.user;
  const membresiaPendiente = !e.agencyMembershipChecked && !e.esperaVencida;
  if (!user.onboardingCompleted) {
    const deUnaInmobiliaria = user.role === 'agency' || user.backendRole === 'AGENT';
    if (deUnaInmobiliaria && membresiaPendiente) return ESPERAR;
    if (!(deUnaInmobiliaria && e.hasActiveAgencyMembership)) {
      return ir(rutaDeOnboardingConRegreso(e.perfilElegido, '/'));
    }
  }
  const esDeInmobiliaria = user.role === 'agency' || e.hasActiveAgencyMembership;
  if (esDeInmobiliaria && membresiaPendiente) return ESPERAR;
  return ir(inicioDeLaPersona(user, e.agencyRole, e.ultimaCuenta));
}
