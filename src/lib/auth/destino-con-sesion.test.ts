import { describe, expect, it } from 'vitest';
import { destinoConSesion, type EstadoDeLaSesion } from './destino-con-sesion';
import { AGENCY_HOME_ROUTE, getUserHomeRoute } from './role-routes';

const base = (over: Partial<EstadoDeLaSesion> = {}): EstadoDeLaSesion => ({
  cargando: false,
  autenticado: true,
  user: { role: 'landlord', onboardingCompleted: true },
  needsOnboarding: false,
  perfilElegido: null,
  agencyRole: null,
  agencyMembershipChecked: true,
  hasActiveAgencyMembership: false,
  ultimaCuenta: null,
  esperaVencida: false,
  ...over,
});

describe('«Ir al panel» desde la landing estática', () => {
  it('mientras se sabe la sesión, espera; con la sesión guardada sin confirmar, al login', () => {
    expect(destinoConSesion(base({ cargando: true }))).toEqual({ tipo: 'esperar' });
    expect(destinoConSesion(base({ cargando: true, confirmacion: 'sin-confirmar' }))).toEqual({ tipo: 'ir', ruta: '/auth' });
  });

  it('sin sesión, al login', () => {
    expect(destinoConSesion(base({ autenticado: false, user: null }))).toEqual({ tipo: 'ir', ruta: '/auth' });
  });

  it('con sesión, al inicio de su rol (la misma regla que /auth)', () => {
    const user = { role: 'landlord' as const, onboardingCompleted: true };
    expect(destinoConSesion(base({ user }))).toEqual({ tipo: 'ir', ruta: getUserHomeRoute(user, null, null) });
  });

  it('la inmobiliaria espera a saber su rol en la agencia, con tope', () => {
    const user = { role: 'agency' as const, onboardingCompleted: true };
    expect(destinoConSesion(base({ user, agencyMembershipChecked: false }))).toEqual({ tipo: 'esperar' });
    const r = destinoConSesion(base({ user, agencyMembershipChecked: false, esperaVencida: true }));
    expect(r).toEqual({ tipo: 'ir', ruta: AGENCY_HOME_ROUTE });
  });

  it('con el registro sin terminar, a su onboarding; la asesora invitada va a su panel', () => {
    const sinTerminar = destinoConSesion(base({ user: { role: 'tenant', onboardingCompleted: false }, perfilElegido: 'tenant' }));
    expect(sinTerminar.tipo).toBe('ir');
    expect((sinTerminar as { ruta: string }).ruta).toMatch(/^\/onboarding/);
    const asesora = destinoConSesion(base({ user: { role: 'agency', backendRole: 'AGENT', onboardingCompleted: false }, hasActiveAgencyMembership: true }));
    expect(asesora).toEqual({ tipo: 'ir', ruta: AGENCY_HOME_ROUTE });
  });

  it('cuenta nueva sin registro en el back, a su onboarding', () => {
    const r = destinoConSesion(base({ needsOnboarding: true, autenticado: false, user: null }));
    expect((r as { ruta: string }).ruta).toMatch(/^\/onboarding/);
  });
});
